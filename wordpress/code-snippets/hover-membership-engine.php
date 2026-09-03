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
 *
 * 固定母券（WooCommerce → 行銷 → 優惠券，各建一張）：
 * - HOVER100 / HBDAY100 / VIPBDAY300
 * - 到期方式請設「無到期日」（不要用「有效天數從現在起算」——那是整張券共用到期日）
 * - 每人效期：發放當下寫入 claimed_at meta，結帳時驗證「發放日起 30 天內」
 * - 入會禮與生日禮皆為 30 天（HME_WELCOME_DAYS / HME_BIRTHDAY_DAYS）
 * 每人限用一次由會員 meta（hover_welcome_* / hover_birthday_*）控管，Next.js 結帳 + 本 snippet 雙重驗證。
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
const HME_WELCOME_DAYS = 30;

/** 固定母券（WooCommerce 各建一張，無 Email 限制） */
const HME_CODE_WELCOME = 'HOVER100';
const HME_CODE_BDAY_FRIENDS = 'HBDAY100';
const HME_CODE_BDAY_EXCLUSIVE = 'VIPBDAY300';

add_action('woocommerce_order_status_processing', 'hme_on_order_paid', 20, 1);
add_action('woocommerce_order_status_completed', 'hme_on_order_paid', 20, 1);
add_action('woocommerce_order_status_processing', 'hme_mark_master_coupon_used_on_order', 25, 1);
add_action('woocommerce_order_status_completed', 'hme_mark_master_coupon_used_on_order', 25, 1);

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

add_filter('woocommerce_coupon_is_valid', 'hme_validate_master_coupon', 20, 3);

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

function hme_mark_master_coupon_used_on_order($order_id): void
{
    $order = wc_get_order($order_id);
    if (!$order) {
        return;
    }

    $customer_id = (int) $order->get_customer_id();
    if ($customer_id <= 0) {
        return;
    }

    $code = strtoupper(trim((string) $order->get_meta('_used_coupon_code')));
    if ($code === '' && function_exists('wc_get_order')) {
        foreach ($order->get_fees() as $fee) {
            $name = (string) $fee->get_name();
            if (preg_match('/折扣碼\s+(\S+)/u', $name, $m)) {
                $code = strtoupper(trim($m[1]));
                break;
            }
        }
    }

    if (!hme_is_master_coupon($code)) {
        return;
    }

    if ($code === HME_CODE_WELCOME) {
        update_user_meta($customer_id, 'hover_welcome_used', '1');
        return;
    }

    $now = new DateTime('now', wp_timezone());
    $year = (int) $now->format('Y');
    $month = (int) $now->format('n');
    update_user_meta($customer_id, 'hover_birthday_used_' . $year . '_' . $month, '1');
}

function hme_master_coupon_codes(): array
{
    return [HME_CODE_WELCOME, HME_CODE_BDAY_FRIENDS, HME_CODE_BDAY_EXCLUSIVE];
}

function hme_is_master_coupon(string $code): bool
{
    return in_array(strtoupper(trim($code)), hme_master_coupon_codes(), true);
}

function hme_meta_within_days(string $iso, int $days): bool
{
    if ($iso === '') {
        return true;
    }
    $t = strtotime($iso);
    if (!$t) {
        return false;
    }
    return (time() - $t) <= ($days * DAY_IN_SECONDS);
}

/**
 * WooCommerce 原生結帳防護：固定母券須通過會員 meta 驗證
 */
function hme_validate_master_coupon($valid, $coupon, $discount): bool
{
    if (!$valid || !is_a($coupon, 'WC_Coupon')) {
        return (bool) $valid;
    }

    $code = strtoupper(trim((string) $coupon->get_code()));
    if (!hme_is_master_coupon($code)) {
        return (bool) $valid;
    }

    $user_id = get_current_user_id();
    if ($user_id <= 0) {
        wc_add_notice('請先登入會員後再使用此折扣碼', 'error');
        return false;
    }

    $check = hme_validate_master_coupon_for_user($user_id, $code);
    if (!$check['valid']) {
        wc_add_notice($check['message'], 'error');
        return false;
    }

    return true;
}

