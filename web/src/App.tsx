import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, Route, Routes, useLocation, useNavigate, useParams } from "react-router-dom";
import { deleteJSON, getJSON, patchJSON, postJSON } from "./shared/api";
import { useTelegramAuth } from "./shared/useTelegramAuth";
import "./App.css";

import backgroundImg from "./assets/img/background.png";
import mainLogoImg from "./assets/img/main_logo.png";
import stubImg from "./assets/img/заглушка.png";
import categoryNanny from "./assets/img/category/няня.png";
import categoryTutor from "./assets/img/category/репетитор.png";
import categoryLeisure from "./assets/img/category/досуг.png";
import menuLenta from "./assets/img/menu/лента.png";
import menuProfil from "./assets/img/menu/профиль.png";
import menuCreate from "./assets/img/menu/создать заявку.png";
import menuAll from "./assets/img/menu/все заявки.png";

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
    type: "parent" | "specialist";
    isActive: boolean;
    displayName?: string | null;
    city?: string | null;
    district?: string | null;
    specialist?: { skills: string[]; pricePerHour?: number | null; about?: string | null };
  }>;
  activeProfileId: string | null;
};

const SPECIALIST_CATEGORIES = ["Няня", "Репетитор", "Досуг"] as const;

type FeedResponse =
  | {
      role: "parent";
      items: Array<
        | { kind: "banner"; id: string; imageUrl: string; targetUrl?: string | null }
        | {
            kind: "specialist_profile";
            isPromoted: boolean;
            profile: { id: string; displayName?: string | null; avatarUrl?: string | null; city?: string | null; district?: string | null; ratingAvg: string; ratingCount: number; pricePerHour?: number | null };
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
  fromProfile: { id: string; type: "parent" | "specialist" };
};

type PublicProfile = {
  id: string;
  type: "parent" | "specialist";
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
};

function TopBar(props: { title?: string; sub?: React.ReactNode; right?: React.ReactNode; logo?: string; rightNode?: React.ReactNode }) {
  if (props.logo) {
    return (
      <div className="topbar topbar--logo">
        <div className="topbar-logo-wrap">
          <img src={props.logo} alt="Для мам" className="topbar-logo" />
        </div>
        {props.rightNode != null && <div className="topbar-right">{props.rightNode}</div>}
      </div>
    );
  }
  return (
    <div className="card topbar">
      <div className="row">
        <div>
          {props.title && <div className="h1">{props.title}</div>}
          {props.sub && <div className="muted" style={{ marginTop: 4 }}>{props.sub}</div>}
        </div>
        <div className="spacer" />
        {props.right}
      </div>
    </div>
  );
}

function StubCard(props: { title: string; desc: string; children: React.ReactNode }) {
  return (
    <div className="card feed-empty">
      <div className="feed-empty-banner feed-empty-banner--stub">
        <img src={stubImg} alt="" />
        <div className="feed-empty-text-overlay">
          <div className="feed-empty-title">{props.title}</div>
          <div className="feed-empty-desc">{props.desc}</div>
          <div className="feed-empty-actions">{props.children}</div>
        </div>
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

function labelProfileType(t: "parent" | "specialist") {
  if (t === "parent") return "👩‍🍼 Мама";
  return "👩‍🏫 Специалист";
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

/** Категории ленты: Няня, Репетитор, Досуг */
const FEED_CATEGORIES = [
  { id: "", label: "Все", icon: null },
  { id: "Няня", label: "Няня", icon: categoryNanny },
  { id: "Репетитор", label: "Репетитор", icon: categoryTutor },
  { id: "Досуг", label: "Досуг", icon: categoryLeisure },
];

export default function App() {
  const { token, clearToken, error } = useTelegramAuth();
  const [me, setMe] = useState<MeResponse | null>(null);
  const [meLoading, setMeLoading] = useState(false);
  const [meError, setMeError] = useState<string | null>(null);

  const [feed, setFeed] = useState<FeedResponse | null>(null);
  const [feedError, setFeedError] = useState<string | null>(null);
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
        if (feedCategory.trim()) qs.set("category", feedCategory.trim());
        const path = qs.toString() ? `/feed?${qs.toString()}` : "/feed";
        const data = await getJSON<FeedResponse>(path, token);
        setFeed(data);
      } catch (e: any) {
        const msg = e?.message ?? "Failed to load feed";
        if (typeof msg === "string" && msg.includes("401")) {
          clearToken();
          setMe(null);
          setFeed(null);
          setFeedError(null);
        } else {
          setFeedError(msg);
        }
      }
    };
    void run();
  }, [token, me?.activeProfileId, feedCategory, feedReloadKey]);

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

  const createRole = async (type: "parent" | "specialist") => {
    if (!token) return;
    const created = await postJSON<{ id: string }>("/profiles", { type }, token);
    await ensureActiveProfile(created.id);
  };

  const allTypes = useMemo(() => new Set((me?.profiles ?? []).map((p) => p.type)), [me]);
  const missingRole = useMemo(() => {
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
    <nav className="bottom-nav">
      <Link className={`bottom-nav-item ${location.pathname === "/" ? "active" : ""}`} to="/">
        <img src={menuLenta} alt="" className="bottom-nav-icon-img" />
        <span>Лента</span>
      </Link>
      <Link className={`bottom-nav-item ${location.pathname === "/profile" || location.pathname === "/roles" ? "active" : ""}`} to="/profile">
        <img src={menuProfil} alt="" className="bottom-nav-icon-img" />
        <span>Профиль</span>
      </Link>
      <Link className={`bottom-nav-item ${location.pathname === "/requests/new" ? "active" : ""}`} to="/requests/new">
        <img src={menuCreate} alt="" className="bottom-nav-icon-img" />
        <span>Создать</span>
      </Link>
      <Link className={`bottom-nav-item ${location.pathname.startsWith("/requests") && location.pathname !== "/requests/new" ? "active" : ""}`} to="/requests">
        <img src={menuAll} alt="" className="bottom-nav-icon-img" />
        <span>Все заявки</span>
      </Link>
    </nav>
  );

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
          <div style={{ marginTop: 10 }}>
            <StubCard
              title="💛 Заявок пока нет"
              desc="Создайте первую — специалисты увидят её в ленте и смогут откликнуться."
            >
              <Link className="btn btn-primary" to="/requests/new">
                Создать заявку
              </Link>
            </StubCard>
          </div>
        )}
        {items && (
          <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
            {items.map((r) => (
              <div key={r.id} className="card card--status-top" style={{ background: "var(--tg-bg)" }}>
                <div className="pill pill--top-right">{labelRequestStatus(r.status)}</div>
                <div className="row">
                  <div style={{ fontWeight: 800 }}>{r.category}</div>
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
                    className="btn danger"
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
            <input className="input" value={district} onChange={(e) => setDistrict(e.target.value)} placeholder="Центральный" />
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
        <div className="card card--status-top">
          <div className="pill pill--top-right">{labelRequestStatus(data.status)}</div>
          <div className="row">
            <div className="h2">{data.category}</div>
          </div>
          <div className="muted" style={{ marginTop: 6 }}>
            Район: {data.district ?? "—"} · Бюджет: {formatMoney(data.budget)} · Создано: {formatDate(data.createdAt)}
          </div>
          {data.description && <div style={{ marginTop: 10 }}>{data.description}</div>}
          {activeProfileType === "parent" && (
            <div className="row" style={{ marginTop: 12 }}>
              <button
                type="button"
                className="btn danger"
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
          <div style={{ marginTop: 10 }}>
            <StubCard
              title="💛 Откликов пока нет"
              desc="Откройте ленту, выберите подходящую заявку и отправьте отклик."
            >
              <Link className="btn btn-primary" to="/">
                Перейти в ленту
              </Link>
            </StubCard>
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
    const [specialistCategory, setSpecialistCategory] = useState("");

    const [saving, setSaving] = useState(false);
    const [err, setErr] = useState<string | null>(null);
    const [reviews, setReviews] = useState<ReviewListItem[] | null>(null);
    const [reviewsErr, setReviewsErr] = useState<string | null>(null);

    useEffect(() => {
      if (!activeProfile) return;
      setDisplayName(activeProfile.displayName ?? "");
      setCity(activeProfile.city ?? "");
      setDistrict(activeProfile.district ?? "");
      if (activeProfile.type === "specialist") {
        const spec = activeProfile.specialist;
        if (spec) {
          setPricePerHour(spec.pricePerHour != null ? String(spec.pricePerHour) : "");
          setAbout(spec.about ?? "");
          const firstSkill = Array.isArray(spec.skills) && spec.skills.length > 0 ? spec.skills[0] : SPECIALIST_CATEGORIES[0];
          setSpecialistCategory(firstSkill);
        } else {
          setSpecialistCategory(SPECIALIST_CATEGORIES[0]);
        }
      }
    }, [activeProfile]);

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
        await authedPatch(`/profiles/${profileId}`, {
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
          await authedPatch(`/profiles/${profileId}/parent`, {
            childrenAges: ages.length ? ages : null,
            specialWishes: specialWishes || null,
          });
        }
        if (type === "specialist") {
          await authedPatch(`/profiles/${profileId}/specialist`, {
            skills: [specialistCategory || SPECIALIST_CATEGORIES[0]],
            pricePerHour: pricePerHour ? Number(pricePerHour) : null,
            about: about || null,
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
                <div className="label">Категория (в какой ленте показывать)</div>
                <select
                  className="input"
                  value={specialistCategory || SPECIALIST_CATEGORIES[0]}
                  onChange={(e) => setSpecialistCategory(e.target.value)}
                >
                  {SPECIALIST_CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
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
    const contentItems = feed?.items.filter((it) => it.kind !== "banner") ?? [];
    const contentCount = contentItems.length;

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {/* Статус для специалиста: онлайн + личный кабинет */}
        {activeProfileType === "specialist" && (
          <div className="status-block">
            <div className="status-block-inner">
              <span className="status-avatar">👤</span>
              <span className="status-text">Вы онлайн — родители могут видеть вас</span>
            </div>
          </div>
        )}

        <div className="card">
          <div className="row">
            <div className="h2">Лента</div>
            <div className="spacer" />
            <button
              type="button"
              className="btn secondary"
              onClick={() => {
                setFeed(null);
                setFeedError(null);
                setFeedReloadKey((x) => x + 1);
              }}
            >
              🔄 Обновить
            </button>
          </div>

          {/* Категории — для всех ролей */}
          <div className="feed-categories-label">Категория</div>
          <div className="feed-categories-scroll">
            <div className="feed-categories">
            {FEED_CATEGORIES.map((c) => (
              <button
                key={c.id || "all"}
                type="button"
                className={`feed-category-chip ${feedCategory === c.id ? "active" : ""}`}
                onClick={() => {
                  setFeedCategory(c.id);
                  setFeedReloadKey((x) => x + 1);
                }}
              >
                {c.icon ? <img src={c.icon} alt="" className="feed-category-icon" /> : null}
                {c.label}
              </button>
            ))}
            </div>
          </div>
        </div>

        {feedError && <div className="card"><div className="muted">{feedError}</div></div>}
        {!feed && <div className="card"><div className="muted">Загрузка…</div></div>}

        {feed && (
          <div className="feed-content">
            {contentCount === 0 && (
              <StubCard
                title={role === "specialist" ? "💛 Заявок пока нет" : "💛 Специалистов пока нет"}
                desc="Но они появляются регулярно — попробуйте выбрать другую категорию."
              >
                <div className="row feed-empty-row">
                  <button
                    type="button"
                    className="btn secondary"
                    onClick={() => {
                      setFeedError(null);
                      setFeedCategory("");
                    }}
                  >
                    Показать все
                  </button>
                  {missingRole && (
                    <button type="button" className="btn" onClick={() => void addMissingRole()}>
                      + {missingRole === "parent" ? "Мама" : "Специалист"}
                    </button>
                  )}
                </div>
              </StubCard>
            )}
            {contentItems.map((it, idx) => {
              if (it.kind === "specialist_profile") {
                const p = it.profile;
                return (
                  <div key={`sp-${p.id}-${idx}`} className="card feed-card feed-card-specialist">
                    <div className="feed-card-header">
                      <div className="feed-card-avatar">
                        {p.avatarUrl ? (
                          <img src={p.avatarUrl} alt="" />
                        ) : (
                          <span className="feed-card-avatar-placeholder">👤</span>
                        )}
                      </div>
                      <div className="feed-card-title-block">
                        <div className="feed-card-title">
                          {p.displayName ?? "Специалист"}
                          {it.isPromoted && <span className="pill feed-card-top">TOP</span>}
                        </div>
                        <div className="muted feed-card-meta">
                          ★ {p.ratingAvg} ({p.ratingCount}) · {p.city ?? "—"} · {p.district ?? "—"}
                        </div>
                        {p.pricePerHour != null && (
                          <div className="feed-card-price">{p.pricePerHour} ₽/час</div>
                        )}
                      </div>
                    </div>
                    <Link className="btn feed-card-btn" to={`/profiles/${p.id}`}>
                      Открыть анкету
                    </Link>
                  </div>
                );
              }

              if (it.kind === "request") {
                const r = it.request;
                return (
                  <div key={`r-${r.id}-${idx}`} className="card feed-card feed-card-request card--status-top">
                    <div className="pill pill--top-right">{labelRequestStatus(r.status)}</div>
                    <div className="feed-card-request-category">{r.category}</div>
                    <div className="muted feed-card-meta" style={{ marginTop: 6 }}>
                      Район: {r.district ?? "—"} · Бюджет: {formatMoney(r.budget)} · {formatDate(r.createdAt)}
                    </div>
                    {r.description && <div className="feed-card-desc">{r.description}</div>}
                    <div className="row" style={{ marginTop: 12, alignItems: "center" }}>
                      <Link className="btn feed-card-btn" to={`/requests/${r.id}`}>
                        Открыть заявку
                      </Link>
                    </div>
                  </div>
                );
              }

              return null;
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

    return (
      <div className="card">
        <div className="row">
          <div className="h2">Роли</div>
          <div className="spacer" />
          {missingRole && (
            <button className="btn" onClick={() => void addMissingRole()}>
              + {missingRole === "parent" ? "👩‍🍼 Мама" : "👩‍🏫 Специалист"}
            </button>
          )}
        </div>
        <div className="muted" style={{ marginTop: 6 }}>
          Выберите активную роль или удалите ненужную.
        </div>

        <div style={{ display: "grid", gap: 16, marginTop: 12 }}>
          {roles.map((p) => {
            const isActive = p.id === me.activeProfileId;
            return (
              <div key={p.id} className="roles-card-wrap">
                <div className="card card--status-top roles-card" style={{ background: "var(--tg-bg)" }}>
                  {isActive && <span className="pill pill--top-right pill--active-green">Активна</span>}
                  <div className="row" style={{ paddingRight: isActive ? 72 : 0 }}>
                    <div style={{ fontWeight: 900, fontSize: 18 }}>{p.title}</div>
                  </div>
                  <div className="muted" style={{ marginTop: 8 }}>
                    {p.displayName ?? "—"} · {p.city ?? "—"} · {p.district ?? "—"}
                  </div>
                  {!isActive && (
                    <div style={{ marginTop: 12 }}>
                      <button
                        type="button"
                        className="btn"
                        onClick={() => void ensureActiveProfile(p.id)}
                      >
                        Сделать активной
                      </button>
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  className="btn danger roles-delete-btn"
                  onClick={async () => {
                    const roleName = p.type === "parent" ? "Мама" : "Специалист";
                    if (!confirm(`Удалить аккаунт «${roleName}»? Все данные этой роли будут удалены безвозвратно.`)) return;
                    try {
                      await authedDelete(`/profiles/${p.id}`);
                      await refreshMe();
                      if (me?.activeProfileId === p.id) navigate("/", { replace: true });
                    } catch (e: any) {
                      setMeError(e?.message ?? "Не удалось удалить");
                    }
                  }}
                >
                  Удалить аккаунт
                </button>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="app safe" style={{ backgroundImage: `url(${backgroundImg})` }}>
      <div className="container">
        <TopBar
          logo={mainLogoImg}
          rightNode={me && activeProfile ? (
            <Link to="/roles" className="topbar-role-link" title="Роли — переключить или настроить">
              <span className="topbar-role-emoji">{activeProfile.type === "parent" ? "👩‍🍼" : "👩‍🏫"}</span>
              <span className="topbar-role-label">{activeProfile.type === "parent" ? "Мама" : "Специалист"}</span>
              <span className="topbar-role-gear">⚙</span>
            </Link>
          ) : undefined}
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
                <div className="h2">Выберите роль</div>
                <div className="row" style={{ marginTop: 10, flexWrap: "wrap", gap: 8 }}>
                  <button className="btn" onClick={() => void createRole("parent").catch((e: any) => setMeError(e?.message ?? "Не удалось создать роль"))}>
                    👩‍🍼 Мама
                  </button>
                  <button className="btn" onClick={() => void createRole("specialist").catch((e: any) => setMeError(e?.message ?? "Не удалось создать роль"))}>
                    👩‍🏫 Специалист
                  </button>
                </div>
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
