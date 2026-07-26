<?php
/**
 * HOVER — 商品分類 Banner（Category Banner Studio）
 *
 * 使用方式（WordPress 後台）：
 * 1. Code Snippets → Add New → 貼上本檔
 * 2. Run snippet：Everywhere → 啟用
 * 3. 左側選單「HOVER 分類 Banner」
 *
 * 每個分類可獨立設定：
 * - 桌機／手機 Banner 圖（強制裁切：桌機 4:1、手機 16:9）
 * - 主標／副標：文字、字級、字距、顏色、顯示／隱藏
 * ※ Banner 文字在圖片下方白底顯示（不疊在圖上）
 * ※ 比例對齊前台 CategoryBannerBlock
 *
 * REST API：GET /wp-json/hover/v1/category-banners
 */

if (!defined('ABSPATH')) {
    exit;
}

if (defined('HCBS_LOADED')) {
    return;
}
define('HCBS_LOADED', true);

const HCBS_OPTION = 'hover_category_banners_v1';

/**
 * 分類清單：固定「全部商品」＋ WooCommerce 已建立的 product_cat
 *
 * @return array<int, array{slug:string,label:string,id?:int}>
 */
function hcbs_category_defs(): array
{
    $defs = [
        [
            'slug'  => 'all',
            'label' => '全部商品（/products）',
            'id'    => 0,
        ],
    ];

    $terms = get_terms([
        'taxonomy'   => 'product_cat',
        'hide_empty' => false,
        'orderby'    => 'name',
        'order'      => 'ASC',
    ]);

    if (is_wp_error($terms) || !is_array($terms)) {
        return $defs;
    }

    $skip = ['uncategorized', '未分類'];
    foreach ($terms as $term) {
        if (!$term instanceof WP_Term) {
            continue;
        }
        $slug = (string) $term->slug;
        $name = (string) $term->name;
        if ($slug === '' || $slug === 'all') {
            continue;
        }
        if (in_array(mb_strtolower($slug), $skip, true) || in_array($name, $skip, true)) {
            continue;
        }
        $defs[] = [
            'slug'  => $slug,
            'label' => $name . '（' . $slug . '）',
            'id'    => (int) $term->term_id,
        ];
    }

    return $defs;
}

function hcbs_default_text(string $text = '', bool $show = true): array
{
    return [
        'text'          => $text,
        'fontSize'      => 22,
        'letterSpacing' => 0.3,
        'color'         => '#111111',
        'show'          => $show,
    ];
}

function hcbs_default_banner(string $slug = 'all', string $label = ''): array
{
    $title = $slug === 'all'
        ? '全部商品種類'
        : ($label !== '' ? $label : strtoupper($slug));

    return [
        'enabled' => true,
        'imageDesktop' => [
            'url' => '',
            'alt' => 'HOVER ' . ($slug === 'all' ? 'ALL' : strtoupper($slug)),
        ],
        'imageMobile' => [
            'url' => '',
            'alt' => 'HOVER ' . ($slug === 'all' ? 'ALL' : strtoupper($slug)),
        ],
        'title' => hcbs_default_text($title, true),
        'subtitle' => array_merge(hcbs_default_text('', true), [
            'fontSize'      => 13,
            'letterSpacing' => 0.12,
            'color'         => '#666666',
            'show'          => false,
        ]),
    ];
}

function hcbs_defaults(): array
{
    $banners = [];
    foreach (hcbs_category_defs() as $def) {
        $label = $def['slug'] === 'all'
            ? '全部商品種類'
            : preg_replace('/（[^）]*）$/u', '', $def['label']);
        $banners[$def['slug']] = hcbs_default_banner($def['slug'], (string) $label);
    }

    return [
        'enabled' => true,
        'version' => '1',
        'banners' => $banners,
    ];
}

function hcbs_normalize_image($raw, array $fallback): array
{
    if (!is_array($raw)) {
        $raw = [];
    }
    return [
        'url' => esc_url_raw($raw['url'] ?? $fallback['url'] ?? ''),
        'alt' => sanitize_text_field($raw['alt'] ?? $fallback['alt'] ?? ''),
    ];
}

