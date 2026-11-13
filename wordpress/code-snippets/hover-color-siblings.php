<?php
/**
 * HOVER — 同款多色獨立商品（顏色群組）
 *
 * 情境：同款不同顏色各自建立獨立商品頁，變體只保留該色尺寸 SKU。
 * 前台色票改為「跳轉到對應商品頁」，不再在同頁切換圖庫。
 *
 * 使用方式（WPCode / Code Snippets）：
 * 1. 新增 snippet，貼上本檔 → 儲存
 * 2. Run：Everywhere → 啟用
 * 3. 同款各色商品填入相同「顏色群組代碼」（例如 classic-embroidered-tshirt）
 * 4. 「本商品顏色」請填與「顏色色票設定」相同的完整名稱（可留空，會從顏色屬性推斷並對齊）
 *
 * Meta：
 *   hover_color_group   （字串，同款共用）
 *   hover_product_color （字串，此商品顏色名稱）
 *
 * REST（wc/v3/products）：
 *   hover_color_group
 *   hover_product_color
 *   hover_color_siblings[] → { id, slug, name, color, hex, image }
 */

if (!defined('ABSPATH')) {
    exit;
}

if (defined('HCCS_LOADED')) {
    return;
}
define('HCCS_LOADED', true);

const HCCS_GROUP_META = 'hover_color_group';
const HCCS_COLOR_META = 'hover_product_color';

if (!function_exists('hccs_guess_hex')) :
function hccs_guess_hex(string $label): string
{
    $key = trim($label);
    if ($key === '') {
        return '#cccccc';
    }
    // 優先走色票模組（支援「黑/白」雙色）
    if (function_exists('hcsw_guess_hex')) {
        return (string) hcsw_guess_hex($key);
    }
    if (preg_match('/[\/／]/u', $key)) {
        $parts = preg_split('/\s*[\/／]\s*/u', $key) ?: [];
        $parts = array_values(array_filter(array_map('trim', $parts)));
        $parts = array_slice($parts, 0, 2);
        if (count($parts) >= 2) {
            return hccs_guess_hex($parts[0]) . '/' . hccs_guess_hex($parts[1]);
        }
    }
    $map = [
        '黑' => '#111111', '黑色' => '#111111',
        '白' => '#ffffff', '白色' => '#ffffff',
        '紅' => '#b20000', '紅色' => '#b20000',
        '粉' => '#ffe0f4', '粉色' => '#ffe0f4', '粉紅' => '#ffe0f4',
        '藍' => '#9ab3d4', '藍色' => '#9ab3d4',
        '軍綠' => '#4a5d3f', '綠' => '#4a7c59', '綠色' => '#4a7c59',
        '米色' => '#e8dcc8', '米' => '#e8dcc8', '米白' => '#e8dfd0',
        '奶茶' => '#d2c0a8', '象牙' => '#d2c0a8', '象牙白' => '#d2c0a8', 'ivory' => '#d2c0a8',
        '卡其' => '#c4b896', '杏' => '#e8d5b7', '駝' => '#c19a6b',
        '灰' => '#888888', '灰色' => '#888888',
        '黃' => '#f5d547', '黃色' => '#f5d547',
        '橘' => '#e67e22', '橘色' => '#e67e22',
        '紫' => '#7b5ea7', '紫色' => '#7b5ea7',
        '棕' => '#8b5a2b', '棕色' => '#8b5a2b',
        '深藍' => '#1a3a5c', '海軍藍' => '#1a3a5c', '藏青' => '#1a2744',
    ];
    if (isset($map[$key])) {
        return $map[$key];
    }
    return '#cccccc';
}
endif;

