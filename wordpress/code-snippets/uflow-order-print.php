<?php
/**
 * UFLOW — 訂單明細／揀貨單 獨立列印頁
 * 適用站：https://www.uflow.space
 *
 * 使用方式（WordPress 後台）：
 * 1. Code Snippets → Add New → 貼上本檔
 * 2. Run snippet：Only run in administration area → 啟用
 * 3. WooCommerce → 訂單列表：每筆訂單多出「明細」「揀貨」兩顆按鈕
 *    （若看不到：畫面右上「顯示選項」勾選 Actions／操作 欄）
 *    訂單編輯頁：右側「UFLOW 列印」區塊也有相同按鈕
 * 4. 點擊後開新分頁，自動叫出瀏覽器列印（可存成 PDF）
 *
 * 與新舊訂單無關，啟用後所有訂單皆可列印。
 * 不依賴 WebToffee / mPDF，版面由本檔 HTML/CSS 控制。
 */

if (!defined('ABSPATH')) {
    exit;
}

if (defined('UOP_LOADED')) {
    return;
}
define('UOP_LOADED', true);

/* ─────────────────────────────────────────────
 * 1. 訂單列表：加「明細」「揀貨」按鈕
 * ──────────────────────────────────────────── */

add_filter('woocommerce_admin_order_actions', function (array $actions, $order) {
    if (!$order instanceof WC_Order) {
        return $actions;
    }
    $actions['uop_detail'] = [
        'url'    => uop_print_url($order->get_id(), 'detail'),
        'name'   => '列印訂單明細',
        'action' => 'uop-detail',
    ];
    $actions['uop_picking'] = [
        'url'    => uop_print_url($order->get_id(), 'picking'),
        'name'   => '列印揀貨單',
        'action' => 'uop-picking',
    ];
    return $actions;
}, 20, 2);

add_action('admin_head', function () {
    ?>
    <style>
        .wc_actions .uop-detail::after  { content: "明"; font-family: inherit; font-size: 12px; font-weight: 700; line-height: 1; }
        .wc_actions .uop-picking::after { content: "揀"; font-family: inherit; font-size: 12px; font-weight: 700; line-height: 1; }
        a.button.uop-detail, a.button.uop-picking {
            display: inline-flex; align-items: center; justify-content: center;
        }
    </style>
    <script>
        document.addEventListener('click', function (e) {
            var a = e.target.closest('a.uop-detail, a.uop-picking, a.uop-open-new');
            if (a) { a.setAttribute('target', '_blank'); }
        }, true);
    </script>
    <?php
});

/* ─────────────────────────────────────────────
 * 2. 訂單編輯頁：側欄按鈕（相容 HPOS）
 * ──────────────────────────────────────────── */

add_action('add_meta_boxes', function () {
    $screens = ['suop_order'];
    if (class_exists(\Automattic\WooCommerce\Internal\DataStores\Orders\CustomOrdersTableController::class)) {
        $screens[] = wc_get_page_screen_id('shop-order');
    }
    foreach (array_unique($screens) as $screen) {
        add_meta_box(
            'uop-print-box',
            'UFLOW 列印',
            'uop_render_meta_box',
            $screen,
            'side',
            'high'
        );
    }
});

function uop_render_meta_box($post_or_order): void
{
    $order = ($post_or_order instanceof WC_Order) ? $post_or_order : wc_get_order($post_or_order->ID ?? 0);
    if (!$order) {
        echo '<p>找不到訂單。</p>';
        return;
    }
    $id = $order->get_id();
    ?>
    <div style="display:flex; gap:8px;">
        <a href="<?php echo esc_url(uop_print_url($id, 'detail')); ?>" target="_blank" class="button button-primary uop-open-new" style="flex:1; text-align:center;">訂單明細</a>
        <a href="<?php echo esc_url(uop_print_url($id, 'picking')); ?>" target="_blank" class="button uop-open-new" style="flex:1; text-align:center;">揀貨單</a>
    </div>
    <p class="description" style="margin-top:8px;">開新分頁後自動叫出列印，可直接「另存為 PDF」。</p>
    <?php
}

