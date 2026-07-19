<?php
/**
 * HOVER — 首頁分類格（Category Grid Studio）
 *
 * 使用方式（WordPress 後台）：
 * 1. Code Snippets → Add New → 貼上本檔
 * 2. Run snippet：Everywhere → 啟用
 * 3. 左側選單「HOVER 分類格」
 *
 * 特色：
 * - 選圖後「強制」跳出 482:554 直式裁切框（與前端設計比例一致，無法跳過）
 * - 每格可設定分類名稱、主打文字（僅建議第一格）、點擊連結
 *
 * REST API（給 Next.js）：
 * GET /wp-json/hover/v1/category-grid
 */

if (!defined('ABSPATH')) {
    exit;
}

if (defined('HCGS_LOADED')) {
    return;
}
define('HCGS_LOADED', true);

const HCGS_OPTION = 'hover_category_grid_v1';
const HCGS_MAX_TILES = 8;

add_action('admin_menu', function () {
    if (!current_user_can('manage_options')) {
        return;
    }
    add_menu_page(
        'HOVER 分類格',
        'HOVER 分類格',
        'manage_options',
        'hcgs',
        'hcgs_render_page',
        'dashicons-screenoptions',
        58
    );
}, 99);

add_action('admin_enqueue_scripts', function ($hook) {
    if ($hook !== 'toplevel_page_hcgs') {
        return;
    }
    wp_enqueue_media();
});

add_action('admin_footer', 'hcgs_admin_footer_script');

add_action('rest_api_init', function () {
    register_rest_route('hover/v1', '/category-grid', [
        'methods'             => 'GET',
        'callback'            => 'hcgs_rest_category_grid',
        'permission_callback' => '__return_true',
    ]);
});

function hcgs_default_tile(string $id = 'category-1'): array
{
    return [
        'id'       => $id,
        'enabled'  => true,
        'label'    => 'CATEGORY',
        'heroText' => '',
        'href'     => '/products',
        'image'    => [
            'url' => '',
            'alt' => 'HOVER category',
        ],
    ];
}

function hcgs_defaults(): array
{
    return [
        'enabled' => true,
        'version' => '1',
        'tiles'   => [hcgs_default_tile()],
    ];
}

function hcgs_sanitize_url(string $url): string
{
    $url = trim($url);
    if ($url === '' || $url === '#') {
        return $url;
    }
    if (str_starts_with($url, '/')) {
        return sanitize_text_field($url);
    }
    return esc_url_raw($url);
}

function hcgs_normalize_tile(array $tile, int $index): array
{
    $d = hcgs_default_tile('category-' . ($index + 1));

    $image = $tile['image'] ?? [];

    return [
        'id'       => sanitize_text_field($tile['id'] ?? $d['id']) ?: $d['id'],
        'enabled'  => !isset($tile['enabled']) || !empty($tile['enabled']),
        'label'    => sanitize_text_field($tile['label'] ?? $d['label']) ?: $d['label'],
        'heroText' => sanitize_textarea_field($tile['heroText'] ?? ''),
        'href'     => hcgs_sanitize_url($tile['href'] ?? $d['href']) ?: $d['href'],
        'image'    => [
            'url' => esc_url_raw($image['url'] ?? ''),
            'alt' => sanitize_text_field($image['alt'] ?? $d['image']['alt']) ?: $d['image']['alt'],
        ],
    ];
}

function hcgs_normalize(array $data): array
{
    $d = hcgs_defaults();

    $data['enabled'] = !empty($data['enabled']);
    $data['version'] = sanitize_text_field($data['version'] ?? $d['version']) ?: $d['version'];

    $tiles = [];
    if (!empty($data['tiles']) && is_array($data['tiles'])) {
        foreach ($data['tiles'] as $i => $tile) {
            if (!is_array($tile) || count($tiles) >= HCGS_MAX_TILES) {
                continue;
            }
            $normalized = hcgs_normalize_tile($tile, $i);
            if ($normalized['image']['url'] !== '') {
                $tiles[] = $normalized;
            }
        }
    }

    $data['tiles'] = $tiles ?: $d['tiles'];

    return $data;
}

