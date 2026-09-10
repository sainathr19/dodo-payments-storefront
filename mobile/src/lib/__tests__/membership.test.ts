import {
  canCancel,
  canPause,
  canResume,
  isLive,
  pickMembership,
  renewalLabel,
  statusTone,
} from '../membership';
import type { Membership } from '../../api/types';

const base: Membership = {
  id: 'sub_1',
  status: 'active',
  nextBillingDate: '2026-10-10T00:00:00Z',
  amountCents: 900,
  currency: 'USD',
  cancelAtPeriodEnd: false,
};

const withStatus = (status: string, over: Partial<Membership> = {}): Membership => ({
  ...base,
  status,
  ...over,
});

describe('isLive', () => {
  it('counts the statuses a customer is actually subscribed under', () => {
    for (const s of ['active', 'paused', 'on_hold', 'pending']) {
      expect(isLive(s)).toBe(true);
    }
  });

  // A failed payment never started the subscription; cancelled and expired
  // ended it. None of them is a membership the customer holds.
  it('excludes the terminal statuses', () => {
    for (const s of ['failed', 'cancelled', 'expired']) {
      expect(isLive(s)).toBe(false);
    }
  });

  it('treats an unrecognised status as not live rather than guessing', () => {
    expect(isLive('something_new')).toBe(false);
  });
});

describe('pickMembership', () => {
  it('is null when there are no subscriptions at all', () => {
    expect(pickMembership([])).toBeNull();
  });

  it('prefers a live subscription over a dead one regardless of order', () => {
    const failed = withStatus('failed', { id: 'sub_failed' });
    const active = withStatus('active', { id: 'sub_active' });
    expect(pickMembership([failed, active])?.id).toBe('sub_active');
    expect(pickMembership([active, failed])?.id).toBe('sub_active');
  });

  // Kept so the screen can say "your last attempt failed" rather than
  // pretending the customer never tried.
  it('falls back to the most recent dead one when nothing is live', () => {
    const failed = withStatus('failed', { id: 'sub_failed' });
    expect(pickMembership([failed])?.id).toBe('sub_failed');
  });
});

describe('available actions', () => {
  it('only an active subscription can be paused', () => {
    expect(canPause(withStatus('active'))).toBe(true);
    expect(canPause(withStatus('paused'))).toBe(false);
    expect(canPause(withStatus('failed'))).toBe(false);
    expect(canPause(withStatus('cancelled'))).toBe(false);
  });

  it('only a paused subscription can be resumed', () => {
    expect(canResume(withStatus('paused'))).toBe(true);
    expect(canResume(withStatus('active'))).toBe(false);
    expect(canResume(withStatus('failed'))).toBe(false);
  });

  it('a dead subscription offers no cancel, because there is nothing to cancel', () => {
    expect(canCancel(withStatus('active'))).toBe(true);
    expect(canCancel(withStatus('paused'))).toBe(true);
    expect(canCancel(withStatus('failed'))).toBe(false);
    expect(canCancel(withStatus('cancelled'))).toBe(false);
  });

  it('a subscription already set to end offers no second cancel', () => {
    expect(canCancel(withStatus('active', { cancelAtPeriodEnd: true }))).toBe(false);
  });
});

describe('renewalLabel', () => {
  it('says renews for a healthy subscription', () => {
    expect(renewalLabel(withStatus('active'))).toMatch(/^Renews /);
  });

  it('says access ends when it is set to stop at period end', () => {
    expect(renewalLabel(withStatus('active', { cancelAtPeriodEnd: true }))).toMatch(/^Access ends /);
  });

  // "Renews 10/9/2026" on a subscription that never started is a lie.
  it('says nothing about renewal for a dead subscription', () => {
    expect(renewalLabel(withStatus('failed'))).toBeNull();
    expect(renewalLabel(withStatus('cancelled'))).toBeNull();
  });
});

describe('statusTone', () => {
  it('marks failure as bad and health as good', () => {
    expect(statusTone('active')).toBe('good');
    expect(statusTone('failed')).toBe('bad');
    expect(statusTone('cancelled')).toBe('bad');
    expect(statusTone('paused')).toBe('neutral');
  });
});
