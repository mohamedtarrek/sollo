export interface WalletInfo {
  id: string;
  name: string;
  icon: string;
  installUrl: string;
  buildDeepLink: (dappUrl: string, cluster?: string) => string;
}

const CLUSTER = 'devnet';

export const WALLETS: WalletInfo[] = [
  {
    id: 'phantom',
    name: 'Phantom',
    icon: '👻',
    installUrl: 'https://phantom.app/',
    buildDeepLink: (dappUrl, cluster = CLUSTER) =>
      `phantom://connect?dappUrl=${encodeURIComponent(dappUrl)}&cluster=${cluster}`,
  },
  {
    id: 'solflare',
    name: 'Solflare',
    icon: '☀️',
    installUrl: 'https://solflare.com/',
    buildDeepLink: (dappUrl, cluster = CLUSTER) =>
      `solflare://connect?dappUrl=${encodeURIComponent(dappUrl)}&cluster=${cluster}`,
  },
  {
    id: 'trust',
    name: 'Trust Wallet',
    icon: '🐉',
    installUrl: 'https://trustwallet.com/',
    buildDeepLink: (dappUrl, cluster = CLUSTER) =>
      `trust://connect?dappUrl=${encodeURIComponent(dappUrl)}&cluster=${cluster}`,
  },
  {
    id: 'coinbase',
    name: 'Coinbase Wallet',
    icon: '🔵',
    installUrl: 'https://www.coinbase.com/wallet/downloads',
    buildDeepLink: (dappUrl, cluster = CLUSTER) =>
      `cbwallet://connect?dappUrl=${encodeURIComponent(dappUrl)}&cluster=${cluster}`,
  },
  {
    id: 'exodus',
    name: 'Exodus',
    icon: '🚀',
    installUrl: 'https://exodus.com/',
    buildDeepLink: (dappUrl, cluster = CLUSTER) =>
      `exodus://connect?dappUrl=${encodeURIComponent(dappUrl)}&cluster=${cluster}`,
  },
  {
    id: 'sollet',
    name: 'Sollet',
    icon: '🎈',
    installUrl: 'https://sollet.io/',
    buildDeepLink: (dappUrl, cluster = CLUSTER) =>
      `sollet://connect?dappUrl=${encodeURIComponent(dappUrl)}&cluster=${cluster}`,
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

export function getDappUrl(): string {
  return typeof window !== 'undefined' ? window.location.origin : '';
}

export function buildConnectionUrl(wallet: WalletInfo, cluster = CLUSTER): string {
  const dappUrl = getDappUrl();
  return wallet.buildDeepLink(dappUrl, cluster);
}

export function getInstallUrl(walletId: string): string {
  const wallet = WALLETS.find(w => w.id === walletId);
  return wallet?.installUrl ?? 'https://phantom.app/';
}