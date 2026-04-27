export interface WalletInfo {
  id: string;
  name: string;
  icon: string;
  installUrl: string;
  deepLink: string;
  fallbackDeepLink?: string;
}

export const WALLETS: WalletInfo[] = [
  {
    id: 'phantom',
    name: 'Phantom',
    icon: '👻',
    installUrl: 'https://phantom.app/',
    deepLink: 'phantom://connect',
    fallbackDeepLink: 'https://phantom.app/',
  },
  {
    id: 'solflare',
    name: 'Solflare',
    icon: '☀️',
    installUrl: 'https://solflare.com/',
    deepLink: 'solflare://connect',
    fallbackDeepLink: 'https://solflare.com/',
  },
  {
    id: 'trust',
    name: 'Trust Wallet',
    icon: '🐉',
    installUrl: 'https://trustwallet.com/',
    deepLink: 'trust://connect',
    fallbackDeepLink: 'https://trustwallet.com/',
  },
  {
    id: 'coinbase',
    name: 'Coinbase Wallet',
    icon: '🔵',
    installUrl: 'https://www.coinbase.com/wallet/downloads',
    deepLink: 'cbwallet://connect',
    fallbackDeepLink: 'https://www.coinbase.com/wallet/downloads',
  },
  {
    id: 'exodus',
    name: 'Exodus',
    icon: '🚀',
    installUrl: 'https://exodus.com/',
    deepLink: 'exodus://connect',
    fallbackDeepLink: 'https://exodus.com/',
  },
  {
    id: 'sollet',
    name: 'Sollet',
    icon: '🎈',
    installUrl: 'https://sollet.io/',
    deepLink: 'sollet://',
    fallbackDeepLink: 'https://sollet.io/',
  },
];

export function isMobileDevice(): boolean {
  const userAgent = navigator.userAgent.toLowerCase();
  return /android|iphone|ipad|ipod|opera mini|iemobile|wpdesktop/i.test(userAgent) ||
    ('ontouchstart' in window && window.innerWidth < 1024);
}

export function isInAppBrowser(): boolean {
  const userAgent = navigator.userAgent.toLowerCase();
  const inAppPatterns = [
    /phantom/i,
    /solflare/i,
    /crypto\.com/i,
    /imtoken/i,
    /binance/i,
    /trust/i,
  ];
  return inAppPatterns.some(pattern => pattern.test(userAgent));
}

export async function connectMobileWallet(wallet: WalletInfo): Promise<boolean> {
  const { deepLink, fallbackDeepLink } = wallet;

  // Try primary deep link first
  window.location.href = deepLink;

  // If not installed, the OS will show an error or do nothing
  // We set a fallback timer to redirect to install page
  return new Promise((resolve) => {
    let fellBack = false;

    const fallback = setTimeout(() => {
      if (!fellBack) {
        fellBack = true;
        window.location.href = fallbackDeepLink ?? wallet.installUrl;
        resolve(false);
      }
    }, 2000);

    // Listen for visibility change (user came back from app)
    const handleVisibility = () => {
      if (!document.hidden && fellBack) {
        clearTimeout(fallback);
        resolve(true);
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);

    // Clean up after timeout
    setTimeout(() => {
      document.removeEventListener('visibilitychange', handleVisibility);
      clearTimeout(fallback);
    }, 5000);
  });
}

export function getInstallUrl(walletId: string): string {
  const wallet = WALLETS.find(w => w.id === walletId);
  return wallet?.installUrl ?? 'https://phantom.app/';
}