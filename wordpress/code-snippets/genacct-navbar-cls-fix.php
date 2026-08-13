<?php
/**
 * 將軍會計 — Navbar CLS + 邊框修復 + Rocket 排除 v5
 *
 * 做什麼：
 * 1. 鎖 sticky header / 選單高度，降低 CLS
 * 2. 拿掉 box-shadow（載入時易看成黑邊框）；底邊淺灰 #F6F6F6
 * 3. 排除 SmartMenus / jQuery / Elementor sticky 相關 JS 的 Delay／Defer
 * 4. v5.1：消滅 PSI 殘餘 0.001（「公司會計報稅服務」）
 *    - 選單改系統字優先，避免 Noto 晚到造成字寬微跳
 *    - 最長選項鎖 min-width
 *    - 勿用 a::after 做 caret（會撞 Elementor e--pointer-underline，變綠色塊）
 *
 * Header IDs（elementor-26121）：
 * - sticky 段：213c6d93
 * - 選單：63060d95 → #menu-1-63060d95
 * - Logo：6aa70dde
 * - 最長項：menu-item-13188 → /auditing/
 *
 * Sticky 體感：sticky_offset=0 → Sticky JS 一跑完就 fixed（一進來就浮動）
 * CLS 風險：Delay JS 拖晚 sticky／SmartMenus → 先 relative 再 fixed+spacer
 *
 * 部署：Code Snippets → 僅前台 → 整段覆蓋此檔 → 啟用
 * 重要：停用舊的「Navbar CLS fix + exclude SmartMenus…」那隻（會重複 #navbar-cls-fix）
 * 驗收：view-source 只有一份 style#navbar-cls-fix 且 data-ver="5.1"
 */

if (!defined('ABSPATH')) {
    exit;
}

if (defined('GENACCT_NAVBAR_CLS_FIX_LOADED')) {
    return;
}
define('GENACCT_NAVBAR_CLS_FIX_LOADED', true);
define('GENACCT_NAVBAR_CLS_FIX_VER', '5.1');

/* ---------- 1) WP Rocket：勿 Delay / Defer 選單與 sticky 依賴 ---------- */
add_filter('rocket_delay_js_exclusions', function ($excluded) {
    $patterns = array(
        'smartmenus',
        'jquery.smartmenus',
        'jquery-core',
        'jquery-migrate',
        'elementor-frontend',
        'elementor-pro-frontend',
        'webpack-pro',
        'elements-handlers',
        'pro-elements-handlers',
        'e-sticky',
        'jquery.sticky',
    );
    foreach ($patterns as $pattern) {
        if (!in_array($pattern, $excluded, true)) {
            $excluded[] = $pattern;
        }
    }
    return $excluded;
});

add_filter('rocket_exclude_defer_js', function ($exclude) {
    $patterns = array(
        '/jquery.smartmenus.min.js',
        '/smartmenus/',
        '/jquery.min.js',
        '/jquery-migrate.min.js',
        '/jquery.sticky.min.js',
        '/e-sticky',
    );
    foreach ($patterns as $pattern) {
        if (!in_array($pattern, $exclude, true)) {
            $exclude[] = $pattern;
        }
    }
    return $exclude;
});

/* ---------- 2) 選單 CSS：外觀痊癒 + 高度佔位 + 字寬穩定 ---------- */
function genacct_navbar_cls_fix_css() {
    if (is_admin()) {
        return;
    }
    ?>
<style id="navbar-cls-fix" data-ver="<?php echo esc_attr(GENACCT_NAVBAR_CLS_FIX_VER); ?>">
/* ========== 外觀：去陰影／黑框，底線淺灰 ========== */
#masthead .elementor-element-213c6d93 {
  background-color: #ffffff !important;
  border-style: solid !important;
  border-width: 0 0 1px 0 !important;
  border-color: #F6F6F6 !important;
  box-shadow: none !important;
  outline: none !important;
}

#masthead .elementor-element-213c6d93.elementor-sticky--active,
#masthead .elementor-element-213c6d93.elementor-sticky--effects {
  background-color: #ffffff !important;
  border-color: #F6F6F6 !important;
  box-shadow: none !important;
}

/* ========== CLS：預留高度 ========== */
#masthead .elementor-element-213c6d93,
#masthead .elementor-element-213c6d93 > .elementor-container {
  min-height: 72px;
  contain: layout;
}

.elementor-element-63060d95,
.elementor-element-63060d95 .elementor-nav-menu--main,
.elementor-element-63060d95 .elementor-widget-container {
  min-height: 52px;
  contain: layout style;
}

#menu-1-63060d95.elementor-nav-menu {
  display: flex !important;
  align-items: center;
  flex-wrap: nowrap;
  min-height: 52px;
  margin: 0 !important;
  padding: 0 !important;
}

#menu-1-63060d95 > .menu-item {
  display: flex;
  align-items: center;
  height: 52px;
  flex: 0 0 auto;
}

#menu-1-63060d95 > .menu-item > a.elementor-item {
  display: inline-flex;
  align-items: center;
  white-space: nowrap;
  /* 系統字優先：PSI／首屏不因 Noto 晚到而改字寬（0.001 主因） */
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang TC", "Hiragino Sans CNS", "Microsoft JhengHei", "Noto Sans TC", sans-serif !important;
  font-size: 16px !important;
  font-weight: 500 !important;
  line-height: 52px !important;
  height: 52px;
  padding-top: 0 !important;
  padding-bottom: 0 !important;
  padding-left: 14px !important;
  padding-right: 14px !important;
  box-sizing: border-box;
}

/* 有子選單：只預留右側空間；caret 仍用 Elementor .sub-arrow（勿用 a::after） */
#menu-1-63060d95 > .menu-item-has-children > a.elementor-item {
  padding-right: 28px !important;
}

#menu-1-63060d95 .elementor-item .sub-arrow,
#menu-1-63060d95 .elementor-item svg {
  width: 10px;
  height: 10px;
  flex: 0 0 10px;
}

/* PSI 點名項：鎖死寬度，字型／鄰項再變也不擠動這格 */
#menu-1-63060d95 > .menu-item-13188 > a.elementor-item,
#menu-1-63060d95 > .menu-item > a.elementor-item[href*="/auditing/"] {
  min-width: 160px;
  justify-content: center;
}

#menu-1-63060d95 .sub-menu {
  position: absolute !important;
  top: 100% !important;
  left: 0;
  z-index: 999;
  margin: 0;
}

.elementor-element-6aa70dde img {
  width: 170px !important;
  height: 79px !important;
  object-fit: contain;
  display: block;
}

#masthead .elementor-sticky__spacer {
  visibility: hidden !important;
  pointer-events: none !important;
}
</style>
    <?php
}
add_action('wp_head', 'genacct_navbar_cls_fix_css', 2);
