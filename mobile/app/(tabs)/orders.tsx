import Ionicons from '@expo/vector-icons/Ionicons';
import * as WebBrowser from 'expo-web-browser';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, Text, View } from 'react-native';
import { api } from '../../src/api/client';
import type { Order } from '../../src/api/types';
import { Badge } from '../../src/components/Badge';
import { Card } from '../../src/components/Card';
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
          icon="receipt-outline"
        />
      </Screen>
    );
  }

  return (
    <Screen>
      {orders.map((order) => (
        <Card key={order.id} style={{ marginBottom: tokens.space.lg }}>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <Text style={{ ...tokens.text.title, fontSize: 22, color: tokens.color.text }}>
              {formatMoney(order.totalCents, order.currency)}
            </Text>
            <Badge
              label={order.status.toUpperCase()}
              tone={order.status === 'succeeded' ? 'good' : 'neutral'}
            />
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
            style={{ ...tokens.text.mono, color: tokens.color.textFaint, marginTop: tokens.space.sm }}
          >
            {order.id}
          </Text>

          <View
            style={{
              flexDirection: 'row',
              gap: tokens.space.sm,
              marginTop: tokens.space.lg,
              paddingTop: tokens.space.lg,
              borderTopWidth: 1,
              borderTopColor: tokens.color.border,
            }}
          >
            <Pressable
              onPress={() => WebBrowser.openBrowserAsync(api.invoiceUrl(order.id))}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                backgroundColor: tokens.color.surfaceAlt,
                paddingHorizontal: tokens.space.lg,
                paddingVertical: 9,
                borderRadius: tokens.radius.pill,
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <Ionicons name="document-text-outline" size={15} color={tokens.color.text} />
              <Text style={{ ...tokens.text.label, color: tokens.color.text }}>Invoice</Text>
            </Pressable>

            <Pressable
              onPress={() =>
                // A refund cannot be undone, so it is never a single unconfirmed tap.
                Alert.alert(
                  'Request a refund?',
                  `This refunds ${formatMoney(order.totalCents, order.currency)} and cannot be undone.`,
                  [
                    { text: 'Keep order', style: 'cancel' },
                    {
                      text: 'Refund',
                      style: 'destructive',
                      onPress: async () => {
                        try {
                          await api.refund(order.id);
                          load();
                        } catch (e) {
                          Alert.alert('Refund failed', String(e));
                        }
                      },
                    },
                  ],
                )
              }
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                backgroundColor: tokens.color.dangerSoft,
                paddingHorizontal: tokens.space.lg,
                paddingVertical: 9,
                borderRadius: tokens.radius.pill,
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <Ionicons name="arrow-undo-outline" size={15} color={tokens.color.danger} />
              <Text style={{ ...tokens.text.label, color: tokens.color.danger }}>Refund</Text>
            </Pressable>
          </View>
        </Card>
      ))}
    </Screen>
  );
}
