<?php
/**
 * HOVER — 品牌故事頁（/brand）
 *
 * Footer「品牌故事」連結至此頁。文字會設計在圖裡，後台分別上傳桌機／手機圖。
 * SEO 標題、描述與正文仍由後台維護，前台以隱藏文字提供給搜尋引擎。
 *
 * 使用方式：
 * 1. Code Snippets → Add New → 貼上本檔
 * 2. Run snippet：Everywhere → 啟用
 * 3. 左側選單「HOVER 品牌故事」
 *
 * REST API（給 Next.js）：
 * GET /wp-json/hover/v1/brand-page
 */

if (!defined('ABSPATH')) {
    exit;
}

if (defined('HBPS_LOADED')) {
    return;
}
define('HBPS_LOADED', true);

const HBPS_OPTION = 'hover_brand_page_v1';

add_action('admin_menu', function () {
    if (!current_user_can('manage_options')) {
        return;
    }
    add_menu_page(
        'HOVER 品牌故事',
        'HOVER 品牌故事',
        'manage_options',
        'hbps',
        'hbps_render_page',
        'dashicons-book-alt',
        59
    );
}, 99);

add_action('admin_enqueue_scripts', function ($hook) {
    if ($hook !== 'toplevel_page_hbps') {
        return;
    }
    wp_enqueue_media();
});

add_action('admin_footer', 'hbps_admin_footer_script');

add_action('rest_api_init', function () {
    register_rest_route('hover/v1', '/brand-page', [
        'methods'             => 'GET',
        'callback'            => 'hbps_rest_brand_page',
        'permission_callback' => '__return_true',
    ]);
});

function hbps_defaults(): array
{
    return [
        'enabled' => true,
        'version' => '1',
        'imageDesktop' => [
            'url' => '',
            'alt' => 'HOVER 品牌故事',
        ],
        'imageMobile' => [
            'url' => '',
            'alt' => 'HOVER 品牌故事',
        ],
        'seoTitle'       => '品牌故事｜HOVER',
        'seoDescription' => '了解 HOVER 品牌故事。我們相信真正的風格，不是被定義，而是回到自己。探索 HOVER 中性日常服飾，以舒適剪裁與簡約質感，陪你找到屬於自己的經典。',
        'seoHeading'     => 'HOVER相信真正的風格，不是被定義，而是回到自己。',
        'seoBody'        => "我們不追逐流行，只願找到屬於自己的經典。\n陪你走過每一個日常，成為自己喜歡的樣子。",
    ];
}

function hbps_normalize_image($raw, array $fallback): array
{
    if (!is_array($raw)) {
        $raw = [];
    }
    return [
        'url' => esc_url_raw((string) ($raw['url'] ?? $fallback['url'] ?? '')),
        'alt' => sanitize_text_field((string) ($raw['alt'] ?? $fallback['alt'] ?? '')) ?: $fallback['alt'],
    ];
}

function hbps_normalize(array $data): array
{
    $d = hbps_defaults();
    $desktop = hbps_normalize_image($data['imageDesktop'] ?? [], $d['imageDesktop']);
    $mobile  = hbps_normalize_image($data['imageMobile'] ?? [], $d['imageMobile']);

    return [
        'enabled'        => !isset($data['enabled']) || !empty($data['enabled']),
        'version'        => sanitize_text_field((string) ($data['version'] ?? $d['version'])) ?: $d['version'],
        'imageDesktop'   => $desktop,
        'imageMobile'    => $mobile,
        'seoTitle'       => sanitize_text_field((string) ($data['seoTitle'] ?? $d['seoTitle'])) ?: $d['seoTitle'],
        'seoDescription' => sanitize_textarea_field((string) ($data['seoDescription'] ?? $d['seoDescription'])) ?: $d['seoDescription'],
        'seoHeading'     => sanitize_text_field((string) ($data['seoHeading'] ?? $d['seoHeading'])) ?: $d['seoHeading'],
        'seoBody'        => sanitize_textarea_field((string) ($data['seoBody'] ?? $d['seoBody'])) ?: $d['seoBody'],
    ];
}

