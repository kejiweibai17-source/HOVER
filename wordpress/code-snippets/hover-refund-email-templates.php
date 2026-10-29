<?php
/**
 * HOVER — 退款完成信件（四種組合）
 *
 * 情境軸：
 *   A. 已付款尚未出貨（pre_ship）— 商品未寄出，無須會員寄回
 *   B. 已付款已取貨（received）  — 依退貨範圍說明寄回與退款計算
 * 範圍軸：
 *   1. 全部退款（full）
 *   2. 部分退款（partial）
 *
 * 規則摘要：
 *   全部：退款＝商品實付＋原訂單已收運費（未收運費則無運費退款）；寄回運費品牌吸收
 *   部分：僅退該退貨商品實付；原運費不退、不追收免運差額；寄回運費品牌吸收
 *   部分＋活動：未達滿額贈門檻須退贈品；加價購可退或保留（保留則扣回原價差額）
 *
 * 覆寫 WC「已退款訂單」／部分退款（customer_refunded_order /
 * customer_partially_refunded_order）。
 *
 * 強制情境（選用）：訂單 meta `_hover_refund_fulfillment`
 *   = pre_ship | received（客服可覆寫自動判斷）
 *
 * Code Snippets → Everywhere → 啟用
 * （建議與 hover-order-email-templates.php 一併啟用，以共用標誌／金額格式）
 */

if (!defined('ABSPATH')) {
    exit;
}

if (defined('HOVER_REFUND_EMAIL_TEMPLATES_LOADED')) {
    return;
}
define('HOVER_REFUND_EMAIL_TEMPLATES_LOADED', true);

const HRET_GREEN = '#2a514d';
const HRET_SITE_URL = 'https://hoverofficial.com';
const HRET_ACCOUNT_ORDERS_URL = 'https://hoverofficial.com/account?tab=orders';
const HRET_LINE_URL = 'https://line.me/R/ti/p/@330kefmm';
const HRET_META_FULFILLMENT = '_hover_refund_fulfillment';

/* -------------------------------------------------------------------------- */
/* Soft wrappers — 優先沿用 hoet_*                                            */
/* -------------------------------------------------------------------------- */

function hret_esc($s): string
{
    return function_exists('hoet_esc') ? hoet_esc($s) : esc_html((string) $s);
}

function hret_money($amount): string
{
    if (function_exists('hoet_money')) {
        return hoet_money($amount);
    }
    $n = (int) round((float) $amount);
    $body = 'NT.' . number_format(abs($n), 0, '.', ',');
    return $n < 0 ? '-' . $body : $body;
}

function hret_customer_name(WC_Order $order): string
{
    if (function_exists('hoet_customer_name')) {
        return hoet_customer_name($order);
    }
    $name = trim($order->get_formatted_billing_full_name());
    return $name !== '' ? $name : '顧客';
}

function hret_payment_label(WC_Order $order): string
{
    if (function_exists('hoet_payment_label')) {
        return hoet_payment_label($order);
    }
    $t = trim((string) $order->get_payment_method_title());
    return $t !== '' ? $t : '線上付款';
}

function hret_shell(string $inner): string
{
    if (function_exists('hoet_shell')) {
        return hoet_shell($inner);
    }
    $logo = HRET_SITE_URL . '/images/logo-04.png';
    return '<!DOCTYPE html><html lang="zh-Hant"><head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /></head>
<body style="margin:0;padding:0;background:#f6f6f6;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f6f6f6;padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#ffffff;padding:32px 28px;font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,Helvetica,Arial,sans-serif;color:#111;">
        <tr><td>
          <div style="margin:0 0 28px;text-align:center;"><a href="' . esc_url(HRET_SITE_URL) . '"><img src="' . esc_url($logo) . '" alt="HOVER" width="180" style="display:block;margin:0 auto;width:180px;max-width:70%;height:auto;border:0;" /></a></div>
          ' . $inner . '
          <div style="margin-top:36px;padding-top:20px;border-top:1px solid #ddd;font-size:12px;line-height:1.8;color:#777;text-align:center;">
            <p style="margin:0;">此為系統自動發送信件，請勿直接回覆。</p>
            <p style="margin:8px 0 0;">HOVER 官方網站｜<a href="' . esc_url(HRET_SITE_URL) . '" style="color:' . HRET_GREEN . ';">hoverofficial.com</a><br />客服聯繫｜<a href="' . esc_url(HRET_LINE_URL) . '" style="color:' . HRET_GREEN . ';">HOVER 官方 LINE</a></p>
          </div>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>';
}

