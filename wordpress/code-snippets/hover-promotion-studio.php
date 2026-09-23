<?php
/**
 * HOVER — 滿額贈／加價購活動
 *
 * Code Snippets 設定：Run everywhere。
 * 後台：商品 → 滿額贈活動／加價購活動
 * API：GET /wp-json/hover/v1/promotions
 */

if (!defined('ABSPATH')) {
    exit;
}
if (defined('HVPR_LOADED')) {
    return;
}
define('HVPR_LOADED', true);

const HVPR_OPTION = 'hover_promotions_v1';

function hvpr_can_manage(): bool
{
    return current_user_can('manage_woocommerce') || current_user_can('manage_options');
}

function hvpr_types(): array
{
    return [
        'gift'  => '滿額贈活動',
        'addon' => '加價購活動',
    ];
}

function hvpr_new_rule(string $type): array
{
    return [
        'id'                   => '',
        'type'                 => $type === 'addon' ? 'addon' : 'gift',
        'name'                 => '',
        'enabled'              => true,
        'starts_at'            => '',
        'ends_at'              => '',
        'threshold'            => 0,
        'include_product_ids'  => [],
        'exclude_product_ids'  => [],
        'include_category_ids' => [],
        'exclude_category_ids' => [],
        'reward_id'            => 0,
        'reward_ids'           => [],
        'reward_random_color'  => false,
        'reward_qty'           => 1,
        'purchase_price'       => 0,
        'limit_qty'            => 1,
        'stackable'            => true,
        'stock_behavior'       => 'disable',
    ];
}

function hvpr_int_list($raw): array
{
    if (!is_array($raw)) {
        $raw = $raw === '' || $raw === null ? [] : explode(',', (string) $raw);
    }
    $ids = array_map('absint', $raw);
    return array_values(array_unique(array_filter($ids)));
}

function hvpr_datetime($raw): string
{
    $value = sanitize_text_field((string) $raw);
    if ($value === '') {
        return '';
    }
    $timestamp = strtotime($value);
    return $timestamp ? wp_date('Y-m-d\TH:i', $timestamp) : '';
}

function hvpr_normalize_rule(array $raw, string $fallback_type = 'gift'): array
{
    $type = ($raw['type'] ?? $fallback_type) === 'addon' ? 'addon' : 'gift';
    $base = hvpr_new_rule($type);
    $id = sanitize_key((string) ($raw['id'] ?? ''));
    if ($id === '') {
        $id = 'hvpr_' . strtolower(wp_generate_password(10, false, false));
    }
    $stock_behavior = ($raw['stock_behavior'] ?? '') === 'hide' ? 'hide' : 'disable';

    $reward_random_color = $type === 'gift' && !empty($raw['reward_random_color']);
    $reward_id = absint($raw['reward_id'] ?? 0);
    $reward_ids = [];

    if ($reward_random_color) {
        $reward_ids = hvpr_int_list($raw['reward_ids'] ?? []);
        if (!$reward_ids && $reward_id > 0) {
            $reward_ids = [$reward_id];
        }
        $reward_id = $reward_ids[0] ?? 0;
    } elseif ($type === 'addon') {
        $reward_ids = hvpr_int_list($raw['reward_ids'] ?? []);
        if (!$reward_ids && $reward_id > 0) {
            $reward_ids = [$reward_id];
        }
        $reward_id = $reward_ids[0] ?? 0;
    }

    return [
        'id'                   => $id,
        'type'                 => $type,
        'name'                 => sanitize_text_field((string) ($raw['name'] ?? '')),
        'enabled'              => !empty($raw['enabled']),
        'starts_at'            => hvpr_datetime($raw['starts_at'] ?? ''),
        'ends_at'              => hvpr_datetime($raw['ends_at'] ?? ''),
        'threshold'            => max(0, (int) round((float) ($raw['threshold'] ?? 0))),
        'include_product_ids'  => hvpr_int_list($raw['include_product_ids'] ?? []),
        'exclude_product_ids'  => hvpr_int_list($raw['exclude_product_ids'] ?? []),
        'include_category_ids' => hvpr_int_list($raw['include_category_ids'] ?? []),
        'exclude_category_ids' => hvpr_int_list($raw['exclude_category_ids'] ?? []),
        'reward_id'            => $reward_id,
        'reward_ids'           => $reward_ids,
        'reward_random_color'  => $reward_random_color,
        'reward_qty'           => max(1, min(99, absint($raw['reward_qty'] ?? $base['reward_qty']))),
        'purchase_price'       => $type === 'addon'
            ? max(0, (int) round((float) ($raw['purchase_price'] ?? 0)))
            : 0,
        'limit_qty'            => max(1, min(99, absint($raw['limit_qty'] ?? $base['limit_qty']))),
        'stackable'            => !empty($raw['stackable']),
        'stock_behavior'       => $stock_behavior,
    ];
}

function hvpr_rules(): array
{
    $saved = get_option(HVPR_OPTION, []);
    if (!is_array($saved)) {
        return [];
    }
    $rules = [];
    foreach ($saved as $row) {
        if (is_array($row)) {
            $rules[] = hvpr_normalize_rule($row, (string) ($row['type'] ?? 'gift'));
        }
    }
    return $rules;
}

