<?php
/**
 * HOVER — 編輯器保留空行／段落
 *
 * 使用方式（WordPress 後台）：
 * 1. 安裝並啟用插件「Code Snippets」
 * 2. Snippets → Add New → 貼上本檔內容
 * 3. Run snippet：Only run in administration area → 啟用
 *
 * 解決的問題：
 * 商品說明按 Enter 空行後，按「更新」空行會被吃掉。
 * 原因是 WordPress 存檔前會用 removep() 把 <p> 還原成換行，
 * 並把連續空行壓成單一段落分隔，空白段落因此消失。
 *
 * 作法：
 * 對商品編輯頁的 TinyMCE 關閉 wpautop，讓編輯器直接存真正的 HTML
 * （含 <p>&nbsp;</p> 空白段），前台就能照後台的排版顯示。
 */

if (!defined('ABSPATH')) {
    exit;
}

if (defined('HKLB_LOADED')) {
    return;
}
define('HKLB_LOADED', true);

/** 要保留空行的文章類型 */
function hklb_post_types(): array
{
    return apply_filters('hover_keep_linebreaks_post_types', ['product']);
}

/** 目前是否在需要保留空行的編輯畫面 */
function hklb_is_target_screen(): bool
{
    if (!is_admin()) {
        return false;
    }

    $post_type = '';

    if (function_exists('get_current_screen')) {
        $screen = get_current_screen();
        if ($screen && $screen->post_type) {
            $post_type = $screen->post_type;
        }
    }

    // get_current_screen() 尚未就緒時的備援判斷
    if ($post_type === '') {
        if (isset($_GET['post_type'])) {
            $post_type = sanitize_key(wp_unslash($_GET['post_type']));
        } elseif (isset($_GET['post'])) {
            $post_type = (string) get_post_type(absint($_GET['post']));
        }
    }

    return $post_type !== '' && in_array($post_type, hklb_post_types(), true);
}

/**
 * 關閉編輯器的 wpautop。
 * TinyMCE 的 wordpress plugin 會依這個參數決定要不要在存檔前跑 removep()，
 * 設成 false 後，按 Enter 產生的空白段落就會原樣存進資料庫。
 */
add_filter('tiny_mce_before_init', function ($init) {
    if (!is_array($init) || !hklb_is_target_screen()) {
        return $init;
    }

    $init['wpautop']                 = false;
    $init['remove_linebreaks']       = false;
    $init['gecko_spellcheck']        = true;
    $init['keep_styles']             = true;
    $init['convert_newlines_to_brs'] = false;

    return $init;
}, 20);

/**
 * 舊資料若是「純換行、沒有 <p>」的格式，載入編輯器前先補上段落，
 * 避免關閉 wpautop 後整段黏在一起。
 */
add_filter('the_editor_content', function ($content, $default_editor = '') {
    if ($default_editor !== 'tinymce' || !hklb_is_target_screen()) {
        return $content;
    }
    if ($content === '' || preg_match('/<(p|div|ul|ol|h[1-6])[\s>]/i', $content)) {
        return $content;
    }

    // 此處的 $content 已被 format_for_editor() 轉義過，補段落後要用相同方式轉回去
    $raw = wp_specialchars_decode($content, ENT_NOQUOTES);

    return htmlspecialchars(wpautop($raw), ENT_NOQUOTES, get_option('blog_charset'));
}, 20, 2);