function hret_section_title(string $title): string
{
    if (function_exists('hoet_section_title')) {
        return hoet_section_title($title);
    }
    return '<h2 style="margin:28px 0 12px;font-size:15px;letter-spacing:0.08em;color:' . HRET_GREEN . ';font-weight:700;">' . hret_esc($title) . '</h2>';
}

function hret_kv_row(string $label, string $value, bool $bold = false, string $value_color = '#111'): string
{
    $weight = $bold ? '700' : '400';
    return '<tr>
      <td style="padding:6px 0;font-size:14px;color:#333;font-weight:' . $weight . ';">' . hret_esc($label) . '</td>
      <td style="padding:6px 0;font-size:14px;color:' . esc_attr($value_color) . ';text-align:right;font-weight:' . $weight . ';">' . hret_esc($value) . '</td>
    </tr>';
}

function hret_amount_row(string $label, string $value, string $value_color = '#111'): string
{
    if (function_exists('hoet_amount_row')) {
        return hoet_amount_row($label, $value, $value_color);
    }
    return '<tr>
      <td style="padding:5px 12px;font-size:13px;color:#333;">' . hret_esc($label) . '</td>
      <td style="padding:5px 12px;font-size:13px;color:' . esc_attr($value_color) . ';text-align:right;white-space:nowrap;">' . hret_esc($value) . '</td>
    </tr>';
}

function hret_link_btn(string $label, string $url): string
{
    if (function_exists('hoet_link_btn')) {
        return hoet_link_btn($label, $url);
    }
    return '<p style="margin:24px 0 0;"><a href="' . esc_url($url) . '" style="color:' . HRET_GREEN . ';font-weight:700;text-decoration:underline;font-size:14px;">' . hret_esc($label) . '</a></p>';
}

function hret_checkmark_html(): string
{
    return '
    <div style="margin:8px 0 16px;text-align:center;">
      <div style="display:inline-block;width:56px;height:56px;border-radius:50%;background:' . HRET_GREEN . ';line-height:56px;text-align:center;">
        <span style="color:#fff;font-size:28px;font-weight:700;">✓</span>
      </div>
    </div>';
}

/* -------------------------------------------------------------------------- */
/* Context detection                                                           */
/* -------------------------------------------------------------------------- */

/**
 * @return 'pre_ship'|'received'
 */
function hret_fulfillment_context(WC_Order $order): string
{
    $forced = strtolower(trim((string) $order->get_meta(HRET_META_FULFILLMENT, true)));
    if ($forced === 'pre_ship' || $forced === 'received') {
        return $forced;
    }

    $phase = strtolower(trim((string) $order->get_meta('_hel_LogisticsPhase', true)));
    if ($phase === '') {
        $phase = strtolower(trim((string) $order->get_meta('hel_LogisticsPhase', true)));
    }
    if (in_array($phase, ['arrived', 'picked', 'returning', 'returned', 'unclaimed'], true)) {
        return 'received';
    }

    $ret = strtolower(trim((string) $order->get_meta('_hover_return_status', true)));
    if (in_array($ret, ['returning', 'processing', 'returned', 'complete', 'completed'], true)) {
        return 'received';
    }

    // 已出貨／已完成但尚無取貨／退貨標記 → 視為尚未由會員收受（取消出貨／未取）
    return 'pre_ship';
}

function hret_is_partial_email($email): bool
{
    if (!is_object($email)) {
        return false;
    }
    if (!empty($email->partial_refund)) {
        return true;
    }
    $id = isset($email->id) ? (string) $email->id : '';
    return $id === 'customer_partially_refunded_order';
}

function hret_latest_refund(WC_Order $order, $email = null)
{
    if (is_object($email) && !empty($email->refund) && $email->refund instanceof WC_Order_Refund) {
        return $email->refund;
    }
    $refunds = $order->get_refunds();
    if (!$refunds) {
        return null;
    }
    return $refunds[0];
}

function hret_refund_amount(WC_Order_Refund $refund): float
{
    return abs((float) $refund->get_amount());
}

function hret_refund_date(WC_Order_Refund $refund): string
{
    $d = $refund->get_date_created();
    if (!$d) {
        return wp_date('Y/m/d');
    }
    return $d->date_i18n('Y/m/d');
}

