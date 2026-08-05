<?php
/**
 * 將軍會計 — 修復 Unlimited Elements Post Grid AJAX 篩選混入其他 WPML 語言
 *
 * 修復範圍（v7）：
 * 1. PHP：shutdown 強制改寫 AJAX JSON（不依賴 ob_start callback）
 * 2. 文章卡片 + 分類／標籤下拉（html_widgets）
 * 3. 前台 JS：依標題語系過濾（UE AJAX 常把英文連結吐成無 /en/ 的 URL，不能只靠 href）
 * 4. 英文 AJAX html_items：補上 /en/ permalink，與正式網址一致（如 /en/nil-tax-return/）
 *
 * 部署：Code Snippets → Run Everywhere → 整段覆蓋 → 啟用 → 清 WP Rocket
 * 驗收：header v7；console [genacct] v7；中文 Select Category 不混語；英文選分類有文
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
    // AJAX 可由前端 JS 帶 ?uc_lang=
    if (!empty($_GET['uc_lang'])) {
        $q = sanitize_text_field(wp_unslash($_GET['uc_lang']));
        if ($q !== '') {
            return $q;
        }
    }

    if (!empty($_COOKIE['wp-wpml_current_language'])) {
        return sanitize_text_field(wp_unslash($_COOKIE['wp-wpml_current_language']));
    }

    $referer = function_exists('wp_get_referer') ? wp_get_referer() : '';
    if (!$referer && !empty($_SERVER['HTTP_REFERER'])) {
        $referer = esc_url_raw(wp_unslash($_SERVER['HTTP_REFERER']));
    }
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

function genacct_ue_wpml_is_zh($lang) {
    return in_array($lang, array('zh-hant', 'zh-hans', 'zh', 'zh-tw', 'zh-cn'), true);
}

function genacct_ue_wpml_langs_match($item_lang, $current_lang) {
    if ($item_lang === $current_lang) {
        return true;
    }
    return genacct_ue_wpml_is_zh($item_lang) && genacct_ue_wpml_is_zh($current_lang);
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

    if (function_exists('get_permalink')) {
        $url = get_permalink($post_id);
        if ($url) {
            $url_path = wp_parse_url($url, PHP_URL_PATH);
            $lang     = (is_string($url_path) && preg_match('#^/en(/|$)#', $url_path)) ? 'en' : 'zh-hant';
            $cache[$post_id] = $lang;
            return $lang;
        }
    }

    $cache[$post_id] = null;
    return null;
}

/** WPML taxonomy element_id = term_taxonomy_id */
function genacct_ue_wpml_detect_term_lang($term_id, $taxonomy = 'category') {
    global $wpdb;

    $term_id  = (int) $term_id;
    $taxonomy = sanitize_key($taxonomy);
    if ($term_id <= 0 || $taxonomy === '') {
        return null;
    }

    static $cache = array();
    $key = $taxonomy . ':' . $term_id;
    if (isset($cache[$key])) {
        return $cache[$key];
    }

    $tt_id = (int) $wpdb->get_var(
        $wpdb->prepare(
            "SELECT term_taxonomy_id FROM {$wpdb->term_taxonomy} WHERE term_id = %d AND taxonomy = %s LIMIT 1",
            $term_id,
            $taxonomy
        )
    );

    if ($tt_id <= 0) {
        $cache[$key] = null;
        return null;
    }

    $table = $wpdb->prefix . 'icl_translations';
    $lang  = $wpdb->get_var(
        $wpdb->prepare(
            "SELECT language_code FROM {$table} WHERE element_id = %d AND element_type = %s LIMIT 1",
            $tt_id,
            'tax_' . $taxonomy
        )
    );

    if ($lang) {
        $cache[$key] = $lang;
        return $lang;
    }

    if (function_exists('apply_filters')) {
        $code = apply_filters('wpml_element_language_code', null, array(
            'element_id'   => $tt_id,
            'element_type' => 'tax_' . $taxonomy,
        ));
        if ($code) {
            $cache[$key] = $code;
            return $code;
        }
    }

    // 後備：用名稱文字判斷（僅 category；tag 常有英文縮寫）
    if ($taxonomy === 'category') {
        $name = $wpdb->get_var($wpdb->prepare("SELECT name FROM {$wpdb->terms} WHERE term_id = %d", $term_id));
        if (is_string($name) && $name !== '') {
            if (preg_match('/[\x{4e00}-\x{9fff}]/u', $name)) {
                $cache[$key] = 'zh-hant';
                return 'zh-hant';
            }
            if (preg_match('/[A-Za-z]{3,}/', $name)) {
                $cache[$key] = 'en';
                return 'en';
            }
        }
    }

    $cache[$key] = null;
    return null;
}

