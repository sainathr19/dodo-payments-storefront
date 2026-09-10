import { ActivityIndicator, Pressable, Text } from 'react-native';
import { tokens } from '../theme/tokens';

type Props = {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
  loading?: boolean;
};

export function Button({ title, onPress, variant = 'primary', disabled, loading }: Props) {
  const background = {
    primary: tokens.color.accent,
    secondary: tokens.color.surfaceHigh,
    danger: 'transparent',
  }[variant];
  const color = variant === 'danger' ? tokens.color.danger : tokens.color.text;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => ({
        backgroundColor: background,
        opacity: disabled ? 0.4 : pressed ? 0.8 : 1,
        paddingVertical: tokens.space.md + 2,
        paddingHorizontal: tokens.space.xl,
        borderRadius: tokens.radius.md,
        alignItems: 'center',
        borderWidth: variant === 'danger' ? 1 : 0,
        borderColor: tokens.color.danger,
      })}
    >
      {loading ? (
        <ActivityIndicator color={color} />
      ) : (
        <Text style={{ ...tokens.text.label, fontSize: 15, color }}>{title}</Text>
      )}
    </Pressable>
  );
}
