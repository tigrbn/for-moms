import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { uploadFile } from "../shared/api";
import { compressImage } from "../lib/imageCompress";
import { formatPhoneMask, formatPhoneToDigits } from "../lib/format";
import { PARENT_ROLE_EMOJI } from "../lib/labels";
import { CATEGORY_TREE } from "../constants/feed";

const DOC_VERSION = "v1.0";

type Props = {
  type: "parent" | "specialist" | "company";
  /** При создании первого профиля (экран авторизации) — вернуться к выбору роли */
  backToRoleChoice?: () => void;
};

function validateParent(
  displayName: string,
  gender: string,
  age: string,
  city: string,
  district: string,
  childrenAges: string,
): { ok: boolean; message?: string } {
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
    return { ok: false, message: `Заполните обязательные поля: ${parts.join(", ")}` };
  }
  return { ok: true };
}

function validateSpecialist(
  displayName: string,
  city: string,
  district: string,
  specialistCategory: string,
  pricePerHour: string,
  priceOption: "number" | "negotiable",
  about: string,
): { ok: boolean; message?: string } {
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
    if (!nameOk) parts.push("имя для отображения");
    if (!cityOk) parts.push("город");
    if (!districtOk) parts.push("район");
    if (!categoryOk) parts.push("категорию");
    if (!priceOk) parts.push("цену за час или «Договорная»");
    if (!aboutOk) parts.push("«О себе»");
    return { ok: false, message: `Заполните обязательные поля: ${parts.join(", ")}` };
  }
  return { ok: true };
}

function validateCompany(
  companyName: string,
  city: string,
  district: string,
  specialistCategory: string,
  pricePerHour: string,
  priceOption: "number" | "unspecified",
  about: string,
): { ok: boolean; message?: string } {
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
    return { ok: false, message: `Заполните обязательные поля: ${parts.join(", ")}` };
  }
  return { ok: true };
}