function hcgs_get_settings(): array
{
    $saved = get_option(HCGS_OPTION, []);
    if (!is_array($saved)) {
        $saved = [];
    }
    return hcgs_normalize(array_replace_recursive(hcgs_defaults(), $saved));
}

function hcgs_save_from_post(): ?array
{
    if ($_SERVER['REQUEST_METHOD'] !== 'POST' || empty($_POST['hcgs_act'])) {
        return null;
    }
    if (!wp_verify_nonce($_POST['hcgs_nonce'] ?? '', 'hcgs_save')) {
        return ['ok' => false, 'msg' => '安全驗證失敗，請重新整理後再試。'];
    }
    if (!current_user_can('manage_options')) {
        return ['ok' => false, 'msg' => '權限不足。'];
    }

    $act = sanitize_text_field($_POST['hcgs_act']);
    if ($act === 'reset') {
        delete_option(HCGS_OPTION);
        return ['ok' => true, 'msg' => '已還原為預設設定。'];
    }

    if ($act !== 'save') {
        return null;
    }

    $raw = json_decode(wp_unslash($_POST['hcgs_payload'] ?? ''), true);
    if (!is_array($raw)) {
        return ['ok' => false, 'msg' => '資料格式錯誤。'];
    }

    $normalized = hcgs_normalize($raw);
    update_option(HCGS_OPTION, $normalized, false);

    return ['ok' => true, 'msg' => '分類格已儲存。'];
}

function hcgs_rest_category_grid(): WP_REST_Response
{
    return new WP_REST_Response([
        'ok'           => true,
        'categoryGrid' => hcgs_get_settings(),
    ], 200);
}

function hcgs_active_count(array $s): int
{
    $n = 0;
    foreach ($s['tiles'] as $tile) {
        if (!empty($tile['enabled']) && !empty($tile['image']['url'])) {
            $n++;
        }
    }
    return $n;
}

