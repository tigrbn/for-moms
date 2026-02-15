import { useRef, useState } from "react";
import { getAvatarSrc } from "../lib/avatar";
import { getCategoryIcon } from "../constants/feed";
import { formatDate } from "../lib/format";
import type { ReviewListItem } from "../types";

const SWIPE_THRESHOLD = 48;

type Props = {
  reviews: ReviewListItem[];
  /** Подпись автора, если не удалось определить имя (например «Специалист», «Пользователь») */
  authorFallbackLabel?: string;
};

export function ReviewsSlider({ reviews, authorFallbackLabel = "Пользователь" }: Props) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const touchStartX = useRef(0);

  if (reviews.length === 0) return null;

  const clampedIndex = Math.max(0, Math.min(currentIndex, reviews.length - 1));
  const r = reviews[clampedIndex];

  const fromProfile = r.fromProfile;
  const namePart =
    fromProfile?.displayName?.trim() ||
    [fromProfile?.firstName, fromProfile?.lastName].filter(Boolean).join(" ") ||
    "";
  const authorName = !fromProfile
    ? "Удалённый аккаунт"
    : namePart
      ? namePart
      : authorFallbackLabel;
  const showAuthorAvatar = fromProfile && namePart;
  const authorAvatar = showAuthorAvatar
    ? getAvatarSrc(
        fromProfile.avatarUrl ?? null,
        fromProfile.photoUrl ?? null,
        fromProfile.gender ?? null,
      )
    : "";
  const categoryIcon = r.requestCategory ? getCategoryIcon(r.requestCategory) : null;

  const goPrev = () => setCurrentIndex((i) => Math.max(0, i - 1));
  const goNext = () => setCurrentIndex((i) => Math.min(reviews.length - 1, i + 1));

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    const endX = e.changedTouches[0].clientX;
    const delta = touchStartX.current - endX;
    if (delta > SWIPE_THRESHOLD) goNext();
    else if (delta < -SWIPE_THRESHOLD) goPrev();
  };

  return (
    <div className="reviews-slider">
      <div
        className="reviews-slider-track"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        role="region"
        aria-label="Отзывы"
        aria-roledescription="карусель"
      >
        <div className="card review-card reviews-slider-card" style={{ background: "var(--tg-bg)" }}>
          <div className="row" style={{ alignItems: "center", gap: 12 }}>
            {authorAvatar ? (
              <img
                src={authorAvatar}
                alt=""
                style={{ width: 40, height: 40, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
              />
            ) : (
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: "50%",
                  background: "var(--border-color)",
                  flexShrink: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 12,
                  color: "var(--text-secondary)",
                }}
                aria-hidden
              >
                —
              </div>
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 800 }}>{authorName}</div>
              {r.requestCategory && (
                <div className="muted" style={{ fontSize: 13, marginTop: 2 }}>
                  {categoryIcon && (
                    <img
                      src={categoryIcon}
                      alt=""
                      style={{ width: 14, height: 14, verticalAlign: "middle", marginRight: 4 }}
                    />
                  )}
                  {r.requestCategory}
                </div>
              )}
            </div>
            <div className="review-card-rating" style={{ fontWeight: 900 }}>
              <span className="rating-star">★</span> {r.rating}
            </div>
          </div>
          <div className="muted" style={{ marginTop: 8, fontSize: 13 }}>
            {formatDate(r.createdAt)}
          </div>
          {r.text && <div className="review-card-text" style={{ marginTop: 6 }}>{r.text}</div>}
        </div>
      </div>

      <div className="reviews-slider-nav">
        <button
          type="button"
          className="btn secondary reviews-slider-btn"
          onClick={goPrev}
          disabled={clampedIndex <= 0}
          aria-label="Предыдущий отзыв"
        >
          ←
        </button>
        <span className="reviews-slider-dots" aria-live="polite">
          {reviews.map((_, i) => (
            <button
              key={i}
              type="button"
              className={`reviews-slider-dot ${i === clampedIndex ? "active" : ""}`}
              onClick={() => setCurrentIndex(i)}
              aria-label={`Отзыв ${i + 1} из ${reviews.length}`}
              aria-current={i === clampedIndex ? "true" : undefined}
            />
          ))}
        </span>
        <button
          type="button"
          className="btn secondary reviews-slider-btn"
          onClick={goNext}
          disabled={clampedIndex >= reviews.length - 1}
          aria-label="Следующий отзыв"
        >
          →
        </button>
      </div>
      <p className="muted reviews-slider-counter" style={{ marginTop: 6, marginBottom: 0, fontSize: 13 }}>
        {clampedIndex + 1} из {reviews.length}
      </p>
    </div>
  );
}