export function NewProfileScreen({ type, backToRoleChoice }: Props) {
  const { me, token, authedPost, refreshMe, ensureActiveProfile, setMeError, navigate } = useApp();
  const [agreeUserAgreement, setAgreeUserAgreement] = useState(false);
  const [agreePolicy, setAgreePolicy] = useState(false);
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
  const [priceOption, setPriceOption] = useState<"number" | "negotiable" | "unspecified">("number");
  const [about, setAbout] = useState("");
  const [specialistCategory, setSpecialistCategory] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState("");
  const [inn, setInn] = useState("");
  const [legalAddress, setLegalAddress] = useState("");
  const [portfolioImageUrls, setPortfolioImageUrls] = useState<string[]>([]);
  const [portfolioUploading, setPortfolioUploading] = useState(false);
  const portfolioFileInputRef = useRef<HTMLInputElement>(null);

  const validation =
    type === "parent"
      ? validateParent(displayName, gender, age, city, district, childrenAges)
      : type === "company"
        ? validateCompany(companyName, city, district, specialistCategory, pricePerHour, priceOption as "number" | "unspecified", about)
        : validateSpecialist(displayName, city, district, specialistCategory, pricePerHour, priceOption as "number" | "negotiable", about);
  const canSave = agreeUserAgreement && agreePolicy && validation.ok;

  const save = async () => {
    setErr(null);
    if (!canSave || saving) return;
    if (!validation.ok) {
      setErr(validation.message ?? "Заполните все обязательные поля");
      return;
    }
    setSaving(true);
    try {
      await authedPost("/me/consent", {
        userAgreement: true,
        policy: true,
        version: DOC_VERSION,
      });
      const ageNum = age.trim() === "" ? null : Number(age);
      const body: Record<string, unknown> = {
        type,
        displayName: type === "company" ? (companyName.trim() || null) : (displayName.trim() || null),
        gender: type === "company" ? null : (gender === "male" || gender === "female" ? gender : null),
        age: type === "company" ? null : (ageNum != null && Number.isFinite(ageNum) ? ageNum : null),
        city: city.trim() || null,
        district: district.trim() || null,
        contactPhone: formatPhoneToDigits(contactPhone).trim() || null,
        showContactPhonePublicly: showContactPhonePublicly,
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
        body.specialist = {
          skills: specialistCategory ? [specialistCategory] : [],
          pricePerHour: priceValue,
          about: about.trim() || null,
          portfolioImageUrls: portfolioImageUrls.length > 0 ? portfolioImageUrls : [],
        };
      }
      if (type === "company") {
        body.company = {
          companyName: companyName.trim() || null,
          inn: inn.trim() || null,
          legalAddress: legalAddress.trim() || null,
        };
      }
      const created = await authedPost<{ id: string }>("/profiles/with-data", body);
      await ensureActiveProfile(created.id);
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
      {backToRoleChoice && (
        <button type="button" className="btn secondary" onClick={backToRoleChoice} style={{ alignSelf: "start" }}>
          ← Назад к выбору роли
        </button>
      )}
      <div className="card profile-edit-card">
        <div className="profile-edit-header">
          <h2 className="h2" style={{ margin: 0 }}>
            Заполните профиль
          </h2>
          <p className="muted" style={{ margin: "4px 0 0" }}>
            {type === "parent" ? `${PARENT_ROLE_EMOJI} Родитель` : type === "company" ? "🏢 Компания" : "👩‍🏫 Специалист"}
          </p>
        </div>
        {err && (
          <div className="profile-edit-err" role="alert">
            {err}
          </div>
        )}
        <div className="profile-consent-checkboxes" style={{ marginBottom: 20, padding: "12px 0", borderBottom: "1px solid var(--border-color)" }}>
          <p className="muted" style={{ marginBottom: 12, fontSize: 13 }}>Для создания профиля необходимо принять условия:</p>
          <label style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer", marginBottom: 10 }}>
            <input
              type="checkbox"
              checked={agreeUserAgreement}
              onChange={(e) => setAgreeUserAgreement(e.target.checked)}
              style={{ marginTop: 4, flexShrink: 0 }}
            />
            <span>
              Я принимаю <Link to="/docs/agreement" style={{ fontWeight: 600 }}>Пользовательское соглашение</Link>
            </span>
          </label>
          <label style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={agreePolicy}
              onChange={(e) => setAgreePolicy(e.target.checked)}
              style={{ marginTop: 4, flexShrink: 0 }}
            />
            <span>
              Я даю согласие на <Link to="/docs/policy" style={{ fontWeight: 600 }}>обработку персональных данных</Link>
            </span>
          </label>
        </div>
        <div className="profile-edit-fields">
          {type !== "company" && (
            <div className="field">
              <label className="label">{type === "parent" ? "Имя для отображения *" : "Имя для отображения *"}</label>
              <input
                className="input"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Как к вам обращаться"
              />
            </div>
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
          {type !== "company" && (
            <>
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
          <div className="field">
            <label className="label">Город *</label>
            <input className="input" value={city} onChange={(e) => setCity(e.target.value)} placeholder="Якутск" />
          </div>
          <div className="field">
            <label className="label">Район *</label>
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
                <label className="label">Категория <span className="muted">(обязательно)</span></label>
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
                <label className="label">Цена за час (₽) <span className="muted">(обязательно)</span></label>
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
                <label className="label">{type === "company" ? "О компании" : "О себе"} <span className="muted">(обязательно)</span></label>
                <textarea
                  className="textarea"
                  value={about}
                  onChange={(e) => setAbout(e.target.value)}
                  placeholder={type === "company" ? "Услуги, опыт, чем можете помочь" : "Опыт, образование, чем можете помочь"}
                  rows={4}
                />
                <p className="muted" style={{ marginTop: 4, fontSize: 13 }}>Без этих данных заказчик не сможет выбрать вас в анкете.</p>
              </div>
              <div className="field">
                <label className="label">Фото в анкете <span className="muted">(до 10, по желанию)</span></label>
                <p className="muted" style={{ marginTop: 0, marginBottom: 8, fontSize: 13 }}>
                  Эти фото отображаются в анкете слайдером. При клике открываются в полном размере.
                </p>
                <input
                  ref={portfolioFileInputRef}
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
                    onClick={() => portfolioFileInputRef.current?.click()}
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
          <button type="button" className="btn btn-primary" disabled={!canSave || saving} onClick={() => void save()}>
            {saving ? "Сохранение…" : "Сохранить и продолжить"}
          </button>
        </div>
        {(!agreeUserAgreement || !agreePolicy) && (
          <p className="muted" style={{ marginTop: 8, fontSize: 13 }}>Отметьте оба соглашения выше, чтобы активировать кнопку.</p>
        )}
      </div>
    </div>
  );
}
