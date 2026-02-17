import userpicMan from "../assets/img/userpic/man.png";
import userpicWoman from "../assets/img/userpic/woman.png";

/** URL или импорт картинки для аватара. Пустая строка avatarUrl = «удалено», показываем дефолт. null = использовать Telegram. */
export function getAvatarSrc(
  avatarUrl: string | null | undefined,
  telegramPhotoUrl: string | null | undefined,
  gender: string | null | undefined,
): string {
  if (typeof avatarUrl === "string" && avatarUrl === "") return gender === "male" ? userpicMan : userpicWoman;
  if (avatarUrl?.trim()) return avatarUrl;
  if (telegramPhotoUrl?.trim()) return telegramPhotoUrl;
  return gender === "male" ? userpicMan : userpicWoman;
}
