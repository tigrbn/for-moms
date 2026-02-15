import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { CATEGORY_TREE } from "../constants/feed";

const DEFAULT_SECTION_ID = CATEGORY_TREE[0]?.id ?? "";

export function NewRequestScreen() {
  const { activeProfileType, authedPost, navigate } = useApp();
  const [categorySectionId, setCategorySectionId] = useState(DEFAULT_SECTION_ID);
  const [subcategoryId, setSubcategoryId] = useState("");
  const [district, setDistrict] = useState("");
  const [budget, setBudget] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const currentSection = CATEGORY_TREE.find((s) => s.id === categorySectionId);
  const subcategoryOptions = currentSection?.children ?? [];

  const onSubmit = async () => {
    setErr(null);
    if (!categorySectionId?.trim()) {
      setErr("Выберите категорию");
      return;
    }
    if (!subcategoryId?.trim()) {
      setErr("Выберите подкатегорию");
      return;
    }
    const desc = description.trim();
    if (!desc) {
      setErr("Заполните описание заявки");
      return;
    }
    if (desc.length < 10) {
      setErr("Описание должно быть не короче 10 символов");
      return;
    }
    setSaving(true);
    try {
      const created = await authedPost<{ id: string }>("/requests", {
        category: subcategoryId,
        district: district || null,
        budget: budget ? Number(budget) : null,
        description: desc || null,
      });
      navigate(`/requests/${created.id}`);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Не удалось создать заявку");
    } finally {
      setSaving(false);
    }
  };

  if (activeProfileType !== "parent") return <Navigate to="/requests" replace />;

  return (
    <div className="card">
      <div className="h2">Новая заявка</div>
      <p className="muted" style={{ marginTop: 6, marginBottom: 0, fontSize: 13 }}>
        Сервис «Для мам» — посредник между заказчиками и специалистами. Трудовые и гражданско‑правовые отношения возникают между пользователями; сервис не является работодателем и не участвует в оказании услуг.
      </p>
      {err && <div className="error-message" style={{ marginTop: 8 }} role="alert">{err}</div>}
      <div style={{ display: "grid", gap: 12, marginTop: 10 }}>
        <div className="field">
          <div className="label">Категория <span className="muted">(обязательно)</span></div>
          <select
            className="input"
            value={categorySectionId}
            onChange={(e) => {
              setCategorySectionId(e.target.value);
              setSubcategoryId("");
            }}
            required
          >
            {CATEGORY_TREE.map((section) => (
              <option key={section.id} value={section.id}>
                {section.label}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <div className="label">Подкатегория <span className="muted">(обязательно)</span></div>
          <select
            className="input"
            value={subcategoryId}
            onChange={(e) => setSubcategoryId(e.target.value)}
            required
            disabled={!currentSection || subcategoryOptions.length === 0}
          >
            <option value="">Выберите подкатегорию</option>
            {subcategoryOptions.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <div className="label">Район</div>
          <input className="input" value={district} onChange={(e) => setDistrict(e.target.value)} placeholder="Центральный" />
        </div>
        <div className="field">
          <div className="label">Бюджет (₽)</div>
          <input className="input" value={budget} onChange={(e) => setBudget(e.target.value)} inputMode="numeric" />
        </div>
        <div className="field">
          <div className="label">Описание <span className="muted">(не короче 10 символов)</span></div>
          <textarea className="textarea" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Опишите задачу, пожелания, возраст ребёнка и т.п." />
        </div>
        <div className="row">
          <button className="btn btn-primary" onClick={() => void onSubmit()} disabled={saving}>
            {saving ? "Создание…" : "Создать"}
          </button>
          <button className="btn secondary" onClick={() => navigate(-1)} disabled={saving}>
            Назад
          </button>
        </div>
      </div>
    </div>
  );
}