function hret_original_item(WC_Order $order, WC_Order_Item $refund_item): ?WC_Order_Item_Product
{
    $rid = (int) $refund_item->get_meta('_refunded_item_id', true);
    if ($rid > 0) {
        $item = $order->get_item($rid);
        if ($item instanceof WC_Order_Item_Product) {
            return $item;
        }
    }
    return null;
}

function hret_item_image_from_product_item(WC_Order_Item_Product $item): string
{
    if (function_exists('hoet_item_image_url')) {
        return hoet_item_image_url($item);
    }
    $product = $item->get_product();
    if (!$product) {
        return '';
    }
    $id = $product->get_image_id();
    if (!$id && $product->get_parent_id()) {
        $parent = wc_get_product($product->get_parent_id());
        $id = $parent ? $parent->get_image_id() : 0;
    }
    if (!$id) {
        return '';
    }
    $src = wp_get_attachment_image_src((int) $id, 'woocommerce_thumbnail');
    return is_array($src) && !empty($src[0]) ? (string) $src[0] : '';
}

function hret_item_title_from_product_item(WC_Order_Item_Product $item): string
{
    if (function_exists('hoet_item_title')) {
        return hoet_item_title($item);
    }
    return trim((string) $item->get_name());
}

function hret_item_opts_from_product_item(WC_Order_Item_Product $item): string
{
    if (function_exists('hoet_item_options')) {
        return hoet_item_options($item);
    }
    return '';
}

function hret_item_badge_from_product_item(WC_Order_Item_Product $item): string
{
    if (function_exists('hoet_item_promo_badge')) {
        return hoet_item_promo_badge($item);
    }
    return '';
}

/**
 * 退款商品列（優先對應原訂單品項以顯示圖／規格）
 */
function hret_refund_products_html(WC_Order $order, WC_Order_Refund $refund): string
{
    $html = '';
    $has_item = false;

    foreach ($refund->get_items() as $r_item) {
        if (!$r_item instanceof WC_Order_Item_Product) {
            continue;
        }
        $has_item = true;
        $orig = hret_original_item($order, $r_item);
        $name = $orig ? hret_item_title_from_product_item($orig) : trim((string) $r_item->get_name());
        $opts = $orig ? hret_item_opts_from_product_item($orig) : '';
        $badge = $orig ? hret_item_badge_from_product_item($orig) : '';
        $img = $orig ? hret_item_image_from_product_item($orig) : '';
        $qty = abs((int) $r_item->get_quantity());
        if ($qty < 1) {
            $qty = 1;
        }
        $line = abs((float) $r_item->get_total());

        $img_html = $img
            ? '<img src="' . esc_url($img) . '" alt="" width="72" height="96" style="display:block;width:72px;height:96px;object-fit:cover;border:0;" />'
            : '<div style="width:72px;height:96px;background:#f0f0f0;"></div>';

        $html .= '
        <tr>
          <td style="padding:12px 0;border-bottom:1px solid #eee;vertical-align:top;width:80px;">' . $img_html . '</td>
          <td style="padding:12px 0 12px 12px;border-bottom:1px solid #eee;vertical-align:top;font-size:14px;line-height:1.6;color:#111;">
            ' . $badge . '
            <div style="font-weight:600;">' . hret_esc($name) . '</div>
            ' . ($opts !== '' ? '<div style="margin-top:4px;color:#555;">' . hret_esc($opts) . '</div>' : '') . '
            <div style="margin-top:4px;color:#555;">×' . (int) $qty . '　' . hret_esc(hret_money($line)) . '</div>
          </td>
        </tr>';
    }

    if (!$has_item) {
        // 純金額退款（無品項）：列出訂單商品摘要
        if (function_exists('hoet_products_html')) {
            return hoet_products_html($order, true);
        }
        $html = '<tr><td style="padding:12px 0;font-size:14px;color:#555;">依訂單退款金額辦理</td></tr>';
    }

    return $html;
}

/**
 * 退款金額明細列
 *
 * @return array{rows:string,refund_total:float}
 */
