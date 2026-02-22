/**
 * Открывает URL контакта (t.me/... или другой). В Mini App (Telegram/MAX)
 * использует WebApp.openLink, чтобы хост сам открыл ссылку (без блокировки popup).
 */
export function openContactUrl(url: string): void {
  const tg = (window as any).Telegram?.WebApp;
  const max = (window as any).WebApp;
  if (tg?.openLink && typeof tg.openLink === "function") {
    tg.openLink(url);
    return;
  }
  if (max?.openLink && typeof max.openLink === "function") {
    max.openLink(url);
    return;
  }
  window.open(url, "_blank", "noopener,noreferrer");
}