function genacct_ue_wpml_should_keep_post($post_id, $lang) {
    $post_lang = genacct_ue_wpml_detect_post_lang($post_id);
    if (!$post_lang) {
        return true;
    }
    return genacct_ue_wpml_langs_match($post_lang, $lang);
}

function genacct_ue_wpml_should_keep_term($term_id, $taxonomy, $lang) {
    $term_lang = genacct_ue_wpml_detect_term_lang($term_id, $taxonomy);
    if (!$term_lang) {
        // 名稱後備已在 detect 處理；仍查不到就保留
        return true;
    }
    return genacct_ue_wpml_langs_match($term_lang, $lang);
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
    if (!is_string($html) || $html === '') {
        return $html;
    }

    if (!is_array($keep_indexes) || count($keep_indexes) === 0) {
        return '';
    }

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

    return $out;
}

/**
 * UE AJAX 在英文語境常輸出不含 /en/ 的 permalink（正式頁面是 /en/slug/）。
 * 僅改寫本站文章路徑，略過 /wp-content/ 等靜態資源。
 */
function genacct_ue_wpml_fix_en_permalinks_in_html($html) {
    if (!is_string($html) || $html === '' || stripos($html, 'genacct.com') === false) {
        return $html;
    }

    $fixed = preg_replace_callback(
        '#\bhttps?://(?:www\.)?genacct\.com(/[^"\'\s<>]*)#i',
        static function ($m) {
            $full = $m[0];
            $path = $m[1];

            if ($path === '/en' || strpos($path, '/en/') === 0) {
                return $full;
            }
            if (preg_match('#^/(wp-content|wp-admin|wp-includes|wp-json)/#i', $path)) {
                return $full;
            }
            if (preg_match('#\.(?:webp|jpe?g|png|gif|svg|css|js|woff2?|ttf|eot|ico)(?:\?|$)#i', $path)) {
                return $full;
            }

            return preg_replace('#^(https?://(?:www\.)?genacct\.com)/#i', '$1/en/', $full, 1);
        },
        $html
    );

    return is_string($fixed) ? $fixed : $html;
}

function genacct_ue_wpml_filter_select_options_html($html, $lang) {
    if (!is_string($html) || $html === '' || strpos($html, '<option') === false) {
        return $html;
    }

    $filtered = preg_replace_callback(
        '#<option\b[^>]*>.*?</option>#si',
        static function ($m) use ($lang) {
            $option = $m[0];

            if (preg_match('#\bvalue=(["\'])\s*\1#', $option)
                || preg_match('#class="[^"]*\buc-item-all\b[^"]*"#', $option)
            ) {
                return $option;
            }

            $term_id  = 0;
            $taxonomy = 'category';

            if (preg_match('#\bdata-id=(["\'])(\d+)\1#', $option, $mm)) {
                $term_id = (int) $mm[2];
            } elseif (preg_match('#\bvalue=(["\'])(\d+)\1#', $option, $mm)) {
                $term_id = (int) $mm[2];
            }

            if (preg_match('#\bdata-taxonomy=(["\'])([^"\']+)\1#', $option, $mm)) {
                $taxonomy = sanitize_key($mm[2]);
            }

            if ($term_id <= 0) {
                return $option;
            }

            // category：嚴格依語系；post_tag：僅在 WPML 有明確語系時過濾
            if ($taxonomy === 'post_tag') {
                $term_lang = genacct_ue_wpml_detect_term_lang($term_id, $taxonomy);
                if (!$term_lang) {
                    return $option;
                }
                return genacct_ue_wpml_langs_match($term_lang, $lang) ? $option : '';
            }

            if (genacct_ue_wpml_should_keep_term($term_id, $taxonomy, $lang)) {
                return $option;
            }

            return '';
        },
        $html
    );

    return is_string($filtered) ? $filtered : $html;
}

