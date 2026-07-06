<?php
/**
 * HOVER — 客戶後台帳號、隱藏 Code Snippets、網站 6GB 容量限制
 *
 * 使用方式（WordPress 後台）：
 * 1. Code Snippets → Add New
 * 2. 標題：HOVER 客戶後台權限
 * 3. 貼上本檔內容 → Run：Administration only → Save & Activate
 * 4. 修改下方「客戶帳號設定」常數（email / 登入帳號）
 * 5. 重新整理後台一次，會自動建立客戶帳號（若尚不存在）
 * 6. 將初始密碼提供給客戶，並請其登入後立即至「使用者 → 個人資料」修改
 *
 * 客戶角色：HOVER 客戶管理（hover_client）
 * - 以 Shop Manager 為基礎，可正常使用商品、訂單、HOVER 客製選單等
 * - 僅隱藏 Code Snippets / WPCode 外掛本身（客戶無法編輯 snippet 原始碼）
 *
 * 容量：整個 wp-content 目錄上限 6 GB（含 uploads、外掛、佈景主題）
 */

if (!defined('ABSPATH')) {
    exit;
}

if (defined('HOVER_CLIENT_ACCESS_LOADED')) {
    return;
}
define('HOVER_CLIENT_ACCESS_LOADED', true);

/* ── 客戶帳號設定（請依實際修改） ── */
if (!defined('HOVER_CLIENT_LOGIN')) {
    define('HOVER_CLIENT_LOGIN', 'hover_client');
}
if (!defined('HOVER_CLIENT_EMAIL')) {
    define('HOVER_CLIENT_EMAIL', 'hover.h.wbs@gmail.com');
}
if (!defined('HOVER_CLIENT_DISPLAY_NAME')) {
    define('HOVER_CLIENT_DISPLAY_NAME', 'HOVER 威爾特');
}
if (!defined('HOVER_CLIENT_SITE_NAME')) {
    // 登入頁下方「前往 ○○」顯示名稱
    define('HOVER_CLIENT_SITE_NAME', 'HOVER 威爾特');
}
if (!defined('HOVER_CLIENT_BOOTSTRAP_PASSWORD')) {
    // 首次建立帳號用的臨時密碼；建立後請客戶自行修改
    define('HOVER_CLIENT_BOOTSTRAP_PASSWORD', 'HoverClient2026!');
}

const HOVER_CLIENT_ROLE          = 'hover_client';
const HOVER_CLIENT_ROLE_VERSION  = 3;
const HOVER_CLIENT_STORAGE_BYTES = 6442450944; // 6 GB
const HOVER_CLIENT_STORAGE_CACHE = 'hover_client_storage_bytes_v1';

/**
 * Code Snippets / WPCode 相關 capability（客戶不可編輯 snippet）
 */
function hover_client_snippet_caps(): array
{
    return [
        'edit_snippets',
        'manage_snippets',
        'edit_published_snippets',
        'publish_snippets',
        'delete_snippets',
        'delete_published_snippets',
        'wpcode_edit_snippets',
        'wpcode_activate_snippets',
        'wpcode_delete_snippets',
        'wpcode_manage_settings',
    ];
}

/**
 * 客戶角色額外需要的 capability
 * HOVER 公告列 / 頁尾 / 主圖 / 首頁公告 等選單註冊時使用 manage_options
 */
function hover_client_extra_caps(): array
{
    return [
        'manage_options',
    ];
}

/**
 * 組合客戶角色完整權限
 */
function hover_client_role_caps(): array
{
    $base = get_role('shop_manager');
    $caps = $base ? $base->capabilities : [];

    foreach (hover_client_snippet_caps() as $cap) {
        unset($caps[$cap]);
    }

    foreach (hover_client_extra_caps() as $cap) {
        $caps[$cap] = true;
    }

    return $caps;
}

/**
 * 同步客戶角色權限
 */
