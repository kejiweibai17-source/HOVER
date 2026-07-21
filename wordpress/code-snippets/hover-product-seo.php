<?php
/**
 * HOVER — 商品 SEO（Title / Description）
 *
 * 使用方式（WordPress 後台）：
 * 1. 安裝並啟用插件「Code Snippets」
 * 2. Snippets → Add New → 貼上本檔內容
 * 3. Run snippet：Everywhere
 *
 * 後台位置：商品 → 編輯商品 → 下方「HOVER 商品 SEO」區塊
 *
 * REST API（給 Next.js）：
 * GET /wp-json/wc/v3/products?slug=xxx
 * 每筆商品會多欄位：hover_seo (object) = { title, description }
 *
 * Meta key：hover_seo（JSON）
 *
 * 可用變數（前台會替換）：
 *   %title%     → 商品名稱
 *   %sitename%  → HOVER
 *   %sep%       → ｜
 */

if (!defined('ABSPATH')) {
    exit;
}

if (defined('HSEO_LOADED')) {
    return;
}
define('HSEO_LOADED', true);

const HSEO_META = 'hover_seo';

function hseo_defaults(): array
{
    return [
        'title'       => '',
        'description' => '',
    ];
}

function hseo_normalize(array $data): array
{
    return [
        'title'       => sanitize_text_field((string) ($data['title'] ?? '')),
        'description' => sanitize_textarea_field((string) ($data['description'] ?? '')),
    ];
}

function hseo_get_for_product(int $product_id): array
{
    $raw = get_post_meta($product_id, HSEO_META, true);
    if (is_array($raw)) {
        return hseo_normalize($raw);
    }
    if (is_string($raw) && $raw !== '') {
        $decoded = json_decode($raw, true);
        if (is_array($decoded)) {
            return hseo_normalize($decoded);
        }
    }
    return hseo_defaults();
}

/** 商品編輯頁 Meta Box */
add_action('add_meta_boxes', function () {
    add_meta_box(
        'hseo-product-seo',
        'HOVER 商品 SEO',
        'hseo_render_meta_box',
        'product',
        'normal',
        'high'
    );
});

