<?php
/**
 * HOVER — 綠界物流貨態橋接（RY Tools）
 *
 * 產單／列印請用 RY Tools。
 * 本檔負責：
 * 1. 綠界／RY 貨態 → `_hel_LogisticsPhase`（會員中心：已出貨／已到貨／逾期未取）
 * 2. 店到店／交貨便代碼 → `_hel_CVSPaymentNo` + `_hel_CVSValidationNo`（後台側欄顯示）
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

/**
 * 從綠界／RY 陣列取出店到店相關欄位。
 *
 * @return array{payment_no:string,validation_no:string,logistics_id:string,booking_note:string}
 */
function hel_extract_cvs_fields(array $data): array
{
    $payment = sanitize_text_field((string) (
        $data['CVSPaymentNo']
        ?? $data['PaymentNo']
        ?? $data['payment_no']
        ?? $data['cvs_no']
        ?? ''
    ));
    $valid = sanitize_text_field((string) (
        $data['CVSValidationNo']
        ?? $data['ValidationNo']
        ?? $data['validation_no']
        ?? $data['cvs_validation_no']
        ?? ''
    ));
    $log_id = sanitize_text_field((string) (
        $data['AllPayLogisticsID']
        ?? $data['LogisticsID']
        ?? $data['ID']
        ?? $data['id']
        ?? ''
    ));
    $booking = sanitize_text_field((string) (
        $data['BookingNote']
        ?? $data['booking_note']
        ?? ''
    ));

    return [
        'payment_no'    => $payment,
        'validation_no' => $valid,
        'logistics_id'  => $log_id,
        'booking_note'  => $booking,
    ];
}

/**
 * 7-11 C2C：交貨便代碼 = CVSPaymentNo + CVSValidationNo
 * 全家／萊爾富／OK：通常只有 CVSPaymentNo
 */
function hel_format_cvs_code(string $payment_no, string $validation_no = ''): string
{
    $payment_no = trim($payment_no);
    $validation_no = trim($validation_no);
    if ($payment_no === '') {
        return '';
    }
    if ($validation_no === '') {
        return $payment_no;
    }
    // 已含驗證碼則不重複串
    if (str_ends_with($payment_no, $validation_no)) {
        return $payment_no;
    }
    return $payment_no . $validation_no;
}

/** 寫入店到店／物流 meta（有值才更新） */
function hel_save_cvs_meta(WC_Order $order, array $fields, bool $add_note = false): void
{
    $changed = false;

    if ($fields['payment_no'] !== '') {
        $prev = (string) $order->get_meta('_hel_CVSPaymentNo');
        if ($prev !== $fields['payment_no']) {
            $order->update_meta_data('_hel_CVSPaymentNo', $fields['payment_no']);
            $changed = true;
        }
    }
    if ($fields['validation_no'] !== '') {
        $prev = (string) $order->get_meta('_hel_CVSValidationNo');
        if ($prev !== $fields['validation_no']) {
            $order->update_meta_data('_hel_CVSValidationNo', $fields['validation_no']);
            $changed = true;
        }
    }
    if ($fields['logistics_id'] !== '') {
        $prev = (string) $order->get_meta('_hel_AllPayLogisticsID');
        if ($prev !== $fields['logistics_id']) {
            $order->update_meta_data('_hel_AllPayLogisticsID', $fields['logistics_id']);
            $changed = true;
        }
    }
    if ($fields['booking_note'] !== '') {
        $prev = (string) $order->get_meta('_hel_BookingNote');
        if ($prev !== $fields['booking_note']) {
            $order->update_meta_data('_hel_BookingNote', $fields['booking_note']);
            $changed = true;
        }
    }

    $code = hel_format_cvs_code(
        (string) ($fields['payment_no'] !== '' ? $fields['payment_no'] : $order->get_meta('_hel_CVSPaymentNo')),
        (string) ($fields['validation_no'] !== '' ? $fields['validation_no'] : $order->get_meta('_hel_CVSValidationNo'))
    );
    if ($code !== '') {
        $prev = (string) $order->get_meta('_hel_CVSCode');
        if ($prev !== $code) {
            $order->update_meta_data('_hel_CVSCode', $code);
            $changed = true;
        }
    }

    if (!$changed) {
        return;
    }

    $order->save();

    if ($add_note && $code !== '') {
        $order->add_order_note('HOVER 店到店編號／交貨便代碼：' . $code);
    }
}

/**
 * 若 HOVER meta 尚無編號，嘗試從 RY `_ecpay_shipping_info` 回填。
 */
