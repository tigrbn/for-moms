export function formatMoney(x: number | null | undefined): string {
  if (x == null) return "—";
  return `${x} ₽`;
}

/** Маска российского номера: +7 9XX XXX XX XX. Из ввода оставляем только цифры, 8 в начале заменяем на 7. */
export function formatPhoneMask(value: string): string {
  let digits = value.replace(/\D/g, "");
  if (digits.startsWith("8")) digits = "7" + digits.slice(1);
  if (digits.startsWith("7")) digits = digits.slice(1);
  digits = digits.slice(0, 10);
  if (digits.length === 0) return "";
  const d = digits;
  if (d.length <= 3) return "+7 " + d;
  if (d.length <= 6) return "+7 " + d.slice(0, 3) + " " + d.slice(3);
  if (d.length <= 8) return "+7 " + d.slice(0, 3) + " " + d.slice(3, 6) + " " + d.slice(6);
  return "+7 " + d.slice(0, 3) + " " + d.slice(3, 6) + " " + d.slice(6, 8) + " " + d.slice(8, 10);
}

/** Из отображаемого номера с маской извлечь цифры для сохранения (7XXXXXXXXXX). */
export function formatPhoneToDigits(displayValue: string): string {
  const digits = displayValue.replace(/\D/g, "");
  if (digits.length === 0) return "";
  if (digits.startsWith("8")) return "7" + digits.slice(1, 11);
  if (digits.startsWith("7")) return digits.slice(0, 11);
  return "7" + digits.slice(0, 10);
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
