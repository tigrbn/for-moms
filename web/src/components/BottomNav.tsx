import { Link, useLocation } from "react-router-dom";
import menuLenta from "../assets/img/menu/лента.png";
import menuProfil from "../assets/img/menu/профиль.png";
import menuCreate from "../assets/img/menu/создать заявку.png";
import menuAll from "../assets/img/menu/все заявки.png";

export function BottomNav() {
  const location = useLocation();
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
      <Link className={`bottom-nav-item ${location.pathname === "/requests/new" ? "active" : ""}`} to="/requests/new">
        <img src={menuCreate} alt="" className="bottom-nav-icon-img" />
        <span>Создать</span>
      </Link>
      <Link
        className={`bottom-nav-item ${location.pathname.startsWith("/requests") && location.pathname !== "/requests/new" ? "active" : ""}`}
        to="/requests"
      >
        <img src={menuAll} alt="" className="bottom-nav-icon-img" />
        <span>Все заявки</span>
      </Link>
    </nav>
  );
}
