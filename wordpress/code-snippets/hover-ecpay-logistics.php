<?php
/**
 * HOVER — 綠界物流（後台產單／列印託運單）
 *
 * 金流仍由 Next 結帳處理；本 snippet 只做 Woo 後台「建立綠界物流單＋列印託運單」。
 * 不依賴 RY Tools。
 *
 * 使用：
 * 1. Code Snippets → Add New → 貼上本檔 → Everywhere → 啟用
 * 2. WooCommerce → HOVER 綠界物流：填商店代號、HashKey、HashIV、寄件人資料
 * 3. 訂單編輯頁右側「HOVER 綠界物流」→ 建立物流單 → 列印託運單
 *
 * 綠界後台須已申請：宅配（黑貓或中華郵政）及／或超商 C2C／B2C。
 */

if (!defined('ABSPATH')) {
    exit;
}
if (defined('HEL_LOADED')) {
    return;
}
define('HEL_LOADED', true);

const HEL_OPT = 'hover_ecpay_logistics';

function hel_opts(): array
{
    $d = [
        'merchant_id' => '',
        'hash_key' => '',
        'hash_iv' => '',
        'stage' => '0',
        'home_subtype' => 'TCAT',
        'cvs_mode' => 'C2C',
        'sender_name' => '',
        'sender_cell' => '',
        'sender_zip' => '',
        'sender_address' => '',
        'goods_spec' => '0001',
    ];
    $saved = get_option(HEL_OPT, []);
    return is_array($saved) ? array_merge($d, $saved) : $d;
}

function hel_base_url(): string
{
    return hel_opts()['stage'] === '1'
        ? 'https://logistics-stage.ecpay.com.tw'
        : 'https://logistics.ecpay.com.tw';
}

function hel_check_mac(array $params): string
{
    $o = hel_opts();
    unset($params['CheckMacValue']);
    uksort($params, 'strcasecmp');
    $raw = 'HashKey=' . $o['hash_key'];
    foreach ($params as $k => $v) {
        $raw .= '&' . $k . '=' . $v;
    }
    $raw .= '&HashIV=' . $o['hash_iv'];
    $enc = strtolower(urlencode($raw));
    $enc = str_replace(
        ['%2d', '%5f', '%2e', '%21', '%2a', '%28', '%29'],
        ['-', '_', '.', '!', '*', '(', ')'],
        $enc
    );
    return strtoupper(hash('sha256', $enc));
}

function hel_clean_name(string $name): string
{
    $name = preg_replace('/[0-9`~!@#$%^&*+=\[\]{}\\|;:\'",.<>\/?_]/u', '', $name) ?? '';
    $name = preg_replace('/\s+/u', '', $name) ?? '';
    if ($name === '') {
        return '顧客';
    }
    if (preg_match('/\p{Han}/u', $name)) {
        $len = function_exists('mb_strlen') ? mb_strlen($name, 'UTF-8') : strlen($name);
        if ($len < 2) {
            $name .= '先生';
        }
        return function_exists('mb_substr') ? mb_substr($name, 0, 5, 'UTF-8') : substr($name, 0, 15);
    }
    $name = preg_replace('/[^A-Za-z]/', '', $name) ?? 'Guest';
    if (strlen($name) < 4) {
        $name = str_pad($name, 4, 'x');
    }
    return substr($name, 0, 10);
}

function hel_phone(WC_Order $order): string
{
    $p = (string) $order->get_shipping_phone();
    if ($p === '') {
        $p = (string) $order->get_meta('_shipping_phone');
    }
    if ($p === '') {
        $p = (string) $order->get_billing_phone();
    }
    $p = preg_replace('/\D+/', '', $p) ?? '';
    return $p;
}

function hel_receiver_address(WC_Order $order): string
{
    $parts = array_filter([
        $order->get_shipping_state(),
        $order->get_shipping_city(),
        $order->get_shipping_address_1(),
        $order->get_shipping_address_2(),
    ]);
    $addr = trim(implode('', $parts));
    if ($addr === '') {
        $parts = array_filter([
            $order->get_billing_state(),
            $order->get_billing_city(),
            $order->get_billing_address_1(),
            $order->get_billing_address_2(),
        ]);
        $addr = trim(implode('', $parts));
    }
    return $addr;
}