function hbps_get_settings(): array
{
    $saved = get_option(HBPS_OPTION, []);
    if (!is_array($saved)) {
        $saved = [];
    }
    return hbps_normalize(array_replace_recursive(hbps_defaults(), $saved));
}

function hbps_save_from_post(): ?array
{
    if ($_SERVER['REQUEST_METHOD'] !== 'POST' || empty($_POST['hbps_act'])) {
        return null;
    }
    if (!wp_verify_nonce($_POST['hbps_nonce'] ?? '', 'hbps_save')) {
        return ['ok' => false, 'msg' => '安全驗證失敗，請重新整理後再試。'];
    }
    if (!current_user_can('manage_options')) {
        return ['ok' => false, 'msg' => '權限不足。'];
    }

    $act = sanitize_text_field((string) ($_POST['hbps_act'] ?? ''));
    if ($act === 'reset') {
        delete_option(HBPS_OPTION);
        return ['ok' => true, 'msg' => '已還原為預設品牌故事設定。'];
    }
    if ($act !== 'save') {
        return null;
    }

    $raw = json_decode(wp_unslash($_POST['hbps_payload'] ?? ''), true);
    if (!is_array($raw)) {
        return ['ok' => false, 'msg' => '資料格式錯誤。'];
    }

    update_option(HBPS_OPTION, hbps_normalize($raw), false);
    return ['ok' => true, 'msg' => '品牌故事頁已儲存。'];
}

function hbps_rest_brand_page(): WP_REST_Response
{
    return new WP_REST_Response([
        'ok'        => true,
        'brandPage' => hbps_get_settings(),
    ], 200);
}

