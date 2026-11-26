<?php
/**
 * HOVER — 訂單明細出貨辨識（滿額贈／加價購）
 *
 * Code Snippets 設定：Run everywhere（或 Only run in administration area 亦可，
 * 但信件／前台訂單若也要標示建議 Run everywhere）。
 *
 * 功能：
 * - 後台訂單商品列清楚標示「一般商品／滿額贈／加價購」
 * - 隨機贈品標示「顏色隨機出貨」並顯示實際出貨 SKU
 * - 訂單側欄摘要活動商品
 */

if (!defined('ABSPATH')) {
    exit;
}
if (defined('HOPL_LOADED')) {
    return;
}
define('HOPL_LOADED', true);

function hopl_item_type(WC_Order_Item $item): string
{
    $type = trim((string) $item->get_meta('_hover_promotion_type', true));
    if ($type === '滿額贈' || $type === 'gift') {
        return 'gift';
    }
    if ($type === '加價購' || $type === 'addon') {
        return 'addon';
    }
    $kind = trim((string) $item->get_meta('_hover_promotion_kind', true));
    if ($kind === 'gift') {
        return 'gift';
    }
    if ($kind === 'addon') {
        return 'addon';
    }
    return 'regular';
}

function hopl_item_is_random(WC_Order_Item $item): bool
{
    $flag = strtolower(trim((string) $item->get_meta('_hover_random_color', true)));
    return in_array($flag, ['yes', '1', 'true'], true);
}

function hopl_item_sku(WC_Order_Item $item): string
{
    $sku = trim((string) $item->get_meta('_hover_fulfillment_sku', true));
    if ($sku !== '') {
        return $sku;
    }
    if ($item instanceof WC_Order_Item_Product) {
        $product = $item->get_product();
        if ($product) {
            return trim((string) $product->get_sku());
        }
    }
    return '';
}

function hopl_type_label(string $type): string
{
    if ($type === 'gift') {
        return '滿額贈';
    }
    if ($type === 'addon') {
        return '加價購';
    }
    return '一般商品';
}

/** 後台／信件商品名稱前綴標籤 */
add_filter('woocommerce_order_item_name', function ($name, $item) {
    if (!$item instanceof WC_Order_Item) {
        return $name;
    }
    $type = hopl_item_type($item);
    $label = hopl_type_label($type);
    $prefix = '[' . $label . ']';
    if ($type === 'gift' && hopl_item_is_random($item)) {
        $prefix .= ' [顏色隨機出貨]';
    }
    // 避免重複加標
    if (strpos((string) $name, '[') === 0) {
        return $name;
    }
    return $prefix . ' ' . $name;
}, 20, 2);

/** 後台訂單項目下方顯示出貨提示 */
add_action('woocommerce_after_order_itemmeta', function ($item_id, $item) {
    if (!$item instanceof WC_Order_Item_Product) {
        return;
    }
    if (!is_admin()) {
        return;
    }
    $type = hopl_item_type($item);
    $sku = hopl_item_sku($item);
    $unit = $item->get_meta('_hover_unit_price', true);
    if ($unit === '' || $unit === null) {
        $qty = max(1, (int) $item->get_quantity());
        $unit = ((float) $item->get_total()) / $qty;
    }

    echo '<div class="hopl-ship-note" style="margin:8px 0 4px;padding:8px 10px;border-left:3px solid #2a514d;background:#f4f8f7;font-size:12px;line-height:1.6;">';
    echo '<strong>出貨辨識：</strong>' . esc_html(hopl_type_label($type));
    if ($type === 'gift') {
        echo '｜成交價 <strong>NT$0</strong>';
        if (hopl_item_is_random($item)) {
            echo '｜<span style="color:#b45309;font-weight:700;">顏色隨機出貨</span>';
            echo '｜請依本列實際規格出貨';
            if ($sku !== '') {
                echo '（SKU：<code>' . esc_html($sku) . '</code>）';
            }
            hopl_render_random_gift_swap_ui($item_id, $item);
        }
    } elseif ($type === 'addon') {
        echo '｜加購成交價 <strong>NT$' . esc_html(number_format((float) $unit)) . '</strong>';
        if ($sku !== '') {
            echo '｜SKU：<code>' . esc_html($sku) . '</code>';
        }
    } else {
        echo '｜一般銷售商品';
    }
    echo '</div>';
}, 20, 2);

/** 友善顯示自訂 meta 鍵名 */
add_filter('woocommerce_order_item_display_meta_key', function ($display_key, $meta) {
    $map = [
        '活動類型' => '活動類型',
        '成交單價' => '成交單價',
        '出貨備註' => '出貨備註',
        '出貨 SKU' => '出貨 SKU',
    ];
    $key = is_object($meta) ? (string) ($meta->key ?? '') : '';
    return $map[$key] ?? $display_key;
}, 10, 2);

