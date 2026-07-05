<?php
/**
 * HOVER — WooCommerce 顏色屬性色票選擇器
 *
 * 使用方式（WordPress 後台）：
 * 1. 安裝並啟用插件「Code Snippets」
 * 2. Snippets → Add New → 貼上本檔內容
 * 3. Run snippet：Everywhere
 *
 * 功能：
 * - 商品編輯頁「屬性」分頁：屬性名稱為 顏色 / Color 時，顯示色票選擇器
 * - 商品 → 屬性 → 顏色（全域屬性）：可為每個顏色詞彙設定預設色碼
 * - REST API 輸出 hover_color_swatches，供 Next.js 前台色票方塊使用
 *
 * Meta key：hover_color_swatches（JSON，商品層級覆寫）
 * Term meta：hover_color_hex（全域顏色屬性詞彙）
 */

if (!defined('ABSPATH')) {
    exit;
}

if (defined('HCSW_LOADED')) {
    return;
}
define('HCSW_LOADED', true);

const HCSW_META = 'hover_color_swatches';
const HCSW_TERM_META = 'hover_color_hex';

function hcsw_default_hex_map(): array
{
    return [
        '黑'   => '#111111',
        '黑色' => '#111111',
        '白'   => '#ffffff',
        '白色' => '#ffffff',
        '紅'   => '#b20000',
        '紅色' => '#b20000',
        '粉'   => '#ffe0f4',
        '粉色' => '#ffe0f4',
        '粉紅' => '#ffe0f4',
        '藍'   => '#9ab3d4',
        '藍色' => '#9ab3d4',
        '軍綠' => '#4a5d3f',
        '綠'   => '#4a7c59',
        '綠色' => '#4a7c59',
        '米色' => '#e8dcc8',
        '米'   => '#e8dcc8',
        '卡其' => '#c4b896',
        '灰'   => '#888888',
        '灰色' => '#888888',
        '深灰' => '#555555',
        '淺灰' => '#c8ccd0',
        '黃'   => '#f5d547',
        '黃色' => '#f5d547',
        '橘'   => '#e67e22',
        '橘色' => '#e67e22',
        '紫'   => '#7b5ea7',
        '紫色' => '#7b5ea7',
        '棕'   => '#8b5a2b',
        '棕色' => '#8b5a2b',
        '深藍' => '#1a3a5c',
        '海軍藍' => '#1a3a5c',
    ];
}

function hcsw_guess_hex(string $label): string
{
    $label = trim($label);
    if ($label === '') {
        return '#cccccc';
    }
    if (preg_match('/^#[0-9a-f]{3,8}$/i', $label)) {
        return strtolower($label);
    }
    $map = hcsw_default_hex_map();
    if (isset($map[$label])) {
        return $map[$label];
    }
    $lower = strtolower($label);
    if (isset($map[$lower])) {
        return $map[$lower];
    }
    return '#cccccc';
}

function hcsw_is_color_attribute_name(string $name): bool
{
    $raw = trim($name);
    $normalized = strtolower(preg_replace('/^pa_/', '', $raw));
    $candidates = ['顏色', '颜色', 'color', 'colour', 'colors', '色彩'];
    return in_array($raw, $candidates, true) || in_array($normalized, $candidates, true);
}

function hcsw_sanitize_hex(string $hex, string $fallback = '#cccccc'): string
{
    $hex = trim($hex);
    if (preg_match('/^#[0-9a-f]{3,8}$/i', $hex)) {
        return strtolower($hex);
    }
    return $fallback;
}

function hcsw_normalize_swatches(array $data): array
{
    $out = [];
    foreach ($data as $label => $hex) {
        $label = sanitize_text_field((string) $label);
        if ($label === '') {
            continue;
        }
        $out[$label] = hcsw_sanitize_hex((string) $hex, hcsw_guess_hex($label));
    }
    return $out;
}

function hcsw_get_product_swatches(int $product_id): array
{
    $raw = get_post_meta($product_id, HCSW_META, true);
    if (is_array($raw)) {
        return hcsw_normalize_swatches($raw);
    }
    if (is_string($raw) && $raw !== '') {
        $decoded = json_decode($raw, true);
        if (is_array($decoded)) {
            return hcsw_normalize_swatches($decoded);
        }
    }
    return [];
}

function hcsw_get_term_hex(string $label): string
{
    $taxonomies = ['pa_color', 'pa_顏色'];
    foreach ($taxonomies as $taxonomy) {
        if (!taxonomy_exists($taxonomy)) {
            continue;
        }
        $term = get_term_by('name', $label, $taxonomy);
        if (!$term || is_wp_error($term)) {
            $term = get_term_by('slug', sanitize_title($label), $taxonomy);
        }
        if ($term && !is_wp_error($term)) {
            $hex = get_term_meta($term->term_id, HCSW_TERM_META, true);
            if (is_string($hex) && $hex !== '') {
                return hcsw_sanitize_hex($hex, hcsw_guess_hex($label));
            }
        }
    }
    return hcsw_guess_hex($label);
}

