<?php
/**
 * HOVER — 取消訂單也寄信（pending → cancelled）
 *
 * 原因：
 * WooCommerce「已取消訂單」預設只在
 *   processing → cancelled
 *   on-hold → cancelled
 * 時寄信。ATM 未付款多為 pending → cancelled，前台取消因此不會觸發。
 *
 * 使用方式：
 * 1. Code Snippets → Add New → 貼上本檔
 * 2. Run snippet：Everywhere → 啟用
 *
 * 後台確認：WooCommerce → 設定 → 電子郵件 →「已取消訂單」已勾選啟用
 */

if (!defined('ABSPATH')) {
    exit;
}

if (defined('HOVER_CANCELLED_EMAIL_LOADED')) {
    return;
}
define('HOVER_CANCELLED_EMAIL_LOADED', true);

/**
 * 觸發所有「取消訂單」相關郵件（店家＋顧客）。
 *
 * @param int            $order_id
 * @param WC_Order|false $order
 */
function hover_trigger_cancelled_order_emails($order_id, $order = false): void
{
    if (!$order_id || !function_exists('WC')) {
        return;
    }

    $mailer = WC()->mailer();
    if (!$mailer) {
        return;
    }

    $emails = $mailer->get_emails();
    if (!is_array($emails) || !$emails) {
        return;
    }

    foreach ($emails as $email) {
        if (!is_object($email) || !method_exists($email, 'trigger')) {
            continue;
        }

        $id = isset($email->id) ? (string) $email->id : '';
        if ($id === '') {
            continue;
        }

        // 涵蓋：cancelled_order（店家）、customer_cancelled_order、RY Tools 等同義 id
        if (stripos($id, 'cancelled') === false && stripos($id, 'canceled') === false) {
            continue;
        }

        // 僅觸發已啟用者
        if (isset($email->enabled) && $email->enabled !== 'yes') {
            continue;
        }

        try {
            $email->trigger($order_id, $order);
        } catch (Throwable $e) {
            if (defined('WP_DEBUG') && WP_DEBUG) {
                error_log('[HOVER] cancelled email trigger failed (' . $id . '): ' . $e->getMessage());
            }
        }
    }
}

// ATM／待付款：pending → cancelled（前台「取消訂單」主路徑）
add_action(
    'woocommerce_order_status_pending_to_cancelled_notification',
    'hover_trigger_cancelled_order_emails',
    10,
    2
);

// 保險：若外掛把待付款設成 waiting-payment 等自訂狀態
add_action(
    'woocommerce_order_status_waiting-payment_to_cancelled_notification',
    'hover_trigger_cancelled_order_emails',
    10,
    2
);