function hcgs_render_page(): void
{
    if (!current_user_can('manage_options')) {
        wp_die('權限不足');
    }

    $flash = hcgs_save_from_post();
    $s = hcgs_get_settings();
    $api_url = rest_url('hover/v1/category-grid');
    $active_n = hcgs_active_count($s);
    ?>
    <div class="wrap hover-cg-admin">
        <div class="hcgs-shell">
            <div class="hcgs-topbar">
                <div>
                    <h1>HOVER 分類格</h1>
                    <p class="description">管理首頁分類格（TOPS / HEADWEARS / SOCKS / BAGS…）。選圖後將強制裁切為 482:554 直式比例，儲存後約 1 分鐘內同步至 Next.js。</p>
                </div>
                <div class="hcgs-topbar-actions">
                    <span class="hcgs-status <?php echo !empty($s['enabled']) && $active_n ? 'is-live' : ''; ?>">
                        <?php echo !empty($s['enabled']) && $active_n ? "上線中 · {$active_n} 格" : '未上線'; ?>
                    </span>
                    <button type="submit" form="hcgs-form" class="button button-primary button-hero">儲存設定</button>
                </div>
            </div>

            <?php if ($flash) : ?>
                <div class="notice <?php echo $flash['ok'] ? 'notice-success' : 'notice-error'; ?> is-dismissible">
                    <p><?php echo esc_html($flash['msg']); ?></p>
                </div>
            <?php endif; ?>

            <div class="hcgs-api-pill">
                <span class="dashicons dashicons-rest-api"></span>
                <span>REST API</span>
                <code><?php echo esc_html($api_url); ?></code>
            </div>

            <form id="hcgs-form" method="post">
                <?php wp_nonce_field('hcgs_save', 'hcgs_nonce'); ?>
                <input type="hidden" name="hcgs_act" value="save">
                <input type="hidden" name="hcgs_payload" id="hcgs-payload" value="">

                <div class="hcgs-layout">
                    <div class="hcgs-main">
                        <div class="hcgs-card">
                            <div class="hcgs-card-head"><h2>整體設定</h2></div>
                            <div class="hcgs-card-body hcgs-grid-2">
                                <label class="hcgs-switch hcgs-span-2">
                                    <input type="checkbox" data-field="enabled" <?php checked(!empty($s['enabled'])); ?>>
                                    <span class="hcgs-switch-ui"></span>
                                    <span class="hcgs-switch-label">啟用分類格</span>
                                </label>
                                <div class="hcgs-field">
                                    <label class="hcgs-label">版本代號</label>
                                    <input type="text" class="regular-text" data-field="version" value="<?php echo esc_attr($s['version']); ?>">
                                    <p class="description">變更代號可協助追蹤不同版次內容。</p>
                                </div>
                            </div>
                        </div>

                        <div class="hcgs-card">
                            <div class="hcgs-card-head">
                                <div>
                                    <h2>分類格（482:554 直式）</h2>
                                    <p class="description" style="margin:4px 0 0">前端桌機一排 4 格、手機一排 2 格，建議設定 4 格。建議上傳 964×1108 以上；選圖後將跳出強制裁切框。</p>
                                </div>
                                <button type="button" class="button button-secondary" id="hcgs-add-tile">＋ 新增一格</button>
                            </div>
                            <div class="hcgs-card-body">
                                <div id="hcgs-tiles-list" class="hcgs-tiles"></div>
                                <p class="description hcgs-empty-hint">至少需一格有圖片才會在前台顯示，最多 <?php echo (int) HCGS_MAX_TILES; ?> 格。</p>
                            </div>
                        </div>
                    </div>

                    <aside class="hcgs-preview">
                        <div class="hcgs-card hcgs-preview-card">
                            <div class="hcgs-card-head">
                                <div>
                                    <h2>即時預覽</h2>
                                    <p class="description" style="margin:4px 0 0">模擬前台一排 4 格</p>
                                </div>
                            </div>
                            <div class="hcgs-preview-body">
                                <div class="hcgs-mock-grid" id="hcgs-live-preview"></div>
                            </div>
                        </div>
                    </aside>
                </div>
            </form>

            <form method="post" class="hcgs-reset-form" onsubmit="return confirm('確定還原為預設設定？');">
                <?php wp_nonce_field('hcgs_save', 'hcgs_nonce'); ?>
                <input type="hidden" name="hcgs_act" value="reset">
                <button type="submit" class="button">還原預設</button>
            </form>
        </div>
    </div>
    <?php
    hcgs_print_admin_styles();
}

