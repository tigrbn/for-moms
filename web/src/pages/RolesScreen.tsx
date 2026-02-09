import { useApp } from "../context/AppContext";
import { getParentRoleLabel, PARENT_ROLE_EMOJI } from "../lib/labels";

export function RolesScreen() {
  const { me, ensureActiveProfile, refreshMe, navigate, missingRole, addMissingRole, authedDelete, setMeError } =
    useApp();

  if (!me) return <div className="card">Загрузка…</div>;

  const roles = me.profiles
    .filter((p) => p.type === "parent" || p.type === "specialist")
    .map((p) => ({
      ...p,
      title:
        p.type === "parent"
          ? `${PARENT_ROLE_EMOJI} ${getParentRoleLabel(p.gender)}`
          : "👩‍🏫 Специалист",
    }));

  return (
    <div className="card roles-page">
      <div className="row">
        <div className="h2">Роли</div>
        <div className="spacer" />
        {missingRole && (
          <button className="btn roles-page-btn" onClick={() => void addMissingRole()}>
            + {missingRole === "parent" ? `${PARENT_ROLE_EMOJI} Родитель` : "👩‍🏫 Специалист"}
          </button>
        )}
      </div>
      <div className="muted roles-page-desc">Выберите активную роль или удалите ненужную.</div>

      <div className="roles-list">
        {roles.map((p) => {
          const isActive = p.id === me.activeProfileId;
          return (
            <div key={p.id} className="roles-card-wrap">
              <div className="card card--status-top roles-card" style={{ background: "var(--tg-bg)" }}>
                <div className="roles-card-inner">
                  <div className="roles-card-left">
                    <div className="roles-card-title">{p.title}</div>
                    <div className="muted roles-card-desc">
                      {p.displayName ?? "—"} · {p.city ?? "—"} · {p.district ?? "—"}
                    </div>
                  </div>
                  <div className="roles-card-right">
                    {isActive ? (
                      <span className="pill pill--active-green">Активна</span>
                    ) : (
                      <button
                        type="button"
                        className="btn roles-page-btn"
                        onClick={() => void ensureActiveProfile(p.id)}
                      >
                        Сделать активной
                      </button>
                    )}
                  </div>
                </div>
              </div>
              <button
                type="button"
                className="btn danger roles-delete-btn roles-page-btn"
                onClick={async () => {
                  const roleName = p.type === "parent" ? getParentRoleLabel(p.gender) : "Специалист";
                  if (
                    !confirm(
                      `Удалить аккаунт «${roleName}»? Все данные этой роли будут удалены безвозвратно.`,
                    )
                  )
                    return;
                  try {
                    await authedDelete(`/profiles/${p.id}`);
                    await refreshMe();
                    if (me?.activeProfileId === p.id) navigate("/", { replace: true });
                  } catch (e: unknown) {
                    setMeError(e instanceof Error ? e.message : "Не удалось удалить");
                  }
                }}
              >
                Удалить аккаунт
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
