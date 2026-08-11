<?php
/**
 * HOVER — 商品分類顯示開關（Navbar / Filter 分開）
 *
 * 使用方式（WordPress 後台）：
 * 1. Code Snippets → 找到既有「分類前台顯示」片段 → 整段覆蓋為本檔
 * 2. Run snippet：Everywhere → 啟用
 *    （不要新增第二則，否則會函式重複宣告）
 *
 * 後台位置：商品 → 分類 → 新增/編輯分類
 *
 * REST API（給 Next.js）：
 * GET /wp-json/wc/v3/products/categories
 * 每筆多欄位：
 *   hover_show_frontend (boolean) → Navbar／其他分類導覽
 *   hover_show_filter   (boolean) → Filter「商品類型」
 *
 * Meta：
 *   hover_show_frontend（預設顯示；1=顯示，0=隱藏）
 *   hover_show_filter  （預設顯示；1=顯示，0=隱藏）
 *
 * 可分別控制：例如 Navbar 取消勾選、Filter 維持勾選。
 */

if (!defined('ABSPATH')) {
    exit;
}

if (defined('HOVER_CAT_VIS_LOADED')) {
    return;
}
define('HOVER_CAT_VIS_LOADED', true);

const HOVER_CAT_VISIBLE_META = 'hover_show_frontend';
const HOVER_CAT_FILTER_META  = 'hover_show_filter';

if (!function_exists('hover_cat_is_visible')) {
    /**
     * 未設定 meta 時視為顯示；僅明確存 0 時隱藏
     *
     * @param mixed $value
     */
    function hover_cat_is_visible($value): bool
    {
        if ($value === '0' || $value === 0 || $value === false || $value === 'no') {
            return false;
        }
        return true;
    }
}

/**
 * 新增分類表單
 */
add_action('product_cat_add_form_fields', function () {
    ?>
<div class="form-field term-hover-show-wrap">
    <label for="hover_show_frontend" style="display:flex;align-items:center;gap:8px;font-weight:600;">
        <input type="checkbox" name="hover_show_frontend" id="hover_show_frontend" value="1" checked="checked" />
        <?php esc_html_e('顯示於 Navbar（與其他分類導覽）', 'hover'); ?>
    </label>
    <p class="description" style="margin-top:4px;">
        <?php esc_html_e('控制頂部導覽列、分類頁選單等。取消勾選則不出現在 Navbar。', 'hover'); ?>
    </p>
</div>
<div class="form-field term-hover-filter-wrap">
    <label for="hover_show_filter" style="display:flex;align-items:center;gap:8px;font-weight:600;">
        <input type="checkbox" name="hover_show_filter" id="hover_show_filter" value="1" checked="checked" />
        <?php esc_html_e('顯示於 Filter（商品篩選）', 'hover'); ?>
    </label>
    <p class="description" style="margin-top:4px;">
        <?php esc_html_e('控制商品列表 Filter「商品類型」。可與 Navbar 分開：Navbar 隱藏、Filter 仍顯示。', 'hover'); ?>
    </p>
</div>
<?php
});

/**
 * 編輯分類表單
 */
add_action('product_cat_edit_form_fields', function ($term) {
    $nav_checked    = hover_cat_is_visible(get_term_meta($term->term_id, HOVER_CAT_VISIBLE_META, true));
    $filter_checked = hover_cat_is_visible(get_term_meta($term->term_id, HOVER_CAT_FILTER_META, true));
    ?>
<tr class="form-field term-hover-show-wrap">
    <th scope="row">
        <label for="hover_show_frontend"><?php esc_html_e('Navbar 顯示', 'hover'); ?></label>
    </th>
    <td>
        <label for="hover_show_frontend" style="display:inline-flex;align-items:center;gap:8px;">
            <input type="checkbox" name="hover_show_frontend" id="hover_show_frontend" value="1"
                <?php checked($nav_checked); ?> />
            <?php esc_html_e('顯示於 Navbar（與其他分類導覽）', 'hover'); ?>
        </label>
        <p class="description">
            <?php esc_html_e('頂部導覽列、分類頁選單等。取消勾選則 Navbar 不顯示此分類。', 'hover'); ?>
        </p>
    </td>
</tr>
<tr class="form-field term-hover-filter-wrap">
    <th scope="row">
        <label for="hover_show_filter"><?php esc_html_e('Filter 顯示', 'hover'); ?></label>
    </th>
    <td>
        <label for="hover_show_filter" style="display:inline-flex;align-items:center;gap:8px;">
            <input type="checkbox" name="hover_show_filter" id="hover_show_filter" value="1"
                <?php checked($filter_checked); ?> />
            <?php esc_html_e('顯示於 Filter（商品篩選）', 'hover'); ?>
        </label>
        <p class="description">
            <?php esc_html_e('商品列表 Filter「商品類型」。可與 Navbar 分開控制。', 'hover'); ?>
        </p>
    </td>
</tr>
<?php
}, 10, 1);

