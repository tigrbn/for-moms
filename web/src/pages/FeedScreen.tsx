import { useRef, useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { StubCard } from "../components/StubCard";
import { PaginationBar, ITEMS_PER_PAGE } from "../components/PaginationBar";
import { formatMoney, formatRequestCreatedAt } from "../lib/format";
import { labelRequestStatus } from "../lib/labels";
import { getAvatarSrc } from "../lib/avatar";
import { FEED_CATEGORIES, CATEGORY_TREE, getCategoryIcon } from "../constants/feed";
import { PARENT_ROLE_EMOJI } from "../lib/labels";
import feedHeaderBg from "../assets/img/background.png";

export function FeedScreen() {
  const categoriesScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = categoriesScrollRef.current;
    if (!el) return;
    let startX = 0;
    let startY = 0;
    let startScrollLeft = 0;
    const onTouchStart = (e: TouchEvent) => {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      startScrollLeft = el.scrollLeft;
    };
    const onTouchMove = (e: TouchEvent) => {
      const x = e.touches[0].clientX;
      const y = e.touches[0].clientY;
      const deltaX = x - startX;
      const deltaY = y - startY;
      const maxScroll = el.scrollWidth - el.clientWidth;
      if (maxScroll <= 0) return;
      if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 8) {
        e.preventDefault();
        const newScroll = Math.max(0, Math.min(maxScroll, startScrollLeft - deltaX));
        el.scrollLeft = newScroll;
      }
    };
    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
    };
  }, []);

  const {
    feed,
    feedError,
    feedCategory,
    setFeedCategory,
    feedSubcategory,
    setFeedSubcategory,
    setFeed,
    setFeedError,
    setFeedReloadKey,
    activeProfileType,
    missingRole,
    addMissingRole,
  } = useApp();

  const currentSection = CATEGORY_TREE.find((s) => s.id === feedCategory);
  const subcategoryOptions = currentSection
    ? [{ id: "", label: "Все" }, ...currentSection.children]
    : [];

  const contentItems = feed?.items.filter((it) => it.kind !== "banner") ?? [];
  const contentCount = contentItems.length;
  const role = activeProfileType;

  const [feedPage, setFeedPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(contentCount / ITEMS_PER_PAGE));
  const paginatedItems = useMemo(
    () => contentItems.slice((feedPage - 1) * ITEMS_PER_PAGE, feedPage * ITEMS_PER_PAGE),
    [contentItems, feedPage],
  );
  useEffect(() => {
    setFeedPage(1);
  }, [contentCount, feedCategory, feedSubcategory]);

  const feedSubtitle =
    activeProfileType === "specialist"
      ? "👋 Заявки от родителей"
      : "👋 Кого сегодня ищем?";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div
        className="card feed-header-card"
        style={{ backgroundImage: `url(${feedHeaderBg})` }}
      >
        <div className="row feed-header-row">
          <span className="h2 feed-title-text">
            <span className="feed-title-hello">Привет</span> {feedSubtitle}
          </span>
          <div className="spacer" />
          <button
            type="button"
            className="btn secondary feed-refresh-btn"
            onClick={() => {
              setFeed(null);
              setFeedError(null);
              setFeedReloadKey((x) => x + 1);
            }}
          >
            🔄 Обновить
          </button>
        </div>

        <div className="feed-categories-label">Категория</div>
        <div ref={categoriesScrollRef} className="feed-categories-scroll" role="region" aria-label="Категории">
          <div className="feed-categories">
            {FEED_CATEGORIES.map((c) => (
              <button
                key={c.id || "all"}
                type="button"
                className={`feed-category-chip ${feedCategory === c.id ? "active" : ""}`}
                onClick={() => {
                  setFeedCategory(c.id);
                  setFeedSubcategory("");
                  setFeedReloadKey((x) => x + 1);
                }}
              >
                {c.icon ? <img src={c.icon} alt="" className="feed-category-icon" /> : null}
                {c.label}
              </button>
            ))}
          </div>
        </div>
        {currentSection && subcategoryOptions.length > 0 && (
          <>
            <div className="feed-categories-label" style={{ marginTop: 10 }}>Подкатегория</div>
            <div className="feed-categories-scroll" role="region" aria-label="Подкатегории">
              <div className="feed-categories">
                {subcategoryOptions.map((opt) => {
                  const isActive = opt.id === "" ? !feedSubcategory : feedSubcategory === opt.id;
                  return (
                    <button
                      key={opt.id || "all-sub"}
                      type="button"
                      className={`feed-category-chip feed-category-chip--sub ${isActive ? "active" : ""}`}
                      onClick={() => {
                        setFeedSubcategory(opt.id);
                        setFeedReloadKey((x) => x + 1);
                      }}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>

      {feedError && (
        <div className="card">
          <div className="muted">{feedError}</div>
        </div>
      )}
      {!feed && (
        <div className="card">
          <div className="muted">Загрузка…</div>
        </div>
      )}

      {feed && (
        <div className="feed-content">
          {contentCount === 0 && (
            <StubCard
              title={role === "specialist" ? "💛 Заявок пока нет" : "💛 Специалистов пока нет"}
              desc="Но они появляются регулярно — попробуйте выбрать другую категорию."
            >
              <div className="row feed-empty-row">
                <button
                  type="button"
                  className="btn secondary"
                  onClick={() => {
                    setFeedError(null);
                    setFeedCategory("");
                  }}
                >
                  Показать все
                </button>
                {missingRole && (
                  <button type="button" className="btn btn-primary" onClick={() => void addMissingRole()}>
                    + {missingRole === "parent" ? `${PARENT_ROLE_EMOJI} Родитель` : "Специалист"}
                  </button>
                )}
              </div>
            </StubCard>
          )}
          {paginatedItems.map((it, idx) => {
            if (it.kind === "specialist_profile") {
              const p = it.profile;
              const categoryIcon = getCategoryIcon(p.category ?? null);
              return (
                <div key={`sp-${p.id}-${idx}`} className="card feed-card feed-card-specialist">
                  <div className="feed-card-header">
                    <div className="feed-card-avatar-wrap">
                      <div className="feed-card-avatar">
                        <img src={getAvatarSrc(p.avatarUrl, p.photoUrl, p.gender)} alt="" />
                      </div>
                      {categoryIcon && (
                        <div className="feed-card-category-badge" title={p.category ?? undefined}>
                          <img src={categoryIcon} alt="" />
                        </div>
                      )}
                    </div>
                    <div className="feed-card-title-block">
                      <div className="feed-card-title-row">
                        <div className="feed-card-title">
                          {p.displayName ?? "Специалист"}
                          {it.isPromoted && <span className="pill feed-card-top">TOP</span>}
                        </div>
                        <div className="feed-card-rating">
                        <span className={p.ratingCount > 0 ? "rating-star" : "rating-star rating-star--empty"}>★</span>{" "}
                        {p.ratingAvg} ({p.ratingCount})
                      </div>
                      </div>
                      <div className="feed-card-meta-block">
                        <div className="feed-card-category">
                          <span>Категория: <strong>{p.category ?? "—"}</strong></span>
                        </div>
                        <div className="feed-card-meta feed-card-meta-vertical muted">
                          {p.city && <span>город: {p.city}</span>}
                          {p.district && <span>район: {p.district}</span>}
                          {!p.city && !p.district && <span>—</span>}
                        </div>
                        {p.pricePerHour != null && (
                          <div className="feed-card-price">цена за час: {p.pricePerHour} ₽/час</div>
                        )}
                      </div>
                    </div>
                  </div>
                  <Link className="btn feed-card-btn feed-card-btn-open" to={`/profiles/${p.id}`}>
                    Открыть анкету
                  </Link>
                </div>
              );
            }

            if (it.kind === "request") {
              const r = it.request;
              const parent = r.parent;
              const requestAuthorName = parent?.displayName?.trim() || "Родитель";
              const requestAvatarSrc = getAvatarSrc(
                parent?.avatarUrl ?? null,
                parent?.photoUrl ?? null,
                parent?.gender ?? null,
              );
              const requestCategoryIcon = getCategoryIcon(r.category);
              const isCompleted = r.status === "done" || r.status === "cancelled";
              return (
                <div
                  key={`r-${r.id}-${idx}`}
                  className={`card feed-card feed-card-request ${isCompleted ? "card--completed" : ""}`}
                >
                  <div className="feed-card-header">
                    <div className="feed-card-avatar-wrap">
                      <div className="feed-card-avatar">
                        <img src={requestAvatarSrc} alt="" />
                      </div>
                      {requestCategoryIcon && (
                        <div className="feed-card-category-badge" title={r.category}>
                          <img src={requestCategoryIcon} alt="" />
                        </div>
                      )}
                    </div>
                    <div className="feed-card-title-block">
                      <div className="feed-card-title-row">
                        <div className="feed-card-title">{requestAuthorName}</div>
                        <div className="spacer" />
                        <div className="pill">{labelRequestStatus(r.status)}</div>
                      </div>
                      <div className="feed-card-meta-block">
                        <div className="feed-card-title-row" style={{ alignItems: "center", gap: 8 }}>
                          <div className="feed-card-category">
                            <span>Категория: <strong>{r.category}</strong></span>
                          </div>
                          {parent && (parent.ratingCount ?? 0) > 0 && (
                            <div className="feed-card-rating">
                              <span className="rating-star">★</span> {parent.ratingAvg ?? "0"} ({parent.ratingCount})
                            </div>
                          )}
                        </div>
                        <div className="feed-card-meta feed-card-meta-vertical muted">
                          {r.district && <span>район: {r.district}</span>}
                          {r.budget != null && <span>бюджет: {formatMoney(r.budget)}</span>}
                          {!r.district && r.budget == null && <span>—</span>}
                        </div>
                      </div>
                    </div>
                  </div>
                  {r.description && <div className="feed-card-desc">{r.description}</div>}
                  <div className="feed-card-request-row">
                    <Link className="btn feed-card-btn feed-card-btn-open" to={`/requests/${r.id}`}>
                      Открыть заявку
                    </Link>
                    <span className="feed-card-request-time muted">{formatRequestCreatedAt(r.createdAt)}</span>
                  </div>
                </div>
              );
            }

            return null;
          })}
          <PaginationBar
            currentPage={feedPage}
            totalPages={totalPages}
            onPrev={() => setFeedPage((p) => Math.max(1, p - 1))}
            onNext={() => setFeedPage((p) => Math.min(totalPages, p + 1))}
          />
        </div>
      )}
    </div>
  );
}
