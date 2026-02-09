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
    specialist?: { skills: string[]; pricePerHour?: number | null; about?: string | null };
    parent?: { childrenAges: number[] | null; specialWishes?: string | null };
  }>;
  activeProfileId: string | null;
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
      photoUrl?: string | null;
      city?: string | null;
      district?: string | null;
      username?: string | null;
      firstName?: string | null;
      lastName?: string | null;
      pricePerHour?: number | null;
    };
  }>;
};

export type ReviewListItem = {
  id: string;
  rating: number;
  text?: string | null;
  createdAt: string;
  fromProfile: { id: string; type: "parent" | "specialist" };
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
  user: { username?: string | null; firstName?: string | null; lastName?: string | null; photoUrl?: string | null };
  specialist: { category?: string | null; pricePerHour?: number | null; about?: string | null } | null;
  parent: { childrenAges?: number[] | null; specialWishes?: string | null } | null;
};