function hel_shipping_kind(WC_Order $order): array
{
    $method = '';
    $title = '';
    foreach ($order->get_shipping_methods() as $ship) {
        $method = (string) $ship->get_method_id();
        $title = (string) $ship->get_method_title();
        break;
    }
    $hay = strtolower($method . ' ' . $title);
    $store_id = (string) $order->get_meta('_shipping_cvs_store_ID');
    $store_name = (string) $order->get_meta('_shipping_cvs_store_name');
    $mode = hel_opts()['cvs_mode'] === 'B2C' ? 'B2C' : 'C2C';
    $is_cvs = $store_id !== ''
        || str_contains($method, 'cvs')
        || str_contains($hay, '超商')
        || str_contains($hay, '711')
        || str_contains($hay, '7-11')
        || str_contains($hay, '全家')
        || str_contains($hay, 'family');

    if ($is_cvs) {
        $sub = $mode === 'B2C' ? 'UNIMART' : 'UNIMARTC2C';
        if (
            str_contains($method, 'family')
            || str_contains($hay, '全家')
            || str_contains($hay, 'family')
            || str_contains(strtolower($store_name), '全家')
        ) {
            $sub = $mode === 'B2C' ? 'FAMI' : 'FAMIC2C';
        } elseif (str_contains($method, '711') || str_contains($hay, '7-11') || str_contains($hay, 'unimart') || str_contains($hay, '統一')) {
            $sub = $mode === 'B2C' ? 'UNIMART' : 'UNIMARTC2C';
        } elseif (str_contains($hay, 'hilife') || str_contains($hay, '萊爾富')) {
            $sub = $mode === 'B2C' ? 'HILIFE' : 'HILIFEC2C';
        } elseif (str_contains($hay, 'okmart') || str_contains($hay, 'ok超商')) {
            $sub = $mode === 'B2C' ? 'OKMART' : 'OKMARTC2C';
        }
        return ['type' => 'CVS', 'sub' => $sub, 'store_id' => $store_id];
    }

    $home = strtoupper((string) hel_opts()['home_subtype']) === 'POST' ? 'POST' : 'TCAT';
    return ['type' => 'HOME', 'sub' => $home, 'store_id' => ''];
}

function hel_goods_name(WC_Order $order): string
{
    $names = [];
    foreach ($order->get_items() as $item) {
        $names[] = $item->get_name();
    }
    $s = preg_replace('/[\^\'`!@#%&*+\\\\"<>|_\[\]]/u', '', implode(' ', $names)) ?? 'HOVER商品';
    $s = trim($s);
    return function_exists('mb_substr') ? mb_substr($s !== '' ? $s : 'HOVER商品', 0, 50, 'UTF-8') : substr($s, 0, 50);
}

function hel_configured(): bool
{
    $o = hel_opts();
    return $o['merchant_id'] !== '' && $o['hash_key'] !== '' && $o['hash_iv'] !== ''
        && $o['sender_name'] !== '' && $o['sender_cell'] !== '';
}

/* ── 設定頁 ── */

add_action('admin_menu', function () {
    add_submenu_page(
        'woocommerce',
        'HOVER 綠界物流',
        'HOVER 綠界物流',
        'manage_woocommerce',
        'hover-ecpay-logistics',
        'hel_render_settings'
    );
});

