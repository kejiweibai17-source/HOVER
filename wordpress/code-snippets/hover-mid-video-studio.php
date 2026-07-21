<?php
/**
 * HOVER — 首頁中段影片區塊（Mid Video Studio）
 *
 * 位置：品牌輪播 與 商品分類格 之間
 *
 * 使用方式（WordPress 後台）：
 * 1. Code Snippets → Add New → 貼上本檔
 * 2. Run snippet：Everywhere → 啟用
 * 3. 左側選單「HOVER 中段影片」
 *
 * REST API（給 Next.js）：
 * GET /wp-json/hover/v1/mid-video
 */

if (!defined('ABSPATH')) {
    exit;
}

if (defined('HMVS_LOADED')) {
    return;
}
define('HMVS_LOADED', true);

const HMVS_OPTION = 'hover_mid_video_v1';

add_action('admin_menu', function () {
    if (!current_user_can('manage_options')) {
        return;
    }
    add_menu_page(
        'HOVER 中段影片',
        'HOVER 中段影片',
        'manage_options',
        'hmvs',
        'hmvs_render_page',
        'dashicons-video-alt3',
        58
    );
}, 99);

add_action('admin_enqueue_scripts', function ($hook) {
    if ($hook !== 'toplevel_page_hmvs') {
        return;
    }
    wp_enqueue_media();
});

add_action('admin_footer', 'hmvs_admin_footer_script');

add_action('rest_api_init', function () {
    register_rest_route('hover/v1', '/mid-video', [
        'methods'             => 'GET',
        'callback'            => 'hmvs_rest_mid_video',
        'permission_callback' => '__return_true',
    ]);
});

function hmvs_sanitize_url(string $url): string
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

function hmvs_defaults(): array
{
    return [
        'enabled'  => false,
        'version'  => '1',
        'title'    => '',
        'body'     => '',
        'href'     => '/products',
        'autoplay' => true,
        'muted'    => true,
        'loop'     => true,
        'desktop'  => [
            'videoUrl'  => '',
            'posterUrl' => '',
        ],
        'mobile' => [
            'videoUrl'  => '',
            'posterUrl' => '',
        ],
    ];
}

function hmvs_normalize_device($raw, array $fallback): array
{
    if (!is_array($raw)) {
        $raw = [];
    }
    return [
        'videoUrl'  => esc_url_raw($raw['videoUrl'] ?? $raw['video_url'] ?? ''),
        'posterUrl' => esc_url_raw($raw['posterUrl'] ?? $raw['poster_url'] ?? ''),
    ];
}

function hmvs_normalize(array $data): array
{
    $d = hmvs_defaults();

    $data['enabled']  = !empty($data['enabled']);
    $data['version']  = sanitize_text_field($data['version'] ?? $d['version']) ?: $d['version'];
    $data['title']    = sanitize_text_field($data['title'] ?? '');
    $data['body']     = sanitize_textarea_field($data['body'] ?? '');
    $data['href']     = hmvs_sanitize_url($data['href'] ?? $d['href']) ?: $d['href'];
    $data['autoplay'] = !isset($data['autoplay']) || !empty($data['autoplay']);
    $data['muted']    = !isset($data['muted']) || !empty($data['muted']);
    $data['loop']     = !isset($data['loop']) || !empty($data['loop']);
    $data['desktop']  = hmvs_normalize_device($data['desktop'] ?? [], $d['desktop']);
    $data['mobile']   = hmvs_normalize_device($data['mobile'] ?? [], $d['mobile']);
    $data['active']   = hmvs_is_active($data);

    return $data;
}

function hmvs_with_fallback(array $data): array
{
    // 給前台／預覽用：手機未設定時沿用桌機
    if (($data['mobile']['videoUrl'] ?? '') === '' && ($data['desktop']['videoUrl'] ?? '') !== '') {
        $data['mobile']['videoUrl'] = $data['desktop']['videoUrl'];
    }
    if (($data['mobile']['posterUrl'] ?? '') === '' && ($data['desktop']['posterUrl'] ?? '') !== '') {
        $data['mobile']['posterUrl'] = $data['desktop']['posterUrl'];
    }
    $data['active'] = hmvs_is_active($data);
    return $data;
}

