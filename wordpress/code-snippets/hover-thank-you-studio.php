<?php
/**
 * HOVER — 感謝頁底部 Banner（/thank-you）
 *
 * 使用方式：
 * 1. Code Snippets → Add New → 貼上本檔
 * 2. Run snippet：Everywhere → 啟用
 * 3. 左側選單「HOVER 感謝頁」
 *
 * REST API（給 Next.js）：
 * GET /wp-json/hover/v1/thank-you-page
 */

if (!defined('ABSPATH')) {
    exit;
}

if (defined('HTPS_LOADED')) {
    return;
}
define('HTPS_LOADED', true);

const HTPS_OPTION = 'hover_thank_you_page_v1';

add_action('admin_menu', function () {
    if (!current_user_can('manage_options')) {
        return;
    }
    add_menu_page(
        'HOVER 感謝頁',
        'HOVER 感謝頁',
        'manage_options',
        'htps',
        'htps_render_page',
        'dashicons-heart',
        60
    );
}, 99);

add_action('admin_enqueue_scripts', function ($hook) {
    if ($hook !== 'toplevel_page_htps') {
        return;
    }
    wp_enqueue_media();
});

add_action('admin_footer', 'htps_admin_footer_script');

add_action('rest_api_init', function () {
    register_rest_route('hover/v1', '/thank-you-page', [
        'methods'             => 'GET',
        'callback'            => 'htps_rest_thank_you_page',
        'permission_callback' => '__return_true',
    ]);
});

function htps_defaults(): array
{
    return [
        'enabled' => true,
        'version' => '1',
        'imageDesktop' => [
            'url' => '',
            'alt' => 'HOVER',
        ],
        'imageMobile' => [
            'url' => '',
            'alt' => 'HOVER',
        ],
    ];
}

function htps_normalize_image($raw, array $fallback): array
{
    if (!is_array($raw)) {
        $raw = [];
    }
    return [
        'url' => esc_url_raw((string) ($raw['url'] ?? $fallback['url'] ?? '')),
        'alt' => sanitize_text_field((string) ($raw['alt'] ?? $fallback['alt'] ?? '')) ?: $fallback['alt'],
    ];
}

function htps_normalize(array $data): array
{
    $d = htps_defaults();
    $desktop = htps_normalize_image($data['imageDesktop'] ?? [], $d['imageDesktop']);
    $mobile  = htps_normalize_image($data['imageMobile'] ?? [], $d['imageMobile']);

    return [
        'enabled'      => !isset($data['enabled']) || !empty($data['enabled']),
        'version'      => sanitize_text_field((string) ($data['version'] ?? $d['version'])) ?: $d['version'],
        'imageDesktop' => $desktop,
        'imageMobile'  => $mobile,
    ];
}

function htps_get_settings(): array
{
    $saved = get_option(HTPS_OPTION, []);
    if (!is_array($saved)) {
        $saved = [];
    }
    return htps_normalize(array_replace_recursive(htps_defaults(), $saved));
}

function htps_save_from_post(): ?array
{
    if ($_SERVER['REQUEST_METHOD'] !== 'POST' || empty($_POST['htps_act'])) {
        return null;
    }
    if (!wp_verify_nonce($_POST['htps_nonce'] ?? '', 'htps_save')) {
        return ['ok' => false, 'msg' => '安全驗證失敗，請重新整理後再試。'];
    }
    if (!current_user_can('manage_options')) {
        return ['ok' => false, 'msg' => '權限不足。'];
    }

    $act = sanitize_text_field((string) ($_POST['htps_act'] ?? ''));
    if ($act === 'reset') {
        delete_option(HTPS_OPTION);
        return ['ok' => true, 'msg' => '已還原為預設感謝頁設定。'];
    }
    if ($act !== 'save') {
        return null;
    }

    $raw = json_decode(wp_unslash($_POST['htps_payload'] ?? ''), true);
    if (!is_array($raw)) {
        return ['ok' => false, 'msg' => '資料格式錯誤。'];
    }

    update_option(HTPS_OPTION, htps_normalize($raw), false);
    return ['ok' => true, 'msg' => '感謝頁 Banner 已儲存。'];
}

