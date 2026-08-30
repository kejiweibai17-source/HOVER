type PolicyPageHeaderProps = {
  pageTitle: string;
  contentColor: string;
  defaultTitle: string;
  intro?: string;
  /** returns: 較寬 intro；terms/privacy: 置中多行 */
  introLayout?: "returns" | "center";
};

function IntroBlocks({
  intro,
  contentColor,
  layout,
}: {
  intro: string;
  contentColor: string;
  layout: "returns" | "center";
}) {
  const lines = intro
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (!lines.length) return null;

  if (layout === "returns") {
    return (
      <div className="mx-auto mt-6 max-w-[560px] space-y-3">
        {lines.map((line, idx) => (
          <p
            key={`${idx}-${line.slice(0, 24)}`}
            className="text-[12px] leading-[2] tracking-[0.04em] md:text-[13px]"
            style={{ color: contentColor }}
          >
            {line}
          </p>
        ))}
      </div>
    );
  }

  return (
    <div className="mx-auto mt-6 max-w-[640px] space-y-3 text-center md:mt-8">
      {lines.map((line, idx) => (
        <p
          key={`${idx}-${line.slice(0, 24)}`}
          className={`text-[12px] leading-[2] tracking-[0.04em] md:text-[13px] ${
            idx === 1 ? "font-medium" : ""
          }`}
          style={{ color: contentColor }}
        >
          {line}
        </p>
      ))}
    </div>
  );
}

export default function PolicyPageHeader({
  pageTitle,
  contentColor,
  defaultTitle,
  intro,
  introLayout = "center",
}: PolicyPageHeaderProps) {
  const hasIntro = Boolean(intro?.trim());

  return (
    <header
      className={`px-4 text-center md:pt-20 ${
        hasIntro ? "pb-8 pt-14 md:pb-10" : "pb-10 pt-14 md:pb-14"
      }`}
    >
      <h1
        className="font-serif text-[28px] font-medium tracking-[0.12em] md:text-[32px]"
        style={{ color: contentColor }}
      >
        {pageTitle || defaultTitle}
      </h1>
      {hasIntro ? (
        <IntroBlocks
          intro={intro!}
          contentColor={contentColor}
          layout={introLayout}
        />
      ) : null}
    </header>
  );
}
