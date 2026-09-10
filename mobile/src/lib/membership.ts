import type { Membership } from '../api/types';

// The statuses under which a customer actually holds a membership. `failed`
// means the first payment never went through, `cancelled` and `expired` mean it
// ended — none of them is something the customer can pause or cancel.
const LIVE_STATUSES = ['active', 'paused', 'on_hold', 'pending'];

export function isLive(status: string): boolean {
  return LIVE_STATUSES.includes(status);
}

/// Dodo returns every subscription a customer has ever had, including failed
/// attempts. Taking the first one shows a dead subscription as if it were the
/// customer's plan, so a live one always wins.
export function pickMembership(list: Membership[]): Membership | null {
  if (!list.length) return null;
  return list.find((m) => isLive(m.status)) ?? list[0];
}

export function canPause(m: Membership): boolean {
  return m.status === 'active';
}

export function canResume(m: Membership): boolean {
  return m.status === 'paused';
}

export function canCancel(m: Membership): boolean {
  return isLive(m.status) && m.status !== 'pending' && !m.cancelAtPeriodEnd;
}

/// Null when there is no renewal to speak of. A dead subscription showing
/// "Renews <date>" is simply false.
export function renewalLabel(m: Membership): string | null {
  if (!isLive(m.status)) return null;
  const when = new Date(m.nextBillingDate).toLocaleDateString();
  return m.cancelAtPeriodEnd ? `Access ends ${when}` : `Renews ${when}`;
}

export function statusTone(status: string): 'good' | 'bad' | 'neutral' {
  if (status === 'active') return 'good';
  if (!isLive(status)) return 'bad';
  return 'neutral';
}

/// What to tell the customer when their subscription is not live.
export function deadStatusMessage(status: string): string {
  switch (status) {
    case 'failed':
      return 'Your last payment did not go through, so the membership never started. You can try again below.';
    case 'cancelled':
      return 'This membership was cancelled. Subscribe again whenever you like.';
    case 'expired':
      return 'This membership has expired. Subscribe again to pick up where you left off.';
    default:
      return 'This membership is not active. Subscribe again to restore it.';
  }
}