/** 訂單編輯頁側欄：活動商品摘要 */
add_action('add_meta_boxes', function () {
    $screens = ['shop_order'];
    if (class_exists(\Automattic\WooCommerce\Internal\DataStores\Orders\CustomOrdersTableController::class)) {
        $screens[] = wc_get_page_screen_id('shop-order');
    }
    foreach (array_unique($screens) as $screen) {
        add_meta_box(
            'hopl-promo-box',
            'HOVER 活動出貨摘要',
            'hopl_render_promo_metabox',
            $screen,
            'side',
            'default'
        );
    }
});

function hopl_render_promo_metabox($post_or_order): void
{
    $order = $post_or_order instanceof WC_Order
        ? $post_or_order
        : wc_get_order(is_object($post_or_order) ? $post_or_order->ID : $post_or_order);
    if (!$order) {
        echo '<p>找不到訂單。</p>';
        return;
    }

    $gift = [];
    $addon = [];
    foreach ($order->get_items() as $item) {
        if (!$item instanceof WC_Order_Item_Product) {
            continue;
        }
        $type = hopl_item_type($item);
        if ($type === 'regular') {
            continue;
        }
        $row = [
            'name'   => $item->get_name(),
            'qty'    => (int) $item->get_quantity(),
            'sku'    => hopl_item_sku($item),
            'random' => hopl_item_is_random($item),
            'total'  => (float) $item->get_total(),
        ];
        if ($type === 'gift') {
            $gift[] = $row;
        } else {
            $addon[] = $row;
        }
    }

    if (!$gift && !$addon) {
        echo '<p style="margin:0;color:#666;">此單無滿額贈／加價購。</p>';
        return;
    }

    if ($gift) {
        echo '<p style="margin:0 0 6px;"><strong>滿額贈</strong></p><ul style="margin:0 0 12px 1.1em;">';
        foreach ($gift as $row) {
            echo '<li>';
            echo esc_html($row['name']) . ' × ' . (int) $row['qty'] . '（NT$0）';
            if ($row['random']) {
                echo '<br><span style="color:#b45309;">顏色隨機出貨</span>';
            }
            if ($row['sku'] !== '') {
                echo '<br>SKU：<code>' . esc_html($row['sku']) . '</code>';
            }
            echo '</li>';
        }
        echo '</ul>';
    }
    if ($addon) {
        echo '<p style="margin:0 0 6px;"><strong>加價購</strong></p><ul style="margin:0 0 0 1.1em;">';
        foreach ($addon as $row) {
            echo '<li>';
            echo esc_html($row['name']) . ' × ' . (int) $row['qty'];
            echo '（NT$' . esc_html(number_format($row['total'])) . '）';
            if ($row['sku'] !== '') {
                echo '<br>SKU：<code>' . esc_html($row['sku']) . '</code>';
            }
            echo '</li>';
        }
        echo '</ul>';
    }
}

/**
 * 取得隨機贈品可更換的候選規格清單（支援：滿額贈活動 reward_ids、同款分色 hover_color_group、同父商品變體）
 *
 * @return array<int, WC_Product> key = product/variation ID
 */
function hopl_random_gift_candidates(WC_Order_Item_Product $item): array
{
    $raw_ids = [];
    $promo_id = trim((string) $item->get_meta('_hover_promotion_id', true));

    // 1. 讀取滿額贈活動規則的 reward_ids
    if ($promo_id !== '') {
        $rules = get_option('hover_promotions_v1', []);
        if (is_array($rules)) {
            foreach ($rules as $rule) {
                if (is_array($rule) && (string) ($rule['id'] ?? '') === $promo_id) {
                    foreach ((array) ($rule['reward_ids'] ?? []) as $rid) {
                        $rid = absint($rid);
                        if ($rid > 0) {
                            $raw_ids[] = $rid;
                        }
                    }
                    if (!empty($rule['reward_id'])) {
                        $raw_ids[] = absint($rule['reward_id']);
                    }
                    break;
                }
            }
        }
    }

    // 2. 目前項目的父商品與同款分色（hover_color_group）
    $cur_product_id = (int) $item->get_product_id();
    $cur_var_id = (int) $item->get_variation_id();
    if ($cur_product_id > 0) {
        $raw_ids[] = $cur_product_id;
        $group = trim((string) get_post_meta($cur_product_id, 'hover_color_group', true));
        if ($group !== '') {
            $sibling_ids = get_posts([
                'post_type'      => 'product',
                'post_status'    => ['publish', 'private'],
                'posts_per_page' => 50,
                'fields'         => 'ids',
                'meta_key'       => 'hover_color_group',
                'meta_value'     => $group,
            ]);
            foreach ($sibling_ids as $sid) {
                $raw_ids[] = (int) $sid;
            }
        }
    }
    if ($cur_var_id > 0) {
        $raw_ids[] = $cur_var_id;
    }

    $candidates = [];
    foreach (array_unique(array_filter($raw_ids)) as $id) {
        $p = wc_get_product($id);
        if (!$p) {
            continue;
        }
        if ($p->is_type('variable')) {
            foreach ($p->get_children() as $cid) {
                $v = wc_get_product($cid);
                if ($v) {
                    $candidates[(int) $v->get_id()] = $v;
                }
            }
        } else {
            $candidates[(int) $p->get_id()] = $p;
        }
    }

    return $candidates;
}

