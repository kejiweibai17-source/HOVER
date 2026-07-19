<?php
/**
 * HOVER — 優惠碼後台（精簡版）
 *
 * 對齊會員制度：
 * - 入會禮 NT$100｜滿 NT$1,000｜90 天
 * - 生日禮 好友 NT$100／臻享 NT$300｜滿 NT$1,000｜30 天
 * - 好友推薦禮 NT$50
 *
 * 使用：Code Snippets → 貼上本檔 → Run：Administration only → Save & Activate
 * 注意：勿停用「HOVER 會員分級同步 + 生日禮自動派發」(hover-membership-engine)
 */

if (!defined('ABSPATH')) {
    exit;
}
if (defined('HCS_LOADED')) {
    return;
}
define('HCS_LOADED', true);
if (!defined('HCS_KIND_META')) {
    define('HCS_KIND_META', 'hover_coupon_kind');
}

add_action('admin_menu', function () {
    if (!current_user_can('manage_woocommerce')) {
        return;
    }
    add_menu_page(
        'HOVER 優惠碼',
        'HOVER 優惠碼',
        'manage_woocommerce',
        'hcs',
        'hcs_page',
        'dashicons-tag',
        56
    );
}, 99);

add_action('admin_footer', 'hcs_admin_footer_script');

/* ── 資料（僅保留會員相關種類） ── */
function hcs_kind_map(): array
{
    return [
        'welcome'  => '入會禮',
        'birthday' => '生日禮',
        'referral' => '好友推薦',
        'promo'    => '活動促銷',
        'other'    => '其他',
    ];
}

function hcs_stats(): array
{
    if (!class_exists('WC_Coupon')) {
        return ['total' => 0, 'active' => 0, 'expiring' => 0, 'used' => 0];
    }
    $ids = get_posts([
        'post_type'      => 'shop_coupon',
        'posts_per_page' => -1,
        'post_status'    => 'publish',
        'fields'         => 'ids',
    ]);
    $total = $active = $expiring = $used = 0;
    $now = time();
    $soon = $now + 604800;
    foreach ($ids as $id) {
        $c = new WC_Coupon($id);
        if (!preg_match('/^HOVER-/i', $c->get_code()) && !$c->get_meta(HCS_KIND_META)) {
            continue;
        }
        $total++;
        $exp = $c->get_date_expires();
        $exp_ts = $exp ? $exp->getTimestamp() : PHP_INT_MAX;
        if ($exp_ts > $now) {
            $active++;
        }
        if ($exp_ts > $now && $exp_ts < $soon) {
            $expiring++;
        }
        $used += (int) $c->get_usage_count();
    }
    return compact('total', 'active', 'expiring', 'used');
}

function hcs_coupons(string $search = '', string $kind = ''): array
{
    if (!class_exists('WC_Coupon')) {
        return [];
    }
    $args = [
        'post_type'      => 'shop_coupon',
        'posts_per_page' => 80,
        'post_status'    => ['publish', 'draft'],
        'orderby'        => 'date',
        'order'          => 'DESC',
    ];
    if ($kind) {
        $args['meta_query'] = [['key' => HCS_KIND_META, 'value' => $kind]];
    } else {
        $args['meta_query'] = [['key' => HCS_KIND_META, 'compare' => 'EXISTS']];
    }
    $rows = [];
    foreach (get_posts($args) as $p) {
        $c = new WC_Coupon($p->ID);
        $code = $c->get_code();
        if (!preg_match('/^HOVER-/i', $code) && !$c->get_meta(HCS_KIND_META)) {
            continue;
        }
        if ($search && stripos($code, $search) === false) {
            continue;
        }
        $exp = $c->get_date_expires();
        $rows[] = [
            'id'       => $p->ID,
            'code'     => $code,
            'amount'   => $c->get_amount(),
            'type'     => $c->get_discount_type(),
            'kind'     => $c->get_meta(HCS_KIND_META) ?: 'other',
            'used'     => $c->get_usage_count(),
            'limit'    => $c->get_usage_limit() ?: 0,
            'min'      => $c->get_minimum_amount(),
            'expires'  => $exp ? $exp->date('Y-m-d') : '',
            'status'   => $p->post_status,
            'edit_url' => admin_url('post.php?post=' . $p->ID . '&action=edit'),
        ];
    }
    return $rows;
}