function hme_validate_master_coupon_for_user(int $user_id, string $code): array
{
    $code = strtoupper(trim($code));
    $exclusive = hme_is_exclusive_active((string) get_user_meta($user_id, 'hover_exclusive_expires', true));

    if ($code === HME_CODE_WELCOME) {
        if (get_user_meta($user_id, 'hover_welcome_claimed', true) !== '1') {
            return ['valid' => false, 'message' => '您尚未領取入會禮，請至會員中心領取'];
        }
        if (get_user_meta($user_id, 'hover_welcome_used', true) === '1') {
            return ['valid' => false, 'message' => '入會禮折扣碼已使用過'];
        }
        $claimed_at = (string) get_user_meta($user_id, 'hover_welcome_claimed_at', true);
        if ($claimed_at === '') {
            return ['valid' => false, 'message' => '入會禮尚未完成發放，請至會員中心重新領取或聯繫客服'];
        }
        if (!hme_meta_within_days($claimed_at, HME_WELCOME_DAYS)) {
            return ['valid' => false, 'message' => '入會禮折扣碼已逾期（發放日起 ' . HME_WELCOME_DAYS . ' 天內有效）'];
        }
        return ['valid' => true, 'message' => ''];
    }

    if ($code === HME_CODE_BDAY_FRIENDS || $code === HME_CODE_BDAY_EXCLUSIVE) {
        $birthday = hme_get_user_birthday($user_id);
        $bd = $birthday !== '' ? DateTime::createFromFormat('Y-m-d', $birthday) : false;
        if (!$bd) {
            return ['valid' => false, 'message' => '請先設定生日後再使用生日禮折扣碼'];
        }

        $now = new DateTime('now', wp_timezone());
        $month = (int) $now->format('n');
        $year = (int) $now->format('Y');

        if ((int) $bd->format('n') !== $month) {
            return ['valid' => false, 'message' => '生日禮折扣碼僅限生日當月使用'];
        }

        $claim_key = 'hover_birthday_claim_' . $year . '_' . $month;
        if (get_user_meta($user_id, $claim_key, true) !== '1') {
            return ['valid' => false, 'message' => '您尚未領取本月生日禮，請至會員中心領取'];
        }

        $used_key = 'hover_birthday_used_' . $year . '_' . $month;
        if (get_user_meta($user_id, $used_key, true) === '1') {
            return ['valid' => false, 'message' => '本月生日禮折扣碼已使用過'];
        }

        $claim_at = (string) get_user_meta($user_id, 'hover_birthday_claim_at_' . $year . '_' . $month, true);
        if ($claim_at === '') {
            return ['valid' => false, 'message' => '本月生日禮尚未完成發放，請至會員中心重新領取或聯繫客服'];
        }
        if (!hme_meta_within_days($claim_at, HME_BIRTHDAY_DAYS)) {
            return ['valid' => false, 'message' => '本月生日禮折扣碼已逾期（發放日起 ' . HME_BIRTHDAY_DAYS . ' 天內有效）'];
        }

        if ($code === HME_CODE_BDAY_FRIENDS && $exclusive) {
            return ['valid' => false, 'message' => '臻享會員請使用 ' . HME_CODE_BDAY_EXCLUSIVE];
        }
        if ($code === HME_CODE_BDAY_EXCLUSIVE && !$exclusive) {
            return ['valid' => false, 'message' => '品牌好友請使用 ' . HME_CODE_BDAY_FRIENDS];
        }

        return ['valid' => true, 'message' => ''];
    }

    return ['valid' => false, 'message' => '折扣碼無效'];
}

function hme_birthday_coupon_code(bool $exclusive): string
{
    return $exclusive ? HME_CODE_BDAY_EXCLUSIVE : HME_CODE_BDAY_FRIENDS;
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
 * 生日禮通知信
 * 先寄管理員（純文字），再寄會員本人（HTML，對齊官網範本）
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

    $amount_label = number_format($amount);
    $site = 'https://hoverofficial.com';
    $line = 'https://lin.ee/uKRvV64';
    $green = '#2a514d';
    $exclusive = ($amount >= HME_BIRTHDAY_EXCLUSIVE) || (strpos($tier, '臻享') !== false);
    $gift_title = $exclusive ? '臻享會員生日禮' : '品牌好友生日禮';
    $member_subject = $exclusive
        ? '生日快樂！HOVER 臻享生日禮送給您'
        : '生日快樂！HOVER 送您一份生日禮';
    $expires = (new DateTime('now', wp_timezone()))
        ->modify('+' . HME_BIRTHDAY_DAYS . ' days')
        ->format('Y/m/d');

    $user = get_user_by('email', $customer_email);
    $name = '會員';
    if ($user) {
        $fn = trim((string) $user->first_name);
        $ln = trim((string) $user->last_name);
        $full = trim($fn . ' ' . $ln);
        if ($full !== '') {
            $name = $full;
        } elseif (!empty($user->display_name)) {
            $name = (string) $user->display_name;
        }
    }

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
        wp_mail($admin_to, $admin_subject, $admin_body, ['Content-Type: text/plain; charset=UTF-8']);
    }

    $intro_amount = 'NT$' . $amount_label;
    $min = 'NT$' . number_format(HME_GIFT_MIN);
    $gift_desc = $exclusive ? '臻享生日禮' : '生日禮';

    $html = '<!DOCTYPE html><html lang="zh-Hant"><head><meta charset="UTF-8" /></head><body style="margin:0;padding:0;background:#f6f6f6;">