function hseo_render_meta_box($post): void
{
    $seo = hseo_get_for_product((int) $post->ID);
    wp_nonce_field('hseo_save', 'hseo_nonce');
    ?>
    <div class="hseo-admin" id="hseo-admin">
        <p class="description" style="margin-top:0">
            設定此商品前台 SEO 標題與描述。留空則自動使用商品名稱與簡短說明。
            可用變數：<code>%title%</code>（商品名）、<code>%sitename%</code>（HOVER）、<code>%sep%</code>（｜）
        </p>

        <p>
            <label for="hseo-title"><strong>SEO 標題（Title）</strong></label>
            <input
                type="text"
                class="large-text"
                id="hseo-title"
                name="hseo_title"
                value="<?php echo esc_attr($seo['title']); ?>"
                placeholder="%title%%sep%%sitename%"
                maxlength="120"
            >
            <span class="hseo-counter" id="hseo-title-count">0</span> / 60（建議）
        </p>

        <p>
            <label for="hseo-description"><strong>SEO 描述（Description）</strong></label>
            <textarea
                class="large-text"
                id="hseo-description"
                name="hseo_description"
                rows="4"
                maxlength="320"
                placeholder="探索 HOVER【%title%】——以舒適剪裁與簡約質感，為日常穿搭帶來更多可能。"
            ><?php echo esc_textarea($seo['description']); ?></textarea>
            <span class="hseo-counter" id="hseo-desc-count">0</span> / 155（建議）
        </p>

        <div class="hseo-preview-wrap">
            <h4 style="margin:8px 0 6px">Google 預覽</h4>
            <div class="hseo-serp" id="hseo-serp">
                <div class="hseo-serp-title" id="hseo-serp-title"></div>
                <div class="hseo-serp-url">hover.com.tw › products › …</div>
                <div class="hseo-serp-desc" id="hseo-serp-desc"></div>
            </div>
        </div>
    </div>

    <style>
        .hseo-admin .hseo-counter { font-size: 12px; color: #666; margin-left: 4px; }
        .hseo-admin .hseo-counter.is-over { color: #b32d2e; font-weight: 600; }
        .hseo-admin .hseo-preview-wrap {
            border: 1px solid #dcdcde; border-radius: 8px; background: #fafafa; padding: 14px; margin-top: 8px;
        }
        .hseo-admin .hseo-serp-title {
            font-size: 18px; line-height: 1.3; color: #1a0dab; margin-bottom: 2px;
            overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        }
        .hseo-admin .hseo-serp-url { font-size: 13px; color: #006621; margin-bottom: 4px; }
        .hseo-admin .hseo-serp-desc { font-size: 13px; line-height: 1.5; color: #4d5156; }
        .hseo-admin code {
            background: #f0f0f1; padding: 1px 5px; border-radius: 3px; font-size: 12px;
        }
    </style>

    <script>
    jQuery(function ($) {
        var productName = <?php echo wp_json_encode(get_the_title($post) ?: '商品名稱'); ?>;

        function resolve(tpl) {
            return String(tpl || '')
                .replace(/%title%/gi, productName)
                .replace(/%sitename%/gi, 'HOVER')
                .replace(/%sep%/gi, '｜')
                .replace(/\s+/g, ' ')
                .trim();
        }

        function updateCounters() {
            var titleLen = ($('#hseo-title').val() || '').length;
            var descLen = ($('#hseo-description').val() || '').length;
            $('#hseo-title-count').text(titleLen).toggleClass('is-over', titleLen > 60);
            $('#hseo-desc-count').text(descLen).toggleClass('is-over', descLen > 155);
        }

        function updatePreview() {
            var rawTitle = $('#hseo-title').val();
            var rawDesc = $('#hseo-description').val();
            var title = resolve(rawTitle) || (productName + '｜HOVER');
            var desc = resolve(rawDesc) || '探索 HOVER【' + productName + '】——以舒適剪裁與簡約質感，為日常穿搭帶來更多可能。';
            $('#hseo-serp-title').text(title);
            $('#hseo-serp-desc').text(desc);
            updateCounters();
        }

        $('#hseo-title, #hseo-description').on('input', updatePreview);
        updatePreview();
    });
    </script>
    <?php
}

/** 儲存 */
add_action('woocommerce_process_product_meta', function ($post_id) {
    if (!isset($_POST['hseo_nonce']) || !wp_verify_nonce($_POST['hseo_nonce'], 'hseo_save')) {
        return;
    }
    if (!current_user_can('edit_post', $post_id)) {
        return;
    }

    $normalized = hseo_normalize([
        'title'       => wp_unslash($_POST['hseo_title'] ?? ''),
        'description' => wp_unslash($_POST['hseo_description'] ?? ''),
    ]);

    update_post_meta($post_id, HSEO_META, $normalized);
}, 10, 1);

/** WooCommerce REST：附加 hover_seo */
add_filter('woocommerce_rest_prepare_product_object', function ($response, $object, $request) {
    if (!is_object($response) || !method_exists($object, 'get_id')) {
        return $response;
    }

    $data = $response->get_data();
    $data['hover_seo'] = hseo_get_for_product((int) $object->get_id());
    $response->set_data($data);

    return $response;
}, 10, 3);

/** 註冊 post meta（REST 相容） */
add_action('init', function () {
    register_post_meta('product', HSEO_META, [
        'type'              => 'object',
        'single'            => true,
        'show_in_rest'      => [
            'schema' => [
                'type'       => 'object',
                'properties' => [
                    'title'       => ['type' => 'string'],
                    'description' => ['type' => 'string'],
                ],
            ],
        ],
        'sanitize_callback' => function ($value) {
            if (is_array($value)) {
                return hseo_normalize($value);
            }
            if (is_string($value) && $value !== '') {
                $decoded = json_decode($value, true);
                if (is_array($decoded)) {
                    return hseo_normalize($decoded);
                }
            }
            return hseo_defaults();
        },
        'auth_callback'     => function () {
            return current_user_can('edit_products');
        },
    ]);
});
