import { useCallback, useEffect, useMemo, useState } from "react";
import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { getJSON } from "./shared/api";
import { useTelegramAuth } from "./shared/useTelegramAuth";
import "./App.css";

import mainLogoImg from "./assets/img/main_logo.png";

import type { MeResponse, FeedResponse } from "./types";
import { AppContext } from "./context/AppContext";
import { TopBar } from "./components/TopBar";
import { ErrorBox } from "./components/ErrorBox";
import { PARENT_ROLE_EMOJI } from "./lib/labels";
import { BottomNav } from "./components/BottomNav";

import { RequestsScreen } from "./pages/RequestsScreen";
import { NewRequestScreen } from "./pages/NewRequestScreen";
import { RequestDetailsScreen } from "./pages/RequestDetailsScreen";
import { OffersScreen } from "./pages/OffersScreen";
import { ProfileScreen } from "./pages/ProfileScreen";
import { ContactScreen } from "./pages/ContactScreen";
import { FeedScreen } from "./pages/FeedScreen";
import { PublicProfileScreen } from "./pages/PublicProfileScreen";
import { DocPage } from "./pages/DocPage";
import { NewProfileScreen } from "./pages/NewProfileScreen";
import { NewPostScreen } from "./pages/NewPostScreen";
import { PostDetailScreen } from "./pages/PostDetailScreen";
import { AnalyticsScreen } from "./pages/AnalyticsScreen";
import { useParams } from "react-router-dom";

function NewProfileByRoleRoute() {
  const { roleType } = useParams<{ roleType: string }>();
  if (roleType !== "parent" && roleType !== "specialist" && roleType !== "company") {
    return <Navigate to="/profile" replace />;
  }
  return <NewProfileScreen type={roleType as "parent" | "specialist" | "company"} />;
}

