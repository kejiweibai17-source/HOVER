<?php
if (!defined('ABSPATH')) exit;
if (defined('HCS_LOADED')) return;
define('HCS_LOADED', true);
if (!defined('HCS_KIND_META')) define('HCS_KIND_META', 'hover_coupon_kind');

add_action('admin_menu', function () {
    if (!current_user_can('manage_woocommerce')) return;
    add_menu_page('HOVER 優惠碼', 'HOVER 優惠碼', 'manage_woocommerce',
        'hcs', 'hcs_page', 'dashicons-tag', 56);
}, 99);

add_action('admin_footer', 'hcs_admin_footer_script');

/* ── 資料 ── */
function hcs_kind_map(): array {
    return ['welcome'=>'入會禮','birthday'=>'生日禮','promo'=>'活動促銷',
            'flash'=>'閃購','vip'=>'臻享專屬','referral'=>'推薦','free_ship'=>'免運','other'=>'其他'];
}

function hcs_stats(): array {
    if (!class_exists('WC_Coupon')) return ['total'=>0,'active'=>0,'expiring'=>0,'used'=>0];
    $ids = get_posts(['post_type'=>'shop_coupon','posts_per_page'=>-1,'post_status'=>'publish','fields'=>'ids']);
    $total=$active=$expiring=$used=0;
    $now=time(); $soon=$now+604800;
    foreach ($ids as $id) {
        $c=new WC_Coupon($id);
        if (!preg_match('/^HOVER-/i',$c->get_code()) && !$c->get_meta(HCS_KIND_META)) continue;
        $total++;
        $exp=$c->get_date_expires();
        $exp_ts=$exp?$exp->getTimestamp():PHP_INT_MAX;
        if ($exp_ts>$now) $active++;
        if ($exp_ts>$now && $exp_ts<$soon) $expiring++;
        $used+=(int)$c->get_usage_count();
    }
    return compact('total','active','expiring','used');
}

function hcs_coupons(string $search='', string $kind=''): array {
    if (!class_exists('WC_Coupon')) return [];
    $args=['post_type'=>'shop_coupon','posts_per_page'=>80,'post_status'=>['publish','draft'],
           'orderby'=>'date','order'=>'DESC'];
    if ($kind) $args['meta_query']=[['key'=>HCS_KIND_META,'value'=>$kind]];
    else $args['meta_query']=[['key'=>HCS_KIND_META,'compare'=>'EXISTS']];
    $rows=[];
    foreach (get_posts($args) as $p) {
        $c=new WC_Coupon($p->ID);
        $code=$c->get_code();
        if (!preg_match('/^HOVER-/i',$code) && !$c->get_meta(HCS_KIND_META)) continue;
        if ($search && stripos($code,$search)===false && stripos($c->get_meta('hover_campaign'),$search)===false) continue;
        $exp=$c->get_date_expires();
        $rows[]=['id'=>$p->ID,'code'=>$code,'amount'=>$c->get_amount(),'type'=>$c->get_discount_type(),
                 'kind'=>$c->get_meta(HCS_KIND_META)?:'other','campaign'=>$c->get_meta('hover_campaign')?:'',
                 'used'=>$c->get_usage_count(),'limit'=>$c->get_usage_limit()?:0,'min'=>$c->get_minimum_amount(),
                 'expires'=>$exp?$exp->date('Y-m-d'):'','status'=>$p->post_status,
                 'edit_url'=>admin_url('post.php?post='.$p->ID.'&action=edit')];
    }
    return $rows;
}

function hcs_make_code(string $prefix): string {
    return strtoupper(preg_replace('/[^A-Z0-9\-]/','',  $prefix)).'-'.strtoupper(wp_generate_password(6,false,false));
}

function hcs_create(array $in): array {
    if (!class_exists('WC_Coupon')) return ['ok'=>false,'msg'=>'WooCommerce 未啟用'];
    $code=!empty($in['code'])?strtoupper(sanitize_text_field($in['code'])):hcs_make_code($in['prefix']??'HOVER-PROMO');
    $ex=new WC_Coupon($code);
    if ($ex->get_id()) return ['ok'=>false,'msg'=>"代碼已存在：{$code}"];
    $type=in_array($in['type']??'',['fixed_cart','percent','fixed_product','free_shipping'],true)?$in['type']:'fixed_cart';
    $amt=max(0,(float)($in['amount']??0));
    if ($amt<=0 && $type!=='free_shipping') return ['ok'=>false,'msg'=>'金額必須大於 0'];
    $c=new WC_Coupon();
    $c->set_code($code);
    $c->set_discount_type($type);
    $c->set_amount($type==='free_shipping'?0:$amt);
    $c->set_description(sanitize_text_field($in['desc']??''));
    $c->set_individual_use(!empty($in['solo']));
    $c->set_free_shipping($type==='free_shipping');
    $c->set_exclude_sale_items(!empty($in['nosale']));
    $ul=intval($in['usage_limit']??0);
    if ($ul>0) $c->set_usage_limit($ul);
    $c->set_usage_limit_per_user(max(1,intval($in['per_user']??1)));
    $min=(float)($in['min']??0); if ($min>0) $c->set_minimum_amount($min);
    $max=(float)($in['max']??0); if ($max>0) $c->set_maximum_amount($max);
    $email=sanitize_email($in['email']??''); if ($email) $c->set_email_restrictions([$email]);
    if (!empty($in['date_end'])) {
        $exp=new DateTime($in['date_end'].' 23:59:59',wp_timezone()); $c->set_date_expires($exp);
    } elseif (!empty($in['days'])) {
        $exp=(new DateTime('now',wp_timezone()))->modify('+'.max(1,(int)$in['days']).' days'); $c->set_date_expires($exp);
    }
    $c->update_meta_data(HCS_KIND_META,sanitize_text_field($in['kind']??'promo'));
    $c->update_meta_data('hover_created_via','hcs3');
    $cam=sanitize_text_field($in['campaign']??''); if ($cam) $c->update_meta_data('hover_campaign',$cam);
    $id=$c->save();
    if (!$id) return ['ok'=>false,'msg'=>'建立失敗'];
    return ['ok'=>true,'msg'=>"已建立：{$code}",'code'=>$code,'id'=>$id,'edit'=>admin_url('post.php?post='.$id.'&action=edit')];
}

