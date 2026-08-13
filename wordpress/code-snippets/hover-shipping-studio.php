<?php
/**
 * HOVER — 運費與免運門檻（Shipping Studio）
 *
 * 使用方式（WordPress 後台）：
 * 1. Code Snippets → Add New → 貼上本檔
 * 2. Run snippet：Everywhere → 啟用
 * 3. 左側選單「HOVER 運費」
 *
 * 這是全館設定，不需在每一件商品重複填。
 * 頂部公告列文案請到「HOVER 公告列」自行修改。
 *
 * REST API（給 Next.js）：
 * GET /wp-json/hover/v1/shipping
 */

if (!defined('ABSPATH')) {
    exit;
}

if (defined('HHSS_LOADED')) {
    return;
}
define('HHSS_LOADED', true);

const HHSS_OPTION = 'hover_shipping_v1';

function hhss_can_manage(): bool
{
    return current_user_can('manage_options') || current_user_can('manage_woocommerce');
}

add_action('admin_menu', function () {
    if (!hhss_can_manage()) {
        return;
    }
    add_menu_page(
        'HOVER 運費',
        'HOVER 運費',
        'manage_woocommerce',
        'hhss',
        'hhss_render_page',
        'dashicons-car',
        59
    );
}, 99);

add_action('rest_api_init', function () {
    register_rest_route('hover/v1', '/shipping', [
        'methods'             => 'GET',
        'callback'            => 'hhss_rest_shipping',
        'permission_callback' => '__return_true',
    ]);
});

function hhss_defaults(): array
{
    return [
        'enabled'           => true,
        'homeDeliveryFee'   => 105,
        'cvsFee'            => 0,
        'freeShipThreshold' => 1500,
    ];
}

function hhss_money($raw, int $fallback): int
{
    if ($raw === '' || $raw === null) {
        return $fallback;
    }
    $n = (int) round((float) $raw);
    return max(0, min(999999, $n));
}

function hhss_normalize(array $data): array
{
    $d = hhss_defaults();
    return [
        'enabled'           => !isset($data['enabled']) || !empty($data['enabled']),
        'homeDeliveryFee'   => hhss_money($data['homeDeliveryFee'] ?? $d['homeDeliveryFee'], $d['homeDeliveryFee']),
        'cvsFee'            => hhss_money($data['cvsFee'] ?? $d['cvsFee'], $d['cvsFee']),
        'freeShipThreshold' => hhss_money($data['freeShipThreshold'] ?? $d['freeShipThreshold'], $d['freeShipThreshold']),
    ];
}

function hhss_get_settings(): array
{
    $saved = get_option(HHSS_OPTION, []);
    if (!is_array($saved)) {
        $saved = [];
    }
    return hhss_normalize(array_replace(hhss_defaults(), $saved));
}

function hhss_save_from_post(): ?array
{
    if ($_SERVER['REQUEST_METHOD'] !== 'POST' || empty($_POST['hhss_act'])) {
        return null;
    }
    if (!wp_verify_nonce($_POST['hhss_nonce'] ?? '', 'hhss_save')) {
        return ['ok' => false, 'msg' => '安全驗證失敗，請重新整理後再試。'];
    }
    if (!hhss_can_manage()) {
        return ['ok' => false, 'msg' => '權限不足。'];
    }

    $act = sanitize_text_field($_POST['hhss_act']);
    if ($act === 'reset') {
        delete_option(HHSS_OPTION);
        return ['ok' => true, 'msg' => '已還原為預設運費設定。'];
    }
    if ($act !== 'save') {
        return null;
    }

    update_option(HHSS_OPTION, hhss_normalize([
        'enabled'           => !empty($_POST['hhss_enabled']),
        'homeDeliveryFee'   => $_POST['hhss_homeDeliveryFee'] ?? null,
        'cvsFee'            => $_POST['hhss_cvsFee'] ?? null,
        'freeShipThreshold' => $_POST['hhss_freeShipThreshold'] ?? null,
    ]), false);

    return ['ok' => true, 'msg' => '運費設定已儲存。'];
}

function hhss_rest_shipping(): WP_REST_Response
{
    $s = hhss_get_settings();
    return new WP_REST_Response([
        'ok'       => true,
        'shipping' => $s,
    ], 200);
}

