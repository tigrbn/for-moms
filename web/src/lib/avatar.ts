import userpicMan from "../assets/img/userpic/man.png";
import userpicWoman from "../assets/img/userpic/woman.png";
import userpicCompany from "../assets/img/userpic/company.png";

/** Дефолтная картинка по типу профиля (для компании — своя иконка). Экспорт для fallback при ошибке загрузки. */
export function getDefaultAvatar(gender: string | null | undefined, profileType?: string): string {
  if (profileType === "company") return userpicCompany;
  return gender === "male" ? userpicMan : userpicWoman;
}

/** URL или импорт картинки для аватара. Пустая строка avatarUrl = «удалено», показываем дефолт. null = использовать Telegram. */
export function getAvatarSrc(
  avatarUrl: string | null | undefined,
  telegramPhotoUrl: string | null | undefined,
  gender: string | null | undefined,
  profileType?: "parent" | "specialist" | "company",
): string {
  if (typeof avatarUrl === "string" && avatarUrl === "") return getDefaultAvatar(gender, profileType);
  if (avatarUrl?.trim()) return avatarUrl;
  if (telegramPhotoUrl?.trim()) return telegramPhotoUrl;
  return getDefaultAvatar(gender, profileType);
}
