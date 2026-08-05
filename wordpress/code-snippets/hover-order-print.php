<?php
/**
 * HOVER — 訂單明細／揀貨單 獨立列印頁
 *
 * 使用方式（WordPress 後台）：
 * 1. Code Snippets → Add New → 貼上本檔
 * 2. Run snippet：Only run in administration area → 啟用
 * 3. WooCommerce → 訂單列表：每筆訂單多出「明細」「揀貨」兩顆按鈕
 *    訂單編輯頁：右側「HOVER 列印」區塊也有相同按鈕
 * 4. 點擊後開新分頁，自動叫出瀏覽器列印（可存成 PDF）
 *
 * 不依賴 WebToffee / mPDF，版面 100% 由本檔 HTML/CSS 控制。
 */

if (!defined('ABSPATH')) {
    exit;
}

if (defined('HOP_LOADED')) {
    return;
}
define('HOP_LOADED', true);

/* ─────────────────────────────────────────────
 * 1. 訂單列表：加「明細」「揀貨」按鈕
 * ──────────────────────────────────────────── */

add_filter('woocommerce_admin_order_actions', function (array $actions, $order) {
    if (!$order instanceof WC_Order) {
        return $actions;
    }
    $actions['hop_detail'] = [
        'url'    => hop_print_url($order->get_id(), 'detail'),
        'name'   => '列印訂單明細',
        'action' => 'hop-detail',
    ];
    $actions['hop_picking'] = [
        'url'    => hop_print_url($order->get_id(), 'picking'),
        'name'   => '列印揀貨單',
        'action' => 'hop-picking',
    ];
    return $actions;
}, 20, 2);

add_action('admin_head', function () {
    ?>
    <style>
        .wc_actions .hop-detail::after  { content: "明"; font-family: inherit; font-size: 12px; font-weight: 700; line-height: 1; }
        .wc_actions .hop-picking::after { content: "揀"; font-family: inherit; font-size: 12px; font-weight: 700; line-height: 1; }
        a.button.hop-detail, a.button.hop-picking {
            display: inline-flex; align-items: center; justify-content: center;
        }
    </style>
    <script>
        document.addEventListener('click', function (e) {
            var a = e.target.closest('a.hop-detail, a.hop-picking, a.hop-open-new');
            if (a) { a.setAttribute('target', '_blank'); }
        }, true);
    </script>
    <?php
});

/* ─────────────────────────────────────────────
 * 2. 訂單編輯頁：側欄按鈕（相容 HPOS）
 * ──────────────────────────────────────────── */

add_action('add_meta_boxes', function () {
    $screens = ['shop_order'];
    if (class_exists(\Automattic\WooCommerce\Internal\DataStores\Orders\CustomOrdersTableController::class)) {
        $screens[] = wc_get_page_screen_id('shop-order');
    }
    foreach (array_unique($screens) as $screen) {
        add_meta_box(
            'hop-print-box',
            'HOVER 列印',
            'hop_render_meta_box',
            $screen,
            'side',
            'high'
        );
    }
});

function hop_render_meta_box($post_or_order): void
{
    $order = ($post_or_order instanceof WC_Order) ? $post_or_order : wc_get_order($post_or_order->ID ?? 0);
    if (!$order) {
        echo '<p>找不到訂單。</p>';
        return;
    }
    $id = $order->get_id();
    ?>
    <div style="display:flex; gap:8px;">
        <a href="<?php echo esc_url(hop_print_url($id, 'detail')); ?>" target="_blank" class="button button-primary hop-open-new" style="flex:1; text-align:center;">訂單明細</a>
        <a href="<?php echo esc_url(hop_print_url($id, 'picking')); ?>" target="_blank" class="button hop-open-new" style="flex:1; text-align:center;">揀貨單</a>
    </div>
    <p class="description" style="margin-top:8px;">開新分頁後自動叫出列印，可直接「另存為 PDF」。</p>
    <?php
}