function hel_render_settings(): void
{
    if (!current_user_can('manage_woocommerce')) {
        return;
    }
    if (!empty($_POST['hel_save']) && check_admin_referer('hel_save_settings')) {
        $fields = [
            'merchant_id', 'hash_key', 'hash_iv', 'stage', 'home_subtype', 'cvs_mode',
            'sender_name', 'sender_cell', 'sender_zip', 'sender_address', 'goods_spec',
        ];
        $next = hel_opts();
        foreach ($fields as $f) {
            $next[$f] = sanitize_text_field(wp_unslash($_POST[$f] ?? ''));
        }
        update_option(HEL_OPT, $next, false);
        echo '<div class="updated"><p>已儲存。</p></div>';
    }
    $o = hel_opts();
    ?>
    <div class="wrap">
        <h1>HOVER 綠界物流</h1>
        <p>金流走網站結帳；這裡只設定後台產物流單。HashKey／HashIV 可與金流同一組。</p>
        <p><strong>已支援：</strong>7-11 超商取貨、全家超商取貨、宅配（黑貓或中華郵政）。<br>
        請先在綠界會員中心申請並開通對應物流，未開通會出現「找不到加密金鑰」。</p>
        <form method="post">
            <?php wp_nonce_field('hel_save_settings'); ?>
            <table class="form-table">
                <tr><th>商店代號</th><td><input name="merchant_id" value="<?php echo esc_attr($o['merchant_id']); ?>" class="regular-text"></td></tr>
                <tr><th>HashKey</th><td><input name="hash_key" value="<?php echo esc_attr($o['hash_key']); ?>" class="regular-text" autocomplete="off"></td></tr>
                <tr><th>HashIV</th><td><input name="hash_iv" value="<?php echo esc_attr($o['hash_iv']); ?>" class="regular-text" autocomplete="off"></td></tr>
                <tr><th>環境</th><td>
                    <label><input type="radio" name="stage" value="0" <?php checked($o['stage'], '0'); ?>> 正式</label>
                    <label style="margin-left:12px;"><input type="radio" name="stage" value="1" <?php checked($o['stage'], '1'); ?>> 測試</label>
                </td></tr>
                <tr><th>宅配物流</th><td>
                    <select name="home_subtype">
                        <option value="TCAT" <?php selected($o['home_subtype'], 'TCAT'); ?>>黑貓 TCAT</option>
                        <option value="POST" <?php selected($o['home_subtype'], 'POST'); ?>>中華郵政 POST</option>
                    </select>
                </td></tr>
                <tr><th>超商類型</th><td>
                    <select name="cvs_mode">
                        <option value="C2C" <?php selected($o['cvs_mode'], 'C2C'); ?>>C2C 店到店（交貨便）</option>
                        <option value="B2C" <?php selected($o['cvs_mode'], 'B2C'); ?>>B2C 大宗寄倉</option>
                    </select>
                    <p class="description">網站選店：7-11＝UNIMARTC2C、全家＝FAMIC2C。請與綠界申請的超商項目一致。</p>
                </td></tr>
                <tr><th>寄件人姓名</th><td><input name="sender_name" value="<?php echo esc_attr($o['sender_name']); ?>" class="regular-text"> <span class="description">中文 2–5 字</span></td></tr>
                <tr><th>寄件人手機</th><td><input name="sender_cell" value="<?php echo esc_attr($o['sender_cell']); ?>" class="regular-text" placeholder="09xxxxxxxx"></td></tr>
                <tr><th>寄件人郵遞區號</th><td><input name="sender_zip" value="<?php echo esc_attr($o['sender_zip']); ?>" class="small-text"></td></tr>
                <tr><th>寄件人地址</th><td><input name="sender_address" value="<?php echo esc_attr($o['sender_address']); ?>" class="large-text"></td></tr>
                <tr><th>宅配材積</th><td>
                    <select name="goods_spec">
                        <option value="0001" <?php selected($o['goods_spec'], '0001'); ?>>60cm</option>
                        <option value="0002" <?php selected($o['goods_spec'], '0002'); ?>>90cm</option>
                        <option value="0003" <?php selected($o['goods_spec'], '0003'); ?>>120cm</option>
                        <option value="0004" <?php selected($o['goods_spec'], '0004'); ?>>150cm</option>
                    </select>
                </td></tr>
            </table>
            <p><button class="button button-primary" name="hel_save" value="1">儲存設定</button></p>
        </form>
    </div>
    <?php
}

/* ── 訂單側欄 ── */

add_action('add_meta_boxes', function () {
    $screens = ['shop_order'];
    if (class_exists(\Automattic\WooCommerce\Internal\DataStores\Orders\CustomOrdersTableController::class)) {
        $screens[] = wc_get_page_screen_id('shop-order');
    }
    foreach (array_unique($screens) as $screen) {
        add_meta_box('hel-ecpay-box', 'HOVER 綠界物流', 'hel_render_order_box', $screen, 'side', 'high');
    }
});

