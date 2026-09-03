<?php
/**
 * HOVER — 訂單信件自訂範本（覆蓋 WC 後台文案）
 *
 * 對應：
 * 4. customer_on_hold_order     → ATM 未付款／訂單建立成功
 * 5. customer_processing_order  → 付款完成
 * 6. customer_cancelled_order   → ATM 未付款取消
 * 7. customer_completed_order   → 出貨通知
 *
 * 使用方式：
 * 1. Code Snippets → Add New → 貼上本檔 → Everywhere → 啟用
 * 2. 後台仍需「啟用」上述 4 封顧客信（主旨／內文以本 snippet 為準）
 * 3. 可與 hover-email-hide-billing-address 並存（本檔以完整 HTML 覆蓋內文）
 */

if (!defined('ABSPATH')) {
    exit;
}

if (defined('HOVER_ORDER_EMAIL_TEMPLATES_LOADED')) {
    return;
}
define('HOVER_ORDER_EMAIL_TEMPLATES_LOADED', true);

/** 官網（訂單查詢／重新選購） */
const HOET_SITE_URL = 'https://hoverofficial.com';
/** 會員訂單頁 */
const HOET_ACCOUNT_ORDERS_URL = 'https://hoverofficial.com/account?tab=orders';
/** 官方 LINE */
const HOET_LINE_URL = 'https://lin.ee/uKRvV64';
/** 品牌綠 */
const HOET_GREEN = '#2a514d';

function hoet_email_ids(): array
{
    return [
        'customer_on_hold_order',
        'customer_processing_order',
        'customer_cancelled_order',
        'customer_completed_order',
    ];
}

function hoet_subject_map(): array
{
    return [
        'customer_on_hold_order'    => '訂單已建立｜請完成付款',
        'customer_processing_order' => '付款完成｜訂單確認中',
        'customer_cancelled_order'  => '訂單已取消',
        'customer_completed_order'  => '您的 HOVER 訂單已出貨',
    ];
}

foreach (hoet_subject_map() as $email_id => $subject) {
    add_filter("woocommerce_email_subject_{$email_id}", function ($default, $order) use ($subject) {
        return $subject;
    }, 50, 2);
    add_filter("woocommerce_email_heading_{$email_id}", function ($heading, $order, $email) {
        return '';
    }, 50, 3);
}

/** 記住目前寄送中的 email 物件 */
add_filter('woocommerce_email_styles', function ($css, $email = null) {
    if ($email && is_object($email)) {
        $GLOBALS['hoet_sending_email'] = $email;
    }
    return $css;
}, 5, 2);

add_action('woocommerce_email_header', function ($heading, $email = null) {
    if ($email && is_object($email)) {
        $GLOBALS['hoet_sending_email'] = $email;
    }
}, 1, 2);

/**
 * 以完整 HTML 覆蓋 4 封顧客信內文
 */
add_filter('woocommerce_mail_content', function ($content) {
    $email = $GLOBALS['hoet_sending_email'] ?? null;
    if (!$email || !is_object($email) || empty($email->id)) {
        return $content;
    }
    if (!in_array($email->id, hoet_email_ids(), true)) {
        return $content;
    }

    $order = null;
    if (!empty($email->object) && $email->object instanceof WC_Order) {
        $order = $email->object;
    }
    if (!$order instanceof WC_Order) {
        return $content;
    }

    // 4：僅 ATM／有虛擬帳號的待付款單用自訂範本，其餘 on-hold 維持 WC 預設
    if ($email->id === 'customer_on_hold_order' && !hoet_is_atm_order($order)) {
        return $content;
    }

    // 6：未付款取消用 ATM 取消範本；已付款後取消仍覆蓋為簡化取消信（同結構）
    $html = hoet_render_email($email->id, $order);
    return $html !== '' ? $html : $content;
}, 999);

/* -------------------------------------------------------------------------- */
/* Helpers                                                                     */
/* -------------------------------------------------------------------------- */

function hoet_esc($s): string
{
    return esc_html((string) $s);
}

