<?php
/**
 * HOVER — 首頁 HOVER PEOPLE 輪播（People Studio）
 *
 * 使用方式（WordPress 後台）：
 * 1. Code Snippets → Add New → 貼上本檔
 * 2. Run snippet：Everywhere → 啟用
 * 3. 左側選單「HOVER PEOPLE」
 *
 * 特色：
 * - 選圖後「強制」跳出 481:550 直式裁切框（與前端設計比例一致，無法跳過）
 * - 每張可設定點擊連結（選填）、替代文字、啟用/停用、排序
 *
 * REST API（給 Next.js）：
 * GET /wp-json/hover/v1/people
 */

if (!defined('ABSPATH')) {
    exit;
}

if (defined('HPPS_LOADED')) {
    return;
}
define('HPPS_LOADED', true);

const HPPS_OPTION = 'hover_people_v1';
const HPPS_MAX_SLIDES = 16;

add_action('admin_menu', function () {
    if (!current_user_can('manage_options')) {
        return;
    }
    add_menu_page(
        'HOVER PEOPLE',
        'HOVER PEOPLE',
        'manage_options',
        'hpps',
        'hpps_render_page',
        'dashicons-groups',
        58
    );
}, 99);

add_action('admin_enqueue_scripts', function ($hook) {
    if ($hook !== 'toplevel_page_hpps') {
        return;
    }
    wp_enqueue_media();
});

add_action('admin_footer', 'hpps_admin_footer_script');

add_action('rest_api_init', function () {
    register_rest_route('hover/v1', '/people', [
        'methods'             => 'GET',
        'callback'            => 'hpps_rest_people',
        'permission_callback' => '__return_true',
    ]);
});

function hpps_default_slide(string $id = 'people-1'): array
{
    return [
        'id'      => $id,
        'enabled' => true,
        'href'    => '',
        'image'   => [
            'url' => '',
            'alt' => 'HOVER PEOPLE',
        ],
    ];
}

function hpps_defaults(): array
{
    return [
        'enabled' => true,
        'version' => '1',
        'slides'  => [hpps_default_slide()],
    ];
}

function hpps_sanitize_url(string $url): string
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

function hpps_normalize_slide(array $slide, int $index): array
{
    $d = hpps_default_slide('people-' . ($index + 1));

    $image = $slide['image'] ?? [];

    return [
        'id'      => sanitize_text_field($slide['id'] ?? $d['id']) ?: $d['id'],
        'enabled' => !isset($slide['enabled']) || !empty($slide['enabled']),
        'href'    => hpps_sanitize_url($slide['href'] ?? ''),
        'image'   => [
            'url' => esc_url_raw($image['url'] ?? ''),
            'alt' => sanitize_text_field($image['alt'] ?? $d['image']['alt']) ?: $d['image']['alt'],
        ],
    ];
}

function hpps_normalize(array $data): array
{
    $d = hpps_defaults();

    $data['enabled'] = !empty($data['enabled']);
    $data['version'] = sanitize_text_field($data['version'] ?? $d['version']) ?: $d['version'];

    $slides = [];
    if (!empty($data['slides']) && is_array($data['slides'])) {
        foreach ($data['slides'] as $i => $slide) {
            if (!is_array($slide) || count($slides) >= HPPS_MAX_SLIDES) {
                continue;
            }
            $normalized = hpps_normalize_slide($slide, $i);
            if ($normalized['image']['url'] !== '') {
                $slides[] = $normalized;
            }
        }
    }

    $data['slides'] = $slides ?: $d['slides'];

    return $data;
}

function hpps_get_settings(): array
{
    $saved = get_option(HPPS_OPTION, []);
    if (!is_array($saved)) {
        $saved = [];
    }
    return hpps_normalize(array_replace_recursive(hpps_defaults(), $saved));
}

