<?php
/**
 * HOVER — 頂部公告列（Announcement Ticker Studio）
 *
 * 使用方式（WordPress 後台）：
 * 1. 安裝並啟用插件「Code Snippets」
 * 2. Snippets → Add New → 貼上本檔內容
 * 3. Run snippet：Everywhere
 * 4. 左側選單會出現「HOVER 公告列」
 *
 * REST API（給 Next.js）：
 * GET /wp-json/hover/v1/announcement
 */

if (!defined('ABSPATH')) {
    exit;
}

if (defined('HAS_LOADED')) {
    return;
}
define('HAS_LOADED', true);

const HAS_OPTION = 'hover_announcement_v1';

add_action('admin_menu', function () {
    if (!current_user_can('manage_options')) {
        return;
    }
    add_menu_page(
        'HOVER 公告列',
        'HOVER 公告列',
        'manage_options',
        'has',
        'has_render_page',
        'dashicons-megaphone',
        56
    );
}, 99);

add_action('admin_footer', 'has_admin_footer_script');

add_action('rest_api_init', function () {
    register_rest_route('hover/v1', '/announcement', [
        'methods'             => 'GET',
        'callback'            => 'has_rest_announcement',
        'permission_callback' => '__return_true',
    ]);
});

function has_defaults(): array
{
    return [
        'enabled'         => true,
        'autoplayMs'      => 4000,
        'backgroundColor' => '#2a514d',
        'textColor'       => '#f0f0f0',
        'items'           => [
            [
                'id'      => 'ann-1',
                'text'    => '全館滿NT$2,000享免運!',
                'href'    => '/how-to-buy',
                'enabled' => true,
            ],
            [
                'id'      => 'ann-2',
                'text'    => '新會員註冊即享 NT$100 購物金',
                'href'    => '/membership',
                'enabled' => true,
            ],
        ],
    ];
}

function has_sanitize_url(string $url): string
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

function has_normalize(array $data): array
{
    $d = has_defaults();

    $data['enabled'] = !empty($data['enabled']);
    $data['autoplayMs'] = max(2000, min(15000, intval($data['autoplayMs'] ?? $d['autoplayMs']) ?: $d['autoplayMs']));
    $data['backgroundColor'] = sanitize_hex_color($data['backgroundColor'] ?? $d['backgroundColor']) ?: $d['backgroundColor'];
    $data['textColor'] = sanitize_hex_color($data['textColor'] ?? $d['textColor']) ?: $d['textColor'];

    $items = [];
    foreach (($data['items'] ?? []) as $index => $item) {
        if (!is_array($item)) {
            continue;
        }
        $text = sanitize_text_field($item['text'] ?? '');
        if ($text === '') {
            continue;
        }
        $items[] = [
            'id'      => sanitize_text_field($item['id'] ?? ('ann-' . ($index + 1))) ?: ('ann-' . ($index + 1)),
            'text'    => $text,
            'href'    => has_sanitize_url($item['href'] ?? ''),
            'enabled' => !isset($item['enabled']) || !empty($item['enabled']),
        ];
    }
    $data['items'] = !empty($items) ? $items : $d['items'];

    return $data;
}

function has_get_settings(): array
{
    $saved = get_option(HAS_OPTION, []);
    if (!is_array($saved)) {
        $saved = [];
    }
    return has_normalize(array_replace_recursive(has_defaults(), $saved));
}

function has_save_from_post(): ?array
{
    if ($_SERVER['REQUEST_METHOD'] !== 'POST' || empty($_POST['has_act'])) {
        return null;
    }
    if (!wp_verify_nonce($_POST['has_nonce'] ?? '', 'has_save')) {
        return ['ok' => false, 'msg' => '安全驗證失敗，請重新整理後再試。'];
    }
    if (!current_user_can('manage_options')) {
        return ['ok' => false, 'msg' => '權限不足。'];
    }

    $act = sanitize_text_field($_POST['has_act']);
    if ($act === 'reset') {
        delete_option(HAS_OPTION);
        return ['ok' => true, 'msg' => '已還原為預設公告列。'];
    }

    if ($act !== 'save') {
        return null;
    }

    $raw = json_decode(wp_unslash($_POST['has_payload'] ?? ''), true);
    if (!is_array($raw)) {
        return ['ok' => false, 'msg' => '資料格式錯誤。'];
    }

    update_option(HAS_OPTION, has_normalize($raw), false);
    return ['ok' => true, 'msg' => '公告列已儲存。'];
}

