import userpicMan from "../assets/img/userpic/man.png";
import userpicWoman from "../assets/img/userpic/woman.png";

/** URL или импорт картинки для аватара: сначала фото профиля/Telegram, иначе userpic по полу. */
export function getAvatarSrc(
  avatarUrl: string | null | undefined,
  telegramPhotoUrl: string | null | undefined,
  gender: string | null | undefined,
): string {
  if (avatarUrl?.trim()) return avatarUrl;
  if (telegramPhotoUrl?.trim()) return telegramPhotoUrl;
  return gender === "male" ? userpicMan : userpicWoman;
}
