<?php
/**
 * HOVER — 動態組合包扣庫存
 *
 * 組合包前台仍是一筆商品；庫存改扣綁定的子商品／變體。
 * 任一子商品不足 → 組合包不可買。
 *
 * 使用方式（Code Snippets）：
 * 1. 新增 snippet，貼上本檔 → Everywhere → 啟用
 * 2. 編輯組合包商品 →「HOVER 組合扣庫存」用下拉搜尋商品、再選尺寸／變體
 * 3. 組合包請關閉「管理庫存」（儲存綁定時會自動關閉）
 *
 * Meta：hover_bundle_components
 *   [{ product_id, variation_id, qty }, ...]
 *
 * REST（wc/v3/products）：
 *   hover_bundle_components
 *   hover_bundle_available_qty  （可賣包數；null = 不限）
 *   hover_bundle_in_stock
 */

if (!defined('ABSPATH')) {
    exit;
}

if (defined('HPBS_LOADED')) {
    return;
}
define('HPBS_LOADED', true);

const HPBS_META = 'hover_bundle_components';
const HPBS_ITEM_META = '_hover_bundle_components';
const HPBS_ITEM_REDUCED = '_hover_bundle_stock_reduced';

function hpbs_normalize_components($raw): array
{
    if (is_string($raw) && $raw !== '') {
        $decoded = json_decode($raw, true);
        $raw = is_array($decoded) ? $decoded : [];
    }
    if (!is_array($raw)) {
        return [];
    }

    $out = [];
    foreach ($raw as $row) {
        if (!is_array($row)) {
            continue;
        }
        $product_id = absint($row['product_id'] ?? $row['productId'] ?? 0);
        if ($product_id <= 0) {
            continue;
        }
        $variation_id = absint($row['variation_id'] ?? $row['variationId'] ?? 0);
        $qty = absint($row['qty'] ?? 1);
        if ($qty <= 0) {
            $qty = 1;
        }
        $name = '';
        $product = wc_get_product($variation_id > 0 ? $variation_id : $product_id);
        if ($product) {
            $name = $product->get_name();
        }
        $out[] = [
            'product_id'   => $product_id,
            'variation_id' => $variation_id,
            'qty'          => $qty,
            'name'         => $name,
        ];
    }

    return $out;
}

function hpbs_get_components(int $product_id): array
{
    if ($product_id <= 0) {
        return [];
    }
    return hpbs_normalize_components(get_post_meta($product_id, HPBS_META, true));
}

function hpbs_component_product(array $component)
{
    $variation_id = absint($component['variation_id'] ?? 0);
    $product_id = absint($component['product_id'] ?? 0);
    $id = $variation_id > 0 ? $variation_id : $product_id;
    return $id > 0 ? wc_get_product($id) : null;
}

/**
 * 可賣組合包數量。
 * null = 不限量；0 = 售完。
 */
function hpbs_available_packs(array $components): ?int
{
    if (!$components) {
        return null;
    }

    $min = null;
    foreach ($components as $component) {
        $product = hpbs_component_product($component);
        $need = max(1, absint($component['qty'] ?? 1));
        if (!$product) {
            return 0;
        }
        if (!$product->is_purchasable() || $product->get_status() !== 'publish') {
            // 變體 status 可能是 publish；父商品下架則不可買
            $parent_id = $product->get_parent_id();
            if ($parent_id) {
                $parent = wc_get_product($parent_id);
                if (!$parent || $parent->get_status() !== 'publish') {
                    return 0;
                }
            } elseif ($product->get_status() !== 'publish') {
                return 0;
            }
        }

        if (!$product->is_in_stock() && !$product->backorders_allowed()) {
            return 0;
        }

        if (!$product->managing_stock()) {
            if ($product->get_stock_status() === 'outofstock' && !$product->backorders_allowed()) {
                return 0;
            }
            // 未管庫存且有貨 → 此元件不限量
            continue;
        }

        if ($product->backorders_allowed()) {
            continue;
        }

        $stock_qty = $product->get_stock_quantity();
        if ($stock_qty === null) {
            if ($product->get_stock_status() === 'outofstock') {
                return 0;
            }
            continue;
        }

        $packs = (int) floor(max(0, (float) $stock_qty) / $need);
        $min = $min === null ? $packs : min($min, $packs);
    }

    return $min;
}

