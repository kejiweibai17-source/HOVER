<?php
/**
 * HOVER — 首頁品牌故事輪播（Brand Story Studio）
 *
 * 使用方式（WordPress 後台）：
 * 1. Code Snippets → Add New → 貼上本檔
 * 2. Run snippet：Everywhere → 啟用
 * 3. 左側選單「HOVER 品牌輪播」
 *
 * 特色：
 * - 選圖後「強制」跳出 16:9 裁切框（無法跳過），裁切後自動另存新圖
 * - 支援排序、啟用/停用、替代文字
 *
 * REST API（給 Next.js）：
 * GET /wp-json/hover/v1/brand-story
 */

if (!defined('ABSPATH')) {
    exit;
}

if (defined('HBSS_LOADED')) {
    return;
}
define('HBSS_LOADED', true);

const HBSS_OPTION = 'hover_brand_story_v1';
const HBSS_MAX_SLIDES = 12;

add_action('admin_menu', function () {
    if (!current_user_can('manage_options')) {
        return;
    }
    add_menu_page(
        'HOVER 品牌輪播',
        'HOVER 品牌輪播',
        'manage_options',
        'hbss',
        'hbss_render_page',
        'dashicons-format-gallery',
        58
    );
}, 99);

add_action('admin_enqueue_scripts', function ($hook) {
    if ($hook !== 'toplevel_page_hbss') {
        return;
    }
    wp_enqueue_media();
});

add_action('admin_footer', 'hbss_admin_footer_script');

add_action('rest_api_init', function () {
    register_rest_route('hover/v1', '/brand-story', [
        'methods'             => 'GET',
        'callback'            => 'hbss_rest_brand_story',
        'permission_callback' => '__return_true',
    ]);
});

function hbss_default_slide(string $id = 'brand-story-1'): array
{
    return [
        'id'      => $id,
        'enabled' => true,
        'href'    => '/products',
        'image'   => [
            'url' => '',
            'alt' => 'HOVER brand story',
        ],
    ];
}

function hbss_sanitize_url(string $url): string
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

function hbss_defaults(): array
{
    return [
        'enabled'    => true,
        'version'    => '1',
        'autoplayMs' => 5000,
        'slides'     => [hbss_default_slide()],
    ];
}

function hbss_normalize_slide(array $slide, int $index): array
{
    $d = hbss_default_slide('brand-story-' . ($index + 1));

    $image = $slide['image'] ?? [];

    return [
        'id'      => sanitize_text_field($slide['id'] ?? $d['id']) ?: $d['id'],
        'enabled' => !isset($slide['enabled']) || !empty($slide['enabled']),
        'href'    => hbss_sanitize_url($slide['href'] ?? $d['href']),
        'image'   => [
            'url' => esc_url_raw($image['url'] ?? ''),
            'alt' => sanitize_text_field($image['alt'] ?? $d['image']['alt']) ?: $d['image']['alt'],
        ],
    ];
}

function hbss_normalize(array $data): array
{
    $d = hbss_defaults();

    $data['enabled']    = !empty($data['enabled']);
    $data['version']    = sanitize_text_field($data['version'] ?? $d['version']) ?: $d['version'];
    $data['autoplayMs'] = max(2000, min(15000, intval($data['autoplayMs'] ?? $d['autoplayMs'])));

    $slides = [];
    if (!empty($data['slides']) && is_array($data['slides'])) {
        foreach ($data['slides'] as $i => $slide) {
            if (!is_array($slide) || count($slides) >= HBSS_MAX_SLIDES) {
                continue;
            }
            $normalized = hbss_normalize_slide($slide, $i);
            if ($normalized['image']['url'] !== '') {
                $slides[] = $normalized;
            }
        }
    }

    $data['slides'] = $slides ?: $d['slides'];

    return $data;
}

function hbss_get_settings(): array
{
    $saved = get_option(HBSS_OPTION, []);
    if (!is_array($saved)) {
        $saved = [];
    }
    return hbss_normalize(array_replace_recursive(hbss_defaults(), $saved));
}