function hbps_render_page(): void
{
    if (!current_user_can('manage_options')) {
        wp_die('權限不足');
    }

    $flash = hbps_save_from_post();
    $s = hbps_get_settings();
    $api_url = rest_url('hover/v1/brand-page');
    $has_desktop = !empty($s['imageDesktop']['url']);
    $has_mobile  = !empty($s['imageMobile']['url']);
    ?>
    <div class="wrap hover-bp-admin">
        <div class="hbps-shell">
            <div class="hbps-topbar">
                <div>
                    <h1>HOVER 品牌故事</h1>
                    <p class="description">Footer「品牌故事」頁（/brand）。畫面用圖片呈現（文字請直接設計在圖裡），SEO 文字給搜尋引擎讀取。儲存後約 1 分鐘內同步至網站。</p>
                </div>
                <div class="hbps-topbar-actions">
                    <span class="hbps-status <?php echo !empty($s['enabled']) && $has_desktop ? 'is-live' : ''; ?>">
                        <?php echo !empty($s['enabled']) && $has_desktop ? '已上傳桌機圖' : '尚未上傳桌機圖'; ?>
                    </span>
                    <button type="submit" form="hbps-form" class="button button-primary button-hero">儲存設定</button>
                </div>
            </div>

            <?php if ($flash) : ?>
                <div class="notice <?php echo $flash['ok'] ? 'notice-success' : 'notice-error'; ?> is-dismissible">
                    <p><?php echo esc_html($flash['msg']); ?></p>
                </div>
            <?php endif; ?>

            <div class="hbps-api-pill">
                <span class="dashicons dashicons-rest-api"></span>
                <span>REST API</span>
                <code><?php echo esc_html($api_url); ?></code>
            </div>

            <form id="hbps-form" method="post">
                <?php wp_nonce_field('hbps_save', 'hbps_nonce'); ?>
                <input type="hidden" name="hbps_act" value="save">
                <input type="hidden" name="hbps_payload" id="hbps-payload" value="">

                <div class="hbps-card">
                    <div class="hbps-card-head"><h2>圖片</h2></div>
                    <div class="hbps-card-body hbps-stack">
                        <label class="hbps-switch">
                            <input type="checkbox" data-field="enabled" <?php checked(!empty($s['enabled'])); ?>>
                            <span class="hbps-switch-ui"></span>
                            <span class="hbps-switch-label">啟用後台上傳圖片（關閉則前台沿用預設畫面）</span>
                        </label>

                        <div class="hbps-grid-2">
                            <div class="hbps-field">
                                <label class="hbps-label">桌機版圖片 <span class="hbps-hint">（建議寬 1920px，文字請做在圖裡，不強制裁切）</span></label>
                                <div class="hbps-image-preview" id="hbps-preview-desktop">
                                    <?php if ($has_desktop) : ?>
                                        <img src="<?php echo esc_url($s['imageDesktop']['url']); ?>" alt="">
                                    <?php else : ?>
                                        <div class="hbps-image-placeholder"><span class="dashicons dashicons-desktop"></span><span>尚未上傳</span></div>
                                    <?php endif; ?>
                                </div>
                                <input type="hidden" data-field="imageDesktop.url" value="<?php echo esc_attr($s['imageDesktop']['url']); ?>">
                                <div class="hbps-actions">
                                    <button type="button" class="button button-primary hbps-pick" data-field-url="imageDesktop.url" data-preview="hbps-preview-desktop">選圖</button>
                                    <button type="button" class="button hbps-clear" data-field-url="imageDesktop.url" data-preview="hbps-preview-desktop">清除</button>
                                </div>
                            </div>

                            <div class="hbps-field">
                                <label class="hbps-label">手機版圖片 <span class="hbps-hint">（建議寬 1080px；可留空沿用桌機圖）</span></label>
                                <div class="hbps-image-preview hbps-preview-mobile" id="hbps-preview-mobile">
                                    <?php if ($has_mobile) : ?>
                                        <img src="<?php echo esc_url($s['imageMobile']['url']); ?>" alt="">
                                    <?php else : ?>
                                        <div class="hbps-image-placeholder"><span class="dashicons dashicons-smartphone"></span><span>尚未上傳（可留空）</span></div>
                                    <?php endif; ?>
                                </div>
                                <input type="hidden" data-field="imageMobile.url" value="<?php echo esc_attr($s['imageMobile']['url']); ?>">
                                <div class="hbps-actions">
                                    <button type="button" class="button button-primary hbps-pick" data-field-url="imageMobile.url" data-preview="hbps-preview-mobile">選圖</button>
                                    <button type="button" class="button hbps-clear" data-field-url="imageMobile.url" data-preview="hbps-preview-mobile">清除</button>
                                </div>
                            </div>
                        </div>

                        <div class="hbps-field">
                            <label class="hbps-label" for="hbps-alt">圖片替代文字（alt）</label>
                            <input id="hbps-alt" type="text" class="regular-text" data-field="imageDesktop.alt" value="<?php echo esc_attr($s['imageDesktop']['alt']); ?>">
                        </div>
                    </div>
                </div>

                <div class="hbps-card">
                    <div class="hbps-card-head"><h2>SEO 文字（畫面上看不到，給搜尋引擎）</h2></div>
                    <div class="hbps-card-body hbps-stack">
                        <p class="description" style="margin:0">品牌故事文字若已設計在圖片裡，請仍把完整文案填在這裡，以免圖片化後搜尋不到內容。</p>
                        <div class="hbps-field">
                            <label class="hbps-label" for="hbps-seo-title">頁面標題（title）</label>
                            <input id="hbps-seo-title" type="text" class="large-text" data-field="seoTitle" value="<?php echo esc_attr($s['seoTitle']); ?>">
                        </div>
                        <div class="hbps-field">
                            <label class="hbps-label" for="hbps-seo-desc">Meta 描述</label>
                            <textarea id="hbps-seo-desc" class="large-text" rows="3" data-field="seoDescription"><?php echo esc_textarea($s['seoDescription']); ?></textarea>
                        </div>
                        <div class="hbps-field">
                            <label class="hbps-label" for="hbps-seo-h1">主標題（H1）</label>
                            <input id="hbps-seo-h1" type="text" class="large-text" data-field="seoHeading" value="<?php echo esc_attr($s['seoHeading']); ?>">
                        </div>
                        <div class="hbps-field">
                            <label class="hbps-label" for="hbps-seo-body">正文</label>
                            <textarea id="hbps-seo-body" class="large-text" rows="6" data-field="seoBody"><?php echo esc_textarea($s['seoBody']); ?></textarea>
                        </div>
                    </div>
                </div>

                <div class="hbps-foot">
                    <?php submit_button('儲存設定', 'primary large', 'submit', false); ?>
                </div>
            </form>

            <form method="post" class="hbps-reset-form" onsubmit="return confirm('確定還原為預設？已上傳的圖與 SEO 文字都會清空。');">
                <?php wp_nonce_field('hbps_save', 'hbps_nonce'); ?>
                <input type="hidden" name="hbps_act" value="reset">
                <button type="submit" class="button-link-delete">還原預設</button>
            </form>
        </div>
    </div>
    <script>
        window.HBPS_DATA = <?php echo wp_json_encode($s, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES); ?>;
    </script>
    <style>
        .hover-bp-admin { max-width: 1080px; }
        .hover-bp-admin .hbps-topbar {
            display: flex; align-items: flex-start; justify-content: space-between;
            gap: 16px; margin: 8px 0 16px;
        }
        .hover-bp-admin .hbps-topbar h1 { margin: 0 0 6px; }
        .hover-bp-admin .hbps-topbar-actions { display: flex; align-items: center; gap: 12px; }
        .hover-bp-admin .hbps-status {
            display: inline-flex; align-items: center; border-radius: 999px;
            padding: 6px 12px; font-size: 12px; background: #f0f0f1; color: #646970;
        }
        .hover-bp-admin .hbps-status.is-live { background: #e6f2ef; color: #1d4d44; }
        .hover-bp-admin .hbps-api-pill {
            display: inline-flex; align-items: center; gap: 8px; background: #fff;
            border: 1px solid #dcdcde; border-radius: 999px; padding: 8px 14px;
            margin-bottom: 16px; font-size: 12px; color: #646970;
        }
        .hover-bp-admin .hbps-api-pill code {
            font-size: 11px; background: #f6f7f7; padding: 2px 8px; border-radius: 999px;
        }
        .hover-bp-admin .hbps-card {
            background: #fff; border: 1px solid #dcdcde; border-radius: 8px;
            box-shadow: 0 1px 2px rgba(0,0,0,.04); overflow: hidden; margin-bottom: 16px;
        }
        .hover-bp-admin .hbps-card-head { padding: 14px 18px; border-bottom: 1px solid #f0f0f1; }
        .hover-bp-admin .hbps-card-head h2 { margin: 0; font-size: 14px; font-weight: 700; }
        .hover-bp-admin .hbps-card-body { padding: 18px; }
        .hover-bp-admin .hbps-stack { display: flex; flex-direction: column; gap: 16px; }
        .hover-bp-admin .hbps-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; }
        .hover-bp-admin .hbps-field { display: flex; flex-direction: column; gap: 6px; }
        .hover-bp-admin .hbps-label { font-weight: 600; font-size: 13px; }
        .hover-bp-admin .hbps-hint { font-weight: 500; color: #646970; }
        .hover-bp-admin .hbps-actions { display: flex; gap: 8px; flex-wrap: wrap; }
        .hover-bp-admin .hbps-image-preview {
            width: 100%; aspect-ratio: 16/10; border: 1px dashed #c3c4c7;
            border-radius: 8px; background: #f6f7f7; overflow: hidden; position: relative;
        }
        .hover-bp-admin .hbps-preview-mobile { aspect-ratio: 9/16; max-width: 280px; }
        .hover-bp-admin .hbps-image-preview img {
            position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; display: block;
        }
        .hover-bp-admin .hbps-image-placeholder {
            position: absolute; inset: 0; display: flex; flex-direction: column;
            align-items: center; justify-content: center; gap: 6px; color: #646970; font-size: 12px;
        }
        .hover-bp-admin .hbps-switch {
            display: inline-flex; align-items: center; gap: 10px; cursor: pointer; user-select: none;
        }
        .hover-bp-admin .hbps-switch input { position: absolute; opacity: 0; pointer-events: none; }
        .hover-bp-admin .hbps-switch-ui {
            width: 40px; height: 22px; border-radius: 999px; background: #c3c4c7; position: relative; transition: .2s;
        }
        .hover-bp-admin .hbps-switch-ui::after {
            content: ""; position: absolute; top: 3px; left: 3px; width: 16px; height: 16px;
            border-radius: 50%; background: #fff; transition: .2s; box-shadow: 0 1px 3px rgba(0,0,0,.2);
        }
        .hover-bp-admin .hbps-switch input:checked + .hbps-switch-ui { background: #2a514d; }
        .hover-bp-admin .hbps-switch input:checked + .hbps-switch-ui::after { transform: translateX(18px); }
        .hover-bp-admin .hbps-switch-label { font-weight: 600; font-size: 13px; }
        .hover-bp-admin .hbps-foot { margin-top: 4px; }
        .hover-bp-admin .hbps-reset-form { margin-top: 8px; }
        @media (max-width: 782px) {
            .hover-bp-admin .hbps-grid-2 { grid-template-columns: 1fr; }
            .hover-bp-admin .hbps-topbar { flex-direction: column; }
        }
    </style>
    <?php
}

function hbps_admin_footer_script(): void
{
    $screen = function_exists('get_current_screen') ? get_current_screen() : null;
    if (!$screen || $screen->id !== 'toplevel_page_hbps') {
        return;
    }
    ?>
    <script>
    jQuery(function($){
        var state = window.HBPS_DATA || {};

        function setByPath(obj, path, val){
            var parts = String(path).split('.');
            var cur = obj;
            for (var i = 0; i < parts.length - 1; i++) {
                if (!cur[parts[i]] || typeof cur[parts[i]] !== 'object') cur[parts[i]] = {};
                cur = cur[parts[i]];
            }
            cur[parts[parts.length - 1]] = val;
        }

        function readFields(){
            $('[data-field]').each(function(){
                var el = $(this);
                var path = String(el.data('field'));
                var val = el.is(':checkbox') ? el.is(':checked') : el.val();
                setByPath(state, path, val);
            });
            if (state.imageDesktop && !state.imageMobile) state.imageMobile = {};
            if (state.imageDesktop && state.imageMobile && !state.imageMobile.alt) {
                state.imageMobile.alt = state.imageDesktop.alt;
            }
        }

        function setPreview(previewId, url){
            var box = $('#' + previewId);
            if (!box.length) return;
            if (url) {
                box.html('<img src="' + url.replace(/"/g, '&quot;') + '" alt="">');
            } else if (previewId.indexOf('mobile') > -1) {
                box.html('<div class="hbps-image-placeholder"><span class="dashicons dashicons-smartphone"></span><span>尚未上傳（可留空）</span></div>');
            } else {
                box.html('<div class="hbps-image-placeholder"><span class="dashicons dashicons-desktop"></span><span>尚未上傳</span></div>');
            }
        }

        $('.hbps-pick').on('click', function(){
            if (typeof wp === 'undefined' || !wp.media) {
                alert('媒體庫尚未載入，請重新整理頁面後再試。');
                return;
            }
            var btn = $(this);
            var field = btn.data('field-url');
            var preview = btn.data('preview');
            var frame = wp.media({
                title: '選擇品牌故事圖片',
                library: { type: 'image' },
                button: { text: '使用此圖' },
                multiple: false
            });
            frame.on('select', function(){
                var att = frame.state().get('selection').first().toJSON();
                var url = att.url || '';
                $('[data-field="' + field + '"]').val(url);
                setByPath(state, field, url);
                setPreview(preview, url);
            });
            frame.open();
        });

        $('.hbps-clear').on('click', function(){
            var btn = $(this);
            var field = btn.data('field-url');
            var preview = btn.data('preview');
            $('[data-field="' + field + '"]').val('');
            setByPath(state, field, '');
            setPreview(preview, '');
        });

        $('#hbps-form').on('submit', function(){
            readFields();
            $('#hbps-payload').val(JSON.stringify(state));
        });
    });
    </script>
    <?php
}
