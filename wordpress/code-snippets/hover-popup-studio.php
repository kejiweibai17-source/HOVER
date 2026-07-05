<?php
/**
 * HOVER — 首頁彈出公告（Popup Studio）
 *
 * 使用方式（WordPress 後台）：
 * 1. 安裝並啟用插件「Code Snippets」
 * 2. Snippets → Add New → 貼上本檔內容
 * 3. Run snippet：Everywhere
 * 4. 左側選單會出現「HOVER 首頁公告」
 *
 * REST API（給 Next.js）：
 * GET /wp-json/hover/v1/popup
 */

if (!defined('ABSPATH')) {
    exit;
}

if (defined('HPS_LOADED')) {
    return;
}
define('HPS_LOADED', true);

const HPS_OPTION = 'hover_popup_v1';

add_action('admin_menu', function () {
    if (!current_user_can('manage_options')) {
        return;
    }
    add_menu_page(
        'HOVER 首頁公告',
        'HOVER 首頁公告',
        'manage_options',
        'hps',
        'hps_render_page',
        'dashicons-megaphone',
        58
    );
}, 99);

add_action('admin_enqueue_scripts', function ($hook) {
    if ($hook !== 'toplevel_page_hps') {
        return;
    }
    wp_enqueue_media();
});

add_action('admin_footer', 'hps_admin_footer_script');

add_action('rest_api_init', function () {
    register_rest_route('hover/v1', '/popup', [
        'methods'             => 'GET',
        'callback'            => 'hps_rest_popup',
        'permission_callback' => '__return_true',
    ]);
});

function hps_defaults(): array
{
    return [
        'enabled' => false,
        'version' => '1',
        'title'   => '全館滿 NT$2,000 享免運',
        'body'    => '歡迎來到 HOVER 官方網站，探索最新系列與會員專屬優惠。',
        'image'   => [
            'url' => '',
            'alt' => 'HOVER 公告',
        ],
        'button' => [
            'label' => '立即選購',
            'href'  => '/products',
            'show'  => true,
        ],
        'schedule' => [
            'startAt' => '',
            'endAt'   => '',
        ],
    ];
}

function hps_sanitize_url(string $url): string
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

function hps_parse_datetime(string $value): ?int
{
    $value = trim($value);
    if ($value === '') {
        return null;
    }
    $ts = strtotime($value);
    return $ts ?: null;
}

function hps_is_active(array $data): bool
{
    if (empty($data['enabled'])) {
        return false;
    }

    $has_content = !empty($data['image']['url'])
        || !empty($data['title'])
        || !empty($data['body']);
    if (!$has_content) {
        return false;
    }

    $now = current_time('timestamp');
    $start = hps_parse_datetime($data['schedule']['startAt'] ?? '');
    $end   = hps_parse_datetime($data['schedule']['endAt'] ?? '');

    if ($start && $now < $start) {
        return false;
    }
    if ($end && $now > $end) {
        return false;
    }

    return true;
}

function hps_normalize(array $data): array
{
    $d = hps_defaults();

    $data['enabled'] = !empty($data['enabled']);
    $data['version'] = sanitize_text_field($data['version'] ?? $d['version']) ?: $d['version'];
    $data['title']   = sanitize_text_field($data['title'] ?? $d['title']);
    $data['body']    = sanitize_textarea_field($data['body'] ?? $d['body']);

    $image = $data['image'] ?? [];
    $data['image'] = [
        'url' => esc_url_raw($image['url'] ?? ''),
        'alt' => sanitize_text_field($image['alt'] ?? $d['image']['alt']),
    ];

    $button = $data['button'] ?? [];
    $data['button'] = [
        'label' => sanitize_text_field($button['label'] ?? $d['button']['label']) ?: $d['button']['label'],
        'href'  => hps_sanitize_url($button['href'] ?? $d['button']['href']),
        'show'  => !empty($button['show']),
    ];

    $schedule = $data['schedule'] ?? [];
    $data['schedule'] = [
        'startAt' => sanitize_text_field($schedule['startAt'] ?? ''),
        'endAt'   => sanitize_text_field($schedule['endAt'] ?? ''),
    ];

    $data['active'] = hps_is_active($data);

    return $data;
}

