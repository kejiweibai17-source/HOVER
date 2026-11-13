import type { CSSProperties } from "react";
import {
  colorSwatchBackground,
  parseSwatchHexes,
} from "@/lib/productColors";

type ColorSwatchProps = {
  /** 單色 hex、雙色「#111/#fff」、或已解析的 hex 陣列 */
  hex?: string | null;
  hexes?: string[] | null;
  label?: string;
  className?: string;
  title?: string;
  style?: CSSProperties;
};

/** 單色實心／雙色對角切半色票 */
export default function ColorSwatch({
  hex,
  hexes,
  label = "",
  className = "",
  title,
  style,
}: ColorSwatchProps) {
  const resolved =
    Array.isArray(hexes) && hexes.length
      ? hexes.slice(0, 2)
      : parseSwatchHexes(hex, label);

  return (
    <span
      className={className}
      title={title || label || undefined}
      aria-hidden={title || label ? undefined : true}
      style={{
        background: colorSwatchBackground(resolved),
        ...style,
      }}
    />
  );
}