function hbss_save_from_post(): ?array
{
    if ($_SERVER['REQUEST_METHOD'] !== 'POST' || empty($_POST['hbss_act'])) {
        return null;
    }
    if (!wp_verify_nonce($_POST['hbss_nonce'] ?? '', 'hbss_save')) {
        return ['ok' => false, 'msg' => '安全驗證失敗，請重新整理後再試。'];
    }
    if (!current_user_can('manage_options')) {
        return ['ok' => false, 'msg' => '權限不足。'];
    }

    $act = sanitize_text_field($_POST['hbss_act']);
    if ($act === 'reset') {
        delete_option(HBSS_OPTION);
        return ['ok' => true, 'msg' => '已還原為預設設定。'];
    }

    if ($act !== 'save') {
        return null;
    }

    $raw = json_decode(wp_unslash($_POST['hbss_payload'] ?? ''), true);
    if (!is_array($raw)) {
        return ['ok' => false, 'msg' => '資料格式錯誤。'];
    }

    $normalized = hbss_normalize($raw);
    update_option(HBSS_OPTION, $normalized, false);

    return ['ok' => true, 'msg' => '品牌故事輪播已儲存。'];
}

function hbss_rest_brand_story(): WP_REST_Response
{
    return new WP_REST_Response([
        'ok'         => true,
        'brandStory' => hbss_get_settings(),
    ], 200);
}

function hbss_active_count(array $s): int
{
    $n = 0;
    foreach ($s['slides'] as $slide) {
        if (!empty($slide['enabled']) && !empty($slide['image']['url'])) {
            $n++;
        }
    }
    return $n;
}

function hbss_render_page(): void
{
    if (!current_user_can('manage_options')) {
        wp_die('權限不足');
    }

    $flash = hbss_save_from_post();
    $s = hbss_get_settings();
    $api_url = rest_url('hover/v1/brand-story');
    $active_n = hbss_active_count($s);
    ?>
    <div class="wrap hover-bs-admin">
        <div class="hbss-shell">
            <div class="hbss-topbar">
                <div>
                    <h1>HOVER 品牌輪播</h1>
                    <p class="description">管理首頁「品牌故事」16:9 輪播。選圖後會強制裁切為 16:9，儲存後約 1 分鐘內同步至 Next.js。</p>
                </div>
                <div class="hbss-topbar-actions">
                    <span class="hbss-status <?php echo !empty($s['enabled']) && $active_n ? 'is-live' : ''; ?>">
                        <?php echo !empty($s['enabled']) && $active_n ? "上線中 · {$active_n} 張" : '未上線'; ?>
                    </span>
                    <button type="submit" form="hbss-form" class="button button-primary button-hero">儲存設定</button>
                </div>
            </div>

            <?php if ($flash) : ?>
                <div class="notice <?php echo $flash['ok'] ? 'notice-success' : 'notice-error'; ?> is-dismissible">
                    <p><?php echo esc_html($flash['msg']); ?></p>
                </div>
            <?php endif; ?>

            <div class="hbss-api-pill">
                <span class="dashicons dashicons-rest-api"></span>
                <span>REST API</span>
                <code><?php echo esc_html($api_url); ?></code>
            </div>

            <form id="hbss-form" method="post">
                <?php wp_nonce_field('hbss_save', 'hbss_nonce'); ?>
                <input type="hidden" name="hbss_act" value="save">
                <input type="hidden" name="hbss_payload" id="hbss-payload" value="">

                <div class="hbss-layout">
                    <div class="hbss-main">
                        <div class="hbss-card">
                            <div class="hbss-card-head"><h2>輪播設定</h2></div>
                            <div class="hbss-card-body hbss-grid-2">
                                <label class="hbss-switch hbss-span-2">
                                    <input type="checkbox" data-field="enabled" <?php checked(!empty($s['enabled'])); ?>>
                                    <span class="hbss-switch-ui"></span>
                                    <span class="hbss-switch-label">啟用品牌故事輪播</span>
                                </label>
                                <div class="hbss-field">
                                    <label class="hbss-label">自動輪播間隔（毫秒）</label>
                                    <input type="number" min="2000" max="15000" step="500" data-field="autoplayMs" value="<?php echo esc_attr($s['autoplayMs']); ?>">
                                    <p class="description">建議 4000–6000。</p>
                                </div>
                                <div class="hbss-field">
                                    <label class="hbss-label">版本代號</label>
                                    <input type="text" class="regular-text" data-field="version" value="<?php echo esc_attr($s['version']); ?>">
                                    <p class="description">變更代號可協助追蹤不同版次內容。</p>
                                </div>
                            </div>
                        </div>

                        <div class="hbss-card">
                            <div class="hbss-card-head">
                                <div>
                                    <h2>輪播圖片（16:9）</h2>
                                    <p class="description" style="margin:4px 0 0">建議上傳 1600×900 以上；選圖後將跳出強制裁切框。</p>
                                </div>
                                <button type="button" class="button button-secondary" id="hbss-add-slide">＋ 新增一張</button>
                            </div>
                            <div class="hbss-card-body">
                                <div id="hbss-slides-list" class="hbss-slides"></div>
                                <p class="description hbss-empty-hint">至少需一張有圖片的 slide 才會在前台顯示，最多 <?php echo (int) HBSS_MAX_SLIDES; ?> 張。</p>
                            </div>
                        </div>
                    </div>

                    <aside class="hbss-preview">
                        <div class="hbss-card hbss-preview-card">
                            <div class="hbss-card-head">
                                <div>
                                    <h2>即時預覽</h2>
                                    <p class="description" style="margin:4px 0 0">前台 16:9 比例（點擊可切換下一張）</p>
                                </div>
                            </div>
                            <div class="hbss-preview-body">
                                <div class="hbss-mock" id="hbss-live-preview"></div>
                            </div>
                            <div class="hbss-preview-foot">
                                <span id="hbss-preview-dots"></span>
                            </div>
                        </div>
                    </aside>
                </div>
            </form>

            <form method="post" class="hbss-reset-form" onsubmit="return confirm('確定還原為預設設定？');">
                <?php wp_nonce_field('hbss_save', 'hbss_nonce'); ?>
                <input type="hidden" name="hbss_act" value="reset">
                <button type="submit" class="button">還原預設</button>
            </form>
        </div>
    </div>
    <?php
    hbss_print_admin_styles();
}

