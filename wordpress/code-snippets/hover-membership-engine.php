<?php
/**
 * HOVER — 會員分級同步 + 生日禮自動派發／當月補發
 *
 * 使用方式：Code Snippets → 貼上 → Run everywhere → 啟用
 *
 * 功能：
 * 1. 訂單 processing / completed 時，依「已付款訂單淨額（扣除退款）」同步臻享會員 meta
 * 2. 每月 1 日 09:00 自動派發當月壽星生日禮 WC 原生折扣碼 + 寄信（純文字）
 * 3. 當月壽星若於月中註冊／補填生日 → 立即補發（FRIENDS／臻享皆適用）
 * 4. 發券通知：先寄 service@hoverofficial.com、bob112722761236tom@gmail.com，再寄會員本人（無 emoji）
 */

if (!defined('ABSPATH')) {
    exit;
}

if (defined('HME_LOADED')) {
    return;
}
define('HME_LOADED', true);

const HME_EXCLUSIVE_UPGRADE = 10000;
const HME_EXCLUSIVE_RENEW = 8000;
const HME_EXCLUSIVE_MONTHS = 12;
const HME_BIRTHDAY_FRIENDS = 100;
const HME_BIRTHDAY_EXCLUSIVE = 300;
const HME_GIFT_MIN = 1000;
const HME_BIRTHDAY_DAYS = 30;

add_action('woocommerce_order_status_processing', 'hme_on_order_paid', 20, 1);
add_action('woocommerce_order_status_completed', 'hme_on_order_paid', 20, 1);

add_action('init', function () {
    if (!wp_next_scheduled('hme_monthly_birthday_cron')) {
        wp_schedule_event(strtotime('first day of next month 09:00:00'), 'monthly', 'hme_monthly_birthday_cron');
    }
});
add_action('hme_monthly_birthday_cron', 'hme_dispatch_birthday_coupons');

// 註冊完成、生日欄位寫入 → 當月壽星補發
add_action('user_register', 'hme_maybe_grant_birthday_for_user', 30, 1);
add_action('profile_update', 'hme_maybe_grant_birthday_for_user', 30, 1);
add_action('updated_user_meta', 'hme_on_birthday_meta_saved', 20, 4);
add_action('added_user_meta', 'hme_on_birthday_meta_saved', 20, 4);

add_filter('cron_schedules', function ($schedules) {
    if (!isset($schedules['monthly'])) {
        $schedules['monthly'] = [
            'interval' => 30 * DAY_IN_SECONDS,
            'display'  => 'Monthly',
        ];
    }
    return $schedules;
});

function hme_meta_get(array $meta, string $key, string $default = ''): string
{
    foreach ($meta as $row) {
        if (($row['key'] ?? '') === $key) {
            return (string) ($row['value'] ?? '');
        }
    }
    return $default;
}

function hme_order_net_total(WC_Order $order): float
{
    $total = (float) $order->get_total();
    $refunded = (float) $order->get_total_refunded();
    return max(0, $total - $refunded);
}

function hme_fetch_orders_12m(int $customer_id): array
{
    $after = (new DateTime('-12 months'))->format('Y-m-d H:i:s');
    return wc_get_orders([
        'customer_id' => $customer_id,
        'status'      => ['processing', 'completed'],
        'date_after'  => $after,
        'limit'       => -1,
        'return'      => 'objects',
    ]);
}

function hme_sum_orders(array $orders): float
{
    $sum = 0;
    foreach ($orders as $order) {
        if ($order instanceof WC_Order) {
            $sum += hme_order_net_total($order);
        }
    }
    return $sum;
}

function hme_is_exclusive_active(string $expires): bool
{
    if ($expires === '') {
        return false;
    }
    return strtotime($expires) > time();
}