function hoet_money($amount): string
{
    $n = (float) $amount;
    return 'NT$' . number_format($n, 0, '.', ',');
}

function hoet_customer_name(WC_Order $order): string
{
    $name = trim($order->get_formatted_billing_full_name());
    if ($name === '') {
        $name = trim($order->get_billing_first_name() . ' ' . $order->get_billing_last_name());
    }
    if ($name === '') {
        $name = trim($order->get_shipping_first_name() . ' ' . $order->get_shipping_last_name());
    }
    return $name !== '' ? $name : '顧客';
}

function hoet_order_date(WC_Order $order): string
{
    $d = $order->get_date_created();
    return $d ? $d->date_i18n('Y/m/d H:i') : '';
}

function hoet_paid_date(WC_Order $order): string
{
    $d = $order->get_date_paid();
    if (!$d) {
        $d = $order->get_date_modified();
    }
    return $d ? $d->date_i18n('Y/m/d H:i') : '';
}

function hoet_shipped_date(WC_Order $order): string
{
    $d = $order->get_date_completed();
    if (!$d) {
        $d = $order->get_date_modified();
    }
    return $d ? $d->date_i18n('Y/m/d H:i') : '';
}

function hoet_is_atm_order(WC_Order $order): bool
{
    if (hoet_atm_account($order) !== '') {
        return true;
    }
    $method = strtolower($order->get_payment_method() . ' ' . $order->get_payment_method_title());
    return (bool) preg_match('/atm|虛擬帳號|轉帳/', $method);
}

function hoet_meta(WC_Order $order, array $keys): string
{
    foreach ($keys as $key) {
        $v = $order->get_meta($key, true);
        if (is_array($v)) {
            $v = reset($v);
        }
        $v = trim((string) $v);
        if ($v !== '') {
            return $v;
        }
    }
    return '';
}

function hoet_atm_account(WC_Order $order): string
{
    return hoet_meta($order, ['_vAccount', '_PaymentNo', 'vAccount', '_ecpay_atm_vaccount']);
}

function hoet_atm_bank(WC_Order $order): string
{
    $code = preg_replace('/\D/', '', hoet_meta($order, ['_BankCode', 'BankCode', '_ecpay_atm_bank_code', '_atm_bank']));
    if ($code === '' || $code === '007') {
        return '第一商業銀行（007）';
    }
    return '銀行代碼 ' . $code;
}

function hoet_atm_expire(WC_Order $order): string
{
    $raw = hoet_meta($order, ['_ExpireDate', 'ExpireDate', '_ecpay_atm_expire_date']);
    if ($raw === '') {
        return '';
    }
    // 綠界常見 Y/m/d 或 Y-m-d
    $ts = strtotime(str_replace('/', '-', $raw));
    if ($ts) {
        return wp_date('Y/m/d H:i', $ts);
    }
    return $raw;
}

function hoet_payment_label(WC_Order $order): string
{
    $title = trim((string) $order->get_payment_method_title());
    $method = strtolower((string) $order->get_payment_method());
    if (hoet_is_atm_order($order) || preg_match('/atm|虛擬帳號/i', $title . $method)) {
        return 'ATM 虛擬帳號';
    }
    if (strpos($method, 'line') !== false) {
        return 'LINE Pay';
    }
    if ($title !== '') {
        if (preg_match('/credit|card|信用卡/i', $title . $method)) {
            return '信用卡一次付清';
        }
        return $title;
    }
    return '線上付款';
}

function hoet_ship_method_label(WC_Order $order): string
{
    $title = '';
    foreach ($order->get_shipping_methods() as $ship) {
        $title = $ship->get_name();
        break;
    }
    if ($title === '') {
        $title = (string) $order->get_shipping_method();
    }
    foreach ($order->get_shipping_methods() as $ship) {
        $mid = $ship->get_method_id();
        if (strpos($mid, '711') !== false) {
            return '7-11超商僅取貨';
        }
        if (strpos($mid, 'family') !== false) {
            return '全家超商僅取貨';
        }
        if (strpos($mid, 'hilife') !== false) {
            return '萊爾富超商僅取貨';
        }
        if (strpos($mid, 'ok') !== false) {
            return 'OK超商僅取貨';
        }
        if (strpos($mid, 'home') !== false || strpos($mid, 'tcat') !== false) {
            return '宅配';
        }
    }
    return $title !== '' ? $title : '配送';
}