/**
 * 儲存（新增 / 編輯）
 */
add_action('created_product_cat', 'hover_save_category_visibility', 10, 1);
add_action('edited_product_cat', 'hover_save_category_visibility', 10, 1);

function hover_save_category_visibility($term_id): void
{
    if (!current_user_can('manage_product_terms')) {
        return;
    }

    $nav_visible    = isset($_POST['hover_show_frontend']) ? '1' : '0';
    $filter_visible = isset($_POST['hover_show_filter']) ? '1' : '0';

    update_term_meta((int) $term_id, HOVER_CAT_VISIBLE_META, $nav_visible);
    update_term_meta((int) $term_id, HOVER_CAT_FILTER_META, $filter_visible);
}

/**
 * 註冊 term meta（REST 用）
 */
add_action('init', function () {
    $args = [
        'type'              => 'string',
        'single'            => true,
        'default'           => '1',
        'show_in_rest'      => true,
        'sanitize_callback' => function ($value) {
            return ($value === '1' || $value === 1 || $value === true) ? '1' : '0';
        },
        'auth_callback'     => function () {
            return current_user_can('manage_product_terms');
        },
    ];

    register_term_meta('product_cat', HOVER_CAT_VISIBLE_META, $args);
    register_term_meta('product_cat', HOVER_CAT_FILTER_META, $args);
});

/**
 * WooCommerce REST API：附加兩個 boolean 欄位
 */
add_filter('woocommerce_rest_prepare_product_cat', function ($response, $category, $request) {
    if (!is_object($response) || !isset($response->data) || !is_object($category)) {
        return $response;
    }

    $term_id = isset($category->term_id) ? (int) $category->term_id : 0;
    if (!$term_id) {
        return $response;
    }

    $response->data['hover_show_frontend'] = hover_cat_is_visible(
        get_term_meta($term_id, HOVER_CAT_VISIBLE_META, true)
    );
    $response->data['hover_show_filter'] = hover_cat_is_visible(
        get_term_meta($term_id, HOVER_CAT_FILTER_META, true)
    );

    return $response;
}, 10, 3);

/**
 * 分類列表：Navbar / Filter 兩欄
 */
add_filter('manage_edit-product_cat_columns', function ($columns) {
    $columns['hover_show_frontend'] = __('Navbar', 'hover');
    $columns['hover_show_filter']   = __('Filter', 'hover');
    return $columns;
});

add_filter('manage_product_cat_custom_column', function ($content, $column, $term_id) {
    if ($column === 'hover_show_frontend') {
        $visible = hover_cat_is_visible(get_term_meta($term_id, HOVER_CAT_VISIBLE_META, true));
    } elseif ($column === 'hover_show_filter') {
        $visible = hover_cat_is_visible(get_term_meta($term_id, HOVER_CAT_FILTER_META, true));
    } else {
        return $content;
    }

    if ($visible) {
        return '<span style="color:#007017;font-weight:600;">' . esc_html__('顯示', 'hover') . '</span>';
    }

    return '<span style="color:#999;">' . esc_html__('隱藏', 'hover') . '</span>';
}, 10, 3);