function hpbs_components_in_stock(array $components): bool
{
    if (!$components) {
        return true;
    }
    $packs = hpbs_available_packs($components);
    return $packs === null || $packs > 0;
}

function hpbs_sync_bundle_stock_status(int $product_id): void
{
    $components = hpbs_get_components($product_id);
    if (!$components) {
        return;
    }
    $product = wc_get_product($product_id);
    if (!$product) {
        return;
    }

    $product->set_manage_stock(false);
    $product->set_stock_status(hpbs_components_in_stock($components) ? 'instock' : 'outofstock');

    if ($product->is_type('variable')) {
        foreach ($product->get_children() as $vid) {
            $variation = wc_get_product((int) $vid);
            if (!$variation) {
                continue;
            }
            $variation->set_manage_stock(false);
            $variation->set_stock_status(
                hpbs_components_in_stock($components) ? 'instock' : 'outofstock'
            );
            $variation->save();
        }
    }

    $product->save();
}

function hpbs_parse_components_from_request(): ?array
{
    if (!isset($_POST['hpbs_components_json'])) {
        return null;
    }
    $decoded = json_decode(wp_unslash((string) $_POST['hpbs_components_json']), true);
    if (!is_array($decoded)) {
        return [];
    }
    return hpbs_normalize_components($decoded);
}

/** Metabox */
add_action('add_meta_boxes', function () {
    add_meta_box(
        'hover_product_bundle_stock',
        __('HOVER 組合扣庫存', 'hover'),
        'hpbs_render_metabox',
        'product',
        'normal',
        'default'
    );
});

add_action('admin_enqueue_scripts', function ($hook) {
    if ($hook !== 'post.php' && $hook !== 'post-new.php') {
        return;
    }
    $screen = function_exists('get_current_screen') ? get_current_screen() : null;
    if (!$screen || $screen->post_type !== 'product') {
        return;
    }
    wp_enqueue_style('woocommerce_admin_styles');
    wp_enqueue_script('selectWoo');
    wp_enqueue_script('wc-enhanced-select');
});

add_action('wp_ajax_hpbs_get_variations', function () {
    if (!current_user_can('edit_products')) {
        wp_send_json_error(['message' => 'forbidden'], 403);
    }
    check_ajax_referer('hpbs_admin', 'security');

    $product_id = isset($_GET['product_id']) ? absint($_GET['product_id']) : 0;
    $product = $product_id ? wc_get_product($product_id) : null;
    if (!$product) {
        wp_send_json_success(['variations' => [], 'type' => 'missing']);
    }

    if (!$product->is_type('variable')) {
        wp_send_json_success([
            'variations' => [],
            'type'       => $product->get_type(),
            'label'      => $product->get_name(),
        ]);
    }

    $variations = [];
    foreach ($product->get_children() as $vid) {
        $variation = wc_get_product((int) $vid);
        if (!$variation || $variation->get_status() === 'trash') {
            continue;
        }
        $attrs = function_exists('wc_get_formatted_variation')
            ? wp_strip_all_tags(wc_get_formatted_variation($variation, true, false, true))
            : '';
        if ($attrs === '') {
            $attrs = $variation->get_name();
        }
        $stock = $variation->managing_stock() ? $variation->get_stock_quantity() : null;
        $variations[] = [
            'id'    => (int) $vid,
            'label' => sprintf('#%d — %s%s', (int) $vid, $attrs, $stock !== null ? '（庫存 ' . $stock . '）' : ''),
        ];
    }

    wp_send_json_success([
        'variations' => $variations,
        'type'       => 'variable',
        'label'      => $product->get_name(),
    ]);
});

