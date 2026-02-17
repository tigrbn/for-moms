import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useApp } from "../context/AppContext";
import type { AnalyticsDashboardResponse } from "../types";

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
  const { authedGet, isAdmin } = useApp();
  const [data, setData] = useState<AnalyticsDashboardResponse | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setErr(null);
    authedGet<AnalyticsDashboardResponse>("/analytics/dashboard")
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch((e: unknown) => {
        if (!cancelled) setErr(e instanceof Error ? e.message : "Ошибка загрузки");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [authedGet]);

  if (!isAdmin) {
    return (
      <div className="card">
        <div className="h2">Метрики</div>
        <p className="muted">Доступ только для администратора.</p>
        <Link to="/profile">В профиль</Link>
      </div>
    );
  }

  if (loading) return <div className="card">Загрузка метрик…</div>;
  if (err) return <div className="card" role="alert">Ошибка: {err}</div>;
  if (!data) return null;

  const periodLabel = `${MONTH_NAMES[data.periodMonth - 1]} ${data.periodYear}`;

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
        <h1 className="h2" style={{ margin: 0 }}>Метрики</h1>
        <Link to="/profile" className="muted" style={{ fontSize: 14 }}>← В профиль</Link>
      </div>
      <p className="muted" style={{ margin: 0 }}>Период: {periodLabel}</p>

      <section>
        <h2 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Пользователи</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 10 }}>
          <MetricCard
            title="Всего пользователей"
            value={data.totalUsers}
            subtitle="зарегистрировано в сервисе"
          />
          <MetricCard
            title="Новых за месяц"
            value={data.newUsersThisMonth}
            subtitle={periodLabel}
          />
          <MetricCard
            title="С профилем «родитель»"
            value={data.usersWithParentProfile}
            subtitle={`активных анкет: ${data.activeParentProfilesCount}`}
          />
          <MetricCard
            title="С профилем «специалист»"
            value={data.usersWithSpecialistProfile}
            subtitle={`активных анкет: ${data.activeSpecialistProfilesCount}`}
          />
          <MetricCard
            title="Обе роли"
            value={data.usersWithBothRoles}
            subtitle="родитель и специалист"
          />
        </div>
      </section>

      <section>
        <h2 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Для мам</h2>
        <MetricCard
          title="Закрытые заявки за месяц"
          value={data.closedRequestsThisMonth}
          subtitle="заявка → специалист найден → статус «завершена»"
          highlight
        />
      </section>

      <section>
        <h2 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Ликвидность и отклики</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 10 }}>
          <MetricCard
            title="% заявок с откликами"
            value={`${data.liquidityRatePercent}%`}
            subtitle={data.liquidityRatePercent >= 80 ? "✓ можно расти" : data.liquidityRatePercent >= 60 ? "слабый рынок" : "< 50% — пусто"}
          />
          <MetricCard
            title="Заявок с ≥1 откликом"
            value={data.requestsWithOffersThisMonth}
            subtitle={`из ${data.requestsThisMonth} заявок`}
          />
          <MetricCard
            title="Ср. откликов на заявку"
            value={data.avgOffersPerRequest.toFixed(1)}
            subtitle={data.avgOffersPerRequest >= 3 ? "✓ ок для монетизации" : "1–2 — мало"}
          />
          <MetricCard
            title="Всего откликов"
            value={data.offersThisMonth}
            subtitle={periodLabel}
          />
        </div>
      </section>

      <section>
        <h2 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Время до первого отклика</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 10 }}>
          <MetricCard
            title="Среднее (часы)"
            value={data.avgTimeToFirstResponseHours != null ? data.avgTimeToFirstResponseHours.toFixed(1) : "—"}
            subtitle={data.avgTimeToFirstResponseHours != null && data.avgTimeToFirstResponseHours < 24 ? "< 24 ч — норма" : ""}
          />
          <MetricCard
            title="Медиана (часы)"
            value={data.medianTimeToFirstResponseHours != null ? data.medianTimeToFirstResponseHours.toFixed(1) : "—"}
          />
        </div>
      </section>

      <section>
        <h2 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Конверсии</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 10 }}>
          <MetricCard
            title="Conversion Parent → Order"
            value={data.conversionParentOrderPercent != null ? `${data.conversionParentOrderPercent}%` : "—"}
            subtitle={data.parentsWithVisitThisMonth > 0 ? `создали заявку: ${data.parentsWhoCreatedRequestThisMonth} из ${data.parentsWithVisitThisMonth} зашли` : "нет визитов"}
          />
          <MetricCard
            title="Conversion Specialist → Response"
            value={data.conversionSpecialistResponsePercent != null ? `${data.conversionSpecialistResponsePercent}%` : "—"}
            subtitle={data.requestViewsThisMonth > 0 ? `откликов: ${data.offersThisMonth}, просмотров: ${data.requestViewsThisMonth}` : "нет просмотров"}
          />
        </div>
      </section>

      <section>
        <h2 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Специалисты</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 10 }}>
          <MetricCard
            title="Активные (MAU)"
            value={data.activeSpecialistsMau}
            subtitle="≥1 отклик за 30 дней"
          />
          <MetricCard
            title="Повторные"
            value={data.repeatSpecialistsCount}
            subtitle="≥2 отклика всего"
          />
          <MetricCard
            title="Платящие"
            value={data.payingSpecialists}
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
  );
}