function hoet_is_cvs(WC_Order $order): bool
{
    $store = hoet_meta($order, ['_shipping_cvs_store_ID', '_shipping_cvs_store_name']);
    if ($store !== '') {
        return true;
    }
    foreach ($order->get_shipping_methods() as $ship) {
        if (strpos($ship->get_method_id(), 'cvs') !== false) {
            return true;
        }
    }
    return false;
}

function hoet_recipient_name(WC_Order $order): string
{
    $name = trim($order->get_formatted_shipping_full_name());
    if ($name === '' || $name === trim($order->get_shipping_first_name())) {
        // RY 可能把全名放 last_name
        $ln = trim((string) $order->get_shipping_last_name());
        $fn = trim((string) $order->get_shipping_first_name());
        $name = trim($ln . $fn);
    }
    if ($name === '') {
        $name = hoet_customer_name($order);
    }
    return $name;
}

function hoet_recipient_phone(WC_Order $order): string
{
    $phone = $order->get_shipping_phone();
    if ($phone === '') {
        $phone = (string) $order->get_meta('_shipping_phone', true);
    }
    if ($phone === '') {
        $phone = $order->get_billing_phone();
    }
    return (string) $phone;
}

function hoet_cvs_store_name(WC_Order $order): string
{
    return hoet_meta($order, ['_shipping_cvs_store_name']);
}

function hoet_cvs_store_addr(WC_Order $order): string
{
    return hoet_meta($order, ['_shipping_cvs_store_address']);
}

function hoet_logistics_info(WC_Order $order): string
{
    $code = hoet_meta($order, ['_hel_CVSCode', '_hel_CVSPaymentNo']);
    $valid = hoet_meta($order, ['_hel_CVSValidationNo']);
    $log_id = hoet_meta($order, ['_hel_AllPayLogisticsID', '_ecpay_shipping_id']);

    $parts = [];
    if ($code !== '') {
        $parts[] = '交貨便／寄貨編號：' . $code;
    }
    if ($valid !== '' && $valid !== $code) {
        $parts[] = '驗證碼：' . $valid;
    }
    if ($log_id !== '') {
        $parts[] = '物流單號：' . $log_id;
    }
    return $parts ? implode('　', $parts) : '出貨後將依物流通知提供查詢資訊';
}

function hoet_item_options(WC_Order_Item_Product $item): string
{
    $bits = [];
    $meta = $item->get_formatted_meta_data('_', true);
    foreach ($meta as $m) {
        $label = wp_strip_all_tags((string) $m->display_key);
        $value = wp_strip_all_tags((string) $m->display_value);
        if ($label === '' || $value === '') {
            continue;
        }
        if (preg_match('/尺寸|size/i', $label)) {
            $bits['size'] = $value;
        } elseif (preg_match('/顏色|color|colour/i', $label)) {
            $bits['color'] = $value;
        } else {
            $bits[] = $label . '：' . $value;
        }
    }
    $size = $bits['size'] ?? '';
    $color = $bits['color'] ?? '';
    unset($bits['size'], $bits['color']);
    if ($size !== '' || $color !== '') {
        return trim($size . ($size && $color ? '｜' : '') . $color);
    }
    return implode('｜', array_map('strval', $bits));
}

function hoet_item_image_url(WC_Order_Item_Product $item): string
{
    $product = $item->get_product();
    if (!$product) {
        return '';
    }
    $id = $product->get_image_id();
    if (!$id && $product->get_parent_id()) {
        $parent = wc_get_product($product->get_parent_id());
        if ($parent) {
            $id = $parent->get_image_id();
        }
    }
    if (!$id) {
        return '';
    }
    $src = wp_get_attachment_image_src((int) $id, 'woocommerce_thumbnail');
    return is_array($src) && !empty($src[0]) ? (string) $src[0] : '';
}

