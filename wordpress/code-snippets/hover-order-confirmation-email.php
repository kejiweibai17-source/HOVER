<?php
/**
 * HOVER — 訂單確認信紀錄／補寄
 *
 * 目的：
 * 1. 在訂單備註留下「處理中／顧客備註」信是否觸發（方便排查未收到信）
 * 2. 提供 REST 補寄：POST /wp-json/hover/v1/orders/{id}/resend-confirmation
 *    （需登入且有 manage_woocommerce，或使用 WP Application Password／後台登入）
 *
 * 寄送時點（與官網流程對齊）：
 * - 信用卡／LINE Pay：付款成功、訂單 pending→processing →「付款完成｜訂單確認中」
 * - ATM／超商取號：寫入顧客備註（customer_note）→「訂單已建立｜請完成付款」
 * - 下單當下（仍為 pending、尚未付款／取號）不會寄顧客確認信
 *
 * 後台請確認啟用：
 * WooCommerce → 設定 → 電子郵件 →「處理中訂單」「顧客備註」
 */

if (!defined('ABSPATH')) {
    exit;
}

if (defined('HOVER_ORDER_CONFIRMATION_EMAIL_LOADED')) {
    return;
}
define('HOVER_ORDER_CONFIRMATION_EMAIL_LOADED', true);

/**
 * @param mixed $email
 */
function hover_oce_email_id($email): string
{
    if (is_object($email) && isset($email->id)) {
        return (string) $email->id;
    }
    return is_string($email) ? $email : '';
}

/**
 * 寄信結果寫入訂單備註（發送紀錄）
 *
 * WC：do_action( 'woocommerce_email_sent', $return, $id, $email_object );
 */
add_action('woocommerce_email_sent', function ($return, $id, $email = null) {
    $email_id = hover_oce_email_id($email);
    if ($email_id === '' && is_string($id)) {
        $email_id = $id;
    }

    $watch = [
        'customer_processing_order',
        'customer_note',
        'customer_on_hold_order',
        'customer_completed_order',
        'customer_cancelled_order',
    ];
    if (!in_array($email_id, $watch, true)) {
        return;
    }

    $order = null;
    if (is_object($email) && !empty($email->object) && $email->object instanceof WC_Order) {
        $order = $email->object;
    }
    if (!$order instanceof WC_Order) {
        return;
    }

    $to = method_exists($email, 'get_recipient')
        ? (string) $email->get_recipient()
        : (string) $order->get_billing_email();
    $ok = (bool) $return;
    $labels = [
        'customer_processing_order' => '付款完成｜訂單確認中',
        'customer_note'             => '訂單已建立｜請完成付款（顧客備註）',
        'customer_on_hold_order'    => '訂單已建立｜請完成付款（保留）',
        'customer_completed_order'  => '出貨通知',
        'customer_cancelled_order'  => '訂單取消',
    ];
    $label = $labels[$email_id] ?? $email_id;
    $order->add_order_note(
        sprintf(
            'HOVER 信件：%s → %s（%s）',
            $label,
            $ok ? '已交寄' : '交寄失敗',
            $to !== '' ? $to : '無收件信箱'
        )
    );

    if ($ok && $email_id === 'customer_processing_order') {
        $order->update_meta_data('_hover_processing_notice_sent', '1');
        $order->update_meta_data('_hover_processing_notice_sent_at', wp_date('Y-m-d H:i:s'));
    }
    if ($ok && in_array($email_id, ['customer_note', 'customer_on_hold_order'], true)) {
        $order->update_meta_data('_hover_order_created_notice_sent', '1');
        $order->update_meta_data('_hover_order_created_notice_sent_at', wp_date('Y-m-d H:i:s'));
    }
    $order->save();
}, 20, 3);

/**
 * 無有效帳單信箱時記下（否則 WC 會默默略過）
 */
add_action('woocommerce_order_status_pending_to_processing', function ($order_id) {
    $order = wc_get_order($order_id);
    if (!$order instanceof WC_Order) {
        return;
    }
    $to = sanitize_email((string) $order->get_billing_email());
    if ($to === '' || !is_email($to)) {
        $order->add_order_note('HOVER：訂單改為處理中，但帳單信箱無效，無法寄「付款完成｜訂單確認中」');
        $order->save();
    }
}, 5, 1);

/**
 * 觸發指定顧客信（供補寄）
 */
function hover_oce_trigger_customer_email(string $email_id, int $order_id, WC_Order $order): bool
{
    if (!function_exists('WC') || !WC()->mailer()) {
        return false;
    }
    $emails = WC()->mailer()->get_emails();
    if (!is_array($emails)) {
        return false;
    }

    foreach ($emails as $email) {
        if (!is_object($email) || empty($email->id) || (string) $email->id !== $email_id) {
            continue;
        }
        if (isset($email->enabled) && $email->enabled !== 'yes') {
            $order->add_order_note('HOVER：補寄失敗（後台未啟用信件：' . $email_id . '）');
            $order->save();
            return false;
        }
        if (!method_exists($email, 'trigger')) {
            return false;
        }
        try {
            $email->trigger($order_id, $order);
            return true;
        } catch (Throwable $e) {
            if (defined('WP_DEBUG') && WP_DEBUG) {
                error_log('[HOVER] resend confirmation failed: ' . $e->getMessage());
            }
            return false;
        }
    }
    return false;
}

add_action('rest_api_init', function () {
    register_rest_route('hover/v1', '/orders/(?P<id>\d+)/resend-confirmation', [
        'methods'             => 'POST',
        'permission_callback' => function () {
            return current_user_can('manage_woocommerce');
        },
        'callback'            => function (WP_REST_Request $req) {
            $order_id = (int) $req['id'];
            $order = wc_get_order($order_id);
            if (!$order instanceof WC_Order) {
                return new WP_REST_Response(['ok' => false, 'message' => '訂單不存在'], 404);
            }

            $to = sanitize_email((string) $order->get_billing_email());
            if ($to === '' || !is_email($to)) {
                return new WP_REST_Response(['ok' => false, 'message' => '帳單信箱無效'], 400);
            }

            $status = $order->get_status();
            $force = $req->get_param('force') === true || $req->get_param('force') === '1';

            // 已付款／處理中／完成 → 付款完成確認信
            if (in_array($status, ['processing', 'completed'], true)) {
                if (!$force && (string) $order->get_meta('_hover_processing_notice_sent') === '1') {
                    return new WP_REST_Response([
                        'ok'      => true,
                        'skipped' => true,
                        'message' => '已有寄送紀錄；若需再寄請帶 force=1',
                        'email'   => $to,
                    ]);
                }
                if ($force) {
                    $order->delete_meta_data('_hover_processing_notice_sent');
                    $order->save();
                }
                $ok = hover_oce_trigger_customer_email('customer_processing_order', $order_id, $order);
                return new WP_REST_Response([
                    'ok'      => $ok,
                    'type'    => 'customer_processing_order',
                    'subject' => '付款完成｜訂單確認中',
                    'email'   => $to,
                ], $ok ? 200 : 500);
            }

            // 待付款 ATM／取號 → 訂單建立信
            $ok = hover_oce_trigger_customer_email('customer_on_hold_order', $order_id, $order);
            if (!$ok) {
                $ok = hover_oce_trigger_customer_email('customer_note', $order_id, $order);
            }
            return new WP_REST_Response([
                'ok'      => $ok,
                'type'    => 'order_created',
                'subject' => '訂單已建立｜請完成付款',
                'email'   => $to,
                'status'  => $status,
            ], $ok ? 200 : 500);
        },
    ]);
});
