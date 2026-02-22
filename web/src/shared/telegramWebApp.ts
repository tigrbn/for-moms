/** window.Telegram.WebApp — официальный объект Telegram Mini Apps */
export function getTg() {
  return (typeof window !== "undefined" && (window as any)?.Telegram?.WebApp) || null;
}

/** window.WebApp — MAX Bridge (совместим с Telegram API) */
export function getMax() {
  return (typeof window !== "undefined" && (window as any)?.WebApp) || null;
}
