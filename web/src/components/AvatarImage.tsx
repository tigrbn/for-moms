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
  const isDefault = src === fallbackSrc;

  const handleError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    if (img.src !== fallbackSrc) {
      img.onerror = null;
      img.src = fallbackSrc;
    }
  };

  return (
    <span
      className={className}
      style={{
        ...style,
        display: "block",
        width: "100%",
        height: "100%",
        position: "relative",
        overflow: "hidden",
        backgroundImage: `url(${fallbackSrc})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundColor: "var(--border-color)",
      }}
    >
      <img
        src={src}
        alt={alt}
        loading="lazy"
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          opacity: loaded || isDefault ? 1 : 0,
          transition: "opacity 0.2s ease-out",
        }}
        onLoad={() => setLoaded(true)}
        onError={handleError}
      />
    </span>
  );
}
