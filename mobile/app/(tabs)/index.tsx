import { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { api } from '../../src/api/client';
import type { Product } from '../../src/api/types';
import { EmptyState } from '../../src/components/EmptyState';
import { ProductCard } from '../../src/components/ProductCard';
import { Screen } from '../../src/components/Screen';
import { tokens } from '../../src/theme/tokens';

export default function Store() {
  const [products, setProducts] = useState<Product[] | null>(null);
  const [pro, setPro] = useState<Product | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([api.products(), api.membershipProduct()])
      .then(([list, membership]) => {
        setProducts(list);
        setPro(membership);
      })
      .catch((e) => setError(String(e)));
  }, []);

  if (error) {
    return (
      <Screen>
        <EmptyState title="Could not load the store" body={error} />
      </Screen>
    );
  }

  if (!products) {
    return (
      <Screen scroll={false}>
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <ActivityIndicator color={tokens.color.accent} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <Text
        style={{ ...tokens.text.title, color: tokens.color.text, marginBottom: tokens.space.xs }}
      >
        Design assets
      </Text>
      <Text
        style={{ ...tokens.text.body, color: tokens.color.textDim, marginBottom: tokens.space.xl }}
      >
        Packs, kits and templates. Yours to keep.
      </Text>

      {pro ? (
        <View
          style={{
            backgroundColor: tokens.color.accent,
            borderRadius: tokens.radius.lg,
            padding: tokens.space.xl,
            marginBottom: tokens.space.xl,
          }}
        >
          <Text style={{ ...tokens.text.heading, color: tokens.color.accentText }}>{pro.name}</Text>
          <Text
            style={{
              ...tokens.text.body,
              color: tokens.color.accentText,
              opacity: 0.9,
              marginTop: tokens.space.xs,
            }}
          >
            {pro.description}
          </Text>
        </View>
      ) : null}

      {products.map((p) => (
        <ProductCard key={p.id} product={p} />
      ))}
    </Screen>
  );
}
