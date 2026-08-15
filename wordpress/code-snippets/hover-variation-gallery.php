<?php
/**
 * HOVER — 變體商品多圖圖庫（Variation Gallery）
 *
 * 使用方式（WordPress 後台）：
 * 1. Code Snippets → 貼上本檔 → Run: Everywhere
 * 2. 可變商品 → 變化類型 → 展開任一變體（例如 軍綠）
 * 3. 在「HOVER 變體圖庫」新增多張圖片
 *
 * Meta key（每個變體）：hover_variation_gallery（attachment ID 陣列）
 * REST：variation 含 hover_variation_gallery；商品含 hover_color_galleries
 */

if (!defined('ABSPATH')) {
    exit;
}

if (defined('HCVG_LOADED')) {
    return;
}
define('HCVG_LOADED', true);

const HCVG_META = 'hover_variation_gallery';

function hcvg_is_color_attribute_name(string $name): bool
{
    $raw = trim($name);
    $normalized = strtolower(preg_replace('/^pa_/', '', $raw));
    $candidates = ['顏色', '颜色', 'color', 'colour', 'colors', '色彩'];
    return in_array($raw, $candidates, true) || in_array($normalized, $candidates, true);
}

function hcvg_normalize_ids($raw): array
{
    if (is_string($raw)) {
        $raw = trim(wp_unslash($raw));
        if ($raw === '') {
            return [];
        }
        if (str_starts_with($raw, '[')) {
            $decoded = json_decode($raw, true);
            $raw = is_array($decoded) ? $decoded : explode(',', $raw);
        } else {
            $raw = explode(',', $raw);
        }
    }
    if (!is_array($raw)) {
        return [];
    }
    $ids = [];
    foreach ($raw as $id) {
        $id = absint($id);
        if ($id > 0) {
            $ids[] = $id;
        }
    }
    return array_values(array_unique($ids));
}

function hcvg_ids_to_images(array $ids): array
{
    $out = [];
    foreach ($ids as $id) {
        $src = wp_get_attachment_image_url($id, 'full');
        if (!$src) {
            continue;
        }
        $out[] = [
            'id'  => $id,
            'src' => $src,
            'alt' => (string) get_post_meta($id, '_wp_attachment_image_alt', true),
        ];
    }
    return $out;
}

function hcvg_get_variation_gallery_ids(int $variation_id): array
{
    $raw = get_post_meta($variation_id, HCVG_META, true);
    return hcvg_normalize_ids($raw);
}

function hcvg_resolve_attribute_display_value(string $key, string $value): string
{
    $value = sanitize_text_field((string) urldecode($value));
    if ($value === '') {
        return '';
    }
    if (taxonomy_exists($key) && $value !== '') {
        $term_obj = get_term_by('slug', $value, $key);
        if ($term_obj && !is_wp_error($term_obj)) {
            return sanitize_text_field($term_obj->name);
        }
    }
    return $value;
}

function hcvg_get_variation_color(WC_Product_Variation $variation): string
{
    foreach ($variation->get_attributes() as $key => $value) {
        if ($value === '' || $value === null) {
            continue;
        }
        $label = wc_attribute_label($key);
        if (hcvg_is_color_attribute_name((string) $label) || hcvg_is_color_attribute_name((string) $key)) {
            return hcvg_resolve_attribute_display_value((string) $key, (string) $value);
        }
    }

    $variation_id = (int) $variation->get_id();
    $metas = get_post_meta($variation_id);
    foreach ($metas as $meta_key => $meta_values) {
        if (!is_string($meta_key) || strpos($meta_key, 'attribute_') !== 0) {
            continue;
        }
        $attr_key = substr($meta_key, strlen('attribute_'));
        $value = is_array($meta_values) ? ($meta_values[0] ?? '') : $meta_values;
        if ($value === '' || $value === null) {
            continue;
        }
        $label = wc_attribute_label($attr_key);
        if (hcvg_is_color_attribute_name((string) $label) || hcvg_is_color_attribute_name((string) $attr_key)) {
            return hcvg_resolve_attribute_display_value((string) $attr_key, (string) $value);
        }
    }

    return '';
}

function hcvg_get_variation_ids_for_product(int $product_id): array
{
    $product = wc_get_product($product_id);
    if (!$product) {
        return [];
    }

    $ids = array_map('absint', (array) $product->get_children());
    $ids = array_values(array_filter($ids));

    if (!empty($ids)) {
        return $ids;
    }

    return array_map('absint', get_posts([
        'post_parent' => $product_id,
        'post_type'   => 'product_variation',
        'post_status' => ['publish', 'private'],
        'numberposts' => -1,
        'fields'      => 'ids',
    ]));
}

