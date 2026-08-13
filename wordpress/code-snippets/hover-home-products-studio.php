<?php
/**
 * HOVER — 首頁商品輪播（NEW ARRIVALS / BEST SELLER）
 *
 * 使用方式（WordPress 後台）：
 * 1. Code Snippets → Add New → 貼上本檔
 * 2. Run snippet：Everywhere → 啟用
 * 3. 左側選單「HOVER 首頁商品」
 *
 * 客戶可自行：
 * - 先選分類，再從下拉選單加入單一商品
 * - 兩個輪播各自獨立新增／移除／排序
 *
 * REST API（給 Next.js）：
 * GET /wp-json/hover/v1/home-products
 */

if (!defined('ABSPATH')) {
    exit;
}

if (defined('HHPS_LOADED')) {
    return;
}
define('HHPS_LOADED', true);

const HHPS_OPTION = 'hover_home_products_v1';
const HHPS_MAX_PER_SECTION = 20;
const HHPS_SECTIONS = ['newArrivals', 'bestSeller'];

function hhps_can_manage(): bool
{
    return current_user_can('manage_options') || current_user_can('manage_woocommerce');
}

add_action('admin_menu', function () {
    if (!hhps_can_manage()) {
        return;
    }
    add_menu_page(
        'HOVER 首頁商品',
        'HOVER 首頁商品',
        'edit_products',
        'hhps',
        'hhps_render_page',
        'dashicons-products',
        58
    );
}, 99);

add_action('admin_enqueue_scripts', function ($hook) {
    if ($hook !== 'toplevel_page_hhps') {
        return;
    }
    wp_enqueue_script('jquery-ui-sortable');
});

add_action('admin_footer', 'hhps_admin_footer_script');

add_action('rest_api_init', function () {
    register_rest_route('hover/v1', '/home-products', [
        'methods'             => 'GET',
        'callback'            => 'hhps_rest_home_products',
        'permission_callback' => '__return_true',
    ]);
    register_rest_route('hover/v1', '/home-products/categories', [
        'methods'             => 'GET',
        'callback'            => 'hhps_rest_categories',
        'permission_callback' => function () {
            return hhps_can_manage();
        },
    ]);
    register_rest_route('hover/v1', '/home-products/search', [
        'methods'             => 'GET',
        'callback'            => 'hhps_rest_search',
        'permission_callback' => function () {
            return hhps_can_manage();
        },
        'args' => [
            'q' => [
                'type'              => 'string',
                'required'          => false,
                'sanitize_callback' => 'sanitize_text_field',
            ],
            'cat' => [
                'type'              => 'integer',
                'required'          => false,
                'sanitize_callback' => 'absint',
            ],
        ],
    ]);
});

function hhps_default_section(): array
{
    return [
        'enabled' => true,
        'ids'     => [],
    ];
}

function hhps_defaults(): array
{
    return [
        'enabled'     => true,
        'version'     => '1',
        'newArrivals' => hhps_default_section(),
        'bestSeller'  => hhps_default_section(),
    ];
}

function hhps_normalize_ids($raw): array
{
    $ids = [];
    if (!is_array($raw)) {
        return $ids;
    }
    foreach ($raw as $id) {
        $id = (int) $id;
        if ($id <= 0 || in_array($id, $ids, true)) {
            continue;
        }
        $ids[] = $id;
        if (count($ids) >= HHPS_MAX_PER_SECTION) {
            break;
        }
    }
    return $ids;
}

function hhps_normalize_section($raw): array
{
    $d = hhps_default_section();
    if (!is_array($raw)) {
        return $d;
    }
    return [
        'enabled' => !isset($raw['enabled']) || !empty($raw['enabled']),
        'ids'     => hhps_normalize_ids($raw['ids'] ?? []),
    ];
}

function hhps_normalize(array $data): array
{
    $d = hhps_defaults();
    return [
        'enabled'     => !isset($data['enabled']) || !empty($data['enabled']),
        'version'     => sanitize_text_field($data['version'] ?? $d['version']) ?: $d['version'],
        'newArrivals' => hhps_normalize_section($data['newArrivals'] ?? []),
        'bestSeller'  => hhps_normalize_section($data['bestSeller'] ?? []),
    ];
}

function hhps_get_settings(): array
{
    $saved = get_option(HHPS_OPTION, []);
    if (!is_array($saved)) {
        $saved = [];
    }
    return hhps_normalize(array_replace_recursive(hhps_defaults(), $saved));
}

function hhps_guess_hex(string $label): string
{
    if ($label === '') {
        return '#cccccc';
    }
    if (function_exists('hccs_guess_hex')) {
        return (string) hccs_guess_hex($label);
    }
    if (function_exists('hcsw_guess_hex')) {
        return (string) hcsw_guess_hex($label);
    }
    $map = [
        '黑' => '#111111', '黑色' => '#111111',
        '白' => '#ffffff', '白色' => '#ffffff',
        '紅' => '#b20000', '紅色' => '#b20000',
        '粉' => '#ffe0f4', '粉色' => '#ffe0f4',
        '藍' => '#9ab3d4', '藍色' => '#9ab3d4',
        '灰' => '#888888', '灰色' => '#888888',
        '綠' => '#4a7c59', '綠色' => '#4a7c59',
        '軍綠' => '#4a5d3f',
        '米' => '#e8dcc8', '米色' => '#e8dcc8',
        '卡其' => '#c4b896',
    ];
    return $map[trim($label)] ?? '#cccccc';
}

