import { useState } from "react";
import { Link } from "react-router-dom";
import { useApp } from "../context/AppContext";

const DOC_VERSION = "v1.0";

export function ConsentGateScreen() {
  const { authedPost, refreshMe } = useApp();
  const [agreeUserAgreement, setAgreeUserAgreement] = useState(false);
  const [agreePolicy, setAgreePolicy] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const canSubmit = agreeUserAgreement && agreePolicy;

  const handleSubmit = async () => {
    if (!canSubmit || submitting) return;
    setErr(null);
    setSubmitting(true);
    try {
      await authedPost("/me/consent", {
        userAgreement: true,
        policy: true,
        version: DOC_VERSION,
      });
      await refreshMe();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Не удалось сохранить согласие");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="card" style={{ maxWidth: 520, margin: "0 auto" }}>
      <h1 className="h1" style={{ margin: "0 0 8px" }}>
        Добро пожаловать в «Для мам»
      </h1>
      <p className="muted" style={{ marginBottom: 24 }}>
        Для продолжения необходимо принять условия использования сервиса и дать согласие на обработку персональных данных.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <label className="doc-consent-label" style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={agreeUserAgreement}
            onChange={(e) => setAgreeUserAgreement(e.target.checked)}
            style={{ marginTop: 4, flexShrink: 0 }}
            aria-describedby="link-user-agreement"
          />
          <span>
            Я принимаю{" "}
            <Link id="link-user-agreement" to="/docs/agreement" style={{ fontWeight: 600 }}>
              Пользовательское соглашение
            </Link>
          </span>
        </label>

        <label className="doc-consent-label" style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={agreePolicy}
            onChange={(e) => setAgreePolicy(e.target.checked)}
            style={{ marginTop: 4, flexShrink: 0 }}
            aria-describedby="link-policy"
          />
          <span>
            Я даю согласие на{" "}
            <Link id="link-policy" to="/docs/policy" style={{ fontWeight: 600 }}>
              обработку персональных данных
            </Link>
          </span>
        </label>
      </div>

      {err && (
        <div className="muted" role="alert" style={{ marginTop: 12, color: "var(--warning)" }}>
          {err}
        </div>
      )}

      <div style={{ marginTop: 24 }}>
        <button
          type="button"
          className="btn btn-primary"
          disabled={!canSubmit || submitting}
          onClick={() => void handleSubmit()}
        >
          {submitting ? "Сохранение…" : "Продолжить"}
        </button>
      </div>

      <p className="muted" style={{ marginTop: 16, fontSize: 13 }}>
        Текст согласия на обработку персональных данных можно прочитать в разделе{" "}
        <Link to="/docs/consent">«Согласие на обработку персональных данных»</Link>.
      </p>
    </div>
  );
}
