import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { getJSON } from "../shared/api";
import { ErrorBox } from "../components/ErrorBox";
import { ReviewsSlider } from "../components/ReviewsSlider";
import { AvatarImage } from "../components/AvatarImage";
import { formatPricePerHour } from "../lib/format";
import { getCategoryIcon, getCategoryDisplayText } from "../constants/feed";
import { CategoryDisplay } from "../components/CategoryDisplay";
import { ImageSlider } from "../components/ImageSlider";
import { getParentRoleLabel } from "../lib/labels";
import { getContactButtonText, openContactUrl } from "../shared/openContactUrl";
import type { PublicProfile, ReviewListItem } from "../types";

export function PublicProfileScreen() {
  const params = useParams();
  const profileId = params.id!;
  const { activeProfileId, activeProfile, token, authedGet, navigate, platform, isMiniApp } = useApp();
  const [p, setP] = useState<PublicProfile | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [reviews, setReviews] = useState<ReviewListItem[] | null>(null);
  const [reviewsErr, setReviewsErr] = useState<string | null>(null);
  useEffect(() => {
    const run = async () => {
      setErr(null);
      setP(null);
      try {
        const data = token
          ? await authedGet<PublicProfile>(`/profiles/${profileId}`)
          : await getJSON<PublicProfile>(`/profiles/${profileId}`);
        setP(data);
      } catch (e: unknown) {
        setErr(e instanceof Error ? e.message : "Не удалось загрузить профиль");
      }
    };
    void run();
  }, [profileId, activeProfileId, token, authedGet]);

  useEffect(() => {
    let cancelled = false;
    setReviewsErr(null);
    setReviews(null);
    const run = async () => {
      if (!token) {
        setReviews([]);
        setReviewsErr("Нет авторизации");
        return;
      }
      try {
        const timeout = new Promise<never>((_, rej) =>
          setTimeout(() => rej(new Error("Таймаут загрузки отзывов")), 12000),
        );
        const items = await Promise.race([
          authedGet<ReviewListItem[]>(`/profiles/${profileId}/reviews`),
          timeout,
        ]);
        if (cancelled) return;
        setReviews(Array.isArray(items) ? items : []);
      } catch (e: unknown) {
        if (cancelled) return;
        setReviewsErr(e instanceof Error ? e.message : "Не удалось загрузить отзывы");
        setReviews([]);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [profileId, token, authedGet]);

  const reviewsList = reviews ?? [];

  if (err) return <ErrorBox error={err} />;
  if (!p) return <div className="card">Загрузка…</div>;

  const title =
    p.type === "company" && p.company?.companyName
      ? p.company.companyName
      : (p.displayName ?? p.user?.username ?? "Профиль");
  const parentRoleLabel = p.type === "parent" ? getParentRoleLabel(p.gender) : p.type === "company" ? "Компания" : null;
  const tgUsername = p.user?.username?.trim() || null;
  const tgUrl = tgUsername ? `https://t.me/${tgUsername}` : null;
  const maxProfileUrl = p.user?.maxProfileUrl?.trim() || null;
  const contactUrl =
    platform === "max" && maxProfileUrl
      ? maxProfileUrl
      : tgUrl;
  const genderLabel = p.gender === "male" ? "Мужской" : p.gender === "female" ? "Женский" : "—";
  const category = (p.type === "specialist" || p.type === "company") ? p.specialist?.category ?? null : null;
  const categoryIcon = getCategoryIcon(category);

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div className="card profile-card">
        <div className="profile-card-header">
          <div className="profile-card-avatar-wrap">
            <div className="profile-card-avatar">
              <AvatarImage avatarUrl={p.avatarUrl} telegramPhotoUrl={p.user?.photoUrl} gender={p.gender} profileType={p.type} />
            </div>
            {(p.type === "specialist" || p.type === "company") && categoryIcon && (
              <div className="profile-card-category-badge" title={getCategoryDisplayText(category)}>
                <img src={categoryIcon} alt="" />
              </div>
            )}
          </div>
          <div className="profile-card-title-block">
            <div className="profile-card-title-row">
              <h2 className="h2 profile-card-title" style={{ margin: 0 }}>
                {title}
              </h2>
              <div className="profile-card-rating">
                <span className={p.ratingCount > 0 ? "rating-star" : "rating-star rating-star--empty"}>★</span>{" "}
                {p.ratingAvg} ({p.ratingCount})
              </div>
            </div>
            {parentRoleLabel && (
              <p className="muted profile-card-role-label" style={{ margin: "2px 0 0", fontSize: 14 }}>
                {parentRoleLabel}
              </p>
            )}
            <div className="profile-card-meta-block">
              {(p.type === "specialist" || p.type === "company") && <CategoryDisplay category={category} />}
              <div className="profile-card-meta-row">
                <span className="profile-card-meta-label">город, район:</span>
                <span className="profile-card-meta-value">
                  {[p.city, p.district].filter(Boolean).join(", ") || "—"}
                </span>
              </div>
              {p.type !== "company" && (
                <>
                  <div className="profile-card-meta-row">
                    <span className="profile-card-meta-label">Возраст:</span>
                    <span className="profile-card-meta-value">{p.age != null && p.age > 0 ? `${p.age} лет` : "—"}</span>
                  </div>
                  <div className="profile-card-meta-row">
                    <span className="profile-card-meta-label">Пол:</span>
                    <strong className="profile-card-meta-value">{genderLabel}</strong>
                  </div>
                </>
              )}
              {p.type === "company" && p.company && (
                <>
                  <div className="profile-card-meta-row">
                    <span className="profile-card-meta-label">ИНН:</span>
                    <span className="profile-card-meta-value">{p.company.inn || "—"}</span>
                  </div>
                  {p.company.legalAddress && (
                    <div className="profile-card-meta-row">
                      <span className="profile-card-meta-label">Юридический адрес:</span>
                      <span className="profile-card-meta-value">{p.company.legalAddress}</span>
                    </div>
                  )}
                </>
              )}
              {(p.type === "specialist" || p.type === "company") && (
                <div className="profile-card-meta-row">
                  <span className="profile-card-meta-label">цена за час:</span>
                  <strong className="profile-card-meta-value profile-card-meta-value--price">
                    {formatPricePerHour(p.specialist?.pricePerHour)}
                    {typeof p.specialist?.pricePerHour === "number" && p.specialist.pricePerHour > 0 ? " /час" : ""}
                  </strong>
                </div>
              )}
            </div>
          </div>
        </div>
        {(p.type === "specialist" || p.type === "company") && p.specialist?.portfolioImageUrls && p.specialist.portfolioImageUrls.length > 0 && (
          <div style={{ marginTop: 12 }}>
            <ImageSlider images={p.specialist.portfolioImageUrls} alt="Фото в анкете" height={200} />
          </div>
        )}
        {(p.type === "specialist" || p.type === "company") && (p.specialist?.about ?? "").trim() && (
          <div className="profile-card-about">
            <div className="profile-card-about-title">{p.type === "company" ? "О компании" : "О специалисте"}</div>
            <div className="profile-card-about-text">{(p.specialist?.about ?? "").trim()}</div>
          </div>
        )}
        {p.type === "parent" && (p.parent?.childrenAges?.length || p.parent?.specialWishes) && (
          <div className="profile-card-extra">
            {p.parent.childrenAges && p.parent.childrenAges.length > 0 && (
              <div className="profile-card-meta-row">
                <span className="profile-card-meta-label">Возраст детей:</span>
                <span className="profile-card-meta-value">{p.parent.childrenAges.join(", ")}</span>
              </div>
            )}
            {p.parent.specialWishes && (
              <div className="profile-card-meta-row">
                <span className="profile-card-meta-label">Пожелания:</span>
                <span className="profile-card-meta-value">{p.parent.specialWishes}</span>
              </div>
            )}
          </div>
        )}
        <div className="profile-card-actions row">
          {!activeProfile ? (
            <p className="muted" style={{ margin: 0, alignSelf: "center", fontSize: 14 }}>
              Для связи и просмотра контактов авторизуйтесь.
            </p>
          ) : contactUrl ? (
            isMiniApp ? (
              <button
                type="button"
                className="btn btn-telegram btn-with-icon"
                onClick={() => openContactUrl(contactUrl)}
              >
                <span className="btn-icon-telegram" aria-hidden>
                  <svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                    <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
                  </svg>
                </span>
                {getContactButtonText(contactUrl, platform)}
              </button>
            ) : (
              <a className="btn btn-telegram btn-with-icon" href={contactUrl} target="_blank" rel="noreferrer">
                <span className="btn-icon-telegram" aria-hidden>
                  <svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                    <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
                  </svg>
                </span>
                {getContactButtonText(contactUrl, platform)}
              </a>
            )
          ) : (
            <span className="muted" style={{ alignSelf: "center" }}>
              {platform === "max" ? "Контакты не указаны" : "Контакты в Telegram не указаны"}
            </span>
          )}
          <div className="spacer" />
          <button type="button" className="btn secondary" onClick={() => navigate(-1)}>
            Назад
          </button>
        </div>
        {(p.type === "specialist" || p.type === "company") && (
          <p className="muted service-disclaimer" style={{ marginTop: 12, marginBottom: 0, fontSize: 12 }}>
            Фотографии и описания размещены пользователем. Сервис «Для мам» не проверяет достоверность и законность размещённых материалов.
          </p>
        )}
        {activeProfile && p.contactPhone && (
          <div className="muted" style={{ marginTop: 8, fontSize: 13 }}>
            Телефон для связи: <a href={`tel:${p.contactPhone.replace(/\s/g, "")}`}>{p.contactPhone}</a>
          </div>
        )}
      </div>

      <div className="card">
        <div className="h2">Отзывы</div>
        {reviewsErr && <div className="muted" style={{ marginTop: 8 }}>{reviewsErr}</div>}
        {!reviews && !reviewsErr && <div className="muted" style={{ marginTop: 8 }}>Загрузка…</div>}
        {reviews && reviews.length === 0 && (
          <div className="muted" style={{ marginTop: 8 }}>
            Пока нет отзывов.
          </div>
        )}
        {reviews && reviews.length > 0 && (
          <ReviewsSlider reviews={reviewsList} authorFallbackLabel="Пользователь" />
        )}
      </div>
    </div>
  );
}