function hhps_product_color_label(\WC_Product $product): string
{
    $id = $product->get_id();
    $meta = trim((string) get_post_meta($id, 'hover_product_color', true));
    if ($meta !== '') {
        return $meta;
    }
    foreach ($product->get_attributes() as $attr) {
        if (!$attr) {
            continue;
        }
        $name = is_object($attr) ? (string) $attr->get_name() : '';
        if (!preg_match('/color|顏色|色/i', $name)) {
            continue;
        }
        $options = is_object($attr) ? $attr->get_options() : [];
        if (!empty($options[0])) {
            $term = is_numeric($options[0]) ? get_term((int) $options[0]) : null;
            return $term && !is_wp_error($term) ? (string) $term->name : (string) $options[0];
        }
    }
    return '';
}

function hhps_attachment_display_url(int $aid): string
{
    foreach (['large', 'medium_large', 'woocommerce_single'] as $size) {
        $url = wp_get_attachment_image_url($aid, $size);
        if ($url) {
            return $url;
        }
    }
    return (string) (wp_get_attachment_url($aid) ?: '');
}

function hhps_product_images(\WC_Product $product): array
{
    $ids = [];
    $featured = (int) $product->get_image_id();
    if ($featured) {
        $ids[] = $featured;
    }
    foreach ($product->get_gallery_image_ids() as $gid) {
        $gid = (int) $gid;
        if ($gid && !in_array($gid, $ids, true)) {
            $ids[] = $gid;
        }
    }
    $urls = [];
    foreach ($ids as $aid) {
        $url = hhps_attachment_display_url($aid);
        if ($url) {
            $urls[] = $url;
        }
    }
    return $urls;
}

function hhps_product_prices(\WC_Product $product): array
{
    $regular = 0.0;
    $sale = null;

    if ($product->is_type('variable')) {
        $regular = (float) $product->get_variation_regular_price('min');
        $sale_min = (float) $product->get_variation_sale_price('min');
        if ($product->is_on_sale() && $sale_min > 0 && $regular > 0 && $sale_min < $regular) {
            $sale = $sale_min;
        }
    } else {
        $regular = (float) $product->get_regular_price();
        if ($regular <= 0) {
            $regular = (float) $product->get_price();
        }
        if ($product->is_on_sale()) {
            $sale_val = (float) $product->get_sale_price();
            if ($sale_val > 0 && ($regular <= 0 || $sale_val < $regular)) {
                $sale = $sale_val;
            }
        }
    }

    return [
        'regular' => (int) round(max(0, $regular)),
        'sale'    => $sale === null ? null : (int) round($sale),
    ];
}

function hhps_is_new_product(\WC_Product $product): bool
{
    $id = $product->get_id();
    if (has_term(['new', 'new-arrival', 'new-arrivals', '新品'], 'product_tag', $id)) {
        return true;
    }
    $created = $product->get_date_created();
    if ($created && (time() - $created->getTimestamp()) < 60 * DAY_IN_SECONDS) {
        return true;
    }
    return false;
}

function hhps_map_card(\WC_Product $product): ?array
{
    if (!$product || $product->get_status() !== 'publish') {
        return null;
    }

    $images = hhps_product_images($product);
    $prices = hhps_product_prices($product);
    $color = hhps_product_color_label($product);
    $hex = hhps_guess_hex($color);
    $slug = $product->get_slug();

    return [
        'id'            => $product->get_id(),
        'slug'          => $slug,
        'href'          => '/products/' . $slug,
        'name'          => $product->get_name(),
        'image'         => $images[0] ?? '',
        'gallery'       => $images,
        'isNew'         => hhps_is_new_product($product),
        'originalPrice' => $prices['regular'],
        'salePrice'     => $prices['sale'],
        'soldOut'       => !$product->is_in_stock(),
        'colorLabel'    => $color,
        'colorHex'      => $hex,
        'colors'        => $color !== '' ? [['label' => $color, 'hex' => $hex]] : [],
        'description'   => wp_strip_all_tags($product->get_short_description() ?: $product->get_description()),
    ];
}

function hhps_admin_row(\WC_Product $product): array
{
    $thumb = wp_get_attachment_image_url((int) $product->get_image_id(), 'woocommerce_thumbnail');
    if (!$thumb) {
        $thumb = wp_get_attachment_image_url((int) $product->get_image_id(), 'thumbnail');
    }
    $prices = hhps_product_prices($product);

    return [
        'id'     => $product->get_id(),
        'name'   => $product->get_name(),
        'slug'   => $product->get_slug(),
        'sku'    => $product->get_sku(),
        'image'  => $thumb ?: '',
        'price'  => $prices['sale'] ?? $prices['regular'],
        'status' => $product->get_status(),
        'stock'  => $product->is_in_stock() ? 'instock' : 'outofstock',
    ];
}

function hhps_load_products(array $ids): array
{
    if (!$ids || !function_exists('wc_get_product')) {
        return [];
    }
    $out = [];
    foreach ($ids as $id) {
        $product = wc_get_product((int) $id);
        if (!$product) {
            continue;
        }
        $out[] = $product;
    }
    return $out;
}

