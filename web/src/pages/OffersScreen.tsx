import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { StubCard } from "../components/StubCard";
import { formatMoney, formatDate } from "../lib/format";
import { labelOfferStatus } from "../lib/labels";
import type { OfferMineItem } from "../types";

export function OffersScreen() {
  const { activeProfileType, activeProfileId, authedGet } = useApp();
  const [items, setItems] = useState<OfferMineItem[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      setErr(null);
      setItems(null);
      if (activeProfileType !== "specialist") return;
      try {
        const data = await authedGet<OfferMineItem[]>("/offers/mine");
        setItems(data);
      } catch (e: unknown) {
        setErr(e instanceof Error ? e.message : "Failed to load offers");
      }
    };
    void run();
  }, [activeProfileId, activeProfileType, authedGet]);

  if (activeProfileType !== "specialist") {
    return (
      <div className="card">
        <div className="h2">Отклики</div>
        <div className="muted" style={{ marginTop: 8 }}>
          В режиме родителя отклики доступны внутри каждой заявки.
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="h2">Мои отклики</div>
      {err && <div className="muted" style={{ marginTop: 8 }}>{err}</div>}
      {!items && !err && <div className="muted" style={{ marginTop: 8 }}>Загрузка…</div>}
      {items && items.length === 0 && (
        <div style={{ marginTop: 10 }}>
          <StubCard
            title="💛 Откликов пока нет"
            desc="Откройте ленту, выберите подходящую заявку и отправьте отклик."
          >
            <Link className="btn btn-primary" to="/">
              Перейти в ленту
            </Link>
          </StubCard>
        </div>
      )}
      {items && (
        <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
          {items.map((o) => (
            <div key={o.id} className="card" style={{ background: "var(--tg-bg)" }}>
              <div className="row">
                <div style={{ fontWeight: 800 }}>{o.request.category}</div>
                <div className="spacer" />
                <div className="pill">{labelOfferStatus(o.status)}</div>
              </div>
              <div className="muted" style={{ marginTop: 6 }}>
                Район: {o.request.district ?? "—"} · Бюджет: {formatMoney(o.request.budget)}
              </div>
              {o.comment && <div style={{ marginTop: 8 }}>{o.comment}</div>}
              <div className="row" style={{ marginTop: 10 }}>
                <Link className="btn secondary" to={`/requests/${o.requestId}`}>
                  Открыть заявку
                </Link>
                <div className="spacer" />
                <div className="muted">{formatDate(o.createdAt)}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
