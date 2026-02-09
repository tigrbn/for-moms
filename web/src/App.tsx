import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, Route, Routes, useLocation, useNavigate, useParams } from "react-router-dom";
import { deleteJSON, getJSON, patchJSON, postJSON } from "./shared/api";
import { useTelegramAuth } from "./shared/useTelegramAuth";
import "./App.css";

import backgroundImg from "./assets/img/background.png";
import mainLogoImg from "./assets/img/main_logo.png";
import stubImg from "./assets/img/заглушка.png";
import userpicMan from "./assets/img/userpic/man.png";
import userpicWoman from "./assets/img/userpic/woman.png";
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
    avatarUrl?: string | null;
    gender?: string | null;
    age?: number | null;
    city?: string | null;
    district?: string | null;
    specialist?: { skills: string[]; pricePerHour?: number | null; about?: string | null };
    parent?: { childrenAges: number[] | null; specialWishes?: string | null };
  }>;
  activeProfileId: string | null;
};

/** URL или импорт картинки для аватара: сначала фото профиля/Telegram, иначе userpic по полу. */
function getAvatarSrc(
  avatarUrl: string | null | undefined,
  telegramPhotoUrl: string | null | undefined,
  gender: string | null | undefined,
): string {
  if (avatarUrl?.trim()) return avatarUrl;
  if (telegramPhotoUrl?.trim()) return telegramPhotoUrl;
  return gender === "male" ? userpicMan : userpicWoman;
}


