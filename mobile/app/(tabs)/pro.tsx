import Ionicons from '@expo/vector-icons/Ionicons';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Text, View } from 'react-native';
import { api } from '../../src/api/client';
import type { Membership, Product } from '../../src/api/types';
import { Button } from '../../src/components/Button';
import { Card } from '../../src/components/Card';
import { Screen } from '../../src/components/Screen';
import { checkoutReturnUrl, startCheckout } from '../../src/lib/checkout';
import {
  canCancel,
  canPause,
  canResume,
  deadStatusMessage,
  isLive,
  renewalLabel,
  statusTone,
} from '../../src/lib/membership';
import { formatMoney } from '../../src/lib/money';
import { useSession } from '../../src/state/session';
import { tokens } from '../../src/theme/tokens';

const PERKS = [
  'Every pack, the moment it ships',
  'Early access to new releases',
  'Commercial licence included',
  'Cancel any time, keep what you downloaded',
];

export default function Pro() {
  const { customer } = useSession();
  const [membership, setMembership] = useState<Membership | null>(null);
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [m, p] = await Promise.all([api.membership(customer.id), api.membershipProduct()]);
    setMembership(m);
    setProduct(p);
    setLoading(false);
  }, [customer.id]);

  useEffect(() => {
    void load();
  }, [load]);

  const act = async (action: 'pause' | 'resume' | 'cancel') => {
    if (!membership) return;
    setBusy(true);
    try {
      await api.membershipAction(membership.id, action);
      await load();
    } catch (e) {
      Alert.alert('Could not update membership', String(e));
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <Screen scroll={false}>
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <ActivityIndicator color={tokens.color.accent} />
        </View>
      </Screen>
    );
  }

  // A subscription that failed, was cancelled or expired is not a membership
  // the customer holds: it must not offer pause or cancel, and it must not
  // claim a renewal date.
  const live = membership !== null && isLive(membership.status);
  const priceCents = (live ? membership?.amountCents : product?.priceCents) ?? 0;
  const currency = (live ? membership?.currency : product?.currency) ?? 'USD';
  const renewal = membership ? renewalLabel(membership) : null;

  const subscribe = async () => {
    setBusy(true);
    try {
      const { checkout_url } = await api.subscribe(customer.id, checkoutReturnUrl());
      if (!checkout_url) throw new Error('the backend returned no checkout url');
      await startCheckout(checkout_url);
      await load();
    } catch (e) {
      Alert.alert('Could not subscribe', String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      {/* The plan card is the hero: deep accent fill so it reads as the one
          premium thing on an otherwise light, quiet screen. */}
      <View
        style={{
          backgroundColor: tokens.color.accent,
          borderRadius: tokens.radius.xl,
          padding: tokens.space.xl,
          ...tokens.shadow.card,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: tokens.space.sm }}>
          <Ionicons name="sparkles" size={17} color="#FFFFFF" />
          <Text style={{ ...tokens.text.caption, color: 'rgba(255,255,255,0.85)', letterSpacing: 0.6 }}>
            MEMBERSHIP
          </Text>
        </View>

        <Text style={{ ...tokens.text.title, color: '#FFFFFF', marginTop: tokens.space.md }}>
          {product?.name ?? 'Palette Pro'}
        </Text>

        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6, marginTop: tokens.space.sm }}>
          <Text style={{ ...tokens.text.display, color: '#FFFFFF' }}>
            {formatMoney(priceCents, currency)}
          </Text>
          <Text style={{ ...tokens.text.body, color: 'rgba(255,255,255,0.8)' }}>/ month</Text>
        </View>

        {membership ? (
          <View style={{ flexDirection: 'row', gap: tokens.space.sm, marginTop: tokens.space.lg }}>
            {/* A failed or cancelled status is tinted red rather than sharing
                the same neutral pill as ACTIVE, which read as healthy. */}
            <View
              style={{
                backgroundColor:
                  statusTone(membership.status) === 'bad'
                    ? 'rgba(255,150,150,0.28)'
                    : 'rgba(255,255,255,0.2)',
                paddingHorizontal: tokens.space.md,
                paddingVertical: 5,
                borderRadius: tokens.radius.pill,
              }}
            >
              <Text style={{ ...tokens.text.caption, color: '#FFFFFF' }}>
                {membership.status.toUpperCase()}
              </Text>
            </View>
            {membership.cancelAtPeriodEnd ? (
              <View
                style={{
                  backgroundColor: 'rgba(255,255,255,0.2)',
                  paddingHorizontal: tokens.space.md,
                  paddingVertical: 5,
                  borderRadius: tokens.radius.pill,
                }}
              >
                <Text style={{ ...tokens.text.caption, color: '#FFFFFF' }}>ENDS AT PERIOD END</Text>
              </View>
            ) : null}
          </View>
        ) : null}

        {renewal ? (
          <Text
            style={{
              ...tokens.text.body,
              fontSize: 13,
              color: 'rgba(255,255,255,0.8)',
              marginTop: tokens.space.md,
            }}
          >
            {renewal}
          </Text>
        ) : null}
      </View>

      <Card style={{ marginTop: tokens.space.xl }}>
        {PERKS.map((perk, i) => (
          <View
            key={perk}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: tokens.space.md,
              marginTop: i === 0 ? 0 : tokens.space.md,
            }}
          >
            <Ionicons name="checkmark-circle" size={19} color={tokens.color.accent} />
            <Text style={{ ...tokens.text.body, fontSize: 14, color: tokens.color.text, flex: 1 }}>
              {perk}
            </Text>
          </View>
        ))}
      </Card>

      {/* Explains a failed or ended subscription instead of leaving the bare
          status pill to be interpreted. */}
      {membership && !live ? (
        <Card style={{ marginTop: tokens.space.lg, backgroundColor: tokens.color.dangerSoft, borderColor: tokens.color.dangerSoft }}>
          <View style={{ flexDirection: 'row', gap: tokens.space.md }}>
            <Ionicons name="alert-circle" size={19} color={tokens.color.danger} />
            <Text style={{ ...tokens.text.body, fontSize: 14, color: tokens.color.danger, flex: 1 }}>
              {deadStatusMessage(membership.status)}
            </Text>
          </View>
        </Card>
      ) : null}

      <View style={{ gap: tokens.space.md, marginTop: tokens.space.xl }}>
        {!live ? (
          <Button
            title={membership ? 'Try again' : 'Subscribe'}
            loading={busy}
            onPress={() => void subscribe()}
          />
        ) : null}

        {membership && canPause(membership) ? (
          <Button
            title="Pause membership"
            variant="secondary"
            loading={busy}
            onPress={() => void act('pause')}
          />
        ) : null}

        {membership && canResume(membership) ? (
          <Button
            title="Resume membership"
            variant="secondary"
            loading={busy}
            onPress={() => void act('resume')}
          />
        ) : null}

        {membership && canCancel(membership) ? (
          <Button
            title="Cancel membership"
            variant="danger"
            loading={busy}
            onPress={() => void act('cancel')}
          />
        ) : null}
      </View>
    </Screen>
  );
}
