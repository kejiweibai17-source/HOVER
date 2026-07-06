<?php
/**
 * HOVER — 頁尾內容管理（Footer Studio）
 *
 * 使用方式（WordPress 後台）：
 * 1. 安裝並啟用插件「Code Snippets」
 * 2. Snippets → Add New → 貼上本檔內容
 * 3. Run snippet：Everywhere
 * 4. 左側選單會出現「HOVER 頁尾」
 *
 * REST API（給 Next.js）：
 * GET /wp-json/hover/v1/footer
 */

if (!defined('ABSPATH')) {
    exit;
}

if (defined('HFS_LOADED')) {
    return;
}
define('HFS_LOADED', true);

const HFS_OPTION = 'hover_footer_v1';

/** 允許上傳 SVG（Logo 用） */
add_filter('upload_mimes', function ($mimes) {
    $mimes['svg']  = 'image/svg+xml';
    $mimes['svgz'] = 'image/svg+xml';
    return $mimes;
});

add_filter('wp_check_filetype_and_ext', function ($data, $file, $filename, $mimes) {
    if (!empty($data['ext']) && $data['ext'] !== 'svg') {
        return $data;
    }
    $ext = strtolower(pathinfo($filename, PATHINFO_EXTENSION));
    if ($ext === 'svg') {
        $data['ext']  = 'svg';
        $data['type'] = 'image/svg+xml';
    }
    return $data;
}, 10, 4);

add_filter('wp_prepare_attachment_for_js', function ($response) {
    if (!empty($response['mime']) && $response['mime'] === 'image/svg+xml') {
        $response['type'] = 'image';
        $response['subtype'] = 'svg+xml';
        if (empty($response['sizes'])) {
            $response['sizes'] = [
                'full' => [
                    'url'         => $response['url'],
                    'width'       => $response['width'] ?? null,
                    'height'      => $response['height'] ?? null,
                    'orientation' => 'landscape',
                ],
            ];
        }
    }
    return $response;
}, 10, 1);

add_filter('file_is_displayable_image', function ($result, $path) {
    if (strtolower((string) pathinfo($path, PATHINFO_EXTENSION)) === 'svg') {
        return true;
    }
    return $result;
}, 10, 2);

add_action('admin_menu', function () {
    if (!current_user_can('manage_options')) {
        return;
    }
    add_menu_page(
        'HOVER 頁尾',
        'HOVER 頁尾',
        'manage_options',
        'hfs',
        'hfs_render_page',
        'dashicons-layout',
        57
    );
}, 99);

add_action('admin_enqueue_scripts', function ($hook) {
    if ($hook !== 'toplevel_page_hfs') {
        return;
    }
    wp_enqueue_media();
});

add_action('admin_footer', 'hfs_admin_footer_script');

add_action('rest_api_init', function () {
    register_rest_route('hover/v1', '/footer', [
        'methods'             => 'GET',
        'callback'            => 'hfs_rest_footer',
        'permission_callback' => '__return_true',
    ]);
});

function hfs_defaults(): array
{
    return [
        'logo' => [
            'url'      => '',
            'alt'      => 'HOVER',
            'link'     => '/',
            'color'    => '#ffffff',
            'mimeType' => '',
        ],
        'backgroundColor' => '#2a514d',
        'columns' => [
            [
                'title' => '關於我們',
                'links' => [
                    ['label' => '品牌故事', 'href' => '/brand'],
                    ['label' => '最新消息', 'href' => 'https://www.instagram.com/hover.tw?igsh=ODFwaXZmam5kOXJn'],
                ],
            ],
            [
                'title' => '顧客服務',
                'links' => [
                    ['label' => '會員制度', 'href' => '/membership'],
                    ['label' => '如何購買', 'href' => '/how-to-buy'],
                    ['label' => '申請退貨', 'href' => '/returns'],
                    ['label' => '常見問題', 'href' => '/faq'],
                ],
            ],
            [
                'title' => '政策條款',
                'links' => [
                    ['label' => '政策與條款', 'href' => '/terms'],
                    ['label' => '隱私權保護', 'href' => '/privacy'],
                ],
            ],
        ],
        'contact' => [
            'title'       => '聯絡我們',
            'email'       => 'service@hoverofficial.com',
            'emailLabel'  => 'SERVICE@HOVEROFFICIAL.COM',
            'hours'       => 'MON.-FRI. 10:00-19:00',
            'lineId'      => '@HOVER',
            'lineUrl'     => 'https://line.me/R/ti/p/@330kefmm',
            'companyInfo' => '威爾特國際文創股份有限公司 | 90230279',
        ],
        'social' => [
            ['label' => 'LINE', 'href' => 'https://line.me/R/ti/p/@330kefmm', 'icon' => 'line', 'iconUrl' => ''],
            ['label' => 'Instagram', 'href' => 'https://www.instagram.com/hover.tw?igsh=ODFwaXZmam5kOXJn', 'icon' => 'ig', 'iconUrl' => ''],
            ['label' => 'Facebook', 'href' => 'https://www.facebook.com/share/1EhyidjLHK/?mibextid=wwXIfr', 'icon' => 'fb', 'iconUrl' => ''],
            ['label' => 'YouTube', 'href' => '#', 'icon' => 'yt', 'iconUrl' => ''],
        ],
        'mobileSocialTitle' => '追蹤我們',
        'copyright' => '© 2026 HOVER. All Rights Reserved. 威爾特國際文創股份有限公司 | 90230279',
    ];
}

function hfs_get_settings(): array
{
    $saved = get_option(HFS_OPTION, []);
    if (!is_array($saved)) {
        $saved = [];
    }
    return hfs_normalize(array_replace_recursive(hfs_defaults(), $saved));
}

