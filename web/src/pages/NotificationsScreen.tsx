import { Link } from "react-router-dom";

const TELEGRAM_BOT_URL = "https://t.me/formoms_ykt_bot";
const MAX_BOT_URL = "https://max.ru/id142702883207_bot";

import telegramIcon from "../assets/img/telegram.png";
import maxIcon from "../assets/img/max.svg";

export function NotificationsScreen() {
  return (
    <div className="card" style={{ marginBottom: 24 }}>
      <div className="h2" style={{ marginBottom: 8 }}>Уведомления от приложения</div>
      <p className="muted" style={{ marginTop: 0, marginBottom: 16 }}>
        Сообщения о новых заявках, откликах и решениях приходят в мессенджер — в чат с ботом «Для мам». Откройте бота в удобном приложении:
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
        <a
          href={TELEGRAM_BOT_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-telegram btn-with-icon"
          style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
        >
          <img src={telegramIcon} alt="" style={{ width: 24, height: 24 }} />
          Открыть в Telegram
        </a>
        <a
          href={MAX_BOT_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="btn secondary"
          style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
        >
          <img src={maxIcon} alt="" style={{ width: 24, height: 24 }} />
          Открыть в MAX
        </a>
      </div>
      <p className="muted" style={{ marginTop: 16, marginBottom: 0, fontSize: 13 }}>
        В настройках профиля можно включить или отключить уведомления о новых заявках по вашей категории.
      </p>
      <div style={{ marginTop: 16 }}>
        <Link className="btn secondary" to="/profile">
          В профиль
        </Link>
      </div>
    </div>
  );
}
