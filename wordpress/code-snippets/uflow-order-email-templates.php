<?php
/**
 * UFLOW — 訂單信件自訂範本（覆蓋 WC 後台文案）
 * 適用站：https://www.uflow.space
 *
 * 對應：
 * 4. ATM 未付款／訂單建立成功
 *    - new_order／customer_note／customer_on_hold_order
 * 5. customer_processing_order  → 付款完成
 * 6. customer_cancelled_order   → 訂單取消
 * 7. customer_completed_order   → 出貨通知
 * 8. 到貨通知 ufet_tpl_arrived／ufet_send_arrived_notice（需物流腳本自行呼叫）
 *
 * 使用方式：
 * 1. Code Snippets → 貼上本檔 → Everywhere → 啟用
 * 2. 後台「新訂單／訂單保留／處理中／已取消／完成訂購」保持啟用
 * 3. WooCommerce → 設定 → 電子郵件 → 標頭圖片可設 LOGO（優先於下方預設）
 */

if (!defined('ABSPATH')) {
    exit;
}

if (defined('UFLOW_ORDER_EMAIL_TEMPLATES_LOADED')) {
    return;
}
define('UFLOW_ORDER_EMAIL_TEMPLATES_LOADED', true);

/** 官網（訂單查詢／重新選購） */
const UFET_SITE_URL = 'https://www.uflow.space';
/** 會員訂單頁 */
const UFET_ACCOUNT_ORDERS_URL = 'https://www.uflow.space/my-account';
/** 官方 LINE（UFLOW） */
const UFET_LINE_URL = 'https://line.me/R/ti/p/@uflow';
/** 客服信箱（頁尾備援） */
const UFET_SUPPORT_EMAIL = 'uflowspace@gmail.com';
/** 品牌主色（UFLOW 粉） */
const UFET_BRAND = '#e6657b';
/** 信件標誌寬度 */
const UFET_LOGO_WIDTH = 180;

/** 讀取 WooCommerce／網站標誌 */
function ufet_logo_url(): string
{
    $woo = trim((string) get_option('woocommerce_email_header_image', ''));
    if ($woo !== '') {
        return esc_url_raw($woo);
    }
    if (function_exists('has_custom_logo') && has_custom_logo()) {
        $logo_id = (int) get_theme_mod('custom_logo');
        $src = $logo_id ? wp_get_attachment_image_url($logo_id, 'full') : '';
        if (is_string($src) && $src !== '') {
            return esc_url_raw($src);
        }
    }
    return UFET_SITE_URL . '/images/logo-04.png';
}

/** 頁首標誌（水平置中） */
function ufet_header_html(): string
{
    $url = ufet_logo_url();
    $width = UFET_LOGO_WIDTH;
    return '
    <div style="margin:0 0 28px;text-align:center;width:100%;">
      <a href="' . esc_url(UFET_SITE_URL) . '" style="display:inline-block;text-decoration:none;border:0;">
        <img src="' . esc_url($url) . '" alt="UFLOW" width="' . (int) $width . '" style="display:block;margin:0 auto;width:' . (int) $width . 'px;max-width:70%;height:auto;border:0;outline:none;" />
      </a>
    </div>';
}

function ufet_email_ids(): array
{
    return [
        'new_order',                 // 您有一筆新訂單（第 4 封 ATM）
        'customer_note',            // 取號備註通知（第 4 封 ATM）
        'customer_on_hold_order',   // 訂單保留（第 4 封 ATM）
        'customer_processing_order',
        'customer_cancelled_order',
        'customer_completed_order',
    ];
}

function ufet_subject_map(): array
{
    return [
        'new_order'                  => '訂單已建立｜請完成付款',
        'customer_note'             => '訂單已建立｜請完成付款',
        'customer_on_hold_order'    => '訂單已建立｜請完成付款',
        'customer_processing_order' => '付款完成｜訂單確認中',
        'customer_cancelled_order'  => '訂單已取消',
        'customer_completed_order'  => '您的 UFLOW 訂單已出貨',
    ];
}

foreach (ufet_subject_map() as $email_id => $subject) {
    add_filter("woocommerce_email_subject_{$email_id}", function ($default, $order) use ($email_id, $subject) {
        // 新訂單／備註／保留：僅 ATM 單改主旨
        if (in_array($email_id, ['new_order', 'customer_note', 'customer_on_hold_order'], true)) {
            if ($order instanceof WC_Order && !ufet_is_atm_order($order)) {
                return $default;
            }
        }
        return $subject;
    }, 50, 2);
    add_filter("woocommerce_email_heading_{$email_id}", function ($heading, $order, $email) {
        return '';
    }, 50, 3);
}

