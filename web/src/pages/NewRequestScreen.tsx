import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { CATEGORY_TREE } from "../constants/feed";

const DEFAULT_CATEGORY = CATEGORY_TREE[0]?.children[0]?.id ?? "";

export function NewRequestScreen() {
  const { activeProfileType, authedPost, navigate } = useApp();
  const [category, setCategory] = useState(DEFAULT_CATEGORY);
  const [district, setDistrict] = useState("");
  const [budget, setBudget] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const onSubmit = async () => {
    setErr(null);
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
        category,
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
          <div className="label">Категория</div>
          <select
            className="input"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            {CATEGORY_TREE.map((section) => (
              <optgroup key={section.id} label={section.label}>
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
