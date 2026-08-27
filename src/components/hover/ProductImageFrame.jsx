/**
 * 全站商品圖外框：固定 3:4，圖片以 object-cover 裁切填滿。
 */
export const PRODUCT_IMAGE_ASPECT = "3 / 4";

export default function ProductImageFrame({
  children,
  className = "",
  as: Tag = "div",
  ...rest
}) {
  return (
    <Tag
      className={`relative aspect-[3/4] w-full overflow-hidden bg-white ${className}`}
      style={{ aspectRatio: PRODUCT_IMAGE_ASPECT }}
      {...rest}
    >
      {children}
    </Tag>
  );
}
