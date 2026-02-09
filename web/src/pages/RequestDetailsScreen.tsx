import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { ErrorBox } from "../components/ErrorBox";
import { formatMoney, formatDate, formatOfferCreatedAt } from "../lib/format";
import { labelRequestStatus, labelOfferStatus } from "../lib/labels";
import { getAvatarSrc } from "../lib/avatar";
import { getCategoryIcon } from "../constants/feed";
import type { RequestDetails as RequestDetailsType } from "../types";

export function RequestDetailsScreen() {
  const params = useParams();
  const requestId = params.id!;
  const { activeProfileId, activeProfileType, authedGet, authedPost, authedDelete, navigate, refreshParentNewOffersCount } = useApp();
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

  useEffect(() => {
    const run = async () => {
      setErr(null);
      setData(null);
      setReviewOk(null);
      try {
        const r = await authedGet<RequestDetailsType>(`/requests/${requestId}`);
        setData(r);
        void refreshParentNewOffersCount();
      } catch (e: unknown) {
        setErr(e instanceof Error ? e.message : "Failed to load request");
      }
    };
    void run();
  }, [requestId, activeProfileId, authedGet, refreshParentNewOffersCount]);

  const sendOffer = async () => {
    setActionErr(null);
    setSending(true);
    try {
      await authedPost(`/requests/${requestId}/offers`, {
        priceOffer: offerPrice ? Number(offerPrice) : null,
        comment: offerComment || null,
      });
      const r = await authedGet<RequestDetailsType>(`/requests/${requestId}`);
      setData(r);
    } catch (e: unknown) {
      setActionErr(e instanceof Error ? e.message : "Failed to send offer");
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
  const parentAvatarSrc = getAvatarSrc(
    data.parent.avatarUrl ?? null,
    data.parent.photoUrl ?? null,
    data.parent.gender ?? null,
  );
  const categoryIcon = getCategoryIcon(data.category);

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div className="card profile-card card--status-top">
        <div className="pill pill--top-right">{labelRequestStatus(data.status)}</div>
        <div className="profile-card-header">
          <div className="profile-card-avatar-wrap">
            <div className="profile-card-avatar">
              <img src={parentAvatarSrc} alt="" />
            </div>
            {categoryIcon && (
              <div className="profile-card-category-badge" title={data.category}>
                <img src={categoryIcon} alt="" />
              </div>
            )}
          </div>
          <div className="profile-card-title-block">
            <div className="profile-card-title-row">
              <h2 className="h2 profile-card-title" style={{ margin: 0 }}>
                {parentName}
              </h2>
            </div>
            <div className="profile-card-meta-block">
              <div className="profile-card-meta-row">
                <span className="profile-card-meta-label">Категория:</span>
                <strong className="profile-card-meta-value">{data.category}</strong>
              </div>
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
        {data.description && (
          <div className="profile-card-about" style={{ marginTop: 12 }}>
            <div className="profile-card-about-title">Описание</div>
            <div className="profile-card-about-text">{data.description}</div>
          </div>
        )}
        {activeProfileType === "parent" && (
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
              Удалить заявку
            </button>
          </div>
        )}
      </div>

      {actionErr && <ErrorBox error={actionErr} />}

      {activeProfileType === "specialist" &&
        (() => {
          const myOffer = data.offers.find((o) => o.specialistProfileId === activeProfileId);
          if (myOffer) {
            return (
              <div className="card" style={{ background: "var(--tg-bg)" }}>
                <div className="h2">Вы уже откликнулись</div>
                <div className="muted" style={{ marginTop: 8 }}>
                  Цена: {formatMoney(myOffer.priceOffer)} · {labelOfferStatus(myOffer.status)}
                </div>
                {myOffer.comment && <div style={{ marginTop: 8 }}>{myOffer.comment}</div>}
              </div>
            );
          }
          return (
            <div className="card">
              <div className="h2">Откликнуться</div>
              <div style={{ display: "grid", gap: 12, marginTop: 10 }}>
                <div className="field">
                  <div className="label">Цена (₽)</div>
                  <input className="input" value={offerPrice} onChange={(e) => setOfferPrice(e.target.value)} inputMode="numeric" />
                </div>
                <div className="field">
                  <div className="label">Комментарий</div>
                  <textarea className="textarea" value={offerComment} onChange={(e) => setOfferComment(e.target.value)} />
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
            </div>
          );
        })()}

      {activeProfileType === "parent" && (
        <div className="card">
          <div className="row">
            <div className="h2">Отклики</div>
            <div className="spacer" />
            {accepted?.specialist.username && (
              <a className="btn secondary" href={`https://t.me/${accepted.specialist.username}`} target="_blank" rel="noreferrer">
                Написать
              </a>
            )}
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
          <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
            {data.offers.map((o) => (
              <div key={o.id} className="card" style={{ background: "var(--tg-bg)" }}>
                <div className="row" style={{ alignItems: "flex-start", gap: 12 }}>
                  <img
                    src={getAvatarSrc(o.specialist.avatarUrl, o.specialist.photoUrl, o.specialist.gender)}
                    alt=""
                    style={{ width: 48, height: 48, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
                  />
                  <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
                    <div style={{ fontWeight: 800 }}>
                      {o.specialist.displayName ?? o.specialist.username ?? "Специалист"}
                    </div>
                    <div className="muted" style={{ fontSize: 13 }}>
                      {formatOfferCreatedAt(o.createdAt)}
                    </div>
                    <div style={{ marginTop: 4 }} className="muted">
                      {labelOfferStatus(o.status)}
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 10 }}>
                  <div className="muted" style={{ fontSize: 13 }}>
                    <div>Город: {o.specialist.city ?? "—"}</div>
                    <div>Район: {o.specialist.district ?? "—"}</div>
                    <div>
                      Пол: {o.specialist.gender === "female" ? "Женский" : o.specialist.gender === "male" ? "Мужской" : "—"}
                    </div>
                    {o.specialist.age != null && <div>Возраст: {o.specialist.age}</div>}
                  </div>
                  <div className="muted" style={{ marginTop: 4 }}>
                    Цена: {formatMoney(o.priceOffer)}
                  </div>
                </div>
                {o.comment && <div style={{ marginTop: 8 }}>{o.comment}</div>}
                <div className="row" style={{ marginTop: 10 }}>
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
                  <div className="spacer" />
                  {o.specialist.username && (
                    <a className="btn ghost" href={`https://t.me/${o.specialist.username}`} target="_blank" rel="noreferrer">
                      Профиль TG
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
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
                {activeProfileType === "specialist" && (
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
