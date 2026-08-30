<?php
/**
 * HOVER — 訂單信件隱藏「帳單地址」
 *
 * 結帳未填帳單地址，但系統會把門市／收件資料寫入 billing，
 * 導致信件出現「帳單地址」。此 snippet 在所有 WooCommerce 信件中
 * 只顯示運送地址，不顯示帳單地址。
 *
 * 使用方式：
 * 1. Code Snippets → Add New → 貼上本檔
 * 2. Run snippet：Everywhere → 啟用
 */

if (!defined('ABSPATH')) {
    exit;
}

if (defined('HOVER_EMAIL_HIDE_BILLING_LOADED')) {
    return;
}
define('HOVER_EMAIL_HIDE_BILLING_LOADED', true);

add_action('woocommerce_email', function ($mailer) {
    if (!$mailer || !is_object($mailer)) {
        return;
    }

    // 移除 WC 預設「帳單＋運送」地址區塊
    remove_action('woocommerce_email_customer_details', [$mailer, 'email_addresses'], 20);

    // 改為只輸出運送地址
    add_action('woocommerce_email_customer_details', 'hover_email_shipping_address_only', 20, 4);
}, 20);

/**
 * @param WC_Order   $order
 * @param bool       $sent_to_admin
 * @param bool       $plain_text
 * @param WC_Email|null $email
 */
function hover_email_shipping_address_only($order, $sent_to_admin = false, $plain_text = false, $email = null): void
{
    if (!$order instanceof WC_Order) {
        return;
    }

    $shipping = $order->get_formatted_shipping_address();
    if (!$shipping) {
        return;
    }

    $phone = $order->get_shipping_phone() ?: $order->get_billing_phone();
    $title = __('Shipping address', 'woocommerce');

    if ($plain_text) {
        echo "\n" . wp_strip_all_tags($title) . "\n\n";
        echo wp_strip_all_tags($shipping) . "\n";
        if ($phone) {
            echo wp_strip_all_tags($phone) . "\n";
        }
        echo "\n";
        return;
    }

    $text_align = is_rtl() ? 'right' : 'left';
    ?>
    <table id="addresses" cellspacing="0" cellpadding="0" style="width:100%;vertical-align:top;margin-bottom:40px;padding:0;" border="0">
        <tr>
            <td style="text-align:<?php echo esc_attr($text_align); ?>;font-family:'Helvetica Neue',Helvetica,Roboto,Arial,sans-serif;border:0;padding:0;" valign="top" width="100%">
                <h2 style="margin:0 0 8px;"><?php echo esc_html($title); ?></h2>
                <address class="address" style="padding:12px;border:1px solid #e5e5e5;">
                    <?php echo wp_kses_post($shipping); ?>
                    <?php if ($phone) : ?>
                        <br /><?php echo esc_html($phone); ?>
                    <?php endif; ?>
                </address>
            </td>
        </tr>
    </table>
    <?php
}
