import { useRef, useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { StubCard } from "../components/StubCard";
import { PaginationBar, ITEMS_PER_PAGE } from "../components/PaginationBar";
import { formatMoney, formatRequestCreatedAt } from "../lib/format";
import { labelRequestStatus } from "../lib/labels";
import { getAvatarSrc } from "../lib/avatar";
import { ImageSlider } from "../components/ImageSlider";
import { FEED_CATEGORIES, CATEGORY_TREE, getCategoryIcon, getCategoryDisplayText } from "../constants/feed";
import { CategoryDisplay } from "../components/CategoryDisplay";
import { PARENT_ROLE_EMOJI } from "../lib/labels";
import feedHeaderBg from "../assets/img/background.png";

const VISIT_SENT_KEY = "for_moms_visit_sent";

export function FeedScreen() {
  const feedHeaderCardRef = useRef<HTMLDivElement>(null);
  const {
    feed,
    feedError,
    feedCategory,
    setFeedCategory,
    feedSubcategory,
    setFeedSubcategory,
    feedView,
    setFeedView,
    setFeed,
    setFeedError,
    setFeedReloadKey,
    activeProfileType,
    missingRole,
    addMissingRole,
    authedPost,
  } = useApp();

  const currentSection = CATEGORY_TREE.find((s) => s.id === feedCategory);

  /** Один раз за сессию записываем визит родителя (для Conversion Parent → Order). */
  useEffect(() => {
    if (activeProfileType !== "parent") return;
    if (sessionStorage.getItem(VISIT_SENT_KEY)) return;
    authedPost("/me/visit", {})
      .then(() => sessionStorage.setItem(VISIT_SENT_KEY, "1"))
      .catch(() => {});
  }, [activeProfileType, authedPost]);

  useEffect(() => {
    const parent = feedHeaderCardRef.current;
    if (!parent) return;
    const scrollContainers = parent.querySelectorAll<HTMLDivElement>(".feed-categories-scroll");
    const cleanups: Array<() => void> = [];
    scrollContainers.forEach((el) => {
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
      cleanups.push(() => {
        el.removeEventListener("touchstart", onTouchStart);
        el.removeEventListener("touchmove", onTouchMove);
      });
    });
    return () => {
      cleanups.forEach((c) => c());
    };
  }, [feedCategory]);
  const subcategoryOptions = currentSection
    ? [{ id: "", label: "Все" }, ...currentSection.children]
    : [];

  const allItems = feed?.items.filter((it) => it.kind !== "banner") ?? [];
  const contentItems = useMemo(() => {
    if (feedView === "specialists") {
      return allItems.filter((it) => it.kind === "specialist_profile" || it.kind === "other_post");
    }
    return allItems.filter((it) => it.kind === "request" || it.kind === "other_post");
  }, [allItems, feedView]);
  const contentCount = contentItems.length;

  const [feedPage, setFeedPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(contentCount / ITEMS_PER_PAGE));
  const paginatedItems = useMemo(
    () => contentItems.slice((feedPage - 1) * ITEMS_PER_PAGE, feedPage * ITEMS_PER_PAGE),
    [contentItems, feedPage],
  );
  useEffect(() => {
    setFeedPage(1);
  }, [contentCount, feedCategory, feedSubcategory, feedView]);

  const feedSubtitle =
    feedView === "requests"
      ? "👋 Заявки от родителей"
      : "👋 Кого сегодня ищем?";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div className="feed-segmented" role="tablist" aria-label="Режим ленты">
        <button
          type="button"
          role="tab"
          aria-selected={feedView === "specialists"}
          className={`feed-segmented-segment ${feedView === "specialists" ? "feed-segmented-segment--active" : ""}`}
          onClick={() => {
            if (feedView !== "specialists") {
              setFeedCategory("");
              setFeedSubcategory("");
              setFeedView("specialists");
            }
          }}
        >
          Ищу специалиста
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={feedView === "requests"}
          className={`feed-segmented-segment ${feedView === "requests" ? "feed-segmented-segment--active" : ""}`}
          onClick={() => {
            if (feedView !== "requests") {
              setFeedCategory("");
              setFeedSubcategory("");
              setFeedView("requests");
            }
          }}
        >
          Ищу заказ
        </button>
      </div>
      <div className="feed-header-card-wrap" ref={feedHeaderCardRef}>
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
        <div className="feed-categories-scroll" role="region" aria-label="Категории">
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
          {feedCategory === "Объявления" && (
            <div style={{ marginBottom: 8 }}>
              <Link className="btn btn-primary" to="/posts/new">
                + Добавить объявление
              </Link>
            </div>
          )}
          {contentCount === 0 && (
            <StubCard
              title={
                feedCategory === "Объявления"
                  ? "💬 Объявлений пока нет"
                  : feedView === "requests"
                    ? "💛 Заявок пока нет"
                    : "💛 Специалистов пока нет"
              }
              desc={
                feedCategory === "Объявления"
                  ? "Напишите первое объявление — его увидят и мамы, и специалисты."
                  : "Но они появляются регулярно — попробуйте выбрать другую категорию."
              }
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
                {feedCategory === "Объявления" ? (
                  <Link className="btn btn-primary" to="/posts/new">
                    + Добавить объявление
                  </Link>
                ) : missingRole ? (
                  <button type="button" className="btn btn-primary" onClick={() => void addMissingRole()}>
                    + {missingRole === "parent" ? `${PARENT_ROLE_EMOJI} Родитель` : "Специалист"}
                  </button>
                ) : null}
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
                        <div className="feed-card-category-badge" title={getCategoryDisplayText(p.category ?? null)}>
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
                          <CategoryDisplay category={p.category ?? null} />
                        </div>
                        <div className="category-display">
                          <div className="category-display-row">
                            <span className="category-display-label">город, район:</span>
                            <span className="category-display-value">{[p.city, p.district].filter(Boolean).join(", ") || "—"}</span>
                          </div>
                          {p.pricePerHour != null && (
                            <div className="category-display-row">
                              <span className="category-display-label">цена за час:</span>
                              <span className="category-display-value profile-card-meta-value--price">{p.pricePerHour} ₽/час</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  {p.portfolioImageUrls && p.portfolioImageUrls.length > 0 && (
                    <ImageSlider images={p.portfolioImageUrls} alt="" height={120} className="feed-card-specialist-images" allowModal={false} />
                  )}
                  <Link className="btn feed-card-btn feed-card-btn-open" to={`/profiles/${p.id}`}>
                    Открыть анкету
                  </Link>
                </div>
              );
            }

            if (it.kind === "other_post") {
              const { post } = it;
              const preview = post.content.length > 150 ? post.content.slice(0, 150) + "…" : post.content;
              const images = post.images ?? [];
              return (
                <div key={`op-${post.id}-${idx}`} className="card feed-card feed-card-other">
                  <div className="feed-card-header">
                    <div className="feed-card-avatar-wrap">
                      <div className="feed-card-avatar">
                        <img src={getAvatarSrc(post.author.avatarUrl, post.author.photoUrl, null)} alt="" />
                      </div>
                    </div>
                    <div className="feed-card-title-block">
                      <div className="feed-card-title-row">
                        <div className="feed-card-title">{post.author.displayName}</div>
                        <span className="feed-card-request-time muted" style={{ marginLeft: 8 }}>
                          {formatRequestCreatedAt(post.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>
                  {images.length > 0 && (
                    <ImageSlider images={images} alt="" height={140} className="feed-card-other-images" allowModal={false} />
                  )}
                  <div className="feed-card-desc" style={{ whiteSpace: "pre-wrap" }}>{preview}</div>
                  <div className="feed-card-request-row">
                    <Link className="btn feed-card-btn feed-card-btn-open" to={`/posts/${post.id}`}>
                      Открыть
                    </Link>
                  </div>
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
                  {isCompleted ? (
                    <div className="feed-card-request-content">
                      <div className="feed-card-header">
                        <div className="feed-card-avatar-wrap">
                          <div className="feed-card-avatar">
                            <img src={requestAvatarSrc} alt="" />
                          </div>
                          {requestCategoryIcon && (
                            <div className="feed-card-category-badge" title={getCategoryDisplayText(r.category)}>
                              <img src={requestCategoryIcon} alt="" />
                            </div>
                          )}
                        </div>
                        <div className="feed-card-title-block">
                          <div className="feed-card-title-row">
                            <div className="feed-card-title">{requestAuthorName}</div>
                            {parent && (parent.ratingCount ?? 0) > 0 && (
                              <div className="feed-card-rating" style={{ flexShrink: 0 }}>
                                <span className="rating-star">★</span> {parent.ratingAvg ?? "0"} ({parent.ratingCount})
                              </div>
                            )}
                            <div className="spacer" />
                            <div className="pill">{labelRequestStatus(r.status)}</div>
                          </div>
                          <div className="feed-card-meta-block">
                            <div className="feed-card-category">
                              <CategoryDisplay category={r.category} />
                            </div>
                            <div className="category-display">
                              <div className="category-display-row">
                                <span className="category-display-label">Район:</span>
                                <span className="category-display-value">{r.district ?? "—"}</span>
                              </div>
                              <div className="category-display-row">
                                <span className="category-display-label">Бюджет:</span>
                                <span className="category-display-value">{r.budget != null ? formatMoney(r.budget) : "—"}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                      {r.images && r.images.length > 0 && (
                        <ImageSlider images={r.images} alt="" height={140} className="feed-card-request-images" allowModal={false} />
                      )}
                      {r.description && <div className="feed-card-desc">{r.description}</div>}
                    </div>
                  ) : (
                    <>
                      <div className="feed-card-header">
                        <div className="feed-card-avatar-wrap">
                          <div className="feed-card-avatar">
                            <img src={requestAvatarSrc} alt="" />
                          </div>
                          {requestCategoryIcon && (
                            <div className="feed-card-category-badge" title={getCategoryDisplayText(r.category)}>
                              <img src={requestCategoryIcon} alt="" />
                            </div>
                          )}
                        </div>
                        <div className="feed-card-title-block">
                          <div className="feed-card-title-row">
                            <div className="feed-card-title">{requestAuthorName}</div>
                            {parent && (parent.ratingCount ?? 0) > 0 && (
                              <div className="feed-card-rating" style={{ flexShrink: 0 }}>
                                <span className="rating-star">★</span> {parent.ratingAvg ?? "0"} ({parent.ratingCount})
                              </div>
                            )}
                            <div className="spacer" />
                            <div className="pill">{labelRequestStatus(r.status)}</div>
                          </div>
                          <div className="feed-card-meta-block">
                            <div className="feed-card-category">
                              <CategoryDisplay category={r.category} />
                            </div>
                            <div className="category-display">
                              <div className="category-display-row">
                                <span className="category-display-label">Район:</span>
                                <span className="category-display-value">{r.district ?? "—"}</span>
                              </div>
                              <div className="category-display-row">
                                <span className="category-display-label">Бюджет:</span>
                                <span className="category-display-value">{r.budget != null ? formatMoney(r.budget) : "—"}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                      {r.images && r.images.length > 0 && (
                        <ImageSlider images={r.images} alt="" height={140} className="feed-card-request-images" allowModal={false} />
                      )}
                      {r.description && <div className="feed-card-desc">{r.description}</div>}
                    </>
                  )}
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
