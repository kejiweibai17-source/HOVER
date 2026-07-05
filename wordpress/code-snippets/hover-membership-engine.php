<?php
/**
 * HOVER — 會員分級同步 + 生日禮自動派發
 *
 * 使用方式：Code Snippets → 貼上 → Run everywhere → 啟用
 *
 * 功能：
 * 1. 訂單 processing / completed 時，依「已付款訂單淨額（扣除退款）」同步臻享會員 meta
 * 2. 每月 1 日 09:00 自動派發當月壽星生日禮 WC 原生折扣碼 + 寄信
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

function hme_dispatch_birthday_coupons(): void
{
    if (!function_exists('wc_get_orders')) {
        return;
    }

    $now = new DateTime('now', wp_timezone());
    $month = (int) $now->format('n');
    $year = (int) $now->format('Y');
    $meta_key = 'hover_birthday_claim_' . $year . '_' . $month;

    $users = get_users([
        'role__in' => ['customer', 'administrator'],
        'number'   => -1,
        'fields'   => ['ID', 'user_email', 'user_registered'],
    ]);

    foreach ($users as $user) {
        $customer_id = (int) $user->ID;
        $email = strtolower((string) $user->user_email);
        if ($email === '') {
            continue;
        }

        if (get_user_meta($customer_id, $meta_key, true) === '1') {
            continue;
        }

        $birthday = get_user_meta($customer_id, 'birthday', true);
        if (!$birthday) {
            $birthday = get_user_meta($customer_id, 'billing_birth_date', true);
        }
        if (!$birthday) {
            continue;
        }

        $bd = DateTime::createFromFormat('Y-m-d', substr($birthday, 0, 10));
        if (!$bd || (int) $bd->format('n') !== $month) {
            continue;
        }

        $registered = new DateTime($user->user_registered, wp_timezone());
        if ((int) $registered->format('Y') === $year && (int) $registered->format('n') === $month) {
            continue;
        }

        $expires = (string) get_user_meta($customer_id, 'hover_exclusive_expires', true);
        $exclusive = hme_is_exclusive_active($expires);
        $amount = $exclusive ? HME_BIRTHDAY_EXCLUSIVE : HME_BIRTHDAY_FRIENDS;
        $tier = $exclusive ? '臻享會員' : '品牌好友';
        $code = hme_birthday_coupon_code($customer_id, $month);

        hme_create_gift_coupon(
            $code,
            $amount,
            $email,
            $tier . ' 生日禮 NT$' . $amount . '（不可與其他優惠併用）',
            HME_BIRTHDAY_DAYS,
            'birthday'
        );

        update_user_meta($customer_id, $meta_key, '1');

        wp_mail(
            $email,
            'HOVER 生日禮金已送達 🎂',
            "親愛的會員您好：\n\n您的 {$month} 月生日禮折扣碼為：{$code}\n面額 NT\${$amount}，單筆滿 NT$" . HME_GIFT_MIN . " 可使用，限本人一次，" . HME_BIRTHDAY_DAYS . " 天內有效。\n\n祝您生日快樂！\nHOVER 威爾特",
            ['Content-Type: text/plain; charset=UTF-8']
        );
    }
}

/** 手動觸發（WP-CLI 或除錯）：do_action('hme_monthly_birthday_cron'); */