function hoet_discount_rows(WC_Order $order): array
{
    $rows = [];
    foreach ($order->get_items('fee') as $fee) {
        $total = (float) $fee->get_total();
        if ($total >= 0) {
            continue;
        }
        $rows[] = [
            'label'  => $fee->get_name(),
            'amount' => abs($total),
        ];
    }
    $discount = (float) $order->get_discount_total();
    if ($discount > 0) {
        $codes = [];
        foreach ($order->get_coupon_codes() as $code) {
            $codes[] = $code;
        }
        $label = $codes ? ('折扣／優惠｜' . implode('、', $codes)) : '折扣／優惠';
        $rows[] = ['label' => $label, 'amount' => $discount];
    }
    return $rows;
}

function hoet_shipping_total(WC_Order $order): float
{
    return (float) $order->get_shipping_total();
}

function hoet_products_html(WC_Order $order, bool $simple = false): string
{
    $html = '';
    foreach ($order->get_items() as $item) {
        if (!$item instanceof WC_Order_Item_Product) {
            continue;
        }
        $name = $item->get_name();
        $qty = (int) $item->get_quantity();
        $line = (float) $item->get_total();
        $unit = $qty > 0 ? $line / $qty : $line;
        $img = hoet_item_image_url($item);
        $opts = hoet_item_options($item);

        $img_html = $img
            ? '<img src="' . esc_url($img) . '" alt="" width="72" height="96" style="display:block;width:72px;height:96px;object-fit:cover;border:0;" />'
            : '<div style="width:72px;height:96px;background:#f0f0f0;"></div>';

        if ($simple) {
            $html .= '
            <tr>
              <td style="padding:12px 0;border-bottom:1px solid #eee;vertical-align:top;width:80px;">' . $img_html . '</td>
              <td style="padding:12px 0 12px 12px;border-bottom:1px solid #eee;vertical-align:top;font-size:14px;line-height:1.6;color:#111;">
                <div style="font-weight:600;">' . hoet_esc($name) . '</div>
                <div style="margin-top:4px;color:#555;">×' . $qty . '　' . hoet_esc(hoet_money($line)) . '</div>
              </td>
            </tr>';
            continue;
        }

        $html .= '
        <tr>
          <td style="padding:12px 0;border-bottom:1px solid #eee;vertical-align:top;width:80px;">' . $img_html . '</td>
          <td style="padding:12px 0 12px 12px;border-bottom:1px solid #eee;vertical-align:top;font-size:14px;line-height:1.6;color:#111;">
            <div style="font-weight:600;">' . hoet_esc($name) . '</div>
            ' . ($opts !== '' ? '<div style="margin-top:4px;color:#555;">' . hoet_esc($opts) . '</div>' : '') . '
            <div style="margin-top:4px;color:#555;">×' . $qty . '　' . hoet_esc(hoet_money($unit)) . '</div>
          </td>
        </tr>';
    }
    return $html;
}

function hoet_totals_html(WC_Order $order): string
{
    $subtotal = (float) $order->get_subtotal();
    $shipping = hoet_shipping_total($order);
    $total = (float) $order->get_total();
    $rows = '';

    $rows .= hoet_kv_row('商品總金額', hoet_money($subtotal));

    foreach (hoet_discount_rows($order) as $d) {
        $label = $d['label'];
        if (strpos($label, '折扣') !== 0 && strpos($label, '優惠') === false && strpos($label, '折扣碼') === false) {
            $label = '折扣／優惠｜' . $label;
        }
        $rows .= hoet_kv_row($label, '−' . hoet_money($d['amount']));
    }

    if ($shipping > 0) {
        $rows .= hoet_kv_row('運費', hoet_money($shipping));
    } elseif (count($order->get_shipping_methods()) > 0) {
        $rows .= hoet_kv_row('運費', hoet_money(0));
        $rows .= hoet_kv_row('免運優惠', '免運');
    } else {
        $rows .= hoet_kv_row('運費', hoet_money(0));
    }

    $rows .= hoet_kv_row('總金額', hoet_money($total), true);
    return $rows;
}

