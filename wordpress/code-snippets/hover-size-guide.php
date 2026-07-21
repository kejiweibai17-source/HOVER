<?php
/**
 * HOVER — 商品尺寸指南（Size Guide）
 *
 * 使用方式（WordPress 後台）：
 * 1. 安裝並啟用插件「Code Snippets」
 * 2. Snippets → Add New → 貼上本檔內容
 * 3. Run snippet：Everywhere
 *
 * 後台位置：商品 → 編輯商品 → 下方「HOVER 尺寸指南」區塊
 *
 * REST API（給 Next.js）：
 * GET /wp-json/wc/v3/products?slug=xxx
 * 每筆商品會多欄位：hover_size_guide (object)
 *
 * Meta key：hover_size_guide（JSON）
 */

if (!defined('ABSPATH')) {
    exit;
}

if (defined('HSG_LOADED')) {
    return;
}
define('HSG_LOADED', true);

const HSG_META = 'hover_size_guide';

function hsg_defaults(): array
{
    return [
        'enabled'   => true,
        'unitLabel' => '尺寸(公分)',
        'sizes'     => ['S', 'M', 'L', 'XL'],
        'rows'      => [
            ['label' => '肩寬', 'values' => ['41', '45.5', '48.5', '54']],
            ['label' => '胸寬', 'values' => ['48.5', '52', '55', '58.5']],
            ['label' => '衣長', 'values' => ['65', '69.5', '72', '76.5']],
            ['label' => '袖長', 'values' => ['18.5', '20', '21.5', '24']],
        ],
        'note'     => '※為平放測量，±2cm誤差範圍屬於製作標準範圍內。',
        'imageUrl' => '',
    ];
}

function hsg_normalize(array $data): array
{
    $d = hsg_defaults();

    $data['enabled'] = !empty($data['enabled']);
    $data['unitLabel'] = sanitize_text_field($data['unitLabel'] ?? $d['unitLabel']) ?: $d['unitLabel'];
    $data['note'] = sanitize_textarea_field($data['note'] ?? $d['note']);
    $data['imageUrl'] = esc_url_raw((string) ($data['imageUrl'] ?? $data['image_url'] ?? $d['imageUrl']));

    $sizes = [];
    foreach (($data['sizes'] ?? []) as $size) {
        $size = sanitize_text_field((string) $size);
        if ($size !== '') {
            $sizes[] = $size;
        }
    }
    if (empty($sizes)) {
        $sizes = $d['sizes'];
    }

    $rows = [];
    foreach (($data['rows'] ?? []) as $row) {
        if (!is_array($row)) {
            continue;
        }
        $label = sanitize_text_field($row['label'] ?? '');
        if ($label === '') {
            continue;
        }
        $values = [];
        $raw_values = is_array($row['values'] ?? null) ? $row['values'] : [];
        for ($i = 0; $i < count($sizes); $i++) {
            $values[] = sanitize_text_field((string) ($raw_values[$i] ?? ''));
        }
        $rows[] = ['label' => $label, 'values' => $values];
    }

    $data['sizes'] = $sizes;
    $data['rows'] = !empty($rows) ? $rows : $d['rows'];

    return $data;
}

function hsg_get_for_product(int $product_id): array
{
    $raw = get_post_meta($product_id, HSG_META, true);
    if (is_array($raw)) {
        return hsg_normalize($raw);
    }
    if (is_string($raw) && $raw !== '') {
        $decoded = json_decode($raw, true);
        if (is_array($decoded)) {
            return hsg_normalize($decoded);
        }
    }
    return hsg_normalize(['enabled' => false]);
}

function hsg_is_visible(array $guide): bool
{
    if (empty($guide['enabled'])) {
        return false;
    }
    if (empty($guide['sizes']) || empty($guide['rows'])) {
        return false;
    }
    return true;
}

/** 商品編輯頁 Meta Box */
add_action('add_meta_boxes', function () {
    add_meta_box(
        'hsg-size-guide',
        'HOVER 尺寸指南',
        'hsg_render_meta_box',
        'product',
        'normal',
        'high'
    );
});

