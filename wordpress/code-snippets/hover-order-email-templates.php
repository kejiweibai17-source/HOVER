<?php
/**
 * HOVER — 訂單信件自訂範本（覆蓋 WC 後台文案）
 *
 * 對應：
 * 4. ATM 未付款／訂單建立成功
 *    - new_order（後台名稱「新訂單」，主旨常為「您有一筆新訂單」）
 *    - customer_note（綠界取號後寫入轉帳備註時寄給顧客）
 *    - customer_on_hold_order（若訂單改為保留也套用）
 * 5. customer_processing_order  → 付款完成
 * 6. customer_cancelled_order   → 訂單取消
 * 7. customer_completed_order   → 出貨通知
 * 8. 綠界貨態 arrived           → 已到貨／請取貨（由 hover-ecpay-logistics.php 觸發）
 *
 * 使用方式：
 * 1. Code Snippets → 貼上本檔 → Everywhere → 啟用
 * 2. 後台「新訂單／訂單保留／處理中／已取消／完成訂購」保持啟用即可
 * 3. 需同時啟用 hover-ecpay-logistics.php（綠界／RY 貨態回呼觸發 8–10；退貨按鈕觸發 11–12）
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
/** 官方 LINE（HOVER Basic ID @330kefmm） */
const HOET_LINE_ID = '@330kefmm';
const HOET_LINE_URL = 'https://line.me/R/ti/p/@330kefmm';
/** 品牌綠 */
const HOET_GREEN = '#2a514d';
/** 信件標誌寬度 */
const HOET_LOGO_WIDTH = 180;

/** 讀取 WooCommerce／網站標誌 */
function hoet_logo_url(): string
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
    return HOET_SITE_URL . '/images/logo-04.png';
}

/** 頁首標誌（水平置中） */
function hoet_header_html(): string
{
    $url = hoet_logo_url();
    $width = HOET_LOGO_WIDTH;
    return '
    <div style="margin:0 0 28px;text-align:center;width:100%;">
      <a href="' . esc_url(HOET_SITE_URL) . '" style="display:inline-block;text-decoration:none;border:0;">
        <img src="' . esc_url($url) . '" alt="HOVER" width="' . (int) $width . '" style="display:block;margin:0 auto;width:' . (int) $width . 'px;max-width:70%;height:auto;border:0;outline:none;" />
      </a>
    </div>';
}

function hoet_email_ids(): array
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

function hoet_subject_map(): array
{
    return [
        'new_order'                  => '訂單已建立｜請完成付款',
        'customer_note'             => '訂單已建立｜請完成付款',
        'customer_on_hold_order'    => '訂單已建立｜請完成付款',
        'customer_processing_order' => '付款完成｜訂單確認中',
        'customer_cancelled_order'  => '訂單已取消',
        'customer_completed_order'  => '您的 HOVER 訂單已出貨',
    ];
}

