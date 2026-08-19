export type AppUser = {
  id: string;
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  imageUrl?: string | null;
  user_metadata?: Record<string, unknown>;
};

export type AppSession = {
  user: AppUser;
};

export type SubscriptionStatus = 'none' | 'trialing' | 'active' | 'past_due' | 'canceled' | 'unpaid' | 'incomplete' | string;