function hcbs_clamp_float($value, float $min, float $max, float $fallback): float
{
    $n = is_numeric($value) ? (float) $value : $fallback;
    if ($n < $min) {
        return $min;
    }
    if ($n > $max) {
        return $max;
    }
    return round($n, 3);
}

function hcbs_normalize_text($raw, array $fallback): array
{
    if (!is_array($raw)) {
        $raw = [];
    }
    $size = absint($raw['fontSize'] ?? $fallback['fontSize']);
    if ($size < 10) {
        $size = 10;
    }
    if ($size > 64) {
        $size = 64;
    }
    return [
        'text'          => sanitize_text_field($raw['text'] ?? $fallback['text'] ?? ''),
        'fontSize'      => $size,
        'letterSpacing' => hcbs_clamp_float(
            $raw['letterSpacing'] ?? $fallback['letterSpacing'],
            0,
            1.2,
            (float) $fallback['letterSpacing']
        ),
        'color'         => sanitize_hex_color($raw['color'] ?? '') ?: $fallback['color'],
        'show'          => array_key_exists('show', $raw) ? !empty($raw['show']) : !empty($fallback['show']),
    ];
}

function hcbs_normalize_banner($raw, string $slug, string $label = ''): array
{
    $d = hcbs_default_banner($slug, $label);
    if (!is_array($raw)) {
        $raw = [];
    }

    $desktop = hcbs_normalize_image($raw['imageDesktop'] ?? [], $d['imageDesktop']);
    $mobile  = hcbs_normalize_image($raw['imageMobile'] ?? [], $d['imageMobile']);
    if ($mobile['url'] === '' && $desktop['url'] !== '') {
        $mobile = $desktop;
    }

    return [
        'enabled'      => array_key_exists('enabled', $raw) ? !empty($raw['enabled']) : true,
        'imageDesktop' => $desktop,
        'imageMobile'  => $mobile,
        'title'        => hcbs_normalize_text($raw['title'] ?? [], $d['title']),
        'subtitle'     => hcbs_normalize_text($raw['subtitle'] ?? [], $d['subtitle']),
    ];
}

function hcbs_normalize(array $data): array
{
    $d = hcbs_defaults();
    $raw_banners = is_array($data['banners'] ?? null) ? $data['banners'] : [];
    $banners = [];
    foreach (hcbs_category_defs() as $def) {
        $slug = $def['slug'];
        $label = $slug === 'all'
            ? '全部商品種類'
            : preg_replace('/（[^）]*）$/u', '', $def['label']);
        $banners[$slug] = hcbs_normalize_banner($raw_banners[$slug] ?? [], $slug, (string) $label);
    }

    // 保留已儲存、但目前 WC 已刪除的分類設定（避免資料遺失）
    foreach ($raw_banners as $slug => $banner) {
        $slug = sanitize_title((string) $slug);
        if ($slug === '' || isset($banners[$slug])) {
            continue;
        }
        $banners[$slug] = hcbs_normalize_banner($banner, $slug);
    }

    return [
        'enabled' => array_key_exists('enabled', $data) ? !empty($data['enabled']) : true,
        'version' => sanitize_text_field($data['version'] ?? $d['version']) ?: '1',
        'banners' => $banners,
    ];
}

function hcbs_get_settings(): array
{
    $saved = get_option(HCBS_OPTION, []);
    if (!is_array($saved)) {
        $saved = [];
    }
    return hcbs_normalize(array_replace_recursive(hcbs_defaults(), $saved));
}

function hcbs_save_from_post(): ?array
{
    if ($_SERVER['REQUEST_METHOD'] !== 'POST' || empty($_POST['hcbs_act'])) {
        return null;
    }
    if (!wp_verify_nonce($_POST['hcbs_nonce'] ?? '', 'hcbs_save')) {
        return ['ok' => false, 'msg' => '安全驗證失敗，請重新整理後再試。'];
    }
    if (!current_user_can('manage_options')) {
        return ['ok' => false, 'msg' => '權限不足。'];
    }

    $act = sanitize_text_field($_POST['hcbs_act']);
    if ($act === 'reset') {
        delete_option(HCBS_OPTION);
        return ['ok' => true, 'msg' => '已還原為預設 Banner 設定。'];
    }
    if ($act !== 'save') {
        return null;
    }

    $raw = json_decode(wp_unslash($_POST['hcbs_payload'] ?? ''), true);
    if (!is_array($raw)) {
        return ['ok' => false, 'msg' => '資料格式錯誤。'];
    }

    $normalized = hcbs_normalize($raw);
    update_option(HCBS_OPTION, $normalized, false);
    return ['ok' => true, 'msg' => '分類 Banner 已儲存。'];
}

