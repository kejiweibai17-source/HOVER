<?php
/**
 * HOVER — 修正 WooCommerce 訂單備註時間軸
 *
 * DB 常見：comment_date === comment_date_gmt（皆為 UTC 牆鐘），顯示會少 8 小時。
 * 付款時間（訂單標題）正確、備註錯誤時，用此 snippet 修正備註顯示。
 *
 * Code Snippets → Run everywhere → 只保留這一則
 */

if (!defined('ABSPATH')) {
    exit;
}

const HOVER_SITE_TZ = 'Asia/Taipei';

function hover_site_timezone(): DateTimeZone
{
    static $tz = null;
    if ($tz instanceof DateTimeZone) {
        return $tz;
    }
    try {
        $tz = new DateTimeZone(HOVER_SITE_TZ);
    } catch (Exception $e) {
        $tz = wp_timezone();
    }
    return $tz;
}

add_filter('pre_option_timezone_string', static function () {
    return HOVER_SITE_TZ;
});
add_filter('pre_option_gmt_offset', static function () {
    return 8;
});

/** UTC 字串 → 台北 WC_DateTime */
function hover_utc_mysql_to_taipei_datetime(string $utc_mysql)
{
    if (!function_exists('wc_string_to_datetime')) {
        return null;
    }
    $utc_mysql = trim($utc_mysql);
    if ($utc_mysql === '' || $utc_mysql === '0000-00-00 00:00:00') {
        return null;
    }
    try {
        $dt = new WC_DateTime($utc_mysql, new DateTimeZone('UTC'));
        $dt->setTimezone(hover_site_timezone());
        return $dt;
    } catch (Exception $e) {
        return null;
    }
}

/**
 * 自訂 Order Note：在物件建立當下就換算時區（比事後 filter 可靠）。
 */
class Hover_WC_Order_Note extends WC_Order_Note
{
    public function __construct($data = 0)
    {
        parent::__construct($data);

        if (empty($this->id)) {
            return;
        }

        $raw = get_comment((int) $this->id);
        if (!$raw instanceof WP_Comment) {
            return;
        }

        $utc = trim((string) $raw->comment_date_gmt);
        if ($utc === '' || $utc === '0000-00-00 00:00:00') {
            $utc = trim((string) $raw->comment_date);
        }

        $fixed = hover_utc_mysql_to_taipei_datetime($utc);
        if ($fixed instanceof WC_DateTime) {
            $this->date_created = $fixed;
        }
    }
}

add_filter('woocommerce_get_order_note_class', static function () {
    return class_exists('WC_Order_Note') ? 'Hover_WC_Order_Note' : 'WC_Order_Note';
});

/** 備援：部分 WC 版本仍須再 filter 一次 */
add_filter('woocommerce_get_order_notes', static function ($notes) {
    if (!is_array($notes)) {
        return $notes;
    }
    foreach ($notes as $note) {
        if (!is_object($note) || empty($note->id)) {
            continue;
        }
        $raw = get_comment((int) $note->id);
        if (!$raw instanceof WP_Comment) {
            continue;
        }
        $utc = trim((string) $raw->comment_date_gmt);
        if ($utc === '' || $utc === '0000-00-00 00:00:00') {
            $utc = trim((string) $raw->comment_date);
        }
        $fixed = hover_utc_mysql_to_taipei_datetime($utc);
        if ($fixed instanceof WC_DateTime) {
            $note->date_created = $fixed;
        }
    }
    return $notes;
}, 99);

add_filter('woocommerce_rest_prepare_order_note', static function ($response) {
    if (!($response instanceof WP_REST_Response) || !current_user_can('manage_woocommerce')) {
        return $response;
    }
    $data = $response->get_data();
    $utc  = trim((string) ($data['date_created_gmt'] ?? ''));
    if ($utc === '' || $utc === '0000-00-00 00:00:00') {
        $utc = trim((string) ($data['date_created'] ?? ''));
    }
    $fixed = hover_utc_mysql_to_taipei_datetime($utc);
    if ($fixed instanceof WC_DateTime) {
        $data['date_created'] = $fixed->format('Y-m-d\TH:i:s');
        $response->set_data($data);
    }
    return $response;
}, 99);

add_filter('woocommerce_new_order_note_data', static function ($commentdata) {
    if (!is_array($commentdata)) {
        return $commentdata;
    }
    try {
        $now = new DateTimeImmutable('now', hover_site_timezone());
        $commentdata['comment_date']     = $now->format('Y-m-d H:i:s');
        $commentdata['comment_date_gmt'] = $now->setTimezone(new DateTimeZone('UTC'))->format('Y-m-d H:i:s');
    } catch (Exception $e) {
        // 略過
    }
    return $commentdata;
}, 99);

/**
 * 最後防線：後台訂單頁用 JS 把備註時間 +8 小時顯示（僅當 title 與顯示皆為 UTC 時）。
 * 不影響物流側欄與其他 meta box。
 */
add_action('admin_footer', static function () {
    if (!current_user_can('manage_woocommerce')) {
        return;
    }
    $screen = function_exists('get_current_screen') ? get_current_screen() : null;
    if (!$screen) {
        return;
    }
    $ok = in_array($screen->id, ['shop_order', 'woocommerce_page_wc-orders'], true);
    if (!$ok && function_exists('wc_get_page_screen_id')) {
        $ok = $screen->id === wc_get_page_screen_id('shop-order');
    }
    if (!$ok) {
        return;
    }
    ?>
    <script>
    (function () {
      var root = document.getElementById('woocommerce-order-notes');
      if (!root) return;

      root.querySelectorAll('.order_notes .exact-date').forEach(function (abbr) {
        var raw = abbr.getAttribute('title') || '';
        if (!raw) return;

        var utc = new Date(raw.replace(' ', 'T') + 'Z');
        if (isNaN(utc.getTime())) return;

        var fmt = new Intl.DateTimeFormat('zh-TW', {
          timeZone: 'Asia/Taipei',
          year: 'numeric',
          month: 'numeric',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
        });
        var p = {};
        fmt.formatToParts(utc).forEach(function (x) { p[x.type] = x.value; });

        var label = (p.dayPeriod === '上午' || p.dayPeriod === 'AM') ? '上午' : '下午';
        abbr.textContent = p.day + ' ' + p.month + '月, ' + p.year + ' 於 '
          + p.hour + ':' + p.minute + ' ' + label;

        var local = new Date(utc.toLocaleString('en-US', { timeZone: 'Asia/Taipei' }));
        var pad = function (n) { return n < 10 ? '0' + n : '' + n; };
        abbr.setAttribute('title',
          local.getFullYear() + '-' + pad(local.getMonth() + 1) + '-' + pad(local.getDate())
          + ' ' + pad(local.getHours()) + ':' + pad(local.getMinutes()) + ':' + pad(local.getSeconds())
        );
      });
    })();
    </script>
    <?php
});