function hoet_kv_row(string $label, string $value, bool $bold = false): string
{
    $weight = $bold ? '700' : '400';
    return '<tr>
      <td style="padding:6px 0;font-size:14px;color:#333;font-weight:' . $weight . ';">' . hoet_esc($label) . '</td>
      <td style="padding:6px 0;font-size:14px;color:#111;text-align:right;font-weight:' . $weight . ';">' . hoet_esc($value) . '</td>
    </tr>';
}

function hoet_section_title(string $title): string
{
    return '<h2 style="margin:28px 0 12px;font-size:15px;letter-spacing:0.08em;color:' . HOET_GREEN . ';font-weight:700;">' . hoet_esc($title) . '</h2>';
}

function hoet_link_btn(string $label, string $url): string
{
    return '<p style="margin:24px 0 0;"><a href="' . esc_url($url) . '" style="color:' . HOET_GREEN . ';font-weight:700;text-decoration:underline;font-size:14px;">' . hoet_esc($label) . '</a></p>';
}

function hoet_footer_html(): string
{
    return '
    <div style="margin-top:36px;padding-top:20px;border-top:1px solid #ddd;font-size:12px;line-height:1.8;color:#777;">
      <p style="margin:0;">此為系統自動發送信件，請勿直接回覆。</p>
      <p style="margin:8px 0 0;">
        HOVER 官方網站｜<a href="' . esc_url(HOET_SITE_URL) . '" style="color:' . HOET_GREEN . ';text-decoration:underline;">hoverofficial.com</a><br />
        客服聯繫｜<a href="' . esc_url(HOET_LINE_URL) . '" style="color:' . HOET_GREEN . ';text-decoration:underline;">HOVER 官方 LINE</a>
      </p>
    </div>';
}

function hoet_shell(string $inner): string
{
    return '<!DOCTYPE html><html lang="zh-Hant"><head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /></head>
<body style="margin:0;padding:0;background:#f6f6f6;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f6f6f6;padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#ffffff;padding:32px 28px;font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,Helvetica,Arial,sans-serif;color:#111;">
        <tr><td>
          <div style="font-size:28px;letter-spacing:0.2em;font-weight:700;margin-bottom:28px;">HOVER</div>
          ' . $inner . '
          ' . hoet_footer_html() . '
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>';
}

function hoet_shipping_block(WC_Order $order, bool $with_logistics = false): string
{
    $html = hoet_section_title('配送資訊');
    $html .= '<table width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">';
    $html .= hoet_kv_row('收件人', hoet_recipient_name($order));
    $html .= hoet_kv_row('手機', hoet_recipient_phone($order));
    $html .= hoet_kv_row('配送方式', hoet_ship_method_label($order));

    if (hoet_is_cvs($order)) {
        $store = hoet_cvs_store_name($order);
        $addr = hoet_cvs_store_addr($order);
        if ($store !== '') {
            $html .= hoet_kv_row('取貨門市', $store);
        }
        if ($addr !== '') {
            $html .= hoet_kv_row('門市地址', $addr);
        }
    } else {
        $addr = $order->get_formatted_shipping_address();
        if ($addr) {
            $html .= '<tr><td colspan="2" style="padding:6px 0;font-size:14px;color:#333;line-height:1.7;">' . wp_kses_post($addr) . '</td></tr>';
        }
    }

    if ($with_logistics) {
        $html .= hoet_kv_row('物流資訊', hoet_logistics_info($order));
    }

    $html .= '</table>';
    return $html;
}

