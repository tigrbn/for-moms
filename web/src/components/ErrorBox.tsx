export function ErrorBox({ error }: { error: string }) {
  return (
    <div className="card">
      <div className="h2">Ошибка</div>
      <pre style={{ whiteSpace: "pre-wrap", margin: "8px 0 0" }}>{error}</pre>
    </div>
  );
}
