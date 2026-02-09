import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { getJSON } from "./shared/api";
import { useTelegramAuth } from "./shared/useTelegramAuth";
import "./App.css";

import mainLogoImg from "./assets/img/main_logo.png";

import type { MeResponse, FeedResponse } from "./types";
import { AppContext } from "./context/AppContext";
import { TopBar } from "./components/TopBar";
import { ErrorBox } from "./components/ErrorBox";
import { BottomNav } from "./components/BottomNav";

import { RequestsScreen } from "./pages/RequestsScreen";
import { NewRequestScreen } from "./pages/NewRequestScreen";
import { RequestDetailsScreen } from "./pages/RequestDetailsScreen";
import { OffersScreen } from "./pages/OffersScreen";
import { ProfileScreen } from "./pages/ProfileScreen";
import { FeedScreen } from "./pages/FeedScreen";
import { PublicProfileScreen } from "./pages/PublicProfileScreen";
import { RolesScreen } from "./pages/RolesScreen";

export default function App() {
  const { token, clearToken, error } = useTelegramAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [me, setMe] = useState<MeResponse | null>(null);
  const [meLoading, setMeLoading] = useState(false);
  const [meError, setMeError] = useState<string | null>(null);

  const [feed, setFeed] = useState<FeedResponse | null>(null);
  const [feedError, setFeedError] = useState<string | null>(null);
  const [feedCategory, setFeedCategory] = useState("");
  const [feedReloadKey, setFeedReloadKey] = useState(0);

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
      if (!token || !me?.activeProfileId) return;
      setFeedError(null);
      try {
        const qs = new URLSearchParams();
        if (feedCategory.trim()) qs.set("category", feedCategory.trim());
        const path = qs.toString() ? `/feed?${qs.toString()}` : "/feed";
        const data = await getJSON<FeedResponse>(path, token);
        setFeed(data);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Failed to load feed";
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
    async (type: "parent" | "specialist") => {
      if (!token) return;
      const { postJSON } = await import("./shared/api");
      const created = await postJSON<{ id: string }>("/profiles", { type }, token);
      await ensureActiveProfile(created.id);
      if (type === "specialist") navigate("/profile");
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

  const allTypes = useMemo(() => new Set((me?.profiles ?? []).map((p) => p.type)), [me]);
  const missingRole = useMemo(() => {
    if (!allTypes.has("parent")) return "parent" as const;
    if (!allTypes.has("specialist")) return "specialist" as const;
    return null;
  }, [allTypes]);

  const addMissingRole = useCallback(async () => {
    if (!missingRole) return;
    try {
      await createRole(missingRole);
    } catch (e: unknown) {
      setMeError(e instanceof Error ? e.message : "Не удалось добавить роль");
    }
  }, [missingRole, createRole]);

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
      feedReloadKey,
      setFeedReloadKey,
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
      addMissingRole,
      allTypes,
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
      feedReloadKey,
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
      addMissingRole,
      allTypes,
    ],
  );

  return (
    <div className="app safe">
      <div className="container">
        <TopBar
          logo={mainLogoImg}
          rightNode={
            me && activeProfile ? (
              <Link to="/roles" className="topbar-role-link" title="Роли — переключить или настроить">
                <span className="topbar-role-emoji">{activeProfile.type === "parent" ? "👩‍🍼" : "👩‍🏫"}</span>
                <span className="topbar-role-label">{activeProfile.type === "parent" ? "Мама" : "Специалист"}</span>
                <span className="topbar-role-gear">⚙</span>
              </Link>
            ) : undefined
          }
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
          <AppContext.Provider value={contextValue}>
            {(meLoading || !me) && <div className="card">Загрузка профиля…</div>}
            {meError && <ErrorBox error={meError} />}

            {me && me.profiles.length === 0 && (
              <div className="card">
                <div className="h2">Выберите роль</div>
                <div className="row" style={{ marginTop: 10, flexWrap: "wrap", gap: 8 }}>
                  <button
                    className="btn"
                    onClick={() => void createRole("parent").catch((e: unknown) => setMeError(e instanceof Error ? e.message : "Не удалось создать роль"))}
                  >
                    👩‍🍼 Мама
                  </button>
                  <button
                    className="btn"
                    onClick={() =>
                      void createRole("specialist").catch((e: unknown) =>
                        setMeError(e instanceof Error ? e.message : "Не удалось создать роль"),
                      )
                    }
                  >
                    👩‍🏫 Специалист
                  </button>
                </div>
              </div>
            )}

            {me && me.profiles.length > 0 && !me.activeProfileId && <RolesScreen />}

            {me && me.activeProfileId && activeProfile && (
              <>
                <BottomNav />

                <Routes>
                  <Route path="/" element={<FeedScreen />} />
                  <Route path="/requests" element={<RequestsScreen />} />
                  <Route path="/requests/new" element={<NewRequestScreen />} />
                  <Route path="/requests/:id" element={<RequestDetailsScreen />} />
                  <Route path="/offers" element={<OffersScreen />} />
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
          </AppContext.Provider>
        )}
      </div>
    </div>
  );
}