function hoet_order_info_block(WC_Order $order, array $extra_rows = []): string
{
    $html = hoet_section_title('訂單資訊');
    $html .= '<table width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">';
    $html .= hoet_kv_row('訂單編號', $order->get_order_number());
    $html .= hoet_kv_row('訂單日期', hoet_order_date($order));
    foreach ($extra_rows as $row) {
        $html .= hoet_kv_row($row[0], $row[1]);
    }
    $html .= '</table>';
    return $html;
}

function hoet_products_block(WC_Order $order, bool $simple = false): string
{
    $html = hoet_section_title($simple ? '商品資訊' : '商品資訊');
    $html .= '<table width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">';
    $html .= hoet_products_html($order, $simple);
    $html .= '</table>';
    return $html;
}

function hoet_amount_block(WC_Order $order): string
{
    $html = hoet_section_title('金額明細');
    $html .= '<table width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">';
    $html .= hoet_totals_html($order);
    $html .= '</table>';
    return $html;
}

/* -------------------------------------------------------------------------- */
/* Templates                                                                   */
/* -------------------------------------------------------------------------- */

function hoet_render_email(string $email_id, WC_Order $order): string
{
    switch ($email_id) {
        case 'customer_on_hold_order':
            return hoet_tpl_atm_created($order);
        case 'customer_processing_order':
            return hoet_tpl_paid($order);
        case 'customer_cancelled_order':
            return hoet_tpl_cancelled($order);
        case 'customer_completed_order':
            return hoet_tpl_shipped($order);
        default:
            return '';
    }
}

/** 4｜訂單建立成功（ATM 未付款） */
function hoet_tpl_atm_created(WC_Order $order): string
{
    $name = hoet_customer_name($order);
    $inner = '
      <p style="margin:0 0 12px;font-size:15px;line-height:1.8;">親愛的' . hoet_esc($name) . '，</p>
      <p style="margin:0 0 8px;font-size:14px;line-height:1.8;color:#333;">感謝您的訂購，我們已收到您的訂單。請於付款期限內完成 ATM 轉帳。</p>
      <p style="margin:0 0 8px;font-size:14px;line-height:1.8;color:#333;">付款完成後，系統將自動更新付款狀態，無需另外回報匯款後五碼。</p>
      ' . hoet_section_title('ATM 繳款資訊') . '
      <table width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
        ' . hoet_kv_row('銀行名稱', hoet_atm_bank($order)) . '
        ' . hoet_kv_row('虛擬帳號', hoet_atm_account($order) ?: '（取得中，請至會員中心查看）') . '
        ' . hoet_kv_row('應繳金額', hoet_money($order->get_total())) . '
        ' . hoet_kv_row('付款期限', hoet_atm_expire($order) ?: '請依綠界／會員中心顯示為準') . '
      </table>
      ' . hoet_order_info_block($order) . '
      ' . hoet_products_block($order) . '
      ' . hoet_amount_block($order) . '
      ' . hoet_shipping_block($order) . '
      ' . hoet_link_btn('查看訂單', HOET_ACCOUNT_ORDERS_URL) . '
      <p style="margin:20px 0 0;font-size:13px;line-height:1.8;color:#555;">若超過付款期限仍未完成付款，系統將自動取消此筆訂單；如仍有購買需求，請重新下單。</p>
    ';
    return hoet_shell($inner);
}

/** 5｜付款完成 */
function hoet_tpl_paid(WC_Order $order): string
{
    $name = hoet_customer_name($order);
    $inner = '
      <p style="margin:0 0 12px;font-size:15px;line-height:1.8;">親愛的' . hoet_esc($name) . '，</p>
      <p style="margin:0 0 8px;font-size:14px;line-height:1.8;color:#333;">謝謝您，我們已確認收到您的款項。</p>
      <p style="margin:0 0 8px;font-size:14px;line-height:1.8;color:#333;">我們將接續為您處理訂單，商品出貨後會再寄送出貨通知。</p>
      ' . hoet_order_info_block($order, [
          ['付款方式', hoet_payment_label($order)],
          ['付款日期', hoet_paid_date($order)],
      ]) . '
      ' . hoet_products_block($order) . '
      ' . hoet_amount_block($order) . '
      ' . hoet_shipping_block($order) . '
      ' . hoet_link_btn('查看訂單', HOET_ACCOUNT_ORDERS_URL) . '
      <p style="margin:20px 0 0;font-size:13px;line-height:1.8;color:#555;">如需取消已付款訂單，請透過 <a href="' . esc_url(HOET_LINE_URL) . '" style="color:' . HOET_GREEN . ';text-decoration:underline;">HOVER 官方 LINE</a> 聯繫客服。</p>
    ';
    return hoet_shell($inner);
}

