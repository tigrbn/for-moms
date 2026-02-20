import { useCallback, useEffect, useState } from "react";
import { postJSON } from "./api";

type SessionResponse = {
  accessToken: string;
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
  }>;
  activeProfileId: string | null;
};

export type MiniAppPlatform = "telegram" | "max";

function getInitData(): { initData: string; platform: MiniAppPlatform } | null {
  // MAX: window.WebApp (подключается через max-web-app.js)
  const max = (window as any)?.WebApp;
  if (max?.initData && typeof max.initData === "string" && max.initData.length > 0) {
    return { initData: max.initData, platform: "max" };
  }
  // Telegram: window.Telegram.WebApp
  const tg = (window as any)?.Telegram?.WebApp;
  const initData = tg?.initData;
  if (typeof initData === "string" && initData.length > 0) {
    return { initData, platform: "telegram" };
  }
  return null;
}

export function useTelegramAuth() {
  const [token, setToken] = useState<string | null>(
    localStorage.getItem("accessToken"),
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearToken = useCallback(() => {
    localStorage.removeItem("accessToken");
    setToken(null);
  }, []);

  const refreshSession = useCallback(async () => {
    const data = getInitData();
    if (!data) return;
    try {
      const session = await postJSON<SessionResponse>("/auth/session", {
        initData: data.initData,
        platform: data.platform,
      });
      localStorage.setItem("accessToken", session.accessToken);
      setToken(session.accessToken);
    } catch {
      // Тихо игнорируем — при следующем запросе получим 401 и очистим токен
    }
  }, []);

  useEffect(() => {
    const run = async () => {
      const data = getInitData();

      if (!data) return;
      if (token) return;

      setLoading(true);
      setError(null);

      try {
        const session = await postJSON<SessionResponse>("/auth/session", {
          initData: data.initData,
          platform: data.platform,
        });

        localStorage.setItem("accessToken", session.accessToken);
        setToken(session.accessToken);
      } catch (e: any) {
        const msg = e?.message ?? "Auth failed";
        setError(
          typeof msg === "string" && (msg.includes("401") || msg.includes("Unauthorized"))
            ? "Сессия истекла. Закройте и откройте приложение снова."
            : msg,
        );
      } finally {
        setLoading(false);
      }
    };

    void run();
  }, [token]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible" && token) {
        void refreshSession();
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [token, refreshSession]);

  return { token, setToken, clearToken, refreshSession, loading, error };
}
