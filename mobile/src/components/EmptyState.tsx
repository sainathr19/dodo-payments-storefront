import Ionicons from '@expo/vector-icons/Ionicons';
import { Text, View } from 'react-native';
import { tokens } from '../theme/tokens';

export function EmptyState({
  title,
  body,
  icon = 'sparkles-outline',
}: {
  title: string;
  body: string;
  icon?: React.ComponentProps<typeof Ionicons>['name'];
}) {
  return (
    <View style={{ paddingVertical: tokens.space.xxxl * 2, alignItems: 'center' }}>
      <View
        style={{
          width: 72,
          height: 72,
          borderRadius: tokens.radius.pill,
          backgroundColor: tokens.color.accentSoft,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: tokens.space.xl,
        }}
      >
        <Ionicons name={icon} size={30} color={tokens.color.accent} />
      </View>
      <Text
        style={{ ...tokens.text.heading, color: tokens.color.text, marginBottom: tokens.space.sm }}
      >
        {title}
      </Text>
      <Text
        style={{
          ...tokens.text.body,
          color: tokens.color.textDim,
          textAlign: 'center',
          maxWidth: 280,
        }}
      >
        {body}
      </Text>
    </View>
  );
}
