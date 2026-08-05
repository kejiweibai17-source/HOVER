import type { SizeGuide } from "@/lib/sizeGuide";
import {
  formatModelLine,
  hasModelReferences,
  isSizeGuideVisible,
} from "@/lib/sizeGuide";

export default function SizeGuideTable({ guide }: { guide: SizeGuide }) {
  if (!isSizeGuideVisible(guide)) return null;

  const showModels = hasModelReferences(guide);

  return (
    <div className="text-[13px]">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-[#ddd]">
            <th className="py-2 pr-4 text-left font-medium text-[#333]">
              {guide.unitLabel}
            </th>
            {guide.sizes.map((size) => (
              <th
                key={size}
                className="py-2 px-2 text-center font-medium text-[#555]"
              >
                {size}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {guide.rows.map((row) => (
            <tr key={row.label} className="border-b border-[#eee]">
              <td className="py-2 pr-4 font-medium text-[#333]">{row.label}</td>
              {guide.sizes.map((size, i) => (
                <td
                  key={`${row.label}-${size}`}
                  className="py-2 px-2 text-center text-[#555]"
                >
                  {row.values[i] ?? "—"}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {guide.note && (
        <p className="mt-3 text-[13px] leading-relaxed text-[#555] md:text-[14px]">
          {guide.note}
        </p>
      )}

      {showModels && (
        <div className="mt-6 border-t border-[#eee] pt-5">
          <p className="mb-3 text-[14px] font-semibold tracking-[0.04em] text-[#333]">
            Model 實穿參考
          </p>
          <ul className="space-y-2 text-[13px] leading-relaxed text-[#555] md:text-[14px]">
            {guide.models.map((model, i) => {
              const line = formatModelLine(model);
              if (!line) return null;
              return (
                <li key={`${model.label}-${i}`}>{line}</li>
              );
            })}
          </ul>
          {guide.modelNote && (
            <p className="mt-3 text-[13px] leading-relaxed text-[#555] md:text-[14px]">
              {guide.modelNote}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
