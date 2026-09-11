import { Image } from 'expo-image';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, Text, TextInput, View } from 'react-native';
import { api } from '../../src/api/client';
import { ApiError, isNotFound } from '../../src/api/errors';
import type { CartItem, CartTotals, Product } from '../../src/api/types';
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
  const [totals, setTotals] = useState<CartTotals | null>(null);
  const [pricing, setPricing] = useState(false);
  const [promoError, setPromoError] = useState<string | null>(null);
  // Identifies the newest request so a slow earlier response cannot overwrite
  // the total with a stale one.
  const requestId = useRef(0);

  useEffect(() => {
    api
      .products()
      .then(setProducts)
      .catch(() => setProducts([]));
  }, []);

  // Dodo owns the discount rules, so the total comes from Dodo. Debounced so a
  // preview is not requested on every keystroke.
  useEffect(() => {
    if (!cart.length) {
      setTotals(null);
      return;
    }
    const code = promo.trim();
    const id = ++requestId.current;
    setPricing(true);

    const timer = setTimeout(() => {
      api
        .preview(customer.id, code || undefined)
        .then((t) => {
          if (id !== requestId.current) return;
          setTotals(t);
          // A code Dodo accepts but that discounts nothing still deserves
          // saying so, rather than leaving an unchanged total unexplained.
          setPromoError(
            code && t.discountCents === 0 ? 'That code does not apply to this cart' : null,
          );
        })
        .catch((e: unknown) => {
          if (id !== requestId.current) return;
          setTotals(null);
          if (!code) {
            setPromoError(null);
          } else if (isNotFound(e)) {
            // Dodo replies 404 with wording like "Discount code 'X' doesn't
            // exist". Its message is more specific than anything generic here.
            setPromoError(e instanceof ApiError ? e.message : 'That code is not valid');
          } else {
            setPromoError('Could not check that code. Check your connection.');
          }
        })
        .finally(() => {
          if (id === requestId.current) setPricing(false);
        });
    }, 450);

    return () => clearTimeout(timer);
  }, [cart, promo, customer.id]);

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
        <Ionicons
          name="pricetag-outline"
          size={17}
          color={promoError ? tokens.color.danger : tokens.color.textFaint}
        />
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
        {pricing ? <ActivityIndicator size="small" color={tokens.color.textFaint} /> : null}
        {!pricing && totals && totals.discountCents > 0 ? (
          <Ionicons name="checkmark-circle" size={19} color={tokens.color.success} />
        ) : null}
      </View>

      {promoError ? (
        <Text
          style={{
            ...tokens.text.caption,
            color: tokens.color.danger,
            marginTop: -tokens.space.md,
            marginBottom: tokens.space.lg,
            marginLeft: tokens.space.xs,
          }}
        >
          {promoError}
        </Text>
      ) : null}

      <Card style={{ marginBottom: tokens.space.xl }}>
        <Row
          label="Subtotal"
          value={formatMoney(totals?.subtotalCents ?? subtotal, totals?.currency ?? currency)}
        />

        {totals && totals.discountCents > 0 ? (
          <Row
            label="Discount"
            value={`-${formatMoney(totals.discountCents, totals.currency)}`}
            tone="good"
          />
        ) : null}

        {totals && totals.taxCents > 0 ? (
          <Row label="Tax" value={formatMoney(totals.taxCents, totals.currency)} />
        ) : null}

        <View
          style={{
            height: 1,
            backgroundColor: tokens.color.border,
            marginVertical: tokens.space.md,
          }}
        />

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ ...tokens.text.heading, color: tokens.color.text }}>Total</Text>
          {pricing && !totals ? (
            <ActivityIndicator size="small" color={tokens.color.textFaint} />
          ) : (
            <Text style={{ ...tokens.text.title, fontSize: 22, color: tokens.color.text }}>
              {formatMoney(totals?.totalCents ?? subtotal, totals?.currency ?? currency)}
            </Text>
          )}
        </View>

        <Text
          style={{
            ...tokens.text.caption,
            color: tokens.color.textFaint,
            marginTop: tokens.space.sm,
          }}
        >
          {totals && totals.taxCents > 0
            ? 'Priced by Dodo Payments.'
            : 'Tax is calculated by Dodo Payments at checkout.'}
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

/// One line of the money breakdown. Kept here rather than in components/ because
/// nothing else lays money out this way.
function Row({
  label,
  value,
  tone = 'plain',
}: {
  label: string;
  value: string;
  tone?: 'plain' | 'good';
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: tokens.space.sm,
      }}
    >
      <Text style={{ ...tokens.text.body, color: tokens.color.textDim }}>{label}</Text>
      <Text
        style={{
          ...tokens.text.label,
          fontSize: 15,
          color: tone === 'good' ? tokens.color.success : tokens.color.text,
        }}
      >
        {value}
      </Text>
    </View>
  );
}
