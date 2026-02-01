import { useTelegramAuth } from "./shared/useTelegramAuth";

export default function App() {
  const { token, loading, error } = useTelegramAuth();

  return (
    <div style={{ padding: 16 }}>
      <h2>ForMoms</h2>

      {loading && <p>Auth…</p>}
      {error && <pre style={{ whiteSpace: "pre-wrap" }}>{error}</pre>}

      {token ? (
        <p>✅ Logged in. Token saved.</p>
      ) : (
        <p>ℹ️ Open this page inside Telegram Mini App to login.</p>
      )}
    </div>
  );
}
