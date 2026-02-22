import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { uploadFile } from "../shared/api";
import { compressImage } from "../lib/imageCompress";
import { AvatarImage } from "../components/AvatarImage";
import { formatPhoneMask, formatPhoneToDigits, formatDate, formatPricePerHour } from "../lib/format";
import { getParentRoleLabel, PARENT_ROLE_EMOJI } from "../lib/labels";
import { CATEGORY_TREE, getCategoryIcon } from "../constants/feed";
import { CategoryDisplay } from "../components/CategoryDisplay";
import { ImageSlider } from "../components/ImageSlider";
import { PaginationBar } from "../components/PaginationBar";
import type { ReviewListItem } from "../types";

const REVIEWS_PER_PAGE = 3;

export function ProfileScreen() {
  const location = useLocation();
  const navigate = useNavigate();
  const {
    activeProfile,
    me,
    isAdmin,
    token,
    authedPatch,
    authedPost,
    authedDelete,
    authedGet,
    refreshMe,
    ensureActiveProfile,
    missingRoles,
    addRole,
    setMeError,
    platform,
  } = useApp();

  const [reviews, setReviews] = useState<ReviewListItem[] | null>(null);
  const [reviewsErr, setReviewsErr] = useState<string | null>(null);
  const [reviewsPage, setReviewsPage] = useState(1);

  if (!me) return <div className="card">Загрузка…</div>;
  if (me.profiles.length === 0) return null;

  const profileId = activeProfile?.id;
  const type = activeProfile?.type;
  const telegramPhotoUrl = me?.user?.photoUrl ?? null;
  const openedWithEditRef = useRef(Boolean((location.state as { openEdit?: boolean })?.openEdit));
  const [isEditing, setIsEditing] = useState(openedWithEditRef.current);

  useEffect(() => {
    if ((location.state as { openEdit?: boolean })?.openEdit) {
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.pathname, location.state, navigate]);
  const [displayName, setDisplayName] = useState(activeProfile?.displayName ?? "");
  const [gender, setGender] = useState<string>(
    activeProfile?.gender === "male" || activeProfile?.gender === "female" ? activeProfile?.gender ?? "" : "",
  );
  const [age, setAge] = useState(activeProfile?.age != null ? String(activeProfile.age) : "");
  const [city, setCity] = useState(activeProfile?.city ?? "");
  const [district, setDistrict] = useState(activeProfile?.district ?? "");
  const [contactPhone, setContactPhone] = useState(activeProfile?.contactPhone ?? "");
  const [showContactPhonePublicly, setShowContactPhonePublicly] = useState(Boolean(activeProfile?.showContactPhonePublicly));
  const [childrenAges, setChildrenAges] = useState("");
  const [specialWishes, setSpecialWishes] = useState("");
  const [pricePerHour, setPricePerHour] = useState("");
  const [priceOption, setPriceOption] = useState<"number" | "negotiable" | "unspecified">("number");
  const [about, setAbout] = useState("");
  const [specialistCategory, setSpecialistCategory] = useState("");
  const [portfolioImageUrls, setPortfolioImageUrls] = useState<string[]>([]);
  const [portfolioUploading, setPortfolioUploading] = useState(false);
  const specialistFileInputRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState("");
  const [inn, setInn] = useState("");
  const [legalAddress, setLegalAddress] = useState("");
  const [maxProfileUrl, setMaxProfileUrl] = useState(me?.user?.maxProfileUrl ?? "");
  const [linkCode, setLinkCode] = useState<string | null>(null);
  const [linkLoading, setLinkLoading] = useState(false);
  const [pendingDeleteProfileId, setPendingDeleteProfileId] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const avatarFileInputRef = useRef<HTMLInputElement>(null);
  const [deletingPortfolioIndex, setDeletingPortfolioIndex] = useState<number | null>(null);
  /** Не перезаписывать форму, пока пользователь редактирует этот же профиль (сохраняем несохранённые правки). */
  const lastSyncedProfileIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!activeProfile) return;
    const profileIdStr = activeProfile.id.toString();
    if (isEditing && lastSyncedProfileIdRef.current === profileIdStr) return;
    lastSyncedProfileIdRef.current = profileIdStr;
    setDisplayName(activeProfile.displayName ?? "");
    setGender(activeProfile.gender === "male" || activeProfile.gender === "female" ? activeProfile.gender : "");
    setAge(activeProfile.age != null ? String(activeProfile.age) : "");
    setCity(activeProfile.city ?? "");
    setDistrict(activeProfile.district ?? "");
    setContactPhone(formatPhoneMask(activeProfile.contactPhone ?? ""));
    setShowContactPhonePublicly(Boolean(activeProfile.showContactPhonePublicly));
    if (activeProfile.type === "parent") {
      const parent = activeProfile.parent;
      setChildrenAges(Array.isArray(parent?.childrenAges) ? parent.childrenAges.join(", ") : "");
      setSpecialWishes(parent?.specialWishes ?? "");
    }
    if (activeProfile.type === "company") {
      const company = activeProfile.company;
      setCompanyName(company?.companyName ?? "");
      setInn(company?.inn ?? "");
      setLegalAddress(company?.legalAddress ?? "");
    }
    if (activeProfile.type === "specialist" || activeProfile.type === "company") {
      const spec = activeProfile.specialist;
      if (spec) {
        if (spec.pricePerHour === 0) {
          setPriceOption("negotiable");
          setPricePerHour("");
        } else if (spec.pricePerHour != null && Number.isFinite(spec.pricePerHour)) {
          setPriceOption("number");
          setPricePerHour(String(spec.pricePerHour));
        } else {
          setPriceOption(activeProfile.type === "company" ? "unspecified" : "number");
          setPricePerHour("");
        }
        setAbout(spec.about ?? "");
        setPortfolioImageUrls(Array.isArray(spec.portfolioImageUrls) ? spec.portfolioImageUrls : []);
        const first =
          Array.isArray(spec.skills) && spec.skills.length > 0
            ? spec.skills[0]
            : typeof spec.skills === "string"
              ? spec.skills
              : "";
        setSpecialistCategory(first || "");
      } else {
        setPriceOption(type === "company" ? "unspecified" : "number");
        setPricePerHour("");
        setAbout("");
        setPortfolioImageUrls([]);
        setSpecialistCategory("");
      }
    }
    setMaxProfileUrl(me?.user?.maxProfileUrl ?? "");
  }, [activeProfile, isEditing, me?.user?.maxProfileUrl]);

  useEffect(() => {
    if (!profileId || !authedGet) return;
    let cancelled = false;
    setReviewsErr(null);
    setReviews(null);
    const run = async () => {
      try {
        const list = await authedGet<ReviewListItem[]>(`/profiles/${profileId}/reviews`);
        if (!cancelled) setReviews(Array.isArray(list) ? list : []);
      } catch (e: unknown) {
        if (!cancelled) setReviewsErr(e instanceof Error ? e.message : "Не удалось загрузить отзывы");
        if (!cancelled) setReviews([]);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [profileId, authedGet]);

  useEffect(() => setReviewsPage(1), [profileId]);

  const reviewsList = reviews ?? [];
  const reviewsTotalPages = Math.max(1, Math.ceil(reviewsList.length / REVIEWS_PER_PAGE));
  const reviewsPaginated = useMemo(
    () => reviewsList.slice((reviewsPage - 1) * REVIEWS_PER_PAGE, reviewsPage * REVIEWS_PER_PAGE),
    [reviewsList, reviewsPage],
  );

  const save = async () => {
    setErr(null);
    if (type === "parent") {
      const nameOk = displayName.trim().length > 0;
      const genderOk = gender === "female" || gender === "male";
      const ageNum = age.trim() === "" ? null : Number(age);
      const ageOk = ageNum != null && Number.isFinite(ageNum) && ageNum > 0;
      const cityOk = city.trim().length > 0;
      const districtOk = district.trim().length > 0;
      const childrenAgesParsed = childrenAges
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .map((s) => Number(s))
        .filter((n) => Number.isFinite(n));
      const childrenOk = childrenAgesParsed.length > 0;
      if (!nameOk || !genderOk || !ageOk || !cityOk || !districtOk || !childrenOk) {
        const parts: string[] = [];
        if (!nameOk) parts.push("имя");
        if (!genderOk) parts.push("пол");
        if (!ageOk) parts.push("возраст");
        if (!cityOk) parts.push("город");
        if (!districtOk) parts.push("район");
        if (!childrenOk) parts.push("возраст детей");
        setErr(`Заполните обязательные поля: ${parts.join(", ")}`);
        return;
      }
    }
    if (type === "company") {
      const nameOk = companyName.trim().length > 0;
      const cityOk = city.trim().length > 0;
      const districtOk = district.trim().length > 0;
      const categoryOk = specialistCategory.trim().length > 0;
      const priceNum = pricePerHour.trim() === "" ? null : Number(pricePerHour);
      const priceOk =
        priceOption === "unspecified" || (priceNum != null && Number.isFinite(priceNum) && priceNum > 0);
      const aboutOk = about.trim().length > 0;
      if (!nameOk || !cityOk || !districtOk || !categoryOk || !priceOk || !aboutOk) {
        const parts: string[] = [];
        if (!nameOk) parts.push("название компании");
        if (!cityOk) parts.push("город");
        if (!districtOk) parts.push("район");
        if (!categoryOk) parts.push("категорию");
        if (!priceOk) parts.push("цену за час или «Не указано»");
        if (!aboutOk) parts.push("«О компании»");
        setErr(`Заполните обязательные поля: ${parts.join(", ")}`);
        return;
      }
    }
    if (type === "specialist") {
      const nameOk = displayName.trim().length > 0;
      const cityOk = city.trim().length > 0;
      const districtOk = district.trim().length > 0;
      const categoryOk = specialistCategory.trim().length > 0;
      const priceNum = pricePerHour.trim() === "" ? null : Number(pricePerHour);
      const priceOk =
        priceOption === "negotiable" || (priceNum != null && Number.isFinite(priceNum) && priceNum > 0);
      const aboutOk = about.trim().length > 0;
      if (!nameOk || !cityOk || !districtOk || !categoryOk || !priceOk || !aboutOk) {
        const parts: string[] = [];
        if (!nameOk) parts.push("имя");
        if (!cityOk) parts.push("город");
        if (!districtOk) parts.push("район");
        if (!categoryOk) parts.push("категорию");
        if (!priceOk) parts.push("цену за час или «Договорная»");
        if (!aboutOk) parts.push("«О себе»");
        setErr(`Заполните обязательные поля: ${parts.join(", ")}`);
        return;
      }
    }
    setSaving(true);
    try {
      const ageNum = age.trim() === "" ? null : Number(age);
      await authedPatch(`/profiles/${profileId}`, {
        displayName: type === "company" ? (companyName.trim() || null) : (displayName.trim() || null),
        gender: type === "company" ? null : (gender === "male" || gender === "female" ? gender : null),
        age: type === "company" ? null : (ageNum != null && Number.isFinite(ageNum) ? ageNum : null),
        city: city.trim() || null,
        district: district.trim() || null,
        contactPhone: formatPhoneToDigits(contactPhone).trim() || null,
        showContactPhonePublicly: showContactPhonePublicly,
      });
      if (type === "parent") {
        const ages = childrenAges
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
          .map((s) => Number(s))
          .filter((n) => Number.isFinite(n));
        await authedPatch(`/profiles/${profileId}/parent`, {
          childrenAges: ages.length ? ages : null,
          specialWishes: specialWishes.trim() || null,
        });
      }
      if (type === "company") {
        await authedPatch(`/profiles/${profileId}/company`, {
          companyName: companyName.trim() || null,
          inn: inn.trim() || null,
          legalAddress: legalAddress.trim() || null,
        });
      }
      if (type === "specialist" || type === "company") {
        const priceValue =
          type === "specialist"
            ? priceOption === "negotiable"
              ? 0
              : (() => {
                  const n = pricePerHour.trim() === "" ? null : Number(pricePerHour);
                  return n != null && Number.isFinite(n) ? n : null;
                })()
            : priceOption === "unspecified"
              ? null
              : (() => {
                  const n = pricePerHour.trim() === "" ? null : Number(pricePerHour);
                  return n != null && Number.isFinite(n) ? n : null;
                })();
        await authedPatch(`/profiles/${profileId}/specialist`, {
          skills: specialistCategory ? [specialistCategory] : [],
          pricePerHour: priceValue,
          about: about.trim() || null,
          portfolioImageUrls: portfolioImageUrls.length > 0 ? portfolioImageUrls : [],
        });
      }
      await authedPatch("/me", { maxProfileUrl: maxProfileUrl.trim() || null });
      await refreshMe();
      setIsEditing(false);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Не удалось сохранить");
    } finally {
      setSaving(false);
    }
  };

  const removePortfolioPhoto = async (index: number) => {
    if (!profileId || !activeProfile?.specialist?.portfolioImageUrls) return;
    const urls = activeProfile.specialist.portfolioImageUrls;
    const newUrls = urls.filter((_, j) => j !== index);
    setDeletingPortfolioIndex(index);
    setErr(null);
    try {
      await authedPatch(`/profiles/${profileId}/specialist`, {
        portfolioImageUrls: newUrls,
      });
      await refreshMe();
      setErr(null);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Не удалось удалить фото";
      setErr(msg);
      setMeError(msg);
    } finally {
      setDeletingPortfolioIndex(null);
    }
  };

  const roles = me.profiles
    .filter((p) => p.type === "parent" || p.type === "specialist" || p.type === "company")
    .map((p) => ({
      ...p,
      title:
        p.type === "parent"
          ? `${PARENT_ROLE_EMOJI} ${getParentRoleLabel(p.gender)}`
          : p.type === "company"
            ? "🏢 Компания"
            : "👩‍🏫 Специалист",
    }));

  const renderReviewCard = (r: ReviewListItem) => {
    const fromProfile = r.fromProfile;
    const namePart =
      fromProfile?.displayName?.trim() ||
      [fromProfile?.firstName, fromProfile?.lastName].filter(Boolean).join(" ") ||
      "";
    const authorName = !fromProfile || !namePart ? "Удалённый аккаунт" : namePart;
    const showAuthorAvatar = fromProfile && namePart;
    const categoryIcon = r.requestCategory ? getCategoryIcon(r.requestCategory) : null;
    return (
      <div key={r.id} className="card review-card" style={{ background: "var(--tg-bg)" }}>
        <div className="row" style={{ alignItems: "center", gap: 12 }}>
          {showAuthorAvatar ? (
            <div style={{ width: 40, height: 40, borderRadius: "50%", overflow: "hidden", background: "#fff", flexShrink: 0 }}>
              <AvatarImage
                avatarUrl={fromProfile.avatarUrl ?? null}
                telegramPhotoUrl={fromProfile.photoUrl ?? null}
                gender={fromProfile.gender ?? null}
                profileType={fromProfile.type}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            </div>
            ) : (
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: "50%",
                  background: "#fff",
                  border: "1px solid var(--border-color)",
                  flexShrink: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 12,
                color: "var(--text-secondary)",
              }}
              aria-hidden
            >
              —
            </div>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 800 }}>{authorName}</div>
            {r.requestCategory && (
              <div className="muted" style={{ fontSize: 13, marginTop: 2 }}>
                {categoryIcon && (
                  <img
                    src={categoryIcon}
                    alt=""
                    style={{ width: 14, height: 14, verticalAlign: "middle", marginRight: 4 }}
                  />
                )}
                <CategoryDisplay category={r.requestCategory} inline />
              </div>
            )}
          </div>
          <div className="review-card-rating" style={{ fontWeight: 900 }}>
            <span className="rating-star">★</span> {r.rating}
          </div>
        </div>
        <div className="muted" style={{ marginTop: 8, fontSize: 13 }}>
          {formatDate(r.createdAt)}
        </div>
        {r.text && <div className="review-card-text" style={{ marginTop: 6 }}>{r.text}</div>}
      </div>
    );
  };

  const reviewsBlock = profileId ? (
    <div className="card">
      <div className="h2">Отзывы</div>
      <p className="muted" style={{ marginTop: 6, marginBottom: 0, fontSize: 13 }}>
        Отзывы о вас после завершённых заявок. По {REVIEWS_PER_PAGE} на страницу.{" "}
        {profileId && (
          <Link to={`/profiles/${profileId}`}>Все отзывы в публичном профиле</Link>
        )}
      </p>
      {reviewsErr && <div className="muted" style={{ marginTop: 8 }}>{reviewsErr}</div>}
      {reviews === null && !reviewsErr && <div className="muted" style={{ marginTop: 8 }}>Загрузка…</div>}
      {reviews && reviews.length === 0 && (
        <div className="muted" style={{ marginTop: 8 }}>Пока нет отзывов.</div>
      )}
      {reviews && reviews.length > 0 && (
        <>
          <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
            {reviewsPaginated.map(renderReviewCard)}
          </div>
          <PaginationBar
            currentPage={reviewsPage}
            totalPages={reviewsTotalPages}
            onPrev={() => setReviewsPage((p) => Math.max(1, p - 1))}
            onNext={() => setReviewsPage((p) => Math.min(reviewsTotalPages, p + 1))}
          />
        </>
      )}
    </div>
  ) : null;

  const rolesBlock = (
    <div className="card roles-page">
      <div className="row">
        <div className="h2">Профили</div>
        <div className="spacer" />
        {missingRoles.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {missingRoles.includes("parent") && (
              <button className="btn btn-primary roles-page-btn" onClick={() => addRole("parent")}>
                + {PARENT_ROLE_EMOJI} Родитель
              </button>
            )}
            {missingRoles.includes("specialist") && (
              <button className="btn btn-primary roles-page-btn" onClick={() => addRole("specialist")}>
                + 👩‍🏫 Специалист
              </button>
            )}
            {missingRoles.includes("company") && (
              <button className="btn btn-primary roles-page-btn" onClick={() => addRole("company")}>
                + 🏢 Компания
              </button>
            )}
          </div>
        )}
      </div>
      <div className="muted roles-page-desc">Выберите активный профиль или удалите ненужный.</div>
      {pendingDeleteProfileId && (() => {
        const p = roles.find((r) => r.id === pendingDeleteProfileId);
        const roleName = p ? (p.type === "parent" ? getParentRoleLabel(p.gender) : p.type === "company" ? "Компания" : "Специалист") : "";
        return (
          <div className="card" style={{ marginBottom: 12, padding: 16 }}>
            <p style={{ margin: "0 0 12px" }}>
              Удалить аккаунт «{roleName}»? Все данные этого профиля будут удалены безвозвратно.
            </p>
            <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
              <button
                type="button"
                className="btn danger"
                onClick={async () => {
                  if (!pendingDeleteProfileId) return;
                  const profileId = pendingDeleteProfileId;
                  setPendingDeleteProfileId(null);
                  try {
                    await authedDelete(`/profiles/${profileId}`);
                    await refreshMe();
                    if (me?.activeProfileId === profileId) navigate("/profile", { replace: true });
                  } catch (e: unknown) {
                    setMeError(e instanceof Error ? e.message : "Не удалось удалить");
                  }
                }}
              >
                Удалить
              </button>
              <button type="button" className="btn secondary" onClick={() => setPendingDeleteProfileId(null)}>
                Отмена
              </button>
            </div>
          </div>
        );
      })()}
      <div className="roles-list">
        {roles.map((p) => {
          const isActive = p.id === me.activeProfileId;
          return (
            <div key={p.id} className="roles-card-wrap">
              <div className="card roles-card" style={{ background: "var(--tg-bg)" }}>
                <div className="roles-card-inner">
                  <div className="roles-card-left">
                    <div className="roles-card-title">{p.title}</div>
                    <div className="muted roles-card-desc">
                      {p.displayName ?? "—"} · {p.city ?? "—"} · {p.district ?? "—"}
                    </div>
                  </div>
                  <div className="roles-card-right">
                    {isActive ? (
                      <span className="pill pill--active-green">Активен</span>
                    ) : (
                      <button
                        type="button"
                        className="btn roles-page-btn"
                        onClick={() => void ensureActiveProfile(p.id)}
                      >
                        Сделать активным
                      </button>
                    )}
                  </div>
                </div>
              </div>
              <button
                type="button"
                className="btn danger roles-delete-btn roles-page-btn"
                onClick={() => setPendingDeleteProfileId(p.id)}
              >
                Удалить аккаунт
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );

  if (!activeProfile) {
    return <div style={{ display: "grid", gap: 12 }}>{rolesBlock}</div>;
  }

  if (!isEditing) {
    return (
      <div style={{ display: "grid", gap: 12 }}>
      <div className="card profile-view-card">
        <div className="profile-view-header" style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "nowrap" }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 className="h2" style={{ margin: 0, overflowWrap: "break-word", wordBreak: "break-word" }}>
              {activeProfile.displayName || "—"}
            </h2>
            <p className="muted" style={{ margin: "4px 0 0" }}>
              {type === "parent" ? `${PARENT_ROLE_EMOJI} ${getParentRoleLabel(activeProfile.gender)}` : type === "company" ? "🏢 Компания" : "👩‍🏫 Специалист"}
            </p>
          </div>
          {(type === "specialist" || type === "company") && (
            <Link className="btn secondary" to="/profile/analytics" style={{ flexShrink: 0 }}>
              Аналитика
            </Link>
          )}
        </div>
        {profileId && (
          <div style={{ paddingBottom: 16, borderBottom: "1px solid var(--border-color)" }}>
            <div className="muted" style={{ marginBottom: 8, fontSize: 13 }}>Фото профиля</div>
            <p className="muted" style={{ margin: "0 0 12px", fontSize: 13 }}>
              По умолчанию подставляется фото из Telegram. Можно загрузить своё — оно не будет заменяться при входе.
            </p>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
              <div style={{ flexShrink: 0 }}>
                <div
                  style={{
                    width: 96,
                    height: 96,
                    borderRadius: "50%",
                    overflow: "hidden",
                    background: "#fff",
                    border: "2px solid var(--border-color)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                  aria-hidden
                >
                  <AvatarImage
                    avatarUrl={activeProfile?.avatarUrl ?? null}
                    telegramPhotoUrl={telegramPhotoUrl}
                    gender={activeProfile?.gender ?? null}
                    profileType={activeProfile?.type}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                </div>
                <p className="muted" style={{ margin: "6px 0 0", fontSize: 12, textAlign: "center" }}>
                  Так в анкете
                </p>
              </div>
              <div style={{ flex: "1 1 200px", minWidth: 0 }}>
                <input
                  ref={avatarFileInputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: "none" }}
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file || !token || !profileId) {
                      e.target.value = "";
                      return;
                    }
                    if (file.type && !file.type.startsWith("image/")) {
                      e.target.value = "";
                      return;
                    }
                    setAvatarUploading(true);
                    setErr(null);
                    try {
                      let toUpload: File;
                      try {
                        toUpload = await compressImage(file);
                      } catch {
                        if (!/^image\/(jpeg|png|gif|webp)$/i.test(file.type)) {
                          e.target.value = "";
                          return;
                        }
                        toUpload = file;
                      }
                      const { url } = await uploadFile("/upload", toUpload, token);
                      await authedPatch(`/profiles/${profileId}`, { avatarUrl: url });
                      await refreshMe();
                    } catch (err: unknown) {
                      const msg = err instanceof Error ? err.message : "Не удалось загрузить фото";
                      setErr(msg);
                      setMeError(msg);
                    } finally {
                      setAvatarUploading(false);
                      e.target.value = "";
                    }
                  }}
                />
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  <button
                    type="button"
                    className="btn btn-sm btn-avatar-upload"
                    disabled={avatarUploading}
                    onClick={() => avatarFileInputRef.current?.click()}
                  >
                    {avatarUploading ? "Загрузка…" : "Загрузить фото"}
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-avatar-remove"
                    onClick={async () => {
                      if (!profileId) return;
                      setErr(null);
                      try {
                        await authedPatch(`/profiles/${profileId}`, { avatarUrl: "" });
                        await refreshMe();
                      } catch (err: unknown) {
                        setMeError(err instanceof Error ? err.message : "Не удалось удалить фото");
                      }
                    }}
                  >
                    Удалить фото
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-avatar-telegram"
                    onClick={async () => {
                      if (!profileId) return;
                      setErr(null);
                      try {
                        await authedPatch(`/profiles/${profileId}`, { avatarUrl: null });
                        await refreshMe();
                      } catch (err: unknown) {
                        setMeError(err instanceof Error ? err.message : "Не удалось обновить");
                      }
                    }}
                  >
                    Из Telegram
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        <dl className="profile-view-dl">
          {type !== "company" && (
            <>
              <div className="profile-view-row">
                <dt className="muted">Пол</dt>
                <dd>
                  {activeProfile.gender === "male" ? "Мужской" : activeProfile.gender === "female" ? "Женский" : "—"}
                </dd>
              </div>
              <div className="profile-view-row">
                <dt className="muted">Возраст</dt>
                <dd>{activeProfile.age != null ? `${activeProfile.age} лет` : "—"}</dd>
              </div>
            </>
          )}
          {type === "company" && activeProfile.company && (
            <>
              <div className="profile-view-row">
                <dt className="muted">Название компании</dt>
                <dd>{activeProfile.company.companyName || "—"}</dd>
              </div>
              <div className="profile-view-row">
                <dt className="muted">ИНН</dt>
                <dd>{activeProfile.company.inn || "—"}</dd>
              </div>
              <div className="profile-view-row">
                <dt className="muted">Юридический адрес</dt>
                <dd>{activeProfile.company.legalAddress || "—"}</dd>
              </div>
            </>
          )}
          <div className="profile-view-row">
            <dt className="muted">Город</dt>
            <dd>{activeProfile.city || "—"}</dd>
          </div>
          <div className="profile-view-row">
            <dt className="muted">Район</dt>
            <dd>{activeProfile.district || "—"}</dd>
          </div>
          <div className="profile-view-row">
            <dt className="muted">Логин в Telegram</dt>
            <dd>{me?.user?.username ? `@${me.user.username}` : "—"}</dd>
          </div>
          <div className="profile-view-row">
            <dt className="muted">Ссылка на профиль в MAX</dt>
            <dd>{me?.user?.maxProfileUrl ? me.user.maxProfileUrl : "—"}</dd>
          </div>
          {platform === "max" && !me?.user?.telegramId && (
            <div className="card" style={{ marginTop: 12, padding: 12 }}>
              <div className="muted" style={{ marginBottom: 8, fontSize: 14 }}>Связать с Telegram</div>
              <p className="muted" style={{ margin: "0 0 8px", fontSize: 13 }}>
                Чтобы получать уведомления в Telegram и использовать один аккаунт в обоих приложениях, привяжите Telegram.
              </p>
              {linkCode ? (
                <>
                  <p style={{ margin: "8px 0", fontWeight: 600 }}>Код: {linkCode}</p>
                  <p className="muted" style={{ margin: "0 0 8px", fontSize: 13 }}>
                    Откройте Telegram и отправьте боту <strong>@formoms_ykt_bot</strong> команду: <code>/start {linkCode}</code>
                  </p>
                  <button type="button" className="btn secondary" onClick={() => setLinkCode(null)}>Скрыть</button>
                </>
              ) : (
                <button
                  type="button"
                  className="btn secondary"
                  disabled={linkLoading}
                  onClick={async () => {
                    setLinkLoading(true);
                    try {
                      const res = await authedPost<{ code: string }>("/me/link-telegram-request", {});
                      setLinkCode(res.code);
                    } catch {
                      setMeError("Не удалось получить код");
                    } finally {
                      setLinkLoading(false);
                    }
                  }}
                >
                  {linkLoading ? "Загрузка…" : "Получить код привязки"}
                </button>
              )}
            </div>
          )}
          <div className="profile-view-row">
            <dt className="muted">Телефон для связи</dt>
            <dd>{activeProfile.contactPhone || "—"}</dd>
          </div>
          {type === "parent" && (
            <>
              <div className="profile-view-row">
                <dt className="muted">Возраст детей</dt>
                <dd>
                  {(activeProfile.parent?.childrenAges ?? []).length > 0
                    ? (activeProfile.parent?.childrenAges ?? []).join(", ")
                    : "—"}
                </dd>
              </div>
              <div className="profile-view-row">
                <dt className="muted">Пожелания</dt>
                <dd>{activeProfile.parent?.specialWishes || "—"}</dd>
              </div>
              <div className="profile-view-row">
                <dt className="muted">Показывать номер специалистам в заявке</dt>
                <dd>{activeProfile.showContactPhonePublicly ? "Да" : "Нет"}</dd>
              </div>
            </>
          )}
          {(type === "specialist" || type === "company") && (
            <>
              <div className="profile-view-row">
                <dt className="muted">Категория</dt>
                <dd>
                  <CategoryDisplay
                    category={(activeProfile.specialist?.skills ?? []).length > 0 ? (activeProfile.specialist?.skills ?? [])[0] : null}
                  />
                </dd>
              </div>
              <div className="profile-view-row">
                <dt className="muted">Цена за час</dt>
                <dd>{formatPricePerHour(activeProfile.specialist?.pricePerHour)}</dd>
              </div>
              <div className="profile-view-row">
                <dt className="muted">{type === "company" ? "О компании" : "О себе"}</dt>
                <dd style={{ whiteSpace: "pre-wrap" }}>
                  {(activeProfile.specialist?.about ?? "").trim() || "—"}
                </dd>
              </div>
              <div className="profile-view-row">
                <dt className="muted">Показывать телефон в анкете и откликах</dt>
                <dd>{activeProfile.showContactPhonePublicly ? "Да" : "Нет"}</dd>
              </div>
            </>
          )}
        </dl>
        {(type === "specialist" || type === "company") && (
          <div style={{ marginTop: 16 }}>
            <div className="muted" style={{ marginBottom: 8, fontSize: 13 }}>Фото в анкете</div>
            {activeProfile.specialist?.portfolioImageUrls && activeProfile.specialist.portfolioImageUrls.length > 0 ? (
              <>
                <ImageSlider images={activeProfile.specialist.portfolioImageUrls} alt="Фото в анкете" height={200} />
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
                  {activeProfile.specialist.portfolioImageUrls.map((url, i) => (
                    <div key={url} style={{ position: "relative" }}>
                      <img src={url} alt="" style={{ width: 56, height: 56, objectFit: "cover", borderRadius: 8, display: "block" }} />
                      <button
                        type="button"
                        onClick={() => void removePortfolioPhoto(i)}
                        disabled={deletingPortfolioIndex !== null}
                        aria-label="Удалить фото"
                        style={{ position: "absolute", top: 4, right: 4, width: 22, height: 22, borderRadius: "50%", border: "none", background: "rgba(0,0,0,0.6)", color: "#fff", fontSize: 14, cursor: "pointer", lineHeight: 1 }}
                      >
                        {deletingPortfolioIndex === i ? "…" : "×"}
                      </button>
                    </div>
                  ))}
                </div>
                {err && (
                  <p role="alert" style={{ margin: "8px 0 0", fontSize: 13, color: "var(--error-color, #c00)" }}>{err}</p>
                )}
              </>
            ) : (
              <div style={{ padding: "16px 0", border: "1px dashed var(--border-color)", borderRadius: "var(--radius-sm)", textAlign: "center" }}>
                <p className="muted" style={{ margin: "0 0 12px", fontSize: 14 }}>Фото не добавлены</p>
                <button type="button" className="btn secondary" onClick={() => setIsEditing(true)}>
                  Добавить фото
                </button>
              </div>
            )}
          </div>
        )}
        <div className="profile-view-actions">
          <button type="button" className="btn btn-primary" onClick={() => setIsEditing(true)}>
            Редактировать
          </button>
        </div>
        {(type === "specialist" || type === "company") && profileId && (
          <div className="profile-notify-toggle" style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--border-color)" }}>
            <label className="profile-toggle-label" style={{ cursor: "pointer", flexWrap: "wrap" }}>
              <span style={{ flex: 1, minWidth: 0, fontSize: 14 }}>
                Разрешить боту присылать в Telegram сообщения о новых заявках по моей категории
              </span>
              <input
                type="checkbox"
                className="profile-toggle-input"
                role="switch"
                checked={activeProfile.specialist?.notifyNewRequestsInCategory ?? false}
                onChange={async (e) => {
                  const value = e.target.checked;
                  try {
                    await authedPatch(`/profiles/${profileId}/specialist`, { notifyNewRequestsInCategory: value });
                    await refreshMe();
                  } catch {
                    setMeError("Не удалось сохранить настройку");
                  }
                }}
              />
              <span className="profile-toggle-slider" />
            </label>
          </div>
        )}
        {(type === "specialist" || type === "company") && (
          <p className="muted" style={{ marginTop: 12, marginBottom: 0, fontSize: 12 }}>
            Фотографии и описания размещены пользователем. Сервис «Для мам» не проверяет достоверность и законность размещённых материалов.
          </p>
        )}
      </div>
      {reviewsBlock}
      {rolesBlock}
      <div className="card profile-docs-links">
        <div className="muted" style={{ marginBottom: 8, fontSize: 13 }}>Связаться с разработчиком</div>
        <ul style={{ margin: 0, paddingLeft: 20, display: "flex", flexDirection: "column", gap: 6 }}>
          <li><Link to="/profile/contact">Сообщить об ошибке</Link></li>
          <li><Link to="/profile/contact?category=order">Заказать свой проект</Link></li>
        </ul>
      </div>
      {isAdmin && (
        <div className="card profile-docs-links">
          <div className="muted" style={{ marginBottom: 8, fontSize: 13 }}>Метрики</div>
          <ul style={{ margin: 0, paddingLeft: 20, display: "flex", flexDirection: "column", gap: 6 }}>
            <li><Link to="/profile/analytics">Дашборд метрик</Link></li>
          </ul>
        </div>
      )}
      <div className="card profile-docs-links">
        <div className="muted" style={{ marginBottom: 8, fontSize: 13 }}>Принятые документы</div>
        <ul style={{ margin: 0, paddingLeft: 20, display: "flex", flexDirection: "column", gap: 6 }}>
          <li><Link to="/docs/agreement">Пользовательское соглашение</Link></li>
          <li><Link to="/docs/consent">Согласие на обработку персональных данных</Link></li>
        </ul>
      </div>
      <div className="card profile-docs-links">
        <div className="muted" style={{ marginBottom: 8, fontSize: 13 }}>Документы сервиса</div>
        <ul style={{ margin: 0, paddingLeft: 20, display: "flex", flexDirection: "column", gap: 6 }}>
          <li><Link to="/docs/policy">Политика обработки персональных данных</Link></li>
        </ul>
      </div>
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: 12 }}>
    <div className="card profile-edit-card">
      <div className="profile-edit-header">
        <h2 className="h2" style={{ margin: 0 }}>
          Редактирование профиля
        </h2>
        <p className="muted" style={{ margin: "4px 0 0" }}>
          {type === "parent" ? `${PARENT_ROLE_EMOJI} ${getParentRoleLabel(activeProfile.gender)}` : type === "company" ? "🏢 Компания" : "👩‍🏫 Специалист"}
        </p>
      </div>
      {err && (
        <div className="profile-edit-err" role="alert">
          {err}
        </div>
      )}
      <div className="profile-edit-fields">
        {type !== "company" && (
          <>
            <div className="field">
              <label className="label">{type === "parent" ? "Имя для отображения *" : "Имя для отображения"}</label>
              <input
                className="input"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Как к вам обращаться"
              />
            </div>
            <div className="field">
              <label className="label">{type === "parent" ? "Пол *" : "Пол"}</label>
              <select className="input" value={gender} onChange={(e) => setGender(e.target.value)}>
                <option value="">Не указан</option>
                <option value="female">Женский</option>
                <option value="male">Мужской</option>
              </select>
            </div>
            <div className="field">
              <label className="label">{type === "parent" ? "Возраст *" : "Возраст"}</label>
              <input
                className="input"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                inputMode="numeric"
                placeholder="25"
              />
            </div>
          </>
        )}
        {type === "company" && (
          <>
            <div className="field">
              <label className="label">Название компании *</label>
              <input
                className="input"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="ООО «Пример»"
              />
            </div>
            <div className="field">
              <label className="label">ИНН</label>
              <input
                className="input"
                value={inn}
                onChange={(e) => setInn(e.target.value)}
                placeholder="Опционально"
                inputMode="numeric"
              />
            </div>
            <div className="field">
              <label className="label">Юридический адрес</label>
              <input
                className="input"
                value={legalAddress}
                onChange={(e) => setLegalAddress(e.target.value)}
                placeholder="Опционально"
              />
            </div>
          </>
        )}
        <div className="field">
          <label className="label">{type === "parent" ? "Город *" : "Город"}</label>
          <input
            className="input"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="Якутск"
          />
        </div>
        <div className="field">
          <label className="label">{type === "parent" ? "Район *" : "Район"}</label>
          <input
            className="input"
            value={district}
            onChange={(e) => setDistrict(e.target.value)}
            placeholder="Центральный"
          />
        </div>
        <div className="field">
          <label className="label">Логин в Telegram</label>
          <input
            className="input"
            value={me?.user?.username ? `@${me.user.username}` : ""}
            readOnly
            disabled
            style={{ opacity: 0.9 }}
          />
          <p className="muted" style={{ marginTop: 4, fontSize: 13 }}>
            {me?.user?.username
              ? "Логин подтягивается из Telegram."
              : "Задайте имя пользователя в Telegram: Настройки → Имя пользователя. Или укажите номер телефона ниже — его увидит специалист после принятия отклика."}
          </p>
        </div>
        <div className="field">
          <label className="label">Ссылка на профиль в MAX</label>
          <input
            className="input"
            value={maxProfileUrl}
            onChange={(e) => setMaxProfileUrl(e.target.value)}
            placeholder="https://max.ru/u/..."
          />
          <p className="muted" style={{ marginTop: 4, fontSize: 13 }}>
            Если вы в MAX, укажите ссылку на ваш профиль (из раздела «Пригласить друзей»). По ней вас смогут найти для связи.
          </p>
        </div>
        <div className="field">
          <label className="label">Номер телефона для связи</label>
          <input
            className="input"
            value={contactPhone}
            onChange={(e) => setContactPhone(formatPhoneMask(e.target.value))}
            placeholder="+7 9__ ___ __ __"
            inputMode="tel"
          />
          <p className="muted" style={{ marginTop: 4, fontSize: 13 }}>
            {(type === "specialist" || type === "company")
              ? "Если разрешите показ ниже — номер будет виден в анкете и в карточках откликов. Иначе родитель увидит его только после принятия вашего отклика."
              : "По этому номеру смогут связаться специалисты после того, как вы примете их отклик."}
          </p>
        </div>
        {(type === "specialist" || type === "parent" || type === "company") && (
          <div className="field">
            <label className="label profile-toggle-label">
              <span>
                {type === "company"
                  ? "Разрешить показывать номер в анкете и в откликах"
                  : type === "specialist"
                    ? "Разрешить показывать номер в анкете и в откликах"
                    : "Разрешить показывать номер специалистам в карточке заявки"}
              </span>
              <input
                type="checkbox"
                className="profile-toggle-input"
                checked={showContactPhonePublicly}
                onChange={(e) => setShowContactPhonePublicly(e.target.checked)}
              />
              <span className="profile-toggle-slider" />
            </label>
          </div>
        )}
        {(type === "specialist" || type === "company") && profileId && (
          <div className="field">
            <label className="label profile-toggle-label" style={{ cursor: "pointer" }}>
              <span>Разрешить боту присылать в Telegram сообщения о новых заявках по моей категории</span>
              <input
                type="checkbox"
                className="profile-toggle-input"
                role="switch"
                checked={activeProfile.specialist?.notifyNewRequestsInCategory ?? false}
                onChange={async (e) => {
                  const value = e.target.checked;
                  try {
                    await authedPatch(`/profiles/${profileId}/specialist`, { notifyNewRequestsInCategory: value });
                    await refreshMe();
                  } catch {
                    setMeError("Не удалось сохранить настройку");
                  }
                }}
              />
              <span className="profile-toggle-slider" />
            </label>
          </div>
        )}
        {type === "parent" && (
          <>
            <div className="field">
              <label className="label">Возраст детей (через запятую) *</label>
              <input
                className="input"
                value={childrenAges}
                onChange={(e) => setChildrenAges(e.target.value)}
                placeholder="2, 5, 7"
              />
            </div>
            <div className="field">
              <label className="label">Пожелания</label>
              <textarea
                className="textarea"
                value={specialWishes}
                onChange={(e) => setSpecialWishes(e.target.value)}
                placeholder="Кратко опишите пожелания"
              />
            </div>
          </>
        )}
        {(type === "specialist" || type === "company") && (
          <>
            <div className="field">
              <label className="label">Категория</label>
              <select
                className="input"
                value={specialistCategory}
                onChange={(e) => setSpecialistCategory(e.target.value)}
              >
                <option value="">Не выбрано</option>
                {CATEGORY_TREE.map((section) => (
                  <optgroup key={section.id} label={section.label}>
                    <option value={section.id}>{section.label}</option>
                    {section.children.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
            <div className="field">
              <label className="label">Цена за час (₽)</label>
              {type === "company" ? (
                <>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
                    <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                      <input
                        type="radio"
                        name="priceOption"
                        checked={priceOption === "number"}
                        onChange={() => setPriceOption("number")}
                      />
                      <span>Указать цену</span>
                    </label>
                    <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                      <input
                        type="radio"
                        name="priceOption"
                        checked={priceOption === "unspecified"}
                        onChange={() => setPriceOption("unspecified")}
                      />
                      <span>Не указано</span>
                    </label>
                  </div>
                  {priceOption === "number" && (
                    <input
                      className="input"
                      value={pricePerHour}
                      onChange={(e) => setPricePerHour(e.target.value)}
                      inputMode="numeric"
                      placeholder="1000"
                    />
                  )}
                </>
              ) : (
                <>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
                    <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                      <input
                        type="radio"
                        name="priceOption"
                        checked={priceOption === "number"}
                        onChange={() => setPriceOption("number")}
                      />
                      <span>Указать цену</span>
                    </label>
                    <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                      <input
                        type="radio"
                        name="priceOption"
                        checked={priceOption === "negotiable"}
                        onChange={() => setPriceOption("negotiable")}
                      />
                      <span>Договорная</span>
                    </label>
                  </div>
                  {priceOption === "number" && (
                    <input
                      className="input"
                      value={pricePerHour}
                      onChange={(e) => setPricePerHour(e.target.value)}
                      inputMode="numeric"
                      placeholder="1000"
                    />
                  )}
                </>
              )}
            </div>
            <div className="field">
              <label className="label">О себе</label>
              <textarea
                className="textarea"
                value={about}
                onChange={(e) => setAbout(e.target.value)}
                placeholder="Опыт, образование, чем можете помочь"
                rows={4}
              />
            </div>
            <div className="field">
              <label className="label">Фото в анкете <span className="muted">(до 10)</span></label>
              <p className="muted" style={{ marginTop: 0, marginBottom: 8, fontSize: 13 }}>
                Эти фото отображаются в вашей анкете слайдером. При клике открываются в полном размере, при нескольких фото — можно листать.
              </p>
              <input
                ref={specialistFileInputRef}
                type="file"
                accept="image/*"
                multiple
                style={{ display: "none" }}
                onChange={async (e) => {
                  const files = e.target.files;
                  if (!files?.length || !token) {
                    e.target.value = "";
                    return;
                  }
                  const remaining = 10 - portfolioImageUrls.length;
                  if (remaining <= 0) {
                    e.target.value = "";
                    return;
                  }
                  setPortfolioUploading(true);
                  setErr(null);
                  try {
                    for (let i = 0; i < Math.min(files.length, remaining); i++) {
                      const file = files[i]!;
                      if (file.type && !file.type.startsWith("image/")) continue;
                      let toUpload: File;
                      try {
                        toUpload = await compressImage(file);
                      } catch {
                        if (!/^image\/(jpeg|png|gif|webp)$/i.test(file.type)) continue;
                        toUpload = file;
                      }
                      const { url } = await uploadFile("/upload", toUpload, token);
                      setPortfolioImageUrls((prev) => [...prev, url].slice(0, 10));
                    }
                  } catch (err: unknown) {
                    setErr(err instanceof Error ? err.message : "Не удалось загрузить фото");
                  } finally {
                    setPortfolioUploading(false);
                    e.target.value = "";
                  }
                }}
              />
              {portfolioImageUrls.length < 10 && (
                <button
                  type="button"
                  className="btn secondary"
                  disabled={portfolioUploading}
                  onClick={() => specialistFileInputRef.current?.click()}
                >
                  {portfolioUploading ? "Загрузка…" : "+ Добавить фото"}
                </button>
              )}
              {portfolioImageUrls.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
                  {portfolioImageUrls.map((url, i) => (
                    <div key={url} style={{ position: "relative" }}>
                      <img src={url} alt="" style={{ width: 72, height: 72, objectFit: "cover", borderRadius: 8, display: "block" }} />
                      <button
                        type="button"
                        onClick={() => setPortfolioImageUrls((prev) => prev.filter((_, j) => j !== i))}
                        aria-label="Удалить"
                        style={{ position: "absolute", top: 4, right: 4, width: 24, height: 24, borderRadius: "50%", border: "none", background: "rgba(0,0,0,0.6)", color: "#fff", fontSize: 14, cursor: "pointer" }}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
      <div className="profile-edit-actions">
        <button type="button" className="btn btn-primary" disabled={saving} onClick={() => void save()}>
          {saving ? "Сохранение…" : "Сохранить"}
        </button>
        <button
          type="button"
          className="btn profile-edit-cancel-btn"
          disabled={saving || cancelling}
          onClick={async () => {
            setErr(null);
            if (openedWithEditRef.current) {
              setCancelling(true);
              try {
                await authedDelete(`/profiles/${profileId}`);
                await refreshMe();
                if (me && me.profiles.length <= 1) {
                  navigate("/", { replace: true });
                } else {
                  navigate("/profile", { replace: true });
                }
              } catch (e: unknown) {
                setErr(e instanceof Error ? e.message : "Не удалось отменить");
              } finally {
                setCancelling(false);
              }
            } else {
              setIsEditing(false);
            }
          }}
        >
          {cancelling ? "Отмена…" : "Отмена"}
        </button>
      </div>
    </div>
    {reviewsBlock}
    {rolesBlock}
    <div className="card profile-docs-links">
      <div className="muted" style={{ marginBottom: 8, fontSize: 13 }}>Связаться с разработчиком</div>
      <ul style={{ margin: 0, paddingLeft: 20, display: "flex", flexDirection: "column", gap: 6 }}>
        <li><Link to="/profile/contact">Сообщить об ошибке</Link></li>
        <li><Link to="/profile/contact?category=order">Заказать свой проект</Link></li>
      </ul>
    </div>
    {isAdmin && (
      <div className="card profile-docs-links">
        <div className="muted" style={{ marginBottom: 8, fontSize: 13 }}>Метрики</div>
        <ul style={{ margin: 0, paddingLeft: 20, display: "flex", flexDirection: "column", gap: 6 }}>
          <li><Link to="/profile/analytics">Дашборд метрик</Link></li>
        </ul>
      </div>
    )}
    <div className="card profile-docs-links">
      <div className="muted" style={{ marginBottom: 8, fontSize: 13 }}>Принятые документы</div>
      <ul style={{ margin: 0, paddingLeft: 20, display: "flex", flexDirection: "column", gap: 6 }}>
        <li><Link to="/docs/agreement">Пользовательское соглашение</Link></li>
        <li><Link to="/docs/consent">Согласие на обработку персональных данных</Link></li>
      </ul>
    </div>
    <div className="card profile-docs-links">
      <div className="muted" style={{ marginBottom: 8, fontSize: 13 }}>Документы сервиса</div>
      <ul style={{ margin: 0, paddingLeft: 20, display: "flex", flexDirection: "column", gap: 6 }}>
        <li><Link to="/docs/policy">Политика обработки персональных данных</Link></li>
      </ul>
    </div>
    </div>
  );
}
