export function labelRequestStatus(s: "active" | "in_progress" | "done" | "cancelled"): string {
  if (s === "active") return "🟢 Активна";
  if (s === "in_progress") return "🟡 В работе";
  if (s === "done") return "✅ Завершена";
  return "⛔ Отменена";
}

export function labelOfferStatus(s: "pending" | "accepted" | "rejected" | "cancelled"): string {
  if (s === "pending") return "🕓 Ожидает";
  if (s === "accepted") return "✅ Принят";
  if (s === "rejected") return "⛔ Отклонён";
  return "🚫 Отменён";
}
