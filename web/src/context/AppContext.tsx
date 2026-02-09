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
  feedReloadKey: number;
  setFeedReloadKey: (fn: (x: number) => number) => void;
  activeProfile: MeResponse["profiles"][0] | null;
  activeProfileId: string | null;
  activeProfileType: "parent" | "specialist" | null;
  ensureActiveProfile: (profileId: string) => Promise<void>;
  createRole: (type: "parent" | "specialist") => Promise<void>;
  refreshMe: () => Promise<MeResponse | null>;
  authedGet: <T>(path: string) => Promise<T>;
  authedPost: <T>(path: string, body: unknown) => Promise<T>;
  authedPatch: <T>(path: string, body: unknown) => Promise<T>;
  authedDelete: <T>(path: string) => Promise<T>;
  navigate: (to: string | number, opts?: { replace?: boolean; state?: unknown }) => void;
  missingRole: "parent" | "specialist" | null;
  addMissingRole: () => Promise<void>;
  allTypes: Set<string>;
};

const AppContext = createContext<AppContextValue | null>(null);

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within App");
  return ctx;
}

export { AppContext };