function hps_get_settings(): array
{
    $saved = get_option(HPS_OPTION, []);
    if (!is_array($saved)) {
        $saved = [];
    }
    return hps_normalize(array_replace_recursive(hps_defaults(), $saved));
}

function hps_save_from_post(): ?array
{
    if ($_SERVER['REQUEST_METHOD'] !== 'POST' || empty($_POST['hps_act'])) {
        return null;
    }
    if (!wp_verify_nonce($_POST['hps_nonce'] ?? '', 'hps_save')) {
        return ['ok' => false, 'msg' => '安全驗證失敗，請重新整理後再試。'];
    }
    if (!current_user_can('manage_options')) {
        return ['ok' => false, 'msg' => '權限不足。'];
    }

    $act = sanitize_text_field($_POST['hps_act']);
    if ($act === 'reset') {
        delete_option(HPS_OPTION);
        return ['ok' => true, 'msg' => '已還原為預設公告內容。'];
    }

    if ($act !== 'save') {
        return null;
    }

    $raw = json_decode(wp_unslash($_POST['hps_payload'] ?? ''), true);
    if (!is_array($raw)) {
        return ['ok' => false, 'msg' => '資料格式錯誤。'];
    }

    $normalized = hps_normalize($raw);
    update_option(HPS_OPTION, $normalized, false);

    return ['ok' => true, 'msg' => '首頁公告已儲存。'];
}

function hps_rest_popup(): WP_REST_Response
{
    $popup = hps_get_settings();
    return new WP_REST_Response([
        'ok'   => true,
        'popup' => $popup,
    ], 200);
}

function hps_status_label(array $s): string
{
    if (empty($s['enabled'])) {
        return '已關閉';
    }
    if (!empty($s['active'])) {
        return '上線中';
    }
    $now = current_time('timestamp');
    $start = hps_parse_datetime($s['schedule']['startAt'] ?? '');
    if ($start && $now < $start) {
        return '排程中';
    }
    return '未在有效期';
}