function hbss_print_admin_styles(): void
{
    ?>
    <style>
        .hover-bs-admin .hbss-shell { margin-top: 8px; max-width: 1180px; }
        .hover-bs-admin .hbss-topbar {
            display: flex; align-items: flex-start; justify-content: space-between;
            gap: 16px; margin-bottom: 16px;
        }
        .hover-bs-admin .hbss-topbar h1 { margin: 0 0 6px; }
        .hover-bs-admin .hbss-topbar-actions {
            display: flex; gap: 10px; align-items: center; flex-shrink: 0;
        }
        .hover-bs-admin .hbss-status {
            display: inline-flex; align-items: center; gap: 6px;
            padding: 6px 12px; border-radius: 999px; font-size: 12px; font-weight: 600;
            background: #f0f0f1; color: #646970;
        }
        .hover-bs-admin .hbss-status.is-live { background: #edf7f1; color: #1a6847; }
        .hover-bs-admin .hbss-status.is-live::before {
            content: ""; width: 8px; height: 8px; border-radius: 50%; background: #2a514d;
        }
        .hover-bs-admin .hbss-api-pill {
            display: inline-flex; align-items: center; gap: 8px;
            background: #fff; border: 1px solid #dcdcde; border-radius: 999px;
            padding: 8px 14px; margin-bottom: 16px; font-size: 12px; color: #646970;
        }
        .hover-bs-admin .hbss-api-pill code {
            font-size: 11px; background: #f6f7f7; padding: 2px 8px; border-radius: 999px;
        }
        .hover-bs-admin .hbss-layout {
            display: grid; grid-template-columns: minmax(0, 1fr) 340px; gap: 16px; align-items: start;
        }
        .hover-bs-admin .hbss-card {
            background: #fff; border: 1px solid #dcdcde; border-radius: 8px;
            box-shadow: 0 1px 2px rgba(0,0,0,.04); overflow: hidden; margin-bottom: 16px;
        }
        .hover-bs-admin .hbss-card-head {
            display: flex; align-items: center; justify-content: space-between; gap: 10px;
            padding: 14px 18px; border-bottom: 1px solid #f0f0f1;
        }
        .hover-bs-admin .hbss-card-head h2 { margin: 0; font-size: 14px; font-weight: 700; }
        .hover-bs-admin .hbss-card-body { padding: 18px; }
        .hover-bs-admin .hbss-grid-2 {
            display: grid; grid-template-columns: 1fr 1fr; gap: 14px 16px;
        }
        .hover-bs-admin .hbss-span-2 { grid-column: 1 / -1; }
        .hover-bs-admin .hbss-field { display: flex; flex-direction: column; gap: 6px; }
        .hover-bs-admin .hbss-label { font-weight: 600; font-size: 13px; }
        .hover-bs-admin .hbss-switch {
            display: inline-flex; align-items: center; gap: 12px; cursor: pointer; user-select: none;
        }
        .hover-bs-admin .hbss-switch input { position: absolute; opacity: 0; pointer-events: none; }
        .hover-bs-admin .hbss-switch-ui {
            width: 44px; height: 24px; border-radius: 999px; background: #c3c4c7; position: relative; transition: .2s;
        }
        .hover-bs-admin .hbss-switch-ui::after {
            content: ""; position: absolute; top: 3px; left: 3px; width: 18px; height: 18px;
            border-radius: 50%; background: #fff; transition: .2s; box-shadow: 0 1px 3px rgba(0,0,0,.2);
        }
        .hover-bs-admin .hbss-switch input:checked + .hbss-switch-ui { background: #2a514d; }
        .hover-bs-admin .hbss-switch input:checked + .hbss-switch-ui::after { transform: translateX(20px); }
        .hover-bs-admin .hbss-switch-label { font-weight: 600; font-size: 13px; }
        .hover-bs-admin .hbss-slides { display: flex; flex-direction: column; gap: 14px; }
        .hover-bs-admin .hbss-slide {
            border: 1px solid #dcdcde; border-radius: 8px; background: #fcfcfd; overflow: hidden;
        }
        .hover-bs-admin .hbss-slide-head {
            display: flex; align-items: center; justify-content: space-between; gap: 8px;
            padding: 10px 14px; background: #f6f7f7; border-bottom: 1px solid #eef2f6;
        }
        .hover-bs-admin .hbss-slide-title { font-size: 13px; font-weight: 700; color: #202223; }
        .hover-bs-admin .hbss-slide-actions { display: flex; gap: 4px; flex-wrap: wrap; }
        .hover-bs-admin .hbss-slide-body {
            display: grid; grid-template-columns: 220px 1fr; gap: 14px; padding: 14px;
        }
        .hover-bs-admin .hbss-thumb {
            aspect-ratio: 16/9; border-radius: 6px; border: 1px dashed #c3c4c7;
            background: #f6f7f7; overflow: hidden; display: flex; align-items: center; justify-content: center;
        }
        .hover-bs-admin .hbss-thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }
        .hover-bs-admin .hbss-thumb-empty { font-size: 11px; color: #646970; text-align: center; padding: 8px; }
        .hover-bs-admin .hbss-ratio-badge {
            display: inline-flex; align-items: center; gap: 4px;
            font-size: 11px; font-weight: 600; color: #1a6847; background: #edf7f1;
            border-radius: 999px; padding: 2px 8px;
        }
        .hover-bs-admin .hbss-slide-fields { display: grid; grid-template-columns: 1fr; gap: 10px 12px; align-content: start; }
        .hover-bs-admin .hbss-media-actions { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 6px; align-items: center; }
        .hover-bs-admin .hbss-preview { position: sticky; top: 32px; }
        .hover-bs-admin .hbss-preview-body { padding: 16px; background: #eef2f6; }
        .hover-bs-admin .hbss-mock {
            position: relative; width: 100%; aspect-ratio: 16/9; border-radius: 6px;
            overflow: hidden; background: #ddd; cursor: pointer;
        }
        .hover-bs-admin .hbss-mock img { width: 100%; height: 100%; object-fit: cover; }
        .hover-bs-admin .hbss-preview-foot {
            padding: 10px 16px 14px; display: flex; justify-content: center; gap: 6px;
            border-top: 1px solid #f0f0f1;
        }
        .hover-bs-admin .hbss-dot {
            width: 6px; height: 6px; border-radius: 999px; background: #c3c4c7;
        }
        .hover-bs-admin .hbss-dot.on { width: 18px; background: #2a514d; }
        .hover-bs-admin .hbss-reset-form { margin-top: 8px; }
        .hover-bs-admin .hbss-empty-hint { margin: 10px 0 0; }
        @media (max-width: 960px) {
            .hover-bs-admin .hbss-layout { grid-template-columns: 1fr; }
            .hover-bs-admin .hbss-preview { position: static; }
            .hover-bs-admin .hbss-grid-2,
            .hover-bs-admin .hbss-slide-body { grid-template-columns: 1fr; }
        }
    </style>
    <?php
}

function hbss_admin_footer_script(): void
{
    $screen = function_exists('get_current_screen') ? get_current_screen() : null;
    if (!$screen || $screen->id !== 'toplevel_page_hbss') {
        return;
    }

    $s = hbss_get_settings();
    ?>
    <script>
    jQuery(function($){
        var RATIO = 16 / 9;
        var MAX_SLIDES = <?php echo (int) HBSS_MAX_SLIDES; ?>;
        var state = <?php echo wp_json_encode($s, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES); ?>;
        var previewIndex = 0;

        function esc(s){ return $('<div/>').text(s || '').html(); }

        function newSlide(){
            return {
                id: 'brand-story-' + Date.now(),
                enabled: true,
                href: '/products',
                image: { url: '', alt: 'HOVER brand story' }
            };
        }

        function activeSlides(){
            if (!state.enabled) return [];
            return (state.slides || []).filter(function(s){
                return s.enabled && s.image && s.image.url;
            });
        }

        /* ─── 強制 16:9 裁切框 ─────────────────────────────── */

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
                aspectRatio: '16:9',
                minWidth: Math.min(480, selW),
                minHeight: Math.min(270, selH),
                x1: x1,
                y1: y1,
                x2: x1 + selW,
                y2: y1 + selH
            };
        }

        var HbssCropper = wp.media.controller.Cropper.extend({
            doCrop: function(attachment){
                var cd = attachment.get('cropDetails');
                var cropW = cd.width || (cd.x2 - cd.x1);
                var dstW = Math.min(2400, cropW); // 過大時縮到 2400 寬，維持 16:9
                cd.dst_width  = dstW;
                cd.dst_height = Math.round(dstW / RATIO);
                return wp.ajax.post('crop-image', {
                    nonce: attachment.get('nonces').edit,
                    id: attachment.get('id'),
                    context: 'hover-brand-story',
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
                button: { text: '下一步：裁切 16:9', close: false },
                states: [
                    new wp.media.controller.Library({
                        title: '選擇圖片（將強制裁切為 16:9，建議 1600×900 以上）',
                        library: wp.media.query({ type: 'image' }),
                        multiple: false,
                        date: false,
                        suggestedWidth: 1600,
                        suggestedHeight: 900
                    }),
                    new HbssCropper({ imgSelectOptions: imgSelectOptions })
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
            var $list = $('#hbss-slides-list').empty();
            if (!state.slides || !state.slides.length) {
                state.slides = [newSlide()];
            }

            state.slides.forEach(function(slide, i){
                var thumb = slide.image && slide.image.url
                    ? '<img src="'+esc(slide.image.url)+'" alt="">'
                    : '<div class="hbss-thumb-empty">尚未選圖<br>（16:9）</div>';

                var html = '<div class="hbss-slide" data-index="'+i+'">';
                html += '<div class="hbss-slide-head">';
                html += '<span class="hbss-slide-title">Slide '+(i+1)+'</span>';
                html += '<div class="hbss-slide-actions">';
                html += '<button type="button" class="button button-small hbss-move" data-dir="-1"'+(i===0?' disabled':'')+'>↑</button>';
                html += '<button type="button" class="button button-small hbss-move" data-dir="1"'+(i===state.slides.length-1?' disabled':'')+'>↓</button>';
                html += '<button type="button" class="button button-small hbss-remove"'+(state.slides.length<=1?' disabled':'')+'>刪除</button>';
                html += '</div></div>';
                html += '<div class="hbss-slide-body">';
                html += '<div><div class="hbss-thumb" data-thumb="'+i+'">'+thumb+'</div>';
                html += '<div class="hbss-media-actions">';
                html += '<button type="button" class="button button-primary button-small hbss-pick" data-index="'+i+'">選圖並裁切</button>';
                html += '<button type="button" class="button button-small hbss-clear" data-index="'+i+'">清除</button>';
                if (slide.image && slide.image.url) {
                    html += '<span class="hbss-ratio-badge">✓ 16:9</span>';
                }
                html += '</div></div>';
                html += '<div class="hbss-slide-fields">';
                html += '<label class="hbss-switch"><input type="checkbox" class="hbss-enabled" data-index="'+i+'"'+(slide.enabled?' checked':'')+'>';
                html += '<span class="hbss-switch-ui"></span><span class="hbss-switch-label">啟用此張</span></label>';
                html += '<div class="hbss-field"><label class="hbss-label">圖片替代文字（SEO）</label>';
                html += '<input type="text" class="regular-text hbss-alt" data-index="'+i+'" value="'+esc(slide.image.alt)+'"></div>';
                html += '<div class="hbss-field"><label class="hbss-label">點擊連結</label>';
                html += '<input type="text" class="regular-text hbss-href" data-index="'+i+'" value="'+esc(slide.href || '')+'" placeholder="/products 或 https://..."></div>';
                html += '</div></div></div>';

                $list.append(html);
            });

            $('#hbss-add-slide').prop('disabled', state.slides.length >= MAX_SLIDES);

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
                $('#hbss-live-preview').html('<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#646970;font-size:12px">尚無啟用中的圖片</div>');
                $('#hbss-preview-dots').empty();
                return;
            }

            if (previewIndex >= slides.length) previewIndex = 0;
            var slide = slides[previewIndex];
            $('#hbss-live-preview').html('<img src="'+esc(slide.image.url)+'" alt="'+esc(slide.image.alt)+'">');

            var dots = '';
            slides.forEach(function(_, i){
                dots += '<span class="hbss-dot'+(i===previewIndex?' on':'')+'"></span>';
            });
            $('#hbss-preview-dots').html(dots);
        }

        /* ─── Events ──────────────────────────────────────── */

        $(document).on('click', '#hbss-add-slide', function(){
            if (state.slides.length >= MAX_SLIDES) return;
            state.slides.push(newSlide());
            renderSlides();
        });

        $(document).on('click', '.hbss-remove', function(){
            var i = $(this).closest('.hbss-slide').data('index');
            if (state.slides.length <= 1) return;
            state.slides.splice(i, 1);
            renderSlides();
        });

        $(document).on('click', '.hbss-move', function(){
            var i = $(this).closest('.hbss-slide').data('index');
            var dir = parseInt($(this).data('dir'), 10);
            var j = i + dir;
            if (j < 0 || j >= state.slides.length) return;
            var tmp = state.slides[i];
            state.slides[i] = state.slides[j];
            state.slides[j] = tmp;
            renderSlides();
        });

        $(document).on('click', '.hbss-pick', function(){
            openCropFrame($(this).data('index'));
        });

        $(document).on('click', '.hbss-clear', function(){
            state.slides[$(this).data('index')].image.url = '';
            renderSlides();
        });

        $(document).on('input change', '.hbss-alt', function(){
            state.slides[$(this).data('index')].image.alt = $(this).val();
            renderPreview();
        });
        $(document).on('input change', '.hbss-href', function(){
            state.slides[$(this).data('index')].href = $(this).val();
        });
        $(document).on('change', '.hbss-enabled', function(){
            state.slides[$(this).data('index')].enabled = $(this).is(':checked');
            renderPreview();
        });
        $(document).on('input change', '[data-field]', renderPreview);

        $('#hbss-live-preview').on('click', function(){
            var slides = activeSlides();
            if (slides.length <= 1) return;
            previewIndex = (previewIndex + 1) % slides.length;
            renderPreview();
        });

        $('#hbss-form').on('submit', function(){
            syncTopFields();
            state.autoplayMs = Math.max(2000, Math.min(15000, parseInt(state.autoplayMs, 10) || 5000));
            $('#hbss-payload').val(JSON.stringify(state));
        });

        renderSlides();
    });
    </script>
    <?php
}
