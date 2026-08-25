<?php
/**
 * HOVER — 綠界物流貨態橋接（RY Tools）
 *
 * 產單／列印請用 RY Tools。
 * 本檔只把綠界／RY 貨態寫入 `_hel_LogisticsPhase`，供會員中心顯示：
 *   shipped  → 已出貨
 *   arrived  → 已到貨（門市到店／簡訊取貨通知）
 *   picked   → 已到貨（消費者已取）
 *   unclaimed→ 逾期未取
 *
 * Code Snippets → Everywhere → 啟用（勿與舊產單版並存）
 */

if (!defined('ABSPATH')) {
    exit;
}
if (defined('HEL_LOADED')) {
    return;
}
define('HEL_LOADED', true);

/** @var array<string, string[]> RtnCode → phase */
const HEL_RTN_PHASE = [
    'arrived'   => ['2063', '2073', '3018'], // 商品已送達門市
    'picked'    => ['2067', '3022'],         // 消費者成功取件
    'unclaimed' => ['2074', '3020'],         // 七天未取
    'shipped'   => ['2030', '3024'],         // 已送至物流中心
];

function hel_map_rtn_phase(string $code, string $msg): ?string
{
    $code = trim($code);
    foreach (HEL_RTN_PHASE as $phase => $codes) {
        if (in_array($code, $codes, true)) {
            return $phase;
        }
    }

    if ($msg === '') {
        return null;
    }
    if (preg_match('/逾期未取|七天未取|未取件退回|逾時退貨/u', $msg)) {
        return 'unclaimed';
    }
    if (preg_match('/成功取件|消費者已取|客戶已取|取件完成/u', $msg)) {
        return 'picked';
    }
    if (preg_match('/已送達門市|送達門市|配達完成|配送完成|已送達|成功送達|貨件配達|等待取貨/u', $msg)) {
        return 'arrived';
    }
    if (preg_match('/物流中心|已集貨|配送中|運送中|已收件|已出貨/u', $msg)) {
        return 'shipped';
    }
    return null;
}

function hel_map_status_phase(string $status): ?string
{
    $s = strtolower(str_replace('_', '-', $status));
    if (str_contains($s, 'at-cvs') || str_contains($s, 'wait-pick')) {
        return 'arrived';
    }
    if (str_contains($s, 'out-cvs') || str_contains($s, 'overdue')) {
        return 'unclaimed';
    }
    if (str_contains($s, 'transport')) {
        return 'shipped';
    }
    return null;
}

function hel_set_phase(WC_Order $order, ?string $phase, string $code = '', string $msg = ''): void
{
    if ($code !== '') {
        $order->update_meta_data('_hel_RtnCode', $code);
    }
    if ($msg !== '') {
        $order->update_meta_data('_hel_RtnMsg', $msg);
    }
    if ($phase === null || $phase === '') {
        if ($code !== '' || $msg !== '') {
            $order->save();
        }
        return;
    }

    $prev = (string) $order->get_meta('_hel_LogisticsPhase');
    $order->update_meta_data('_hel_LogisticsPhase', $phase);
    $order->save();

    if ($prev === $phase) {
        return;
    }
    $note = 'HOVER 貨態：' . $phase;
    if ($code !== '') {
        $note .= ' [' . $code . ']';
    }
    if ($msg !== '') {
        $note .= ' ' . $msg;
    }
    $order->add_order_note($note);
}

function hel_order_by_meta(string $key, string $value): ?WC_Order
{
    if ($value === '') {
        return null;
    }
    $orders = wc_get_orders([
        'limit'      => 1,
        'meta_key'   => $key,
        'meta_value' => $value,
    ]);
    return $orders[0] ?? null;
}

function hel_find_order(array $ipn): ?WC_Order
{
    $log_id = sanitize_text_field((string) ($ipn['AllPayLogisticsID'] ?? $ipn['LogisticsID'] ?? ''));
    $trade  = sanitize_text_field((string) ($ipn['MerchantTradeNo'] ?? ''));

    if ($log_id !== '') {
        foreach (['_ecpay_shipping_id', '_hel_AllPayLogisticsID'] as $key) {
            $order = hel_order_by_meta($key, $log_id);
            if ($order) {
                return $order;
            }
        }

        // RY：_ecpay_shipping_info 內含 Logistics ID
        $recent = wc_get_orders([
            'limit'    => 30,
            'orderby'  => 'date',
            'order'    => 'DESC',
            'meta_key' => '_ecpay_shipping_info',
        ]);
        foreach ($recent as $order) {
            $list = $order->get_meta('_ecpay_shipping_info', true);
            if (!is_array($list)) {
                continue;
            }
            foreach ($list as $row) {
                if (!is_array($row)) {
                    continue;
                }
                $id = (string) ($row['ID'] ?? $row['AllPayLogisticsID'] ?? $row['LogisticsID'] ?? '');
                if ($id === $log_id) {
                    return $order;
                }
            }
        }
    }

    if ($trade !== '' && preg_match('/(\d{3,})/', $trade, $m)) {
        $order = wc_get_order((int) $m[1]);
        if ($order) {
            return $order;
        }
    }

    return null;
}

function hel_resolve_order($order_or_id, array $ipn): ?WC_Order
{
    if ($order_or_id instanceof WC_Order) {
        return $order_or_id;
    }
    if (is_numeric($order_or_id)) {
        $order = wc_get_order((int) $order_or_id);
        if ($order) {
            return $order;
        }
    }
    return hel_find_order($ipn);
}

