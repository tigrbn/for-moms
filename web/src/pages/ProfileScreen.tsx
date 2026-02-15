import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { getAvatarSrc } from "../lib/avatar";
import { formatPhoneMask, formatPhoneToDigits, formatDate } from "../lib/format";
import { getParentRoleLabel, PARENT_ROLE_EMOJI } from "../lib/labels";
import { CATEGORY_TREE, getCategoryIcon } from "../constants/feed";
import { PaginationBar } from "../components/PaginationBar";
import type { ReviewListItem } from "../types";

const REVIEWS_PER_PAGE = 3;

export function ProfileScreen() {
  const location = useLocation();
  const navigate = useNavigate();
  const {
    activeProfile,
    me,
    authedPatch,
    authedDelete,
    authedGet,
    refreshMe,
    ensureActiveProfile,
    missingRole,
    addMissingRole,
    setMeError,
  } = useApp();

  const [reviews, setReviews] = useState<ReviewListItem[] | null>(null);
  const [reviewsErr, setReviewsErr] = useState<string | null>(null);
  const [reviewsPage, setReviewsPage] = useState(1);

  if (!me) return <div className="card">Загрузка…</div>;
  if (me.profiles.length === 0) return null;

  const profileId = activeProfile?.id;
  const type = activeProfile?.type;
  const telegramPhotoUrl = me?.user?.photoUrl ?? null;
  const profileAvatarSrc = getAvatarSrc(activeProfile?.avatarUrl ?? null, telegramPhotoUrl, activeProfile?.gender ?? null);

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
  const [about, setAbout] = useState("");
  const [specialistCategory, setSpecialistCategory] = useState("");
  const [saving, setSaving] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!activeProfile) return;
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
    if (activeProfile.type === "specialist") {
      const spec = activeProfile.specialist;
      if (spec) {
        setPricePerHour(spec.pricePerHour != null ? String(spec.pricePerHour) : "");
        setAbout(spec.about ?? "");
        const first =
          Array.isArray(spec.skills) && spec.skills.length > 0
            ? spec.skills[0]
            : typeof spec.skills === "string"
              ? spec.skills
              : "";
        setSpecialistCategory(first || "");
      } else {
        setPricePerHour("");
        setAbout("");
        setSpecialistCategory("");
      }
    }
  }, [activeProfile]);

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
    setSaving(true);
    try {
      const ageNum = age.trim() === "" ? null : Number(age);
      await authedPatch(`/profiles/${profileId}`, {
        displayName: displayName.trim() || null,
        gender: gender === "male" || gender === "female" ? gender : null,
        age: ageNum != null && Number.isFinite(ageNum) ? ageNum : null,
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
      if (type === "specialist") {
        const priceNum = pricePerHour.trim() === "" ? null : Number(pricePerHour);
        await authedPatch(`/profiles/${profileId}/specialist`, {
          skills: specialistCategory ? [specialistCategory] : [],
          pricePerHour: priceNum != null && Number.isFinite(priceNum) ? priceNum : null,
          about: about.trim() || null,
        });
      }
      await refreshMe();
      setIsEditing(false);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Не удалось сохранить");
    } finally {
      setSaving(false);
    }
  };

  const roles = me.profiles
    .filter((p) => p.type === "parent" || p.type === "specialist")
    .map((p) => ({
      ...p,
      title:
        p.type === "parent"
          ? `${PARENT_ROLE_EMOJI} ${getParentRoleLabel(p.gender)}`
          : "👩‍🏫 Специалист",
    }));

  const renderReviewCard = (r: ReviewListItem) => {
    const fromProfile = r.fromProfile;
    const namePart =
      fromProfile?.displayName?.trim() ||
      [fromProfile?.firstName, fromProfile?.lastName].filter(Boolean).join(" ") ||
      "";
    const authorName = !fromProfile || !namePart ? "Удалённый аккаунт" : namePart;
    const authorAvatar =
      fromProfile && namePart
        ? getAvatarSrc(
            fromProfile.avatarUrl ?? null,
            fromProfile.photoUrl ?? null,
            fromProfile.gender ?? null,
          )
        : null;
    const categoryIcon = r.requestCategory ? getCategoryIcon(r.requestCategory) : null;
    return (
      <div key={r.id} className="card review-card" style={{ background: "var(--tg-bg)" }}>
        <div className="row" style={{ alignItems: "center", gap: 12 }}>
          {authorAvatar ? (
            <img
              src={authorAvatar}
              alt=""
              style={{ width: 40, height: 40, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
            />
          ) : (
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: "50%",
                background: "var(--border-color)",
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
                {r.requestCategory}
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
        {missingRole && (
          <button className="btn btn-primary roles-page-btn" onClick={() => void addMissingRole()}>
            + {missingRole === "parent" ? `${PARENT_ROLE_EMOJI} Родитель` : "👩‍🏫 Специалист"}
          </button>
        )}
      </div>
      <div className="muted roles-page-desc">Выберите активный профиль или удалите ненужный.</div>
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
                onClick={async () => {
                  const roleName = p.type === "parent" ? getParentRoleLabel(p.gender) : "Специалист";
                  if (
                    !confirm(
                      `Удалить аккаунт «${roleName}»? Все данные этого профиля будут удалены безвозвратно.`,
                    )
                  )
                    return;
                  try {
                    await authedDelete(`/profiles/${p.id}`);
                    await refreshMe();
                    if (me?.activeProfileId === p.id) navigate("/profile", { replace: true });
                  } catch (e: unknown) {
                    setMeError(e instanceof Error ? e.message : "Не удалось удалить");
                  }
                }}
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
        <div className="profile-view-header">
          <div
            className="profile-view-avatar"
            style={{
              width: 72,
              height: 72,
              borderRadius: "50%",
              overflow: "hidden",
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "var(--tg-theme-secondary-bg-color, #eee)",
            }}
          >
            <img src={profileAvatarSrc} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </div>
          <div className="profile-view-title-wrap" style={{ flex: 1, minWidth: 0 }}>
            <h2 className="h2" style={{ margin: 0 }}>
              {activeProfile.displayName || "—"}
            </h2>
            <p className="muted" style={{ margin: "4px 0 0" }}>
              {type === "parent" ? `${PARENT_ROLE_EMOJI} ${getParentRoleLabel(activeProfile.gender)}` : "👩‍🏫 Специалист"}
            </p>
          </div>
        </div>
        <dl className="profile-view-dl">
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
          {type === "specialist" && (
            <>
              <div className="profile-view-row">
                <dt className="muted">Категория</dt>
                <dd>
                  {(activeProfile.specialist?.skills ?? []).length > 0
                    ? (activeProfile.specialist?.skills ?? [])[0]
                    : "—"}
                </dd>
              </div>
              <div className="profile-view-row">
                <dt className="muted">Цена за час</dt>
                <dd>
                  {activeProfile.specialist?.pricePerHour != null
                    ? `${activeProfile.specialist.pricePerHour} ₽`
                    : "—"}
                </dd>
              </div>
              <div className="profile-view-row">
                <dt className="muted">О себе</dt>
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
        <div className="profile-view-actions">
          <button type="button" className="btn btn-primary" onClick={() => setIsEditing(true)}>
            Редактировать
          </button>
        </div>
        {type === "specialist" && profileId && (
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
      </div>
      {reviewsBlock}
      {rolesBlock}
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
          {type === "parent" ? `${PARENT_ROLE_EMOJI} ${getParentRoleLabel(activeProfile.gender)}` : "👩‍🏫 Специалист"}
        </p>
      </div>
      {err && (
        <div className="profile-edit-err muted" role="alert">
          {err}
        </div>
      )}
      <div className="profile-edit-fields">
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
          <label className="label">Номер телефона для связи</label>
          <input
            className="input"
            value={contactPhone}
            onChange={(e) => setContactPhone(formatPhoneMask(e.target.value))}
            placeholder="+7 9__ ___ __ __"
            inputMode="tel"
          />
          <p className="muted" style={{ marginTop: 4, fontSize: 13 }}>
            {type === "specialist"
              ? "Если разрешите показ ниже — номер будет виден в анкете и в карточках откликов. Иначе родитель увидит его только после принятия вашего отклика."
              : "По этому номеру смогут связаться специалисты после того, как вы примете их отклик."}
          </p>
        </div>
        {(type === "specialist" || type === "parent") && (
          <div className="field">
            <label className="label profile-toggle-label">
              <span>
                {type === "specialist"
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
        {type === "specialist" && profileId && (
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
        {type === "specialist" && (
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
              <input
                className="input"
                value={pricePerHour}
                onChange={(e) => setPricePerHour(e.target.value)}
                inputMode="numeric"
                placeholder="1000"
              />
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