foreach (hoet_subject_map() as $email_id => $subject) {
    add_filter("woocommerce_email_subject_{$email_id}", function ($default, $order) use ($email_id, $subject) {
        // 新訂單／備註／保留：僅 ATM 單改主旨
        if (in_array($email_id, ['new_order', 'customer_note', 'customer_on_hold_order'], true)) {
            if ($order instanceof WC_Order && !hoet_is_atm_order($order)) {
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
 * 以完整 HTML 覆蓋指定信件內文
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

    // 第 4 封：僅 ATM 相關的新訂單／備註／保留
    if (in_array($email->id, ['new_order', 'customer_note', 'customer_on_hold_order'], true)) {
        if (!hoet_should_use_atm_created_template($email, $order)) {
            return $content;
        }
        $html = hoet_tpl_atm_created($order);
        return $html !== '' ? $html : $content;
    }

    $html = hoet_render_email($email->id, $order);
    return $html !== '' ? $html : $content;
}, 999);

/** 是否套用「ATM 訂單建立成功」範本 */
function hoet_should_use_atm_created_template($email, WC_Order $order): bool
{
    if (hoet_is_atm_order($order)) {
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

function hoet_esc($s): string
{
    return esc_html((string) $s);
}

/** 與官網一致：NT.5,239／-NT.252 */
function hoet_money($amount): string
{
    $n = (int) round((float) $amount);
    $body = 'NT.' . number_format(abs($n), 0, '.', ',');
    return $n < 0 ? '-' . $body : $body;
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

function hoet_is_atm_order(WC_Order $order): bool
{
    if (hoet_atm_account($order) !== '') {
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

function hoet_atm_bank(WC_Order $order): string
{
    $code = preg_replace('/\D/', '', hoet_meta($order, ['_BankCode', 'BankCode', '_ecpay_atm_bank_code', '_atm_bank']));
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

function hoet_atm_account(WC_Order $order): string
{
    $acc = hoet_meta($order, ['_vAccount', '_PaymentNo', 'vAccount', '_ecpay_atm_vaccount']);
    if ($acc !== '') {
        return $acc;
    }
    $note = (string) $order->get_customer_note();
    if (preg_match('/虛擬帳號[:：\s]*(\d{10,20})/u', $note, $m)) {
        return $m[1];
    }
    return '';
}

function hoet_atm_expire(WC_Order $order): string
{
    $raw = hoet_meta($order, ['_ExpireDate', 'ExpireDate', '_ecpay_atm_expire_date']);
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

/**
 * 信件商品名稱：變體單改用父商品名，避免「T 恤 M_黑」再重複顯示尺寸／顏色。
 */
function hoet_item_title(WC_Order_Item_Product $item): string
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

    $display = trim((string) $item->get_meta('_hover_display_name', true));
    // 舊訂單可能寫入規格行（如「F｜顏色隨機出貨」）而非品名
    if ($display !== '' && strpos($display, '顏色隨機出貨') === false) {
        $stripped = preg_replace('/\s+[-–—]\s+[^-–—]+$/u', '', $display);
        return is_string($stripped) && trim($stripped) !== '' ? trim($stripped) : $display;
    }

    if (hoet_item_promo_kind($item) === 'gift' && hoet_item_promo_is_random($item)) {
        $stripped = preg_replace('/\s+[-–—]\s+[^-–—]+$/u', '', $name);
        return is_string($stripped) && trim($stripped) !== '' ? trim($stripped) : $name;
    }

    $opts = hoet_item_options($item, false);
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

/** gift｜addon｜空字串（一般商品） */
function hoet_item_promo_kind(WC_Order_Item_Product $item): string
{
    $type = trim((string) $item->get_meta('_hover_promotion_type', true));
    if ($type === '滿額贈' || $type === 'gift') {
        return 'gift';
    }
    if ($type === '加價購' || $type === 'addon') {
        return 'addon';
    }
    $kind = trim((string) $item->get_meta('_hover_promotion_kind', true));
    if ($kind === 'gift' || $kind === 'addon') {
        return $kind;
    }
    return '';
}

function hoet_item_promo_is_random(WC_Order_Item_Product $item): bool
{
    $flag = strtolower(trim((string) $item->get_meta('_hover_random_color', true)));
    return in_array($flag, ['yes', '1', 'true'], true);
}

/** 信件用：滿額贈／加價購醒目標籤 */
function hoet_item_promo_badge(WC_Order_Item_Product $item): string
{
    $kind = hoet_item_promo_kind($item);
    if ($kind === 'gift') {
        $label = '滿額贈';
    } elseif ($kind === 'addon') {
        $label = '加價購';
    } else {
        return '';
    }
    return '<div style="margin:0 0 6px;"><span style="display:inline-block;padding:3px 8px;background:' . HOET_GREEN . ';color:#ffffff;font-size:11px;font-weight:700;letter-spacing:0.06em;line-height:1.4;">' . hoet_esc($label) . '</span></div>';
}

/**
 * 規格文字（尺寸｜顏色）。後台作業欄位一律不顯示；
 * 隨機色贈品以「顏色隨機出貨」取代實際分配顏色（$mask_random_color=false 僅供內部比對品名）。
 */
function hoet_item_options(WC_Order_Item_Product $item, bool $mask_random_color = true): string
{
    $hide_labels = [
        '活動類型' => true,
        '成交單價' => true,
        '出貨 SKU' => true,
        '出貨SKU'  => true,
        '出貨備註' => true,
        '出貨代碼' => true,
        'SKU'      => true,
        '貨號'     => true,
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
    if ($mask_random_color && hoet_item_promo_kind($item) === 'gift' && hoet_item_promo_is_random($item)) {
        $color = '顏色隨機出貨';
    }
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

/** 折扣列標籤規則需與官網會員中心訂單明細（account/page.jsx）一致 */
function hoet_discount_rows(WC_Order $order): array
{
    $rows = [];
    foreach ($order->get_items('fee') as $fee) {
        $total = (float) $fee->get_total();
        if ($total >= 0) {
            continue;
        }
        $name = trim((string) $fee->get_name());
        if ($name === '') {
            $name = '折扣';
        }
        if (preg_match('/折扣碼\s+(.+)$/iu', $name, $m)) {
            $label = '折扣（' . trim($m[1]) . '）';
        } elseif (strpos($name, '折扣') === 0) {
            $label = $name;
        } else {
            $label = '折扣（' . $name . '）';
        }
        $rows[] = ['label' => $label, 'amount' => abs($total)];
    }
    $discount = (float) $order->get_discount_total();
    if ($discount > 0) {
        $codes = array_values(array_filter(array_map('trim', $order->get_coupon_codes())));
        $label = $codes ? ('折扣（' . implode('、', $codes) . '）') : '折扣';
        $rows[] = ['label' => $label, 'amount' => $discount];
    }
    return $rows;
}

function hoet_shipping_total(WC_Order $order): float
{
    return (float) $order->get_shipping_total();
}

/** 原始運費（免運單也顯示原價），讀「HOVER 運費」設定 */
function hoet_base_shipping_fee(WC_Order $order): float
{
    $settings = function_exists('hhss_get_settings')
        ? hhss_get_settings()
        : ['homeDeliveryFee' => 105, 'cvsFee' => 85];
    $is_cvs = hoet_is_cvs($order)
        || preg_match('/超商|cvs|711|7-?11|全家|萊爾富|ok/iu', hoet_ship_method_label($order));
    if ($is_cvs) {
        return (float) ($settings['cvsFee'] ?: 85);
    }
    return (float) ($settings['homeDeliveryFee'] ?: 105);
}

function hoet_products_html(WC_Order $order, bool $simple = false): string
{
    $html = '';
    foreach ($order->get_items() as $item) {
        if (!$item instanceof WC_Order_Item_Product) {
            continue;
        }
        $name = hoet_item_title($item);
        $qty = (int) $item->get_quantity();
        $line = (float) $item->get_total();
        $unit = $qty > 0 ? $line / $qty : $line;
        $img = hoet_item_image_url($item);
        $opts = hoet_item_options($item);
        $badge = hoet_item_promo_badge($item);
        $kind = hoet_item_promo_kind($item);

        $price_label = '';
        if ($kind === 'gift') {
            $price_label = '贈品 ';
            $unit = 0;
            $line = 0;
        }

        $img_html = $img
            ? '<img src="' . esc_url($img) . '" alt="" width="72" height="96" style="display:block;width:72px;height:96px;object-fit:cover;border:0;" />'
            : '<div style="width:72px;height:96px;background:#f0f0f0;"></div>';

        $price_html = $simple
            ? hoet_esc($price_label . '×' . $qty . '　' . hoet_money($line))
            : hoet_esc($price_label . '×' . $qty . '　' . hoet_money($unit));

        $html .= '
        <tr>
          <td style="padding:12px 0;border-bottom:1px solid #eee;vertical-align:top;width:80px;">' . $img_html . '</td>
          <td style="padding:12px 0 12px 12px;border-bottom:1px solid #eee;vertical-align:top;font-size:14px;line-height:1.6;color:#111;">
            ' . $badge . '
            <div style="font-weight:600;">' . hoet_esc($name) . '</div>
            ' . ($opts !== '' ? '<div style="margin-top:4px;color:#555;">' . hoet_esc($opts) . '</div>' : '') . '
            <div style="margin-top:4px;color:#555;">' . $price_html . '</div>
          </td>
        </tr>';
    }
    return $html;
}

/**
 * 金額明細：商品總金額 → 折扣 → 運費 → 免運優惠 → 訂單總額
 * 與官網 OrderSummaryRows／buildOrderDetailSummary 相同規則
 */
function hoet_totals_html(WC_Order $order): string
{
    $subtotal = (float) $order->get_subtotal();
    $charged_shipping = max(0, hoet_shipping_total($order));
    $total = (float) $order->get_total();

    $shipping_fee = 0.0;
    if ($subtotal > 0) {
        $shipping_fee = $charged_shipping > 0 ? $charged_shipping : hoet_base_shipping_fee($order);
    }
    $free_ship = ($subtotal > 0 && $shipping_fee > 0 && $charged_shipping <= 0) ? $shipping_fee : 0;

    $rows = hoet_amount_row('商品總金額', hoet_money($subtotal));
    foreach (hoet_discount_rows($order) as $d) {
        $rows .= hoet_amount_row($d['label'], hoet_money(-$d['amount']), '#c90000');
    }
    $rows .= hoet_amount_row('運費', hoet_money($shipping_fee));
    if ($free_ship > 0) {
        $rows .= hoet_amount_row('免運優惠', hoet_money(-$free_ship), HOET_GREEN);
    }

    return '
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
      <tr><td align="right" style="padding-top:16px;">
        <table role="presentation" align="right" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;max-width:360px;">
          ' . $rows . '
          <tr><td colspan="2" style="padding:8px 0 0;"><div style="border-top:1px solid #e8e8e8;font-size:0;line-height:0;">&nbsp;</div></td></tr>
          <tr>
            <td style="padding:14px 12px;background:#edf4f3;font-size:15px;font-weight:700;color:#111;">訂單總額</td>
            <td style="padding:14px 12px;background:#edf4f3;font-size:18px;font-weight:700;color:#111;text-align:right;white-space:nowrap;">' . hoet_esc(hoet_money($total)) . '</td>
          </tr>
        </table>
      </td></tr>
    </table>';
}

function hoet_amount_row(string $label, string $value, string $value_color = '#111'): string
{
    return '<tr>
      <td style="padding:5px 12px;font-size:13px;color:#333;">' . hoet_esc($label) . '</td>
      <td style="padding:5px 12px;font-size:13px;color:' . esc_attr($value_color) . ';text-align:right;white-space:nowrap;">' . hoet_esc($value) . '</td>
    </tr>';
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
    <div style="margin-top:36px;padding-top:20px;border-top:1px solid #ddd;font-size:12px;line-height:1.8;color:#777;text-align:center;">
      <p style="margin:0;text-align:center;">此為系統自動發送信件，請勿直接回覆。</p>
      <p style="margin:8px 0 0;text-align:center;">
        HOVER 官方網站｜<a href="' . esc_url(HOET_SITE_URL) . '" style="color:' . HOET_GREEN . ';text-decoration:underline;">hoverofficial.com</a><br />
        客服聯繫｜<a href="' . esc_url(HOET_LINE_URL) . '" style="color:' . HOET_GREEN . ';text-decoration:underline;">HOVER 官方 LINE</a>
      </p>
    </div>';
}

/**
 * 移除信件常見服務套語；頁尾「HOVER 官方 LINE」補上可點擊連結（@330kefmm）
 */
function hoet_strip_service_phrase(string $html): string
{
    $html = (string) preg_replace('/我們將盡全力為[您你]服務。?/u', '', $html);
    $html = (string) preg_replace('/<p[^>]*>\s*<\/p>/iu', '', $html);
    return $html;
}

function hoet_ensure_line_footer_link(string $html): string
{
    // 已是連結則略過
    if (preg_match('/<a[^>]*>\s*HOVER\s*官方\s*LINE\s*<\/a>/iu', $html)) {
        return $html;
    }
    $link = '<a href="' . esc_url(HOET_LINE_URL) . '" style="color:' . HOET_GREEN . ';text-decoration:underline;">HOVER 官方 LINE</a>';
    // 純文字「HOVER 官方 LINE」
    $html = (string) preg_replace('/HOVER\s*官方\s*LINE/u', $link, $html, 1);
    return $html;
}

add_filter('woocommerce_email_additional_content', function ($content, $email = null) {
    $content = hoet_strip_service_phrase((string) $content);
    return trim($content);
}, 20, 2);

add_filter('woocommerce_email_footer_text', function ($text) {
    $text = hoet_strip_service_phrase((string) $text);
    $text = hoet_ensure_line_footer_link($text);
    // 若頁尾完全沒有 LINE，補上標準列
    if (stripos($text, '官方 LINE') === false && stripos($text, 'line.me') === false) {
        $text .= '<br />客服聯繫｜<a href="' . esc_url(HOET_LINE_URL) . '" style="color:' . HOET_GREEN . ';text-decoration:underline;">HOVER 官方 LINE</a>';
    }
    return $text;
}, 20);

add_filter('woocommerce_mail_content', function ($content) {
    $content = hoet_strip_service_phrase((string) $content);
    $content = hoet_ensure_line_footer_link($content);
    return $content;
}, 50);

function hoet_shell(string $inner): string
{
    return '<!DOCTYPE html><html lang="zh-Hant"><head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /></head>
<body style="margin:0;padding:0;background:#f6f6f6;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f6f6f6;padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#ffffff;padding:32px 28px;font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,Helvetica,Arial,sans-serif;color:#111;">
        <tr><td>
          ' . hoet_header_html() . '
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

/** 金額明細緊接商品資訊下方（同會員中心訂單明細，不另設標題） */
function hoet_amount_block(WC_Order $order): string
{
    return hoet_totals_html($order);
}

/* -------------------------------------------------------------------------- */
/* Templates                                                                   */
/* -------------------------------------------------------------------------- */

function hoet_render_email(string $email_id, WC_Order $order): string
{
    switch ($email_id) {
        case 'new_order':
        case 'customer_note':
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

/**
 * 是否為「ATM 逾期未付款、系統自動取消」。
 * 標記來源：hover-atm-expire-cancel.php 寫入 _hover_atm_auto_cancelled／_hover_cancelled_by=atm_expire_cron；
 * 會員取消寫 customer、後台取消寫 admin。
 */
function hoet_is_atm_expire_cancel(WC_Order $order): bool
{
    if ((string) $order->get_meta('_hover_atm_auto_cancelled', true) === '1') {
        return true;
    }
    $by = trim((string) $order->get_meta('_hover_cancelled_by', true));
    if ($by === 'atm_expire_cron') {
        return true;
    }
    if ($by !== '' || $order->get_date_paid() || !hoet_is_atm_order($order)) {
        return false;
    }
    // 無取消者標記（例如 WooCommerce 內建逾時取消）：ATM 未付款且已過繳費期限才視為逾期
    if (function_exists('hover_atm_expire_parse_timestamp')) {
        $ts = hover_atm_expire_parse_timestamp($order);
    } else {
        $raw = hoet_meta($order, ['_ExpireDate', 'ExpireDate', '_ecpay_atm_expire_date']);
        $ts = $raw !== '' ? (int) strtotime(str_replace('/', '-', $raw)) : 0;
    }
    return $ts > 0 && $ts <= time();
}

/** 6｜訂單取消（會員／客服取消 vs. ATM 逾期系統取消） */
function hoet_tpl_cancelled(WC_Order $order): string
{
    $name = hoet_customer_name($order);

    if (hoet_is_atm_expire_cancel($order)) {
        $lead = '因超過付款期限仍未完成付款，您的訂單已由系統自動取消。';
        $reason = '超過付款期限未付款';
    } else {
        $lead = '您的訂單已取消。';
        $reason = '會員取消訂單';
    }

    $inner = '
      <p style="margin:0 0 12px;font-size:15px;line-height:1.8;">親愛的' . hoet_esc($name) . '，</p>
      <p style="margin:0 0 8px;font-size:14px;line-height:1.8;color:#333;">' . hoet_esc($lead) . '</p>
      ' . hoet_order_info_block($order, [
          ['付款方式', hoet_payment_label($order)],
          ['取消原因', $reason],
      ]) . '
      ' . hoet_products_block($order, true) . '
      <table width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;margin-top:8px;">
        ' . hoet_kv_row('訂單總金額', hoet_money($order->get_total()), true) . '
      </table>
      <p style="margin:20px 0 0;font-size:14px;line-height:1.8;color:#333;">如仍有購買需求，歡迎重新下單。</p>
      ' . hoet_link_btn('重新選購', HOET_SITE_URL) . '
    ';

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

/* -------------------------------------------------------------------------- */
/* 8｜已到貨通知（綠界貨態 arrived）                                            */
/* -------------------------------------------------------------------------- */

/** 到店時間（綠界 UpdateStatusDate；無則空） */
function hoet_store_arrived_date(WC_Order $order): string
{
    $raw = trim((string) $order->get_meta('_hover_store_arrived_at', true));
    if ($raw === '') {
        return '';
    }
    $ts = strtotime(str_replace('/', '-', $raw));
    return $ts ? wp_date('Y/m/d H:i', $ts) : $raw;
}

/** 超商取貨參考期限：到店日 + 7 日 */
function hoet_pickup_deadline(WC_Order $order): string
{
    $raw = trim((string) $order->get_meta('_hover_store_arrived_at', true));
    $ts = $raw !== '' ? strtotime(str_replace('/', '-', $raw)) : 0;
    if (!$ts) {
        return '送達門市後 7 日內';
    }
    return wp_date('Y/m/d', $ts + 7 * DAY_IN_SECONDS) . ' 前';
}

function hoet_tpl_arrived(WC_Order $order): string
{
    $name = hoet_customer_name($order);
    $arrived = hoet_store_arrived_date($order);
    $extra = [];
    if ($arrived !== '') {
        $extra[] = ['到店時間', $arrived];
    }
    if (hoet_is_cvs($order)) {
        $extra[] = ['取貨期限', hoet_pickup_deadline($order)];
    }

    $lead = hoet_is_cvs($order)
        ? '您訂購的商品已經送達超商門市，請於期限內完成取貨。'
        : '您訂購的商品已送達，請留意配送／取貨通知。';

    $hint = hoet_is_cvs($order)
        ? '請攜帶取貨代碼於期限內至門市取貨。逾期未取，貨件將依物流規定退回。'
        : '若為宅配，請依物流通知完成收件。';

    $inner = '
      <h1 style="margin:0 0 16px;font-size:20px;font-weight:700;color:#111;text-align:center;">商品取貨通知</h1>
      <p style="margin:0 0 12px;font-size:15px;line-height:1.8;">親愛的' . hoet_esc($name) . '，</p>
      <p style="margin:0 0 8px;font-size:14px;line-height:1.8;color:#333;">' . hoet_esc($lead) . '</p>
      ' . hoet_order_info_block($order, $extra) . '
      ' . hoet_products_block($order, true) . '
      ' . hoet_shipping_block($order, true) . '
      <p style="margin:20px 0 0;font-size:13px;line-height:1.8;color:#555;">' . hoet_esc($hint) . '</p>
      ' . hoet_link_btn('查看訂單', HOET_ACCOUNT_ORDERS_URL) . '
    ';
    return hoet_shell($inner);
}

/**
 * 綠界貨態通知共用寄送（同一類型只寄一次）
 *
 * @param callable(WC_Order):string $tpl
 */
function hoet_send_logistics_notice(
    WC_Order $order,
    string $sent_meta,
    string $sent_at_meta,
    string $subject,
    callable $tpl,
    string $note_label
): bool {
    if ((string) $order->get_meta($sent_meta) === '1') {
        return false;
    }

    $to = sanitize_email((string) $order->get_billing_email());
    if ($to === '' || !is_email($to)) {
        $order->add_order_note('HOVER：' . $note_label . '未寄出（無有效信箱）');
        $order->save();
        return false;
    }

    if (!function_exists('WC') || !WC()->mailer()) {
        return false;
    }

    $html = $tpl($order);
    $headers = ['Content-Type: text/html; charset=UTF-8'];

    $sent = WC()->mailer()->send($to, $subject, $html, $headers);
    if (!$sent) {
        if (defined('WP_DEBUG') && WP_DEBUG) {
            error_log('[HOVER] ' . $note_label . ' failed for order ' . $order->get_id());
        }
        return false;
    }

    $order->update_meta_data($sent_meta, '1');
    $order->update_meta_data($sent_at_meta, wp_date('Y-m-d H:i:s'));
    $order->add_order_note('HOVER：已寄出' . $note_label . '（' . $to . '）');
    $order->save();
    return true;
}

/** 綠界貨態進入 arrived 時寄出（同一訂單只寄一次） */
function hoet_send_arrived_notice(WC_Order $order): bool
{
    return hoet_send_logistics_notice(
        $order,
        '_hover_arrived_notice_sent',
        '_hover_arrived_notice_sent_at',
        '商品取貨通知',
        'hoet_tpl_arrived',
        '到貨通知信'
    );
}

/* -------------------------------------------------------------------------- */
/* 9｜已取貨／已簽收通知（綠界貨態 picked）                                       */
/* -------------------------------------------------------------------------- */

function hoet_picked_date(WC_Order $order): string
{
    $raw = trim((string) $order->get_meta('_hover_arrived_at', true));
    if ($raw === '') {
        return '';
    }
    $ts = strtotime(str_replace('/', '-', $raw));
    return $ts ? wp_date('Y/m/d H:i', $ts) : $raw;
}

function hoet_tpl_picked(WC_Order $order): string
{
    $name = hoet_customer_name($order);
    $picked = hoet_picked_date($order);
    $extra = [];
    if ($picked !== '') {
        $extra[] = [
            hoet_is_cvs($order) ? '取貨時間' : '簽收時間',
            $picked,
        ];
    }

    $lead = hoet_is_cvs($order)
        ? '您已於超商完成取貨。7 日鑑賞期自取貨日起算；若需退換，請於期限內透過官方客服聯繫。'
        : '您的商品已配達簽收。7 日鑑賞期自簽收日起算；若需退換，請於期限內透過官方客服聯繫。';

    $hint = '本通知僅供確認取件／簽收狀態。退換貨規範請見官網說明，並請保留商品完整包裝。';

    $inner = '
      <h1 style="margin:0 0 16px;font-size:20px;font-weight:700;color:#111;text-align:center;">商品已取貨通知</h1>
      <p style="margin:0 0 12px;font-size:15px;line-height:1.8;">親愛的' . hoet_esc($name) . '，</p>
      <p style="margin:0 0 8px;font-size:14px;line-height:1.8;color:#333;">' . hoet_esc($lead) . '</p>
      ' . hoet_order_info_block($order, $extra) . '
      ' . hoet_products_block($order, true) . '
      ' . hoet_shipping_block($order, true) . '
      <p style="margin:20px 0 0;font-size:13px;line-height:1.8;color:#555;">' . hoet_esc($hint) . '</p>
      ' . hoet_link_btn('查看訂單', HOET_ACCOUNT_ORDERS_URL) . '
    ';
    return hoet_shell($inner);
}

function hoet_send_picked_notice(WC_Order $order): bool
{
    return hoet_send_logistics_notice(
        $order,
        '_hover_picked_notice_sent',
        '_hover_picked_notice_sent_at',
        '商品已取貨通知',
        'hoet_tpl_picked',
        '已取貨通知信'
    );
}

/* -------------------------------------------------------------------------- */
/* 10｜逾期未取通知（綠界貨態 unclaimed）                                        */
/* -------------------------------------------------------------------------- */

function hoet_unclaimed_date(WC_Order $order): string
{
    $raw = trim((string) $order->get_meta('_hover_unclaimed_at', true));
    if ($raw === '') {
        return '';
    }
    $ts = strtotime(str_replace('/', '-', $raw));
    return $ts ? wp_date('Y/m/d H:i', $ts) : $raw;
}

function hoet_tpl_unclaimed(WC_Order $order): string
{
    $name = hoet_customer_name($order);
    $when = hoet_unclaimed_date($order);
    $arrived = hoet_store_arrived_date($order);
    $extra = [];
    if ($arrived !== '') {
        $extra[] = ['到店時間', $arrived];
    }
    if ($when !== '') {
        $extra[] = ['逾期時間', $when];
    }

    $lead = hoet_is_cvs($order)
        ? '您訂購的商品因逾期未取，已依物流規定辦理退回。客服將視情況與您聯繫後續處理方式。'
        : '您訂購的商品配送異常／未能完成收件，已依物流規定後續處理。客服將視情況與您聯繫。';

    $hint = '若您對本通知有疑問，或希望重新安排配送，請透過官方客服與我們聯繫。';

    $inner = '
      <h1 style="margin:0 0 16px;font-size:20px;font-weight:700;color:#111;text-align:center;">商品逾期未取通知</h1>
      <p style="margin:0 0 12px;font-size:15px;line-height:1.8;">親愛的' . hoet_esc($name) . '，</p>
      <p style="margin:0 0 8px;font-size:14px;line-height:1.8;color:#333;">' . hoet_esc($lead) . '</p>
      ' . hoet_order_info_block($order, $extra) . '
      ' . hoet_products_block($order, true) . '
      ' . hoet_shipping_block($order, true) . '
      <p style="margin:20px 0 0;font-size:13px;line-height:1.8;color:#555;">' . hoet_esc($hint) . '</p>
      ' . hoet_link_btn('查看訂單', HOET_ACCOUNT_ORDERS_URL) . '
    ';
    return hoet_shell($inner);
}

function hoet_send_unclaimed_notice(WC_Order $order): bool
{
    return hoet_send_logistics_notice(
        $order,
        '_hover_unclaimed_notice_sent',
        '_hover_unclaimed_notice_sent_at',
        '商品逾期未取通知',
        'hoet_tpl_unclaimed',
        '逾期未取通知信'
    );
}

/* -------------------------------------------------------------------------- */
/* 11｜退貨處理中通知（客服標記 returning）                                       */
/* -------------------------------------------------------------------------- */

function hoet_returning_date(WC_Order $order): string
{
    $raw = trim((string) $order->get_meta('_hover_returning_at', true));
    if ($raw === '') {
        return '';
    }
    $ts = strtotime(str_replace('/', '-', $raw));
    return $ts ? wp_date('Y/m/d H:i', $ts) : $raw;
}

function hoet_tpl_returning(WC_Order $order): string
{
    $name = hoet_customer_name($order);
    $when = hoet_returning_date($order);
    $extra = [
        ['訂單狀態', '退貨處理中'],
    ];
    if ($when !== '') {
        $extra[] = ['受理時間', $when];
    }

    $lead = '我們已受理您的退貨申請，目前訂單狀態為「退貨處理中」。客服將依退貨規範協助後續寄回與退款流程。';
    $hint = '請依客服指示完成退貨寄送；若有商品狀態或運費問題，歡迎透過官方 LINE 與我們聯繫。';

    $inner = '
      <h1 style="margin:0 0 16px;font-size:20px;font-weight:700;color:#111;text-align:center;">退貨處理中通知</h1>
      <p style="margin:0 0 12px;font-size:15px;line-height:1.8;">親愛的' . hoet_esc($name) . '，</p>
      <p style="margin:0 0 8px;font-size:14px;line-height:1.8;color:#333;">' . hoet_esc($lead) . '</p>
      ' . hoet_order_info_block($order, $extra) . '
      ' . hoet_products_block($order, true) . '
      ' . hoet_shipping_block($order, true) . '
      <p style="margin:20px 0 0;font-size:13px;line-height:1.8;color:#555;">' . hoet_esc($hint) . '</p>
      <p style="margin:12px 0 0;font-size:13px;line-height:1.8;color:#555;">客服聯繫｜<a href="' . esc_url(HOET_LINE_URL) . '" style="color:' . HOET_GREEN . ';text-decoration:underline;">HOVER 官方 LINE</a></p>
      ' . hoet_link_btn('查看訂單', HOET_ACCOUNT_ORDERS_URL) . '
    ';
    return hoet_shell($inner);
}

function hoet_send_returning_notice(WC_Order $order): bool
{
    return hoet_send_logistics_notice(
        $order,
        '_hover_returning_notice_sent',
        '_hover_returning_notice_sent_at',
        '退貨處理中通知',
        'hoet_tpl_returning',
        '退貨處理中通知信'
    );
}

/* -------------------------------------------------------------------------- */
/* 12｜退貨完成通知（客服標記 returned）                                          */
/* -------------------------------------------------------------------------- */

function hoet_returned_date(WC_Order $order): string
{
    $raw = trim((string) $order->get_meta('_hover_returned_at', true));
    if ($raw === '') {
        return '';
    }
    $ts = strtotime(str_replace('/', '-', $raw));
    return $ts ? wp_date('Y/m/d H:i', $ts) : $raw;
}

function hoet_tpl_returned(WC_Order $order): string
{
    $name = hoet_customer_name($order);
    $when = hoet_returned_date($order);
    $extra = [
        ['訂單狀態', '退貨完成'],
    ];
    if ($when !== '') {
        $extra[] = ['完成時間', $when];
    }

    $lead = '您的退貨申請已處理完成，訂單狀態更新為「退貨完成」。退款將依付款方式與實際作業時程入帳，若有疑問歡迎聯繫客服。';
    $hint = '退款入帳時間依銀行／信用卡／LINE Pay 等管道而異，通常約 3–14 個工作天。';

    $inner = '
      <h1 style="margin:0 0 16px;font-size:20px;font-weight:700;color:#111;text-align:center;">退貨完成通知</h1>
      <p style="margin:0 0 12px;font-size:15px;line-height:1.8;">親愛的' . hoet_esc($name) . '，</p>
      <p style="margin:0 0 8px;font-size:14px;line-height:1.8;color:#333;">' . hoet_esc($lead) . '</p>
      ' . hoet_order_info_block($order, $extra) . '
      ' . hoet_products_block($order, true) . '
      ' . hoet_shipping_block($order, true) . '
      <p style="margin:20px 0 0;font-size:13px;line-height:1.8;color:#555;">' . hoet_esc($hint) . '</p>
      <p style="margin:12px 0 0;font-size:13px;line-height:1.8;color:#555;">客服聯繫｜<a href="' . esc_url(HOET_LINE_URL) . '" style="color:' . HOET_GREEN . ';text-decoration:underline;">HOVER 官方 LINE</a></p>
      ' . hoet_link_btn('查看訂單', HOET_ACCOUNT_ORDERS_URL) . '
    ';
    return hoet_shell($inner);
}

function hoet_send_returned_notice(WC_Order $order): bool
{
    return hoet_send_logistics_notice(
        $order,
        '_hover_returned_notice_sent',
        '_hover_returned_notice_sent_at',
        '退貨完成通知',
        'hoet_tpl_returned',
        '退貨完成通知信'
    );
}