/** RY：綠界物流狀態回傳（$ipn [, $order]） */
function hel_on_ry_response($ipn = null, $order_or_id = null): void
{
    if (!is_array($ipn)) {
        return;
    }
    $order = hel_resolve_order($order_or_id, $ipn);
    if (!$order) {
        return;
    }
    $code  = sanitize_text_field((string) ($ipn['RtnCode'] ?? ''));
    $msg   = sanitize_text_field((string) ($ipn['RtnMsg'] ?? ''));
    $phase = hel_map_rtn_phase($code, $msg);
    hel_set_phase($order, $phase, $code, $msg);
}

add_action('ry_ecpay_shipping_response', 'hel_on_ry_response', 20, 2);

foreach (array_merge(...array_values(HEL_RTN_PHASE)) as $code) {
    add_action('ry_ecpay_shipping_response_status_' . $code, 'hel_on_ry_response', 20, 2);
}

/** RY 訂單狀態變更（如等待取貨／逾時退貨） */
add_action('woocommerce_order_status_changed', function ($order_id, $from, $to) {
    $order = wc_get_order($order_id);
    if (!$order) {
        return;
    }
    $phase = hel_map_status_phase((string) $to);
    if ($phase) {
        hel_set_phase($order, $phase, '', 'status:' . $to);
    }
}, 20, 3);

/** RY 取得物流編號 → 已出貨（不覆蓋已到貨／逾期） */
add_action('ry_ecpay_shipping_get_cvs_no', function ($order_id = 0) {
    $order = wc_get_order(absint($order_id));
    if (!$order) {
        return;
    }
    $prev = (string) $order->get_meta('_hel_LogisticsPhase');
    if (in_array($prev, ['arrived', 'picked', 'unclaimed'], true)) {
        return;
    }
    hel_set_phase($order, 'shipped', '', 'RY 已取得物流編號');
}, 20, 1);

/* ── 後台：模擬貨態（測試用） ── */

add_action('add_meta_boxes', function () {
    $screens = ['shop_order'];
    if (function_exists('wc_get_page_screen_id')) {
        $screens[] = wc_get_page_screen_id('shop-order');
    }
    foreach (array_unique($screens) as $screen) {
        add_meta_box(
            'hel-phase-box',
            'HOVER 會員貨態（測試）',
            'hel_render_phase_box',
            $screen,
            'side',
            'default'
        );
    }
});

function hel_render_phase_box($post_or_order): void
{
    $order = ($post_or_order instanceof WC_Order)
        ? $post_or_order
        : wc_get_order($post_or_order->ID ?? 0);
    if (!$order) {
        echo '<p>找不到訂單。</p>';
        return;
    }

    $phase = (string) $order->get_meta('_hel_LogisticsPhase');
    $labels = [
        'shipped'   => '已出貨',
        'arrived'   => '已到貨',
        'picked'    => '已到貨（已取）',
        'unclaimed' => '逾期未取',
    ];
    $label = $labels[$phase] ?? ($phase !== '' ? $phase : '（尚未設定）');

    echo '<p>目前會員中心顯示：<strong>' . esc_html($label) . '</strong></p>';
    if ($phase !== '') {
        echo '<p class="description"><code>_hel_LogisticsPhase</code> = <code>' . esc_html($phase) . '</code></p>';
    }
    echo '<p class="description">綠界「物流狀態」無法在測試環境模擬到貨；用下面按鈕測前端即可。</p>';

    $id = $order->get_id();
    $btns = [
        'shipped'   => '模擬已出貨',
        'arrived'   => '模擬已到貨',
        'unclaimed' => '模擬逾期未取',
        'clear'     => '清除貨態',
    ];
    foreach ($btns as $key => $text) {
        $url = wp_nonce_url(
            admin_url('admin-post.php?action=hel_sim_phase&order_id=' . $id . '&phase=' . $key),
            'hel_sim_' . $id
        );
        $class = $key === 'arrived' ? 'button button-primary' : 'button';
        echo '<p style="margin:6px 0;"><a class="' . esc_attr($class) . '" href="' . esc_url($url) . '">' . esc_html($text) . '</a></p>';
    }
}

add_action('admin_post_hel_sim_phase', function () {
    if (!current_user_can('manage_woocommerce')) {
        wp_die('權限不足');
    }
    $order_id = absint($_GET['order_id'] ?? 0);
    $phase    = sanitize_text_field((string) ($_GET['phase'] ?? ''));
    if (!$order_id || !wp_verify_nonce($_GET['_wpnonce'] ?? '', 'hel_sim_' . $order_id)) {
        wp_die('連結失效');
    }
    $order = wc_get_order($order_id);
    if (!$order) {
        wp_die('找不到訂單');
    }

    if ($phase === 'clear') {
        $order->delete_meta_data('_hel_LogisticsPhase');
        $order->delete_meta_data('_hel_RtnCode');
        $order->delete_meta_data('_hel_RtnMsg');
        $order->save();
        $order->add_order_note('HOVER 貨態：已清除（測試）');
    } elseif (in_array($phase, ['shipped', 'arrived', 'picked', 'unclaimed'], true)) {
        $fake_code = [
            'shipped'   => '2030',
            'arrived'   => '3018', // 全家／萊爾富：已送達門市
            'picked'    => '3022',
            'unclaimed' => '3020',
        ][$phase];
        hel_set_phase($order, $phase, $fake_code, '手動模擬測試');
    }

    wp_safe_redirect($order->get_edit_order_url());
    exit;
});

