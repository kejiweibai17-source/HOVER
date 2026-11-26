<?php
/**
 * HOVER — KOL／合作夥伴分潤（專屬優惠碼＋專屬連結＋銷售分析）
 *
 * 使用方式（WordPress 後台）：
 * 1. Code Snippets → Add New（或編輯既有）→ 貼上「整份」本檔
 * 2. 標題：HOVER KOL 分潤
 * 3. Run snippet：Everywhere（一定要 Everywhere，不能只選 Front-end）
 * 4. Save changes and Activate
 * 5. 重新整理後台 → 左側應出現「KOL 分潤」（約在 HOVER 優惠碼附近）
 *    或到 WooCommerce → KOL 分潤
 *
 * 若沒出現：到 Code Snippets 看此則是否變成 Inactive（啟動時出錯會自動停用）。
 * 安全模式：/wp-admin/?snippets-safe-mode=1
 *
 * 運作方式：
 * - 每位合作夥伴一組代碼（例 JOYCE），可同時是 WooCommerce 優惠碼（專屬優惠）
 * - 專屬連結：https://hoverofficial.com/?ref=JOYCE&utm_source=kol...
 *   官網記住 30 天（最後點擊優先），購物袋自動帶入該夥伴優惠碼
 * - 歸因順序：訂單使用了夥伴優惠碼 → 該夥伴；否則有專屬連結紀錄 → 該夥伴
 * - 建單當下寫入 _hover_kol_partner／_hover_kol_via／_hover_kol_rate（分潤 % 快照）
 * - 計入狀態：已付款以後（處理中、已完成、出貨中…），排除待付款／保留／取消／失敗／已退款
 * - 分潤基準：訂單實付 − 運費 − 已退款
 */

if (!defined('ABSPATH')) {
    exit;
}
if (defined('HKOL_LOADED')) {
    return;
}
define('HKOL_LOADED', true);

if (!defined('HKOL_PARTNERS_OPT')) {
    define('HKOL_PARTNERS_OPT', 'hover_kol_partners');
}
if (!defined('HKOL_CLICKS_OPT')) {
    define('HKOL_CLICKS_OPT', 'hover_kol_clicks');
}
if (!defined('HKOL_SETTINGS_OPT')) {
    define('HKOL_SETTINGS_OPT', 'hover_kol_settings');
}

function hkol_can_manage(): bool
{
    return current_user_can('manage_woocommerce') || current_user_can('manage_options');
}

/* ───────────────────────── 資料 ───────────────────────── */

function hkol_norm_code($raw): string
{
    $code = strtoupper(trim((string) $raw));
    return preg_match('/^[A-Z0-9][A-Z0-9_-]{1,39}$/', $code) ? $code : '';
}

function hkol_partner_types(): array
{
    return ['KOL', 'KOC', '直播主', '其他'];
}

function hkol_norm_partner_type($raw): string
{
    $val = trim((string) $raw);
    return in_array($val, hkol_partner_types(), true) ? $val : 'KOL';
}

function hkol_partners(): array
{
    $list = get_option(HKOL_PARTNERS_OPT, []);
    return is_array($list) ? $list : [];
}

function hkol_save_partners(array $list): void
{
    ksort($list);
    update_option(HKOL_PARTNERS_OPT, $list, false);
}

function hkol_settings(): array
{
    $s = get_option(HKOL_SETTINGS_OPT, []);
    return wp_parse_args(is_array($s) ? $s : [], [
        'site_url' => 'https://hoverofficial.com',
        'utm'      => '1',
    ]);
}

function hkol_link(string $code, string $base = ''): string
{
    $s = hkol_settings();
    $base = $base !== '' ? $base : trailingslashit($s['site_url']);
    $args = ['ref' => $code];
    if ($s['utm'] === '1') {
        $args += [
            'utm_source'   => 'kol',
            'utm_medium'   => 'affiliate',
            'utm_campaign' => strtolower($code),
        ];
    }
    return add_query_arg($args, $base);
}

function hkol_partner_by_coupon(string $coupon_code, array $partners): ?array
{
    $c = strtoupper(trim($coupon_code));
    if ($c === '') {
        return null;
    }
    foreach ($partners as $p) {
        if (!empty($p['coupon_id']) && strtoupper($p['coupon_code'] ?? $p['code']) === $c) {
            return $p;
        }
    }
    return null;
}

/* ───────────────────────── 訂單歸因 ───────────────────────── */

function hkol_attribute_order(WC_Order $order, bool $save = true): array
{
    $partners = hkol_partners();
    $hit = null;
    $via = '';

    $coupons = [];
    $used = trim((string) $order->get_meta('_used_coupon_code'));
    if ($used !== '') {
        $coupons[] = $used;
    }
    foreach ($order->get_coupon_codes() as $c) {
        $coupons[] = $c;
    }
    foreach ($coupons as $c) {
        $p = hkol_partner_by_coupon($c, $partners);
        if ($p) {
            $hit = $p;
            $via = 'coupon';
            break;
        }
    }

    if (!$hit) {
        $ref = hkol_norm_code($order->get_meta('_hover_ref_code'));
        if ($ref !== '' && isset($partners[$ref]) && ($partners[$ref]['status'] ?? '') === 'active') {
            $hit = $partners[$ref];
            $via = 'link';
        }
    }

    $out = $hit ? ['code' => $hit['code'], 'via' => $via, 'rate' => (float) $hit['rate']] : [];
    if ($save) {
        $order->update_meta_data('_hover_kol_checked', '1');
        if ($out) {
            $order->update_meta_data('_hover_kol_partner', $out['code']);
            $order->update_meta_data('_hover_kol_via', $out['via']);
            $order->update_meta_data('_hover_kol_rate', (string) $out['rate']);
        }
        $order->save_meta_data();
    }
    return $out;
}

/** 讀已寫入的歸因；舊訂單（snippet 啟用前）首次讀取時補算 */
function hkol_order_attr(WC_Order $order): array
{
    $code = (string) $order->get_meta('_hover_kol_partner');
    if ($code !== '') {
        return [
            'code' => $code,
            'via'  => (string) $order->get_meta('_hover_kol_via') ?: 'coupon',
            'rate' => (float) $order->get_meta('_hover_kol_rate'),
        ];
    }
    if ($order->get_meta('_hover_kol_checked') === '1') {
        return [];
    }
    return hkol_attribute_order($order);
}

add_action('woocommerce_rest_insert_shop_order_object', function ($order, $request, $creating) {
    if ($creating && $order instanceof WC_Order) {
        hkol_attribute_order($order);
    }
}, 20, 3);

add_action('woocommerce_checkout_order_processed', function ($order_id) {
    $order = wc_get_order($order_id);
    if ($order instanceof WC_Order) {
        hkol_attribute_order($order);
    }
}, 20);

/* ───────────────────────── 點擊計數（官網 /api/affiliate/click 呼叫） ───────────────────────── */

add_action('rest_api_init', function () {
    // wc- 前綴命名空間才會套用 WooCommerce consumer key 驗證
    register_rest_route('wc-hover/v1', '/kol-click', [
        'methods'             => 'POST',
        'callback'            => 'hkol_rest_click',
        'permission_callback' => function () {
            // WooCommerce REST 以 consumer key 登入時，對應到金鑰所屬使用者
            return hkol_can_manage();
        },
    ]);
});

