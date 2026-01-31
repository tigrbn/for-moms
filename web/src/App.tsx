import "./App.css";
import WebApp from "@twa-dev/sdk";
import { useEffect, useState } from "react";

export default function App() {
  const [initData, setInitData] = useState<string>("");
  const [initDataUnsafe, setInitDataUnsafe] = useState<any>(null);

  useEffect(() => {
    // Сообщаем Telegram, что приложение готово
    WebApp.ready();

    setInitData(WebApp.initData || "");
    setInitDataUnsafe(WebApp.initDataUnsafe || null);
  }, []);

  return (
    <div style={{ padding: 16, fontFamily: "Arial, sans-serif" }}>
      <h2>ForMoms Mini App (debug)</h2>

      <p>
        <b>Проверка окружения:</b>{" "}
        {initData ? "✅ Запущено внутри Telegram" : "❌ Не внутри Telegram"}
      </p>

      <h3>initData</h3>
      <textarea
        style={{ width: "100%", height: 160 }}
        value={initData}
        readOnly
      />

      <h3>initDataUnsafe.user</h3>
      <pre style={{ background: "#f6f6f6", padding: 12, overflowX: "auto" }}>
        {JSON.stringify(initDataUnsafe?.user ?? null, null, 2)}
      </pre>
    </div>
  );
}