if (!function_exists('hccs_resolve_hex')) :
function hccs_resolve_hex(string $label, int $product_id = 0): string
{
    $label = trim($label);
    if ($label === '') {
        return '#cccccc';
    }

    if ($product_id > 0 && function_exists('hcsw_get_resolved_swatches_for_product')) {
        $swatches = hcsw_get_resolved_swatches_for_product($product_id);
        if (is_array($swatches)) {
            $aligned = function_exists('hccs_align_color_label')
                ? hccs_align_color_label($label, array_map('strval', array_keys($swatches)))
                : $label;
            if ($aligned !== '' && !empty($swatches[$aligned])) {
                return (string) $swatches[$aligned];
            }
            if (!empty($swatches[$label])) {
                return (string) $swatches[$label];
            }
            foreach ($swatches as $key => $hex) {
                $key = trim((string) $key);
                if ($key === '') {
                    continue;
                }
                if (function_exists('mb_strtolower')) {
                    if (mb_strtolower($key) === mb_strtolower($label)) {
                        return (string) $hex;
                    }
                } elseif (strtolower($key) === strtolower($label)) {
                    return (string) $hex;
                }
            }
            // 同款分色商品通常只有一個顏色屬性；本商品顏色名稱若與屬性詞不一致，仍沿用該色票
            $values = array_values(array_filter(array_map('strval', $swatches)));
            if (count($values) === 1 && $values[0] !== '' && strtolower($values[0]) !== '#cccccc') {
                return $values[0];
            }
        }
    }

    if (function_exists('hcsw_resolve_term_hex')) {
        $hex = hcsw_resolve_term_hex($label);
        if (is_string($hex) && $hex !== '') {
            return $hex;
        }
    }

    if (taxonomy_exists('pa_color') || taxonomy_exists('pa_顏色')) {
        foreach (['pa_color', 'pa_顏色'] as $tax) {
            if (!taxonomy_exists($tax)) {
                continue;
            }
            $term = get_term_by('name', $label, $tax);
            if (!$term && function_exists('mb_strtolower')) {
                $terms = get_terms(['taxonomy' => $tax, 'hide_empty' => false]);
                if (!is_wp_error($terms)) {
                    foreach ($terms as $t) {
                        if (mb_strtolower($t->name) === mb_strtolower($label)) {
                            $term = $t;
                            break;
                        }
                    }
                }
            }
            if ($term && !is_wp_error($term)) {
                $hex = get_term_meta($term->term_id, 'hover_color_hex', true);
                if (is_string($hex) && preg_match('/^#([0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i', $hex)) {
                    return strtolower($hex);
                }
            }
        }
    }

    return hccs_guess_hex($label);
}
endif;

if (!function_exists('hccs_is_color_attr_name')) :
function hccs_is_color_attr_name(string $name): bool
{
    $norm = strtolower(preg_replace('/^pa_/', '', $name));
    return in_array($name, ['顏色', '颜色', 'color', 'colour', 'pa_color', 'pa_顏色'], true)
        || in_array($norm, ['color', 'colour', '顏色', '颜色'], true);
}
endif;

if (!function_exists('hccs_color_from_slug')) :
function hccs_color_from_slug(string $slug): string
{
    $slug = strtolower(trim($slug));
    $map = [
        'white' => '白',
        'whit'  => '白',
        'wh'    => '白',
        'black' => '黑',
        'bk'    => '黑',
        'red'   => '紅',
        'rd'    => '紅',
        'pink'  => '粉',
        'pk'    => '粉',
        'navy'  => '深藍',
        'nv'    => '深藍',
        'blue'  => '藍',
        'green' => '綠',
        'gr'    => '綠',
        'brown' => '棕',
        'br'    => '棕',
        'ivory' => '奶茶',
        'iv'    => '奶茶',
        'beige' => '奶茶',
        'gray'  => '灰',
        'grey'  => '灰',
    ];
    foreach ($map as $key => $label) {
        if (preg_match('/(?:^|[-_])' . preg_quote($key, '/') . '(?:$|[-_])/', $slug)) {
            return $label;
        }
    }
    return '';
}
endif;