/**
 * 隨機贈品一鍵更換顏色（自動調整原／新變體庫存＋更新出貨 SKU 與訂單備註）
 */
function hopl_render_random_gift_swap_ui(int $item_id, WC_Order_Item_Product $item): void
{
    if (!current_user_can('manage_woocommerce')) {
        return;
    }
    $current_target_id = (int) $item->get_variation_id() ?: (int) $item->get_product_id();
    $candidates = hopl_random_gift_candidates($item);
    if (count($candidates) < 2) {
        return;
    }

    $order_id = (int) $item->get_order_id();
    $nonce = wp_create_nonce('hopl_swap_gift_' . $item_id);

    echo '<div class="hopl-swap-wrap" style="margin-top:6px;padding-top:6px;border-top:1px dashed #cbd5d3;display:flex;flex-wrap:wrap;gap:6px;align-items:center;">';
    echo '<span style="color:#444;">更換顏色：</span>';
    echo '<select class="hopl-swap-select" style="font-size:12px;max-width:300px;">';
    foreach ($candidates as $cid => $v) {
        $attrs = array_values(array_filter($v->get_attributes()));
        $parent_id = $v->is_type('variation') ? (int) $v->get_parent_id() : (int) $v->get_id();
        $color_meta = trim((string) get_post_meta($parent_id, 'hover_product_color', true));
        $attr_label = $attrs ? implode(' / ', $attrs) : ($color_meta !== '' ? $color_meta : $v->get_name());
        $v_sku = trim((string) $v->get_sku());
        $stock_qty = $v->managing_stock() ? (int) $v->get_stock_quantity() : null;
        $label = $attr_label
            . ($v_sku !== '' ? '（' . $v_sku . '）' : '')
            . ($stock_qty !== null ? ' [庫存:' . $stock_qty . ']' : '');
        echo '<option value="' . esc_attr((string) $cid) . '"' . selected($cid, $current_target_id, false) . '>' . esc_html($label) . '</option>';
    }
    echo '</select>';
    echo '<button type="button" class="button button-small hopl-swap-btn" data-order-id="' . esc_attr((string) $order_id) . '" data-item-id="' . esc_attr((string) $item_id) . '" data-current-var="' . esc_attr((string) $current_target_id) . '" data-nonce="' . esc_attr($nonce) . '">套用並調庫存</button>';
    echo '<span class="hopl-swap-msg" style="font-size:11px;color:#2a514d;"></span>';
    echo '</div>';
}

add_action('admin_footer', function () {
    $screen = function_exists('get_current_screen') ? get_current_screen() : null;
    if (!$screen || !in_array($screen->id, ['shop_order', 'woocommerce_page_wc-orders'], true)) {
        return;
    }
    ?>
    <script>
    (function(){
      if (window.__hoplSwapBound) return;
      window.__hoplSwapBound = true;
      document.addEventListener('click', function(e){
        var btn = e.target.closest('.hopl-swap-btn');
        if (!btn) return;
        var wrap = btn.closest('.hopl-swap-wrap');
        var sel = wrap && wrap.querySelector('.hopl-swap-select');
        var msg = wrap && wrap.querySelector('.hopl-swap-msg');
        if (!sel) return;
        var newVar = sel.value;
        var curVar = btn.getAttribute('data-current-var');
        if (!newVar || newVar === curVar) {
          if (msg) msg.textContent = '請選擇其他顏色';
          return;
        }
        if (!confirm('確定更換此贈品顏色？系統會自動將原顏色庫存 +1、新顏色庫存 -1，並更新出貨 SKU。')) return;
        btn.disabled = true;
        if (msg) msg.textContent = '更新中…';
        var fd = new FormData();
        fd.append('action', 'hopl_swap_gift_variation');
        fd.append('order_id', btn.getAttribute('data-order-id'));
        fd.append('item_id', btn.getAttribute('data-item-id'));
        fd.append('new_variation_id', newVar);
        fd.append('nonce', btn.getAttribute('data-nonce'));
        fetch(ajaxurl, { method: 'POST', credentials: 'same-origin', body: fd })
          .then(function(r){ return r.json(); })
          .then(function(res){
            if (res && res.success) {
              if (msg) msg.textContent = '已更換，重新整理中…';
              window.location.reload();
            } else {
              btn.disabled = false;
              if (msg) msg.textContent = (res && res.data && res.data.message) ? res.data.message : '更換失敗';
            }
          })
          .catch(function(){
            btn.disabled = false;
            if (msg) msg.textContent = '網路錯誤，請再試一次';
          });
      });
    })();
    </script>
    <?php
});

