export interface WalletInfo {
  id: string;
  name: string;
  icon: string;
  installUrl: string;
  deepLink: string;
  universalLink?: string;
}

export const WALLETS: WalletInfo[] = [
  {
    id: 'phantom',
    name: 'Phantom',
    icon: '👻',
    installUrl: 'https://phantom.app/',
    deepLink: 'phantom://connect',
    universalLink: 'https://phantom.app/ul/v1/connect',
  },
  {
    id: 'solflare',
    name: 'Solflare',
    icon: '☀️',
    installUrl: 'https://solflare.com/',
    deepLink: 'solflare://connect',
    universalLink: 'https://solflare.com/ul/v1/connect',
  },
];

export function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false;

  return (
    /android|iphone|ipad|ipod/i.test(navigator.userAgent.toLowerCase()) ||
    ('ontouchstart' in window && window.innerWidth < 768)
  );
}

export function isPhantomBrowser(): boolean {
  return /phantom/i.test(navigator.userAgent.toLowerCase());
}

export function isSolflareBrowser(): boolean {
  return /solflare/i.test(navigator.userAgent.toLowerCase());
}

export function isWalletBrowser(): boolean {
  return isPhantomBrowser() || isSolflareBrowser();
}

/* =========================
   🔥 FIX: TRUE CONNECTION SOURCE
   DO NOT USE isConnected
========================= */
export function checkExistingConnection(): string | null {
  if (typeof window === 'undefined') return null;

  try {
    const provider = window.solana;

    // ✔ FIX: publicKey ONLY is reliable on mobile
    if (provider?.isPhantom && provider?.publicKey) {
      return provider.publicKey.toString();
    }
  } catch {}

  return null;
}

/* =========================
   CACHE SYSTEM
========================= */
export function cacheWallet(address: string) {
  sessionStorage.setItem('wallet_address', address);
  localStorage.setItem('wallet_address', address);
}

export function getCachedWallet(): string | null {
  return (
    sessionStorage.getItem('wallet_address') ||
    localStorage.getItem('wallet_address')
  );
}

export function clearWalletCache() {
  sessionStorage.removeItem('wallet_address');
  localStorage.removeItem('wallet_address');
}