function hkol_rest_click(WP_REST_Request $req)
{
    $code = hkol_norm_code($req->get_param('code'));
    $partners = hkol_partners();
    if ($code === '' || !isset($partners[$code]) || ($partners[$code]['status'] ?? '') !== 'active') {
        return ['ok' => false];
    }
    $clicks = get_option(HKOL_CLICKS_OPT, []);
    $clicks = is_array($clicks) ? $clicks : [];
    $day = wp_date('Y-m-d');
    $clicks[$code][$day] = (int) ($clicks[$code][$day] ?? 0) + 1;
    update_option(HKOL_CLICKS_OPT, $clicks, false);
    return ['ok' => true];
}

/* ───────────────────────── 報表 ───────────────────────── */

function hkol_counted_statuses(): array
{
    $excluded = ['pending', 'failed', 'cancelled', 'refunded', 'on-hold', 'checkout-draft', 'trash'];
    $all = array_map(function ($s) {
        return preg_replace('/^wc-/', '', $s);
    }, array_keys(wc_get_order_statuses()));
    return array_values(array_diff($all, $excluded));
}

function hkol_order_net(WC_Order $order): float
{
    if ($order->get_status() === 'refunded') {
        return 0;
    }
    $refunded_goods = max(
        0,
        (float) $order->get_total_refunded() - (float) $order->get_total_shipping_refunded()
    );
    $net = (float) $order->get_total()
        - (float) $order->get_shipping_total()
        - (float) $order->get_shipping_tax()
        - $refunded_goods;
    return max(0, round($net));
}

function hkol_order_discount(WC_Order $order): float
{
    $d = (float) $order->get_discount_total();
    foreach ($order->get_fees() as $fee) {
        $t = (float) $fee->get_total();
        if ($t < 0) {
            $d += -$t;
        }
    }
    return round($d);
}

function hkol_mask_name(string $name): string
{
    $name = trim($name);
    if ($name === '') {
        return '—';
    }
    $first = mb_substr($name, 0, 1);
    return $first . str_repeat('○', max(1, min(3, mb_strlen($name) - 1)));
}

function hkol_range(array $src): array
{
    $tz = wp_timezone();
    $now = new DateTimeImmutable('now', $tz);
    $preset = sanitize_key($src['range'] ?? 'month');
    $from = $now->format('Y-m-01');
    $to = $now->format('Y-m-d');
    switch ($preset) {
        case 'last_month':
            $from = $now->modify('first day of last month')->format('Y-m-d');
            $to = $now->modify('last day of last month')->format('Y-m-d');
            break;
        case '30d':
            $from = $now->modify('-29 days')->format('Y-m-d');
            break;
        case 'year':
            $from = $now->format('Y-01-01');
            break;
        case 'custom':
            $f = (string) ($src['from'] ?? '');
            $t = (string) ($src['to'] ?? '');
            if (preg_match('/^\d{4}-\d{2}-\d{2}$/', $f) && preg_match('/^\d{4}-\d{2}-\d{2}$/', $t)) {
                $from = min($f, $t);
                $to = max($f, $t);
            }
            break;
        default:
            $preset = 'month';
    }
    return [$preset, $from, $to];
}

function hkol_report(string $from, string $to): array
{
    $partners = hkol_partners();
    $agg = [];
    $orders = [];
    $products = [];
    $series = [];
    $store_net = 0;
    $store_orders = 0;

    $blank = function (string $code) use ($partners) {
        return [
            'code'         => $code,
            'name'         => $partners[$code]['name'] ?? $code,
            'partner_type' => hkol_norm_partner_type($partners[$code]['partner_type'] ?? 'KOL'),
            'rate'         => (float) ($partners[$code]['rate'] ?? 0),
            'status'     => $partners[$code]['status'] ?? 'deleted',
            'orders'     => 0,
            'via_coupon' => 0,
            'via_link'   => 0,
            'qty'        => 0,
            'net'        => 0,
            'discount'   => 0,
            'refund'     => 0,
            'commission' => 0,
            'clicks'     => 0,
        ];
    };
    foreach ($partners as $code => $p) {
        $agg[$code] = $blank($code);
    }

    $statuses = hkol_counted_statuses();
    $page = 1;
    do {
        $batch = wc_get_orders([
            'type'         => 'shop_order',
            'status'       => $statuses,
            'date_created' => $from . '...' . $to,
            'limit'        => 200,
            'paged'        => $page,
            'orderby'      => 'date',
            'order'        => 'DESC',
        ]);
        foreach ($batch as $order) {
            if (!$order instanceof WC_Order) {
                continue;
            }
            $net = hkol_order_net($order);
            $store_net += $net;
            $store_orders++;

            $attr = hkol_order_attr($order);
            if (!$attr) {
                continue;
            }
            $code = $attr['code'];
            if (!isset($agg[$code])) {
                $agg[$code] = $blank($code);
            }
            $commission = round($net * $attr['rate'] / 100);
            $discount = hkol_order_discount($order);
            $refund = (float) $order->get_total_refunded();
            $qty = 0;
            foreach ($order->get_items() as $item) {
                $q = (int) $item->get_quantity();
                $qty += $q;
                $name = $item->get_name();
                if (!isset($products[$code][$name])) {
                    $products[$code][$name] = ['qty' => 0, 'amount' => 0];
                }
                $products[$code][$name]['qty'] += $q;
                $products[$code][$name]['amount'] += (float) $item->get_total();
            }
            $created = $order->get_date_created();
            $day = $created ? $created->date_i18n('Y-m-d') : $from;

            $a = &$agg[$code];
            $a['orders']++;
            $a[$attr['via'] === 'link' ? 'via_link' : 'via_coupon']++;
            $a['qty'] += $qty;
            $a['net'] += $net;
            $a['discount'] += $discount;
            $a['refund'] += $refund;
            $a['commission'] += $commission;
            unset($a);

            $series[$code][$day] = ($series[$code][$day] ?? 0) + $net;

            $orders[] = [
                'id'         => $order->get_id(),
                'number'     => $order->get_order_number(),
                'date'       => $created ? $created->date_i18n('Y-m-d H:i') : '',
                'status'     => wc_get_order_status_name($order->get_status()),
                'customer'   => hkol_mask_name($order->get_billing_last_name() . $order->get_billing_first_name()),
                'code'       => $code,
                'via'        => $attr['via'],
                'coupon'     => (string) $order->get_meta('_used_coupon_code'),
                'rate'       => $attr['rate'],
                'qty'        => $qty,
                'total'      => (float) $order->get_total(),
                'discount'   => $discount,
                'refund'     => $refund,
                'net'        => $net,
                'commission' => $commission,
                'edit'       => $order->get_edit_order_url(),
            ];
        }
        $page++;
    } while (count($batch) === 200);

    $clicks = get_option(HKOL_CLICKS_OPT, []);
    if (is_array($clicks)) {
        foreach ($clicks as $code => $days) {
            if (!isset($agg[$code]) || !is_array($days)) {
                continue;
            }
            foreach ($days as $d => $n) {
                if ($d >= $from && $d <= $to) {
                    $agg[$code]['clicks'] += (int) $n;
                }
            }
        }
    }

    uasort($agg, function ($x, $y) {
        return $y['net'] <=> $x['net'] ?: strcmp($x['code'], $y['code']);
    });
    foreach ($products as $code => $list) {
        uasort($list, function ($x, $y) {
            return $y['amount'] <=> $x['amount'];
        });
        $products[$code] = $list;
    }

    $tot = ['orders' => 0, 'net' => 0, 'commission' => 0, 'clicks' => 0, 'discount' => 0];
    foreach ($agg as $a) {
        foreach ($tot as $k => $_) {
            $tot[$k] += $a[$k];
        }
    }

    return compact('agg', 'orders', 'products', 'series', 'tot', 'store_net', 'store_orders');
}