function hcs_bulk(array $in): array {
    $qty=max(1,min(200,(int)($in['qty']??10)));
    $codes=[];$errs=0;
    for ($i=0;$i<$qty;$i++) {
        $in['code']=''; $r=hcs_create($in);
        $r['ok']?$codes[]=$r['code']:$errs++;
    }
    return ['ok'=>true,'codes'=>$codes,'errs'=>$errs,'msg'=>'批量完成：'.count($codes).'組'.($errs?" (失敗{$errs})":"")];
}

function hcs_post(): ?array {
    if ($_SERVER['REQUEST_METHOD']!=='POST'||empty($_POST['hcs_act'])) return null;
    if (!wp_verify_nonce($_POST['hcs_nonce']??'','hcs')) return ['ok'=>false,'msg'=>'驗證失敗'];
    if (!current_user_can('manage_woocommerce')) return ['ok'=>false,'msg'=>'權限不足'];
    $act=sanitize_text_field($_POST['hcs_act']);
    if ($act==='create') return hcs_create($_POST);
    if ($act==='bulk')   return hcs_bulk($_POST);
    if ($act==='delete') {
        $id=intval($_POST['cid']??0);
        return wp_delete_post($id,true)?['ok'=>true,'msg'=>'已刪除']:['ok'=>false,'msg'=>'刪除失敗'];
    }
    if ($act==='toggle') {
        $id=intval($_POST['cid']??0);
        $s=get_post_status($id);
        wp_update_post(['ID'=>$id,'post_status'=>$s==='publish'?'draft':'publish']);
        return ['ok'=>true,'msg'=>$s==='publish'?'已暫停':'已啟用'];
    }
    return null;
}

/* ── CSS / JS（Code Snippets 需 inline 輸出） ── */
function hcs_print_admin_styles(): void
{
    ?>
    <style><?php echo hcs_css(); ?></style>
    <?php
}

function hcs_admin_footer_script(): void
{
    $screen = function_exists('get_current_screen') ? get_current_screen() : null;
    if (!$screen || $screen->id !== 'toplevel_page_hcs') {
        return;
    }
    ?>
    <script><?php echo hcs_js(); ?></script>
    <?php
}

