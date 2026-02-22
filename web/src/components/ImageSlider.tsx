import { useRef, useState, useEffect } from "react";
import { createPortal } from "react-dom";

const SWIPE_THRESHOLD = 40;

/** Блокировка скролла тела при открытом модальном окне, без скачков */
function useLockBodyScroll(locked: boolean) {
  const scrollYRef = useRef(0);
  useEffect(() => {
    if (!locked) return;
    scrollYRef.current = window.scrollY ?? document.documentElement.scrollTop;
    const prevHtmlOverflow = document.documentElement.style.overflow;
    const prevBodyOverflow = document.body.style.overflow;
    const prevBodyPosition = document.body.style.position;
    const prevBodyTop = document.body.style.top;
    const prevBodyWidth = document.body.style.width;
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollYRef.current}px`;
    document.body.style.width = "100%";
    return () => {
      document.documentElement.style.overflow = prevHtmlOverflow;
      document.body.style.overflow = prevBodyOverflow;
      document.body.style.position = prevBodyPosition;
      document.body.style.top = prevBodyTop;
      document.body.style.width = prevBodyWidth;
      window.scrollTo(0, scrollYRef.current);
    };
  }, [locked]);
}

type Props = {
  images: string[];
  alt?: string;
  /** Высота блока (px) */
  height?: number;
  className?: string;
  /** Открывать модалку по клику (в ленте — false, в карточке/профиле — true) */
  allowModal?: boolean;
};

export function ImageSlider({ images, alt = "", height = 280, className = "", allowModal = true }: Props) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalIndex, setModalIndex] = useState(0);
  const touchStartX = useRef(0);
  const modalTouchStartX = useRef(0);

  if (images.length === 0) return null;

  const clampedIndex = Math.max(0, Math.min(currentIndex, images.length - 1));
  const [currentImageLoaded, setCurrentImageLoaded] = useState(false);
  const goPrev = () => setCurrentIndex((i) => Math.max(0, i - 1));
  const goNext = () => setCurrentIndex((i) => Math.min(images.length - 1, i + 1));

  useEffect(() => {
    setCurrentImageLoaded(false);
  }, [clampedIndex, images]);

  const openModal = (index: number) => {
    if (!allowModal) return;
    setModalIndex(Math.max(0, Math.min(index, images.length - 1)));
    setModalOpen(true);
  };
  const closeModal = () => setModalOpen(false);
  const modalGoPrev = () => setModalIndex((i) => Math.max(0, i - 1));
  const modalGoNext = () => setModalIndex((i) => Math.min(images.length - 1, i + 1));
  const modalClamped = Math.max(0, Math.min(modalIndex, images.length - 1));

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    const endX = e.changedTouches[0].clientX;
    const delta = touchStartX.current - endX;
    if (delta > SWIPE_THRESHOLD) goNext();
    else if (delta < -SWIPE_THRESHOLD) goPrev();
  };

  useLockBodyScroll(modalOpen && allowModal);

  useEffect(() => {
    if (!modalOpen || !allowModal) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeModal();
      if (e.key === "ArrowLeft") modalGoPrev();
      if (e.key === "ArrowRight") modalGoNext();
    };
    const onTouchMove = (e: TouchEvent) => e.preventDefault();
    document.addEventListener("keydown", onKey);
    document.addEventListener("touchmove", onTouchMove, { passive: false });
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("touchmove", onTouchMove);
    };
  }, [modalOpen, allowModal]);

  const sliderContent = (
    <>
      <img
        src={images[clampedIndex]}
        alt={`${alt} ${clampedIndex + 1} из ${images.length}`}
        onLoad={() => setCurrentImageLoaded(true)}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          display: "block",
          opacity: currentImageLoaded ? 1 : 0,
          transition: "opacity 0.2s ease-out",
        }}
      />
      {images.length > 1 && (
        <>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); goPrev(); }}
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
            onClick={(e) => { e.stopPropagation(); goNext(); }}
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
        </>
      )}
    </>
  );

  if (images.length === 1) {
    return (
      <div className={className} style={{ marginTop: 12 }}>
        <div
          {...(allowModal
            ? {
                role: "button" as const,
                tabIndex: 0,
                onClick: () => openModal(0),
                onKeyDown: (e: React.KeyboardEvent) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    openModal(0);
                  }
                },
                style: { cursor: "pointer" as const, display: "block" as const },
                "aria-label": "Открыть фото",
              }
            : { style: { display: "block" as const } })}
        >
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
        {allowModal &&
          modalOpen &&
          createPortal(
            <div
              className="image-slider-modal-overlay"
              role="dialog"
              aria-modal="true"
              aria-label="Просмотр фото"
              style={{
                position: "fixed",
                inset: 0,
                zIndex: 10000,
                background: "rgba(0,0,0,0.9)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: 16,
                overflow: "hidden",
                touchAction: "none",
                transform: "none",
              }}
              onClick={closeModal}
            >
              <button
                type="button"
                onClick={closeModal}
                aria-label="Закрыть"
                className="image-slider-modal-btn"
                style={{
                  position: "absolute",
                  top: 12,
                  right: 12,
                  width: 44,
                  height: 44,
                  borderRadius: "50%",
                  border: "none",
                  background: "rgba(255,255,255,0.2)",
                  color: "#fff",
                  fontSize: 24,
                  cursor: "pointer",
                  zIndex: 1,
                }}
              >
                ×
              </button>
              <div style={{ minWidth: 0, minHeight: "50vh", display: "flex", alignItems: "center", justifyContent: "center" }} onClick={(e) => e.stopPropagation()}>
                <img
                  src={images[0]}
                  alt={alt}
                  style={{ maxWidth: "100%", maxHeight: "85vh", objectFit: "contain" }}
                  draggable={false}
                />
              </div>
            </div>,
            document.body,
          )}
      </div>
    );
  }

  return (
    <div className={className} style={{ marginTop: 12 }}>
      <div
        {...(allowModal
          ? {
              role: "button" as const,
              tabIndex: 0,
              onClick: () => openModal(clampedIndex),
              onKeyDown: (e: React.KeyboardEvent) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  openModal(clampedIndex);
                }
              },
              "aria-label": "Открыть фото",
            }
          : {})}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        style={{
          position: "relative",
          height,
          borderRadius: "var(--radius-sm)",
          overflow: "hidden",
          background: "var(--border-color)",
          cursor: allowModal ? "pointer" : "default",
        }}
      >
        {sliderContent}
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

      {allowModal &&
        modalOpen &&
        createPortal(
          <div
            className="image-slider-modal-overlay"
            role="dialog"
            aria-modal="true"
            aria-label="Просмотр фото"
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 10000,
              background: "rgba(0,0,0,0.9)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 48,
              overflow: "hidden",
              touchAction: "none",
              transform: "none",
            }}
            onClick={closeModal}
          >
            <button
              type="button"
              onClick={closeModal}
              aria-label="Закрыть"
              className="image-slider-modal-btn"
              style={{
                position: "absolute",
                top: 12,
                right: 12,
                width: 44,
                height: 44,
                borderRadius: "50%",
                border: "none",
                background: "rgba(255,255,255,0.2)",
                color: "#fff",
                fontSize: 24,
                cursor: "pointer",
                zIndex: 2,
              }}
            >
              ×
            </button>
            {images.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); modalGoPrev(); }}
                  disabled={modalClamped <= 0}
                  aria-label="Предыдущее фото"
                  className="image-slider-modal-btn"
                  style={{
                    position: "absolute",
                    left: 12,
                    top: "50%",
                    transform: "translateY(-50%)",
                    width: 48,
                    height: 48,
                    borderRadius: "50%",
                    border: "none",
                    background: "rgba(255,255,255,0.2)",
                    color: "#fff",
                    fontSize: 24,
                    cursor: modalClamped <= 0 ? "default" : "pointer",
                    opacity: modalClamped <= 0 ? 0.4 : 1,
                    zIndex: 2,
                  }}
                >
                  ←
                </button>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); modalGoNext(); }}
                  disabled={modalClamped >= images.length - 1}
                  aria-label="Следующее фото"
                  className="image-slider-modal-btn"
                  style={{
                    position: "absolute",
                    right: 12,
                    top: "50%",
                    transform: "translateY(-50%)",
                    width: 48,
                    height: 48,
                    borderRadius: "50%",
                    border: "none",
                    background: "rgba(255,255,255,0.2)",
                    color: "#fff",
                    fontSize: 24,
                    cursor: modalClamped >= images.length - 1 ? "default" : "pointer",
                    opacity: modalClamped >= images.length - 1 ? 0.4 : 1,
                    zIndex: 2,
                  }}
                >
                  →
                </button>
              </>
            )}
            <div
              style={{
                position: "relative",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                minWidth: 0,
                minHeight: "50vh",
                maxWidth: "100%",
                maxHeight: "85vh",
              }}
              onTouchStart={(e) => { modalTouchStartX.current = e.touches[0].clientX; }}
              onTouchEnd={(e) => {
                if (images.length <= 1) return;
                const endX = e.changedTouches[0].clientX;
                const delta = modalTouchStartX.current - endX;
                if (delta > SWIPE_THRESHOLD) modalGoNext();
                else if (delta < -SWIPE_THRESHOLD) modalGoPrev();
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={images[modalClamped]}
                alt={`${alt} ${modalClamped + 1} из ${images.length}`}
                style={{ maxWidth: "100%", maxHeight: "85vh", objectFit: "contain", display: "block" }}
                draggable={false}
              />
            </div>
            <div
              style={{
                position: "absolute",
                bottom: 16,
                left: "50%",
                transform: "translateX(-50%)",
                color: "rgba(255,255,255,0.9)",
                fontSize: 14,
                pointerEvents: "none",
              }}
            >
              {modalClamped + 1} из {images.length}
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