function hcvg_build_color_galleries_for_product(int $product_id): array
{
    $product = wc_get_product($product_id);
    if (!$product || !$product->is_type('variable')) {
        return [];
    }

    $galleries = [];
    foreach (hcvg_get_variation_ids_for_product($product_id) as $variation_id) {
        $variation = wc_get_product($variation_id);
        if (!$variation instanceof WC_Product_Variation) {
            continue;
        }

        $color = hcvg_get_variation_color($variation);
        if ($color === '') {
            continue;
        }

        $images = hcvg_ids_to_images(hcvg_get_variation_gallery_ids((int) $variation_id));
        if (empty($images)) {
            $thumb_id = $variation->get_image_id();
            if ($thumb_id) {
                $images = hcvg_ids_to_images([$thumb_id]);
            }
        }
        if (empty($images)) {
            continue;
        }

        if (!isset($galleries[$color]) || count($images) > count($galleries[$color])) {
            $galleries[$color] = $images;
        }
    }

    return $galleries;
}

/** 後台：變體欄位 */
add_action('woocommerce_product_after_variable_attributes', function ($loop, $variation_data, $variation) {
    $variation_id = $variation->ID ?? 0;
    $ids = $variation_id ? hcvg_get_variation_gallery_ids((int) $variation_id) : [];
    $images = hcvg_ids_to_images($ids);
    $csv = implode(',', $ids);
    ?>
    <div class="hcvg-variation-panel form-row form-row-full" data-loop="<?php echo esc_attr((string) $loop); ?>" data-variation-id="<?php echo esc_attr((string) $variation_id); ?>">
        <label>HOVER 變體圖庫 <span class="description">（可多張；點「新增圖片」會加在後面，不會蓋掉已選）</span></label>
        <input type="hidden" class="hcvg-gallery-ids" name="hcvg_gallery[<?php echo esc_attr((string) $variation_id); ?>]" value="<?php echo esc_attr($csv); ?>">
        <div class="hcvg-gallery-list">
            <?php foreach ($images as $image) : ?>
                <div class="hcvg-gallery-item" data-id="<?php echo esc_attr((string) $image['id']); ?>">
                    <img src="<?php echo esc_url($image['src']); ?>" alt="">
                    <button type="button" class="hcvg-remove-image" aria-label="移除圖片">×</button>
                </div>
            <?php endforeach; ?>
        </div>
        <button type="button" class="button hcvg-add-images">新增圖片</button>
        <p class="description" style="margin:8px 0 0">改完按「更新」即可。每個尺寸各自獨立，不會套到其他尺寸。</p>
    </div>
    <?php
}, 10, 3);

function hcvg_save_variation_gallery(int $variation_id, $raw): void
{
    if ($variation_id <= 0 || !current_user_can('edit_post', $variation_id)) {
        return;
    }
    update_post_meta($variation_id, HCVG_META, hcvg_normalize_ids($raw));
}

function hcvg_payload_from_post(): array
{
    if (empty($_POST['hcvg_payload'])) {
        return [];
    }
    $decoded = json_decode(wp_unslash((string) $_POST['hcvg_payload']), true);
    return is_array($decoded) ? $decoded : [];
}

/** 一次寫入目前頁面上所有變體圖庫（避免 loop 索引對錯、欄位被 disable 沒送出） */
add_action('woocommerce_ajax_save_product_variations', function ($product_id) {
    $payload = hcvg_payload_from_post();
    if ($payload) {
        foreach ($payload as $variation_id => $ids) {
            hcvg_save_variation_gallery((int) $variation_id, $ids);
        }
    } elseif (!empty($_POST['hcvg_gallery']) && is_array($_POST['hcvg_gallery'])) {
        foreach ($_POST['hcvg_gallery'] as $variation_id => $raw) {
            hcvg_save_variation_gallery((int) $variation_id, $raw);
        }
    }
}, 20);