/** 區間 > 62 天改以月份彙整 */
function hkol_series_buckets(array $days, string $from, string $to): array
{
    $start = new DateTimeImmutable($from, wp_timezone());
    $end = new DateTimeImmutable($to, wp_timezone());
    $monthly = $end->diff($start)->days > 62;
    $out = [];
    for ($d = $start; $d <= $end; $d = $d->modify('+1 day')) {
        $key = $monthly ? $d->format('Y-m') : $d->format('m/d');
        $out[$key] = ($out[$key] ?? 0) + (float) ($days[$d->format('Y-m-d')] ?? 0);
    }
    return $out;
}

/* ───────────────────────── CSV 匯出 ───────────────────────── */

add_action('admin_post_hkol_export', function () {
    if (!hkol_can_manage()) {
        wp_die('權限不足');
    }
    check_admin_referer('hkol_export');
    [, $from, $to] = hkol_range($_GET);
    $only = hkol_norm_code($_GET['partner'] ?? '');
    $type = ($_GET['type'] ?? '') === 'summary' ? 'summary' : 'orders';
    $r = hkol_report($from, $to);

    $name = 'hover-kol-' . $type . '-' . ($only ? $only . '-' : '') . $from . '_' . $to . '.csv';
    nocache_headers();
    header('Content-Type: text/csv; charset=utf-8');
    header('Content-Disposition: attachment; filename="' . $name . '"');
    echo "\xEF\xBB\xBF";
    $out = fopen('php://output', 'w');

    if ($type === 'summary') {
        fputcsv($out, ['代碼', '名稱', '合作類型', '分潤%', '點擊', '訂單', '經優惠碼', '經連結', '件數', '銷售額(不含運、扣退款)', '折扣', '退款', '佣金', '轉換率']);
        foreach ($r['agg'] as $a) {
            if ($only && $a['code'] !== $only) {
                continue;
            }
            fputcsv($out, [
                $a['code'], $a['name'], $a['partner_type'] ?? 'KOL', $a['rate'], $a['clicks'], $a['orders'], $a['via_coupon'], $a['via_link'],
                $a['qty'], $a['net'], $a['discount'], $a['refund'], $a['commission'],
                $a['clicks'] > 0 ? round($a['orders'] / $a['clicks'] * 100, 2) . '%' : '',
            ]);
        }
    } else {
        fputcsv($out, ['訂單編號', '下單時間', '狀態', '顧客', '夥伴代碼', '夥伴名稱', '合作類型', '歸因', '使用優惠碼', '件數', '訂單總額', '折扣', '退款', '分潤基準', '分潤%', '佣金']);
        foreach ($r['orders'] as $o) {
            if ($only && $o['code'] !== $only) {
                continue;
            }
            fputcsv($out, [
                $o['number'], $o['date'], $o['status'], $o['customer'], $o['code'],
                $r['agg'][$o['code']]['name'] ?? $o['code'],
                $r['agg'][$o['code']]['partner_type'] ?? 'KOL',
                $o['via'] === 'link' ? '專屬連結' : '專屬優惠碼',
                strtoupper($o['coupon']), $o['qty'], $o['total'], $o['discount'], $o['refund'],
                $o['net'], $o['rate'], $o['commission'],
            ]);
        }
    }
    fclose($out);
    exit;
});

/* ───────────────────────── 合作夥伴 CRUD ───────────────────────── */

function hkol_create_partner(array $in): array
{
    $code = hkol_norm_code($in['code'] ?? '');
    $name = sanitize_text_field($in['name'] ?? '');
    if ($code === '' || $name === '') {
        return ['ok' => false, 'msg' => '請填寫名稱，代碼限英數字／-／_（2–40 字）'];
    }
    $partners = hkol_partners();
    if (isset($partners[$code])) {
        return ['ok' => false, 'msg' => "代碼已存在：{$code}"];
    }

    $partner = [
        'code'         => $code,
        'name'         => $name,
        'partner_type' => hkol_norm_partner_type($in['partner_type'] ?? 'KOL'),
        'rate'         => max(0, min(100, (float) ($in['rate'] ?? 0))),
        'coupon_id'    => 0,
        'coupon_code'  => $code,
        'contact'      => sanitize_text_field($in['contact'] ?? ''),
        'note'         => sanitize_text_field($in['note'] ?? ''),
        'status'       => 'active',
        'created'      => wp_date('Y-m-d'),
    ];

    $amt = max(0, (float) ($in['amount'] ?? 0));
    $msg = "已建立合作夥伴 {$name}（{$code}）";
    if ($amt > 0 && class_exists('WC_Coupon')) {
        $existing = wc_get_coupon_id_by_code($code);
        if ($existing) {
            $c = new WC_Coupon($existing);
            $msg .= '，已綁定既有優惠碼';
        } else {
            $c = new WC_Coupon();
            $c->set_code($code);
            $type = ($in['type'] ?? '') === 'percent' ? 'percent' : 'fixed_cart';
            $c->set_discount_type($type);
            $c->set_amount($amt);
            $c->set_description("專屬優惠｜{$code}");
            $c->set_individual_use(true);
            $c->set_exclude_sale_items(!empty($in['nosale']));
            $min = (float) ($in['min'] ?? 0);
            if ($min > 0) {
                $c->set_minimum_amount($min);
            }
            $limit = (int) ($in['usage_limit'] ?? 0);
            if ($limit > 0) {
                $c->set_usage_limit($limit);
            }
            if (!empty($in['date_end']) && preg_match('/^\d{4}-\d{2}-\d{2}$/', $in['date_end'])) {
                $c->set_date_expires(new DateTime($in['date_end'] . ' 23:59:59', wp_timezone()));
            }
            $msg .= '，並建立專屬優惠碼';
        }
        $c->update_meta_data('hover_coupon_kind', 'kol');
        $c->update_meta_data('hover_kol_code', $code);
        $partner['coupon_id'] = (int) $c->save();
    }

    $partners[$code] = $partner;
    hkol_save_partners($partners);
    return ['ok' => true, 'msg' => $msg, 'code' => $code];
}

function hkol_set_coupon_paused(int $coupon_id, bool $paused): void
{
    if (!$coupon_id || !class_exists('WC_Coupon')) {
        return;
    }
    $c = new WC_Coupon($coupon_id);
    if (!$c->get_id()) {
        return;
    }
    if ($paused) {
        $exp = $c->get_date_expires();
        $c->update_meta_data('_hover_kol_orig_expires', $exp ? (string) $exp->getTimestamp() : '');
        // 官網結帳以到期日判斷可用與否，暫停＝設為已過期
        $c->set_date_expires(time() - DAY_IN_SECONDS);
    } else {
        $orig = (string) $c->get_meta('_hover_kol_orig_expires');
        $c->set_date_expires($orig !== '' ? (int) $orig : null);
        $c->delete_meta_data('_hover_kol_orig_expires');
    }
    $c->save();
}

