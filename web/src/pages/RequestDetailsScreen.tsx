import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { ErrorBox } from "../components/ErrorBox";
import { PaginationBar, ITEMS_PER_PAGE } from "../components/PaginationBar";
import { ReviewsSlider } from "../components/ReviewsSlider";
import { formatMoney, formatDate, formatOfferCreatedAt, formatPhoneForDisplay, formatPhoneToDigits } from "../lib/format";
import { labelRequestStatus, labelOfferStatus } from "../lib/labels";
import { AvatarImage } from "../components/AvatarImage";
import { getCategoryIcon, getCategoryDisplayText } from "../constants/feed";
import { CategoryDisplay } from "../components/CategoryDisplay";
import { ImageSlider } from "../components/ImageSlider";
import { openContactUrl } from "../shared/openContactUrl";
import type { RequestDetails as RequestDetailsType, ReviewListItem } from "../types";

export function RequestDetailsScreen() {
  const params = useParams();
  const requestId = params.id!;
  const { activeProfileId, activeProfileType, authedGet, authedPost, authedDelete, navigate, refreshParentNewOffersCount, isAdmin, platform, isMiniApp } = useApp();
  const [data, setData] = useState<RequestDetailsType | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const [offerPrice, setOfferPrice] = useState("");
  const [offerComment, setOfferComment] = useState("");
  const [sending, setSending] = useState(false);
  const [actionErr, setActionErr] = useState<string | null>(null);

  const [reviewRating, setReviewRating] = useState(5);
  const [reviewText, setReviewText] = useState("");
  const [reviewSending, setReviewSending] = useState(false);
  const [reviewOk, setReviewOk] = useState<string | null>(null);

  const [offersPage, setOffersPage] = useState(1);
  const [parentReviews, setParentReviews] = useState<ReviewListItem[] | null>(null);
  const [parentReviewsErr, setParentReviewsErr] = useState<string | null>(null);
  const offers = data?.offers ?? [];
  const offersTotalPages = Math.max(1, Math.ceil(offers.length / ITEMS_PER_PAGE));
  const offersPaginated = useMemo(
    () => offers.slice((offersPage - 1) * ITEMS_PER_PAGE, offersPage * ITEMS_PER_PAGE),
    [offers, offersPage],
  );
  useEffect(() => {
    setOffersPage(1);
  }, [offers.length]);

  useEffect(() => {
    const run = async () => {
      setErr(null);
      setData(null);
      setReviewOk(null);
      setParentReviews(null);
      setParentReviewsErr(null);
      try {
        const r = await authedGet<RequestDetailsType>(`/requests/${requestId}`);
        setData(r);
        void refreshParentNewOffersCount();
        if (activeProfileType === "specialist" || activeProfileType === "company") {
          void authedPost(`/requests/${requestId}/view`, {}).catch(() => {});
        }
      } catch (e: unknown) {
        setErr(e instanceof Error ? e.message : "Failed to load request");
      }
    };
    void run();
  }, [requestId, activeProfileId, authedGet, refreshParentNewOffersCount, activeProfileType, authedPost]);

  useEffect(() => {
    if (!data?.parent?.profileId || activeProfileId === data.parent.profileId) {
      setParentReviews(null);
      setParentReviewsErr(null);
      return;
    }
    const profileId = data.parent.profileId;
    let cancelled = false;
    setParentReviewsErr(null);
    setParentReviews(null);
    authedGet<ReviewListItem[]>(`/profiles/${profileId}/reviews`)
      .then((list) => {
        if (!cancelled) setParentReviews(list);
      })
      .catch((e: unknown) => {
        if (!cancelled) setParentReviewsErr(e instanceof Error ? e.message : "Не удалось загрузить отзывы");
      });
    return () => {
      cancelled = true;
    };
  }, [data?.parent?.profileId, activeProfileId, authedGet]);

  const sendOffer = async () => {
    setActionErr(null);
    const comment = offerComment.trim();
    if (!comment) {
      setActionErr("Напишите комментарий к отклику");
      return;
    }
    if (comment.length < 10) {
      setActionErr("Комментарий должен быть не короче 10 символов");
      return;
    }
    const priceNum = offerPrice.trim() === "" ? NaN : Number(offerPrice);
    if (Number.isNaN(priceNum) || priceNum < 0) {
      setActionErr("Укажите цену (число 0 или больше)");
      return;
    }
    setSending(true);
    try {
      await authedPost(`/requests/${requestId}/offers`, {
        priceOffer: priceNum,
        comment,
      });
      const r = await authedGet<RequestDetailsType>(`/requests/${requestId}`);
      setData(r);
    } catch (e: unknown) {
      setActionErr(e instanceof Error ? e.message : "Не удалось отправить отклик");
    } finally {
      setSending(false);
    }
  };

  const acceptOffer = async (offerId: string) => {
    setActionErr(null);
    try {
      await authedPost(`/offers/${offerId}/accept`, {});
      const r = await authedGet<RequestDetailsType>(`/requests/${requestId}`);
      setData(r);
    } catch (e: unknown) {
      setActionErr(e instanceof Error ? e.message : "Failed to accept offer");
    }
  };

  const rejectOffer = async (offerId: string) => {
    setActionErr(null);
    try {
      await authedPost(`/offers/${offerId}/reject`, {});
      const r = await authedGet<RequestDetailsType>(`/requests/${requestId}`);
      setData(r);
    } catch (e: unknown) {
      setActionErr(e instanceof Error ? e.message : "Failed to reject offer");
    }
  };

  const completeRequest = async () => {
    setActionErr(null);
    try {
      await authedPost(`/requests/${requestId}/complete`, {});
      const r = await authedGet<RequestDetailsType>(`/requests/${requestId}`);
      setData(r);
    } catch (e: unknown) {
      setActionErr(e instanceof Error ? e.message : "Failed to complete request");
    }
  };

  const sendReview = async (toProfileId: string) => {
    setActionErr(null);
    setReviewOk(null);
    setReviewSending(true);
    try {
      await authedPost(`/reviews`, {
        toProfileId,
        requestId,
        rating: reviewRating,
        text: reviewText || null,
      });
      setReviewOk("Отзыв отправлен");
      const updated = await authedGet<RequestDetailsType>(`/requests/${requestId}`);
      setData(updated);
    } catch (e: unknown) {
      setActionErr(e instanceof Error ? e.message : "Failed to create review");
    } finally {
      setReviewSending(false);
    }
  };

  if (err) return <ErrorBox error={err} />;
  if (!data) return <div className="card">Загрузка…</div>;

  const accepted = data.offers.find((o) => o.status === "accepted") ?? null;
  const reviewAvailable = data.status === "done" && accepted && !data.currentUserHasReviewed;

  const parentName =
    data.parent.displayName?.trim() ||
    (data.parent.firstName || data.parent.lastName
      ? [data.parent.firstName, data.parent.lastName].filter(Boolean).join(" ")
      : null) ||
    "Родитель";
  const categoryIcon = getCategoryIcon(data.category);
  const isCompleted = data.status === "done" || data.status === "cancelled";

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div className={`card profile-card ${isCompleted ? "card--completed" : ""}`}>
        <div className={isCompleted ? "card__content" : undefined}>
        <div className="profile-card-header">
          <div className="profile-card-avatar-wrap">
            <div className="profile-card-avatar">
              <AvatarImage
                avatarUrl={data.parent.avatarUrl ?? null}
                telegramPhotoUrl={data.parent.photoUrl ?? null}
                gender={data.parent.gender ?? null}
              />
            </div>
            {categoryIcon && (
              <div className="profile-card-category-badge" title={getCategoryDisplayText(data.category)}>
                <img src={categoryIcon} alt="" />
              </div>
            )}
          </div>
          <div className="profile-card-title-block">
            <div className="profile-card-title-row">
              <h2 className="h2 profile-card-title" style={{ margin: 0 }}>
                {parentName}
              </h2>
              <div className="spacer" />
              <div className="pill">{labelRequestStatus(data.status)}</div>
            </div>
            <div className="profile-card-rating" style={{ marginTop: 6 }}>
              {(data.parent.ratingCount != null && data.parent.ratingCount > 0) ? (
                <>
                  <span className="rating-star">★</span>{" "}
                  {data.parent.ratingAvg ?? "0"} ({data.parent.ratingCount})
                </>
              ) : (
                <span className="muted">Рейтинг заказчика: пока нет отзывов</span>
              )}
            </div>
            <div className="profile-card-meta-block">
              <CategoryDisplay category={data.category} />
              {(activeProfileType === "specialist" || activeProfileType === "company") && data.parent.childrenAges != null && data.parent.childrenAges.length > 0 && (
                <div className="profile-card-meta-row">
                  <span className="profile-card-meta-label">Возраст детей:</span>
                  <span className="profile-card-meta-value">{data.parent.childrenAges.join(", ")}</span>
                </div>
              )}
              {(activeProfileType === "specialist" || activeProfileType === "company") && data.parent.specialWishes != null && data.parent.specialWishes.trim() !== "" && (
                <div className="profile-card-meta-row">
                  <span className="profile-card-meta-label">Пожелания:</span>
                  <span className="profile-card-meta-value">{data.parent.specialWishes}</span>
                </div>
              )}
              <div className="profile-card-meta-row">
                <span className="profile-card-meta-label">Район:</span>
                <span className="profile-card-meta-value">{data.district ?? "—"}</span>
              </div>
              <div className="profile-card-meta-row">
                <span className="profile-card-meta-label">Бюджет:</span>
                <strong className="profile-card-meta-value">{formatMoney(data.budget)}</strong>
              </div>
              <div className="profile-card-meta-row">
                <span className="profile-card-meta-label">Создано:</span>
                <span className="profile-card-meta-value">{formatDate(data.createdAt)}</span>
              </div>
            </div>
          </div>
        </div>
        {(activeProfileType === "specialist" || activeProfileType === "company") && data.parent.contactPhone != null && data.parent.contactPhone.trim() !== "" && (
          <div className="profile-card-meta-block" style={{ marginTop: 8, paddingTop: 8, borderTop: "1px solid var(--border-color)" }}>
            <div className="profile-card-meta-row">
              <span className="profile-card-meta-label">Телефон для связи:</span>
              <a className="profile-card-meta-value" href={`tel:+${formatPhoneToDigits(data.parent.contactPhone)}`}>
                {formatPhoneForDisplay(data.parent.contactPhone)}
              </a>
            </div>
          </div>
        )}
        {data.images && data.images.length > 0 && (
          <div style={{ marginTop: 12 }}>
            <ImageSlider images={data.images} alt="Фото заявки" height={200} />
          </div>
        )}
        {data.description && (
          <div className="profile-card-about" style={{ marginTop: 12 }}>
            <div className="profile-card-about-title">Описание</div>
            <div className="profile-card-about-text">{data.description}</div>
          </div>
        )}
        </div>
        {(activeProfileType === "parent" || isAdmin) && (
          <div className="row" style={{ marginTop: 16 }}>
            <button
              type="button"
              className="btn danger"
              onClick={async () => {
                if (!confirm("Удалить заявку? Отклики тоже будут удалены.")) return;
                try {
                  await authedDelete(`/requests/${requestId}`);
                  navigate("/requests", { replace: true });
                } catch (e: unknown) {
                  setActionErr(e instanceof Error ? e.message : "Не удалось удалить");
                }
              }}
            >
              {isAdmin ? "Удалить заявку (админ)" : "Удалить заявку"}
            </button>
          </div>
        )}
      </div>

      {/* Отзывы о заказчике — только для специалистов (не показываем создателю заявки) */}
      {data?.parent?.profileId && activeProfileId !== data.parent.profileId && (
        <div className="card">
          <div className="h2" style={{ margin: 0 }}>Отзывы о заказчике</div>
          <p className="muted" style={{ marginTop: 6, marginBottom: 0 }}>
            Отзывы других специалистов о работе с этим заказчиком.
          </p>
          {parentReviewsErr && <div className="muted" style={{ marginTop: 8 }}>{parentReviewsErr}</div>}
          {parentReviews === null && !parentReviewsErr && <div className="muted" style={{ marginTop: 8 }}>Загрузка отзывов…</div>}
          {parentReviews && parentReviews.length === 0 && (
            <div className="muted" style={{ marginTop: 8 }}>Пока нет отзывов от специалистов.</div>
          )}
          {parentReviews && parentReviews.length > 0 && (
            <>
              <ReviewsSlider reviews={parentReviews} authorFallbackLabel="Специалист" />
              <p className="muted" style={{ marginTop: 10, marginBottom: 0, fontSize: 13 }}>
                <Link to={`/profiles/${data.parent.profileId}`}>Профиль заказчика и все отзывы</Link>
              </p>
            </>
          )}
        </div>
      )}

      {actionErr && <ErrorBox error={actionErr} />}

      {(activeProfileType === "specialist" || activeProfileType === "company") &&
        (() => {
          const myOffer = data.offers.find((o) => o.specialistProfileId === activeProfileId);
          if (myOffer) {
            return (
              <div className="card card--filled">
                <div className="row" style={{ alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                  <div className="h2" style={{ margin: 0 }}>Вы уже откликнулись</div>
                  <div className="spacer" />
                  <div className="pill">{labelOfferStatus(myOffer.status)}</div>
                </div>
                <div className="muted" style={{ marginTop: 8 }}>Цена: {formatMoney(myOffer.priceOffer)}</div>
                {myOffer.comment && <div style={{ marginTop: 8 }}>{myOffer.comment}</div>}
              </div>
            );
          }
          return (
            <div className="card">
              <div className="h2">Откликнуться</div>
              <div style={{ display: "grid", gap: 12, marginTop: 10 }}>
                <div className="field">
                  <div className="label">Цена (₽) <span className="muted">(обязательно)</span></div>
                  <input className="input" value={offerPrice} onChange={(e) => setOfferPrice(e.target.value)} inputMode="numeric" placeholder="0 или сумма в рублях" />
                </div>
                <div className="field">
                  <div className="label">Комментарий <span className="muted">(не короче 10 символов)</span></div>
                  <textarea className="textarea" value={offerComment} onChange={(e) => setOfferComment(e.target.value)} placeholder="Напишите, почему вы подходите, опыт, условия" />
                </div>
                <div className="row offer-actions-row">
                  <button className="btn btn-primary" disabled={sending} onClick={() => void sendOffer()}>
                    {sending ? "Отправка…" : "Отправить отклик"}
                  </button>
                  <div className="spacer" />
                  <button className="btn secondary" onClick={() => navigate(-1)} disabled={sending}>
                    Назад
                  </button>
                </div>
              </div>
              <p className="muted service-disclaimer" style={{ marginTop: 12, marginBottom: 0, fontSize: 13 }}>
                Решение о сотрудничестве принимается пользователями самостоятельно. Сервис «Для мам» не участвует в оказании услуг.
              </p>
            </div>
          );
        })()}

      {activeProfileType === "parent" && (
        <div className="card">
          <div className="row">
            <div className="h2">Отклики</div>
          </div>

          {data.status === "in_progress" && (
            <div className="row" style={{ marginTop: 10 }}>
              <button className="btn btn-primary" onClick={() => void completeRequest()} disabled={!accepted}>
                Завершить заявку
              </button>
              <div className="spacer" />
              <div className="muted">
                {accepted ? "После завершения можно оставить отзыв." : "Сначала нужно принять отклик."}
              </div>
            </div>
          )}

          {data.offers.length === 0 && <div className="muted" style={{ marginTop: 8 }}>Пока нет откликов.</div>}
          {data.offers.length > 0 && (
            <>
          <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
            {offersPaginated.map((o) => (
              <div key={o.id} className="card offer-card" style={{ background: "var(--tg-bg)" }}>
                <div className="row" style={{ alignItems: "flex-start", gap: 12 }}>
                  <div style={{ width: 48, height: 48, borderRadius: "50%", overflow: "hidden", background: "#fff", flexShrink: 0 }}>
                    <AvatarImage
                      avatarUrl={o.specialist.avatarUrl}
                      telegramPhotoUrl={o.specialist.photoUrl}
                      gender={o.specialist.gender}
                      profileType={o.specialist.type}
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                  </div>
                  <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
                    <div className="row" style={{ alignItems: "center", gap: 8 }}>
                      <span style={{ fontWeight: 800 }}>
                        {o.specialist.displayName ?? o.specialist.username ?? "Специалист"}
                      </span>
                      <div className="spacer" />
                      <span className="offer-card-status">{labelOfferStatus(o.status)}</span>
                    </div>
                    <div className="muted" style={{ fontSize: 13 }}>
                      {formatOfferCreatedAt(o.createdAt)}
                    </div>
                  </div>
                </div>
                <div className="offer-card-meta">
                  <div className="offer-card-meta-row">
                    <span className="offer-card-meta-label">Город:</span>
                    <span className="offer-card-meta-value">{o.specialist.city ?? "—"}</span>
                  </div>
                  <div className="offer-card-meta-row">
                    <span className="offer-card-meta-label">Район:</span>
                    <span className="offer-card-meta-value">{o.specialist.district ?? "—"}</span>
                  </div>
                  <div className="offer-card-meta-row">
                    <span className="offer-card-meta-label">Пол:</span>
                    <span className="offer-card-meta-value">
                      {o.specialist.gender === "female" ? "Женский" : o.specialist.gender === "male" ? "Мужской" : "—"}
                    </span>
                  </div>
                  {o.specialist.age != null && (
                    <div className="offer-card-meta-row">
                      <span className="offer-card-meta-label">Возраст:</span>
                      <span className="offer-card-meta-value">{o.specialist.age}</span>
                    </div>
                  )}
                  {(o.specialist.contactPhone != null && o.specialist.contactPhone.trim() !== "") && (
                    <div className="offer-card-meta-row offer-card-contact-phone-row">
                      <span className="offer-card-meta-label">Номер для связи:</span>
                      <span className="offer-card-meta-value offer-card-phone-value">
                        <span className="offer-card-phone-icon" aria-hidden>
                          <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14">
                            <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" />
                          </svg>
                        </span>
                        <a className="offer-card-phone-link" href={`tel:+${formatPhoneToDigits(o.specialist.contactPhone)}`}>
                          {formatPhoneForDisplay(o.specialist.contactPhone)}
                        </a>
                      </span>
                    </div>
                  )}
                  <div className="offer-card-meta-row" style={{ marginTop: 4 }}>
                    <span className="offer-card-meta-label">Цена:</span>
                    <span className="offer-card-meta-value">{formatMoney(o.priceOffer)}</span>
                  </div>
                </div>
                {o.comment && <div style={{ marginTop: 8 }}>{o.comment}</div>}
                <div className="row offer-card-actions-row" style={{ marginTop: 10 }}>
                  {!accepted ? (
                    <>
                      <button className="btn btn-success" onClick={() => void acceptOffer(o.id)} disabled={o.status !== "pending"}>
                        Принять
                      </button>
                      <button className="btn danger" onClick={() => void rejectOffer(o.id)} disabled={o.status !== "pending"}>
                        Отклонить
                      </button>
                    </>
                  ) : (
                    <div className="muted">Исполнитель уже выбран</div>
                  )}
                  {(() => {
                    const specialistMaxUrl = (o.specialist as unknown as { maxProfileUrl?: string | null }).maxProfileUrl?.trim() || null;
                    const contactUrl = platform === "max" && specialistMaxUrl ? specialistMaxUrl : (o.specialist.username ? `https://t.me/${o.specialist.username}` : null);
                    if (!contactUrl) return null;
                    return isMiniApp ? (
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
                        {platform === "max" ? "Связаться через MAX" : "Написать в Telegram"}
                      </button>
                    ) : (
                      <a
                        className="btn btn-telegram btn-with-icon"
                        href={contactUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <span className="btn-icon-telegram" aria-hidden>
                          <svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                            <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
                          </svg>
                        </span>
                        {platform === "max" ? "Связаться через MAX" : "Написать в Telegram"}
                      </a>
                    );
                  })()}
                </div>
              </div>
            ))}
          </div>
          <PaginationBar
            currentPage={offersPage}
            totalPages={offersTotalPages}
            onPrev={() => setOffersPage((p) => Math.max(1, p - 1))}
            onNext={() => setOffersPage((p) => Math.min(offersTotalPages, p + 1))}
          />
              <p className="muted service-disclaimer" style={{ marginTop: 16, marginBottom: 0, fontSize: 13 }}>
                Решение о сотрудничестве принимается пользователями самостоятельно. Сервис «Для мам» не участвует в оказании услуг.
              </p>
            </>
          )}
        </div>
      )}

      {accepted && data.status === "done" && (
        <div className="card">
          <div className="h2">Отзыв</div>
          {data.currentUserHasReviewed && !reviewOk && (
            <div className="muted" style={{ marginTop: 8 }}>Вы уже оставили отзыв по этой заявке.</div>
          )}
          {reviewOk && <div className="muted" style={{ marginTop: 8 }}>{reviewOk}</div>}

          {reviewAvailable && (
            <div style={{ display: "grid", gap: 12, marginTop: 10 }}>
              <div className="field">
                <div className="label">Оценка</div>
                <select className="select" value={reviewRating} onChange={(e) => setReviewRating(Number(e.target.value))}>
                  {[5, 4, 3, 2, 1].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <div className="label">Текст (необязательно)</div>
                <textarea className="textarea" value={reviewText} onChange={(e) => setReviewText(e.target.value)} />
              </div>
              <div className="row">
                {activeProfileType === "parent" && (
                  <button
                    className="btn btn-primary"
                    disabled={reviewSending}
                    onClick={() => void sendReview(accepted.specialist.profileId)}
                  >
                    {reviewSending ? "Отправка…" : "Оставить отзыв специалисту"}
                  </button>
                )}
                {(activeProfileType === "specialist" || activeProfileType === "company") && (
                  <button
                    className="btn btn-primary"
                    disabled={reviewSending}
                    onClick={() => void sendReview(data.parent.profileId)}
                  >
                    {reviewSending ? "Отправка…" : "Оставить отзыв родителю"}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