function hcsw_get_resolved_swatches_for_product(int $product_id): array
{
    $product = wc_get_product($product_id);
    if (!$product) {
        return [];
    }

    $saved = hcsw_get_product_swatches($product_id);
    $resolved = [];

    foreach ($product->get_attributes() as $attribute) {
        if (!hcsw_is_color_attribute_name($attribute->get_name())) {
            continue;
        }

        $options = [];
        if ($attribute->is_taxonomy()) {
            $terms = wc_get_product_terms($product_id, $attribute->get_name(), ['fields' => 'names']);
            if (is_array($terms)) {
                $options = $terms;
            }
        } else {
            $options = $attribute->get_options();
        }

        foreach ($options as $label) {
            $label = sanitize_text_field((string) $label);
            if ($label === '') {
                continue;
            }
            if (isset($saved[$label])) {
                $resolved[$label] = $saved[$label];
            } else {
                $resolved[$label] = hcsw_get_term_hex($label);
            }
        }
    }

    return hcsw_normalize_swatches($resolved);
}

function hcsw_get_attribute_color_labels($attribute, int $product_id): array
{
    if (!is_object($attribute) || !method_exists($attribute, 'get_name')) {
        return [];
    }

    $labels = [];
    if (method_exists($attribute, 'is_taxonomy') && $attribute->is_taxonomy()) {
        $terms = wc_get_product_terms($product_id, $attribute->get_name(), ['fields' => 'names']);
        if (is_array($terms)) {
            $labels = $terms;
        }
    } elseif (method_exists($attribute, 'get_options')) {
        $labels = $attribute->get_options();
    }

    $out = [];
    foreach ($labels as $label) {
        $label = sanitize_text_field((string) $label);
        if ($label !== '') {
            $out[] = $label;
        }
    }

    return $out;
}

function hcsw_get_attribute_color_payload($attribute, int $product_id): array
{
    $labels = hcsw_get_attribute_color_labels($attribute, $product_id);
    $saved = $product_id ? hcsw_get_product_swatches($product_id) : [];
    $swatches = [];

    foreach ($labels as $label) {
        $swatches[$label] = $saved[$label] ?? hcsw_get_term_hex($label);
    }

    return [
        'labels'   => $labels,
        'swatches' => hcsw_normalize_swatches($swatches),
    ];
}

function hcsw_persist_swatches_for_product(int $product_id, array $from_post = []): void
{
    if ($product_id <= 0) {
        return;
    }

    $from_attrs = hcsw_build_swatches_from_post_attributes();
    $existing = hcsw_get_product_swatches($product_id);
    $resolved = hcsw_get_resolved_swatches_for_product($product_id);
    $merged = array_merge($existing, $resolved, $from_attrs, $from_post);

    if (!empty($merged)) {
        update_post_meta($product_id, HCSW_META, hcsw_normalize_swatches($merged));
    }
}

/** 全域顏色屬性詞彙：新增 / 編輯 */
function hcsw_register_term_fields(string $taxonomy): void
{
    if (!hcsw_is_color_attribute_name($taxonomy)) {
        return;
    }

    add_action("{$taxonomy}_add_form_fields", function () {
        ?>
        <div class="form-field">
            <label for="hcsw_term_hex">HOVER 色票</label>
            <input type="color" id="hcsw_term_hex" name="hcsw_term_hex" value="#cccccc">
            <input type="text" name="hcsw_term_hex_text" value="#cccccc" class="regular-text" style="margin-top:8px;max-width:120px">
            <p class="description">此顏色詞彙在前台商品頁顯示的方塊色碼。</p>
        </div>
        <?php
    });

    add_action("{$taxonomy}_edit_form_fields", function ($term) {
        $hex = get_term_meta($term->term_id, HCSW_TERM_META, true);
        if (!is_string($hex) || $hex === '') {
            $hex = hcsw_guess_hex($term->name);
        }
        ?>
        <tr class="form-field">
            <th scope="row"><label for="hcsw_term_hex">HOVER 色票</label></th>
            <td>
                <input type="color" id="hcsw_term_hex" name="hcsw_term_hex" value="<?php echo esc_attr($hex); ?>">
                <input type="text" name="hcsw_term_hex_text" value="<?php echo esc_attr($hex); ?>" class="regular-text" style="margin-left:8px;max-width:120px">
                <p class="description">此顏色詞彙在前台商品頁顯示的方塊色碼。</p>
            </td>
        </tr>
        <?php
    });

    add_action("created_{$taxonomy}", 'hcsw_save_term_hex');
    add_action("edited_{$taxonomy}", 'hcsw_save_term_hex');
}

add_action('init', function () {
    hcsw_register_term_fields('pa_color');
    hcsw_register_term_fields('pa_顏色');
}, 20);

function hcsw_save_term_hex(int $term_id): void
{
    if (!current_user_can('manage_product_terms')) {
        return;
    }
    $hex = $_POST['hcsw_term_hex_text'] ?? $_POST['hcsw_term_hex'] ?? '';
    update_term_meta($term_id, HCSW_TERM_META, hcsw_sanitize_hex((string) $hex));
}

function hcsw_build_swatches_from_post_attributes(): array
{
    $swatches = [];
    $names = isset($_POST['attribute_names']) && is_array($_POST['attribute_names'])
        ? $_POST['attribute_names']
        : [];
    $values = isset($_POST['attribute_values']) && is_array($_POST['attribute_values'])
        ? $_POST['attribute_values']
        : [];

    foreach ($names as $i => $name) {
        if (!hcsw_is_color_attribute_name((string) $name)) {
            continue;
        }
        if (!isset($values[$i])) {
            continue;
        }
        $raw = wp_unslash($values[$i]);
        if (is_array($raw)) {
            continue;
        }
        foreach (wc_get_text_attributes((string) $raw) as $label) {
            $label = sanitize_text_field((string) $label);
            if ($label === '') {
                continue;
            }
            $swatches[$label] = hcsw_get_term_hex($label);
        }
    }

    return hcsw_normalize_swatches($swatches);
}