function hel_render_order_box($post_or_order): void
{
    $order = ($post_or_order instanceof WC_Order) ? $post_or_order : wc_get_order($post_or_order->ID ?? 0);
    if (!$order) {
        echo '<p>找不到訂單。</p>';
        return;
    }
    $id = $order->get_id();
    $kind = hel_shipping_kind($order);
    $log_id = (string) $order->get_meta('_hel_AllPayLogisticsID');
    $booking = (string) $order->get_meta('_hel_BookingNote');
    $cvs_no = (string) $order->get_meta('_hel_CVSPaymentNo');
    $cvs_val = (string) $order->get_meta('_hel_CVSValidationNo');

    if (!hel_configured()) {
        echo '<p>請先到 <a href="' . esc_url(admin_url('admin.php?page=hover-ecpay-logistics')) . '">HOVER 綠界物流</a> 填商店代號與寄件人。</p>';
        return;
    }

    echo '<p>類型：<strong>' . esc_html($kind['type'] . ' / ' . $kind['sub']) . '</strong></p>';
    if ($kind['type'] === 'CVS') {
        echo '<p>門市：' . esc_html((string) $order->get_meta('_shipping_cvs_store_name')) . '（' . esc_html($kind['store_id']) . '）</p>';
    }

    if ($log_id !== '') {
        echo '<p>綠界物流編號：<code>' . esc_html($log_id) . '</code></p>';
        if ($booking !== '') {
            echo '<p>託運單號：<code>' . esc_html($booking) . '</code></p>';
        }
        if ($cvs_no !== '') {
            echo '<p>寄貨編號：<code>' . esc_html($cvs_no) . '</code>' . ($cvs_val !== '' ? '／驗證碼 <code>' . esc_html($cvs_val) . '</code>' : '') . '</p>';
        }
        $print_url = wp_nonce_url(admin_url('admin-post.php?action=hel_print&order_id=' . $id), 'hel_print_' . $id);
        echo '<p><a class="button button-primary" target="_blank" href="' . esc_url($print_url) . '">列印託運單</a></p>';
    } else {
        $create_url = wp_nonce_url(admin_url('admin-post.php?action=hel_create&order_id=' . $id), 'hel_create_' . $id);
        echo '<p><a class="button button-primary" href="' . esc_url($create_url) . '">建立綠界物流單</a></p>';
        echo '<p class="description">請確認訂單已付款、地址／門市與手機正確。正式環境會向綠界建立真實託運。</p>';
    }
}

add_action('admin_post_hel_create', function () {
    if (!current_user_can('manage_woocommerce')) {
        wp_die('權限不足');
    }
    $order_id = absint($_GET['order_id'] ?? 0);
    if (!$order_id || !wp_verify_nonce($_GET['_wpnonce'] ?? '', 'hel_create_' . $order_id)) {
        wp_die('連結失效，請回訂單頁重試。');
    }
    $order = wc_get_order($order_id);
    if (!$order) {
        wp_die('找不到訂單');
    }
    $result = hel_create_logistics($order);
    $edit = $order->get_edit_order_url();
    if (is_wp_error($result)) {
        wp_die(esc_html($result->get_error_message()) . ' <p><a href="' . esc_url($edit) . '">返回訂單</a></p>');
    }
    wp_safe_redirect($edit);
    exit;
});