function hret_refund_breakdown(WC_Order $order, WC_Order_Refund $refund, bool $partial): array
{
    $product_sum = 0.0;
    foreach ($refund->get_items() as $r_item) {
        if ($r_item instanceof WC_Order_Item_Product) {
            $product_sum += abs((float) $r_item->get_total());
        }
    }

    $ship = abs((float) $refund->get_shipping_total());
    // 部分退款原則不退運費；若後台仍寫入運費退款則如實顯示
    if ($partial && $ship > 0 && (string) $order->get_meta('_hover_refund_force_ship', true) !== '1') {
        // 仍顯示實際退款物件內容，但文案說明「原則不退」
    }

    $addon_diff = 0.0;
    $extra_fees = [];
    foreach ($refund->get_items('fee') as $fee) {
        $amt = (float) $fee->get_total(); // 退款單上 fee 通常為負＝減少退款，或正
        $name = trim((string) $fee->get_name());
        if ($name === '') {
            $name = '其他調整';
        }
        if (preg_match('/加購|價差/u', $name)) {
            $addon_diff += $amt; // 保留：負值表示自退款扣除
            continue;
        }
        $extra_fees[] = ['label' => $name, 'amount' => $amt];
    }

    $refund_total = hret_refund_amount($refund);

    $rows = '';
    if ($product_sum > 0) {
        $rows .= hret_amount_row(
            $partial ? '退貨商品實付金額' : '商品實付金額',
            hret_money($product_sum)
        );
    } elseif (!$partial) {
        // 全額但未拆品項：用訂單商品小計近似
        $rows .= hret_amount_row('商品實付金額', hret_money(max(0, (float) $order->get_total() - (float) $order->get_shipping_total())));
    }

    foreach ($extra_fees as $f) {
        $rows .= hret_amount_row($f['label'], hret_money($f['amount']), $f['amount'] < 0 ? '#c90000' : '#111');
    }

    if (abs($addon_diff) > 0.0001) {
        // 顯示為扣除（加購優惠價差）
        $rows .= hret_amount_row('加購優惠價差', hret_money($addon_diff), '#c90000');
    }

    if ($ship > 0.0001) {
        $rows .= hret_amount_row('運費', hret_money($ship));
    } elseif (!$partial && (float) $order->get_shipping_total() > 0 && $product_sum <= 0) {
        // 全額退且退款物件未拆運費時，提示原訂單運費已含於退款總額
        $rows .= hret_amount_row('運費（原訂單已收取）', hret_money((float) $order->get_shipping_total()));
    }

    $rows .= '
      <tr><td colspan="2" style="padding:8px 0 0;"><div style="border-top:1px solid #e8e8e8;font-size:0;line-height:0;">&nbsp;</div></td></tr>
      <tr>
        <td style="padding:14px 12px;background:#edf4f3;font-size:15px;font-weight:700;color:#111;">退款金額</td>
        <td style="padding:14px 12px;background:#edf4f3;font-size:18px;font-weight:700;color:' . HRET_GREEN . ';text-align:right;white-space:nowrap;">' . hret_esc(hret_money($refund_total)) . '</td>
      </tr>';

    return [
        'rows'         => $rows,
        'refund_total' => $refund_total,
        'product_sum'  => $product_sum,
        'shipping'     => $ship,
        'addon_diff'   => $addon_diff,
    ];
}

function hret_rules_html(bool $partial, string $fulfillment): string
{
    if (!$partial) {
        $lines = [
            '退款金額＝商品實付金額＋原訂單已收取的運費；若原訂單未收取運費，則無運費退款。',
            '退貨寄回運費由 HOVER 吸收。',
        ];
        if ($fulfillment === 'pre_ship') {
            array_unshift($lines, '本訂單商品尚未寄出，您無須寄回商品。');
        } else {
            array_unshift($lines, '請依客服指示將退貨商品完整寄回（含吊牌、配件與贈品，如適用）。');
        }
    } else {
        $lines = [
            '退款金額僅退還退貨商品的實際支付金額。',
            '原訂單已收取的運費不退；部分退貨後即使未達免運門檻，亦不重新追收運費。',
            '若部分退貨後未達原滿額贈活動門檻，滿額贈品須一併退回。',
            '加價購商品可選擇一併退回；若您選擇保留，則恢復原價計算，原價與加價購優惠價之差額將自退款金額中扣除。',
            '退貨寄回運費由 HOVER 吸收。',
        ];
        if ($fulfillment === 'pre_ship') {
            array_unshift($lines, '本次取消／退款商品尚未寄出，您無須寄回商品。');
        } else {
            array_unshift($lines, '請依客服指示將退貨商品（及須一併退回之贈品）完整寄回。');
        }
    }

    $lis = '';
    $i = 1;
    foreach ($lines as $line) {
        $lis .= '<li style="margin:0 0 8px;padding-left:4px;">' . hret_esc($i . '. ' . $line) . '</li>';
        $i++;
    }

    return hret_section_title('退款說明') . '
      <ol style="margin:0;padding:0 0 0 4px;list-style:none;font-size:13px;line-height:1.8;color:#555;">
        ' . $lis . '
      </ol>';
}

