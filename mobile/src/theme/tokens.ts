// A warm light palette. The ground is off-white rather than pure white so that
// white cards read as raised without needing heavy shadows, which is what gives
// the layout its depth.
export const tokens = {
  color: {
    bg: '#F6F5F1',
    surface: '#FFFFFF',
    surfaceAlt: '#EFEDE6',
    border: '#E7E4DC',
    borderStrong: '#D9D5CA',
    text: '#191822',
    textDim: '#78747F',
    textFaint: '#A5A1AC',
    accent: '#5B3DF5',
    accentSoft: '#EEEBFF',
    accentText: '#FFFFFF',
    success: '#118750',
    successSoft: '#E3F4EB',
    danger: '#D23A3F',
    dangerSoft: '#FCEBEB',
  },
  space: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 44 },
  radius: { sm: 10, md: 14, lg: 20, xl: 28, pill: 999 },
  text: {
    display: { fontSize: 34, fontWeight: '700' as const, letterSpacing: -1 },
    title: { fontSize: 26, fontWeight: '700' as const, letterSpacing: -0.6 },
    heading: { fontSize: 19, fontWeight: '600' as const, letterSpacing: -0.3 },
    body: { fontSize: 15, fontWeight: '400' as const, lineHeight: 22 },
    label: { fontSize: 13, fontWeight: '600' as const, letterSpacing: -0.1 },
    caption: { fontSize: 12, fontWeight: '500' as const },
    mono: { fontSize: 11, fontFamily: 'Menlo' },
  },
  // iOS-style elevation: wide, faint, and low-contrast. Anything darker reads
  // as a drop shadow from 2012.
  shadow: {
    card: {
      shadowColor: '#1A1523',
      shadowOpacity: 0.07,
      shadowRadius: 20,
      shadowOffset: { width: 0, height: 8 },
      elevation: 3,
    },
    soft: {
      shadowColor: '#1A1523',
      shadowOpacity: 0.05,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 3 },
      elevation: 2,
    },
  },
} as const;