function hcs_make_code(string $prefix): string
{
    return strtoupper(preg_replace('/[^A-Z0-9\-]/', '', $prefix))
        . '-'
        . strtoupper(wp_generate_password(6, false, false));
}

function hcs_create(array $in): array
{
    if (!class_exists('WC_Coupon')) {
        return ['ok' => false, 'msg' => 'WooCommerce 未啟用'];
    }
    $code = !empty($in['code'])
        ? strtoupper(sanitize_text_field($in['code']))
        : hcs_make_code($in['prefix'] ?? 'HOVER-PROMO');
    $ex = new WC_Coupon($code);
    if ($ex->get_id()) {
        return ['ok' => false, 'msg' => "代碼已存在：{$code}"];
    }

    $type = in_array($in['type'] ?? '', ['fixed_cart', 'percent'], true)
        ? $in['type']
        : 'fixed_cart';
    $amt = max(0, (float) ($in['amount'] ?? 0));
    if ($amt <= 0) {
        return ['ok' => false, 'msg' => '金額必須大於 0'];
    }

    $kind = sanitize_text_field($in['kind'] ?? 'promo');
    if (!array_key_exists($kind, hcs_kind_map())) {
        $kind = 'other';
    }

    $c = new WC_Coupon();
    $c->set_code($code);
    $c->set_discount_type($type);
    $c->set_amount($amt);
    $c->set_description(sanitize_text_field($in['desc'] ?? ''));
    $c->set_individual_use(!empty($in['solo']));
    $c->set_exclude_sale_items(!empty($in['nosale']));

    $ul = intval($in['usage_limit'] ?? 0);
    if ($ul > 0) {
        $c->set_usage_limit($ul);
    }
    $c->set_usage_limit_per_user(max(1, intval($in['per_user'] ?? 1)));

    $min = (float) ($in['min'] ?? 0);
    if ($min > 0) {
        $c->set_minimum_amount($min);
    }

    $email = sanitize_email($in['email'] ?? '');
    if ($email) {
        $c->set_email_restrictions([$email]);
    }

    if (!empty($in['date_end'])) {
        $exp = new DateTime($in['date_end'] . ' 23:59:59', wp_timezone());
        $c->set_date_expires($exp);
    } elseif (!empty($in['days'])) {
        $exp = (new DateTime('now', wp_timezone()))
            ->modify('+' . max(1, (int) $in['days']) . ' days');
        $c->set_date_expires($exp);
    }

    $c->update_meta_data(HCS_KIND_META, $kind);
    $c->update_meta_data('hover_created_via', 'hcs3');
    $id = $c->save();
    if (!$id) {
        return ['ok' => false, 'msg' => '建立失敗'];
    }
    return [
        'ok'   => true,
        'msg'  => "已建立：{$code}",
        'code' => $code,
        'id'   => $id,
        'edit' => admin_url('post.php?post=' . $id . '&action=edit'),
    ];
}

function hcs_post(): ?array
{
    if ($_SERVER['REQUEST_METHOD'] !== 'POST' || empty($_POST['hcs_act'])) {
        return null;
    }
    if (!wp_verify_nonce($_POST['hcs_nonce'] ?? '', 'hcs')) {
        return ['ok' => false, 'msg' => '驗證失敗'];
    }
    if (!current_user_can('manage_woocommerce')) {
        return ['ok' => false, 'msg' => '權限不足'];
    }
    $act = sanitize_text_field($_POST['hcs_act']);
    if ($act === 'create') {
        return hcs_create($_POST);
    }
    if ($act === 'delete') {
        $id = intval($_POST['cid'] ?? 0);
        return wp_delete_post($id, true)
            ? ['ok' => true, 'msg' => '已刪除']
            : ['ok' => false, 'msg' => '刪除失敗'];
    }
    if ($act === 'toggle') {
        $id = intval($_POST['cid'] ?? 0);
        $s = get_post_status($id);
        wp_update_post(['ID' => $id, 'post_status' => $s === 'publish' ? 'draft' : 'publish']);
        return ['ok' => true, 'msg' => $s === 'publish' ? '已暫停' : '已啟用'];
    }
    return null;
}

