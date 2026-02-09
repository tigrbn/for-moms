import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { FEED_CATEGORIES } from "../constants/feed";

const REQUEST_CATEGORIES = FEED_CATEGORIES.filter((c) => c.id && c.id.trim());

export function NewRequestScreen() {
  const { activeProfileType, authedPost, navigate } = useApp();
  const [category, setCategory] = useState(REQUEST_CATEGORIES[0]?.id ?? "");
  const [district, setDistrict] = useState("");
  const [budget, setBudget] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const onSubmit = async () => {
    setErr(null);
    setSaving(true);
    try {
      const created = await authedPost<{ id: string }>("/requests", {
        category,
        district: district || null,
        budget: budget ? Number(budget) : null,
        description: description || null,
      });
      navigate(`/requests/${created.id}`);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Failed to create request");
    } finally {
      setSaving(false);
    }
  };

  if (activeProfileType !== "parent") return <Navigate to="/requests" replace />;

  return (
    <div className="card">
      <div className="h2">Новая заявка</div>
      {err && <div className="muted" style={{ marginTop: 8 }}>{err}</div>}
      <div style={{ display: "grid", gap: 12, marginTop: 10 }}>
        <div className="field">
          <div className="label">Категория</div>
          <select
            className="input"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            {REQUEST_CATEGORIES.map((c) => (
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
          <div className="label">Описание</div>
          <textarea className="textarea" value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div className="row">
          <button className="btn" onClick={() => void onSubmit()} disabled={saving}>
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
