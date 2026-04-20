// Farcaster Mini App SDK init — separate file for Vite reliability
// Uses window 'load' event instead of top-level await (which Vite bundles unreliably)
window.addEventListener('load', async () => {
  try {
    const { sdk } = await import('https://esm.sh/@farcaster/miniapp-sdk@0.3.0');
    window.__farcasterSdk = sdk;
    await sdk.actions.ready();
    console.log('[Farcaster SDK] ready() called');
    window.dispatchEvent(new CustomEvent('farcaster:ready', { detail: sdk }));
  } catch (e) {
    console.warn('[Farcaster SDK] init failed:', e);
    window.dispatchEvent(new CustomEvent('farcaster:error', { detail: e }));
  }
});
