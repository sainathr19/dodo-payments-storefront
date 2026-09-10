import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { Alert, Pressable, Text, TextInput, View } from 'react-native';
import { api } from '../../src/api/client';
import type { CartItem, Product } from '../../src/api/types';
import { Button } from '../../src/components/Button';
import { EmptyState } from '../../src/components/EmptyState';
import { Screen } from '../../src/components/Screen';
import { checkoutReturnUrl, startCheckout } from '../../src/lib/checkout';
import { cartSubtotalCents, formatMoney } from '../../src/lib/money';
import { useSession } from '../../src/state/session';
import { productImage } from '../../src/lib/images';
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
        />
      </Screen>
    );
  }

  return (
    <Screen>
      {lines.map(({ item, product }) => (
        <View
          key={item.productId}
          style={{
            flexDirection: 'row',
            gap: tokens.space.md,
            backgroundColor: tokens.color.surface,
            borderRadius: tokens.radius.md,
            padding: tokens.space.md,
            marginBottom: tokens.space.md,
            alignItems: 'center',
          }}
        >
          <Image
            source={productImage(product)}
            style={{
              width: 56,
              height: 56,
              borderRadius: tokens.radius.sm,
              backgroundColor: tokens.color.surfaceHigh,
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
            <Text style={{ ...tokens.text.body, fontSize: 13, color: tokens.color.textDim }}>
              {formatMoney(product.priceCents, product.currency)} x {item.quantity}
            </Text>
          </View>
          <Pressable onPress={() => void remove(item.productId)} hitSlop={12}>
            <Text style={{ color: tokens.color.danger, ...tokens.text.label }}>Remove</Text>
          </Pressable>
        </View>
      ))}

      <TextInput
        value={promo}
        onChangeText={setPromo}
        placeholder="Promo code"
        placeholderTextColor={tokens.color.textDim}
        autoCapitalize="characters"
        style={{
          backgroundColor: tokens.color.surface,
          borderWidth: 1,
          borderColor: tokens.color.border,
          borderRadius: tokens.radius.md,
          paddingHorizontal: tokens.space.lg,
          paddingVertical: tokens.space.md,
          color: tokens.color.text,
          marginTop: tokens.space.lg,
        }}
      />

      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          marginTop: tokens.space.xl,
          marginBottom: tokens.space.lg,
        }}
      >
        <Text style={{ ...tokens.text.heading, color: tokens.color.textDim }}>Subtotal</Text>
        <Text style={{ ...tokens.text.heading, color: tokens.color.text }}>
          {formatMoney(subtotal, currency)}
        </Text>
      </View>

      <Text
        style={{
          ...tokens.text.body,
          fontSize: 12,
          color: tokens.color.textDim,
          marginBottom: tokens.space.md,
        }}
      >
        Tax is calculated by Dodo Payments at checkout.
      </Text>

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