function genacct_ue_wpml_filter_html_widgets($widgets, $lang) {
    if (!is_array($widgets) || empty($widgets)) {
        return array($widgets, false);
    }

    $changed = false;
    $out     = array();

    foreach ($widgets as $widget_id => $html) {
        if (!is_string($html)) {
            $out[$widget_id] = $html;
            continue;
        }

        $filtered = genacct_ue_wpml_filter_select_options_html($html, $lang);
        if ($filtered !== $html) {
            $changed = true;
        }
        $out[$widget_id] = $filtered;
    }

    return array($out, $changed);
}

function genacct_ue_wpml_filter_ajax_response($buffer) {
    if (!is_string($buffer) || $buffer === '') {
        return $buffer;
    }

    $trim = ltrim($buffer);
    if ($trim === '' || ($trim[0] !== '{' && $trim[0] !== '[')) {
        return $buffer;
    }

    $data = json_decode($buffer, true);
    if (!is_array($data) || empty($data['success'])) {
        return $buffer;
    }

    try {
        $lang = genacct_ue_wpml_current_lang();
        if (!$lang) {
            return $buffer;
        }

        $changed = false;

        if (!empty($data['query_ids']) && is_array($data['query_ids'])) {
            $keep_indexes = array();
            $filtered_ids = array();

            foreach ($data['query_ids'] as $index => $post_id) {
                if (genacct_ue_wpml_should_keep_post($post_id, $lang)) {
                    $keep_indexes[] = $index;
                    $filtered_ids[] = (int) $post_id;
                }
            }

            if (count($filtered_ids) !== count($data['query_ids'])) {
                $changed = true;
                $removed = count($data['query_ids']) - count($filtered_ids);
                $data['query_ids'] = array_values($filtered_ids);

                if (isset($data['html_items']) && is_string($data['html_items'])) {
                    $data['html_items'] = genacct_ue_wpml_filter_html_items($data['html_items'], $keep_indexes);
                }

                if (!empty($data['query_data']) && is_array($data['query_data'])) {
                    $count = count($filtered_ids);
                    $old_total = isset($data['query_data']['total_posts'])
                        ? (int) $data['query_data']['total_posts']
                        : (isset($data['query_data']['count_posts']) ? (int) $data['query_data']['count_posts'] : $count + $removed);
                    $data['query_data']['count_posts'] = $count;
                    $data['query_data']['total_posts'] = max(0, $old_total - $removed);
                }
            }
        }

        // 英文：無論是否裁過 ids，都補 /en/ 連結（UE 常漏掉）
        if ($lang === 'en' && isset($data['html_items']) && is_string($data['html_items']) && $data['html_items'] !== '') {
            $fixed_items = genacct_ue_wpml_fix_en_permalinks_in_html($data['html_items']);
            if ($fixed_items !== $data['html_items']) {
                $data['html_items'] = $fixed_items;
                $changed = true;
            }
        }

        if (!empty($data['html_widgets']) && is_array($data['html_widgets'])) {
            list($filtered_widgets, $widgets_changed) = genacct_ue_wpml_filter_html_widgets($data['html_widgets'], $lang);
            if ($widgets_changed) {
                $data['html_widgets'] = $filtered_widgets;
                $changed = true;
            }
        }

        // 即使沒改到內容也標記，方便確認 PHP 有跑到
        $data['genacct_wpml_fix'] = 'v7';
        $data['genacct_wpml_lang'] = $lang;

        $json = wp_json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        return is_string($json) ? $json : $buffer;
    } catch (Throwable $e) {
        return $buffer;
    }
}

