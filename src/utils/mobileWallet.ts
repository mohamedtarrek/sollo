export interface WalletInfo {
  id: string;
  name: string;
  icon: string;
  installUrl: string;
  deepLink: string;
}

export const WALLETS: WalletInfo[] = [
  {
    id: 'phantom',
    name: 'Phantom',
    icon: '👻',
    installUrl: 'https://phantom.app/',
    deepLink: 'https://phantom.app/ul/v1/connect'
  },
  {
    id: 'solflare',
    name: 'Solflare',
    icon: '☀️',
    installUrl: 'https://solflare.com/',
    deepLink: 'https://solflare.com/ul/v1/connect'
  },
  {
    id: 'trust',
    name: 'Trust Wallet',
    icon: '🐉',
    installUrl: 'https://trustwallet.com/',
    deepLink: 'https://link.trustwallet.com/open_url'
  },
  {
    id: 'coinbase',
    name: 'Coinbase Wallet',
    icon: '🔵',
    installUrl: 'https://www.coinbase.com/wallet',
    deepLink: 'https://wallet.coinbase.com/browser'
  },
  {
    id: 'exodus',
    name: 'Exodus',
    icon: '🚀',
    installUrl: 'https://exodus.com/',
    deepLink: 'https://www.exodus.com/redirect'
  },
  {
    id: 'sollet',
    name: 'Sollet',
    icon: '🎈',
    installUrl: 'https://sollet.io/',
    deepLink: 'https://www.sollet.io/'
  }
];

export function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false;

  const ua = navigator.userAgent.toLowerCase();

  return (
    /android|iphone|ipad|ipod/i.test(ua) ||
    ('ontouchstart' in window && window.innerWidth < 768)
  );
}

export function isWalletBrowser(): boolean {
  if (typeof window === 'undefined') return false;
  const ua = navigator.userAgent.toLowerCase();
  return ua.includes('phantom') || ua.includes('solflare');
}

/* 🔥 FIXED: Deep link builder */
export function buildDeepLink(walletId: string): string {
  const url = encodeURIComponent(window.location.href);

  switch (walletId) {
    case 'phantom':
      return `https://phantom.app/ul/v1/connect?app_url=${url}&redirect_link=${url}&cluster=devnet`;

    case 'solflare':
      return `https://solflare.com/ul/v1/connect?redirect_url=${url}&cluster=devnet`;

    case 'trust':
      return `https://link.trustwallet.com/open_url?url=${url}`;

    case 'coinbase':
      return `https://wallet.coinbase.com/browser?url=${url}`;

    case 'exodus':
      return `https://www.exodus.com/redirect?url=${url}`;

    default:
      return `https://phantom.app/ul/v1/connect?app_url=${url}`;
  }
}

/* 🔥 FIXED: session recovery (important) */
export function getCachedWalletAddress(): string | null {
  try {
    const addr = sessionStorage.getItem('wallet_address');
    return addr ?? null;
  } catch {
    return null;
  }
}

export function cacheWalletAddress(address: string): void {
  sessionStorage.setItem('wallet_address', address);
}