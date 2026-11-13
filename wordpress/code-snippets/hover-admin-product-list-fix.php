<?php
/**
 * HOVER — 後台「所有商品」列表破版修正
 *
 * 使用方式：
 * 1. Code Snippets → 找到先前那則（或 Add New）→ 整段換成這份
 * 2. Run snippet：Only run in administration area → 啟用／更新
 * 3. 強制重新整理商品列表（Cmd+Shift+R）
 *
 * 原因：
 * - 欄位太多（標籤、品牌、精選…），表格被擠窄 → 文字變直排
 * - 「標籤」內容很長，列高被撐成直式長條
 *
 * 效果：
 * - 預設隱藏：標籤、品牌、精選（仍可在右上「顯示選項」勾回來）
 * - 貨號／庫存／價格橫排不切斷
 * - 名稱下的「可變商品」強制單行
 * - 分類單行省略，表格可橫向捲動
 */

if (!defined('ABSPATH')) {
    exit;
}

if (defined('HAPLF_LOADED')) {
    return;
}
define('HAPLF_LOADED', true);

/**
 * 預設拿掉會擠爆版面的欄位（使用者可在「顯示選項」再打開）
 */
add_filter('manage_edit-product_columns', function ($columns) {
    unset($columns['product_tag']);
    unset($columns['featured']);
    unset($columns['product_brand']);
    unset($columns['taxonomy-product_brand']);
    unset($columns['brands']);

    // 其他外掛常加的品牌／類型欄
    foreach (array_keys($columns) as $key) {
        $k = strtolower((string) $key);
        if (
            str_contains($k, 'brand')
            || $k === 'product_type'
            || $k === 'taxonomy-product_brand'
        ) {
            unset($columns[$key]);
        }
    }

    return $columns;
}, 999);

add_action('admin_head', function () {
    $screen = function_exists('get_current_screen') ? get_current_screen() : null;
    if (!$screen || $screen->id !== 'edit-product') {
        return;
    }
    ?>
<style id="hover-admin-product-list-fix">
/* 整表可橫向捲，避免欄位互擠 */
body.post-type-product #wpbody-content .wrap {
	overflow-x: auto;
}
body.post-type-product .wp-list-table.widefat.fixed {
	table-layout: auto !important;
}
body.post-type-product table.wp-list-table {
	min-width: 1200px;
}

/* 所有儲存格：禁止英文／數字被拆成直排 */
body.post-type-product .wp-list-table td,
body.post-type-product .wp-list-table th {
	word-break: keep-all !important;
	overflow-wrap: break-word;
	vertical-align: top;
}

/* 名稱：加寬；「可變商品」單行 */
body.post-type-product .wp-list-table .column-name {
	width: 28% !important;
	min-width: 240px !important;
}
body.post-type-product .wp-list-table td.column-name .product-type,
body.post-type-product .wp-list-table td.column-name small,
body.post-type-product .wp-list-table td.column-name .meta,
body.post-type-product .wp-list-table td.column-name .post-state,
body.post-type-product .wp-list-table td.name .product-type,
body.post-type-product .wp-list-table td.name small {
	display: inline-block !important;
	white-space: nowrap !important;
	word-break: keep-all !important;
}

/* 貨號 */
body.post-type-product .wp-list-table .column-sku,
body.post-type-product .wp-list-table th.column-sku,
body.post-type-product .wp-list-table td.sku.column-sku {
	width: 150px !important;
	min-width: 150px !important;
	max-width: 200px !important;
	white-space: nowrap !important;
	word-break: normal !important;
	overflow-wrap: normal !important;
}

/* 庫存／價格 */
body.post-type-product .wp-list-table .column-is_in_stock {
	width: 100px !important;
	min-width: 100px !important;
	white-space: nowrap !important;
}
body.post-type-product .wp-list-table .column-price {
	width: 120px !important;
	min-width: 110px !important;
	white-space: nowrap !important;
}

/* 分類：單行 + 省略，不再直式堆疊 */
body.post-type-product .wp-list-table .column-product_cat {
	width: 160px !important;
	min-width: 140px !important;
	max-width: 200px !important;
}
body.post-type-product .wp-list-table td.column-product_cat {
	white-space: nowrap !important;
	overflow: hidden;
	text-overflow: ellipsis;
	max-width: 200px;
}

/* 若使用者又打開標籤：同樣單行省略，避免列高爆炸 */
body.post-type-product .wp-list-table .column-product_tag {
	width: 140px !important;
	min-width: 120px !important;
	max-width: 180px !important;
}
body.post-type-product .wp-list-table td.column-product_tag {
	white-space: nowrap !important;
	overflow: hidden;
	text-overflow: ellipsis;
	max-width: 180px;
}

/* 日期 */
body.post-type-product .wp-list-table .column-date {
	width: 110px !important;
	min-width: 100px !important;
	white-space: nowrap !important;
}

/* 縮圖 */
body.post-type-product .wp-list-table .column-thumb {
	width: 52px !important;
	min-width: 52px !important;
}
</style>
    <?php
});
