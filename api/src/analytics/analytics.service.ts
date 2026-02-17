import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

/** Границы периода: начало и конец месяца (UTC). */
function getMonthBounds(year: number, month: number): { from: Date; to: Date } {
  const from = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
  const to = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));
  return { from, to };
}

/** Последние N дней от текущего момента. */
function getLastDaysBounds(days: number): { from: Date; to: Date } {
  const to = new Date();
  const from = new Date(to.getTime() - days * 24 * 60 * 60 * 1000);
  return { from, to };
}

export type DashboardMetrics = {
  /** Северная звезда: закрытые заявки (status=done) за месяц */
  closedRequestsThisMonth: number;
  /** Все заявки за текущий месяц (созданные) */
  requestsThisMonth: number;
  /** Заявки с ≥1 откликом за текущий месяц */
  requestsWithOffersThisMonth: number;
  /** % заявок с откликами (Liquidity Rate), 0–100 */
  liquidityRatePercent: number;
  /** Среднее время до первого отклика (часы) */
  avgTimeToFirstResponseHours: number | null;
  /** Медиана времени до первого отклика (часы) — опционально */
  medianTimeToFirstResponseHours: number | null;
  /** Среднее число откликов на заявку (по заявкам, у которых есть отклики) */
  avgOffersPerRequest: number;
  /** Всего откликов за месяц */
  offersThisMonth: number;
  /** Активные специалисты (MAU): хотя бы один отклик за последние 30 дней */
  activeSpecialistsMau: number;
  /** Специалисты с ≥2 откликами (повторные) */
  repeatSpecialistsCount: number;
  /** Платящие специалисты (пока нет монетизации) */
  payingSpecialists: number;
  /** Conversion Parent → Order: создали заявку / зашли в сервис, % */
  conversionParentOrderPercent: number | null;
  /** Conversion Specialist → Response: откликнулись / посмотрели заявку, % */
  conversionSpecialistResponsePercent: number | null;
  /** Родителей с визитом в периоде (знаменатель для conversionParentOrder) */
  parentsWithVisitThisMonth: number;
  /** Родителей, создавших заявку в периоде (числитель) */
  parentsWhoCreatedRequestThisMonth: number;
  /** Просмотров заявок специалистами в периоде (знаменатель для conversionSpecialistResponse) */
  requestViewsThisMonth: number;
  /** Пользователи: всего зарегистрировано (без удалённых) */
  totalUsers: number;
  /** Новых пользователей за месяц */
  newUsersThisMonth: number;
  /** Пользователей с профилем «родитель» (хотя бы один) */
  usersWithParentProfile: number;
  /** Пользователей с профилем «специалист» (хотя бы один) */
  usersWithSpecialistProfile: number;
  /** Пользователей с обоими ролями (родитель и специалист) */
  usersWithBothRoles: number;
  /** Активных профилей: родитель (is_active) */
  activeParentProfilesCount: number;
  /** Активных профилей: специалист (is_active) */
  activeSpecialistProfilesCount: number;
  /** Уникальных пользователей, открывших бот за период (по записям app_opens) */
  uniqueUsersOpenedBotThisMonth: number;
  /** Уникальных пользователей, когда-либо открывших бот (всего по app_opens) */
  uniqueUsersOpenedBotAllTime: number;
  /** Текущий месяц/год для подписи */
  periodYear: number;
  periodMonth: number;
};

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboard(year?: number, month?: number): Promise<DashboardMetrics> {
    const now = new Date();
    const y = year ?? now.getUTCFullYear();
    const m = month ?? now.getUTCMonth() + 1;
    const { from: periodFrom, to: periodTo } = getMonthBounds(y, m);
    const { from: last30From } = getLastDaysBounds(30);

    const [
      closedThisMonth,
      totalRequestsThisMonth,
      requestsWithOffersCount,
      offersCountThisMonth,
      offersOnRequestsInPeriod,
      timeToFirstResponseRows,
      activeSpecialistsMau,
      repeatSpecialistsCount,
      parentsWithVisitThisMonth,
      parentsWhoCreatedRequestThisMonth,
      requestViewsThisMonth,
      totalUsers,
      newUsersThisMonth,
      usersWithParentProfile,
      usersWithSpecialistProfile,
      usersWithBothRoles,
      activeParentProfilesCount,
      activeSpecialistProfilesCount,
      uniqueUsersOpenedBotThisMonth,
      uniqueUsersOpenedBotAllTime,
    ] = await Promise.all([
      this.closedRequestsInPeriod(periodFrom, periodTo),
      this.totalRequestsInPeriod(periodFrom, periodTo),
      this.requestsWithOffersInPeriod(periodFrom, periodTo),
      this.offersCountInPeriod(periodFrom, periodTo),
      this.offersOnRequestsCreatedInPeriod(periodFrom, periodTo),
      this.timeToFirstResponseInPeriod(periodFrom, periodTo),
      this.activeSpecialistsLast30Days(last30From),
      this.repeatSpecialistsCount(),
      this.parentsWithVisitInPeriod(periodFrom, periodTo),
      this.parentsWhoCreatedRequestInPeriod(periodFrom, periodTo),
      this.requestViewsInPeriod(periodFrom, periodTo),
      this.getTotalUsers(),
      this.getNewUsersInPeriod(periodFrom, periodTo),
      this.getUsersWithParentProfile(),
      this.getUsersWithSpecialistProfile(),
      this.getUsersWithBothRoles(),
      this.getActiveParentProfilesCount(),
      this.getActiveSpecialistProfilesCount(),
      this.getUniqueUsersOpenedBotInPeriod(periodFrom, periodTo),
      this.getUniqueUsersOpenedBotAllTime(),
    ]);

    const liquidityRatePercent =
      totalRequestsThisMonth > 0
        ? Math.round((requestsWithOffersCount / totalRequestsThisMonth) * 100)
        : 0;

    const avgOffersPerRequest =
      requestsWithOffersCount > 0 ? Math.round((offersOnRequestsInPeriod / requestsWithOffersCount) * 10) / 10 : 0;

    let avgTimeToFirstResponseHours: number | null = null;
    let medianTimeToFirstResponseHours: number | null = null;
    if (timeToFirstResponseRows.length > 0) {
      const hours = timeToFirstResponseRows.map((r) => r.hours);
      avgTimeToFirstResponseHours = Math.round((hours.reduce((a, b) => a + b, 0) / hours.length) * 10) / 10;
      hours.sort((a, b) => a - b);
      const mid = Math.floor(hours.length / 2);
      medianTimeToFirstResponseHours =
        hours.length % 2 !== 0 ? hours[mid]! : (hours[mid - 1]! + hours[mid]!) / 2;
      medianTimeToFirstResponseHours = Math.round(medianTimeToFirstResponseHours * 10) / 10;
    }

    const conversionParentOrderPercent =
      parentsWithVisitThisMonth > 0
        ? Math.round((parentsWhoCreatedRequestThisMonth / parentsWithVisitThisMonth) * 100)
        : null;
    const conversionSpecialistResponsePercent =
      requestViewsThisMonth > 0
        ? Math.round((offersCountThisMonth / requestViewsThisMonth) * 100)
        : null;

    return {
      closedRequestsThisMonth: closedThisMonth,
      requestsThisMonth: totalRequestsThisMonth,
      requestsWithOffersThisMonth: requestsWithOffersCount,
      liquidityRatePercent,
      avgTimeToFirstResponseHours,
      medianTimeToFirstResponseHours,
      avgOffersPerRequest,
      offersThisMonth: offersCountThisMonth,
      activeSpecialistsMau: activeSpecialistsMau,
      repeatSpecialistsCount,
      payingSpecialists: 0,
      conversionParentOrderPercent,
      conversionSpecialistResponsePercent,
      parentsWithVisitThisMonth,
      parentsWhoCreatedRequestThisMonth,
      requestViewsThisMonth,
      totalUsers,
      newUsersThisMonth,
      usersWithParentProfile,
      usersWithSpecialistProfile,
      usersWithBothRoles,
      activeParentProfilesCount,
      activeSpecialistProfilesCount,
      uniqueUsersOpenedBotThisMonth,
      uniqueUsersOpenedBotAllTime,
      periodYear: y,
      periodMonth: m,
    };
  }

  private async getUniqueUsersOpenedBotInPeriod(from: Date, to: Date): Promise<number> {
    const rows = await this.prisma.$queryRaw<[{ count: bigint }]>(Prisma.sql`
      SELECT COUNT(DISTINCT user_id) AS count
      FROM app_opens
      WHERE opened_at >= ${from} AND opened_at < ${to}
    `);
    return Number(rows[0]?.count ?? 0);
  }

  private async getUniqueUsersOpenedBotAllTime(): Promise<number> {
    const rows = await this.prisma.$queryRaw<[{ count: bigint }]>(Prisma.sql`
      SELECT COUNT(DISTINCT user_id) AS count FROM app_opens
    `);
    return Number(rows[0]?.count ?? 0);
  }

  private async getTotalUsers(): Promise<number> {
    return this.prisma.user.count({
      where: { deletedAt: null },
    });
  }

  private async getNewUsersInPeriod(from: Date, to: Date): Promise<number> {
    return this.prisma.user.count({
      where: { createdAt: { gte: from, lt: to }, deletedAt: null },
    });
  }

  private async getUsersWithParentProfile(): Promise<number> {
    const rows = await this.prisma.$queryRaw<[{ count: bigint }]>(Prisma.sql`
      SELECT COUNT(DISTINCT user_id) AS count FROM profiles WHERE type = 'parent'
    `);
    return Number(rows[0]?.count ?? 0);
  }

  private async getUsersWithSpecialistProfile(): Promise<number> {
    const rows = await this.prisma.$queryRaw<[{ count: bigint }]>(Prisma.sql`
      SELECT COUNT(DISTINCT user_id) AS count FROM profiles WHERE type = 'specialist'
    `);
    return Number(rows[0]?.count ?? 0);
  }

  private async getUsersWithBothRoles(): Promise<number> {
    const rows = await this.prisma.$queryRaw<[{ count: bigint }]>(Prisma.sql`
      SELECT COUNT(*) AS count FROM (
        SELECT user_id FROM profiles WHERE type = 'parent'
        INTERSECT
        SELECT user_id FROM profiles WHERE type = 'specialist'
      ) t
    `);
    return Number(rows[0]?.count ?? 0);
  }

  private async getActiveParentProfilesCount(): Promise<number> {
    return this.prisma.profile.count({
      where: { type: "parent", isActive: true },
    });
  }

  private async getActiveSpecialistProfilesCount(): Promise<number> {
    return this.prisma.profile.count({
      where: { type: "specialist", isActive: true },
    });
  }

  private async parentsWithVisitInPeriod(from: Date, to: Date): Promise<number> {
    const rows = await this.prisma.$queryRaw<[{ count: bigint }]>(Prisma.sql`
      SELECT COUNT(DISTINCT parent_profile_id) AS count
      FROM parent_visits
      WHERE created_at >= ${from} AND created_at < ${to}
    `);
    return Number(rows[0]?.count ?? 0);
  }

  private async parentsWhoCreatedRequestInPeriod(from: Date, to: Date): Promise<number> {
    const rows = await this.prisma.$queryRaw<[{ count: bigint }]>(Prisma.sql`
      SELECT COUNT(DISTINCT parent_profile_id) AS count
      FROM requests
      WHERE created_at >= ${from} AND created_at < ${to}
    `);
    return Number(rows[0]?.count ?? 0);
  }

  private async requestViewsInPeriod(from: Date, to: Date): Promise<number> {
    return this.prisma.requestView.count({
      where: { createdAt: { gte: from, lt: to } },
    });
  }

  private async closedRequestsInPeriod(from: Date, to: Date): Promise<number> {
    const r = await this.prisma.request.count({
      where: {
        status: "done",
        completedAt: { gte: from, lt: to },
      },
    });
    return r;
  }

  private async totalRequestsInPeriod(from: Date, to: Date): Promise<number> {
    return this.prisma.request.count({
      where: { createdAt: { gte: from, lt: to } },
    });
  }

  private async requestsWithOffersInPeriod(from: Date, to: Date): Promise<number> {
    const rows = await this.prisma.$queryRaw<[{ count: bigint }]>(
      Prisma.sql`
        SELECT COUNT(DISTINCT r.id) AS count
        FROM requests r
        INNER JOIN offers o ON o.request_id = r.id
        WHERE r.created_at >= ${from} AND r.created_at < ${to}
      `,
    );
    return Number(rows[0]?.count ?? 0);
  }

  /** Всего откликов за период (по дате создания отклика). */
  private async offersCountInPeriod(from: Date, to: Date): Promise<number> {
    return this.prisma.offer.count({
      where: { createdAt: { gte: from, lt: to } },
    });
  }

  /** Откликов по заявкам, созданным в периоде (для среднего откликов на заявку). */
  private async offersOnRequestsCreatedInPeriod(from: Date, to: Date): Promise<number> {
    const rows = await this.prisma.$queryRaw<[{ count: bigint }]>(Prisma.sql`
      SELECT COUNT(o.id) AS count
      FROM offers o
      INNER JOIN requests r ON r.id = o.request_id
      WHERE r.created_at >= ${from} AND r.created_at < ${to}
    `);
    return Number(rows[0]?.count ?? 0);
  }

  /** Время до первого отклика в часах по каждой заявке в периоде (created_at заявки в периоде). */
  private async timeToFirstResponseInPeriod(
    from: Date,
    to: Date,
  ): Promise<{ requestId: bigint; hours: number }[]> {
    const rows = await this.prisma.$queryRaw<
      { request_id: bigint; request_created_at: Date; first_offer_at: Date }[]
    >(Prisma.sql`
      SELECT r.id AS request_id, r.created_at AS request_created_at, MIN(o.created_at) AS first_offer_at
      FROM requests r
      INNER JOIN offers o ON o.request_id = r.id
      WHERE r.created_at >= ${from} AND r.created_at < ${to}
      GROUP BY r.id, r.created_at
    `);

    return rows.map((row) => ({
      requestId: row.request_id,
      hours: (row.first_offer_at.getTime() - row.request_created_at.getTime()) / (1000 * 60 * 60),
    }));
  }

  private async activeSpecialistsLast30Days(from: Date): Promise<number> {
    const rows = await this.prisma.$queryRaw<[{ count: bigint }]>(Prisma.sql`
      SELECT COUNT(DISTINCT specialist_profile_id) AS count
      FROM offers
      WHERE created_at >= ${from}
    `);
    return Number(rows[0]?.count ?? 0);
  }

  private async repeatSpecialistsCount(): Promise<number> {
    const rows = await this.prisma.$queryRaw<[{ count: bigint }]>(Prisma.sql`
      SELECT COUNT(*) AS count
      FROM (
        SELECT specialist_profile_id
        FROM offers
        GROUP BY specialist_profile_id
        HAVING COUNT(*) >= 2
      ) t
    `);
    return Number(rows[0]?.count ?? 0);
  }

  /** Метрики для специалиста/компании: переходы на анкету, отклики, заказы, заработок, непереходные заявки. */
  async getSpecialistDashboard(specialistProfileId: bigint): Promise<{
    uniqueProfileViews: number;
    acceptedOffersCount: number;
    completedOrdersCount: number;
    totalEarnings: number;
    ordersCount: number;
    uncontactableRequestsCount: number;
  }> {
    const [
      uniqueProfileViews,
      acceptedOffersCount,
      completedRows,
      uncontactableRows,
    ] = await Promise.all([
      this.prisma.profileView.groupBy({
        by: ["userId"],
        where: { profileId: specialistProfileId },
        _count: { userId: true },
      }).then((g) => g.length),
      this.prisma.offer.count({
        where: { specialistProfileId, status: "accepted" },
      }),
      this.prisma.$queryRaw<{ count: bigint; sum: string | null }[]>(Prisma.sql`
        SELECT COUNT(r.id) AS count, COALESCE(SUM(o.price_offer), 0)::text AS sum
        FROM requests r
        INNER JOIN offers o ON o.request_id = r.id AND o.specialist_profile_id = ${specialistProfileId} AND o.status = 'accepted'
        WHERE r.status = 'done'
      `),
      this.prisma.$queryRaw<[{ count: bigint }]>(Prisma.sql`
        SELECT COUNT(DISTINCT r.id) AS count
        FROM requests r
        INNER JOIN offers o ON o.request_id = r.id AND o.specialist_profile_id = ${specialistProfileId}
        INNER JOIN profiles p ON p.id = r.parent_profile_id
        INNER JOIN users u ON u.id = p.user_id
        WHERE (TRIM(COALESCE(u.username, '')) = '' OR u.username IS NULL)
          AND p.show_contact_phone_publicly = false
      `),
    ]);

    const completedCount = Number(completedRows[0]?.count ?? 0);
    const totalEarnings = Number(completedRows[0]?.sum ?? 0) || 0;

    return {
      uniqueProfileViews,
      acceptedOffersCount,
      completedOrdersCount: completedCount,
      totalEarnings,
      ordersCount: completedCount,
      uncontactableRequestsCount: Number(uncontactableRows[0]?.count ?? 0),
    };
  }
}