function hcgs_print_admin_styles(): void
{
    ?>
    <style>
        .hover-cg-admin .hcgs-shell { margin-top: 8px; max-width: 1180px; }
        .hover-cg-admin .hcgs-topbar {
            display: flex; align-items: flex-start; justify-content: space-between;
            gap: 16px; margin-bottom: 16px;
        }
        .hover-cg-admin .hcgs-topbar h1 { margin: 0 0 6px; }
        .hover-cg-admin .hcgs-topbar-actions {
            display: flex; gap: 10px; align-items: center; flex-shrink: 0;
        }
        .hover-cg-admin .hcgs-status {
            display: inline-flex; align-items: center; gap: 6px;
            padding: 6px 12px; border-radius: 999px; font-size: 12px; font-weight: 600;
            background: #f0f0f1; color: #646970;
        }
        .hover-cg-admin .hcgs-status.is-live { background: #edf7f1; color: #1a6847; }
        .hover-cg-admin .hcgs-status.is-live::before {
            content: ""; width: 8px; height: 8px; border-radius: 50%; background: #2a514d;
        }
        .hover-cg-admin .hcgs-api-pill {
            display: inline-flex; align-items: center; gap: 8px;
            background: #fff; border: 1px solid #dcdcde; border-radius: 999px;
            padding: 8px 14px; margin-bottom: 16px; font-size: 12px; color: #646970;
        }
        .hover-cg-admin .hcgs-api-pill code {
            font-size: 11px; background: #f6f7f7; padding: 2px 8px; border-radius: 999px;
        }
        .hover-cg-admin .hcgs-layout {
            display: grid; grid-template-columns: minmax(0, 1fr) 380px; gap: 16px; align-items: start;
        }
        .hover-cg-admin .hcgs-card {
            background: #fff; border: 1px solid #dcdcde; border-radius: 8px;
            box-shadow: 0 1px 2px rgba(0,0,0,.04); overflow: hidden; margin-bottom: 16px;
        }
        .hover-cg-admin .hcgs-card-head {
            display: flex; align-items: center; justify-content: space-between; gap: 10px;
            padding: 14px 18px; border-bottom: 1px solid #f0f0f1;
        }
        .hover-cg-admin .hcgs-card-head h2 { margin: 0; font-size: 14px; font-weight: 700; }
        .hover-cg-admin .hcgs-card-body { padding: 18px; }
        .hover-cg-admin .hcgs-grid-2 {
            display: grid; grid-template-columns: 1fr 1fr; gap: 14px 16px;
        }
        .hover-cg-admin .hcgs-span-2 { grid-column: 1 / -1; }
        .hover-cg-admin .hcgs-field { display: flex; flex-direction: column; gap: 6px; }
        .hover-cg-admin .hcgs-label { font-weight: 600; font-size: 13px; }
        .hover-cg-admin .hcgs-switch {
            display: inline-flex; align-items: center; gap: 12px; cursor: pointer; user-select: none;
        }
        .hover-cg-admin .hcgs-switch input { position: absolute; opacity: 0; pointer-events: none; }
        .hover-cg-admin .hcgs-switch-ui {
            width: 44px; height: 24px; border-radius: 999px; background: #c3c4c7; position: relative; transition: .2s;
        }
        .hover-cg-admin .hcgs-switch-ui::after {
            content: ""; position: absolute; top: 3px; left: 3px; width: 18px; height: 18px;
            border-radius: 50%; background: #fff; transition: .2s; box-shadow: 0 1px 3px rgba(0,0,0,.2);
        }
        .hover-cg-admin .hcgs-switch input:checked + .hcgs-switch-ui { background: #2a514d; }
        .hover-cg-admin .hcgs-switch input:checked + .hcgs-switch-ui::after { transform: translateX(20px); }
        .hover-cg-admin .hcgs-switch-label { font-weight: 600; font-size: 13px; }
        .hover-cg-admin .hcgs-tiles { display: flex; flex-direction: column; gap: 14px; }
        .hover-cg-admin .hcgs-tile {
            border: 1px solid #dcdcde; border-radius: 8px; background: #fcfcfd; overflow: hidden;
        }
        .hover-cg-admin .hcgs-tile-head {
            display: flex; align-items: center; justify-content: space-between; gap: 8px;
            padding: 10px 14px; background: #f6f7f7; border-bottom: 1px solid #eef2f6;
        }
        .hover-cg-admin .hcgs-tile-title { font-size: 13px; font-weight: 700; color: #202223; }
        .hover-cg-admin .hcgs-tile-actions { display: flex; gap: 4px; flex-wrap: wrap; }
        .hover-cg-admin .hcgs-tile-body {
            display: grid; grid-template-columns: 150px 1fr; gap: 14px; padding: 14px;
        }
        .hover-cg-admin .hcgs-thumb {
            aspect-ratio: 482/554; border-radius: 6px; border: 1px dashed #c3c4c7;
            background: #f6f7f7; overflow: hidden; display: flex; align-items: center; justify-content: center;
        }
        .hover-cg-admin .hcgs-thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }
        .hover-cg-admin .hcgs-thumb-empty { font-size: 11px; color: #646970; text-align: center; padding: 8px; }
        .hover-cg-admin .hcgs-ratio-badge {
            display: inline-flex; align-items: center; gap: 4px;
            font-size: 11px; font-weight: 600; color: #1a6847; background: #edf7f1;
            border-radius: 999px; padding: 2px 8px;
        }
        .hover-cg-admin .hcgs-tile-fields { display: grid; grid-template-columns: 1fr 1fr; gap: 10px 12px; align-content: start; }
        .hover-cg-admin .hcgs-tile-fields .hcgs-field.full { grid-column: 1 / -1; }
        .hover-cg-admin .hcgs-media-actions { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 6px; align-items: center; }
        .hover-cg-admin .hcgs-preview { position: sticky; top: 32px; }
        .hover-cg-admin .hcgs-preview-body { padding: 16px; background: #eef2f6; }
        .hover-cg-admin .hcgs-mock-grid {
            display: grid; grid-template-columns: repeat(4, 1fr); gap: 0;
            border-radius: 6px; overflow: hidden; background: #ddd;
        }
        .hover-cg-admin .hcgs-mock-tile {
            position: relative; aspect-ratio: 482/554; overflow: hidden; background: #cfcfcf;
        }
        .hover-cg-admin .hcgs-mock-tile img { width: 100%; height: 100%; object-fit: cover; display: block; }
        .hover-cg-admin .hcgs-mock-tile::after {
            content: ""; position: absolute; inset: 0; background: rgba(0,0,0,.2);
        }
        .hover-cg-admin .hcgs-mock-hero {
            position: absolute; left: 6px; top: 8px; z-index: 1;
            color: #fff; font-size: 8px; font-weight: 800; line-height: 1.3;
            white-space: pre-line; text-shadow: 0 1px 4px rgba(0,0,0,.4);
        }
        .hover-cg-admin .hcgs-mock-label {
            position: absolute; left: 50%; bottom: 8px; transform: translateX(-50%); z-index: 1;
            color: #fff; font-size: 7px; font-weight: 700; letter-spacing: .14em;
            text-shadow: 0 1px 4px rgba(0,0,0,.4); text-align: center; width: 100%;
        }
        .hover-cg-admin .hcgs-mock-label::after {
            content: ""; display: block; width: 22px; height: 1px; background: #fff; margin: 3px auto 0;
        }
        .hover-cg-admin .hcgs-reset-form { margin-top: 8px; }
        .hover-cg-admin .hcgs-empty-hint { margin: 10px 0 0; }
        @media (max-width: 960px) {
            .hover-cg-admin .hcgs-layout { grid-template-columns: 1fr; }
            .hover-cg-admin .hcgs-preview { position: static; }
            .hover-cg-admin .hcgs-grid-2,
            .hover-cg-admin .hcgs-tile-body,
            .hover-cg-admin .hcgs-tile-fields { grid-template-columns: 1fr; }
        }
    </style>
    <?php
}

function hcgs_admin_footer_script(): void
{
    $screen = function_exists('get_current_screen') ? get_current_screen() : null;
    if (!$screen || $screen->id !== 'toplevel_page_hcgs') {
        return;
    }

    $s = hcgs_get_settings();
    ?>
    <script>
    jQuery(function($){
        var RATIO = 482 / 554; // 前端 aspectRatio: "482 / 554"
        var MAX_TILES = <?php echo (int) HCGS_MAX_TILES; ?>;
        var state = <?php echo wp_json_encode($s, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES); ?>;

        function esc(s){ return $('<div/>').text(s || '').html(); }

        function newTile(){
            return {
                id: 'category-' + Date.now(),
                enabled: true,
                label: 'CATEGORY',
                heroText: '',
                href: '/products',
                image: { url: '', alt: 'HOVER category' }
            };
        }

        function activeTiles(){
            if (!state.enabled) return [];
            return (state.tiles || []).filter(function(t){
                return t.enabled && t.image && t.image.url;
            });
        }

        /* ─── 強制 482:554 裁切框 ─────────────────────────── */

        function imgSelectOptions(attachment, controller){
            var w = attachment.get('width');
            var h = attachment.get('height');

            var selW = w;
            var selH = Math.round(w / RATIO);
            if (selH > h) {
                selH = h;
                selW = Math.round(h * RATIO);
            }
            var x1 = Math.round((w - selW) / 2);
            var y1 = Math.round((h - selH) / 2);

            controller.set('canSkipCrop', false); // 不允許跳過裁切

            return {
                handles: true,
                keys: true,
                instance: true,
                persistent: true,
                imageWidth: w,
                imageHeight: h,
                aspectRatio: '482:554',
                minWidth: Math.min(241, selW),
                minHeight: Math.min(277, selH),
                x1: x1,
                y1: y1,
                x2: x1 + selW,
                y2: y1 + selH
            };
        }

        var HcgsCropper = wp.media.controller.Cropper.extend({
            doCrop: function(attachment){
                var cd = attachment.get('cropDetails');
                var cropW = cd.width || (cd.x2 - cd.x1);
                var dstW = Math.min(1200, cropW); // 過大時縮到 1200 寬（約 2.5x 顯示尺寸）
                cd.dst_width  = dstW;
                cd.dst_height = Math.round(dstW / RATIO);
                return wp.ajax.post('crop-image', {
                    nonce: attachment.get('nonces').edit,
                    id: attachment.get('id'),
                    context: 'hover-category-grid',
                    cropDetails: cd
                });
            }
        });

        function openCropFrame(i){
            if (typeof wp === 'undefined' || !wp.media) {
                alert('媒體庫尚未載入，請重新整理頁面後再試。');
                return;
            }

            var frame = wp.media({
                button: { text: '下一步：裁切 482:554', close: false },
                states: [
                    new wp.media.controller.Library({
                        title: '選擇圖片（將強制裁切為 482:554，建議 964×1108 以上）',
                        library: wp.media.query({ type: 'image' }),
                        multiple: false,
                        date: false,
                        suggestedWidth: 964,
                        suggestedHeight: 1108
                    }),
                    new HcgsCropper({ imgSelectOptions: imgSelectOptions })
                ]
            });

            frame.on('select', function(){
                frame.setState('cropper');
            });

            frame.on('cropped', function(cropped){
                if (cropped && cropped.url) {
                    state.tiles[i].image.url = cropped.url;
                    renderTiles();
                }
                frame.close();
            });

            frame.open();
        }

        /* ─── Render ──────────────────────────────────────── */

        function renderTiles(){
            var $list = $('#hcgs-tiles-list').empty();
            if (!state.tiles || !state.tiles.length) {
                state.tiles = [newTile()];
            }

            state.tiles.forEach(function(tile, i){
                var thumb = tile.image && tile.image.url
                    ? '<img src="'+esc(tile.image.url)+'" alt="">'
                    : '<div class="hcgs-thumb-empty">尚未選圖<br>（482:554）</div>';

                var html = '<div class="hcgs-tile" data-index="'+i+'">';
                html += '<div class="hcgs-tile-head">';
                html += '<span class="hcgs-tile-title">第 '+(i+1)+' 格　'+esc(tile.label)+'</span>';
                html += '<div class="hcgs-tile-actions">';
                html += '<button type="button" class="button button-small hcgs-move" data-dir="-1"'+(i===0?' disabled':'')+'>↑</button>';
                html += '<button type="button" class="button button-small hcgs-move" data-dir="1"'+(i===state.tiles.length-1?' disabled':'')+'>↓</button>';
                html += '<button type="button" class="button button-small hcgs-remove"'+(state.tiles.length<=1?' disabled':'')+'>刪除</button>';
                html += '</div></div>';
                html += '<div class="hcgs-tile-body">';
                html += '<div><div class="hcgs-thumb" data-thumb="'+i+'">'+thumb+'</div>';
                html += '<div class="hcgs-media-actions">';
                html += '<button type="button" class="button button-primary button-small hcgs-pick" data-index="'+i+'">選圖並裁切</button>';
                html += '<button type="button" class="button button-small hcgs-clear" data-index="'+i+'">清除</button>';
                if (tile.image && tile.image.url) {
                    html += '<span class="hcgs-ratio-badge">✓ 482:554</span>';
                }
                html += '</div></div>';
                html += '<div class="hcgs-tile-fields">';
                html += '<label class="hcgs-switch full"><input type="checkbox" class="hcgs-enabled" data-index="'+i+'"'+(tile.enabled?' checked':'')+'>';
                html += '<span class="hcgs-switch-ui"></span><span class="hcgs-switch-label">啟用此格</span></label>';
                html += '<div class="hcgs-field"><label class="hcgs-label">分類名稱（底部白字）</label>';
                html += '<input type="text" class="regular-text hcgs-tile-label" data-index="'+i+'" value="'+esc(tile.label)+'" placeholder="TOPS"></div>';
                html += '<div class="hcgs-field"><label class="hcgs-label">點擊連結</label>';
                html += '<input type="text" class="regular-text hcgs-href" data-index="'+i+'" value="'+esc(tile.href)+'" placeholder="/products?category=tops"></div>';
                html += '<div class="hcgs-field full"><label class="hcgs-label">主打文字（左上角，可換行，留空不顯示）</label>';
                html += '<textarea rows="2" class="hcgs-hero-text" data-index="'+i+'" placeholder="ALL BLACK&#10;COLLECTION">'+esc(tile.heroText)+'</textarea></div>';
                html += '<div class="hcgs-field full"><label class="hcgs-label">圖片替代文字（SEO）</label>';
                html += '<input type="text" class="regular-text hcgs-alt" data-index="'+i+'" value="'+esc(tile.image.alt)+'"></div>';
                html += '</div></div></div>';

                $list.append(html);
            });

            $('#hcgs-add-tile').prop('disabled', state.tiles.length >= MAX_TILES);

            renderPreview();
        }

        function syncTopFields(){
            $('[data-field]').each(function(){
                var el = $(this);
                var key = el.data('field');
                state[key] = el.is(':checkbox') ? el.is(':checked') : el.val();
            });
        }

        function renderPreview(){
            syncTopFields();

            var tiles = activeTiles();
            if (!tiles.length) {
                $('#hcgs-live-preview').html('<div style="grid-column:1/-1;display:flex;align-items:center;justify-content:center;height:120px;color:#646970;font-size:12px;background:#eef2f6">尚無啟用中的分類格</div>');
                return;
            }

            var html = '';
            tiles.forEach(function(tile){
                html += '<div class="hcgs-mock-tile">';
                html += '<img src="'+esc(tile.image.url)+'" alt="">';
                if (tile.heroText) {
                    html += '<div class="hcgs-mock-hero">'+esc(tile.heroText)+'</div>';
                }
                html += '<div class="hcgs-mock-label">'+esc(tile.label)+'</div>';
                html += '</div>';
            });
            $('#hcgs-live-preview').html(html);
        }

        /* ─── Events ──────────────────────────────────────── */

        $(document).on('click', '#hcgs-add-tile', function(){
            if (state.tiles.length >= MAX_TILES) return;
            state.tiles.push(newTile());
            renderTiles();
        });

        $(document).on('click', '.hcgs-remove', function(){
            var i = $(this).closest('.hcgs-tile').data('index');
            if (state.tiles.length <= 1) return;
            state.tiles.splice(i, 1);
            renderTiles();
        });

        $(document).on('click', '.hcgs-move', function(){
            var i = $(this).closest('.hcgs-tile').data('index');
            var dir = parseInt($(this).data('dir'), 10);
            var j = i + dir;
            if (j < 0 || j >= state.tiles.length) return;
            var tmp = state.tiles[i];
            state.tiles[i] = state.tiles[j];
            state.tiles[j] = tmp;
            renderTiles();
        });

        $(document).on('click', '.hcgs-pick', function(){
            openCropFrame($(this).data('index'));
        });

        $(document).on('click', '.hcgs-clear', function(){
            state.tiles[$(this).data('index')].image.url = '';
            renderTiles();
        });

        $(document).on('input change', '.hcgs-tile-label', function(){
            state.tiles[$(this).data('index')].label = $(this).val();
            renderPreview();
        });
        $(document).on('input change', '.hcgs-href', function(){
            state.tiles[$(this).data('index')].href = $(this).val();
        });
        $(document).on('input change', '.hcgs-hero-text', function(){
            state.tiles[$(this).data('index')].heroText = $(this).val();
            renderPreview();
        });
        $(document).on('input change', '.hcgs-alt', function(){
            state.tiles[$(this).data('index')].image.alt = $(this).val();
        });
        $(document).on('change', '.hcgs-enabled', function(){
            state.tiles[$(this).data('index')].enabled = $(this).is(':checked');
            renderPreview();
        });
        $(document).on('input change', '[data-field]', renderPreview);

        $('#hcgs-form').on('submit', function(){
            syncTopFields();
            $('#hcgs-payload').val(JSON.stringify(state));
        });

        renderTiles();
    });
    </script>
    <?php
}