function htps_rest_thank_you_page(): WP_REST_Response
{
    return new WP_REST_Response([
        'ok'           => true,
        'thankYouPage' => htps_get_settings(),
    ], 200);
}

function htps_render_page(): void
{
    if (!current_user_can('manage_options')) {
        wp_die('權限不足');
    }

    $flash = htps_save_from_post();
    $s = htps_get_settings();
    $api_url = rest_url('hover/v1/thank-you-page');
    $has_desktop = !empty($s['imageDesktop']['url']);
    $has_mobile  = !empty($s['imageMobile']['url']);
    ?>
    <div class="wrap hover-ty-admin">
        <div class="htps-shell">
            <div class="htps-topbar">
                <div>
                    <h1>HOVER 感謝頁</h1>
                    <p class="description">訂單完成頁（/thank-you）底部 Banner。可分別上傳桌機／手機圖；未上傳時前台沿用預設圖。儲存後約 1 分鐘內同步至網站。</p>
                </div>
                <div class="htps-topbar-actions">
                    <span class="htps-status <?php echo !empty($s['enabled']) && $has_desktop ? 'is-live' : ''; ?>">
                        <?php echo !empty($s['enabled']) && $has_desktop ? '已上傳桌機圖' : '尚未上傳桌機圖'; ?>
                    </span>
                    <button type="submit" form="htps-form" class="button button-primary button-hero">儲存設定</button>
                </div>
            </div>

            <?php if ($flash) : ?>
                <div class="notice <?php echo $flash['ok'] ? 'notice-success' : 'notice-error'; ?> is-dismissible">
                    <p><?php echo esc_html($flash['msg']); ?></p>
                </div>
            <?php endif; ?>

            <div class="htps-api-pill">
                <span class="dashicons dashicons-rest-api"></span>
                <span>REST API</span>
                <code><?php echo esc_html($api_url); ?></code>
            </div>

            <form id="htps-form" method="post">
                <?php wp_nonce_field('htps_save', 'htps_nonce'); ?>
                <input type="hidden" name="htps_act" value="save">
                <input type="hidden" name="htps_payload" id="htps-payload" value="">

                <div class="htps-card">
                    <div class="htps-card-head"><h2>底部 Banner 圖片</h2></div>
                    <div class="htps-card-body htps-stack">
                        <label class="htps-switch">
                            <input type="checkbox" data-field="enabled" <?php checked(!empty($s['enabled'])); ?>>
                            <span class="htps-switch-ui"></span>
                            <span class="htps-switch-label">啟用後台上傳圖片（關閉則前台沿用預設圖）</span>
                        </label>

                        <div class="htps-grid-2">
                            <div class="htps-field">
                                <label class="htps-label">桌機版圖片 <span class="htps-hint">（建議寬 1400px 以上，比例約 16:6）</span></label>
                                <div class="htps-image-preview" id="htps-preview-desktop">
                                    <?php if ($has_desktop) : ?>
                                        <img src="<?php echo esc_url($s['imageDesktop']['url']); ?>" alt="">
                                    <?php else : ?>
                                        <div class="htps-image-placeholder"><span class="dashicons dashicons-desktop"></span><span>尚未上傳</span></div>
                                    <?php endif; ?>
                                </div>
                                <input type="hidden" data-field="imageDesktop.url" value="<?php echo esc_attr($s['imageDesktop']['url']); ?>">
                                <div class="htps-actions">
                                    <button type="button" class="button button-primary htps-pick" data-field-url="imageDesktop.url" data-preview="htps-preview-desktop">選圖</button>
                                    <button type="button" class="button htps-clear" data-field-url="imageDesktop.url" data-preview="htps-preview-desktop">清除</button>
                                </div>
                            </div>

                            <div class="htps-field">
                                <label class="htps-label">手機版圖片 <span class="htps-hint">（建議寬 1080px；可留空沿用桌機圖）</span></label>
                                <div class="htps-image-preview htps-preview-mobile" id="htps-preview-mobile">
                                    <?php if ($has_mobile) : ?>
                                        <img src="<?php echo esc_url($s['imageMobile']['url']); ?>" alt="">
                                    <?php else : ?>
                                        <div class="htps-image-placeholder"><span class="dashicons dashicons-smartphone"></span><span>尚未上傳（可留空）</span></div>
                                    <?php endif; ?>
                                </div>
                                <input type="hidden" data-field="imageMobile.url" value="<?php echo esc_attr($s['imageMobile']['url']); ?>">
                                <div class="htps-actions">
                                    <button type="button" class="button button-primary htps-pick" data-field-url="imageMobile.url" data-preview="htps-preview-mobile">選圖</button>
                                    <button type="button" class="button htps-clear" data-field-url="imageMobile.url" data-preview="htps-preview-mobile">清除</button>
                                </div>
                            </div>
                        </div>

                        <div class="htps-field">
                            <label class="htps-label" for="htps-alt">圖片替代文字（alt）</label>
                            <input id="htps-alt" type="text" class="regular-text" data-field="imageDesktop.alt" value="<?php echo esc_attr($s['imageDesktop']['alt']); ?>">
                        </div>
                    </div>
                </div>

                <div class="htps-foot">
                    <?php submit_button('儲存設定', 'primary large', 'submit', false); ?>
                </div>
            </form>

            <form method="post" class="htps-reset-form" onsubmit="return confirm('確定還原為預設？已上傳的圖片都會清空。');">
                <?php wp_nonce_field('htps_save', 'htps_nonce'); ?>
                <input type="hidden" name="htps_act" value="reset">
                <button type="submit" class="button-link-delete">還原預設</button>
            </form>
        </div>
    </div>
    <script>
        window.HTPS_DATA = <?php echo wp_json_encode($s, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES); ?>;
    </script>
    <style>
        .hover-ty-admin { max-width: 1080px; }
        .hover-ty-admin .htps-topbar {
            display: flex; align-items: flex-start; justify-content: space-between;
            gap: 16px; margin: 8px 0 16px;
        }
        .hover-ty-admin .htps-topbar h1 { margin: 0 0 6px; }
        .hover-ty-admin .htps-topbar-actions { display: flex; align-items: center; gap: 12px; }
        .hover-ty-admin .htps-status {
            display: inline-flex; align-items: center; border-radius: 999px;
            padding: 6px 12px; font-size: 12px; background: #f0f0f1; color: #646970;
        }
        .hover-ty-admin .htps-status.is-live { background: #e6f2ef; color: #1d4d44; }
        .hover-ty-admin .htps-api-pill {
            display: inline-flex; align-items: center; gap: 8px; background: #fff;
            border: 1px solid #dcdcde; border-radius: 999px; padding: 8px 14px;
            margin-bottom: 16px; font-size: 12px; color: #646970;
        }
        .hover-ty-admin .htps-api-pill code {
            font-size: 11px; background: #f6f7f7; padding: 2px 8px; border-radius: 999px;
        }
        .hover-ty-admin .htps-card {
            background: #fff; border: 1px solid #dcdcde; border-radius: 8px;
            box-shadow: 0 1px 2px rgba(0,0,0,.04); overflow: hidden; margin-bottom: 16px;
        }
        .hover-ty-admin .htps-card-head { padding: 14px 18px; border-bottom: 1px solid #f0f0f1; }
        .hover-ty-admin .htps-card-head h2 { margin: 0; font-size: 14px; font-weight: 700; }
        .hover-ty-admin .htps-card-body { padding: 18px; }
        .hover-ty-admin .htps-stack { display: flex; flex-direction: column; gap: 16px; }
        .hover-ty-admin .htps-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; }
        .hover-ty-admin .htps-field { display: flex; flex-direction: column; gap: 6px; }
        .hover-ty-admin .htps-label { font-weight: 600; font-size: 13px; }
        .hover-ty-admin .htps-hint { font-weight: 500; color: #646970; }
        .hover-ty-admin .htps-actions { display: flex; gap: 8px; flex-wrap: wrap; }
        .hover-ty-admin .htps-image-preview {
            width: 100%; aspect-ratio: 16/6; border: 1px dashed #c3c4c7;
            border-radius: 8px; background: #f6f7f7; overflow: hidden; position: relative;
        }
        .hover-ty-admin .htps-preview-mobile { aspect-ratio: 16/7; max-width: 280px; }
        .hover-ty-admin .htps-image-preview img {
            position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; display: block;
        }
        .hover-ty-admin .htps-image-placeholder {
            position: absolute; inset: 0; display: flex; flex-direction: column;
            align-items: center; justify-content: center; gap: 6px; color: #646970; font-size: 12px;
        }
        .hover-ty-admin .htps-switch {
            display: inline-flex; align-items: center; gap: 10px; cursor: pointer; user-select: none;
        }
        .hover-ty-admin .htps-switch input { position: absolute; opacity: 0; pointer-events: none; }
        .hover-ty-admin .htps-switch-ui {
            width: 40px; height: 22px; border-radius: 999px; background: #c3c4c7; position: relative; transition: .2s;
        }
        .hover-ty-admin .htps-switch-ui::after {
            content: ""; position: absolute; top: 3px; left: 3px; width: 16px; height: 16px;
            border-radius: 50%; background: #fff; transition: .2s; box-shadow: 0 1px 3px rgba(0,0,0,.2);
        }
        .hover-ty-admin .htps-switch input:checked + .htps-switch-ui { background: #2a514d; }
        .hover-ty-admin .htps-switch input:checked + .htps-switch-ui::after { transform: translateX(18px); }
        .hover-ty-admin .htps-switch-label { font-weight: 600; font-size: 13px; }
        .hover-ty-admin .htps-foot { margin-top: 4px; }
        .hover-ty-admin .htps-reset-form { margin-top: 8px; }
        @media (max-width: 782px) {
            .hover-ty-admin .htps-grid-2 { grid-template-columns: 1fr; }
            .hover-ty-admin .htps-topbar { flex-direction: column; }
        }
    </style>
    <?php
}

function htps_admin_footer_script(): void
{
    $screen = function_exists('get_current_screen') ? get_current_screen() : null;
    if (!$screen || $screen->id !== 'toplevel_page_htps') {
        return;
    }
    ?>
    <script>
    jQuery(function($){
        var state = window.HTPS_DATA || {};

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
                box.html('<div class="htps-image-placeholder"><span class="dashicons dashicons-smartphone"></span><span>尚未上傳（可留空）</span></div>');
            } else {
                box.html('<div class="htps-image-placeholder"><span class="dashicons dashicons-desktop"></span><span>尚未上傳</span></div>');
            }
        }

        $('.htps-pick').on('click', function(){
            if (typeof wp === 'undefined' || !wp.media) {
                alert('媒體庫尚未載入，請重新整理頁面後再試。');
                return;
            }
            var btn = $(this);
            var field = btn.data('field-url');
            var preview = btn.data('preview');
            var frame = wp.media({
                title: '選擇感謝頁 Banner 圖片',
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

        $('.htps-clear').on('click', function(){
            var btn = $(this);
            var field = btn.data('field-url');
            var preview = btn.data('preview');
            $('[data-field="' + field + '"]').val('');
            setByPath(state, field, '');
            setPreview(preview, '');
        });

        $('#htps-form').on('submit', function(){
            readFields();
            $('#htps-payload').val(JSON.stringify(state));
        });
    });
    </script>
    <?php
}
