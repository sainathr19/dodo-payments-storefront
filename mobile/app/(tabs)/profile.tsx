import { useCallback, useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { api } from '../../src/api/client';
import type { WebhookEvent } from '../../src/api/types';
import { Badge } from '../../src/components/Badge';
import { Button } from '../../src/components/Button';
import { Screen } from '../../src/components/Screen';
import { useSession } from '../../src/state/session';
import { tokens } from '../../src/theme/tokens';

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
      <Text
        style={{ ...tokens.text.heading, color: tokens.color.text, marginBottom: tokens.space.md }}
      >
        Demo customer
      </Text>
      <Text
        style={{
          ...tokens.text.body,
          fontSize: 13,
          color: tokens.color.textDim,
          marginBottom: tokens.space.lg,
        }}
      >
        This demo has no sign-in. Pick who you are; the cart and orders follow.
      </Text>

      {customers.map((c) => {
        const selected = c.id === customer.id;
        return (
          <Pressable
            key={c.id}
            onPress={() => setCustomer(c)}
            style={{
              backgroundColor: selected ? tokens.color.surfaceHigh : tokens.color.surface,
              borderWidth: 1,
              borderColor: selected ? tokens.color.accent : tokens.color.border,
              borderRadius: tokens.radius.md,
              padding: tokens.space.lg,
              marginBottom: tokens.space.sm,
            }}
          >
            <Text style={{ ...tokens.text.label, fontSize: 15, color: tokens.color.text }}>
              {c.name}
            </Text>
            <Text style={{ ...tokens.text.body, fontSize: 13, color: tokens.color.textDim }}>
              {c.email}
            </Text>
          </Pressable>
        );
      })}

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: tokens.space.xxl,
          marginBottom: tokens.space.md,
        }}
      >
        <Text style={{ ...tokens.text.heading, color: tokens.color.text }}>Webhook feed</Text>
        <Badge
          label={api.usingFixtures() ? 'fixtures' : 'live'}
          tone={api.usingFixtures() ? 'neutral' : 'good'}
        />
      </View>
      <Text
        style={{
          ...tokens.text.body,
          fontSize: 13,
          color: tokens.color.textDim,
          marginBottom: tokens.space.lg,
        }}
      >
        Events Dodo Payments sent to the backend, newest first.
      </Text>

      {events.map((e) => (
        <View
          key={e.id}
          style={{
            backgroundColor: tokens.color.surface,
            borderRadius: tokens.radius.sm,
            padding: tokens.space.md,
            marginBottom: tokens.space.sm,
            borderLeftWidth: 3,
            borderLeftColor:
              e.type.endsWith('succeeded') || e.type.endsWith('active')
                ? tokens.color.success
                : tokens.color.border,
          }}
        >
          <Text style={{ ...tokens.text.label, color: tokens.color.text }}>{e.type}</Text>
          <Text
            style={{ ...tokens.text.mono, color: tokens.color.textDim, marginTop: tokens.space.xs }}
          >
            {e.id}
          </Text>
        </View>
      ))}

      <View style={{ marginTop: tokens.space.lg }}>
        <Button title="Refresh" variant="secondary" onPress={loadEvents} />
      </View>
    </Screen>
  );
}