/* ─────────────────────────────────────────────
 * 3. 列印端點
 * ──────────────────────────────────────────── */

function hop_print_url(int $order_id, string $doc): string
{
    return wp_nonce_url(
        admin_url('admin-ajax.php?action=hop_print&doc=' . $doc . '&order_id=' . $order_id),
        'hop_print_' . $order_id
    );
}

add_action('wp_ajax_hop_print', function () {
    $order_id = absint($_GET['order_id'] ?? 0);
    $doc      = ($_GET['doc'] ?? '') === 'picking' ? 'picking' : 'detail';

    if (!$order_id || !wp_verify_nonce($_GET['_wpnonce'] ?? '', 'hop_print_' . $order_id)) {
        wp_die('連結已失效，請回訂單頁重新點擊列印按鈕。');
    }
    if (!current_user_can('manage_woocommerce')) {
        wp_die('權限不足。');
    }

    $order = wc_get_order($order_id);
    if (!$order) {
        wp_die('找不到訂單 #' . $order_id);
    }

    hop_output_document($order, $doc);
    exit;
});

/* ─────────────────────────────────────────────
 * 4. 取資料
 * ──────────────────────────────────────────── */

/**
 * 取得商品列：[['name' => ..., 'spec' => '黑 / L', 'qty' => 1], ...]
 * 商品名稱取母商品名稱（與結帳顯示一致），規格取變體屬性，避免名稱裡重複帶尺寸顏色。
 */
function hop_get_items(WC_Order $order): array
{
    $rows = [];
    foreach ($order->get_items() as $item) {
        /** @var WC_Order_Item_Product $item */
        $product = $item->get_product();
        $name    = $item->get_name();

        if ($product instanceof WC_Product) {
            if ($product->is_type('variation')) {
                $parent = wc_get_product($product->get_parent_id());
                if ($parent) {
                    $name = $parent->get_name();
                }
            } else {
                $name = $product->get_name();
            }
        }

        // 若名稱仍帶「 - 規格」後綴，去掉（Woo 常見寫法）
        $name = trim((string) preg_replace('/\s+[–—-]\s+.+$/u', '', $name));

        $specs = [];
        if ($product instanceof WC_Product && $product->is_type('variation')) {
            foreach ($product->get_attributes() as $taxonomy => $value) {
                if ($value === '' || $value === null) {
                    continue;
                }
                $value = (string) $value;
                if (taxonomy_exists($taxonomy)) {
                    $term = get_term_by('slug', $value, $taxonomy);
                    $specs[] = ($term && !is_wp_error($term)) ? $term->name : $value;
                } else {
                    $specs[] = $value;
                }
            }
        }

        if (!$specs) {
            foreach ($item->get_formatted_meta_data('_', true) as $meta) {
                $val = trim(wp_strip_all_tags((string) $meta->display_value));
                if ($val !== '') {
                    $specs[] = $val;
                }
            }
        }

        $rows[] = [
            'name' => $name,
            'spec' => implode(' / ', array_filter($specs)),
            'qty'  => (int) $item->get_quantity(),
        ];
    }
    return $rows;
}

function hop_receiver_name(WC_Order $order): string
{
    $name = trim($order->get_shipping_first_name() . ' ' . $order->get_shipping_last_name());
    if ($name === '') {
        $name = trim($order->get_billing_first_name() . ' ' . $order->get_billing_last_name());
    }
    return $name;
}

function hop_phone(WC_Order $order): string
{
    $phone = '';
    if (method_exists($order, 'get_shipping_phone')) {
        $phone = (string) $order->get_shipping_phone();
    }
    if ($phone === '') {
        $phone = (string) $order->get_meta('_shipping_phone');
    }
    return $phone !== '' ? $phone : (string) $order->get_billing_phone();
}

/**
 * 依結帳選擇的物流代碼／標題，判斷超商品牌。
 * 回傳前台一致的說法（7-11超商僅取貨／全家超商僅取貨…），不顯示金流商名稱。
 */