/** 商品儲存 */
add_action('woocommerce_process_product_meta', function ($post_id) {
    if (!current_user_can('edit_post', $post_id)) {
        return;
    }

    $from_post = [];
    if (isset($_POST['hcsw_swatches_json'])) {
        $decoded = json_decode(wp_unslash($_POST['hcsw_swatches_json']), true);
        if (is_array($decoded)) {
            $from_post = hcsw_normalize_swatches($decoded);
        }
    }

    hcsw_persist_swatches_for_product((int) $post_id, $from_post);
}, 20, 1);

/** 商品更新後再同步一次（確保屬性已寫入） */
add_action('woocommerce_update_product', function ($product_id) {
    if (!current_user_can('edit_post', $product_id)) {
        return;
    }
    hcsw_persist_swatches_for_product((int) $product_id);
}, 99);

/** WooCommerce「儲存屬性」AJAX 時一併寫入色票 meta */
add_action('wp_ajax_woocommerce_save_attributes', function () {
    if (!current_user_can('edit_products')) {
        return;
    }

    $product_id = isset($_POST['post_id']) ? absint($_POST['post_id']) : 0;
    if (!$product_id) {
        return;
    }

    $from_post = [];
    if (isset($_POST['hcsw_swatches_json'])) {
        $decoded = json_decode(wp_unslash($_POST['hcsw_swatches_json']), true);
        if (is_array($decoded)) {
            $from_post = hcsw_normalize_swatches($decoded);
        }
    }

    hcsw_persist_swatches_for_product($product_id, $from_post);
}, 99);

/** REST API */
add_filter('woocommerce_rest_prepare_product_object', function ($response, $object, $request) {
    if (!is_object($response) || !method_exists($object, 'get_id')) {
        return $response;
    }

    $data = $response->get_data();
    $data['hover_color_swatches'] = hcsw_get_resolved_swatches_for_product((int) $object->get_id());
    $response->set_data($data);
    return $response;
}, 10, 3);