add_action('admin_menu', function () {
    if (!current_user_can('manage_options')) {
        return;
    }
    add_menu_page(
        'HOVER 分類 Banner',
        'HOVER 分類 Banner',
        'manage_options',
        'hcbs',
        'hcbs_render_page',
        'dashicons-format-image',
        57
    );
}, 99);

add_action('admin_enqueue_scripts', function ($hook) {
    if ($hook !== 'toplevel_page_hcbs') {
        return;
    }
    wp_enqueue_media();
});

add_action('admin_footer', 'hcbs_admin_footer_script');

add_action('rest_api_init', function () {
    register_rest_route('hover/v1', '/category-banners', [
        'methods'             => 'GET',
        'callback'            => 'hcbs_rest_category_banners',
        'permission_callback' => '__return_true',
    ]);
});

function hcbs_rest_category_banners(): WP_REST_Response
{
    return new WP_REST_Response([
        'ok'              => true,
        'categoryBanners' => hcbs_get_settings(),
    ], 200);
}

function hcbs_text_fields_html(string $prefix, string $label, array $text): string
{
    ob_start();
    ?>
    <div class="hcbs-text-block">
        <div class="hcbs-text-head">
            <strong><?php echo esc_html($label); ?></strong>
            <label class="hcbs-switch hcbs-switch-sm">
                <input type="checkbox" data-field="<?php echo esc_attr($prefix); ?>.show" <?php checked(!empty($text['show'])); ?>>
                <span class="hcbs-switch-ui"></span>
                <span class="hcbs-switch-label">顯示</span>
            </label>
        </div>
        <div class="hcbs-field">
            <label class="hcbs-label">文字內容</label>
            <input type="text" class="large-text" data-field="<?php echo esc_attr($prefix); ?>.text" value="<?php echo esc_attr($text['text']); ?>">
        </div>
        <div class="hcbs-grid-3">
            <div class="hcbs-field">
                <label class="hcbs-sublabel">字體大小 (px)</label>
                <input type="number" min="10" max="64" class="small-text" data-field="<?php echo esc_attr($prefix); ?>.fontSize" value="<?php echo esc_attr((string) $text['fontSize']); ?>">
            </div>
            <div class="hcbs-field">
                <label class="hcbs-sublabel">字距 (em)</label>
                <input type="number" min="0" max="1.2" step="0.01" class="small-text" data-field="<?php echo esc_attr($prefix); ?>.letterSpacing" value="<?php echo esc_attr((string) $text['letterSpacing']); ?>">
            </div>
            <div class="hcbs-field">
                <label class="hcbs-sublabel">文字顏色</label>
                <input type="color" data-field="<?php echo esc_attr($prefix); ?>.color" value="<?php echo esc_attr($text['color']); ?>">
            </div>
        </div>
    </div>
    <?php
    return (string) ob_get_clean();
}

