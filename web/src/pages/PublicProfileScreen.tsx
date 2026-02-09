import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { ErrorBox } from "../components/ErrorBox";
import { formatDate } from "../lib/format";
import { getAvatarSrc } from "../lib/avatar";
import type { PublicProfile, ReviewListItem } from "../types";

export function PublicProfileScreen() {
  const params = useParams();
  const profileId = params.id!;
  const { activeProfileId, token, authedGet, navigate } = useApp();
  const [p, setP] = useState<PublicProfile | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [reviews, setReviews] = useState<ReviewListItem[] | null>(null);
  const [reviewsErr, setReviewsErr] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      setErr(null);
      setP(null);
      try {
        const data = await authedGet<PublicProfile>(`/profiles/${profileId}`);
        setP(data);
      } catch (e: unknown) {
        setErr(e instanceof Error ? e.message : "Не удалось загрузить профиль");
      }
    };
    void run();
  }, [profileId, activeProfileId, authedGet]);

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

  if (err) return <ErrorBox error={err} />;
  if (!p) return <div className="card">Загрузка…</div>;

  const title = p.displayName ?? p.user?.username ?? "Профиль";
  const tgUsername = p.user?.username?.trim() || null;
  const tgUrl = tgUsername ? `https://t.me/${tgUsername}` : null;
  const avatarSrc = getAvatarSrc(p.avatarUrl, p.user?.photoUrl, p.gender);

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div className="card">
        <div className="row" style={{ alignItems: "flex-start", gap: 16 }}>
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: "50%",
              overflow: "hidden",
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "var(--tg-theme-secondary-bg-color, #eee)",
            }}
          >
            <img src={avatarSrc} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="row">
              <div className="h2" style={{ margin: 0 }}>
                {title}
              </div>
              <div className="spacer" />
              <div className="muted">
                ★ {p.ratingAvg} ({p.ratingCount})
              </div>
            </div>
            <div className="muted" style={{ marginTop: 6 }}>
              {p.city && <span>Город: {p.city}</span>}
              {p.city && p.district && " · "}
              {p.district && <span>Район: {p.district}</span>}
              {!p.city && !p.district && "—"}
            </div>
            {p.age != null && p.age > 0 && (
              <div className="muted" style={{ marginTop: 4 }}>
                Возраст: {p.age} лет
              </div>
            )}
          </div>
        </div>
        {p.type === "specialist" && (
          <>
            {p.specialist?.pricePerHour != null && (
              <div className="muted" style={{ marginTop: 10 }}>
                Цена: {p.specialist.pricePerHour} ₽/час
              </div>
            )}
            {(p.specialist?.about ?? "").trim() && (
              <div style={{ marginTop: 12 }}>
                <div className="label" style={{ marginBottom: 6 }}>
                  О специалисте
                </div>
                <div style={{ whiteSpace: "pre-wrap" }}>{(p.specialist?.about ?? "").trim()}</div>
              </div>
            )}
          </>
        )}
        {p.type === "parent" && (p.parent?.childrenAges?.length || p.parent?.specialWishes) && (
          <div style={{ marginTop: 12 }}>
            {p.parent.childrenAges && p.parent.childrenAges.length > 0 && (
              <div className="muted" style={{ marginTop: 6 }}>
                Возраст детей: {p.parent.childrenAges.join(", ")}
              </div>
            )}
            {p.parent.specialWishes && <div style={{ marginTop: 6 }}>{p.parent.specialWishes}</div>}
          </div>
        )}
        <div className="row" style={{ marginTop: 16, flexWrap: "wrap", gap: 8 }}>
          {tgUrl ? (
            <a className="btn btn-primary" href={tgUrl} target="_blank" rel="noreferrer">
              Написать в Telegram
            </a>
          ) : (
            <span className="muted" style={{ alignSelf: "center" }}>
              Контакты в Telegram не указаны
            </span>
          )}
          <button className="btn secondary" onClick={() => navigate(-1)}>
            Назад
          </button>
        </div>
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
          <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
            {reviews.map((r) => (
              <div key={r.id} className="card" style={{ background: "var(--tg-bg)" }}>
                <div className="row">
                  <div style={{ fontWeight: 900 }}>★ {r.rating}</div>
                  <div className="spacer" />
                  <div className="muted">{formatDate(r.createdAt)}</div>
                </div>
                {r.text && <div style={{ marginTop: 8 }}>{r.text}</div>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