function hpbs_component_select_payload(array $components): array
{
    $out = [];
    foreach ($components as $row) {
        $product_id = absint($row['product_id'] ?? 0);
        $variation_id = absint($row['variation_id'] ?? 0);
        $product = $product_id ? wc_get_product($product_id) : null;
        $variation = $variation_id ? wc_get_product($variation_id) : null;
        $product_label = $product
            ? sprintf('%s (#%d)', $product->get_name(), $product_id)
            : ($product_id ? '#' . $product_id : '');
        $variation_label = '';
        if ($variation) {
            $attrs = function_exists('wc_get_formatted_variation')
                ? wp_strip_all_tags(wc_get_formatted_variation($variation, true, false, true))
                : '';
            $variation_label = sprintf('#%d — %s', $variation_id, $attrs !== '' ? $attrs : $variation->get_name());
        }
        $out[] = [
            'product_id'      => $product_id,
            'variation_id'    => $variation_id,
            'qty'             => max(1, absint($row['qty'] ?? 1)),
            'name'            => (string) ($row['name'] ?? ''),
            'product_label'   => $product_label,
            'variation_label' => $variation_label,
        ];
    }
    return $out;
}

function hpbs_render_metabox($post): void
{
    wp_nonce_field('hpbs_save_meta', 'hpbs_nonce');
    $components = hpbs_get_components((int) $post->ID);
    $available = $components ? hpbs_available_packs($components) : null;
    $payload = hpbs_component_select_payload($components);
    $search_nonce = wp_create_nonce('search-products');
    $admin_nonce = wp_create_nonce('hpbs_admin');
    ?>
    <div class="hpbs-admin" id="hpbs-admin-root"
         data-components="<?php echo esc_attr(wp_json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)); ?>"
         data-ajax-url="<?php echo esc_url(admin_url('admin-ajax.php')); ?>"
         data-search-nonce="<?php echo esc_attr($search_nonce); ?>"
         data-admin-nonce="<?php echo esc_attr($admin_nonce); ?>">
        <p class="description" style="margin-top:0;">
            <?php esc_html_e('前台仍顯示這一筆組合包；下單後改扣下方綁定的子商品／變體庫存。任一子商品售完或缺量，組合包即不可買。可自由搭配多款（不限顏色、不限兩件）。', 'hover'); ?>
        </p>
        <p style="margin:8px 0 12px;">
            <strong><?php esc_html_e('目前可賣包數：', 'hover'); ?></strong>
            <?php
            if (!$components) {
                echo esc_html__('（尚未綁定）', 'hover');
            } elseif ($available === null) {
                echo esc_html__('不限', 'hover');
            } else {
                echo esc_html((string) $available);
            }
            ?>
        </p>
        <table class="widefat striped hpbs-table">
            <thead>
                <tr>
                    <th style="width:38%;"><?php esc_html_e('商品', 'hover'); ?></th>
                    <th style="width:38%;"><?php esc_html_e('尺寸／變體', 'hover'); ?></th>
                    <th style="width:12%;"><?php esc_html_e('每包數量', 'hover'); ?></th>
                    <th style="width:12%;"></th>
                </tr>
            </thead>
            <tbody class="hpbs-rows"></tbody>
        </table>
        <p style="margin:12px 0;">
            <button type="button" class="button hpbs-add-row"><?php esc_html_e('新增子商品', 'hover'); ?></button>
        </p>
        <input type="hidden" name="hpbs_components_json" id="hpbs_components_json" value="">
        <p class="description">
            <?php esc_html_e('用下拉搜尋商品，再選尺寸／變體。簡單商品選「無變體（整件商品）」。每包數量＝賣出 1 組時要扣幾件。', 'hover'); ?>
        </p>
    </div>
    <style>
        .hpbs-table { max-width: 980px; }
        .hpbs-table td { vertical-align: middle; }
        .hpbs-table .select2-container { width: 100% !important; max-width: 100%; }
        .hpbs-qty { width: 72px; }
    </style>
    <script>
    (function($){
        var root = document.getElementById('hpbs-admin-root');
        if (!root || !window.jQuery) return;
        var $root = $(root);
        var $tbody = $root.find('.hpbs-rows');
        var $hidden = $('#hpbs_components_json');
        var ajaxUrl = root.getAttribute('data-ajax-url') || ajaxurl;
        var searchNonce = root.getAttribute('data-search-nonce') || '';
        var adminNonce = root.getAttribute('data-admin-nonce') || '';
        var initial = [];
        try { initial = JSON.parse(root.getAttribute('data-components') || '[]') || []; } catch (e) { initial = []; }

        function esc(s){
            return $('<div/>').text(s || '').html();
        }

        function sync(){
            var rows = [];
            $tbody.find('.hpbs-row').each(function(){
                var $tr = $(this);
                var productId = parseInt($tr.find('.hpbs-product-select').val(), 10) || 0;
                if (!productId) return;
                rows.push({
                    product_id: productId,
                    variation_id: parseInt($tr.find('.hpbs-variation-select').val(), 10) || 0,
                    qty: Math.max(1, parseInt($tr.find('.hpbs-qty').val(), 10) || 1)
                });
            });
            $hidden.val(JSON.stringify(rows));
        }

        function initProductSelect($select, selectedId, selectedLabel){
            if (selectedId) {
                var opt = new Option(selectedLabel || ('#' + selectedId), selectedId, true, true);
                $select.append(opt);
            }
            $select.selectWoo({
                allowClear: true,
                placeholder: '搜尋商品…',
                minimumInputLength: 1,
                ajax: {
                    url: ajaxUrl,
                    dataType: 'json',
                    delay: 250,
                    data: function(params){
                        return {
                            term: params.term,
                            action: 'woocommerce_json_search_products',
                            security: searchNonce
                        };
                    },
                    processResults: function(data){
                        var results = [];
                        if (data) {
                            $.each(data, function(id, text){
                                results.push({ id: id, text: text });
                            });
                        }
                        return { results: results };
                    },
                    cache: true
                }
            });
        }

        function fillVariationSelect($select, variations, selectedId, productType){
            $select.empty();
            if (!variations || !variations.length) {
                $select.append(new Option('無變體（整件商品）', '0', true, true));
                $select.prop('disabled', productType === 'missing');
            } else {
                $select.append(new Option('請選擇尺寸／變體', '', false, false));
                variations.forEach(function(v){
                    var selected = String(v.id) === String(selectedId);
                    $select.append(new Option(v.label, v.id, selected, selected));
                });
                if (selectedId && !$select.find('option[value="'+selectedId+'"]').length) {
                    $select.append(new Option('#' + selectedId, selectedId, true, true));
                }
                $select.prop('disabled', false);
            }
            if ($select.hasClass('select2-hidden-accessible')) {
                $select.trigger('change.select2');
            } else {
                $select.selectWoo({ width: '100%', placeholder: '選擇變體…' });
            }
        }

        function loadVariations($tr, productId, selectedVariationId){
            var $varSelect = $tr.find('.hpbs-variation-select');
            if (!productId) {
                fillVariationSelect($varSelect, [], 0, 'missing');
                sync();
                return;
            }
            $varSelect.prop('disabled', true);
            $.getJSON(ajaxUrl, {
                action: 'hpbs_get_variations',
                security: adminNonce,
                product_id: productId
            }).done(function(resp){
                var data = (resp && resp.data) ? resp.data : {};
                fillVariationSelect($varSelect, data.variations || [], selectedVariationId || 0, data.type || '');
                sync();
            }).fail(function(){
                fillVariationSelect($varSelect, [], selectedVariationId || 0, 'missing');
                sync();
            });
        }

        function addRow(row){
            row = row || {};
            var $tr = $([
                '<tr class="hpbs-row">',
                '<td><select class="hpbs-product-select" style="width:100%"></select></td>',
                '<td><select class="hpbs-variation-select" style="width:100%"></select></td>',
                '<td><input type="number" class="hpbs-qty" min="1" step="1" value="'+esc(row.qty || 1)+'"></td>',
                '<td><button type="button" class="button-link-delete hpbs-remove">移除</button></td>',
                '</tr>'
            ].join(''));
            $tbody.append($tr);
            initProductSelect(
                $tr.find('.hpbs-product-select'),
                row.product_id || null,
                row.product_label || row.name || ''
            );
            if (row.product_id) {
                // 先放已選變體，再异步刷新清單
                if (row.variation_id && row.variation_label) {
                    fillVariationSelect(
                        $tr.find('.hpbs-variation-select'),
                        [{ id: row.variation_id, label: row.variation_label }],
                        row.variation_id,
                        'variable'
                    );
                }
                loadVariations($tr, row.product_id, row.variation_id || 0);
            } else {
                fillVariationSelect($tr.find('.hpbs-variation-select'), [], 0, 'missing');
            }
            sync();
        }

        $root.on('click', '.hpbs-add-row', function(){
            addRow({ qty: 1 });
        });
        $root.on('click', '.hpbs-remove', function(){
            $(this).closest('tr').remove();
            if (!$tbody.find('.hpbs-row').length) addRow({ qty: 1 });
            sync();
        });
        $root.on('change', '.hpbs-product-select', function(){
            var $tr = $(this).closest('tr');
            loadVariations($tr, $(this).val(), 0);
        });
        $root.on('change input', '.hpbs-variation-select, .hpbs-qty', sync);
        $('#post').on('submit', sync);

        if (initial.length) {
            initial.forEach(addRow);
        } else {
            addRow({ qty: 1 });
        }
    })(jQuery);
    </script>
    <?php
}