function hhps_hydrate_cards(array $ids): array
{
    $cards = [];
    foreach (hhps_load_products($ids) as $product) {
        $card = hhps_map_card($product);
        if ($card && $card['image'] !== '') {
            $cards[] = $card;
        }
    }
    return $cards;
}

function hhps_hydrate_admin_rows(array $ids): array
{
    $rows = [];
    foreach (hhps_load_products($ids) as $product) {
        $rows[] = hhps_admin_row($product);
    }
    return $rows;
}

function hhps_save_from_post(): ?array
{
    if ($_SERVER['REQUEST_METHOD'] !== 'POST' || empty($_POST['hhps_act'])) {
        return null;
    }
    if (!wp_verify_nonce($_POST['hhps_nonce'] ?? '', 'hhps_save')) {
        return ['ok' => false, 'msg' => '安全驗證失敗，請重新整理後再試。'];
    }
    if (!hhps_can_manage()) {
        return ['ok' => false, 'msg' => '權限不足。'];
    }

    $act = sanitize_text_field($_POST['hhps_act']);
    if ($act === 'reset') {
        delete_option(HHPS_OPTION);
        return ['ok' => true, 'msg' => '已還原為空白設定。'];
    }
    if ($act !== 'save') {
        return null;
    }

    $raw = json_decode(wp_unslash($_POST['hhps_payload'] ?? ''), true);
    if (!is_array($raw)) {
        return ['ok' => false, 'msg' => '資料格式錯誤。'];
    }

    foreach (HHPS_SECTIONS as $key) {
        if (!empty($raw[$key]['items']) && is_array($raw[$key]['items'])) {
            $raw[$key]['ids'] = array_map(
                static fn($row) => (int) ($row['id'] ?? 0),
                $raw[$key]['items']
            );
        }
    }

    update_option(HHPS_OPTION, hhps_normalize($raw), false);
    return ['ok' => true, 'msg' => '首頁商品輪播已儲存。'];
}

function hhps_rest_home_products(): WP_REST_Response
{
    $s = hhps_get_settings();
    $payload = [
        'enabled'     => !empty($s['enabled']),
        'version'     => $s['version'],
        'newArrivals' => [
            'enabled'  => !empty($s['newArrivals']['enabled']),
            'products' => [],
        ],
        'bestSeller' => [
            'enabled'  => !empty($s['bestSeller']['enabled']),
            'products' => [],
        ],
    ];

    if ($payload['enabled'] && $payload['newArrivals']['enabled']) {
        $payload['newArrivals']['products'] = hhps_hydrate_cards($s['newArrivals']['ids']);
    }
    if ($payload['enabled'] && $payload['bestSeller']['enabled']) {
        $payload['bestSeller']['products'] = hhps_hydrate_cards($s['bestSeller']['ids']);
    }

    return new WP_REST_Response([
        'ok'           => true,
        'homeProducts' => $payload,
    ], 200);
}

function hhps_category_options(): array
{
    $terms = get_terms([
        'taxonomy'   => 'product_cat',
        'hide_empty' => true,
        'orderby'    => 'name',
        'order'      => 'ASC',
    ]);
    if (is_wp_error($terms) || empty($terms)) {
        return [];
    }

    $by_parent = [];
    foreach ($terms as $term) {
        $by_parent[(int) $term->parent][] = $term;
    }

    $out = [];
    $walk = static function ($parent, $depth) use (&$walk, &$out, $by_parent) {
        if (empty($by_parent[$parent])) {
            return;
        }
        foreach ($by_parent[$parent] as $term) {
            $prefix = $depth > 0 ? str_repeat('— ', $depth) : '';
            $out[] = [
                'id'    => (int) $term->term_id,
                'name'  => $prefix . $term->name,
                'count' => (int) $term->count,
            ];
            $walk((int) $term->term_id, $depth + 1);
        }
    };
    $walk(0, 0);
    return $out;
}

function hhps_rest_categories(): WP_REST_Response
{
    return new WP_REST_Response([
        'ok'    => true,
        'items' => hhps_category_options(),
    ], 200);
}

function hhps_rest_search(WP_REST_Request $request): WP_REST_Response
{
    if (!function_exists('wc_get_product')) {
        return new WP_REST_Response(['ok' => false, 'items' => [], 'msg' => 'WooCommerce 未啟用'], 200);
    }

    $q = trim((string) $request->get_param('q'));
    $cat = (int) $request->get_param('cat');
    $limit = $q !== '' ? 30 : 80;

    $args = [
        'post_type'      => 'product',
        'post_status'    => 'publish',
        'posts_per_page' => $limit,
        'orderby'        => 'title',
        'order'          => 'ASC',
        'no_found_rows'  => false,
    ];

    if ($cat > 0) {
        $args['tax_query'] = [[
            'taxonomy' => 'product_cat',
            'field'    => 'term_id',
            'terms'    => [$cat],
        ]];
    }

    if ($q !== '') {
        $sku_id = function_exists('wc_get_product_id_by_sku') ? (int) wc_get_product_id_by_sku($q) : 0;
        if ($sku_id > 0) {
            $args['post__in'] = [$sku_id];
            unset($args['s'], $args['orderby']);
            $args['orderby'] = 'post__in';
        } else {
            $args['s'] = $q;
        }
    } elseif ($cat <= 0) {
        return new WP_REST_Response([
            'ok'        => true,
            'items'     => [],
            'truncated' => false,
            'total'     => 0,
        ], 200);
    }

    $query = new WP_Query($args);
    $items = [];
    foreach ($query->posts as $post) {
        $product = wc_get_product($post->ID);
        if ($product) {
            $items[] = hhps_admin_row($product);
        }
    }

    return new WP_REST_Response([
        'ok'        => true,
        'items'     => $items,
        'truncated' => $query->found_posts > count($items),
        'total'     => (int) $query->found_posts,
    ], 200);
}