function hmvs_is_active(array $data): bool
{
    if (empty($data['enabled'])) {
        return false;
    }
    $desk = $data['desktop']['videoUrl'] ?? '';
    $mob  = $data['mobile']['videoUrl'] ?? '';
    $deskPoster = $data['desktop']['posterUrl'] ?? '';
    $mobPoster  = $data['mobile']['posterUrl'] ?? '';
    return ($desk !== '' || $mob !== '' || $deskPoster !== '' || $mobPoster !== '');
}

function hmvs_get_settings(): array
{
    $saved = get_option(HMVS_OPTION, []);
    if (!is_array($saved)) {
        $saved = [];
    }
    return hmvs_normalize(array_replace_recursive(hmvs_defaults(), $saved));
}

function hmvs_save_from_post(): ?array
{
    if ($_SERVER['REQUEST_METHOD'] !== 'POST' || empty($_POST['hmvs_act'])) {
        return null;
    }
    if (!wp_verify_nonce($_POST['hmvs_nonce'] ?? '', 'hmvs_save')) {
        return ['ok' => false, 'msg' => '安全驗證失敗，請重新整理後再試。'];
    }
    if (!current_user_can('manage_options')) {
        return ['ok' => false, 'msg' => '權限不足。'];
    }

    $act = sanitize_text_field($_POST['hmvs_act']);
    if ($act === 'reset') {
        delete_option(HMVS_OPTION);
        return ['ok' => true, 'msg' => '已還原為預設（隱藏）。'];
    }

    if ($act !== 'save') {
        return null;
    }

    $raw = json_decode(wp_unslash($_POST['hmvs_payload'] ?? ''), true);
    if (!is_array($raw)) {
        return ['ok' => false, 'msg' => '資料格式錯誤。'];
    }

    update_option(HMVS_OPTION, hmvs_normalize($raw), false);
    return ['ok' => true, 'msg' => '中段影片區塊已儲存。'];
}

function hmvs_rest_mid_video(): WP_REST_Response
{
    return new WP_REST_Response([
        'ok'       => true,
        'midVideo' => hmvs_with_fallback(hmvs_get_settings()),
    ], 200);
}