add_action('save_post_product', function ($post_id) {
    if (!isset($_POST['hpbs_nonce']) || !wp_verify_nonce($_POST['hpbs_nonce'], 'hpbs_save_meta')) {
        return;
    }
    if (defined('DOING_AUTOSAVE') && DOING_AUTOSAVE) {
        return;
    }
    if (!current_user_can('edit_post', $post_id)) {
        return;
    }

    $parsed = hpbs_parse_components_from_request();
    if ($parsed === null) {
        return;
    }

    if (!$parsed) {
        delete_post_meta($post_id, HPBS_META);
        return;
    }

    update_post_meta(
        $post_id,
        HPBS_META,
        wp_json_encode($parsed, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)
    );
    hpbs_sync_bundle_stock_status((int) $post_id);
}, 30);

/** REST */
add_filter('woocommerce_rest_prepare_product_object', function ($response, $object) {
    if (!($response instanceof WP_REST_Response) || !is_object($object) || !method_exists($object, 'get_id')) {
        return $response;
    }
    $product_id = (int) $object->get_id();
    $components = hpbs_get_components($product_id);
    $available = $components ? hpbs_available_packs($components) : null;
    $response->data['hover_bundle_components'] = $components;
    $response->data['hover_bundle_available_qty'] = $available;
    $response->data['hover_bundle_in_stock'] = $components
        ? hpbs_components_in_stock($components)
        : (($response->data['stock_status'] ?? '') !== 'outofstock');
    return $response;
}, 25, 2);

