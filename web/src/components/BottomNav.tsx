import { Link, useLocation } from "react-router-dom";
import { useApp } from "../context/AppContext";
import menuLenta from "../assets/img/menu/лента.png";
import menuProfil from "../assets/img/menu/профиль.png";
import menuCreate from "../assets/img/menu/создать заявку.png";
import menuAll from "../assets/img/menu/все заявки.png";

export function BottomNav() {
  const location = useLocation();
  const { me, activeProfileType, parentNewOffersCount, isMiniApp } = useApp();
  const hasProfiles = (me?.profiles?.length ?? 0) > 0;
  const isProvider = activeProfileType === "specialist" || activeProfileType === "company";
  const showNewOffersBadge = !isProvider && parentNewOffersCount != null && parentNewOffersCount > 0;

  /** Гость: в браузере только Лента; в Telegram — Лента и Авторизация */
  if (!hasProfiles) {
    return (
      <nav className="bottom-nav">
        <Link className={`bottom-nav-item ${location.pathname === "/" ? "active" : ""}`} to="/">
          <img src={menuLenta} alt="" className="bottom-nav-icon-img" />
          <span>Лента</span>
        </Link>
        {isMiniApp && (
          <Link className={`bottom-nav-item ${location.pathname === "/auth" ? "active" : ""}`} to="/auth">
            <img src={menuAll} alt="" className="bottom-nav-icon-img" />
            <span>Авторизация</span>
          </Link>
        )}
      </nav>
    );
  }

  /** Полное меню для авторизованных */
  return (
    <nav className="bottom-nav">
      <Link className={`bottom-nav-item ${location.pathname === "/" ? "active" : ""}`} to="/">
        <img src={menuLenta} alt="" className="bottom-nav-icon-img" />
        <span>Лента</span>
      </Link>
      <Link className={`bottom-nav-item ${location.pathname === "/profile" ? "active" : ""}`} to="/profile">
        <img src={menuProfil} alt="" className="bottom-nav-icon-img" />
        <span>Профиль</span>
      </Link>
      {isProvider ? (
        <>
          <Link className={`bottom-nav-item ${location.pathname === "/offers" ? "active" : ""}`} to="/offers">
            <img src={menuCreate} alt="" className="bottom-nav-icon-img" />
            <span>Отклики</span>
          </Link>
          <Link
            className={`bottom-nav-item ${location.pathname.startsWith("/requests") ? "active" : ""}`}
            to="/requests"
          >
            <img src={menuAll} alt="" className="bottom-nav-icon-img" />
            <span>Все заявки</span>
          </Link>
        </>
      ) : (
        <>
          <Link className={`bottom-nav-item ${location.pathname === "/requests/new" ? "active" : ""}`} to="/requests/new">
            <img src={menuCreate} alt="" className="bottom-nav-icon-img" />
            <span>Создать</span>
          </Link>
          <Link
            className={`bottom-nav-item ${location.pathname.startsWith("/requests") && location.pathname !== "/requests/new" ? "active" : ""}`}
            to="/requests"
          >
            <span className="bottom-nav-item-badge-wrap">
              <img src={menuAll} alt="" className="bottom-nav-icon-img" />
              {showNewOffersBadge && (
                <span className="nav-badge" aria-label={`Новых откликов: ${parentNewOffersCount}`}>
                  {parentNewOffersCount > 99 ? "99+" : parentNewOffersCount}
                </span>
              )}
            </span>
            <span>Все заявки</span>
          </Link>
        </>
      )}
    </nav>
  );
}