function hret_payout_note_html(WC_Order $order): string
{
    $method = strtolower($order->get_payment_method() . ' ' . $order->get_payment_method_title());
    if (preg_match('/atm|虛擬帳號|轉帳/', $method)) {
        $body = '退款將退回您原 ATM／轉帳帳戶，約需 3–7 個工作天（依銀行作業時間而定）。';
    } else {
        $body = '退款將退回原付款信用卡，約需 7–14 個工作天入帳（依發卡銀行作業時間而定）。';
    }
    return '<p style="margin:16px 0 0;font-size:13px;line-height:1.8;color:#555;">' . hret_esc($body) . '</p>
      <p style="margin:8px 0 0;font-size:13px;line-height:1.8;color:#555;">如有疑問，請透過 <a href="' . esc_url(HRET_LINE_URL) . '" style="color:' . HRET_GREEN . ';text-decoration:underline;">HOVER 官方 LINE</a> 聯繫客服。</p>';
}

function hret_context_badge(string $fulfillment, bool $partial): string
{
    $a = $fulfillment === 'received' ? '已付款已取貨' : '已付款尚未出貨';
    $b = $partial ? '部分退款' : '全部退款';
    return '<p style="margin:0 0 12px;text-align:center;font-size:12px;letter-spacing:0.06em;color:#888;">' . hret_esc($a . '　｜　' . $b) . '</p>';
}

function hret_render_refund_email(WC_Order $order, $email): string
{
    $partial = hret_is_partial_email($email);
    $fulfillment = hret_fulfillment_context($order);
    $refund = hret_latest_refund($order, $email);
    if (!$refund instanceof WC_Order_Refund) {
        return '';
    }

    $name = hret_customer_name($order);
    $order_no = $order->get_order_number();
    $breakdown = hret_refund_breakdown($order, $refund, $partial);
    $refund_amt = $breakdown['refund_total'];

    $title = $partial ? '部分退款已完成' : '退款已完成';
    $lead = $partial
        ? '您申請退貨的商品，退款已完成。以下為本次退款明細，請核對。'
        : '您的訂單退款已完成。以下為退款明細，請核對。';

    if ($fulfillment === 'pre_ship') {
        $lead = $partial
            ? '您取消／退款的商品尚未寄出，退款已完成。您無須寄回商品。以下為本次退款明細。'
            : '您的訂單尚未寄出，全部退款已完成。您無須寄回商品。以下為退款明細。';
    }

    $products_title = $partial ? '退貨商品' : '商品資訊';
    $amount_title = $partial ? '退款金額明細' : '金額明細';

    $inner = '
      ' . hret_checkmark_html() . '
      <h1 style="margin:0 0 8px;text-align:center;font-size:22px;font-weight:700;color:#111;">' . hret_esc($title) . '</h1>
      <p style="margin:0 0 4px;text-align:center;font-size:13px;color:#888;">訂單編號｜' . hret_esc((string) $order_no) . '</p>
      ' . hret_context_badge($fulfillment, $partial) . '
      <p style="margin:16px 0 8px;font-size:15px;line-height:1.8;">親愛的' . hret_esc($name) . '，</p>
      <p style="margin:0 0 8px;font-size:14px;line-height:1.8;color:#333;">' . hret_esc($lead) . '</p>

      ' . hret_section_title('退款資訊') . '
      <table width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
        ' . hret_kv_row('訂單編號', (string) $order_no) . '
        ' . hret_kv_row('退款類型', $partial ? '部分退款' : '全部退款') . '
        ' . hret_kv_row('退款金額', hret_money($refund_amt), true, HRET_GREEN) . '
        ' . hret_kv_row('退款日期', hret_refund_date($refund)) . '
        ' . hret_kv_row('付款方式', hret_payment_label($order)) . '
      </table>

      ' . hret_section_title($products_title) . '
      <table width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
        ' . hret_refund_products_html($order, $refund) . '
      </table>

      ' . hret_section_title($amount_title) . '
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
        <tr><td align="right">
          <table role="presentation" align="right" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;max-width:360px;">
            ' . $breakdown['rows'] . '
          </table>
        </td></tr>
      </table>

      ' . hret_rules_html($partial, $fulfillment) . '
      ' . hret_payout_note_html($order) . '
      ' . hret_link_btn('查看訂單', HRET_ACCOUNT_ORDERS_URL) . '
    ';

    return hret_shell($inner);
}