function hkol_post(): ?array
{
    if ($_SERVER['REQUEST_METHOD'] !== 'POST' || empty($_POST['hkol_act'])) {
        return null;
    }
    if (!wp_verify_nonce($_POST['hkol_nonce'] ?? '', 'hkol')) {
        return ['ok' => false, 'msg' => '驗證失敗，請重新整理'];
    }
    if (!hkol_can_manage()) {
        return ['ok' => false, 'msg' => '權限不足'];
    }
    $in = wp_unslash($_POST);
    $act = sanitize_key($in['hkol_act']);
    $partners = hkol_partners();
    $code = hkol_norm_code($in['code'] ?? '');

    if ($act === 'create') {
        return hkol_create_partner($in);
    }
    if ($act === 'settings') {
        update_option(HKOL_SETTINGS_OPT, [
            'site_url' => esc_url_raw($in['site_url'] ?? '') ?: 'https://hoverofficial.com',
            'utm'      => !empty($in['utm']) ? '1' : '0',
        ], false);
        return ['ok' => true, 'msg' => '設定已儲存'];
    }
    if ($act === 'reattribute') {
        [, $from, $to] = hkol_range($in);
        $n = 0;
        $ids = wc_get_orders([
            'type'         => 'shop_order',
            'status'       => hkol_counted_statuses(),
            'date_created' => $from . '...' . $to,
            'limit'        => -1,
            'return'       => 'ids',
        ]);
        foreach ($ids as $id) {
            $o = wc_get_order($id);
            if ($o && (string) $o->get_meta('_hover_kol_partner') === '' && hkol_attribute_order($o)) {
                $n++;
            }
        }
        return ['ok' => true, 'msg' => "已重新比對 {$from}～{$to}，新增歸因 {$n} 筆訂單"];
    }
    if (!isset($partners[$code])) {
        return ['ok' => false, 'msg' => '找不到此合作夥伴'];
    }
    $p = $partners[$code];

    if ($act === 'update') {
        $p['name'] = sanitize_text_field($in['name'] ?? $p['name']) ?: $p['name'];
        $p['partner_type'] = hkol_norm_partner_type($in['partner_type'] ?? ($p['partner_type'] ?? 'KOL'));
        $p['rate'] = max(0, min(100, (float) ($in['rate'] ?? $p['rate'])));
        $p['contact'] = sanitize_text_field($in['contact'] ?? '');
        $p['note'] = sanitize_text_field($in['note'] ?? '');
        $partners[$code] = $p;
        hkol_save_partners($partners);
        return ['ok' => true, 'msg' => "已更新 {$p['name']}（新分潤 % 只套用之後的訂單）"];
    }
    if ($act === 'toggle') {
        $pause = $p['status'] === 'active';
        $p['status'] = $pause ? 'paused' : 'active';
        hkol_set_coupon_paused((int) $p['coupon_id'], $pause);
        $partners[$code] = $p;
        hkol_save_partners($partners);
        return ['ok' => true, 'msg' => $pause ? "已暫停 {$p['name']}：優惠碼失效、連結不再歸因" : "已恢復 {$p['name']}"];
    }
    if ($act === 'delete') {
        if (!empty($in['trash_coupon']) && !empty($p['coupon_id'])) {
            wp_trash_post((int) $p['coupon_id']);
        }
        unset($partners[$code]);
        hkol_save_partners($partners);
        return ['ok' => true, 'msg' => "已刪除 {$p['name']}（歷史訂單歸因保留）"];
    }
    return null;
}

/* ───────────────────────── 後台頁面 ───────────────────────── */

add_action('admin_menu', function () {
    if (!hkol_can_manage()) {
        return;
    }
    // 與「HOVER 優惠碼」同層級的左側主選單
    add_menu_page(
        '合作夥伴分潤',
        '合作夥伴分潤',
        'manage_options',
        'hkol',
        'hkol_page',
        'dashicons-groups',
        57
    );
    // 備份入口：掛在 WooCommerce 底下，避免主選單被其他外掛擠掉時找不到
    add_submenu_page(
        'woocommerce',
        '合作夥伴分潤',
        '合作夥伴分潤',
        'manage_options',
        'hkol',
        'hkol_page'
    );
}, 99);

function hkol_money($n): string
{
    return 'NT$' . number_format((float) $n);
}

function hkol_url(array $args = []): string
{
    return add_query_arg(array_merge(['page' => 'hkol'], $args), admin_url('admin.php'));
}

function hkol_page(): void
{
    if (!hkol_can_manage()) {
        wp_die('權限不足');
    }
    $res = hkol_post();
    $tab = sanitize_key($_GET['tab'] ?? 'report');
    if (!in_array($tab, ['report', 'partners', 'settings'], true)) {
        $tab = 'report';
    }
    ?>
<div class="wrap hkol">
    <style><?php echo hkol_css(); ?></style>
    <div class="hkol-top">
        <div>
            <h1>合作夥伴分潤</h1>
            <p>專屬優惠碼＋專屬連結（30 天歸因），統計已付款訂單的銷售額與應付佣金。</p>
        </div>
    </div>
    <?php if ($res): ?>
        <div class="hkol-notice <?php echo $res['ok'] ? 'ok' : 'err'; ?>"><?php echo esc_html($res['msg']); ?></div>
    <?php endif; ?>
    <nav class="hkol-tabs">
        <?php foreach (['report' => '銷售分析', 'partners' => '合作夥伴與連結', 'settings' => '設定'] as $k => $label): ?>
            <a href="<?php echo esc_url(hkol_url(['tab' => $k])); ?>" class="<?php echo $tab === $k ? 'on' : ''; ?>"><?php echo esc_html($label); ?></a>
        <?php endforeach; ?>
    </nav>
    <?php
    if ($tab === 'partners') {
        hkol_render_partners();
    } elseif ($tab === 'settings') {
        hkol_render_settings();
    } else {
        hkol_render_report();
    }
    ?>
</div>
<script><?php echo hkol_js(); ?></script>
    <?php
}