if (!function_exists('hccs_get_product_color_options')) :
/** @return string[] 顏色屬性選項（以後台色票名稱為準） */
function hccs_get_product_color_options($product): array
{
    if (!$product || !is_object($product) || !method_exists($product, 'get_attributes')) {
        return [];
    }
    $options = [];
    foreach ($product->get_attributes() as $attribute) {
        if (!is_object($attribute) || !method_exists($attribute, 'get_name')) {
            continue;
        }
        if (!hccs_is_color_attr_name((string) $attribute->get_name())) {
            continue;
        }
        if (method_exists($attribute, 'is_taxonomy') && $attribute->is_taxonomy()) {
            foreach ((array) $attribute->get_options() as $term_id) {
                $term = get_term((int) $term_id);
                if ($term && !is_wp_error($term) && $term->name !== '') {
                    $options[] = (string) $term->name;
                }
            }
        } else {
            foreach ((array) $attribute->get_options() as $opt) {
                $opt = trim((string) $opt);
                if ($opt !== '') {
                    $options[] = $opt;
                }
            }
        }
    }
    return array_values(array_unique($options));
}
endif;

if (!function_exists('hccs_align_color_label')) :
/**
 * 短名對齊完整色票名（奶茶→淺奶茶、紅→酒紅）。
 *
 * @param string   $label
 * @param string[] $candidates
 */
function hccs_align_color_label(string $label, array $candidates): string
{
    $label = trim($label);
    if ($label === '' || !$candidates) {
        return $label;
    }
    if (in_array($label, $candidates, true)) {
        return $label;
    }
    $lower = function_exists('mb_strtolower') ? mb_strtolower($label) : strtolower($label);
    foreach ($candidates as $opt) {
        $opt = trim((string) $opt);
        if ($opt === '') {
            continue;
        }
        $opt_lower = function_exists('mb_strtolower') ? mb_strtolower($opt) : strtolower($opt);
        if ($opt_lower === $lower) {
            return $opt;
        }
    }
    $matches = [];
    foreach ($candidates as $opt) {
        $opt = trim((string) $opt);
        if ($opt === '') {
            continue;
        }
        if (
            (function_exists('mb_strpos') && (mb_strpos($opt, $label) !== false || mb_strpos($label, $opt) !== false))
            || (!function_exists('mb_strpos') && (strpos($opt, $label) !== false || strpos($label, $opt) !== false))
        ) {
            $matches[] = $opt;
        }
    }
    $matches = array_values(array_unique($matches));
    if (count($matches) === 1) {
        return $matches[0];
    }
    if (count($matches) > 1) {
        usort($matches, static function ($a, $b) {
            $la = function_exists('mb_strlen') ? mb_strlen($a) : strlen($a);
            $lb = function_exists('mb_strlen') ? mb_strlen($b) : strlen($b);
            if ($la === $lb) {
                return strcmp($a, $b);
            }
            return $lb <=> $la; // 最長優先：紅→酒紅
        });
        return $matches[0];
    }
    return $label;
}
endif;

