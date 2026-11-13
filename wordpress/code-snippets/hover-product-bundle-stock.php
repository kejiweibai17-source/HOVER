<?php
/**
 * HOVER — 動態組合包扣庫存
 *
 * 組合包前台仍是一筆商品；庫存改扣綁定的子商品／變體。
 * 任一子商品不足 → 組合包不可買。
 *
 * 使用方式（Code Snippets）：
 * 1. 新增 snippet，貼上本檔 → Everywhere → 啟用
 * 2. 編輯組合包商品 →「HOVER 組合扣庫存」綁定白襪／黑襪變體
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

function hpbs_render_metabox($post): void
{
    wp_nonce_field('hpbs_save_meta', 'hpbs_nonce');
    $components = hpbs_get_components((int) $post->ID);
    $available = $components ? hpbs_available_packs($components) : null;
    ?>
    <div class="hpbs-admin" id="hpbs-admin-root"
         data-components="<?php echo esc_attr(wp_json_encode($components, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)); ?>">
        <p class="description" style="margin-top:0;">
            <?php esc_html_e('前台仍顯示這一筆組合包；下單後改扣下方子商品／變體庫存。白或黑任一售完，組合包即不可買。', 'hover'); ?>
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
        <table class="widefat striped" style="max-width:920px;">
            <thead>
                <tr>
                    <th style="width:120px;"><?php esc_html_e('商品 ID', 'hover'); ?></th>
                    <th style="width:120px;"><?php esc_html_e('變體 ID', 'hover'); ?></th>
                    <th style="width:80px;"><?php esc_html_e('每包數量', 'hover'); ?></th>
                    <th><?php esc_html_e('名稱', 'hover'); ?></th>
                    <th style="width:60px;"></th>
                </tr>
            </thead>
            <tbody class="hpbs-rows"></tbody>
        </table>
        <p style="margin:12px 0;">
            <button type="button" class="button hpbs-add-row"><?php esc_html_e('新增子商品', 'hover'); ?></button>
        </p>
        <input type="hidden" name="hpbs_components_json" id="hpbs_components_json" value="">
        <p class="description">
            <?php esc_html_e('變體商品請填父商品 ID + 變體 ID（例如白襪商品 ID、尺寸 F 的 variation ID）。簡單商品變體 ID 留空。', 'hover'); ?>
        </p>
    </div>
    <script>
    (function(){
        var root = document.getElementById('hpbs-admin-root');
        if (!root) return;
        var tbody = root.querySelector('.hpbs-rows');
        var hidden = document.getElementById('hpbs_components_json');
        var initial = [];
        try { initial = JSON.parse(root.getAttribute('data-components') || '[]') || []; } catch (e) { initial = []; }

        function rowHtml(row){
            row = row || {};
            return '<tr class="hpbs-row">' +
                '<td><input type="number" class="hpbs-product-id" min="1" step="1" value="'+(row.product_id||'')+'" style="width:100%"></td>' +
                '<td><input type="number" class="hpbs-variation-id" min="0" step="1" value="'+(row.variation_id||'')+'" style="width:100%" placeholder="可空"></td>' +
                '<td><input type="number" class="hpbs-qty" min="1" step="1" value="'+(row.qty||1)+'" style="width:100%"></td>' +
                '<td class="hpbs-name">'+(row.name ? String(row.name).replace(/</g,'&lt;') : '—')+'</td>' +
                '<td><button type="button" class="button-link-delete hpbs-remove">移除</button></td>' +
            '</tr>';
        }

        function sync(){
            var rows = [];
            tbody.querySelectorAll('.hpbs-row').forEach(function(tr){
                var productId = parseInt(tr.querySelector('.hpbs-product-id').value, 10) || 0;
                if (!productId) return;
                rows.push({
                    product_id: productId,
                    variation_id: parseInt(tr.querySelector('.hpbs-variation-id').value, 10) || 0,
                    qty: Math.max(1, parseInt(tr.querySelector('.hpbs-qty').value, 10) || 1)
                });
            });
            hidden.value = JSON.stringify(rows);
        }

        function render(list){
            if (!list.length) list = [{ product_id: '', variation_id: '', qty: 1, name: '' }];
            tbody.innerHTML = list.map(rowHtml).join('');
            sync();
        }

        root.querySelector('.hpbs-add-row').addEventListener('click', function(){
            tbody.insertAdjacentHTML('beforeend', rowHtml({ qty: 1 }));
            sync();
        });
        tbody.addEventListener('click', function(e){
            if (e.target && e.target.classList.contains('hpbs-remove')) {
                var tr = e.target.closest('tr');
                if (tr) tr.remove();
                if (!tbody.querySelector('.hpbs-row')) render([]);
                sync();
            }
        });
        tbody.addEventListener('input', sync);
        document.getElementById('post').addEventListener('submit', sync);
        render(initial);
    })();
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
