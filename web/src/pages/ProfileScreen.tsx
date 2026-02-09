import { useEffect, useState } from "react";
import { useApp } from "../context/AppContext";
import { getAvatarSrc } from "../lib/avatar";
import { FEED_CATEGORIES } from "../constants/feed";

export function ProfileScreen() {
  const { activeProfile, me, authedPatch, refreshMe } = useApp();
  if (!activeProfile) return null;

  const profileId = activeProfile.id;
  const type = activeProfile.type;
  const telegramPhotoUrl = me?.user?.photoUrl ?? null;
  const profileAvatarSrc = getAvatarSrc(activeProfile.avatarUrl, telegramPhotoUrl, activeProfile.gender);

  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState(activeProfile.displayName ?? "");
  const [gender, setGender] = useState<string>(
    activeProfile.gender === "male" || activeProfile.gender === "female" ? activeProfile.gender : "",
  );
  const [age, setAge] = useState(activeProfile.age != null ? String(activeProfile.age) : "");
  const [city, setCity] = useState(activeProfile.city ?? "");
  const [district, setDistrict] = useState(activeProfile.district ?? "");
  const [childrenAges, setChildrenAges] = useState("");
  const [specialWishes, setSpecialWishes] = useState("");
  const [pricePerHour, setPricePerHour] = useState("");
  const [about, setAbout] = useState("");
  const [specialistCategory, setSpecialistCategory] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    setDisplayName(activeProfile.displayName ?? "");
    setGender(activeProfile.gender === "male" || activeProfile.gender === "female" ? activeProfile.gender : "");
    setAge(activeProfile.age != null ? String(activeProfile.age) : "");
    setCity(activeProfile.city ?? "");
    setDistrict(activeProfile.district ?? "");
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

  const save = async () => {
    setErr(null);
    setSaving(true);
    try {
      const ageNum = age.trim() === "" ? null : Number(age);
      await authedPatch(`/profiles/${profileId}`, {
        displayName: displayName.trim() || null,
        gender: gender === "male" || gender === "female" ? gender : null,
        age: ageNum != null && Number.isFinite(ageNum) ? ageNum : null,
        city: city.trim() || null,
        district: district.trim() || null,
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
          specialWishes: specialWishes || null,
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

  if (!isEditing) {
    return (
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
              {type === "parent" ? "👩‍🍼 Родитель" : "👩‍🏫 Специалист"}
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
            </>
          )}
        </dl>
        <div className="profile-view-actions">
          <button type="button" className="btn btn-primary" onClick={() => setIsEditing(true)}>
            Редактировать
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="card profile-edit-card">
      <div className="profile-edit-header">
        <h2 className="h2" style={{ margin: 0 }}>
          Редактирование профиля
        </h2>
        <p className="muted" style={{ margin: "4px 0 0" }}>
          {type === "parent" ? "👩‍🍼 Родитель" : "👩‍🏫 Специалист"}
        </p>
      </div>
      {err && (
        <div className="profile-edit-err muted" role="alert">
          {err}
        </div>
      )}
      <div className="profile-edit-fields">
        <div className="field">
          <label className="label">Имя для отображения</label>
          <input
            className="input"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Как к вам обращаться"
          />
        </div>
        <div className="field">
          <label className="label">Пол</label>
          <select className="input" value={gender} onChange={(e) => setGender(e.target.value)}>
            <option value="">Не указан</option>
            <option value="female">Женский</option>
            <option value="male">Мужской</option>
          </select>
        </div>
        <div className="field">
          <label className="label">Возраст</label>
          <input
            className="input"
            value={age}
            onChange={(e) => setAge(e.target.value)}
            inputMode="numeric"
            placeholder="25"
          />
        </div>
        <div className="field">
          <label className="label">Город</label>
          <input
            className="input"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="Москва"
          />
        </div>
        <div className="field">
          <label className="label">Район</label>
          <input
            className="input"
            value={district}
            onChange={(e) => setDistrict(e.target.value)}
            placeholder="Центральный"
          />
        </div>
        {type === "parent" && (
          <>
            <div className="field">
              <label className="label">Возраст детей (через запятую)</label>
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
                {FEED_CATEGORIES.filter((c) => c.id).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
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
      <div className="profile-edit-actions row" style={{ flexWrap: "wrap", gap: 8 }}>
        <button type="button" className="btn btn-primary" disabled={saving} onClick={() => void save()}>
          {saving ? "Сохранение…" : "Сохранить"}
        </button>
        <button
          type="button"
          className="btn secondary"
          disabled={saving}
          onClick={() => {
            setErr(null);
            setIsEditing(false);
          }}
        >
          Отмена
        </button>
      </div>
    </div>
  );
}
