<?php
/**
 * HOVER — 只有我看得到 Code Snippets 外掛選單
 *
 * 使用方式（WordPress 後台）：
 * 1. Code Snippets → Add New → 貼上本檔
 * 2. Run snippet：Only run in administration area → 啟用
 *
 * 效果：
 * - 除了下方 HHCM_ALLOWED_LOGINS 名單內的帳號，其他所有後台使用者：
 *   1. 側邊欄只隱藏「Code Snippets」外掛本身的管理選單
 *   2. 直接輸入網址也會被擋下、導回控制台
 *
 * Code Snippets 內程式碼自行建立的側邊欄功能不受影響。
 *
 * ⚠️ 重要：請確認 HHCM_ALLOWED_LOGINS 內是「你自己的登入帳號」，
 *    拼錯會連你自己都看不到 Code Snippets。
 *    若真的被鎖住，用 FTP 把本 snippet 停用，或在網址加上
 *    /wp-admin/?snippets-safe-mode=1（Code Snippets 安全模式）。
 */

if (!defined('ABSPATH')) {
    exit;
}

if (defined('HHCM_LOADED')) {
    return;
}
define('HHCM_LOADED', true);

/** 允許看到選單的登入帳號（大小寫不分），可加多個 */
const HHCM_ALLOWED_LOGINS = ['bob1127'];

function hhcm_is_allowed_user(): bool
{
    $user = wp_get_current_user();
    if (!$user || !$user->exists()) {
        return false;
    }
    return in_array(strtolower($user->user_login), HHCM_ALLOWED_LOGINS, true);
}

/* ─────────────────────────────────────────────
 * 1. 從側邊欄移除選單
 * ──────────────────────────────────────────── */

add_action('admin_menu', function () {
    if (hhcm_is_allowed_user()) {
        return;
    }

    // 只移除 Code Snippets 外掛本身的主選單及其子選單。
    // 各 snippet 透過 add_menu_page() 建立的獨立功能選單不受影響。
    remove_menu_page('snippets');
}, 999);

/* ─────────────────────────────────────────────
 * 2. 擋掉直接輸入網址進入
 * ──────────────────────────────────────────── */

add_action('current_screen', function ($screen) {
    if (hhcm_is_allowed_user() || !$screen) {
        return;
    }

    // 僅封鎖 Code Snippets 外掛自己的管理畫面。
    // 不使用模糊比對，避免誤擋由 snippet 建立的其他功能頁。
    $blocked = $screen->id === 'toplevel_page_snippets'
        || str_starts_with($screen->id, 'snippets_page_');

    if ($blocked) {
        wp_safe_redirect(admin_url());
        exit;
    }
});
