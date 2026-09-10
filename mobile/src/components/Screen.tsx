import { ScrollView, View } from 'react-native';
import { tokens } from '../theme/tokens';

export function Screen({
  children,
  scroll = true,
}: {
  children: React.ReactNode;
  scroll?: boolean;
}) {
  const style = { flex: 1, backgroundColor: tokens.color.bg };
  if (!scroll) return <View style={style}>{children}</View>;
  return (
    <ScrollView
      style={style}
      contentContainerStyle={{ padding: tokens.space.lg, paddingBottom: tokens.space.xxl }}
    >
      {children}
    </ScrollView>
  );
}