/** 記住目前寄送中的 email 物件 */
add_filter('woocommerce_email_styles', function ($css, $email = null) {
    if ($email && is_object($email)) {
        $GLOBALS['ufet_sending_email'] = $email;
    }
    return $css;
}, 5, 2);

add_action('woocommerce_email_header', function ($heading, $email = null) {
    if ($email && is_object($email)) {
        $GLOBALS['ufet_sending_email'] = $email;
    }
}, 1, 2);

/**
 * 以完整 HTML 覆蓋指定信件內文
 */
add_filter('woocommerce_mail_content', function ($content) {
    $email = $GLOBALS['ufet_sending_email'] ?? null;
    if (!$email || !is_object($email) || empty($email->id)) {
        return $content;
    }
    if (!in_array($email->id, ufet_email_ids(), true)) {
        return $content;
    }

    $order = null;
    if (!empty($email->object) && $email->object instanceof WC_Order) {
        $order = $email->object;
    }
    if (!$order instanceof WC_Order) {
        return $content;
    }

    // 第 4 封：僅 ATM 相關的新訂單／備註／保留
    if (in_array($email->id, ['new_order', 'customer_note', 'customer_on_hold_order'], true)) {
        if (!ufet_should_use_atm_created_template($email, $order)) {
            return $content;
        }
        $html = ufet_tpl_atm_created($order);
        return $html !== '' ? $html : $content;
    }

    $html = ufet_render_email($email->id, $order);
    return $html !== '' ? $html : $content;
}, 999);

/** 是否套用「ATM 訂單建立成功」範本 */
function ufet_should_use_atm_created_template($email, WC_Order $order): bool
{
    if (ufet_is_atm_order($order)) {
        return true;
    }
    if (is_object($email) && !empty($email->id) && $email->id === 'customer_note') {
        $note = '';
        if (isset($email->customer_note)) {
            $note = (string) $email->customer_note;
        }
        if ($note === '' && method_exists($order, 'get_customer_note')) {
            $note = (string) $order->get_customer_note();
        }
        return (bool) preg_match('/轉帳資訊|虛擬帳號|繳費期限/u', $note);
    }
    return false;
}

/* -------------------------------------------------------------------------- */
/* Helpers                                                                     */
/* -------------------------------------------------------------------------- */

function ufet_esc($s): string
{
    return esc_html((string) $s);
}

function ufet_money($amount): string
{
    $n = (float) $amount;
    return 'NT$' . number_format($n, 0, '.', ',');
}

function ufet_customer_name(WC_Order $order): string
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

function ufet_order_date(WC_Order $order): string
{
    $d = $order->get_date_created();
    return $d ? $d->date_i18n('Y/m/d H:i') : '';
}

function ufet_paid_date(WC_Order $order): string
{
    $d = $order->get_date_paid();
    if (!$d) {
        $d = $order->get_date_modified();
    }
    return $d ? $d->date_i18n('Y/m/d H:i') : '';
}

function ufet_shipped_date(WC_Order $order): string
{
    $d = $order->get_date_completed();
    if (!$d) {
        $d = $order->get_date_modified();
    }
    return $d ? $d->date_i18n('Y/m/d H:i') : '';
}

function ufet_meta(WC_Order $order, array $keys): string
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

function ufet_is_atm_order(WC_Order $order): bool
{
    if (ufet_atm_account($order) !== '') {
        return true;
    }
    $method = strtolower($order->get_payment_method() . ' ' . $order->get_payment_method_title());
    if (preg_match('/atm|虛擬帳號|轉帳/', $method)) {
        return true;
    }
    // 備援：舊流程寫在顧客備註
    $note = (string) $order->get_customer_note();
    return (bool) preg_match('/虛擬帳號|轉帳資訊|_vAccount/u', $note);
}