function hfs_sanitize_url(string $url): string
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

function hfs_normalize(array $data): array
{
    $d = hfs_defaults();

    $data['logo']['url']      = esc_url_raw($data['logo']['url'] ?? '');
    $data['logo']['alt']      = sanitize_text_field($data['logo']['alt'] ?? $d['logo']['alt']);
    $data['logo']['link']     = hfs_sanitize_url($data['logo']['link'] ?? $d['logo']['link']);
    $data['logo']['color']    = sanitize_hex_color($data['logo']['color'] ?? $d['logo']['color']) ?: $d['logo']['color'];
    $data['logo']['mimeType'] = sanitize_text_field($data['logo']['mimeType'] ?? $d['logo']['mimeType']);
    if ($data['logo']['mimeType'] === '' && preg_match('/\.svg(\?|#|$)/i', $data['logo']['url'])) {
        $data['logo']['mimeType'] = 'image/svg+xml';
    }

    $data['backgroundColor'] = sanitize_hex_color($data['backgroundColor'] ?? $d['backgroundColor']) ?: $d['backgroundColor'];

    $columns = [];
    foreach (($data['columns'] ?? []) as $col) {
        $title = sanitize_text_field($col['title'] ?? '');
        if ($title === '') {
            continue;
        }
        $links = [];
        foreach (($col['links'] ?? []) as $link) {
            $label = sanitize_text_field($link['label'] ?? '');
            $href  = hfs_sanitize_url($link['href'] ?? '');
            if ($label !== '' && $href !== '') {
                $links[] = ['label' => $label, 'href' => $href];
            }
        }
        $columns[] = ['title' => $title, 'links' => $links];
    }
    $data['columns'] = !empty($columns) ? $columns : $d['columns'];

    $contact = $data['contact'] ?? [];
    $data['contact'] = [
        'title'      => sanitize_text_field($contact['title'] ?? $d['contact']['title']),
        'email'      => sanitize_email($contact['email'] ?? $d['contact']['email']),
        'emailLabel' => sanitize_text_field($contact['emailLabel'] ?? $d['contact']['emailLabel']),
        'hours'      => sanitize_text_field($contact['hours'] ?? $d['contact']['hours']),
        'lineId'     => sanitize_text_field($contact['lineId'] ?? $d['contact']['lineId']),
        'lineUrl'    => hfs_sanitize_url($contact['lineUrl'] ?? $d['contact']['lineUrl']),
        'companyInfo'=> sanitize_text_field($contact['companyInfo'] ?? $d['contact']['companyInfo']),
    ];

    $icons = ['line', 'ig', 'fb', 'yt', 'custom'];
    $social = [];
    foreach (($data['social'] ?? []) as $item) {
        $label = sanitize_text_field($item['label'] ?? '');
        if ($label === '') {
            continue;
        }
        $icon = sanitize_text_field($item['icon'] ?? 'line');
        if (!in_array($icon, $icons, true)) {
            $icon = 'custom';
        }
        $social[] = [
            'label'   => $label,
            'href'    => hfs_sanitize_url($item['href'] ?? '#'),
            'icon'    => $icon,
            'iconUrl' => esc_url_raw($item['iconUrl'] ?? ''),
        ];
    }
    $data['social'] = !empty($social) ? $social : $d['social'];

    $data['mobileSocialTitle'] = sanitize_text_field($data['mobileSocialTitle'] ?? $d['mobileSocialTitle']);
    $data['copyright'] = sanitize_textarea_field($data['copyright'] ?? $d['copyright']);

    return $data;
}

function hfs_save_from_post(): ?array
{
    if ($_SERVER['REQUEST_METHOD'] !== 'POST' || empty($_POST['hfs_act'])) {
        return null;
    }
    if (!wp_verify_nonce($_POST['hfs_nonce'] ?? '', 'hfs_save')) {
        return ['ok' => false, 'msg' => '安全驗證失敗，請重新整理後再試。'];
    }
    if (!current_user_can('manage_options')) {
        return ['ok' => false, 'msg' => '權限不足。'];
    }

    $act = sanitize_text_field($_POST['hfs_act']);
    if ($act === 'reset') {
        delete_option(HFS_OPTION);
        return ['ok' => true, 'msg' => '已還原為預設頁尾內容。'];
    }

    if ($act !== 'save') {
        return null;
    }

    $raw = json_decode(wp_unslash($_POST['hfs_payload'] ?? ''), true);
    if (!is_array($raw)) {
        return ['ok' => false, 'msg' => '資料格式錯誤。'];
    }

    $normalized = hfs_normalize($raw);
    update_option(HFS_OPTION, $normalized, false);

    return ['ok' => true, 'msg' => '頁尾設定已儲存。'];
}

function hfs_rest_footer(): WP_REST_Response
{
    return new WP_REST_Response([
        'ok'     => true,
        'footer' => hfs_get_settings(),
    ], 200);
}

function hfs_icon_options(): array
{
    return [
        'line'   => 'LINE（內建）',
        'ig'     => 'Instagram（內建）',
        'fb'     => 'Facebook（內建）',
        'yt'     => 'YouTube（內建）',
        'custom' => '自訂圖片',
    ];
}