function hop_cvs_label(string $method_id, string $title, string $store): ?string
{
    $brands = [
        '7-11超商僅取貨'   => ['cvs_711', '7-eleven', '7-11', '統一超商'],
        '全家超商僅取貨'   => ['cvs_family', 'familymart', '全家'],
        '萊爾富超商僅取貨' => ['cvs_hilife', 'hilife', 'hi-life', '萊爾富'],
        'OK超商僅取貨'     => ['cvs_ok', 'okmart', 'ok超商'],
    ];

    // 物流代碼最可靠，其次是訂單標題，最後才看門市名稱（門市代號可能誤判）
    foreach ([$method_id, $title, $store] as $source) {
        $haystack = strtolower(trim($source));
        if ($haystack === '') {
            continue;
        }
        foreach ($brands as $label => $needles) {
            foreach ($needles as $needle) {
                if (str_contains($haystack, $needle)) {
                    return $label;
                }
            }
        }
    }

    return null;
}

/**
 * 配送方式：自動對應結帳時選擇的運送方式。
 * 超商取貨統一顯示「◯◯超商僅取貨」，宅配則沿用訂單標題（去掉物流商前綴）。
 *
 * @param bool $with_store 是否附上取貨門市（揀貨單用）
 */
function hop_shipping_label(WC_Order $order, bool $with_store = false): string
{
    $method_id = '';
    $titles    = [];
    foreach ($order->get_shipping_methods() as $ship) {
        $title = trim((string) $ship->get_method_title());
        if ($title !== '') {
            $titles[] = $title;
        }
        if ($method_id === '') {
            $method_id = (string) $ship->get_method_id();
        }
    }
    $title = $titles ? implode('、', $titles) : trim((string) $order->get_shipping_method());

    $store = (string) $order->get_meta('_shipping_cvs_store_name');
    if ($store === '') {
        $store = (string) $order->get_meta('_shipping_cvs_store_ID');
    }

    $label = hop_cvs_label($method_id, $title, $store);
    if ($label === null) {
        // 宅配等其他方式：去掉「綠界物流／綠界科技」之類的物流商前綴
        $label = trim((string) preg_replace('/^(綠界(物流|科技)?|ECPay|ecpay)\s*/u', '', $title));
        if ($label === '') {
            $label = $title;
        }
    }

    if ($with_store && $store !== '' && !str_contains($label, $store)) {
        $label .= '（' . $store . '）';
    }

    return $label;
}

