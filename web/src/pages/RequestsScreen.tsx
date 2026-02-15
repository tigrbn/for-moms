import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { StubCard } from "../components/StubCard";
import { PaginationBar, ITEMS_PER_PAGE } from "../components/PaginationBar";
import { formatMoney, formatDate } from "../lib/format";
import { labelRequestStatus, labelOfferStatus } from "../lib/labels";
import { getCategoryDisplayText } from "../constants/feed";
import type { RequestMineItem, OfferMineItem } from "../types";

/** Уникальные заявки из откликов специалиста: по одной карточке на requestId, с последним откликом */
function useSpecialistArchive(authedGet: <T>(path: string) => Promise<T>) {
  const [offers, setOffers] = useState<OfferMineItem[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setErr(null);
      setOffers(null);
      try {
        const data = await authedGet<OfferMineItem[]>("/offers/mine");
        if (!cancelled) setOffers(data);
      } catch (e: unknown) {
        if (!cancelled) setErr(e instanceof Error ? e.message : "Failed to load offers");
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [authedGet]);
  const uniqueByRequest = useMemo(() => {
    if (!offers?.length) return [];
    const byId = new Map<string, OfferMineItem>();
    for (const o of offers) {
      const existing = byId.get(o.requestId);
      if (!existing || new Date(o.createdAt) > new Date(existing.createdAt)) byId.set(o.requestId, o);
    }
    return Array.from(byId.values()).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [offers]);
  return { items: uniqueByRequest, loading: offers === null && !err, err };
}

export function RequestsScreen() {
  const { activeProfileType, activeProfileId, authedGet, parentNewOffersCount } = useApp();
  const [items, setItems] = useState<RequestMineItem[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [archivePage, setArchivePage] = useState(1);
  const [requestsPage, setRequestsPage] = useState(1);
  const specialistArchive = useSpecialistArchive(authedGet);
  const archiveItems = specialistArchive.items;
  const archiveTotalPages = Math.max(1, Math.ceil(archiveItems.length / ITEMS_PER_PAGE));
  const archivePaginated = useMemo(
    () => archiveItems.slice((archivePage - 1) * ITEMS_PER_PAGE, archivePage * ITEMS_PER_PAGE),
    [archiveItems, archivePage],
  );

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

  useEffect(() => {
    setArchivePage(1);
  }, [archiveItems.length]);

  useEffect(() => {
    setRequestsPage(1);
  }, [items?.length ?? 0]);

  const requestsTotalPages = Math.max(1, Math.ceil((items?.length ?? 0) / ITEMS_PER_PAGE));
  const requestsPaginated = useMemo(
    () => (items ?? []).slice((requestsPage - 1) * ITEMS_PER_PAGE, requestsPage * ITEMS_PER_PAGE),
    [items, requestsPage],
  );

  if (activeProfileType === "specialist") {
    const { loading, err: archiveErr } = specialistArchive;
    return (
      <div className="card">
        <div className="h2">Все заявки</div>
        {archiveErr && <div className="error-message" style={{ marginTop: 8 }} role="alert">{archiveErr}</div>}
        {loading && !archiveErr && <div className="muted" style={{ marginTop: 8 }}>Загрузка…</div>}
        {!loading && archiveItems.length === 0 && (
          <div style={{ marginTop: 10 }}>
            <StubCard
              title="💛 Заявок пока нет"
              desc="Откройте ленту и отправьте отклик на заявку — она появится здесь."
            >
              <Link className="btn btn-primary" to="/">
                Перейти в ленту
              </Link>
            </StubCard>
          </div>
        )}
        {archiveItems.length > 0 && (
          <>
          <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
            {archivePaginated.map((o) => {
              const isCompleted = o.request.status === "done" || o.request.status === "cancelled";
              return (
              <div
                key={o.requestId}
                className={`card ${isCompleted ? "card--completed" : ""}`}
                style={{ background: "var(--tg-bg)" }}
              >
                <div className="row">
                  <div style={{ fontWeight: 800 }}>{getCategoryDisplayText(o.request.category)}</div>
                  <div className="spacer" />
                  <div className="pill">{labelOfferStatus(o.status)}</div>
                </div>
                <div className="muted" style={{ marginTop: 4, fontSize: 13 }}>{formatDate(o.createdAt)}</div>
                <div className="muted" style={{ marginTop: 6 }}>
                  Район: {o.request.district ?? "—"} · Бюджет: {formatMoney(o.request.budget)}
                </div>
                <div className="row" style={{ marginTop: 10 }}>
                  <Link className="btn secondary" to={`/requests/${o.requestId}`}>
                    Открыть заявку
                  </Link>
                </div>
              </div>
            );
            })}
          </div>
          <PaginationBar
            currentPage={archivePage}
            totalPages={archiveTotalPages}
            onPrev={() => setArchivePage((p) => Math.max(1, p - 1))}
            onNext={() => setArchivePage((p) => Math.min(archiveTotalPages, p + 1))}
          />
        </>
        )}
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
      {err && <div className="error-message" style={{ marginTop: 8 }} role="alert">{err}</div>}
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
      {items && items.length > 0 && (
        <>
        <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
          {requestsPaginated.map((r) => {
            const isCompleted = r.status === "done" || r.status === "cancelled";
            return (
            <div
              key={r.id}
              className={`card ${isCompleted ? "card--completed" : ""}`}
              style={{ background: "var(--tg-bg)" }}
            >
              <div className="row" style={{ alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <div style={{ fontWeight: 800 }}>{getCategoryDisplayText(r.category)}</div>
                {r.newOffersCount > 0 && (
                  <span className="nav-badge nav-badge--inline" aria-label={`Новых откликов: ${r.newOffersCount}`}>
                    {r.newOffersCount > 99 ? "99+" : r.newOffersCount}
                  </span>
                )}
                <div className="spacer" />
                <div className="pill">{labelRequestStatus(r.status)}</div>
              </div>
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
              </div>
            </div>
          );
          })}
        </div>
        <PaginationBar
          currentPage={requestsPage}
          totalPages={requestsTotalPages}
          onPrev={() => setRequestsPage((p) => Math.max(1, p - 1))}
          onNext={() => setRequestsPage((p) => Math.min(requestsTotalPages, p + 1))}
        />
        </>
      )}
    </div>
  );
}
