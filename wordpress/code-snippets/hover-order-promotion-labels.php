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
            echo '。若需改規格，請於本列編輯商品／規格後儲存。';
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