add_action('admin_post_hel_print', function () {
    if (!current_user_can('manage_woocommerce')) {
        wp_die('權限不足');
    }
    $order_id = absint($_GET['order_id'] ?? 0);
    if (!$order_id || !wp_verify_nonce($_GET['_wpnonce'] ?? '', 'hel_print_' . $order_id)) {
        wp_die('連結失效');
    }
    $order = wc_get_order($order_id);
    if (!$order) {
        wp_die('找不到訂單');
    }
    $log_id = (string) $order->get_meta('_hel_AllPayLogisticsID');
    if ($log_id === '') {
        wp_die('尚未建立物流單');
    }
    $o = hel_opts();
    $params = [
        'MerchantID' => $o['merchant_id'],
        'AllPayLogisticsID' => $log_id,
        'PrintMode' => '1',
    ];
    $params['CheckMacValue'] = hel_check_mac($params);
    $action = hel_base_url() . '/helper/printTradeDocument';
    echo '<!DOCTYPE html><html><body>';
    echo '<p>正在開啟綠界託運單…</p>';
    echo '<form id="f" method="post" action="' . esc_url($action) . '">';
    foreach ($params as $k => $v) {
        echo '<input type="hidden" name="' . esc_attr($k) . '" value="' . esc_attr((string) $v) . '">';
    }
    echo '</form><script>document.getElementById("f").submit();</script></body></html>';
    exit;
});

function hel_create_logistics(WC_Order $order)
{
    if (!hel_configured()) {
        return new WP_Error('hel', '請先完成綠界物流設定。');
    }
    if ((string) $order->get_meta('_hel_AllPayLogisticsID') !== '') {
        return new WP_Error('hel', '此訂單已建立過物流單。');
    }

    $o = hel_opts();
    $kind = hel_shipping_kind($order);
    $phone = hel_phone($order);
    if (!preg_match('/^09\d{8}$/', $phone)) {
        return new WP_Error('hel', '收件人手機需為 09 開頭 10 碼。');
    }
    $recv_name = hel_clean_name(trim($order->get_shipping_first_name() . $order->get_shipping_last_name())
        ?: trim($order->get_billing_first_name() . $order->get_billing_last_name()));
    $amount = max(1, (int) round((float) $order->get_total()));
    $trade_no = 'L' . $order->get_id() . substr((string) time(), -8);
    $date = wp_date('Y/m/d H:i:s');
    $reply = admin_url('admin-post.php?action=hel_ecpay_callback');

    $params = [
        'MerchantID' => $o['merchant_id'],
        'MerchantTradeNo' => $trade_no,
        'MerchantTradeDate' => $date,
        'LogisticsType' => $kind['type'],
        'LogisticsSubType' => $kind['sub'],
        'GoodsAmount' => (string) $amount,
        'IsCollection' => 'N',
        'GoodsName' => hel_goods_name($order),
        'SenderName' => hel_clean_name($o['sender_name']),
        'SenderCellPhone' => preg_replace('/\D+/', '', $o['sender_cell']),
        'ReceiverName' => $recv_name,
        'ReceiverCellPhone' => $phone,
        'ReceiverEmail' => (string) $order->get_billing_email(),
        'ServerReplyURL' => $reply,
        'Remark' => 'Woo#' . $order->get_id(),
    ];

    if ($kind['type'] === 'HOME') {
        $zip = (string) ($order->get_shipping_postcode() ?: $order->get_billing_postcode());
        $zip = preg_replace('/\D+/', '', $zip) ?? '';
        if (strlen($zip) < 3) {
            return new WP_Error('hel', '宅配需要收件人郵遞區號。');
        }
        $addr = hel_receiver_address($order);
        if (function_exists('mb_strlen') ? mb_strlen($addr, 'UTF-8') < 6 : strlen($addr) < 6) {
            return new WP_Error('hel', '宅配收件地址過短。');
        }
        if ($o['sender_zip'] === '' || $o['sender_address'] === '') {
            return new WP_Error('hel', '宅配請先在設定頁填寄件人郵遞區號與地址。');
        }
        $params['SenderZipCode'] = $o['sender_zip'];
        $params['SenderAddress'] = $o['sender_address'];
        $params['ReceiverZipCode'] = substr($zip, 0, 6);
        $params['ReceiverAddress'] = $addr;
        $params['Temperature'] = '0001';
        $params['Distance'] = '01';
        $params['Specification'] = $o['goods_spec'] ?: '0001';
        if ($kind['sub'] === 'TCAT') {
            $params['ScheduledPickupTime'] = '4';
            $params['ScheduledDeliveryTime'] = '4';
        }
        if ($kind['sub'] === 'POST') {
            $params['GoodsWeight'] = '1';
        }
    } else {
        if ($kind['store_id'] === '') {
            return new WP_Error('hel', '超商訂單缺少門市代號。');
        }
        $params['ReceiverStoreID'] = $kind['store_id'];
    }

    $params['CheckMacValue'] = hel_check_mac($params);

    $res = wp_remote_post(hel_base_url() . '/Express/Create', [
        'timeout' => 30,
        'headers' => ['Content-Type' => 'application/x-www-form-urlencoded'],
        'body' => $params,
    ]);
    if (is_wp_error($res)) {
        return $res;
    }
    $body = trim((string) wp_remote_retrieve_body($res));
    if ($body === '' || str_starts_with($body, '0|')) {
        $msg = $body !== '' ? substr($body, 2) : '綠界無回傳';
        if (str_contains($msg, '加密金鑰') || str_contains($msg, '開通')) {
            $msg .= '（請到綠界物流後台確認已申請此方式：7-11 交貨便、全家店到店或黑貓宅配）';
        }
        $order->add_order_note('綠界物流建立失敗：' . $msg);
        return new WP_Error('hel', '綠界回傳失敗：' . $msg);
    }

    $payload = $body;
    if (str_starts_with($body, '1|')) {
        $payload = substr($body, 2);
    }
    parse_str(str_replace(' ', '', $payload), $out);
    $log_id = (string) ($out['AllPayLogisticsID'] ?? '');
    if ($log_id === '') {
        $order->add_order_note('綠界物流回傳無法解析：' . $body);
        return new WP_Error('hel', '綠界回傳無法解析：' . $body);
    }

    $order->update_meta_data('_hel_AllPayLogisticsID', $log_id);
    $order->update_meta_data('_hel_MerchantTradeNo', (string) ($out['MerchantTradeNo'] ?? $trade_no));
    $order->update_meta_data('_hel_LogisticsSubType', $kind['sub']);
    if (!empty($out['BookingNote'])) {
        $order->update_meta_data('_hel_BookingNote', (string) $out['BookingNote']);
    }
    if (!empty($out['CVSPaymentNo'])) {
        $order->update_meta_data('_hel_CVSPaymentNo', (string) $out['CVSPaymentNo']);
    }
    if (!empty($out['CVSValidationNo'])) {
        $order->update_meta_data('_hel_CVSValidationNo', (string) $out['CVSValidationNo']);
    }
    $order->save();
    $order->add_order_note(
        '已建立綠界物流單。LogisticsID=' . $log_id
        . (!empty($out['BookingNote']) ? ' 託運單號=' . $out['BookingNote'] : '')
        . (!empty($out['CVSPaymentNo']) ? ' 寄貨編號=' . $out['CVSPaymentNo'] : '')
    );
    return true;
}