/* ─────────────────────────────────────────────
 * 3. 列印端點
 * ──────────────────────────────────────────── */

function uop_print_url(int $order_id, string $doc): string
{
    return wp_nonce_url(
        admin_url('admin-ajax.php?action=uop_print&doc=' . $doc . '&order_id=' . $order_id),
        'uop_print_' . $order_id
    );
}

add_action('wp_ajax_uop_print', function () {
    $order_id = absint($_GET['order_id'] ?? 0);
    $doc      = ($_GET['doc'] ?? '') === 'picking' ? 'picking' : 'detail';

    if (!$order_id || !wp_verify_nonce($_GET['_wpnonce'] ?? '', 'uop_print_' . $order_id)) {
        wp_die('連結已失效，請回訂單頁重新點擊列印按鈕。');
    }
    if (!current_user_can('manage_woocommerce')) {
        wp_die('權限不足。');
    }

    $order = wc_get_order($order_id);
    if (!$order) {
        wp_die('找不到訂單 #' . $order_id);
    }

    uop_output_document($order, $doc);
    exit;
});

/* ─────────────────────────────────────────────
 * 4. 取資料
 * ──────────────────────────────────────────── */

/**
 * 取得商品列：[['name' => ..., 'spec' => '黑 / L', 'qty' => 1], ...]
 * 商品名稱取母商品名稱（與結帳顯示一致），規格取變體屬性，避免名稱裡重複帶尺寸顏色。
 */
function uop_get_items(WC_Order $order): array
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

        // 活動標籤（相容 _uflow_*／_hover_*）
        $promo_type = trim((string) $item->get_meta('_uflow_promotion_type', true));
        if ($promo_type === '') {
            $promo_type = trim((string) $item->get_meta('_hover_promotion_type', true));
        }
        $promo_kind = trim((string) $item->get_meta('_uflow_promotion_kind', true));
        if ($promo_kind === '') {
            $promo_kind = trim((string) $item->get_meta('_hover_promotion_kind', true));
        }
        $is_gift = ($promo_type === '滿額贈' || $promo_kind === 'gift');
        $is_addon = ($promo_type === '加價購' || $promo_kind === 'addon');
        $random_flag = strtolower(trim((string) $item->get_meta('_uflow_random_color', true)));
        if ($random_flag === '') {
            $random_flag = strtolower(trim((string) $item->get_meta('_hover_random_color', true)));
        }
        $is_random = in_array($random_flag, ['yes', '1', 'true'], true);
        if ($is_gift) {
            $name = '[滿額贈]' . ($is_random ? '[顏色隨機出貨]' : '') . ' ' . $name;
        } elseif ($is_addon) {
            $name = '[加價購] ' . $name;
        }

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

        if ($is_random) {
            $sku = trim((string) $item->get_meta('_uflow_fulfillment_sku', true));
            if ($sku === '') {
                $sku = trim((string) $item->get_meta('_hover_fulfillment_sku', true));
            }
            if ($sku === '' && $product instanceof WC_Product) {
                $sku = trim((string) $product->get_sku());
            }
            $specs[] = $sku !== '' ? '顏色隨機出貨／SKU ' . $sku : '顏色隨機出貨';
        }

        $qty = max(1, (int) $item->get_quantity());
        $line_total = (float) $item->get_total();
        $unit_price = $line_total / $qty;

        $rows[] = [
            'name'  => $name,
            'spec'  => implode(' / ', array_filter($specs)),
            'qty'   => $qty,
            'unit'  => $unit_price,
            'total' => $line_total,
        ];
    }
    return $rows;
}

function uop_money(float $amount, string $currency = ''): string
{
    $args = [];
    if ($currency !== '') {
        $args['currency'] = $currency;
    }
    return wp_strip_all_tags(wc_price($amount, $args));
}