function hmvs_render_page(): void
{
    if (!current_user_can('manage_options')) {
        wp_die('權限不足');
    }

    $flash = hmvs_save_from_post();
    $s = hmvs_get_settings();
    $payload = wp_json_encode($s, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    $api_url = rest_url('hover/v1/mid-video');
    $live = !empty($s['active']);
    ?>
<div class="wrap hover-mid-video-admin">
    <div class="hmvs-shell">
        <div class="hmvs-topbar">
            <div>
                <h1>HOVER 中段影片</h1>
                <p class="description">顯示於「品牌輪播」與「商品分類格」之間。可分別設定桌機／手機影片與封面、文字、播放選項與點擊連結。</p>
            </div>
            <div class="hmvs-topbar-actions">
                <span class="hmvs-status <?php echo $live ? 'is-live' : ''; ?>">
                    <?php echo $live ? '上線中' : '未顯示'; ?>
                </span>
                <button type="submit" form="hmvs-form" class="button button-primary button-hero">儲存設定</button>
            </div>
        </div>

        <?php if ($flash) : ?>
        <div class="notice <?php echo $flash['ok'] ? 'notice-success' : 'notice-error'; ?> is-dismissible">
            <p><?php echo esc_html($flash['msg']); ?></p>
        </div>
        <?php endif; ?>

        <div class="hmvs-api-pill">
            <span class="dashicons dashicons-rest-api"></span>
            <span>REST API</span>
            <code><?php echo esc_html($api_url); ?></code>
        </div>

        <form id="hmvs-form" method="post">
            <?php wp_nonce_field('hmvs_save', 'hmvs_nonce'); ?>
            <input type="hidden" name="hmvs_act" value="save">
            <input type="hidden" name="hmvs_payload" id="hmvs-payload" value="">

            <div class="hmvs-layout">
                <div class="hmvs-main">
                    <div class="hmvs-card">
                        <div class="hmvs-card-head">
                            <h2>顯示設定</h2>
                        </div>
                        <div class="hmvs-card-body hmvs-stack">
                            <label class="hmvs-switch">
                                <input type="checkbox" data-field="enabled" <?php checked(!empty($s['enabled'])); ?>>
                                <span class="hmvs-switch-ui"></span>
                                <span class="hmvs-switch-label">顯示此影片區塊</span>
                            </label>
                            <div class="hmvs-grid-3">
                                <label class="hmvs-switch">
                                    <input type="checkbox" data-field="autoplay"
                                        <?php checked(!empty($s['autoplay'])); ?>>
                                    <span class="hmvs-switch-ui"></span>
                                    <span class="hmvs-switch-label">自動播放</span>
                                </label>
                                <label class="hmvs-switch">
                                    <input type="checkbox" data-field="muted" <?php checked(!empty($s['muted'])); ?>>
                                    <span class="hmvs-switch-ui"></span>
                                    <span class="hmvs-switch-label">靜音播放</span>
                                </label>
                                <label class="hmvs-switch">
                                    <input type="checkbox" data-field="loop" <?php checked(!empty($s['loop'])); ?>>
                                    <span class="hmvs-switch-ui"></span>
                                    <span class="hmvs-switch-label">循環播放</span>
                                </label>
                            </div>
                            <p class="description">多數瀏覽器要求「靜音」才能自動播放。建議保持靜音開啟。</p>
                        </div>
                    </div>

                    <div class="hmvs-card">
                        <div class="hmvs-card-head">
                            <h2>文字與連結</h2>
                        </div>
                        <div class="hmvs-card-body hmvs-stack">
                            <div class="hmvs-field">
                                <label class="hmvs-label">區塊標題</label>
                                <input type="text" class="large-text" data-field="title"
                                    value="<?php echo esc_attr($s['title']); ?>" placeholder="選填">
                            </div>
                            <div class="hmvs-field">
                                <label class="hmvs-label">文字說明</label>
                                <textarea rows="3" class="large-text" data-field="body"
                                    placeholder="選填"><?php echo esc_textarea($s['body']); ?></textarea>
                            </div>
                            <div class="hmvs-field">
                                <label class="hmvs-label">點擊後連結</label>
                                <input type="text" class="regular-text" data-field="href"
                                    value="<?php echo esc_attr($s['href']); ?>" placeholder="/products">
                                <p class="description">整個區塊可點擊。可填站內路徑（如 /products）或完整網址。</p>
                            </div>
                        </div>
                    </div>

                    <div class="hmvs-card">
                        <div class="hmvs-card-head">
                            <h2>桌機版媒體</h2>
                        </div>
                        <div class="hmvs-card-body hmvs-media-row">
                            <div class="hmvs-field">
                                <label class="hmvs-label">影片</label>
                                <div class="hmvs-thumb hmvs-thumb-video" id="hmvs-desk-video-thumb"></div>
                                <div class="hmvs-media-meta" id="hmvs-desk-video-meta"></div>
                                <input type="hidden" data-field="desktop.videoUrl"
                                    value="<?php echo esc_attr($s['desktop']['videoUrl']); ?>">
                                <div class="hmvs-actions">
                                    <button type="button" class="button button-primary hmvs-pick" data-kind="video"
                                        data-field="desktop.videoUrl" data-thumb="hmvs-desk-video-thumb">選影片</button>
                                    <button type="button" class="button hmvs-clear" data-field="desktop.videoUrl"
                                        data-thumb="hmvs-desk-video-thumb" data-kind="video">清除</button>
                                </div>
                            </div>
                            <div class="hmvs-field">
                                <label class="hmvs-label">封面圖片</label>
                                <div class="hmvs-thumb hmvs-thumb-poster" id="hmvs-desk-poster-thumb"></div>
                                <div class="hmvs-media-meta" id="hmvs-desk-poster-meta"></div>
                                <input type="hidden" data-field="desktop.posterUrl"
                                    value="<?php echo esc_attr($s['desktop']['posterUrl']); ?>">
                                <div class="hmvs-actions">
                                    <button type="button" class="button button-primary hmvs-pick" data-kind="image"
                                        data-field="desktop.posterUrl" data-thumb="hmvs-desk-poster-thumb">選封面</button>
                                    <button type="button" class="button hmvs-clear" data-field="desktop.posterUrl"
                                        data-thumb="hmvs-desk-poster-thumb" data-kind="image">清除</button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="hmvs-card">
                        <div class="hmvs-card-head">
                            <h2>手機版媒體</h2>
                        </div>
                        <div class="hmvs-card-body">
                            <p class="description" style="margin-top:0">可留空，前台會自動沿用桌機版影片／封面。</p>
                            <div class="hmvs-media-row">
                                <div class="hmvs-field">
                                    <label class="hmvs-label">影片</label>
                                    <div class="hmvs-thumb hmvs-thumb-video" id="hmvs-mob-video-thumb"></div>
                                    <div class="hmvs-media-meta" id="hmvs-mob-video-meta"></div>
                                    <input type="hidden" data-field="mobile.videoUrl"
                                        value="<?php echo esc_attr($s['mobile']['videoUrl']); ?>">
                                    <div class="hmvs-actions">
                                        <button type="button" class="button button-primary hmvs-pick" data-kind="video"
                                            data-field="mobile.videoUrl" data-thumb="hmvs-mob-video-thumb">選影片</button>
                                        <button type="button" class="button hmvs-clear" data-field="mobile.videoUrl"
                                            data-thumb="hmvs-mob-video-thumb" data-kind="video">清除</button>
                                    </div>
                                </div>
                                <div class="hmvs-field">
                                    <label class="hmvs-label">封面圖片</label>
                                    <div class="hmvs-thumb hmvs-thumb-poster" id="hmvs-mob-poster-thumb"></div>
                                    <div class="hmvs-media-meta" id="hmvs-mob-poster-meta"></div>
                                    <input type="hidden" data-field="mobile.posterUrl"
                                        value="<?php echo esc_attr($s['mobile']['posterUrl']); ?>">
                                    <div class="hmvs-actions">
                                        <button type="button" class="button button-primary hmvs-pick" data-kind="image"
                                            data-field="mobile.posterUrl"
                                            data-thumb="hmvs-mob-poster-thumb">選封面</button>
                                        <button type="button" class="button hmvs-clear" data-field="mobile.posterUrl"
                                            data-thumb="hmvs-mob-poster-thumb" data-kind="image">清除</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <aside class="hmvs-preview">
                    <div class="hmvs-card">
                        <div class="hmvs-card-head">
                            <div>
                                <h2>即時預覽</h2>
                                <p class="description" style="margin:4px 0 0">桌機／手機示意</p>
                            </div>
                        </div>
                        <div class="hmvs-preview-body" id="hmvs-live-preview"></div>
                    </div>
                </aside>
            </div>
        </form>

        <form method="post" class="hmvs-reset-form" onsubmit="return confirm('確定還原為預設（隱藏）？');">
            <?php wp_nonce_field('hmvs_save', 'hmvs_nonce'); ?>
            <input type="hidden" name="hmvs_act" value="reset">
            <button type="submit" class="button">還原預設</button>
        </form>
    </div>
</div>
<script>
window.HMVS_DATA = <?php echo $payload ?: '{}'; ?>;
</script>
<?php
    hmvs_print_admin_styles();
}

function hmvs_print_admin_styles(): void
{
    ?>
<style>
.hover-mid-video-admin {
    max-width: 1180px;
}

.hover-mid-video-admin .hmvs-shell {
    margin-top: 8px;
}

.hover-mid-video-admin .hmvs-topbar {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
    margin-bottom: 16px;
}

.hover-mid-video-admin .hmvs-topbar h1 {
    margin: 0 0 6px;
}

.hover-mid-video-admin .hmvs-topbar-actions {
    display: flex;
    gap: 10px;
    align-items: center;
    flex-shrink: 0;
}

.hover-mid-video-admin .hmvs-status {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    border-radius: 999px;
    font-size: 12px;
    font-weight: 600;
    background: #f0f0f1;
    color: #646970;
}

.hover-mid-video-admin .hmvs-status.is-live {
    background: #edf7f1;
    color: #1a6847;
}

.hover-mid-video-admin .hmvs-status.is-live::before {
    content: "";
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #2a514d;
}

.hover-mid-video-admin .hmvs-api-pill {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    background: #fff;
    border: 1px solid #dcdcde;
    border-radius: 999px;
    padding: 8px 14px;
    margin-bottom: 16px;
    font-size: 12px;
    color: #646970;
}

.hover-mid-video-admin .hmvs-api-pill code {
    font-size: 11px;
    background: #f6f7f7;
    padding: 2px 8px;
    border-radius: 999px;
}

.hover-mid-video-admin .hmvs-layout {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 320px;
    gap: 16px;
    align-items: start;
}

.hover-mid-video-admin .hmvs-card {
    background: #fff;
    border: 1px solid #dcdcde;
    border-radius: 8px;
    box-shadow: 0 1px 2px rgba(0, 0, 0, .04);
    overflow: hidden;
    margin-bottom: 16px;
}

.hover-mid-video-admin .hmvs-card-head {
    padding: 14px 18px;
    border-bottom: 1px solid #f0f0f1;
}

.hover-mid-video-admin .hmvs-card-head h2 {
    margin: 0;
    font-size: 14px;
    font-weight: 700;
}

.hover-mid-video-admin .hmvs-card-body {
    padding: 18px;
}

.hover-mid-video-admin .hmvs-stack {
    display: flex;
    flex-direction: column;
    gap: 14px;
}

.hover-mid-video-admin .hmvs-grid-3 {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 10px;
}

.hover-mid-video-admin .hmvs-field {
    display: flex;
    flex-direction: column;
    gap: 6px;
}

.hover-mid-video-admin .hmvs-label {
    font-weight: 600;
    font-size: 13px;
}

.hover-mid-video-admin .hmvs-actions {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
}

.hover-mid-video-admin .hmvs-media-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
}

.hover-mid-video-admin .hmvs-switch {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    cursor: pointer;
    user-select: none;
}

.hover-mid-video-admin .hmvs-switch input {
    position: absolute;
    opacity: 0;
    pointer-events: none;
}

.hover-mid-video-admin .hmvs-switch-ui {
    width: 40px;
    height: 22px;
    border-radius: 999px;
    background: #c3c4c7;
    position: relative;
    transition: .2s;
    flex-shrink: 0;
}

.hover-mid-video-admin .hmvs-switch-ui::after {
    content: "";
    position: absolute;
    top: 3px;
    left: 3px;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: #fff;
    transition: .2s;
    box-shadow: 0 1px 3px rgba(0, 0, 0, .2);
}

.hover-mid-video-admin .hmvs-switch input:checked+.hmvs-switch-ui {
    background: #2a514d;
}

.hover-mid-video-admin .hmvs-switch input:checked+.hmvs-switch-ui::after {
    transform: translateX(18px);
}

.hover-mid-video-admin .hmvs-switch-label {
    font-weight: 600;
    font-size: 13px;
}

.hover-mid-video-admin .hmvs-thumb {
    width: 100%;
    max-width: 280px;
    aspect-ratio: 16/9;
    border: 1px dashed #c3c4c7;
    border-radius: 8px;
    background: #f6f7f7;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #646970;
    font-size: 12px;
    text-align: center;
    position: relative;
}

.hover-mid-video-admin .hmvs-thumb img,
.hover-mid-video-admin .hmvs-thumb video {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
    background: #111;
}

.hover-mid-video-admin .hmvs-thumb-badge {
    position: absolute;
    left: 6px;
    bottom: 6px;
    background: rgba(0, 0, 0, .7);
    color: #fff;
    font-size: 10px;
    font-weight: 700;
    padding: 2px 6px;
    border-radius: 3px;
}

.hover-mid-video-admin .hmvs-media-meta {
    margin-top: 4px;
    font-size: 11px;
    color: #646970;
    word-break: break-all;
    line-height: 1.35;
    min-height: 1.2em;
}

.hover-mid-video-admin .hmvs-preview {
    position: sticky;
    top: 32px;
}

.hover-mid-video-admin .hmvs-preview-body {
    padding: 14px;
    background: #e8ecef;
    display: flex;
    flex-direction: column;
    gap: 14px;
}

.hover-mid-video-admin .hmvs-device-label {
    font-size: 11px;
    font-weight: 700;
    letter-spacing: .08em;
    color: #646970;
    margin-bottom: 6px;
}

.hover-mid-video-admin .hmvs-mock {
    position: relative;
    width: 100%;
    aspect-ratio: 16/9;
    border-radius: 6px;
    overflow: hidden;
    background: #222;
}

.hover-mid-video-admin .hmvs-mock.is-mobile {
    max-width: 160px;
    aspect-ratio: 9/16;
    margin: 0 auto;
}

.hover-mid-video-admin .hmvs-mock img,
.hover-mid-video-admin .hmvs-mock video {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
}

.hover-mid-video-admin .hmvs-mock-overlay {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    padding: 14px;
    background: linear-gradient(to top, rgba(0, 0, 0, .55), transparent 55%);
    color: #fff;
    gap: 4px;
}

.hover-mid-video-admin .hmvs-mock-title {
    margin: 0;
    font-size: 14px;
    font-weight: 700;
}

.hover-mid-video-admin .hmvs-mock-body {
    margin: 0;
    font-size: 11px;
    opacity: .9;
    white-space: pre-line;
}

.hover-mid-video-admin .hmvs-reset-form {
    margin-top: 8px;
}

@media (max-width: 980px) {
    .hover-mid-video-admin .hmvs-layout {
        grid-template-columns: 1fr;
    }

    .hover-mid-video-admin .hmvs-preview {
        position: static;
    }

    .hover-mid-video-admin .hmvs-media-row,
    .hover-mid-video-admin .hmvs-grid-3 {
        grid-template-columns: 1fr;
    }
}
</style>
<?php
}

