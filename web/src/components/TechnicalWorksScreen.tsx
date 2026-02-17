import technicalWorksImg from "../assets/img/technical-works.png";

export function TechnicalWorksScreen() {
  return (
    <div
      className="card"
      style={{
        maxWidth: 400,
        margin: "24px auto",
        padding: 24,
        textAlign: "center",
      }}
    >
      <img
        src={technicalWorksImg}
        alt=""
        style={{
          width: "100%",
          height: "auto",
          display: "block",
          borderRadius: "var(--radius-sm)",
          marginBottom: 20,
        }}
      />
      <h2 className="h2" style={{ margin: "0 0 12px" }}>
        Ведутся технические работы
      </h2>
      <p className="muted" style={{ margin: 0, fontSize: 15, lineHeight: 1.5 }}>
        Мы добавляем новый функционал и делаем приложение лучше. Скоро всё заработает в обычном режиме.
      </p>
    </div>
  );
}