function hkol_render_report(): void
{
    [$preset, $from, $to] = hkol_range($_GET);
    $only = hkol_norm_code($_GET['partner'] ?? '');
    $r = hkol_report($from, $to);
    $partners = hkol_partners();
    $tot = $r['tot'];
    if ($only && isset($r['agg'][$only])) {
        $tot = $r['agg'][$only];
    }
    $share = $r['store_net'] > 0 ? $tot['net'] / $r['store_net'] * 100 : 0;
    $export = function (string $type) use ($preset, $from, $to, $only) {
        return wp_nonce_url(add_query_arg([
            'action'  => 'hkol_export',
            'type'    => $type,
            'range'   => $preset,
            'from'    => $from,
            'to'      => $to,
            'partner' => $only,
        ], admin_url('admin-post.php')), 'hkol_export');
    };
    ?>
    <form method="get" class="hkol-filter">
        <input type="hidden" name="page" value="hkol">
        <input type="hidden" name="tab" value="report">
        <select name="range" id="hkol-range">
            <?php foreach (['month' => '本月', 'last_month' => '上個月', '30d' => '近 30 天', 'year' => '今年', 'custom' => '自訂區間'] as $k => $l): ?>
                <option value="<?php echo esc_attr($k); ?>" <?php selected($preset, $k); ?>><?php echo esc_html($l); ?></option>
            <?php endforeach; ?>
        </select>
        <span class="hkol-dates" <?php echo $preset === 'custom' ? '' : 'style="display:none"'; ?>>
            <input type="date" name="from" value="<?php echo esc_attr($from); ?>"> ～
            <input type="date" name="to" value="<?php echo esc_attr($to); ?>">
        </span>
        <select name="partner">
            <option value="">全部合作夥伴</option>
            <?php foreach ($r['agg'] as $a): ?>
                <option value="<?php echo esc_attr($a['code']); ?>" <?php selected($only, $a['code']); ?>><?php echo esc_html($a['name'] . '（' . $a['code'] . '）'); ?></option>
            <?php endforeach; ?>
        </select>
        <button class="button button-primary">查詢</button>
        <span class="hkol-range-label"><?php echo esc_html("{$from} ～ {$to}"); ?></span>
        <span style="flex:1"></span>
        <a class="button" href="<?php echo esc_url($export('summary')); ?>">匯出彙總 CSV</a>
        <a class="button" href="<?php echo esc_url($export('orders')); ?>">匯出訂單明細 CSV</a>
    </form>

    <div class="hkol-stats">
        <div class="hkol-stat"><b><?php echo hkol_money($tot['net']); ?></b><span>合作夥伴帶來銷售額</span></div>
        <div class="hkol-stat"><b><?php echo (int) $tot['orders']; ?></b><span>訂單數</span></div>
        <div class="hkol-stat"><b><?php echo hkol_money($tot['commission']); ?></b><span>應付佣金</span></div>
        <div class="hkol-stat"><b><?php echo number_format((int) $tot['clicks']); ?></b><span>連結點擊</span></div>
        <div class="hkol-stat"><b><?php echo $tot['clicks'] > 0 ? round($tot['orders'] / $tot['clicks'] * 100, 1) . '%' : '—'; ?></b><span>點擊轉換率</span></div>
        <div class="hkol-stat"><b><?php echo round($share, 1); ?>%</b><span>佔全站銷售（<?php echo hkol_money($r['store_net']); ?>）</span></div>
    </div>

    <?php if (!$partners && !$r['orders']): ?>
        <div class="hkol-card"><div class="hkol-empty">尚未建立合作夥伴。請到「<a href="<?php echo esc_url(hkol_url(['tab' => 'partners'])); ?>">合作夥伴與連結</a>」新增第一位合作夥伴。</div></div>
        <?php return; ?>
    <?php endif; ?>

    <?php if (!$only): ?>
        <?php $max = max(1, max(array_column($r['agg'], 'net') ?: [0])); ?>
        <div class="hkol-card">
            <div class="hkol-card-head"><h2>合作夥伴排行</h2><span>點名稱看單一夥伴明細</span></div>
            <div class="hkol-scroll">
            <table class="hkol-tbl">
                <thead><tr>
                    <th>合作夥伴</th><th style="width:28%">銷售額</th><th>訂單</th><th>點擊</th><th>轉換率</th>
                    <th>客單價</th><th>折扣</th><th>分潤%</th><th>應付佣金</th>
                </tr></thead>
                <tbody>
                <?php foreach ($r['agg'] as $a): ?>
                    <tr>
                        <td>
                            <a href="<?php echo esc_url(hkol_url(['range' => $preset, 'from' => $from, 'to' => $to, 'partner' => $a['code']])); ?>"><strong><?php echo esc_html($a['name']); ?></strong></a>
                            <div class="hkol-sub"><code><?php echo esc_html($a['code']); ?></code>
                                <span class="hkol-tag b"><?php echo esc_html($a['partner_type'] ?? 'KOL'); ?></span>
                                <?php if ($a['status'] === 'paused'): ?><span class="hkol-tag n">暫停</span><?php endif; ?>
                                <?php if ($a['status'] === 'deleted'): ?><span class="hkol-tag n">已刪除</span><?php endif; ?>
                            </div>
                        </td>
                        <td>
                            <div class="hkol-bar"><i style="width:<?php echo round($a['net'] / $max * 100, 1); ?>%"></i></div>
                            <div class="hkol-sub"><strong><?php echo hkol_money($a['net']); ?></strong>
                                · 優惠碼 <?php echo (int) $a['via_coupon']; ?> / 連結 <?php echo (int) $a['via_link']; ?></div>
                        </td>
                        <td><?php echo (int) $a['orders']; ?></td>
                        <td><?php echo number_format($a['clicks']); ?></td>
                        <td><?php echo $a['clicks'] > 0 ? round($a['orders'] / $a['clicks'] * 100, 1) . '%' : '—'; ?></td>
                        <td><?php echo $a['orders'] ? hkol_money($a['net'] / $a['orders']) : '—'; ?></td>
                        <td><?php echo hkol_money($a['discount']); ?></td>
                        <td><?php echo esc_html((string) $a['rate']); ?>%</td>
                        <td><strong><?php echo hkol_money($a['commission']); ?></strong></td>
                    </tr>
                <?php endforeach; ?>
                </tbody>
                <tfoot><tr>
                    <th>合計</th><th><?php echo hkol_money($r['tot']['net']); ?></th><th><?php echo (int) $r['tot']['orders']; ?></th>
                    <th><?php echo number_format($r['tot']['clicks']); ?></th><th></th><th></th>
                    <th><?php echo hkol_money($r['tot']['discount']); ?></th><th></th><th><?php echo hkol_money($r['tot']['commission']); ?></th>
                </tr></tfoot>
            </table>
            </div>
        </div>
    <?php else: ?>
        <?php $p = $partners[$only] ?? null; ?>
        <?php if ($p): ?>
        <div class="hkol-card">
            <div class="hkol-card-head"><h2><?php echo esc_html($p['name']); ?>（<?php echo esc_html($only); ?>）</h2>
                <a href="<?php echo esc_url(hkol_url(['range' => $preset, 'from' => $from, 'to' => $to])); ?>">← 回全部夥伴</a></div>
            <div class="hkol-card-body hkol-kv">
                <div><span>專屬連結</span><?php hkol_copy_field(hkol_link($only)); ?></div>
                <div><span>專屬優惠碼</span><?php echo $p['coupon_id'] ? '<code>' . esc_html(strtoupper($p['coupon_code'])) . '</code> <a href="' . esc_url(admin_url('post.php?post=' . (int) $p['coupon_id'] . '&action=edit')) . '">編輯優惠券</a>' : '—（僅追蹤連結）'; ?></div>
                <div><span>合作類型</span><?php echo esc_html(hkol_norm_partner_type($p['partner_type'] ?? 'KOL')); ?></div>
                <div><span>目前分潤</span><?php echo esc_html((string) $p['rate']); ?>%</div>
                <div><span>聯絡方式</span><?php echo esc_html($p['contact'] ?: '—'); ?></div>
            </div>
        </div>
        <?php endif; ?>

        <?php $buckets = hkol_series_buckets($r['series'][$only] ?? [], $from, $to); $bmax = max(1, max($buckets ?: [0])); ?>
        <div class="hkol-card">
            <div class="hkol-card-head"><h2>銷售趨勢</h2><span>不含運、已扣退款</span></div>
            <div class="hkol-card-body">
                <div class="hkol-chart">
                    <?php foreach ($buckets as $label => $v): ?>
                        <div class="hkol-col" title="<?php echo esc_attr($label . '：' . hkol_money($v)); ?>">
                            <i style="height:<?php echo $v > 0 ? max(2, round($v / $bmax * 100)) : 0; ?>%"></i>
                            <span><?php echo esc_html($label); ?></span>
                        </div>
                    <?php endforeach; ?>
                </div>
            </div>
        </div>

        <?php $top = array_slice($r['products'][$only] ?? [], 0, 10, true); ?>
        <?php if ($top): ?>
        <div class="hkol-card">
            <div class="hkol-card-head"><h2>熱銷商品</h2></div>
            <table class="hkol-tbl">
                <thead><tr><th>商品</th><th>件數</th><th>商品金額</th></tr></thead>
                <tbody>
                <?php foreach ($top as $name => $row): ?>
                    <tr><td><?php echo esc_html($name); ?></td><td><?php echo (int) $row['qty']; ?></td><td><?php echo hkol_money($row['amount']); ?></td></tr>
                <?php endforeach; ?>
                </tbody>
            </table>
        </div>
        <?php endif; ?>
    <?php endif; ?>

    <?php $list = array_values(array_filter($r['orders'], function ($o) use ($only) { return !$only || $o['code'] === $only; })); ?>
    <div class="hkol-card">
        <div class="hkol-card-head"><h2><?php echo $only ? '訂單明細' : '最近歸因訂單'; ?></h2>
            <span><?php echo count($list); ?> 筆<?php echo !$only && count($list) > 50 ? '（顯示最近 50 筆，完整請匯出 CSV）' : ''; ?></span></div>
        <?php if (!$list): ?>
            <div class="hkol-empty">此區間沒有歸因訂單</div>
        <?php else: ?>
        <div class="hkol-scroll">
        <table class="hkol-tbl">
            <thead><tr>
                <th>訂單</th><th>時間</th><th>狀態</th><th>顧客</th><?php echo $only ? '' : '<th>夥伴</th>'; ?>
                <th>歸因</th><th>件數</th><th>訂單總額</th><th>折扣</th><th>退款</th><th>分潤基準</th><th>佣金</th>
            </tr></thead>
            <tbody>
            <?php foreach ($only ? $list : array_slice($list, 0, 50) as $o): ?>
                <tr>
                    <td><a href="<?php echo esc_url($o['edit']); ?>">#<?php echo esc_html($o['number']); ?></a></td>
                    <td class="hkol-sub"><?php echo esc_html($o['date']); ?></td>
                    <td><?php echo esc_html($o['status']); ?></td>
                    <td><?php echo esc_html($o['customer']); ?></td>
                    <?php if (!$only): ?><td><code><?php echo esc_html($o['code']); ?></code></td><?php endif; ?>
                    <td><?php echo $o['via'] === 'link' ? '<span class="hkol-tag b">連結</span>' : '<span class="hkol-tag g">優惠碼</span>'; ?></td>
                    <td><?php echo (int) $o['qty']; ?></td>
                    <td><?php echo hkol_money($o['total']); ?></td>
                    <td><?php echo $o['discount'] ? hkol_money($o['discount']) : '—'; ?></td>
                    <td><?php echo $o['refund'] ? '<span style="color:#b32d2e">' . hkol_money($o['refund']) . '</span>' : '—'; ?></td>
                    <td><?php echo hkol_money($o['net']); ?></td>
                    <td><strong><?php echo hkol_money($o['commission']); ?></strong> <span class="hkol-sub"><?php echo esc_html((string) $o['rate']); ?>%</span></td>
                </tr>
            <?php endforeach; ?>
            </tbody>
        </table>
        </div>
        <?php endif; ?>
    </div>

    <form method="post" class="hkol-foot-note">
        <?php wp_nonce_field('hkol', 'hkol_nonce'); ?>
        <input type="hidden" name="hkol_act" value="reattribute">
        <input type="hidden" name="range" value="<?php echo esc_attr($preset); ?>">
        <input type="hidden" name="from" value="<?php echo esc_attr($from); ?>">
        <input type="hidden" name="to" value="<?php echo esc_attr($to); ?>">
        計入已付款以後的訂單（排除待付款、保留、取消、失敗、已退款）；分潤基準＝訂單實付 − 運費 − 已退款，佣金依下單當時的分潤 % 計算。
        <button class="button button-small">重新比對此區間未歸因訂單</button>
    </form>
    <?php
}

