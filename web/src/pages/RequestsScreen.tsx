import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { StubCard } from "../components/StubCard";
import { formatMoney, formatDate } from "../lib/format";
import { labelRequestStatus } from "../lib/labels";
import type { RequestMineItem } from "../types";

export function RequestsScreen() {
  const { activeProfileType, activeProfileId, authedGet, authedDelete, parentNewOffersCount } = useApp();
  const [items, setItems] = useState<RequestMineItem[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      setErr(null);
      setItems(null);
      if (activeProfileType !== "parent") return;
      try {
        const data = await authedGet<RequestMineItem[]>("/requests/mine");
        setItems(data);
      } catch (e: unknown) {
        setErr(e instanceof Error ? e.message : "Failed to load requests");
      }
    };
    void run();
  }, [activeProfileId, activeProfileType, authedGet]);

  if (activeProfileType !== "parent") {
    return (
      <div className="card">
        <div className="h2">Заявки</div>
        <div className="muted" style={{ marginTop: 8 }}>
          В режиме специалиста заявки находятся в ленте (раздел "Лента").
        </div>
      </div>
    );
  }

  const showNewOffersBadge = parentNewOffersCount != null && parentNewOffersCount > 0;
  return (
    <div className="card">
      <div className="row">
        <div className="h2" style={{ display: "flex", alignItems: "center", gap: 8 }}>
          Мои заявки
          {showNewOffersBadge && (
            <span className="nav-badge nav-badge--inline" aria-label={`Новых откликов: ${parentNewOffersCount}`}>
              {parentNewOffersCount > 99 ? "99+" : parentNewOffersCount}
            </span>
          )}
        </div>
        <div className="spacer" />
        <Link className="btn btn-primary" to="/requests/new">
          + Создать
        </Link>
      </div>
      {err && <div className="muted" style={{ marginTop: 8 }}>{err}</div>}
      {!items && !err && <div className="muted" style={{ marginTop: 8 }}>Загрузка…</div>}
      {items && items.length === 0 && (
        <div style={{ marginTop: 10 }}>
          <StubCard
            title="💛 Заявок пока нет"
            desc="Создайте первую — специалисты увидят её в ленте и смогут откликнуться."
          >
            <Link className="btn btn-primary" to="/requests/new">
              Создать заявку
            </Link>
          </StubCard>
        </div>
      )}
      {items && (
        <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
          {items.map((r) => (
            <div key={r.id} className="card card--status-top" style={{ background: "var(--tg-bg)" }}>
              <div className="pill pill--top-right">{labelRequestStatus(r.status)}</div>
              <div style={{ fontWeight: 800 }}>{r.category}</div>
              <div className="muted" style={{ marginTop: 4, fontSize: 13 }}>{formatDate(r.createdAt)}</div>
              <div className="request-card-meta muted" style={{ marginTop: 6 }}>
                <div>Район: {r.district ?? "—"}</div>
                <div>Бюджет: {formatMoney(r.budget)}</div>
                <div>Откликов: {r.offersCount}</div>
              </div>
              {r.description && <div style={{ marginTop: 8 }}>{r.description}</div>}
              <div className="row" style={{ marginTop: 10 }}>
                <Link className="btn secondary" to={`/requests/${r.id}`}>
                  Открыть
                </Link>
                <button
                  type="button"
                  className="btn danger"
                  onClick={async () => {
                    if (!confirm("Удалить заявку?")) return;
                    try {
                      await authedDelete(`/requests/${r.id}`);
                      setItems((prev) => (prev ?? []).filter((x) => x.id !== r.id));
                    } catch (e: unknown) {
                      setErr(e instanceof Error ? e.message : "Не удалось удалить");
                    }
                  }}
                >
                  Удалить
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