add_action('wp_ajax_hopl_swap_gift_variation', function () {
    if (!current_user_can('manage_woocommerce')) {
        wp_send_json_error(['message' => '權限不足'], 403);
    }
    $order_id = (int) ($_POST['order_id'] ?? 0);
    $item_id  = (int) ($_POST['item_id'] ?? 0);
    $new_vid  = (int) ($_POST['new_variation_id'] ?? 0);
    $nonce    = (string) ($_POST['nonce'] ?? '');

    if (!$order_id || !$item_id || !$new_vid || !wp_verify_nonce($nonce, 'hopl_swap_gift_' . $item_id)) {
        wp_send_json_error(['message' => '驗證失敗，請重新整理頁面'], 400);
    }

    $order = wc_get_order($order_id);
    if (!$order instanceof WC_Order) {
        wp_send_json_error(['message' => '找不到訂單'], 404);
    }
    $item = $order->get_item($item_id);
    if (!$item instanceof WC_Order_Item_Product || hopl_item_type($item) !== 'gift' || !hopl_item_is_random($item)) {
        wp_send_json_error(['message' => '此項目不是隨機出貨贈品'], 400);
    }

    $old_vid = (int) $item->get_variation_id();
    $old_pid = (int) $item->get_product_id();
    $old_target_id = $old_vid ?: $old_pid;
    if ($old_target_id === $new_vid) {
        wp_send_json_error(['message' => '顏色未變更'], 400);
    }

    $candidates = hopl_random_gift_candidates($item);
    if (!isset($candidates[$new_vid])) {
        wp_send_json_error(['message' => '選擇的規格不在可更換的贈品清單內'], 400);
    }

    $old_var = wc_get_product($old_target_id);
    $new_var = $candidates[$new_vid];
    $new_parent_id = $new_var->is_type('variation') ? (int) $new_var->get_parent_id() : (int) $new_var->get_id();
    $new_variation_id = $new_var->is_type('variation') ? (int) $new_var->get_id() : 0;

    $qty = max(1, (int) $item->get_quantity());
    $reduced = (int) $item->get_meta('_reduced_stock', true);
    $stock_adjusted = false;
    if ($reduced > 0) {
        if ($old_var && $old_var->managing_stock()) {
            wc_update_product_stock($old_var, $reduced, 'increase');
        }
        if ($new_var->managing_stock()) {
            wc_update_product_stock($new_var, $reduced, 'decrease');
        }
        $stock_adjusted = true;
    }

    $old_sku = $old_var ? trim((string) $old_var->get_sku()) : hopl_item_sku($item);
    $new_sku = trim((string) $new_var->get_sku());

    $item->set_product_id($new_parent_id);
    $item->set_variation_id($new_variation_id);
    $item->set_name($new_var->get_name());

    if ($new_var->is_type('variation')) {
        foreach ($new_var->get_attributes() as $attr_key => $attr_val) {
            $item->update_meta_data($attr_key, $attr_val);
        }
    }
    if ($new_sku !== '') {
        $item->update_meta_data('_hover_fulfillment_sku', $new_sku);
        $item->update_meta_data('出貨 SKU', $new_sku);
        $item->update_meta_data('出貨備註', '顏色隨機出貨（請依出貨 SKU ' . $new_sku . ' 出貨）');
    }
    $item->save();

    $note = sprintf(
        'HOVER：隨機贈品已更換規格（%s → %s）%s',
        $old_sku ?: ('#' . $old_target_id),
        $new_sku ?: ('#' . $new_vid),
        $stock_adjusted ? sprintf('，已自動調整庫存（原 +%d、新 -%d）', $reduced, $reduced) : '（此訂單尚未扣庫存，未異動庫存）'
    );
    $order->add_order_note($note);
    $order->save();

    wp_send_json_success(['message' => 'ok']);
});
