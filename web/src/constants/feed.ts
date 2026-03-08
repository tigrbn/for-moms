import categoryNanny from "../assets/img/category/nanny.svg";
import categoryTutor from "../assets/img/category/tutor.svg";
import categoryLeisure from "../assets/img/category/leisure.svg";
import categoryCleaning from "../assets/img/category/cleaning.svg";
import categoryCakes from "../assets/img/category/cakes.svg";
import categoryPsychologist from "../assets/img/category/psychologist.svg";
import categoryLogopedist from "../assets/img/category/logopedist.svg";
import categoryOther from "../assets/img/category/other.svg";

/** Раздел и его подкатегории (для выбора в заявках и профиле) */
export interface CategorySection {
  id: string;
  label: string;
  icon: string;
  children: { id: string; label: string }[];
}

/** Дерево категорий: разделы и подкатегории */
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
  {
    id: "Клининг",
    label: "Клининг",
    icon: categoryCleaning,
    children: [
      { id: "Уборка квартиры", label: "Уборка квартиры" },
      { id: "Генеральная уборка", label: "Генеральная уборка" },
      { id: "Мытьё окон", label: "Мытьё окон" },
      { id: "Химчистка", label: "Химчистка" },
      { id: "После ремонта", label: "После ремонта" },
      { id: "Регулярная уборка", label: "Регулярная уборка" },
    ],
  },
  {
    id: "Торты",
    label: "Торты",
    icon: categoryCakes,
    children: [
      { id: "Торты на заказ", label: "Торты на заказ" },
      { id: "Детские торты", label: "Детские торты" },
      { id: "Капкейки", label: "Капкейки" },
      { id: "Пирожные и десерты", label: "Пирожные и десерты" },
      { id: "Праздничная выпечка", label: "Праздничная выпечка" },
    ],
  },
  {
    id: "Психолог",
    label: "Психолог",
    icon: categoryPsychologist,
    children: [
      { id: "Детский психолог", label: "Детский психолог" },
      { id: "Семейный психолог", label: "Семейный психолог" },
      { id: "Подростковый психолог", label: "Подростковый психолог" },
      { id: "Консультации для родителей", label: "Консультации для родителей" },
    ],
  },
  {
    id: "Логопед",
    label: "Логопед",
    icon: categoryLogopedist,
    children: [
      { id: "Постановка звуков", label: "Постановка звуков" },
      { id: "Развитие речи", label: "Развитие речи" },
      { id: "Подготовка к школе (речь)", label: "Подготовка к школе (речь)" },
      { id: "Логопедический массаж", label: "Логопедический массаж" },
    ],
  },
  {
    id: "Другое",
    label: "Другое",
    icon: categoryOther,
    children: [],
  },
];

/** Категории для фильтра ленты (разделы + «Все» + «Объявления») */
export const FEED_CATEGORIES = [
  { id: "", label: "Все", icon: null as string | null },
  ...CATEGORY_TREE.map((s) => ({ id: s.id, label: s.label, icon: s.icon })),
  { id: "Объявления", label: "Объявления", icon: categoryOther },
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

/** Текст категории для отображения: «Категория, Специализация» (например «Репетитор, Иностранные языки») для подкатегории, иначе название раздела */
export function getCategoryDisplayText(category: string | null | undefined): string {
  if (!category?.trim()) return "—";
  const cat = category.trim();
  for (const section of CATEGORY_TREE) {
    if (section.id === cat) return section.label;
    const child = section.children.find((c) => c.id === cat);
    if (child) return `${section.label}, ${child.label}`;
  }
  return cat;
}

/** Родительская категория и подкатегория для отображения в карточке (категория сверху, подкатегория снизу) */
export function getCategoryParts(category: string | null | undefined): { parent: string; sub: string } | null {
  if (!category?.trim()) return null;
  const cat = category.trim();
  for (const section of CATEGORY_TREE) {
    if (section.id === cat) return { parent: section.label, sub: "" };
    const child = section.children.find((c) => c.id === cat);
    if (child) return { parent: section.label, sub: child.label };
  }
  return { parent: cat, sub: "" };
}