function hvpr_save_rules(array $rules): void
{
    update_option(HVPR_OPTION, array_values($rules), false);
}

function hvpr_rule_is_active(array $rule): bool
{
    if (empty($rule['enabled'])) {
        return false;
    }
    $now = current_time('timestamp');
    $start = !empty($rule['starts_at']) ? strtotime($rule['starts_at']) : false;
    $end = !empty($rule['ends_at']) ? strtotime($rule['ends_at']) : false;
    if ($start && $now < $start) {
        return false;
    }
    if ($end && $now > $end) {
        return false;
    }
    return true;
}

add_action('admin_menu', function () {
    if (!hvpr_can_manage()) {
        return;
    }
    add_submenu_page(
        'edit.php?post_type=product',
        '滿額贈活動',
        '滿額贈活動',
        'manage_woocommerce',
        'hvpr-gift',
        function () {
            hvpr_render_page('gift');
        }
    );
    add_submenu_page(
        'edit.php?post_type=product',
        '加價購活動',
        '加價購活動',
        'manage_woocommerce',
        'hvpr-addon',
        function () {
            hvpr_render_page('addon');
        }
    );
}, 99);

add_action('admin_enqueue_scripts', function ($hook) {
    if (!hvpr_can_manage() || strpos((string) $hook, 'hvpr-') === false) {
        return;
    }
    wp_enqueue_script('wc-enhanced-select');
    wp_enqueue_style('woocommerce_admin_styles');
});

add_action('rest_api_init', function () {
    register_rest_route('hover/v1', '/promotions', [
        'methods'             => 'GET',
        'callback'            => 'hvpr_rest_promotions',
        'permission_callback' => '__return_true',
    ]);
});

function hvpr_product_payload(int $id): ?array
{
    if (!function_exists('wc_get_product')) {
        return null;
    }
    $product = wc_get_product($id);
    if (!$product) {
        return null;
    }
    $variation_id = $product->is_type('variation') ? $product->get_id() : 0;
    $parent_id = $variation_id ? $product->get_parent_id() : $product->get_id();
    $image_id = $product->get_image_id();
    if (!$image_id && $variation_id) {
        $parent = wc_get_product($parent_id);
        $image_id = $parent ? $parent->get_image_id() : 0;
    }
    $manage_stock = $product->managing_stock();
    $stock_quantity = $manage_stock ? $product->get_stock_quantity() : null;

    $color_label = '';
    $size_label = '';
    if ($product->is_type('variation')) {
        foreach ($product->get_attributes() as $key => $value) {
            $taxonomy = str_replace('attribute_', '', (string) $key);
            $tax_label = taxonomy_exists($taxonomy)
                ? (string) (get_taxonomy($taxonomy)->labels->singular_name ?? $taxonomy)
                : $taxonomy;
            $display = hvpr_attribute_display_value($taxonomy, (string) $value);
            if ($display === '') {
                continue;
            }
            if (hvpr_is_color_attribute($taxonomy, $tax_label)) {
                $color_label = $display;
            } else {
                $size_label = $size_label === '' ? $display : $size_label . '／' . $display;
            }
        }
    } else {
        $name = wp_strip_all_tags($product->get_name());
        if (preg_match('/^(.*?)[\s]*[-–—]\s*(.+)$/u', $name, $matches)) {
            $parts = preg_split('/\s*[,，／\/|｜]\s*/u', trim($matches[2]));
            $parts = array_values(array_filter(array_map('trim', $parts)));
            if (count($parts) >= 2) {
                $size_label = $parts[0];
                $color_label = $parts[count($parts) - 1];
            } elseif (count($parts) === 1) {
                if (preg_match('/色|黑|白|灰|米|棕|藍|綠|紅|粉|卡其|杏|駝/u', $parts[0])) {
                    $color_label = $parts[0];
                } else {
                    $size_label = $parts[0];
                }
            }
        }
    }

    return [
        'productId'     => $parent_id,
        'variationId'   => $variation_id,
        'name'          => wp_strip_all_tags($product->get_name()),
        'sku'           => (string) $product->get_sku(),
        'image'         => $image_id ? wp_get_attachment_image_url($image_id, 'woocommerce_thumbnail') : '',
        'regularPrice'  => (float) $product->get_regular_price(),
        'stockStatus'   => $product->get_stock_status(),
        'manageStock'   => $manage_stock,
        'stockQuantity' => $stock_quantity,
        'backorders'    => $product->get_backorders(),
        'colorLabel'    => $color_label,
        'sizeLabel'     => $size_label,
    ];
}

function hvpr_payload_in_stock(array $product): bool
{
    return $product['stockStatus'] !== 'outofstock'
        && (
            !$product['manageStock']
            || $product['stockQuantity'] === null
            || $product['stockQuantity'] > 0
            || $product['backorders'] !== 'no'
        );
}

function hvpr_is_color_attribute(string $key, string $label = ''): bool
{
    $hay = strtolower(trim($key . ' ' . $label));
    return (bool) preg_match('/color|colour|顏色|色彩|配色/', $hay);
}