function has_rest_announcement(): WP_REST_Response
{
    return new WP_REST_Response([
        'ok'           => true,
        'announcement' => has_get_settings(),
    ], 200);
}

function has_active_items(array $s): array
{
    if (empty($s['enabled'])) {
        return [];
    }
    return array_values(array_filter($s['items'] ?? [], function ($item) {
        return !empty($item['enabled']) && !empty($item['text']);
    }));
}

function has_render_page(): void
{
    if (!current_user_can('manage_options')) {
        wp_die('權限不足');
    }

    $flash = has_save_from_post();
    $s = has_get_settings();
    $payload = wp_json_encode($s, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    $api_url = rest_url('hover/v1/announcement');
    $active_count = count(has_active_items($s));
    ?>
    <div class="wrap hover-ann-admin">
        <div class="has-shell">
            <div class="has-topbar">
                <div>
                    <h1>HOVER 頂部公告列</h1>
                    <p class="description">管理網站頂部綠色公告列，支援多則訊息向上輪播、文字與連結。儲存後約 1 分鐘內同步至 Next.js 前台。</p>
                </div>
                <div class="has-topbar-actions">
                    <span class="has-status <?php echo $active_count > 0 ? 'is-live' : ''; ?>">
                        <?php echo $active_count > 0 ? esc_html($active_count . ' 則上線中') : '已關閉'; ?>
                    </span>
                    <button type="submit" form="has-form" class="button button-primary button-hero">儲存設定</button>
                </div>
            </div>

            <?php if ($flash) : ?>
                <div class="notice <?php echo $flash['ok'] ? 'notice-success' : 'notice-error'; ?> is-dismissible">
                    <p><?php echo esc_html($flash['msg']); ?></p>
                </div>
            <?php endif; ?>

            <div class="has-api-pill">
                <span class="dashicons dashicons-rest-api"></span>
                <span>REST API</span>
                <code><?php echo esc_html($api_url); ?></code>
            </div>

            <form id="has-form" method="post">
                <?php wp_nonce_field('has_save', 'has_nonce'); ?>
                <input type="hidden" name="has_act" value="save">
                <input type="hidden" name="has_payload" id="has-payload" value="">

                <div class="has-layout">
                    <div class="has-main">
                        <div class="has-card">
                            <div class="has-card-head"><h2>公告開關與樣式</h2></div>
                            <div class="has-card-body has-grid-2">
                                <label class="has-switch has-span-2">
                                    <input type="checkbox" data-field="enabled" <?php checked(!empty($s['enabled'])); ?>>
                                    <span class="has-switch-ui"></span>
                                    <span class="has-switch-label">啟用頂部公告列輪播</span>
                                </label>
                                <div class="has-field">
                                    <label class="has-label">輪播間隔（毫秒）</label>
                                    <input type="number" min="2000" max="15000" step="500" class="small-text" data-field="autoplayMs" value="<?php echo esc_attr($s['autoplayMs']); ?>">
                                    <p class="description">建議 3000–6000</p>
                                </div>
                                <div class="has-field">
                                    <label class="has-label">背景色</label>
                                    <input type="text" class="has-color" data-field="backgroundColor" value="<?php echo esc_attr($s['backgroundColor']); ?>">
                                </div>
                                <div class="has-field">
                                    <label class="has-label">文字色</label>
                                    <input type="text" class="has-color" data-field="textColor" value="<?php echo esc_attr($s['textColor']); ?>">
                                </div>
                            </div>
                        </div>

                        <div class="has-card">
                            <div class="has-card-head">
                                <h2>公告項目</h2>
                                <button type="button" class="button" id="has-add-item">
                                    <span class="dashicons dashicons-plus-alt2"></span> 新增公告
                                </button>
                            </div>
                            <div class="has-card-body">
                                <div id="has-items" class="has-stack"></div>
                            </div>
                        </div>
                    </div>

                    <aside class="has-preview">
                        <div class="has-card has-preview-card">
                            <div class="has-card-head">
                                <div>
                                    <h2>輪播預覽</h2>
                                    <p class="description" style="margin:4px 0 0">模擬前台向上切換效果</p>
                                </div>
                            </div>
                            <div class="has-card-body has-preview-body">
                                <div class="has-mock-header">
                                    <span class="has-mock-logo">HOVER</span>
                                </div>
                                <div id="has-live-preview" class="has-ticker-preview"></div>
                            </div>
                        </div>
                    </aside>
                </div>

                <div class="has-foot">
                    <?php submit_button('儲存設定', 'primary large', 'submit', false); ?>
                </div>
            </form>

            <form method="post" class="has-reset-form" onsubmit="return confirm('確定還原為預設內容？');">
                <?php wp_nonce_field('has_save', 'has_nonce'); ?>
                <input type="hidden" name="has_act" value="reset">
                <button type="submit" class="button-link-delete">還原預設</button>
            </form>
        </div>
    </div>

    <script>window.HAS_DATA = <?php echo $payload ?: '{}'; ?>;</script>
    <?php
    has_print_admin_styles();
}

function has_print_admin_styles(): void
{
    ?>
    <style>
        .hover-ann-admin { max-width: 1180px; }
        .hover-ann-admin .has-shell { margin-top: 8px; }
        .hover-ann-admin .has-topbar {
            display: flex; align-items: flex-start; justify-content: space-between;
            gap: 16px; margin-bottom: 16px;
        }
        .hover-ann-admin .has-topbar h1 { margin: 0 0 6px; }
        .hover-ann-admin .has-topbar-actions {
            display: flex; gap: 10px; align-items: center; flex-shrink: 0;
        }
        .hover-ann-admin .has-status {
            display: inline-flex; align-items: center; gap: 6px;
            padding: 6px 12px; border-radius: 999px; font-size: 12px; font-weight: 600;
            background: #f0f0f1; color: #646970;
        }
        .hover-ann-admin .has-status.is-live {
            background: #edf7f1; color: #1a6847;
        }
        .hover-ann-admin .has-status.is-live::before {
            content: ""; width: 8px; height: 8px; border-radius: 50%; background: #2a514d;
        }
        .hover-ann-admin .has-api-pill {
            display: inline-flex; align-items: center; gap: 8px;
            background: #fff; border: 1px solid #dcdcde; border-radius: 999px;
            padding: 8px 14px; margin-bottom: 16px; font-size: 12px; color: #646970;
        }
        .hover-ann-admin .has-api-pill code {
            font-size: 11px; background: #f6f7f7; padding: 2px 8px; border-radius: 999px;
        }
        .hover-ann-admin .has-layout {
            display: grid; grid-template-columns: minmax(0, 1fr) 320px; gap: 16px; align-items: start;
        }
        .hover-ann-admin .has-card {
            background: #fff; border: 1px solid #dcdcde; border-radius: 8px;
            box-shadow: 0 1px 2px rgba(0,0,0,.04); overflow: hidden; margin-bottom: 16px;
        }
        .hover-ann-admin .has-card-head {
            display: flex; align-items: center; justify-content: space-between; gap: 10px;
            padding: 14px 18px; border-bottom: 1px solid #f0f0f1;
        }
        .hover-ann-admin .has-card-head h2 { margin: 0; font-size: 14px; font-weight: 700; }
        .hover-ann-admin .has-card-body { padding: 18px; }
        .hover-ann-admin .has-grid-2 {
            display: grid; grid-template-columns: 1fr 1fr; gap: 14px 16px;
        }
        .hover-ann-admin .has-span-2 { grid-column: 1 / -1; }
        .hover-ann-admin .has-field { display: flex; flex-direction: column; gap: 6px; }
        .hover-ann-admin .has-label { font-weight: 600; font-size: 13px; }
        .hover-ann-admin .has-stack { display: flex; flex-direction: column; gap: 12px; }
        .hover-ann-admin .has-foot { display: flex; gap: 8px; margin-top: 4px; }
        .hover-ann-admin .has-reset-form { margin-top: 8px; }
        .hover-ann-admin .has-switch {
            display: inline-flex; align-items: center; gap: 12px; cursor: pointer; user-select: none;
        }
        .hover-ann-admin .has-switch input { position: absolute; opacity: 0; pointer-events: none; }
        .hover-ann-admin .has-switch-ui {
            width: 44px; height: 24px; border-radius: 999px; background: #c3c4c7; position: relative; transition: .2s;
        }
        .hover-ann-admin .has-switch-ui::after {
            content: ""; position: absolute; top: 3px; left: 3px; width: 18px; height: 18px;
            border-radius: 50%; background: #fff; transition: .2s; box-shadow: 0 1px 3px rgba(0,0,0,.2);
        }
        .hover-ann-admin .has-switch input:checked + .has-switch-ui { background: #2a514d; }
        .hover-ann-admin .has-switch input:checked + .has-switch-ui::after { transform: translateX(20px); }
        .hover-ann-admin .has-switch-label { font-weight: 600; font-size: 13px; }
        .hover-ann-admin .has-item {
            border: 1px solid #e2e4e7; border-radius: 8px; padding: 14px; background: #fafafa;
        }
        .hover-ann-admin .has-item.is-disabled { opacity: .55; }
        .hover-ann-admin .has-item-head {
            display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 12px;
        }
        .hover-ann-admin .has-item-title { font-size: 13px; font-weight: 700; color: #1d2327; }
        .hover-ann-admin .has-item-actions { display: flex; gap: 6px; align-items: center; }
        .hover-ann-admin .has-color { max-width: 120px; }
        .hover-ann-admin .has-preview { position: sticky; top: 32px; }
        .hover-ann-admin .has-preview-body {
            padding: 16px; background: #eef2f6; min-height: 220px;
        }
        .hover-ann-admin .has-mock-header {
            background: #fff; border: 1px solid #e5e5e5; border-bottom: 0;
            padding: 18px 12px 10px; text-align: center;
        }
        .hover-ann-admin .has-mock-logo {
            font-family: Georgia, serif; font-size: 22px; font-weight: 700; letter-spacing: .08em;
        }
        .hover-ann-admin .has-ticker-preview {
            position: relative; height: 36px; overflow: hidden;
            display: flex; align-items: center; justify-content: center;
            font-size: 12px; letter-spacing: .12em;
        }
        .hover-ann-admin .has-ticker-line {
            position: absolute; left: 0; right: 0; text-align: center; padding: 0 12px;
            white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
            transition: transform .42s cubic-bezier(.22,1,.36,1), opacity .42s;
        }
        .hover-ann-admin .has-ticker-line.is-enter {
            transform: translateY(100%); opacity: 0;
        }
        .hover-ann-admin .has-ticker-line.is-active {
            transform: translateY(0); opacity: 1;
        }
        .hover-ann-admin .has-ticker-line.is-exit {
            transform: translateY(-100%); opacity: 0;
        }
        @media (max-width: 960px) {
            .hover-ann-admin .has-layout { grid-template-columns: 1fr; }
            .hover-ann-admin .has-preview { position: static; }
            .hover-ann-admin .has-grid-2 { grid-template-columns: 1fr; }
        }
    </style>
    <?php
}

function has_admin_footer_script(): void
{
    $screen = function_exists('get_current_screen') ? get_current_screen() : null;
    if (!$screen || $screen->id !== 'toplevel_page_has') {
        return;
    }
    ?>
    <script>
    jQuery(function($){
        var state = window.HAS_DATA || { items: [] };
        var previewIndex = 0;
        var previewTimer = null;

        function esc(s){ return $('<div/>').text(s || '').html(); }
        function uid(){ return 'ann-' + Date.now() + '-' + Math.floor(Math.random() * 1000); }

        function readFields(){
            $('[data-field]').each(function(){
                var el = $(this);
                var path = el.data('field').split('.');
                var val = el.is(':checkbox') ? el.is(':checked') : el.val();
                if (path.length === 1) state[path[0]] = val;
            });
        }

        function renderItems(){
            var $wrap = $('#has-items').empty();
            (state.items || []).forEach(function(item, i){
                var disabled = !item.enabled;
                var html = '<div class="has-item'+(disabled ? ' is-disabled' : '')+'" data-index="'+i+'" data-id="'+esc(item.id)+'">';
                html += '<div class="has-item-head">';
                html += '<span class="has-item-title">公告 #'+(i+1)+'</span>';
                html += '<div class="has-item-actions">';
                html += '<label class="has-switch"><input type="checkbox" class="has-item-enabled" '+(item.enabled ? 'checked' : '')+'><span class="has-switch-ui"></span></label>';
                html += '<button type="button" class="button has-move-up" title="上移">↑</button>';
                html += '<button type="button" class="button has-move-down" title="下移">↓</button>';
                html += '<button type="button" class="button-link-delete has-remove-item">刪除</button>';
                html += '</div></div>';
                html += '<div class="has-field" style="margin-bottom:10px"><label class="has-label">公告文字</label>';
                html += '<input type="text" class="large-text has-item-text" value="'+esc(item.text)+'" placeholder="例：全館滿NT$2,000享免運!"></div>';
                html += '<div class="has-field"><label class="has-label">連結（選填）</label>';
                html += '<input type="text" class="regular-text has-item-href" value="'+esc(item.href)+'" placeholder="/products 或 https://..."></div>';
                html += '</div>';
                $wrap.append(html);
            });
        }

        function syncItemsFromDom(){
            var items = [];
            $('#has-items .has-item').each(function(){
                items.push({
                    id: $(this).attr('data-id') || uid(),
                    text: $(this).find('.has-item-text').val(),
                    href: $(this).find('.has-item-href').val(),
                    enabled: $(this).find('.has-item-enabled').is(':checked')
                });
            });
            state.items = items;
        }

        function activeItems(){
            if (!state.enabled) return [];
            return (state.items || []).filter(function(item){
                return item.enabled && String(item.text || '').trim();
            });
        }

        function renderPreview(){
            readFields();
            syncItemsFromDom();
            var items = activeItems();
            var bg = state.backgroundColor || '#2a514d';
            var color = state.textColor || '#f0f0f0';
            var $bar = $('#has-live-preview');
            $bar.css({ background: bg, color: color });

            if (!items.length) {
                if (previewTimer) clearInterval(previewTimer);
                previewTimer = null;
                $bar.html('<span style="opacity:.7">尚未啟用公告</span>');
                return;
            }

            if (items.length === 1) {
                if (previewTimer) clearInterval(previewTimer);
                previewTimer = null;
                $bar.html('<span class="has-ticker-line is-active">'+esc(items[0].text)+'</span>');
                return;
            }

            function showAt(idx){
                var text = items[idx % items.length].text;
                var $current = $bar.find('.has-ticker-line.is-active');
                var $next = $('<span class="has-ticker-line is-enter">'+esc(text)+'</span>');
                $bar.append($next);
                requestAnimationFrame(function(){
                    $current.removeClass('is-active').addClass('is-exit');
                    $next.removeClass('is-enter').addClass('is-active');
                    setTimeout(function(){ $current.remove(); }, 450);
                });
            }

            if (!previewTimer) {
                previewIndex = 0;
                $bar.html('<span class="has-ticker-line is-active">'+esc(items[0].text)+'</span>');
                var ms = Math.max(2000, Math.min(15000, parseInt(state.autoplayMs, 10) || 4000));
                previewTimer = setInterval(function(){
                    previewIndex = (previewIndex + 1) % items.length;
                    showAt(previewIndex);
                }, ms);
            }
        }

        function restartPreview(){
            if (previewTimer) clearInterval(previewTimer);
            previewTimer = null;
            renderPreview();
        }

        $(document).on('input change','input,select,textarea', restartPreview);

        $('#has-add-item').on('click', function(){
            if (!state.items) state.items = [];
            state.items.push({ id: uid(), text: '', href: '', enabled: true });
            renderItems();
            restartPreview();
        });

        $(document).on('click', '.has-remove-item', function(){
            var idx = $(this).closest('.has-item').data('index');
            state.items.splice(idx, 1);
            renderItems();
            restartPreview();
        });

        $(document).on('click', '.has-move-up', function(){
            var idx = $(this).closest('.has-item').data('index');
            if (idx <= 0) return;
            syncItemsFromDom();
            var tmp = state.items[idx - 1];
            state.items[idx - 1] = state.items[idx];
            state.items[idx] = tmp;
            renderItems();
            restartPreview();
        });

        $(document).on('click', '.has-move-down', function(){
            syncItemsFromDom();
            var idx = $(this).closest('.has-item').data('index');
            if (idx >= state.items.length - 1) return;
            var tmp = state.items[idx + 1];
            state.items[idx + 1] = state.items[idx];
            state.items[idx] = tmp;
            renderItems();
            restartPreview();
        });

        $('#has-form').on('submit', function(){
            readFields();
            syncItemsFromDom();
            $('#has-payload').val(JSON.stringify(state));
        });

        renderItems();
        restartPreview();
    });
    </script>
    <?php
}
