import { Image } from 'expo-image';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { api } from '../../src/api/client';
import type { Product } from '../../src/api/types';
import { Button } from '../../src/components/Button';
import { EmptyState } from '../../src/components/EmptyState';
import { PriceTag } from '../../src/components/PriceTag';
import { Screen } from '../../src/components/Screen';
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
        <EmptyState title="Not found" body={error} />
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
          source={product.image}
          style={{
            width: '100%',
            aspectRatio: 4 / 3,
            borderRadius: tokens.radius.lg,
            backgroundColor: tokens.color.surfaceHigh,
          }}
          contentFit="cover"
          transition={200}
        />
        <Text
          style={{ ...tokens.text.title, color: tokens.color.text, marginTop: tokens.space.xl }}
        >
          {product.name}
        </Text>
        <View style={{ marginTop: tokens.space.sm }}>
          <PriceTag cents={product.priceCents} currency={product.currency} size="lg" />
        </View>
        <Text
          style={{
            ...tokens.text.body,
            color: tokens.color.textDim,
            marginTop: tokens.space.lg,
            lineHeight: 22,
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
      </Screen>
    </>
  );
}