function hover_client_sync_role_caps(): void
{
    $caps = hover_client_role_caps();
    $role = get_role(HOVER_CLIENT_ROLE);

    if (!$role) {
        add_role(HOVER_CLIENT_ROLE, 'HOVER 客戶管理', $caps);
        update_option('hover_client_role_version', HOVER_CLIENT_ROLE_VERSION, false);
        return;
    }

    foreach (array_keys($role->capabilities) as $cap) {
        $role->remove_cap($cap);
    }
    foreach ($caps as $cap => $grant) {
        if ($grant) {
            $role->add_cap($cap);
        }
    }
    update_option('hover_client_role_version', HOVER_CLIENT_ROLE_VERSION, false);
}

/**
 * 註冊客戶角色（以 shop_manager 為基礎 + manage_options，僅移除 snippet 編輯權限）
 */
add_action('init', function () {
    $stored = (int) get_option('hover_client_role_version', 0);
    if ($stored >= HOVER_CLIENT_ROLE_VERSION && get_role(HOVER_CLIENT_ROLE)) {
        return;
    }
    hover_client_sync_role_caps();
}, 5);

/**
 * 確保客戶帳號存在（管理員進後台時檢查；帳號不存在就建立）
 */
function hover_client_ensure_user(): array
{
    if (HOVER_CLIENT_EMAIL === 'client@example.com') {
        return ['ok' => false, 'message' => '請先在 snippet 設定 HOVER_CLIENT_EMAIL。'];
    }

    $existing = get_user_by('login', HOVER_CLIENT_LOGIN);
    if ($existing instanceof WP_User) {
        if (!in_array(HOVER_CLIENT_ROLE, (array) $existing->roles, true)) {
            $existing->set_role(HOVER_CLIENT_ROLE);
        }
        return ['ok' => true, 'message' => '客戶帳號已存在。', 'created' => false];
    }

    if (email_exists(HOVER_CLIENT_EMAIL)) {
        return [
            'ok'    => false,
            'message' => 'Email「' . HOVER_CLIENT_EMAIL . '」已被其他使用者使用。請到「使用者 → 新增使用者」手動建立，登入帳號設為 hover_client，角色選 HOVER 客戶管理；或改用其他 email。',
        ];
    }

    $user_id = wp_insert_user([
        'user_login'   => HOVER_CLIENT_LOGIN,
        'user_pass'    => HOVER_CLIENT_BOOTSTRAP_PASSWORD,
        'user_email'   => HOVER_CLIENT_EMAIL,
        'display_name' => HOVER_CLIENT_DISPLAY_NAME,
        'first_name'   => HOVER_CLIENT_DISPLAY_NAME,
        'role'         => HOVER_CLIENT_ROLE,
    ]);

    if (is_wp_error($user_id)) {
        return ['ok' => false, 'message' => $user_id->get_error_message()];
    }

    return [
        'ok'      => true,
        'created' => true,
        'message' => '客戶帳號已建立。登入帳號：' . HOVER_CLIENT_LOGIN,
    ];
}

/**
 * 管理員進後台時自動建立 / 檢查客戶帳號
 */
add_action('admin_init', function () {
    if (!current_user_can('manage_options')) {
        return;
    }

    static $checked = false;
    if ($checked) {
        return;
    }
    $checked = true;

    $result = hover_client_ensure_user();

    if (!$result['ok']) {
        add_action('admin_notices', function () use ($result) {
            echo '<div class="notice notice-error"><p><strong>HOVER 客戶帳號：</strong>'
                . esc_html($result['message']) . '</p></div>';
        });
        return;
    }

    if (!empty($result['created'])) {
        add_action('admin_notices', function () use ($result) {
            echo '<div class="notice notice-success"><p><strong>HOVER 客戶帳號已建立。</strong>'
                . '登入帳號：<code>' . esc_html(HOVER_CLIENT_LOGIN) . '</code>，'
                . '密碼：<code>' . esc_html(HOVER_CLIENT_BOOTSTRAP_PASSWORD) . '</code>，'
                . '請登入後立即修改。後台入口：<code>'
                . esc_html(wp_login_url()) . '</code></p></div>';
        });
    }
});

