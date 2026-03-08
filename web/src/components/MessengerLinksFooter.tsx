const TELEGRAM_BOT_URL = "https://t.me/formoms_ykt_bot";
const MAX_BOT_URL = "https://max.ru/id142702883207_bot";

// Если файлы имеют другое расширение (.svg и т.д.) — измените импорты
import telegramIcon from "../assets/img/telegram.png";
import maxIcon from "../assets/img/max.svg";

export function MessengerLinksFooter() {
  return (
    <footer className="messenger-links-footer" role="contentinfo">
      <p className="messenger-links-footer-title">Открыть приложение</p>
      <div className="messenger-links-footer-row">
        <a
          href={TELEGRAM_BOT_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="messenger-links-footer-link"
          aria-label="Открыть в Telegram"
        >
          <img src={telegramIcon} alt="" className="messenger-links-footer-icon" />
          <span>Telegram</span>
        </a>
        <a
          href={MAX_BOT_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="messenger-links-footer-link"
          aria-label="Открыть в MAX"
        >
          <img src={maxIcon} alt="" className="messenger-links-footer-icon" />
          <span>MAX</span>
        </a>
      </div>
    </footer>
  );
}
