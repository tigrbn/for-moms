import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { StubCard } from "../components/StubCard";
import { PaginationBar, ITEMS_PER_PAGE } from "../components/PaginationBar";
import { formatMoney, formatDate, formatRequestCreatedAt } from "../lib/format";
import { labelRequestStatus, labelOfferStatus } from "../lib/labels";
import { CategoryDisplay } from "../components/CategoryDisplay";
import type { RequestMineItem, OfferMineItem } from "../types";

type PostMineItem = {
  id: string;
  content: string;
  images?: string[];
  createdAt: string;
};

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
  const { activeProfileType, activeProfileId, authedGet, authedDelete, parentNewOffersCount, setFeedReloadKey } = useApp();
  const [items, setItems] = useState<RequestMineItem[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [archivePage, setArchivePage] = useState(1);
  const [requestsPage, setRequestsPage] = useState(1);
  const [myPosts, setMyPosts] = useState<PostMineItem[] | null>(null);
  const [postsErr, setPostsErr] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const specialistArchive = useSpecialistArchive(authedGet);

  useEffect(() => {
    let cancelled = false;
    setPostsErr(null);
    setMyPosts(null);
    const run = async () => {
      try {
        const data = await authedGet<PostMineItem[]>("/posts/mine");
        if (!cancelled) setMyPosts(Array.isArray(data) ? data : []);
      } catch (e: unknown) {
        if (!cancelled) setPostsErr(e instanceof Error ? e.message : "Не удалось загрузить объявления");
        if (!cancelled) setMyPosts([]);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [activeProfileId, authedGet]);

  const deletePost = async (postId: string) => {
    if (!confirm("Удалить объявление?")) return;
    setDeletingId(postId);
    setPostsErr(null);
    try {
      await authedDelete(`/posts/${postId}`);
      setMyPosts((prev) => (prev ?? []).filter((p) => p.id !== postId));
      setFeedReloadKey((k) => k + 1);
    } catch (e: unknown) {
      setPostsErr(e instanceof Error ? e.message : "Не удалось удалить");
    } finally {
      setDeletingId(null);
    }
  };
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
      <div style={{ display: "grid", gap: 12 }}>
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
                  <div style={{ fontWeight: 800 }}><CategoryDisplay category={o.request.category} /></div>
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
      <div className="card">
        <div className="h2" style={{ marginBottom: 8 }}>Мои объявления</div>
        <p className="muted" style={{ fontSize: 13, marginBottom: 10 }}>Объявления в разделе «Другое» в ленте.</p>
        {postsErr && <div className="error-message" style={{ marginBottom: 8 }} role="alert">{postsErr}</div>}
        {myPosts === null && !postsErr && <div className="muted">Загрузка…</div>}
        {myPosts?.length === 0 && !postsErr && <div className="muted">Объявлений пока нет. Добавить можно в ленте, выбрав категорию «Другое».</div>}
        {myPosts && myPosts.length > 0 && (
          <div style={{ display: "grid", gap: 10 }}>
            {myPosts.map((p) => {
              const preview = p.content.length > 80 ? p.content.slice(0, 80) + "…" : p.content;
              return (
                <div key={p.id} className="card" style={{ background: "var(--tg-bg)" }}>
                  <div className="muted" style={{ fontSize: 13 }}>{formatRequestCreatedAt(p.createdAt)}</div>
                  <div style={{ marginTop: 6, whiteSpace: "pre-wrap" }}>{preview}</div>
                  <div className="row" style={{ marginTop: 10, gap: 8 }}>
                    <Link className="btn secondary" to={`/posts/${p.id}`}>Открыть</Link>
                    <button
                      type="button"
                      className="btn secondary"
                      disabled={deletingId === p.id}
                      onClick={() => void deletePost(p.id)}
                      style={{ color: "var(--error)" }}
                    >
                      {deletingId === p.id ? "Удаление…" : "Удалить"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      </div>
    );
  }

  const showNewOffersBadge = parentNewOffersCount != null && parentNewOffersCount > 0;
  return (
    <div style={{ display: "grid", gap: 12 }}>
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
              <div className={isCompleted ? "card__content" : undefined}>
                <div className="row row--status-right" style={{ gap: 8 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="request-card-category"><CategoryDisplay category={r.category} /></div>
                    {r.newOffersCount > 0 && (
                      <span className="nav-badge nav-badge--inline" aria-label={`Новых откликов: ${r.newOffersCount}`}>
                        {r.newOffersCount > 99 ? "99+" : r.newOffersCount}
                      </span>
                    )}
                  </div>
                  <div className="spacer" />
                  <div className="pill">{labelRequestStatus(r.status)}</div>
                </div>
                <div className="request-card-date" style={{ marginTop: 4 }}>
                  <span className="request-meta-label">Дата создания:</span> {formatDate(r.createdAt)}
                </div>
                <div className="request-card-meta" style={{ marginTop: 6 }}>
                  <div><span className="request-meta-label">Район:</span> {r.district ?? "—"}</div>
                  <div><span className="request-meta-label">Бюджет:</span> {formatMoney(r.budget)}</div>
                  <div><span className="request-meta-label">Откликов:</span> {r.offersCount}</div>
                </div>
                {r.description && (
                  <div style={{ marginTop: 8 }}>
                    <span className="request-meta-label">Описание:</span>
                    <div className="request-card-desc" style={{ marginTop: 4 }}>{r.description}</div>
                  </div>
                )}
              </div>
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
    <div className="card">
      <div className="h2" style={{ marginBottom: 8 }}>Мои объявления</div>
      <p className="muted" style={{ fontSize: 13, marginBottom: 10 }}>Объявления в разделе «Другое» в ленте.</p>
      {postsErr && <div className="error-message" style={{ marginBottom: 8 }} role="alert">{postsErr}</div>}
      {myPosts === null && !postsErr && <div className="muted">Загрузка…</div>}
      {myPosts?.length === 0 && !postsErr && <div className="muted">Объявлений пока нет. Добавить можно в ленте, выбрав категорию «Другое».</div>}
      {myPosts && myPosts.length > 0 && (
        <div style={{ display: "grid", gap: 10 }}>
          {myPosts.map((p) => {
            const preview = p.content.length > 80 ? p.content.slice(0, 80) + "…" : p.content;
            return (
              <div key={p.id} className="card" style={{ background: "var(--tg-bg)" }}>
                <div className="muted" style={{ fontSize: 13 }}>{formatRequestCreatedAt(p.createdAt)}</div>
                <div style={{ marginTop: 6, whiteSpace: "pre-wrap" }}>{preview}</div>
                <div className="row" style={{ marginTop: 10, gap: 8 }}>
                  <Link className="btn secondary" to={`/posts/${p.id}`}>Открыть</Link>
                  <button
                    type="button"
                    className="btn secondary"
                    disabled={deletingId === p.id}
                    onClick={() => void deletePost(p.id)}
                    style={{ color: "var(--error)" }}
                  >
                    {deletingId === p.id ? "Удаление…" : "Удалить"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
    </div>
  );
}
