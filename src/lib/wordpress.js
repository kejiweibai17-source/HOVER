// lib/wordpress.js

// 你的 WordPress API 端點
const WP_API_URL = "https://inf.fjg.mybluehost.me/website_4ad5d5f2/wp-json/wp/v2";

// 取得文章列表 (包含圖片與分類)
export async function getAllPosts() {
  // _embed 參數是關鍵，它會把 featured image 和 category 資訊一起抓回來
  const res = await fetch(`${WP_API_URL}/posts?_embed&per_page=10`, {
    // ISR 關鍵設定：每 3600 秒 (1小時) 重新驗證一次快取
    // 這讓你的網站是靜態的，但每小時會嘗試更新一次內容
    next: { revalidate: 3600 }, 
  });

  if (!res.ok) {
    throw new Error("Failed to fetch posts");
  }

  return res.json();
}

// 取得單篇文章 (透過 Slug)
export async function getPostBySlug(slug) {
  const res = await fetch(`${WP_API_URL}/posts?slug=${slug}&_embed`, {
    next: { revalidate: 3600 },
  });

  if (!res.ok) {
    throw new Error("Failed to fetch post");
  }

  const posts = await res.json();
  return posts.length > 0 ? posts[0] : null;
}

// 取得所有文章的 Slug (用於 generateStaticParams)
export async function getAllPostSlugs() {
  const res = await fetch(`${WP_API_URL}/posts?per_page=100&_fields=slug`);
  return res.json();
}