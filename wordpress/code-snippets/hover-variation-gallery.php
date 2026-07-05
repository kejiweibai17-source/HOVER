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
    if (is_string($raw) && $raw !== '') {
        $decoded = json_decode($raw, true);
        if (is_array($decoded)) {
            $raw = $decoded;
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
    $json = wp_json_encode($ids, JSON_UNESCAPED_UNICODE);
    ?>
    <div class="hcvg-variation-panel" data-loop="<?php echo esc_attr((string) $loop); ?>">
        <p class="form-row form-row-full">
            <label>HOVER 變體圖庫 <span class="description">（可多張，前台選此顏色時會切換圖庫）</span></label>
            <input type="hidden" class="hcvg-gallery-ids" name="hover_variation_gallery[<?php echo esc_attr((string) $loop); ?>]" value="<?php echo esc_attr($json ?: '[]'); ?>">
            <div class="hcvg-gallery-list">
                <?php foreach ($images as $image) : ?>
                    <div class="hcvg-gallery-item" data-id="<?php echo esc_attr((string) $image['id']); ?>">
                        <img src="<?php echo esc_url($image['src']); ?>" alt="">
                        <button type="button" class="hcvg-remove-image" aria-label="移除圖片">×</button>
                    </div>
                <?php endforeach; ?>
            </div>
            <button type="button" class="button hcvg-add-images">新增圖片</button>
            <button type="button" class="button hcvg-copy-same-color">套用到相同顏色變體</button>
        </p>
    </div>
    <?php
}, 10, 3);

/** 儲存變體 */
add_action('woocommerce_save_product_variation', function ($variation_id, $loop) {
    if (!current_user_can('edit_post', $variation_id)) {
        return;
    }
    if (!isset($_POST['hover_variation_gallery'][$loop])) {
        return;
    }
    $ids = hcvg_normalize_ids(wp_unslash($_POST['hover_variation_gallery'][$loop]));
    update_post_meta($variation_id, HCVG_META, $ids);
}, 10, 2);

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

add_action('init', function () {
    register_post_meta('product_variation', HCVG_META, [
        'type'              => 'string',
        'single'            => true,
        'show_in_rest'      => true,
        'auth_callback'     => function () {
            return current_user_can('edit_products');
        },
    ]);
});

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
    wp_register_script('hcvg-admin', false, ['jquery'], '1.0.0', true);
    wp_enqueue_script('hcvg-admin');
    wp_add_inline_script('hcvg-admin', hcvg_admin_js());
});

function hcvg_admin_js(): string
{
    return <<<'JS'
jQuery(function($){
    function getPanel($btn){
        return $btn.closest('.hcvg-variation-panel');
    }

    function readIds($panel){
        try {
            return JSON.parse($panel.find('.hcvg-gallery-ids').val() || '[]') || [];
        } catch (e) {
            return [];
        }
    }

    function writeIds($panel, ids){
        $panel.find('.hcvg-gallery-ids').val(JSON.stringify(ids));
    }

    function renderList($panel, attachments){
        var $list = $panel.find('.hcvg-gallery-list').empty();
        attachments.forEach(function(item){
            var html = '<div class="hcvg-gallery-item" data-id="'+item.id+'">';
            html += '<img src="'+item.url+'" alt="">';
            html += '<button type="button" class="hcvg-remove-image" aria-label="移除圖片">×</button>';
            html += '</div>';
            $list.append(html);
        });
        writeIds($panel, attachments.map(function(a){ return a.id; }));
    }

    $(document).on('click', '.hcvg-add-images', function(e){
        e.preventDefault();
        var $panel = getPanel($(this));
        var current = readIds($panel);
        var frame = wp.media({
            title: '選擇變體圖庫圖片',
            button: { text: '加入圖庫' },
            multiple: true,
            library: { type: 'image' }
        });
        frame.on('open', function(){
            var selection = frame.state().get('selection');
            current.forEach(function(id){
                var att = wp.media.attachment(id);
                att.fetch();
                selection.add(att);
            });
        });
        frame.on('select', function(){
            var attachments = frame.state().get('selection').toJSON().map(function(att){
                return { id: att.id, url: att.sizes && att.sizes.thumbnail ? att.sizes.thumbnail.url : att.url };
            });
            renderList($panel, attachments);
        });
        frame.open();
    });

    $(document).on('click', '.hcvg-remove-image', function(e){
        e.preventDefault();
        var $panel = getPanel($(this));
        var id = parseInt($(this).closest('.hcvg-gallery-item').data('id'), 10);
        var ids = readIds($panel).filter(function(v){ return v !== id; });
        var attachments = [];
        $panel.find('.hcvg-gallery-item').each(function(){
            var itemId = parseInt($(this).data('id'), 10);
            if (itemId === id) return;
            attachments.push({ id: itemId, url: $(this).find('img').attr('src') });
        });
        renderList($panel, attachments);
    });

    $(document).on('click', '.hcvg-copy-same-color', function(e){
        e.preventDefault();
        var $panel = getPanel($(this));
        var $row = $panel.closest('.woocommerce_variation');
        var colorVal = '';
        $row.find('select[name^="attribute_"] option:selected').each(function(){
            var txt = $.trim($(this).text());
            if (txt) colorVal = txt;
        });
        if (!colorVal) {
            alert('找不到此變體的顏色屬性，無法套用。');
            return;
        }
        var ids = readIds($panel);
        if (!ids.length) {
            alert('請先在此變體新增圖片。');
            return;
        }
        var copied = 0;
        $('#variable_product_options .woocommerce_variation').each(function(){
            var $targetPanel = $(this).find('.hcvg-variation-panel');
            if (!$targetPanel.length) return;
            var match = false;
            $(this).find('select[name^="attribute_"] option:selected').each(function(){
                if ($.trim($(this).text()) === colorVal) match = true;
            });
            if (!match) return;
            $targetPanel.find('.hcvg-gallery-ids').val(JSON.stringify(ids));
            var html = '';
            $panel.find('.hcvg-gallery-item').each(function(){
                html += $('<div>').append($(this).clone()).html();
            });
            $targetPanel.find('.hcvg-gallery-list').html(html);
            copied++;
        });
        alert('已套用到 ' + copied + ' 個「' + colorVal + '」變體。請記得儲存變化類型。');
    });
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