function hvpr_attribute_display_value(string $taxonomy, string $value): string
{
    $value = trim(wp_strip_all_tags($value));
    if ($value === '') {
        return '';
    }
    if (taxonomy_exists($taxonomy)) {
        $term = get_term_by('slug', $value, $taxonomy);
        if ($term && !is_wp_error($term)) {
            return wp_strip_all_tags($term->name);
        }
    }
    return $value;
}

function hvpr_non_color_attr_labels(\WC_Product $variation): array
{
    $labels = [];
    foreach ($variation->get_attributes() as $key => $value) {
        $taxonomy = str_replace('attribute_', '', (string) $key);
        $tax_label = taxonomy_exists($taxonomy)
            ? (string) (get_taxonomy($taxonomy)->labels->singular_name ?? $taxonomy)
            : $taxonomy;
        if (hvpr_is_color_attribute($taxonomy, $tax_label)) {
            continue;
        }
        $display = hvpr_attribute_display_value($taxonomy, (string) $value);
        if ($display !== '') {
            $labels[] = $display;
        }
    }
    return $labels;
}

function hvpr_random_gift_display_name(array $product_ids): string
{
    $product_ids = array_values(array_filter(array_map('absint', $product_ids)));
    if (!$product_ids) {
        return '顏色隨機出貨';
    }
    $product = wc_get_product($product_ids[0]);
    if (!$product) {
        return '顏色隨機出貨';
    }

    // 前台第二行格式：F｜顏色隨機出貨（不帶固定顏色、不帶完整商品名）
    if ($product->is_type('variation')) {
        $attrs = hvpr_non_color_attr_labels($product);
        return $attrs
            ? implode('／', $attrs) . '｜顏色隨機出貨'
            : '顏色隨機出貨';
    }

    // 獨立商品命名常見格式：經典刺繡老帽 - F, 藍
    $name = wp_strip_all_tags($product->get_name());
    if (preg_match('/^(.*?)[\s]*[-–—]\s*(.+)$/u', $name, $matches)) {
        $parts = preg_split('/\s*[,，／\/|｜]\s*/u', trim($matches[2]));
        $parts = array_values(array_filter(array_map('trim', $parts)));
        if (count($parts) >= 2) {
            array_pop($parts); // 最後一段視為顏色，不顯示
            return implode('／', $parts) . '｜顏色隨機出貨';
        }
        if (count($parts) === 1) {
            // 僅一段時可能是尺寸或顏色；若像顏色詞則只顯示隨機
            if (hvpr_is_color_attribute('color', $parts[0]) || preg_match('/色|黑|白|灰|米|棕|藍|綠|紅|粉|卡其|杏|駝/u', $parts[0])) {
                return '顏色隨機出貨';
            }
            return $parts[0] . '｜顏色隨機出貨';
        }
    }
    return '顏色隨機出貨';
}

/** 隨機出貨池：接受同一可變商品的規格，或各顏色獨立建立的簡單商品。 */
function hvpr_normalize_reward_pool(array $ids): array
{
    $ids = array_values(array_unique(array_filter(array_map('absint', $ids))));
    $valid = [];
    foreach ($ids as $id) {
        $product = wc_get_product($id);
        if (!$product || $product->is_type('variable')) {
            continue;
        }
        $valid[] = $id;
    }
    return $valid;
}

/**
 * 正規化家族比對字串。
 */
function hvpr_family_norm(string $text): string
{
    $text = html_entity_decode(wp_strip_all_tags($text), ENT_QUOTES, 'UTF-8');
    $text = preg_replace('/\s+/u', ' ', trim($text)) ?: '';
    return function_exists('mb_strtolower') ? mb_strtolower($text) : strtolower($text);
}

/**
 * HOVER SKU 系列：HV26-C01-001-WH-F / HV26-C01-001-BK-F → HV26-C01-001
 * （每色常是獨立可變商品，不可只用 parent_id）
 */
function hvpr_sku_series(string $sku): string
{
    $sku = strtoupper(trim($sku));
    if ($sku === '') {
        return '';
    }
    $parts = preg_split('/[-_]/', $sku) ?: [];
    $parts = array_values(array_filter($parts, static fn($p) => $p !== ''));
    if (count($parts) >= 4) {
        return implode('-', array_slice($parts, 0, -2));
    }
    if (count($parts) >= 3) {
        return implode('-', array_slice($parts, 0, -1));
    }
    return $sku;
}

/**
 * 同一商品家族鍵。
 * HOVER：同一款每色各自建可變商品（白襪 parent≠黑襪 parent），
 * 因此變體不以 parent_id，改比 SKU 系列或父商品名稱。
 */
