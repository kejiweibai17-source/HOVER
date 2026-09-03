<?php
/**
 * HOVER — WooCommerce 訂單信件調整
 *
 * 1. 「電子郵件標題」後台留空 → 寄信／預覽都不顯示標題
 * 2. 新增「開頭文案」欄位 → 可取代「嗨！John…」那段預設文字
 * 3. 隱藏「下載次數」區塊
 * 4. 隱藏「顧客備註／Note」區塊
 * 5. 「運送地址」改顯示為「配送資訊」（並隱藏帳單地址）
 * 6. 文案中的 service@hoverofficial.com 自動變成可點 mailto 連結
 *
 * 使用方式：
 * 1. Code Snippets → 編輯既有信件調整 snippet → 整份覆蓋本檔 → 啟用
 * 2. WooCommerce → 設定 → 電子郵件 → 各信件「管理」
 *    - 電子郵件標題：留空或不想顯示就清空
 *    - 開頭文案：自訂「嗨！…」區塊（見欄位說明的變數）
 */

if (!defined('ABSPATH')) {
    exit;
}

if (defined('HOVER_EMAIL_HIDE_BILLING_LOADED')) {
    return;
}
define('HOVER_EMAIL_HIDE_BILLING_LOADED', true);

/** 支援「開頭文案」的顧客信件 */
function hover_email_intro_email_ids(): array
{
    return [
        'customer_completed_order',
        'customer_processing_order',
        'customer_on_hold_order',
        'customer_cancelled_order',
        'customer_refunded_order',
        'customer_failed_order',
        'customer_invoice',
    ];
}

add_action('woocommerce_email', function ($mailer) {
    if (!$mailer || !is_object($mailer)) {
        return;
    }

    remove_action('woocommerce_email_customer_details', [$mailer, 'email_addresses'], 20);
    add_action('woocommerce_email_customer_details', 'hover_email_shipping_address_only', 20, 4);
    remove_action('woocommerce_email_order_details', [$mailer, 'order_downloads'], 10);

    if (!empty($mailer->emails) && is_array($mailer->emails)) {
        foreach ($mailer->emails as $email) {
            if (!is_object($email) || empty($email->id)) {
                continue;
            }
            add_filter(
                'woocommerce_email_heading_' . $email->id,
                'hover_email_hide_empty_heading',
                100,
                3
            );
        }
    }
}, 20);

/**
 * 在信件設定頁、標題下方加入「開頭文案」欄位
 */
foreach (hover_email_intro_email_ids() as $email_id) {
    add_filter(
        "woocommerce_settings_api_form_fields_{$email_id}",
        'hover_email_add_intro_field',
        20
    );
}

function hover_email_add_intro_field(array $fields): array
{
    $intro_field = [
        'title'       => '開頭文案',
        'type'        => 'textarea',
        'description' => '取代預設「嗨！…／你的訂單已處理完畢…」開頭段落。可用變數：{customer_first_name}、{customer_name}、{order_number}、{site_title}、{order_date}。留空則使用 WooCommerce 預設文案。',
        'placeholder' => "嗨！{customer_first_name}\n\n你的訂單已處理完畢。\n此訊息提醒你訂購了哪些商品：",
        'default'     => '',
        'css'         => 'width:100%;max-width:520px;height:140px;',
        'desc_tip'    => true,
    ];

    $new = [];
    $inserted = false;
    foreach ($fields as $key => $field) {
        $new[$key] = $field;
        if ($key === 'heading') {
            $new['hover_intro'] = $intro_field;
            $inserted = true;
        }
    }
    if (!$inserted) {
        $new['hover_intro'] = $intro_field;
    }
    return $new;
}

/**
 * 讀取後台存檔的選項（不套用 WC 空白→預設 fallback）
 */
function hover_email_raw_option($email, string $key): ?string
{
    if (!$email || !is_object($email)) {
        return null;
    }

    $option_name = method_exists($email, 'get_option_key')
        ? $email->get_option_key()
        : ('woocommerce_' . $email->id . '_settings');

    $settings = get_option($option_name, null);
    if (!is_array($settings) || !array_key_exists($key, $settings)) {
        return null;
    }

    return (string) $settings[$key];
}

function hover_email_raw_heading_option($email): ?string
{
    return hover_email_raw_option($email, 'heading');
}

function hover_email_raw_intro_option($email): ?string
{
    return hover_email_raw_option($email, 'hover_intro');
}

function hover_email_has_custom_intro($email): bool
{
    if (!$email || !is_object($email) || empty($email->id)) {
        return false;
    }
    if (!in_array($email->id, hover_email_intro_email_ids(), true)) {
        return false;
    }
    $raw = hover_email_raw_intro_option($email);
    return is_string($raw) && trim($raw) !== '';
}

function hover_email_hide_empty_heading($heading, $object = null, $email = null)
{
    $raw = hover_email_raw_heading_option($email);
    if ($raw === null) {
        return $heading;
    }

    $trimmed = trim($raw);
    if ($trimmed === '' || $trimmed === '-' || strcasecmp($trimmed, '[hide]') === 0) {
        return '';
    }

    return $heading;
}

