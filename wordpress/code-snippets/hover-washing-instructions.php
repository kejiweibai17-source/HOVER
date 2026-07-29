<?php
/**
 * HOVER — 商品洗滌方式（Washing Instructions）
 *
 * 使用方式（WordPress 後台）：
 * 1. 安裝並啟用插件「Code Snippets」
 * 2. Snippets → Add New → 貼上本檔內容
 * 3. Run snippet：Everywhere
 *
 * 後台位置：商品 → 編輯商品 → 下方「HOVER 洗滌方式」區塊
 *
 * REST API（給 Next.js）：
 * GET /wp-json/wc/v3/products?slug=xxx
 * 每筆商品會多欄位：hover_washing_instructions (object)
 *
 * Meta key：hover_washing_instructions（JSON）
 */

if (!defined('ABSPATH')) {
    exit;
}

if (defined('HWI_LOADED')) {
    return;
}
define('HWI_LOADED', true);

const HWI_META = 'hover_washing_instructions';

function hwi_defaults(): array
{
    return [
        'enabled' => true,
        'items'   => [
            '建議手洗或機洗冷水輕柔模式',
            '請勿使用漂白劑',
            '請勿烘乾',
            '可低溫熨燙（最高 110°C）',
            '洗滌前請將衣物翻面',
        ],
    ];
}

/**
 * 正規化已存資料。
 * 不可在 items 為空時自動灌入衣服預設文案，否則自訂洗滌說明會被覆蓋。
 */
function hwi_normalize(array $data): array
{
    $data['enabled'] = !empty($data['enabled']);

    $items = [];
    foreach (($data['items'] ?? []) as $item) {
        $item = sanitize_textarea_field((string) $item);
        if ($item !== '') {
            $items[] = $item;
        }
    }

    $data['items'] = $items;
    return $data;
}

function hwi_get_for_product(int $product_id): array
{
    $raw = get_post_meta($product_id, HWI_META, true);
    if (is_array($raw)) {
        return hwi_normalize($raw);
    }
    if (is_string($raw) && $raw !== '') {
        $decoded = json_decode($raw, true);
        if (is_array($decoded)) {
            return hwi_normalize($decoded);
        }
    }
    return [
        'enabled' => false,
        'items'   => [],
    ];
}

add_action('add_meta_boxes', function () {
    add_meta_box(
        'hwi-washing-instructions',
        'HOVER 洗滌方式',
        'hwi_render_meta_box',
        'product',
        'normal',
        'high'
    );
});

