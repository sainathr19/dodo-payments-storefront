import { Image } from 'expo-image';
import { Link } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import type { Product } from '../api/types';
import { tokens } from '../theme/tokens';
import { PriceTag } from './PriceTag';

export function ProductCard({ product }: { product: Product }) {
  return (
    <Link href={`/product/${product.id}`} asChild>
      <Pressable
        style={({ pressed }) => ({
          backgroundColor: tokens.color.surface,
          borderRadius: tokens.radius.lg,
          overflow: 'hidden',
          borderWidth: 1,
          borderColor: tokens.color.border,
          opacity: pressed ? 0.85 : 1,
          marginBottom: tokens.space.lg,
        })}
      >
        <Image
          source={product.image}
          style={{ width: '100%', aspectRatio: 4 / 3, backgroundColor: tokens.color.surfaceHigh }}
          contentFit="cover"
          transition={200}
        />
        <View style={{ padding: tokens.space.lg }}>
          <Text style={{ ...tokens.text.heading, color: tokens.color.text }} numberOfLines={1}>
            {product.name}
          </Text>
          {product.description ? (
            <Text
              style={{
                ...tokens.text.body,
                color: tokens.color.textDim,
                marginTop: tokens.space.xs,
              }}
              numberOfLines={2}
            >
              {product.description}
            </Text>
          ) : null}
          <View style={{ marginTop: tokens.space.md }}>
            <PriceTag cents={product.priceCents} currency={product.currency} />
          </View>
        </View>
      </Pressable>
    </Link>
  );
}