add_filter('woocommerce_mail_content', function ($content) {
    if (!is_string($content) || $content === '') {
        return $content;
    }
    $content = preg_replace('/<h1[^>]*>\s*<\/h1>/i', '', $content);
    $content = preg_replace('/<h1[^>]*>\s*&nbsp;\s*<\/h1>/i', '', $content);
    $content = hover_email_linkify_service_email($content);
    return $content;
}, 20);

/**
 * 將文案中的 service@hoverofficial.com（含 {store_email} 展開後）改成可點連結
 * 已是 <a> 內的不重複包一層
 */
function hover_email_linkify_service_email(string $content): string
{
    $email = 'service@hoverofficial.com';

    // 尚未包在 mailto / <a> 裡的純文字信箱
    $pattern = '/(?<!mailto:)(?<!["\'>])' . preg_quote($email, '/') . '(?![^<]*<\/a>)/i';
    $replacement = '<a href="mailto:' . $email . '" style="color:inherit;text-decoration:underline;">' . $email . '</a>';

    return (string) preg_replace($pattern, $replacement, $content);
}

/**
 * 有自訂開頭文案時：吃掉 WC 預設「嗨！…」段落，改輸出自訂文案
 */
add_action('woocommerce_email_header', function ($email_heading, $email = null) {
    if (!hover_email_has_custom_intro($email)) {
        return;
    }
    $GLOBALS['hover_email_intro_buffering'] = true;
    ob_start();
}, 1000, 2);

add_action('woocommerce_email_order_details', function ($order, $sent_to_admin, $plain_text, $email) {
    if (empty($GLOBALS['hover_email_intro_buffering'])) {
        return;
    }
    $GLOBALS['hover_email_intro_buffering'] = false;

    // 丟掉預設開頭文案
    if (ob_get_level() > 0) {
        ob_end_clean();
    }

    $intro = hover_email_format_intro(
        (string) hover_email_raw_intro_option($email),
        $order instanceof WC_Order ? $order : null,
        $email
    );

    if ($plain_text) {
        echo "\n" . wp_strip_all_tags($intro) . "\n\n";
        return;
    }

    echo wp_kses_post(wpautop($intro));
}, 1, 4);

function hover_email_format_intro(string $template, $order, $email): string
{
    $first = '';
    $full = '';
    $order_number = '';
    $order_date = '';

    if ($order instanceof WC_Order) {
        $first = $order->get_billing_first_name();
        $full = trim($order->get_formatted_billing_full_name());
        $order_number = $order->get_order_number();
        $order_date = wc_format_datetime($order->get_date_created());
    }

    if ($first === '' && is_object($email) && !empty($email->object) && $email->object instanceof WC_Order) {
        $order = $email->object;
        $first = $order->get_billing_first_name();
        $full = trim($order->get_formatted_billing_full_name());
        $order_number = $order->get_order_number();
        $order_date = wc_format_datetime($order->get_date_created());
    }

    $replace = [
        '{customer_first_name}' => $first !== '' ? $first : '顧客',
        '{customer_name}'       => $full !== '' ? $full : ($first !== '' ? $first : '顧客'),
        '{order_number}'        => $order_number !== '' ? $order_number : '',
        '{order_date}'          => $order_date !== '' ? $order_date : '',
        '{site_title}'          => wp_specialchars_decode(get_bloginfo('name'), ENT_QUOTES),
    ];

    // 若 email 物件有 format_string，一併支援 WC 內建 placeholder
    $out = strtr($template, $replace);
    if (is_object($email) && method_exists($email, 'format_string')) {
        $out = $email->format_string($out);
    }

    return $out;
}

add_action('woocommerce_email_order_details', function () {
    add_filter('woocommerce_order_get_customer_note', 'hover_email_blank_customer_note', 100);
}, 1);

add_action('woocommerce_email_order_details', function () {
    remove_filter('woocommerce_order_get_customer_note', 'hover_email_blank_customer_note', 100);
}, 100);

function hover_email_blank_customer_note($note)
{
    return '';
}

function hover_email_shipping_address_only($order, $sent_to_admin = false, $plain_text = false, $email = null): void
{
    if (!$order instanceof WC_Order) {
        return;
    }

    $shipping = $order->get_formatted_shipping_address();
    if (!$shipping) {
        return;
    }

    $phone = $order->get_shipping_phone() ?: $order->get_billing_phone();
    $title = '配送資訊';

    if ($plain_text) {
        echo "\n" . $title . "\n\n";
        echo wp_strip_all_tags($shipping) . "\n";
        if ($phone) {
            echo wp_strip_all_tags($phone) . "\n";
        }
        echo "\n";
        return;
    }

    $text_align = is_rtl() ? 'right' : 'left';
    ?>
    <table id="addresses" cellspacing="0" cellpadding="0" style="width:100%;vertical-align:top;margin-bottom:40px;padding:0;" border="0">
        <tr>
            <td style="text-align:<?php echo esc_attr($text_align); ?>;font-family:'Helvetica Neue',Helvetica,Roboto,Arial,sans-serif;border:0;padding:0;" valign="top" width="100%">
                <h2 style="margin:0 0 8px;"><?php echo esc_html($title); ?></h2>
                <address class="address" style="padding:12px;border:1px solid #e5e5e5;">
                    <?php echo wp_kses_post($shipping); ?>
                    <?php if ($phone) : ?>
                        <br /><?php echo esc_html($phone); ?>
                    <?php endif; ?>
                </address>
            </td>
        </tr>
    </table>
    <?php
}