function hwi_render_meta_box($post): void
{
    $guide = hwi_get_for_product((int) $post->ID);
    if (empty(get_post_meta($post->ID, HWI_META, true))) {
        $guide = hwi_defaults();
        $guide['enabled'] = false;
    }

    wp_nonce_field('hwi_save', 'hwi_nonce');
    $payload = wp_json_encode($guide, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    ?>
    <div class="hwi-admin" id="hwi-admin">
        <p class="description" style="margin-top:0">
            設定此商品前台「洗滌方式」手風琴內容。每列一則說明，儲存後由 Next.js 商品頁讀取。
        </p>

        <label class="hwi-switch" style="margin:12px 0 16px">
            <input type="checkbox" id="hwi-enabled" <?php checked(!empty($guide['enabled'])); ?>>
            <span class="hwi-switch-ui"></span>
            <span class="hwi-switch-label">啟用洗滌方式（顯示於前台商品頁）</span>
        </label>

        <div class="hwi-toolbar">
            <button type="button" class="button" id="hwi-apply-template">套用預設內容</button>
            <button type="button" class="button" id="hwi-add-item">新增一則說明</button>
        </div>

        <div class="hwi-items" id="hwi-items"></div>

        <div class="hwi-preview-wrap">
            <h4 style="margin:16px 0 8px">前台預覽</h4>
            <div id="hwi-preview" class="hwi-preview"></div>
        </div>

        <input type="hidden" name="hwi_payload" id="hwi-payload" value="">
    </div>

    <script>window.HWI_INIT = <?php echo $payload ?: '{}'; ?>;</script>
    <?php
    hwi_print_admin_styles();
}

function hwi_print_admin_styles(): void
{
    static $printed = false;
    if ($printed) {
        return;
    }
    $printed = true;
    ?>
    <style>
        .hwi-admin .hwi-switch {
            display: inline-flex; align-items: center; gap: 12px; cursor: pointer; user-select: none;
        }
        .hwi-admin .hwi-switch input { position: absolute; opacity: 0; pointer-events: none; }
        .hwi-admin .hwi-switch-ui {
            width: 44px; height: 24px; border-radius: 999px; background: #c3c4c7; position: relative; transition: .2s;
        }
        .hwi-admin .hwi-switch-ui::after {
            content: ""; position: absolute; top: 3px; left: 3px; width: 18px; height: 18px;
            border-radius: 50%; background: #fff; transition: .2s; box-shadow: 0 1px 3px rgba(0,0,0,.2);
        }
        .hwi-admin .hwi-switch input:checked + .hwi-switch-ui { background: #2a514d; }
        .hwi-admin .hwi-switch input:checked + .hwi-switch-ui::after { transform: translateX(20px); }
        .hwi-admin .hwi-switch-label { font-weight: 600; font-size: 13px; }
        .hwi-admin .hwi-toolbar { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 12px; }
        .hwi-admin .hwi-item {
            display: flex; align-items: flex-start; gap: 8px; margin-bottom: 8px;
            padding: 10px 12px; border: 1px solid #dcdcde; border-radius: 8px; background: #fff;
        }
        .hwi-admin .hwi-item-index {
            width: 22px; height: 22px; border-radius: 50%; background: #f0f0f1;
            display: flex; align-items: center; justify-content: center; font-size: 11px; color: #666; flex-shrink: 0;
        }
        .hwi-admin .hwi-item-input { flex: 1; min-height: 40px; resize: vertical; }
        .hwi-admin .hwi-item-actions { display: flex; flex-direction: column; gap: 4px; flex-shrink: 0; }
        .hwi-admin .hwi-preview-wrap {
            border: 1px solid #dcdcde; border-radius: 8px; background: #fafafa; padding: 14px;
        }
        .hwi-admin .hwi-preview p { margin: 0 0 8px; font-size: 13px; line-height: 1.7; }
        .hwi-admin .hwi-muted { color: #888; font-size: 12px; padding: 8px 0; }
    </style>
    <?php
}

add_action('admin_footer', 'hwi_admin_footer_script');

function hwi_admin_footer_script(): void
{
    $screen = function_exists('get_current_screen') ? get_current_screen() : null;
    if (!$screen || $screen->id !== 'product' || $screen->base !== 'post') {
        return;
    }
    $defaults = wp_json_encode(hwi_defaults(), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    ?>
    <script>
    jQuery(function($){
        var defaults = <?php echo $defaults ?: '{}'; ?>;
        /**
         * 不可用 $.extend(true) 合併 defaults：陣列會按索引殘留舊預設句，
         * 第二次開啟／儲存後看起來像又跑回「衣服」預設洗滌文案。
         */
        var init = window.HWI_INIT && typeof window.HWI_INIT === 'object'
            ? window.HWI_INIT
            : null;
        var hasSavedItems = !!(init && Array.isArray(init.items) && init.items.length);
        var state = hasSavedItems
            ? JSON.parse(JSON.stringify(init))
            : JSON.parse(JSON.stringify(defaults));
        if (init && typeof init.enabled === 'boolean') {
            state.enabled = init.enabled;
        }

        function esc(s){ return $('<div/>').text(s || '').html(); }

        function syncPayload(){
            state.enabled = $('#hwi-enabled').is(':checked');
            $('#hwi-payload').val(JSON.stringify(state));
            renderPreview();
        }

        function renderItems(){
            var $wrap = $('#hwi-items').empty();
            (state.items || []).forEach(function(item, index){
                var row = '<div class="hwi-item" data-item-index="'+index+'">';
                row += '<span class="hwi-item-index">'+(index + 1)+'</span>';
                row += '<textarea class="large-text hwi-item-input" rows="2" data-item-index="'+index+'">'+esc(item)+'</textarea>';
                row += '<div class="hwi-item-actions">';
                row += '<button type="button" class="button button-small hwi-move-up" data-item-index="'+index+'" '+(index === 0 ? 'disabled' : '')+'>↑</button>';
                row += '<button type="button" class="button button-small hwi-move-down" data-item-index="'+index+'" '+(index === state.items.length - 1 ? 'disabled' : '')+'>↓</button>';
                row += '<button type="button" class="button-link-delete hwi-remove-item" data-item-index="'+index+'">刪除</button>';
                row += '</div></div>';
                $wrap.append(row);
            });
            syncPayload();
        }

        function renderPreview(){
            if (!state.enabled) {
                $('#hwi-preview').html('<div class="hwi-muted">洗滌方式已關閉，前台不會顯示。</div>');
                return;
            }
            if (!state.items || !state.items.length) {
                $('#hwi-preview').html('<div class="hwi-muted">請新增至少一則洗滌說明。</div>');
                return;
            }
            var html = '';
            state.items.forEach(function(item){
                if (!item) return;
                html += '<p>・'+esc(item)+'</p>';
            });
            $('#hwi-preview').html(html || '<div class="hwi-muted">請新增至少一則洗滌說明。</div>');
        }

        function readFromDom(){
            state.enabled = $('#hwi-enabled').is(':checked');
            var items = [];
            $('.hwi-item-input').each(function(){
                items.push($(this).val());
            });
            state.items = items;
        }

        $('#hwi-enabled').on('change', function(){
            readFromDom();
            syncPayload();
        });

        $(document).on('input change', '.hwi-item-input', function(){
            readFromDom();
            syncPayload();
        });

        $('#hwi-apply-template').on('click', function(){
            if (!confirm('套用預設內容會覆蓋目前列表，確定繼續？')) return;
            state = $.extend(true, {}, defaults);
            state.enabled = true;
            $('#hwi-enabled').prop('checked', true);
            renderItems();
        });

        $('#hwi-add-item').on('click', function(){
            readFromDom();
            state.items.push('');
            renderItems();
            $('#hwi-items .hwi-item-input').last().focus();
        });

        $(document).on('click', '.hwi-remove-item', function(){
            var idx = parseInt($(this).data('item-index'), 10);
            readFromDom();
            state.items.splice(idx, 1);
            renderItems();
        });

        $(document).on('click', '.hwi-move-up', function(){
            var idx = parseInt($(this).data('item-index'), 10);
            if (idx <= 0) return;
            readFromDom();
            var tmp = state.items[idx - 1];
            state.items[idx - 1] = state.items[idx];
            state.items[idx] = tmp;
            renderItems();
        });

        $(document).on('click', '.hwi-move-down', function(){
            var idx = parseInt($(this).data('item-index'), 10);
            readFromDom();
            if (idx >= state.items.length - 1) return;
            var tmp = state.items[idx + 1];
            state.items[idx + 1] = state.items[idx];
            state.items[idx] = tmp;
            renderItems();
        });

        $('form#post').on('submit', function(){
            readFromDom();
            syncPayload();
        });

        renderItems();
    });
    </script>
    <?php
}

add_action('woocommerce_process_product_meta', function ($post_id) {
    if (!isset($_POST['hwi_nonce']) || !wp_verify_nonce($_POST['hwi_nonce'], 'hwi_save')) {
        return;
    }
    if (!current_user_can('edit_post', $post_id)) {
        return;
    }

    $raw = json_decode(wp_unslash($_POST['hwi_payload'] ?? ''), true);
    if (!is_array($raw)) {
        return;
    }

    update_post_meta($post_id, HWI_META, hwi_normalize($raw));
}, 10, 1);

add_filter('woocommerce_rest_prepare_product_object', function ($response, $object, $request) {
    if (!is_object($response) || !method_exists($object, 'get_id')) {
        return $response;
    }

    $data = $response->get_data();
    $data['hover_washing_instructions'] = hwi_get_for_product((int) $object->get_id());
    $response->set_data($data);

    return $response;
}, 10, 3);

add_action('init', function () {
    register_post_meta('product', HWI_META, [
        'type'              => 'string',
        'single'            => true,
        'show_in_rest'      => true,
        'sanitize_callback' => function ($value) {
            if (is_array($value)) {
                return wp_json_encode(hwi_normalize($value), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
            }
            return is_string($value) ? $value : '';
        },
        'auth_callback'     => function () {
            return current_user_can('edit_products');
        },
    ]);
});