function hps_render_page(): void
{
    if (!current_user_can('manage_options')) {
        wp_die('權限不足');
    }

    $flash = hps_save_from_post();
    $s = hps_get_settings();
    $payload = wp_json_encode($s, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    $api_url = rest_url('hover/v1/popup');
    $status = hps_status_label($s);
    ?>
    <div class="wrap hover-popup-admin">
        <div class="hps-shell">
            <div class="hps-topbar">
                <div>
                    <h1>HOVER 首頁彈出公告</h1>
                    <p class="description">設定首頁彈窗圖片、文字、按鈕連結、上線期間與開關。儲存後約 1 分鐘內同步至 Next.js 前台。</p>
                </div>
                <div class="hps-topbar-actions">
                    <span class="hps-status <?php echo !empty($s['active']) ? 'is-live' : ''; ?>"><?php echo esc_html($status); ?></span>
                    <button type="submit" form="hps-form" class="button button-primary button-hero">儲存設定</button>
                </div>
            </div>

            <?php if ($flash) : ?>
                <div class="notice <?php echo $flash['ok'] ? 'notice-success' : 'notice-error'; ?> is-dismissible">
                    <p><?php echo esc_html($flash['msg']); ?></p>
                </div>
            <?php endif; ?>

            <div class="hps-api-pill">
                <span class="dashicons dashicons-rest-api"></span>
                <span>REST API</span>
                <code><?php echo esc_html($api_url); ?></code>
            </div>

            <form id="hps-form" method="post">
                <?php wp_nonce_field('hps_save', 'hps_nonce'); ?>
                <input type="hidden" name="hps_act" value="save">
                <input type="hidden" name="hps_payload" id="hps-payload" value="">

                <div class="hps-layout">
                    <div class="hps-main">
                        <div class="hps-card">
                            <div class="hps-card-head"><h2>公告開關</h2></div>
                            <div class="hps-card-body">
                                <label class="hps-switch">
                                    <input type="checkbox" data-field="enabled" <?php checked(!empty($s['enabled'])); ?>>
                                    <span class="hps-switch-ui"></span>
                                    <span class="hps-switch-label">啟用首頁彈出公告</span>
                                </label>
                                <div class="hps-field hps-mt">
                                    <label class="hps-label">版本代號</label>
                                    <input type="text" class="regular-text" data-field="version" value="<?php echo esc_attr($s['version']); ?>" placeholder="1">
                                    <p class="description">變更代號可區分不同公告內容。訪客關閉後，本次瀏覽器工作階段內不再顯示；關閉分頁或瀏覽器後再進首頁會再次出現。</p>
                                </div>
                            </div>
                        </div>

                        <div class="hps-card">
                            <div class="hps-card-head"><h2>公告內容</h2></div>
                            <div class="hps-card-body hps-stack">
                                <div class="hps-field">
                                    <label class="hps-label">標題</label>
                                    <input type="text" class="large-text" data-field="title" value="<?php echo esc_attr($s['title']); ?>" placeholder="例：全館滿 NT$2,000 享免運">
                                </div>
                                <div class="hps-field">
                                    <label class="hps-label">內文</label>
                                    <textarea rows="4" class="large-text" data-field="body" placeholder="公告說明文字"><?php echo esc_textarea($s['body']); ?></textarea>
                                </div>
                                <div class="hps-field">
                                    <label class="hps-label">彈窗圖片</label>
                                    <div class="hps-image-preview" id="hps-image-preview">
                                        <?php if (!empty($s['image']['url'])) : ?>
                                            <img src="<?php echo esc_url($s['image']['url']); ?>" alt="">
                                        <?php else : ?>
                                            <div class="hps-image-placeholder">
                                                <span class="dashicons dashicons-format-image"></span>
                                                <span>尚未上傳圖片（可留空，僅顯示文字）</span>
                                            </div>
                                        <?php endif; ?>
                                    </div>
                                    <input type="hidden" data-field="image.url" value="<?php echo esc_attr($s['image']['url']); ?>">
                                    <div class="hps-actions">
                                        <button type="button" class="button button-primary hps-pick-media" data-target="image.url" data-preview="hps-image-preview">選擇圖片</button>
                                        <button type="button" class="button hps-clear-media">清除</button>
                                    </div>
                                </div>
                                <div class="hps-field">
                                    <label class="hps-label">圖片替代文字</label>
                                    <input type="text" class="regular-text" data-field="image.alt" value="<?php echo esc_attr($s['image']['alt']); ?>">
                                </div>
                            </div>
                        </div>

                        <div class="hps-card">
                            <div class="hps-card-head"><h2>按鈕連結</h2></div>
                            <div class="hps-card-body hps-grid-2">
                                <label class="hps-switch hps-switch-inline">
                                    <input type="checkbox" data-field="button.show" <?php checked(!empty($s['button']['show'])); ?>>
                                    <span class="hps-switch-ui"></span>
                                    <span class="hps-switch-label">顯示按鈕</span>
                                </label>
                                <div class="hps-field">
                                    <label class="hps-label">按鈕文字</label>
                                    <input type="text" class="regular-text" data-field="button.label" value="<?php echo esc_attr($s['button']['label']); ?>">
                                </div>
                                <div class="hps-field hps-span-2">
                                    <label class="hps-label">按鈕連結</label>
                                    <input type="text" class="regular-text" data-field="button.href" value="<?php echo esc_attr($s['button']['href']); ?>" placeholder="/products 或 https://...">
                                </div>
                            </div>
                        </div>

                        <div class="hps-card">
                            <div class="hps-card-head"><h2>上線期間</h2></div>
                            <div class="hps-card-body hps-grid-2">
                                <div class="hps-field">
                                    <label class="hps-label">開始時間</label>
                                    <input type="datetime-local" data-field="schedule.startAt" value="<?php echo esc_attr($s['schedule']['startAt']); ?>">
                                    <p class="description">留空表示立即生效</p>
                                </div>
                                <div class="hps-field">
                                    <label class="hps-label">結束時間</label>
                                    <input type="datetime-local" data-field="schedule.endAt" value="<?php echo esc_attr($s['schedule']['endAt']); ?>">
                                    <p class="description">留空表示不限結束時間</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <aside class="hps-preview">
                        <div class="hps-card hps-preview-card">
                            <div class="hps-card-head">
                                <div>
                                    <h2>即時預覽</h2>
                                    <p class="description" style="margin:4px 0 0">模擬前台 RWD 彈窗</p>
                                </div>
                            </div>
                            <div class="hps-card-body hps-preview-body">
                                <div id="hps-live-preview"></div>
                            </div>
                        </div>
                    </aside>
                </div>

                <div class="hps-foot">
                    <?php submit_button('儲存設定', 'primary large', 'submit', false); ?>
                </div>
            </form>

            <form method="post" class="hps-reset-form" onsubmit="return confirm('確定還原為預設內容？');">
                <?php wp_nonce_field('hps_save', 'hps_nonce'); ?>
                <input type="hidden" name="hps_act" value="reset">
                <button type="submit" class="button-link-delete">還原預設</button>
            </form>
        </div>
    </div>

    <script>window.HPS_DATA = <?php echo $payload ?: '{}'; ?>;</script>
    <?php
    hps_print_admin_styles();
}

function hps_print_admin_styles(): void
{
    ?>
    <style>
        .hover-popup-admin { max-width: 1180px; }
        .hover-popup-admin .hps-shell { margin-top: 8px; }
        .hover-popup-admin .hps-topbar {
            display: flex; align-items: flex-start; justify-content: space-between;
            gap: 16px; margin-bottom: 16px;
        }
        .hover-popup-admin .hps-topbar h1 { margin: 0 0 6px; }
        .hover-popup-admin .hps-topbar-actions {
            display: flex; gap: 10px; align-items: center; flex-shrink: 0;
        }
        .hover-popup-admin .hps-status {
            display: inline-flex; align-items: center; gap: 6px;
            padding: 6px 12px; border-radius: 999px; font-size: 12px; font-weight: 600;
            background: #f0f0f1; color: #646970;
        }
        .hover-popup-admin .hps-status.is-live {
            background: #edf7f1; color: #1a6847;
        }
        .hover-popup-admin .hps-status.is-live::before {
            content: ""; width: 8px; height: 8px; border-radius: 50%; background: #2a514d;
        }
        .hover-popup-admin .hps-api-pill {
            display: inline-flex; align-items: center; gap: 8px;
            background: #fff; border: 1px solid #dcdcde; border-radius: 999px;
            padding: 8px 14px; margin-bottom: 16px; font-size: 12px; color: #646970;
        }
        .hover-popup-admin .hps-api-pill code {
            font-size: 11px; background: #f6f7f7; padding: 2px 8px; border-radius: 999px;
        }
        .hover-popup-admin .hps-layout {
            display: grid; grid-template-columns: minmax(0, 1fr) 320px; gap: 16px; align-items: start;
        }
        .hover-popup-admin .hps-card {
            background: #fff; border: 1px solid #dcdcde; border-radius: 8px;
            box-shadow: 0 1px 2px rgba(0,0,0,.04); overflow: hidden; margin-bottom: 16px;
        }
        .hover-popup-admin .hps-card-head {
            display: flex; align-items: center; justify-content: space-between; gap: 10px;
            padding: 14px 18px; border-bottom: 1px solid #f0f0f1;
        }
        .hover-popup-admin .hps-card-head h2 { margin: 0; font-size: 14px; font-weight: 700; }
        .hover-popup-admin .hps-card-body { padding: 18px; }
        .hover-popup-admin .hps-grid-2 {
            display: grid; grid-template-columns: 1fr 1fr; gap: 14px 16px;
        }
        .hover-popup-admin .hps-span-2 { grid-column: 1 / -1; }
        .hover-popup-admin .hps-field { display: flex; flex-direction: column; gap: 6px; }
        .hover-popup-admin .hps-label { font-weight: 600; font-size: 13px; }
        .hover-popup-admin .hps-stack { display: flex; flex-direction: column; gap: 16px; }
        .hover-popup-admin .hps-mt { margin-top: 4px; }
        .hover-popup-admin .hps-actions { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 4px; }
        .hover-popup-admin .hps-foot { display: flex; gap: 8px; margin-top: 4px; }
        .hover-popup-admin .hps-reset-form { margin-top: 8px; }
        .hover-popup-admin .hps-image-preview,
        .hover-popup-admin .hps-image-placeholder {
            width: 100%; max-width: 360px; aspect-ratio: 4/3; border: 1px dashed #c3c4c7; border-radius: 8px;
            background: #f6f7f7; display: flex; flex-direction: column;
            align-items: center; justify-content: center; text-align: center;
            padding: 12px; color: #646970; font-size: 12px; gap: 6px; overflow: hidden;
        }
        .hover-popup-admin .hps-image-preview img { width: 100%; height: 100%; object-fit: cover; }
        .hover-popup-admin .hps-image-placeholder .dashicons {
            font-size: 28px; width: 28px; height: 28px; color: #a7aaad;
        }
        .hover-popup-admin .hps-switch {
            display: inline-flex; align-items: center; gap: 12px; cursor: pointer; user-select: none;
        }
        .hover-popup-admin .hps-switch input { position: absolute; opacity: 0; pointer-events: none; }
        .hover-popup-admin .hps-switch-ui {
            width: 44px; height: 24px; border-radius: 999px; background: #c3c4c7; position: relative; transition: .2s;
        }
        .hover-popup-admin .hps-switch-ui::after {
            content: ""; position: absolute; top: 3px; left: 3px; width: 18px; height: 18px;
            border-radius: 50%; background: #fff; transition: .2s; box-shadow: 0 1px 3px rgba(0,0,0,.2);
        }
        .hover-popup-admin .hps-switch input:checked + .hps-switch-ui { background: #2a514d; }
        .hover-popup-admin .hps-switch input:checked + .hps-switch-ui::after { transform: translateX(20px); }
        .hover-popup-admin .hps-switch-label { font-weight: 600; font-size: 13px; }
        .hover-popup-admin .hps-switch-inline { margin-bottom: 4px; }
        .hover-popup-admin .hps-preview { position: sticky; top: 32px; }
        .hover-popup-admin .hps-preview-body {
            padding: 16px; background: #eef2f6; min-height: 420px;
            display: flex; align-items: center; justify-content: center;
        }
        .hover-popup-admin .hps-mock-overlay {
            position: relative; width: 100%; max-width: 280px;
            background: rgba(0,0,0,.45); border-radius: 12px; padding: 24px 12px;
        }
        .hover-popup-admin .hps-mock-modal {
            position: relative; background: #fff; border-radius: 4px; overflow: hidden;
            box-shadow: 0 20px 50px rgba(0,0,0,.25);
        }
        .hover-popup-admin .hps-mock-close {
            position: absolute; top: 8px; right: 8px; width: 28px; height: 28px;
            border: 0; border-radius: 50%; background: rgba(255,255,255,.92);
            color: #222; font-size: 18px; line-height: 1; cursor: default;
        }
        .hover-popup-admin .hps-mock-image {
            width: 100%; aspect-ratio: 16/10; object-fit: cover; display: block; background: #f3f3f3;
        }
        .hover-popup-admin .hps-mock-body { padding: 16px 14px 18px; text-align: center; }
        .hover-popup-admin .hps-mock-title {
            font-size: 15px; font-weight: 600; letter-spacing: .08em; color: #222; margin: 0 0 8px;
        }
        .hover-popup-admin .hps-mock-text {
            font-size: 12px; line-height: 1.7; color: #666; margin: 0 0 14px; white-space: pre-line;
        }
        .hover-popup-admin .hps-mock-btn {
            display: inline-block; min-width: 120px; padding: 10px 18px;
            background: #2a514d; color: #fff; font-size: 11px; letter-spacing: .14em;
            border-radius: 2px; text-decoration: none;
        }
        @media (max-width: 960px) {
            .hover-popup-admin .hps-layout { grid-template-columns: 1fr; }
            .hover-popup-admin .hps-preview { position: static; }
            .hover-popup-admin .hps-grid-2 { grid-template-columns: 1fr; }
        }
    </style>
    <?php
}

function hps_admin_footer_script(): void
{
    $screen = function_exists('get_current_screen') ? get_current_screen() : null;
    if (!$screen || $screen->id !== 'toplevel_page_hps') {
        return;
    }
    ?>
    <script>
    jQuery(function($){
        var state = window.HPS_DATA || {};

        function esc(s){ return $('<div/>').text(s || '').html(); }

        function readFields(){
            $('[data-field]').each(function(){
                var el = $(this);
                var path = el.data('field').split('.');
                var val = el.is(':checkbox') ? el.is(':checked') : el.val();
                if (path.length === 1) {
                    state[path[0]] = val;
                } else if (path.length === 2) {
                    if (!state[path[0]]) state[path[0]] = {};
                    state[path[0]][path[1]] = val;
                }
            });
        }

        function renderPreview(){
            readFields();
            var html = '<div class="hps-mock-overlay"><div class="hps-mock-modal">';
            html += '<button type="button" class="hps-mock-close" aria-hidden="true">×</button>';
            if (state.image && state.image.url) {
                html += '<img class="hps-mock-image" src="'+esc(state.image.url)+'" alt="'+esc(state.image.alt)+'">';
            }
            html += '<div class="hps-mock-body">';
            if (state.title) html += '<h3 class="hps-mock-title">'+esc(state.title)+'</h3>';
            if (state.body) html += '<p class="hps-mock-text">'+esc(state.body)+'</p>';
            if (state.button && state.button.show && state.button.label) {
                html += '<span class="hps-mock-btn">'+esc(state.button.label)+'</span>';
            }
            html += '</div></div></div>';
            $('#hps-live-preview').html(html);
        }

        $(document).on('input change','input,select,textarea', renderPreview);

        $(document).on('click','.hps-pick-media',function(){
            if (typeof wp === 'undefined' || !wp.media) {
                alert('媒體庫尚未載入，請重新整理頁面後再試。');
                return;
            }
            var frame = wp.media({ title: '選擇公告圖片', button: { text: '使用這張圖' }, multiple: false, library: { type: 'image' } });
            frame.on('select', function(){
                var url = frame.state().get('selection').first().toJSON().url;
                if (!state.image) state.image = {};
                state.image.url = url;
                $('[data-field="image.url"]').val(url);
                $('#hps-image-preview').html('<img src="'+url+'" alt="">');
                renderPreview();
            });
            frame.open();
        });

        $(document).on('click','.hps-clear-media',function(){
            if (!state.image) state.image = {};
            state.image.url = '';
            $('[data-field="image.url"]').val('');
            $('#hps-image-preview').html('<div class="hps-image-placeholder"><span class="dashicons dashicons-format-image"></span><span>尚未上傳圖片（可留空，僅顯示文字）</span></div>');
            renderPreview();
        });

        $('#hps-form').on('submit', function(){
            readFields();
            $('#hps-payload').val(JSON.stringify(state));
        });

        renderPreview();
    });
    </script>
    <?php
}