function hkol_copy_field(string $value): void
{
    ?>
    <span class="hkol-copy-wrap">
        <input type="text" readonly value="<?php echo esc_attr($value); ?>" onclick="this.select()">
        <button type="button" class="button button-small hkol-copy" data-v="<?php echo esc_attr($value); ?>">複製</button>
    </span>
    <?php
}

function hkol_render_partners(): void
{
    $partners = hkol_partners();
    $edit = hkol_norm_code($_GET['edit'] ?? '');
    $ep = $edit && isset($partners[$edit]) ? $partners[$edit] : null;
    ?>
    <?php if ($ep): ?>
    <div class="hkol-card">
        <div class="hkol-card-head"><h2>編輯 <?php echo esc_html($ep['name']); ?>（<?php echo esc_html($ep['code']); ?>）</h2>
            <a href="<?php echo esc_url(hkol_url(['tab' => 'partners'])); ?>">取消</a></div>
        <form method="post" class="hkol-card-body">
            <?php wp_nonce_field('hkol', 'hkol_nonce'); ?>
            <input type="hidden" name="hkol_act" value="update">
            <input type="hidden" name="code" value="<?php echo esc_attr($ep['code']); ?>">
            <div class="hkol-grid">
                <label>名稱<input type="text" name="name" value="<?php echo esc_attr($ep['name']); ?>" required></label>
                <label>合作類型
                    <select name="partner_type">
                        <?php $cur_type = hkol_norm_partner_type($ep['partner_type'] ?? 'KOL'); ?>
                        <?php foreach (hkol_partner_types() as $pt): ?>
                            <option value="<?php echo esc_attr($pt); ?>" <?php selected($cur_type, $pt); ?>><?php echo esc_html($pt); ?></option>
                        <?php endforeach; ?>
                    </select>
                </label>
                <label>分潤 %<input type="number" name="rate" min="0" max="100" step="0.1" value="<?php echo esc_attr((string) $ep['rate']); ?>"></label>
                <label>聯絡方式<input type="text" name="contact" value="<?php echo esc_attr($ep['contact']); ?>"></label>
                <label>備註<input type="text" name="note" value="<?php echo esc_attr($ep['note']); ?>"></label>
            </div>
            <p class="hkol-hint">優惠碼的折扣金額、門檻、到期日請到「編輯優惠券」修改。分潤 % 調整只影響之後的新訂單。</p>
            <button class="button button-primary">儲存</button>
        </form>
    </div>
    <?php endif; ?>

    <div class="hkol-card">
        <div class="hkol-card-head"><h2>合作夥伴（<?php echo count($partners); ?>）</h2></div>
        <?php if (!$partners): ?>
            <div class="hkol-empty">尚未建立合作夥伴，請用下方表單新增。</div>
        <?php else: ?>
        <div class="hkol-scroll">
        <table class="hkol-tbl">
            <thead><tr><th>夥伴</th><th>合作類型</th><th>專屬連結</th><th>專屬優惠碼</th><th>分潤</th><th>狀態</th><th>操作</th></tr></thead>
            <tbody>
            <?php foreach ($partners as $p):
                $coupon = $p['coupon_id'] && class_exists('WC_Coupon') ? new WC_Coupon((int) $p['coupon_id']) : null;
                ?>
                <tr>
                    <td><strong><?php echo esc_html($p['name']); ?></strong>
                        <div class="hkol-sub"><code><?php echo esc_html($p['code']); ?></code> · <?php echo esc_html($p['created']); ?></div>
                        <?php if ($p['contact'] || $p['note']): ?><div class="hkol-sub"><?php echo esc_html(trim($p['contact'] . ' ' . $p['note'])); ?></div><?php endif; ?>
                    </td>
                    <td><span class="hkol-tag b"><?php echo esc_html(hkol_norm_partner_type($p['partner_type'] ?? 'KOL')); ?></span></td>
                    <td><?php hkol_copy_field(hkol_link($p['code'])); ?></td>
                    <td>
                        <?php if ($coupon && $coupon->get_id()): ?>
                            <code><?php echo esc_html(strtoupper($coupon->get_code())); ?></code>
                            <div class="hkol-sub">
                                <?php echo $coupon->get_discount_type() === 'percent' ? esc_html($coupon->get_amount()) . '% OFF' : hkol_money($coupon->get_amount()); ?>
                                <?php echo (float) $coupon->get_minimum_amount() > 0 ? ' · 滿 ' . hkol_money($coupon->get_minimum_amount()) : ''; ?>
                                · 已用 <?php echo (int) $coupon->get_usage_count(); ?> 次
                            </div>
                        <?php else: ?>
                            <span class="hkol-sub">僅追蹤連結</span>
                        <?php endif; ?>
                    </td>
                    <td><?php echo esc_html((string) $p['rate']); ?>%</td>
                    <td><?php echo $p['status'] === 'active' ? '<span class="hkol-tag g">合作中</span>' : '<span class="hkol-tag n">暫停</span>'; ?></td>
                    <td class="hkol-actions">
                        <a class="button button-small" href="<?php echo esc_url(hkol_url(['partner' => $p['code']])); ?>">報表</a>
                        <a class="button button-small" href="<?php echo esc_url(hkol_url(['tab' => 'partners', 'edit' => $p['code']])); ?>">編輯</a>
                        <form method="post">
                            <?php wp_nonce_field('hkol', 'hkol_nonce'); ?>
                            <input type="hidden" name="hkol_act" value="toggle">
                            <input type="hidden" name="code" value="<?php echo esc_attr($p['code']); ?>">
                            <button class="button button-small"><?php echo $p['status'] === 'active' ? '暫停' : '恢復'; ?></button>
                        </form>
                        <form method="post" class="hkol-del">
                            <?php wp_nonce_field('hkol', 'hkol_nonce'); ?>
                            <input type="hidden" name="hkol_act" value="delete">
                            <input type="hidden" name="code" value="<?php echo esc_attr($p['code']); ?>">
                            <input type="hidden" name="trash_coupon" value="1">
                            <button class="button button-small hkol-danger">刪除</button>
                        </form>
                    </td>
                </tr>
            <?php endforeach; ?>
            </tbody>
        </table>
        </div>
        <?php endif; ?>
    </div>

    <?php if ($partners): ?>
    <div class="hkol-card">
        <div class="hkol-card-head"><h2>商品頁專屬連結產生器</h2><span>讓合作夥伴直接導到指定商品，一樣會歸因</span></div>
        <div class="hkol-card-body hkol-builder">
            <select id="hkol-b-code">
                <?php foreach ($partners as $p): ?>
                    <option value="<?php echo esc_attr($p['code']); ?>"><?php echo esc_html($p['name'] . '（' . $p['code'] . '）'); ?></option>
                <?php endforeach; ?>
            </select>
            <input type="url" id="hkol-b-url" placeholder="貼上官網任一頁網址，例：<?php echo esc_attr(trailingslashit(hkol_settings()['site_url'])); ?>products/xxx">
            <button type="button" class="button button-primary" id="hkol-b-go" data-utm="<?php echo esc_attr(hkol_settings()['utm']); ?>">產生</button>
            <div id="hkol-b-out" style="display:none"><?php hkol_copy_field(''); ?></div>
        </div>
    </div>
    <?php endif; ?>

    <div class="hkol-card">
        <div class="hkol-card-head"><h2>新增合作夥伴</h2></div>
        <form method="post" class="hkol-card-body">
            <?php wp_nonce_field('hkol', 'hkol_nonce'); ?>
            <input type="hidden" name="hkol_act" value="create">
            <div class="hkol-grid">
                <label>名稱 *<input type="text" name="name" placeholder="Joyce" required></label>
                <label>代碼 *<input type="text" name="code" placeholder="JOYCE" pattern="[A-Za-z0-9][A-Za-z0-9_\-]{1,39}" required>
                    <small>同時作為優惠碼與連結參數，英數字（統一大寫顯示）</small></label>
                <label>合作類型
                    <select name="partner_type">
                        <?php foreach (hkol_partner_types() as $pt): ?>
                            <option value="<?php echo esc_attr($pt); ?>"><?php echo esc_html($pt); ?></option>
                        <?php endforeach; ?>
                    </select>
                </label>
                <label>分潤 %<input type="number" name="rate" min="0" max="100" step="0.1" value="10"></label>
                <label>聯絡方式<input type="text" name="contact" placeholder="IG / LINE / Email"></label>
                <label class="full">備註<input type="text" name="note" placeholder="合作檔期、結算方式…"></label>
            </div>
            <h3 class="hkol-h3">專屬優惠（給粉絲的折扣，金額填 0 則只追蹤連結不給折扣）</h3>
            <div class="hkol-grid">
                <label>折扣方式
                    <select name="type"><option value="percent">百分比</option><option value="fixed_cart">固定金額</option></select></label>
                <label>折扣（% 或 NT$）<input type="number" name="amount" min="0" step="1" value="10"></label>
                <label>最低消費 NT$<input type="number" name="min" min="0" step="1" value="0"></label>
                <label>總使用次數上限<input type="number" name="usage_limit" min="0" step="1" value="0"><small>0＝不限</small></label>
                <label>到期日<input type="date" name="date_end"><small>留空＝不限</small></label>
                <label class="hkol-ck"><input type="checkbox" name="nosale" value="1"> 排除特價商品</label>
            </div>
            <p class="hkol-hint">專屬優惠碼不可與其他優惠碼併用（可與臻享會員 95 折併用，與官網規則一致）。若代碼已是既有優惠券，會直接綁定不另建。</p>
            <button class="button button-primary">建立合作夥伴</button>
        </form>
    </div>
    <?php
}

