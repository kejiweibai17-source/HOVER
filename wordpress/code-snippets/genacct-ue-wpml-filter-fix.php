<?php
/**
 * 將軍會計 — 修復 Unlimited Elements Post Grid AJAX 分類篩選混入其他 WPML 語言文章
 *
 * 部署方式（擇一，建議 A）：
 *
 * A) MU-Plugin（最可靠，優先使用）
 *    複製到：wp-content/mu-plugins/genacct-ue-wpml-filter-fix.php
 *
 * B) WPCode
 *    Run Everywhere → 貼上全文 → 啟用
 *    若仍無效，請改用 A
 *
 * 部署後：
 * 1. WP Rocket → 清除快取
 * 2. WP Rocket → 進階規則 → 永不快取下列 URI：ucfrontajaxaction
 * 3. 無痕測試 /blogs/ 篩選分類，Network 的 query_ids 不應含 25149
 */

if (!defined('ABSPATH')) {
    exit;
}

if (defined('GENACCT_UE_WPML_FILTER_FIX_LOADED')) {
    return;
}
define('GENACCT_UE_WPML_FILTER_FIX_LOADED', true);

function genacct_ue_is_filter_ajax() {
    return !empty($_GET['ucfrontajaxaction'])
        && $_GET['ucfrontajaxaction'] === 'getfiltersdata';
}

function genacct_ue_wpml_current_lang() {
    if (!empty($_COOKIE['wp-wpml_current_language'])) {
        return sanitize_text_field(wp_unslash($_COOKIE['wp-wpml_current_language']));
    }

    $referer = wp_get_referer();
    if ($referer) {
        $ref_path = wp_parse_url($referer, PHP_URL_PATH);
        if (is_string($ref_path) && preg_match('#^/en(/|$)#', $ref_path)) {
            return 'en';
        }
    }

    $path = wp_parse_url($_SERVER['REQUEST_URI'] ?? '', PHP_URL_PATH);
    if (is_string($path) && preg_match('#^/en(/|$)#', $path)) {
        return 'en';
    }

    if (function_exists('apply_filters')) {
        $lang = apply_filters('wpml_current_language', null);
        if ($lang) {
            return $lang;
        }
    }

    return 'zh-hant';
}

function genacct_ue_wpml_langs_match($post_lang, $current_lang) {
    if ($post_lang === $current_lang) {
        return true;
    }

    $zh = array('zh-hant', 'zh-hans', 'zh', 'zh-tw', 'zh-cn');
    return in_array($post_lang, $zh, true) && in_array($current_lang, $zh, true);
}

function genacct_ue_wpml_detect_post_lang($post_id) {
    global $wpdb;

    $post_id = (int) $post_id;
    if ($post_id <= 0) {
        return null;
    }

    static $cache = array();
    if (isset($cache[$post_id])) {
        return $cache[$post_id];
    }

    $table = $wpdb->prefix . 'icl_translations';
    $lang  = $wpdb->get_var(
        $wpdb->prepare(
            "SELECT language_code FROM {$table} WHERE element_id = %d AND element_type = %s LIMIT 1",
            $post_id,
            'post_post'
        )
    );

    if ($lang) {
        $cache[$post_id] = $lang;
        return $lang;
    }

    if (function_exists('apply_filters')) {
        $code = apply_filters('wpml_element_language_code', null, array(
            'element_id'   => $post_id,
            'element_type' => 'post_post',
        ));
        if ($code) {
            $cache[$post_id] = $code;
            return $code;
        }
    }

    $url = get_permalink($post_id);
    if ($url) {
        $url_path = wp_parse_url($url, PHP_URL_PATH);
        $lang     = (is_string($url_path) && preg_match('#^/en(/|$)#', $url_path)) ? 'en' : 'zh-hant';
        $cache[$post_id] = $lang;
        return $lang;
    }

    $cache[$post_id] = null;
    return null;
}

function genacct_ue_wpml_should_keep_post($post_id, $lang) {
    $post_lang = genacct_ue_wpml_detect_post_lang($post_id);
    if (!$post_lang) {
        return true;
    }
    return genacct_ue_wpml_langs_match($post_lang, $lang);
}

