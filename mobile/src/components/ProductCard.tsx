import { Image } from 'expo-image';
import { Link } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import type { Product } from '../api/types';
import { productImage } from '../lib/images';
import { formatMoney } from '../lib/money';
import { tokens } from '../theme/tokens';

export function ProductCard({ product }: { product: Product }) {
  return (
    <Link href={`/product/${product.id}`} asChild>
      <Pressable
        style={({ pressed }) => ({
          backgroundColor: tokens.color.surface,
          borderRadius: tokens.radius.xl,
          borderWidth: 1,
          borderColor: tokens.color.border,
          padding: tokens.space.sm + 2,
          marginBottom: tokens.space.lg,
          transform: [{ scale: pressed ? 0.985 : 1 }],
          ...tokens.shadow.card,
        })}
      >
        <Image
          source={productImage(product)}
          style={{
            width: '100%',
            aspectRatio: 3 / 2,
            borderRadius: tokens.radius.lg,
            backgroundColor: tokens.color.surfaceAlt,
          }}
          contentFit="cover"
          transition={220}
        />

        <View style={{ padding: tokens.space.md, paddingTop: tokens.space.lg }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: tokens.space.md,
            }}
          >
            <Text
              style={{ ...tokens.text.heading, color: tokens.color.text, flex: 1 }}
              numberOfLines={1}
            >
              {product.name}
            </Text>

            {/* The price sits in a tinted pill so it reads as an action, not
                as another line of body copy. */}
            <View
              style={{
                backgroundColor: tokens.color.accentSoft,
                paddingHorizontal: tokens.space.md,
                paddingVertical: 6,
                borderRadius: tokens.radius.pill,
              }}
            >
              <Text style={{ ...tokens.text.label, color: tokens.color.accent }}>
                {formatMoney(product.priceCents, product.currency)}
              </Text>
            </View>
          </View>

          {product.description ? (
            <Text
              style={{
                ...tokens.text.body,
                fontSize: 14,
                color: tokens.color.textDim,
                marginTop: tokens.space.sm,
              }}
              numberOfLines={2}
            >
              {product.description}
            </Text>
          ) : null}
        </View>
      </Pressable>
    </Link>
  );
}
