import type { WashingInstructions } from "@/lib/washingInstructions";
import { isWashingInstructionsVisible } from "@/lib/washingInstructions";

export default function WashingInstructionsList({
  guide,
  className = "space-y-2 text-[14px] leading-[1.7] tracking-[0.06em] text-black",
}: {
  guide: WashingInstructions;
  className?: string;
}) {
  if (!isWashingInstructionsVisible(guide)) return null;

  return (
    <div className={className}>
      {guide.items.map((item) => (
        <p key={item}>・{item}</p>
      ))}
    </div>
  );
}