function hvpr_pool_family_key($product): string
{
    if (!$product instanceof WC_Product) {
        return '';
    }

    $sku = '';
    $parent_name = '';
    if ($product->is_type('variation')) {
        $sku = (string) $product->get_sku();
        $parent = wc_get_product((int) $product->get_parent_id());
        if ($parent) {
            $parent_name = $parent->get_name();
            if ($sku === '') {
                $sku = (string) $parent->get_sku();
            }
        }
    } else {
        $sku = (string) $product->get_sku();
        $parent_name = $product->get_name();
    }

    $series = hvpr_sku_series($sku);
    if ($series !== '') {
        return 'sku:' . $series;
    }

    $name = hvpr_family_norm($parent_name);
    // 「經典緹花中筒襪 - F, 白」→ 經典緹花中筒襪；純「經典緹花中筒襪」亦可
    if (preg_match('/^(.*?)[\s]*[-–—|:｜].+$/u', $name, $matches)) {
        $base = trim($matches[1]);
        if ($base !== '') {
            return 'name:' . md5($base);
        }
    }
    if ($name !== '') {
        return 'name:' . md5($name);
    }

    if ($product->is_type('variation')) {
        return 'parent:' . (int) $product->get_parent_id();
    }
    return 'id:' . (int) $product->get_id();
}

function hvpr_filter_same_product_family(array $ids): array
{
    $ids = hvpr_normalize_reward_pool($ids);
    if (count($ids) <= 1) {
        return $ids;
    }
    $family = '';
    $kept = [];
    foreach ($ids as $id) {
        $product = wc_get_product($id);
        if (!$product) {
            continue;
        }
        $key = hvpr_pool_family_key($product);
        if ($family === '') {
            $family = $key;
        }
        if ($key === $family) {
            $kept[] = $id;
        }
    }
    return $kept;
}

function hvpr_reward_pool_ids(array $rule): array
{
    $type = $rule['type'] ?? 'gift';
    if (!empty($rule['reward_random_color']) || $type === 'addon') {
        $ids = $type === 'addon'
            ? hvpr_filter_same_product_family($rule['reward_ids'] ?? [])
            : hvpr_normalize_reward_pool($rule['reward_ids'] ?? []);
        if ($ids) {
            return $ids;
        }
    }
    $reward_id = absint($rule['reward_id'] ?? 0);
    return $reward_id > 0 ? [$reward_id] : [];
}

function hvpr_rest_promotions(): WP_REST_Response
{
    $rows = [];
    foreach (hvpr_rules() as $rule) {
        if (!hvpr_rule_is_active($rule)) {
            continue;
        }
        $pool_ids = hvpr_reward_pool_ids($rule);
        if (!$pool_ids) {
            continue;
        }

        $random_color = ($rule['type'] ?? '') === 'gift' && !empty($rule['reward_random_color']);
        $is_addon = ($rule['type'] ?? '') === 'addon';
        $pool = [];
        foreach ($pool_ids as $id) {
            $payload = hvpr_product_payload((int) $id);
            if ($payload) {
                $pool[] = $payload;
            }
        }
        if (!$pool) {
            continue;
        }

        $primary = $pool[0];
        $in_stock = false;
        foreach ($pool as $item) {
            if (hvpr_payload_in_stock($item)) {
                $in_stock = true;
                break;
            }
        }
        if (!$in_stock && ($rule['stock_behavior'] ?? '') === 'hide') {
            continue;
        }

        if ($random_color) {
            $primary['name'] = hvpr_random_gift_display_name($pool_ids);
            $primary['variationId'] = 0;
            foreach ($pool as $item) {
                if (!empty($item['image'])) {
                    $primary['image'] = $item['image'];
                    break;
                }
            }
            $total_qty = 0;
            $has_unlimited = false;
            foreach ($pool as $item) {
                if (!hvpr_payload_in_stock($item)) {
                    continue;
                }
                if (
                    empty($item['manageStock'])
                    || $item['stockQuantity'] === null
                    || ($item['backorders'] ?? 'no') !== 'no'
                ) {
                    $has_unlimited = true;
                    break;
                }
                $total_qty += (int) $item['stockQuantity'];
            }
            $primary['manageStock'] = !$has_unlimited;
            $primary['stockQuantity'] = $has_unlimited ? null : $total_qty;
            $primary['stockStatus'] = $in_stock ? 'instock' : 'outofstock';
            $primary['backorders'] = 'no';
        } elseif ($is_addon && count($pool) > 1) {
            foreach ($pool as $item) {
                if (!empty($item['image'])) {
                    $primary['image'] = $item['image'];
                    break;
                }
            }
            $primary['stockStatus'] = $in_stock ? 'instock' : 'outofstock';
        }

        $rows[] = [
            'id'                   => $rule['id'],
            'type'                 => $rule['type'],
            'name'                 => $rule['name'],
            'threshold'            => $rule['threshold'],
            'includeProductIds'    => $rule['include_product_ids'],
            'excludeProductIds'    => $rule['exclude_product_ids'],
            'includeCategoryIds'   => $rule['include_category_ids'],
            'excludeCategoryIds'   => $rule['exclude_category_ids'],
            'rewardQty'            => $rule['reward_qty'],
            'purchasePrice'        => $rule['purchase_price'],
            'limitQty'             => $rule['limit_qty'],
            'stackable'            => $rule['stackable'],
            'stockBehavior'        => $rule['stock_behavior'],
            'randomColor'          => $random_color,
            'rewardIds'            => ($random_color || $is_addon) ? $pool_ids : [],
            'inStock'              => $in_stock,
            'product'              => $primary,
            'pool'                 => ($random_color || $is_addon) ? $pool : [],
        ];
    }
    return new WP_REST_Response([
        'ok'         => true,
        'promotions' => $rows,
        'updatedAt'  => gmdate('c'),
    ], 200);
}

