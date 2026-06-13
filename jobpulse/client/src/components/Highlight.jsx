// Highlights occurrences of `query` inside `text` with a primary-coloured mark.
// Safe — splits on the exact term, never uses dangerouslySetInnerHTML.

export default function Highlight({ text, query }) {
  if (!query || !query.trim()) return <>{text}</>;

  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`(${escaped})`, "gi");
  const parts = text.split(regex);

  return (
    <>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <mark
            key={i}
            className="bg-primary/25 text-primary rounded-sm px-0.5 not-italic"
            style={{ fontWeight: "inherit" }}
          >
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  );
}
