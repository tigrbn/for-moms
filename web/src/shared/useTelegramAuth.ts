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

function getInitData(): string | null {
  // Telegram SDK кладёт всё в window.Telegram.WebApp
  const tg = (window as any)?.Telegram?.WebApp;
  const initData = tg?.initData;
  return typeof initData === "string" && initData.length > 0 ? initData : null;
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

  useEffect(() => {
    const run = async () => {
      const initData = getInitData();

      // В браузере вне Telegram — просто не логинимся
      if (!initData) return;

      // Уже есть токен — ничего не делаем
      if (token) return;

      setLoading(true);
      setError(null);

      try {
        const session = await postJSON<SessionResponse>("/auth/session", {
          initData,
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

  return { token, setToken, clearToken, loading, error };
}
