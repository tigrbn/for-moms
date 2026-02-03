import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, Route, Routes, useLocation, useNavigate, useParams } from "react-router-dom";
import { deleteJSON, getJSON, patchJSON, postJSON } from "./shared/api";
import { useTelegramAuth } from "./shared/useTelegramAuth";
import "./App.css";

type MeResponse = {
  user: {
    id: string;
    telegramId: string;
    firstName?: string | null;
    lastName?: string | null;
    username?: string | null;
    photoUrl?: string | null;
  };
  profiles: Array<{
    id: string;
    type: "parent" | "specialist" | "shop";
    isActive: boolean;
    displayName?: string | null;
    city?: string | null;
    district?: string | null;
  }>;
  activeProfileId: string | null;
};

type FeedResponse =
  | {
      role: "parent";
      items: Array<
        | { kind: "banner"; id: string; imageUrl: string; targetUrl?: string | null }
        | {
            kind: "specialist_profile";
            isPromoted: boolean;
            profile: {
              id: string;
              displayName?: string | null;
              avatarUrl?: string | null;
              city?: string | null;
              district?: string | null;
              ratingAvg: string;
              ratingCount: number;
              pricePerHour?: number | null;
            };
          }
      >;
    }
  | {
      role: "specialist";
      items: Array<
        | { kind: "banner"; id: string; imageUrl: string; targetUrl?: string | null }
        | {
            kind: "request";
            request: {
              id: string;
              category: string;
              childAge?: number | null;
              description?: string | null;
              startAt?: string | null;
              durationMin?: number | null;
              budget?: number | null;
              district?: string | null;
              status: "active" | "in_progress" | "done" | "cancelled";
              createdAt: string;
            };
          }
      >;
    };

type RequestMineItem = {
  id: string;
  status: "active" | "in_progress" | "done" | "cancelled";
  category: string;
  description?: string | null;
  startAt?: string | null;
  durationMin?: number | null;
  budget?: number | null;
  district?: string | null;
  createdAt: string;
  offersCount: number;
};

type OfferMineItem = {
  id: string;
  requestId: string;
  status: "pending" | "accepted" | "rejected" | "cancelled";
  priceOffer?: number | null;
  comment?: string | null;
  createdAt: string;
  request: {
    id: string;
    status: "active" | "in_progress" | "done" | "cancelled";
    category: string;
    district?: string | null;
    budget?: number | null;
    createdAt: string;
  };
};

type RequestDetails = {
  id: string;
  status: "active" | "in_progress" | "done" | "cancelled";
  category: string;
  childAge?: number | null;
  description?: string | null;
  startAt?: string | null;
  durationMin?: number | null;
  budget?: number | null;
  district?: string | null;
  createdAt: string;
  completedAt?: string | null;
  parent: {
    profileId: string;
    displayName?: string | null;
    city?: string | null;
    district?: string | null;
    username?: string | null;
    firstName?: string | null;
    lastName?: string | null;
  };
  offers: Array<{
    id: string;
    specialistProfileId: string;
    priceOffer?: number | null;
    comment?: string | null;
    status: "pending" | "accepted" | "rejected" | "cancelled";
    createdAt: string;
    specialist: {
      profileId: string;
      displayName?: string | null;
      city?: string | null;
      district?: string | null;
      username?: string | null;
      firstName?: string | null;
      lastName?: string | null;
      pricePerHour?: number | null;
    };
  }>;
};

type ReviewListItem = {
  id: string;
  rating: number;
  text?: string | null;
  createdAt: string;
  fromProfile: { id: string; type: "parent" | "specialist" | "shop" };
};

type PublicProfile = {
  id: string;
  type: "parent" | "specialist" | "shop";
  isActive: boolean;
  displayName?: string | null;
  avatarUrl?: string | null;
  city?: string | null;
  district?: string | null;
  ratingAvg: string;
  ratingCount: number;
  user: { username?: string | null; firstName?: string | null; lastName?: string | null };
  specialist: { pricePerHour?: number | null; about?: string | null } | null;
  parent: { childrenAges?: any; specialWishes?: string | null } | null;
  shop: { shopName?: string | null; logoUrl?: string | null; description?: string | null; address?: string | null; workHours?: string | null } | null;
};

function TopBar(props: { title: string; right?: React.ReactNode; sub?: React.ReactNode }) {
  return (
    <div className="card">
      <div className="row">
        <div>
          <div className="h1">{props.title}</div>
          {props.sub && <div className="muted" style={{ marginTop: 4 }}>{props.sub}</div>}
        </div>
        <div className="spacer" />
        {props.right}
      </div>
    </div>
  );
}

function ErrorBox({ error }: { error: string }) {
  return (
    <div className="card">
      <div className="h2">Ошибка</div>
      <pre style={{ whiteSpace: "pre-wrap", margin: "8px 0 0" }}>{error}</pre>
    </div>
  );
}

function formatMoney(x: number | null | undefined) {
  if (x == null) return "—";
  return `${x} ₽`;
}

function formatDate(iso?: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString();
}

function labelProfileType(t: "parent" | "specialist" | "shop") {
  if (t === "parent") return "👩‍🍼 Мама";
  if (t === "specialist") return "👩‍🏫 Специалист";
  return "🏪 Магазин";
}

function labelRequestStatus(s: "active" | "in_progress" | "done" | "cancelled") {
  if (s === "active") return "🟢 Активна";
  if (s === "in_progress") return "🟡 В работе";
  if (s === "done") return "✅ Завершена";
  return "⛔ Отменена";
}

function labelOfferStatus(s: "pending" | "accepted" | "rejected" | "cancelled") {
  if (s === "pending") return "🕓 Ожидает";
  if (s === "accepted") return "✅ Принят";
  if (s === "rejected") return "⛔ Отклонён";
  return "🚫 Отменён";
}

function hoursBetween(a: Date, b: Date) {
  return Math.abs(a.getTime() - b.getTime()) / (1000 * 60 * 60);
}

