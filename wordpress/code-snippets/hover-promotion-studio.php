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
        'reward_id'            => absint($raw['reward_id'] ?? 0),
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

    return [
        'productId'     => $parent_id,
        'variationId'   => $variation_id,
        'name'          => wp_strip_all_tags($product->get_name()),
        'image'         => $image_id ? wp_get_attachment_image_url($image_id, 'woocommerce_thumbnail') : '',
        'regularPrice'  => (float) $product->get_regular_price(),
        'stockStatus'   => $product->get_stock_status(),
        'manageStock'   => $manage_stock,
        'stockQuantity' => $stock_quantity,
        'backorders'    => $product->get_backorders(),
    ];
}

function hvpr_rest_promotions(): WP_REST_Response
{
    $rows = [];
    foreach (hvpr_rules() as $rule) {
        if (!hvpr_rule_is_active($rule) || empty($rule['reward_id'])) {
            continue;
        }
        $product = hvpr_product_payload((int) $rule['reward_id']);
        if (!$product) {
            continue;
        }
        $in_stock = $product['stockStatus'] !== 'outofstock'
            && (!$product['manageStock'] || $product['stockQuantity'] === null || $product['stockQuantity'] > 0 || $product['backorders'] !== 'no');
        if (!$in_stock && $rule['stock_behavior'] === 'hide') {
            continue;
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
            'inStock'              => $in_stock,
            'product'              => $product,
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
    if ($rule['reward_id'] <= 0 || !wc_get_product($rule['reward_id'])) {
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

                    <label><?php echo $type === 'gift' ? '贈品（可選商品規格）' : '加價購商品（可選商品規格）'; ?></label>
                    <select class="wc-enhanced-select" style="width:100%" name="reward_id" data-placeholder="搜尋商品或規格…">
                        <?php hvpr_product_options($editing['reward_id'] ? [(int) $editing['reward_id']] : []); ?>
                    </select>

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
                        <option value="disable" <?php selected($editing['stock_behavior'], 'disable'); ?>>顯示「已售完」且不可選</option>
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
                        $product = hvpr_product_payload((int) $row['reward_id']);
                        $active = hvpr_rule_is_active($row);
                    ?>
                        <article class="hps-row">
                            <div class="hps-row-head">
                                <div><strong><?php echo esc_html($row['name']); ?></strong><span class="hps-status <?php echo $active ? 'on' : ''; ?>"><?php echo $active ? '進行中' : (!empty($row['enabled']) ? '未在活動期間' : '已停用'); ?></span></div>
                                <span>滿 NT$<?php echo number_format((int) $row['threshold']); ?></span>
                            </div>
                            <p><?php echo esc_html($product['name'] ?? '商品已刪除'); ?><?php echo $type === 'addon' ? '｜加購價 NT$' . number_format((int) $row['purchase_price']) : '｜贈送 ' . (int) $row['reward_qty'] . ' 件'; ?></p>
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
    <?php
}