function hhps_section_count(array $s, string $key): int
{
    return count($s[$key]['ids'] ?? []);
}

function hhps_render_page(): void
{
    if (!hhps_can_manage()) {
        wp_die('權限不足');
    }
    if (!function_exists('wc_get_product')) {
        echo '<div class="wrap"><div class="notice notice-error"><p>請先啟用 WooCommerce。</p></div></div>';
        return;
    }

    $flash = hhps_save_from_post();
    $s = hhps_get_settings();
    $api_url = rest_url('hover/v1/home-products');
    $na_n = hhps_section_count($s, 'newArrivals');
    $bs_n = hhps_section_count($s, 'bestSeller');
    $admin_state = [
        'enabled'     => !empty($s['enabled']),
        'version'     => $s['version'],
        'newArrivals' => [
            'enabled' => !empty($s['newArrivals']['enabled']),
            'items'   => hhps_hydrate_admin_rows($s['newArrivals']['ids']),
        ],
        'bestSeller' => [
            'enabled' => !empty($s['bestSeller']['enabled']),
            'items'   => hhps_hydrate_admin_rows($s['bestSeller']['ids']),
        ],
        'categories' => hhps_category_options(),
    ];
    ?>
    <div class="wrap hover-hp-admin">
        <div class="hhps-shell">
            <div class="hhps-topbar">
                <div>
                    <h1>HOVER 首頁商品</h1>
                    <p class="description">兩個輪播各自獨立：先選分類 → 點選商品加入 → 拖曳／↑↓ 調整順序或移除。儲存後約 1 分鐘內同步至前台。</p>
                </div>
                <div class="hhps-topbar-actions">
                    <span class="hhps-status <?php echo !empty($s['enabled']) ? 'is-live' : ''; ?>">
                        <?php echo !empty($s['enabled']) ? "上線中 · 新品 {$na_n} / 熱銷 {$bs_n}" : '未上線'; ?>
                    </span>
                    <button type="submit" form="hhps-form" class="button button-primary button-hero">儲存設定</button>
                </div>
            </div>

            <?php if ($flash) : ?>
                <div class="notice <?php echo $flash['ok'] ? 'notice-success' : 'notice-error'; ?> is-dismissible">
                    <p><?php echo esc_html($flash['msg']); ?></p>
                </div>
            <?php endif; ?>

            <div class="hhps-api-pill">
                <span class="dashicons dashicons-rest-api"></span>
                <span>REST API</span>
                <code><?php echo esc_html($api_url); ?></code>
            </div>

            <form id="hhps-form" method="post">
                <?php wp_nonce_field('hhps_save', 'hhps_nonce'); ?>
                <input type="hidden" name="hhps_act" value="save">
                <input type="hidden" name="hhps_payload" id="hhps-payload" value="">

                <div class="hhps-card">
                    <div class="hhps-card-head"><h2>整體設定</h2></div>
                    <div class="hhps-card-body hhps-grid-2">
                        <label class="hhps-switch hhps-span-2">
                            <input type="checkbox" data-field="enabled" <?php checked(!empty($s['enabled'])); ?>>
                            <span class="hhps-switch-ui"></span>
                            <span class="hhps-switch-label">啟用首頁商品輪播</span>
                        </label>
                    </div>
                </div>

                <div class="hhps-layout">
                    <div class="hhps-card" data-section="newArrivals">
                        <div class="hhps-card-head">
                            <div>
                                <h2>NEW ARRIVALS</h2>
                                <p class="description" style="margin:4px 0 0">首頁第一個商品輪播，最多 <?php echo (int) HHPS_MAX_PER_SECTION; ?> 件</p>
                            </div>
                            <label class="hhps-switch">
                                <input type="checkbox" data-section-enabled="newArrivals" <?php checked(!empty($s['newArrivals']['enabled'])); ?>>
                                <span class="hhps-switch-ui"></span>
                                <span class="hhps-switch-label">顯示</span>
                            </label>
                        </div>
                        <div class="hhps-card-body">
                            <div class="hhps-picker">
                                <label class="hhps-field">
                                    <span>1. 先選分類</span>
                                    <select class="hhps-cat-select">
                                        <option value="">選擇商品分類…</option>
                                    </select>
                                </label>
                                <div class="hhps-search">
                                    <span>2. 再選商品加入</span>
                                    <button type="button" class="hhps-product-trigger" disabled>請先選擇分類</button>
                                    <input type="search" class="hhps-search-input" placeholder="在此分類搜尋名稱或 SKU…" autocomplete="off" disabled>
                                    <div class="hhps-search-results" hidden></div>
                                </div>
                            </div>
                            <p class="hhps-list-label">已加入此輪播的商品 <span class="hhps-count"></span></p>
                            <div class="hhps-list"></div>
                            <p class="description hhps-empty-hint">尚未加入商品。請先選分類，再點下拉選單加入單一商品。</p>
                        </div>
                    </div>

                    <div class="hhps-card" data-section="bestSeller">
                        <div class="hhps-card-head">
                            <div>
                                <h2>BEST SELLER</h2>
                                <p class="description" style="margin:4px 0 0">首頁第二個商品輪播，最多 <?php echo (int) HHPS_MAX_PER_SECTION; ?> 件</p>
                            </div>
                            <label class="hhps-switch">
                                <input type="checkbox" data-section-enabled="bestSeller" <?php checked(!empty($s['bestSeller']['enabled'])); ?>>
                                <span class="hhps-switch-ui"></span>
                                <span class="hhps-switch-label">顯示</span>
                            </label>
                        </div>
                        <div class="hhps-card-body">
                            <div class="hhps-picker">
                                <label class="hhps-field">
                                    <span>1. 先選分類</span>
                                    <select class="hhps-cat-select">
                                        <option value="">選擇商品分類…</option>
                                    </select>
                                </label>
                                <div class="hhps-search">
                                    <span>2. 再選商品加入</span>
                                    <button type="button" class="hhps-product-trigger" disabled>請先選擇分類</button>
                                    <input type="search" class="hhps-search-input" placeholder="在此分類搜尋名稱或 SKU…" autocomplete="off" disabled>
                                    <div class="hhps-search-results" hidden></div>
                                </div>
                            </div>
                            <p class="hhps-list-label">已加入此輪播的商品 <span class="hhps-count"></span></p>
                            <div class="hhps-list"></div>
                            <p class="description hhps-empty-hint">尚未加入商品。請先選分類，再點下拉選單加入單一商品。</p>
                        </div>
                    </div>
                </div>
            </form>

            <form method="post" class="hhps-reset-form" onsubmit="return confirm('確定清空兩個輪播的商品設定？');">
                <?php wp_nonce_field('hhps_save', 'hhps_nonce'); ?>
                <input type="hidden" name="hhps_act" value="reset">
                <button type="submit" class="button">還原空白</button>
            </form>
        </div>
    </div>
    <script type="application/json" id="hhps-initial"><?php echo wp_json_encode($admin_state, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES); ?></script>
    <?php
    hhps_print_admin_styles();
}