function uop_receiver_name(WC_Order $order): string
{
    $name = trim($order->get_shipping_first_name() . ' ' . $order->get_shipping_last_name());
    if ($name === '') {
        $name = trim($order->get_billing_first_name() . ' ' . $order->get_billing_last_name());
    }
    return $name;
}

function uop_phone(WC_Order $order): string
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
function uop_cvs_label(string $method_id, string $title, string $store): ?string
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
function uop_shipping_label(WC_Order $order, bool $with_store = false): string
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

    $label = uop_cvs_label($method_id, $title, $store);
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

/** 列印用 UFLOW LOGO（文字標誌，列印不依賴外部網址） */
function uop_print_logo_html(): string
{
    return <<<'HTML'
<div class="brand-logo" aria-label="UFLOW" style="font-family:Georgia,'Times New Roman',serif;font-size:28px;font-weight:700;letter-spacing:0.18em;color:#e6657b;line-height:1;">UFLOW</div>
HTML;
}

/* ─────────────────────────────────────────────
 * 5. 輸出 HTML
 * ──────────────────────────────────────────── */

function uop_output_document(WC_Order $order, string $doc): void
{
    $is_picking = ($doc === 'picking');

    $items     = uop_get_items($order);
    $total_qty = array_sum(array_column($items, 'qty'));

    // 補空白列：不足時補到至少 5 列（與範本的空行一致）
    $min_rows   = 5;
    $empty_rows = max(0, $min_rows - count($items));

    $order_no = $order->get_order_number();
    $created  = $order->get_date_created();
    $order_dt = $created ? wp_date('Y/n/j', $created->getTimestamp()) : '';
    $print_dt = wp_date('Y/n/j');

    $receiver = uop_receiver_name($order);
    $phone    = uop_phone($order);
    // 訂單明細與揀貨單都顯示超商品牌及取貨門市
    $shipping = uop_shipping_label($order, true);
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
    .col-spec  { width: 15%; }
    .col-qty   { width: 10%; }
    .col-price { width: 14%; }
    .col-check { width: 10%; }
    th.col-qty, td.col-qty,
    th.col-check, td.col-check { text-align: center; }
    th.col-spec, td.col-spec { text-align: left; }
    th.col-price, td.col-price { text-align: right; font-variant-numeric: tabular-nums; }

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
                <?php if (!$is_picking) : ?>
                    <th class="col-price">單價</th>
                    <th class="col-price">小計</th>
                <?php endif; ?>
                <?php if ($is_picking) : ?><th class="col-check">確認</th><?php endif; ?>
            </tr>
        </thead>
        <tbody>
            <?php foreach ($items as $row) : ?>
            <tr>
                <td><?php echo esc_html($row['name']); ?></td>
                <td class="col-spec"><?php echo esc_html($row['spec']); ?></td>
                <td class="col-qty"><?php echo esc_html($row['qty']); ?></td>
                <?php if (!$is_picking) : ?>
                    <td class="col-price"><?php echo esc_html(uop_money((float) $row['unit'], $order->get_currency())); ?></td>
                    <td class="col-price"><?php echo esc_html(uop_money((float) $row['total'], $order->get_currency())); ?></td>
                <?php endif; ?>
                <?php if ($is_picking) : ?><td class="col-check"><span class="checkbox"></span></td><?php endif; ?>
            </tr>
            <?php endforeach; ?>
            <?php for ($i = 0; $i < $empty_rows; $i++) : ?>
            <tr class="empty">
                <td></td><td></td><td></td>
                <?php if (!$is_picking) : ?><td></td><td></td><?php endif; ?>
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
            <span class="totals-amount">
                <span>總金額:</span>
                <span class="amount-value"><?php echo esc_html($total_amount); ?></span>
            </span>
        </div>
        <div class="doc-footer">
            <div class="notice-txt">
                如商品有任何問題，請保留完整包裝，<br>
                並於收到商品7日內聯繫官方客服 Line ID : @uflow。
            </div>
            <?php echo uop_print_logo_html(); ?>
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