add_action('admin_post_nopriv_hel_ecpay_callback', 'hel_handle_callback');
add_action('admin_post_hel_ecpay_callback', 'hel_handle_callback');

function hel_handle_callback(): void
{
    $data = wp_unslash($_POST);
    if (!is_array($data) || empty($data['CheckMacValue'])) {
        echo '0|fail';
        exit;
    }
    $mac = (string) $data['CheckMacValue'];
    if (!hash_equals(hel_check_mac($data), $mac)) {
        echo '0|mac';
        exit;
    }
    $log_id = sanitize_text_field((string) ($data['AllPayLogisticsID'] ?? ''));
    if ($log_id === '') {
        echo '1|OK';
        exit;
    }
    $orders = wc_get_orders([
        'limit' => 1,
        'meta_key' => '_hel_AllPayLogisticsID',
        'meta_value' => $log_id,
    ]);
    if ($orders) {
        $order = $orders[0];
        $msg = sanitize_text_field((string) ($data['RtnMsg'] ?? ''));
        $code = sanitize_text_field((string) ($data['RtnCode'] ?? ''));
        $order->add_order_note('綠界物流更新：[' . $code . '] ' . $msg);
        if (!empty($data['BookingNote'])) {
            $order->update_meta_data('_hel_BookingNote', sanitize_text_field((string) $data['BookingNote']));
            $order->save();
        }
    }
    echo '1|OK';
    exit;
}
