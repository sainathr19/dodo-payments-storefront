import Ionicons from '@expo/vector-icons/Ionicons';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { api } from '../../src/api/client';
import type { WebhookEvent } from '../../src/api/types';
import { Badge } from '../../src/components/Badge';
import { Button } from '../../src/components/Button';
import { Card } from '../../src/components/Card';
import { Screen } from '../../src/components/Screen';
import { useSession } from '../../src/state/session';
import { tokens } from '../../src/theme/tokens';

function initials(name: string) {
  return name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('');
}

export default function Profile() {
  const { customer, customers, setCustomer } = useSession();
  const [events, setEvents] = useState<WebhookEvent[]>([]);

  const loadEvents = useCallback(() => {
    api
      .events()
      .then(setEvents)
      .catch(() => setEvents([]));
  }, []);

  useEffect(loadEvents, [loadEvents]);

  return (
    <Screen>
      <Text style={{ ...tokens.text.heading, color: tokens.color.text }}>Demo customer</Text>
      <Text
        style={{
          ...tokens.text.body,
          fontSize: 14,
          color: tokens.color.textDim,
          marginTop: tokens.space.xs,
          marginBottom: tokens.space.lg,
        }}
      >
        This demo has no sign-in. Pick who you are; the cart and orders follow.
      </Text>

      <Card padded={false} style={{ overflow: 'hidden', marginBottom: tokens.space.xxl }}>
        {customers.map((c, i) => {
          const selected = c.id === customer.id;
          return (
            <Pressable
              key={c.id}
              onPress={() => setCustomer(c)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: tokens.space.lg,
                padding: tokens.space.lg,
                backgroundColor: selected ? tokens.color.accentSoft : 'transparent',
                borderTopWidth: i === 0 ? 0 : 1,
                borderTopColor: tokens.color.border,
              }}
            >
              <View
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: tokens.radius.pill,
                  backgroundColor: selected ? tokens.color.accent : tokens.color.surfaceAlt,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text
                  style={{
                    ...tokens.text.label,
                    color: selected ? tokens.color.accentText : tokens.color.textDim,
                  }}
                >
                  {initials(c.name)}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ ...tokens.text.label, fontSize: 15, color: tokens.color.text }}>
                  {c.name}
                </Text>
                <Text
                  style={{ ...tokens.text.body, fontSize: 13, color: tokens.color.textDim }}
                >
                  {c.email}
                </Text>
              </View>
              {selected ? (
                <Ionicons name="checkmark-circle" size={22} color={tokens.color.accent} />
              ) : null}
            </Pressable>
          );
        })}
      </Card>

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: tokens.space.xs,
        }}
      >
        <Text style={{ ...tokens.text.heading, color: tokens.color.text }}>Webhook feed</Text>
        <Badge
          label={api.usingFixtures() ? 'FIXTURES' : 'LIVE'}
          tone={api.usingFixtures() ? 'neutral' : 'good'}
        />
      </View>
      <Text
        style={{
          ...tokens.text.body,
          fontSize: 14,
          color: tokens.color.textDim,
          marginBottom: tokens.space.lg,
        }}
      >
        Events Dodo Payments sent to the backend, newest first.
      </Text>

      <Card padded={false} style={{ overflow: 'hidden', marginBottom: tokens.space.lg }}>
        {events.map((e, i) => {
          const good = e.type.endsWith('succeeded') || e.type.endsWith('active');
          return (
            <View
              key={e.id}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: tokens.space.md,
                padding: tokens.space.lg,
                borderTopWidth: i === 0 ? 0 : 1,
                borderTopColor: tokens.color.border,
              }}
            >
              <View
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: good ? tokens.color.success : tokens.color.borderStrong,
                }}
              />
              <View style={{ flex: 1 }}>
                <Text style={{ ...tokens.text.label, color: tokens.color.text }}>{e.type}</Text>
                <Text
                  style={{ ...tokens.text.mono, color: tokens.color.textFaint, marginTop: 3 }}
                  numberOfLines={1}
                >
                  {e.id}
                </Text>
              </View>
            </View>
          );
        })}
      </Card>

      <Button title="Refresh" variant="secondary" onPress={loadEvents} />
    </Screen>
  );
}