if (!function_exists('hccs_infer_product_color')) :
function hccs_infer_product_color(int $product_id): string
{
    $saved = trim((string) get_post_meta($product_id, HCCS_COLOR_META, true));
    $product = function_exists('wc_get_product') ? wc_get_product($product_id) : null;
    if (!$product) {
        return $saved;
    }

    $options = hccs_get_product_color_options($product);

    // 1) 預設表單值的顏色（屬性完整名優先）
    foreach ((array) $product->get_default_attributes() as $attr_key => $option) {
        $option = trim((string) $option);
        if ($option === '') {
            continue;
        }
        $name = (string) $attr_key;
        if (strpos($name, 'attribute_') === 0) {
            $name = substr($name, strlen('attribute_'));
        }
        if (hccs_is_color_attr_name($name) || hccs_is_color_attr_name(urldecode($name))) {
            if (taxonomy_exists($name)) {
                $term = get_term_by('slug', $option, $name);
                if ($term && !is_wp_error($term)) {
                    return hccs_align_color_label($term->name, $options) ?: $term->name;
                }
            }
            return hccs_align_color_label($option, $options) ?: $option;
        }
    }

    // 2) 所有變體若共用同一顏色 → 用該色
    if ($product->is_type('variable')) {
        $shared = null;
        $children = $product->get_children();
        foreach ($children as $vid) {
            $variation = wc_get_product((int) $vid);
            if (!$variation) {
                continue;
            }
            $vcolor = '';
            foreach ($variation->get_attributes() as $akey => $aval) {
                $akey = (string) $akey;
                $aval = trim((string) $aval);
                if ($aval === '' || $aval === 'any') {
                    continue;
                }
                if (!hccs_is_color_attr_name($akey) && !hccs_is_color_attr_name(urldecode($akey))) {
                    continue;
                }
                if (taxonomy_exists($akey)) {
                    $term = get_term_by('slug', $aval, $akey);
                    $vcolor = ($term && !is_wp_error($term)) ? $term->name : $aval;
                } else {
                    $vcolor = $aval;
                }
                break;
            }
            if ($vcolor === '') {
                continue;
            }
            if ($shared === null) {
                $shared = $vcolor;
            } elseif ($shared !== $vcolor) {
                $shared = null;
                break;
            }
        }
        if (is_string($shared) && $shared !== '') {
            return hccs_align_color_label($shared, $options) ?: $shared;
        }
    }

    // 3) 屬性只剩單一顏色
    if (count($options) === 1) {
        return $options[0];
    }

    // 4) 「本商品顏色」短名對齊到色票完整名（奶茶→淺奶茶、紅→酒紅）
    if ($saved !== '') {
        return hccs_align_color_label($saved, $options) ?: $saved;
    }

    // 5) slug 後綴，同樣對齊
    $post = get_post($product_id);
    if ($post) {
        $from_slug = hccs_color_from_slug((string) $post->post_name);
        if ($from_slug !== '') {
            return hccs_align_color_label($from_slug, $options) ?: $from_slug;
        }
    }

    return '';
}
endif;

if (!function_exists('hccs_product_image_url')) :
function hccs_product_image_url(int $product_id): string
{
    $thumb_id = (int) get_post_thumbnail_id($product_id);
    if ($thumb_id > 0) {
        $url = wp_get_attachment_image_url($thumb_id, 'woocommerce_single');
        if (!$url) {
            $url = wp_get_attachment_image_url($thumb_id, 'full');
        }
        if (is_string($url) && $url !== '') {
            return $url;
        }
    }
    return '';
}
endif;

if (!function_exists('hccs_get_siblings')) :
function hccs_get_siblings(int $product_id): array
{
    $group = trim((string) get_post_meta($product_id, HCCS_GROUP_META, true));
    if ($group === '') {
        return [];
    }

    $q = new WP_Query([
        'post_type'              => 'product',
        'post_status'            => 'publish',
        'posts_per_page'         => 40,
        'fields'                 => 'ids',
        'no_found_rows'          => true,
        'update_post_meta_cache' => true,
        'update_post_term_cache' => false,
        'meta_query'             => [
            [
                'key'   => HCCS_GROUP_META,
                'value' => $group,
            ],
        ],
        'orderby'                => 'menu_order title',
        'order'                  => 'ASC',
    ]);

    $out = [];
    foreach ($q->posts as $pid) {
        $pid = (int) $pid;
        $post = get_post($pid);
        if (!$post) {
            continue;
        }
        $color = hccs_infer_product_color($pid);
        // 推斷失敗仍保留（避免漏掉白色商品），以色碼後備名稱佔位
        if ($color === '') {
            $color = hccs_color_from_slug((string) $post->post_name);
        }
        if ($color === '') {
            $color = '色' . $pid;
        }
        $out[] = [
            'id'    => $pid,
            'slug'  => $post->post_name,
            'name'  => get_the_title($pid),
            'color' => $color,
            'hex'   => hccs_resolve_hex($color, $pid),
            'image' => hccs_product_image_url($pid),
        ];
    }

    return $out;
}
endif;

