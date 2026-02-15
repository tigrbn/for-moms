import categoryNanny from "../assets/img/category/няня.png";
import categoryTutor from "../assets/img/category/репетитор.png";
import categoryLeisure from "../assets/img/category/досуг.png";
import categoryOther from "../assets/img/category/другое.png";

/** Раздел и его подкатегории (для выбора в заявках и профиле) */
export interface CategorySection {
  id: string;
  label: string;
  icon: string;
  children: { id: string; label: string }[];
}

/** Дерево категорий: 3 раздела и подкатегории */
export const CATEGORY_TREE: CategorySection[] = [
  {
    id: "Няня",
    label: "Няня",
    icon: categoryNanny,
    children: [
      { id: "Няня на час", label: "Няня на час" },
      { id: "Няня на полный день", label: "Няня на полный день" },
      { id: "Няня с проживанием", label: "Няня с проживанием" },
      { id: "Выходного дня", label: "Выходного дня" },
      { id: "Сиделка для ребенка", label: "Сиделка для ребенка" },
      { id: "Водитель-няня", label: "Водитель-няня" },
    ],
  },
  {
    id: "Репетитор",
    label: "Репетитор",
    icon: categoryTutor,
    children: [
      { id: "Начальная школа", label: "Начальная школа" },
      { id: "Иностранные языки", label: "Иностранные языки" },
      { id: "Подготовка к школе", label: "Подготовка к школе" },
      { id: "ОГЭ/ЕГЭ", label: "ОГЭ/ЕГЭ" },
      { id: "Спорт и танцы", label: "Спорт и танцы" },
      { id: "Музыка и творчество", label: "Музыка и творчество" },
    ],
  },
  {
    id: "Досуг",
    label: "Досуг",
    icon: categoryLeisure,
    children: [
      { id: "Аниматоры на праздник", label: "Аниматоры на праздник" },
      { id: "Мастер-классы", label: "Мастер-классы" },
      { id: "Квесты для детей", label: "Квесты для детей" },
      { id: "Походы в музеи/театр", label: "Походы в музеи/театр" },
      { id: "Организация Дня Рождения", label: "Организация Дня Рождения" },
      { id: "Детские лагеря", label: "Детские лагеря" },
    ],
  },
];

/** Категории для фильтра ленты (разделы + «Все» + «Другое») */
export const FEED_CATEGORIES = [
  { id: "", label: "Все", icon: null as string | null },
  ...CATEGORY_TREE.map((s) => ({ id: s.id, label: s.label, icon: s.icon })),
  { id: "Другое", label: "Другое", icon: categoryOther },
];

/** Все подкатегории по порядку (для списков выбора) */
export const ALL_SUBCATEGORIES = CATEGORY_TREE.flatMap((s) =>
  s.children.map((c) => ({ ...c, sectionId: s.id, sectionLabel: s.label }))
);

/** Иконка для категории: по разделу (для подкатегории — иконка родительского раздела) */
export function getCategoryIcon(category: string | null | undefined): string | null {
  if (!category?.trim()) return null;
  const cat = category.trim();
  for (const section of CATEGORY_TREE) {
    if (section.id === cat) return section.icon;
    if (section.children.some((c) => c.id === cat)) return section.icon;
  }
  return null;
}

/** Текст категории для отображения: «Раздел: Подкатегория» для подкатегории, иначе название раздела или как есть */
export function getCategoryDisplayText(category: string | null | undefined): string {
  if (!category?.trim()) return "—";
  const cat = category.trim();
  for (const section of CATEGORY_TREE) {
    if (section.id === cat) return section.label;
    const child = section.children.find((c) => c.id === cat);
    if (child) return `${section.label}: ${child.label}`;
  }
  return cat;
}
