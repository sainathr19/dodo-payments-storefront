export const tokens = {
  color: {
    bg: '#08080C',
    surface: '#16161F',
    surfaceHigh: '#22222E',
    border: '#2E2E3B',
    text: '#F5F5F7',
    textDim: '#9A9AA8',
    accent: '#7C5CFF',
    accentText: '#FFFFFF',
    success: '#3DD68C',
    danger: '#FF6B6B',
  },
  space: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 },
  radius: { sm: 8, md: 12, lg: 18, pill: 999 },
  text: {
    title: { fontSize: 28, fontWeight: '700' as const, letterSpacing: -0.5 },
    heading: { fontSize: 20, fontWeight: '600' as const },
    body: { fontSize: 15, fontWeight: '400' as const },
    label: { fontSize: 13, fontWeight: '500' as const },
    mono: { fontSize: 12, fontFamily: 'Menlo' },
  },
} as const;
