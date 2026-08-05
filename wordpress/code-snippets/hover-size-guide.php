<?php
/**
 * HOVER — 商品尺寸指南（Size Guide）
 *
 * 使用方式（WordPress 後台 WPCode / Code Snippets）：
 * 1. 若已有「HOVER 尺寸指南」snippet：請「編輯」舊的那筆，整份覆蓋貼上本檔 → 儲存
 * 2. 不要再「新增」第二份同名 snippet（會造成函式重複宣告錯誤）
 * 3. Run snippet：Everywhere → 啟用
 *
 * 後台位置：商品 → 編輯商品 → 下方「HOVER 尺寸指南」區塊
 * （含尺寸表、量測圖、Model 實穿參考）
 *
 * REST API（給 Next.js）：
 * GET /wp-json/wc/v3/products?slug=xxx
 * 每筆商品會多欄位：hover_size_guide (object)
 *   - models[]：{ label, height, weight, size }
 *   - modelNote：Model 區塊備註
 *
 * Meta key：hover_size_guide（JSON）
 */

if (!defined('ABSPATH')) {
    exit;
}

/** 已載入則整段略過（函式宣告必須包在條件內，否則 WPCode 兩份 snippet 會 redeclare fatal） */
if (defined('HSG_LOADED')) {
    return;
}
define('HSG_LOADED', true);

if (!defined('HSG_META')) {
    define('HSG_META', 'hover_size_guide');
}

if (!function_exists('hsg_default_model_note')) :
function hsg_default_model_note(): string
{
    return '※ 因個人體型、身形比例及穿著習慣不同，實際穿著效果可能有所差異，以上資訊僅供尺寸選購參考。';
}
endif;

if (!function_exists('hsg_defaults')) :
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
        'note'      => '※為平放測量，±2cm誤差範圍屬於製作標準範圍內。',
        'imageUrl'  => '',
        'models'    => [
            ['label' => '女模 Mina', 'height' => '168 cm', 'weight' => '50 kg', 'size' => 'M'],
            ['label' => '男模 Wilson', 'height' => '185 cm', 'weight' => '90 kg', 'size' => 'XL'],
        ],
        'modelNote' => hsg_default_model_note(),
    ];
}
endif;

/**
 * 正規化已存資料。
 * 注意：不可在 rows/sizes 為空時自動灌入「衣服預設版型」，
 * 否則帽子／襪子等自訂內容會在儲存或讀取時被覆蓋。
 */
if (!function_exists('hsg_normalize')) :
function hsg_normalize(array $data): array
{
    $d = hsg_defaults();

    $data['enabled'] = !empty($data['enabled']);
    $data['unitLabel'] = sanitize_text_field($data['unitLabel'] ?? $d['unitLabel']) ?: $d['unitLabel'];
    $data['note'] = sanitize_textarea_field($data['note'] ?? $d['note']);
    $data['imageUrl'] = esc_url_raw((string) ($data['imageUrl'] ?? $data['image_url'] ?? $d['imageUrl']));

    if (array_key_exists('modelNote', $data) || array_key_exists('model_note', $data)) {
        $data['modelNote'] = sanitize_textarea_field((string) ($data['modelNote'] ?? $data['model_note'] ?? ''));
    } else {
        $data['modelNote'] = $d['modelNote'];
    }

    $sizes = [];
    foreach (($data['sizes'] ?? []) as $size) {
        $size = sanitize_text_field((string) $size);
        if ($size !== '') {
            $sizes[] = $size;
        }
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
        $col_count = max(count($sizes), count($raw_values));
        for ($i = 0; $i < $col_count; $i++) {
            $values[] = sanitize_text_field((string) ($raw_values[$i] ?? ''));
        }
        // 對齊 sizes 欄數
        if (count($sizes) > 0) {
            $values = array_slice(array_pad($values, count($sizes), ''), 0, count($sizes));
        }
        $rows[] = ['label' => $label, 'values' => $values];
    }

    $models = [];
    foreach (($data['models'] ?? []) as $model) {
        if (!is_array($model)) {
            continue;
        }
        $label = sanitize_text_field((string) ($model['label'] ?? ''));
        $height = sanitize_text_field((string) ($model['height'] ?? ''));
        $weight = sanitize_text_field((string) ($model['weight'] ?? ''));
        $wear_size = sanitize_text_field((string) ($model['size'] ?? ''));
        if ($label === '' && $height === '' && $weight === '' && $wear_size === '') {
            continue;
        }
        $models[] = [
            'label'  => $label,
            'height' => $height,
            'weight' => $weight,
            'size'   => $wear_size,
        ];
    }

    $data['sizes'] = $sizes;
    $data['rows'] = $rows;
    $data['models'] = $models;

    return $data;
}
endif;

if (!function_exists('hsg_get_for_product')) :
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
    // 尚無設定：回空結構（後台編輯頁會另外帶入預設版型供參考，但不寫入 meta）
    return [
        'enabled'   => false,
        'unitLabel' => hsg_defaults()['unitLabel'],
        'sizes'     => [],
        'rows'      => [],
        'note'      => hsg_defaults()['note'],
        'imageUrl'  => '',
        'models'    => [],
        'modelNote' => hsg_default_model_note(),
    ];
}
endif;