add_action('init', function () {
    register_post_meta('product', HPBS_META, [
        'type'              => 'string',
        'single'            => true,
        'show_in_rest'      => true,
        'auth_callback'     => function () {
            return current_user_can('edit_products');
        },
    ]);
});

function hpbs_item_components($item): array
{
    $raw = $item->get_meta(HPBS_ITEM_META, true);
    if (is_string($raw) && $raw !== '') {
        $parsed = hpbs_normalize_components($raw);
        if ($parsed) {
            return $parsed;
        }
    }
    if (is_array($raw) && $raw) {
        return hpbs_normalize_components($raw);
    }
    return hpbs_get_components((int) $item->get_product_id());
}

function hpbs_attach_components_to_item($item): array
{
    $components = hpbs_item_components($item);
    if ($components) {
        $item->update_meta_data(
            HPBS_ITEM_META,
            wp_json_encode($components, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)
        );
        $item->save();
    }
    return $components;
}

function hpbs_adjust_component_stock(array $components, int $pack_qty, string $operation, $order = null): void
{
    if ($pack_qty <= 0 || !$components) {
        return;
    }
    $notes = [];
    foreach ($components as $component) {
        $product = hpbs_component_product($component);
        if (!$product || !$product->managing_stock()) {
            continue;
        }
        $need = max(1, absint($component['qty'] ?? 1)) * $pack_qty;
        $before = $product->get_stock_quantity();
        wc_update_product_stock($product, $need, $operation);
        $after = wc_get_product($product->get_id());
        $after_qty = $after ? $after->get_stock_quantity() : null;
        $label = $component['name'] ?: ('#' . $product->get_id());
        $notes[] = sprintf(
            '%s %s%d（%s → %s）',
            $label,
            $operation === 'decrease' ? '−' : '+',
            $need,
            $before === null ? 'n/a' : (string) $before,
            $after_qty === null ? 'n/a' : (string) $after_qty
        );
    }
    if ($notes && $order && is_object($order) && method_exists($order, 'add_order_note')) {
        $order->add_order_note(
            'HOVER 組合包庫存' . ($operation === 'decrease' ? '扣除' : '回補') . '：' . implode('；', $notes)
        );
    }
}

