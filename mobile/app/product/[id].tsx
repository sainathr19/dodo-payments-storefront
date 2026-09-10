import { Image } from 'expo-image';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { api } from '../../src/api/client';
import type { Product } from '../../src/api/types';
import { Badge } from '../../src/components/Badge';
import { Button } from '../../src/components/Button';
import { EmptyState } from '../../src/components/EmptyState';
import { Screen } from '../../src/components/Screen';
import { productImage } from '../../src/lib/images';
import { formatMoney } from '../../src/lib/money';
import { useSession } from '../../src/state/session';
import { tokens } from '../../src/theme/tokens';

export default function ProductDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { add } = useSession();
  const [product, setProduct] = useState<Product | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    api
      .product(String(id))
      .then(setProduct)
      .catch((e) => setError(String(e)));
  }, [id]);

  if (error) {
    return (
      <Screen>
        <EmptyState title="Not found" body={error} icon="help-circle-outline" />
      </Screen>
    );
  }

  if (!product) {
    return (
      <Screen scroll={false}>
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <ActivityIndicator color={tokens.color.accent} />
        </View>
      </Screen>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: product.name, headerBackTitle: 'Store' }} />
      <Screen>
        <Image
          source={productImage(product)}
          style={{
            width: '100%',
            aspectRatio: 4 / 3,
            borderRadius: tokens.radius.xl,
            backgroundColor: tokens.color.surfaceAlt,
            ...tokens.shadow.card,
          }}
          contentFit="cover"
          transition={220}
        />

        <View style={{ marginTop: tokens.space.xl }}>
          <Badge label={product.isRecurring ? 'MEMBERSHIP' : 'DIGITAL DOWNLOAD'} tone="accent" />
        </View>

        <Text
          style={{ ...tokens.text.title, color: tokens.color.text, marginTop: tokens.space.md }}
        >
          {product.name}
        </Text>

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'baseline',
            gap: 6,
            marginTop: tokens.space.sm,
          }}
        >
          <Text style={{ ...tokens.text.display, fontSize: 30, color: tokens.color.accent }}>
            {formatMoney(product.priceCents, product.currency)}
          </Text>
          {product.isRecurring ? (
            <Text style={{ ...tokens.text.body, color: tokens.color.textDim }}>/ month</Text>
          ) : null}
        </View>

        <Text
          style={{
            ...tokens.text.body,
            color: tokens.color.textDim,
            marginTop: tokens.space.lg,
          }}
        >
          {product.description}
        </Text>

        <View style={{ marginTop: tokens.space.xxl }}>
          <Button
            title="Add to cart"
            loading={adding}
            onPress={async () => {
              setAdding(true);
              try {
                await add(product.id, 1);
                router.push('/cart');
              } finally {
                setAdding(false);
              }
            }}
          />
        </View>

        <Text
          style={{
            ...tokens.text.caption,
            color: tokens.color.textFaint,
            textAlign: 'center',
            marginTop: tokens.space.lg,
          }}
        >
          Secure checkout by Dodo Payments
        </Text>
      </Screen>
    </>
  );
}
