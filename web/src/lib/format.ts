export function formatMoney(x: number | null | undefined): string {
  if (x == null) return "—";
  return `${x} ₽`;
}

/** Дата и время без секунд (например 14:43) */
export function formatDate(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString("ru-RU", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Для карточки заявки в ленте: до 30 мин — «N минут назад», иначе дата без секунд */
export function formatRequestCreatedAt(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  const now = Date.now();
  const diffMs = now - d.getTime();
  const diffMins = Math.floor(diffMs / 60_000);
  if (diffMins < 1) return "только что";
  if (diffMins < 30) {
    const word =
      diffMins === 1 || (diffMins > 20 && diffMins % 10 === 1)
        ? "минуту"
        : (diffMins >= 2 && diffMins <= 4) || (diffMins >= 22 && diffMins <= 24)
          ? "минуты"
          : "минут";
    return `${diffMins} ${word} назад`;
  }
  return d.toLocaleString("ru-RU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

/** Дата отклика: если меньше часа назад — «N минут назад», иначе полная дата */
export function formatOfferCreatedAt(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  const now = Date.now();
  const diffMs = now - d.getTime();
  const diffMins = Math.floor(diffMs / 60_000);
  if (diffMins < 1) return "только что";
  if (diffMins < 60) {
    const word =
      diffMins === 1 || (diffMins > 20 && diffMins % 10 === 1)
        ? "минуту"
        : (diffMins >= 2 && diffMins <= 4) || (diffMins >= 22 && diffMins <= 24)
          ? "минуты"
          : "минут";
    return `${diffMins} ${word} назад`;
  }
  return d.toLocaleString("ru-RU", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
