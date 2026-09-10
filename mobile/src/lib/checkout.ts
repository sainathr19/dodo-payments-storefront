import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';

// The URL Dodo should redirect to once payment completes. It must be computed
// at runtime, not hardcoded: a standalone build resolves to `palette://...`,
// while Expo Go resolves to `exp://<host>:8081/--/...`. Sending the wrong one
// leaves the browser on an address iOS refuses to open, and the sheet never
// hands control back to the app.
export function checkoutReturnUrl(): string {
  return Linking.createURL('checkout-return');
}

// Opens Dodo's hosted checkout in a native auth session. There is no Dodo React
// Native SDK; `dodopayments-checkout` on npm is an iframe library that cannot
// run here, so the hosted page in a web sheet is the correct path.
export async function startCheckout(url: string): Promise<'completed' | 'dismissed'> {
  const result = await WebBrowser.openAuthSessionAsync(url, checkoutReturnUrl());
  return result.type === 'success' ? 'completed' : 'dismissed';
}