/** 列印用 HOVER LOGO（內嵌 SVG，列印不依賴外部網址） */
function hop_print_logo_html(): string
{
    return <<<'SVG'
<svg class="brand-logo" viewBox="0 0 1000 300" xmlns="http://www.w3.org/2000/svg" aria-label="HOVER" role="img">
  <g fill="#b5b5b5">
    <path d="M216.56,57.63c-22.17,3.29-24.28,5.39-24.28,31.75v121.63c0,25.76,2.1,27.86,24.28,31.75v4.8h-85.38v-4.8c22.47-3.29,23.98-5.69,23.98-31.75v-63.82H72.48v63.82c0,26.36,2.4,28.16,24.28,31.75v4.8h-85.4v-4.8c21.88-2.99,23.98-5.1,23.98-31.75V89.38c0-26.36-2.7-28.16-23.98-31.75v-4.8h85.4v4.8c-21.58,3.59-24.28,5.39-24.28,31.75v48.23h82.68V89.38c0-26.06-2.99-28.16-23.98-31.75v-4.8h85.38V57.63z"/>
    <path d="M338.48,48.65c53.03,0,97.38,41.65,97.38,99.78c0,62.61-44.05,103.66-98.27,103.66c-58.13,0-99.46-44.94-99.46-100.37C238.11,100.49,275.26,48.65,338.48,48.65z M332.5,56.15c-29.35,0-51.52,29.35-51.52,88.69c0,56.03,22.77,99.78,61.72,99.78c29.97,0,50.33-30.26,50.33-88.39C393,93.59,369.34,56.15,332.5,56.15z"/>
    <path d="M636.86,57.33c-21.28,2.99-23.98,8.09-36.85,38.36c-11.68,27.57-39.84,97.67-62.02,156.4h-7.2c-18.58-50.63-48.23-128.53-59.62-158.8c-11.09-28.46-13.49-32.66-33.56-35.96v-4.5h85.99v4.5c-22.77,3.89-21.58,9.28-16.78,22.77c5.39,16.18,26.36,71.91,43.45,117.45c10.19-25.17,30.26-79.39,41.35-109.36c8.69-23.66,6.88-26.97-21.88-30.86v-4.5h67.11v4.5H636.86z"/>
    <path d="M787.25,200.54c-1.51,10.49-6.88,39.84-8.69,47.04h-146.2v-4.8c25.76-3.59,27.86-5.1,27.86-31.75V89.4c0-26.97-1.51-29.35-22.77-31.75v-4.8h90.77c29.35,0,41.05-0.3,43.45-0.59c0.3,11.38,1.51,30.56,2.99,43.45l-4.8,0.89c-2.4-7.5-6.29-18.58-12.89-26.36c-5.39-6.58-11.98-8.39-29.67-8.39h-22.47c-6.29,0-7.5,1.19-7.5,7.18v71.62h29.05c23.66,0,24.57-6.58,28.76-25.17h4.8v59.32h-4.8c-4.18-17.67-5.1-25.17-28.76-25.17h-29.03v63.82c0,20.98,4.5,24.87,23.06,25.17h17.67c17.67,0,21.88-2.4,29.35-10.49c5.39-5.99,10.19-16.18,15.27-28.46L787.25,200.54z"/>
    <path d="M987.67,249.69c-1.51,0-9.88,0-13.49,0c-35.96-1.51-45.53-8.39-55.73-24.28c-10.49-16.18-19.77-32.96-29.35-51.54c-6.58-12.59-11.09-16.18-21.28-16.18h-4.5v52.73c0,25.17,1.81,27.57,23.98,32.35v4.8h-84.49v-4.8c22.17-4.8,23.98-6.58,23.98-32.35V89.7c0-25.17-1.81-28.46-23.98-32.07v-4.8h80.6c24.57,0,39.55,2.7,51.82,11.38c11.38,7.79,17.97,20.07,17.97,35.34c0,30.26-23.06,43.75-38.06,50.04c4.5,8.09,20.37,35.66,28.76,49.12c11.38,18.29,15.27,24.28,21.88,32.07c6.88,8.09,11.09,10.79,22.77,14.68L987.67,249.69z M869.31,150.83c14.38,0,24.87-1.19,32.05-8.09c8.39-7.79,11.98-18.29,11.98-35.66c0-34.77-17.37-47.34-34.45-47.34c-6.29,0-10.49,0.59-12.28,2.1c-2.1,1.49-3.29,3.59-3.29,9.58v79.39h5.99V150.83z"/>
  </g>
</svg>
SVG;
}

/* ─────────────────────────────────────────────
 * 5. 輸出 HTML（版面依 HOVER 範本 1:1）
 * ──────────────────────────────────────────── */

