<?php
/**
 * HOVER — 訂單編號 HVYYMMDDXXX
 *
 * 例：HV260825001
 *   HV     = HOVER
 *   260825 = 日期（台北時區 Yymd）
 *   001    = 當日第 N 筆（三位起跳）
 *
 * Code Snippets → Everywhere → 啟用
 * （建議 WP 時區設為「台北」；本檔亦強制以 Asia/Taipei 算日期）
 *
 * 寫入 meta：_hover_order_number
 * 顯示：woocommerce_order_number 過濾器（後台／REST number／列印單皆會用）
 */

if (!defined('ABSPATH')) {
    exit;
}
if (defined('HON_LOADED')) {
    return;
}
define('HON_LOADED', true);

const HON_META = '_hover_order_number';
const HON_PREFIX = 'HV';

function hon_today_ymd(): string
{
    try {
        $tz = new DateTimeZone('Asia/Taipei');
    } catch (Exception $e) {
        $tz = wp_timezone();
    }
    return (new DateTimeImmutable('now', $tz))->format('ymd');
}

/**
 * 當日流水號（含 MySQL GET_LOCK，避免併發重號）
 */
function hon_next_daily_seq(string $ymd): int
{
    global $wpdb;

    $lock = 'hover_ord_seq_' . $ymd;
    $got  = (int) $wpdb->get_var($wpdb->prepare('SELECT GET_LOCK(%s, 10)', $lock));
    if ($got !== 1) {
        // 拿不到鎖仍盡力遞增（極少見）
        $key = 'hover_order_seq_' . $ymd;
        $seq = (int) get_option($key, 0) + 1;
        update_option($key, $seq, false);
        return $seq;
    }

    try {
        $key = 'hover_order_seq_' . $ymd;
        $seq = (int) get_option($key, 0) + 1;
        update_option($key, $seq, false);
        return $seq;
    } finally {
        $wpdb->query($wpdb->prepare('SELECT RELEASE_LOCK(%s)', $lock));
    }
}

function hon_format_number(string $ymd, int $seq): string
{
    $seq = max(1, $seq);
    $pad = $seq < 1000 ? 3 : (int) strlen((string) $seq);
    return HON_PREFIX . $ymd . str_pad((string) $seq, $pad, '0', STR_PAD_LEFT);
}

function hon_assign_order_number($order_or_id): void
{
    $order = $order_or_id instanceof WC_Order
        ? $order_or_id
        : wc_get_order($order_or_id);
    if (!$order instanceof WC_Order) {
        return;
    }

    $existing = (string) $order->get_meta(HON_META);
    if ($existing !== '' && preg_match('/^HV\d{6}\d+$/', $existing)) {
        return;
    }

    $ymd = hon_today_ymd();
    $seq = hon_next_daily_seq($ymd);
    $num = hon_format_number($ymd, $seq);

    $order->update_meta_data(HON_META, $num);
    $order->save();
}

/** REST／後台建立訂單（Next.js checkout 走這條） */
add_action('woocommerce_rest_insert_shop_order_object', function ($order) {
    if ($order instanceof WC_Order) {
        hon_assign_order_number($order);
    }
}, 20, 1);

/** 一般結帳／手動建立 */
add_action('woocommerce_new_order', 'hon_assign_order_number', 20, 1);
add_action('woocommerce_checkout_order_processed', 'hon_assign_order_number', 20, 1);

/** 顯示自訂編號（後台、列印、REST `number`） */
add_filter('woocommerce_order_number', function ($order_number, $order) {
    if (!$order instanceof WC_Order) {
        return $order_number;
    }
    $custom = (string) $order->get_meta(HON_META);
    return $custom !== '' ? $custom : $order_number;
}, 10, 2);

/** 後台搜尋：可用 HV 編號查（HPOS） */
add_filter('woocommerce_order_table_search_query_meta_keys', function (array $keys): array {
    $keys[] = HON_META;
    return $keys;
});

/** 後台搜尋：傳統 post meta */
add_filter('woocommerce_shop_order_search_fields', function (array $fields): array {
    $fields[] = HON_META;
    return $fields;
});
