<?php
/**
 * HOVER — 首頁主圖輪播（Hero Studio）
 *
 * 使用方式（WordPress 後台）：
 * 1. Code Snippets → Add New → 貼上本檔
 * 2. Run snippet：Everywhere → 啟用
 * 3. 左側選單「HOVER 首頁主圖」
 *
 * REST API（給 Next.js）：
 * GET /wp-json/hover/v1/hero
 */

if (!defined('ABSPATH')) {
    exit;
}

if (defined('HHS_LOADED')) {
    return;
}
define('HHS_LOADED', true);

const HHS_OPTION = 'hover_hero_v1';

add_action('admin_menu', function () {
    if (!current_user_can('manage_options')) {
        return;
    }
    add_menu_page(
        'HOVER 首頁主圖',
        'HOVER 首頁主圖',
        'manage_options',
        'hhs',
        'hhs_render_page',
        'dashicons-images-alt2',
        57
    );
}, 99);

add_action('admin_enqueue_scripts', function ($hook) {
    if ($hook !== 'toplevel_page_hhs') {
        return;
    }
    wp_enqueue_media();
});

add_action('admin_footer', 'hhs_admin_footer_script');

add_action('rest_api_init', function () {
    register_rest_route('hover/v1', '/hero', [
        'methods'             => 'GET',
        'callback'            => 'hhs_rest_hero',
        'permission_callback' => '__return_true',
    ]);
});

function hhs_default_slide(string $id = 'hero-1'): array
{
    return [
        'id'      => $id,
        'enabled' => true,
        'image'   => [
            'url' => '',
            'alt' => 'HOVER',
        ],
        'link' => [
            'href' => '/products',
        ],
        'cta' => [
            'label' => 'SHOP NOW',
            'show'  => true,
        ],
    ];
}

function hhs_defaults(): array
{
    return [
        'enabled'    => true,
        'version'    => '1',
        'autoplayMs' => 5000,
        'slides'     => [hhs_default_slide()],
    ];
}

function hhs_sanitize_url(string $url): string
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

function hhs_normalize_slide(array $slide, int $index): array
{
    $d = hhs_default_slide('hero-' . ($index + 1));

    $image = $slide['image'] ?? [];
    $link  = $slide['link'] ?? [];
    $cta   = $slide['cta'] ?? [];

    return [
        'id'      => sanitize_text_field($slide['id'] ?? $d['id']) ?: $d['id'],
        'enabled' => !isset($slide['enabled']) || !empty($slide['enabled']),
        'image'   => [
            'url' => esc_url_raw($image['url'] ?? ''),
            'alt' => sanitize_text_field($image['alt'] ?? $d['image']['alt']),
        ],
        'link' => [
            'href' => hhs_sanitize_url($link['href'] ?? $d['link']['href']) ?: $d['link']['href'],
        ],
        'cta' => [
            'label' => sanitize_text_field($cta['label'] ?? $d['cta']['label']) ?: $d['cta']['label'],
            'show'  => !isset($cta['show']) || !empty($cta['show']),
        ],
    ];
}

function hhs_normalize(array $data): array
{
    $d = hhs_defaults();

    $data['enabled']    = !empty($data['enabled']);
    $data['version']    = sanitize_text_field($data['version'] ?? $d['version']) ?: $d['version'];
    $data['autoplayMs'] = max(2000, min(15000, intval($data['autoplayMs'] ?? $d['autoplayMs'])));

    $slides = [];
    if (!empty($data['slides']) && is_array($data['slides'])) {
        foreach ($data['slides'] as $i => $slide) {
            if (!is_array($slide)) {
                continue;
            }
            $normalized = hhs_normalize_slide($slide, $i);
            if ($normalized['image']['url'] !== '') {
                $slides[] = $normalized;
            }
        }
    }

    $data['slides'] = $slides ?: $d['slides'];

    return $data;
}

function hhs_get_settings(): array
{
    $saved = get_option(HHS_OPTION, []);
    if (!is_array($saved)) {
        $saved = [];
    }
    return hhs_normalize(array_replace_recursive(hhs_defaults(), $saved));
}