/**
 * UE / WP Rocket 常對 buffer 做 ob_get_clean（不會觸發 callback）。
 * 不用 callback；shutdown 抽出各層 buffer → 過濾 → 輸出一次。
 */
function genacct_ue_wpml_shutdown_flush() {
    static $done = false;
    if ($done || !genacct_ue_is_filter_ajax()) {
        return;
    }
    $done = true;

    $chunks = array();
    while (ob_get_level() > 0) {
        $chunks[] = (string) ob_get_clean();
    }

    // 先拿到的是最內層；串起來找 JSON
    $buffer = implode('', $chunks);
    if ($buffer === '') {
        return;
    }

    // 若外層夾了雜訊，抽出第一段 JSON object
    $trim = ltrim($buffer);
    if ($trim !== '' && $trim[0] !== '{' && preg_match('/\{[\s\S]*\}\s*$/', $buffer, $m)) {
        $buffer = $m[0];
    }

    echo genacct_ue_wpml_filter_ajax_response($buffer);
}

function genacct_ue_wpml_ajax_fix_boot() {
    static $started = false;
    if ($started || !genacct_ue_is_filter_ajax()) {
        return;
    }

    $started = true;

    $lang = genacct_ue_wpml_current_lang();
    if ($lang && function_exists('do_action')) {
        do_action('wpml_switch_language', $lang);
    }

    if (!headers_sent()) {
        header('X-Genacct-Ue-Wpml-Fix: v7');
        header('X-Genacct-Ue-Wpml-Lang: ' . $lang);
        // 避免中介快取舊的混語系 JSON
        header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
        header('Pragma: no-cache');
    }

    // 無 callback：避免被 ob_get_clean 偷走後 callback 永不執行
    ob_start();
    register_shutdown_function('genacct_ue_wpml_shutdown_flush');
}

function genacct_ue_wpml_register_hooks() {
    static $registered = false;
    if ($registered) {
        return;
    }
    $registered = true;

    add_filter('posts_results', 'genacct_ue_wpml_filter_post_list', 999);
    add_filter('the_posts', 'genacct_ue_wpml_filter_post_list', 999);
    genacct_ue_wpml_ajax_fix_boot();
}

/**
 * 前台備援（關鍵）：jQuery dataFilter 在 UE 處理前改寫 JSON
 * + DOM sweep 清錯語系 options／卡片
 * data-rocketignore：避免 WP Rocket Delay JS 把這段延後到篩選已跑完
 */
