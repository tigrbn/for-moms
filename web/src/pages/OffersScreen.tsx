import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { StubCard } from "../components/StubCard";
import { PaginationBar, ITEMS_PER_PAGE } from "../components/PaginationBar";
import { formatMoney, formatDate } from "../lib/format";
import { labelOfferStatus } from "../lib/labels";
import { CategoryDisplay } from "../components/CategoryDisplay";
import type { OfferMineItem } from "../types";

export function OffersScreen() {
  const { activeProfileType, activeProfileId, authedGet } = useApp();
  const [items, setItems] = useState<OfferMineItem[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  useEffect(() => {
    const run = async () => {
      setErr(null);
      setItems(null);
      if (activeProfileType !== "specialist" && activeProfileType !== "company") return;
      try {
        const data = await authedGet<OfferMineItem[]>("/offers/mine");
        setItems(data);
      } catch (e: unknown) {
        setErr(e instanceof Error ? e.message : "Failed to load offers");
      }
    };
    void run();
  }, [activeProfileId, activeProfileType, authedGet]);

  useEffect(() => {
    setPage(1);
  }, [items?.length ?? 0]);

  const totalPages = Math.max(1, Math.ceil((items?.length ?? 0) / ITEMS_PER_PAGE));
  const paginatedItems = useMemo(
    () => (items ?? []).slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE),
    [items, page],
  );

  if (activeProfileType !== "specialist" && activeProfileType !== "company") {
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
      {err && <div className="error-message" style={{ marginTop: 8 }} role="alert">{err}</div>}
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
      {items && items.length > 0 && (
        <>
        <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
          {paginatedItems.map((o) => {
            const isCompleted = o.request.status === "done" || o.request.status === "cancelled";
            return (
            <div
              key={o.id}
              className={`card ${isCompleted ? "card--completed" : ""}`}
              style={{ background: "var(--tg-bg)" }}
            >
              {isCompleted ? (
                <div className="card__content">
                  <div className="row row--status-right" style={{ gap: 8 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 800 }}><CategoryDisplay category={o.request.category} /></div>
                    </div>
                    <div className="spacer" />
                    <div className="pill">{labelOfferStatus(o.status)}</div>
                  </div>
                  <div className="muted" style={{ marginTop: 6 }}>
                    Район: {o.request.district ?? "—"} · Бюджет: {formatMoney(o.request.budget)}
                  </div>
                  {o.comment && <div style={{ marginTop: 8 }}>{o.comment}</div>}
                </div>
              ) : (
                <>
                  <div className="row row--status-right" style={{ gap: 8 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 800 }}><CategoryDisplay category={o.request.category} /></div>
                    </div>
                    <div className="spacer" />
                    <div className="pill">{labelOfferStatus(o.status)}</div>
                  </div>
                  <div className="muted" style={{ marginTop: 6 }}>
                    Район: {o.request.district ?? "—"} · Бюджет: {formatMoney(o.request.budget)}
                  </div>
                  {o.comment && <div style={{ marginTop: 8 }}>{o.comment}</div>}
                </>
              )}
              <div className="row" style={{ marginTop: 10 }}>
                <Link className="btn secondary" to={`/requests/${o.requestId}`}>
                  Открыть заявку
                </Link>
                <div className="spacer" />
                <div className="muted">{formatDate(o.createdAt)}</div>
              </div>
            </div>
            );
          })}
        </div>
        <PaginationBar
          currentPage={page}
          totalPages={totalPages}
          onPrev={() => setPage((p) => Math.max(1, p - 1))}
          onNext={() => setPage((p) => Math.min(totalPages, p + 1))}
        />
        </>
      )}
    </div>
  );
}
