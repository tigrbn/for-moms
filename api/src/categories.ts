/**
 * Дерево категорий (должно совпадать с web/src/constants/feed.ts).
 * Используется для сопоставления заявки (подкатегория) со специалистом (категория).
 */
const CATEGORY_TREE: { id: string; children: { id: string }[] }[] = [
  { id: "Няня", children: [{ id: "Няня на час" }, { id: "Няня на полный день" }, { id: "Няня с проживанием" }, { id: "Выходного дня" }, { id: "Сиделка для ребенка" }, { id: "Водитель-няня" }] },
  { id: "Репетитор", children: [{ id: "Начальная школа" }, { id: "Иностранные языки" }, { id: "Подготовка к школе" }, { id: "ОГЭ/ЕГЭ" }, { id: "Спорт и танцы" }, { id: "Музыка и творчество" }] },
  { id: "Досуг", children: [{ id: "Аниматоры на праздник" }, { id: "Мастер-классы" }, { id: "Квесты для детей" }, { id: "Походы в музеи/театр" }, { id: "Организация Дня Рождения" }, { id: "Детские лагеря" }] },
];

/** Родительская категория для подкатегории; для самой категории возвращает её же. */
export function getParentCategory(category: string | null | undefined): string | null {
  const cat = category?.trim();
  if (!cat) return null;
  for (const section of CATEGORY_TREE) {
    if (section.id === cat) return section.id;
    if (section.children.some((c) => c.id === cat)) return section.id;
  }
  return null;
}