/** 訂單建立 line item（含 REST）時快照綁定 */
add_action('woocommerce_new_order_item', function ($item_id, $item, $order_id) {
    if (!is_object($item) || !method_exists($item, 'get_product_id')) {
        return;
    }
    if (!method_exists($item, 'get_type') || $item->get_type() !== 'line_item') {
        return;
    }
    $components = hpbs_get_components((int) $item->get_product_id());
    if (!$components) {
        return;
    }
    $item->update_meta_data(
        HPBS_ITEM_META,
        wp_json_encode($components, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)
    );
    $item->save();
}, 20, 3);

add_action('woocommerce_reduce_order_stock', function ($order) {
    if (!$order || !is_a($order, 'WC_Order')) {
        return;
    }
    foreach ($order->get_items() as $item) {
        if (!is_object($item) || !method_exists($item, 'get_product_id')) {
            continue;
        }
        if ($item->get_meta(HPBS_ITEM_REDUCED, true) === 'yes') {
            continue;
        }
        $components = hpbs_attach_components_to_item($item);
        if (!$components) {
            continue;
        }
        $qty = max(0, (int) $item->get_quantity());
        hpbs_adjust_component_stock($components, $qty, 'decrease', $order);
        $item->update_meta_data(HPBS_ITEM_REDUCED, 'yes');
        $item->save();

        // 同步組合包狀態
        hpbs_sync_bundle_stock_status((int) $item->get_product_id());
    }
}, 20);

add_action('woocommerce_restore_order_stock', function ($order) {
    if (!$order || !is_a($order, 'WC_Order')) {
        return;
    }
    foreach ($order->get_items() as $item) {
        if (!is_object($item) || !method_exists($item, 'get_product_id')) {
            continue;
        }
        if ($item->get_meta(HPBS_ITEM_REDUCED, true) !== 'yes') {
            continue;
        }
        $components = hpbs_item_components($item);
        if (!$components) {
            continue;
        }
        $qty = max(0, (int) $item->get_quantity());
        hpbs_adjust_component_stock($components, $qty, 'increase', $order);
        $item->delete_meta_data(HPBS_ITEM_REDUCED);
        $item->save();
        hpbs_sync_bundle_stock_status((int) $item->get_product_id());
    }
}, 20);

/**
 * 組合包子商品顯示標籤（揀貨／後台／信件共用）。
 * 例：經典緹花中筒襪｜黑｜F
 */
function hpbs_component_label(array $component): string
{
    $variation_id = absint($component['variation_id'] ?? 0);
    $product_id = absint($component['product_id'] ?? 0);
    $id = $variation_id > 0 ? $variation_id : $product_id;
    $product = $id > 0 ? wc_get_product($id) : null;
    $name = '';
    $specs = [];

    if ($product instanceof WC_Product) {
        if ($product->is_type('variation')) {
            $parent = wc_get_product($product->get_parent_id());
            $name = $parent ? $parent->get_name() : $product->get_name();
            foreach ($product->get_attributes() as $taxonomy => $value) {
                if ($value === '' || $value === null) {
                    continue;
                }
                $value = (string) $value;
                if (taxonomy_exists((string) $taxonomy)) {
                    $term = get_term_by('slug', $value, (string) $taxonomy);
                    $specs[] = ($term && !is_wp_error($term)) ? $term->name : $value;
                } else {
                    $specs[] = $value;
                }
            }
        } else {
            $name = $product->get_name();
        }
    }

    if ($name === '') {
        $fallback = trim((string) ($component['name'] ?? ''));
        if (preg_match('/^(.+?)\s+[–—-]\s+(.+)$/u', $fallback, $m)) {
            $name = trim($m[1]);
            foreach (preg_split('/\s*[,，]\s*/u', trim($m[2])) ?: [] as $part) {
                $part = trim((string) $part);
                if ($part !== '') {
                    $specs[] = $part;
                }
            }
        } else {
            $name = $fallback !== '' ? $fallback : ('#' . $id);
        }
    }

    $name = trim((string) preg_replace('/\s+[–—-]\s+.+$/u', '', $name));
    $label = $name !== '' ? $name : ('#' . $id);
    if ($specs) {
        $label .= '｜' . implode('｜', array_values(array_filter(array_map('strval', $specs))));
    }
    return $label;
}