function hkol_render_settings(): void
{
    $s = hkol_settings();
    ?>
    <div class="hkol-card">
        <div class="hkol-card-head"><h2>連結設定</h2></div>
        <form method="post" class="hkol-card-body">
            <?php wp_nonce_field('hkol', 'hkol_nonce'); ?>
            <input type="hidden" name="hkol_act" value="settings">
            <div class="hkol-grid">
                <label class="full">官網網址<input type="url" name="site_url" value="<?php echo esc_attr($s['site_url']); ?>" required>
                    <small>專屬連結會以此為首頁網址</small></label>
                <label class="hkol-ck full"><input type="checkbox" name="utm" value="1" <?php checked($s['utm'], '1'); ?>>
                    連結附加 UTM（utm_source=kol、utm_medium=affiliate、utm_campaign=代碼），GA4 可直接看各合作夥伴流量</label>
            </div>
            <button class="button button-primary">儲存</button>
        </form>
    </div>
    <div class="hkol-card"><div class="hkol-card-body hkol-hint" style="margin:0">
        歸因規則：粉絲點專屬連結後 30 天內下單算給該夥伴（多個連結以最後點擊為準）；訂單若使用某夥伴的專屬優惠碼，則優先算給該優惠碼的夥伴。
        暫停夥伴會讓優惠碼失效、連結不再歸因；刪除夥伴會一併移除優惠券，歷史訂單的歸因與佣金紀錄仍保留在報表。
    </div></div>
    <?php
}