function hvpr_post_action(string $type): ?array
{
    if ($_SERVER['REQUEST_METHOD'] !== 'POST' || empty($_POST['hvpr_action'])) {
        return null;
    }
    if (!hvpr_can_manage() || !wp_verify_nonce($_POST['hvpr_nonce'] ?? '', 'hvpr_save')) {
        return ['ok' => false, 'message' => '安全驗證失敗，請重新整理後再試。'];
    }
    $action = sanitize_key((string) $_POST['hvpr_action']);
    $rules = hvpr_rules();
    if ($action === 'delete') {
        $id = sanitize_key((string) ($_POST['id'] ?? ''));
        $rules = array_values(array_filter($rules, function ($row) use ($id) {
            return ($row['id'] ?? '') !== $id;
        }));
        hvpr_save_rules($rules);
        return ['ok' => true, 'message' => '活動已刪除。'];
    }
    if ($action === 'toggle') {
        $id = sanitize_key((string) ($_POST['id'] ?? ''));
        foreach ($rules as &$row) {
            if (($row['id'] ?? '') === $id) {
                $row['enabled'] = empty($row['enabled']);
            }
        }
        unset($row);
        hvpr_save_rules($rules);
        return ['ok' => true, 'message' => '活動狀態已更新。'];
    }
    if ($action !== 'save') {
        return null;
    }

    $rule = hvpr_normalize_rule([
        'id'                   => $_POST['id'] ?? '',
        'type'                 => $type,
        'name'                 => $_POST['name'] ?? '',
        'enabled'              => !empty($_POST['enabled']),
        'starts_at'            => $_POST['starts_at'] ?? '',
        'ends_at'              => $_POST['ends_at'] ?? '',
        'threshold'            => $_POST['threshold'] ?? 0,
        'include_product_ids'  => $_POST['include_product_ids'] ?? [],
        'exclude_product_ids'  => $_POST['exclude_product_ids'] ?? [],
        'include_category_ids' => $_POST['include_category_ids'] ?? [],
        'exclude_category_ids' => $_POST['exclude_category_ids'] ?? [],
        'reward_id'            => $_POST['reward_id'] ?? 0,
        'reward_ids'           => $_POST['reward_ids'] ?? [],
        'reward_random_color'  => !empty($_POST['reward_random_color']),
        'reward_qty'           => $_POST['reward_qty'] ?? 1,
        'purchase_price'       => $_POST['purchase_price'] ?? 0,
        'limit_qty'            => $_POST['limit_qty'] ?? 1,
        'stackable'            => !empty($_POST['stackable']),
        'stock_behavior'       => $_POST['stock_behavior'] ?? 'disable',
    ], $type);

    if ($rule['name'] === '') {
        return ['ok' => false, 'message' => '請輸入活動名稱。'];
    }
    if ($rule['threshold'] <= 0) {
        return ['ok' => false, 'message' => '消費門檻必須大於 0。'];
    }
    if (!empty($rule['reward_random_color'])) {
        $pool_ids = hvpr_normalize_reward_pool($rule['reward_ids']);
        if (count($pool_ids) < 1) {
            return ['ok' => false, 'message' => '顏色隨機出貨請選擇至少一個有效的贈品商品或規格。'];
        }
        if (count($pool_ids) !== count(array_values(array_unique(array_filter(array_map('absint', $rule['reward_ids'])))))) {
            return ['ok' => false, 'message' => '請選擇有效的商品或規格（不可選「可變商品」父層）。'];
        }
        $rule['reward_ids'] = $pool_ids;
        $rule['reward_id'] = $pool_ids[0];
    } elseif ($type === 'addon') {
        $raw_ids = array_values(array_unique(array_filter(array_map('absint', $rule['reward_ids']))));
        $pool_ids = hvpr_normalize_reward_pool($rule['reward_ids']);
        if (count($pool_ids) < 1) {
            return ['ok' => false, 'message' => '請選擇至少一個可加購商品或規格。'];
        }
        if (count($pool_ids) !== count($raw_ids)) {
            return ['ok' => false, 'message' => '請選擇有效的商品或規格（不可選「可變商品」父層）。'];
        }
        $family_ids = hvpr_filter_same_product_family($pool_ids);
        if (count($family_ids) !== count($pool_ids)) {
            return ['ok' => false, 'message' => '加價購請只選擇「同一商品」的多個顏色／規格，不可混選不同商品（例如袋子＋襪子）。'];
        }
        $rule['reward_ids'] = $family_ids;
        $rule['reward_id'] = $family_ids[0];
    } elseif ($rule['reward_id'] <= 0 || !wc_get_product($rule['reward_id'])) {
        return ['ok' => false, 'message' => '請選擇有效的贈品／加價購商品與規格。'];
    }
    if ($rule['ends_at'] && $rule['starts_at'] && strtotime($rule['ends_at']) <= strtotime($rule['starts_at'])) {
        return ['ok' => false, 'message' => '結束時間必須晚於開始時間。'];
    }

    $replaced = false;
    foreach ($rules as $index => $row) {
        if (($row['id'] ?? '') === $rule['id']) {
            $rules[$index] = $rule;
            $replaced = true;
            break;
        }
    }
    if (!$replaced) {
        $rules[] = $rule;
    }
    hvpr_save_rules($rules);
    return ['ok' => true, 'message' => $replaced ? '活動已更新。' : '活動已建立。'];
}

