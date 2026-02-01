import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, Route, Routes, useLocation, useNavigate, useParams } from "react-router-dom";
import { getJSON, postJSON } from "./shared/api";
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
  | { role: "parent"; items: any[] }
  | { role: "specialist"; items: any[] };

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

export default function App() {
  const { token, clearToken, loading, error } = useTelegramAuth();
  const [me, setMe] = useState<MeResponse | null>(null);
  const [meLoading, setMeLoading] = useState(false);
  const [meError, setMeError] = useState<string | null>(null);

  const [feed, setFeed] = useState<FeedResponse | null>(null);
  const [feedError, setFeedError] = useState<string | null>(null);
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
        const data = await getJSON<FeedResponse>("/feed", token);
        setFeed(data);
      } catch (e: any) {
        setFeedError(e?.message ?? "Failed to load feed");
      }
    };
    void run();
  }, [token, me?.activeProfileId]);

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

  const nav = (
    <div className="card">
      <div className="row">
        <Link className="btn ghost" to="/" style={{ textDecoration: "none" }}>
          Лента
        </Link>
        <Link className="btn ghost" to="/requests" style={{ textDecoration: "none" }}>
          Заявки
        </Link>
        <Link className="btn ghost" to="/offers" style={{ textDecoration: "none" }}>
          Отклики
        </Link>
        <Link className="btn ghost" to="/profile" style={{ textDecoration: "none" }}>
          Профиль
        </Link>
        <div className="spacer" />
        <button className="btn secondary" onClick={() => { clearToken(); navigate("/", { replace: true }); }}>
          Выйти
        </button>
      </div>
    </div>
  );

  const roleSwitcher =
    me && me.profiles.length > 0 ? (
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
            >
              {p.type === "parent" ? "👶 Родитель" : "👩‍🏫 Специалист"}
            </button>
          ))}
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
            В режиме специалиста заявки доступны в ленте (раздел “Лента”).
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
        {items && (
          <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
            {items.map((r) => (
              <div key={r.id} className="card" style={{ background: "var(--tg-bg)" }}>
                <div className="row">
                  <div style={{ fontWeight: 800 }}>{r.category}</div>
                  <div className="spacer" />
                  <div className="muted">{r.status}</div>
                </div>
                <div className="muted" style={{ marginTop: 6 }}>
                  Район: {r.district ?? "—"} · Бюджет: {formatMoney(r.budget)} · Откликов: {r.offersCount}
                </div>
                {r.description && <div style={{ marginTop: 8 }}>{r.description}</div>}
                <div className="row" style={{ marginTop: 10 }}>
                  <Link className="btn secondary" to={`/requests/${r.id}`}>
                    Открыть
                  </Link>
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

    useEffect(() => {
      const run = async () => {
        setErr(null);
        setData(null);
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

    if (err) return <ErrorBox error={err} />;
    if (!data) return <div className="card">Загрузка…</div>;

    const accepted = data.offers.find((o) => o.status === "accepted") ?? null;

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
        </div>

        {actionErr && <ErrorBox error={actionErr} />}

        {activeProfileType === "specialist" && (
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
        )}

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
                    <button className="btn" onClick={() => void acceptOffer(o.id)} disabled={o.status !== "pending"}>
                      Принять
                    </button>
                    <button className="btn secondary" onClick={() => void rejectOffer(o.id)} disabled={o.status !== "pending"}>
                      Отклонить
                    </button>
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
        {items && (
          <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
            {items.map((o) => (
              <div key={o.id} className="card" style={{ background: "var(--tg-bg)" }}>
                <div className="row">
                  <div style={{ fontWeight: 800 }}>{o.request.category}</div>
                  <div className="spacer" />
                  <div className="muted">{o.status}</div>
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

    const [saving, setSaving] = useState(false);
    const [err, setErr] = useState<string | null>(null);

    useEffect(() => {
      setDisplayName(activeProfile?.displayName ?? "");
      setCity(activeProfile?.city ?? "");
      setDistrict(activeProfile?.district ?? "");
    }, [activeProfileId]);

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
          <div className="muted">{type}</div>
        </div>
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

          <div className="row">
            <button className="btn" disabled={saving} onClick={() => void save()}>
              {saving ? "Сохранение…" : "Сохранить"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app safe">
      <div className="container">
        <TopBar
          title="ForMoms"
          sub={
            loading
              ? "Авторизация…"
              : token
                ? "✅ Logged in."
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
                    👶 Родитель
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
                <div className="muted" style={{ marginTop: 10 }}>
                  Магазин перенесён во 2-й релиз.
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
                    element={
                      <div className="card">
                        <div className="h2">Лента</div>
                        {feedError && <div className="muted" style={{ marginTop: 8 }}>{feedError}</div>}
                        {!feed && <div className="muted" style={{ marginTop: 8 }}>Загрузка…</div>}
                        {feed && (
                          <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
                            {feed.items.map((it: any, idx: number) => (
                              <div key={idx} className="card" style={{ background: "var(--tg-bg)" }}>
                                <pre style={{ margin: 0, whiteSpace: "pre-wrap" }}>
                                  {JSON.stringify(it, null, 2)}
                                </pre>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    }
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

                  <Route
                    path="/profile"
                    element={<ProfileScreen />}
                  />

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