function hpps_save_from_post(): ?array
{
    if ($_SERVER['REQUEST_METHOD'] !== 'POST' || empty($_POST['hpps_act'])) {
        return null;
    }
    if (!wp_verify_nonce($_POST['hpps_nonce'] ?? '', 'hpps_save')) {
        return ['ok' => false, 'msg' => '安全驗證失敗，請重新整理後再試。'];
    }
    if (!current_user_can('manage_options')) {
        return ['ok' => false, 'msg' => '權限不足。'];
    }

    $act = sanitize_text_field($_POST['hpps_act']);
    if ($act === 'reset') {
        delete_option(HPPS_OPTION);
        return ['ok' => true, 'msg' => '已還原為預設設定。'];
    }

    if ($act !== 'save') {
        return null;
    }

    $raw = json_decode(wp_unslash($_POST['hpps_payload'] ?? ''), true);
    if (!is_array($raw)) {
        return ['ok' => false, 'msg' => '資料格式錯誤。'];
    }

    $normalized = hpps_normalize($raw);
    update_option(HPPS_OPTION, $normalized, false);

    return ['ok' => true, 'msg' => 'HOVER PEOPLE 輪播已儲存。'];
}

function hpps_rest_people(): WP_REST_Response
{
    return new WP_REST_Response([
        'ok'     => true,
        'people' => hpps_get_settings(),
    ], 200);
}

function hpps_active_count(array $s): int
{
    $n = 0;
    foreach ($s['slides'] as $slide) {
        if (!empty($slide['enabled']) && !empty($slide['image']['url'])) {
            $n++;
        }
    }
    return $n;
}

function hpps_render_page(): void
{
    if (!current_user_can('manage_options')) {
        wp_die('權限不足');
    }

    $flash = hpps_save_from_post();
    $s = hpps_get_settings();
    $api_url = rest_url('hover/v1/people');
    $active_n = hpps_active_count($s);
    ?>
    <div class="wrap hover-pp-admin">
        <div class="hpps-shell">
            <div class="hpps-topbar">
                <div>
                    <h1>HOVER PEOPLE</h1>
                    <p class="description">管理首頁底部 HOVER PEOPLE 輪播。選圖後將強制裁切為 481:550 直式比例，儲存後約 1 分鐘內同步至 Next.js。</p>
                </div>
                <div class="hpps-topbar-actions">
                    <span class="hpps-status <?php echo !empty($s['enabled']) && $active_n ? 'is-live' : ''; ?>">
                        <?php echo !empty($s['enabled']) && $active_n ? "上線中 · {$active_n} 張" : '未上線'; ?>
                    </span>
                    <button type="submit" form="hpps-form" class="button button-primary button-hero">儲存設定</button>
                </div>
            </div>

            <?php if ($flash) : ?>
                <div class="notice <?php echo $flash['ok'] ? 'notice-success' : 'notice-error'; ?> is-dismissible">
                    <p><?php echo esc_html($flash['msg']); ?></p>
                </div>
            <?php endif; ?>

            <div class="hpps-api-pill">
                <span class="dashicons dashicons-rest-api"></span>
                <span>REST API</span>
                <code><?php echo esc_html($api_url); ?></code>
            </div>

            <form id="hpps-form" method="post">
                <?php wp_nonce_field('hpps_save', 'hpps_nonce'); ?>
                <input type="hidden" name="hpps_act" value="save">
                <input type="hidden" name="hpps_payload" id="hpps-payload" value="">

                <div class="hpps-layout">
                    <div class="hpps-main">
                        <div class="hpps-card">
                            <div class="hpps-card-head"><h2>整體設定</h2></div>
                            <div class="hpps-card-body hpps-grid-2">
                                <label class="hpps-switch hpps-span-2">
                                    <input type="checkbox" data-field="enabled" <?php checked(!empty($s['enabled'])); ?>>
                                    <span class="hpps-switch-ui"></span>
                                    <span class="hpps-switch-label">啟用 HOVER PEOPLE 輪播</span>
                                </label>
                                <div class="hpps-field">
                                    <label class="hpps-label">版本代號</label>
                                    <input type="text" class="regular-text" data-field="version" value="<?php echo esc_attr($s['version']); ?>">
                                    <p class="description">變更代號可協助追蹤不同版次內容。</p>
                                </div>
                            </div>
                        </div>

                        <div class="hpps-card">
                            <div class="hpps-card-head">
                                <div>
                                    <h2>輪播圖片（481:550 直式）</h2>
                                    <p class="description" style="margin:4px 0 0">前端桌機一排 4 張、手機一排 3 張。建議上傳 962×1100 以上；選圖後將跳出強制裁切框。</p>
                                </div>
                                <button type="button" class="button button-secondary" id="hpps-add-slide">＋ 新增一張</button>
                            </div>
                            <div class="hpps-card-body">
                                <div id="hpps-slides-list" class="hpps-slides"></div>
                                <p class="description hpps-empty-hint">至少需一張有圖片才會在前台顯示，最多 <?php echo (int) HPPS_MAX_SLIDES; ?> 張。</p>
                            </div>
                        </div>
                    </div>

                    <aside class="hpps-preview">
                        <div class="hpps-card hpps-preview-card">
                            <div class="hpps-card-head">
                                <div>
                                    <h2>即時預覽</h2>
                                    <p class="description" style="margin:4px 0 0">模擬前台一排 4 張</p>
                                </div>
                            </div>
                            <div class="hpps-preview-body">
                                <div class="hpps-mock-title">HOVER PEOPLE</div>
                                <div class="hpps-mock-grid" id="hpps-live-preview"></div>
                            </div>
                        </div>
                    </aside>
                </div>
            </form>

            <form method="post" class="hpps-reset-form" onsubmit="return confirm('確定還原為預設設定？');">
                <?php wp_nonce_field('hpps_save', 'hpps_nonce'); ?>
                <input type="hidden" name="hpps_act" value="reset">
                <button type="submit" class="button">還原預設</button>
            </form>
        </div>
    </div>
    <?php
    hpps_print_admin_styles();
}