function ufet_atm_bank(WC_Order $order): string
{
    $code = preg_replace('/\D/', '', ufet_meta($order, ['_BankCode', 'BankCode', '_ecpay_atm_bank_code', '_atm_bank']));
    if ($code === '') {
        $note = (string) $order->get_customer_note();
        if (preg_match('/銀行代碼[:：\s]*(\d{3})/u', $note, $m)) {
            $code = $m[1];
        }
    }
    $names = [
        '007' => '第一商業銀行',
        '004' => '臺灣銀行',
        '005' => '土地銀行',
        '008' => '華南銀行',
        '009' => '彰化銀行',
        '012' => '台北富邦銀行',
        '013' => '國泰世華銀行',
        '017' => '兆豐銀行',
        '812' => '台新銀行',
        '822' => '中國信託',
        '118' => '板信商業銀行',
    ];
    if ($code === '') {
        return '（請依繳款頁顯示為準）';
    }
    if (isset($names[$code])) {
        return $names[$code] . '（' . $code . '）';
    }
    return '銀行代碼 ' . $code;
}

function ufet_atm_account(WC_Order $order): string
{
    $acc = ufet_meta($order, ['_vAccount', '_PaymentNo', 'vAccount', '_ecpay_atm_vaccount']);
    if ($acc !== '') {
        return $acc;
    }
    $note = (string) $order->get_customer_note();
    if (preg_match('/虛擬帳號[:：\s]*(\d{10,20})/u', $note, $m)) {
        return $m[1];
    }
    return '';
}

function ufet_atm_expire(WC_Order $order): string
{
    $raw = ufet_meta($order, ['_ExpireDate', 'ExpireDate', '_ecpay_atm_expire_date']);
    if ($raw === '') {
        $note = (string) $order->get_customer_note();
        if (preg_match('/繳費期限[:：\s]*([0-9\/\-:\s]+)/u', $note, $m)) {
            $raw = trim($m[1]);
        }
    }
    if ($raw === '') {
        return '';
    }
    $ts = strtotime(str_replace('/', '-', $raw));
    if ($ts) {
        return wp_date('Y/m/d H:i', $ts);
    }
    return $raw;
}

