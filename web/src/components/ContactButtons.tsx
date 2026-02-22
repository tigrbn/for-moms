import { openContactUrl, type ContactLink } from "../shared/openContactUrl";
import maxIcon from "../assets/img/max.png";

const TELEGRAM_SVG = (
  <svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
  </svg>
);

type Props = {
  contactLinks: ContactLink[];
  isMiniApp: boolean;
  className?: string;
};

export function ContactButtons({ contactLinks, isMiniApp, className }: Props) {
  if (contactLinks.length === 0) return null;

  return (
    <div className={className} style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
      {contactLinks.map((link) => {
        const btnClass =
          link.type === "telegram"
            ? "btn btn-telegram btn-with-icon"
            : "btn btn-max btn-with-icon";
        const Icon =
          link.type === "telegram" ? (
            <span className="btn-icon-telegram" aria-hidden>
              {TELEGRAM_SVG}
            </span>
          ) : (
            <span className="btn-icon-max" aria-hidden>
              <img src={maxIcon} alt="" style={{ width: 18, height: 18 }} />
            </span>
          );

        if (isMiniApp) {
          return (
            <button
              key={link.url}
              type="button"
              className={btnClass}
              onClick={() => openContactUrl(link.url)}
            >
              {Icon}
              {link.label}
            </button>
          );
        }
        return (
          <a
            key={link.url}
            className={btnClass}
            href={link.url}
            target="_blank"
            rel="noreferrer"
          >
            {Icon}
            {link.label}
          </a>
        );
      })}
    </div>
  );
}