function hcbs_render_page(): void
{
    if (!current_user_can('manage_options')) {
        wp_die('權限不足');
    }

    $flash   = hcbs_save_from_post();
    $s       = hcbs_get_settings();
    $defs    = hcbs_category_defs();
    $payload = wp_json_encode($s, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    $api_url = rest_url('hover/v1/category-banners');
    $first   = $defs[0]['slug'];
    ?>
    <div class="wrap hover-category-banner-admin">
        <div class="hcbs-shell">
            <div class="hcbs-topbar">
                <div>
                    <h1>HOVER 商品分類 Banner</h1>
                    <p class="description">每個分類可獨立設定桌機／手機圖與主標、副標。文字顯示於圖片下方白底，不疊在圖上。</p>
                </div>
                <button type="submit" form="hcbs-form" class="button button-primary button-hero">儲存設定</button>
            </div>

            <?php if ($flash) : ?>
                <div class="notice <?php echo $flash['ok'] ? 'notice-success' : 'notice-error'; ?> is-dismissible">
                    <p><?php echo esc_html($flash['msg']); ?></p>
                </div>
            <?php endif; ?>

            <div class="hcbs-api-pill">
                <span class="dashicons dashicons-rest-api"></span>
                <span>REST API</span>
                <code><?php echo esc_html($api_url); ?></code>
            </div>

            <form id="hcbs-form" method="post">
                <?php wp_nonce_field('hcbs_save', 'hcbs_nonce'); ?>
                <input type="hidden" name="hcbs_act" value="save">
                <input type="hidden" name="hcbs_payload" id="hcbs-payload" value="">

                <div class="hcbs-card">
                    <div class="hcbs-card-body">
                        <label class="hcbs-switch">
                            <input type="checkbox" data-field="enabled" <?php checked(!empty($s['enabled'])); ?>>
                            <span class="hcbs-switch-ui"></span>
                            <span class="hcbs-switch-label">啟用分類 Banner（全站開關）</span>
                        </label>
                        <div class="hcbs-field" style="margin-top:14px;max-width:240px">
                            <label class="hcbs-label">版本代號</label>
                            <input type="text" class="regular-text" data-field="version" value="<?php echo esc_attr($s['version']); ?>">
                        </div>
                    </div>
                </div>

                <div class="hcbs-card">
                    <div class="hcbs-card-body hcbs-select-row">
                        <div class="hcbs-field" style="max-width:420px;margin:0">
                            <label class="hcbs-label" for="hcbs-category-select">選擇要編輯的分類</label>
                            <select id="hcbs-category-select" class="regular-text" style="width:100%;max-width:420px">
                                <?php foreach ($defs as $i => $def) : ?>
                                    <option value="<?php echo esc_attr($def['slug']); ?>" <?php selected($i === 0); ?>>
                                        <?php echo esc_html($def['label']); ?>
                                    </option>
                                <?php endforeach; ?>
                            </select>
                            <p class="description" style="margin:8px 0 0">
                                清單來自 WooCommerce「商品 → 分類」。若剛新增分類，請重新整理此頁。
                                <?php if (count($defs) <= 1) : ?>
                                    <strong style="color:#b32d2e">目前尚未抓到商品分類，請先至「商品 → 分類」建立。</strong>
                                <?php endif; ?>
                            </p>
                        </div>
                    </div>
                </div>

                <?php foreach ($defs as $i => $def) :
                    $slug = $def['slug'];
                    $b = $s['banners'][$slug] ?? hcbs_default_banner($slug);
                    ?>
                    <div class="hcbs-panel <?php echo $i === 0 ? 'is-active' : ''; ?>" data-panel="<?php echo esc_attr($slug); ?>">
                        <div class="hcbs-main">
                            <div class="hcbs-card">
                                <div class="hcbs-card-head"><h2><?php echo esc_html($def['label']); ?> — 圖片</h2></div>
                                <div class="hcbs-card-body hcbs-stack">
                                    <label class="hcbs-switch">
                                        <input type="checkbox" data-field="banners.<?php echo esc_attr($slug); ?>.enabled" <?php checked(!empty($b['enabled'])); ?>>
                                        <span class="hcbs-switch-ui"></span>
                                        <span class="hcbs-switch-label">啟用此分類 Banner</span>
                                    </label>

                                    <div class="hcbs-field">
                                        <label class="hcbs-label">桌機 Banner <span class="hcbs-hint">（強制裁切 4:1｜建議 1920×480｜對齊前台 50vh 圖區）</span></label>
                                        <div class="hcbs-image-preview" id="hcbs-preview-<?php echo esc_attr($slug); ?>-desktop">
                                            <?php if (!empty($b['imageDesktop']['url'])) : ?>
                                                <img src="<?php echo esc_url($b['imageDesktop']['url']); ?>" alt="">
                                            <?php else : ?>
                                                <div class="hcbs-image-placeholder"><span class="dashicons dashicons-format-image"></span><span>尚未上傳</span></div>
                                            <?php endif; ?>
                                        </div>
                                        <input type="hidden" data-field="banners.<?php echo esc_attr($slug); ?>.imageDesktop.url" value="<?php echo esc_attr($b['imageDesktop']['url']); ?>">
                                        <div class="hcbs-actions">
                                            <button type="button" class="button button-primary hcbs-pick-crop" data-target="desktop" data-field-url="banners.<?php echo esc_attr($slug); ?>.imageDesktop.url" data-preview="hcbs-preview-<?php echo esc_attr($slug); ?>-desktop">選圖並裁切</button>
                                            <button type="button" class="button hcbs-clear-media" data-field-url="banners.<?php echo esc_attr($slug); ?>.imageDesktop.url" data-preview="hcbs-preview-<?php echo esc_attr($slug); ?>-desktop">清除</button>
                                        </div>
                                    </div>

                                    <div class="hcbs-field">
                                        <label class="hcbs-label">手機 Banner <span class="hcbs-hint">（強制裁切 16:9｜建議 1920×1080｜對齊前台）</span></label>
                                        <div class="hcbs-image-preview hcbs-preview-mobile" id="hcbs-preview-<?php echo esc_attr($slug); ?>-mobile">
                                            <?php if (!empty($b['imageMobile']['url'])) : ?>
                                                <img src="<?php echo esc_url($b['imageMobile']['url']); ?>" alt="">
                                            <?php else : ?>
                                                <div class="hcbs-image-placeholder"><span class="dashicons dashicons-smartphone"></span><span>尚未上傳（可留空沿用桌機）</span></div>
                                            <?php endif; ?>
                                        </div>
                                        <input type="hidden" data-field="banners.<?php echo esc_attr($slug); ?>.imageMobile.url" value="<?php echo esc_attr($b['imageMobile']['url']); ?>">
                                        <div class="hcbs-actions">
                                            <button type="button" class="button button-primary hcbs-pick-crop" data-target="mobile" data-field-url="banners.<?php echo esc_attr($slug); ?>.imageMobile.url" data-preview="hcbs-preview-<?php echo esc_attr($slug); ?>-mobile">選圖並裁切</button>
                                            <button type="button" class="button hcbs-clear-media" data-field-url="banners.<?php echo esc_attr($slug); ?>.imageMobile.url" data-preview="hcbs-preview-<?php echo esc_attr($slug); ?>-mobile">清除</button>
                                        </div>
                                    </div>

                                    <div class="hcbs-field">
                                        <label class="hcbs-label">圖片替代文字</label>
                                        <input type="text" class="regular-text" data-field="banners.<?php echo esc_attr($slug); ?>.imageDesktop.alt" value="<?php echo esc_attr($b['imageDesktop']['alt']); ?>">
                                    </div>
                                </div>
                            </div>

                            <div class="hcbs-card">
                                <div class="hcbs-card-head"><h2>主標／副標（顯示於圖片下方白底）</h2></div>
                                <div class="hcbs-card-body hcbs-stack">
                                    <?php echo hcbs_text_fields_html('banners.' . $slug . '.title', '主標', $b['title']); ?>
                                    <?php echo hcbs_text_fields_html('banners.' . $slug . '.subtitle', '副標', $b['subtitle']); ?>
                                </div>
                            </div>
                        </div>
                    </div>
                <?php endforeach; ?>

                <div class="hcbs-foot">
                    <?php submit_button('儲存設定', 'primary large', 'submit', false); ?>
                </div>
            </form>

            <form method="post" class="hcbs-reset-form" onsubmit="return confirm('確定還原為預設？');">
                <?php wp_nonce_field('hcbs_save', 'hcbs_nonce'); ?>
                <input type="hidden" name="hcbs_act" value="reset">
                <button type="submit" class="button-link-delete">還原預設</button>
            </form>
        </div>
    </div>
    <script>
        window.HCBS_DATA = <?php echo $payload ?: '{}'; ?>;
        window.HCBS_ACTIVE = <?php echo wp_json_encode($first); ?>;
    </script>
    <?php
    hcbs_print_admin_styles();
}

function hcbs_print_admin_styles(): void
{
    ?>
    <style>
        .hover-category-banner-admin { max-width: 1400px; }
        .hover-category-banner-admin .hcbs-topbar {
            display: flex; align-items: flex-start; justify-content: space-between;
            gap: 16px; margin: 8px 0 16px;
        }
        .hover-category-banner-admin .hcbs-topbar h1 { margin: 0 0 6px; }
        .hover-category-banner-admin .hcbs-api-pill {
            display: inline-flex; align-items: center; gap: 8px; background: #fff;
            border: 1px solid #dcdcde; border-radius: 999px; padding: 8px 14px;
            margin-bottom: 16px; font-size: 12px; color: #646970;
        }
        .hover-category-banner-admin .hcbs-api-pill code {
            font-size: 11px; background: #f6f7f7; padding: 2px 8px; border-radius: 999px;
        }
        .hover-category-banner-admin .hcbs-select-row {
            display: flex; align-items: flex-end; gap: 16px; flex-wrap: wrap;
        }
        .hover-category-banner-admin .hcbs-panel { display: none; }
        .hover-category-banner-admin .hcbs-panel.is-active { display: block; }
        .hover-category-banner-admin .hcbs-main { max-width: 920px; }
        .hover-category-banner-admin .hcbs-card {
            background: #fff; border: 1px solid #dcdcde; border-radius: 8px;
            box-shadow: 0 1px 2px rgba(0,0,0,.04); overflow: hidden; margin-bottom: 16px;
        }
        .hover-category-banner-admin .hcbs-card-head {
            padding: 14px 18px; border-bottom: 1px solid #f0f0f1;
        }
        .hover-category-banner-admin .hcbs-card-head h2 { margin: 0; font-size: 14px; font-weight: 700; }
        .hover-category-banner-admin .hcbs-card-body { padding: 18px; }
        .hover-category-banner-admin .hcbs-stack { display: flex; flex-direction: column; gap: 16px; }
        .hover-category-banner-admin .hcbs-grid-3 {
            display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px;
        }
        .hover-category-banner-admin .hcbs-field { display: flex; flex-direction: column; gap: 6px; }
        .hover-category-banner-admin .hcbs-label { font-weight: 600; font-size: 13px; }
        .hover-category-banner-admin .hcbs-sublabel { font-size: 11px; color: #646970; font-weight: 600; }
        .hover-category-banner-admin .hcbs-hint { font-weight: 500; color: #646970; }
        .hover-category-banner-admin .hcbs-actions { display: flex; gap: 8px; flex-wrap: wrap; }
        .hover-category-banner-admin .hcbs-image-preview {
            width: 100%; max-width: 420px; aspect-ratio: 4/1; border: 1px dashed #c3c4c7;
            border-radius: 8px; background: #f6f7f7; color: #646970; font-size: 12px;
            overflow: hidden; position: relative; padding: 0;
        }
        .hover-category-banner-admin .hcbs-preview-mobile { max-width: 280px; aspect-ratio: 16/9; }
        .hover-category-banner-admin .hcbs-image-preview img {
            position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; display: block;
        }
        .hover-category-banner-admin .hcbs-image-placeholder {
            position: absolute; inset: 0; display: flex; flex-direction: column;
            align-items: center; justify-content: center; text-align: center; gap: 6px;
            padding: 12px; box-sizing: border-box; color: #646970; font-size: 12px;
        }
        .hover-category-banner-admin .hcbs-switch {
            display: inline-flex; align-items: center; gap: 10px; cursor: pointer; user-select: none;
        }
        .hover-category-banner-admin .hcbs-switch input { position: absolute; opacity: 0; pointer-events: none; }
        .hover-category-banner-admin .hcbs-switch-ui {
            width: 40px; height: 22px; border-radius: 999px; background: #c3c4c7; position: relative; transition: .2s;
        }
        .hover-category-banner-admin .hcbs-switch-ui::after {
            content: ""; position: absolute; top: 3px; left: 3px; width: 16px; height: 16px;
            border-radius: 50%; background: #fff; transition: .2s; box-shadow: 0 1px 3px rgba(0,0,0,.2);
        }
        .hover-category-banner-admin .hcbs-switch input:checked + .hcbs-switch-ui { background: #2a514d; }
        .hover-category-banner-admin .hcbs-switch input:checked + .hcbs-switch-ui::after { transform: translateX(18px); }
        .hover-category-banner-admin .hcbs-switch-label { font-weight: 600; font-size: 13px; }
        .hover-category-banner-admin .hcbs-text-block {
            background: #f6f7f7; border-radius: 8px; padding: 14px; display: flex; flex-direction: column; gap: 12px;
        }
        .hover-category-banner-admin .hcbs-text-head {
            display: flex; align-items: center; justify-content: space-between; gap: 12px;
        }
        .hover-category-banner-admin .hcbs-foot { margin-top: 4px; }
        .hover-category-banner-admin .hcbs-reset-form { margin-top: 8px; }
        @media (max-width: 720px) {
            .hover-category-banner-admin .hcbs-grid-3 { grid-template-columns: 1fr; }
        }
    </style>
    <?php
}

function hcbs_admin_footer_script(): void
{
    $screen = function_exists('get_current_screen') ? get_current_screen() : null;
    if (!$screen || $screen->id !== 'toplevel_page_hcbs') {
        return;
    }
    ?>
    <script>
    jQuery(function($){
        var state = window.HCBS_DATA || { enabled: true, version: '1', banners: {} };

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
                if (path.indexOf('.fontSize') > -1) val = parseInt(val, 10) || 0;
                if (path.indexOf('.letterSpacing') > -1) val = parseFloat(val) || 0;
                setByPath(state, path, val);
            });
        }

        function cropConfig(target){
            if (target === 'mobile') {
                return { ratio: 16/9, label: '16:9', w: 1920, h: 1080, maxW: 1920 };
            }
            return { ratio: 4/1, label: '4:1', w: 1920, h: 480, maxW: 1920 };
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

            var HcbsCropper = wp.media.controller.Cropper.extend({
                doCrop: function(attachment){
                    var cd = attachment.get('cropDetails');
                    var cropW = cd.width || (cd.x2 - cd.x1);
                    var dstW = Math.min(cfg.maxW, cropW);
                    cd.dst_width = dstW;
                    cd.dst_height = Math.round(dstW / ratio);
                    return wp.ajax.post('crop-image', {
                        nonce: attachment.get('nonces').edit,
                        id: attachment.get('id'),
                        context: 'hover-category-banner',
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
                    new HcbsCropper({ imgSelectOptions: imgSelectOptions })
                ]
            });

            frame.on('select', function(){ frame.setState('cropper'); });
            frame.on('cropped', function(cropped){
                if (cropped && cropped.url) {
                    setByPath(state, field, cropped.url);
                    $('[data-field="'+field+'"]').val(cropped.url);
                    $('#'+preview).html('<img src="'+cropped.url+'" alt="">');
                }
                frame.close();
            });
            frame.open();
        }

        function switchCategory(slug){
            $('.hcbs-panel').removeClass('is-active');
            $('.hcbs-panel[data-panel="'+slug+'"]').addClass('is-active');
        }

        $('#hcbs-category-select').on('change', function(){
            switchCategory(String($(this).val() || 'all'));
        });

        $(document).on('click', '.hcbs-pick-crop', function(){
            openCropFrame($(this).data('field-url'), $(this).data('preview'), $(this).data('target'));
        });

        $(document).on('click', '.hcbs-clear-media', function(){
            var field = $(this).data('field-url');
            var preview = $(this).data('preview');
            setByPath(state, field, '');
            $('[data-field="'+field+'"]').val('');
            $('#'+preview).html('<div class="hcbs-image-placeholder"><span class="dashicons dashicons-format-image"></span><span>尚未上傳</span></div>');
        });

        $('#hcbs-form').on('submit', function(){
            readFields();
            $('#hcbs-payload').val(JSON.stringify(state));
        });

        switchCategory(String($('#hcbs-category-select').val() || 'all'));
    });
    </script>
    <?php
}