/** 商品編輯頁啟用 WordPress 媒體庫 */
add_action('admin_enqueue_scripts', function () {
    $screen = function_exists('get_current_screen') ? get_current_screen() : null;
    if ($screen && $screen->post_type === 'product' && $screen->base === 'post') {
        wp_enqueue_media();
    }
});

function hsg_render_meta_box($post): void
{
    $guide = hsg_get_for_product((int) $post->ID);
    if (empty(get_post_meta($post->ID, HSG_META, true))) {
        $guide = hsg_defaults();
        $guide['enabled'] = false;
    }

    wp_nonce_field('hsg_save', 'hsg_nonce');
    $payload = wp_json_encode($guide, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    ?>
    <div class="hsg-admin" id="hsg-admin">
        <p class="description" style="margin-top:0">
            設定此商品前台「尺寸指南」手風琴表格。儲存商品後，Next.js 商品頁會透過 WooCommerce REST API 讀取。
        </p>

        <label class="hsg-switch" style="margin:12px 0 16px">
            <input type="checkbox" id="hsg-enabled" <?php checked(!empty($guide['enabled'])); ?>>
            <span class="hsg-switch-ui"></span>
            <span class="hsg-switch-label">啟用尺寸指南（顯示於前台商品頁）</span>
        </label>

        <div class="hsg-toolbar">
            <button type="button" class="button" id="hsg-apply-template">套用預設版型</button>
            <button type="button" class="button" id="hsg-add-size">新增尺寸欄</button>
            <button type="button" class="button" id="hsg-add-row">新增量法列</button>
        </div>

        <div class="hsg-grid-2" style="margin:14px 0">
            <div class="hsg-field">
                <label class="hsg-label">第一欄標題</label>
                <input type="text" class="regular-text" id="hsg-unit-label" value="<?php echo esc_attr($guide['unitLabel']); ?>">
            </div>
            <div class="hsg-field">
                <label class="hsg-label">備註文字</label>
                <input type="text" class="large-text" id="hsg-note" value="<?php echo esc_attr($guide['note']); ?>">
            </div>
        </div>

        <div class="hsg-image-field">
            <label class="hsg-label" for="hsg-image-url">尺寸量測圖片</label>
            <div class="hsg-image-controls">
                <input
                    type="url"
                    class="large-text"
                    id="hsg-image-url"
                    value="<?php echo esc_attr($guide['imageUrl'] ?? ''); ?>"
                    placeholder="選擇媒體庫圖片或貼上圖片網址"
                >
                <button type="button" class="button button-secondary" id="hsg-select-image">從媒體庫選擇</button>
                <button type="button" class="button-link-delete" id="hsg-clear-image">恢復預設</button>
            </div>
            <div class="hsg-image-preview" id="hsg-image-preview"></div>
        </div>

        <div class="hsg-table-wrap">
            <table class="widefat striped hsg-table" id="hsg-table">
                <thead id="hsg-thead"></thead>
                <tbody id="hsg-tbody"></tbody>
            </table>
        </div>

        <div class="hsg-preview-wrap">
            <h4 style="margin:16px 0 8px">前台預覽</h4>
            <div id="hsg-preview" class="hsg-preview"></div>
        </div>

        <input type="hidden" name="hsg_payload" id="hsg-payload" value="">
    </div>

    <script>window.HSG_INIT = <?php echo $payload ?: '{}'; ?>;</script>
    <?php
    hsg_print_admin_styles();
}

function hsg_print_admin_styles(): void
{
    static $printed = false;
    if ($printed) {
        return;
    }
    $printed = true;
    ?>
    <style>
        .hsg-admin .hsg-switch {
            display: inline-flex; align-items: center; gap: 12px; cursor: pointer; user-select: none;
        }
        .hsg-admin .hsg-switch input { position: absolute; opacity: 0; pointer-events: none; }
        .hsg-admin .hsg-switch-ui {
            width: 44px; height: 24px; border-radius: 999px; background: #c3c4c7; position: relative; transition: .2s;
        }
        .hsg-admin .hsg-switch-ui::after {
            content: ""; position: absolute; top: 3px; left: 3px; width: 18px; height: 18px;
            border-radius: 50%; background: #fff; transition: .2s; box-shadow: 0 1px 3px rgba(0,0,0,.2);
        }
        .hsg-admin .hsg-switch input:checked + .hsg-switch-ui { background: #2a514d; }
        .hsg-admin .hsg-switch input:checked + .hsg-switch-ui::after { transform: translateX(20px); }
        .hsg-admin .hsg-switch-label { font-weight: 600; font-size: 13px; }
        .hsg-admin .hsg-toolbar { display: flex; gap: 8px; flex-wrap: wrap; }
        .hsg-admin .hsg-grid-2 {
            display: grid; grid-template-columns: 1fr 1fr; gap: 12px 16px;
        }
        .hsg-admin .hsg-field { display: flex; flex-direction: column; gap: 6px; }
        .hsg-admin .hsg-label { font-weight: 600; font-size: 13px; }
        .hsg-admin .hsg-image-field {
            margin: 0 0 14px; padding: 14px; border: 1px solid #dcdcde;
            border-radius: 8px; background: #fafafa;
        }
        .hsg-admin .hsg-image-controls {
            display: grid; grid-template-columns: minmax(220px, 1fr) auto auto;
            align-items: center; gap: 8px; margin-top: 8px;
        }
        .hsg-admin .hsg-image-preview {
            display: none; margin-top: 12px; padding: 10px; border: 1px solid #dcdcde;
            border-radius: 6px; background: #fff; text-align: center;
        }
        .hsg-admin .hsg-image-preview img {
            display: block; max-width: 100%; max-height: 280px; width: auto; height: auto; margin: 0 auto;
        }
        .hsg-admin .hsg-table-wrap {
            overflow-x: auto; border: 1px solid #dcdcde; border-radius: 8px; background: #fff;
        }
        .hsg-admin .hsg-table th, .hsg-admin .hsg-table td { vertical-align: middle; }
        .hsg-admin .hsg-table input.regular-text { width: 100%; min-width: 64px; }
        .hsg-admin .hsg-size-head { display: flex; align-items: center; gap: 6px; }
        .hsg-admin .hsg-preview-wrap {
            border: 1px solid #dcdcde; border-radius: 8px; background: #fafafa; padding: 14px;
        }
        .hsg-admin .hsg-preview table { width: 100%; border-collapse: collapse; font-size: 13px; }
        .hsg-admin .hsg-preview th, .hsg-admin .hsg-preview td {
            padding: 8px 12px 8px 0; border-bottom: 1px solid #eee; text-align: left;
        }
        .hsg-admin .hsg-preview-note { margin-top: 10px; font-size: 11px; color: #888; }
        .hsg-admin .hsg-muted { color: #888; font-size: 12px; padding: 16px; }
        @media (max-width: 782px) {
            .hsg-admin .hsg-grid-2 { grid-template-columns: 1fr; }
            .hsg-admin .hsg-image-controls { grid-template-columns: 1fr; }
        }
    </style>
    <?php
}

add_action('admin_footer', 'hsg_admin_footer_script');

function hsg_admin_footer_script(): void
{
    $screen = function_exists('get_current_screen') ? get_current_screen() : null;
    if (!$screen || $screen->id !== 'product' || $screen->base !== 'post') {
        return;
    }
    $defaults = wp_json_encode(hsg_defaults(), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    ?>
    <script>
    jQuery(function($){
        var defaults = <?php echo $defaults ?: '{}'; ?>;
        var state = $.extend(true, {}, defaults, window.HSG_INIT || {});
        if (!state.enabled && (!window.HSG_INIT || !window.HSG_INIT.enabled)) {
            state.enabled = $('#hsg-enabled').is(':checked');
        }

        function esc(s){ return $('<div/>').text(s || '').html(); }

        function renderImagePreview(){
            var url = String($('#hsg-image-url').val() || '').trim();
            var $preview = $('#hsg-image-preview');
            if (!url) {
                $preview.html('<span class="hsg-muted">未設定自訂圖片，前台將沿用預設尺寸圖。</span>').show();
                return;
            }
            $preview.html('<img src="'+esc(url)+'" alt="尺寸量測圖片預覽">').show();
        }

        function syncPayload(){
            state.enabled = $('#hsg-enabled').is(':checked');
            state.unitLabel = $('#hsg-unit-label').val();
            state.note = $('#hsg-note').val();
            state.imageUrl = $('#hsg-image-url').val();
            $('#hsg-payload').val(JSON.stringify(state));
            renderPreview();
            renderImagePreview();
        }

        function renderTable(){
            var $thead = $('#hsg-thead').empty();
            var $tbody = $('#hsg-tbody').empty();
            var head = '<tr><th style="width:140px">量法</th>';
            (state.sizes || []).forEach(function(size, i){
                head += '<th><div class="hsg-size-head">';
                head += '<input type="text" class="regular-text hsg-size-input" data-size-index="'+i+'" value="'+esc(size)+'">';
                head += '<button type="button" class="button-link-delete hsg-remove-size" data-size-index="'+i+'" title="刪除尺寸">×</button>';
                head += '</div></th>';
            });
            head += '</tr>';
            $thead.html(head);

            (state.rows || []).forEach(function(row, rowIndex){
                var tr = '<tr data-row-index="'+rowIndex+'">';
                tr += '<td><div style="display:flex;gap:6px;align-items:center">';
                tr += '<input type="text" class="regular-text hsg-row-label" value="'+esc(row.label)+'" placeholder="例：肩寬">';
                tr += '<button type="button" class="button-link-delete hsg-remove-row" data-row-index="'+rowIndex+'">刪除</button>';
                tr += '</div></td>';
                (state.sizes || []).forEach(function(size, colIndex){
                    var val = (row.values && row.values[colIndex]) ? row.values[colIndex] : '';
                    tr += '<td><input type="text" class="regular-text hsg-cell" data-row-index="'+rowIndex+'" data-col-index="'+colIndex+'" value="'+esc(val)+'"></td>';
                });
                tr += '</tr>';
                $tbody.append(tr);
            });

            syncPayload();
        }

        function renderPreview(){
            if (!state.enabled) {
                $('#hsg-preview').html('<div class="hsg-muted">尺寸指南已關閉，前台不會顯示。</div>');
                return;
            }
            if (!state.rows || !state.rows.length) {
                $('#hsg-preview').html('<div class="hsg-muted">請新增至少一列量法資料。</div>');
                return;
            }
            var html = '<table><thead><tr><th>'+esc(state.unitLabel)+'</th>';
            (state.sizes || []).forEach(function(size){
                html += '<th>'+esc(size)+'</th>';
            });
            html += '</tr></thead><tbody>';
            (state.rows || []).forEach(function(row){
                html += '<tr><td>'+esc(row.label)+'</td>';
                (state.sizes || []).forEach(function(size, i){
                    html += '<td>'+esc((row.values && row.values[i]) || '—')+'</td>';
                });
                html += '</tr>';
            });
            html += '</tbody></table>';
            if (state.note) {
                html += '<p class="hsg-preview-note">'+esc(state.note)+'</p>';
            }
            if (state.imageUrl) {
                html += '<div style="margin-top:12px;text-align:center">';
                html += '<img src="'+esc(state.imageUrl)+'" alt="尺寸量測圖片" style="max-width:100%;max-height:260px;width:auto;height:auto">';
                html += '</div>';
            }
            $('#hsg-preview').html(html);
        }

        function readFromDom(){
            state.enabled = $('#hsg-enabled').is(':checked');
            state.unitLabel = $('#hsg-unit-label').val();
            state.note = $('#hsg-note').val();
            state.imageUrl = $('#hsg-image-url').val();

            var sizes = [];
            $('.hsg-size-input').each(function(){
                sizes.push($(this).val());
            });
            state.sizes = sizes;

            var rows = [];
            $('#hsg-tbody tr').each(function(){
                var rowIndex = $(this).data('row-index');
                var label = $(this).find('.hsg-row-label').val();
                var values = [];
                $(this).find('.hsg-cell').each(function(){
                    values.push($(this).val());
                });
                rows.push({ label: label, values: values });
            });
            state.rows = rows;
        }

        $('#hsg-enabled, #hsg-unit-label, #hsg-note, #hsg-image-url').on('change input', function(){
            readFromDom();
            syncPayload();
        });

        $(document).on('input change', '.hsg-size-input, .hsg-row-label, .hsg-cell', function(){
            readFromDom();
            syncPayload();
        });

        $('#hsg-apply-template').on('click', function(){
            if (!confirm('套用預設版型會覆蓋目前表格內容，確定繼續？')) return;
            state = $.extend(true, {}, defaults);
            state.enabled = true;
            $('#hsg-enabled').prop('checked', true);
            $('#hsg-unit-label').val(state.unitLabel);
            $('#hsg-note').val(state.note);
            $('#hsg-image-url').val(state.imageUrl || '');
            renderTable();
        });

        var imageFrame = null;
        $('#hsg-select-image').on('click', function(){
            if (imageFrame) {
                imageFrame.open();
                return;
            }
            imageFrame = wp.media({
                title: '選擇尺寸量測圖片',
                button: { text: '使用這張圖片' },
                library: { type: 'image' },
                multiple: false
            });
            imageFrame.on('select', function(){
                var attachment = imageFrame.state().get('selection').first().toJSON();
                $('#hsg-image-url').val(attachment.url || '').trigger('change');
            });
            imageFrame.open();
        });

        $('#hsg-clear-image').on('click', function(){
            $('#hsg-image-url').val('').trigger('change');
        });

        $('#hsg-add-size').on('click', function(){
            readFromDom();
            state.sizes.push('2XL');
            state.rows.forEach(function(row){
                row.values.push('');
            });
            renderTable();
        });

        $('#hsg-add-row').on('click', function(){
            readFromDom();
            var values = state.sizes.map(function(){ return ''; });
            state.rows.push({ label: '', values: values });
            renderTable();
        });

        $(document).on('click', '.hsg-remove-size', function(){
            var idx = parseInt($(this).data('size-index'), 10);
            readFromDom();
            if (state.sizes.length <= 1) {
                alert('至少保留一個尺寸欄位');
                return;
            }
            state.sizes.splice(idx, 1);
            state.rows.forEach(function(row){
                row.values.splice(idx, 1);
            });
            renderTable();
        });

        $(document).on('click', '.hsg-remove-row', function(){
            var idx = parseInt($(this).data('row-index'), 10);
            readFromDom();
            state.rows.splice(idx, 1);
            renderTable();
        });

        $('form#post').on('submit', function(){
            readFromDom();
            syncPayload();
        });

        renderTable();
    });
    </script>
    <?php
}

/** 儲存商品 Meta */
add_action('woocommerce_process_product_meta', function ($post_id) {
    if (!isset($_POST['hsg_nonce']) || !wp_verify_nonce($_POST['hsg_nonce'], 'hsg_save')) {
        return;
    }
    if (!current_user_can('edit_post', $post_id)) {
        return;
    }

    $raw = json_decode(wp_unslash($_POST['hsg_payload'] ?? ''), true);
    if (!is_array($raw)) {
        return;
    }

    $normalized = hsg_normalize($raw);
    update_post_meta($post_id, HSG_META, $normalized);
}, 10, 1);

/** WooCommerce REST：附加 hover_size_guide */
add_filter('woocommerce_rest_prepare_product_object', function ($response, $object, $request) {
    if (!is_object($response) || !method_exists($object, 'get_id')) {
        return $response;
    }

    $data = $response->get_data();
    $guide = hsg_get_for_product((int) $object->get_id());
    $data['hover_size_guide'] = $guide;
    $response->set_data($data);

    return $response;
}, 10, 3);

/** 註冊 post meta（REST 相容） */
add_action('init', function () {
    register_post_meta('product', HSG_META, [
        'type'              => 'string',
        'single'            => true,
        'show_in_rest'      => true,
        'sanitize_callback' => function ($value) {
            if (is_array($value)) {
                return wp_json_encode(hsg_normalize($value), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
            }
            return is_string($value) ? $value : '';
        },
        'auth_callback'     => function () {
            return current_user_can('edit_products');
        },
    ]);
});