function hvpr_product_options(array $ids): void
{
    if (!function_exists('wc_get_product')) {
        return;
    }
    static $choices = null;
    if ($choices === null) {
        $choices = [];
        $product_ids = get_posts([
            'post_type'      => ['product', 'product_variation'],
            'post_status'    => ['publish', 'private'],
            'posts_per_page' => -1,
            'orderby'        => 'title',
            'order'          => 'ASC',
            'fields'         => 'ids',
        ]);
        foreach ($product_ids as $id) {
            $product = wc_get_product((int) $id);
            if (!$product || $product->is_type('variable')) {
                continue;
            }
            $label = wp_strip_all_tags($product->get_formatted_name());
            $sku = trim((string) $product->get_sku());
            if ($sku !== '') {
                $label .= '｜SKU：' . $sku;
            }
            $choices[(int) $id] = $label;
        }
    }
    foreach ($choices as $id => $label) {
        printf(
            '<option value="%d"%s>%s</option>',
            (int) $id,
            selected(in_array((int) $id, $ids, true), true, false),
            esc_html($label)
        );
    }
}

function hvpr_category_options(array $selected): void
{
    $terms = get_terms(['taxonomy' => 'product_cat', 'hide_empty' => false]);
    if (is_wp_error($terms)) {
        return;
    }
    foreach ($terms as $term) {
        printf(
            '<option value="%d"%s>%s</option>',
            (int) $term->term_id,
            selected(in_array((int) $term->term_id, $selected, true), true, false),
            esc_html($term->name)
        );
    }
}

