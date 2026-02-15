import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useApp } from "../context/AppContext";

type ContactCategory = "bug" | "order";

const CATEGORIES: { id: ContactCategory; label: string }[] = [
  { id: "bug", label: "Сообщить об ошибке" },
  { id: "order", label: "Заказать свой проект" },
];

export function ContactScreen() {
  const [searchParams] = useSearchParams();
  const { authedPost } = useApp();
  const [category, setCategory] = useState<ContactCategory>("bug");
  const [message, setMessage] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const q = searchParams.get("category");
    if (q === "order") setCategory("order");
  }, [searchParams]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    const text = message.trim();
    if (!text) {
      setErr("Напишите текст обращения");
      return;
    }
    setSending(true);
    try {
      await authedPost<{ ok: boolean }>("/contact", {
        category,
        message: text,
        ...(category === "order" && (contactEmail.trim() || contactPhone.trim())
          ? {
              contactEmail: contactEmail.trim() || undefined,
              contactPhone: contactPhone.trim() || undefined,
            }
          : {}),
      });
      setSent(true);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Не удалось отправить");
    } finally {
      setSending(false);
    }
  };

  if (sent) {
    return (
      <div className="card">
        <div className="h2">Отправлено</div>
        <p className="muted" style={{ marginTop: 8 }}>
          Спасибо, ваше обращение получено. Ответим при необходимости.
        </p>
        <Link className="btn btn-primary" to="/profile" style={{ marginTop: 12 }}>
          Вернуться в профиль
        </Link>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="h2">Связаться с разработчиком</div>
      <p className="muted" style={{ marginTop: 6, marginBottom: 12, fontSize: 13 }}>
        Сообщить об ошибке в приложении или заказать разработку своего проекта.
      </p>

      <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div className="field">
          <div className="label">Тип обращения</div>
          <select
            className="input"
            value={category}
            onChange={(e) => setCategory(e.target.value as ContactCategory)}
          >
            {CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <div className="label">Текст сообщения</div>
          <textarea
            className="input"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Опишите проблему или задачу..."
            rows={4}
            style={{ resize: "vertical", minHeight: 80 }}
          />
        </div>

        {category === "order" && (
          <>
            <div className="field">
              <div className="label muted">Email для связи (необязательно)</div>
              <input
                className="input"
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="example@mail.ru"
              />
            </div>
            <div className="field">
              <div className="label muted">Телефон для связи (необязательно)</div>
              <input
                className="input"
                type="tel"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="+7 (999) 123-45-67"
              />
            </div>
          </>
        )}

        {err && (
          <div className="error-message" role="alert">
            {err}
          </div>
        )}

        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
          <button type="submit" className="btn btn-primary" disabled={sending}>
            {sending ? "Отправка…" : "Отправить"}
          </button>
          <Link className="btn secondary" to="/profile">
            Отмена
          </Link>
        </div>
      </form>
    </div>
  );
}
