import { useRef, useState } from "react";

const SWIPE_THRESHOLD = 40;

type Props = {
  images: string[];
  alt?: string;
  /** Высота блока (px) */
  height?: number;
  className?: string;
};

export function ImageSlider({ images, alt = "", height = 280, className = "" }: Props) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const touchStartX = useRef(0);

  if (images.length === 0) return null;

  const clampedIndex = Math.max(0, Math.min(currentIndex, images.length - 1));
  const goPrev = () => setCurrentIndex((i) => Math.max(0, i - 1));
  const goNext = () => setCurrentIndex((i) => Math.min(images.length - 1, i + 1));

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    const endX = e.changedTouches[0].clientX;
    const delta = touchStartX.current - endX;
    if (delta > SWIPE_THRESHOLD) goNext();
    else if (delta < -SWIPE_THRESHOLD) goPrev();
  };

  if (images.length === 1) {
    return (
      <div className={className} style={{ marginTop: 12 }}>
        <img
          src={images[0]}
          alt={alt}
          style={{
            width: "100%",
            height,
            objectFit: "cover",
            borderRadius: "var(--radius-sm)",
            display: "block",
          }}
        />
      </div>
    );
  }

  return (
    <div className={className} style={{ marginTop: 12 }}>
      <div
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        style={{
          position: "relative",
          height,
          borderRadius: "var(--radius-sm)",
          overflow: "hidden",
          background: "var(--border-color)",
        }}
      >
        <img
          src={images[clampedIndex]}
          alt={`${alt} ${clampedIndex + 1} из ${images.length}`}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            display: "block",
          }}
        />
        <button
          type="button"
          onClick={goPrev}
          disabled={clampedIndex <= 0}
          aria-label="Предыдущее фото"
          style={{
            position: "absolute",
            left: 8,
            top: "50%",
            transform: "translateY(-50%)",
            width: 36,
            height: 36,
            borderRadius: "50%",
            border: "none",
            background: "rgba(0,0,0,0.4)",
            color: "#fff",
            fontSize: 18,
            cursor: clampedIndex <= 0 ? "default" : "pointer",
            opacity: clampedIndex <= 0 ? 0.4 : 1,
          }}
        >
          ←
        </button>
        <button
          type="button"
          onClick={goNext}
          disabled={clampedIndex >= images.length - 1}
          aria-label="Следующее фото"
          style={{
            position: "absolute",
            right: 8,
            top: "50%",
            transform: "translateY(-50%)",
            width: 36,
            height: 36,
            borderRadius: "50%",
            border: "none",
            background: "rgba(0,0,0,0.4)",
            color: "#fff",
            fontSize: 18,
            cursor: clampedIndex >= images.length - 1 ? "default" : "pointer",
            opacity: clampedIndex >= images.length - 1 ? 0.4 : 1,
          }}
        >
          →
        </button>
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: 6,
          marginTop: 8,
        }}
      >
        {images.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setCurrentIndex(i)}
            aria-label={`Фото ${i + 1}`}
            aria-current={i === clampedIndex ? "true" : undefined}
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              border: "none",
              padding: 0,
              background: i === clampedIndex ? "var(--primary)" : "var(--border-color)",
              cursor: "pointer",
            }}
          />
        ))}
      </div>
      <p className="muted" style={{ margin: "4px 0 0", fontSize: 12 }}>
        {clampedIndex + 1} из {images.length}
      </p>
    </div>
  );
}