/**
 * 登入頁：網站名稱改為 HOVER 威爾特（取代「保健食品」）
 */
add_filter('login_header_text', function () {
    return HOVER_CLIENT_SITE_NAME;
});

add_filter('login_site_html_link', function () {
    return sprintf(
        '<a href="%s">&larr; 前往 %s</a>',
        esc_url(home_url('/')),
        esc_html(HOVER_CLIENT_SITE_NAME)
    );
});

/**
 * 是否為 HOVER 客戶角色
 */
function hover_client_is_client_user($user = null): bool
{
    $user = $user ? $user : wp_get_current_user();
    if (!$user || empty($user->roles)) {
        return false;
    }
    return in_array(HOVER_CLIENT_ROLE, (array) $user->roles, true);
}

/**
 * 客戶後台：僅隱藏 Code Snippets / WPCode 外掛選單
 */
add_action('admin_menu', function () {
    if (!hover_client_is_client_user()) {
        return;
    }

    remove_menu_page('snippets');
    remove_menu_page('wpcode');
    remove_menu_page('wpcode-snippet-manager');
    remove_menu_page('edit.php?post_type=snippet');
    remove_menu_page('edit.php?post_type=wpcode_snippet');

    remove_submenu_page('tools.php', 'code-snippets');
    remove_submenu_page('tools.php', 'wpcode');
}, 999);

/**
 * 阻擋客戶直接輸入 URL 進入 Code Snippets / WPCode
 */
add_action('admin_init', function () {
    if (!hover_client_is_client_user()) {
        return;
    }

    $blocked_pages = [
        'snippets',
        'wpcode',
        'wpcode-snippet-manager',
        'wpcode-settings',
    ];

    $page    = isset($_GET['page']) ? sanitize_key(wp_unslash($_GET['page'])) : '';
    $pagenow = $GLOBALS['pagenow'] ?? '';

    if (in_array($page, $blocked_pages, true)) {
        wp_die(
            esc_html__('您沒有權限存取此頁面。', 'hover'),
            esc_html__('權限不足', 'hover'),
            ['response' => 403, 'back_link' => true]
        );
    }

    if ($pagenow === 'edit.php' && isset($_GET['post_type'])) {
        $post_type = sanitize_key(wp_unslash($_GET['post_type']));
        if (in_array($post_type, ['snippet', 'wpcode_snippet'], true)) {
            wp_die(
                esc_html__('您沒有權限存取此頁面。', 'hover'),
                esc_html__('權限不足', 'hover'),
                ['response' => 403, 'back_link' => true]
            );
        }
    }

    if ($pagenow === 'post-new.php' && isset($_GET['post_type'])) {
        $post_type = sanitize_key(wp_unslash($_GET['post_type']));
        if (in_array($post_type, ['snippet', 'wpcode_snippet'], true)) {
            wp_die(
                esc_html__('您沒有權限存取此頁面。', 'hover'),
                esc_html__('權限不足', 'hover'),
                ['response' => 403, 'back_link' => true]
            );
        }
    }
}, 1);

/**
 * 客戶看不到 Code Snippets 相關 admin bar 節點
 */
add_action('admin_bar_menu', function ($bar) {
    if (!hover_client_is_client_user()) {
        return;
    }

    $bar->remove_node('wpcode-admin-bar-info');
    $bar->remove_node('wpcode');
}, 999);

/**
 * 計算 wp-content 目錄大小（含 cache，每小時更新一次）
 */
function hover_client_get_storage_bytes(bool $force = false): int
{
    if (!$force) {
        $cached = get_transient(HOVER_CLIENT_STORAGE_CACHE);
        if ($cached !== false) {
            return (int) $cached;
        }
    }

    $root = WP_CONTENT_DIR;
    if (!is_dir($root)) {
        return 0;
    }

    $size = hover_client_dir_size($root);
    set_transient(HOVER_CLIENT_STORAGE_CACHE, $size, HOUR_IN_SECONDS);

    return $size;
}

