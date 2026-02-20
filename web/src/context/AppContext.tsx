import { createContext, useContext } from "react";
import type { MeResponse, FeedResponse } from "../types";

export type AppContextValue = {
  token: string | null;
  clearToken: () => void;
  me: MeResponse | null;
  setMe: (me: MeResponse | null) => void;
  meLoading: boolean;
  meError: string | null;
  setMeError: (s: string | null) => void;
  feed: FeedResponse | null;
  setFeed: (f: FeedResponse | null) => void;
  feedError: string | null;
  setFeedError: (s: string | null) => void;
  feedCategory: string;
  setFeedCategory: (s: string) => void;
  feedSubcategory: string;
  setFeedSubcategory: (s: string) => void;
  feedReloadKey: number;
  setFeedReloadKey: (fn: (x: number) => number) => void;
  feedView: "specialists" | "requests";
  setFeedView: (view: "specialists" | "requests") => void;
  feedPage: number;
  setFeedPage: (n: number | ((prev: number) => number)) => void;
  activeProfile: MeResponse["profiles"][0] | null;
  activeProfileId: string | null;
  activeProfileType: "parent" | "specialist" | "company" | null;
  ensureActiveProfile: (profileId: string) => Promise<void>;
  createRole: (type: "parent" | "specialist" | "company") => Promise<void>;
  refreshMe: () => Promise<MeResponse | null>;
  authedGet: <T>(path: string) => Promise<T>;
  authedPost: <T>(path: string, body: unknown) => Promise<T>;
  authedPatch: <T>(path: string, body: unknown) => Promise<T>;
  authedDelete: <T>(path: string) => Promise<T>;
  navigate: (to: string | number, opts?: { replace?: boolean; state?: unknown }) => void;
  /** Первая недостающая роль (для заглушки в ленте). */
  missingRole: "parent" | "specialist" | "company" | null;
  /** Все недостающие роли — каждая может быть добавлена отдельно. */
  missingRoles: ("parent" | "specialist" | "company")[];
  addMissingRole: () => Promise<void>;
  addRole: (role: "parent" | "specialist" | "company") => void;
  allTypes: Set<string>;
  /** Количество непросмотренных откликов (для родителя). null = не загружено или не родитель. */
  parentNewOffersCount: number | null;
  refreshParentNewOffersCount: () => Promise<void>;
  /** true для пользователя с админскими правами (например, username tigrbn) */
  isAdmin: boolean;
  /** true при открытии внутри Telegram/MAX Mini App; false в обычном браузере */
  isMiniApp: boolean;
};

const AppContext = createContext<AppContextValue | null>(null);

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within App");
  return ctx;
}

export { AppContext };