function hmvs_admin_footer_script(): void
{
    $screen = function_exists('get_current_screen') ? get_current_screen() : null;
    if (!$screen || $screen->id !== 'toplevel_page_hmvs') {
        return;
    }
    ?>
<script>
jQuery(function($) {
    var state = window.HMVS_DATA || {};
    if (!state.desktop) state.desktop = {
        videoUrl: '',
        posterUrl: ''
    };
    if (!state.mobile) state.mobile = {
        videoUrl: '',
        posterUrl: ''
    };

    function esc(s) {
        return $('<div/>').text(s || '').html();
    }

    function setByPath(obj, path, val) {
        var parts = String(path).split('.');
        var cur = obj;
        for (var i = 0; i < parts.length - 1; i++) {
            if (!cur[parts[i]] || typeof cur[parts[i]] !== 'object') cur[parts[i]] = {};
            cur = cur[parts[i]];
        }
        cur[parts[parts.length - 1]] = val;
    }

    function mediaUrl(att) {
        if (!att) return '';
        return att.url || att.link || (att.sizes && att.sizes.full && att.sizes.full.url) || '';
    }

    function readFields() {
        // 只讀 input/textarea/select，避免按鈕上的 data-field 用空 val 蓋掉網址
        $('input[data-field], textarea[data-field], select[data-field]').each(function() {
            var el = $(this);
            var path = el.attr('data-field');
            if (!path) return;
            var val = el.is(':checkbox') ? el.is(':checked') : el.val();
            setByPath(state, path, val);
        });
        if (!state.desktop || typeof state.desktop !== 'object') {
            state.desktop = {
                videoUrl: '',
                posterUrl: ''
            };
        }
        if (!state.mobile || typeof state.mobile !== 'object') {
            state.mobile = {
                videoUrl: '',
                posterUrl: ''
            };
        }
    }

    function fileLabel(url) {
        if (!url) return '';
        try {
            var path = String(url).split('?')[0];
            var name = path.substring(path.lastIndexOf('/') + 1);
            return decodeURIComponent(name || url);
        } catch (e) {
            return url;
        }
    }

    function renderThumb(id, url, kind) {
        var $el = $('#' + id);
        if (!url) {
            $el.html('<span>' + (kind === 'video' ? '尚未選影片' : '尚未選封面') + '</span>');
            return;
        }
        if (kind === 'video') {
            // 影片欄永遠顯示影片幀，不換成封面（封面有獨立欄位）
            $el.html(
                '<video src="' + esc(url) + '#t=0.1" muted playsinline preload="auto"></video>' +
                '<span class="hmvs-thumb-badge">VIDEO</span>'
            );
        } else {
            $el.html('<img src="' + esc(url) + '" alt="">');
        }
    }

    function syncThumbs() {
        var deskVideo = state.desktop.videoUrl || '';
        var deskPoster = state.desktop.posterUrl || '';
        var mobVideo = state.mobile.videoUrl || '';
        var mobPoster = state.mobile.posterUrl || '';
        renderThumb('hmvs-desk-video-thumb', deskVideo, 'video');
        renderThumb('hmvs-desk-poster-thumb', deskPoster, 'image');
        renderThumb('hmvs-mob-video-thumb', mobVideo, 'video');
        renderThumb('hmvs-mob-poster-thumb', mobPoster, 'image');

        // 檔名提示：確認影片沒被封面覆蓋
        $('#hmvs-desk-video-meta').text(deskVideo ? ('影片：' + fileLabel(deskVideo)) : '');
        $('#hmvs-desk-poster-meta').text(deskPoster ? ('封面：' + fileLabel(deskPoster)) : '');
        $('#hmvs-mob-video-meta').text(mobVideo ? ('影片：' + fileLabel(mobVideo)) : '');
        $('#hmvs-mob-poster-meta').text(mobPoster ? ('封面：' + fileLabel(mobPoster)) : '');
    }

    function mockHtml(label, videoUrl, posterUrl, isMobile) {
        var html = '<div><div class="hmvs-device-label">' + esc(label) + '</div>';
        html += '<div class="hmvs-mock' + (isMobile ? ' is-mobile' : '') + '">';
        // 有影片就播影片；封面只當 poster，不取代影片
        if (videoUrl) {
            html += '<video src="' + esc(videoUrl) + '"' + (posterUrl ? ' poster="' + esc(posterUrl) + '"' :
                '') + ' muted autoplay loop playsinline preload="auto"></video>';
            html += '<span class="hmvs-thumb-badge" style="position:absolute;left:8px;bottom:8px">VIDEO</span>';
        } else if (posterUrl) {
            html += '<img src="' + esc(posterUrl) + '" alt="">';
        } else {
            html +=
                '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#aaa;font-size:12px">尚未設定媒體</div>';
        }
        if (state.title || state.body) {
            html += '<div class="hmvs-mock-overlay">';
            if (state.title) html += '<p class="hmvs-mock-title">' + esc(state.title) + '</p>';
            if (state.body) html += '<p class="hmvs-mock-body">' + esc(state.body) + '</p>';
            html += '</div>';
        }
        html += '</div></div>';
        return html;
    }

    function renderPreview() {
        readFields();
        syncThumbs();
        var deskVideo = state.desktop.videoUrl || '';
        var deskPoster = state.desktop.posterUrl || '';
        var mobVideo = state.mobile.videoUrl || deskVideo;
        var mobPoster = state.mobile.posterUrl || deskPoster;
        var out = '';
        if (!state.enabled) {
            out += '<p style="margin:0;font-size:12px;color:#646970;text-align:center">目前為隱藏狀態</p>';
        }
        out += mockHtml('電腦版', deskVideo, deskPoster, false);
        out += mockHtml('手機版', mobVideo, mobPoster, true);
        $('#hmvs-live-preview').html(out);
    }

    $(document).on('input change', 'input[data-field], textarea[data-field], select[data-field]',
        renderPreview);

    $(document).on('click', '.hmvs-pick', function() {
        if (typeof wp === 'undefined' || !wp.media) {
            alert('媒體庫尚未載入，請重新整理頁面後再試。');
            return;
        }
        var kind = $(this).attr('data-kind');
        var field = $(this).attr('data-field');
        var thumb = $(this).attr('data-thumb');
        var isVideo = kind === 'video';
        var frame = wp.media({
            title: isVideo ? '選擇影片' : '選擇封面圖片',
            button: {
                text: isVideo ? '使用這支影片' : '使用這張圖'
            },
            multiple: false,
            library: {
                type: isVideo ? 'video' : 'image'
            }
        });
        frame.on('select', function() {
            var url = mediaUrl(frame.state().get('selection').first().toJSON());
            if (!url) {
                alert('無法取得檔案網址，請改選其他檔案。');
                return;
            }
            setByPath(state, field, url);
            $('input[data-field="' + field + '"]').val(url);
            renderPreview();
        });
        frame.open();
    });

    $(document).on('click', '.hmvs-clear', function() {
        var field = $(this).attr('data-field');
        var kind = $(this).attr('data-kind');
        setByPath(state, field, '');
        $('input[data-field="' + field + '"]').val('');
        renderPreview();
    });

    $('#hmvs-form').on('submit', function() {
        readFields();
        $('#hmvs-payload').val(JSON.stringify(state));
    });

    readFields();
    renderPreview();
});
</script>
<?php
}