import type { DemoCustomer, Membership, Order, Product, WebhookEvent } from './types';

export const fixtureCustomers: DemoCustomer[] = [
  { id: 'cus_demo_ada', name: 'Ada Lovelace', email: 'ada@example.com' },
  { id: 'cus_demo_grace', name: 'Grace Hopper', email: 'grace@example.com' },
  { id: 'cus_demo_alan', name: 'Alan Turing', email: 'alan@example.com' },
];

export const fixtureProducts: Product[] = [
  {
    id: 'pdt_aurora',
    name: 'Aurora Icon Pack',
    description: '480 line icons, SVG and Figma. Pixel-snapped at 16, 20 and 24.',
    image: 'https://picsum.photos/seed/aurora/800/600',
    priceCents: 1900,
    currency: 'USD',
    isRecurring: false,
  },
  {
    id: 'pdt_nocturne',
    name: 'Nocturne UI Kit',
    description: 'A dark-first component library for Figma. 140 components.',
    image: 'https://picsum.photos/seed/nocturne/800/600',
    priceCents: 4900,
    currency: 'USD',
    isRecurring: false,
  },
  {
    id: 'pdt_grain',
    name: 'Grain LUT Collection',
    description: '24 cinematic colour grades for stills and video.',
    image: 'https://picsum.photos/seed/grain/800/600',
    priceCents: 2400,
    currency: 'USD',
    isRecurring: false,
  },
  {
    id: 'pdt_meridian',
    name: 'Meridian Type Specimens',
    description: 'Editorial layout templates in InDesign and Figma.',
    image: 'https://picsum.photos/seed/meridian/800/600',
    priceCents: 1200,
    currency: 'USD',
    isRecurring: false,
  },
];

export const fixtureMembershipProduct: Product = {
  id: 'pdt_pro',
  name: 'Palette Pro',
  description: 'Every pack, every month, plus early access to new releases.',
  image: 'https://picsum.photos/seed/pro/800/600',
  priceCents: 900,
  currency: 'USD',
  isRecurring: true,
};

export const fixtureOrders: Order[] = [
  {
    id: 'pay_demo_1',
    totalCents: 4900,
    currency: 'USD',
    createdAt: '2026-09-08T10:22:00Z',
    status: 'succeeded',
    subscriptionId: null,
  },
  {
    id: 'pay_demo_2',
    totalCents: 1900,
    currency: 'USD',
    createdAt: '2026-08-30T16:05:00Z',
    status: 'succeeded',
    subscriptionId: null,
  },
];

export const fixtureMembership: Membership = {
  id: 'sub_demo_1',
  status: 'active',
  nextBillingDate: '2026-10-08T10:22:00Z',
  amountCents: 900,
  currency: 'USD',
  cancelAtPeriodEnd: false,
};

export const fixtureEvents: WebhookEvent[] = [
  { id: 'msg_demo_3', type: 'subscription.active', receivedAt: '2026-09-08T10:22:04Z' },
  { id: 'msg_demo_2', type: 'payment.succeeded', receivedAt: '2026-09-08T10:22:01Z' },
  { id: 'msg_demo_1', type: 'payment.succeeded', receivedAt: '2026-08-30T16:05:02Z' },
];