/** 訂單列 →「含：A ×1、B ×1」 */
function hpbs_order_item_contents_label($item): string
{
    if (!is_object($item) || !method_exists($item, 'get_quantity')) {
        return '';
    }
    $components = function_exists('hpbs_item_components')
        ? hpbs_item_components($item)
        : [];
    if (!$components) {
        return '';
    }
    $pack = max(1, (int) $item->get_quantity());
    $parts = [];
    foreach ($components as $component) {
        $per = max(1, absint($component['qty'] ?? 1));
        $parts[] = hpbs_component_label($component) . ' ×' . ($per * $pack);
    }
    return $parts ? ('含：' . implode('、', $parts)) : '';
}

/** 後台訂單項目：顯示組合包實際出貨內容（揀貨依據） */
add_action('woocommerce_after_order_itemmeta', function ($item_id, $item) {
    if (!$item instanceof WC_Order_Item_Product || !is_admin()) {
        return;
    }
    $label = hpbs_order_item_contents_label($item);
    if ($label === '') {
        return;
    }
    echo '<div class="hpbs-ship-note" style="margin:8px 0 4px;padding:8px 10px;border-left:3px solid #2a514d;background:#f4f8f7;font-size:12px;line-height:1.65;">';
    echo '<strong>組合包出貨內容：</strong>' . esc_html($label);
    echo '<br><span style="color:#646970;">揀貨請依上列子商品／規格，勿只看組合包本身的尺寸。</span>';
    echo '</div>';
}, 25, 2);

/** 子商品庫存變動時，更新有引用它的組合包狀態（輕量掃 meta） */
add_action('woocommerce_product_set_stock', 'hpbs_on_child_stock_changed', 30);
add_action('woocommerce_variation_set_stock', 'hpbs_on_child_stock_changed', 30);

function hpbs_on_child_stock_changed($product): void
{
    if (!$product || !is_object($product) || !method_exists($product, 'get_id')) {
        return;
    }
    $child_id = (int) $product->get_id();
    $parent_id = method_exists($product, 'get_parent_id') ? (int) $product->get_parent_id() : 0;

    $q = new WP_Query([
        'post_type'      => 'product',
        'post_status'    => ['publish', 'private', 'draft'],
        'posts_per_page' => 40,
        'fields'         => 'ids',
        'no_found_rows'  => true,
        'meta_query'     => [
            [
                'key'     => HPBS_META,
                'value'   => (string) $child_id,
                'compare' => 'LIKE',
            ],
        ],
    ]);

    foreach ($q->posts as $bundle_id) {
        $components = hpbs_get_components((int) $bundle_id);
        if (!$components) {
            continue;
        }
        $hit = false;
        foreach ($components as $c) {
            $vid = absint($c['variation_id'] ?? 0);
            $pid = absint($c['product_id'] ?? 0);
            if ($vid === $child_id || $pid === $child_id || ($parent_id && $pid === $parent_id && $vid === $child_id)) {
                $hit = true;
                break;
            }
            if ($parent_id && $pid === $parent_id && $vid === 0) {
                $hit = true;
                break;
            }
        }
        if ($hit) {
            hpbs_sync_bundle_stock_status((int) $bundle_id);
        }
    }
}
