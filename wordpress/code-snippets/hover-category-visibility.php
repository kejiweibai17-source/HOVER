<?php
/**
 * HOVER — 商品分類「前台顯示」開關
 *
 * 使用方式（WordPress 後台）：
 * 1. 安裝並啟用插件「Code Snippets」
 * 2. Snippets → Add New
 * 3. 標題：HOVER 分類前台顯示開關
 * 4. 將本檔案內容（不含 <?php 也可，插件會自動包）貼上
 * 5. Run snippet：Everywhere（需暴露 REST API）
 * 6. Save & Activate
 *
 * 後台位置：商品 → 分類 → 新增/編輯分類
 *
 * REST API（給 Next.js 讀取）：
 * GET /wp-json/wc/v3/products/categories
 * 每筆會多欄位：hover_show_frontend (boolean)
 *
 * Meta key：hover_show_frontend（預設顯示；1=顯示，0=隱藏）
 */

if (!defined('ABSPATH')) {
    exit;
}

const HOVER_CAT_VISIBLE_META = 'hover_show_frontend';

/**
 * 新增分類表單
 */
add_action('product_cat_add_form_fields', function () {
    ?>
<div class="form-field term-hover-show-wrap">
    <label for="hover_show_frontend" style="display:flex;align-items:center;gap:8px;font-weight:600;">
        <input type="checkbox" name="hover_show_frontend" id="hover_show_frontend" value="1" checked="checked" />
        <?php esc_html_e('顯示於 HOVER 前台', 'hover'); ?>
    </label>
    <p class="description">
        <?php esc_html_e('預設會顯示於 Next.js 前台。若不想露出，取消勾選即可。', 'hover'); ?>
    </p>
</div>
<?php
});

/**
 * 編輯分類表單
 */
add_action('product_cat_edit_form_fields', function ($term) {
    $value = get_term_meta($term->term_id, HOVER_CAT_VISIBLE_META, true);
    $checked = hover_cat_is_visible($value);
    ?>
<tr class="form-field term-hover-show-wrap">
    <th scope="row">
        <label for="hover_show_frontend"><?php esc_html_e('HOVER 前台顯示', 'hover'); ?></label>
    </th>
    <td>
        <label for="hover_show_frontend" style="display:inline-flex;align-items:center;gap:8px;">
            <input type="checkbox" name="hover_show_frontend" id="hover_show_frontend" value="1"
                <?php checked($checked); ?> />
            <?php esc_html_e('顯示於 HOVER 前台', 'hover'); ?>
        </label>
        <p class="description">
            <?php esc_html_e('預設顯示於前台；取消勾選則隱藏此分類。', 'hover'); ?>
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

function hover_save_category_visibility($term_id)
{
    if (!current_user_can('manage_product_terms')) {
        return;
    }

    $visible = isset($_POST['hover_show_frontend']) ? '1' : '0';
    update_term_meta((int) $term_id, HOVER_CAT_VISIBLE_META, $visible);
}

/**
 * 註冊 term meta（REST 用）
 */
add_action('init', function () {
    register_term_meta('product_cat', HOVER_CAT_VISIBLE_META, [
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
    ]);
});

/**
 * WooCommerce REST API：附加 hover_show_frontend (bool)
 */
add_filter('woocommerce_rest_prepare_product_cat', function ($response, $category, $request) {
    if (!is_object($response) || !isset($response->data) || !is_object($category)) {
        return $response;
    }

    $term_id = isset($category->term_id) ? (int) $category->term_id : 0;
    if (!$term_id) {
        return $response;
    }

    $raw = get_term_meta($term_id, HOVER_CAT_VISIBLE_META, true);
    $response->data['hover_show_frontend'] = hover_cat_is_visible($raw);

    return $response;
}, 10, 3);

/**
 * 分類列表：多一欄「前台顯示」
 */
add_filter('manage_edit-product_cat_columns', function ($columns) {
    $columns['hover_show_frontend'] = __('HOVER 前台', 'hover');
    return $columns;
});

add_filter('manage_product_cat_custom_column', function ($content, $column, $term_id) {
    if ($column !== 'hover_show_frontend') {
        return $content;
    }

    $visible = hover_cat_is_visible(get_term_meta($term_id, HOVER_CAT_VISIBLE_META, true));

    if ($visible) {
        return '<span style="color:#007017;font-weight:600;">' . esc_html__('顯示', 'hover') . '</span>';
    }

    return '<span style="color:#999;">' . esc_html__('隱藏', 'hover') . '</span>';
}, 10, 3);

/**
 * 未設定 meta 時視為顯示；僅明確存 0 時隱藏
 *
 * @param mixed $value
 */
function hover_cat_is_visible($value)
{
    if ($value === '0' || $value === 0 || $value === false || $value === 'no') {
        return false;
    }

    return true;
}