function hhs_save_from_post(): ?array
{
    if ($_SERVER['REQUEST_METHOD'] !== 'POST' || empty($_POST['hhs_act'])) {
        return null;
    }
    if (!wp_verify_nonce($_POST['hhs_nonce'] ?? '', 'hhs_save')) {
        return ['ok' => false, 'msg' => '安全驗證失敗，請重新整理後再試。'];
    }
    if (!current_user_can('manage_options')) {
        return ['ok' => false, 'msg' => '權限不足。'];
    }

    $act = sanitize_text_field($_POST['hhs_act']);
    if ($act === 'reset') {
        delete_option(HHS_OPTION);
        return ['ok' => true, 'msg' => '已還原為預設主圖設定。'];
    }

    if ($act !== 'save') {
        return null;
    }

    $raw = json_decode(wp_unslash($_POST['hhs_payload'] ?? ''), true);
    if (!is_array($raw)) {
        return ['ok' => false, 'msg' => '資料格式錯誤。'];
    }

    $normalized = hhs_normalize($raw);
    update_option(HHS_OPTION, $normalized, false);

    return ['ok' => true, 'msg' => '首頁主圖已儲存。'];
}

function hhs_rest_hero(): WP_REST_Response
{
    return new WP_REST_Response([
        'ok'   => true,
        'hero' => hhs_get_settings(),
    ], 200);
}

function hhs_active_count(array $s): int
{
    $n = 0;
    foreach ($s['slides'] as $slide) {
        if (!empty($slide['enabled']) && !empty($slide['image']['url'])) {
            $n++;
        }
    }
    return $n;
}

function hhs_render_page(): void
{
    if (!current_user_can('manage_options')) {
        wp_die('權限不足');
    }

    $flash = hhs_save_from_post();
    $s = hhs_get_settings();
    $api_url = rest_url('hover/v1/hero');
    $active_n = hhs_active_count($s);
    ?>
    <div class="wrap hover-hero-admin">
        <div class="hhs-shell">
            <div class="hhs-topbar">
                <div>
                    <h1>HOVER 首頁主圖</h1>
                    <p class="description">管理首頁 Hero 輪播：上傳圖片、設定連結與 CTA。前台支援自動輪播與拖曳切換。儲存後約 1 分鐘內同步至 Next.js。</p>
                </div>
                <div class="hhs-topbar-actions">
                    <span class="hhs-status <?php echo !empty($s['enabled']) && $active_n ? 'is-live' : ''; ?>">
                        <?php echo !empty($s['enabled']) && $active_n ? "上線中 · {$active_n} 張" : '未上線'; ?>
                    </span>
                    <button type="submit" form="hhs-form" class="button button-primary button-hero">儲存設定</button>
                </div>
            </div>

            <?php if ($flash) : ?>
                <div class="notice <?php echo $flash['ok'] ? 'notice-success' : 'notice-error'; ?> is-dismissible">
                    <p><?php echo esc_html($flash['msg']); ?></p>
                </div>
            <?php endif; ?>

            <div class="hhs-api-pill">
                <span class="dashicons dashicons-rest-api"></span>
                <span>REST API</span>
                <code><?php echo esc_html($api_url); ?></code>
            </div>

            <form id="hhs-form" method="post">
                <?php wp_nonce_field('hhs_save', 'hhs_nonce'); ?>
                <input type="hidden" name="hhs_act" value="save">
                <input type="hidden" name="hhs_payload" id="hhs-payload" value="">

                <div class="hhs-layout">
                    <div class="hhs-main">
                        <div class="hhs-card">
                            <div class="hhs-card-head"><h2>輪播設定</h2></div>
                            <div class="hhs-card-body hhs-grid-2">
                                <label class="hhs-switch hhs-span-2">
                                    <input type="checkbox" data-field="enabled" <?php checked(!empty($s['enabled'])); ?>>
                                    <span class="hhs-switch-ui"></span>
                                    <span class="hhs-switch-label">啟用首頁主圖輪播</span>
                                </label>
                                <div class="hhs-field">
                                    <label class="hhs-label">自動輪播間隔（毫秒）</label>
                                    <input type="number" min="2000" max="15000" step="500" data-field="autoplayMs" value="<?php echo esc_attr($s['autoplayMs']); ?>">
                                    <p class="description">建議 4000–6000。訪客拖曳後會暫停數秒。</p>
                                </div>
                                <div class="hhs-field">
                                    <label class="hhs-label">版本代號</label>
                                    <input type="text" class="regular-text" data-field="version" value="<?php echo esc_attr($s['version']); ?>">
                                    <p class="description">變更代號可協助追蹤不同版次內容。</p>
                                </div>
                            </div>
                        </div>

                        <div class="hhs-card">
                            <div class="hhs-card-head">
                                <h2>輪播圖片</h2>
                                <button type="button" class="button button-secondary" id="hhs-add-slide">＋ 新增一張</button>
                            </div>
                            <div class="hhs-card-body">
                                <div id="hhs-slides-list" class="hhs-slides"></div>
                                <p class="description hhs-empty-hint" id="hhs-empty-hint">至少需一張有圖片的 slide 才會在前台顯示。</p>
                            </div>
                        </div>
                    </div>

                    <aside class="hhs-preview">
                        <div class="hhs-card hhs-preview-card">
                            <div class="hhs-card-head">
                                <div>
                                    <h2>即時預覽</h2>
                                    <p class="description" style="margin:4px 0 0">模擬前台 Hero 比例</p>
                                </div>
                            </div>
                            <div class="hhs-preview-body">
                                <div class="hhs-mock-hero" id="hhs-live-preview"></div>
                            </div>
                            <div class="hhs-preview-foot">
                                <span id="hhs-preview-dots"></span>
                            </div>
                        </div>
                    </aside>
                </div>
            </form>

            <form method="post" class="hhs-reset-form" onsubmit="return confirm('確定還原為預設主圖？');">
                <?php wp_nonce_field('hhs_save', 'hhs_nonce'); ?>
                <input type="hidden" name="hhs_act" value="reset">
                <button type="submit" class="button">還原預設</button>
            </form>
        </div>
    </div>
    <?php
    hhs_print_admin_styles();
}