function hfs_render_page(): void
{
    if (!current_user_can('manage_options')) {
        wp_die('權限不足');
    }

    $flash = hfs_save_from_post();
    $s = hfs_get_settings();
    $payload = wp_json_encode($s, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    $api_url = rest_url('hover/v1/footer');
    $site_url = home_url('/');
    ?>
    <div class="wrap hover-footer-admin">
        <div class="hfs-shell">
            <div class="hfs-topbar">
                <div>
                    <h1>HOVER 頁尾設定</h1>
                    <p class="description">管理前台 Footer：Logo、導覽連結、聯絡資訊、社群圖標與版權文字。儲存後約 1 分鐘內同步至 Next.js 前台。</p>
                </div>
                <div class="hfs-topbar-actions">
                    <a class="button" href="<?php echo esc_url($site_url); ?>" target="_blank" rel="noopener">預覽網站</a>
                    <button type="submit" form="hfs-form" class="button button-primary button-hero">儲存設定</button>
                </div>
            </div>

            <?php if ($flash) : ?>
                <div class="notice <?php echo $flash['ok'] ? 'notice-success' : 'notice-error'; ?> is-dismissible">
                    <p><?php echo esc_html($flash['msg']); ?></p>
                </div>
            <?php endif; ?>

            <div class="hfs-api-pill">
                <span class="dashicons dashicons-rest-api"></span>
                <span>REST API</span>
                <code><?php echo esc_html($api_url); ?></code>
            </div>

            <form id="hfs-form" method="post">
                <?php wp_nonce_field('hfs_save', 'hfs_nonce'); ?>
                <input type="hidden" name="hfs_act" value="save">
                <input type="hidden" name="hfs_payload" id="hfs-payload" value="">

                <nav class="hfs-tabs" aria-label="頁尾設定分頁">
                    <button type="button" class="hfs-tab is-active" data-tab="brand">品牌 Logo</button>
                    <button type="button" class="hfs-tab" data-tab="nav">導覽欄位</button>
                    <button type="button" class="hfs-tab" data-tab="contact">聯絡資訊</button>
                    <button type="button" class="hfs-tab" data-tab="social">社群圖標</button>
                    <button type="button" class="hfs-tab" data-tab="legal">版權文字</button>
                </nav>

                <div class="hfs-layout">
                    <div class="hfs-main">
                        <section class="hfs-panel is-active" id="hfs-tab-brand">
                            <div class="hfs-card">
                                <div class="hfs-card-head"><h2>品牌 Logo</h2></div>
                                <div class="hfs-card-body">
                                    <div class="hfs-logo-section">
                                        <div class="hfs-logo-preview-wrap">
                                            <label class="hfs-label">Logo 圖片</label>
                                            <div class="hfs-logo-preview" id="hfs-logo-preview" data-logo-preview></div>
                                            <input type="hidden" data-field="logo.url" value="<?php echo esc_attr($s['logo']['url']); ?>">
                                            <input type="hidden" data-field="logo.mimeType" value="<?php echo esc_attr($s['logo']['mimeType'] ?? ''); ?>">
                                            <div class="hfs-actions">
                                                <button type="button" class="button button-primary hfs-pick-media" data-target="logo.url" data-preview="hfs-logo-preview">選擇圖片</button>
                                                <button type="button" class="button hfs-clear-media" data-target="logo.url" data-preview="hfs-logo-preview">清除</button>
                                            </div>
                                            <p class="description" style="margin:0">支援 PNG、JPG、WebP、<strong>SVG</strong>。SVG 可搭配下方「Logo 顏色」著色。</p>
                                        </div>

                                        <div class="hfs-logo-meta">
                                            <div class="hfs-grid-2">
                                                <div class="hfs-field">
                                                    <label class="hfs-label">Logo 替代文字</label>
                                                    <input type="text" class="regular-text" data-field="logo.alt" value="<?php echo esc_attr($s['logo']['alt']); ?>">
                                                </div>
                                                <div class="hfs-field">
                                                    <label class="hfs-label">Logo 連結</label>
                                                    <input type="text" class="regular-text" data-field="logo.link" value="<?php echo esc_attr($s['logo']['link']); ?>" placeholder="/">
                                                </div>
                                                <div class="hfs-field">
                                                    <label class="hfs-label">Logo 顏色</label>
                                                    <input type="color" data-field="logo.color" value="<?php echo esc_attr($s['logo']['color']); ?>">
                                                    <span class="description">SVG 或預設字樣有效；PNG/JPG 維持原圖色彩</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div class="hfs-logo-color">
                                            <div class="hfs-field">
                                                <label class="hfs-label">背景色</label>
                                                <input type="color" data-field="backgroundColor" value="<?php echo esc_attr($s['backgroundColor']); ?>">
                                                <span class="description">對應前台 Footer 背景</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </section>

                        <section class="hfs-panel" id="hfs-tab-nav">
                            <div class="hfs-card">
                                <div class="hfs-card-head">
                                    <h2>導覽欄位</h2>
                                    <button type="button" class="button" id="hfs-add-column">
                                        <span class="dashicons dashicons-plus-alt2"></span> 新增欄位
                                    </button>
                                </div>
                                <div class="hfs-card-body">
                                    <div id="hfs-columns" class="hfs-stack"></div>
                                </div>
                            </div>
                        </section>

                        <section class="hfs-panel" id="hfs-tab-contact">
                            <div class="hfs-card">
                                <div class="hfs-card-head"><h2>聯絡我們</h2></div>
                                <div class="hfs-card-body hfs-grid-2">
                                    <div class="hfs-field"><label class="hfs-label">區塊標題</label><input type="text" class="regular-text" data-field="contact.title" value="<?php echo esc_attr($s['contact']['title']); ?>"></div>
                                    <div class="hfs-field"><label class="hfs-label">Email（mailto 用）</label><input type="email" class="regular-text" data-field="contact.email" value="<?php echo esc_attr($s['contact']['email']); ?>"></div>
                                    <div class="hfs-field"><label class="hfs-label">Email 顯示文字</label><input type="text" class="regular-text" data-field="contact.emailLabel" value="<?php echo esc_attr($s['contact']['emailLabel']); ?>"></div>
                                    <div class="hfs-field"><label class="hfs-label">營業時間</label><input type="text" class="regular-text" data-field="contact.hours" value="<?php echo esc_attr($s['contact']['hours']); ?>"></div>
                                    <div class="hfs-field"><label class="hfs-label">LINE ID 顯示</label><input type="text" class="regular-text" data-field="contact.lineId" value="<?php echo esc_attr($s['contact']['lineId']); ?>"></div>
                                    <div class="hfs-field"><label class="hfs-label">LINE 連結</label><input type="url" class="regular-text" data-field="contact.lineUrl" value="<?php echo esc_attr($s['contact']['lineUrl']); ?>"></div>
                                    <div class="hfs-field hfs-span-2"><label class="hfs-label">公司名稱與統編（顯示於聯絡我們）</label><input type="text" class="regular-text" data-field="contact.companyInfo" value="<?php echo esc_attr($s['contact']['companyInfo']); ?>"></div>
                                </div>
                            </div>
                        </section>

                        <section class="hfs-panel" id="hfs-tab-social">
                            <div class="hfs-card">
                                <div class="hfs-card-head">
                                    <h2>社群圖標</h2>
                                    <button type="button" class="button" id="hfs-add-social">
                                        <span class="dashicons dashicons-plus-alt2"></span> 新增圖標
                                    </button>
                                </div>
                                <div class="hfs-card-body">
                                    <div class="hfs-field hfs-mb">
                                        <label class="hfs-label">手機版社群圖標位置</label>
                                        <p class="description">圖標顯示於「聯絡我們」手風琴下方（不再使用獨立「追蹤我們」區塊）</p>
                                    </div>
                                    <div id="hfs-social" class="hfs-stack"></div>
                                </div>
                            </div>
                        </section>

                        <section class="hfs-panel" id="hfs-tab-legal">
                            <div class="hfs-card">
                                <div class="hfs-card-head"><h2>版權文字</h2></div>
                                <div class="hfs-card-body">
                                    <div class="hfs-field">
                                        <label class="hfs-label">底部版權列</label>
                                        <textarea rows="3" class="large-text" data-field="copyright"><?php echo esc_textarea($s['copyright']); ?></textarea>
                                    </div>
                                </div>
                            </div>
                        </section>
                    </div>

                    <aside class="hfs-preview">
                        <div class="hfs-card hfs-preview-card">
                            <div class="hfs-card-head">
                                <div>
                                    <h2>手機版預覽</h2>
                                    <p class="description" style="margin:4px 0 0">模擬前台 Footer 手風琴</p>
                                </div>
                            </div>
                            <div class="hfs-card-body hfs-preview-body">
                                <div id="hfs-live-preview"></div>
                            </div>
                        </div>
                    </aside>
                </div>

                <div class="hfs-foot">
                    <?php submit_button('儲存設定', 'primary large', 'submit', false); ?>
                </div>
            </form>

            <form method="post" class="hfs-reset-form" onsubmit="return confirm('確定還原為預設內容？');">
                <?php wp_nonce_field('hfs_save', 'hfs_nonce'); ?>
                <input type="hidden" name="hfs_act" value="reset">
                <button type="submit" class="button-link-delete">還原預設</button>
            </form>
        </div>
    </div>

    <script>
        window.HFS_DATA = <?php echo $payload ?: '{}'; ?>;
        window.HFS_ICONS = <?php echo wp_json_encode(hfs_icon_options(), JSON_UNESCAPED_UNICODE); ?>;
    </script>
    <?php
    hfs_print_admin_styles();
}

function hfs_print_admin_styles(): void
{
    ?>
    <style>
        .hover-footer-admin { max-width: 1180px; }
        .hover-footer-admin .hfs-shell { margin-top: 8px; }
        .hover-footer-admin .hfs-topbar {
            display: flex; align-items: flex-start; justify-content: space-between;
            gap: 16px; margin-bottom: 16px;
        }
        .hover-footer-admin .hfs-topbar h1 { margin: 0 0 6px; }
        .hover-footer-admin .hfs-topbar-actions {
            display: flex; gap: 8px; flex-shrink: 0; align-items: center;
        }
        .hover-footer-admin .hfs-api-pill {
            display: inline-flex; align-items: center; gap: 8px;
            background: #fff; border: 1px solid #dcdcde; border-radius: 999px;
            padding: 8px 14px; margin-bottom: 16px; font-size: 12px; color: #646970;
        }
        .hover-footer-admin .hfs-api-pill code {
            font-size: 11px; background: #f6f7f7; padding: 2px 8px; border-radius: 999px;
        }
        .hover-footer-admin .hfs-tabs {
            display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 16px;
        }
        .hover-footer-admin .hfs-tab {
            border: 1px solid #dcdcde; background: #fff; border-radius: 999px;
            padding: 8px 14px; font-size: 13px; font-weight: 600; color: #50575e;
            cursor: pointer; transition: .15s;
        }
        .hover-footer-admin .hfs-tab:hover { border-color: #2a514d; color: #2a514d; }
        .hover-footer-admin .hfs-tab.is-active {
            background: #2a514d; border-color: #2a514d; color: #fff;
            box-shadow: 0 4px 14px rgba(42,81,77,.18);
        }
        .hover-footer-admin .hfs-layout {
            display: grid; grid-template-columns: minmax(0, 1fr) 320px; gap: 16px; align-items: start;
        }
        .hover-footer-admin .hfs-panel { display: none; }
        .hover-footer-admin .hfs-panel.is-active { display: block; }
        .hover-footer-admin .hfs-card {
            background: #fff; border: 1px solid #dcdcde; border-radius: 8px;
            box-shadow: 0 1px 2px rgba(0,0,0,.04); overflow: hidden;
        }
        .hover-footer-admin .hfs-card-head {
            display: flex; align-items: center; justify-content: space-between; gap: 10px;
            padding: 14px 18px; border-bottom: 1px solid #f0f0f1;
        }
        .hover-footer-admin .hfs-card-head h2 { margin: 0; font-size: 14px; font-weight: 700; }
        .hover-footer-admin .hfs-card-body { padding: 18px; }
        .hover-footer-admin .hfs-grid-2 {
            display: grid; grid-template-columns: 1fr 1fr; gap: 14px 16px;
        }
        .hover-footer-admin .hfs-field { display: flex; flex-direction: column; gap: 6px; }
        .hover-footer-admin .hfs-label { font-weight: 600; font-size: 13px; }
        .hover-footer-admin .hfs-stack { display: flex; flex-direction: column; gap: 12px; }
        .hover-footer-admin .hfs-block {
            border: 1px solid #dcdcde; border-radius: 8px; padding: 14px; background: #fcfcfd;
        }
        .hover-footer-admin .hfs-block-head {
            display: flex; align-items: center; justify-content: space-between;
            gap: 8px; margin-bottom: 12px;
        }
        .hover-footer-admin .hfs-block-head input { font-weight: 700; }
        .hover-footer-admin .hfs-link-row {
            display: grid; grid-template-columns: 1fr 1fr auto; gap: 8px;
            margin-bottom: 8px; align-items: end;
        }
        .hover-footer-admin .hfs-social-card {
            display: grid; grid-template-columns: 52px 1fr 1fr 130px auto auto;
            gap: 10px; align-items: end;
        }
        .hover-footer-admin .hfs-icon-preview {
            width: 44px; height: 44px; border-radius: 8px; background: #f0f0f1;
            display: flex; align-items: center; justify-content: center; overflow: hidden;
            font-size: 10px; font-weight: 700; color: #646970;
        }
        .hover-footer-admin .hfs-icon-preview img { width: 100%; height: 100%; object-fit: contain; }
        .hover-footer-admin .hfs-logo-section {
            display: flex; flex-direction: column; gap: 24px;
        }
        .hover-footer-admin .hfs-logo-preview-wrap {
            display: flex; flex-direction: column; gap: 12px;
        }
        .hover-footer-admin .hfs-logo-meta,
        .hover-footer-admin .hfs-logo-color {
            padding-top: 20px; border-top: 1px solid #eef2f6;
        }
        .hover-footer-admin .hfs-logo-preview,
        .hover-footer-admin .hfs-logo-placeholder {
            width: 100%; max-width: 220px; height: 120px; border: 1px dashed #c3c4c7; border-radius: 8px;
            background: #f6f7f7; display: flex; flex-direction: column;
            align-items: center; justify-content: center; text-align: center;
            padding: 12px; color: #646970; font-size: 12px; gap: 6px;
        }
        .hover-footer-admin .hfs-logo-preview img { max-width: 100%; max-height: 100%; object-fit: contain; }
        .hover-footer-admin .hfs-logo-svg-inline {
            width: 100%; max-width: 200px; height: 72px; margin: 0 auto;
            display: flex; align-items: center; justify-content: center;
        }
        .hover-footer-admin .hfs-logo-svg-inline svg {
            width: 100%; height: 100%; max-height: 72px; display: block;
        }
        .hover-footer-admin .hfs-phone-logo .hfs-logo-svg-inline {
            max-width: 180px; height: 52px;
        }
        .hover-footer-admin .hfs-phone-logo .hfs-logo-svg-inline svg {
            max-height: 52px;
        }
        .hover-footer-admin .hfs-phone-logo img {
            max-height: 52px; max-width: 180px; width: auto; height: auto; object-fit: contain;
        }
        .hover-footer-admin .hfs-logo-placeholder .dashicons {
            font-size: 28px; width: 28px; height: 28px; color: #a7aaad;
        }
        .hover-footer-admin .hfs-actions,
        .hover-footer-admin .hfs-foot { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 4px; }
        .hover-footer-admin .hfs-reset-form { margin-top: 8px; }
        .hover-footer-admin .hfs-preview { position: sticky; top: 32px; }
        .hover-footer-admin .hfs-preview-body { padding: 12px; background: #f6f7f7; }
        .hover-footer-admin .hfs-phone {
            border-radius: 12px; overflow: hidden; color: #fff;
            font-size: 12px; line-height: 1.5;
        }
        .hover-footer-admin .hfs-acc { border-bottom: 1px solid rgba(255,255,255,.22); }
        .hover-footer-admin .hfs-acc-btn {
            width: 100%; display: flex; align-items: center; justify-content: space-between;
            gap: 12px; padding: 14px 16px; background: transparent; border: 0; color: #fff;
            font-size: 13px; letter-spacing: .12em; cursor: pointer; text-align: left;
        }
        .hover-footer-admin .hfs-acc-icon {
            font-size: 18px; font-weight: 300; line-height: 1; opacity: .95;
        }
        .hover-footer-admin .hfs-acc-panel {
            max-height: 0; overflow: hidden; opacity: 0;
            transition: max-height .28s ease, opacity .22s ease, padding .22s ease;
            padding: 0 16px;
        }
        .hover-footer-admin .hfs-acc.is-open .hfs-acc-panel {
            max-height: 240px; opacity: 1; padding: 0 16px 14px;
        }
        .hover-footer-admin .hfs-acc-panel ul {
            margin: 0; padding: 0; list-style: none;
        }
        .hover-footer-admin .hfs-acc-panel li {
            padding: 4px 0; font-size: 12px; letter-spacing: .06em; color: rgba(255,255,255,.9);
        }
        .hover-footer-admin .hfs-acc-socials {
            display: flex; gap: 8px; flex-wrap: wrap; padding-top: 2px;
        }
        .hover-footer-admin .hfs-acc-socials span {
            display: inline-flex; width: 28px; height: 28px; border-radius: 6px;
            background: rgba(255,255,255,.12); align-items: center; justify-content: center;
            font-size: 9px; font-weight: 700;
        }
        .hover-footer-admin .hfs-phone-logo {
            display: flex; justify-content: center; padding: 28px 16px 20px;
        }
        .hover-footer-admin .hfs-phone-logo-text {
            font-family: Georgia, "Times New Roman", serif; font-size: 28px;
            letter-spacing: .06em; font-weight: 700;
        }
        .hover-footer-admin .hfs-phone-copy {
            border-top: 1px solid rgba(255,255,255,.2); padding: 14px 16px 16px;
            text-align: center; font-size: 10px; line-height: 1.6;
            color: rgba(255,255,255,.72); letter-spacing: .04em;
        }
        .hover-footer-admin .hfs-mt { margin-top: 16px; }
        .hover-footer-admin .hfs-mb { margin-bottom: 14px; }
        @media (max-width: 960px) {
            .hover-footer-admin .hfs-layout { grid-template-columns: 1fr; }
            .hover-footer-admin .hfs-preview { position: static; }
            .hover-footer-admin .hfs-grid-2,
            .hover-footer-admin .hfs-link-row,
            .hover-footer-admin .hfs-social-card { grid-template-columns: 1fr; }
        }
    </style>
    <?php
}

function hfs_admin_footer_script(): void
{
    $screen = function_exists('get_current_screen') ? get_current_screen() : null;
    if (!$screen || $screen->id !== 'toplevel_page_hfs') {
        return;
    }
    ?>
    <script>
    jQuery(function($){
        var state = window.HFS_DATA || {};
        var icons = window.HFS_ICONS || {};

        function esc(s){ return $('<div/>').text(s || '').html(); }

        function isSvgAsset(url, mime){
            if (mime === 'image/svg+xml') return true;
            return /\.svg(\?|#|$)/i.test(url || '');
        }

        function colorizeSvgMarkup(svg, color){
            if (!svg || !/<svg[\s>]/i.test(svg)) return svg || '';
            var out = svg.replace(/<\?xml[^?]*\?>\s*/i, '');
            out = out.replace(/<style([^>]*)>([\s\S]*?)<\/style>/gi, function(_, attrs, css){
                var nextCss = css
                    .replace(/\bfill\s*:\s*(?!none|transparent)[^;"'}\n]+/gi, 'fill:'+color)
                    .replace(/\bstroke\s*:\s*(?!none|transparent)[^;"'}\n]+/gi, 'stroke:'+color);
                return '<style'+attrs+'>'+nextCss+'</style>';
            });
            out = out.replace(/\bfill\s*=\s*"(?!none|transparent)[^"]*"/gi, 'fill="'+color+'"');
            out = out.replace(/\bfill\s*=\s*'(?!none|transparent)[^']*'/gi, "fill='"+color+"'");
            out = out.replace(/\bstroke\s*=\s*"(?!none|transparent)[^"]*"/gi, 'stroke="'+color+'"');
            out = out.replace(/\bstroke\s*=\s*'(?!none|transparent)[^']*'/gi, "stroke='"+color+"'");
            out = out.replace(/\bfill\s*:\s*(?!none|transparent)[^;"'}]+/gi, 'fill:'+color);
            out = out.replace(/\bstroke\s*:\s*(?!none|transparent)[^;"'}]+/gi, 'stroke:'+color);
            out = out.replace(/currentColor/gi, color);
            out = out.replace(/<svg([^>]*?)>/i, function(_, attrs){
                var style = 'width:100%;height:100%;display:block;';
                if (/style="/i.test(attrs)) {
                    return '<svg'+attrs.replace(/style="/i, 'style="'+style)+'>';
                }
                if (!/\bfill=/i.test(attrs)) {
                    return '<svg'+attrs+' fill="'+color+'" style="'+style+'">';
                }
                return '<svg'+attrs+' style="'+style+'">';
            });
            return out;
        }

        var svgCache = {};

        function logoMarkup(url, alt, color, mime){
            if (!url) return logoPlaceholderHtml();
            if (isSvgAsset(url, mime)) {
                return '<div class="hfs-logo-svg-inline" data-svg-url="'+esc(url)+'" data-svg-color="'+esc(color || '#ffffff')+'"></div>';
            }
            return '<img src="'+esc(url)+'" alt="'+esc(alt)+'">';
        }

        function hydrateSvgPreviews(scope){
            var $root = scope ? $(scope) : $(document);
            $root.find('.hfs-logo-svg-inline').each(function(){
                var $el = $(this);
                if ($el.data('loaded')) return;
                var url = $el.attr('data-svg-url');
                var color = $el.attr('data-svg-color') || '#ffffff';
                if (!url) return;
                var cacheKey = url + '|' + color;
                if (svgCache[cacheKey]) {
                    $el.html(svgCache[cacheKey]).data('loaded', true);
                    return;
                }
                fetch(url)
                    .then(function(res){ return res.text(); })
                    .then(function(svg){
                        var html = colorizeSvgMarkup(svg, color);
                        svgCache[cacheKey] = html;
                        $el.html(html).data('loaded', true);
                    })
                    .catch(function(){
                        $el.replaceWith('<img src="'+esc(url)+'" alt="">');
                    });
            });
        }

        function logoPlaceholderHtml(){
            return '<div class="hfs-logo-placeholder">'+
                '<span class="dashicons dashicons-format-image"></span>'+
                '<span>尚未上傳 Logo</span>'+
                '<small>留空則前台使用預設 HOVER 字樣</small>'+
            '</div>';
        }

        function updateLogoPreview(){
            var url = (state.logo && state.logo.url) || $('[data-field="logo.url"]').val() || '';
            var color = (state.logo && state.logo.color) || $('[data-field="logo.color"]').val() || '#ffffff';
            var alt = (state.logo && state.logo.alt) || $('[data-field="logo.alt"]').val() || 'HOVER';
            var mime = (state.logo && state.logo.mimeType) || $('[data-field="logo.mimeType"]').val() || '';
            $('#hfs-logo-preview').html(logoMarkup(url, alt, color, mime));
            hydrateSvgPreviews('#hfs-logo-preview');
        }

        function readFields(){
            $('[data-field]').each(function(){
                var path = $(this).data('field').split('.');
                var val = $(this).val();
                if (path.length === 2) state[path[0]][path[1]] = val;
                else state[path[0]] = val;
            });
        }

        function renderColumns(){
            var $wrap = $('#hfs-columns').empty();
            (state.columns || []).forEach(function(col){
                var $block = $('<div class="hfs-block"></div>');
                var $head = $('<div class="hfs-block-head"></div>');
                $head.append('<input type="text" class="regular-text col-title" placeholder="欄位標題" value="'+esc(col.title)+'">');
                $head.append('<button type="button" class="button-link-delete del-col">刪除欄位</button>');
                $block.append($head);
                var $links = $('<div class="col-links"></div>');
                (col.links || []).forEach(function(link){
                    $links.append(
                        '<div class="hfs-link-row">'+
                            '<input type="text" class="regular-text link-label" placeholder="連結文字" value="'+esc(link.label)+'">'+
                            '<input type="text" class="regular-text link-href" placeholder="網址或 /path" value="'+esc(link.href)+'">'+
                            '<button type="button" class="button-link del-link">刪</button>'+
                        '</div>'
                    );
                });
                $block.append($links);
                $block.append('<button type="button" class="button add-link"><span class="dashicons dashicons-plus-alt2"></span> 新增連結</button>');
                $wrap.append($block);
            });
        }

        function renderSocial(){
            var $wrap = $('#hfs-social').empty();
            (state.social || []).forEach(function(item){
                var opts = Object.keys(icons).map(function(k){
                    return '<option value="'+k+'"'+(item.icon===k?' selected':'')+'>'+esc(icons[k])+'</option>';
                }).join('');
                var preview = item.iconUrl ? '<img src="'+esc(item.iconUrl)+'" alt="">' : esc((item.icon||'').toUpperCase());
                $wrap.append(
                    '<div class="hfs-block hfs-social-item">'+
                        '<div class="hfs-social-card">'+
                            '<div class="hfs-icon-preview social-preview">'+preview+'</div>'+
                            '<input type="text" class="regular-text social-label" placeholder="名稱" value="'+esc(item.label)+'">'+
                            '<input type="text" class="regular-text social-href" placeholder="連結" value="'+esc(item.href)+'">'+
                            '<select class="social-icon">'+opts+'</select>'+
                            '<button type="button" class="button pick-social">選圖</button>'+
                            '<button type="button" class="button-link-delete del-social">刪</button>'+
                        '</div>'+
                        '<input type="hidden" class="social-icon-url" value="'+esc(item.iconUrl||'')+'">'+
                    '</div>'
                );
            });
        }

        function syncFromDom(){
            readFields();
            state.columns = [];
            $('#hfs-columns .hfs-block').each(function(){
                var title = $(this).find('.col-title').val().trim();
                var links = [];
                $(this).find('.hfs-link-row').each(function(){
                    var label = $(this).find('.link-label').val().trim();
                    var href = $(this).find('.link-href').val().trim();
                    if (label && href) links.push({label:label,href:href});
                });
                if (title) state.columns.push({title:title, links:links});
            });
            state.social = [];
            $('#hfs-social .hfs-social-item').each(function(){
                state.social.push({
                    label: $(this).find('.social-label').val().trim(),
                    href: $(this).find('.social-href').val().trim(),
                    icon: $(this).find('.social-icon').val(),
                    iconUrl: $(this).find('.social-icon-url').val().trim()
                });
            });
        }

        var previewOpen = {};

        function accHtml(title, bodyHtml, key){
            var open = previewOpen[key] ? ' is-open' : '';
            var icon = previewOpen[key] ? '−' : '+';
            return '<div class="hfs-acc'+open+'" data-acc="'+esc(key)+'">'+
                '<button type="button" class="hfs-acc-btn">'+
                    '<span>'+esc(title)+'</span><span class="hfs-acc-icon">'+icon+'</span>'+
                '</button>'+
                '<div class="hfs-acc-panel">'+bodyHtml+'</div>'+
            '</div>';
        }

        function renderPreview(){
            syncFromDom();
            var bg = esc(state.backgroundColor || '#2a514d');
            var html = '<div class="hfs-phone" style="background:'+bg+'">';

            (state.columns||[]).forEach(function(col, i){
                var links = (col.links||[]).map(function(l){
                    return '<li>'+esc(l.label)+'</li>';
                }).join('');
                html += accHtml(col.title, '<ul>'+links+'</ul>', 'col-'+i);
            });

            var socialHtml = '<div class="hfs-acc-socials">';
            (state.social||[]).forEach(function(s){
                socialHtml += '<span>'+esc((s.label||'').slice(0,2))+'</span>';
            });
            socialHtml += '</div>';

            var contact = state.contact || {};
            var contactHtml = '<ul>'+
                (contact.emailLabel ? '<li>'+esc(contact.emailLabel)+'</li>' : '')+
                (contact.hours ? '<li>'+esc(contact.hours)+'</li>' : '')+
                (contact.lineId ? '<li>LINE ID: '+esc(contact.lineId)+'</li>' : '')+
                (contact.companyInfo ? '<li>'+esc(contact.companyInfo)+'</li>' : '')+
            '</ul>';
            html += accHtml(contact.title || '聯絡我們', contactHtml, 'contact');

            html += socialHtml;

            html += '<div class="hfs-phone-logo">';
            if (state.logo && state.logo.url) {
                html += logoMarkup(
                    state.logo.url,
                    state.logo.alt || 'HOVER',
                    state.logo.color || '#ffffff',
                    state.logo.mimeType || ''
                );
            } else {
                html += '<span class="hfs-phone-logo-text" style="color:'+esc(state.logo.color || '#ffffff')+'">HOVER</span>';
            }
            html += '</div>';
            html += '<div class="hfs-phone-copy">'+esc(state.copyright)+'</div>';
            html += '</div>';
            $('#hfs-live-preview').html(html);
            hydrateSvgPreviews('#hfs-live-preview');
        }

        $(document).on('click','#hfs-live-preview .hfs-acc-btn', function(){
            var $acc = $(this).closest('.hfs-acc');
            var key = $acc.data('acc');
            previewOpen[key] = !$acc.hasClass('is-open');
            renderPreview();
        });

        $(document).on('click','.hfs-tab',function(){
            $('.hfs-tab').removeClass('is-active');
            $(this).addClass('is-active');
            var tab = $(this).data('tab');
            $('.hfs-panel').removeClass('is-active');
            $('#hfs-tab-'+tab).addClass('is-active');
        });

        $('#hfs-add-column').on('click', function(){
            syncFromDom();
            state.columns.push({title:'新欄位', links:[]});
            renderColumns(); renderPreview();
        });

        $('#hfs-add-social').on('click', function(){
            syncFromDom();
            state.social.push({label:'新社群', href:'#', icon:'line', iconUrl:''});
            renderSocial(); renderPreview();
        });

        $(document).on('click','.add-link',function(){
            $(this).before('<div class="hfs-link-row"><input type="text" class="regular-text link-label" placeholder="連結文字"><input type="text" class="regular-text link-href" placeholder="網址或 /path"><button type="button" class="button-link del-link">刪</button></div>');
            renderPreview();
        });

        $(document).on('click','.del-link',function(){ $(this).closest('.hfs-link-row').remove(); renderPreview(); });
        $(document).on('click','.del-col',function(){ $(this).closest('.hfs-block').remove(); renderPreview(); });
        $(document).on('click','.del-social',function(){ $(this).closest('.hfs-social-item').remove(); renderPreview(); });
        $(document).on('input change','input,select,textarea', function(){
            if ($(this).is('[data-field="logo.url"], [data-field="logo.color"], [data-field="logo.alt"]')) {
                updateLogoPreview();
            }
            renderPreview();
        });

        $(document).on('click','.hfs-pick-media',function(){
            if (typeof wp === 'undefined' || !wp.media) {
                alert('媒體庫尚未載入，請重新整理頁面後再試。');
                return;
            }
            var target = $(this).data('target');
            var frame = wp.media({
                title: '選擇 Logo（PNG / JPG / SVG）',
                button: { text: '使用這張圖' },
                multiple: false,
                library: { type: 'image' }
            });
            frame.on('select', function(){
                var attachment = frame.state().get('selection').first().toJSON();
                var url = attachment.url || '';
                var mime = attachment.mime || '';
                if (!state.logo) state.logo = {};
                state.logo.url = url;
                state.logo.mimeType = mime;
                $('[data-field="logo.url"]').val(url);
                $('[data-field="logo.mimeType"]').val(mime);
                updateLogoPreview();
                renderPreview();
            });
            frame.open();
        });

        $(document).on('click','.hfs-clear-media',function(){
            if (!state.logo) state.logo = {};
            state.logo.url = '';
            state.logo.mimeType = '';
            $('[data-field="logo.url"]').val('');
            $('[data-field="logo.mimeType"]').val('');
            updateLogoPreview();
            renderPreview();
        });

        $(document).on('click','.pick-social',function(){
            if (typeof wp === 'undefined' || !wp.media) {
                alert('媒體庫尚未載入，請重新整理頁面後再試。');
                return;
            }
            var $item = $(this).closest('.hfs-social-item');
            var frame = wp.media({title:'選擇社群圖標', button:{text:'使用'}, multiple:false, library:{type:'image'}});
            frame.on('select', function(){
                var url = frame.state().get('selection').first().toJSON().url;
                $item.find('.social-icon-url').val(url);
                $item.find('.social-icon').val('custom');
                $item.find('.social-preview').html('<img src="'+url+'" alt="">');
                renderPreview();
            });
            frame.open();
        });

        $('#hfs-form').on('submit', function(){
            syncFromDom();
            $('#hfs-payload').val(JSON.stringify(state));
        });

        if (!state.logo) state.logo = {};
        if (!state.logo.color) state.logo.color = '#ffffff';
        if (!state.logo.mimeType && state.logo.url && /\.svg(\?|#|$)/i.test(state.logo.url)) {
            state.logo.mimeType = 'image/svg+xml';
        }

        renderColumns();
        renderSocial();
        updateLogoPreview();
        renderPreview();
    });
    </script>
    <?php
}
