import { useEffect, useMemo, useState } from "react";
import { getJSON, postJSON } from "./shared/api";
import { useTelegramAuth } from "./shared/useTelegramAuth";

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

export default function App() {
  const { token, clearToken, loading, error } = useTelegramAuth();
  const [me, setMe] = useState<MeResponse | null>(null);
  const [meLoading, setMeLoading] = useState(false);
  const [meError, setMeError] = useState<string | null>(null);

  const [feed, setFeed] = useState<FeedResponse | null>(null);
  const [feedError, setFeedError] = useState<string | null>(null);

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

  return (
    <div style={{ padding: 16 }}>
      <h2>ForMoms</h2>

      {loading && <p>Auth…</p>}
      {error && <pre style={{ whiteSpace: "pre-wrap" }}>{error}</pre>}

      {!token && <p>ℹ️ Open this page inside Telegram Mini App to login.</p>}

      {token && (
        <>
          <p style={{ opacity: 0.7, marginTop: 0 }}>✅ Logged in.</p>

          {(meLoading || !me) && <p>Loading profile…</p>}
          {meError && <pre style={{ whiteSpace: "pre-wrap" }}>{meError}</pre>}

          {me && me.profiles.length === 0 && (
            <div style={{ border: "1px solid #ddd", padding: 12, borderRadius: 8 }}>
              <h3 style={{ marginTop: 0 }}>Выберите роли</h3>
              <button onClick={() => void createRole("parent")}>👶 Родитель</button>{" "}
              <button onClick={() => void createRole("specialist")}>👩‍🏫 Специалист</button>
              <p style={{ opacity: 0.7 }}>
                Магазин перенесён во 2-й релиз.
              </p>
            </div>
          )}

          {me && me.profiles.length > 0 && (
            <div style={{ display: "flex", gap: 8, alignItems: "center", margin: "12px 0" }}>
              <strong>Роль:</strong>
              {me.profiles
                .filter((p) => p.isActive)
                .filter((p) => p.type === "parent" || p.type === "specialist")
                .map((p) => (
                  <button
                    key={p.id}
                    onClick={() => void ensureActiveProfile(p.id)}
                    style={{
                      fontWeight: p.id === me.activeProfileId ? 700 : 400,
                    }}
                  >
                    {p.type === "parent" ? "👶 Родитель" : "👩‍🏫 Специалист"}
                  </button>
                ))}
              {!me.activeProfileId && <span style={{ color: "#b00" }}>не выбрана</span>}
            </div>
          )}

          {activeProfile && (
            <>
              <div style={{ marginBottom: 8, opacity: 0.8 }}>
                Активный профиль: <code>{activeProfile.id}</code> ({activeProfile.type})
              </div>

              {feedError && <pre style={{ whiteSpace: "pre-wrap" }}>{feedError}</pre>}
              {!feed && <p>Loading feed…</p>}
              {feed && (
                <div style={{ display: "grid", gap: 8 }}>
                  {feed.items.map((it: any, idx: number) => (
                    <pre
                      key={idx}
                      style={{
                        padding: 12,
                        border: "1px solid #eee",
                        borderRadius: 8,
                        whiteSpace: "pre-wrap",
                      }}
                    >
                      {JSON.stringify(it, null, 2)}
                    </pre>
                  ))}
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