function hhs_print_admin_styles(): void
{
    ?>
    <style>
        .hover-hero-admin .hhs-shell { margin-top: 8px; max-width: 1180px; }
        .hover-hero-admin .hhs-topbar {
            display: flex; align-items: flex-start; justify-content: space-between;
            gap: 16px; margin-bottom: 16px;
        }
        .hover-hero-admin .hhs-topbar h1 { margin: 0 0 6px; }
        .hover-hero-admin .hhs-topbar-actions {
            display: flex; gap: 10px; align-items: center; flex-shrink: 0;
        }
        .hover-hero-admin .hhs-status {
            display: inline-flex; align-items: center; gap: 6px;
            padding: 6px 12px; border-radius: 999px; font-size: 12px; font-weight: 600;
            background: #f0f0f1; color: #646970;
        }
        .hover-hero-admin .hhs-status.is-live { background: #edf7f1; color: #1a6847; }
        .hover-hero-admin .hhs-status.is-live::before {
            content: ""; width: 8px; height: 8px; border-radius: 50%; background: #2a514d;
        }
        .hover-hero-admin .hhs-api-pill {
            display: inline-flex; align-items: center; gap: 8px;
            background: #fff; border: 1px solid #dcdcde; border-radius: 999px;
            padding: 8px 14px; margin-bottom: 16px; font-size: 12px; color: #646970;
        }
        .hover-hero-admin .hhs-api-pill code {
            font-size: 11px; background: #f6f7f7; padding: 2px 8px; border-radius: 999px;
        }
        .hover-hero-admin .hhs-layout {
            display: grid; grid-template-columns: minmax(0, 1fr) 340px; gap: 16px; align-items: start;
        }
        .hover-hero-admin .hhs-card {
            background: #fff; border: 1px solid #dcdcde; border-radius: 8px;
            box-shadow: 0 1px 2px rgba(0,0,0,.04); overflow: hidden; margin-bottom: 16px;
        }
        .hover-hero-admin .hhs-card-head {
            display: flex; align-items: center; justify-content: space-between; gap: 10px;
            padding: 14px 18px; border-bottom: 1px solid #f0f0f1;
        }
        .hover-hero-admin .hhs-card-head h2 { margin: 0; font-size: 14px; font-weight: 700; }
        .hover-hero-admin .hhs-card-body { padding: 18px; }
        .hover-hero-admin .hhs-grid-2 {
            display: grid; grid-template-columns: 1fr 1fr; gap: 14px 16px;
        }
        .hover-hero-admin .hhs-span-2 { grid-column: 1 / -1; }
        .hover-hero-admin .hhs-field { display: flex; flex-direction: column; gap: 6px; }
        .hover-hero-admin .hhs-label { font-weight: 600; font-size: 13px; }
        .hover-hero-admin .hhs-switch {
            display: inline-flex; align-items: center; gap: 12px; cursor: pointer; user-select: none;
        }
        .hover-hero-admin .hhs-switch input { position: absolute; opacity: 0; pointer-events: none; }
        .hover-hero-admin .hhs-switch-ui {
            width: 44px; height: 24px; border-radius: 999px; background: #c3c4c7; position: relative; transition: .2s;
        }
        .hover-hero-admin .hhs-switch-ui::after {
            content: ""; position: absolute; top: 3px; left: 3px; width: 18px; height: 18px;
            border-radius: 50%; background: #fff; transition: .2s; box-shadow: 0 1px 3px rgba(0,0,0,.2);
        }
        .hover-hero-admin .hhs-switch input:checked + .hhs-switch-ui { background: #2a514d; }
        .hover-hero-admin .hhs-switch input:checked + .hhs-switch-ui::after { transform: translateX(20px); }
        .hover-hero-admin .hhs-switch-label { font-weight: 600; font-size: 13px; }
        .hover-hero-admin .hhs-slides { display: flex; flex-direction: column; gap: 14px; }
        .hover-hero-admin .hhs-slide {
            border: 1px solid #dcdcde; border-radius: 8px; background: #fcfcfd; overflow: hidden;
        }
        .hover-hero-admin .hhs-slide-head {
            display: flex; align-items: center; justify-content: space-between; gap: 8px;
            padding: 10px 14px; background: #f6f7f7; border-bottom: 1px solid #eef2f6;
        }
        .hover-hero-admin .hhs-slide-title { font-size: 13px; font-weight: 700; color: #202223; }
        .hover-hero-admin .hhs-slide-actions { display: flex; gap: 4px; flex-wrap: wrap; }
        .hover-hero-admin .hhs-slide-body {
            display: grid; grid-template-columns: 140px 1fr; gap: 14px; padding: 14px;
        }
        .hover-hero-admin .hhs-thumb {
            aspect-ratio: 3/4; border-radius: 6px; border: 1px dashed #c3c4c7;
            background: #f6f7f7; overflow: hidden; display: flex; align-items: center; justify-content: center;
        }
        .hover-hero-admin .hhs-thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }
        .hover-hero-admin .hhs-thumb-empty { font-size: 11px; color: #646970; text-align: center; padding: 8px; }
        .hover-hero-admin .hhs-slide-fields { display: grid; grid-template-columns: 1fr 1fr; gap: 10px 12px; }
        .hover-hero-admin .hhs-slide-fields .hhs-field.full { grid-column: 1 / -1; }
        .hover-hero-admin .hhs-media-actions { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 6px; }
        .hover-hero-admin .hhs-preview { position: sticky; top: 32px; }
        .hover-hero-admin .hhs-preview-body {
            padding: 16px; background: #eef2f6;
        }
        .hover-hero-admin .hhs-mock-hero {
            position: relative; width: 100%; aspect-ratio: 16/10; border-radius: 6px;
            overflow: hidden; background: #ddd;
        }
        .hover-hero-admin .hhs-mock-hero img {
            width: 100%; height: 100%; object-fit: cover; object-position: top;
        }
        .hover-hero-admin .hhs-mock-cta {
            position: absolute; left: 50%; bottom: 18%; transform: translateX(-50%);
            color: #fff; font-family: Georgia, serif; font-size: 13px; letter-spacing: .18em;
            text-shadow: 0 1px 8px rgba(0,0,0,.35);
        }
        .hover-hero-admin .hhs-mock-cta::after {
            content: ""; display: block; width: 72px; height: 1px; background: #fff; margin: 6px auto 0;
        }
        .hover-hero-admin .hhs-preview-foot {
            padding: 10px 16px 14px; display: flex; justify-content: center; gap: 6px;
            border-top: 1px solid #f0f0f1;
        }
        .hover-hero-admin .hhs-dot {
            width: 6px; height: 6px; border-radius: 999px; background: #c3c4c7;
        }
        .hover-hero-admin .hhs-dot.on { width: 18px; background: #2a514d; }
        .hover-hero-admin .hhs-reset-form { margin-top: 8px; }
        .hover-hero-admin .hhs-empty-hint { margin: 0; }
        @media (max-width: 960px) {
            .hover-hero-admin .hhs-layout { grid-template-columns: 1fr; }
            .hover-hero-admin .hhs-preview { position: static; }
            .hover-hero-admin .hhs-grid-2,
            .hover-hero-admin .hhs-slide-body,
            .hover-hero-admin .hhs-slide-fields { grid-template-columns: 1fr; }
        }
    </style>
    <?php
}

function hhs_admin_footer_script(): void
{
    $screen = function_exists('get_current_screen') ? get_current_screen() : null;
    if (!$screen || $screen->id !== 'toplevel_page_hhs') {
        return;
    }

    $s = hhs_get_settings();
    ?>
    <script>
    jQuery(function($){
        var state = <?php echo wp_json_encode($s, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES); ?>;
        var previewIndex = 0;

        function esc(s){ return $('<div/>').text(s || '').html(); }

        function newSlide(){
            return {
                id: 'slide-' + Date.now(),
                enabled: true,
                image: { url: '', alt: 'HOVER' },
                link: { href: '/products' },
                cta: { label: 'SHOP NOW', show: true }
            };
        }

        function activeSlides(){
            if (!state.enabled) return [];
            return (state.slides || []).filter(function(s){
                return s.enabled && s.image && s.image.url;
            });
        }

        function renderSlides(){
            var $list = $('#hhs-slides-list').empty();
            if (!state.slides || !state.slides.length) {
                state.slides = [newSlide()];
            }

            state.slides.forEach(function(slide, i){
                var thumb = slide.image && slide.image.url
                    ? '<img src="'+esc(slide.image.url)+'" alt="">'
                    : '<div class="hhs-thumb-empty">尚未選圖</div>';

                var html = '<div class="hhs-slide" data-index="'+i+'">';
                html += '<div class="hhs-slide-head">';
                html += '<span class="hhs-slide-title">Slide '+(i+1)+'</span>';
                html += '<div class="hhs-slide-actions">';
                html += '<button type="button" class="button button-small hhs-move" data-dir="-1"'+(i===0?' disabled':'')+'>↑</button>';
                html += '<button type="button" class="button button-small hhs-move" data-dir="1"'+(i===state.slides.length-1?' disabled':'')+'>↓</button>';
                html += '<button type="button" class="button button-small hhs-remove"'+(state.slides.length<=1?' disabled':'')+'>刪除</button>';
                html += '</div></div>';
                html += '<div class="hhs-slide-body">';
                html += '<div><div class="hhs-thumb" data-thumb="'+i+'">'+thumb+'</div>';
                html += '<div class="hhs-media-actions">';
                html += '<button type="button" class="button button-primary button-small hhs-pick" data-index="'+i+'">選圖</button>';
                html += '<button type="button" class="button button-small hhs-clear" data-index="'+i+'">清除</button>';
                html += '</div></div>';
                html += '<div class="hhs-slide-fields">';
                html += '<label class="hhs-switch hhs-span-2"><input type="checkbox" class="hhs-enabled" data-index="'+i+'"'+(slide.enabled?' checked':'')+'>';
                html += '<span class="hhs-switch-ui"></span><span class="hhs-switch-label">啟用此張</span></label>';
                html += '<div class="hhs-field full"><label class="hhs-label">圖片替代文字</label>';
                html += '<input type="text" class="regular-text hhs-alt" data-index="'+i+'" value="'+esc(slide.image.alt)+'"></div>';
                html += '<div class="hhs-field full"><label class="hhs-label">點擊連結</label>';
                html += '<input type="text" class="regular-text hhs-href" data-index="'+i+'" value="'+esc(slide.link.href)+'" placeholder="/products"></div>';
                html += '<label class="hhs-switch"><input type="checkbox" class="hhs-cta-show" data-index="'+i+'"'+(slide.cta.show?' checked':'')+'>';
                html += '<span class="hhs-switch-ui"></span><span class="hhs-switch-label">顯示 CTA</span></label>';
                html += '<div class="hhs-field"><label class="hhs-label">CTA 文字</label>';
                html += '<input type="text" class="regular-text hhs-cta-label" data-index="'+i+'" value="'+esc(slide.cta.label)+'"></div>';
                html += '</div></div></div>';

                $list.append(html);
            });

            renderPreview();
        }

        function renderPreview(){
            $('[data-field]').each(function(){
                var el = $(this);
                var path = el.data('field').split('.');
                var val = el.is(':checkbox') ? el.is(':checked') : el.val();
                if (path.length === 1) state[path[0]] = val;
            });

            var slides = activeSlides();
            if (!slides.length) {
                $('#hhs-live-preview').html('<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#646970;font-size:12px">尚無啟用中的主圖</div>');
                $('#hhs-preview-dots').empty();
                return;
            }

            if (previewIndex >= slides.length) previewIndex = 0;
            var slide = slides[previewIndex];
            var html = '<img src="'+esc(slide.image.url)+'" alt="'+esc(slide.image.alt)+'">';
            if (slide.cta && slide.cta.show && slide.cta.label) {
                html += '<div class="hhs-mock-cta">'+esc(slide.cta.label)+'</div>';
            }
            $('#hhs-live-preview').html(html);

            var dots = '';
            slides.forEach(function(_, i){
                dots += '<span class="hhs-dot'+(i===previewIndex?' on':'')+'"></span>';
            });
            $('#hhs-preview-dots').html(dots);
        }

        $(document).on('click', '#hhs-add-slide', function(){
            state.slides.push(newSlide());
            renderSlides();
        });

        $(document).on('click', '.hhs-remove', function(){
            var i = $(this).closest('.hhs-slide').data('index');
            if (state.slides.length <= 1) return;
            state.slides.splice(i, 1);
            renderSlides();
        });

        $(document).on('click', '.hhs-move', function(){
            var i = $(this).closest('.hhs-slide').data('index');
            var dir = parseInt($(this).data('dir'), 10);
            var j = i + dir;
            if (j < 0 || j >= state.slides.length) return;
            var tmp = state.slides[i];
            state.slides[i] = state.slides[j];
            state.slides[j] = tmp;
            renderSlides();
        });

        $(document).on('click', '.hhs-pick', function(){
            if (typeof wp === 'undefined' || !wp.media) {
                alert('媒體庫尚未載入，請重新整理頁面後再試。');
                return;
            }
            var i = $(this).data('index');
            var frame = wp.media({ title: '選擇主圖', button: { text: '使用這張圖' }, multiple: false, library: { type: 'image' } });
            frame.on('select', function(){
                var url = frame.state().get('selection').first().toJSON().url;
                state.slides[i].image.url = url;
                renderSlides();
            });
            frame.open();
        });

        $(document).on('click', '.hhs-clear', function(){
            var i = $(this).data('index');
            state.slides[i].image.url = '';
            renderSlides();
        });

        $(document).on('input change', '.hhs-alt', function(){
            state.slides[$(this).data('index')].image.alt = $(this).val();
            renderPreview();
        });
        $(document).on('input change', '.hhs-href', function(){
            state.slides[$(this).data('index')].link.href = $(this).val();
        });
        $(document).on('input change', '.hhs-cta-label', function(){
            state.slides[$(this).data('index')].cta.label = $(this).val();
            renderPreview();
        });
        $(document).on('change', '.hhs-enabled', function(){
            state.slides[$(this).data('index')].enabled = $(this).is(':checked');
            renderPreview();
        });
        $(document).on('change', '.hhs-cta-show', function(){
            state.slides[$(this).data('index')].cta.show = $(this).is(':checked');
            renderPreview();
        });
        $(document).on('input change', '[data-field]', renderPreview);

        $('#hhs-live-preview').on('click', function(){
            var slides = activeSlides();
            if (slides.length <= 1) return;
            previewIndex = (previewIndex + 1) % slides.length;
            renderPreview();
        });

        $('#hhs-form').on('submit', function(){
            $('[data-field]').each(function(){
                var el = $(this);
                var path = el.data('field').split('.');
                var val = el.is(':checkbox') ? el.is(':checked') : el.val();
                if (path.length === 1) state[path[0]] = val;
            });
            state.autoplayMs = Math.max(2000, Math.min(15000, parseInt(state.autoplayMs, 10) || 5000));
            $('#hhs-payload').val(JSON.stringify(state));
        });

        renderSlides();
    });
    </script>
    <?php
}
