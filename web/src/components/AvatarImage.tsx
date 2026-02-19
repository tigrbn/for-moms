import { getAvatarSrc, getDefaultAvatar } from "../lib/avatar";

type Props = {
  avatarUrl: string | null | undefined;
  telegramPhotoUrl?: string | null;
  gender?: string | null;
  profileType?: "parent" | "specialist" | "company";
  alt?: string;
  className?: string;
  style?: React.CSSProperties;
};

/** Аватарка с подстановкой дефолта при ошибке загрузки (например 404 от Telegram). */
export function AvatarImage({
  avatarUrl,
  telegramPhotoUrl,
  gender,
  profileType,
  alt = "",
  className,
  style,
}: Props) {
  const src = getAvatarSrc(avatarUrl, telegramPhotoUrl, gender, profileType);
  const fallbackSrc = getDefaultAvatar(gender, profileType);

  const handleError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    if (img.src !== fallbackSrc) {
      img.onerror = null;
      img.src = fallbackSrc;
    }
  };

  return <img src={src} alt={alt} className={className} style={style} onError={handleError} />;
}