function genacct_ue_wpml_filter_post_list($posts) {
    if (!genacct_ue_is_filter_ajax() || !is_array($posts) || empty($posts)) {
        return $posts;
    }

    $lang     = genacct_ue_wpml_current_lang();
    $filtered = array();

    foreach ($posts as $post) {
        $id = is_object($post) ? (int) $post->ID : (int) $post;
        if (genacct_ue_wpml_should_keep_post($id, $lang)) {
            $filtered[] = $post;
        }
    }

    return $filtered;
}

function genacct_ue_wpml_filter_html_items($html, $keep_indexes) {
    if (!preg_match_all(
        '#<div id="%uc_widget_id%_item\d+" class="uc_post_grid_style_one_item.*?(?=<div id="%uc_widget_id%_item\d+"|\z)#s',
        $html,
        $matches
    )) {
        return $html;
    }

    $items = $matches[0];
    $out   = '';

    foreach ($keep_indexes as $new_index => $old_index) {
        if (!isset($items[$old_index])) {
            continue;
        }

        $item = preg_replace(
            '#id="%uc_widget_id%_item\d+"#',
            'id="%uc_widget_id%_item' . ($new_index + 1) . '"',
            $items[$old_index],
            1
        );

        $out .= "\n\n\n\n" . $item;
    }

    return $out !== '' ? $out : $html;
}

function genacct_ue_wpml_filter_ajax_response($buffer) {
    if (!is_string($buffer) || $buffer === '') {
        return $buffer;
    }

    $data = json_decode($buffer, true);
    if (!is_array($data) || empty($data['query_ids']) || !is_array($data['query_ids'])) {
        return $buffer;
    }

    $lang = genacct_ue_wpml_current_lang();
    if (!$lang) {
        return $buffer;
    }

    $keep_indexes = array();
    $filtered_ids = array();

    foreach ($data['query_ids'] as $index => $post_id) {
        if (genacct_ue_wpml_should_keep_post($post_id, $lang)) {
            $keep_indexes[] = $index;
            $filtered_ids[] = (int) $post_id;
        }
    }

    if (empty($filtered_ids) || count($filtered_ids) === count($data['query_ids'])) {
        return $buffer;
    }

    $data['query_ids'] = $filtered_ids;
    $data['genacct_wpml_fix'] = 'v2';

    if (!empty($data['html_items']) && is_string($data['html_items'])) {
        $data['html_items'] = genacct_ue_wpml_filter_html_items($data['html_items'], $keep_indexes);
    }

    if (!empty($data['query_data']) && is_array($data['query_data'])) {
        $count = count($filtered_ids);
        $data['query_data']['count_posts'] = $count;
        $data['query_data']['total_posts'] = $count;
    }

    return wp_json_encode($data);
}

function genacct_ue_wpml_ajax_fix_boot() {
    static $started = false;
    if ($started || !genacct_ue_is_filter_ajax()) {
        return;
    }

    $started = true;

    $lang = genacct_ue_wpml_current_lang();
    if ($lang && has_action('wpml_switch_language')) {
        do_action('wpml_switch_language', $lang);
    }

    if (!headers_sent()) {
        header('X-Genacct-Ue-Wpml-Fix: v2');
    }

    if (ob_get_level() === 0) {
        ob_start('genacct_ue_wpml_filter_ajax_response');
    }
}

function genacct_ue_wpml_register_hooks() {
    add_filter('posts_results', 'genacct_ue_wpml_filter_post_list', 999);
    add_filter('the_posts', 'genacct_ue_wpml_filter_post_list', 999);
    genacct_ue_wpml_ajax_fix_boot();
}

add_action('muplugins_loaded', 'genacct_ue_wpml_register_hooks', 0);
add_action('plugins_loaded', 'genacct_ue_wpml_register_hooks', 0);
add_action('init', 'genacct_ue_wpml_ajax_fix_boot', 0);
add_action('template_redirect', 'genacct_ue_wpml_ajax_fix_boot', -99999);

if (genacct_ue_is_filter_ajax()) {
    genacct_ue_wpml_register_hooks();
}