type FeedResponse =
  | {
      role: "parent";
      items: Array<
        | { kind: "banner"; id: string; imageUrl: string; targetUrl?: string | null }
        | {
            kind: "specialist_profile";
            isPromoted: boolean;
            profile: { id: string; displayName?: string | null; avatarUrl?: string | null; gender?: string | null; photoUrl?: string | null; city?: string | null; district?: string | null; ratingAvg: string; ratingCount: number; pricePerHour?: number | null };
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
      avatarUrl?: string | null;
      gender?: string | null;
      photoUrl?: string | null;
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
  gender?: string | null;
  age?: number | null;
  city?: string | null;
  district?: string | null;
  ratingAvg: string;
  ratingCount: number;
  user: { username?: string | null; firstName?: string | null; lastName?: string | null; photoUrl?: string | null };
  specialist: { pricePerHour?: number | null; about?: string | null } | null;
  parent: { childrenAges?: number[] | null; specialWishes?: string | null } | null;
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

/** Для карточки заявки в ленте: до 30 мин — «Создана N минут назад», иначе дата без секунд */
function formatRequestCreatedAt(iso?: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  const now = Date.now();
  const diffMs = now - d.getTime();
  const diffMins = Math.floor(diffMs / 60_000);
  if (diffMins < 1) return "Создана только что";
  if (diffMins < 30) {
    const word = diffMins === 1 || (diffMins > 20 && diffMins % 10 === 1) ? "минуту" : (diffMins >= 2 && diffMins <= 4) || (diffMins >= 22 && diffMins <= 24) ? "минуты" : "минут";
    return `Создана ${diffMins} ${word} назад`;
  }
  return d.toLocaleString("ru-RU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
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
    const id = String(me.activeProfileId);
    return me.profiles.find((p) => String(p.id) === id) ?? null;
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
    if (type === "specialist") navigate("/profile");
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
      <Link className={`bottom-nav-item ${location.pathname === "/profile" ? "active" : ""}`} to="/profile">
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
  const refreshMe = async (): Promise<MeResponse | null> => {
    if (!token) return null;
    const data = await getJSON<MeResponse>("/me", token);
    setMe(data);
    return data;
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
                  <div className="row" style={{ alignItems: "center", gap: 12 }}>
                    <img
                      src={getAvatarSrc(o.specialist.avatarUrl, o.specialist.photoUrl, o.specialist.gender)}
                      alt=""
                      style={{ width: 48, height: 48, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }} className="row">
                      <div style={{ fontWeight: 800 }}>
                        {o.specialist.displayName ?? o.specialist.username ?? "Специалист"}
                      </div>
                      <div className="spacer" />
                      <div className="muted">{o.status}</div>
                    </div>
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
    const telegramPhotoUrl = me?.user?.photoUrl ?? null;
    const profileAvatarSrc = getAvatarSrc(activeProfile!.avatarUrl, telegramPhotoUrl, activeProfile!.gender);

    const [isEditing, setIsEditing] = useState(false);
    const [displayName, setDisplayName] = useState(activeProfile!.displayName ?? "");
    const [gender, setGender] = useState<string>(activeProfile!.gender === "male" || activeProfile!.gender === "female" ? activeProfile!.gender : "");
    const [age, setAge] = useState(activeProfile!.age != null ? String(activeProfile!.age) : "");
    const [city, setCity] = useState(activeProfile!.city ?? "");
    const [district, setDistrict] = useState(activeProfile!.district ?? "");
    const [childrenAges, setChildrenAges] = useState("");
    const [specialWishes, setSpecialWishes] = useState("");
    const [pricePerHour, setPricePerHour] = useState("");
    const [about, setAbout] = useState("");
    const [specialistCategory, setSpecialistCategory] = useState("");
    const [saving, setSaving] = useState(false);
    const [err, setErr] = useState<string | null>(null);

    useEffect(() => {
      if (!activeProfile) return;
      setDisplayName(activeProfile.displayName ?? "");
      setGender(activeProfile.gender === "male" || activeProfile.gender === "female" ? activeProfile.gender : "");
      setAge(activeProfile.age != null ? String(activeProfile.age) : "");
      setCity(activeProfile.city ?? "");
      setDistrict(activeProfile.district ?? "");
      if (activeProfile.type === "parent") {
        const parent = activeProfile.parent;
        setChildrenAges(Array.isArray(parent?.childrenAges) ? parent.childrenAges.join(", ") : "");
        setSpecialWishes(parent?.specialWishes ?? "");
      }
      if (activeProfile.type === "specialist") {
        const spec = activeProfile.specialist;
        if (spec) {
          setPricePerHour(spec.pricePerHour != null ? String(spec.pricePerHour) : "");
          setAbout(spec.about ?? "");
          const first = Array.isArray(spec.skills) && spec.skills.length > 0 ? spec.skills[0] : typeof spec.skills === "string" ? spec.skills : "";
          setSpecialistCategory(first || "");
        } else {
          setPricePerHour("");
          setAbout("");
          setSpecialistCategory("");
        }
      }
    }, [activeProfile]);

    const save = async () => {
      setErr(null);
      setSaving(true);
      try {
        const ageNum = age.trim() === "" ? null : Number(age);
        await authedPatch(`/profiles/${profileId}`, {
          displayName: displayName.trim() || null,
          gender: gender === "male" || gender === "female" ? gender : null,
          age: ageNum != null && Number.isFinite(ageNum) ? ageNum : null,
          city: city.trim() || null,
          district: district.trim() || null,
        });
        if (type === "parent") {
          const ages = childrenAges.split(",").map((s) => s.trim()).filter(Boolean).map((s) => Number(s)).filter((n) => Number.isFinite(n));
          await authedPatch(`/profiles/${profileId}/parent`, { childrenAges: ages.length ? ages : null, specialWishes: specialWishes || null });
        }
        if (type === "specialist") {
          const priceNum = pricePerHour.trim() === "" ? null : Number(pricePerHour);
          await authedPatch(`/profiles/${profileId}/specialist`, {
            skills: specialistCategory ? [specialistCategory] : [],
            pricePerHour: priceNum != null && Number.isFinite(priceNum) ? priceNum : null,
            about: about.trim() || null,
          });
        }
        await refreshMe();
        setIsEditing(false);
      } catch (e: unknown) {
        setErr(e instanceof Error ? e.message : "Не удалось сохранить");
      } finally {
        setSaving(false);
      }
    };

    // Режим просмотра
    if (!isEditing) {
      return (
        <div className="card profile-view-card">
          <div className="profile-view-header">
            <div
              className="profile-view-avatar"
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
              <img src={profileAvatarSrc} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </div>
            <div className="profile-view-title-wrap" style={{ flex: 1, minWidth: 0 }}>
              <h2 className="h2" style={{ margin: 0 }}>{activeProfile!.displayName || "—"}</h2>
              <p className="muted" style={{ margin: "4px 0 0" }}>{type === "parent" ? "👩‍🍼 Родитель" : "👩‍🏫 Специалист"}</p>
            </div>
          </div>
          <dl className="profile-view-dl">
            <div className="profile-view-row">
              <dt className="muted">Пол</dt>
              <dd>{activeProfile!.gender === "male" ? "Мужской" : activeProfile!.gender === "female" ? "Женский" : "—"}</dd>
            </div>
            <div className="profile-view-row">
              <dt className="muted">Возраст</dt>
              <dd>{activeProfile!.age != null ? `${activeProfile!.age} лет` : "—"}</dd>
            </div>
            <div className="profile-view-row">
              <dt className="muted">Город</dt>
              <dd>{activeProfile!.city || "—"}</dd>
            </div>
            <div className="profile-view-row">
              <dt className="muted">Район</dt>
              <dd>{activeProfile!.district || "—"}</dd>
            </div>
            {type === "parent" && (
              <>
                <div className="profile-view-row">
                  <dt className="muted">Возраст детей</dt>
                  <dd>{(activeProfile!.parent?.childrenAges ?? []).length > 0 ? (activeProfile!.parent?.childrenAges ?? []).join(", ") : "—"}</dd>
                </div>
                <div className="profile-view-row">
                  <dt className="muted">Пожелания</dt>
                  <dd>{activeProfile!.parent?.specialWishes || "—"}</dd>
                </div>
              </>
            )}
            {type === "specialist" && (
              <>
                <div className="profile-view-row">
                  <dt className="muted">Категория</dt>
                  <dd>{(activeProfile!.specialist?.skills ?? []).length > 0 ? (activeProfile!.specialist?.skills ?? [])[0] : "—"}</dd>
                </div>
                <div className="profile-view-row">
                  <dt className="muted">Цена за час</dt>
                  <dd>{activeProfile!.specialist?.pricePerHour != null ? `${activeProfile!.specialist!.pricePerHour} ₽` : "—"}</dd>
                </div>
                <div className="profile-view-row">
                  <dt className="muted">О себе</dt>
                  <dd style={{ whiteSpace: "pre-wrap" }}>{(activeProfile!.specialist?.about ?? "").trim() || "—"}</dd>
                </div>
              </>
            )}
          </dl>
          <div className="profile-view-actions">
            <button type="button" className="btn btn-primary" onClick={() => setIsEditing(true)}>
              Редактировать
            </button>
          </div>
        </div>
      );
    }

    // Режим редактирования
    return (
      <div className="card profile-edit-card">
        <div className="profile-edit-header">
          <h2 className="h2" style={{ margin: 0 }}>Редактирование профиля</h2>
          <p className="muted" style={{ margin: "4px 0 0" }}>{type === "parent" ? "👩‍🍼 Родитель" : "👩‍🏫 Специалист"}</p>
        </div>
        {err && <div className="profile-edit-err muted" role="alert">{err}</div>}
        <div className="profile-edit-fields">
          <div className="field">
            <label className="label">Имя для отображения</label>
            <input className="input" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Как к вам обращаться" />
          </div>
          <div className="field">
            <label className="label">Пол</label>
            <select className="input" value={gender} onChange={(e) => setGender(e.target.value)}>
              <option value="">Не указан</option>
              <option value="female">Женский</option>
              <option value="male">Мужской</option>
            </select>
          </div>
          <div className="field">
            <label className="label">Возраст</label>
            <input className="input" value={age} onChange={(e) => setAge(e.target.value)} inputMode="numeric" placeholder="25" />
          </div>
          <div className="field">
            <label className="label">Город</label>
            <input className="input" value={city} onChange={(e) => setCity(e.target.value)} placeholder="Москва" />
          </div>
          <div className="field">
            <label className="label">Район</label>
            <input className="input" value={district} onChange={(e) => setDistrict(e.target.value)} placeholder="Центральный" />
          </div>
          {type === "parent" && (
            <>
              <div className="field">
                <label className="label">Возраст детей (через запятую)</label>
                <input className="input" value={childrenAges} onChange={(e) => setChildrenAges(e.target.value)} placeholder="2, 5, 7" />
              </div>
              <div className="field">
                <label className="label">Пожелания</label>
                <textarea className="textarea" value={specialWishes} onChange={(e) => setSpecialWishes(e.target.value)} placeholder="Кратко опишите пожелания" />
              </div>
            </>
          )}
          {type === "specialist" && (
            <>
              <div className="field">
                <label className="label">Категория</label>
                <select className="input" value={specialistCategory} onChange={(e) => setSpecialistCategory(e.target.value)}>
                  <option value="">Не выбрано</option>
                  {FEED_CATEGORIES.filter((c) => c.id).map((c) => (
                    <option key={c.id} value={c.id}>{c.label}</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label className="label">Цена за час (₽)</label>
                <input className="input" value={pricePerHour} onChange={(e) => setPricePerHour(e.target.value)} inputMode="numeric" placeholder="1000" />
              </div>
              <div className="field">
                <label className="label">О себе</label>
                <textarea className="textarea" value={about} onChange={(e) => setAbout(e.target.value)} placeholder="Опыт, образование, чем можете помочь" rows={4} />
              </div>
            </>
          )}
        </div>
        <div className="profile-edit-actions row" style={{ flexWrap: "wrap", gap: 8 }}>
          <button type="button" className="btn btn-primary" disabled={saving} onClick={() => void save()}>
            {saving ? "Сохранение…" : "Сохранить"}
          </button>
          <button type="button" className="btn secondary" disabled={saving} onClick={() => { setErr(null); setIsEditing(false); }}>
            Отмена
          </button>
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

        <div className="card feed-header-card">
          <div className="row">
            <div className="row feed-title-row">
              <img src={menuLenta} alt="" className="feed-title-icon" />
              <span className="h2">Лента</span>
            </div>
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
                        <img src={getAvatarSrc(p.avatarUrl, p.photoUrl, p.gender)} alt="" />
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
                    <div className="feed-card-request-meta">
                      <span>Район: {r.district ?? "—"}</span>
                      <span>Бюджет: {formatMoney(r.budget)}</span>
                      <span className="feed-card-request-time">{formatRequestCreatedAt(r.createdAt)}</span>
                    </div>
                    {r.description && <div className="feed-card-desc">{r.description}</div>}
                    <div className="feed-card-request-actions">
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
        } catch (e: any) {
          if (cancelled) return;
          setReviewsErr(e?.message ?? "Не удалось загрузить отзывы");
          setReviews([]);
        }
      };
      void run();
      return () => {
        cancelled = true;
      };
    }, [profileId, token]);

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
                <div className="h2" style={{ margin: 0 }}>{title}</div>
                <div className="spacer" />
                <div className="muted">★ {p.ratingAvg} ({p.ratingCount})</div>
              </div>
              <div className="muted" style={{ marginTop: 6 }}>
                {p.city && <span>Город: {p.city}</span>}
                {p.city && p.district && " · "}
                {p.district && <span>Район: {p.district}</span>}
                {!p.city && !p.district && "—"}
              </div>
              {p.age != null && p.age > 0 && (
                <div className="muted" style={{ marginTop: 4 }}>Возраст: {p.age} лет</div>
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
                  <div className="label" style={{ marginBottom: 6 }}>О специалисте</div>
                  <div style={{ whiteSpace: "pre-wrap" }}>{(p.specialist?.about ?? "").trim()}</div>
                </div>
              )}
            </>
          )}
          {p.type === "parent" && (p.parent?.childrenAges?.length || p.parent?.specialWishes) && (
            <div style={{ marginTop: 12 }}>
              {p.parent.childrenAges && p.parent.childrenAges.length > 0 && (
                <div className="muted" style={{ marginTop: 6 }}>Возраст детей: {p.parent.childrenAges.join(", ")}</div>
              )}
              {p.parent.specialWishes && (
                <div style={{ marginTop: 6 }}>{p.parent.specialWishes}</div>
              )}
            </div>
          )}
          <div className="row" style={{ marginTop: 16, flexWrap: "wrap", gap: 8 }}>
            {tgUrl ? (
              <a className="btn btn-primary" href={tgUrl} target="_blank" rel="noreferrer">
                Написать в Telegram
              </a>
            ) : (
              <span className="muted" style={{ alignSelf: "center" }}>Контакты в Telegram не указаны</span>
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
      <div className="card roles-page">
        <div className="row">
          <div className="h2">Роли</div>
          <div className="spacer" />
          {missingRole && (
            <button className="btn roles-page-btn" onClick={() => void addMissingRole()}>
              + {missingRole === "parent" ? "👩‍🍼 Мама" : "👩‍🏫 Специалист"}
            </button>
          )}
        </div>
        <div className="muted roles-page-desc">
          Выберите активную роль или удалите ненужную.
        </div>

        <div className="roles-list">
          {roles.map((p) => {
            const isActive = p.id === me.activeProfileId;
            return (
              <div key={p.id} className="roles-card-wrap">
                <div className="card card--status-top roles-card" style={{ background: "var(--tg-bg)" }}>
                  <div className="roles-card-inner">
                    <div className="roles-card-left">
                      <div className="roles-card-title">{p.title}</div>
                      <div className="muted roles-card-desc">
                        {p.displayName ?? "—"} · {p.city ?? "—"} · {p.district ?? "—"}
                      </div>
                    </div>
                    <div className="roles-card-right">
                      {isActive ? (
                        <span className="pill pill--active-green">Активна</span>
                      ) : (
                        <button
                          type="button"
                          className="btn roles-page-btn"
                          onClick={() => void ensureActiveProfile(p.id)}
                        >
                          Сделать активной
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  className="btn danger roles-delete-btn roles-page-btn"
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
    <div className="app safe" style={{ backgroundImage: `url(${backgroundImg})`, backgroundSize: "cover", backgroundPosition: "center", backgroundRepeat: "no-repeat" }}>
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
              <RolesScreen />
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
                    element={
                      activeProfile?.type === "parent" || activeProfile?.type === "specialist" ? (
                        <ProfileScreen />
                      ) : (
                        <Navigate to="/roles" replace />
                      )
                    }
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
