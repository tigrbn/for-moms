import { useState } from "react";
import { useApp } from "../context/AppContext";
import { formatPhoneMask, formatPhoneToDigits } from "../lib/format";
import { PARENT_ROLE_EMOJI } from "../lib/labels";
import { CATEGORY_TREE } from "../constants/feed";

type Props = { type: "parent" | "specialist" };

export function NewProfileScreen({ type }: Props) {
  const { me, authedPost, refreshMe, setMeError, navigate } = useApp();
  const [displayName, setDisplayName] = useState("");
  const [gender, setGender] = useState("");
  const [age, setAge] = useState("");
  const [city, setCity] = useState("");
  const [district, setDistrict] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [showContactPhonePublicly, setShowContactPhonePublicly] = useState(false);
  const [childrenAges, setChildrenAges] = useState("");
  const [specialWishes, setSpecialWishes] = useState("");
  const [pricePerHour, setPricePerHour] = useState("");
  const [about, setAbout] = useState("");
  const [specialistCategory, setSpecialistCategory] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

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
      const body: Record<string, unknown> = {
        type,
        displayName: displayName.trim() || null,
        gender: gender === "male" || gender === "female" ? gender : null,
        age: ageNum != null && Number.isFinite(ageNum) ? ageNum : null,
        city: city.trim() || null,
        district: district.trim() || null,
        contactPhone: formatPhoneToDigits(contactPhone).trim() || null,
        showContactPhonePublicly: type === "specialist" ? showContactPhonePublicly : undefined,
      };
      if (type === "parent") {
        const ages = childrenAges
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
          .map((s) => Number(s))
          .filter((n) => Number.isFinite(n));
        body.parent = {
          childrenAges: ages.length ? ages : null,
          specialWishes: specialWishes.trim() || null,
        };
      }
      if (type === "specialist") {
        const priceNum = pricePerHour.trim() === "" ? null : Number(pricePerHour);
        body.specialist = {
          skills: specialistCategory ? [specialistCategory] : [],
          pricePerHour: priceNum != null && Number.isFinite(priceNum) ? priceNum : null,
          about: about.trim() || null,
        };
      }
      await authedPost("/profiles/with-data", body);
      await refreshMe();
      navigate("/", { replace: true });
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Не удалось сохранить");
      setMeError(e instanceof Error ? e.message : null);
    } finally {
      setSaving(false);
    }
  };

  if (!me) return null;

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div className="card profile-edit-card">
        <div className="profile-edit-header">
          <h2 className="h2" style={{ margin: 0 }}>
            Заполните профиль
          </h2>
          <p className="muted" style={{ margin: "4px 0 0" }}>
            {type === "parent" ? `${PARENT_ROLE_EMOJI} Родитель` : "👩‍🏫 Специалист"}
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
            <input className="input" value={city} onChange={(e) => setCity(e.target.value)} placeholder="Москва" />
          </div>
          <div className="field">
            <label className="label">{type === "parent" ? "Район *" : "Район"}</label>
            <input className="input" value={district} onChange={(e) => setDistrict(e.target.value)} placeholder="Центральный" />
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
          </div>
          {type === "specialist" && (
            <div className="field">
              <label className="label profile-toggle-label">
                <span>Разрешить показывать номер в анкете и в откликах</span>
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
                <select className="input" value={specialistCategory} onChange={(e) => setSpecialistCategory(e.target.value)}>
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
            {saving ? "Сохранение…" : "Сохранить и продолжить"}
          </button>
        </div>
      </div>
    </div>
  );
}
