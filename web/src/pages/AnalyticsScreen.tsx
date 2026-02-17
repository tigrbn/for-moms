import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { formatMoney } from "../lib/format";
import type { AnalyticsDashboardResponse, SpecialistAnalyticsResponse } from "../types";

const MONTH_NAMES = [
  "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
  "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь",
];

function MetricCard({
  title,
  value,
  subtitle,
  highlight,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  highlight?: boolean;
}) {
  return (
    <div className={`card ${highlight ? "analytics-card--north" : ""}`} style={{ padding: 14 }}>
      <div className="muted" style={{ fontSize: 12, marginBottom: 4 }}>{title}</div>
      <div style={{ fontSize: 22, fontWeight: 700 }}>{value}</div>
      {subtitle != null && subtitle !== "" && (
        <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>{subtitle}</div>
      )}
    </div>
  );
}

export function AnalyticsScreen() {
  const { authedGet, isAdmin, activeProfileType } = useApp();
  const [specialistData, setSpecialistData] = useState<SpecialistAnalyticsResponse | null>(null);
  const [adminData, setAdminData] = useState<AnalyticsDashboardResponse | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const isProvider = activeProfileType === "specialist" || activeProfileType === "company";

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setErr(null);
    setSpecialistData(null);
    setAdminData(null);
    const promises: Promise<unknown>[] = [];
    if (isProvider) {
      promises.push(
        authedGet<SpecialistAnalyticsResponse>("/analytics/specialist")
          .then((res) => { if (!cancelled) setSpecialistData(res); })
          .catch((e: unknown) => { if (!cancelled) setErr(e instanceof Error ? e.message : "Ошибка загрузки"); })
      );
    }
    if (isAdmin) {
      promises.push(
        authedGet<AnalyticsDashboardResponse>("/analytics/dashboard")
          .then((res) => { if (!cancelled) setAdminData(res); })
          .catch((e: unknown) => { if (!cancelled) setErr(e instanceof Error ? e.message : "Ошибка загрузки"); })
      );
    }
    if (promises.length === 0) {
      setLoading(false);
    } else {
      Promise.all(promises).finally(() => { if (!cancelled) setLoading(false); });
    }
    return () => { cancelled = true; };
  }, [authedGet, isProvider, isAdmin]);

  if (!isProvider && !isAdmin) {
    return (
      <div className="card">
        <div className="h2">Аналитика</div>
        <p className="muted">Доступна для специалистов, компаний и администратора.</p>
        <Link to="/profile">В профиль</Link>
      </div>
    );
  }

  if (loading) return <div className="card">Загрузка…</div>;
  if (err) return <div className="card" role="alert">Ошибка: {err}</div>;
  if (!specialistData && !adminData) return null;

  return (
    <div style={{ display: "grid", gap: 20 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
        <h1 className="h2" style={{ margin: 0 }}>Аналитика</h1>
        <Link to="/profile" className="muted" style={{ fontSize: 14 }}>← В профиль</Link>
      </div>

      {isProvider && specialistData && (
        <div className="card" style={{ padding: 16, background: "var(--secondary-bg, #f4efff)", borderLeft: "4px solid var(--primary, #7b7cff)" }}>
          <h2 className="h2" style={{ margin: "0 0 4px", fontSize: 18 }}>Ваша аналитика</h2>
          <p className="muted" style={{ margin: 0, fontSize: 13 }}>Как идёт работа в системе: анкета, отклики, заказы</p>
          <div style={{ marginTop: 16, display: "grid", gap: 16 }}>
          <section>
            <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Анкета и отклики</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 10 }}>
              <MetricCard
                title="Уникальных переходов на анкету"
                value={specialistData.uniqueProfileViews}
                subtitle="пользователей открыли вашу анкету"
              />
              <MetricCard
                title="Принятых откликов"
                value={specialistData.acceptedOffersCount}
                subtitle="ваш отклик принят заказчиком"
              />
            </div>
          </section>
          <section>
            <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Заказы и заработок</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 10 }}>
              <MetricCard
                title="Сделанных заказов"
                value={specialistData.completedOrdersCount}
                subtitle="заявок со статусом «завершена»"
                highlight
              />
              <MetricCard
                title="Сумма заработка"
                value={formatMoney(specialistData.totalEarnings)}
                subtitle="по принятым откликам"
              />
              <MetricCard
                title="Всего заказов"
                value={specialistData.ordersCount}
              />
            </div>
          </section>
          {specialistData.uncontactableRequestsCount > 0 && (
            <div className="card" style={{ padding: 12, background: "var(--bg-muted, #f5f5f5)", borderColor: "var(--warning, #b8860b)" }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>О заказчиках, с которыми нельзя связаться</div>
              <p className="muted" style={{ margin: 0, fontSize: 13 }}>
                По {specialistData.uncontactableRequestsCount} заявке (заявкам) вы откликнулись, но у заказчика нет ника в Telegram и не включена опция «показывать номер специалистам в заявке». С такими пользователями связаться через сервис нельзя — рекомендуйте им указать контакт в настройках профиля.
              </p>
            </div>
          )}
          </div>
        </div>
      )}

      {isAdmin && adminData && (
        <div className="card" style={{ padding: 16, background: "var(--tg-bg-color, #fff)", borderLeft: "4px solid #6b7280" }}>
          <h2 className="h2" style={{ margin: "0 0 4px", fontSize: 18 }}>Дашборд метрик</h2>
          <p className="muted" style={{ margin: 0, fontSize: 13 }}>Общая аналитика по сервису для администратора. Период: {MONTH_NAMES[adminData.periodMonth - 1]} {adminData.periodYear}</p>
          <div style={{ marginTop: 16, display: "grid", gap: 16 }}>
          <section>
            <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Пользователи</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 10 }}>
              <MetricCard
                title="Открывали бот (за месяц)"
                value={adminData.uniqueUsersOpenedBotThisMonth}
                subtitle={`уникальных пользователей, ${MONTH_NAMES[adminData.periodMonth - 1]} ${adminData.periodYear}`}
              />
              <MetricCard
                title="Открывали бот (всего)"
                value={adminData.uniqueUsersOpenedBotAllTime}
                subtitle="уникальных пользователей за всё время"
              />
              <MetricCard
                title="Всего пользователей"
                value={adminData.totalUsers}
                subtitle="зарегистрировано в сервисе"
              />
              <MetricCard
                title="Новых за месяц"
                value={adminData.newUsersThisMonth}
                subtitle={`${MONTH_NAMES[adminData.periodMonth - 1]} ${adminData.periodYear}`}
              />
              <MetricCard
                title="С профилем «родитель»"
                value={adminData.usersWithParentProfile}
                subtitle={`активных анкет: ${adminData.activeParentProfilesCount}`}
              />
              <MetricCard
                title="С профилем «специалист»"
                value={adminData.usersWithSpecialistProfile}
                subtitle={`активных анкет: ${adminData.activeSpecialistProfilesCount}`}
              />
              <MetricCard
                title="С профилем «компания»"
                value={adminData.usersWithCompanyProfile}
                subtitle={`активных анкет: ${adminData.activeCompanyProfilesCount}`}
              />
              <MetricCard
                title="Обе роли"
                value={adminData.usersWithBothRoles}
                subtitle="родитель и специалист"
              />
            </div>
          </section>

          <section>
            <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Для мам</h3>
            <MetricCard
              title="Закрытые заявки за месяц"
              value={adminData.closedRequestsThisMonth}
              subtitle="заявка → специалист найден → статус «завершена»"
              highlight
            />
          </section>

          <section>
            <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Ликвидность и отклики</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 10 }}>
              <MetricCard
                title="% заявок с откликами"
                value={`${adminData.liquidityRatePercent}%`}
                subtitle={adminData.liquidityRatePercent >= 80 ? "✓ можно расти" : adminData.liquidityRatePercent >= 60 ? "слабый рынок" : "< 50% — пусто"}
              />
              <MetricCard
                title="Заявок с ≥1 откликом"
                value={adminData.requestsWithOffersThisMonth}
                subtitle={`из ${adminData.requestsThisMonth} заявок`}
              />
              <MetricCard
                title="Ср. откликов на заявку"
                value={adminData.avgOffersPerRequest.toFixed(1)}
                subtitle={adminData.avgOffersPerRequest >= 3 ? "✓ ок для монетизации" : "1–2 — мало"}
              />
              <MetricCard
                title="Всего откликов"
                value={adminData.offersThisMonth}
                subtitle={`${MONTH_NAMES[adminData.periodMonth - 1]} ${adminData.periodYear}`}
              />
            </div>
          </section>

          <section>
            <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Время до первого отклика</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 10 }}>
              <MetricCard
                title="Среднее (часы)"
                value={adminData.avgTimeToFirstResponseHours != null ? adminData.avgTimeToFirstResponseHours.toFixed(1) : "—"}
                subtitle={adminData.avgTimeToFirstResponseHours != null && adminData.avgTimeToFirstResponseHours < 24 ? "< 24 ч — норма" : ""}
              />
              <MetricCard
                title="Медиана (часы)"
                value={adminData.medianTimeToFirstResponseHours != null ? adminData.medianTimeToFirstResponseHours.toFixed(1) : "—"}
              />
            </div>
          </section>

          <section>
            <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Конверсии</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 10 }}>
              <MetricCard
                title="Conversion Parent → Order"
                value={adminData.conversionParentOrderPercent != null ? `${adminData.conversionParentOrderPercent}%` : "—"}
                subtitle={adminData.parentsWithVisitThisMonth > 0 ? `создали заявку: ${adminData.parentsWhoCreatedRequestThisMonth} из ${adminData.parentsWithVisitThisMonth} зашли` : "нет визитов"}
              />
              <MetricCard
                title="Conversion Specialist → Response"
                value={adminData.conversionSpecialistResponsePercent != null ? `${adminData.conversionSpecialistResponsePercent}%` : "—"}
                subtitle={adminData.requestViewsThisMonth > 0 ? `откликов: ${adminData.offersThisMonth}, просмотров: ${adminData.requestViewsThisMonth}` : "нет просмотров"}
              />
            </div>
          </section>

          <section>
            <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Специалисты</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 10 }}>
              <MetricCard
                title="Активные (MAU)"
                value={adminData.activeSpecialistsMau}
                subtitle="≥1 отклик за 30 дней"
              />
              <MetricCard
                title="Повторные"
                value={adminData.repeatSpecialistsCount}
                subtitle="≥2 отклика всего"
              />
              <MetricCard
                title="Платящие"
                value={adminData.payingSpecialists}
                subtitle="после включения монетизации"
              />
            </div>
          </section>

          <div className="card" style={{ padding: 12, background: "var(--bg-muted, #f5f5f5)" }}>
            <div style={{ fontSize: 13 }}>
              <strong>Когда включать монетизацию:</strong> ≥80% заявок с откликами, ≥3 отклика на заявку, ≥30 активных специалистов.
            </div>
          </div>
          </div>
        </div>
      )}
    </div>
  );
}
