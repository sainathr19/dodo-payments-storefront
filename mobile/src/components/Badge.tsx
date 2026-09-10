import { Text, View } from 'react-native';
import { tokens } from '../theme/tokens';

// Tinted fills rather than outlines: on a light ground an outlined pill reads as
// an empty input field, while a soft fill reads as a status.
export function Badge({
  label,
  tone = 'neutral',
}: {
  label: string;
  tone?: 'neutral' | 'good' | 'bad' | 'accent';
}) {
  const { bg, fg } = {
    neutral: { bg: tokens.color.surfaceAlt, fg: tokens.color.textDim },
    good: { bg: tokens.color.successSoft, fg: tokens.color.success },
    bad: { bg: tokens.color.dangerSoft, fg: tokens.color.danger },
    accent: { bg: tokens.color.accentSoft, fg: tokens.color.accent },
  }[tone];

  return (
    <View
      style={{
        alignSelf: 'flex-start',
        backgroundColor: bg,
        paddingHorizontal: tokens.space.md,
        paddingVertical: 5,
        borderRadius: tokens.radius.pill,
      }}
    >
      <Text style={{ ...tokens.text.caption, color: fg, letterSpacing: 0.2 }}>{label}</Text>
    </View>
  );
}
