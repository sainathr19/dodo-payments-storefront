export type Product = {
  id: string;
  name: string;
  description: string | null;
  image: string | null;
  priceCents: number;
  currency: string;
  isRecurring: boolean;
};

export type CartItem = { productId: string; quantity: number };

export type Order = {
  id: string;
  totalCents: number;
  currency: string;
  createdAt: string;
  status: string;
  subscriptionId: string | null;
};

export type Membership = {
  id: string;
  status: string;
  nextBillingDate: string;
  amountCents: number;
  currency: string;
  cancelAtPeriodEnd: boolean;
};

export type WebhookEvent = {
  id: string;
  type: string;
  receivedAt: string;
};

export type DemoCustomer = { id: string; name: string; email: string };
