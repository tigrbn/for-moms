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

function isMiniAppEnv(): boolean {
  if (typeof window === "undefined") return false;
  // Только при наличии initData — в браузере его нет, в Telegram/MAX есть
  return getInitData() !== null;
}

export function useTelegramAuth() {
  const [miniAppDetected, setMiniAppDetected] = useState(() => isMiniAppEnv());
  const [platform, setPlatform] = useState<MiniAppPlatform | null>(() => getInitData()?.platform ?? null);
  const isMiniApp = typeof window !== "undefined" && miniAppDetected;
  const [token, setToken] = useState<string | null>(() =>
    isMiniApp ? localStorage.getItem("accessToken") : null,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const data = getInitData();
    if (data) setPlatform(data.platform);
  }, [miniAppDetected]);

  const clearToken = useCallback(() => {
    localStorage.removeItem("accessToken");
    setToken(null);
  }, []);

  useEffect(() => {
    if (!isMiniApp) {
      localStorage.removeItem("accessToken");
      setToken(null);
    }
  }, [isMiniApp]);

  // В MAX скрипт подгружается с задержкой — ждём появления window.WebApp и показываем кнопку «Авторизация»
  useEffect(() => {
    if (miniAppDetected) return;
    const maxWait = 6000;
    const id = setInterval(() => {
      if (isMiniAppEnv()) setMiniAppDetected(true);
    }, 300);
    const stop = setTimeout(() => clearInterval(id), maxWait);
    return () => {
      clearInterval(id);
      clearTimeout(stop);
    };
  }, [miniAppDetected]);

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

  const tryFetchSession = useCallback(async () => {
    const data = getInitData();
    if (!data) return false;
    setLoading(true);
    setError(null);
    try {
      const session = await postJSON<SessionResponse>("/auth/session", {
        initData: data.initData,
        platform: data.platform,
      });
      localStorage.setItem("accessToken", session.accessToken);
      setToken(session.accessToken);
      return true;
    } catch (e: any) {
      const msg = e?.message ?? "Auth failed";
      setError(
        typeof msg === "string" && (msg.includes("401") || msg.includes("Unauthorized"))
          ? "Сессия истекла. Закройте и откройте приложение снова."
          : msg,
      );
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (token) return;
    let cancelled = false;
    const run = async () => {
      const data = getInitData();
      if (!data) return;
      if (cancelled) return;
      await tryFetchSession();
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [token, tryFetchSession]);

  // MAX Bridge (и др.) может подгрузиться с задержкой — ждём initData и запрашиваем сессию
  useEffect(() => {
    if (token) return;
    const maxWait = 6000;
    const interval = 400;
    let attempts = 0;
    const id = setInterval(async () => {
      attempts += 1;
      if (attempts * interval > maxWait) {
        clearInterval(id);
        return;
      }
      const data = getInitData();
      if (!data) return;
      clearInterval(id);
      await tryFetchSession();
    }, interval);
    return () => clearInterval(id);
  }, [token, tryFetchSession]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible" && token) {
        void refreshSession();
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [token, refreshSession]);

  return { token, setToken, clearToken, refreshSession, loading, error, isMiniApp, platform };
}