<table width="100%" cellspacing="0" cellpadding="0" style="background:#f6f6f6;padding:24px 12px;"><tr><td align="center">
<table width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#ffffff;padding:32px 28px;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#111;">
<tr><td>
<div style="font-size:28px;letter-spacing:0.2em;font-weight:700;margin-bottom:28px;">HOVER</div>
<p style="margin:0 0 12px;font-size:15px;line-height:1.8;">親愛的' . esc_html($name) . '，</p>
<p style="margin:0 0 8px;font-size:14px;line-height:1.8;color:#333;">生日快樂！</p>
<p style="margin:0 0 8px;font-size:14px;line-height:1.8;color:#333;">感謝您一直以來對 HOVER 的支持，我們為您的生日準備了 ' . esc_html($intro_amount) . ' ' . esc_html($gift_desc) . '購物金。</p>
<div style="height:16px;">&nbsp;</div>
<h2 style="margin:28px 0 12px;font-size:15px;letter-spacing:0.08em;color:' . $green . ';font-weight:700;">' . esc_html($gift_title) . '</h2>
<table width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
<tr><td style="padding:6px 0;font-size:14px;color:#333;">折扣碼</td><td style="padding:6px 0;font-size:14px;text-align:right;font-weight:700;letter-spacing:0.06em;">' . esc_html($code) . '</td></tr>
<tr><td style="padding:6px 0;font-size:14px;color:#333;">折抵金額</td><td style="padding:6px 0;font-size:14px;text-align:right;">' . esc_html($intro_amount) . '</td></tr>
<tr><td style="padding:6px 0;font-size:14px;color:#333;">使用門檻</td><td style="padding:6px 0;font-size:14px;text-align:right;">單筆訂單滿 ' . esc_html($min) . '</td></tr>
<tr><td style="padding:6px 0;font-size:14px;color:#333;">使用次數</td><td style="padding:6px 0;font-size:14px;text-align:right;">每位會員每年度限用一次</td></tr>
<tr><td style="padding:6px 0;font-size:14px;color:#333;">使用期限</td><td style="padding:6px 0;font-size:14px;text-align:right;">' . esc_html($expires) . '</td></tr>
</table>
<p style="margin:24px 0 0;"><a href="' . esc_url($site) . '" style="color:' . $green . ';font-weight:700;text-decoration:underline;font-size:14px;">探索 HOVER</a></p>
<div style="margin-top:36px;padding-top:20px;border-top:1px solid #ddd;font-size:12px;line-height:1.8;color:#777;">
<p style="margin:0;">此為系統自動發送信件，請勿直接回覆。</p>
<p style="margin:8px 0 0;">HOVER 官方網站｜<a href="' . esc_url($site) . '" style="color:' . $green . ';text-decoration:underline;">hoverofficial.com</a><br />客服聯繫｜<a href="' . esc_url($line) . '" style="color:' . $green . ';text-decoration:underline;">HOVER 官方 LINE</a></p>
</div>
</td></tr></table>
</td></tr></table></body></html>';

    wp_mail(
        $customer_email,
        $member_subject,
        $html,
        ['Content-Type: text/html; charset=UTF-8']
    );
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
    $code = hme_birthday_coupon_code($exclusive);
    $now_iso = (new DateTime('now', wp_timezone()))->format('c');

    update_user_meta($user_id, $meta_key, '1');
    update_user_meta($user_id, 'hover_birthday_claim_at_' . $year . '_' . $month, $now_iso);

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
