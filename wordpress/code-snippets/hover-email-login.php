<?php
/**
 * Plugin Name: HOVER Email Login API
 * Description: Email/密碼登入 REST API（取代 jwt-auth）
 *
 * Code Snippets 設定：
 * - Title：HOVER Email Login
 * - Run snippet：Everywhere（不要選 Only admin）
 * - 狀態：Active（啟用）
 * - 貼上時：可含或不含開頭的 <?php
 *
 * 啟用後請用瀏覽器打開確認：
 *   https://你的WP網址/wp-json/hover/v1/login-ping
 * 應看到：{"ok":true,"service":"hover-email-login"}
 *
 * 登入 API：
 *   POST /wp-json/hover/v1/login
 *   Body：{"username":"email","password":"密碼"}
 */

if (!defined('ABSPATH')) {
    exit;
}

if (!function_exists('hover_email_login_register_routes')) {
    function hover_email_login_register_routes()
    {
        register_rest_route('hover/v1', '/login-ping', [
            'methods'             => 'GET',
            'permission_callback' => '__return_true',
            'callback'            => function () {
                return rest_ensure_response([
                    'ok'      => true,
                    'service' => 'hover-email-login',
                ]);
            },
        ]);

        register_rest_route('hover/v1', '/login', [
            'methods'             => 'POST',
            'permission_callback' => '__return_true',
            'callback'            => 'hover_email_login_handle',
        ]);
    }
    add_action('rest_api_init', 'hover_email_login_register_routes');
}

if (!function_exists('hover_email_login_handle')) {
    /**
     * @param WP_REST_Request $request
     * @return WP_REST_Response|WP_Error
     */
    function hover_email_login_handle($request)
    {
        $username = trim((string) $request->get_param('username'));
        $password = (string) $request->get_param('password');

        if ($username === '' || $password === '') {
            return new WP_Error(
                'missing_credentials',
                '請輸入帳號/信箱與密碼',
                ['status' => 400]
            );
        }

        // 允許用 email 登入
        if (is_email($username)) {
            $user_by_email = get_user_by('email', $username);
            if ($user_by_email && !empty($user_by_email->user_login)) {
                $username = $user_by_email->user_login;
            }
        }

        $user = wp_authenticate($username, $password);

        if (is_wp_error($user)) {
            return new WP_Error(
                'invalid_login',
                '帳號或密碼錯誤',
                ['status' => 401]
            );
        }

        $roles = is_array($user->roles) ? $user->roles : [];
        $role  = !empty($roles[0]) ? (string) $roles[0] : 'customer';

        return rest_ensure_response([
            'ok'                 => true,
            'user_email'         => (string) $user->user_email,
            'user_display_name'  => (string) $user->display_name,
            'user_nicename'      => (string) $user->user_nicename,
            'user_id'            => (int) $user->ID,
            'role'               => $role,
        ]);
    }
}