function hop_output_document(WC_Order $order, string $doc): void
{
    $is_picking = ($doc === 'picking');

    $items     = hop_get_items($order);
    $total_qty = array_sum(array_column($items, 'qty'));

    // 補空白列：不足時補到至少 5 列（與範本的空行一致）
    $min_rows   = 5;
    $empty_rows = max(0, $min_rows - count($items));

    $order_no = $order->get_order_number();
    $created  = $order->get_date_created();
    $order_dt = $created ? wp_date('Y/n/j', $created->getTimestamp()) : '';
    $print_dt = wp_date('Y/n/j');

    $receiver = hop_receiver_name($order);
    $phone    = hop_phone($order);
    // 訂單明細與揀貨單都顯示超商品牌及取貨門市
    $shipping = hop_shipping_label($order, true);
    $total_amount = wp_strip_all_tags(wc_price($order->get_total(), [
        'currency' => $order->get_currency(),
    ]));

    $title = $is_picking ? '揀貨單' : '訂單明細';

    header('Content-Type: text/html; charset=utf-8');
    ?>
<!DOCTYPE html>
<html lang="zh-Hant">
<head>
<meta charset="utf-8">
<title><?php echo esc_html($title . ' - ' . $order_no); ?></title>
<style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { height: 100%; }
    body {
        font-family: "Noto Sans TC", "PingFang TC", "Microsoft JhengHei", "Heiti TC", sans-serif;
        font-size: 13px;
        color: #1a1a1a;
        background: #f0f0f0;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
    }
    .sheet {
        position: relative;
        width: 210mm;
        min-height: 297mm;
        margin: 0 auto;
        padding: 18mm 16mm 30mm;
        background: #fff;
        display: flex;
        flex-direction: column;
    }
    @media screen {
        .sheet { margin: 24px auto; box-shadow: 0 2px 14px rgba(0,0,0,.15); }
        .toolbar {
            position: fixed; top: 12px; right: 16px; z-index: 10;
            display: flex; gap: 8px;
        }
        .toolbar button {
            font: inherit; font-weight: 700; cursor: pointer;
            padding: 8px 20px; border-radius: 6px; border: 1px solid #1a1a1a;
            background: #1a1a1a; color: #fff;
        }
        .toolbar button.ghost { background: #fff; color: #1a1a1a; }
    }
    @media print {
        body { background: #fff; }
        .sheet { width: auto; min-height: auto; margin: 0; padding: 0; box-shadow: none; }
        .toolbar { display: none; }
    }
    @page { size: A4; margin: 18mm 16mm 16mm; }

    h1 {
        text-align: center;
        font-size: 22px;
        font-weight: 700;
        letter-spacing: .12em;
        margin-bottom: 34px;
    }
    .meta { margin-bottom: 26px; }
    .meta p { font-size: 13px; line-height: 2; }

    table { width: 100%; border-collapse: collapse; }
    thead th {
        font-size: 13px; font-weight: 700; text-align: left;
        padding: 10px 4px;
        border-top: 1.5px solid #333;
        border-bottom: 1.5px solid #333;
    }
    tbody td {
        font-size: 13px;
        padding: 14px 4px;
        border-bottom: 1px solid #9a9a9a;
        vertical-align: middle;
    }
    tbody tr.empty td { height: 44px; }
    .col-spec  { width: 17%; }
    .col-qty   { width: 12%; }
    .col-check { width: 12%; }
    th.col-qty, td.col-qty,
    th.col-check, td.col-check { text-align: center; }
    th.col-spec, td.col-spec { text-align: left; }

    .checkbox {
        display: inline-block;
        width: 15px; height: 15px;
        border: 1.2px solid #333;
        vertical-align: middle;
    }

    .totals {
        display: flex; justify-content: space-between; align-items: center;
        border-top: 1px solid #9a9a9a;
        border-bottom: 1px solid #9a9a9a;
        padding: 12px 4px;
        font-size: 13px;
        margin-top: 40px;
    }
    .totals.no-gap { margin-top: 0; border-top: 0; }
    /* 訂單明細：總件數只保留上方線，下方線條拿掉 */
    .totals.detail-only {
        border-bottom: none !important;
        margin-bottom: 0;
        padding-bottom: 4px;
    }
    .totals-amount {
        display: inline-flex;
        align-items: baseline;
        gap: 10px;
        margin-right: 72px;
        min-width: 9em;
        justify-content: flex-start;
    }
    .totals-amount .amount-value { font-variant-numeric: tabular-nums; }

    .sign-block { margin-top: 18px; padding: 0 4px; }
    .sign-block p { font-size: 13px; line-height: 2.6; }

    .doc-footer {
        margin-top: auto;
        padding-top: 72px;
        padding-bottom: 8px;
        text-align: center;
    }
    .doc-footer .notice-txt {
        font-size: 11px; color: #555; line-height: 1.9;
        margin-bottom: 28px;
    }
    .doc-footer .brand-logo {
        display: block;
        width: 132px;
        max-width: 30%;
        height: auto;
        margin: 0 auto;
    }
    @media print {
        .sheet { min-height: calc(297mm - 34mm); }
        .doc-footer {
            position: fixed;
            left: 0; right: 0; bottom: 4mm;
            padding-top: 0;
        }
    }
</style>
</head>
<body>
<div class="toolbar">
    <button class="ghost" onclick="window.close()">關閉</button>
    <button onclick="window.print()">列印 / 存成 PDF</button>
</div>

<div class="sheet">
    <h1><?php echo esc_html($title); ?></h1>

    <div class="meta">
        <?php if ($is_picking) : ?>
            <p>印單時間: <?php echo esc_html($print_dt); ?></p>
            <p>訂單編號: <?php echo esc_html($order_no); ?></p>
            <p>收件人: <?php echo esc_html($receiver); ?></p>
            <p>電話: <?php echo esc_html($phone); ?></p>
            <p>配送方式: <?php echo esc_html($shipping); ?></p>
        <?php else : ?>
            <p>訂單編號: <?php echo esc_html($order_no); ?></p>
            <p>訂購日期: <?php echo esc_html($order_dt); ?></p>
            <p>收件人: <?php echo esc_html($receiver); ?></p>
            <p>配送方式: <?php echo esc_html($shipping); ?></p>
        <?php endif; ?>
    </div>

    <table>
        <thead>
            <tr>
                <th>商品名稱</th>
                <th class="col-spec">規格</th>
                <th class="col-qty">數量</th>
                <?php if ($is_picking) : ?><th class="col-check">確認</th><?php endif; ?>
            </tr>
        </thead>
        <tbody>
            <?php foreach ($items as $row) : ?>
            <tr>
                <td><?php echo esc_html($row['name']); ?></td>
                <td class="col-spec"><?php echo esc_html($row['spec']); ?></td>
                <td class="col-qty"><?php echo esc_html($row['qty']); ?></td>
                <?php if ($is_picking) : ?><td class="col-check"><span class="checkbox"></span></td><?php endif; ?>
            </tr>
            <?php endforeach; ?>
            <?php for ($i = 0; $i < $empty_rows; $i++) : ?>
            <tr class="empty">
                <td></td><td></td><td></td>
                <?php if ($is_picking) : ?><td></td><?php endif; ?>
            </tr>
            <?php endfor; ?>
        </tbody>
    </table>

    <?php if ($is_picking) : ?>
        <div class="totals no-gap">
            <span>總件數: <?php echo esc_html($total_qty); ?>件</span>
            <span class="totals-amount">
                <span>總金額:</span>
                <span class="amount-value"><?php echo esc_html($total_amount); ?></span>
            </span>
        </div>
        <div class="sign-block">
            <p>揀貨日期:</p>
            <p>簽名:</p>
        </div>
    <?php else : ?>
        <div class="totals detail-only">
            <span>總件數: <?php echo esc_html($total_qty); ?>件</span>
        </div>
        <div class="doc-footer">
            <div class="notice-txt">
                如商品有任何問題，請保留完整包裝，<br>
                並於收到商品7日內聯繫官方客服 Line ID : @ HOVER。
            </div>
            <?php echo hop_print_logo_html(); ?>
        </div>
    <?php endif; ?>
</div>

<script>
    window.addEventListener('load', function () {
        setTimeout(function () { window.print(); }, 300);
    });
</script>
</body>
</html>
    <?php
}