/* -------------------------------------------------------------------------- */
/* WooCommerce hooks                                                           */
/* -------------------------------------------------------------------------- */

add_filter('woocommerce_email_styles', function ($css, $email = null) {
    if ($email && is_object($email)) {
        $GLOBALS['hret_sending_email'] = $email;
        $GLOBALS['hoet_sending_email'] = $email; // 讓 hoet 共用內容過濾也能辨識
    }
    return $css;
}, 5, 2);

add_action('woocommerce_email_header', function ($heading, $email = null) {
    if ($email && is_object($email)) {
        $GLOBALS['hret_sending_email'] = $email;
        $GLOBALS['hoet_sending_email'] = $email;
    }
}, 1, 2);

add_filter('woocommerce_email_subject_customer_refunded_order', function ($subject, $order) {
    if (!$order instanceof WC_Order) {
        return $subject;
    }
    $email = $GLOBALS['hret_sending_email'] ?? null;
    $partial = hret_is_partial_email($email);
    $prefix = $partial ? '部分退款已完成' : '退款已完成';
    return $prefix . '｜訂單 ' . $order->get_order_number();
}, 50, 2);

add_filter('woocommerce_email_subject_customer_partially_refunded_order', function ($subject, $order) {
    if (!$order instanceof WC_Order) {
        return $subject;
    }
    return '部分退款已完成｜訂單 ' . $order->get_order_number();
}, 50, 2);

add_filter('woocommerce_email_heading_customer_refunded_order', '__return_empty_string', 50);
add_filter('woocommerce_email_heading_customer_partially_refunded_order', '__return_empty_string', 50);

add_filter('woocommerce_mail_content', function ($content) {
    $email = $GLOBALS['hret_sending_email'] ?? ($GLOBALS['hoet_sending_email'] ?? null);
    if (!$email || !is_object($email) || empty($email->id)) {
        return $content;
    }
    $id = (string) $email->id;
    if (!in_array($id, ['customer_refunded_order', 'customer_partially_refunded_order'], true)) {
        return $content;
    }
    $order = (!empty($email->object) && $email->object instanceof WC_Order) ? $email->object : null;
    if (!$order instanceof WC_Order) {
        return $content;
    }
    $html = hret_render_refund_email($order, $email);
    return $html !== '' ? $html : $content;
}, 1000);

/**
 * 退款完成後寫備註，方便客服核對信件情境
 */
add_action('woocommerce_order_partially_refunded', function ($order_id, $refund_id) {
    $order = wc_get_order($order_id);
    if (!$order instanceof WC_Order) {
        return;
    }
    $ctx = hret_fulfillment_context($order);
    $label = $ctx === 'received' ? '已付款已取貨' : '已付款尚未出貨';
    $order->add_order_note(sprintf(
        'HOVER：已觸發部分退款信（情境：%s｜Refund #%s）。若情境不符請於 meta %s 設為 pre_ship 或 received 後重寄。',
        $label,
        (string) $refund_id,
        HRET_META_FULFILLMENT
    ));
}, 20, 2);

add_action('woocommerce_order_fully_refunded', function ($order_id, $refund_id) {
    $order = wc_get_order($order_id);
    if (!$order instanceof WC_Order) {
        return;
    }
    $ctx = hret_fulfillment_context($order);
    $label = $ctx === 'received' ? '已付款已取貨' : '已付款尚未出貨';
    $order->add_order_note(sprintf(
        'HOVER：已觸發全部退款信（情境：%s｜Refund #%s）。若情境不符請於 meta %s 設為 pre_ship 或 received 後重寄。',
        $label,
        (string) $refund_id,
        HRET_META_FULFILLMENT
    ));
}, 20, 2);
