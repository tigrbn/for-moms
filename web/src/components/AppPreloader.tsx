type Props = {
  logoUrl: string;
};

/** Полноэкранный прелоадер при старте (проверка авторизации, загрузка /me). */
export function AppPreloader({ logoUrl }: Props) {
  return (
    <div className="app-preloader" role="status" aria-label="Загрузка">
      <div className="app-preloader-inner">
        <img src={logoUrl} alt="Для мам" className="app-preloader-logo" />
        <div className="app-preloader-spinner" aria-hidden />
        <p className="app-preloader-text">Загрузка…</p>
      </div>
    </div>
  );
}
