<?php
/**
 * HOVER — 首頁彈出公告（Popup Studio）
 *
 * 使用方式（WordPress 後台）：
 * 1. Code Snippets → Add New → 貼上本檔
 * 2. Run snippet：Everywhere → 啟用
 * 3. 左側選單「HOVER 首頁公告」
 *
 * 版型：
 * - split：左右分欄（可選圖片置左／置右；手機改上下）
 * - full：滿版形象（圖片滿版＋疊加文字）
 *
 * REST API：GET /wp-json/hover/v1/popup
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
        'enabled'        => false,
        'version'        => '1',
        'layout'         => 'split', // split | full
        'imagePosition'  => 'left',  // left | right（僅 split）
        'hideForMembers' => true,
        'title'          => 'Join HOVER',
        'subtitle'       => '加入會員',
        'body'           => '立即獲得 NT$100 入會購物金',
        'footnote'       => '詳情請參閱會員條款與隱私權政策',
        'showGiftIcon'   => true,
        'giftIconScale'  => 140, // 120 | 140 | 160（%）
        'colors'         => [
            'title'    => '#222222',
            'subtitle' => '#555555',
            'body'     => '#444444',
            'footnote' => '#999999',
        ],
        'typography'     => [
            'title' => [
                'fontSize'   => 28,
                'fontWeight' => 500,
                'lineHeight' => 1.35,
            ],
            'subtitle' => [
                'fontSize'   => 14,
                'fontWeight' => 400,
                'lineHeight' => 1.4,
            ],
            'body' => [
                'fontSize'   => 13,
                'fontWeight' => 400,
                'lineHeight' => 1.75,
            ],
            'footnote' => [
                'fontSize'   => 11,
                'fontWeight' => 400,
                'lineHeight' => 1.5,
            ],
        ],
        'links' => [
            'terms' => [
                'label' => '會員條款',
                'href'  => '/terms',
            ],
            'privacy' => [
                'label' => '隱私權政策',
                'href'  => '/privacy',
            ],
        ],
        'imageDesktop'   => [
            'url' => '',
            'alt' => 'HOVER 公告',
        ],
        'imageMobile' => [
            'url' => '',
            'alt' => 'HOVER 公告',
        ],
        // 相容舊欄位 image → 對應桌機圖
        'image' => [
            'url' => '',
            'alt' => 'HOVER 公告',
        ],
        'button' => [
            'label'      => '立即加入',
            'href'       => '/register',
            'show'       => true,
            'width'      => 'M',      // S | M | L
            'fontSize'   => 13,
            'fontWeight' => 600,
            'variant'    => 'brand',  // brand（品牌綠）| white
        ],
        'trigger' => [
            'delaySec'      => 0,  // 0=不延遲；與 scroll 同時設定時以先達成者觸發
            'scrollPercent' => 0,  // 0=不依捲動；1–100
        ],
        'frequency' => 'weekly', // always | daily | weekly | once
        'schedule'  => [
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

    $desktop = $data['imageDesktop']['url'] ?? '';
    $mobile  = $data['imageMobile']['url'] ?? '';
    $legacy  = $data['image']['url'] ?? '';
    $has_content = ($desktop !== '' || $mobile !== '' || $legacy !== '')
        || !empty($data['title'])
        || !empty($data['body']);
    if (!$has_content) {
        return false;
    }

    $now   = current_time('timestamp');
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

function hps_normalize_image($raw, array $fallback): array
{
    if (!is_array($raw)) {
        $raw = [];
    }
    return [
        'url' => esc_url_raw($raw['url'] ?? $fallback['url'] ?? ''),
        'alt' => sanitize_text_field($raw['alt'] ?? $fallback['alt'] ?? ''),
    ];
}

function hps_clamp_float($value, float $min, float $max, float $fallback): float
{
    $n = is_numeric($value) ? (float) $value : $fallback;
    if ($n < $min) {
        return $min;
    }
    if ($n > $max) {
        return $max;
    }
    return round($n, 2);
}

function hps_normalize_type_block($raw, array $fallback): array
{
    if (!is_array($raw)) {
        $raw = [];
    }
    $size = absint($raw['fontSize'] ?? $fallback['fontSize']);
    if ($size < 8) {
        $size = 8;
    }
    if ($size > 48) {
        $size = 48;
    }
    $weight = absint($raw['fontWeight'] ?? $fallback['fontWeight']);
    if (!in_array($weight, [400, 500, 600, 700], true)) {
        $weight = (int) $fallback['fontWeight'];
    }
    return [
        'fontSize'   => $size,
        'fontWeight' => $weight,
        'lineHeight' => hps_clamp_float($raw['lineHeight'] ?? $fallback['lineHeight'], 1.0, 2.4, (float) $fallback['lineHeight']),
    ];
}

function hps_normalize_typography($raw, array $fallback): array
{
    if (!is_array($raw)) {
        $raw = [];
    }
    return [
        'title'    => hps_normalize_type_block($raw['title'] ?? [], $fallback['title']),
        'subtitle' => hps_normalize_type_block($raw['subtitle'] ?? [], $fallback['subtitle']),
        'body'     => hps_normalize_type_block($raw['body'] ?? [], $fallback['body']),
        'footnote' => hps_normalize_type_block($raw['footnote'] ?? [], $fallback['footnote']),
    ];
}

function hps_normalize(array $data): array
{
    $d = hps_defaults();

    $data['enabled']        = !empty($data['enabled']);
    $data['version']        = sanitize_text_field($data['version'] ?? $d['version']) ?: $d['version'];
    $layout                 = sanitize_text_field($data['layout'] ?? $d['layout']);
    $data['layout']         = in_array($layout, ['split', 'full'], true) ? $layout : 'split';
    $pos                    = sanitize_text_field($data['imagePosition'] ?? $d['imagePosition']);
    $data['imagePosition']  = in_array($pos, ['left', 'right'], true) ? $pos : 'left';
    $data['hideForMembers'] = array_key_exists('hideForMembers', $data)
        ? !empty($data['hideForMembers'])
        : ($data['layout'] === 'split');
    $data['title']          = sanitize_text_field($data['title'] ?? $d['title']);
    $data['subtitle']       = sanitize_text_field($data['subtitle'] ?? $d['subtitle']);
    $data['body']           = sanitize_textarea_field($data['body'] ?? $d['body']);
    $data['footnote']       = sanitize_text_field($data['footnote'] ?? $d['footnote']);
    $data['showGiftIcon']   = !empty($data['showGiftIcon']);

    $scale = absint($data['giftIconScale'] ?? $d['giftIconScale']);
    // 舊版 100／110 → 映射到新檔；其餘非 120/140/160 則用建議值 140
    if ($scale === 100) {
        $scale = 120;
    } elseif ($scale === 110) {
        $scale = 140;
    }
    $data['giftIconScale'] = in_array($scale, [120, 140, 160], true) ? $scale : 140;

    $colors = is_array($data['colors'] ?? null) ? $data['colors'] : [];
    $data['colors'] = [
        'title'    => sanitize_hex_color($colors['title'] ?? '') ?: $d['colors']['title'],
        'subtitle' => sanitize_hex_color($colors['subtitle'] ?? '') ?: $d['colors']['subtitle'],
        'body'     => sanitize_hex_color($colors['body'] ?? '') ?: $d['colors']['body'],
        'footnote' => sanitize_hex_color($colors['footnote'] ?? '') ?: $d['colors']['footnote'],
    ];

    $data['typography'] = hps_normalize_typography($data['typography'] ?? [], $d['typography']);

    $links = is_array($data['links'] ?? null) ? $data['links'] : [];
    $terms = is_array($links['terms'] ?? null) ? $links['terms'] : [];
    $privacy = is_array($links['privacy'] ?? null) ? $links['privacy'] : [];
    $data['links'] = [
        'terms' => [
            'label' => sanitize_text_field($terms['label'] ?? $d['links']['terms']['label'])
                ?: $d['links']['terms']['label'],
            'href'  => hps_sanitize_url($terms['href'] ?? $d['links']['terms']['href']),
        ],
        'privacy' => [
            'label' => sanitize_text_field($privacy['label'] ?? $d['links']['privacy']['label'])
                ?: $d['links']['privacy']['label'],
            'href'  => hps_sanitize_url($privacy['href'] ?? $d['links']['privacy']['href']),
        ],
    ];

    // 相容舊版單一 image
    $legacy = hps_normalize_image($data['image'] ?? [], $d['image']);
    $desktop = hps_normalize_image($data['imageDesktop'] ?? [], $d['imageDesktop']);
    $mobile  = hps_normalize_image($data['imageMobile'] ?? [], $d['imageMobile']);
    if ($desktop['url'] === '' && $legacy['url'] !== '') {
        $desktop = $legacy;
    }
    if ($mobile['url'] === '' && $desktop['url'] !== '') {
        $mobile = $desktop;
    }
    $data['imageDesktop'] = $desktop;
    $data['imageMobile']  = $mobile;
    $data['image']        = $desktop; // 舊前端相容

    $button = is_array($data['button'] ?? null) ? $data['button'] : [];
    $btn_width = sanitize_text_field($button['width'] ?? $d['button']['width']);
    $btn_variant = sanitize_text_field($button['variant'] ?? $d['button']['variant']);
    $btn_weight = absint($button['fontWeight'] ?? $d['button']['fontWeight']);
    $btn_size = absint($button['fontSize'] ?? $d['button']['fontSize']);
    if ($btn_size < 10) {
        $btn_size = 10;
    }
    if ($btn_size > 20) {
        $btn_size = 20;
    }
    if (!in_array($btn_weight, [400, 500, 600, 700], true)) {
        $btn_weight = 600;
    }
    $data['button'] = [
        'label'      => sanitize_text_field($button['label'] ?? $d['button']['label']) ?: $d['button']['label'],
        'href'       => hps_sanitize_url($button['href'] ?? $d['button']['href']),
        'show'       => !empty($button['show']),
        'width'      => in_array($btn_width, ['S', 'M', 'L'], true) ? $btn_width : 'M',
        'fontSize'   => $btn_size,
        'fontWeight' => $btn_weight,
        'variant'    => in_array($btn_variant, ['brand', 'white'], true) ? $btn_variant : 'brand',
    ];

    $trigger = $data['trigger'] ?? [];
    $delay   = absint($trigger['delaySec'] ?? $trigger['delay'] ?? 0);
    $scroll  = absint($trigger['scrollPercent'] ?? $trigger['scroll'] ?? 0);
    if ($scroll > 100) {
        $scroll = 100;
    }
    $data['trigger'] = [
        'delaySec'      => $delay,
        'scrollPercent' => $scroll,
    ];

    $freq = sanitize_text_field($data['frequency'] ?? $d['frequency']);
    $data['frequency'] = in_array($freq, ['always', 'daily', 'weekly', 'once'], true)
        ? $freq
        : 'weekly';

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
    return new WP_REST_Response([
        'ok'    => true,
        'popup' => hps_get_settings(),
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
    $now   = current_time('timestamp');
    $start = hps_parse_datetime($s['schedule']['startAt'] ?? '');
    if ($start && $now < $start) {
        return '排程中';
    }
    return '未在有效期';
}

function hps_typography_fields_html(string $key, string $label, array $type, bool $only_split = false): string
{
    $wrap_class = $only_split ? 'hps-type-row hps-only-split' : 'hps-type-row';
    $weights = [
        400 => 'Regular 400',
        500 => 'Medium 500',
        600 => 'SemiBold 600',
        700 => 'Bold 700',
    ];
    ob_start();
    ?>
    <div class="<?php echo esc_attr($wrap_class); ?>">
        <p class="hps-label" style="margin:0"><?php echo esc_html($label); ?></p>
        <div class="hps-grid-3">
            <div class="hps-field">
                <label class="hps-sublabel">大小 (px)</label>
                <input type="number" min="8" max="48" class="small-text" data-field="typography.<?php echo esc_attr($key); ?>.fontSize" value="<?php echo esc_attr((string) $type['fontSize']); ?>">
            </div>
            <div class="hps-field">
                <label class="hps-sublabel">粗細</label>
                <select data-field="typography.<?php echo esc_attr($key); ?>.fontWeight" class="regular-text">
                    <?php foreach ($weights as $w => $wlabel) : ?>
                        <option value="<?php echo esc_attr((string) $w); ?>" <?php selected((int) $type['fontWeight'], $w); ?>><?php echo esc_html($wlabel); ?></option>
                    <?php endforeach; ?>
                </select>
            </div>
            <div class="hps-field">
                <label class="hps-sublabel">行距</label>
                <input type="number" min="1" max="2.4" step="0.05" class="small-text" data-field="typography.<?php echo esc_attr($key); ?>.lineHeight" value="<?php echo esc_attr((string) $type['lineHeight']); ?>">
            </div>
        </div>
    </div>
    <?php
    return (string) ob_get_clean();
}

function hps_render_page(): void
{
    if (!current_user_can('manage_options')) {
        wp_die('權限不足');
    }

    $flash   = hps_save_from_post();
    $s       = hps_get_settings();
    $payload = wp_json_encode($s, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    $api_url = rest_url('hover/v1/popup');
    $status  = hps_status_label($s);
    ?>
    <div class="wrap hover-popup-admin">
        <div class="hps-shell">
            <div class="hps-topbar">
                <div>
                    <h1>HOVER 首頁彈出公告</h1>
                    <p class="description">支援左右分欄／滿版形象；可調整字級粗細行距、Gift Icon 比例、條款連結、按鈕寬度與品牌綠／白切換。</p>
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
                            <div class="hps-card-body hps-stack">
                                <label class="hps-switch">
                                    <input type="checkbox" data-field="enabled" <?php checked(!empty($s['enabled'])); ?>>
                                    <span class="hps-switch-ui"></span>
                                    <span class="hps-switch-label">啟用首頁彈出公告</span>
                                </label>
                                <div class="hps-field">
                                    <label class="hps-label">版本代號</label>
                                    <input type="text" class="regular-text" data-field="version" value="<?php echo esc_attr($s['version']); ?>">
                                    <p class="description">變更代號後，曾關閉的訪客會依頻率設定再次看到。</p>
                                </div>
                            </div>
                        </div>

                        <div class="hps-card">
                            <div class="hps-card-head"><h2>版型選擇</h2></div>
                            <div class="hps-card-body hps-stack">
                                <div class="hps-field">
                                    <label class="hps-label">公告版型</label>
                                    <select data-field="layout" class="regular-text">
                                        <option value="split" <?php selected($s['layout'], 'split'); ?>>左右分欄（會員招募／圖文分區）</option>
                                        <option value="full" <?php selected($s['layout'], 'full'); ?>>滿版形象（活動公告）</option>
                                    </select>
                                </div>
                                <div class="hps-field hps-only-split">
                                    <label class="hps-label">圖片位置（桌機）</label>
                                    <select data-field="imagePosition" class="regular-text">
                                        <option value="left" <?php selected($s['imagePosition'], 'left'); ?>>圖片置左、文字置右</option>
                                        <option value="right" <?php selected($s['imagePosition'], 'right'); ?>>圖片置右、文字置左</option>
                                    </select>
                                    <p class="description">手機版一律改為上圖下文。</p>
                                </div>
                                <label class="hps-switch">
                                    <input type="checkbox" data-field="hideForMembers" <?php checked(!empty($s['hideForMembers'])); ?>>
                                    <span class="hps-switch-ui"></span>
                                    <span class="hps-switch-label">已登入會員不顯示（建議會員招募版型開啟）</span>
                                </label>
                            </div>
                        </div>

                        <div class="hps-card">
                            <div class="hps-card-head"><h2>公告內容</h2></div>
                            <div class="hps-card-body hps-stack">
                                <div class="hps-field">
                                    <label class="hps-label">主標題</label>
                                    <input type="text" class="large-text" data-field="title" value="<?php echo esc_attr($s['title']); ?>" placeholder="例：Join HOVER">
                                </div>
                                <?php echo hps_typography_fields_html('title', '主標題字級', $s['typography']['title'], false); ?>

                                <div class="hps-field hps-only-split">
                                    <label class="hps-label">副標題</label>
                                    <input type="text" class="large-text" data-field="subtitle" value="<?php echo esc_attr($s['subtitle']); ?>" placeholder="例：加入會員">
                                </div>
                                <?php echo hps_typography_fields_html('subtitle', '副標題字級', $s['typography']['subtitle'], true); ?>

                                <div class="hps-field">
                                    <label class="hps-label">內文</label>
                                    <textarea rows="3" class="large-text" data-field="body" placeholder="公告說明"><?php echo esc_textarea($s['body']); ?></textarea>
                                </div>
                                <?php echo hps_typography_fields_html('body', '內文字級', $s['typography']['body'], false); ?>

                                <div class="hps-field hps-only-split">
                                    <label class="hps-label">底部細字（選填）</label>
                                    <input type="text" class="large-text" data-field="footnote" value="<?php echo esc_attr($s['footnote']); ?>" placeholder="例：詳情請參閱會員條款與隱私權政策">
                                    <p class="description">細字中若出現下方「會員條款／隱私權政策」標籤文字，前台會自動變成可點連結。</p>
                                </div>
                                <?php echo hps_typography_fields_html('footnote', '底部細字字級', $s['typography']['footnote'], true); ?>

                                <div class="hps-colors">
                                    <p class="hps-label" style="margin:0 0 8px">文字顏色</p>
                                    <div class="hps-grid-2">
                                        <label class="hps-color-field">主標題顏色
                                            <input type="color" data-field="colors.title" value="<?php echo esc_attr($s['colors']['title']); ?>">
                                        </label>
                                        <label class="hps-color-field hps-only-split">副標題顏色
                                            <input type="color" data-field="colors.subtitle" value="<?php echo esc_attr($s['colors']['subtitle']); ?>">
                                        </label>
                                        <label class="hps-color-field">內文顏色
                                            <input type="color" data-field="colors.body" value="<?php echo esc_attr($s['colors']['body']); ?>">
                                        </label>
                                        <label class="hps-color-field hps-only-split">細字顏色
                                            <input type="color" data-field="colors.footnote" value="<?php echo esc_attr($s['colors']['footnote']); ?>">
                                        </label>
                                    </div>
                                </div>

                                <label class="hps-switch hps-only-split">
                                    <input type="checkbox" data-field="showGiftIcon" <?php checked(!empty($s['showGiftIcon'])); ?>>
                                    <span class="hps-switch-ui"></span>
                                    <span class="hps-switch-label">顯示禮物圖示</span>
                                </label>
                                <div class="hps-field hps-only-split">
                                    <label class="hps-label">Gift Icon 大小</label>
                                    <select data-field="giftIconScale" class="regular-text">
                                        <option value="120" <?php selected((int) $s['giftIconScale'], 120); ?>>120%</option>
                                        <option value="140" <?php selected((int) $s['giftIconScale'], 140); ?>>140%（建議）</option>
                                        <option value="160" <?php selected((int) $s['giftIconScale'], 160); ?>>160%</option>
                                    </select>
                                </div>

                                <div class="hps-field hps-only-split">
                                    <label class="hps-label">會員條款連結</label>
                                    <div class="hps-grid-2">
                                        <input type="text" class="regular-text" data-field="links.terms.label" value="<?php echo esc_attr($s['links']['terms']['label']); ?>" placeholder="會員條款">
                                        <input type="text" class="regular-text" data-field="links.terms.href" value="<?php echo esc_attr($s['links']['terms']['href']); ?>" placeholder="/terms">
                                    </div>
                                </div>
                                <div class="hps-field hps-only-split">
                                    <label class="hps-label">隱私權政策連結</label>
                                    <div class="hps-grid-2">
                                        <input type="text" class="regular-text" data-field="links.privacy.label" value="<?php echo esc_attr($s['links']['privacy']['label']); ?>" placeholder="隱私權政策">
                                        <input type="text" class="regular-text" data-field="links.privacy.href" value="<?php echo esc_attr($s['links']['privacy']['href']); ?>" placeholder="/privacy">
                                    </div>
                                </div>

                                <div class="hps-field">
                                    <label class="hps-label">桌機圖片 <span class="hps-crop-hint" id="hps-desktop-hint">（強制裁切 16:9｜建議 1920×1080）</span></label>
                                    <div class="hps-image-preview" id="hps-preview-desktop">
                                        <?php if (!empty($s['imageDesktop']['url'])) : ?>
                                            <img src="<?php echo esc_url($s['imageDesktop']['url']); ?>" alt="">
                                        <?php else : ?>
                                            <div class="hps-image-placeholder"><span class="dashicons dashicons-format-image"></span><span>尚未上傳桌機圖片</span></div>
                                        <?php endif; ?>
                                    </div>
                                    <input type="hidden" data-field="imageDesktop.url" value="<?php echo esc_attr($s['imageDesktop']['url']); ?>">
                                    <div class="hps-actions">
                                        <button type="button" class="button button-primary hps-pick-crop" data-target="desktop" data-field-url="imageDesktop.url" data-preview="hps-preview-desktop">選圖並裁切</button>
                                        <button type="button" class="button hps-clear-media" data-field-url="imageDesktop.url" data-preview="hps-preview-desktop">清除</button>
                                    </div>
                                </div>
                                <div class="hps-field">
                                    <label class="hps-label">手機圖片 <span class="hps-crop-hint">（強制裁切 9:16｜建議 1080×1920）</span></label>
                                    <div class="hps-image-preview hps-preview-portrait" id="hps-preview-mobile">
                                        <?php if (!empty($s['imageMobile']['url'])) : ?>
                                            <img src="<?php echo esc_url($s['imageMobile']['url']); ?>" alt="">
                                        <?php else : ?>
                                            <div class="hps-image-placeholder"><span class="dashicons dashicons-smartphone"></span><span>尚未上傳手機圖片（可留空，沿用桌機圖）</span></div>
                                        <?php endif; ?>
                                    </div>
                                    <input type="hidden" data-field="imageMobile.url" value="<?php echo esc_attr($s['imageMobile']['url']); ?>">
                                    <div class="hps-actions">
                                        <button type="button" class="button button-primary hps-pick-crop" data-target="mobile" data-field-url="imageMobile.url" data-preview="hps-preview-mobile">選圖並裁切</button>
                                        <button type="button" class="button hps-clear-media" data-field-url="imageMobile.url" data-preview="hps-preview-mobile">清除</button>
                                    </div>
                                </div>
                                <div class="hps-field">
                                    <label class="hps-label">圖片替代文字</label>
                                    <input type="text" class="regular-text" data-field="imageDesktop.alt" value="<?php echo esc_attr($s['imageDesktop']['alt']); ?>">
                                </div>
                            </div>
                        </div>

                        <div class="hps-card">
                            <div class="hps-card-head"><h2>按鈕設定</h2></div>
                            <div class="hps-card-body hps-stack">
                                <label class="hps-switch">
                                    <input type="checkbox" data-field="button.show" <?php checked(!empty($s['button']['show'])); ?>>
                                    <span class="hps-switch-ui"></span>
                                    <span class="hps-switch-label">顯示按鈕</span>
                                </label>
                                <div class="hps-grid-2">
                                    <div class="hps-field">
                                        <label class="hps-label">按鈕文字</label>
                                        <input type="text" class="regular-text" data-field="button.label" value="<?php echo esc_attr($s['button']['label']); ?>">
                                    </div>
                                    <div class="hps-field">
                                        <label class="hps-label">按鈕連結</label>
                                        <input type="text" class="regular-text" data-field="button.href" value="<?php echo esc_attr($s['button']['href']); ?>" placeholder="/register 或 /products">
                                    </div>
                                    <div class="hps-field">
                                        <label class="hps-label">按鈕寬度</label>
                                        <select data-field="button.width" class="regular-text">
                                            <option value="S" <?php selected($s['button']['width'], 'S'); ?>>S</option>
                                            <option value="M" <?php selected($s['button']['width'], 'M'); ?>>M（預設）</option>
                                            <option value="L" <?php selected($s['button']['width'], 'L'); ?>>L</option>
                                        </select>
                                        <p class="description">高度固定，僅調整寬度。</p>
                                    </div>
                                    <div class="hps-field">
                                        <label class="hps-label">按鈕顏色</label>
                                        <select data-field="button.variant" class="regular-text">
                                            <option value="brand" <?php selected($s['button']['variant'], 'brand'); ?>>品牌綠（預設）</option>
                                            <option value="white" <?php selected($s['button']['variant'], 'white'); ?>>白色</option>
                                        </select>
                                    </div>
                                    <div class="hps-field">
                                        <label class="hps-label">按鈕文字大小 (px)</label>
                                        <input type="number" min="10" max="20" class="small-text" data-field="button.fontSize" value="<?php echo esc_attr((string) $s['button']['fontSize']); ?>">
                                    </div>
                                    <div class="hps-field">
                                        <label class="hps-label">按鈕文字粗細</label>
                                        <select data-field="button.fontWeight" class="regular-text">
                                            <?php foreach ([400 => 'Regular 400', 500 => 'Medium 500', 600 => 'SemiBold 600', 700 => 'Bold 700'] as $w => $label) : ?>
                                                <option value="<?php echo esc_attr((string) $w); ?>" <?php selected((int) $s['button']['fontWeight'], $w); ?>><?php echo esc_html($label); ?></option>
                                            <?php endforeach; ?>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div class="hps-card">
                            <div class="hps-card-head"><h2>觸發方式</h2></div>
                            <div class="hps-card-body hps-grid-2">
                                <div class="hps-field">
                                    <label class="hps-label">延遲秒數</label>
                                    <input type="number" min="0" max="120" class="small-text" data-field="trigger.delaySec" value="<?php echo esc_attr((string) $s['trigger']['delaySec']); ?>">
                                    <p class="description">0 = 不使用延遲。進站後等待 X 秒再顯示。</p>
                                </div>
                                <div class="hps-field">
                                    <label class="hps-label">捲動比例 %</label>
                                    <input type="number" min="0" max="100" class="small-text" data-field="trigger.scrollPercent" value="<?php echo esc_attr((string) $s['trigger']['scrollPercent']); ?>">
                                    <p class="description">0 = 不使用捲動。頁面捲動達 X% 時顯示。</p>
                                </div>
                                <p class="description hps-span-2">兩者皆為 0 → 立即顯示。若同時設定，以先達成者觸發。</p>
                            </div>
                        </div>

                        <div class="hps-card">
                            <div class="hps-card-head"><h2>顯示頻率</h2></div>
                            <div class="hps-card-body">
                                <div class="hps-field">
                                    <label class="hps-label">關閉後多久可再顯示</label>
                                    <select data-field="frequency" class="regular-text">
                                        <option value="always" <?php selected($s['frequency'], 'always'); ?>>每次進站</option>
                                        <option value="daily" <?php selected($s['frequency'], 'daily'); ?>>每天一次</option>
                                        <option value="weekly" <?php selected($s['frequency'], 'weekly'); ?>>每 7 天一次（預設）</option>
                                        <option value="once" <?php selected($s['frequency'], 'once'); ?>>關閉後不再顯示（直到變更版本代號）</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div class="hps-card">
                            <div class="hps-card-head"><h2>活動期間</h2></div>
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
                                    <p class="description" style="margin:4px 0 0">同時顯示電腦版與手機版</p>
                                </div>
                            </div>
                            <div class="hps-card-body hps-preview-body">
                                <div id="hps-live-preview" class="hps-dual-preview"></div>
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
        .hover-popup-admin { max-width: 1480px; }
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
        .hover-popup-admin .hps-status.is-live { background: #edf7f1; color: #1a6847; }
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
            display: grid; grid-template-columns: minmax(0, 1fr) minmax(480px, 520px); gap: 18px; align-items: start;
        }
        .hover-popup-admin .hps-card {
            background: #fff; border: 1px solid #dcdcde; border-radius: 8px;
            box-shadow: 0 1px 2px rgba(0,0,0,.04); overflow: hidden; margin-bottom: 16px;
        }
        .hover-popup-admin .hps-card-head {
            padding: 14px 18px; border-bottom: 1px solid #f0f0f1;
        }
        .hover-popup-admin .hps-card-head h2 { margin: 0; font-size: 14px; font-weight: 700; }
        .hover-popup-admin .hps-card-body { padding: 18px; }
        .hover-popup-admin .hps-grid-2 {
            display: grid; grid-template-columns: 1fr 1fr; gap: 14px 16px;
        }
        .hover-popup-admin .hps-grid-3 {
            display: grid; grid-template-columns: 1fr 1.2fr 1fr; gap: 10px 12px;
        }
        .hover-popup-admin .hps-span-2 { grid-column: 1 / -1; }
        .hover-popup-admin .hps-field { display: flex; flex-direction: column; gap: 6px; }
        .hover-popup-admin .hps-label { font-weight: 600; font-size: 13px; }
        .hover-popup-admin .hps-sublabel { font-size: 11px; color: #646970; font-weight: 600; }
        .hover-popup-admin .hps-type-row {
            background: #f6f7f7; border-radius: 8px; padding: 12px; display: flex; flex-direction: column; gap: 8px;
        }
        .hover-popup-admin .hps-stack { display: flex; flex-direction: column; gap: 16px; }
        .hover-popup-admin .hps-actions { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 4px; }
        .hover-popup-admin .hps-foot { margin-top: 4px; }
        .hover-popup-admin .hps-reset-form { margin-top: 8px; }
        .hover-popup-admin .hps-image-preview,
        .hover-popup-admin .hps-image-placeholder {
            width: 100%; max-width: 280px; aspect-ratio: 16/9; border: 1px dashed #c3c4c7; border-radius: 8px;
            background: #f6f7f7; display: flex; flex-direction: column;
            align-items: center; justify-content: center; text-align: center;
            padding: 12px; color: #646970; font-size: 12px; gap: 6px; overflow: hidden;
        }
        .hover-popup-admin .hps-preview-portrait { max-width: 120px; aspect-ratio: 9/16; }
        .hover-popup-admin .hps-image-preview img { width: 100%; height: 100%; object-fit: cover; }
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
        .hover-popup-admin .hps-color-field {
            display: flex; align-items: center; justify-content: space-between; gap: 10px;
            font-size: 12px; font-weight: 600; background: #f6f7f7; border-radius: 6px; padding: 8px 10px;
        }
        .hover-popup-admin .hps-color-field input[type="color"] {
            width: 42px; height: 28px; padding: 0; border: 1px solid #c3c4c7; background: #fff; cursor: pointer;
        }
        .hover-popup-admin .hps-crop-hint { font-weight: 500; color: #646970; }
        .hover-popup-admin .hps-preview { position: sticky; top: 32px; }
        .hover-popup-admin .hps-preview-body {
            padding: 14px; background: #e8ecef; min-height: 520px;
        }
        .hover-popup-admin .hps-dual-preview {
            display: flex; flex-direction: column; gap: 18px;
        }
        .hover-popup-admin .hps-device {
            display: flex; flex-direction: column; gap: 8px;
        }
        .hover-popup-admin .hps-device-label {
            font-size: 11px; font-weight: 700; letter-spacing: .08em; color: #646970; text-transform: uppercase;
        }
        .hover-popup-admin .hps-device-stage {
            background: rgba(0,0,0,.42); border-radius: 10px; padding: 16px 12px;
            display: flex; align-items: center; justify-content: center;
        }
        .hover-popup-admin .hps-device.is-mobile .hps-device-stage { padding: 18px 36px; }
        .hover-popup-admin .hps-mock-modal {
            position: relative; background: #fff; border-radius: 4px; overflow: hidden;
            box-shadow: 0 16px 40px rgba(0,0,0,.28); width: 100%;
        }
        .hover-popup-admin .hps-device.is-desktop .hps-mock-modal.is-split {
            display: grid; grid-template-columns: 55% 45%; width: 100%; max-width: 440px;
            min-height: 300px; align-items: stretch;
            /* 對齊前台 max-w-[880px]、左圖右文 55/45、圖區 min-h ~360 的比例縮放 */
            aspect-ratio: 880 / 400;
            max-height: none;
        }
        .hover-popup-admin .hps-device.is-desktop .hps-mock-modal.is-split.is-right { grid-template-columns: 45% 55%; }
        .hover-popup-admin .hps-device.is-desktop .hps-mock-modal.is-split.is-right .hps-mock-image { order: 2; }
        .hover-popup-admin .hps-device.is-desktop .hps-mock-modal.is-split.is-right .hps-mock-body { order: 1; }
        .hover-popup-admin .hps-device.is-desktop .hps-mock-modal.is-full {
            width: 100%; max-width: 440px; min-height: 0; aspect-ratio: 16/9;
        }
        .hover-popup-admin .hps-device.is-mobile .hps-mock-modal {
            max-width: 210px; width: 100%;
        }
        .hover-popup-admin .hps-device.is-mobile .hps-mock-modal.is-split {
            /* 對齊前台 max-w-[420px]、圖約 38% 高 */
            display: flex; flex-direction: column; height: auto;
            min-height: 380px; max-height: 480px; aspect-ratio: 420 / 560;
        }
        .hover-popup-admin .hps-device.is-mobile .hps-mock-modal.is-full {
            min-height: 0; aspect-ratio: 9/16;
        }
        .hover-popup-admin .hps-mock-close {
            position: absolute; top: 6px; right: 6px; z-index: 3; width: 22px; height: 22px;
            border: 0; border-radius: 50%; background: transparent;
            color: #222; font-size: 16px; line-height: 1; cursor: default;
        }
        .hover-popup-admin .hps-mock-modal.is-full .hps-mock-close { color: #fff; }
        .hover-popup-admin .hps-mock-image {
            width: 100%; height: 100%; object-fit: cover; display: block; background: #d8d8d8;
        }
        .hover-popup-admin .hps-device.is-desktop .hps-mock-modal.is-split .hps-mock-image {
            min-height: 0; height: 100%; width: 100%;
        }
        .hover-popup-admin .hps-device.is-mobile .hps-mock-modal.is-split .hps-mock-image {
            width: 100%; flex: 0 0 38%; height: 38%; min-height: 120px; max-height: 180px;
            aspect-ratio: auto; object-fit: cover;
        }
        .hover-popup-admin .hps-mock-modal.is-full .hps-mock-image {
            position: absolute; inset: 0; min-height: 100%;
        }
        .hover-popup-admin .hps-mock-body {
            position: relative; z-index: 1; padding: 16px 14px 18px; text-align: center;
            display: flex; flex-direction: column; justify-content: center; align-items: center;
            gap: 8px; background: #fff; box-sizing: border-box; min-width: 0;
        }
        .hover-popup-admin .hps-device.is-mobile .hps-mock-modal.is-split .hps-mock-body {
            flex: 1 1 auto; height: auto; min-height: 200px; padding: 12px 12px 16px;
            gap: 7px; justify-content: center; overflow: visible;
        }
        .hover-popup-admin .hps-mock-modal.is-full .hps-mock-body {
            position: absolute; inset: 0; min-height: 100%;
            background: linear-gradient(to top, rgba(0,0,0,.58), rgba(0,0,0,.12) 55%, transparent);
            color: #fff; gap: 10px; justify-content: flex-end; padding: 18px 16px 20px;
            text-align: left; align-items: flex-start;
        }
        .hover-popup-admin .hps-device.is-mobile .hps-mock-modal.is-full .hps-mock-body {
            text-align: center; align-items: center; justify-content: flex-end;
            padding: 16px 14px 22px;
        }
        .hover-popup-admin .hps-mock-title {
            font-family: Georgia, "Times New Roman", "Noto Serif TC", serif;
            font-size: 14px; font-weight: 500; letter-spacing: .03em; margin: 0;
            line-height: 1.4; max-width: 100%; word-break: break-word;
        }
        .hover-popup-admin .hps-device.is-desktop .hps-mock-modal.is-split .hps-mock-title {
            font-size: 13px; line-height: 1.45;
        }
        .hover-popup-admin .hps-device.is-mobile .hps-mock-title { font-size: 12px; line-height: 1.4; }
        .hover-popup-admin .hps-mock-modal.is-full .hps-mock-title {
            font-family: inherit; font-size: 13px; font-weight: 700; letter-spacing: .02em; line-height: 1.45;
        }
        .hover-popup-admin .hps-device.is-mobile .hps-mock-modal.is-full .hps-mock-title { font-size: 12px; }
        .hover-popup-admin .hps-mock-sub { font-size: 11px; margin: 0; line-height: 1.4; }
        .hover-popup-admin .hps-mock-text {
            font-size: 10px; line-height: 1.55; margin: 0; white-space: pre-line; max-width: 100%;
            overflow-wrap: anywhere;
        }
        .hover-popup-admin .hps-device.is-mobile .hps-mock-text { font-size: 9px; line-height: 1.5; }
        .hover-popup-admin .hps-mock-modal.is-full .hps-mock-text { font-size: 9px; opacity: .92; }
        .hover-popup-admin .hps-mock-foot { font-size: 8px; margin: 0; line-height: 1.45; opacity: .75; max-width: 92%; }
        .hover-popup-admin .hps-mock-btn {
            display: inline-flex; align-items: center; justify-content: center;
            flex-shrink: 0; margin-top: 4px; height: 36px; box-sizing: border-box;
            padding: 0 12px; background: #2a514d; color: #fff; font-size: 10px;
            letter-spacing: .1em; font-weight: 600; white-space: nowrap;
        }
        .hover-popup-admin .hps-mock-btn.is-white { background: #fff; color: #222; border: 1px solid #ddd; }
        .hover-popup-admin .hps-mock-btn.is-width-S { min-width: 72px; }
        .hover-popup-admin .hps-mock-btn.is-width-M { min-width: 96px; }
        .hover-popup-admin .hps-mock-btn.is-width-L { min-width: 128px; }
        .hover-popup-admin .hps-device.is-mobile .hps-mock-btn {
            min-width: 0; max-width: 132px; font-size: 9px;
        }
        .hover-popup-admin .hps-mock-modal.is-full .hps-mock-btn.is-brand {
            background: #2a514d; color: #fff;
        }
        .hover-popup-admin .hps-mock-gift {
            width: 28px; height: 28px; margin: 0 auto; color: #2a514d; flex-shrink: 0;
            transform-origin: center;
        }
        .hover-popup-admin .hps-mock-gift svg { width: 100%; height: 100%; display: block; }
        .hover-popup-admin .hps-mock-foot a {
            color: inherit;
            text-decoration: underline;
            text-decoration-color: #2a514d;
            text-decoration-thickness: 1px;
            text-underline-offset: 3px;
        }
        @media (max-width: 1280px) {
            .hover-popup-admin .hps-layout { grid-template-columns: minmax(0, 1fr) minmax(420px, 460px); }
            .hover-popup-admin .hps-device.is-desktop .hps-mock-modal.is-split,
            .hover-popup-admin .hps-device.is-desktop .hps-mock-modal.is-full { max-width: 400px; }
        }
        @media (max-width: 1100px) {
            .hover-popup-admin .hps-layout { grid-template-columns: 1fr; }
            .hover-popup-admin .hps-preview { position: static; }
            .hover-popup-admin .hps-dual-preview {
                display: grid; grid-template-columns: 1.35fr .75fr; gap: 16px; align-items: start;
            }
            .hover-popup-admin .hps-device.is-desktop .hps-mock-modal.is-split,
            .hover-popup-admin .hps-device.is-desktop .hps-mock-modal.is-full { max-width: 480px; }
        }
        @media (max-width: 720px) {
            .hover-popup-admin .hps-dual-preview { grid-template-columns: 1fr; }
            .hover-popup-admin .hps-grid-2,
            .hover-popup-admin .hps-grid-3 { grid-template-columns: 1fr; }
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
        if (!state.colors) {
            state.colors = { title:'#222222', subtitle:'#555555', body:'#444444', footnote:'#999999' };
        }

        function esc(s){ return $('<div/>').text(s || '').html(); }

        function setByPath(obj, path, val){
            var parts = path.split('.');
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
                if (path.indexOf('trigger.') === 0) val = parseInt(val, 10) || 0;
                if (path === 'giftIconScale') val = parseInt(val, 10) || 140;
                if (path.indexOf('typography.') === 0) {
                    if (path.indexOf('.fontSize') > -1 || path.indexOf('.fontWeight') > -1) {
                        val = parseInt(val, 10) || 0;
                    } else if (path.indexOf('.lineHeight') > -1) {
                        val = parseFloat(val) || 1.4;
                    }
                }
                if (path === 'button.fontSize' || path === 'button.fontWeight') {
                    val = parseInt(val, 10) || 0;
                }
                setByPath(state, path, val);
            });
            if (state.imageDesktop) {
                state.image = state.imageDesktop;
                if (state.imageMobile && !state.imageMobile.alt) {
                    state.imageMobile.alt = state.imageDesktop.alt || '';
                }
            }
        }

        function syncLayoutFields(){
            var layout = $('[data-field="layout"]').val() || 'split';
            var isSplit = layout === 'split';
            $('.hps-only-split').toggle(isSplit);
            $('#hps-desktop-hint').text('（強制裁切 16:9｜建議 1920×1080）');
            $('#hps-preview-desktop').css('aspect-ratio', '16/9');
        }

        function typeStyle(block, scale){
            block = block || {};
            var size = (parseInt(block.fontSize, 10) || 14) * (scale || 1);
            return 'font-size:'+size+'px;font-weight:'+(block.fontWeight||400)+';line-height:'+(block.lineHeight||1.4)+';';
        }

        function linkifyFootnote(text, links){
            var out = esc(text || '');
            links = links || {};
            var items = [links.terms, links.privacy].filter(Boolean);
            items.sort(function(a,b){ return String(b.label||'').length - String(a.label||'').length; });
            items.forEach(function(item){
                var label = String(item.label || '');
                var href = String(item.href || '');
                if (!label || !href) return;
                var safeLabel = esc(label);
                var re = new RegExp(safeLabel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
                out = out.replace(re, '<a href="'+esc(href)+'">'+safeLabel+'</a>');
            });
            return out;
        }

        function renderPreview(){
            readFields();
            syncLayoutFields();
            var layout = state.layout || 'split';
            var colors = state.colors || {};
            var typo = state.typography || {};
            var deskImg = (state.imageDesktop && state.imageDesktop.url) || (state.image && state.image.url) || '';
            var mobImg = (state.imageMobile && state.imageMobile.url) || deskImg;
            var isFull = layout === 'full';
            var titleColor = isFull
                ? ((colors.title && colors.title !== '#222222') ? colors.title : '#ffffff')
                : (colors.title || '#222');
            var bodyColor = isFull
                ? ((colors.body && colors.body !== '#444444') ? colors.body : 'rgba(255,255,255,0.92)')
                : (colors.body || '#444');
            var subColor = colors.subtitle || '#555';
            var footColor = colors.footnote || '#999';
            var giftScale = (parseInt(state.giftIconScale, 10) || 140) / 100;
            var btn = state.button || {};
            var btnWidth = btn.width || 'M';
            var btnVariant = btn.variant || 'brand';
            // 滿版預設若未特別選白色，仍可用品牌綠；使用者選 white 才白底
            var btnClass = 'hps-mock-btn is-width-'+btnWidth+' is-'+btnVariant;
            if (btnVariant === 'white') btnClass += ' is-white';

            function giftHtml(){
                return '<div class="hps-mock-gift" style="color:'+esc(colors.title||'#2a514d')+';transform:scale('+giftScale+')" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M20 12v10H4V12"/><path d="M2 7h20v5H2z"/><path d="M12 22V7"/><path d="M12 7H7.5a2.5 2.5 0 1 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/></svg></div>';
            }

            function buildModal(device, img){
                var previewScale = device === 'mobile' ? 0.42 : 0.5;
                var html = '<div class="hps-mock-modal is-'+esc(layout);
                if (layout === 'split' && state.imagePosition === 'right' && device === 'desktop') html += ' is-right';
                html += '">';
                html += '<button type="button" class="hps-mock-close" aria-hidden="true">×</button>';
                if (img) html += '<img class="hps-mock-image" src="'+esc(img)+'" alt="">';
                html += '<div class="hps-mock-body">';
                if (state.title) html += '<h3 class="hps-mock-title" style="color:'+esc(titleColor)+';'+typeStyle(typo.title, previewScale)+'">'+esc(state.title)+'</h3>';
                if (layout === 'split' && state.subtitle) html += '<p class="hps-mock-sub" style="color:'+esc(subColor)+';'+typeStyle(typo.subtitle, previewScale)+'">'+esc(state.subtitle)+'</p>';
                if (layout === 'split' && state.showGiftIcon) html += giftHtml();
                if (state.body) html += '<p class="hps-mock-text" style="color:'+esc(bodyColor)+';'+typeStyle(typo.body, previewScale)+'">'+esc(state.body)+'</p>';
                if (btn.show && btn.label) {
                    var btnFs = Math.max(8, Math.round((parseInt(btn.fontSize,10)||13) * previewScale));
                    html += '<span class="'+btnClass+'" style="font-size:'+btnFs+'px;font-weight:'+(btn.fontWeight||600)+'">'+esc(btn.label)+'</span>';
                }
                if (layout === 'split' && state.footnote) {
                    html += '<p class="hps-mock-foot" style="color:'+esc(footColor)+';'+typeStyle(typo.footnote, previewScale)+'">'+linkifyFootnote(state.footnote, state.links)+'</p>';
                }
                html += '</div></div>';
                return html;
            }

            var out = '';
            out += '<div class="hps-device is-desktop">';
            out += '<div class="hps-device-label">電腦版</div>';
            out += '<div class="hps-device-stage">'+buildModal('desktop', deskImg)+'</div>';
            out += '</div>';
            out += '<div class="hps-device is-mobile">';
            out += '<div class="hps-device-label">手機版</div>';
            out += '<div class="hps-device-stage">'+buildModal('mobile', mobImg)+'</div>';
            out += '</div>';
            $('#hps-live-preview').html(out);
        }

        /* ─── 強制裁切 ─────────────────────────────────────── */
        function cropConfig(target){
            if (target === 'mobile') {
                return { ratio: 9/16, label: '9:16', w: 1080, h: 1920, maxW: 1080 };
            }
            return { ratio: 16/9, label: '16:9', w: 1920, h: 1080, maxW: 1920 };
        }

        function openCropFrame(field, preview, target){
            if (typeof wp === 'undefined' || !wp.media) {
                alert('媒體庫尚未載入，請重新整理頁面後再試。');
                return;
            }
            var cfg = cropConfig(target);
            var ratio = cfg.ratio;

            function imgSelectOptions(attachment, controller){
                var w = attachment.get('width');
                var h = attachment.get('height');
                var selW = w;
                var selH = Math.round(w / ratio);
                if (selH > h) {
                    selH = h;
                    selW = Math.round(h * ratio);
                }
                var x1 = Math.round((w - selW) / 2);
                var y1 = Math.round((h - selH) / 2);
                controller.set('canSkipCrop', false);
                return {
                    handles: true, keys: true, instance: true, persistent: true,
                    imageWidth: w, imageHeight: h,
                    aspectRatio: cfg.label,
                    minWidth: Math.min(120, selW),
                    minHeight: Math.min(120, selH),
                    x1: x1, y1: y1, x2: x1 + selW, y2: y1 + selH
                };
            }

            var HpsCropper = wp.media.controller.Cropper.extend({
                doCrop: function(attachment){
                    var cd = attachment.get('cropDetails');
                    var cropW = cd.width || (cd.x2 - cd.x1);
                    var dstW = Math.min(cfg.maxW, cropW);
                    cd.dst_width = dstW;
                    cd.dst_height = Math.round(dstW / ratio);
                    return wp.ajax.post('crop-image', {
                        nonce: attachment.get('nonces').edit,
                        id: attachment.get('id'),
                        context: 'hover-popup',
                        cropDetails: cd
                    });
                }
            });

            var frame = wp.media({
                button: { text: '下一步：裁切 ' + cfg.label, close: false },
                states: [
                    new wp.media.controller.Library({
                        title: '選擇圖片（將強制裁切為 ' + cfg.label + '）',
                        library: wp.media.query({ type: 'image' }),
                        multiple: false,
                        date: false,
                        suggestedWidth: cfg.w,
                        suggestedHeight: cfg.h
                    }),
                    new HpsCropper({ imgSelectOptions: imgSelectOptions })
                ]
            });

            frame.on('select', function(){ frame.setState('cropper'); });
            frame.on('cropped', function(cropped){
                if (cropped && cropped.url) {
                    setByPath(state, field, cropped.url);
                    $('[data-field="'+field+'"]').val(cropped.url);
                    $('#'+preview).html('<img src="'+cropped.url+'" alt="">');
                    renderPreview();
                }
                frame.close();
            });
            frame.open();
        }

        $(document).on('input change','input,select,textarea', renderPreview);

        $(document).on('click','.hps-pick-crop',function(){
            openCropFrame($(this).data('field-url'), $(this).data('preview'), $(this).data('target'));
        });

        $(document).on('click','.hps-clear-media',function(){
            var field = $(this).data('field-url');
            var preview = $(this).data('preview');
            setByPath(state, field, '');
            $('[data-field="'+field+'"]').val('');
            $('#'+preview).html('<div class="hps-image-placeholder"><span class="dashicons dashicons-format-image"></span><span>尚未上傳圖片</span></div>');
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