function hel_sync_cvs_from_ry(WC_Order $order): void
{
    if ((string) $order->get_meta('_hel_CVSPaymentNo') !== '') {
        return;
    }

    $list = $order->get_meta('_ecpay_shipping_info', true);
    if (!is_array($list) || !$list) {
        return;
    }

    // 取最新一筆有寄貨編號的
    $rows = array_reverse($list);
    foreach ($rows as $row) {
        if (!is_array($row)) {
            continue;
        }
        $fields = hel_extract_cvs_fields($row);
        if ($fields['payment_no'] === '' && $fields['logistics_id'] === '') {
            continue;
        }
        hel_save_cvs_meta($order, $fields, false);
        return;
    }
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

    hel_save_cvs_meta($order, hel_extract_cvs_fields($ipn), false);

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

/**
 * RY 取得物流編號成功。
 * 參數：($ipn, $shipping_info, $order) — 舊版誤當 order_id，已修正。
 */
add_action('ry_ecpay_shipping_get_cvs_no', function ($ipn = null, $shipping_info = null, $order = null) {
    if (!$order instanceof WC_Order) {
        if (is_numeric($ipn)) {
            $order = wc_get_order((int) $ipn);
        } elseif (is_array($ipn)) {
            $order = hel_find_order($ipn);
        }
    }
    if (!$order instanceof WC_Order) {
        return;
    }

    $fields = ['payment_no' => '', 'validation_no' => '', 'logistics_id' => '', 'booking_note' => ''];
    if (is_array($ipn)) {
        $fields = hel_extract_cvs_fields($ipn);
    }
    if (is_array($shipping_info)) {
        $from_info = hel_extract_cvs_fields($shipping_info);
        foreach ($from_info as $k => $v) {
            if ($v !== '' && $fields[$k] === '') {
                $fields[$k] = $v;
            }
        }
    }
    hel_save_cvs_meta($order, $fields, true);

    $prev = (string) $order->get_meta('_hel_LogisticsPhase');
    if (!in_array($prev, ['arrived', 'picked', 'unclaimed'], true)) {
        hel_set_phase($order, 'shipped', '', 'RY 已取得物流編號');
    }
}, 20, 3);

/** 整單批次取得編號後再掃一次 */
add_action('ry_ecpay_shipping_get_all_cvs_no', function ($shipping_list = null, $order = null) {
    if (!$order instanceof WC_Order) {
        return;
    }
    if (is_array($shipping_list)) {
        foreach ($shipping_list as $row) {
            if (!is_array($row)) {
                continue;
            }
            $fields = hel_extract_cvs_fields($row);
            if ($fields['payment_no'] !== '' || $fields['logistics_id'] !== '') {
                hel_save_cvs_meta($order, $fields, true);
                break;
            }
        }
    }
    hel_sync_cvs_from_ry($order);
}, 20, 2);

/* ── 後台側欄：店到店編號 + 貨態測試 ── */

add_action('add_meta_boxes', function () {
    $screens = ['shop_order'];
    if (function_exists('wc_get_page_screen_id')) {
        $screens[] = wc_get_page_screen_id('shop-order');
    }
    foreach (array_unique($screens) as $screen) {
        add_meta_box(
            'hel-phase-box',
            'HOVER 物流／店到店',
            'hel_render_phase_box',
            $screen,
            'side',
            'high'
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

    hel_sync_cvs_from_ry($order);

    $cvs_code  = (string) $order->get_meta('_hel_CVSCode');
    $payment   = (string) $order->get_meta('_hel_CVSPaymentNo');
    $valid     = (string) $order->get_meta('_hel_CVSValidationNo');
    $log_id    = (string) $order->get_meta('_hel_AllPayLogisticsID');
    $booking   = (string) $order->get_meta('_hel_BookingNote');

    if ($cvs_code === '') {
        $cvs_code = hel_format_cvs_code($payment, $valid);
    }

    echo '<div style="margin-bottom:12px;padding:10px;background:#f6f7f7;border:1px solid #dcdcde;border-radius:4px;">';
    echo '<p style="margin:0 0 6px;font-size:11px;color:#646970;text-transform:uppercase;letter-spacing:.04em;">店到店編號／交貨便代碼</p>';
    if ($cvs_code !== '') {
        echo '<p style="margin:0;font-size:18px;font-weight:700;letter-spacing:.02em;word-break:break-all;">'
            . esc_html($cvs_code) . '</p>';
    } else {
        echo '<p style="margin:0;color:#996800;">尚未取得（請先在 RY Tools 按「取得物流編號」）</p>';
    }
    if ($payment !== '' && $valid !== '') {
        echo '<p class="description" style="margin:8px 0 0;">寄貨編號 <code>' . esc_html($payment)
            . '</code> ＋ 驗證碼 <code>' . esc_html($valid) . '</code></p>';
    } elseif ($payment !== '') {
        echo '<p class="description" style="margin:8px 0 0;">寄貨編號 <code>' . esc_html($payment) . '</code></p>';
    }
    if ($log_id !== '') {
        echo '<p class="description" style="margin:6px 0 0;">綠界物流編號 <code>' . esc_html($log_id) . '</code></p>';
    }
    if ($booking !== '') {
        echo '<p class="description" style="margin:6px 0 0;">託運單號 <code>' . esc_html($booking) . '</code></p>';
    }
    echo '</div>';

    $phase = (string) $order->get_meta('_hel_LogisticsPhase');
    $labels = [
        'shipped'   => '已出貨',
        'arrived'   => '已到貨',
        'picked'    => '已到貨（已取）',
        'unclaimed' => '逾期未取',
    ];
    $label = $labels[$phase] ?? ($phase !== '' ? $phase : '（尚未設定）');

    echo '<p>會員中心貨態：<strong>' . esc_html($label) . '</strong></p>';
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
            'arrived'   => '3018',
            'picked'    => '3022',
            'unclaimed' => '3020',
        ][$phase];
        hel_set_phase($order, $phase, $fake_code, '手動模擬測試');
    }

    wp_safe_redirect($order->get_edit_order_url());
    exit;
});
