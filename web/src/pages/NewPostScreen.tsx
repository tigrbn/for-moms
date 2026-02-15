import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";

const MIN_LENGTH = 10;

export function NewPostScreen() {
  const { authedPost, setFeedReloadKey } = useApp();
  const navigate = useNavigate();
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    const text = content.trim();
    if (!text) {
      setErr("Напишите текст объявления");
      return;
    }
    if (text.length < MIN_LENGTH) {
      setErr(`Текст должен быть не короче ${MIN_LENGTH} символов`);
      return;
    }
    setSaving(true);
    try {
      const data = await authedPost<{ id?: string; ok?: boolean; error?: string }>("/posts", { content: text });
      if (data.ok === false && data.error) {
        setErr(data.error);
        return;
      }
      if (data.id) {
        setFeedReloadKey((k) => k + 1);
        navigate(`/posts/${data.id}`);
      }
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Не удалось опубликовать");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="card">
      <div className="h2">Добавить объявление</div>
      <p className="muted" style={{ marginTop: 6, marginBottom: 12, fontSize: 13 }}>
        Ваше объявление увидят и мамы, и специалисты в разделе «Другое».
      </p>
      <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div className="field">
          <div className="label">Текст <span className="muted">(не короче {MIN_LENGTH} символов)</span></div>
          <textarea
            className="input textarea"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Напишите объявление..."
            rows={5}
            style={{ resize: "vertical", minHeight: 100 }}
            minLength={MIN_LENGTH}
          />
        </div>
        {err && (
          <div className="error-message" role="alert">
            {err}
          </div>
        )}
        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? "Публикация…" : "Опубликовать"}
          </button>
          <Link className="btn secondary" to="/">
            Отмена
          </Link>
        </div>
      </form>
    </div>
  );
}
