import { Text, View } from 'react-native';
import { tokens } from '../theme/tokens';

export function Badge({
  label,
  tone = 'neutral',
}: {
  label: string;
  tone?: 'neutral' | 'good' | 'bad';
}) {
  const color = {
    neutral: tokens.color.textDim,
    good: tokens.color.success,
    bad: tokens.color.danger,
  }[tone];
  return (
    <View
      style={{
        alignSelf: 'flex-start',
        paddingHorizontal: tokens.space.sm + 2,
        paddingVertical: tokens.space.xs,
        borderRadius: tokens.radius.pill,
        borderWidth: 1,
        borderColor: color,
      }}
    >
      <Text style={{ ...tokens.text.label, fontSize: 11, color }}>{label.toUpperCase()}</Text>
    </View>
  );
}
