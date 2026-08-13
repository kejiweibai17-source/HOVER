<?php
/**
 * HOVER — 商品標籤＝前台搜尋關鍵字（提示）
 *
 * 使用方式：
 * 1. Code Snippets → Add New → 貼上本檔
 * 2. Run snippet：Only run in administration area → 啟用
 *
 * 效果：商品編輯頁「商品標籤」區塊加上說明，
 * 讓客戶知道標籤會成為前台搜尋關鍵字。
 * 搜尋邏輯在 Next.js /api/search，不需再改 Woo 查詢。
 */

if (!defined('ABSPATH')) {
    exit;
}

if (defined('HPTSH_LOADED')) {
    return;
}
define('HPTSH_LOADED', true);

add_action('admin_footer', function () {
    $screen = function_exists('get_current_screen') ? get_current_screen() : null;
    if (!$screen || $screen->post_type !== 'product') {
        return;
    }
    ?>
    <script>
    jQuery(function ($) {
        var $box = $('#tagsdiv-product_tag');
        if (!$box.length || $box.data('hh-hint')) return;
        $box.data('hh-hint', 1);
        $box.find('.inside').prepend(
            '<p class="description" style="margin:0 0 10px;line-height:1.55">' +
            '這些<strong>標籤會作為前台搜尋關鍵字</strong>。' +
            '例如托特包可加「tote、帆布、包、BAGS」。' +
            '分類名稱（TOPS／BAGS／HEADWEAR／SOCKS）也可直接搜尋。' +
            '</p>'
        );
    });
    </script>
    <?php
});
