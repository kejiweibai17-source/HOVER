<?php
/**
 * HOVER — 後台訂單操作（已整合）
 *
 * ⚠️ 請勿啟用本檔。
 * 取消訂單／標記已出貨／已到貨／退貨 已併入：
 *   hover-ecpay-logistics.php
 * 側欄「HOVER 物流／店到店」→「前台訂單操作」區塊。
 *
 * 若先前已新增並啟用本 snippet，請停用或刪除，避免出現重複側欄。
 */

if (!defined('ABSPATH')) {
    exit;
}

// 故意不註冊任何 hook，避免與物流側欄重複。