/** 儲存單一變體（後備） */
add_action('woocommerce_save_product_variation', function ($variation_id, $loop) {
    $variation_id = (int) $variation_id;
    $payload = hcvg_payload_from_post();
    if (array_key_exists($variation_id, $payload) || array_key_exists((string) $variation_id, $payload)) {
        $raw = $payload[$variation_id] ?? $payload[(string) $variation_id];
        hcvg_save_variation_gallery($variation_id, $raw);
        return;
    }
    if (isset($_POST['hcvg_gallery'][$variation_id])) {
        hcvg_save_variation_gallery($variation_id, $_POST['hcvg_gallery'][$variation_id]);
        return;
    }
    if (isset($_POST['hover_variation_gallery'][$loop])) {
        hcvg_save_variation_gallery($variation_id, $_POST['hover_variation_gallery'][$loop]);
    }
}, 20, 2);

add_action('woocommerce_process_product_meta', function ($product_id) {
    $product = wc_get_product($product_id);
    if (!$product || !$product->is_type('variable')) {
        return;
    }
    $payload = hcvg_payload_from_post();
    if ($payload) {
        foreach ($payload as $variation_id => $ids) {
            hcvg_save_variation_gallery((int) $variation_id, $ids);
        }
    }
}, 30);

/** REST：變體 */
add_filter('woocommerce_rest_prepare_product_variation_object', function ($response, $object, $request) {
    if (!is_object($response) || !method_exists($object, 'get_id')) {
        return $response;
    }
    $data = $response->get_data();
    $data['hover_variation_gallery'] = hcvg_ids_to_images(hcvg_get_variation_gallery_ids((int) $object->get_id()));
    $response->set_data($data);
    return $response;
}, 10, 3);

/** REST：商品（依顏色彙總圖庫） */
add_filter('woocommerce_rest_prepare_product_object', function ($response, $object, $request) {
    if (!is_object($response) || !method_exists($object, 'get_id')) {
        return $response;
    }
    $data = $response->get_data();
    $data['hover_color_galleries'] = hcvg_build_color_galleries_for_product((int) $object->get_id());
    $response->set_data($data);
    return $response;
}, 12, 3);

/** 後台資源 */
add_action('admin_enqueue_scripts', function ($hook) {
    if (!in_array($hook, ['post.php', 'post-new.php'], true)) {
        return;
    }
    $screen = function_exists('get_current_screen') ? get_current_screen() : null;
    if (!$screen || $screen->post_type !== 'product') {
        return;
    }

    wp_enqueue_media();
    wp_register_script('hcvg-admin', false, ['jquery'], '1.6.0', true);
    wp_enqueue_script('hcvg-admin');
    wp_add_inline_script('hcvg-admin', hcvg_admin_js());
});

