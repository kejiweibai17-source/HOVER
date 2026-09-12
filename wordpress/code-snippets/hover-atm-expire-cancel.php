<?php
/**
 * HOVER — ATM 逾期未付款自動取消 + 取消通知信
 *
 * 行為：
 * 1. 每小時掃描待付款／保留中的 ATM 訂單
 * 2. 若已過 `_ExpireDate`（綠界繳費期限）且尚未付款 → 改為 cancelled
 * 3. 觸發取消訂單通知信（顧客／店家）
 *
 * 使用方式：
 * 1. Code Snippets → Add New → 貼上本檔
 * 2. Run snippet：Everywhere → 啟用
 * 3. 確認本機／主機有正常跑 WP-Cron（或系統 cron 打 wp-cron.php）
 *
 * 手動測試：
 *   在 wp-admin 網址加：?hover_atm_expire_run=1（需登入管理員）
 *   或 WP-CLI：wp eval 'do_action("hover_atm_expire_cancel_cron");'
 *
 * 依賴（建議一併啟用）：
 * - hover-cancelled-order-email.php（pending→cancelled 也寄信）
 * - hover-order-email-templates.php（取消信文案）
 */

if (!defined('ABSPATH')) {
    exit;
}

if (defined('HOVER_ATM_EXPIRE_CANCEL_LOADED')) {
    return;
}
define('HOVER_ATM_EXPIRE_CANCEL_LOADED', true);

/** 每次最多處理筆數（避免一次吃光資源） */
const HOVER_ATM_EXPIRE_BATCH = 40;

/**
 * 註冊每小時排程
 */
add_action('init', function () {
    if (!wp_next_scheduled('hover_atm_expire_cancel_cron')) {
        wp_schedule_event(time() + 5 * MINUTE_IN_SECONDS, 'hourly', 'hover_atm_expire_cancel_cron');
    }
}, 20);

add_action('hover_atm_expire_cancel_cron', 'hover_atm_expire_cancel_run');

/**
 * 管理員手動觸發一次（測試用）
 * 例：/wp-admin/?hover_atm_expire_run=1
 */
add_action('admin_init', function () {
    if (empty($_GET['hover_atm_expire_run'])) {
        return;
    }
    if (!current_user_can('manage_woocommerce')) {
        return;
    }
    $result = hover_atm_expire_cancel_run();
    $msg = sprintf(
        'ATM 逾期掃描完成：檢查 %d 筆，取消 %d 筆。',
        (int) ($result['checked'] ?? 0),
        (int) ($result['cancelled'] ?? 0)
    );
    add_action('admin_notices', function () use ($msg) {
        echo '<div class="notice notice-success is-dismissible"><p>' . esc_html($msg) . '</p></div>';
    });
});

/**
 * 停用 snippet 時清掉排程（若用 Code Snippets 刪除後不會跑到；留作文件說明）
 */
register_deactivation_hook(__FILE__, function () {
    $timestamp = wp_next_scheduled('hover_atm_expire_cancel_cron');
    if ($timestamp) {
        wp_unschedule_event($timestamp, 'hover_atm_expire_cancel_cron');
    }
});

/**
 * 主流程
 *
 * @return array{checked:int,cancelled:int,skipped:int}
 */
function hover_atm_expire_cancel_run(): array
{
    $out = ['checked' => 0, 'cancelled' => 0, 'skipped' => 0];

    if (!function_exists('wc_get_orders')) {
        return $out;
    }

    $orders = wc_get_orders([
        'status'       => ['pending', 'on-hold', 'waiting-payment'],
        'limit'        => HOVER_ATM_EXPIRE_BATCH,
        'orderby'      => 'date',
        'order'        => 'ASC',
        'return'       => 'objects',
        // 只撈較可能有 ATM meta 的近期單；再由程式判斷
        'date_created' => '>' . gmdate('Y-m-d', strtotime('-60 days')),
    ]);

    if (!is_array($orders) || !$orders) {
        return $out;
    }

    $now = time();

    foreach ($orders as $order) {
        if (!$order instanceof WC_Order) {
            continue;
        }
        $out['checked']++;

        if (!hover_atm_expire_is_unpaid_atm($order)) {
            $out['skipped']++;
            continue;
        }

        // 已付過款就不動
        if ($order->is_paid() || $order->get_date_paid()) {
            $out['skipped']++;
            continue;
        }

        // 避免重複取消
        if ($order->get_meta('_hover_atm_auto_cancelled') === '1') {
            $out['skipped']++;
            continue;
        }

        $expire_ts = hover_atm_expire_parse_timestamp($order);
        if ($expire_ts <= 0) {
            $out['skipped']++;
            continue;
        }

        // 尚未到期
        if ($now < $expire_ts) {
            $out['skipped']++;
            continue;
        }

        $ok = hover_atm_expire_cancel_order($order, $expire_ts);
        if ($ok) {
            $out['cancelled']++;
        } else {
            $out['skipped']++;
        }
    }

    if (defined('WP_DEBUG') && WP_DEBUG) {
        error_log(sprintf(
            '[HOVER ATM expire] checked=%d cancelled=%d skipped=%d',
            $out['checked'],
            $out['cancelled'],
            $out['skipped']
        ));
    }

    return $out;
}