export default function App() {
  const { token, clearToken, error } = useTelegramAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [pendingRoleType, setPendingRoleType] = useState<"parent" | "specialist" | "company" | null>(null);

  const [me, setMe] = useState<MeResponse | null>(null);
  const [meLoading, setMeLoading] = useState(false);
  const [meError, setMeError] = useState<string | null>(null);

  const [feed, setFeed] = useState<FeedResponse | null>(null);
  const [feedError, setFeedError] = useState<string | null>(null);
  const [feedCategory, setFeedCategory] = useState("");
  const [feedSubcategory, setFeedSubcategory] = useState("");
  const [feedReloadKey, setFeedReloadKey] = useState(0);
  const FEED_VIEW_KEY = "for_moms_feed_view";
  const [feedView, setFeedViewState] = useState<"specialists" | "requests">(() => {
    try {
      const s = localStorage.getItem(FEED_VIEW_KEY);
      if (s === "specialists" || s === "requests") return s;
    } catch {}
    return "specialists";
  });
  const setFeedView = useCallback((next: "specialists" | "requests") => {
    setFeedViewState(next);
    try {
      localStorage.setItem(FEED_VIEW_KEY, next);
    } catch {}
    setFeedReloadKey((k) => k + 1);
  }, []);
  const [feedPage, setFeedPage] = useState(1);
  useEffect(() => {
    setFeedPage(1);
  }, [feedCategory, feedSubcategory, feedView]);
  const [parentNewOffersCount, setParentNewOffersCount] = useState<number | null>(null);
  const [reauthing, setReauthing] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);

  useEffect(() => {
    const isInput = (el: EventTarget | null) => {
      if (!el || !(el instanceof Element)) return false;
      const tag = (el as HTMLElement).tagName;
      return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
    };
    const handleFocusIn = (e: FocusEvent) => {
      if (isInput(e.target)) setInputFocused(true);
    };
    const handleFocusOut = () => {
      setTimeout(() => {
        if (!isInput(document.activeElement)) setInputFocused(false);
      }, 0);
    };
    document.addEventListener("focusin", handleFocusIn);
    document.addEventListener("focusout", handleFocusOut);
    return () => {
      document.removeEventListener("focusin", handleFocusIn);
      document.removeEventListener("focusout", handleFocusOut);
    };
  }, []);

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
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Failed to load /me";
        if (typeof msg === "string" && msg.includes("HTTP 401")) {
          setReauthing(true);
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
      setFeedError(null);
      try {
        const qs = new URLSearchParams();
        const effectiveCategory = feedSubcategory.trim() || feedCategory.trim();
        if (effectiveCategory) qs.set("category", effectiveCategory);
        qs.set("view", feedView);
        const path = `/feed?${qs.toString()}`;
        const data = await getJSON<FeedResponse>(path, token);
        setFeed(data);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Failed to load feed";
        if (typeof msg === "string" && msg.includes("401")) {
          setReauthing(true);
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
  }, [token, feedCategory, feedSubcategory, feedView, feedReloadKey]);

  useEffect(() => {
    if (token) setReauthing(false);
  }, [token]);

  const activeProfile = useMemo(() => {
    if (!me?.activeProfileId) return null;
    const id = String(me.activeProfileId);
    return me.profiles.find((p) => String(p.id) === id) ?? null;
  }, [me]);

  const ensureActiveProfile = useCallback(
    async (profileId: string) => {
      if (!token) return;
      const { postJSON } = await import("./shared/api");
      await postJSON<{ activeProfileId: string | null }>("/me/active-profile", { profileId }, token);
      const data = await getJSON<MeResponse>("/me", token);
      setMe(data);
    },
    [token],
  );

  const createRole = useCallback(
    async (type: "parent" | "specialist" | "company") => {
      if (!token) return;
      const { postJSON } = await import("./shared/api");
      const created = await postJSON<{ id: string }>("/profiles", { type }, token);
      await ensureActiveProfile(created.id);
      navigate("/profile", { state: { openEdit: true } });
    },
    [token, ensureActiveProfile, navigate],
  );

  const refreshMe = useCallback(async (): Promise<MeResponse | null> => {
    if (!token) return null;
    const data = await getJSON<MeResponse>("/me", token);
    setMe(data);
    return data;
  }, [token]);

  const authedGet = useCallback(
    async <T,>(path: string): Promise<T> => {
      if (!token) throw new Error("No token");
      return getJSON<T>(path, token);
    },
    [token],
  );

  const authedPost = useCallback(
    async <T,>(path: string, body: unknown): Promise<T> => {
      if (!token) throw new Error("No token");
      const { postJSON } = await import("./shared/api");
      return postJSON<T>(path, body, token);
    },
    [token],
  );

  const authedPatch = useCallback(
    async <T,>(path: string, body: unknown): Promise<T> => {
      if (!token) throw new Error("No token");
      const { patchJSON } = await import("./shared/api");
      return patchJSON<T>(path, body, token);
    },
    [token],
  );

  const authedDelete = useCallback(
    async <T,>(path: string): Promise<T> => {
      if (!token) throw new Error("No token");
      const { deleteJSON } = await import("./shared/api");
      return deleteJSON<T>(path, token);
    },
    [token],
  );

  const refreshParentNewOffersCount = useCallback(async () => {
    if (!token) return;
    const active = me?.profiles.find((p) => String(p.id) === String(me?.activeProfileId));
    if (active?.type !== "parent") {
      setParentNewOffersCount(null);
      return;
    }
    try {
      const data = await getJSON<{ count: number }>("/requests/new-offers-count", token);
      setParentNewOffersCount(data.count);
    } catch {
      setParentNewOffersCount(null);
    }
  }, [token, me?.activeProfileId, me?.profiles]);

  useEffect(() => {
    if (!me?.activeProfileId) return;
    const active = me.profiles.find((p) => String(p.id) === String(me.activeProfileId));
    if (active?.type === "parent") void refreshParentNewOffersCount();
    else setParentNewOffersCount(null);
  }, [me?.activeProfileId, me?.profiles, refreshParentNewOffersCount]);

  const allTypes = useMemo(() => new Set((me?.profiles ?? []).map((p) => p.type)), [me]);
  const missingRoles = useMemo(() => {
    const roles: ("parent" | "specialist" | "company")[] = [];
    if (!allTypes.has("parent")) roles.push("parent");
    if (!allTypes.has("specialist")) roles.push("specialist");
    if (!allTypes.has("company")) roles.push("company");
    return roles;
  }, [allTypes]);
  const missingRole = missingRoles[0] ?? null;

  const addRole = useCallback((role: "parent" | "specialist" | "company") => {
    navigate(`/profile/new/${role}`);
  }, [navigate]);
  const addMissingRole = useCallback((): Promise<void> => {
    if (!missingRole) return Promise.resolve();
    addRole(missingRole);
    return Promise.resolve();
  }, [missingRole, addRole]);

  const contextValue = useMemo(
    () => ({
      token,
      clearToken,
      me,
      setMe,
      meLoading,
      meError,
      setMeError,
      feed,
      setFeed,
      feedError,
      setFeedError,
      feedCategory,
      setFeedCategory,
      feedSubcategory,
      setFeedSubcategory,
      feedReloadKey,
      setFeedReloadKey,
      feedView,
      setFeedView,
      feedPage,
      setFeedPage,
      activeProfile,
      activeProfileId: me?.activeProfileId ?? null,
      activeProfileType: activeProfile?.type ?? null,
      ensureActiveProfile,
      createRole,
      refreshMe,
      authedGet,
      authedPost,
      authedPatch,
      authedDelete,
      navigate: (to: string | number, opts?: { replace?: boolean; state?: unknown }) => {
        if (typeof to === "number") navigate(to);
        else navigate(to, opts);
      },
      missingRole,
      missingRoles,
      addMissingRole,
      addRole,
      allTypes,
      parentNewOffersCount,
      refreshParentNewOffersCount,
      isAdmin: me?.isAdmin ?? false,
    }),
    [
      token,
      clearToken,
      me,
      meLoading,
      meError,
      feed,
      feedError,
      feedCategory,
      feedSubcategory,
      feedReloadKey,
      feedView,
      feedPage,
      activeProfile,
      ensureActiveProfile,
      createRole,
      refreshMe,
      authedGet,
      authedPost,
      authedPatch,
      authedDelete,
      navigate,
      missingRole,
      missingRoles,
      addMissingRole,
      addRole,
      allTypes,
      parentNewOffersCount,
      refreshParentNewOffersCount,
    ],
  );

  return (
    <div className={`app safe${inputFocused ? " input-focused" : ""}`}>
      <div className="container">
        <TopBar
          logo={mainLogoImg}
          rightNode={<span className="topbar-feed-btn">📍 г. Якутск</span>}
        />

        {error && <ErrorBox error={error} />}
        {reauthing && (
          <div className="card session-toast" role="status">
            Обновляем сессию…
          </div>
        )}

        {!token && (
          <div className="card">
            <div className="h2">Вход</div>
            <div className="muted" style={{ marginTop: 6 }}>
              Этот экран работает только внутри Telegram WebApp (Mini App).
            </div>
          </div>
        )}

        {token && (
          <AppContext.Provider value={contextValue}>
            {(meLoading || !me) && <div className="card">Загрузка профиля…</div>}
            {meError && <ErrorBox error={meError} />}

            {me && (() => {
              // Заглушка «Технические работы»: добавить import { TechnicalWorksScreen } from "./components/TechnicalWorksScreen" и раскомментировать:
              // if (!me.isAdmin) return <TechnicalWorksScreen />;
              const hasProfiles = me.profiles.length > 0;

              const authRoleChoice = (
                <div className="card">
                  <div className="h2">Выберите роль</div>
                  <p className="muted" style={{ marginTop: 8, marginBottom: 12 }}>
                    Дальше нужно принять условия и заполнить профиль.
                  </p>
                  <div className="row" style={{ flexWrap: "wrap", gap: 8 }}>
                    <button
                      type="button"
                      className="btn"
                      onClick={() => setPendingRoleType("parent")}
                    >
                      {PARENT_ROLE_EMOJI} Родитель
                    </button>
                    <button
                      type="button"
                      className="btn"
                      onClick={() => setPendingRoleType("specialist")}
                    >
                      👩‍🏫 Специалист
                    </button>
                    <button
                      type="button"
                      className="btn"
                      onClick={() => setPendingRoleType("company")}
                    >
                      🏢 Компания
                    </button>
                  </div>
                </div>
              );

              return (
                <>
                  <Routes>
                    <Route path="/docs/:docType" element={<DocPage />} />
                    <Route
                      path="/"
                      element={
                        !hasProfiles ? (
                          <FeedScreen />
                        ) : activeProfile ? (
                          <FeedScreen />
                        ) : (
                          <Navigate to="/profile" replace />
                        )
                      }
                    />
                    <Route
                      path="/auth"
                      element={
                        hasProfiles ? (
                          <Navigate to="/profile" replace />
                        ) : !pendingRoleType ? (
                          authRoleChoice
                        ) : (
                          <NewProfileScreen type={pendingRoleType} />
                        )
                      }
                    />
                    <Route
                      path="/requests"
                      element={
                        !hasProfiles ? (
                          <Navigate to="/auth" replace />
                        ) : activeProfile ? (
                          <RequestsScreen />
                        ) : (
                          <Navigate to="/profile" replace />
                        )
                      }
                    />
                    <Route
                      path="/requests/new"
                      element={
                        !hasProfiles ? (
                          <Navigate to="/auth" replace />
                        ) : activeProfile ? (
                          <NewRequestScreen />
                        ) : (
                          <Navigate to="/profile" replace />
                        )
                      }
                    />
                    <Route
                      path="/requests/:id"
                      element={
                        !hasProfiles ? (
                          <Navigate to="/auth" replace />
                        ) : activeProfile ? (
                          <RequestDetailsScreen />
                        ) : (
                          <Navigate to="/profile" replace />
                        )
                      }
                    />
                    <Route
                      path="/offers"
                      element={
                        !hasProfiles ? (
                          <Navigate to="/auth" replace />
                        ) : activeProfile ? (
                          <OffersScreen />
                        ) : (
                          <Navigate to="/profile" replace />
                        )
                      }
                    />
                    <Route
                      path="/profile"
                      element={!hasProfiles ? <Navigate to="/auth" replace /> : <ProfileScreen />}
                    />
                    <Route path="/profile/analytics" element={hasProfiles ? <AnalyticsScreen /> : <Navigate to="/auth" replace />} />
                    <Route path="/profile/contact" element={hasProfiles ? <ContactScreen /> : <Navigate to="/auth" replace />} />
                    <Route path="/profile/new/:roleType" element={hasProfiles ? <NewProfileByRoleRoute /> : <Navigate to="/auth" replace />} />
                    <Route path="/profiles/:id" element={<PublicProfileScreen />} />
                    <Route path="/posts/new" element={hasProfiles && activeProfile ? <NewPostScreen /> : <Navigate to={hasProfiles ? "/profile" : "/auth"} replace />} />
                    <Route path="/posts/:id" element={<PostDetailScreen />} />
                    <Route
                      path="*"
                      element={
                        !hasProfiles ? (
                          <Navigate to="/" replace />
                        ) : activeProfile ? (
                          <Navigate to="/" replace state={{ from: location.pathname }} />
                        ) : (
                          <Navigate to="/profile" replace />
                        )
                      }
                    />
                  </Routes>
                </>
              );
            })()}

            {me && <BottomNav />}
          </AppContext.Provider>
        )}
      </div>
    </div>
  );
}
