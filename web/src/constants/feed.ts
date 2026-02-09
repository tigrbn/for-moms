import categoryNanny from "../assets/img/category/няня.png";
import categoryTutor from "../assets/img/category/репетитор.png";
import categoryLeisure from "../assets/img/category/досуг.png";

/** Категории ленты: Няня, Репетитор, Досуг */
export const FEED_CATEGORIES = [
  { id: "", label: "Все", icon: null as string | null },
  { id: "Няня", label: "Няня", icon: categoryNanny },
  { id: "Репетитор", label: "Репетитор", icon: categoryTutor },
  { id: "Досуг", label: "Досуг", icon: categoryLeisure },
];

export function getCategoryIcon(category: string | null | undefined): string | null {
  if (!category?.trim()) return null;
  const c = FEED_CATEGORIES.find((x) => x.id && x.id.trim() && category.trim() === x.id);
  return c?.icon ?? null;
}