function hover_client_dir_size(string $dir): int
{
    $size = 0;

    if (!is_readable($dir)) {
        return 0;
    }

    $iterator = new RecursiveIteratorIterator(
        new RecursiveDirectoryIterator($dir, FilesystemIterator::SKIP_DOTS)
    );

    foreach ($iterator as $file) {
        if ($file->isFile()) {
            $size += (int) $file->getSize();
        }
    }

    return $size;
}

function hover_client_storage_limit_bytes(): int
{
    return (int) apply_filters('hover_client_storage_limit_bytes', HOVER_CLIENT_STORAGE_BYTES);
}

function hover_client_format_bytes(int $bytes): string
{
    if ($bytes >= 1073741824) {
        return number_format($bytes / 1073741824, 2) . ' GB';
    }
    if ($bytes >= 1048576) {
        return number_format($bytes / 1048576, 2) . ' MB';
    }
    return number_format($bytes / 1024, 2) . ' KB';
}

function hover_client_storage_status(): array
{
    $used  = hover_client_get_storage_bytes();
    $limit = hover_client_storage_limit_bytes();
    $left  = max(0, $limit - $used);

    return [
        'used'       => $used,
        'limit'      => $limit,
        'left'       => $left,
        'percent'    => $limit > 0 ? min(100, ($used / $limit) * 100) : 0,
        'is_over'    => $used >= $limit,
        'is_warning' => $limit > 0 && ($used / $limit) >= 0.85,
    ];
}

/**
 * 上傳前檢查：超過 6 GB 禁止新增媒體
 */
add_filter('wp_handle_upload_prefilter', function ($file) {
    delete_transient(HOVER_CLIENT_STORAGE_CACHE);

    $status = hover_client_storage_status();
    $incoming = isset($file['size']) ? (int) $file['size'] : 0;

    if (($status['used'] + $incoming) > $status['limit']) {
        $file['error'] = sprintf(
            '網站容量已達上限（%s / %s）。請刪除不需要的媒體或聯絡管理員。',
            hover_client_format_bytes($status['used']),
            hover_client_format_bytes($status['limit'])
        );
    }

    return $file;
});

/**
 * 後台容量提示（所有可上傳媒體的使用者）
 */
add_action('admin_notices', function () {
    if (!current_user_can('upload_files')) {
        return;
    }

    $screen = function_exists('get_current_screen') ? get_current_screen() : null;
    if (!$screen) {
        return;
    }

    $show_on = ['dashboard', 'upload', 'media', 'edit', 'product'];
    if (!in_array($screen->id, $show_on, true) && $screen->base !== 'post') {
        return;
    }

    $status = hover_client_storage_status();
    $used_label  = hover_client_format_bytes($status['used']);
    $limit_label = hover_client_format_bytes($status['limit']);

    if ($status['is_over']) {
        echo '<div class="notice notice-error"><p><strong>HOVER 網站容量：</strong>'
            . esc_html("已使用 {$used_label} / {$limit_label}，已達 6 GB 上限，無法再上傳新檔案。")
            . '</p></div>';
        return;
    }

    if ($status['is_warning']) {
        echo '<div class="notice notice-warning"><p><strong>HOVER 網站容量：</strong>'
            . esc_html("已使用 {$used_label} / {$limit_label}（" . round($status['percent']) . '%），接近上限。')
            . '</p></div>';
    }
});

/**
 * 媒體庫列表上方顯示容量摘要
 */
add_action('restrict_manage_posts', function ($post_type) {
    if ($post_type !== 'attachment' || !current_user_can('upload_files')) {
        return;
    }

    $status = hover_client_storage_status();
    echo '<span class="hover-storage-summary" style="margin-left:12px;color:#50575e;">'
        . esc_html('網站容量：' . hover_client_format_bytes($status['used']) . ' / ' . hover_client_format_bytes($status['limit']))
        . '</span>';
});