function hcvg_admin_js(): string
{
    return <<<'JS'
jQuery(function($){
    function getPanel($el){
        return $el.closest('.hcvg-variation-panel');
    }

    function idsFromDom($panel){
        var ids = [];
        $panel.find('.hcvg-gallery-item').each(function(){
            var id = parseInt($(this).attr('data-id'), 10);
            if (id > 0) ids.push(id);
        });
        return ids;
    }

    function ensurePayloadField(){
        var $wrap = $('#variable_product_options .woocommerce_variations');
        if (!$wrap.length) return $();
        var $field = $wrap.children('textarea.hcvg-payload');
        if (!$field.length) {
            $field = $('<textarea class="hcvg-payload" name="hcvg_payload" hidden></textarea>');
            $wrap.prepend($field);
        }
        return $field.prop('disabled', false);
    }

    function syncPayload(){
        var payload = {};
        $('.hcvg-variation-panel').each(function(){
            var $panel = $(this);
            var vid = parseInt($panel.attr('data-variation-id'), 10);
            if (!vid) {
                vid = parseInt($panel.closest('.woocommerce_variation').find('input[name^="variable_post_id"]').val(), 10);
            }
            if (!vid) return;
            var ids = idsFromDom($panel);
            payload[vid] = ids;
            $panel.find('.hcvg-gallery-ids').prop('disabled', false).val(ids.join(','));
        });
        ensurePayloadField().val(JSON.stringify(payload));
        return payload;
    }

    function markDirty($panel){
        var $row = $panel.closest('.woocommerce_variation');
        $row.addClass('variation-needs-update');
        $panel.find('.hcvg-gallery-ids').prop('disabled', false).trigger('change');
        $('#variable_product_options').trigger('woocommerce_variations_input_changed');
        $('button.save-variation-changes').prop('disabled', false).removeClass('disabled');
        $('button.cancel-variation-changes').prop('disabled', false).removeClass('disabled');
        syncPayload();
    }

    function renderList($panel, attachments){
        var $list = $panel.find('.hcvg-gallery-list').empty();
        attachments.forEach(function(item){
            if (!item || !item.id) return;
            var html = '<div class="hcvg-gallery-item" data-id="'+item.id+'">';
            html += '<img src="'+item.url+'" alt="">';
            html += '<button type="button" class="hcvg-remove-image" aria-label="移除圖片">×</button>';
            html += '</div>';
            $list.append(html);
        });
        markDirty($panel);
    }

    $(document).on('mousedown', 'button.save-variation-changes', function(){
        syncPayload();
    });

    $.ajaxPrefilter(function(options){
        if (!options || !options.data) return;
        var data = String(options.data);
        if (data.indexOf('action=woocommerce_save_variations') === -1) return;
        var payload = JSON.stringify(syncPayload());
        options.data += '&hcvg_payload=' + encodeURIComponent(payload);
    });

    $(document).on('click', '.hcvg-add-images', function(e){
        e.preventDefault();
        e.stopPropagation();
        var $panel = getPanel($(this));
        var existingIds = idsFromDom($panel);
        var existingMap = {};
        $panel.find('.hcvg-gallery-item').each(function(){
            existingMap[parseInt($(this).attr('data-id'), 10)] = $(this).find('img').attr('src');
        });
        var frame = wp.media({
            title: '選擇要加入的圖片（可複選；不會覆蓋已有圖片）',
            button: { text: '加入圖庫' },
            multiple: true,
            library: { type: 'image' }
        });
        frame.on('select', function(){
            var attachments = existingIds.map(function(id){
                return { id: id, url: existingMap[id] || '' };
            });
            frame.state().get('selection').toJSON().forEach(function(att){
                var id = parseInt(att.id, 10);
                if (!id || existingIds.indexOf(id) !== -1) return;
                existingIds.push(id);
                attachments.push({
                    id: id,
                    url: (att.sizes && att.sizes.thumbnail) ? att.sizes.thumbnail.url : att.url
                });
            });
            renderList($panel, attachments);
        });
        frame.open();
    });

    $(document).on('click', '.hcvg-remove-image', function(e){
        e.preventDefault();
        e.stopPropagation();
        var $panel = getPanel($(this));
        var id = parseInt($(this).closest('.hcvg-gallery-item').attr('data-id'), 10);
        var attachments = [];
        $panel.find('.hcvg-gallery-item').each(function(){
            var itemId = parseInt($(this).attr('data-id'), 10);
            if (itemId === id) return;
            attachments.push({ id: itemId, url: $(this).find('img').attr('src') });
        });
        renderList($panel, attachments);
    });

    document.addEventListener('click', function(e){
        var btn = e.target.closest('#publish, #save-post');
        if (!btn || btn.getAttribute('data-hcvg-ok') === '1') return;
        var saveVar = document.querySelector('#variable_product_options button.save-variation-changes');
        if (!saveVar || saveVar.disabled) return;
        e.preventDefault();
        e.stopPropagation();
        syncPayload();
        $(document).one('woocommerce_variations_saved', function(){
            btn.setAttribute('data-hcvg-ok', '1');
            btn.click();
        });
        saveVar.click();
    }, true);
});
JS;
}

add_action('admin_head', function () {
    $screen = function_exists('get_current_screen') ? get_current_screen() : null;
    if (!$screen || $screen->post_type !== 'product') {
        return;
    }
    ?>
    <style>
        .hcvg-variation-panel {
            margin: 10px 0 4px;
            padding: 12px 14px;
            border: 1px solid #dcdcde;
            border-radius: 8px;
            background: #fafafa;
        }
        .hcvg-variation-panel label {
            font-weight: 700;
            color: #1d2327;
            display: block;
            margin-bottom: 8px;
        }
        .hcvg-gallery-list {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            margin-bottom: 10px;
            min-height: 40px;
        }
        .hcvg-gallery-item {
            position: relative;
            width: 72px;
            height: 72px;
            border: 1px solid #c3c4c7;
            border-radius: 6px;
            overflow: hidden;
            background: #fff;
        }
        .hcvg-gallery-item img {
            width: 100%;
            height: 100%;
            object-fit: cover;
            display: block;
        }
        .hcvg-remove-image {
            position: absolute;
            top: 2px;
            right: 2px;
            width: 20px;
            height: 20px;
            border: 0;
            border-radius: 50%;
            background: rgba(0,0,0,.65);
            color: #fff;
            line-height: 18px;
            cursor: pointer;
            font-size: 14px;
        }
        .hcvg-variation-panel .button {
            margin-right: 8px;
            margin-top: 4px;
        }
    </style>
    <?php
});