/** 6｜ATM 未付款訂單取消 */
function hoet_tpl_cancelled(WC_Order $order): string
{
    $name = hoet_customer_name($order);
    $reason = '超過付款期限未付款';
    if ($order->get_date_paid()) {
        $reason = '訂單已取消';
    }

    $inner = '
      <p style="margin:0 0 12px;font-size:15px;line-height:1.8;">親愛的' . hoet_esc($name) . '，</p>
      <p style="margin:0 0 8px;font-size:14px;line-height:1.8;color:#333;">因超過付款期限仍未完成付款，您的訂單已自動取消。</p>
      ' . hoet_order_info_block($order, [
          ['付款方式', 'ATM 虛擬帳號'],
          ['取消原因', $reason],
      ]) . '
      ' . hoet_products_block($order, true) . '
      <table width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;margin-top:8px;">
        ' . hoet_kv_row('訂單總金額', hoet_money($order->get_total()), true) . '
      </table>
      <p style="margin:20px 0 0;font-size:14px;line-height:1.8;color:#333;">如仍有購買需求，歡迎重新下單。</p>
      ' . hoet_link_btn('重新選購', HOET_SITE_URL) . '
    ';

    // 若不是 ATM／未付款情境，微調開頭句
    if ($order->get_date_paid() || !hoet_is_atm_order($order)) {
        $inner = '
      <p style="margin:0 0 12px;font-size:15px;line-height:1.8;">親愛的' . hoet_esc($name) . '，</p>
      <p style="margin:0 0 8px;font-size:14px;line-height:1.8;color:#333;">您的訂單已取消。</p>
      ' . hoet_order_info_block($order, [
          ['付款方式', hoet_payment_label($order)],
          ['取消原因', '訂單已取消'],
      ]) . '
      ' . hoet_products_block($order, true) . '
      <table width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;margin-top:8px;">
        ' . hoet_kv_row('訂單總金額', hoet_money($order->get_total()), true) . '
      </table>
      <p style="margin:20px 0 0;font-size:14px;line-height:1.8;color:#333;">如仍有購買需求，歡迎重新下單。</p>
      ' . hoet_link_btn('重新選購', HOET_SITE_URL) . '
    ';
    }

    return hoet_shell($inner);
}

/** 7｜出貨通知 */
function hoet_tpl_shipped(WC_Order $order): string
{
    $name = hoet_customer_name($order);
    $inner = '
      <p style="margin:0 0 12px;font-size:15px;line-height:1.8;">親愛的' . hoet_esc($name) . '，</p>
      <p style="margin:0 0 8px;font-size:14px;line-height:1.8;color:#333;">您的訂單已經出貨，感謝您的耐心等候。</p>
      ' . hoet_section_title('訂單資訊') . '
      <table width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
        ' . hoet_kv_row('訂單編號', $order->get_order_number()) . '
        ' . hoet_kv_row('出貨日期', hoet_shipped_date($order)) . '
      </table>
      ' . hoet_products_block($order) . '
      ' . hoet_amount_block($order) . '
      ' . hoet_shipping_block($order, true) . '
      <p style="margin:20px 0 0;font-size:13px;line-height:1.8;color:#555;">商品送達指定門市後，請依物流通知於期限內完成取貨。</p>
      ' . hoet_link_btn('查看訂單', HOET_ACCOUNT_ORDERS_URL) . '
    ';
    return hoet_shell($inner);
}