function hpps_print_admin_styles(): void
{
    ?>
    <style>
        .hover-pp-admin .hpps-shell { margin-top: 8px; max-width: 1180px; }
        .hover-pp-admin .hpps-topbar {
            display: flex; align-items: flex-start; justify-content: space-between;
            gap: 16px; margin-bottom: 16px;
        }
        .hover-pp-admin .hpps-topbar h1 { margin: 0 0 6px; }
        .hover-pp-admin .hpps-topbar-actions {
            display: flex; gap: 10px; align-items: center; flex-shrink: 0;
        }
        .hover-pp-admin .hpps-status {
            display: inline-flex; align-items: center; gap: 6px;
            padding: 6px 12px; border-radius: 999px; font-size: 12px; font-weight: 600;
            background: #f0f0f1; color: #646970;
        }
        .hover-pp-admin .hpps-status.is-live { background: #edf7f1; color: #1a6847; }
        .hover-pp-admin .hpps-status.is-live::before {
            content: ""; width: 8px; height: 8px; border-radius: 50%; background: #2a514d;
        }
        .hover-pp-admin .hpps-api-pill {
            display: inline-flex; align-items: center; gap: 8px;
            background: #fff; border: 1px solid #dcdcde; border-radius: 999px;
            padding: 8px 14px; margin-bottom: 16px; font-size: 12px; color: #646970;
        }
        .hover-pp-admin .hpps-api-pill code {
            font-size: 11px; background: #f6f7f7; padding: 2px 8px; border-radius: 999px;
        }
        .hover-pp-admin .hpps-layout {
            display: grid; grid-template-columns: minmax(0, 1fr) 380px; gap: 16px; align-items: start;
        }
        .hover-pp-admin .hpps-card {
            background: #fff; border: 1px solid #dcdcde; border-radius: 8px;
            box-shadow: 0 1px 2px rgba(0,0,0,.04); overflow: hidden; margin-bottom: 16px;
        }
        .hover-pp-admin .hpps-card-head {
            display: flex; align-items: center; justify-content: space-between; gap: 10px;
            padding: 14px 18px; border-bottom: 1px solid #f0f0f1;
        }
        .hover-pp-admin .hpps-card-head h2 { margin: 0; font-size: 14px; font-weight: 700; }
        .hover-pp-admin .hpps-card-body { padding: 18px; }
        .hover-pp-admin .hpps-grid-2 {
            display: grid; grid-template-columns: 1fr 1fr; gap: 14px 16px;
        }
        .hover-pp-admin .hpps-span-2 { grid-column: 1 / -1; }
        .hover-pp-admin .hpps-field { display: flex; flex-direction: column; gap: 6px; }
        .hover-pp-admin .hpps-label { font-weight: 600; font-size: 13px; }
        .hover-pp-admin .hpps-switch {
            display: inline-flex; align-items: center; gap: 12px; cursor: pointer; user-select: none;
        }
        .hover-pp-admin .hpps-switch input { position: absolute; opacity: 0; pointer-events: none; }
        .hover-pp-admin .hpps-switch-ui {
            width: 44px; height: 24px; border-radius: 999px; background: #c3c4c7; position: relative; transition: .2s;
        }
        .hover-pp-admin .hpps-switch-ui::after {
            content: ""; position: absolute; top: 3px; left: 3px; width: 18px; height: 18px;
            border-radius: 50%; background: #fff; transition: .2s; box-shadow: 0 1px 3px rgba(0,0,0,.2);
        }
        .hover-pp-admin .hpps-switch input:checked + .hpps-switch-ui { background: #2a514d; }
        .hover-pp-admin .hpps-switch input:checked + .hpps-switch-ui::after { transform: translateX(20px); }
        .hover-pp-admin .hpps-switch-label { font-weight: 600; font-size: 13px; }
        .hover-pp-admin .hpps-slides { display: flex; flex-direction: column; gap: 14px; }
        .hover-pp-admin .hpps-slide {
            border: 1px solid #dcdcde; border-radius: 8px; background: #fcfcfd; overflow: hidden;
        }
        .hover-pp-admin .hpps-slide-head {
            display: flex; align-items: center; justify-content: space-between; gap: 8px;
            padding: 10px 14px; background: #f6f7f7; border-bottom: 1px solid #eef2f6;
        }
        .hover-pp-admin .hpps-slide-title { font-size: 13px; font-weight: 700; color: #202223; }
        .hover-pp-admin .hpps-slide-actions { display: flex; gap: 4px; flex-wrap: wrap; }
        .hover-pp-admin .hpps-slide-body {
            display: grid; grid-template-columns: 150px 1fr; gap: 14px; padding: 14px;
        }
        .hover-pp-admin .hpps-thumb {
            aspect-ratio: 481/550; border-radius: 6px; border: 1px dashed #c3c4c7;
            background: #f6f7f7; overflow: hidden; display: flex; align-items: center; justify-content: center;
        }
        .hover-pp-admin .hpps-thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }
        .hover-pp-admin .hpps-thumb-empty { font-size: 11px; color: #646970; text-align: center; padding: 8px; }
        .hover-pp-admin .hpps-ratio-badge {
            display: inline-flex; align-items: center; gap: 4px;
            font-size: 11px; font-weight: 600; color: #1a6847; background: #edf7f1;
            border-radius: 999px; padding: 2px 8px;
        }
        .hover-pp-admin .hpps-slide-fields { display: grid; grid-template-columns: 1fr; gap: 10px 12px; align-content: start; }
        .hover-pp-admin .hpps-media-actions { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 6px; align-items: center; }
        .hover-pp-admin .hpps-preview { position: sticky; top: 32px; }
        .hover-pp-admin .hpps-preview-body { padding: 16px; background: #fff; }
        .hover-pp-admin .hpps-mock-title {
            font-size: 12px; font-weight: 800; letter-spacing: .08em; color: #202223; margin-bottom: 10px;
        }
        .hover-pp-admin .hpps-mock-grid {
            display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px;
        }
        .hover-pp-admin .hpps-mock-tile {
            position: relative; aspect-ratio: 481/550; overflow: hidden; background: #eef2f6;
        }
        .hover-pp-admin .hpps-mock-tile img { width: 100%; height: 100%; object-fit: cover; display: block; }
        .hover-pp-admin .hpps-mock-link {
            position: absolute; right: 4px; bottom: 4px; z-index: 1;
            font-size: 8px; color: #fff; background: rgba(0,0,0,.55);
            border-radius: 999px; padding: 1px 6px;
        }
        .hover-pp-admin .hpps-reset-form { margin-top: 8px; }
        .hover-pp-admin .hpps-empty-hint { margin: 10px 0 0; }
        @media (max-width: 960px) {
            .hover-pp-admin .hpps-layout { grid-template-columns: 1fr; }
            .hover-pp-admin .hpps-preview { position: static; }
            .hover-pp-admin .hpps-grid-2,
            .hover-pp-admin .hpps-slide-body { grid-template-columns: 1fr; }
        }
    </style>
    <?php
}

function hpps_admin_footer_script(): void
{
    $screen = function_exists('get_current_screen') ? get_current_screen() : null;
    if (!$screen || $screen->id !== 'toplevel_page_hpps') {
        return;
    }

    $s = hpps_get_settings();
    ?>
    <script>
    jQuery(function($){
        var RATIO = 481 / 550; // 前端 aspect-[481/550]
        var MAX_SLIDES = <?php echo (int) HPPS_MAX_SLIDES; ?>;
        var state = <?php echo wp_json_encode($s, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES); ?>;

        function esc(s){ return $('<div/>').text(s || '').html(); }

        function newSlide(){
            return {
                id: 'people-' + Date.now(),
                enabled: true,
                href: '',
                image: { url: '', alt: 'HOVER PEOPLE' }
            };
        }

        function activeSlides(){
            if (!state.enabled) return [];
            return (state.slides || []).filter(function(s){
                return s.enabled && s.image && s.image.url;
            });
        }

        /* ─── 強制 481:550 裁切框 ─────────────────────────── */

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
                aspectRatio: '481:550',
                minWidth: Math.min(241, selW),
                minHeight: Math.min(275, selH),
                x1: x1,
                y1: y1,
                x2: x1 + selW,
                y2: y1 + selH
            };
        }

        var HppsCropper = wp.media.controller.Cropper.extend({
            doCrop: function(attachment){
                var cd = attachment.get('cropDetails');
                var cropW = cd.width || (cd.x2 - cd.x1);
                var dstW = Math.min(1200, cropW); // 過大時縮到 1200 寬（約 2.5x 顯示尺寸）
                cd.dst_width  = dstW;
                cd.dst_height = Math.round(dstW / RATIO);
                return wp.ajax.post('crop-image', {
                    nonce: attachment.get('nonces').edit,
                    id: attachment.get('id'),
                    context: 'hover-people',
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
                button: { text: '下一步：裁切 481:550', close: false },
                states: [
                    new wp.media.controller.Library({
                        title: '選擇圖片（將強制裁切為 481:550，建議 962×1100 以上）',
                        library: wp.media.query({ type: 'image' }),
                        multiple: false,
                        date: false,
                        suggestedWidth: 962,
                        suggestedHeight: 1100
                    }),
                    new HppsCropper({ imgSelectOptions: imgSelectOptions })
                ]
            });

            frame.on('select', function(){
                frame.setState('cropper');
            });

            frame.on('cropped', function(cropped){
                if (cropped && cropped.url) {
                    state.slides[i].image.url = cropped.url;
                    renderSlides();
                }
                frame.close();
            });

            frame.open();
        }

        /* ─── Render ──────────────────────────────────────── */

        function renderSlides(){
            var $list = $('#hpps-slides-list').empty();
            if (!state.slides || !state.slides.length) {
                state.slides = [newSlide()];
            }

            state.slides.forEach(function(slide, i){
                var thumb = slide.image && slide.image.url
                    ? '<img src="'+esc(slide.image.url)+'" alt="">'
                    : '<div class="hpps-thumb-empty">尚未選圖<br>（481:550）</div>';

                var html = '<div class="hpps-slide" data-index="'+i+'">';
                html += '<div class="hpps-slide-head">';
                html += '<span class="hpps-slide-title">第 '+(i+1)+' 張</span>';
                html += '<div class="hpps-slide-actions">';
                html += '<button type="button" class="button button-small hpps-move" data-dir="-1"'+(i===0?' disabled':'')+'>↑</button>';
                html += '<button type="button" class="button button-small hpps-move" data-dir="1"'+(i===state.slides.length-1?' disabled':'')+'>↓</button>';
                html += '<button type="button" class="button button-small hpps-remove"'+(state.slides.length<=1?' disabled':'')+'>刪除</button>';
                html += '</div></div>';
                html += '<div class="hpps-slide-body">';
                html += '<div><div class="hpps-thumb" data-thumb="'+i+'">'+thumb+'</div>';
                html += '<div class="hpps-media-actions">';
                html += '<button type="button" class="button button-primary button-small hpps-pick" data-index="'+i+'">選圖並裁切</button>';
                html += '<button type="button" class="button button-small hpps-clear" data-index="'+i+'">清除</button>';
                if (slide.image && slide.image.url) {
                    html += '<span class="hpps-ratio-badge">✓ 481:550</span>';
                }
                html += '</div></div>';
                html += '<div class="hpps-slide-fields">';
                html += '<label class="hpps-switch"><input type="checkbox" class="hpps-enabled" data-index="'+i+'"'+(slide.enabled?' checked':'')+'>';
                html += '<span class="hpps-switch-ui"></span><span class="hpps-switch-label">啟用此張</span></label>';
                html += '<div class="hpps-field"><label class="hpps-label">點擊連結（選填，留空不可點）</label>';
                html += '<input type="text" class="regular-text hpps-href" data-index="'+i+'" value="'+esc(slide.href || '')+'" placeholder="/products 或 https://..."></div>';
                html += '<div class="hpps-field"><label class="hpps-label">圖片替代文字（SEO）</label>';
                html += '<input type="text" class="regular-text hpps-alt" data-index="'+i+'" value="'+esc(slide.image.alt)+'"></div>';
                html += '</div></div></div>';

                $list.append(html);
            });

            $('#hpps-add-slide').prop('disabled', state.slides.length >= MAX_SLIDES);

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

            var slides = activeSlides();
            if (!slides.length) {
                $('#hpps-live-preview').html('<div style="grid-column:1/-1;display:flex;align-items:center;justify-content:center;height:120px;color:#646970;font-size:12px;background:#eef2f6">尚無啟用中的圖片</div>');
                return;
            }

            var html = '';
            slides.forEach(function(slide){
                html += '<div class="hpps-mock-tile">';
                html += '<img src="'+esc(slide.image.url)+'" alt="">';
                if (slide.href) {
                    html += '<span class="hpps-mock-link">🔗</span>';
                }
                html += '</div>';
            });
            $('#hpps-live-preview').html(html);
        }

        /* ─── Events ──────────────────────────────────────── */

        $(document).on('click', '#hpps-add-slide', function(){
            if (state.slides.length >= MAX_SLIDES) return;
            state.slides.push(newSlide());
            renderSlides();
        });

        $(document).on('click', '.hpps-remove', function(){
            var i = $(this).closest('.hpps-slide').data('index');
            if (state.slides.length <= 1) return;
            state.slides.splice(i, 1);
            renderSlides();
        });

        $(document).on('click', '.hpps-move', function(){
            var i = $(this).closest('.hpps-slide').data('index');
            var dir = parseInt($(this).data('dir'), 10);
            var j = i + dir;
            if (j < 0 || j >= state.slides.length) return;
            var tmp = state.slides[i];
            state.slides[i] = state.slides[j];
            state.slides[j] = tmp;
            renderSlides();
        });

        $(document).on('click', '.hpps-pick', function(){
            openCropFrame($(this).data('index'));
        });

        $(document).on('click', '.hpps-clear', function(){
            state.slides[$(this).data('index')].image.url = '';
            renderSlides();
        });

        $(document).on('input change', '.hpps-href', function(){
            state.slides[$(this).data('index')].href = $(this).val();
            renderPreview();
        });
        $(document).on('input change', '.hpps-alt', function(){
            state.slides[$(this).data('index')].image.alt = $(this).val();
        });
        $(document).on('change', '.hpps-enabled', function(){
            state.slides[$(this).data('index')].enabled = $(this).is(':checked');
            renderPreview();
        });
        $(document).on('input change', '[data-field]', renderPreview);

        $('#hpps-form').on('submit', function(){
            syncTopFields();
            $('#hpps-payload').val(JSON.stringify(state));
        });

        renderSlides();
    });
    </script>
    <?php
}
