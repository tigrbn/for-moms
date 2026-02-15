export function ErrorBox({ error }: { error: string }) {
  return (
    <div className="card error-box">
      <div className="h2">Ошибка</div>
      <pre className="error-box-message" style={{ whiteSpace: "pre-wrap", margin: "8px 0 0" }}>{error}</pre>
    </div>
  );
}
