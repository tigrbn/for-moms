export type MeResponse = {
  user: {
    id: string;
    telegramId: string;
    firstName?: string | null;
    lastName?: string | null;
    username?: string | null;
    photoUrl?: string | null;
  };
  profiles: Array<{
    id: string;
    type: "parent" | "specialist" | "company";
    isActive: boolean;
    displayName?: string | null;
    avatarUrl?: string | null;
    gender?: string | null;
    age?: number | null;
    city?: string | null;
    district?: string | null;
    contactPhone?: string | null;
    showContactPhonePublicly?: boolean;
    specialist?: { skills: string[]; pricePerHour?: number | null; about?: string | null; notifyNewRequestsInCategory?: boolean; portfolioImageUrls?: string[] };
    parent?: { childrenAges: number[] | null; specialWishes?: string | null };
    company?: { companyName: string; inn?: string | null; legalAddress?: string | null };
  }>;
  activeProfileId: string | null;
  consentedUserAgreement?: boolean;
  consentedPolicy?: boolean;
  /** true для пользователя с админскими правами (например, username tigrbn) */
  isAdmin?: boolean;
};

export type FeedResponse =
  | {
      role: "parent";
      items: Array<
        | { kind: "banner"; id: string; imageUrl: string; targetUrl?: string | null }
        | {
            kind: "other_post";
            post: {
              id: string;
              content: string;
              images?: string[];
              createdAt: string;
              author: {
                displayName: string;
                avatarUrl?: string | null;
                photoUrl?: string | null;
                username?: string | null;
              };
            };
          }
        | {
            kind: "specialist_profile";
            isPromoted: boolean;
            profile: {
              id: string;
              type?: "parent" | "specialist" | "company";
              displayName?: string | null;
              avatarUrl?: string | null;
              gender?: string | null;
              photoUrl?: string | null;
              category?: string | null;
              city?: string | null;
              district?: string | null;
              ratingAvg: string;
              ratingCount: number;
              pricePerHour?: number | null;
              portfolioImageUrls?: string[];
            };
          }
      >;
    }
  | {
      role: "specialist" | "company";
      items: Array<
        | { kind: "banner"; id: string; imageUrl: string; targetUrl?: string | null }
        | {
            kind: "other_post";
            post: {
              id: string;
              content: string;
              images?: string[];
              createdAt: string;
              author: {
                displayName: string;
                avatarUrl?: string | null;
                photoUrl?: string | null;
                username?: string | null;
              };
            };
          }
        | {
            kind: "request";
            request: {
              id: string;
              category: string;
              childAge?: number | null;
              description?: string | null;
              images?: string[];
              startAt?: string | null;
              durationMin?: number | null;
              budget?: number | null;
              district?: string | null;
              status: "active" | "in_progress" | "done" | "cancelled";
              createdAt: string;
              parent?: {
                displayName?: string | null;
                avatarUrl?: string | null;
                photoUrl?: string | null;
                gender?: string | null;
                ratingAvg?: string;
                ratingCount?: number;
              } | null;
            };
          }
      >;
    };

export type RequestMineItem = {
  id: string;
  status: "active" | "in_progress" | "done" | "cancelled";
  category: string;
  description?: string | null;
  images?: string[];
  startAt?: string | null;
  durationMin?: number | null;
  budget?: number | null;
  district?: string | null;
  createdAt: string;
  offersCount: number;
  newOffersCount: number;
};

export type OfferMineItem = {
  id: string;
  requestId: string;
  status: "pending" | "accepted" | "rejected" | "cancelled";
  priceOffer?: number | null;
  comment?: string | null;
  createdAt: string;
  request: {
    id: string;
    status: "active" | "in_progress" | "done" | "cancelled";
    category: string;
    district?: string | null;
    budget?: number | null;
    createdAt: string;
  };
};