function hhps_print_admin_styles(): void
{
    ?>
    <style>
        .hover-hp-admin .hhps-shell { margin-top: 8px; max-width: 1100px; }
        .hover-hp-admin .hhps-topbar { display:flex; align-items:flex-start; justify-content:space-between; gap:16px; margin-bottom:16px; }
        .hover-hp-admin .hhps-topbar h1 { margin:0 0 6px; }
        .hover-hp-admin .hhps-topbar-actions { display:flex; gap:10px; align-items:center; flex-shrink:0; }
        .hover-hp-admin .hhps-status { display:inline-flex; align-items:center; gap:6px; padding:6px 12px; border-radius:999px; font-size:12px; font-weight:600; background:#f0f0f1; color:#646970; }
        .hover-hp-admin .hhps-status.is-live { background:#edf7f1; color:#1a6847; }
        .hover-hp-admin .hhps-status.is-live::before { content:""; width:8px; height:8px; border-radius:50%; background:#2a514d; }
        .hover-hp-admin .hhps-api-pill { display:inline-flex; align-items:center; gap:8px; background:#fff; border:1px solid #dcdcde; border-radius:999px; padding:8px 14px; margin-bottom:16px; font-size:12px; color:#646970; }
        .hover-hp-admin .hhps-api-pill code { font-size:11px; background:#f6f7f7; padding:2px 8px; border-radius:999px; }
        .hover-hp-admin .hhps-layout { display:grid; grid-template-columns:1fr 1fr; gap:16px; align-items:start; }
        .hover-hp-admin .hhps-card { background:#fff; border:1px solid #dcdcde; border-radius:8px; box-shadow:0 1px 2px rgba(0,0,0,.04); overflow:hidden; margin-bottom:16px; }
        .hover-hp-admin .hhps-card-head { display:flex; align-items:center; justify-content:space-between; gap:10px; padding:14px 18px; border-bottom:1px solid #f0f0f1; }
        .hover-hp-admin .hhps-card-head h2 { margin:0; font-size:14px; font-weight:700; }
        .hover-hp-admin .hhps-card-body { padding:18px; }
        .hover-hp-admin .hhps-grid-2 { display:grid; grid-template-columns:1fr 1fr; gap:14px 16px; }
        .hover-hp-admin .hhps-span-2 { grid-column:1 / -1; }
        .hover-hp-admin .hhps-switch { display:inline-flex; align-items:center; gap:12px; cursor:pointer; user-select:none; }
        .hover-hp-admin .hhps-switch input { position:absolute; opacity:0; pointer-events:none; }
        .hover-hp-admin .hhps-switch-ui { width:44px; height:24px; border-radius:999px; background:#c3c4c7; position:relative; transition:.2s; }
        .hover-hp-admin .hhps-switch-ui::after { content:""; position:absolute; top:3px; left:3px; width:18px; height:18px; border-radius:50%; background:#fff; transition:.2s; box-shadow:0 1px 3px rgba(0,0,0,.2); }
        .hover-hp-admin .hhps-switch input:checked + .hhps-switch-ui { background:#2a514d; }
        .hover-hp-admin .hhps-switch input:checked + .hhps-switch-ui::after { transform:translateX(20px); }
        .hover-hp-admin .hhps-switch-label { font-weight:600; font-size:13px; }
        .hover-hp-admin .hhps-picker { display:flex; flex-direction:column; gap:12px; margin-bottom:16px; }
        .hover-hp-admin .hhps-field, .hover-hp-admin .hhps-search > span, .hover-hp-admin .hhps-list-label { display:block; font-size:12px; font-weight:600; color:#1d2327; margin-bottom:6px; }
        .hover-hp-admin .hhps-field select, .hover-hp-admin .hhps-search-input, .hover-hp-admin .hhps-product-trigger { width:100%; max-width:none; }
        .hover-hp-admin .hhps-product-trigger { display:flex; align-items:center; justify-content:space-between; text-align:left; min-height:36px; padding:4px 10px; border:1px solid #8c8f94; border-radius:4px; background:#fff; cursor:pointer; font-size:14px; line-height:1.4; color:#2c3338; }
        .hover-hp-admin .hhps-product-trigger::after { content:"▾"; color:#646970; font-size:12px; }
        .hover-hp-admin .hhps-product-trigger:disabled { opacity:.55; cursor:not-allowed; background:#f6f7f7; }
        .hover-hp-admin .hhps-product-trigger.is-open { border-color:#2271b1; box-shadow:0 0 0 1px #2271b1; }
        .hover-hp-admin .hhps-search { position:relative; }
        .hover-hp-admin .hhps-search-input { margin-top:8px; }
        .hover-hp-admin .hhps-search-results { position:absolute; left:0; right:0; top:100%; z-index:30; background:#fff; border:1px solid #dcdcde; border-radius:8px; box-shadow:0 8px 24px rgba(0,0,0,.08); max-height:min(70vh, 640px); overflow:auto; margin-top:4px; }
        .hover-hp-admin .hhps-search-item { display:flex; gap:10px; align-items:center; width:100%; text-align:left; border:0; background:transparent; padding:8px 10px; cursor:pointer; }
        .hover-hp-admin .hhps-search-item:hover { background:#f6f7f7; }
        .hover-hp-admin .hhps-search-item.is-added { opacity:.45; cursor:default; }
        .hover-hp-admin .hhps-search-item.is-hint { cursor:default; color:#646970; font-size:12px; }
        .hover-hp-admin .hhps-search-thumb { width:40px; height:48px; object-fit:cover; border-radius:4px; background:#f0f0f1; flex-shrink:0; }
        .hover-hp-admin .hhps-search-meta { min-width:0; }
        .hover-hp-admin .hhps-search-name { font-weight:600; font-size:13px; display:block; }
        .hover-hp-admin .hhps-search-sub { font-size:11px; color:#646970; }
        .hover-hp-admin .hhps-list-label { margin:0 0 8px; }
        .hover-hp-admin .hhps-count { font-weight:500; color:#646970; }
        .hover-hp-admin .hhps-list { display:flex; flex-direction:column; gap:8px; min-height:24px; }
        .hover-hp-admin .hhps-row { display:grid; grid-template-columns:18px 48px 1fr auto; gap:10px; align-items:center; border:1px solid #dcdcde; border-radius:8px; padding:8px 10px; background:#fcfcfd; }
        .hover-hp-admin .hhps-row.is-dragging { background:#edf7f1; }
        .hover-hp-admin .hhps-handle { cursor:grab; color:#8c8f94; font-size:14px; text-align:center; }
        .hover-hp-admin .hhps-row-thumb { width:40px; height:48px; object-fit:cover; border-radius:4px; background:#f0f0f1; }
        .hover-hp-admin .hhps-row-name { font-weight:600; font-size:13px; }
        .hover-hp-admin .hhps-row-sub { font-size:11px; color:#646970; }
        .hover-hp-admin .hhps-row-actions { display:flex; gap:4px; }
        .hover-hp-admin .hhps-empty-hint { margin:8px 0 0; }
        .hover-hp-admin .hhps-reset-form { margin-top:8px; }
        @media (max-width: 960px) {
            .hover-hp-admin .hhps-layout, .hover-hp-admin .hhps-grid-2 { grid-template-columns:1fr; }
        }
    </style>
    <?php
}

function hhps_admin_footer_script(): void
{
    $screen = function_exists('get_current_screen') ? get_current_screen() : null;
    if (!$screen || $screen->id !== 'toplevel_page_hhps') {
        return;
    }
    $search_url = rest_url('hover/v1/home-products/search');
    $nonce = wp_create_nonce('wp_rest');
    $max = (int) HHPS_MAX_PER_SECTION;
    ?>
    <script>
    jQuery(function($){
        var MAX = <?php echo $max; ?>;
        var SEARCH_URL = <?php echo wp_json_encode($search_url); ?>;
        var REST_NONCE = <?php echo wp_json_encode($nonce); ?>;
        var state = {};
        try { state = JSON.parse($('#hhps-initial').text() || '{}'); } catch (e) { state = {}; }
        if (!state.newArrivals) state.newArrivals = { enabled: true, items: [] };
        if (!state.bestSeller) state.bestSeller = { enabled: true, items: [] };
        if (!Array.isArray(state.newArrivals.items)) state.newArrivals.items = [];
        if (!Array.isArray(state.bestSeller.items)) state.bestSeller.items = [];

        var timers = {};
        var productCache = {};
        var cats = Array.isArray(state.categories) ? state.categories : [];

        function esc(s){ return $('<div/>').text(s || '').html(); }

        function syncPayload(){
            var payload = {
                enabled: !!state.enabled,
                version: state.version || '1',
                newArrivals: { enabled: !!(state.newArrivals && state.newArrivals.enabled), items: (state.newArrivals && state.newArrivals.items) || [] },
                bestSeller: { enabled: !!(state.bestSeller && state.bestSeller.enabled), items: (state.bestSeller && state.bestSeller.items) || [] }
            };
            $('#hhps-payload').val(JSON.stringify(payload));
        }

        function idsOf(section){
            return (state[section].items || []).map(function(i){ return Number(i.id); });
        }

        function fillCategorySelects(){
            $('.hhps-cat-select').each(function(){
                var $sel = $(this);
                var current = $sel.val();
                $sel.find('option:not(:first)').remove();
                cats.forEach(function(cat){
                    $sel.append($('<option/>').val(cat.id).text(cat.name + (cat.count ? ' ('+cat.count+')' : '')));
                });
                if (current) $sel.val(current);
            });
        }

        function setPickerEnabled($card, enabled){
            $card.find('.hhps-product-trigger, .hhps-search-input').prop('disabled', !enabled);
            $card.find('.hhps-product-trigger').text(enabled ? '點擊選擇商品…' : '請先選擇分類');
        }

        function renderSection(section){
            var $card = $('[data-section="'+section+'"]');
            var $list = $card.find('.hhps-list').empty();
            var items = state[section].items || [];
            $card.find('.hhps-empty-hint').toggle(items.length === 0);
            $card.find('.hhps-count').text(items.length ? '('+items.length+' / '+MAX+')' : '');

            items.forEach(function(item, i){
                var sub = [];
                if (item.sku) sub.push('SKU ' + item.sku);
                if (item.price) sub.push('NT ' + item.price);
                if (item.stock === 'outofstock') sub.push('售完');
                var thumb = item.image
                    ? '<img class="hhps-row-thumb" src="'+esc(item.image)+'" alt="">'
                    : '<div class="hhps-row-thumb"></div>';
                $list.append(
                    '<div class="hhps-row" data-index="'+i+'">'+
                        '<span class="hhps-handle" title="拖曳排序">⋮⋮</span>'+
                        thumb+
                        '<div><div class="hhps-row-name">'+esc(item.name)+'</div>'+
                        '<div class="hhps-row-sub">'+esc(sub.join(' · '))+'</div></div>'+
                        '<div class="hhps-row-actions">'+
                            '<button type="button" class="button-link hhps-up" aria-label="上移">↑</button>'+
                            '<button type="button" class="button-link hhps-down" aria-label="下移">↓</button>'+
                            '<button type="button" class="button-link-delete hhps-remove">移除</button>'+
                        '</div>'+
                    '</div>'
                );
            });

            if ($list.hasClass('ui-sortable')) {
                $list.sortable('refresh');
            }
            syncPayload();
        }

        function renderAll(){
            renderSection('newArrivals');
            renderSection('bestSeller');
        }

        function moveItem(section, from, to){
            var items = state[section].items;
            if (to < 0 || to >= items.length || from === to) return;
            var row = items.splice(from, 1)[0];
            items.splice(to, 0, row);
            renderSection(section);
        }

        function addItem(section, item){
            if (!item || !item.id) return;
            if (idsOf(section).indexOf(Number(item.id)) !== -1) return;
            if ((state[section].items || []).length >= MAX) {
                window.alert('此區塊最多 ' + MAX + ' 件商品');
                return;
            }
            state[section].items.push(item);
            renderSection(section);
        }

        $('input[data-field="enabled"]').on('change', function(){
            state.enabled = this.checked;
            syncPayload();
        });
        $('input[data-section-enabled]').on('change', function(){
            var key = $(this).attr('data-section-enabled');
            state[key].enabled = this.checked;
            syncPayload();
        });

        $(document).on('click', '.hhps-remove', function(){
            var $card = $(this).closest('[data-section]');
            var section = $card.data('section');
            var i = parseInt($(this).closest('.hhps-row').attr('data-index'), 10);
            state[section].items.splice(i, 1);
            renderSection(section);
        });
        $(document).on('click', '.hhps-up', function(){
            var section = $(this).closest('[data-section]').data('section');
            var i = parseInt($(this).closest('.hhps-row').attr('data-index'), 10);
            moveItem(section, i, i - 1);
        });
        $(document).on('click', '.hhps-down', function(){
            var section = $(this).closest('[data-section]').data('section');
            var i = parseInt($(this).closest('.hhps-row').attr('data-index'), 10);
            moveItem(section, i, i + 1);
        });

        $('.hhps-list').sortable({
            handle: '.hhps-handle',
            placeholder: 'hhps-row',
            start: function(e, ui){ ui.item.addClass('is-dragging'); },
            stop: function(e, ui){
                ui.item.removeClass('is-dragging');
                var section = $(this).closest('[data-section]').data('section');
                var next = [];
                $(this).children('.hhps-row').each(function(){
                    var i = parseInt($(this).attr('data-index'), 10);
                    if (state[section].items[i]) next.push(state[section].items[i]);
                });
                state[section].items = next;
                renderSection(section);
            }
        });

        function closeDropdowns(){
            $('.hhps-search-results').prop('hidden', true).empty();
            $('.hhps-product-trigger').removeClass('is-open');
        }

        function renderSearch($box, section, data){
            var $res = $box.find('.hhps-search-results').empty();
            var $trigger = $box.find('.hhps-product-trigger');
            var items = (data && data.items) || [];
            if (!items.length) {
                $res.append('<div class="hhps-search-item is-hint">此分類沒有商品</div>').prop('hidden', false);
                $trigger.addClass('is-open');
                return;
            }
            if (data && data.truncated) {
                $res.append('<div class="hhps-search-item is-hint">此分類共 '+esc(String(data.total))+' 件，僅顯示前 '+items.length+' 件。請用搜尋縮小範圍。</div>');
            }
            var added = idsOf(section);
            items.forEach(function(item){
                var isAdded = added.indexOf(Number(item.id)) !== -1;
                var sub = [];
                if (item.sku) sub.push(item.sku);
                if (item.price) sub.push('NT ' + item.price);
                if (isAdded) sub.push('已加入');
                var thumb = item.image
                    ? '<img class="hhps-search-thumb" src="'+esc(item.image)+'" alt="">'
                    : '<div class="hhps-search-thumb"></div>';
                var $btn = $('<button type="button" class="hhps-search-item'+(isAdded?' is-added':'')+'"></button>');
                $btn.append(thumb)
                    .append('<span class="hhps-search-meta"><span class="hhps-search-name">'+esc(item.name)+'</span><span class="hhps-search-sub">'+esc(sub.join(' · ') || '點擊加入')+'</span></span>');
                if (!isAdded) {
                    $btn.on('click', function(e){
                        e.preventDefault();
                        e.stopPropagation();
                        addItem(section, item);
                        $btn.addClass('is-added').off('click');
                        $btn.find('.hhps-search-sub').text((item.sku ? item.sku + ' · ' : '') + '已加入');
                    });
                }
                $res.append($btn);
            });
            $res.prop('hidden', false);
            $trigger.addClass('is-open');
        }

        function fetchProducts($card, q){
            var section = $card.data('section');
            var $box = $card.find('.hhps-search');
            var cat = parseInt($card.find('.hhps-cat-select').val(), 10) || 0;
            if (!cat && !q) {
                closeDropdowns();
                return;
            }
            var cacheKey = cat + '|' + (q || '');
            if (!q && productCache[cacheKey]) {
                renderSearch($box, section, productCache[cacheKey]);
                return;
            }
            $box.find('.hhps-search-results').html('<div class="hhps-search-item is-hint">載入中…</div>').prop('hidden', false);
            $card.find('.hhps-product-trigger').addClass('is-open');
            $.ajax({
                url: SEARCH_URL,
                data: { q: q || '', cat: cat || '' },
                beforeSend: function(xhr){ xhr.setRequestHeader('X-WP-Nonce', REST_NONCE); }
            }).done(function(data){
                if (!q) productCache[cacheKey] = data;
                renderSearch($box, section, data || { items: [] });
            }).fail(function(){
                $box.find('.hhps-search-results').html('<div class="hhps-search-item is-hint">載入失敗，請再試一次</div>').prop('hidden', false);
            });
        }

        $('.hhps-cat-select').on('change', function(){
            var $card = $(this).closest('[data-section]');
            var cat = parseInt($(this).val(), 10) || 0;
            $card.find('.hhps-search-input').val('');
            setPickerEnabled($card, !!cat);
            if (cat) fetchProducts($card, '');
            else closeDropdowns();
        });

        $(document).on('click', '.hhps-product-trigger', function(e){
            e.preventDefault();
            if (this.disabled) return;
            var $card = $(this).closest('[data-section]');
            var $res = $card.find('.hhps-search-results');
            if (!$res.prop('hidden') && $(this).hasClass('is-open')) {
                closeDropdowns();
                return;
            }
            $card.find('.hhps-search-input').val('');
            fetchProducts($card, '');
        });

        $('.hhps-search-input').on('input', function(){
            var $input = $(this);
            var $card = $input.closest('[data-section]');
            var section = $card.data('section');
            var q = $.trim($input.val());
            var cat = parseInt($card.find('.hhps-cat-select').val(), 10) || 0;
            clearTimeout(timers[section]);
            if (!cat) return;
            timers[section] = setTimeout(function(){
                fetchProducts($card, q);
            }, 220);
        });

        $(document).on('click', function(e){
            if (!$(e.target).closest('.hhps-search, .hhps-cat-select').length) {
                closeDropdowns();
            }
        });

        $('#hhps-form').on('submit', function(){ syncPayload(); });

        fillCategorySelects();
        $('.hhps-card[data-section]').each(function(){ setPickerEnabled($(this), false); });
        renderAll();
    });
    </script>
    <?php
}