function hvpr_render_page(string $type): void
{
    if (!hvpr_can_manage()) {
        wp_die('權限不足');
    }
    $type = $type === 'addon' ? 'addon' : 'gift';
    $flash = hvpr_post_action($type);
    $rules = array_values(array_filter(hvpr_rules(), function ($row) use ($type) {
        return ($row['type'] ?? '') === $type;
    }));
    $edit_id = sanitize_key((string) ($_GET['edit'] ?? ''));
    $editing = hvpr_new_rule($type);
    foreach ($rules as $row) {
        if (($row['id'] ?? '') === $edit_id) {
            $editing = $row;
            break;
        }
    }
    $title = hvpr_types()[$type];
    $slug = $type === 'addon' ? 'hvpr-addon' : 'hvpr-gift';
    ?>
    <div class="wrap hps-wrap">
        <h1><?php echo esc_html($title); ?></h1>
        <p class="description">集中管理活動門檻、適用範圍、商品規格、庫存與疊加規則。前台會再次向伺服器驗證，避免竄改價格。</p>
        <?php if ($flash): ?>
            <div class="notice <?php echo !empty($flash['ok']) ? 'notice-success' : 'notice-error'; ?> is-dismissible"><p><?php echo esc_html($flash['message']); ?></p></div>
        <?php endif; ?>

        <div class="hps-grid">
            <section class="hps-card">
                <h2><?php echo $edit_id ? '編輯活動' : '新增活動'; ?></h2>
                <form method="post">
                    <?php wp_nonce_field('hvpr_save', 'hvpr_nonce'); ?>
                    <input type="hidden" name="hvpr_action" value="save">
                    <input type="hidden" name="id" value="<?php echo esc_attr($editing['id']); ?>">

                    <label>活動名稱</label>
                    <input class="regular-text" required name="name" value="<?php echo esc_attr($editing['name']); ?>" placeholder="<?php echo $type === 'gift' ? '例：滿 NT$2,000 贈品牌提袋' : '例：滿 NT$1,500 可加購襪款'; ?>">

                    <div class="hps-cols">
                        <div><label>消費門檻（NT$）</label><input type="number" min="1" required name="threshold" value="<?php echo esc_attr($editing['threshold']); ?>"></div>
                        <?php if ($type === 'addon'): ?>
                            <div><label>加購價（NT$）</label><input type="number" min="0" required name="purchase_price" value="<?php echo esc_attr($editing['purchase_price']); ?>"></div>
                        <?php else: ?>
                            <div><label>每次贈送數量</label><input type="number" min="1" max="99" name="reward_qty" value="<?php echo esc_attr($editing['reward_qty']); ?>"></div>
                        <?php endif; ?>
                    </div>

                    <div class="hps-cols">
                        <div><label>開始時間（留空立即）</label><input type="datetime-local" name="starts_at" value="<?php echo esc_attr($editing['starts_at']); ?>"></div>
                        <div><label>結束時間（留空不限）</label><input type="datetime-local" name="ends_at" value="<?php echo esc_attr($editing['ends_at']); ?>"></div>
                    </div>

                    <label><?php echo $type === 'gift' ? '贈品（可選商品規格）' : '加價購商品（可多選規格）'; ?></label>
                    <?php if ($type === 'gift'): ?>
                        <div class="hps-checks" style="margin-top:0;margin-bottom:12px">
                            <label>
                                <input type="checkbox" id="hvpr-random-color" name="reward_random_color" value="1" <?php checked(!empty($editing['reward_random_color'])); ?>>
                                顏色隨機出貨（可從指定的多個顏色商品／規格庫存中隨機出貨）
                            </label>
                        </div>
                        <div id="hvpr-reward-single" <?php echo !empty($editing['reward_random_color']) ? 'style="display:none"' : ''; ?>>
                            <select class="wc-enhanced-select" style="width:100%" name="reward_id" data-placeholder="搜尋商品或規格…">
                                <?php hvpr_product_options($editing['reward_id'] ? [(int) $editing['reward_id']] : []); ?>
                            </select>
                        </div>
                        <div id="hvpr-reward-multi" <?php echo empty($editing['reward_random_color']) ? 'style="display:none"' : ''; ?>>
                            <p class="description">可多選各顏色商品或規格；前台會顯示「尺寸｜顏色隨機出貨」，只要池內任一項有庫存即可領取。</p>
                            <select class="wc-enhanced-select" multiple style="width:100%" name="reward_ids[]" data-placeholder="搜尋並多選規格…">
                                <?php
                                $selected_pool = !empty($editing['reward_ids'])
                                    ? array_map('intval', $editing['reward_ids'])
                                    : ($editing['reward_id'] ? [(int) $editing['reward_id']] : []);
                                hvpr_product_options($selected_pool);
                                ?>
                            </select>
                        </div>
                    <?php else: ?>
                        <p class="description">請只多選「同一商品」的不同顏色／規格（不可混選袋子＋襪子等不同商品）；前台由消費者自行選擇，各規格獨立連動庫存。</p>
                        <select class="wc-enhanced-select" multiple style="width:100%" name="reward_ids[]" data-placeholder="搜尋並多選規格…">
                            <?php
                            $selected_addon_pool = !empty($editing['reward_ids'])
                                ? array_map('intval', $editing['reward_ids'])
                                : ($editing['reward_id'] ? [(int) $editing['reward_id']] : []);
                            hvpr_product_options($selected_addon_pool);
                            ?>
                        </select>
                    <?php endif; ?>

                    <?php if ($type === 'addon'): ?>
                        <label>每筆訂單最多加購數量</label>
                        <input type="number" min="1" max="99" name="limit_qty" value="<?php echo esc_attr($editing['limit_qty']); ?>">
                    <?php endif; ?>

                    <details>
                        <summary>適用與排除範圍（選填）</summary>
                        <p class="description">全部留空代表全館。符合商品或分類才計入門檻；排除條件優先。</p>
                        <label>限定商品</label>
                        <select class="wc-enhanced-select" multiple style="width:100%" name="include_product_ids[]" data-placeholder="搜尋商品…"><?php hvpr_product_options($editing['include_product_ids']); ?></select>
                        <label>排除商品</label>
                        <select class="wc-enhanced-select" multiple style="width:100%" name="exclude_product_ids[]" data-placeholder="搜尋商品…"><?php hvpr_product_options($editing['exclude_product_ids']); ?></select>
                        <label>限定分類</label>
                        <select class="wc-enhanced-select" multiple style="width:100%" name="include_category_ids[]"><?php hvpr_category_options($editing['include_category_ids']); ?></select>
                        <label>排除分類</label>
                        <select class="wc-enhanced-select" multiple style="width:100%" name="exclude_category_ids[]"><?php hvpr_category_options($editing['exclude_category_ids']); ?></select>
                    </details>

                    <div class="hps-checks">
                        <label><input type="checkbox" name="enabled" value="1" <?php checked(!empty($editing['enabled'])); ?>> 啟用活動</label>
                        <label><input type="checkbox" name="stackable" value="1" <?php checked(!empty($editing['stackable'])); ?>> 可與其他滿額贈／加價購同時使用</label>
                    </div>
                    <label>庫存不足時</label>
                    <select name="stock_behavior">
                        <option value="disable" <?php selected($editing['stock_behavior'], 'disable'); ?>><?php echo $type === 'gift' ? '顯示「已贈完」且不可選' : '顯示「已售完」且不可選'; ?></option>
                        <option value="hide" <?php selected($editing['stock_behavior'], 'hide'); ?>>前台隱藏活動</option>
                    </select>

                    <p class="submit">
                        <button class="button button-primary button-large" type="submit"><?php echo $edit_id ? '儲存變更' : '建立活動'; ?></button>
                        <?php if ($edit_id): ?><a class="button button-large" href="<?php echo esc_url(admin_url('edit.php?post_type=product&page=' . $slug)); ?>">取消</a><?php endif; ?>
                    </p>
                </form>
            </section>

            <section class="hps-card">
                <h2>活動列表 <span class="count"><?php echo count($rules); ?></span></h2>
                <?php if (!$rules): ?>
                    <div class="hps-empty">尚未建立活動。</div>
                <?php else: ?>
                    <?php foreach ($rules as $row):
                        $pool_ids = hvpr_reward_pool_ids($row);
                        $product = $pool_ids ? hvpr_product_payload((int) $pool_ids[0]) : null;
                        $active = hvpr_rule_is_active($row);
                        $is_random = $type === 'gift' && !empty($row['reward_random_color']);
                        $product_label = $is_random
                            ? (($product['name'] ?? '贈品') . '｜' . hvpr_random_gift_display_name($pool_ids))
                            : ($product['name'] ?? '商品已刪除');
                    ?>
                        <article class="hps-row">
                            <div class="hps-row-head">
                                <div><strong><?php echo esc_html($row['name']); ?></strong><span class="hps-status <?php echo $active ? 'on' : ''; ?>"><?php echo $active ? '進行中' : (!empty($row['enabled']) ? '未在活動期間' : '已停用'); ?></span></div>
                                <span>滿 NT$<?php echo number_format((int) $row['threshold']); ?></span>
                            </div>
                            <p><?php echo esc_html($product_label); ?><?php
                                if ($type === 'addon') {
                                    echo '｜加購價 NT$' . number_format((int) $row['purchase_price']);
                                    if (count($pool_ids) > 1) {
                                        echo '｜可選規格 ' . count($pool_ids) . ' 個';
                                    }
                                } else {
                                    echo '｜贈送 ' . (int) $row['reward_qty'] . ' 件';
                                    if ($is_random) {
                                        echo '｜規格池 ' . count($pool_ids) . ' 個';
                                    }
                                }
                            ?></p>
                            <div class="hps-actions">
                                <a class="button" href="<?php echo esc_url(admin_url('edit.php?post_type=product&page=' . $slug . '&edit=' . $row['id'])); ?>">編輯</a>
                                <form method="post"><?php wp_nonce_field('hvpr_save', 'hvpr_nonce'); ?><input type="hidden" name="hvpr_action" value="toggle"><input type="hidden" name="id" value="<?php echo esc_attr($row['id']); ?>"><button class="button"><?php echo !empty($row['enabled']) ? '停用' : '啟用'; ?></button></form>
                                <form method="post" onsubmit="return confirm('確定刪除此活動？');"><?php wp_nonce_field('hvpr_save', 'hvpr_nonce'); ?><input type="hidden" name="hvpr_action" value="delete"><input type="hidden" name="id" value="<?php echo esc_attr($row['id']); ?>"><button class="button button-link-delete">刪除</button></form>
                            </div>
                        </article>
                    <?php endforeach; ?>
                <?php endif; ?>
            </section>
        </div>
    </div>
    <style>
        .hps-wrap{max-width:1380px}.hps-grid{display:grid;grid-template-columns:minmax(420px,1fr) minmax(420px,1fr);gap:22px;margin-top:22px}.hps-card{background:#fff;border:1px solid #dcdcde;border-radius:8px;padding:22px}.hps-card h2{margin-top:0}.hps-card label{display:block;font-weight:600;margin:16px 0 6px}.hps-card input[type=text],.hps-card input[type=number],.hps-card input[type=datetime-local],.hps-card select{width:100%;max-width:none}.hps-cols{display:grid;grid-template-columns:1fr 1fr;gap:14px}.hps-checks{background:#f6f7f7;padding:12px 14px;margin-top:16px}.hps-checks label{font-weight:400;margin:6px 0}.hps-card details{border:1px solid #e2e4e7;padding:12px 14px;margin-top:18px}.hps-card summary{cursor:pointer;font-weight:600}.hps-row{border-top:1px solid #eee;padding:16px 0}.hps-row:first-of-type{border-top:0}.hps-row-head{display:flex;align-items:center;justify-content:space-between;gap:12px}.hps-row p{color:#646970}.hps-status{display:inline-block;margin-left:8px;padding:2px 7px;border-radius:10px;background:#ddd;font-size:11px;font-weight:400}.hps-status.on{background:#d7f2df;color:#116329}.hps-actions{display:flex;align-items:center;gap:8px}.hps-actions form{margin:0}.hps-empty{text-align:center;color:#777;padding:60px 10px}.count{font-size:12px;background:#eee;border-radius:12px;padding:2px 8px}@media(max-width:1000px){.hps-grid{grid-template-columns:1fr}}@media(max-width:600px){.hps-cols{grid-template-columns:1fr}}
    </style>
    <?php if ($type === 'gift'): ?>
    <script>
    (function () {
      var cb = document.getElementById('hvpr-random-color');
      var single = document.getElementById('hvpr-reward-single');
      var multi = document.getElementById('hvpr-reward-multi');
      function sync() {
        var on = !!(cb && cb.checked);
        if (single) single.style.display = on ? 'none' : '';
        if (multi) multi.style.display = on ? '' : 'none';
      }
      if (cb) {
        cb.addEventListener('change', sync);
        sync();
      }
    })();
    </script>
    <?php endif; ?>
    <?php
}
