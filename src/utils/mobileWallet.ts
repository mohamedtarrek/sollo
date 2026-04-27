export interface WalletInfo {
  id: string;
  name: string;
  icon: string;
  installUrl: string;
  deepLink: string;
  universalLink?: string;
}

// CORRECT DEEP LINKS FOR MOBILE (UPDATED)
export const WALLETS: WalletInfo[] = [
  {
    id: 'phantom',
    name: 'Phantom',
    icon: '👻',
    installUrl: 'https://phantom.app/',
    deepLink: 'phantom://connect',
    universalLink: 'https://phantom.app/ul/browse/',
  },
  {
    id: 'solflare',
    name: 'Solflare',
    icon: '☀️',
    installUrl: 'https://solflare.com/',
    deepLink: 'solflare://',
    universalLink: 'https://solflare.com/ul/',
  },
  {
    id: 'trust',
    name: 'Trust Wallet',
    icon: '🐉',
    installUrl: 'https://trustwallet.com/',
    deepLink: 'trust://browser_enable',
  },
  {
    id: 'coinbase',
    name: 'Coinbase Wallet',
    icon: '🔵',
    installUrl: 'https://www.coinbase.com/wallet',
    deepLink: 'cbwallet://',
  },
  {
    id: 'exodus',
    name: 'Exodus',
    icon: '🚀',
    installUrl: 'https://exodus.com/',
    deepLink: 'exodus://',
  },
  {
    id: 'sollet',
    name: 'Sollet',
    icon: '🎈',
    installUrl: 'https://sollet.io/',
    deepLink: 'https://www.sollet.io/',
  },
];

export function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false;
  const userAgent = navigator.userAgent.toLowerCase();
  return /android|iphone|ipad|ipod|opera mini|iemobile|wpdesktop/i.test(userAgent) ||
    ('ontouchstart' in window && window.innerWidth < 768);
}

export function isPhantomBrowser(): boolean {
  if (typeof window === 'undefined') return false;
  const ua = navigator.userAgent.toLowerCase();
  return /phantom/i.test(ua);
}

export function isSolflareBrowser(): boolean {
  if (typeof window === 'undefined') return false;
  const ua = navigator.userAgent.toLowerCase();
  return /solflare/i.test(ua);
}

export function isWalletBrowser(): boolean {
  return isPhantomBrowser() || isSolflareBrowser();
}

export function getInstallUrl(walletId: string): string {
  const wallet = WALLETS.find(w => w.id === walletId);
  return wallet?.installUrl ?? 'https://phantom.app/';
}

export function checkExistingConnection(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    if (window.solana?.isPhantom && window.solana?.isConnected && window.solana?.publicKey) {
      return window.solana.publicKey.toString();
    }
    if (window.solflare?.isSolflare && window.solflare.isConnected && window.solflare.publicKey) {
      return window.solflare.publicKey.toString();
    }
  } catch {
    // Ignore
  }
  return null;
}

export function cacheWalletAddress(address: string): void {
  try {
    sessionStorage.setItem('wallet_address', address);
    sessionStorage.setItem('wallet_connected_at', Date.now().toString());
  } catch {}
}

export function getCachedWalletAddress(): string | null {
  try {
    const cached = sessionStorage.getItem('wallet_address');
    const timestamp = sessionStorage.getItem('wallet_connected_at');
    if (cached && timestamp) {
      const age = Date.now() - parseInt(timestamp);
      if (age < 3600000) {
        return cached;
      }
    }
  } catch {}
  return null;
}

export function clearWalletCache(): void {
  try {
    sessionStorage.removeItem('wallet_address');
    sessionStorage.removeItem('wallet_connected_at');
    sessionStorage.removeItem('wallet_redirect');
    sessionStorage.removeItem('wallet_id');
    sessionStorage.removeItem('wallet_connect_started');
  } catch {}
}