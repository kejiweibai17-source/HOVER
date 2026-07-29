<?php
/**
 * HOVER — 商品圖片尺寸（給 Next.js 縮圖用，不依賴 Vercel Image Optimization）
 *
 * 使用方式（WordPress 後台）：
 * 1. Code Snippets → Add New → 貼上本檔
 * 2. Run snippet：Everywhere → 啟用
 *
 * REST 每張 images[] 會多：
 *   sizes: {
 *     thumbnail, medium, medium_large, large,
 *     woocommerce_thumbnail, woocommerce_single, full
 *   }
 */

if (!defined('ABSPATH')) {
    exit;
}

if (defined('HOVER_IMAGE_SIZES_LOADED')) {
    return;
}
define('HOVER_IMAGE_SIZES_LOADED', true);

function hover_attachment_size_urls(int $attachment_id): array
{
    $keys = [
        'thumbnail',
        'medium',
        'medium_large',
        'large',
        'woocommerce_thumbnail',
        'woocommerce_single',
        'full',
    ];

    $out = [];
    foreach ($keys as $key) {
        $url = wp_get_attachment_image_url($attachment_id, $key);
        $out[$key] = $url ? $url : null;
    }
    return $out;
}

add_filter('woocommerce_rest_prepare_product_object', function ($response, $object, $request) {
    if (!is_object($response) || !method_exists($response, 'get_data')) {
        return $response;
    }

    $data = $response->get_data();
    if (empty($data['images']) || !is_array($data['images'])) {
        return $response;
    }

    foreach ($data['images'] as &$image) {
        $id = isset($image['id']) ? (int) $image['id'] : 0;
        if ($id > 0) {
            $image['sizes'] = hover_attachment_size_urls($id);
        }
    }
    unset($image);

    $response->set_data($data);
    return $response;
}, 20, 3);

/** 變體圖片也附 sizes（顏色圖庫用） */
add_filter('woocommerce_rest_prepare_product_variation_object', function ($response, $object, $request) {
    if (!is_object($response) || !method_exists($response, 'get_data')) {
        return $response;
    }

    $data = $response->get_data();
    if (!empty($data['image']['id'])) {
        $data['image']['sizes'] = hover_attachment_size_urls((int) $data['image']['id']);
        $response->set_data($data);
    }

    return $response;
}, 20, 3);