function hhss_render_page(): void
{
    if (!hhss_can_manage()) {
        wp_die('權限不足');
    }

    $flash = hhss_save_from_post();
    $s = hhss_get_settings();
    $api_url = rest_url('hover/v1/shipping');
    ?>
    <div class="wrap hover-ship-admin">
        <div class="hhss-shell">
            <div class="hhss-topbar">
                <div>
                    <h1>HOVER 運費</h1>
                    <p class="description">全館運費與免運門檻，購物車／結帳會依此計算。不需在每一件商品重複設定。</p>
                </div>
                <div class="hhss-topbar-actions">
                    <span class="hhss-status <?php echo !empty($s['enabled']) ? 'is-live' : ''; ?>">
                        <?php
                        echo !empty($s['enabled'])
                            ? sprintf(
                                '上線中 · 宅配 NT$%s／超商 NT$%s · 滿 NT$%s 免運',
                                number_format_i18n($s['homeDeliveryFee']),
                                number_format_i18n($s['cvsFee']),
                                number_format_i18n($s['freeShipThreshold'])
                            )
                            : '未啟用（前台沿用程式預設）';
                        ?>
                    </span>
                    <button type="submit" form="hhss-form" class="button button-primary button-hero">儲存設定</button>
                </div>
            </div>

            <?php if ($flash) : ?>
                <div class="notice <?php echo $flash['ok'] ? 'notice-success' : 'notice-error'; ?> is-dismissible">
                    <p><?php echo esc_html($flash['msg']); ?></p>
                </div>
            <?php endif; ?>

            <div class="hhss-api-pill">
                <span class="dashicons dashicons-rest-api"></span>
                <span>REST API</span>
                <code><?php echo esc_html($api_url); ?></code>
            </div>

            <form id="hhss-form" method="post">
                <?php wp_nonce_field('hhss_save', 'hhss_nonce'); ?>
                <input type="hidden" name="hhss_act" value="save">

                <div class="hhss-card">
                    <div class="hhss-card-head"><h2>整體設定</h2></div>
                    <div class="hhss-card-body">
                        <label class="hhss-switch">
                            <input type="checkbox" name="hhss_enabled" value="1" <?php checked(!empty($s['enabled'])); ?>>
                            <span class="hhss-switch-ui"></span>
                            <span class="hhss-switch-label">啟用自訂運費（關閉則前台使用程式預設）</span>
                        </label>
                    </div>
                </div>

                <div class="hhss-card">
                    <div class="hhss-card-head"><h2>運費金額</h2></div>
                    <div class="hhss-card-body hhss-grid-2">
                        <div class="hhss-field">
                            <label class="hhss-label" for="hhss_homeDeliveryFee">宅配運費（NT$）</label>
                            <input type="number" min="0" step="1" id="hhss_homeDeliveryFee" name="hhss_homeDeliveryFee" class="regular-text" value="<?php echo esc_attr((string) $s['homeDeliveryFee']); ?>">
                            <p class="description">結帳選擇「宅配」時收取。</p>
                        </div>
                        <div class="hhss-field">
                            <label class="hhss-label" for="hhss_cvsFee">超商取貨運費（NT$）</label>
                            <input type="number" min="0" step="1" id="hhss_cvsFee" name="hhss_cvsFee" class="regular-text" value="<?php echo esc_attr((string) $s['cvsFee']); ?>">
                            <p class="description">7-11／全家／萊爾富／OK。填 0 表示超商免運費。</p>
                        </div>
                    </div>
                </div>

                <div class="hhss-card">
                    <div class="hhss-card-head"><h2>免運門檻</h2></div>
                    <div class="hhss-card-body hhss-grid-2">
                        <div class="hhss-field">
                            <label class="hhss-label" for="hhss_freeShipThreshold">單筆滿額免運（NT$）</label>
                            <input type="number" min="0" step="1" id="hhss_freeShipThreshold" name="hhss_freeShipThreshold" class="regular-text" value="<?php echo esc_attr((string) $s['freeShipThreshold']); ?>">
                            <p class="description">以折抵後小計計算。達到此金額則宅配／超商運費皆為 0。</p>
                        </div>
                        <div class="hhss-hint">
                            <p><strong>預覽文案</strong></p>
                            <p>全館滿 NT$<?php echo esc_html(number_format_i18n($s['freeShipThreshold'])); ?> 享免運</p>
                            <p class="description" style="margin-top:8px">頂部公告列不會自動改字，請到「HOVER 公告列」同步修改文案。</p>
                        </div>
                    </div>
                </div>
            </form>

            <form method="post" class="hhss-reset-form" onsubmit="return confirm('確定還原為預設運費？');">
                <?php wp_nonce_field('hhss_save', 'hhss_nonce'); ?>
                <input type="hidden" name="hhss_act" value="reset">
                <button type="submit" class="button">還原預設</button>
            </form>
        </div>
    </div>
    <style>
        .hover-ship-admin .hhss-shell { margin-top: 8px; max-width: 860px; }
        .hover-ship-admin .hhss-topbar { display:flex; align-items:flex-start; justify-content:space-between; gap:16px; margin-bottom:16px; }
        .hover-ship-admin .hhss-topbar h1 { margin:0 0 6px; }
        .hover-ship-admin .hhss-topbar-actions { display:flex; gap:10px; align-items:center; flex-shrink:0; }
        .hover-ship-admin .hhss-status { display:inline-flex; align-items:center; gap:6px; padding:6px 12px; border-radius:999px; font-size:12px; font-weight:600; background:#f0f0f1; color:#646970; }
        .hover-ship-admin .hhss-status.is-live { background:#edf7f1; color:#1a6847; }
        .hover-ship-admin .hhss-status.is-live::before { content:""; width:8px; height:8px; border-radius:50%; background:#2a514d; }
        .hover-ship-admin .hhss-api-pill { display:inline-flex; align-items:center; gap:8px; background:#fff; border:1px solid #dcdcde; border-radius:999px; padding:8px 14px; margin-bottom:16px; font-size:12px; color:#646970; }
        .hover-ship-admin .hhss-api-pill code { font-size:11px; background:#f6f7f7; padding:2px 8px; border-radius:999px; }
        .hover-ship-admin .hhss-card { background:#fff; border:1px solid #dcdcde; border-radius:8px; box-shadow:0 1px 2px rgba(0,0,0,.04); overflow:hidden; margin-bottom:16px; }
        .hover-ship-admin .hhss-card-head { padding:14px 18px; border-bottom:1px solid #f0f0f1; }
        .hover-ship-admin .hhss-card-head h2 { margin:0; font-size:14px; font-weight:700; }
        .hover-ship-admin .hhss-card-body { padding:18px; }
        .hover-ship-admin .hhss-grid-2 { display:grid; grid-template-columns:1fr 1fr; gap:16px; }
        .hover-ship-admin .hhss-field { display:flex; flex-direction:column; gap:6px; }
        .hover-ship-admin .hhss-label { font-weight:600; font-size:13px; }
        .hover-ship-admin .hhss-hint { background:#f6f7f7; border-radius:8px; padding:14px 16px; }
        .hover-ship-admin .hhss-hint p { margin:0 0 6px; }
        .hover-ship-admin .hhss-switch { display:inline-flex; align-items:center; gap:12px; cursor:pointer; user-select:none; }
        .hover-ship-admin .hhss-switch input { position:absolute; opacity:0; pointer-events:none; }
        .hover-ship-admin .hhss-switch-ui { width:44px; height:24px; border-radius:999px; background:#c3c4c7; position:relative; transition:.2s; }
        .hover-ship-admin .hhss-switch-ui::after { content:""; position:absolute; top:3px; left:3px; width:18px; height:18px; border-radius:50%; background:#fff; transition:.2s; box-shadow:0 1px 3px rgba(0,0,0,.2); }
        .hover-ship-admin .hhss-switch input:checked + .hhss-switch-ui { background:#2a514d; }
        .hover-ship-admin .hhss-switch input:checked + .hhss-switch-ui::after { transform:translateX(20px); }
        .hover-ship-admin .hhss-switch-label { font-weight:600; font-size:13px; }
        .hover-ship-admin .hhss-reset-form { margin-top:8px; }
        @media (max-width: 782px) {
            .hover-ship-admin .hhss-topbar, .hover-ship-admin .hhss-grid-2 { display:block; }
            .hover-ship-admin .hhss-topbar-actions { margin-top:12px; }
        }
    </style>
    <?php
}
