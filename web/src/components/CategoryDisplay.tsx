import { getCategoryParts, getCategoryDisplayText } from "../constants/feed";

type Props = {
  category: string | null | undefined;
  /** Если true — одна строка «Категория: Подкатегория» (для узких мест) */
  inline?: boolean;
};

/** Две строки в стиле мета-поля: Категория (чёрный) и Подкатегория (серый). */
export function CategoryDisplay({ category, inline }: Props) {
  const parts = getCategoryParts(category);
  if (!parts) return <>{category ?? "—"}</>;
  if (inline) return <>{getCategoryDisplayText(category)}</>;
  return (
    <div className="category-display">
      <div className="category-display-row">
        <span className="category-display-label">Категория:</span>
        <span className="category-display-value">{parts.parent}</span>
      </div>
      {parts.sub ? (
        <div className="category-display-row category-display-row--sub">
          <span className="category-display-label">Подкатегория:</span>
          <span className="category-display-value category-display-value--muted">{parts.parent} {parts.sub}</span>
        </div>
      ) : null}
    </div>
  );
}