function hcs_css(): string { return <<<'CSS'
.hover-coupon-admin { max-width: 1180px; }
.hover-coupon-admin .hcs { margin-top: 8px; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: #202223; }
.hover-coupon-admin .hcs * { box-sizing: border-box; }

.hover-coupon-admin .hcs-topbar {
    display: flex; align-items: flex-start; justify-content: space-between;
    gap: 16px; padding: 0 0 16px;
}
.hover-coupon-admin .hcs-topbar h1 { margin: 0 0 6px; font-size: 22px; font-weight: 700; }
.hover-coupon-admin .hcs-topbar p { margin: 0; font-size: 13px; color: #646970; }
.hover-coupon-admin .hcs-topbar-actions { display: flex; gap: 8px; flex-shrink: 0; align-items: center; }

.hover-coupon-admin .hcs-api-pill {
    display: inline-flex; align-items: center; gap: 8px;
    background: #fff; border: 1px solid #dcdcde; border-radius: 999px;
    padding: 8px 14px; margin-bottom: 16px; font-size: 12px; color: #646970;
}

.hover-coupon-admin .hcs-stats {
    display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 16px;
}
.hover-coupon-admin .hcs-stat {
    background: #fff; border: 1px solid #dcdcde; border-radius: 8px;
    padding: 16px 18px; box-shadow: 0 1px 2px rgba(0,0,0,.04);
}
.hover-coupon-admin .hcs-stat-n { font-size: 26px; font-weight: 700; color: #2a514d; margin-bottom: 4px; }
.hover-coupon-admin .hcs-stat-l { font-size: 12px; color: #646970; }

.hover-coupon-admin .hcs-nav {
    display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 16px;
}
.hover-coupon-admin .hcs-nav-btn {
    border: 1px solid #dcdcde; background: #fff; border-radius: 999px;
    padding: 8px 14px; font-size: 13px; font-weight: 600; color: #50575e;
    cursor: pointer; transition: .15s;
}
.hover-coupon-admin .hcs-nav-btn:hover { border-color: #2a514d; color: #2a514d; }
.hover-coupon-admin .hcs-nav-btn.on {
    background: #2a514d; border-color: #2a514d; color: #fff;
    box-shadow: 0 4px 14px rgba(42,81,77,.18);
}

.hover-coupon-admin .hcs-panel { display: none; }
.hover-coupon-admin .hcs-panel.on { display: block; }

.hover-coupon-admin .hcs-card {
    background: #fff; border: 1px solid #dcdcde; border-radius: 8px;
    margin-bottom: 14px; box-shadow: 0 1px 2px rgba(0,0,0,.04); overflow: hidden;
}
.hover-coupon-admin .hcs-card-head {
    padding: 14px 18px; border-bottom: 1px solid #f0f0f1;
    display: flex; align-items: center; justify-content: space-between; gap: 10px;
}
.hover-coupon-admin .hcs-card-head h2 { margin: 0; font-size: 14px; font-weight: 700; }
.hover-coupon-admin .hcs-card-body { padding: 18px; }

.hover-coupon-admin .hcs-row { display: grid; grid-template-columns: 1fr 1fr; gap: 14px 16px; }
.hover-coupon-admin .hcs-row.c3 { grid-template-columns: 1fr 1fr 1fr; }
.hover-coupon-admin .hcs-row.c4 { grid-template-columns: 1fr 1fr 1fr 1fr; }
.hover-coupon-admin .hcs-f { display: flex; flex-direction: column; gap: 6px; }
.hover-coupon-admin .hcs-f.full { grid-column: 1 / -1; }
.hover-coupon-admin .hcs-f.s2 { grid-column: span 2; }
.hover-coupon-admin .hcs-f label { font-size: 13px; font-weight: 600; color: #202223; }
.hover-coupon-admin .hcs-f input,
.hover-coupon-admin .hcs-f select,
.hover-coupon-admin .hcs-f textarea {
    border: 1px solid #c3c4c7; border-radius: 6px; padding: 8px 10px;
    font-size: 13px; color: #202223; background: #fff; width: 100%;
}
.hover-coupon-admin .hcs-f input:focus,
.hover-coupon-admin .hcs-f select:focus { border-color: #2a514d; box-shadow: 0 0 0 2px rgba(42,81,77,.15); outline: none; }
.hover-coupon-admin .hcs-f .sub { font-size: 11px; color: #646970; }

.hover-coupon-admin .hcs-type-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
.hover-coupon-admin .hcs-type {
    border: 1px solid #dcdcde; border-radius: 8px; padding: 14px 10px;
    cursor: pointer; background: #fcfcfd; text-align: center; transition: .15s;
}
.hover-coupon-admin .hcs-type:hover { border-color: #2a514d; }
.hover-coupon-admin .hcs-type.on {
    border-color: #2a514d; background: #edf7f1;
    box-shadow: 0 0 0 2px rgba(42,81,77,.12);
}
.hover-coupon-admin .hcs-type-icon { font-size: 18px; margin-bottom: 6px; }
.hover-coupon-admin .hcs-type-name { font-size: 12px; font-weight: 700; color: #202223; }
.hover-coupon-admin .hcs-type-sub { font-size: 11px; color: #646970; margin-top: 2px; }

.hover-coupon-admin .hcs-sep { border: none; border-top: 1px solid #eef2f6; margin: 16px 0; }

.hover-coupon-admin .hcs-ck { display: flex; align-items: center; gap: 8px; font-size: 13px; color: #202223; cursor: pointer; }
.hover-coupon-admin .hcs-ck input[type=checkbox] { width: 16px; height: 16px; accent-color: #2a514d; }
.hover-coupon-admin .hcs-ck-row { display: flex; gap: 20px; flex-wrap: wrap; }

.hover-coupon-admin .hcs-foot {
    display: flex; align-items: center; gap: 10px; margin-top: 16px;
    padding-top: 16px; border-top: 1px solid #eef2f6;
}

.hover-coupon-admin .btn {
    display: inline-flex; align-items: center; gap: 6px; padding: 8px 14px;
    border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer;
    border: none; text-decoration: none; transition: .15s;
}
.hover-coupon-admin .btn-p { background: #2a514d; color: #fff; }
.hover-coupon-admin .btn-p:hover { background: #234641; color: #fff; }
.hover-coupon-admin .btn-s { background: #fff; color: #202223; border: 1px solid #c3c4c7; }
.hover-coupon-admin .btn-s:hover { background: #f6f7f7; color: #202223; }
.hover-coupon-admin .btn-d { background: #fff; color: #b32d2e; border: 1px solid #f0c8c8; }
.hover-coupon-admin .btn-d:hover { background: #fcf0f0; }
.hover-coupon-admin .btn-sm { padding: 5px 10px; font-size: 12px; border-radius: 5px; }

.hover-coupon-admin .hcs-notice {
    padding: 12px 14px; border-radius: 8px; margin-bottom: 14px; font-size: 13px;
}
.hover-coupon-admin .hcs-ok { background: #edf7f1; border: 1px solid #b8dfd0; color: #1a6847; }
.hover-coupon-admin .hcs-err { background: #fcf0f0; border: 1px solid #f0c8c8; color: #8a1f1f; }

.hover-coupon-admin .hcs-tbl { width: 100%; border-collapse: collapse; font-size: 13px; }
.hover-coupon-admin .hcs-tbl th {
    background: #f6f7f7; padding: 10px 12px; text-align: left; font-size: 11px;
    font-weight: 700; color: #646970; border-bottom: 1px solid #dcdcde;
    text-transform: uppercase; letter-spacing: .04em;
}
.hover-coupon-admin .hcs-tbl td { padding: 12px; border-bottom: 1px solid #f0f0f1; vertical-align: middle; }
.hover-coupon-admin .hcs-tbl tr:last-child td { border-bottom: none; }
.hover-coupon-admin .hcs-tbl tr:hover td { background: #fafafa; }
.hover-coupon-admin .hcs-code {
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12px;
    font-weight: 700; color: #202223; background: #f6f7f7; padding: 3px 8px; border-radius: 4px;
}
.hover-coupon-admin .hcs-tag { display: inline-block; padding: 3px 8px; border-radius: 999px; font-size: 11px; font-weight: 600; }
.hover-coupon-admin .tg-g { background: #d3f7d3; color: #1a5c1a; }
.hover-coupon-admin .tg-b { background: #dce8ff; color: #1a3a7a; }
.hover-coupon-admin .tg-y { background: #fff0c3; color: #7a4f00; }
.hover-coupon-admin .tg-r { background: #fdd; color: #9b2c2c; }
.hover-coupon-admin .tg-n { background: #f0f0f1; color: #646970; }
.hover-coupon-admin .tg-p { background: #f0e0ff; color: #6a1a9a; }

.hover-coupon-admin .hcs-prog { height: 4px; background: #e5e7eb; border-radius: 4px; margin-top: 4px; }
.hover-coupon-admin .hcs-prog b { display: block; height: 100%; background: #2a514d; border-radius: 4px; }

.hover-coupon-admin .hcs-chips {
    display: flex; flex-wrap: wrap; gap: 6px; background: #f6f7f7;
    border: 1px solid #dcdcde; border-radius: 8px; padding: 14px;
    max-height: 280px; overflow-y: auto;
}
.hover-coupon-admin .hcs-chip {
    background: #fff; border: 1px solid #dcdcde; border-radius: 4px;
    padding: 4px 10px; font-family: ui-monospace, monospace; font-size: 12px;
    font-weight: 600; color: #202223;
}

.hover-coupon-admin .hcs-tpl-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
.hover-coupon-admin .hcs-tpl {
    border: 1px solid #dcdcde; border-radius: 8px; padding: 14px;
    cursor: pointer; background: #fcfcfd; transition: .15s;
}
.hover-coupon-admin .hcs-tpl:hover { border-color: #2a514d; box-shadow: 0 4px 16px rgba(42,81,77,.08); }
.hover-coupon-admin .hcs-tpl-badge { font-size: 10px; font-weight: 700; padding: 2px 7px; border-radius: 999px; margin-bottom: 8px; display: inline-block; }
.hover-coupon-admin .hcs-tpl h3 { margin: 0 0 6px; font-size: 13px; font-weight: 700; color: #202223; }
.hover-coupon-admin .hcs-tpl p { margin: 0 0 8px; font-size: 12px; color: #646970; line-height: 1.5; }
.hover-coupon-admin .hcs-tpl-meta { font-size: 11px; font-weight: 600; color: #2a514d; }

.hover-coupon-admin .hcs-empty { padding: 48px 24px; text-align: center; color: #646970; font-size: 13px; }

.hover-coupon-admin .hcs-bar { display: flex; gap: 10px; align-items: center; margin-bottom: 14px; flex-wrap: wrap; }
.hover-coupon-admin .hcs-bar input,
.hover-coupon-admin .hcs-bar select {
    border: 1px solid #c3c4c7; border-radius: 6px; padding: 8px 10px; font-size: 13px; color: #202223;
}
.hover-coupon-admin .hcs-bar input { flex: 1; min-width: 180px; }

@media (max-width: 960px) {
    .hover-coupon-admin .hcs-stats,
    .hover-coupon-admin .hcs-type-row,
    .hover-coupon-admin .hcs-row.c3,
    .hover-coupon-admin .hcs-row.c4 { grid-template-columns: 1fr 1fr; }
    .hover-coupon-admin .hcs-tpl-grid { grid-template-columns: 1fr 1fr; }
}
@media (max-width: 640px) {
    .hover-coupon-admin .hcs-stats,
    .hover-coupon-admin .hcs-row,
    .hover-coupon-admin .hcs-type-row,
    .hover-coupon-admin .hcs-tpl-grid { grid-template-columns: 1fr; }
    .hover-coupon-admin .hcs-topbar { flex-direction: column; }
}
CSS; }

/* ── JS ── */
function hcs_js(): string { return <<<'JS'
jQuery(function($){
  // tabs
  $(document).on('click','.hcs-nav-btn',function(){
    var t=$(this).data('t');
    $('.hcs-nav-btn').removeClass('on');
    $(this).addClass('on');
    $('.hcs-panel').removeClass('on');
    $('#hcs-'+t).addClass('on');
    history.replaceState(null,'','?page=hcs&t='+t);
  });
  var t0=new URLSearchParams(location.search).get('t')||'dash';
  $('.hcs-nav-btn[data-t="'+t0+'"]').click();

  // coupon type
  $(document).on('click','.hcs-type',function(){
    $('.hcs-type').removeClass('on');$(this).addClass('on');
    var v=$(this).data('v');
    $('[name=type]').val(v);
    $('#hcs-amount-row').toggle(v!=='free_shipping'&&v!=='bogo');
    $('#hcs-bogo-row').toggle(v==='bogo');
    $('#hcs-amount-lbl').text(v==='percent'?'折扣百分比（%）':'折抵金額（NT$）');
  });

  // template → fill form
  $(document).on('click','.hcs-tpl',function(){
    var d=$(this).data('d'); if(!d)return;
    if(typeof d==='string')d=JSON.parse(d);
    Object.keys(d).forEach(function(k){
      var el=document.querySelector('[name="'+k+'"]'); if(el)el.value=d[k];
    });
    $('.hcs-type').removeClass('on');
    $('.hcs-type[data-v="'+(d.type||'fixed_cart')+'"]').addClass('on');
    $('[name=type]').val(d.type||'fixed_cart');
    $('#hcs-amount-row').show();$('#hcs-bogo-row').hide();
    if(d.type==='free_shipping'){$('#hcs-amount-row').hide();}
    $('.hcs-nav-btn[data-t="create"]').click();
  });

  // expiry mode
  $(document).on('change','[name=expiry_mode]',function(){
    $('#hcs-days-row').toggle($(this).val()==='days');
    $('#hcs-date-row').toggle($(this).val()==='date');
  });

  // copy code
  $(document).on('click','.hcs-copy',function(){
    var code=$(this).data('code');
    navigator.clipboard.writeText(code).then(function(){
      var $b=$('.hcs-copy[data-code="'+code+'"]');
      $b.text('已複製');setTimeout(function(){$b.text('複製');},1800);
    });
  });

  // copy all bulk
  $(document).on('click','#hcs-copy-all',function(){
    var all=[]; $('.hcs-chip').each(function(){all.push($(this).text());});
    navigator.clipboard.writeText(all.join('\n')).then(function(){
      $('#hcs-copy-all').text('已全部複製');
      setTimeout(function(){$('#hcs-copy-all').text('複製全部');},2000);
    });
  });

  // list search
  $(document).on('input','#hcs-search',function(){
    var q=$(this).val().toLowerCase();
    $('#hcs-tbl tr[data-row]').each(function(){$(this).toggle($(this).text().toLowerCase().includes(q));});
  });
  $(document).on('change','#hcs-kind',function(){
    var k=$(this).val();
    $('#hcs-tbl tr[data-row]').each(function(){$(this).toggle(!k||$(this).data('kind')===k);});
  });

  // confirm delete
  $(document).on('click','.hcs-del',function(){return confirm('確定刪除？此動作無法復原。');});
});
JS; }

/* ── templates ── */
function hcs_tpls(): array {
    return [
        [['tg-g','入會'],'入會禮 NT$100','新會員專屬，90 天有效，滿 NT$1,000 可用。','NT$100 · 最低 NT$1,000 · 90 天',
         ['prefix'=>'HOVER-WELCOME','type'=>'fixed_cart','amount'=>'100','min'=>'1000','usage_limit'=>'1','days'=>'90','kind'=>'welcome','desc'=>'HOVER FRIENDS 入會禮 NT$100']],
        [['tg-p','生日'],'生日禮（好友）NT$100','品牌好友當月領取，30 天有效。','NT$100 · 最低 NT$1,000 · 30 天',
         ['prefix'=>'HOVER-BDAY','type'=>'fixed_cart','amount'=>'100','min'=>'1000','usage_limit'=>'1','days'=>'30','kind'=>'birthday','desc'=>'HOVER FRIENDS 生日禮']],
        [['tg-p','生日'],'生日禮（臻享）NT$300','臻享會員限定，升級加碼好禮。','NT$300 · 最低 NT$1,000 · 30 天',
         ['prefix'=>'HOVER-BDAY','type'=>'fixed_cart','amount'=>'300','min'=>'1000','usage_limit'=>'1','days'=>'30','kind'=>'birthday','desc'=>'HOVER EXCLUSIVE 生日禮']],
        [['tg-y','檔期'],'滿 2,000 折 200','節日檔期常用，拉高客單價。','NT$200 · 最低 NT$2,000 · 14 天',
         ['prefix'=>'HOVER-PROMO','type'=>'fixed_cart','amount'=>'200','min'=>'2000','usage_limit'=>'100','days'=>'14','kind'=>'promo','desc'=>'滿 NT$2,000 折 NT$200']],
        [['tg-b','折扣'],'全站 9 折','百分比折扣，適合特定節日或清倉。','10% OFF · 7 天',
         ['prefix'=>'HOVER-SALE','type'=>'percent','amount'=>'10','min'=>'0','usage_limit'=>'200','days'=>'7','kind'=>'promo','desc'=>'全站 9 折']],
        [['tg-b','折扣'],'臻享 95 折補發券','客服補償或活動用，單次。','5% OFF · 60 天',
         ['prefix'=>'HOVER-EXCL','type'=>'percent','amount'=>'5','min'=>'0','usage_limit'=>'1','days'=>'60','kind'=>'vip','desc'=>'HOVER EXCLUSIVE 95 折']],
        [['tg-g','免運'],'免運券','滿 NT$800 免運，適合新客招募。','免運 · 最低 NT$800 · 30 天',
         ['prefix'=>'HOVER-FREE','type'=>'free_shipping','amount'=>'0','min'=>'800','usage_limit'=>'1','days'=>'30','kind'=>'free_ship','desc'=>'限時免運券']],
        [['tg-y','閃購'],'閃購限時碼','限時 24 小時，50 次上限。','15% OFF · 50 次 · 1 天',
         ['prefix'=>'HOVER-FLASH','type'=>'percent','amount'=>'15','min'=>'0','usage_limit'=>'50','days'=>'1','kind'=>'flash','desc'=>'⚡ HOVER 閃購限時優惠']],
        [['tg-p','推薦'],'好友推薦禮 NT$50','推薦好友首購雙方各得 NT$50。','NT$50 · 60 天',
         ['prefix'=>'UFFRD','type'=>'fixed_cart','amount'=>'50','min'=>'0','usage_limit'=>'1','days'=>'60','kind'=>'referral','desc'=>'好友推薦首購禮']],
    ];
}

/* ── render ── */
function hcs_page(): void {
    if (!current_user_can('manage_woocommerce')) wp_die('權限不足');
    $res=hcs_post();
    $stats=hcs_stats();
    $km=hcs_kind_map();
    $search=sanitize_text_field($_GET['s']??'');
    $kf=sanitize_text_field($_GET['kind']??'');
    $rows=hcs_coupons($search,$kf);
    $now=time();
    $tpls=hcs_tpls();
    $bulk_codes=($res&&$res['ok']&&!empty($res['codes']))?$res['codes']:[];

    // campaigns
    $campaigns=[];
    foreach ($rows as $r) {
        $cam=$r['campaign']?:'（未分組）';
        $campaigns[$cam][]=$r;
    }
    ?>
<div class="wrap hover-coupon-admin">
<div class="hcs">

<?php if ($res): ?>
<div class="hcs-notice <?=$res['ok']?'hcs-ok':'hcs-err'?>">
    <?=esc_html($res['msg'])?>
    <?php if(!empty($res['code'])): ?> — <strong style="font-family:monospace"><?=esc_html($res['code'])?></strong>
        <?php if(!empty($res['edit'])): ?><a href="<?=esc_url($res['edit'])?>" style="margin-left:6px;font-size:12px">在 WooCommerce 編輯 →</a><?php endif; ?>
    <?php endif; ?>
</div>
<?php endif; ?>

<div class="hcs-topbar">
    <div>
        <h1>HOVER 優惠碼</h1>
        <p>建立與管理 WooCommerce 原生折扣碼，前台 Next.js 結帳可直接套用。</p>
    </div>
    <div class="hcs-topbar-actions">
        <a href="<?=esc_url(admin_url('edit.php?post_type=shop_coupon'))?>" class="btn btn-s btn-sm">WooCommerce 折價券 →</a>
    </div>
</div>

<div class="hcs-api-pill">
    <span class="dashicons dashicons-tag"></span>
    <span>折扣碼儲存於 WooCommerce</span>
    <code>shop_coupon</code>
</div>

<div class="hcs-stats">
    <div class="hcs-stat"><div class="hcs-stat-n"><?=$stats['total']?></div><div class="hcs-stat-l">全部優惠碼</div></div>
    <div class="hcs-stat"><div class="hcs-stat-n"><?=$stats['active']?></div><div class="hcs-stat-l">啟用中</div></div>
    <div class="hcs-stat"><div class="hcs-stat-n"><?=$stats['expiring']?></div><div class="hcs-stat-l">7 天內到期</div></div>
    <div class="hcs-stat"><div class="hcs-stat-n"><?=$stats['used']?></div><div class="hcs-stat-l">累計使用次數</div></div>
</div>

<div class="hcs-nav">
    <button type="button" class="hcs-nav-btn" data-t="dash">總覽</button>
    <button type="button" class="hcs-nav-btn" data-t="create">建立優惠碼</button>
    <button type="button" class="hcs-nav-btn" data-t="bulk">批量產生</button>
    <button type="button" class="hcs-nav-btn" data-t="campaign">檔期活動</button>
    <button type="button" class="hcs-nav-btn" data-t="list">管理</button>
</div>

<!-- 總覽 -->
<div id="hcs-dash" class="hcs-panel">
    <div class="hcs-card">
        <div class="hcs-card-head"><h2>快速範本</h2><span style="font-size:12px;color:#6d7175">點選套用至「建立優惠碼」</span></div>
        <div class="hcs-card-body">
            <div class="hcs-tpl-grid">
            <?php foreach ($tpls as [$badge,$title,$desc,$meta,$data]): ?>
                <div class="hcs-tpl" data-d="<?=esc_attr(json_encode($data))?>">
                    <span class="hcs-tpl-badge <?=$badge[0]?>"><?=esc_html($badge[1])?></span>
                    <h3><?=esc_html($title)?></h3>
                    <p><?=esc_html($desc)?></p>
                    <span class="hcs-tpl-meta"><?=esc_html($meta)?></span>
                </div>
            <?php endforeach; ?>
            </div>
        </div>
    </div>

    <?php if (!empty($rows)): ?>
    <div class="hcs-card">
        <div class="hcs-card-head"><h2>最近新增</h2></div>
        <table class="hcs-tbl">
            <thead><tr><th>代碼</th><th>種類</th><th>折扣</th><th>使用</th><th>到期</th><th>狀態</th></tr></thead>
            <tbody>
            <?php foreach (array_slice($rows,0,8) as $r):
                $exp=$r['expires']&&strtotime($r['expires'])<$now;
                $pct=$r['limit']>0?min(100,round($r['used']/$r['limit']*100)):0;
                ?>
                <tr>
                    <td><span class="hcs-code"><?=esc_html($r['code'])?></span></td>
                    <td><span class="hcs-tag tg-b"><?=esc_html($km[$r['kind']]??$r['kind'])?></span></td>
                    <td><?php if($r['type']==='percent') echo esc_html($r['amount']).'%'; elseif($r['type']==='free_shipping') echo '免運'; else echo 'NT$'.number_format((float)$r['amount']); ?></td>
                    <td><?=$r['used']?>/<?=($r['limit']>0?$r['limit']:'∞')?></td>
                    <td style="font-size:12px"><?=$r['expires']?esc_html($r['expires']):'—'?></td>
                    <td>
                        <?php if($r['status']==='draft'): ?><span class="hcs-tag tg-n">暫停</span>
                        <?php elseif($exp): ?><span class="hcs-tag tg-r">過期</span>
                        <?php else: ?><span class="hcs-tag tg-g">啟用</span><?php endif; ?>
                    </td>
                </tr>
            <?php endforeach; ?>
            </tbody>
        </table>
    </div>
    <?php endif; ?>
</div>

<!-- 建立優惠碼 -->
<div id="hcs-create" class="hcs-panel">
<form method="post">
<?php wp_nonce_field('hcs','hcs_nonce'); ?>
<input type="hidden" name="hcs_act" value="create">
<input type="hidden" name="type" value="fixed_cart">

<div class="hcs-card">
    <div class="hcs-card-head"><h2>優惠類型</h2></div>
    <div class="hcs-card-body">
        <div class="hcs-type-row">
            <div class="hcs-type on" data-v="fixed_cart"><div class="hcs-type-icon">💰</div><div class="hcs-type-name">固定金額</div><div class="hcs-type-sub">整單折抵</div></div>
            <div class="hcs-type" data-v="percent"><div class="hcs-type-icon">%</div><div class="hcs-type-name">百分比</div><div class="hcs-type-sub">依比例折扣</div></div>
            <div class="hcs-type" data-v="free_shipping"><div class="hcs-type-icon">🚚</div><div class="hcs-type-name">免運</div><div class="hcs-type-sub">免除運費</div></div>
            <div class="hcs-type" data-v="fixed_product"><div class="hcs-type-icon">📦</div><div class="hcs-type-name">單品折扣</div><div class="hcs-type-sub">指定商品</div></div>
        </div>
    </div>
</div>

<div class="hcs-card">
    <div class="hcs-card-head"><h2>基本設定</h2></div>
    <div class="hcs-card-body">
        <div class="hcs-row">
            <div class="hcs-f">
                <label>代碼前綴（自動產生）</label>
                <input type="text" name="prefix" value="HOVER-PROMO">
                <span class="sub">例：HOVER-PROMO → HOVER-PROMO-A1B2C3</span>
            </div>
            <div class="hcs-f">
                <label>自訂代碼（選填，留空則自動產生）</label>
                <input type="text" name="code" placeholder="SUMMER2026">
            </div>
            <div class="hcs-f" id="hcs-amount-row">
                <label id="hcs-amount-lbl">折抵金額（NT$）</label>
                <input type="number" name="amount" min="0" step="1" value="100">
            </div>
            <div class="hcs-f" id="hcs-bogo-row" style="display:none">
                <label>贈品商品 ID</label>
                <input type="number" name="bogo_product_id" placeholder="商品 ID">
            </div>
            <div class="hcs-f">
                <label>種類標籤</label>
                <select name="kind">
                    <?php foreach ($km as $v=>$l): ?><option value="<?=esc_attr($v)?>"><?=esc_html($l)?></option><?php endforeach; ?>
                </select>
            </div>
            <div class="hcs-f">
                <label>所屬活動（選填）</label>
                <input type="text" name="campaign" placeholder="例：2026 週年慶">
            </div>
            <div class="hcs-f full">
                <label>說明（後台 & 會員中心顯示）</label>
                <input type="text" name="desc" value="HOVER 優惠券">
            </div>
        </div>
    </div>
</div>

<div class="hcs-card">
    <div class="hcs-card-head"><h2>使用條件</h2></div>
    <div class="hcs-card-body">
        <div class="hcs-row c4">
            <div class="hcs-f">
                <label>最低消費（NT$）</label>
                <input type="number" name="min" min="0" value="1000">
                <span class="sub">0 = 無門檻</span>
            </div>
            <div class="hcs-f">
                <label>最高消費上限（NT$）</label>
                <input type="number" name="max" min="0" value="0">
                <span class="sub">0 = 無上限</span>
            </div>
            <div class="hcs-f">
                <label>全域使用次數上限</label>
                <input type="number" name="usage_limit" min="0" value="1">
                <span class="sub">0 = 無限制</span>
            </div>
            <div class="hcs-f">
                <label>每人限用次數</label>
                <input type="number" name="per_user" min="1" value="1">
            </div>
            <div class="hcs-f s2">
                <label>限定 Email（選填）</label>
                <input type="email" name="email" placeholder="member@example.com">
                <span class="sub">入會禮、生日禮建議填入，限個人專屬使用</span>
            </div>
        </div>
        <hr class="hcs-sep">
        <div class="hcs-ck-row">
            <label class="hcs-ck"><input type="checkbox" name="solo" value="1" checked> 不可與其他優惠券併用</label>
            <label class="hcs-ck"><input type="checkbox" name="nosale" value="1"> 排除特價商品</label>
        </div>
    </div>
</div>

<div class="hcs-card">
    <div class="hcs-card-head"><h2>有效期限</h2></div>
    <div class="hcs-card-body">
        <div class="hcs-f" style="max-width:240px;margin-bottom:14px">
            <label>到期方式</label>
            <select name="expiry_mode">
                <option value="days">有效天數（從現在起算）</option>
                <option value="date">指定日期區間</option>
            </select>
        </div>
        <div id="hcs-days-row">
            <div class="hcs-f" style="max-width:200px">
                <label>有效天數</label>
                <input type="number" name="days" min="1" value="30">
            </div>
        </div>
        <div id="hcs-date-row" style="display:none">
            <div class="hcs-row" style="max-width:480px">
                <div class="hcs-f"><label>開始日期</label><input type="date" name="date_start" value="<?=date('Y-m-d')?>"></div>
                <div class="hcs-f"><label>結束日期（到期）</label><input type="date" name="date_end"></div>
            </div>
        </div>
    </div>
</div>

<div class="hcs-foot">
    <button type="submit" class="btn btn-p">建立優惠碼</button>
    <a href="<?=esc_url(admin_url('edit.php?post_type=shop_coupon'))?>" class="btn btn-s">查看所有優惠券</a>
</div>
</form>
</div>

<!-- 批量產生 -->
<div id="hcs-bulk" class="hcs-panel">
<div class="hcs-card">
    <div class="hcs-card-head"><h2>批量產生唯一優惠碼</h2><span style="font-size:12px;color:#6d7175">最多 200 組，每組後綴 6 碼亂數</span></div>
    <div class="hcs-card-body">
        <form method="post">
            <?php wp_nonce_field('hcs','hcs_nonce'); ?>
            <input type="hidden" name="hcs_act" value="bulk">
            <div class="hcs-row c4">
                <div class="hcs-f">
                    <label>代碼前綴</label>
                    <input type="text" name="prefix" value="HOVER-PROMO" required>
                </div>
                <div class="hcs-f">
                    <label>數量</label>
                    <input type="number" name="qty" min="1" max="200" value="20" required>
                </div>
                <div class="hcs-f">
                    <label>種類</label>
                    <select name="kind">
                        <?php foreach ($km as $v=>$l): ?><option value="<?=esc_attr($v)?>"><?=esc_html($l)?></option><?php endforeach; ?>
                    </select>
                </div>
                <div class="hcs-f">
                    <label>折扣類型</label>
                    <select name="type">
                        <option value="fixed_cart">固定金額</option>
                        <option value="percent">百分比</option>
                        <option value="free_shipping">免運</option>
                        <option value="fixed_product">單品折扣</option>
                    </select>
                </div>
                <div class="hcs-f">
                    <label>折扣金額 / %</label>
                    <input type="number" name="amount" min="0" value="100">
                </div>
                <div class="hcs-f">
                    <label>最低消費（NT$）</label>
                    <input type="number" name="min" min="0" value="1000">
                </div>
                <div class="hcs-f">
                    <label>使用次數（每組）</label>
                    <input type="number" name="usage_limit" min="1" value="1">
                </div>
                <div class="hcs-f">
                    <label>有效天數</label>
                    <input type="number" name="days" min="1" value="30">
                </div>
                <div class="hcs-f">
                    <label>所屬活動</label>
                    <input type="text" name="campaign" placeholder="例：週年慶 2026">
                </div>
                <div class="hcs-f s2">
                    <label>說明</label>
                    <input type="text" name="desc" value="HOVER 活動優惠券">
                </div>
            </div>
            <div class="hcs-foot">
                <button type="submit" class="btn btn-p">開始批量產生</button>
            </div>
        </form>
        <?php if ($bulk_codes): ?>
        <hr class="hcs-sep">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
            <span style="font-size:13px;font-weight:600"><?=count($bulk_codes)?> 組已產生</span>
            <button type="button" id="hcs-copy-all" class="btn btn-s btn-sm">複製全部</button>
        </div>
        <div class="hcs-chips">
            <?php foreach ($bulk_codes as $c): ?>
                <span class="hcs-chip"><?=esc_html($c)?></span>
            <?php endforeach; ?>
        </div>
        <?php endif; ?>
    </div>
</div>
</div>

<!-- 檔期活動 -->
<div id="hcs-campaign" class="hcs-panel">
    <?php if (empty($campaigns)): ?>
    <div class="hcs-card"><div class="hcs-empty">尚無活動。建立優惠碼時填入「所屬活動名稱」即可在此分組顯示。</div></div>
    <?php else: ?>
    <?php foreach ($campaigns as $cam_name=>$cam_rows):
        $active_n=count(array_filter($cam_rows,function($r) use ($now){return $r['status']==='publish'&&(!$r['expires']||strtotime($r['expires'])>$now);}));
        $total_used=array_sum(array_column($cam_rows,'used'));
        $total_lim=array_sum(array_column($cam_rows,'limit'));
        $pct=$total_lim>0?min(100,round($total_used/$total_lim*100)):0;
        ?>
    <div class="hcs-card" style="margin-bottom:14px">
        <div class="hcs-card-head">
            <div>
                <h2><?=esc_html($cam_name)?></h2>
                <span style="font-size:12px;color:#6d7175"><?=count($cam_rows)?> 組 · 啟用中 <?=$active_n?> 組 · 累計使用 <?=$total_used?> 次<?=$total_lim?" / {$total_lim} 次（{$pct}%）":''?></span>
                <?php if($total_lim>0): ?><div class="hcs-prog" style="max-width:220px;margin-top:6px"><b style="width:<?=$pct?>%;background:<?=$pct>=90?'#b32d2e':($pct>=60?'#d97706':'#2a514d')?>"></b></div><?php endif; ?>
            </div>
            <span class="hcs-tag <?=$active_n?'tg-g':'tg-n'?>"><?=$active_n?'進行中':'已結束'?></span>
        </div>
        <table class="hcs-tbl">
            <thead><tr><th>代碼</th><th>折扣</th><th>使用</th><th>到期</th><th>狀態</th><th></th></tr></thead>
            <tbody>
            <?php foreach ($cam_rows as $r):
                $exp_r=$r['expires']&&strtotime($r['expires'])<$now; ?>
                <tr>
                    <td><span class="hcs-code"><?=esc_html($r['code'])?></span> <button type="button" class="hcs-copy btn btn-s btn-sm" data-code="<?=esc_attr($r['code'])?>">複製</button></td>
                    <td><?php if($r['type']==='percent') echo esc_html($r['amount']).'%'; elseif($r['type']==='free_shipping') echo '免運'; else echo 'NT$'.number_format((float)$r['amount']); ?></td>
                    <td><?=$r['used']?>/<?=($r['limit']>0?$r['limit']:'∞')?>
                        <?php if($r['limit']>0): $p2=min(100,round($r['used']/$r['limit']*100)); ?><div class="hcs-prog"><b style="width:<?=$p2?>%"></b></div><?php endif; ?></td>
                    <td style="font-size:12px"><?=$r['expires']?esc_html($r['expires']):'—'?></td>
                    <td><?php if($r['status']==='draft'): ?><span class="hcs-tag tg-n">暫停</span>
                        <?php elseif($exp_r): ?><span class="hcs-tag tg-r">過期</span>
                        <?php else: ?><span class="hcs-tag tg-g">啟用</span><?php endif; ?></td>
                    <td><a href="<?=esc_url($r['edit_url'])?>" class="btn btn-s btn-sm">編輯</a></td>
                </tr>
            <?php endforeach; ?>
            </tbody>
        </table>
    </div>
    <?php endforeach; ?>
    <?php endif; ?>
</div>

<!-- 管理 -->
<div id="hcs-list" class="hcs-panel">
    <div class="hcs-card">
        <div class="hcs-card-head"><h2>優惠碼管理</h2></div>
        <div class="hcs-card-body" style="padding-bottom:0">
            <div class="hcs-bar">
                <input type="text" id="hcs-search" placeholder="搜尋代碼或活動名稱…">
                <select id="hcs-kind">
                    <option value="">所有類型</option>
                    <?php foreach ($km as $v=>$l): ?><option value="<?=esc_attr($v)?>"><?=esc_html($l)?></option><?php endforeach; ?>
                </select>
            </div>
        </div>
        <?php if (empty($rows)): ?>
        <div class="hcs-empty">尚無 HOVER 優惠碼，請至「建立優惠碼」新增。</div>
        <?php else: ?>
        <div style="overflow-x:auto">
        <table class="hcs-tbl" id="hcs-tbl">
            <thead><tr><th>代碼</th><th>活動</th><th>種類</th><th>折扣</th><th>使用進度</th><th>到期</th><th>狀態</th><th>操作</th></tr></thead>
            <tbody>
            <?php foreach ($rows as $r):
                $exp_r=$r['expires']&&strtotime($r['expires'])<$now;
                $pct=$r['limit']>0?min(100,round($r['used']/$r['limit']*100)):0;
                ?>
                <tr data-row="1" data-kind="<?=esc_attr($r['kind'])?>">
                    <td>
                        <span class="hcs-code"><?=esc_html($r['code'])?></span>
                        <button type="button" class="hcs-copy" data-code="<?=esc_attr($r['code'])?>" style="background:none;border:none;cursor:pointer;font-size:11px;color:#6d7175;padding:0 4px">複製</button>
                    </td>
                    <td style="font-size:12px;color:#6d7175"><?=$r['campaign']?esc_html($r['campaign']):'—'?></td>
                    <td><span class="hcs-tag tg-b"><?=esc_html($km[$r['kind']]??$r['kind'])?></span></td>
                    <td style="font-weight:600;white-space:nowrap">
                        <?php if($r['type']==='percent') echo esc_html($r['amount']).'% OFF'; elseif($r['type']==='free_shipping') echo '🚚 免運'; else echo 'NT$'.number_format((float)$r['amount']); ?>
                        <?php if((float)$r['min']>0): ?><br><span style="font-size:11px;font-weight:400;color:#6d7175">滿 NT$<?=number_format((float)$r['min'])?></span><?php endif; ?>
                    </td>
                    <td style="min-width:90px">
                        <span style="font-size:12px"><?=$r['used']?>/<?=($r['limit']>0?$r['limit']:'∞')?></span>
                        <?php if($r['limit']>0): ?><div class="hcs-prog"><b style="width:<?=$pct?>%;background:<?=$pct>=90?'#b32d2e':($pct>=60?'#d97706':'#2a514d')?>"></b></div><?php endif; ?>
                    </td>
                    <td style="font-size:12px;<?=$exp_r?'color:#d72c0d;font-weight:600':''?>"><?=$r['expires']?esc_html($r['expires']):'—'?></td>
                    <td>
                        <?php if($r['status']==='draft'): ?><span class="hcs-tag tg-n">暫停</span>
                        <?php elseif($exp_r): ?><span class="hcs-tag tg-r">過期</span>
                        <?php else: ?><span class="hcs-tag tg-g">啟用中</span><?php endif; ?>
                    </td>
                    <td>
                        <div style="display:flex;gap:5px;flex-wrap:wrap">
                        <a href="<?=esc_url($r['edit_url'])?>" class="btn btn-s btn-sm">編輯</a>
                        <form method="post" style="display:contents">
                            <?php wp_nonce_field('hcs','hcs_nonce'); ?>
                            <input type="hidden" name="hcs_act" value="toggle">
                            <input type="hidden" name="cid" value="<?=$r['id']?>">
                            <button type="submit" class="btn btn-s btn-sm"><?=$r['status']==='publish'?'暫停':'啟用'?></button>
                        </form>
                        <form method="post" style="display:contents">
                            <?php wp_nonce_field('hcs','hcs_nonce'); ?>
                            <input type="hidden" name="hcs_act" value="delete">
                            <input type="hidden" name="cid" value="<?=$r['id']?>">
                            <button type="submit" class="btn btn-d btn-sm hcs-del">刪除</button>
                        </form>
                        </div>
                    </td>
                </tr>
            <?php endforeach; ?>
            </tbody>
        </table>
        </div>
        <?php endif; ?>
    </div>
</div>

</div><!-- .hcs -->
</div><!-- .wrap -->
<?php
    hcs_print_admin_styles();
}
