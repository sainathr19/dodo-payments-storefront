import { View, ViewStyle } from 'react-native';
import { tokens } from '../theme/tokens';

/// The standard raised surface. Everything that groups content sits on one of
/// these so elevation stays consistent across screens.
export function Card({
  children,
  style,
  padded = true,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
  padded?: boolean;
}) {
  return (
    <View
      style={{
        backgroundColor: tokens.color.surface,
        borderRadius: tokens.radius.lg,
        borderWidth: 1,
        borderColor: tokens.color.border,
        padding: padded ? tokens.space.lg : 0,
        ...tokens.shadow.soft,
        ...style,
      }}
    >
      {children}
    </View>
  );
}
