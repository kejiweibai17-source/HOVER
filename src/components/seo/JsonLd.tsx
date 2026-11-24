/** Server-safe JSON-LD script tag */
export default function JsonLd({
  id,
  data,
}: {
  id: string;
  data: Record<string, unknown> | Record<string, unknown>[];
}) {
  return (
    <script
      type="application/ld+json"
      id={id}
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
