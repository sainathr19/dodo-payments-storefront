import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Link } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { api } from '../../src/api/client';
import type { Product } from '../../src/api/types';
import { EmptyState } from '../../src/components/EmptyState';
import { ProductCard } from '../../src/components/ProductCard';
import { Screen } from '../../src/components/Screen';
import { productImage } from '../../src/lib/images';
import { formatMoney } from '../../src/lib/money';
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
        <EmptyState title="Could not load the store" body={error} icon="cloud-offline-outline" />
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
      <Text style={{ ...tokens.text.display, color: tokens.color.text }}>Design assets</Text>
      <Text
        style={{
          ...tokens.text.body,
          color: tokens.color.textDim,
          marginTop: tokens.space.xs,
          marginBottom: tokens.space.xl,
        }}
      >
        Packs, kits and templates. Yours to keep.
      </Text>

      {pro ? (
        <Link href="/pro" asChild>
          {/* On iOS a shadow and `overflow: hidden` cannot live on the same
              view: the shadow suppresses the clip and the corners render
              square. The outer view carries the shadow, the inner one clips. */}
          <Pressable
            style={({ pressed }) => ({
              marginBottom: tokens.space.xxl,
              transform: [{ scale: pressed ? 0.985 : 1 }],
              borderRadius: tokens.radius.xl,
              ...tokens.shadow.card,
            })}
          >
            <View style={{ borderRadius: tokens.radius.xl, overflow: 'hidden' }}>
            <Image
              source={productImage(pro)}
              style={{ width: '100%', height: 168, backgroundColor: tokens.color.accent }}
              contentFit="cover"
              transition={220}
            />
            {/* A bottom-up gradient keeps the label legible without flattening
                the artwork the way a uniform scrim does. */}
            <LinearGradient
              colors={['rgba(20,14,54,0.05)', 'rgba(20,14,54,0.55)', 'rgba(20,14,54,0.88)']}
              locations={[0, 0.45, 1]}
              style={{ position: 'absolute', inset: 0 }}
            />
            <View style={{ position: 'absolute', inset: 0, padding: tokens.space.xl, justifyContent: 'flex-end' }}>
              <View
                style={{
                  alignSelf: 'flex-start',
                  backgroundColor: 'rgba(255,255,255,0.22)',
                  paddingHorizontal: tokens.space.md,
                  paddingVertical: 5,
                  borderRadius: tokens.radius.pill,
                  marginBottom: tokens.space.md,
                }}
              >
                <Text style={{ ...tokens.text.caption, color: '#FFFFFF' }}>MEMBERSHIP</Text>
              </View>
              <Text style={{ ...tokens.text.title, fontSize: 24, color: '#FFFFFF' }}>{pro.name}</Text>
              <Text
                style={{
                  ...tokens.text.body,
                  fontSize: 14,
                  color: 'rgba(255,255,255,0.86)',
                  marginTop: 2,
                }}
                numberOfLines={2}
              >
                {formatMoney(pro.priceCents, pro.currency)} a month · every pack included
              </Text>
            </View>
            </View>
          </Pressable>
        </Link>
      ) : null}

      <Text
        style={{
          ...tokens.text.label,
          color: tokens.color.textFaint,
          textTransform: 'uppercase',
          letterSpacing: 0.8,
          marginTop: tokens.space.sm,
          marginBottom: tokens.space.lg,
        }}
      >
        All packs
      </Text>

      {products.map((p) => (
        <ProductCard key={p.id} product={p} />
      ))}
    </Screen>
  );
}
