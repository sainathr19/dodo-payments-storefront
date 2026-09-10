import { Text } from 'react-native';
import { formatMoney } from '../lib/money';
import { tokens } from '../theme/tokens';

export function PriceTag({
  cents,
  currency,
  suffix,
  size = 'md',
}: {
  cents: number;
  currency: string;
  suffix?: string;
  size?: 'md' | 'lg';
}) {
  return (
    <Text
      style={{
        color: tokens.color.text,
        fontSize: size === 'lg' ? 24 : 16,
        fontWeight: '600',
      }}
    >
      {formatMoney(cents, currency)}
      {suffix ? <Text style={{ color: tokens.color.textDim, fontSize: 13 }}>{suffix}</Text> : null}
    </Text>
  );
}
