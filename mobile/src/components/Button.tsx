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
  const style = {
    primary: {
      bg: tokens.color.accent,
      fg: tokens.color.accentText,
      border: 'transparent',
      shadow: tokens.shadow.soft,
    },
    secondary: {
      bg: tokens.color.surface,
      fg: tokens.color.text,
      border: tokens.color.border,
      shadow: tokens.shadow.soft,
    },
    danger: {
      bg: tokens.color.dangerSoft,
      fg: tokens.color.danger,
      border: 'transparent',
      shadow: undefined,
    },
  }[variant];

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => ({
        backgroundColor: style.bg,
        opacity: disabled ? 0.45 : 1,
        transform: [{ scale: pressed ? 0.975 : 1 }],
        paddingVertical: 15,
        paddingHorizontal: tokens.space.xl,
        borderRadius: tokens.radius.md + 2,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: style.border,
        ...(style.shadow ?? {}),
      })}
    >
      {loading ? (
        <ActivityIndicator color={style.fg} />
      ) : (
        <Text style={{ ...tokens.text.label, fontSize: 15, color: style.fg }}>{title}</Text>
      )}
    </Pressable>
  );
}