function ufet_payment_label(WC_Order $order): string
{
    $title = trim((string) $order->get_payment_method_title());
    $method = strtolower((string) $order->get_payment_method());
    if (ufet_is_atm_order($order) || preg_match('/atm|虛擬帳號/i', $title . $method)) {
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

function ufet_ship_method_label(WC_Order $order): string
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

function ufet_is_cvs(WC_Order $order): bool
{
    $store = ufet_meta($order, ['_shipping_cvs_store_ID', '_shipping_cvs_store_name']);
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

function ufet_recipient_name(WC_Order $order): string
{
    $name = trim($order->get_formatted_shipping_full_name());
    if ($name === '' || $name === trim($order->get_shipping_first_name())) {
        // RY 可能把全名放 last_name
        $ln = trim((string) $order->get_shipping_last_name());
        $fn = trim((string) $order->get_shipping_first_name());
        $name = trim($ln . $fn);
    }
    if ($name === '') {
        $name = ufet_customer_name($order);
    }
    return $name;
}

function ufet_recipient_phone(WC_Order $order): string
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

function ufet_cvs_store_name(WC_Order $order): string
{
    return ufet_meta($order, ['_shipping_cvs_store_name']);
}

function ufet_cvs_store_addr(WC_Order $order): string
{
    return ufet_meta($order, ['_shipping_cvs_store_address']);
}

function ufet_logistics_info(WC_Order $order): string
{
    $code = ufet_meta($order, ['_hel_CVSCode', '_hel_CVSPaymentNo']);
    $valid = ufet_meta($order, ['_hel_CVSValidationNo']);
    $log_id = ufet_meta($order, ['_hel_AllPayLogisticsID', '_ecpay_shipping_id']);

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

/**
 * 信件商品名稱：變體單改用父商品名，避免「T 恤 M_黑」再重複顯示尺寸／顏色。
 */
function ufet_item_title(WC_Order_Item_Product $item): string
{
    $name = trim((string) $item->get_name());
    $product = $item->get_product();
    if ($product && $product->is_type('variation')) {
        $parent = wc_get_product($product->get_parent_id());
        if ($parent) {
            $title = trim((string) $parent->get_name());
            if ($title !== '') {
                return $title;
            }
        }
    }

    $opts = ufet_item_options($item);
    if ($name === '' || $opts === '') {
        return $name;
    }

    $parts = array_values(array_filter(array_map('trim', preg_split('/[｜|,，_\-\/]+/u', $opts) ?: [])));
    if (!$parts) {
        return $name;
    }

    $patterns = [
        implode('_', $parts),
        implode(' ', $parts),
        implode(', ', $parts),
        implode('，', $parts),
        implode('｜', $parts),
    ];
    foreach ($patterns as $suffix) {
        $stripped = preg_replace('/\s*[-–—]?\s*' . preg_quote($suffix, '/') . '\s*$/u', '', $name);
        if (is_string($stripped) && $stripped !== '' && $stripped !== $name) {
            return trim($stripped);
        }
    }

    return $name;
}

/** gift｜addon｜空字串（一般商品）；相容 _uflow_*／_hover_* meta */
function ufet_item_promo_kind(WC_Order_Item_Product $item): string
{
    $type = trim((string) $item->get_meta('_uflow_promotion_type', true));
    if ($type === '') {
        $type = trim((string) $item->get_meta('_hover_promotion_type', true));
    }
    if ($type === '滿額贈' || $type === 'gift') {
        return 'gift';
    }
    if ($type === '加價購' || $type === 'addon') {
        return 'addon';
    }
    $kind = trim((string) $item->get_meta('_uflow_promotion_kind', true));
    if ($kind === '') {
        $kind = trim((string) $item->get_meta('_hover_promotion_kind', true));
    }
    if ($kind === 'gift' || $kind === 'addon') {
        return $kind;
    }
    return '';
}

function ufet_item_promo_is_random(WC_Order_Item_Product $item): bool
{
    $flag = strtolower(trim((string) $item->get_meta('_uflow_random_color', true)));
    if ($flag === '') {
        $flag = strtolower(trim((string) $item->get_meta('_hover_random_color', true)));
    }
    return in_array($flag, ['yes', '1', 'true'], true);
}

/** 信件用：滿額贈／加價購醒目標籤 */
function ufet_item_promo_badge(WC_Order_Item_Product $item): string
{
    $kind = ufet_item_promo_kind($item);
    if ($kind === 'gift') {
        $label = ufet_item_promo_is_random($item)
            ? '滿額贈｜顏色隨機出貨'
            : '滿額贈';
    } elseif ($kind === 'addon') {
        $label = '加價購';
    } else {
        return '';
    }
    return '<div style="margin:0 0 6px;"><span style="display:inline-block;padding:3px 8px;background:' . UFET_BRAND . ';color:#ffffff;font-size:11px;font-weight:700;letter-spacing:0.06em;line-height:1.4;">' . ufet_esc($label) . '</span></div>';
}

function ufet_item_options(WC_Order_Item_Product $item): string
{
    $hide_labels = [
        '活動類型' => true,
        '成交單價' => true,
        '出貨 SKU' => true,
        '出貨備註' => true,
    ];
    $bits = [];
    $meta = $item->get_formatted_meta_data('_', true);
    foreach ($meta as $m) {
        $label = wp_strip_all_tags((string) $m->display_key);
        $value = wp_strip_all_tags((string) $m->display_value);
        if ($label === '' || $value === '') {
            continue;
        }
        if (isset($hide_labels[$label])) {
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

function ufet_item_image_url(WC_Order_Item_Product $item): string
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

function ufet_discount_rows(WC_Order $order): array
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

function ufet_shipping_total(WC_Order $order): float
{
    return (float) $order->get_shipping_total();
}

function ufet_products_html(WC_Order $order, bool $simple = false): string
{
    $html = '';
    foreach ($order->get_items() as $item) {
        if (!$item instanceof WC_Order_Item_Product) {
            continue;
        }
        $name = ufet_item_title($item);
        $qty = (int) $item->get_quantity();
        $line = (float) $item->get_total();
        $unit = $qty > 0 ? $line / $qty : $line;
        $img = ufet_item_image_url($item);
        $opts = ufet_item_options($item);
        $badge = ufet_item_promo_badge($item);
        $kind = ufet_item_promo_kind($item);

        $price_label = '';
        if ($kind === 'gift') {
            $price_label = '贈品　';
            $unit = 0;
            $line = 0;
        } elseif ($kind === 'addon') {
            $price_label = '加購價　';
        }

        $img_html = $img
            ? '<img src="' . esc_url($img) . '" alt="" width="72" height="96" style="display:block;width:72px;height:96px;object-fit:cover;border:0;" />'
            : '<div style="width:72px;height:96px;background:#f0f0f0;"></div>';

        $price_html = $simple
            ? ufet_esc($price_label . '×' . $qty . '　' . ufet_money($line))
            : ufet_esc($price_label . '×' . $qty . '　' . ufet_money($unit));

        $html .= '
        <tr>
          <td style="padding:12px 0;border-bottom:1px solid #eee;vertical-align:top;width:80px;">' . $img_html . '</td>
          <td style="padding:12px 0 12px 12px;border-bottom:1px solid #eee;vertical-align:top;font-size:14px;line-height:1.6;color:#111;">
            ' . $badge . '
            <div style="font-weight:600;">' . ufet_esc($name) . '</div>
            ' . ($opts !== '' ? '<div style="margin-top:4px;color:#555;">' . ufet_esc($opts) . '</div>' : '') . '
            <div style="margin-top:4px;color:#555;">' . $price_html . '</div>
          </td>
        </tr>';
    }
    return $html;
}

function ufet_totals_html(WC_Order $order): string
{
    $subtotal = (float) $order->get_subtotal();
    $shipping = ufet_shipping_total($order);
    $total = (float) $order->get_total();
    $rows = '';

    $rows .= ufet_kv_row('商品總金額', ufet_money($subtotal));

    foreach (ufet_discount_rows($order) as $d) {
        $label = $d['label'];
        if (strpos($label, '折扣') !== 0 && strpos($label, '優惠') === false && strpos($label, '折扣碼') === false) {
            $label = '折扣／優惠｜' . $label;
        }
        $rows .= ufet_kv_row($label, '−' . ufet_money($d['amount']));
    }

    if ($shipping > 0) {
        $rows .= ufet_kv_row('運費', ufet_money($shipping));
    } elseif (count($order->get_shipping_methods()) > 0) {
        $rows .= ufet_kv_row('運費', ufet_money(0));
        $rows .= ufet_kv_row('免運優惠', '免運');
    } else {
        $rows .= ufet_kv_row('運費', ufet_money(0));
    }

    $rows .= ufet_kv_row('總金額', ufet_money($total), true);
    return $rows;
}

function ufet_kv_row(string $label, string $value, bool $bold = false): string
{
    $weight = $bold ? '700' : '400';
    return '<tr>
      <td style="padding:6px 0;font-size:14px;color:#333;font-weight:' . $weight . ';">' . ufet_esc($label) . '</td>
      <td style="padding:6px 0;font-size:14px;color:#111;text-align:right;font-weight:' . $weight . ';">' . ufet_esc($value) . '</td>
    </tr>';
}

function ufet_section_title(string $title): string
{
    return '<h2 style="margin:28px 0 12px;font-size:15px;letter-spacing:0.08em;color:' . UFET_BRAND . ';font-weight:700;">' . ufet_esc($title) . '</h2>';
}

function ufet_link_btn(string $label, string $url): string
{
    return '<p style="margin:24px 0 0;"><a href="' . esc_url($url) . '" style="color:' . UFET_BRAND . ';font-weight:700;text-decoration:underline;font-size:14px;">' . ufet_esc($label) . '</a></p>';
}

function ufet_footer_html(): string
{
    return '
    <div style="margin-top:36px;padding-top:20px;border-top:1px solid #ddd;font-size:12px;line-height:1.8;color:#777;text-align:center;">
      <p style="margin:0;text-align:center;">此為系統自動發送信件，請勿直接回覆。</p>
      <p style="margin:8px 0 0;text-align:center;">
        UFLOW 官方網站｜<a href="' . esc_url(UFET_SITE_URL) . '" style="color:' . UFET_BRAND . ';text-decoration:underline;">uflow.space</a><br />
        客服聯繫｜<a href="' . esc_url(UFET_LINE_URL) . '" style="color:' . UFET_BRAND . ';text-decoration:underline;">UFLOW 官方 LINE</a>
        ｜<a href="mailto:' . esc_attr(UFET_SUPPORT_EMAIL) . '" style="color:' . UFET_BRAND . ';text-decoration:underline;">' . esc_html(UFET_SUPPORT_EMAIL) . '</a>
      </p>
    </div>';
}

function ufet_shell(string $inner): string
{
    return '<!DOCTYPE html><html lang="zh-Hant"><head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /></head>
<body style="margin:0;padding:0;background:#f6f6f6;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f6f6f6;padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#ffffff;padding:32px 28px;font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,Helvetica,Arial,sans-serif;color:#111;">
        <tr><td>
          ' . ufet_header_html() . '
          ' . $inner . '
          ' . ufet_footer_html() . '
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>';
}

function ufet_shipping_block(WC_Order $order, bool $with_logistics = false): string
{
    $html = ufet_section_title('配送資訊');
    $html .= '<table width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">';
    $html .= ufet_kv_row('收件人', ufet_recipient_name($order));
    $html .= ufet_kv_row('手機', ufet_recipient_phone($order));
    $html .= ufet_kv_row('配送方式', ufet_ship_method_label($order));

    if (ufet_is_cvs($order)) {
        $store = ufet_cvs_store_name($order);
        $addr = ufet_cvs_store_addr($order);
        if ($store !== '') {
            $html .= ufet_kv_row('取貨門市', $store);
        }
        if ($addr !== '') {
            $html .= ufet_kv_row('門市地址', $addr);
        }
    } else {
        $addr = $order->get_formatted_shipping_address();
        if ($addr) {
            $html .= '<tr><td colspan="2" style="padding:6px 0;font-size:14px;color:#333;line-height:1.7;">' . wp_kses_post($addr) . '</td></tr>';
        }
    }

    if ($with_logistics) {
        $html .= ufet_kv_row('物流資訊', ufet_logistics_info($order));
    }

    $html .= '</table>';
    return $html;
}

function ufet_order_info_block(WC_Order $order, array $extra_rows = []): string
{
    $html = ufet_section_title('訂單資訊');
    $html .= '<table width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">';
    $html .= ufet_kv_row('訂單編號', $order->get_order_number());
    $html .= ufet_kv_row('訂單日期', ufet_order_date($order));
    foreach ($extra_rows as $row) {
        $html .= ufet_kv_row($row[0], $row[1]);
    }
    $html .= '</table>';
    return $html;
}

function ufet_products_block(WC_Order $order, bool $simple = false): string
{
    $html = ufet_section_title($simple ? '商品資訊' : '商品資訊');
    $html .= '<table width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">';
    $html .= ufet_products_html($order, $simple);
    $html .= '</table>';
    return $html;
}

function ufet_amount_block(WC_Order $order): string
{
    $html = ufet_section_title('金額明細');
    $html .= '<table width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">';
    $html .= ufet_totals_html($order);
    $html .= '</table>';
    return $html;
}

/* -------------------------------------------------------------------------- */
/* Templates                                                                   */
/* -------------------------------------------------------------------------- */

function ufet_render_email(string $email_id, WC_Order $order): string
{
    switch ($email_id) {
        case 'new_order':
        case 'customer_note':
        case 'customer_on_hold_order':
            return ufet_tpl_atm_created($order);
        case 'customer_processing_order':
            return ufet_tpl_paid($order);
        case 'customer_cancelled_order':
            return ufet_tpl_cancelled($order);
        case 'customer_completed_order':
            return ufet_tpl_shipped($order);
        default:
            return '';
    }
}

/** 4｜訂單建立成功（ATM 未付款） */
function ufet_tpl_atm_created(WC_Order $order): string
{
    $name = ufet_customer_name($order);
    $inner = '
      <p style="margin:0 0 12px;font-size:15px;line-height:1.8;">親愛的' . ufet_esc($name) . '，</p>
      <p style="margin:0 0 8px;font-size:14px;line-height:1.8;color:#333;">感謝您的訂購，我們已收到您的訂單。請於付款期限內完成 ATM 轉帳。</p>
      <p style="margin:0 0 8px;font-size:14px;line-height:1.8;color:#333;">付款完成後，系統將自動更新付款狀態，無需另外回報匯款後五碼。</p>
      ' . ufet_section_title('ATM 繳款資訊') . '
      <table width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
        ' . ufet_kv_row('銀行名稱', ufet_atm_bank($order)) . '
        ' . ufet_kv_row('虛擬帳號', ufet_atm_account($order) ?: '（取得中，請至會員中心查看）') . '
        ' . ufet_kv_row('應繳金額', ufet_money($order->get_total())) . '
        ' . ufet_kv_row('付款期限', ufet_atm_expire($order) ?: '請依綠界／會員中心顯示為準') . '
      </table>
      ' . ufet_order_info_block($order) . '
      ' . ufet_products_block($order) . '
      ' . ufet_amount_block($order) . '
      ' . ufet_shipping_block($order) . '
      ' . ufet_link_btn('查看訂單', UFET_ACCOUNT_ORDERS_URL) . '
      <p style="margin:20px 0 0;font-size:13px;line-height:1.8;color:#555;">若超過付款期限仍未完成付款，系統將自動取消此筆訂單；如仍有購買需求，請重新下單。</p>
    ';
    return ufet_shell($inner);
}

/** 5｜付款完成 */
function ufet_tpl_paid(WC_Order $order): string
{
    $name = ufet_customer_name($order);
    $inner = '
      <p style="margin:0 0 12px;font-size:15px;line-height:1.8;">親愛的' . ufet_esc($name) . '，</p>
      <p style="margin:0 0 8px;font-size:14px;line-height:1.8;color:#333;">謝謝您，我們已確認收到您的款項。</p>
      <p style="margin:0 0 8px;font-size:14px;line-height:1.8;color:#333;">我們將接續為您處理訂單，商品出貨後會再寄送出貨通知。</p>
      ' . ufet_order_info_block($order, [
          ['付款方式', ufet_payment_label($order)],
          ['付款日期', ufet_paid_date($order)],
      ]) . '
      ' . ufet_products_block($order) . '
      ' . ufet_amount_block($order) . '
      ' . ufet_shipping_block($order) . '
      ' . ufet_link_btn('查看訂單', UFET_ACCOUNT_ORDERS_URL) . '
      <p style="margin:20px 0 0;font-size:13px;line-height:1.8;color:#555;">如需取消已付款訂單，請透過 <a href="' . esc_url(UFET_LINE_URL) . '" style="color:' . UFET_BRAND . ';text-decoration:underline;">UFLOW 官方 LINE</a> 聯繫客服。</p>
    ';
    return ufet_shell($inner);
}

/** 6｜ATM 未付款訂單取消 */
function ufet_tpl_cancelled(WC_Order $order): string
{
    $name = ufet_customer_name($order);
    $reason = '超過付款期限未付款';
    if ($order->get_date_paid()) {
        $reason = '訂單已取消';
    }

    $inner = '
      <p style="margin:0 0 12px;font-size:15px;line-height:1.8;">親愛的' . ufet_esc($name) . '，</p>
      <p style="margin:0 0 8px;font-size:14px;line-height:1.8;color:#333;">因超過付款期限仍未完成付款，您的訂單已自動取消。</p>
      ' . ufet_order_info_block($order, [
          ['付款方式', 'ATM 虛擬帳號'],
          ['取消原因', $reason],
      ]) . '
      ' . ufet_products_block($order, true) . '
      <table width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;margin-top:8px;">
        ' . ufet_kv_row('訂單總金額', ufet_money($order->get_total()), true) . '
      </table>
      <p style="margin:20px 0 0;font-size:14px;line-height:1.8;color:#333;">如仍有購買需求，歡迎重新下單。</p>
      ' . ufet_link_btn('重新選購', UFET_SITE_URL) . '
    ';

    // 若不是 ATM／未付款情境，微調開頭句
    if ($order->get_date_paid() || !ufet_is_atm_order($order)) {
        $inner = '
      <p style="margin:0 0 12px;font-size:15px;line-height:1.8;">親愛的' . ufet_esc($name) . '，</p>
      <p style="margin:0 0 8px;font-size:14px;line-height:1.8;color:#333;">您的訂單已取消。</p>
      ' . ufet_order_info_block($order, [
          ['付款方式', ufet_payment_label($order)],
          ['取消原因', '訂單已取消'],
      ]) . '
      ' . ufet_products_block($order, true) . '
      <table width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;margin-top:8px;">
        ' . ufet_kv_row('訂單總金額', ufet_money($order->get_total()), true) . '
      </table>
      <p style="margin:20px 0 0;font-size:14px;line-height:1.8;color:#333;">如仍有購買需求，歡迎重新下單。</p>
      ' . ufet_link_btn('重新選購', UFET_SITE_URL) . '
    ';
    }

    return ufet_shell($inner);
}

/** 7｜出貨通知 */
function ufet_tpl_shipped(WC_Order $order): string
{
    $name = ufet_customer_name($order);
    $inner = '
      <p style="margin:0 0 12px;font-size:15px;line-height:1.8;">親愛的' . ufet_esc($name) . '，</p>
      <p style="margin:0 0 8px;font-size:14px;line-height:1.8;color:#333;">您的訂單已經出貨，感謝您的耐心等候。</p>
      ' . ufet_section_title('訂單資訊') . '
      <table width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
        ' . ufet_kv_row('訂單編號', $order->get_order_number()) . '
        ' . ufet_kv_row('出貨日期', ufet_shipped_date($order)) . '
      </table>
      ' . ufet_products_block($order) . '
      ' . ufet_amount_block($order) . '
      ' . ufet_shipping_block($order, true) . '
      <p style="margin:20px 0 0;font-size:13px;line-height:1.8;color:#555;">商品送達指定門市後，請依物流通知於期限內完成取貨。</p>
      ' . ufet_link_btn('查看訂單', UFET_ACCOUNT_ORDERS_URL) . '
    ';
    return ufet_shell($inner);
}

/* -------------------------------------------------------------------------- */
/* 8｜已到貨通知（綠界貨態 arrived）                                            */
/* -------------------------------------------------------------------------- */

/** 到店時間（綠界 UpdateStatusDate；無則空） */
function ufet_store_arrived_date(WC_Order $order): string
{
    $raw = trim((string) $order->get_meta('_uflow_store_arrived_at', true));
    if ($raw === '') {
        return '';
    }
    $ts = strtotime(str_replace('/', '-', $raw));
    return $ts ? wp_date('Y/m/d H:i', $ts) : $raw;
}

/** 超商取貨參考期限：到店日 + 7 日 */
function ufet_pickup_deadline(WC_Order $order): string
{
    $raw = trim((string) $order->get_meta('_uflow_store_arrived_at', true));
    $ts = $raw !== '' ? strtotime(str_replace('/', '-', $raw)) : 0;
    if (!$ts) {
        return '送達門市後 7 日內';
    }
    return wp_date('Y/m/d', $ts + 7 * DAY_IN_SECONDS) . ' 前';
}

function ufet_tpl_arrived(WC_Order $order): string
{
    $name = ufet_customer_name($order);
    $arrived = ufet_store_arrived_date($order);
    $extra = [];
    if ($arrived !== '') {
        $extra[] = ['到店時間', $arrived];
    }
    if (ufet_is_cvs($order)) {
        $extra[] = ['取貨期限', ufet_pickup_deadline($order)];
    }

    $lead = ufet_is_cvs($order)
        ? '您的商品已送達指定門市，請於期限內完成取貨。'
        : '您的商品已送達，請留意配送／取貨通知。';

    $hint = ufet_is_cvs($order)
        ? '請攜帶取貨代碼於期限內至門市取貨。逾期未取，貨件將依物流規定退回。'
        : '若為宅配，請依物流通知完成收件。';

    $inner = '
      <p style="margin:0 0 12px;font-size:15px;line-height:1.8;">親愛的' . ufet_esc($name) . '，</p>
      <p style="margin:0 0 8px;font-size:14px;line-height:1.8;color:#333;">' . ufet_esc($lead) . '</p>
      ' . ufet_order_info_block($order, $extra) . '
      ' . ufet_products_block($order, true) . '
      ' . ufet_shipping_block($order, true) . '
      <p style="margin:20px 0 0;font-size:13px;line-height:1.8;color:#555;">' . ufet_esc($hint) . '</p>
      ' . ufet_link_btn('查看訂單', UFET_ACCOUNT_ORDERS_URL) . '
    ';
    return ufet_shell($inner);
}

/**
 * 綠界貨態進入 arrived 時寄出（同一訂單只寄一次）
 */
function ufet_send_arrived_notice(WC_Order $order): bool
{
    if ((string) $order->get_meta('_uflow_arrived_notice_sent') === '1') {
        return false;
    }

    $to = sanitize_email((string) $order->get_billing_email());
    if ($to === '' || !is_email($to)) {
        $order->add_order_note('UFLOW：到貨通知未寄出（無有效信箱）');
        $order->save();
        return false;
    }

    if (!function_exists('WC') || !WC()->mailer()) {
        return false;
    }

    $subject = '商品已到貨｜請盡速取貨';
    $html = ufet_tpl_arrived($order);
    $headers = ['Content-Type: text/html; charset=UTF-8'];

    $sent = WC()->mailer()->send($to, $subject, $html, $headers);
    if (!$sent) {
        if (defined('WP_DEBUG') && WP_DEBUG) {
            error_log('[UFLOW] arrived notice failed for order ' . $order->get_id());
        }
        return false;
    }

    $order->update_meta_data('_uflow_arrived_notice_sent', '1');
    $order->update_meta_data('_uflow_arrived_notice_sent_at', wp_date('Y-m-d H:i:s'));
    $order->add_order_note('UFLOW：已寄出到貨通知信（' . $to . '）');
    $order->save();
    return true;
}
