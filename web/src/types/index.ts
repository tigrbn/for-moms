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
    type: "parent" | "specialist";
    isActive: boolean;
    displayName?: string | null;
    avatarUrl?: string | null;
    gender?: string | null;
    age?: number | null;
    city?: string | null;
    district?: string | null;
    contactPhone?: string | null;
    showContactPhonePublicly?: boolean;
    specialist?: { skills: string[]; pricePerHour?: number | null; about?: string | null };
    parent?: { childrenAges: number[] | null; specialWishes?: string | null };
  }>;
  activeProfileId: string | null;
  consentedUserAgreement?: boolean;
  consentedPolicy?: boolean;
};

export type FeedResponse =
  | {
      role: "parent";
      items: Array<
        | { kind: "banner"; id: string; imageUrl: string; targetUrl?: string | null }
        | {
            kind: "specialist_profile";
            isPromoted: boolean;
            profile: {
              id: string;
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
            };
          }
      >;
    }
  | {
      role: "specialist";
      items: Array<
        | { kind: "banner"; id: string; imageUrl: string; targetUrl?: string | null }
        | {
            kind: "request";
            request: {
              id: string;
              category: string;
              childAge?: number | null;
              description?: string | null;
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
  fromProfile: {
    id: string;
    type: "parent" | "specialist";
    displayName?: string | null;
    avatarUrl?: string | null;
    photoUrl?: string | null;
    gender?: string | null;
    firstName?: string | null;
    lastName?: string | null;
  };
};

export type PublicProfile = {
  id: string;
  type: "parent" | "specialist";
  isActive: boolean;
  displayName?: string | null;
  avatarUrl?: string | null;
  gender?: string | null;
  age?: number | null;
  city?: string | null;
  district?: string | null;
  ratingAvg: string;
  ratingCount: number;
  /** Телефон (только если специалист разрешил показ в анкете) */
  contactPhone?: string | null;
  user: { username?: string | null; firstName?: string | null; lastName?: string | null; photoUrl?: string | null };
  specialist: { category?: string | null; pricePerHour?: number | null; about?: string | null } | null;
  parent: { childrenAges?: number[] | null; specialWishes?: string | null } | null;
};