if (!function_exists('hsg_is_visible')) :
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
endif;

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

if (!function_exists('hsg_render_meta_box')) :
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

        <div class="hsg-models-section">
            <div class="hsg-models-head">
                <div>
                    <h4 style="margin:0 0 4px">Model 實穿參考</h4>
                    <p class="description" style="margin:0">顯示於尺寸表下方。前台格式：女模 Mina｜168 cm／50 kg｜M</p>
                </div>
                <button type="button" class="button button-secondary" id="hsg-add-model">＋ 新增模特</button>
            </div>
            <div id="hsg-models-list" class="hsg-models-list"></div>
            <div class="hsg-field" style="margin-top:12px">
                <label class="hsg-label" for="hsg-model-note">Model 備註說明</label>
                <textarea id="hsg-model-note" class="large-text" rows="2"><?php echo esc_textarea($guide['modelNote'] ?? hsg_default_model_note()); ?></textarea>
            </div>
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
endif;

if (!function_exists('hsg_print_admin_styles')) :
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
        .hsg-admin .hsg-preview-note { margin-top: 10px; font-size: 13px; color: #555; }
        .hsg-admin .hsg-models-section {
            margin: 18px 0 0; padding: 14px; border: 1px solid #dcdcde;
            border-radius: 8px; background: #fafafa;
        }
        .hsg-admin .hsg-models-head {
            display: flex; align-items: flex-start; justify-content: space-between;
            gap: 12px; margin-bottom: 12px;
        }
        .hsg-admin .hsg-models-list { display: flex; flex-direction: column; gap: 10px; }
        .hsg-admin .hsg-model-row {
            display: grid; grid-template-columns: 1.4fr 1fr 1fr 0.7fr auto;
            gap: 8px; align-items: end; padding: 10px; border: 1px solid #e2e2e2;
            border-radius: 6px; background: #fff;
        }
        .hsg-admin .hsg-model-row .hsg-field { gap: 4px; }
        .hsg-admin .hsg-model-row .hsg-label { font-size: 12px; font-weight: 600; color: #50575e; }
        .hsg-admin .hsg-preview-models { margin-top: 16px; padding-top: 14px; border-top: 1px solid #e5e5e5; }
        .hsg-admin .hsg-preview-models h5 { margin: 0 0 8px; font-size: 14px; }
        .hsg-admin .hsg-preview-models ul { margin: 0; padding: 0; list-style: none; }
        .hsg-admin .hsg-preview-models li { margin: 0 0 6px; font-size: 13px; color: #555; }
        .hsg-admin .hsg-muted { color: #888; font-size: 12px; padding: 16px; }
        @media (max-width: 782px) {
            .hsg-admin .hsg-grid-2 { grid-template-columns: 1fr; }
            .hsg-admin .hsg-image-controls { grid-template-columns: 1fr; }
            .hsg-admin .hsg-model-row { grid-template-columns: 1fr 1fr; }
            .hsg-admin .hsg-models-head { flex-direction: column; }
        }
    </style>
    <?php
}
endif;

add_action('admin_footer', 'hsg_admin_footer_script');

if (!function_exists('hsg_admin_footer_script')) :
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
        /**
         * 不可用 $.extend(true) 合併 defaults 與已存資料：
         * jQuery deep merge 會「按索引合併陣列」，導致自訂列（如筒高）後面
         * 殘留衣服預設列（衣長／袖長），第二次開啟看起來像被蓋回預設。
         */
        var init = window.HSG_INIT && typeof window.HSG_INIT === 'object'
            ? window.HSG_INIT
            : null;
        var hasSavedRows = !!(init && Array.isArray(init.rows) && init.rows.length);
        var hasSavedSizes = !!(init && Array.isArray(init.sizes) && init.sizes.length);
        var state = (hasSavedRows || hasSavedSizes)
            ? JSON.parse(JSON.stringify(init))
            : JSON.parse(JSON.stringify(defaults));
        if (init && typeof init.enabled === 'boolean') {
            state.enabled = init.enabled;
        } else if (!hasSavedRows && !hasSavedSizes) {
            state.enabled = $('#hsg-enabled').is(':checked');
        }
        if (!Array.isArray(state.models)) state.models = [];
        if (typeof state.modelNote !== 'string') {
            state.modelNote = defaults.modelNote || '';
        }
        if (!$('#hsg-model-note').val() && state.modelNote) {
            $('#hsg-model-note').val(state.modelNote);
        }

        function esc(s){ return $('<div/>').text(s || '').html(); }

        function formatModelLine(model){
            var parts = [];
            if (model.label) parts.push(model.label);
            var hw = [model.height, model.weight].filter(Boolean).join('／');
            if (hw) parts.push(hw);
            if (model.size) parts.push(model.size);
            return parts.join('｜');
        }

        function renderImagePreview(){
            var url = String($('#hsg-image-url').val() || '').trim();
            var $preview = $('#hsg-image-preview');
            if (!url) {
                $preview.html('<span class="hsg-muted">未設定自訂圖片，前台將沿用預設尺寸圖。</span>').show();
                return;
            }
            $preview.html('<img src="'+esc(url)+'" alt="尺寸量測圖片預覽">').show();
        }

        function renderModels(){
            var $list = $('#hsg-models-list').empty();
            if (!state.models || !state.models.length) {
                $list.html('<p class="description" style="margin:0">尚未新增模特。點「＋ 新增模特」開始填寫。</p>');
                return;
            }
            state.models.forEach(function(model, i){
                var html = '<div class="hsg-model-row" data-model-index="'+i+'">';
                html += '<div class="hsg-field"><label class="hsg-label">名稱</label>';
                html += '<input type="text" class="regular-text hsg-model-label" data-index="'+i+'" value="'+esc(model.label)+'" placeholder="女模 Mina"></div>';
                html += '<div class="hsg-field"><label class="hsg-label">身高</label>';
                html += '<input type="text" class="regular-text hsg-model-height" data-index="'+i+'" value="'+esc(model.height)+'" placeholder="168 cm"></div>';
                html += '<div class="hsg-field"><label class="hsg-label">體重</label>';
                html += '<input type="text" class="regular-text hsg-model-weight" data-index="'+i+'" value="'+esc(model.weight)+'" placeholder="50 kg"></div>';
                html += '<div class="hsg-field"><label class="hsg-label">穿著尺寸</label>';
                html += '<input type="text" class="regular-text hsg-model-size" data-index="'+i+'" value="'+esc(model.size)+'" placeholder="M"></div>';
                html += '<button type="button" class="button-link-delete hsg-remove-model" data-index="'+i+'">刪除</button>';
                html += '</div>';
                $list.append(html);
            });
        }

        function syncPayload(){
            state.enabled = $('#hsg-enabled').is(':checked');
            state.unitLabel = $('#hsg-unit-label').val();
            state.note = $('#hsg-note').val();
            state.imageUrl = $('#hsg-image-url').val();
            state.modelNote = $('#hsg-model-note').val();
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

            renderModels();
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
            var models = (state.models || []).filter(function(m){
                return m && (m.label || m.height || m.weight || m.size);
            });
            if (models.length) {
                html += '<div class="hsg-preview-models">';
                html += '<h5>Model 實穿參考</h5><ul>';
                models.forEach(function(m){
                    html += '<li>'+esc(formatModelLine(m))+'</li>';
                });
                html += '</ul>';
                if (state.modelNote) {
                    html += '<p class="hsg-preview-note">'+esc(state.modelNote)+'</p>';
                }
                html += '</div>';
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
            state.modelNote = $('#hsg-model-note').val();

            var sizes = [];
            $('.hsg-size-input').each(function(){
                sizes.push($(this).val());
            });
            state.sizes = sizes;

            var rows = [];
            $('#hsg-tbody tr').each(function(){
                var label = $(this).find('.hsg-row-label').val();
                var values = [];
                $(this).find('.hsg-cell').each(function(){
                    values.push($(this).val());
                });
                rows.push({ label: label, values: values });
            });
            state.rows = rows;

            var models = [];
            $('.hsg-model-row').each(function(){
                models.push({
                    label: $(this).find('.hsg-model-label').val() || '',
                    height: $(this).find('.hsg-model-height').val() || '',
                    weight: $(this).find('.hsg-model-weight').val() || '',
                    size: $(this).find('.hsg-model-size').val() || ''
                });
            });
            state.models = models;
        }

        $('#hsg-enabled, #hsg-unit-label, #hsg-note, #hsg-image-url, #hsg-model-note').on('change input', function(){
            readFromDom();
            syncPayload();
        });

        $(document).on('input change', '.hsg-size-input, .hsg-row-label, .hsg-cell, .hsg-model-label, .hsg-model-height, .hsg-model-weight, .hsg-model-size', function(){
            readFromDom();
            syncPayload();
        });

        $('#hsg-apply-template').on('click', function(){
            if (!confirm('套用預設版型會覆蓋目前表格與 Model 內容，確定繼續？')) return;
            state = $.extend(true, {}, defaults);
            state.enabled = true;
            $('#hsg-enabled').prop('checked', true);
            $('#hsg-unit-label').val(state.unitLabel);
            $('#hsg-note').val(state.note);
            $('#hsg-image-url').val(state.imageUrl || '');
            $('#hsg-model-note').val(state.modelNote || '');
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

        $('#hsg-add-model').on('click', function(){
            readFromDom();
            if (!Array.isArray(state.models)) state.models = [];
            state.models.push({ label: '', height: '', weight: '', size: '' });
            renderModels();
            syncPayload();
        });

        $(document).on('click', '.hsg-remove-model', function(){
            var idx = parseInt($(this).data('index'), 10);
            readFromDom();
            state.models.splice(idx, 1);
            renderModels();
            syncPayload();
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
endif;

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