function hme_sync_customer_membership(int $customer_id): void
{
    if (!$customer_id) {
        return;
    }

    $orders = hme_fetch_orders_12m($customer_id);
    $total12m = hme_sum_orders($orders);

    $since = get_user_meta($customer_id, 'hover_exclusive_since', true);
    $expires = get_user_meta($customer_id, 'hover_exclusive_expires', true);
    $active = hme_is_exclusive_active((string) $expires);

    if (!$active && $total12m >= HME_EXCLUSIVE_UPGRADE) {
        $now = current_time('mysql');
        $exp = (new DateTime($now))->modify('+' . HME_EXCLUSIVE_MONTHS . ' months')->format('Y-m-d H:i:s');
        update_user_meta($customer_id, 'hover_exclusive_since', $now);
        update_user_meta($customer_id, 'hover_exclusive_expires', $exp);
        update_user_meta($customer_id, 'hover_exclusive_period_spend', '0');
        return;
    }

    if ($active && $since && $expires) {
        $period = 0;
        $sinceTs = strtotime($since);
        $untilTs = strtotime($expires);
        foreach ($orders as $order) {
            if (!$order instanceof WC_Order) {
                continue;
            }
            $t = $order->get_date_created() ? $order->get_date_created()->getTimestamp() : 0;
            if ($t >= $sinceTs && $t <= $untilTs) {
                $period += hme_order_net_total($order);
            }
        }

        if ($period >= HME_EXCLUSIVE_RENEW) {
            $newExp = (new DateTime($expires))->modify('+' . HME_EXCLUSIVE_MONTHS . ' months')->format('Y-m-d H:i:s');
            update_user_meta($customer_id, 'hover_exclusive_expires', $newExp);
            update_user_meta($customer_id, 'hover_exclusive_period_spend', '0');
        } else {
            update_user_meta($customer_id, 'hover_exclusive_period_spend', (string) round($period));
        }
    }
}

function hme_on_order_paid($order_id): void
{
    $order = wc_get_order($order_id);
    if (!$order) {
        return;
    }
    $customer_id = (int) $order->get_customer_id();
    if ($customer_id > 0) {
        hme_sync_customer_membership($customer_id);
    }
}

function hme_birthday_coupon_code(int $customer_id, int $month): string
{
    return 'HOVER-BDAY-' . $month . '-' . $customer_id;
}

function hme_create_gift_coupon(string $code, float $amount, string $email, string $description, int $days, string $kind): void
{
    if (wc_get_coupon_id_by_code($code)) {
        return;
    }

    $coupon = new WC_Coupon();
    $coupon->set_code($code);
    $coupon->set_discount_type('fixed_cart');
    $coupon->set_amount($amount);
    $coupon->set_individual_use(true);
    $coupon->set_usage_limit(1);
    $coupon->set_usage_limit_per_user(1);
    $coupon->set_email_restrictions([strtolower($email)]);
    $coupon->set_minimum_amount(HME_GIFT_MIN);
    $coupon->set_description($description);
    $coupon->set_date_expires((new DateTime('+' . $days . ' days'))->getTimestamp());
    $coupon->update_meta_data('hover_coupon_kind', $kind);
    $coupon->save();
}

/**
 * 讀取會員生日（Y-m-d）
 */
function hme_get_user_birthday(int $user_id): string
{
    $birthday = (string) get_user_meta($user_id, 'birthday', true);
    if ($birthday === '') {
        $birthday = (string) get_user_meta($user_id, 'billing_birth_date', true);
    }
    if ($birthday === '') {
        $birthday = (string) get_user_meta($user_id, '_billing_birth_date', true);
    }
    return substr(trim($birthday), 0, 10);
}

function hme_birthday_notify_emails(): array
{
    return [
        'service@hoverofficial.com',
        'bob112722761236tom@gmail.com',
    ];
}

/**
 * 生日禮通知信（純文字、無 emoji）
 * 先寄管理員，再寄會員本人。
 */