/* ── 快速範本：只留會員制度相關 ── */
function hcs_tpls(): array
{
    return [
        [
            ['tg-g', '入會'],
            '入會禮 NT$100',
            '品牌好友新會員。滿 NT$1,000、90 天、限一次。',
            'NT$100 · 最低 NT$1,000 · 90 天',
            [
                'prefix'      => 'HOVER-WELCOME',
                'type'        => 'fixed_cart',
                'amount'      => '100',
                'min'         => '1000',
                'usage_limit' => '1',
                'days'        => '90',
                'kind'        => 'welcome',
                'desc'        => 'HOVER FRIENDS 入會禮 NT$100（單筆滿 NT$1,000）',
                'solo'        => '1',
            ],
        ],
        [
            ['tg-p', '生日'],
            '生日禮（品牌好友）NT$100',
            '當月壽星領取。滿 NT$1,000、30 天、不可併用。',
            'NT$100 · 最低 NT$1,000 · 30 天',
            [
                'prefix'      => 'HOVER-BDAY',
                'type'        => 'fixed_cart',
                'amount'      => '100',
                'min'         => '1000',
                'usage_limit' => '1',
                'days'        => '30',
                'kind'        => 'birthday',
                'desc'        => 'HOVER FRIENDS 生日禮 NT$100（不可與其他優惠併用）',
                'solo'        => '1',
            ],
        ],
        [
            ['tg-p', '生日'],
            '生日禮（臻享）NT$300',
            '臻享會員當月壽星。滿 NT$1,000、30 天、不可併用。',
            'NT$300 · 最低 NT$1,000 · 30 天',
            [
                'prefix'      => 'HOVER-BDAY',
                'type'        => 'fixed_cart',
                'amount'      => '300',
                'min'         => '1000',
                'usage_limit' => '1',
                'days'        => '30',
                'kind'        => 'birthday',
                'desc'        => 'HOVER EXCLUSIVE 生日禮 NT$300（不可與其他優惠併用）',
                'solo'        => '1',
            ],
        ],
        [
            ['tg-b', '推薦'],
            '好友推薦禮 NT$50',
            '親友推薦註冊首購禮（與前台 UFFRD 規則對齊）。',
            'NT$50 · 60 天',
            [
                'prefix'      => 'UFFRD',
                'type'        => 'fixed_cart',
                'amount'      => '50',
                'min'         => '0',
                'usage_limit' => '1',
                'days'        => '60',
                'kind'        => 'referral',
                'desc'        => '好友推薦註冊購物金 50 元',
                'solo'        => '1',
            ],
        ],
        [
            ['tg-y', '活動'],
            '活動促銷｜滿 2,000 折 200',
            '檔期活動用。可再改金額／天數。',
            'NT$200 · 最低 NT$2,000 · 14 天',
            [
                'prefix'      => 'HOVER-PROMO',
                'type'        => 'fixed_cart',
                'amount'      => '200',
                'min'         => '2000',
                'usage_limit' => '100',
                'days'        => '14',
                'kind'        => 'promo',
                'desc'        => '滿 NT$2,000 折 NT$200',
                'solo'        => '1',
            ],
        ],
    ];
}

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