add_action('init', function () {
    register_post_meta('product', HCSW_META, [
        'type'              => 'string',
        'single'            => true,
        'show_in_rest'      => true,
        'sanitize_callback' => function ($value) {
            if (is_array($value)) {
                return wp_json_encode(hcsw_normalize_swatches($value), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
            }
            return is_string($value) ? $value : '';
        },
        'auth_callback'     => function () {
            return current_user_can('edit_products');
        },
    ]);
});

/** 商品編輯頁：屬性列插入色票容器 */
add_action('woocommerce_after_product_attribute_settings', function ($attribute, $i) {
    global $thepostid;
    $product_id = absint($thepostid);
    $is_color = hcsw_is_color_attribute_name($attribute->get_name());
    $payload = $is_color && $product_id
        ? hcsw_get_attribute_color_payload($attribute, $product_id)
        : ['labels' => [], 'swatches' => []];
    $payload_json = wp_json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

    echo '<tr class="form-field hcs-builder-row" data-hcs-is-color="' . ($is_color ? '1' : '0') . '">';
    echo '<th><label class="hcs-th-label">顏色色票</label></th><td colspan="2">';
    echo '<div class="hcs-color-builder-slot" data-attr-index="' . esc_attr((string) $i) . '" data-initial="' . esc_attr($payload_json ?: '{"labels":[],"swatches":{}}') . '"></div>';
    echo '</td></tr>';
}, 10, 2);

/** 商品編輯頁：屬性分頁 UI */
add_action('admin_footer', 'hcsw_admin_footer_script');

function hcsw_admin_footer_script(): void
{
    $screen = function_exists('get_current_screen') ? get_current_screen() : null;
    if (!$screen || $screen->post_type !== 'product' || !in_array($screen->base, ['post'], true)) {
        return;
    }

    $product_id = isset($_GET['post']) ? (int) $_GET['post'] : 0;
    $saved = $product_id ? hcsw_get_product_swatches($product_id) : [];
    $term_colors = [];

    foreach (['pa_color', 'pa_顏色'] as $taxonomy) {
        if (!taxonomy_exists($taxonomy)) {
            continue;
        }
        $terms = get_terms(['taxonomy' => $taxonomy, 'hide_empty' => false]);
        if (is_wp_error($terms)) {
            continue;
        }
        foreach ($terms as $term) {
            $hex = get_term_meta($term->term_id, HCSW_TERM_META, true);
            $term_colors[$term->name] = is_string($hex) && $hex !== ''
                ? hcsw_sanitize_hex($hex, hcsw_guess_hex($term->name))
                : hcsw_guess_hex($term->name);
        }
    }

    $saved_json = wp_json_encode($saved, JSON_UNESCAPED_UNICODE);
    $term_json = wp_json_encode($term_colors, JSON_UNESCAPED_UNICODE);
    $defaults_json = wp_json_encode(hcsw_default_hex_map(), JSON_UNESCAPED_UNICODE);
    ?>
    <script>
    window.HCSW_INIT = <?php echo $saved_json ?: '{}'; ?>;
    window.HCSW_TERM_COLORS = <?php echo $term_json ?: '{}'; ?>;
    window.HCSW_DEFAULTS = <?php echo $defaults_json ?: '{}'; ?>;
    </script>
    <script>
    <?php echo hcsw_admin_js(); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
    </script>
    <?php
}

function hcsw_admin_js(): string
{
    return <<<'JS'
(function($){
    var saved = window.HCSW_INIT || {};
    var termColors = window.HCSW_TERM_COLORS || {};
    var defaults = window.HCSW_DEFAULTS || {};
    var rowState = {};
    var isSyncingTextarea = false;

    function escHtml(value){
        return $('<div/>').text(value || '').html();
    }

    function isColorName(name){
        if (!name) return false;
        var raw = String(name).trim();
        var normalized = raw.toLowerCase().replace(/^pa_/, '');
        var list = ['顏色','颜色','color','colour','colors','色彩'];
        return list.indexOf(raw) !== -1 || list.indexOf(normalized) !== -1;
    }

    function guessHex(label){
        if (!label) return '#cccccc';
        if (/^#[0-9a-f]{3,8}$/i.test(label)) return label.toLowerCase();
        if (defaults[label]) return defaults[label];
        if (termColors[label]) return termColors[label];
        return '#cccccc';
    }

    function getAttrRow($node){
        return $node.closest('.woocommerce_attribute, .product_attribute');
    }

    function getAttrName($row){
        var $tax = $row.find('select.attribute_taxonomy');
        if ($tax.length) {
            var selected = $tax.find('option:selected');
            var text = $.trim(selected.text());
            var val = $.trim(selected.val() || '');
            if (text && text !== 'Custom product attribute') return text;
            if (val) return val.replace(/^pa_/, '');
        }
        var custom = $.trim($row.find('input.attribute_name').val() || '');
        if (custom) return custom;
        var heading = $.trim($row.find('h3 .attribute_name, h3 strong').first().text() || '');
        return heading;
    }

    function getValuesField($row){
        var $field = $row.find('textarea.attribute_values, textarea[name^="attribute_values"]').first();
        if ($field.length) return $field;
        return $row.find('.woocommerce_attribute_data textarea').first();
    }

    function readInitialPayload($slot){
        if (!$slot || !$slot.length) return { labels: [], swatches: {} };
        var raw = $slot.attr('data-initial') || '';
        if (!raw) return { labels: [], swatches: {} };
        try {
            var parsed = JSON.parse(raw);
            return {
                labels: Array.isArray(parsed.labels) ? parsed.labels : [],
                swatches: parsed.swatches && typeof parsed.swatches === 'object' ? parsed.swatches : {}
            };
        } catch (e) {
            return { labels: [], swatches: {} };
        }
    }

    function applyInitialPayload($slot){
        var payload = readInitialPayload($slot);
        Object.keys(payload.swatches || {}).forEach(function(label){
            saved[label] = payload.swatches[label];
        });
        return payload;
    }

    function getLabelsForBuilder($row, $builder){
        var $slot = $row.find('.hcs-color-builder-slot').first();
        var payload = applyInitialPayload($slot);
        if (payload.labels.length) return payload.labels;

        var fromTextarea = readLabelsFromRow($row);
        if (fromTextarea.length) return fromTextarea;

        var fromDom = collectLabels($builder);
        if (fromDom.length) return fromDom;

        return [''];
    }

    function getTaxonomySelect($row){
        return $row.find('select.attribute_values').first();
    }

    function parseTextValues(raw){
        return String(raw || '')
            .split('|')
            .map(function(v){ return $.trim(v); })
            .filter(Boolean);
    }

    function readLabelsFromRow($row){
        var $taxSelect = getTaxonomySelect($row);
        if ($taxSelect.length) {
            var vals = [];
            $taxSelect.find('option:selected').each(function(){
                vals.push($.trim($(this).text()));
            });
            return vals;
        }
        return parseTextValues(getValuesField($row).val());
    }

    function rowKey($row){
        var idx = $row.find('.hcs-color-builder-slot').data('attr-index');
        if (idx !== undefined && idx !== '') return 'idx-' + idx;
        return 'row-' + $row.index();
    }

    function ensureHiddenField(){
        if (!$('#hcs-swatches-json').length) {
            $('form#post').append('<input type="hidden" id="hcs-swatches-json" name="hcsw_swatches_json" value="">');
        }
    }

    function syncBuilder($builder){
        var $row = getAttrRow($builder);
        if (!$row.length) return;

        rebuildStateFromDom($builder);

        var labels = collectLabels($builder).filter(Boolean);
        if (!labels.length) {
            labels = readLabelsFromRow($row);
        }
        syncTextarea($row, labels);
        syncHidden();
        updateBuilderMeta($builder);
    }

    function syncAllBuilders(){
        ensureHiddenField();
        $('.hcs-color-builder.is-active').each(function(){
            syncBuilder($(this));
        });
        syncHidden();
    }

    function syncHidden(){
        var state = {};
        $('.hcs-color-builder.is-active').each(function(){
            var key = $(this).data('row-key');
            if (rowState[key]) {
                Object.keys(rowState[key]).forEach(function(label){
                    state[label] = rowState[key][label];
                });
            }
        });
        $('#hcs-swatches-json').val(JSON.stringify(state));
    }

    function syncTextarea($row, labels){
        var $textarea = getValuesField($row);
        if (!$textarea.length) return;
        var next = labels.join(' | ');
        if ($textarea.val() === next) return;
        isSyncingTextarea = true;
        $textarea.val(next);
        isSyncingTextarea = false;
    }

    function collectRowLabels($builder){
        var labels = [];
        $builder.find('.hcs-name-input').each(function(){
            labels.push($.trim($(this).val()));
        });
        return labels;
    }

    function labelsNeedRerender($builder, labels){
        var current = collectRowLabels($builder);
        if (current.length !== labels.length) return true;
        for (var i = 0; i < labels.length; i++) {
            if (current[i] !== labels[i]) return true;
        }
        return false;
    }

    function updateBuilderMeta($builder){
        var labels = collectLabels($builder).filter(Boolean);
        $builder.find('.hcs-count').text(labels.length + ' 個顏色');

        var previewHtml = '';
        $builder.find('.hcs-color-item').each(function(){
            var label = $.trim($(this).find('.hcs-name-input').val());
            var hex = $.trim($(this).find('.hcs-hex-input').val()) || $(this).find('.hcs-color-input').val();
            if (!label || !/^#[0-9a-f]{3,8}$/i.test(hex)) return;
            previewHtml += '<span class="hcs-preview-chip" title="'+escHtml(label)+'">';
            previewHtml += '<span class="hcs-preview-chip-color" style="background:'+escHtml(hex)+'"></span>';
            previewHtml += '<span class="hcs-preview-chip-label">'+escHtml(label)+'</span>';
            previewHtml += '</span>';
        });

        var $preview = $builder.find('.hcs-storefront-swatches');
        if (!previewHtml) {
            $preview.html('<span class="hcs-preview-empty">新增顏色後，這裡會顯示前台色票預覽</span>');
        } else {
            $preview.html(previewHtml);
        }

        $builder.find('.hcs-color-item').each(function(){
            var label = $.trim($(this).find('.hcs-name-input').val()) || '未命名';
            var hex = $.trim($(this).find('.hcs-hex-input').val()) || $(this).find('.hcs-color-input').val() || '#cccccc';
            $(this).find('.hcs-row-preview-swatch').css('background', hex);
            $(this).find('.hcs-row-preview-label').text(label);
        });
    }

    function renderBuilderRows($builder, labels){
        var key = $builder.data('row-key');
        if (!rowState[key]) rowState[key] = {};

        var html = '';
        labels.forEach(function(label, index){
            var hex = rowState[key][label] || saved[label] || termColors[label] || guessHex(label);
            rowState[key][label] = hex;
            var displayLabel = label || '未命名';
            html += '<tr class="hcs-color-item" data-index="'+index+'">';
            html += '<td class="hcs-td-picker"><label class="hcs-swatch-btn" title="選擇色碼">';
            html += '<input type="color" class="hcs-color-input" value="'+escHtml(hex)+'">';
            html += '<span class="hcs-swatch-face" style="background:'+escHtml(hex)+'"></span>';
            html += '</label></td>';
            html += '<td class="hcs-td-name"><input type="text" class="regular-text hcs-name-input" value="'+escHtml(label)+'" placeholder="例如：黑色、軍綠"></td>';
            html += '<td class="hcs-td-hex"><input type="text" class="regular-text hcs-hex-input" value="'+escHtml(hex)+'" placeholder="#111111" spellcheck="false"></td>';
            html += '<td class="hcs-td-preview"><span class="hcs-row-preview"><span class="hcs-row-preview-swatch" style="background:'+escHtml(hex)+'"></span><span class="hcs-row-preview-label">'+escHtml(displayLabel)+'</span></span></td>';
            html += '<td class="hcs-td-action"><button type="button" class="button hcs-remove-color" title="刪除此顏色"><span class="dashicons dashicons-trash"></span></button></td>';
            html += '</tr>';
        });
        $builder.find('.hcs-color-grid').html(html);
        updateBuilderMeta($builder);
    }

    function collectLabels($builder){
        var labels = [];
        $builder.find('.hcs-name-input').each(function(){
            var label = $.trim($(this).val());
            if (label) labels.push(label);
        });
        return labels;
    }

    function rebuildStateFromDom($builder){
        var key = $builder.data('row-key');
        var next = {};
        $builder.find('.hcs-color-item').each(function(){
            var label = $.trim($(this).find('.hcs-name-input').val());
            var hex = $.trim($(this).find('.hcs-hex-input').val()) || $(this).find('.hcs-color-input').val();
            if (!label) return;
            if (!/^#[0-9a-f]{3,8}$/i.test(hex)) hex = guessHex(label);
            next[label] = hex.toLowerCase();
        });
        rowState[key] = next;
    }

    function mountBuilder($row, forceRerender){
        var name = getAttrName($row);
        var $slot = $row.find('.hcs-color-builder-slot').first();
        if (!$slot.length) {
            var $valuesRow = getValuesField($row).closest('tr');
            if ($valuesRow.length) {
                $valuesRow.after(
                    '<tr class="form-field hcs-builder-row" data-hcs-is-color="1"><th><label class="hcs-th-label">顏色色票</label></th><td colspan="2">' +
                        '<div class="hcs-color-builder-slot" data-initial=\'{"labels":[],"swatches":{}}\'></div>' +
                    '</td></tr>'
                );
                $slot = $row.find('.hcs-color-builder-slot').last();
            }
        }
        if (!$slot.length) return;

        var $builder = $slot.find('.hcs-color-builder');
        var isColor = isColorName(name) || $row.find('.hcs-builder-row').attr('data-hcs-is-color') === '1';
        var isNew = !$builder.length;

        if (isColor) {
            $row.find('.hcs-builder-row').show();
        } else {
            $row.find('.hcs-builder-row').hide();
        }

        if (!isColor) {
            if ($builder.length) {
                $builder.removeClass('is-active').hide();
            }
            getValuesField($row).closest('tr').removeClass('hcs-values-row-hidden').show();
            return;
        }

        if (isNew) {
            var initialData = $slot.attr('data-initial') || '';
            $slot.html(
                '<div class="hcs-color-builder is-active hover-cs-admin">' +
                    '<div class="hcs-card">' +
                        '<div class="hcs-card-head">' +
                            '<div class="hcs-brand">HOVER</div>' +
                            '<div class="hcs-card-copy">' +
                                '<strong>顏色色票設定</strong>' +
                                '<span>在下方新增顏色與色碼，系統會自動寫入 WooCommerce 屬性數值；請先按「儲存屬性」再更新商品。</span>' +
                            '</div>' +
                        '</div>' +
                        '<div class="hcs-toolbar">' +
                            '<button type="button" class="button button-primary hcs-add-color"><span class="dashicons dashicons-plus-alt2"></span>新增顏色</button>' +
                            '<span class="hcs-count">0 個顏色</span>' +
                        '</div>' +
                        '<div class="hcs-table-wrap">' +
                            '<table class="widefat striped hcs-table">' +
                                '<thead><tr>' +
                                    '<th class="hcs-th-picker">色票</th>' +
                                    '<th>顏色名稱</th>' +
                                    '<th class="hcs-th-hex">色碼</th>' +
                                    '<th class="hcs-th-preview">列預覽</th>' +
                                    '<th class="hcs-th-action"></th>' +
                                '</tr></thead>' +
                                '<tbody class="hcs-color-grid"></tbody>' +
                            '</table>' +
                        '</div>' +
                        '<div class="hcs-storefront-preview">' +
                            '<div class="hcs-storefront-label">前台預覽</div>' +
                            '<div class="hcs-storefront-swatches"><span class="hcs-preview-empty">新增顏色後，這裡會顯示前台色票預覽</span></div>' +
                        '</div>' +
                    '</div>' +
                '</div>'
            );
            if (initialData) {
                $slot.attr('data-initial', initialData);
            }
            $builder = $slot.find('.hcs-color-builder');
        } else {
            $builder.addClass('is-active').show();
        }

        $builder.data('row-key', rowKey($row));
        getValuesField($row).closest('tr').addClass('hcs-values-row-hidden');

        applyInitialPayload($slot);
        var labels = getLabelsForBuilder($row, $builder);

        if (isNew || forceRerender || !$builder.find('.hcs-color-item').length || labelsNeedRerender($builder, labels)) {
            renderBuilderRows($builder, labels);
            syncTextarea($row, labels.filter(Boolean));
        } else {
            updateBuilderMeta($builder);
        }
        syncHidden();
    }

    function refreshAll(forceRerender){
        ensureHiddenField();
        $('.product_attributes .woocommerce_attribute, #product_attributes .woocommerce_attribute').each(function(){
            mountBuilder($(this), !!forceRerender);
        });
        syncHidden();
    }

    $(document).on('click', '.hcs-add-color', function(){
        var $builder = $(this).closest('.hcs-color-builder');
        var $row = getAttrRow($builder);
        rebuildStateFromDom($builder);
        var labels = collectLabels($builder);
        labels.push('');
        renderBuilderRows($builder, labels);
        $builder.find('.hcs-name-input').last().focus();
        syncTextarea($row, collectLabels($builder).filter(Boolean));
        syncHidden();
    });

    $(document).on('click', '.hcs-remove-color', function(){
        var $builder = $(this).closest('.hcs-color-builder');
        var $row = getAttrRow($builder);
        $(this).closest('.hcs-color-item').remove();
        rebuildStateFromDom($builder);
        var labels = collectLabels($builder).filter(Boolean);
        if (!labels.length) labels = [''];
        renderBuilderRows($builder, labels);
        syncTextarea($row, collectLabels($builder).filter(Boolean));
        syncHidden();
    });

    $(document).on('input change', '.hcs-name-input, .hcs-color-input, .hcs-hex-input', function(){
        var $item = $(this).closest('.hcs-color-item');
        var $builder = $(this).closest('.hcs-color-builder');
        var $row = getAttrRow($builder);

        if ($(this).hasClass('hcs-color-input')) {
            var hex = $(this).val();
            $item.find('.hcs-hex-input').val(hex);
            $item.find('.hcs-swatch-face').css('background', hex);
        }

        if ($(this).hasClass('hcs-hex-input')) {
            var manual = $(this).val();
            if (/^#[0-9a-f]{3,8}$/i.test(manual)) {
                $item.find('.hcs-color-input').val(manual);
                $item.find('.hcs-swatch-face').css('background', manual);
            }
        }

        rebuildStateFromDom($builder);
        syncTextarea($row, collectLabels($builder).filter(Boolean));
        updateBuilderMeta($builder);
        syncHidden();
    });

    $(document).on('input change', 'input.attribute_name, select.attribute_taxonomy, select.attribute_values', function(){
        if (isSyncingTextarea) return;
        var $row = getAttrRow($(this));
        setTimeout(function(){ mountBuilder($row, false); }, 30);
    });

    $('#product_attributes')
        .on('woocommerce_added_attribute woocommerce_removed_attribute', function(){
            setTimeout(function(){ refreshAll(true); }, 80);
        });

    $('form#post').on('submit', function(){
        syncAllBuilders();
    });

    $(document).on('click', '#product_attributes button.save_attributes', function(){
        syncAllBuilders();
    });

    $(document).ajaxSend(function(_event, _xhr, settings){
        var data = settings && settings.data ? settings.data : '';
        if (typeof data !== 'string' || data.indexOf('action=woocommerce_save_attributes') === -1) {
            return;
        }
        syncAllBuilders();
        var json = $('#hcs-swatches-json').val() || '{}';
        settings.data += '&hcsw_swatches_json=' + encodeURIComponent(json);
    });

    $(document).ajaxSuccess(function(_event, xhr, settings){
        var data = settings && settings.data ? settings.data : '';
        if (typeof data !== 'string' || data.indexOf('action=woocommerce_save_attributes') === -1) {
            return;
        }
        setTimeout(function(){ refreshAll(true); }, 200);
    });

    $(document).on('click', 'a.attribute_tab, #product_attributes .expand_all', function(){
        setTimeout(function(){ refreshAll(true); }, 120);
    });

    $(document).ready(function(){
        refreshAll(true);
        setTimeout(function(){ refreshAll(true); }, 300);
    });

    if (window.MutationObserver) {
        var target = document.querySelector('#product_attributes .product_attributes');
        if (target) {
            var timer = null;
            new MutationObserver(function(mutations){
                var shouldRefresh = false;
                mutations.forEach(function(mutation){
                    if (mutation.type !== 'childList' || !mutation.addedNodes.length) return;
                    $(mutation.addedNodes).each(function(){
                        if (this.nodeType !== 1) return;
                        var $node = $(this);
                        if ($node.closest('.hcs-color-builder, .hover-cs-admin').length) return;
                        if ($node.hasClass('woocommerce_attribute') || $node.find('.woocommerce_attribute').length) {
                            shouldRefresh = true;
                        }
                    });
                });
                if (!shouldRefresh) return;
                clearTimeout(timer);
                timer = setTimeout(function(){ refreshAll(true); }, 120);
            }).observe(target, { childList: true, subtree: false });
        }
    }
})(jQuery);
JS;
}

add_action('admin_head', function () {
    $screen = function_exists('get_current_screen') ? get_current_screen() : null;
    if (!$screen || $screen->post_type !== 'product') {
        return;
    }
    ?>
    <style>
        .hcs-builder-row { display: none; }
        tr.hcs-values-row-hidden {
            position: absolute !important;
            left: -9999px !important;
            width: 1px !important;
            height: 1px !important;
            overflow: hidden !important;
            opacity: 0 !important;
            pointer-events: none !important;
        }
        .hcs-builder-row > th {
            vertical-align: top;
            padding-top: 18px !important;
            width: 120px;
        }
        .hcs-th-label {
            font-weight: 600;
            color: #1d2327;
        }

        .hover-cs-admin {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
            color: #1d2327;
        }
        .hover-cs-admin .hcs-card {
            border: 1px solid #dcdcde;
            border-radius: 10px;
            background: linear-gradient(180deg, #fafbfc 0%, #fff 100%);
            overflow: hidden;
            box-shadow: 0 1px 2px rgba(0,0,0,.04);
        }
        .hover-cs-admin .hcs-card-head {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 14px 16px;
            border-bottom: 1px solid #e8e8e8;
            background: #fff;
        }
        .hover-cs-admin .hcs-brand {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            min-width: 58px;
            height: 28px;
            padding: 0 10px;
            border-radius: 999px;
            background: #2a514d;
            color: #fff;
            font-size: 10px;
            font-weight: 700;
            letter-spacing: .16em;
        }
        .hover-cs-admin .hcs-card-copy {
            display: flex;
            flex-direction: column;
            gap: 2px;
        }
        .hover-cs-admin .hcs-card-copy strong {
            font-size: 13px;
            font-weight: 700;
            color: #1d2327;
        }
        .hover-cs-admin .hcs-card-copy span {
            font-size: 12px;
            color: #646970;
            line-height: 1.5;
        }

        .hover-cs-admin .hcs-toolbar {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            padding: 12px 16px;
            border-bottom: 1px solid #eef0f2;
            background: #f6f7f7;
        }
        .hover-cs-admin .hcs-add-color {
            display: inline-flex !important;
            align-items: center;
            gap: 4px;
            background: #2a514d !important;
            border-color: #2a514d !important;
            box-shadow: none !important;
        }
        .hover-cs-admin .hcs-add-color:hover {
            background: #234641 !important;
            border-color: #234641 !important;
        }
        .hover-cs-admin .hcs-add-color .dashicons {
            font-size: 16px;
            width: 16px;
            height: 16px;
            line-height: 16px;
        }
        .hover-cs-admin .hcs-count {
            font-size: 12px;
            font-weight: 600;
            color: #646970;
            background: #fff;
            border: 1px solid #dcdcde;
            border-radius: 999px;
            padding: 4px 10px;
        }

        .hover-cs-admin .hcs-table-wrap {
            padding: 0 16px 12px;
            background: #fff;
        }
        .hover-cs-admin .hcs-table {
            margin: 12px 0 0;
            border: 1px solid #dcdcde;
            border-radius: 8px;
            overflow: hidden;
            border-collapse: separate;
            border-spacing: 0;
        }
        .hover-cs-admin .hcs-table thead th {
            background: #f6f7f7;
            font-size: 11px;
            font-weight: 700;
            letter-spacing: .04em;
            color: #50575e;
            padding: 10px 12px;
            border-bottom: 1px solid #dcdcde;
        }
        .hover-cs-admin .hcs-table tbody td {
            padding: 10px 12px;
            vertical-align: middle;
            background: #fff;
        }
        .hover-cs-admin .hcs-table tbody tr + tr td {
            border-top: 1px solid #eef0f2;
        }
        .hover-cs-admin .hcs-th-picker,
        .hover-cs-admin .hcs-td-picker { width: 72px; text-align: center; }
        .hover-cs-admin .hcs-th-hex,
        .hover-cs-admin .hcs-td-hex { width: 110px; }
        .hover-cs-admin .hcs-th-preview,
        .hover-cs-admin .hcs-td-preview { width: 130px; }
        .hover-cs-admin .hcs-th-action,
        .hover-cs-admin .hcs-td-action { width: 52px; text-align: center; }

        .hover-cs-admin .hcs-swatch-btn {
            position: relative;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 40px;
            height: 40px;
            margin: 0;
            cursor: pointer;
            pointer-events: auto;
        }
        .hover-cs-admin .hcs-color-input {
            position: absolute;
            inset: 0;
            width: 100%;
            height: 100%;
            opacity: 0;
            cursor: pointer;
            border: 0;
            padding: 0;
            z-index: 2;
            pointer-events: auto;
        }
        .hover-cs-admin .hcs-swatch-face {
            width: 36px;
            height: 36px;
            border-radius: 8px;
            border: 1px solid rgba(0,0,0,.12);
            box-shadow: inset 0 0 0 1px rgba(255,255,255,.28);
            pointer-events: none;
            transition: transform .15s ease, box-shadow .15s ease;
            position: relative;
            z-index: 1;
        }
        .hover-cs-admin .hcs-swatch-btn:hover .hcs-swatch-face {
            transform: scale(1.04);
            box-shadow: 0 0 0 2px #2a514d33, inset 0 0 0 1px rgba(255,255,255,.28);
        }

        .hover-cs-admin .hcs-name-input,
        .hover-cs-admin .hcs-hex-input {
            width: 100%;
            min-width: 0;
            margin: 0;
            font-size: 13px;
            pointer-events: auto;
            position: relative;
            z-index: 1;
        }
        .hover-cs-admin .hcs-color-builder,
        .hover-cs-admin .hcs-card,
        .hover-cs-admin .hcs-table-wrap,
        .hover-cs-admin .hcs-color-item {
            pointer-events: auto;
        }
        .hover-cs-admin .hcs-hex-input {
            font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
            text-transform: lowercase;
        }

        .hover-cs-admin .hcs-row-preview {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            min-height: 28px;
        }
        .hover-cs-admin .hcs-row-preview-swatch {
            width: 22px;
            height: 22px;
            border-radius: 4px;
            border: 1px solid rgba(0,0,0,.12);
            flex-shrink: 0;
        }
        .hover-cs-admin .hcs-row-preview-label {
            font-size: 12px;
            color: #50575e;
            white-space: nowrap;
        }

        .hover-cs-admin .hcs-remove-color {
            display: inline-flex !important;
            align-items: center;
            justify-content: center;
            width: 32px;
            min-height: 32px;
            padding: 0 !important;
            border-color: #f0c8c8 !important;
            background: #fff !important;
            color: #b32d2e !important;
            box-shadow: none !important;
        }
        .hover-cs-admin .hcs-remove-color:hover {
            background: #fcf0f0 !important;
            border-color: #e0aaaa !important;
        }
        .hover-cs-admin .hcs-remove-color .dashicons {
            font-size: 16px;
            width: 16px;
            height: 16px;
            line-height: 16px;
        }

        .hover-cs-admin .hcs-storefront-preview {
            padding: 12px 16px 16px;
            border-top: 1px solid #eef0f2;
            background: #fafbfc;
        }
        .hover-cs-admin .hcs-storefront-label {
            font-size: 11px;
            font-weight: 700;
            letter-spacing: .08em;
            color: #646970;
            margin-bottom: 10px;
            text-transform: uppercase;
        }
        .hover-cs-admin .hcs-storefront-swatches {
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
            align-items: center;
            min-height: 36px;
        }
        .hover-cs-admin .hcs-preview-chip {
            display: inline-flex;
            flex-direction: column;
            align-items: center;
            gap: 6px;
            min-width: 42px;
        }
        .hover-cs-admin .hcs-preview-chip-color {
            width: 35px;
            height: 35px;
            border: 1px solid #ccc;
            box-shadow: inset 0 0 0 1px rgba(255,255,255,.35);
        }
        .hover-cs-admin .hcs-preview-chip-label {
            font-size: 10px;
            color: #50575e;
            line-height: 1;
        }
        .hover-cs-admin .hcs-preview-empty {
            font-size: 12px;
            color: #8c8f94;
            font-style: italic;
        }

        @media (max-width: 960px) {
            .hover-cs-admin .hcs-table-wrap {
                overflow-x: auto;
            }
            .hover-cs-admin .hcs-table {
                min-width: 620px;
            }
        }
    </style>
    <?php
});