export type RequestDetails = {
  id: string;
  /** Текущий пользователь уже оставил отзыв по этой заявке */
  currentUserHasReviewed?: boolean;
  status: "active" | "in_progress" | "done" | "cancelled";
  category: string;
  childAge?: number | null;
  description?: string | null;
  images?: string[];
  startAt?: string | null;
  durationMin?: number | null;
  budget?: number | null;
  district?: string | null;
  createdAt: string;
  completedAt?: string | null;
  parent: {
    profileId: string;
    displayName?: string | null;
    avatarUrl?: string | null;
    photoUrl?: string | null;
    gender?: string | null;
    city?: string | null;
    district?: string | null;
    username?: string | null;
    firstName?: string | null;
    lastName?: string | null;
    ratingAvg?: string;
    ratingCount?: number;
    childrenAges?: number[] | null;
    specialWishes?: string | null;
    /** Телефон заказчика: показывается специалисту если заказчик разрешил показ или отклик принят */
    contactPhone?: string | null;
  };
  offers: Array<{
    id: string;
    specialistProfileId: string;
    priceOffer?: number | null;
    comment?: string | null;
    status: "pending" | "accepted" | "rejected" | "cancelled";
    createdAt: string;
    specialist: {
      profileId: string;
      displayName?: string | null;
      avatarUrl?: string | null;
      gender?: string | null;
      age?: number | null;
      photoUrl?: string | null;
      city?: string | null;
      district?: string | null;
      username?: string | null;
      firstName?: string | null;
      lastName?: string | null;
      pricePerHour?: number | null;
      /** Показывается заказчику только у принятого исполнителя */
      contactPhone?: string | null;
    };
  }>;
};

export type ReviewListItem = {
  id: string;
  rating: number;
  text?: string | null;
  createdAt: string;
  requestCategory?: string | null;
  /** null — автор отзыва удалил аккаунт; отзыв участвует в рейтинге */
  fromProfile: {
    id: string;
    type: "parent" | "specialist" | "company";
    displayName?: string | null;
    avatarUrl?: string | null;
    photoUrl?: string | null;
    gender?: string | null;
    firstName?: string | null;
    lastName?: string | null;
  } | null;
};

export type PublicProfile = {
  id: string;
  type: "parent" | "specialist" | "company";
  isActive: boolean;
  displayName?: string | null;
  avatarUrl?: string | null;
  gender?: string | null;
  age?: number | null;
  city?: string | null;
  district?: string | null;
  ratingAvg: string;
  ratingCount: number;
  /** Телефон (только если специалист/компания разрешил показ в анкете) */
  contactPhone?: string | null;
  user: { username?: string | null; firstName?: string | null; lastName?: string | null; photoUrl?: string | null };
  specialist: { category?: string | null; pricePerHour?: number | null; about?: string | null; portfolioImageUrls?: string[] } | null;
  parent: { childrenAges?: number[] | null; specialWishes?: string | null } | null;
  company: { companyName: string; inn?: string | null; legalAddress?: string | null } | null;
};

/** Ответ GET /analytics/dashboard (только для админа) */
export type AnalyticsDashboardResponse = {
  closedRequestsThisMonth: number;
  requestsThisMonth: number;
  requestsWithOffersThisMonth: number;
  liquidityRatePercent: number;
  avgTimeToFirstResponseHours: number | null;
  medianTimeToFirstResponseHours: number | null;
  avgOffersPerRequest: number;
  offersThisMonth: number;
  activeSpecialistsMau: number;
  repeatSpecialistsCount: number;
  payingSpecialists: number;
  conversionParentOrderPercent: number | null;
  conversionSpecialistResponsePercent: number | null;
  parentsWithVisitThisMonth: number;
  parentsWhoCreatedRequestThisMonth: number;
  requestViewsThisMonth: number;
  totalUsers: number;
  newUsersThisMonth: number;
  usersWithParentProfile: number;
  usersWithSpecialistProfile: number;
  usersWithBothRoles: number;
  activeParentProfilesCount: number;
  activeSpecialistProfilesCount: number;
  periodYear: number;
  periodMonth: number;
};