function hcs_css(): string
{
    return <<<'CSS'
.hover-coupon-admin { max-width: 960px; }
.hover-coupon-admin .hcs { margin-top: 8px; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: #202223; }
.hover-coupon-admin .hcs * { box-sizing: border-box; }
.hover-coupon-admin .hcs-topbar { display: flex; justify-content: space-between; gap: 16px; padding: 0 0 16px; }
.hover-coupon-admin .hcs-topbar h1 { margin: 0 0 6px; font-size: 22px; font-weight: 700; }
.hover-coupon-admin .hcs-topbar p { margin: 0; font-size: 13px; color: #646970; }
.hover-coupon-admin .hcs-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 16px; }
.hover-coupon-admin .hcs-stat { background: #fff; border: 1px solid #dcdcde; border-radius: 8px; padding: 16px 18px; }
.hover-coupon-admin .hcs-stat-n { font-size: 26px; font-weight: 700; color: #2a514d; margin-bottom: 4px; }
.hover-coupon-admin .hcs-stat-l { font-size: 12px; color: #646970; }
.hover-coupon-admin .hcs-nav { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 16px; }
.hover-coupon-admin .hcs-nav-btn { border: 1px solid #dcdcde; background: #fff; border-radius: 999px; padding: 8px 14px; font-size: 13px; font-weight: 600; color: #50575e; cursor: pointer; }
.hover-coupon-admin .hcs-nav-btn.on { background: #2a514d; border-color: #2a514d; color: #fff; }
.hover-coupon-admin .hcs-panel { display: none; }
.hover-coupon-admin .hcs-panel.on { display: block; }
.hover-coupon-admin .hcs-card { background: #fff; border: 1px solid #dcdcde; border-radius: 8px; margin-bottom: 14px; overflow: hidden; }
.hover-coupon-admin .hcs-card-head { padding: 14px 18px; border-bottom: 1px solid #f0f0f1; display: flex; justify-content: space-between; gap: 10px; align-items: center; }
.hover-coupon-admin .hcs-card-head h2 { margin: 0; font-size: 14px; font-weight: 700; }
.hover-coupon-admin .hcs-card-body { padding: 18px; }
.hover-coupon-admin .hcs-row { display: grid; grid-template-columns: 1fr 1fr; gap: 14px 16px; }
.hover-coupon-admin .hcs-f { display: flex; flex-direction: column; gap: 6px; }
.hover-coupon-admin .hcs-f.full { grid-column: 1 / -1; }
.hover-coupon-admin .hcs-f label { font-size: 13px; font-weight: 600; }
.hover-coupon-admin .hcs-f input, .hover-coupon-admin .hcs-f select { border: 1px solid #c3c4c7; border-radius: 6px; padding: 8px 10px; font-size: 13px; width: 100%; }
.hover-coupon-admin .hcs-f .sub { font-size: 11px; color: #646970; }
.hover-coupon-admin .hcs-type-row { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.hover-coupon-admin .hcs-type { border: 1px solid #dcdcde; border-radius: 8px; padding: 14px 10px; cursor: pointer; text-align: center; background: #fcfcfd; }
.hover-coupon-admin .hcs-type.on { border-color: #2a514d; background: #edf7f1; }
.hover-coupon-admin .hcs-type-name { font-size: 12px; font-weight: 700; }
.hover-coupon-admin .hcs-type-sub { font-size: 11px; color: #646970; margin-top: 2px; }
.hover-coupon-admin .hcs-sep { border: none; border-top: 1px solid #eef2f6; margin: 16px 0; }
.hover-coupon-admin .hcs-ck { display: flex; align-items: center; gap: 8px; font-size: 13px; cursor: pointer; }
.hover-coupon-admin .hcs-ck input { width: 16px; height: 16px; accent-color: #2a514d; }
.hover-coupon-admin .hcs-ck-row { display: flex; gap: 20px; flex-wrap: wrap; }
.hover-coupon-admin .hcs-foot { display: flex; gap: 10px; margin-top: 16px; padding-top: 16px; border-top: 1px solid #eef2f6; }
.hover-coupon-admin .btn { display: inline-flex; align-items: center; gap: 6px; padding: 8px 14px; border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer; border: none; text-decoration: none; }
.hover-coupon-admin .btn-p { background: #2a514d; color: #fff; }
.hover-coupon-admin .btn-s { background: #fff; color: #202223; border: 1px solid #c3c4c7; }
.hover-coupon-admin .btn-d { background: #fff; color: #b32d2e; border: 1px solid #f0c8c8; }
.hover-coupon-admin .btn-sm { padding: 5px 10px; font-size: 12px; }
.hover-coupon-admin .hcs-notice { padding: 12px 14px; border-radius: 8px; margin-bottom: 14px; font-size: 13px; }
.hover-coupon-admin .hcs-ok { background: #edf7f1; border: 1px solid #b8dfd0; color: #1a6847; }
.hover-coupon-admin .hcs-err { background: #fcf0f0; border: 1px solid #f0c8c8; color: #8a1f1f; }
.hover-coupon-admin .hcs-tbl { width: 100%; border-collapse: collapse; font-size: 13px; }
.hover-coupon-admin .hcs-tbl th { background: #f6f7f7; padding: 10px 12px; text-align: left; font-size: 11px; font-weight: 700; color: #646970; border-bottom: 1px solid #dcdcde; }
.hover-coupon-admin .hcs-tbl td { padding: 12px; border-bottom: 1px solid #f0f0f1; vertical-align: middle; }
.hover-coupon-admin .hcs-code { font-family: ui-monospace, monospace; font-size: 12px; font-weight: 700; background: #f6f7f7; padding: 3px 8px; border-radius: 4px; }
.hover-coupon-admin .hcs-tag { display: inline-block; padding: 3px 8px; border-radius: 999px; font-size: 11px; font-weight: 600; }
.hover-coupon-admin .tg-g { background: #d3f7d3; color: #1a5c1a; }
.hover-coupon-admin .tg-b { background: #dce8ff; color: #1a3a7a; }
.hover-coupon-admin .tg-y { background: #fff0c3; color: #7a4f00; }
.hover-coupon-admin .tg-r { background: #fdd; color: #9b2c2c; }
.hover-coupon-admin .tg-n { background: #f0f0f1; color: #646970; }
.hover-coupon-admin .tg-p { background: #f0e0ff; color: #6a1a9a; }
.hover-coupon-admin .hcs-tpl-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
.hover-coupon-admin .hcs-tpl { border: 1px solid #dcdcde; border-radius: 8px; padding: 14px; cursor: pointer; background: #fcfcfd; }
.hover-coupon-admin .hcs-tpl:hover { border-color: #2a514d; }
.hover-coupon-admin .hcs-tpl-badge { font-size: 10px; font-weight: 700; padding: 2px 7px; border-radius: 999px; margin-bottom: 8px; display: inline-block; }
.hover-coupon-admin .hcs-tpl h3 { margin: 0 0 6px; font-size: 13px; font-weight: 700; }
.hover-coupon-admin .hcs-tpl p { margin: 0 0 8px; font-size: 12px; color: #646970; line-height: 1.5; }
.hover-coupon-admin .hcs-tpl-meta { font-size: 11px; font-weight: 600; color: #2a514d; }
.hover-coupon-admin .hcs-empty { padding: 48px 24px; text-align: center; color: #646970; font-size: 13px; }
.hover-coupon-admin .hcs-bar { display: flex; gap: 10px; margin-bottom: 14px; flex-wrap: wrap; }
.hover-coupon-admin .hcs-bar input, .hover-coupon-admin .hcs-bar select { border: 1px solid #c3c4c7; border-radius: 6px; padding: 8px 10px; font-size: 13px; }
.hover-coupon-admin .hcs-bar input { flex: 1; min-width: 180px; }
.hover-coupon-admin .hcs-note { font-size: 12px; color: #646970; background: #f6f7f7; border-radius: 8px; padding: 12px 14px; margin-bottom: 14px; line-height: 1.6; }
@media (max-width: 720px) {
    .hover-coupon-admin .hcs-stats, .hover-coupon-admin .hcs-row, .hover-coupon-admin .hcs-tpl-grid { grid-template-columns: 1fr; }
}
CSS;
}

function hcs_js(): string
{
    return <<<'JS'
jQuery(function($){
  $(document).on('click','.hcs-nav-btn',function(){
    var t=$(this).data('t');
    $('.hcs-nav-btn').removeClass('on');
    $(this).addClass('on');
    $('.hcs-panel').removeClass('on');
    $('#hcs-'+t).addClass('on');
    history.replaceState(null,'','?page=hcs&t='+t);
  });
  var t0=new URLSearchParams(location.search).get('t')||'dash';
  $('.hcs-nav-btn[data-t="'+t0+'"]').trigger('click');

  $(document).on('click','.hcs-type',function(){
    $('.hcs-type').removeClass('on');$(this).addClass('on');
    var v=$(this).data('v');
    $('[name=type]').val(v);
    $('#hcs-amount-lbl').text(v==='percent'?'折扣百分比（%）':'折抵金額（NT$）');
  });

  $(document).on('click','.hcs-tpl',function(){
    var d=$(this).data('d'); if(!d)return;
    if(typeof d==='string')d=JSON.parse(d);
    Object.keys(d).forEach(function(k){
      if(k==='solo'||k==='nosale'){
        var ck=document.querySelector('[name="'+k+'"]');
        if(ck) ck.checked=!!d[k];
        return;
      }
      var el=document.querySelector('[name="'+k+'"]'); if(el)el.value=d[k];
    });
    $('.hcs-type').removeClass('on');
    $('.hcs-type[data-v="'+(d.type||'fixed_cart')+'"]').addClass('on');
    $('[name=type]').val(d.type||'fixed_cart');
    $('#hcs-amount-lbl').text((d.type||'')==='percent'?'折扣百分比（%）':'折抵金額（NT$）');
    $('.hcs-nav-btn[data-t="create"]').trigger('click');
  });

  $(document).on('change','[name=expiry_mode]',function(){
    $('#hcs-days-row').toggle($(this).val()==='days');
    $('#hcs-date-row').toggle($(this).val()==='date');
  });

  $(document).on('click','.hcs-copy',function(){
    var code=$(this).data('code');
    navigator.clipboard.writeText(code).then(function(){
      var $b=$('.hcs-copy[data-code="'+code+'"]');
      var t=$b.text(); $b.text('已複製'); setTimeout(function(){$b.text(t||'複製');},1800);
    });
  });

  $(document).on('input','#hcs-search',function(){
    var q=$(this).val().toLowerCase();
    $('#hcs-tbl tr[data-row]').each(function(){$(this).toggle($(this).text().toLowerCase().includes(q));});
  });
  $(document).on('change','#hcs-kind',function(){
    var k=$(this).val();
    $('#hcs-tbl tr[data-row]').each(function(){$(this).toggle(!k||$(this).data('kind')===k);});
  });
  $(document).on('click','.hcs-del',function(){return confirm('確定刪除？此動作無法復原。');});
});
JS;
}

function hcs_page(): void
{
    if (!current_user_can('manage_woocommerce')) {
        wp_die('權限不足');
    }
    $res = hcs_post();
    $stats = hcs_stats();
    $km = hcs_kind_map();
    $search = sanitize_text_field($_GET['s'] ?? '');
    $kf = sanitize_text_field($_GET['kind'] ?? '');
    $rows = hcs_coupons($search, $kf);
    $now = time();
    $tpls = hcs_tpls();
    ?>
<div class="wrap hover-coupon-admin">
<div class="hcs">

<?php if ($res): ?>
<div class="hcs-notice <?php echo $res['ok'] ? 'hcs-ok' : 'hcs-err'; ?>">
    <?php echo esc_html($res['msg']); ?>
    <?php if (!empty($res['code'])): ?>
        — <strong style="font-family:monospace"><?php echo esc_html($res['code']); ?></strong>
        <?php if (!empty($res['edit'])): ?>
            <a href="<?php echo esc_url($res['edit']); ?>" style="margin-left:6px;font-size:12px">在 WooCommerce 編輯 →</a>
        <?php endif; ?>
    <?php endif; ?>
</div>
<?php endif; ?>

<div class="hcs-topbar">
    <div>
        <h1>HOVER 優惠碼</h1>
        <p>精簡版：入會禮／生日禮／推薦禮／活動促銷。會員升級與生日自動派發請見「會員引擎」Snippet。</p>
    </div>
    <a href="<?php echo esc_url(admin_url('edit.php?post_type=shop_coupon')); ?>" class="btn btn-s btn-sm">WooCommerce 折價券 →</a>
</div>

<div class="hcs-note">
    <strong>會員規則對齊：</strong>
    入會禮 NT$100（滿 1,000／90 天）·
    生日禮 好友 NT$100／臻享 NT$300（滿 1,000／30 天／不可併用）·
    推薦禮 NT$50。
    臻享 95 折與滿額免運由官網／結帳自動計算，不透過此處發券。
</div>

<div class="hcs-stats">
    <div class="hcs-stat"><div class="hcs-stat-n"><?php echo (int) $stats['total']; ?></div><div class="hcs-stat-l">全部優惠碼</div></div>
    <div class="hcs-stat"><div class="hcs-stat-n"><?php echo (int) $stats['active']; ?></div><div class="hcs-stat-l">啟用中</div></div>
    <div class="hcs-stat"><div class="hcs-stat-n"><?php echo (int) $stats['expiring']; ?></div><div class="hcs-stat-l">7 天內到期</div></div>
    <div class="hcs-stat"><div class="hcs-stat-n"><?php echo (int) $stats['used']; ?></div><div class="hcs-stat-l">累計使用次數</div></div>
</div>

<div class="hcs-nav">
    <button type="button" class="hcs-nav-btn" data-t="dash">總覽</button>
    <button type="button" class="hcs-nav-btn" data-t="create">建立優惠碼</button>
    <button type="button" class="hcs-nav-btn" data-t="list">管理</button>
</div>

<!-- 總覽 -->
<div id="hcs-dash" class="hcs-panel">
    <div class="hcs-card">
        <div class="hcs-card-head">
            <h2>快速範本</h2>
            <span style="font-size:12px;color:#6d7175">點選套用至「建立優惠碼」</span>
        </div>
        <div class="hcs-card-body">
            <div class="hcs-tpl-grid">
            <?php foreach ($tpls as [$badge, $title, $desc, $meta, $data]): ?>
                <div class="hcs-tpl" data-d="<?php echo esc_attr(wp_json_encode($data)); ?>">
                    <span class="hcs-tpl-badge <?php echo esc_attr($badge[0]); ?>"><?php echo esc_html($badge[1]); ?></span>
                    <h3><?php echo esc_html($title); ?></h3>
                    <p><?php echo esc_html($desc); ?></p>
                    <span class="hcs-tpl-meta"><?php echo esc_html($meta); ?></span>
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
            <?php foreach (array_slice($rows, 0, 8) as $r):
                $exp = $r['expires'] && strtotime($r['expires']) < $now;
                ?>
                <tr>
                    <td><span class="hcs-code"><?php echo esc_html($r['code']); ?></span></td>
                    <td><span class="hcs-tag tg-b"><?php echo esc_html($km[$r['kind']] ?? $r['kind']); ?></span></td>
                    <td><?php echo $r['type'] === 'percent' ? esc_html($r['amount']) . '%' : 'NT$' . number_format((float) $r['amount']); ?></td>
                    <td><?php echo (int) $r['used']; ?>/<?php echo $r['limit'] > 0 ? (int) $r['limit'] : '∞'; ?></td>
                    <td style="font-size:12px"><?php echo $r['expires'] ? esc_html($r['expires']) : '—'; ?></td>
                    <td>
                        <?php if ($r['status'] === 'draft'): ?><span class="hcs-tag tg-n">暫停</span>
                        <?php elseif ($exp): ?><span class="hcs-tag tg-r">過期</span>
                        <?php else: ?><span class="hcs-tag tg-g">啟用</span><?php endif; ?>
                    </td>
                </tr>
            <?php endforeach; ?>
            </tbody>
        </table>
    </div>
    <?php endif; ?>
</div>

<!-- 建立 -->
<div id="hcs-create" class="hcs-panel">
<form method="post">
<?php wp_nonce_field('hcs', 'hcs_nonce'); ?>
<input type="hidden" name="hcs_act" value="create">
<input type="hidden" name="type" value="fixed_cart">

<div class="hcs-card">
    <div class="hcs-card-head"><h2>優惠類型</h2></div>
    <div class="hcs-card-body">
        <div class="hcs-type-row">
            <div class="hcs-type on" data-v="fixed_cart"><div class="hcs-type-name">固定金額</div><div class="hcs-type-sub">整單折抵（入會／生日／推薦）</div></div>
            <div class="hcs-type" data-v="percent"><div class="hcs-type-name">百分比</div><div class="hcs-type-sub">活動檔期用</div></div>
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
                <label>自訂代碼（選填）</label>
                <input type="text" name="code" placeholder="HOVER-WELCOME-123">
            </div>
            <div class="hcs-f">
                <label id="hcs-amount-lbl">折抵金額（NT$）</label>
                <input type="number" name="amount" min="0" step="1" value="100">
            </div>
            <div class="hcs-f">
                <label>種類</label>
                <select name="kind">
                    <?php foreach ($km as $v => $l): ?>
                        <option value="<?php echo esc_attr($v); ?>"><?php echo esc_html($l); ?></option>
                    <?php endforeach; ?>
                </select>
            </div>
            <div class="hcs-f full">
                <label>說明</label>
                <input type="text" name="desc" value="HOVER 優惠券">
            </div>
        </div>
    </div>
</div>

<div class="hcs-card">
    <div class="hcs-card-head"><h2>使用條件</h2></div>
    <div class="hcs-card-body">
        <div class="hcs-row">
            <div class="hcs-f">
                <label>最低消費（NT$）</label>
                <input type="number" name="min" min="0" value="1000">
                <span class="sub">入會／生日預設 1000</span>
            </div>
            <div class="hcs-f">
                <label>全域使用次數上限</label>
                <input type="number" name="usage_limit" min="0" value="1">
            </div>
            <div class="hcs-f">
                <label>每人限用次數</label>
                <input type="number" name="per_user" min="1" value="1">
            </div>
            <div class="hcs-f">
                <label>限定 Email（選填）</label>
                <input type="email" name="email" placeholder="member@example.com">
                <span class="sub">入會禮、生日禮建議綁定本人</span>
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
                <option value="date">指定到期日</option>
            </select>
        </div>
        <div id="hcs-days-row">
            <div class="hcs-f" style="max-width:200px">
                <label>有效天數</label>
                <input type="number" name="days" min="1" value="30">
                <span class="sub">入會 90／生日 30</span>
            </div>
        </div>
        <div id="hcs-date-row" style="display:none">
            <div class="hcs-f" style="max-width:240px">
                <label>結束日期（到期）</label>
                <input type="date" name="date_end">
            </div>
        </div>
    </div>
</div>

<div class="hcs-foot">
    <button type="submit" class="btn btn-p">建立優惠碼</button>
</div>
</form>
</div>

<!-- 管理 -->
<div id="hcs-list" class="hcs-panel">
    <div class="hcs-card">
        <div class="hcs-card-head"><h2>優惠碼管理</h2></div>
        <div class="hcs-card-body" style="padding-bottom:0">
            <div class="hcs-bar">
                <input type="text" id="hcs-search" placeholder="搜尋代碼…">
                <select id="hcs-kind">
                    <option value="">所有類型</option>
                    <?php foreach ($km as $v => $l): ?>
                        <option value="<?php echo esc_attr($v); ?>"><?php echo esc_html($l); ?></option>
                    <?php endforeach; ?>
                </select>
            </div>
        </div>
        <?php if (empty($rows)): ?>
        <div class="hcs-empty">尚無 HOVER 優惠碼，請至「建立優惠碼」或用快速範本新增。</div>
        <?php else: ?>
        <div style="overflow-x:auto">
        <table class="hcs-tbl" id="hcs-tbl">
            <thead><tr><th>代碼</th><th>種類</th><th>折扣</th><th>使用</th><th>到期</th><th>狀態</th><th>操作</th></tr></thead>
            <tbody>
            <?php foreach ($rows as $r):
                $exp_r = $r['expires'] && strtotime($r['expires']) < $now;
                ?>
                <tr data-row="1" data-kind="<?php echo esc_attr($r['kind']); ?>">
                    <td>
                        <span class="hcs-code"><?php echo esc_html($r['code']); ?></span>
                        <button type="button" class="hcs-copy btn btn-s btn-sm" data-code="<?php echo esc_attr($r['code']); ?>">複製</button>
                    </td>
                    <td><span class="hcs-tag tg-b"><?php echo esc_html($km[$r['kind']] ?? $r['kind']); ?></span></td>
                    <td style="font-weight:600;white-space:nowrap">
                        <?php echo $r['type'] === 'percent' ? esc_html($r['amount']) . '% OFF' : 'NT$' . number_format((float) $r['amount']); ?>
                        <?php if ((float) $r['min'] > 0): ?>
                            <br><span style="font-size:11px;font-weight:400;color:#6d7175">滿 NT$<?php echo number_format((float) $r['min']); ?></span>
                        <?php endif; ?>
                    </td>
                    <td><?php echo (int) $r['used']; ?>/<?php echo $r['limit'] > 0 ? (int) $r['limit'] : '∞'; ?></td>
                    <td style="font-size:12px;<?php echo $exp_r ? 'color:#d72c0d;font-weight:600' : ''; ?>">
                        <?php echo $r['expires'] ? esc_html($r['expires']) : '—'; ?>
                    </td>
                    <td>
                        <?php if ($r['status'] === 'draft'): ?><span class="hcs-tag tg-n">暫停</span>
                        <?php elseif ($exp_r): ?><span class="hcs-tag tg-r">過期</span>
                        <?php else: ?><span class="hcs-tag tg-g">啟用中</span><?php endif; ?>
                    </td>
                    <td>
                        <div style="display:flex;gap:5px;flex-wrap:wrap">
                        <a href="<?php echo esc_url($r['edit_url']); ?>" class="btn btn-s btn-sm">編輯</a>
                        <form method="post" style="display:contents">
                            <?php wp_nonce_field('hcs', 'hcs_nonce'); ?>
                            <input type="hidden" name="hcs_act" value="toggle">
                            <input type="hidden" name="cid" value="<?php echo (int) $r['id']; ?>">
                            <button type="submit" class="btn btn-s btn-sm"><?php echo $r['status'] === 'publish' ? '暫停' : '啟用'; ?></button>
                        </form>
                        <form method="post" style="display:contents">
                            <?php wp_nonce_field('hcs', 'hcs_nonce'); ?>
                            <input type="hidden" name="hcs_act" value="delete">
                            <input type="hidden" name="cid" value="<?php echo (int) $r['id']; ?>">
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

</div>
</div>
<?php
    hcs_print_admin_styles();
}
