import { Text, View } from 'react-native';
import { tokens } from '../theme/tokens';

export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <View style={{ paddingVertical: tokens.space.xxl * 2, alignItems: 'center' }}>
      <Text
        style={{ ...tokens.text.heading, color: tokens.color.text, marginBottom: tokens.space.sm }}
      >
        {title}
      </Text>
      <Text style={{ ...tokens.text.body, color: tokens.color.textDim, textAlign: 'center' }}>
        {body}
      </Text>
    </View>
  );
}