function hme_send_birthday_gift_mail(
    string $customer_email,
    int $month,
    string $code,
    float $amount,
    string $tier
): void {
    $customer_email = strtolower(trim($customer_email));
    if ($customer_email === '') {
        return;
    }

    $headers = ['Content-Type: text/plain; charset=UTF-8'];
    $amount_label = number_format($amount);

    $admin_subject = 'HOVER 生日禮派發通知';
    $admin_body =
        "HOVER 生日禮派發通知\n\n" .
        "會員 Email：{$customer_email}\n" .
        "會員等級：{$tier}\n" .
        "生日月份：{$month} 月\n" .
        "折扣碼：{$code}\n" .
        "面額：NT\${$amount_label}\n" .
        "使用條件：單筆滿 NT$" . HME_GIFT_MIN . "，限本人一次，" . HME_BIRTHDAY_DAYS . " 天內有效\n\n" .
        "此為系統自動通知。\n" .
        "HOVER";

    foreach (hme_birthday_notify_emails() as $admin_to) {
        wp_mail($admin_to, $admin_subject, $admin_body, $headers);
    }

    $member_subject = 'HOVER 生日禮通知';
    $member_body =
        "親愛的會員您好：\n\n" .
        "您的 {$month} 月生日禮已發放，請至會員中心查看，或於結帳時使用以下折扣碼：\n\n" .
        "折扣碼：{$code}\n" .
        "面額：NT\${$amount_label}\n" .
        "使用條件：單筆滿 NT$" . HME_GIFT_MIN . "，限本人使用一次\n" .
        "有效期限：發放日起 " . HME_BIRTHDAY_DAYS . " 天內\n\n" .
        "祝您購物愉快\n" .
        "HOVER";

    wp_mail($customer_email, $member_subject, $member_body, $headers);
}

/**
 * 派發／補發單一位會員的當月生日禮（FRIENDS／臻享皆適用）。
 * 已領過同年同月則略過。
 *
 * @return bool 是否新發成功
 */
function hme_try_grant_birthday_for_user(int $user_id, bool $send_mail = true): bool
{
    if ($user_id <= 0 || !function_exists('wc_get_coupon_id_by_code')) {
        return false;
    }

    $user = get_userdata($user_id);
    if (!$user) {
        return false;
    }

    $email = strtolower((string) $user->user_email);
    if ($email === '') {
        return false;
    }

    $birthday = hme_get_user_birthday($user_id);
    if ($birthday === '') {
        return false;
    }

    $bd = DateTime::createFromFormat('Y-m-d', $birthday);
    if (!$bd) {
        return false;
    }

    $now = new DateTime('now', wp_timezone());
    $month = (int) $now->format('n');
    $year = (int) $now->format('Y');

    if ((int) $bd->format('n') !== $month) {
        return false;
    }

    $meta_key = 'hover_birthday_claim_' . $year . '_' . $month;
    if (get_user_meta($user_id, $meta_key, true) === '1') {
        return false;
    }

    $expires = (string) get_user_meta($user_id, 'hover_exclusive_expires', true);
    $exclusive = hme_is_exclusive_active($expires);
    $amount = $exclusive ? HME_BIRTHDAY_EXCLUSIVE : HME_BIRTHDAY_FRIENDS;
    $tier = $exclusive ? '臻享會員' : '品牌好友';
    $code = hme_birthday_coupon_code($user_id, $month);

    hme_create_gift_coupon(
        $code,
        $amount,
        $email,
        $tier . ' 生日禮 NT$' . $amount . '（不可與其他優惠併用｜當月補發）',
        HME_BIRTHDAY_DAYS,
        'birthday'
    );

    update_user_meta($user_id, $meta_key, '1');

    if ($send_mail) {
        hme_send_birthday_gift_mail($email, $month, $code, $amount, $tier);
    }

    return true;
}

function hme_maybe_grant_birthday_for_user($user_id): void
{
    hme_try_grant_birthday_for_user((int) $user_id, true);
}

function hme_on_birthday_meta_saved($meta_id, $user_id, $meta_key, $_meta_value): void
{
    $keys = ['birthday', 'billing_birth_date', '_billing_birth_date'];
    if (!in_array((string) $meta_key, $keys, true)) {
        return;
    }
    hme_try_grant_birthday_for_user((int) $user_id, true);
}

function hme_dispatch_birthday_coupons(): void
{
    if (!function_exists('wc_get_orders')) {
        return;
    }

    $users = get_users([
        'role__in' => ['customer', 'administrator'],
        'number'   => -1,
        'fields'   => ['ID'],
    ]);

    foreach ($users as $user) {
        hme_try_grant_birthday_for_user((int) $user->ID, true);
    }
}

/** 手動觸發（WP-CLI 或除錯）：do_action('hme_monthly_birthday_cron'); */
