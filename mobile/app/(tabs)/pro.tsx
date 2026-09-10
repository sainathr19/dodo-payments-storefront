import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { api } from '../../src/api/client';
import type { Membership, Product } from '../../src/api/types';
import { Badge } from '../../src/components/Badge';
import { Button } from '../../src/components/Button';
import { PriceTag } from '../../src/components/PriceTag';
import { Screen } from '../../src/components/Screen';
import { useSession } from '../../src/state/session';
import { tokens } from '../../src/theme/tokens';

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

  const paused = membership?.status === 'paused';

  return (
    <Screen>
      <View
        style={{
          backgroundColor: tokens.color.surface,
          borderRadius: tokens.radius.lg,
          borderWidth: 1,
          borderColor: tokens.color.border,
          padding: tokens.space.xl,
        }}
      >
        <Text style={{ ...tokens.text.title, fontSize: 22, color: tokens.color.text }}>
          {product?.name ?? 'Palette Pro'}
        </Text>
        <Text
          style={{ ...tokens.text.body, color: tokens.color.textDim, marginTop: tokens.space.sm }}
        >
          {product?.description}
        </Text>

        {membership ? (
          <>
            <View style={{ marginTop: tokens.space.lg, flexDirection: 'row', gap: tokens.space.sm }}>
              <Badge label={membership.status} tone={paused ? 'neutral' : 'good'} />
              {membership.cancelAtPeriodEnd ? <Badge label="ends at period end" tone="bad" /> : null}
            </View>
            <View style={{ marginTop: tokens.space.lg }}>
              <PriceTag
                cents={membership.amountCents}
                currency={membership.currency}
                suffix=" / month"
                size="lg"
              />
            </View>
            <Text
              style={{
                ...tokens.text.body,
                fontSize: 13,
                color: tokens.color.textDim,
                marginTop: tokens.space.sm,
              }}
            >
              {membership.cancelAtPeriodEnd ? 'Access ends' : 'Renews'}{' '}
              {new Date(membership.nextBillingDate).toLocaleDateString()}
            </Text>
          </>
        ) : (
          <View style={{ marginTop: tokens.space.lg }}>
            <PriceTag
              cents={product?.priceCents ?? 0}
              currency={product?.currency ?? 'USD'}
              suffix=" / month"
              size="lg"
            />
          </View>
        )}
      </View>

      <View style={{ gap: tokens.space.md, marginTop: tokens.space.xl }}>
        {!membership ? (
          <Button
            title="Subscribe"
            loading={busy}
            onPress={() => {
              // Task 9 wires this to hosted checkout.
            }}
          />
        ) : (
          <>
            <Button
              title={paused ? 'Resume membership' : 'Pause membership'}
              variant="secondary"
              loading={busy}
              onPress={() => void act(paused ? 'resume' : 'pause')}
            />
            {!membership.cancelAtPeriodEnd ? (
              <Button
                title="Cancel membership"
                variant="danger"
                loading={busy}
                onPress={() => void act('cancel')}
              />
            ) : null}
          </>
        )}
      </View>
    </Screen>
  );
}
