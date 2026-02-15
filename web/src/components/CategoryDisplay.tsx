import { getCategoryParts, getCategoryDisplayText } from "../constants/feed";

type Props = {
  category: string | null | undefined;
  /** Если true — одна строка «Категория: Подкатегория» (для узких мест) */
  inline?: boolean;
};

/** Выводит категорию и подкатегорию: сверху категория (жирным), снизу подкатегория (мелким). */
export function CategoryDisplay({ category, inline }: Props) {
  const parts = getCategoryParts(category);
  if (!parts) return <>{category ?? "—"}</>;
  if (inline) return <>{getCategoryDisplayText(category)}</>;
  return (
    <>
      <div><strong>{parts.parent}</strong></div>
      {parts.sub ? <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>{parts.sub}</div> : null}
    </>
  );
}