/**
 * 是否為「ATM 未付款」訂單
 */
function hover_atm_expire_is_unpaid_atm(WC_Order $order): bool
{
    // 已有虛擬帳號／期限 meta
    $has_vaccount = (string) $order->get_meta('_vAccount', true) !== ''
        || (string) $order->get_meta('vAccount', true) !== ''
        || (string) $order->get_meta('_PaymentNo', true) !== ''
        || (string) $order->get_meta('_ecpay_atm_vaccount', true) !== '';

    $has_expire = (string) $order->get_meta('_ExpireDate', true) !== ''
        || (string) $order->get_meta('ExpireDate', true) !== ''
        || (string) $order->get_meta('_ecpay_atm_expire_date', true) !== '';

    if ($has_vaccount || $has_expire) {
        return true;
    }

    $method = strtolower($order->get_payment_method() . ' ' . $order->get_payment_method_title());
    if (preg_match('/atm|虛擬帳號|轉帳/', $method)) {
        return true;
    }

    $note = (string) $order->get_customer_note();
    return (bool) preg_match('/虛擬帳號|轉帳資訊|_vAccount|繳費期限/u', $note);
}

/**
 * 解析繳費期限 → Unix timestamp（到期當下）
 * 綠界 ExpireDate 常見：YYYY/MM/DD（當日 23:59:59）或含時間
 */
function hover_atm_expire_parse_timestamp(WC_Order $order): int
{
    $raw = '';
    foreach (['_ExpireDate', 'ExpireDate', '_ecpay_atm_expire_date'] as $key) {
        $v = $order->get_meta($key, true);
        if (is_array($v)) {
            $v = reset($v);
        }
        $v = trim((string) $v);
        if ($v !== '') {
            $raw = $v;
            break;
        }
    }

    if ($raw === '') {
        $note = (string) $order->get_customer_note();
        if (preg_match('/繳費期限[:：\s]*([0-9\/\-:\s]+)/u', $note, $m)) {
            $raw = trim($m[1]);
        }
    }

    if ($raw === '') {
        return 0;
    }

    $raw = str_replace(['.', '年', '月', '日'], ['/', '/', '/', ''], $raw);
    $raw = trim(preg_replace('/\s+/', ' ', $raw));

    // 僅日期：視為該日結束才逾期
    if (preg_match('/^\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2}$/', $raw)) {
        $normalized = str_replace('/', '-', $raw) . ' 23:59:59';
        $ts = strtotime($normalized);
        return $ts ? (int) $ts : 0;
    }

    $ts = strtotime(str_replace('/', '-', $raw));
    return $ts ? (int) $ts : 0;
}

/**
 * 取消訂單並寄信
 */
function hover_atm_expire_cancel_order(WC_Order $order, int $expire_ts): bool
{
    $order_id = $order->get_id();
    $status = $order->get_status();

    if (in_array($status, ['cancelled', 'canceled', 'completed', 'processing', 'refunded'], true)) {
        return false;
    }

    $expire_label = wp_date('Y/m/d H:i', $expire_ts);
    $note = sprintf(
        'HOVER：ATM 超過繳費期限（%s）仍未付款，系統自動取消訂單。',
        $expire_label
    );

    $order->update_meta_data('_hover_atm_auto_cancelled', '1');
    $order->update_meta_data('_hover_atm_auto_cancelled_at', gmdate('c'));
    $order->update_meta_data('_hover_cancelled_by', 'atm_expire_cron');
    $order->save();

    // update_status(..., true) 會觸發 woocommerce_order_status_*_notification
    // 若已啟用 hover-cancelled-order-email.php，pending→cancelled 會自動寄信
    $order->update_status('cancelled', $note, true);

    $fresh = wc_get_order($order_id);
    if (!$fresh || !in_array($fresh->get_status(), ['cancelled', 'canceled'], true)) {
        return false;
    }

    // 僅在未載入取消信補丁時手動觸發（避免重複寄信）
    if (!function_exists('hover_trigger_cancelled_order_emails')) {
        hover_atm_expire_trigger_cancelled_emails($order_id);
    }

    return true;
}

/**
 * 內建取消信觸發（當 hover-cancelled-order-email.php 未啟用時備援）
 */
function hover_atm_expire_trigger_cancelled_emails(int $order_id): void
{
    if (!$order_id || !function_exists('WC')) {
        return;
    }
    $mailer = WC()->mailer();
    if (!$mailer) {
        return;
    }
    $emails = $mailer->get_emails();
    if (!is_array($emails)) {
        return;
    }

    $order = wc_get_order($order_id);
    foreach ($emails as $email) {
        if (!is_object($email) || !method_exists($email, 'trigger')) {
            continue;
        }
        $id = isset($email->id) ? (string) $email->id : '';
        if ($id === '') {
            continue;
        }
        if (stripos($id, 'cancelled') === false && stripos($id, 'canceled') === false) {
            continue;
        }
        if (isset($email->enabled) && $email->enabled !== 'yes') {
            continue;
        }
        try {
            $email->trigger($order_id, $order);
        } catch (Throwable $e) {
            if (defined('WP_DEBUG') && WP_DEBUG) {
                error_log('[HOVER ATM expire] email failed (' . $id . '): ' . $e->getMessage());
            }
        }
    }
}
