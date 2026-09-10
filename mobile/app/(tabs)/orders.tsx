import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { api } from '../../src/api/client';
import type { Order } from '../../src/api/types';
import { Badge } from '../../src/components/Badge';
import { EmptyState } from '../../src/components/EmptyState';
import { Screen } from '../../src/components/Screen';
import { formatMoney } from '../../src/lib/money';
import { useSession } from '../../src/state/session';
import { tokens } from '../../src/theme/tokens';

export default function Orders() {
  const { customer } = useSession();
  const [orders, setOrders] = useState<Order[] | null>(null);

  const load = useCallback(() => {
    setOrders(null);
    api
      .orders(customer.id)
      .then(setOrders)
      .catch(() => setOrders([]));
  }, [customer.id]);

  useEffect(load, [load]);

  if (!orders) {
    return (
      <Screen scroll={false}>
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <ActivityIndicator color={tokens.color.accent} />
        </View>
      </Screen>
    );
  }

  if (!orders.length) {
    return (
      <Screen>
        <EmptyState
          title="No orders yet"
          body="Your purchases will appear here once a payment succeeds."
        />
      </Screen>
    );
  }

  return (
    <Screen>
      {orders.map((order) => (
        <View
          key={order.id}
          style={{
            backgroundColor: tokens.color.surface,
            borderRadius: tokens.radius.md,
            borderWidth: 1,
            borderColor: tokens.color.border,
            padding: tokens.space.lg,
            marginBottom: tokens.space.md,
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <Text style={{ ...tokens.text.heading, fontSize: 17, color: tokens.color.text }}>
              {formatMoney(order.totalCents, order.currency)}
            </Text>
            <Badge label={order.status} tone={order.status === 'succeeded' ? 'good' : 'neutral'} />
          </View>
          <Text
            style={{
              ...tokens.text.body,
              fontSize: 13,
              color: tokens.color.textDim,
              marginTop: tokens.space.xs,
            }}
          >
            {new Date(order.createdAt).toLocaleString()}
          </Text>
          <Text
            style={{ ...tokens.text.mono, color: tokens.color.textDim, marginTop: tokens.space.sm }}
          >
            {order.id}
          </Text>
        </View>
      ))}
    </Screen>
  );
}