function hkol_css(): string
{
    return <<<'CSS'
.hkol { max-width: 1200px; color: #202223; }
.hkol * { box-sizing: border-box; }
.hkol-top h1 { margin: 8px 0 4px; font-size: 22px; font-weight: 700; }
.hkol-top p { margin: 0 0 14px; color: #646970; font-size: 13px; }
.hkol-notice { padding: 10px 14px; border-radius: 8px; margin-bottom: 12px; font-size: 13px; }
.hkol-notice.ok { background: #edf7f1; border: 1px solid #b8dfd0; color: #1a6847; }
.hkol-notice.err { background: #fcf0f0; border: 1px solid #f0c8c8; color: #8a1f1f; }
.hkol-tabs { display: flex; gap: 8px; margin-bottom: 14px; }
.hkol-tabs a { border: 1px solid #dcdcde; background: #fff; border-radius: 999px; padding: 7px 14px; font-size: 13px; font-weight: 600; color: #50575e; text-decoration: none; }
.hkol-tabs a.on { background: #2a514d; border-color: #2a514d; color: #fff; }
.hkol-filter { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; background: #fff; border: 1px solid #dcdcde; border-radius: 8px; padding: 12px 14px; margin-bottom: 14px; }
.hkol-range-label { font-size: 12px; color: #646970; }
.hkol-stats { display: grid; grid-template-columns: repeat(6, 1fr); gap: 10px; margin-bottom: 14px; }
.hkol-stat { background: #fff; border: 1px solid #dcdcde; border-radius: 8px; padding: 14px 16px; }
.hkol-stat b { display: block; font-size: 22px; color: #2a514d; margin-bottom: 4px; }
.hkol-stat span { font-size: 12px; color: #646970; }
.hkol-card { background: #fff; border: 1px solid #dcdcde; border-radius: 8px; margin-bottom: 14px; overflow: hidden; }
.hkol-card-head { padding: 12px 16px; border-bottom: 1px solid #f0f0f1; display: flex; justify-content: space-between; align-items: center; gap: 10px; }
.hkol-card-head h2 { margin: 0; font-size: 14px; }
.hkol-card-head span { font-size: 12px; color: #646970; }
.hkol-card-body { padding: 16px; }
.hkol-scroll { overflow-x: auto; }
.hkol-tbl { width: 100%; border-collapse: collapse; font-size: 13px; }
.hkol-tbl th { background: #f6f7f7; padding: 9px 12px; text-align: left; font-size: 11px; color: #646970; border-bottom: 1px solid #dcdcde; white-space: nowrap; }
.hkol-tbl tfoot th { border-top: 1px solid #dcdcde; border-bottom: 0; font-size: 12px; color: #202223; }
.hkol-tbl td { padding: 10px 12px; border-bottom: 1px solid #f0f0f1; vertical-align: middle; }
.hkol-sub { font-size: 11px; color: #646970; margin-top: 3px; }
.hkol-bar { height: 8px; background: #eef2f1; border-radius: 99px; overflow: hidden; }
.hkol-bar i { display: block; height: 100%; background: #2a514d; border-radius: 99px; }
.hkol-tag { display: inline-block; padding: 2px 8px; border-radius: 999px; font-size: 11px; font-weight: 600; }
.hkol-tag.g { background: #d3f7d3; color: #1a5c1a; }
.hkol-tag.b { background: #dce8ff; color: #1a3a7a; }
.hkol-tag.n { background: #f0f0f1; color: #646970; }
.hkol-empty { padding: 36px; text-align: center; color: #646970; font-size: 13px; }
.hkol-chart { display: flex; align-items: flex-end; gap: 3px; height: 180px; padding-bottom: 22px; }
.hkol-col { flex: 1; height: 100%; display: flex; flex-direction: column; justify-content: flex-end; position: relative; min-width: 6px; }
.hkol-col i { display: block; background: #2a514d; border-radius: 3px 3px 0 0; }
.hkol-col span { position: absolute; bottom: -20px; left: 50%; transform: translateX(-50%); font-size: 10px; color: #8c8f94; white-space: nowrap; }
.hkol-chart .hkol-col:nth-child(n) span { display: none; }
.hkol-chart .hkol-col:nth-child(5n+1) span { display: block; }
.hkol-kv { display: grid; grid-template-columns: 1fr 1fr; gap: 12px 24px; font-size: 13px; }
.hkol-kv > div > span:first-child { display: block; font-size: 11px; color: #646970; margin-bottom: 4px; }
.hkol-copy-wrap { display: inline-flex; gap: 6px; width: 100%; min-width: 260px; }
.hkol-copy-wrap input { flex: 1; font-size: 12px; font-family: ui-monospace, monospace; }
.hkol-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px 16px; margin-bottom: 12px; }
.hkol-grid label { display: flex; flex-direction: column; gap: 5px; font-size: 13px; font-weight: 600; }
.hkol-grid label.full { grid-column: 1 / -1; }
.hkol-grid label small { font-weight: 400; color: #646970; font-size: 11px; }
.hkol-grid input, .hkol-grid select { width: 100%; max-width: none; }
.hkol-grid label.hkol-ck { flex-direction: row; align-items: center; font-weight: 400; }
.hkol-grid label.hkol-ck input { width: auto; }
.hkol-h3 { font-size: 13px; margin: 18px 0 10px; padding-top: 14px; border-top: 1px solid #f0f0f1; }
.hkol-hint { font-size: 12px; color: #646970; background: #f6f7f7; border-radius: 6px; padding: 10px 12px; line-height: 1.6; }
.hkol-actions { white-space: nowrap; }
.hkol-actions form { display: inline; }
.hkol-danger { color: #b32d2e !important; border-color: #f0c8c8 !important; }
.hkol-builder { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
.hkol-builder input[type=url] { flex: 1; min-width: 280px; }
.hkol-builder #hkol-b-out { flex-basis: 100%; }
.hkol-foot-note { font-size: 12px; color: #646970; line-height: 1.7; }
@media (max-width: 960px) { .hkol-stats { grid-template-columns: repeat(3, 1fr); } .hkol-grid, .hkol-kv { grid-template-columns: 1fr; } }
CSS;
}

function hkol_js(): string
{
    return <<<'JS'
(function(){
  document.addEventListener('click', function(e){
    var b = e.target.closest('.hkol-copy');
    if (b) {
      var v = b.getAttribute('data-v') || (b.previousElementSibling && b.previousElementSibling.value) || '';
      navigator.clipboard.writeText(v).then(function(){ var t = b.textContent; b.textContent = '已複製'; setTimeout(function(){ b.textContent = t; }, 1500); });
    }
    var go = e.target.closest('#hkol-b-go');
    if (go) {
      var raw = document.getElementById('hkol-b-url').value.trim();
      var code = document.getElementById('hkol-b-code').value;
      try {
        var u = new URL(raw);
        u.searchParams.set('ref', code);
        if (go.getAttribute('data-utm') === '1') {
          u.searchParams.set('utm_source', 'kol');
          u.searchParams.set('utm_medium', 'affiliate');
          u.searchParams.set('utm_campaign', code.toLowerCase());
        }
        var out = document.getElementById('hkol-b-out');
        out.style.display = '';
        out.querySelector('input').value = u.toString();
        out.querySelector('.hkol-copy').setAttribute('data-v', u.toString());
      } catch (err) { alert('請貼上完整網址（含 https://）'); }
    }
  });
  document.addEventListener('submit', function(e){
    if (e.target.classList.contains('hkol-del') && !confirm('確定刪除此合作夥伴？專屬優惠券會移到垃圾桶，歷史訂單紀錄保留。')) e.preventDefault();
  });
  var r = document.getElementById('hkol-range');
  if (r) r.addEventListener('change', function(){
    document.querySelector('.hkol-dates').style.display = r.value === 'custom' ? '' : 'none';
  });
})();
JS;
}