function genacct_ue_wpml_frontend_js() {
    static $printed = false;
    if ($printed || is_admin() || genacct_ue_is_filter_ajax()) {
        return;
    }

    $path = wp_parse_url($_SERVER['REQUEST_URI'] ?? '', PHP_URL_PATH);
    if (!is_string($path) || !preg_match('#(^/blogs/?$|^/en/blogs/?$)#', $path)) {
        return;
    }

    $printed = true;
    $lang = genacct_ue_wpml_current_lang();
    ?>
    <script id="genacct-ue-wpml-filter-fix-js" data-rocketignore="true" data-no-defer="1" data-cfasync="false">
    (function () {
      var LANG = <?php echo wp_json_encode($lang); ?>;
      var IS_EN = (LANG === 'en') || (location.pathname.indexOf('/en/') === 0);
      console.log('[genacct] wpml-filter-fix v7', LANG, IS_EN ? 'en' : 'zh');

      function hasCJK(s) {
        return /[\u4e00-\u9fff]/.test(String(s || ''));
      }
      function looksEnglishLabel(s) {
        s = String(s || '').replace(/^[\s\-–—]+/, '');
        if (hasCJK(s)) return false;
        return /[A-Za-z]{3,}/.test(s);
      }
      function badTermLabel(title) {
        return IS_EN ? hasCJK(title) : looksEnglishLabel(title);
      }
      /** 正式英文文有 /en/；但 UE AJAX 常吐無 /en/ 的連結，所以標題為主、href 為輔 */
      function extractItemTitle(itemHtml) {
        var m = String(itemHtml || '').match(/class="ue_p_title"[^>]*>([^<]*)/i)
          || String(itemHtml || '').match(/class="[^"]*uc_post_title[^"]*"[^>]*>([^<]*)/i);
        return m ? m[1] : '';
      }
      function badPostItem(itemHtml, cardEl) {
        var title = '';
        if (cardEl && cardEl.querySelector) {
          var t = cardEl.querySelector('.ue_p_title, .uc_post_title');
          if (t) title = t.textContent || '';
        }
        if (!title) title = extractItemTitle(itemHtml);

        if (title) {
          return IS_EN ? hasCJK(title) : looksEnglishLabel(title);
        }

        // 無標題時才看 href（AJAX 可能尚無 /en/）
        var href = '';
        if (cardEl && cardEl.querySelector) {
          var a = cardEl.querySelector('a[href]');
          if (a) href = a.getAttribute('href') || '';
        }
        if (!href) {
          var hm = String(itemHtml || '').match(/href=(["'])(.*?)\1/i);
          href = hm ? hm[2] : '';
        }
        if (!href) return false;
        var en = /\/en\//.test(href);
        return IS_EN ? !en : en;
      }

      /** 前端也補 /en/（PHP 沒吃到 buffer 時的備援） */
      function fixEnPermalinksInHtml(html) {
        if (!IS_EN || typeof html !== 'string') return html;
        return html.replace(/\bhttps?:\/\/(?:www\.)?genacct\.com(\/[^"'\s<>]*)/gi, function (full, path) {
          if (path === '/en' || path.indexOf('/en/') === 0) return full;
          if (/^\/(wp-content|wp-admin|wp-includes|wp-json)\//i.test(path)) return full;
          if (/\.(?:webp|jpe?g|png|gif|svg|css|js|woff2?|ttf|eot|ico)(?:\?|$)/i.test(path)) return full;
          return full.replace(/^(https?:\/\/(?:www\.)?genacct\.com)\//i, '$1/en/');
        });
      }

      /** 改寫 UE getfiltersdata JSON（Select Category 清空時最重要） */
      function filterAjaxPayload(data) {
        if (!data || typeof data !== 'object' || !data.success) return data;

        // html_items：依標題語系拆卡，同步裁 query_ids
        if (typeof data.html_items === 'string' && data.html_items && Array.isArray(data.query_ids)) {
          data.html_items = fixEnPermalinksInHtml(data.html_items);
          var re = /<div id="%uc_widget_id%_item\d+" class="uc_post_grid_style_one_item[\s\S]*?(?=<div id="%uc_widget_id%_item\d+"|$)/g;
          var items = data.html_items.match(re);
          if (items && items.length) {
            var keepIdx = [];
            var outHtml = '';
            items.forEach(function (item, i) {
              if (!badPostItem(item)) {
                keepIdx.push(i);
                var n = keepIdx.length;
                outHtml += '\n\n\n\n' + item.replace(/id="%uc_widget_id%_item\d+"/, 'id="%uc_widget_id%_item' + n + '"');
              }
            });
            // 安全閥：若會刪光，不改（避免英文版 No posts found）
            if (keepIdx.length > 0 && keepIdx.length !== items.length) {
              data.html_items = outHtml;
              data.query_ids = keepIdx.map(function (i) { return data.query_ids[i]; }).filter(function (id) {
                return id != null;
              });
              if (data.query_data && typeof data.query_data === 'object') {
                data.query_data.count_posts = data.query_ids.length;
                if (typeof data.query_data.total_posts === 'number') {
                  data.query_data.total_posts = data.query_ids.length;
                }
              }
            }
          }
        } else if (typeof data.html_items === 'string' && data.html_items) {
          data.html_items = fixEnPermalinksInHtml(data.html_items);
        }

        // html_widgets：拿掉錯語系 option（category + tag）
        if (data.html_widgets && typeof data.html_widgets === 'object') {
          Object.keys(data.html_widgets).forEach(function (wid) {
            var html = data.html_widgets[wid];
            if (typeof html !== 'string' || html.indexOf('<option') === -1) return;
            data.html_widgets[wid] = html.replace(/<option\b[\s\S]*?<\/option>/gi, function (opt) {
              if (/\bvalue=(["'])\s*\1/.test(opt) || /uc-item-all/.test(opt)) return opt;
              var tm = opt.match(/\bdata-title=(["'])(.*?)\1/i);
              var title = tm ? tm[2] : '';
              if (!title) {
                var sm = opt.match(/uc-select-filter__name[^>]*>([^<]*)/i);
                title = sm ? sm[1] : '';
              }
              title = String(title).replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#0?39;/g, "'");
              return badTermLabel(title) ? '' : opt;
            });
          });
        }

        data.genacct_wpml_fix = data.genacct_wpml_fix || 'v7-js';
        data.genacct_wpml_lang = data.genacct_wpml_lang || (IS_EN ? 'en' : 'zh-hant');
        return data;
      }

      function filterAjaxJsonString(raw) {
        if (typeof raw !== 'string') return raw;
        var t = raw.replace(/^\uFEFF/, '').replace(/^\s+/, '');
        if (!t || (t.charAt(0) !== '{' && t.charAt(0) !== '[')) return raw;
        try {
          var data = JSON.parse(raw);
          data = filterAjaxPayload(data);
          return JSON.stringify(data);
        } catch (e) {
          return raw;
        }
      }

      function filterSelect(sel) {
        if (!sel || !sel.options) return;
        Array.prototype.slice.call(sel.options).forEach(function (opt) {
          if (!opt.value) return;
          var title = opt.getAttribute('data-title') || opt.textContent || '';
          if (badTermLabel(title)) {
            if (opt.selected) sel.value = '';
            if (opt.parentNode) opt.parentNode.removeChild(opt);
          }
        });
      }

      function filterPostCards(root) {
        root = root || document;
        var cards = Array.prototype.slice.call(
          root.querySelectorAll('.uc_post_grid_style_one_item, .ue_post_grid_item')
        );
        if (!cards.length) return 0;

        // 英文版：DOM 上補 /en/ 連結
        if (IS_EN) {
          cards.forEach(function (card) {
            card.querySelectorAll('a[href]').forEach(function (a) {
              var href = a.getAttribute('href') || '';
              if (!/^https?:\/\/(?:www\.)?genacct\.com\//i.test(href)) return;
              if (/\/en\//.test(href) || /\/wp-content\//i.test(href)) return;
              if (/\.(?:webp|jpe?g|png|gif|svg)(?:\?|$)/i.test(href)) return;
              a.setAttribute('href', href.replace(/^(https?:\/\/(?:www\.)?genacct\.com)\//i, '$1/en/'));
            });
          });
        }

        var toRemove = cards.filter(function (card) {
          return badPostItem('', card);
        });
        // 安全閥：會刪光就別動（英文版曾因此 No posts found）
        if (!toRemove.length || toRemove.length >= cards.length) return 0;
        toRemove.forEach(function (card) {
          if (card.parentNode) card.parentNode.removeChild(card);
        });
        return toRemove.length;
      }

      function sweep() {
        document.querySelectorAll('.uc-select-filter__select, select.uc-select-filter__select, select').forEach(function (sel) {
          if (!sel || !sel.className || String(sel.className).indexOf('uc-') === -1) {
            // 仍掃有 data-taxonomy 的 filter select
            if (!sel || !sel.querySelector || !sel.querySelector('option[data-taxonomy]')) return;
          }
          filterSelect(sel);
        });
        document.querySelectorAll('select').forEach(function (sel) {
          if (sel.querySelector && sel.querySelector('option[data-taxonomy]')) filterSelect(sel);
        });
        filterPostCards(document);
      }

      function hookJquery() {
        if (!window.jQuery) return false;
        var $ = window.jQuery;

        // UE 讀取前改寫回應（選回 Select Category 會重抓 widgets + posts）
        $.ajaxPrefilter(function (options) {
          try {
            var url = options && options.url ? String(options.url) : '';
            if (url.indexOf('ucfrontajaxaction=getfiltersdata') === -1) return;
            if (url.indexOf('uc_lang=') === -1) {
              options.url = url + (url.indexOf('?') === -1 ? '?' : '&') + 'uc_lang=' + encodeURIComponent(IS_EN ? 'en' : 'zh-hant');
            }
            var prev = options.dataFilter;
            options.dataFilter = function (data, type) {
              if (typeof prev === 'function') data = prev(data, type);
              return filterAjaxJsonString(data);
            };
          } catch (err) {}
        });

        $(document).ajaxComplete(function (e, xhr, settings) {
          try {
            if (!settings || !settings.url) return;
            if (String(settings.url).indexOf('ucfrontajaxaction=getfiltersdata') === -1) return;
            setTimeout(sweep, 20);
            setTimeout(sweep, 200);
            setTimeout(sweep, 600);
          } catch (err) {}
        });

        $(document.body).on('uc_ajax_refreshed uc_ajax_refreshed_body uc_ajax_reloaded', function () {
          setTimeout(sweep, 20);
        });
        return true;
      }

      // XHR 備援（若 UE 不用 jQuery）
      try {
        var _open = XMLHttpRequest.prototype.open;
        var _send = XMLHttpRequest.prototype.send;
        XMLHttpRequest.prototype.open = function (method, url) {
          this.__genacctUeUrl = url;
          return _open.apply(this, arguments);
        };
        XMLHttpRequest.prototype.send = function () {
          var xhr = this;
          var url = String(xhr.__genacctUeUrl || '');
          if (url.indexOf('ucfrontajaxaction=getfiltersdata') !== -1) {
            xhr.addEventListener('readystatechange', function () {
              if (xhr.readyState !== 4) return;
              try {
                var filtered = filterAjaxJsonString(xhr.responseText);
                if (filtered !== xhr.responseText) {
                  Object.defineProperty(xhr, 'responseText', { configurable: true, writable: true, value: filtered });
                  try {
                    Object.defineProperty(xhr, 'response', { configurable: true, writable: true, value: filtered });
                  } catch (e2) {}
                }
              } catch (e) {}
            });
          }
          return _send.apply(this, arguments);
        };
      } catch (e) {}

      var obs = new MutationObserver(function () { sweep(); });

      function boot() {
        if (!hookJquery()) {
          var n = 0;
          var t = setInterval(function () {
            if (hookJquery() || ++n > 40) clearInterval(t);
          }, 100);
        }
        sweep();
        if (document.body) obs.observe(document.body, { childList: true, subtree: true });
      }

      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
      } else {
        boot();
      }
    })();
    </script>
    <?php
}

add_action('muplugins_loaded', 'genacct_ue_wpml_register_hooks', 0);
add_action('plugins_loaded', 'genacct_ue_wpml_register_hooks', 0);
add_action('init', 'genacct_ue_wpml_ajax_fix_boot', 0);
add_action('template_redirect', 'genacct_ue_wpml_ajax_fix_boot', -99999);
add_action('wp_head', 'genacct_ue_wpml_frontend_js', 1);
add_action('wp_footer', 'genacct_ue_wpml_frontend_js', 1);

if (genacct_ue_is_filter_ajax()) {
    genacct_ue_wpml_register_hooks();
}