export default function App() {
  const { token, clearToken, loading, error } = useTelegramAuth();
  const [me, setMe] = useState<MeResponse | null>(null);
  const [meLoading, setMeLoading] = useState(false);
  const [meError, setMeError] = useState<string | null>(null);

  const [feed, setFeed] = useState<FeedResponse | null>(null);
  const [feedError, setFeedError] = useState<string | null>(null);
  const [feedDistrict, setFeedDistrict] = useState("");
  const [feedCategory, setFeedCategory] = useState("");
  const [feedReloadKey, setFeedReloadKey] = useState(0);
  const location = useLocation();
  const navigate = useNavigate();

  // kept for upcoming screens (profile editing, role-aware UI)
  const activeProfile = useMemo(() => {
    if (!me?.activeProfileId) return null;
    return me.profiles.find((p) => p.id === me.activeProfileId) ?? null;
  }, [me]);

  // Manual reset: open https://.../?reset=1
  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get("reset") === "1") {
      localStorage.removeItem("accessToken");
      url.searchParams.delete("reset");
      window.location.replace(url.toString());
    }
  }, []);

  useEffect(() => {
    const run = async () => {
      if (!token) return;
      setMeLoading(true);
      setMeError(null);
      try {
        const data = await getJSON<MeResponse>("/me", token);
        setMe(data);
      } catch (e: any) {
        const msg = e?.message ?? "Failed to load /me";
        // If token is invalid/expired, clear and re-auth (Telegram initData)
        if (typeof msg === "string" && msg.includes("HTTP 401")) {
          clearToken();
          setMe(null);
          return;
        }
        setMeError(msg);
      } finally {
        setMeLoading(false);
      }
    };
    void run();
  }, [token]);

  useEffect(() => {
    const run = async () => {
      if (!token) return;
      if (!me?.activeProfileId) return;
      setFeedError(null);
      try {
        const qs = new URLSearchParams();
        if (feedDistrict.trim()) qs.set("district", feedDistrict.trim());
        if (feedCategory.trim()) qs.set("category", feedCategory.trim());
        const path = qs.toString() ? `/feed?${qs.toString()}` : "/feed";
        const data = await getJSON<FeedResponse>(path, token);
        setFeed(data);
      } catch (e: any) {
        setFeedError(e?.message ?? "Failed to load feed");
      }
    };
    void run();
  }, [token, me?.activeProfileId, feedDistrict, feedCategory, feedReloadKey]);

  const ensureActiveProfile = async (profileId: string) => {
    if (!token) return;
    await postJSON<{ activeProfileId: string | null }>(
      "/me/active-profile",
      { profileId },
      token,
    );
    const data = await getJSON<MeResponse>("/me", token);
    setMe(data);
  };

  const createRole = async (type: "parent" | "specialist" | "shop") => {
    if (!token) return;
    const created = await postJSON<{ id: string }>("/profiles", { type }, token);
    await ensureActiveProfile(created.id);
  };

  const allTypes = useMemo(() => new Set((me?.profiles ?? []).map((p) => p.type)), [me]);
  const missingRole = useMemo(() => {
    // MVP: only parent + specialist
    if (!allTypes.has("parent")) return "parent" as const;
    if (!allTypes.has("specialist")) return "specialist" as const;
    return null;
  }, [allTypes]);

  const addMissingRole = async () => {
    if (!missingRole) return;
    try {
      await createRole(missingRole);
    } catch (e: any) {
      setMeError(e?.message ?? "Не удалось добавить роль");
    }
  };

  const nav = (
    <div className="card">
      <div className="navtabs">
        <Link className={`navtab ${location.pathname === "/" ? "active" : ""}`} to="/">
          Лента
        </Link>
        <Link className={`navtab ${location.pathname.startsWith("/requests") ? "active" : ""}`} to="/requests">
          Заявки
        </Link>
        <Link className={`navtab ${location.pathname.startsWith("/offers") ? "active" : ""}`} to="/offers">
          Отклики
        </Link>
        <Link className={`navtab ${location.pathname.startsWith("/roles") ? "active" : ""}`} to="/roles">
          Роли
        </Link>
        <Link className={`navtab ${location.pathname.startsWith("/profile") ? "active" : ""}`} to="/profile">
          Профиль
        </Link>
        <div className="spacer" />
        <button
          className="btn secondary"
          onClick={() => {
            clearToken();
            navigate("/", { replace: true });
          }}
        >
          Выйти
        </button>
      </div>
    </div>
  );

  const roleSwitcher =
    me && me.profiles.length > 0 ? (
      <div className="row" style={{ gap: 8, justifyContent: "flex-end" }}>
        <div className="segmented" role="tablist" aria-label="Role switcher">
          {me.profiles
            .filter((p) => p.isActive)
            .filter((p) => p.type === "parent" || p.type === "specialist")
            .map((p) => (
              <button
                key={p.id}
                className={p.id === me.activeProfileId ? "active" : ""}
                onClick={() => void ensureActiveProfile(p.id)}
                type="button"
                title="Переключить роль"
              >
                {p.type === "parent" ? "👩‍🍼 Мама" : "👩‍🏫 Специалист"}
              </button>
            ))}
        </div>
        {missingRole && (
          <button className="btn secondary" onClick={() => void addMissingRole()} title="Добавить вторую роль">
            + {missingRole === "parent" ? "Мама" : "Специалист"}
          </button>
        )}
      </div>
    ) : null;

  const activeProfileId = me?.activeProfileId ?? null;
  const activeProfileType = activeProfile?.type ?? null;

  const authedGet = async <T,>(path: string): Promise<T> => {
    if (!token) throw new Error("No token");
    return getJSON<T>(path, token);
  };
  const authedPost = async <T,>(path: string, body: unknown): Promise<T> => {
    if (!token) throw new Error("No token");
    return postJSON<T>(path, body, token);
  };
  const authedDelete = async <T,>(path: string): Promise<T> => {
    if (!token) throw new Error("No token");
    return deleteJSON<T>(path, token);
  };
  const authedPatch = async <T,>(path: string, body: unknown): Promise<T> => {
    if (!token) throw new Error("No token");
    return patchJSON<T>(path, body, token);
  };

  const refreshMe = async () => {
    if (!token) return;
    const data = await getJSON<MeResponse>("/me", token);
    setMe(data);
  };

  function RequestsScreen() {
    const [items, setItems] = useState<RequestMineItem[] | null>(null);
    const [err, setErr] = useState<string | null>(null);

    useEffect(() => {
      const run = async () => {
        setErr(null);
        setItems(null);
        if (activeProfileType !== "parent") return;
        try {
          const data = await authedGet<RequestMineItem[]>("/requests/mine");
          setItems(data);
        } catch (e: any) {
          setErr(e?.message ?? "Failed to load requests");
        }
      };
      void run();
    }, [activeProfileId, activeProfileType]);

    if (activeProfileType !== "parent") {
      return (
        <div className="card">
          <div className="h2">Заявки</div>
          <div className="muted" style={{ marginTop: 8 }}>
            В режиме специалиста заявки находятся в ленте (раздел “Лента”).
          </div>
        </div>
      );
    }

    return (
      <div className="card">
        <div className="row">
          <div className="h2">Мои заявки</div>
          <div className="spacer" />
          <Link className="btn" to="/requests/new">
            + Создать
          </Link>
        </div>
        {err && <div className="muted" style={{ marginTop: 8 }}>{err}</div>}
        {!items && !err && <div className="muted" style={{ marginTop: 8 }}>Загрузка…</div>}
        {items && items.length === 0 && (
          <div className="card" style={{ background: "var(--tg-bg)", marginTop: 10 }}>
            <div style={{ fontWeight: 900 }}>Пока нет заявок</div>
            <div className="muted" style={{ marginTop: 6 }}>
              Создайте первую — специалисты увидят её в своей ленте и смогут откликнуться.
            </div>
            <div className="row" style={{ marginTop: 10 }}>
              <Link className="btn" to="/requests/new">
                + Создать заявку
              </Link>
            </div>
          </div>
        )}
        {items && (
          <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
            {items.map((r) => (
              <div key={r.id} className="card" style={{ background: "var(--tg-bg)" }}>
                <div className="row">
                  <div style={{ fontWeight: 800 }}>{r.category}</div>
                  <div className="spacer" />
                  <div className="pill">{labelRequestStatus(r.status)}</div>
                </div>
                <div className="muted" style={{ marginTop: 6 }}>
                  Район: {r.district ?? "—"} · Бюджет: {formatMoney(r.budget)} · Откликов: {r.offersCount}
                </div>
                {r.description && <div style={{ marginTop: 8 }}>{r.description}</div>}
                <div className="row" style={{ marginTop: 10 }}>
                  <Link className="btn secondary" to={`/requests/${r.id}`}>
                    Открыть
                  </Link>
                  <button
                    type="button"
                    className="btn secondary"
                    onClick={async () => {
                      if (!confirm("Удалить заявку?")) return;
                      try {
                        await authedDelete(`/requests/${r.id}`);
                        setItems((prev) => (prev ?? []).filter((x) => x.id !== r.id));
                      } catch (e: any) {
                        setErr(e?.message ?? "Не удалось удалить");
                      }
                    }}
                  >
                    Удалить
                  </button>
                  <div className="spacer" />
                  <div className="muted">{formatDate(r.createdAt)}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  function NewRequestScreen() {
    const [category, setCategory] = useState("Няня");
    const [district, setDistrict] = useState("");
    const [budget, setBudget] = useState<string>("");
    const [description, setDescription] = useState("");
    const [saving, setSaving] = useState(false);
    const [err, setErr] = useState<string | null>(null);

    const onSubmit = async () => {
      setErr(null);
      setSaving(true);
      try {
        const created = await authedPost<{ id: string }>("/requests", {
          category,
          district: district || null,
          budget: budget ? Number(budget) : null,
          description: description || null,
        });
        navigate(`/requests/${created.id}`);
      } catch (e: any) {
        setErr(e?.message ?? "Failed to create request");
      } finally {
        setSaving(false);
      }
    };

    if (activeProfileType !== "parent") return <Navigate to="/requests" replace />;

    return (
      <div className="card">
        <div className="h2">Новая заявка</div>
        {err && <div className="muted" style={{ marginTop: 8 }}>{err}</div>}
        <div style={{ display: "grid", gap: 12, marginTop: 10 }}>
          <div className="field">
            <div className="label">Категория</div>
            <input className="input" value={category} onChange={(e) => setCategory(e.target.value)} />
          </div>
          <div className="field">
            <div className="label">Район</div>
            <input className="input" value={district} onChange={(e) => setDistrict(e.target.value)} placeholder="Напр. Центральный" />
          </div>
          <div className="field">
            <div className="label">Бюджет (₽)</div>
            <input className="input" value={budget} onChange={(e) => setBudget(e.target.value)} inputMode="numeric" />
          </div>
          <div className="field">
            <div className="label">Описание</div>
            <textarea className="textarea" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="row">
            <button className="btn" onClick={() => void onSubmit()} disabled={saving}>
              {saving ? "Создание…" : "Создать"}
            </button>
            <button className="btn secondary" onClick={() => navigate(-1)} disabled={saving}>
              Назад
            </button>
          </div>
        </div>
      </div>
    );
  }

  function RequestDetailsScreen() {
    const params = useParams();
    const requestId = params.id!;
    const [data, setData] = useState<RequestDetails | null>(null);
    const [err, setErr] = useState<string | null>(null);

    const [offerPrice, setOfferPrice] = useState<string>("");
    const [offerComment, setOfferComment] = useState<string>("");
    const [sending, setSending] = useState(false);
    const [actionErr, setActionErr] = useState<string | null>(null);

    const [reviewRating, setReviewRating] = useState<number>(5);
    const [reviewText, setReviewText] = useState<string>("");
    const [reviewSending, setReviewSending] = useState(false);
    const [reviewOk, setReviewOk] = useState<string | null>(null);

    useEffect(() => {
      const run = async () => {
        setErr(null);
        setData(null);
        setReviewOk(null);
        try {
          const r = await authedGet<RequestDetails>(`/requests/${requestId}`);
          setData(r);
        } catch (e: any) {
          setErr(e?.message ?? "Failed to load request");
        }
      };
      void run();
    }, [requestId, activeProfileId]);

    const sendOffer = async () => {
      setActionErr(null);
      setSending(true);
      try {
        await authedPost(`/requests/${requestId}/offers`, {
          priceOffer: offerPrice ? Number(offerPrice) : null,
          comment: offerComment || null,
        });
        const r = await authedGet<RequestDetails>(`/requests/${requestId}`);
        setData(r);
      } catch (e: any) {
        setActionErr(e?.message ?? "Failed to send offer");
      } finally {
        setSending(false);
      }
    };

    const acceptOffer = async (offerId: string) => {
      setActionErr(null);
      try {
        await authedPost(`/offers/${offerId}/accept`, {});
        const r = await authedGet<RequestDetails>(`/requests/${requestId}`);
        setData(r);
      } catch (e: any) {
        setActionErr(e?.message ?? "Failed to accept offer");
      }
    };

    const rejectOffer = async (offerId: string) => {
      setActionErr(null);
      try {
        await authedPost(`/offers/${offerId}/reject`, {});
        const r = await authedGet<RequestDetails>(`/requests/${requestId}`);
        setData(r);
      } catch (e: any) {
        setActionErr(e?.message ?? "Failed to reject offer");
      }
    };

    const completeRequest = async () => {
      setActionErr(null);
      try {
        await authedPost(`/requests/${requestId}/complete`, {});
        const r = await authedGet<RequestDetails>(`/requests/${requestId}`);
        setData(r);
      } catch (e: any) {
        setActionErr(e?.message ?? "Failed to complete request");
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
      } catch (e: any) {
        setActionErr(e?.message ?? "Failed to create review");
      } finally {
        setReviewSending(false);
      }
    };

    if (err) return <ErrorBox error={err} />;
    if (!data) return <div className="card">Загрузка…</div>;

    const accepted = data.offers.find((o) => o.status === "accepted") ?? null;
    const completedAt = data.completedAt ? new Date(data.completedAt) : null;
    const reviewAvailable =
      data.status === "done" && completedAt ? hoursBetween(new Date(), new Date(completedAt.getTime() + 24 * 60 * 60 * 1000)) >= 0 && Date.now() >= completedAt.getTime() + 24 * 60 * 60 * 1000 : false;

    return (
      <div style={{ display: "grid", gap: 12 }}>
        <div className="card">
          <div className="row">
            <div className="h2">{data.category}</div>
            <div className="spacer" />
            <div className="muted">{data.status}</div>
          </div>
          <div className="muted" style={{ marginTop: 6 }}>
            Район: {data.district ?? "—"} · Бюджет: {formatMoney(data.budget)} · Создано: {formatDate(data.createdAt)}
          </div>
          {data.description && <div style={{ marginTop: 10 }}>{data.description}</div>}
          {activeProfileType === "parent" && (
            <div className="row" style={{ marginTop: 12 }}>
              <button
                type="button"
                className="btn secondary"
                onClick={async () => {
                  if (!confirm("Удалить заявку? Отклики тоже будут удалены.")) return;
                  try {
                    await authedDelete(`/requests/${requestId}`);
                    navigate("/requests", { replace: true });
                  } catch (e: any) {
                    setActionErr(e?.message ?? "Не удалось удалить");
                  }
                }}
              >
                Удалить заявку
              </button>
            </div>
          )}
        </div>

        {actionErr && <ErrorBox error={actionErr} />}

        {activeProfileType === "specialist" && (() => {
          const myOffer = data.offers.find((o) => o.specialistProfileId === activeProfileId);
          if (myOffer) {
            return (
              <div className="card" style={{ background: "var(--tg-bg)" }}>
                <div className="h2">Вы уже откликнулись</div>
                <div className="muted" style={{ marginTop: 8 }}>
                  Цена: {formatMoney(myOffer.priceOffer)} · {myOffer.status}
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
                <div className="row">
                  <button className="btn" disabled={sending} onClick={() => void sendOffer()}>
                    {sending ? "Отправка…" : "Отправить отклик"}
                  </button>
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
                <a className="btn" href={`https://t.me/${accepted.specialist.username}`} target="_blank" rel="noreferrer">
                  Написать
                </a>
              )}
            </div>

            {data.status === "in_progress" && (
              <div className="row" style={{ marginTop: 10 }}>
                <button className="btn" onClick={() => void completeRequest()} disabled={!accepted}>
                  Завершить заявку
                </button>
                <div className="spacer" />
                <div className="muted">{accepted ? "После завершения можно оставить отзыв (через 24ч)." : "Сначала нужно принять отклик."}</div>
              </div>
            )}

            {data.offers.length === 0 && <div className="muted" style={{ marginTop: 8 }}>Пока нет откликов.</div>}
            <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
              {data.offers.map((o) => (
                <div key={o.id} className="card" style={{ background: "var(--tg-bg)" }}>
                  <div className="row">
                    <div style={{ fontWeight: 800 }}>
                      {o.specialist.displayName ?? o.specialist.username ?? "Специалист"}
                    </div>
                    <div className="spacer" />
                    <div className="muted">{o.status}</div>
                  </div>
                  <div className="muted" style={{ marginTop: 6 }}>
                    Цена: {formatMoney(o.priceOffer)} · {formatDate(o.createdAt)}
                  </div>
                  {o.comment && <div style={{ marginTop: 8 }}>{o.comment}</div>}
                  <div className="row" style={{ marginTop: 10 }}>
                    {!accepted ? (
                      <>
                        <button className="btn" onClick={() => void acceptOffer(o.id)} disabled={o.status !== "pending"}>
                          Принять
                        </button>
                        <button className="btn secondary" onClick={() => void rejectOffer(o.id)} disabled={o.status !== "pending"}>
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
            {!completedAt && <div className="muted" style={{ marginTop: 8 }}>Заявка завершена, но время завершения не указано.</div>}
            {completedAt && !reviewAvailable && (
              <div className="muted" style={{ marginTop: 8 }}>
                Отзыв будет доступен через 24 часа после завершения: {formatDate(data.completedAt)}
              </div>
            )}
            {reviewOk && <div className="muted" style={{ marginTop: 8 }}>{reviewOk}</div>}

            {completedAt && reviewAvailable && (
              <div style={{ display: "grid", gap: 12, marginTop: 10 }}>
                <div className="field">
                  <div className="label">Оценка</div>
                  <select
                    className="select"
                    value={reviewRating}
                    onChange={(e) => setReviewRating(Number(e.target.value))}
                  >
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
                      className="btn"
                      disabled={reviewSending}
                      onClick={() => void sendReview(accepted.specialist.profileId)}
                    >
                      {reviewSending ? "Отправка…" : "Оставить отзыв специалисту"}
                    </button>
                  )}
                  {activeProfileType === "specialist" && (
                    <button
                      className="btn"
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

  function OffersScreen() {
    const [items, setItems] = useState<OfferMineItem[] | null>(null);
    const [err, setErr] = useState<string | null>(null);

    useEffect(() => {
      const run = async () => {
        setErr(null);
        setItems(null);
        if (activeProfileType !== "specialist") return;
        try {
          const data = await authedGet<OfferMineItem[]>("/offers/mine");
          setItems(data);
        } catch (e: any) {
          setErr(e?.message ?? "Failed to load offers");
        }
      };
      void run();
    }, [activeProfileId, activeProfileType]);

    if (activeProfileType !== "specialist") {
      return (
        <div className="card">
          <div className="h2">Отклики</div>
          <div className="muted" style={{ marginTop: 8 }}>
            В режиме родителя отклики доступны внутри каждой заявки.
          </div>
        </div>
      );
    }

    return (
      <div className="card">
        <div className="h2">Мои отклики</div>
        {err && <div className="muted" style={{ marginTop: 8 }}>{err}</div>}
        {!items && !err && <div className="muted" style={{ marginTop: 8 }}>Загрузка…</div>}
        {items && items.length === 0 && (
          <div className="card" style={{ background: "var(--tg-bg)", marginTop: 10 }}>
            <div style={{ fontWeight: 900 }}>Пока нет откликов</div>
            <div className="muted" style={{ marginTop: 6 }}>
              Откройте ленту, выберите подходящую заявку и отправьте отклик.
            </div>
            <div className="row" style={{ marginTop: 10 }}>
              <Link className="btn" to="/">
                Перейти в ленту
              </Link>
            </div>
          </div>
        )}
        {items && (
          <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
            {items.map((o) => (
              <div key={o.id} className="card" style={{ background: "var(--tg-bg)" }}>
                <div className="row">
                  <div style={{ fontWeight: 800 }}>{o.request.category}</div>
                  <div className="spacer" />
                  <div className="pill">{labelOfferStatus(o.status)}</div>
                </div>
                <div className="muted" style={{ marginTop: 6 }}>
                  Район: {o.request.district ?? "—"} · Бюджет: {formatMoney(o.request.budget)}
                </div>
                {o.comment && <div style={{ marginTop: 8 }}>{o.comment}</div>}
                <div className="row" style={{ marginTop: 10 }}>
                  <Link className="btn secondary" to={`/requests/${o.requestId}`}>
                    Открыть заявку
                  </Link>
                  <div className="spacer" />
                  <div className="muted">{formatDate(o.createdAt)}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  function ProfileScreen() {
    const profileId = activeProfile!.id;
    const type = activeProfile!.type;

    const [displayName, setDisplayName] = useState(activeProfile!.displayName ?? "");
    const [city, setCity] = useState(activeProfile!.city ?? "");
    const [district, setDistrict] = useState(activeProfile!.district ?? "");

    const [childrenAges, setChildrenAges] = useState("");
    const [specialWishes, setSpecialWishes] = useState("");

    const [pricePerHour, setPricePerHour] = useState("");
    const [about, setAbout] = useState("");

    const [shopName, setShopName] = useState("");
    const [shopAddress, setShopAddress] = useState("");
    const [shopWorkHours, setShopWorkHours] = useState("");
    const [shopDescription, setShopDescription] = useState("");

    const [saving, setSaving] = useState(false);
    const [err, setErr] = useState<string | null>(null);
    const [reviews, setReviews] = useState<ReviewListItem[] | null>(null);
    const [reviewsErr, setReviewsErr] = useState<string | null>(null);

    useEffect(() => {
      setDisplayName(activeProfile?.displayName ?? "");
      setCity(activeProfile?.city ?? "");
      setDistrict(activeProfile?.district ?? "");
    }, [activeProfileId]);

    useEffect(() => {
      if (type !== "shop") return;
      const load = async () => {
        try {
          const p = await authedGet<PublicProfile>(`/profiles/${profileId}`);
          if (p.shop) {
            setShopName(p.shop.shopName ?? "");
            setShopAddress(p.shop.address ?? "");
            setShopWorkHours(p.shop.workHours ?? "");
            setShopDescription(p.shop.description ?? "");
          }
        } catch {
          // ignore
        }
      };
      void load();
    }, [profileId, type]);

    useEffect(() => {
      const run = async () => {
        setReviewsErr(null);
        setReviews(null);
        try {
          const items = await authedGet<ReviewListItem[]>(`/profiles/${profileId}/reviews`);
          setReviews(items);
        } catch (e: any) {
          setReviewsErr(e?.message ?? "Failed to load reviews");
        }
      };
      void run();
    }, [profileId]);

    const save = async () => {
      setErr(null);
      setSaving(true);
      try {
        await authedPost(`/profiles/${profileId}`, {
          displayName: displayName || null,
          city: city || null,
          district: district || null,
        });

        if (type === "parent") {
          const ages = childrenAges
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
            .map((s) => Number(s))
            .filter((n) => Number.isFinite(n));
          await authedPost(`/profiles/${profileId}/parent`, {
            childrenAges: ages.length ? ages : null,
            specialWishes: specialWishes || null,
          });
        }
        if (type === "specialist") {
          await authedPost(`/profiles/${profileId}/specialist`, {
            pricePerHour: pricePerHour ? Number(pricePerHour) : null,
            about: about || null,
          });
        }
        if (type === "shop") {
          await authedPatch(`/profiles/${profileId}/shop`, {
            shopName: shopName || null,
            address: shopAddress || null,
            workHours: shopWorkHours || null,
            description: shopDescription || null,
          });
        }

        await refreshMe();
      } catch (e: any) {
        setErr(e?.message ?? "Failed to save profile");
      } finally {
        setSaving(false);
      }
    };

    return (
      <div className="card">
        <div className="row">
          <div className="h2">Профиль</div>
          <div className="spacer" />
          <div className="pill">{labelProfileType(type)}</div>
        </div>
        {(type === "parent" || type === "specialist") && (
          <div style={{ marginTop: 10 }}>
            <div className="h2">Роли</div>
            <div className="muted" style={{ marginTop: 6 }}>
              Можно быть и “Мамой”, и “Специалистом” в одном аккаунте — переключатель сверху.
            </div>
            {missingRole && (
              <div className="row" style={{ marginTop: 10 }}>
                <button className="btn" onClick={() => void addMissingRole()}>
                  + Добавить роль: {missingRole === "parent" ? "👩‍🍼 Мама" : "👩‍🏫 Специалист"}
                </button>
              </div>
            )}
          </div>
        )}
        {err && <div className="muted" style={{ marginTop: 8 }}>{err}</div>}
        <div style={{ display: "grid", gap: 12, marginTop: 10 }}>
          <div className="field">
            <div className="label">Имя для отображения</div>
            <input className="input" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
          </div>
          <div className="row">
            <div className="field" style={{ flex: 1, minWidth: 160 }}>
              <div className="label">Город</div>
              <input className="input" value={city} onChange={(e) => setCity(e.target.value)} />
            </div>
            <div className="field" style={{ flex: 1, minWidth: 160 }}>
              <div className="label">Район</div>
              <input className="input" value={district} onChange={(e) => setDistrict(e.target.value)} />
            </div>
          </div>

          {type === "parent" && (
            <>
              <div className="field">
                <div className="label">Возраст детей (через запятую)</div>
                <input className="input" value={childrenAges} onChange={(e) => setChildrenAges(e.target.value)} placeholder="2, 5, 7" />
              </div>
              <div className="field">
                <div className="label">Пожелания</div>
                <textarea className="textarea" value={specialWishes} onChange={(e) => setSpecialWishes(e.target.value)} />
              </div>
            </>
          )}

          {type === "specialist" && (
            <>
              <div className="field">
                <div className="label">Цена за час (₽)</div>
                <input className="input" value={pricePerHour} onChange={(e) => setPricePerHour(e.target.value)} inputMode="numeric" />
              </div>
              <div className="field">
                <div className="label">О себе</div>
                <textarea className="textarea" value={about} onChange={(e) => setAbout(e.target.value)} />
              </div>
            </>
          )}

          {type === "shop" && (
            <>
              <div className="field">
                <div className="label">Название магазина</div>
                <input className="input" value={shopName} onChange={(e) => setShopName(e.target.value)} placeholder="Напр. Детский мир" />
              </div>
              <div className="field">
                <div className="label">Адрес</div>
                <input className="input" value={shopAddress} onChange={(e) => setShopAddress(e.target.value)} />
              </div>
              <div className="field">
                <div className="label">Часы работы</div>
                <input className="input" value={shopWorkHours} onChange={(e) => setShopWorkHours(e.target.value)} placeholder="Пн–Пт 10:00–19:00" />
              </div>
              <div className="field">
                <div className="label">Описание</div>
                <textarea className="textarea" value={shopDescription} onChange={(e) => setShopDescription(e.target.value)} />
              </div>
            </>
          )}

          <div className="row">
            <button className="btn" disabled={saving} onClick={() => void save()}>
              {saving ? "Сохранение…" : "Сохранить"}
            </button>
          </div>
        </div>

        <div style={{ marginTop: 18 }}>
          <div className="h2">Отзывы</div>
          {reviewsErr && <div className="muted" style={{ marginTop: 8 }}>{reviewsErr}</div>}
          {!reviews && !reviewsErr && <div className="muted" style={{ marginTop: 8 }}>Загрузка…</div>}
          {reviews && reviews.length === 0 && <div className="muted" style={{ marginTop: 8 }}>Пока нет отзывов.</div>}
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
                  <div className="muted" style={{ marginTop: 8 }}>От: {labelProfileType(r.fromProfile.type)}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  function FeedScreen() {
    const role = activeProfileType;
    const contentCount = feed
      ? feed.items.filter((it) => it.kind !== "banner").length
      : 0;

    return (
      <div className="card">
        <div className="row">
          <div className="h2">Лента</div>
          <div className="spacer" />
          <button
            className="btn secondary"
            onClick={() => {
              setFeed(null);
              setFeedError(null);
              setFeedReloadKey((x) => x + 1);
            }}
          >
            Обновить
          </button>
        </div>

        <div style={{ display: "grid", gap: 12, marginTop: 10 }}>
          <div className="field">
            <div className="label">Район (фильтр)</div>
            <input
              className="input"
              value={feedDistrict}
              onChange={(e) => setFeedDistrict(e.target.value)}
              placeholder="Напр. Центральный"
            />
          </div>

          {role === "specialist" && (
            <div className="field">
              <div className="label">Категория (фильтр)</div>
              <input
                className="input"
                value={feedCategory}
                onChange={(e) => setFeedCategory(e.target.value)}
                placeholder="Напр. Няня"
              />
            </div>
          )}
        </div>

        {feedError && <div className="muted" style={{ marginTop: 10 }}>{feedError}</div>}
        {!feed && <div className="muted" style={{ marginTop: 10 }}>Загрузка…</div>}

        {feed && (
          <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
            {contentCount === 0 && (
              <div className="card" style={{ background: "var(--tg-bg)" }}>
                <div style={{ fontWeight: 900 }}>
                  {role === "parent" ? "Пока нет специалистов" : "Пока нет заявок"}
                </div>
                <div className="muted" style={{ marginTop: 6 }}>
                  {role === "parent"
                    ? "Попробуйте убрать фильтр по району — или добавьте роль “Специалист”, чтобы создать первую анкету."
                    : "Попробуйте убрать фильтры — или переключитесь на роль “Мама”, чтобы создать заявку."}
                </div>
                <div className="row" style={{ marginTop: 10 }}>
                  <button
                    className="btn secondary"
                    onClick={() => {
                      setFeedDistrict("");
                      setFeedCategory("");
                      setFeedReloadKey((x) => x + 1);
                    }}
                  >
                    Очистить фильтры
                  </button>
                  <div className="spacer" />
                  {missingRole ? (
                    <button className="btn" onClick={() => void addMissingRole()}>
                      + Добавить роль: {missingRole === "parent" ? "👩‍🍼 Мама" : "👩‍🏫 Специалист"}
                    </button>
                  ) : (
                    <Link className="btn" to="/roles">
                      Роли
                    </Link>
                  )}
                </div>
              </div>
            )}
            {feed.items.map((it, idx) => {
              if (it.kind === "banner") {
                return (
                  <div key={`b-${it.id}-${idx}`} className="card" style={{ background: "var(--tg-bg)" }}>
                    <div className="muted" style={{ marginBottom: 8 }}>Реклама</div>
                    <a href={it.targetUrl ?? "#"} target="_blank" rel="noreferrer" style={{ display: "block" }}>
                      <img
                        src={it.imageUrl}
                        alt=""
                        style={{ width: "100%", borderRadius: 12, display: "block" }}
                      />
                    </a>
                  </div>
                );
              }

              if (it.kind === "specialist_profile") {
                const p = it.profile;
                return (
                  <div key={`sp-${p.id}-${idx}`} className="card" style={{ background: "var(--tg-bg)" }}>
                    <div className="row">
                      <div style={{ fontWeight: 900 }}>
                        {p.displayName ?? "Специалист"}
                        {it.isPromoted && <span className="pill" style={{ marginLeft: 8 }}>TOP</span>}
                      </div>
                      <div className="spacer" />
                      <div className="muted">★ {p.ratingAvg} ({p.ratingCount})</div>
                    </div>
                    <div className="muted" style={{ marginTop: 6 }}>
                      {p.city ?? "—"} · {p.district ?? "—"} · {p.pricePerHour != null ? `${p.pricePerHour} ₽/час` : "цена —"}
                    </div>
                    <div className="row" style={{ marginTop: 10 }}>
                      <Link className="btn secondary" to={`/profiles/${p.id}`}>
                        Открыть анкету
                      </Link>
                    </div>
                  </div>
                );
              }

              // request
              const r = it.request;
              return (
                <div key={`r-${r.id}-${idx}`} className="card" style={{ background: "var(--tg-bg)" }}>
                  <div className="row">
                    <div style={{ fontWeight: 900 }}>{r.category}</div>
                    <div className="spacer" />
                    <div className="muted">{formatDate(r.createdAt)}</div>
                  </div>
                  <div className="muted" style={{ marginTop: 6 }}>
                    Район: {r.district ?? "—"} · Бюджет: {formatMoney(r.budget)}
                  </div>
                  {r.description && <div style={{ marginTop: 8 }}>{r.description}</div>}
                  <div className="row" style={{ marginTop: 10 }}>
                    <Link className="btn secondary" to={`/requests/${r.id}`}>
                      Открыть
                    </Link>
                    <div className="spacer" />
                    <div className="pill">{labelRequestStatus(r.status)}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  function PublicProfileScreen() {
    const params = useParams();
    const profileId = params.id!;
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
        } catch (e: any) {
          setErr(e?.message ?? "Не удалось загрузить профиль");
        }
      };
      void run();
    }, [profileId, activeProfileId]);

    useEffect(() => {
      const run = async () => {
        setReviewsErr(null);
        setReviews(null);
        try {
          const items = await authedGet<ReviewListItem[]>(`/profiles/${profileId}/reviews`);
          setReviews(items);
        } catch (e: any) {
          setReviewsErr(e?.message ?? "Не удалось загрузить отзывы");
        }
      };
      void run();
    }, [profileId]);

    if (err) return <ErrorBox error={err} />;
    if (!p) return <div className="card">Загрузка…</div>;

    const title = p.displayName ?? p.user.username ?? "Профиль";
    const tg = p.user.username ? `https://t.me/${p.user.username}` : null;

    return (
      <div style={{ display: "grid", gap: 12 }}>
        <div className="card">
          <div className="row">
            <div className="h2">{title}</div>
            <div className="spacer" />
            <div className="muted">★ {p.ratingAvg} ({p.ratingCount})</div>
          </div>
          <div className="muted" style={{ marginTop: 6 }}>
            {p.city ?? "—"} · {p.district ?? "—"}
          </div>
          {p.specialist?.pricePerHour != null && (
            <div className="muted" style={{ marginTop: 6 }}>
              Цена: {p.specialist.pricePerHour} ₽/час
            </div>
          )}
          {p.specialist?.about && <div style={{ marginTop: 10 }}>{p.specialist.about}</div>}
          {p.type === "shop" && p.shop && (
            <div style={{ marginTop: 12 }}>
              <div className="h3">{p.shop.shopName ?? p.displayName ?? "Магазин"}</div>
              {p.shop.address && <div className="muted">{p.shop.address}</div>}
              {p.shop.workHours && <div className="muted">{p.shop.workHours}</div>}
              {p.shop.description && <div style={{ marginTop: 8 }}>{p.shop.description}</div>}
            </div>
          )}
          <div className="row" style={{ marginTop: 12 }}>
            {tg && (
              <a className="btn" href={tg} target="_blank" rel="noreferrer">
                Написать в Telegram
              </a>
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
          {reviews && reviews.length === 0 && <div className="muted" style={{ marginTop: 8 }}>Пока нет отзывов.</div>}
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

  function RolesScreen() {
    if (!me) return <div className="card">Загрузка…</div>;

    const roles = me.profiles
      .filter((p) => p.type === "parent" || p.type === "specialist")
      .map((p) => ({
        ...p,
        title: p.type === "parent" ? "👩‍🍼 Мама" : "👩‍🏫 Специалист",
      }));

    const toggle = async (profileId: string, nextActive: boolean) => {
      try {
        await authedPost(`/profiles/${profileId}/${nextActive ? "activate" : "deactivate"}`, {});
        await refreshMe();
      } catch (e: any) {
        setMeError(e?.message ?? "Не удалось изменить роль");
      }
    };

    return (
      <div className="card">
        <div className="row">
          <div className="h2">Роли</div>
          <div className="spacer" />
          {missingRole && (
            <button className="btn" onClick={() => void addMissingRole()}>
              + Добавить: {missingRole === "parent" ? "👩‍🍼 Мама" : "👩‍🏫 Специалист"}
            </button>
          )}
        </div>
        <div className="muted" style={{ marginTop: 6 }}>
          Здесь можно включать/выключать роли и выбирать активную.
        </div>

        <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
          {roles.map((p) => (
            <div key={p.id} className="card" style={{ background: "var(--tg-bg)" }}>
              <div className="row">
                <div style={{ fontWeight: 900 }}>{p.title}</div>
                <div className="spacer" />
                {p.id === me.activeProfileId && <span className="pill">Активная</span>}
                <span className="pill" style={{ background: p.isActive ? undefined : "color-mix(in srgb, var(--tg-theme-hint-color, #999) 18%, var(--surface-2))" }}>
                  {p.isActive ? "Включена" : "Выключена"}
                </span>
              </div>

              <div className="muted" style={{ marginTop: 6 }}>
                {p.displayName ?? "—"} · {p.city ?? "—"} · {p.district ?? "—"}
              </div>

              <div className="row" style={{ marginTop: 10 }}>
                {p.isActive ? (
                  <button className="btn secondary" onClick={() => void toggle(p.id, false)}>
                    Выключить
                  </button>
                ) : (
                  <button className="btn" onClick={() => void toggle(p.id, true)}>
                    Включить
                  </button>
                )}

                <button
                  className="btn secondary"
                  disabled={!p.isActive}
                  onClick={() => void ensureActiveProfile(p.id)}
                >
                  Сделать активной
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="app safe">
      <div className="container">
        <TopBar
          title="Для мам"
          sub={
            loading
              ? "Авторизация…"
              : token
                ? "✅ Онлайн"
                : "Откройте внутри Telegram Mini App"
          }
          right={roleSwitcher}
        />

        {error && <ErrorBox error={error} />}

        {!token && (
          <div className="card">
            <div className="h2">Вход</div>
            <div className="muted" style={{ marginTop: 6 }}>
              Этот экран работает только внутри Telegram WebApp (Mini App).
            </div>
          </div>
        )}

        {token && (
          <>
            {(meLoading || !me) && <div className="card">Loading profile…</div>}
            {meError && <ErrorBox error={meError} />}

            {me && me.profiles.length === 0 && (
              <div className="card">
                <div className="h2">Выберите роли</div>
                <div className="row" style={{ marginTop: 10 }}>
                  <button
                    className="btn"
                    onClick={() => {
                      void createRole("parent").catch((e: any) => {
                        setMeError(e?.message ?? "Не удалось создать роль");
                      });
                    }}
                  >
                    👩‍🍼 Мама
                  </button>
                  <button
                    className="btn"
                    onClick={() => {
                      void createRole("specialist").catch((e: any) => {
                        setMeError(e?.message ?? "Не удалось создать роль");
                      });
                    }}
                  >
                    👩‍🏫 Специалист
                  </button>
                </div>
                <button
                  className="btn"
                  onClick={() => {
                    void createRole("shop").catch((e: any) => {
                      setMeError(e?.message ?? "Не удалось создать роль");
                    });
                  }}
                >
                  🏪 Магазин
                </button>
              </div>
            )}

            {me && me.profiles.length > 0 && !me.activeProfileId && (
              <div className="card">
                <div className="h2">Выберите активную роль</div>
                <div className="muted" style={{ marginTop: 6 }}>
                  Нажмите на роль в шапке.
                </div>
              </div>
            )}

            {me && me.activeProfileId && activeProfile && (
              <>
                {nav}

                <Routes>
                  <Route
                    path="/"
                    element={<FeedScreen />}
                  />

                  <Route
                    path="/requests"
                    element={<RequestsScreen />}
                  />
                  <Route path="/requests/new" element={<NewRequestScreen />} />
                  <Route path="/requests/:id" element={<RequestDetailsScreen />} />

                  <Route
                    path="/offers"
                    element={<OffersScreen />}
                  />

                  <Route path="/roles" element={<RolesScreen />} />

                  <Route
                    path="/profile"
                    element={<ProfileScreen />}
                  />

                  <Route path="/profiles/:id" element={<PublicProfileScreen />} />

                  <Route path="*" element={<Navigate to="/" replace state={{ from: location.pathname }} />} />
                </Routes>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