/** 商品編輯頁 metabox */
add_action('add_meta_boxes', function () {
    add_meta_box(
        'hover_color_siblings',
        __('HOVER 同款顏色群組', 'hover'),
        'hccs_render_metabox',
        'product',
        'side',
        'default'
    );
});

if (!function_exists('hccs_render_metabox')) :
function hccs_render_metabox($post): void
{
    wp_nonce_field('hccs_save_meta', 'hccs_nonce');
    $group = (string) get_post_meta($post->ID, HCCS_GROUP_META, true);
    $color = (string) get_post_meta($post->ID, HCCS_COLOR_META, true);
    $inferred = hccs_infer_product_color((int) $post->ID);
    ?>
    <p style="margin:0 0 10px;">
        <label for="hover_color_group" style="font-weight:600;display:block;margin-bottom:4px;">
            <?php esc_html_e('顏色群組代碼', 'hover'); ?>
        </label>
        <input type="text" class="widefat" name="hover_color_group" id="hover_color_group"
               value="<?php echo esc_attr($group); ?>"
               placeholder="例：classic-embroidered-tshirt" />
        <span class="description" style="display:block;margin-top:4px;">
            <?php esc_html_e('同款各顏色商品填相同代碼，前台色票會互相跳轉。', 'hover'); ?>
        </span>
    </p>
    <p style="margin:0;">
        <label for="hover_product_color" style="font-weight:600;display:block;margin-bottom:4px;">
            <?php esc_html_e('本商品顏色', 'hover'); ?>
        </label>
        <input type="text" class="widefat" name="hover_product_color" id="hover_product_color"
               value="<?php echo esc_attr($color); ?>"
               placeholder="<?php echo esc_attr($inferred !== '' ? $inferred : '例：白'); ?>" />
        <span class="description" style="display:block;margin-top:4px;">
            <?php
            if ($inferred !== '' && $color === '') {
                printf(
                    /* translators: %s: inferred color label */
                    esc_html__('目前推斷：%s（可覆寫）', 'hover'),
                    esc_html($inferred)
                );
            } else {
                esc_html_e('請與「顏色色票設定」名稱完全一致（例如：淺奶茶／酒紅）。', 'hover');
            }
            ?>
        </span>
    </p>
    <?php
}
endif;

add_action('save_post_product', function ($post_id) {
    if (!isset($_POST['hccs_nonce']) || !wp_verify_nonce($_POST['hccs_nonce'], 'hccs_save_meta')) {
        return;
    }
    if (defined('DOING_AUTOSAVE') && DOING_AUTOSAVE) {
        return;
    }
    if (!current_user_can('edit_post', $post_id)) {
        return;
    }

    $group = isset($_POST['hover_color_group'])
        ? sanitize_text_field(wp_unslash($_POST['hover_color_group']))
        : '';
    $color = isset($_POST['hover_product_color'])
        ? sanitize_text_field(wp_unslash($_POST['hover_product_color']))
        : '';

    if ($group === '') {
        delete_post_meta($post_id, HCCS_GROUP_META);
    } else {
        update_post_meta($post_id, HCCS_GROUP_META, $group);
    }

    if ($color === '') {
        delete_post_meta($post_id, HCCS_COLOR_META);
    } else {
        update_post_meta($post_id, HCCS_COLOR_META, $color);
    }
}, 20);

/** REST：輸出群組與同款色票 */
add_filter('woocommerce_rest_prepare_product_object', function ($response, $object) {
    if (!($response instanceof WP_REST_Response)) {
        return $response;
    }
    $product_id = (int) $object->get_id();
    $group = trim((string) get_post_meta($product_id, HCCS_GROUP_META, true));
    $color = hccs_infer_product_color($product_id);
    $response->data['hover_color_group'] = $group;
    $response->data['hover_product_color'] = $color;
    $response->data['hover_color_siblings'] = $group !== '' ? hccs_get_siblings($product_id) : [];
    return $response;
}, 20, 2);
