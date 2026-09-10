import { Image } from 'expo-image';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useState } from 'react';
import { Alert, Pressable, Text, TextInput, View } from 'react-native';
import { api } from '../../src/api/client';
import type { CartItem, Product } from '../../src/api/types';
import { Button } from '../../src/components/Button';
import { Card } from '../../src/components/Card';
import { EmptyState } from '../../src/components/EmptyState';
import { Screen } from '../../src/components/Screen';
import { checkoutReturnUrl, startCheckout } from '../../src/lib/checkout';
import { productImage } from '../../src/lib/images';
import { cartSubtotalCents, formatMoney } from '../../src/lib/money';
import { useSession } from '../../src/state/session';
import { tokens } from '../../src/theme/tokens';

export default function Cart() {
  const { cart, remove, customer, refreshCart } = useSession();
  const [products, setProducts] = useState<Product[]>([]);
  const [promo, setPromo] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api
      .products()
      .then(setProducts)
      .catch(() => setProducts([]));
  }, []);

  const lines = cart
    .map((item) => ({ item, product: products.find((p) => p.id === item.productId) }))
    .filter((l): l is { item: CartItem; product: Product } => Boolean(l.product));

  const subtotal = cartSubtotalCents(cart, products);
  const currency = lines[0]?.product.currency ?? 'USD';

  if (!cart.length) {
    return (
      <Screen>
        <EmptyState
          title="Your cart is empty"
          body="Browse the store and add a pack to get started."
          icon="bag-outline"
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <Card padded={false} style={{ marginBottom: tokens.space.xl, overflow: 'hidden' }}>
        {lines.map(({ item, product }, i) => (
          <View
            key={item.productId}
            style={{
              flexDirection: 'row',
              gap: tokens.space.lg,
              padding: tokens.space.lg,
              alignItems: 'center',
              borderTopWidth: i === 0 ? 0 : 1,
              borderTopColor: tokens.color.border,
            }}
          >
            <Image
              source={productImage(product)}
              style={{
                width: 60,
                height: 60,
                borderRadius: tokens.radius.md,
                backgroundColor: tokens.color.surfaceAlt,
              }}
              contentFit="cover"
            />
            <View style={{ flex: 1 }}>
              <Text
                style={{ ...tokens.text.label, fontSize: 15, color: tokens.color.text }}
                numberOfLines={1}
              >
                {product.name}
              </Text>
              <Text
                style={{
                  ...tokens.text.body,
                  fontSize: 13,
                  color: tokens.color.textDim,
                  marginTop: 2,
                }}
              >
                {formatMoney(product.priceCents, product.currency)} · qty {item.quantity}
              </Text>
            </View>
            <Pressable onPress={() => void remove(item.productId)} hitSlop={12}>
              <Ionicons name="close-circle" size={22} color={tokens.color.textFaint} />
            </Pressable>
          </View>
        ))}
      </Card>

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: tokens.color.surface,
          borderRadius: tokens.radius.md + 2,
          paddingHorizontal: tokens.space.lg,
          borderWidth: 1,
          borderColor: tokens.color.border,
          marginBottom: tokens.space.xl,
        }}
      >
        <Ionicons name="pricetag-outline" size={17} color={tokens.color.textFaint} />
        <TextInput
          value={promo}
          onChangeText={setPromo}
          placeholder="Promo code"
          placeholderTextColor={tokens.color.textFaint}
          autoCapitalize="characters"
          autoCorrect={false}
          style={{
            flex: 1,
            paddingVertical: 15,
            paddingLeft: tokens.space.md,
            color: tokens.color.text,
            ...tokens.text.label,
            fontSize: 15,
          }}
        />
      </View>

      <Card style={{ marginBottom: tokens.space.xl }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={{ ...tokens.text.body, color: tokens.color.textDim }}>Subtotal</Text>
          <Text style={{ ...tokens.text.heading, color: tokens.color.text }}>
            {formatMoney(subtotal, currency)}
          </Text>
        </View>
        <Text
          style={{
            ...tokens.text.caption,
            color: tokens.color.textFaint,
            marginTop: tokens.space.sm,
          }}
        >
          Tax is calculated by Dodo Payments at checkout.
        </Text>
      </Card>

      <Button
        title="Checkout"
        loading={busy}
        onPress={async () => {
          setBusy(true);
          try {
            const { checkout_url } = await api.checkout(
              customer.id,
              promo || undefined,
              checkoutReturnUrl(),
            );
            if (!checkout_url) throw new Error('the backend returned no checkout url');
            await startCheckout(checkout_url);
            // The webhook is the authoritative signal and may arrive first, so
            // the cart is refetched rather than assumed cleared.
            await refreshCart();
          } catch (e) {
            Alert.alert('Checkout failed', String(e));
          } finally {
            setBusy(false);
          }
        }}
      />
    </Screen>
  );
}
