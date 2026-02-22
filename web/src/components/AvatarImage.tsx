import { useState } from "react";
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

/** Аватарка с подстановкой дефолта при ошибке загрузки; плейсхолдер и плавное появление. */
export function AvatarImage({
  avatarUrl,
  telegramPhotoUrl,
  gender,
  profileType,
  alt = "",
  className,
  style,
}: Props) {
  const [loaded, setLoaded] = useState(false);
  const src = getAvatarSrc(avatarUrl, telegramPhotoUrl, gender, profileType);
  const fallbackSrc = getDefaultAvatar(gender, profileType);

  const handleError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    if (img.src !== fallbackSrc) {
      img.onerror = null;
      img.src = fallbackSrc;
    }
  };

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      style={{
        ...style,
        background: "var(--border-color)",
        opacity: loaded ? 1 : 0,
        transition: "opacity 0.2s ease-out",
      }}
      onLoad={() => setLoaded(true)}
      onError={handleError}
    />
  );
}
