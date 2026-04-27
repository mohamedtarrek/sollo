export interface WalletInfo {
  id: string;
  name: string;
  icon: string;
  installUrl: string;
  deepLink: string;
  universalLink?: string;
  fallbackDeepLink?: string;
}

const CLUSTER = 'devnet';
const DAPP_URL = typeof window !== 'undefined' ? window.location.origin : '';

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
  {
    id: 'trust',
    name: 'Trust Wallet',
    icon: '🐉',
    installUrl: 'https://trustwallet.com/',
    deepLink: 'trust://connect',
  },
  {
    id: 'coinbase',
    name: 'Coinbase Wallet',
    icon: '🔵',
    installUrl: 'https://www.coinbase.com/wallet/downloads',
    deepLink: 'cbwallet://connect',
  },
  {
    id: 'exodus',
    name: 'Exodus',
    icon: '🚀',
    installUrl: 'https://exodus.com/',
    deepLink: 'exodus://connect',
  },
  {
    id: 'sollet',
    name: 'Sollet',
    icon: '🎈',
    installUrl: 'https://sollet.io/',
    deepLink: 'sollet://connect',
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

// Build Phantom deep link using official spec
export function buildPhantomDeepLink(): string {
  const ref = encodeURIComponent(`${DAPP_URL}/callback/phantom`);
  const appUrl = encodeURIComponent(DAPP_URL);

  return `phantom://connect?dapp_encryption_public_key=placeholder&cluster=${CLUSTER}&app_url=${appUrl}&redirect_link=${ref}`;
}

// Build Solflare deep link
export function buildSolflareDeepLink(): string {
  return `solflare://connect?dappUrl=${encodeURIComponent(DAPP_URL)}&cluster=${CLUSTER}&redirect_link=${encodeURIComponent(`${DAPP_URL}/callback/solflare`)}`;
}

// Check for connection data in URL after wallet redirects back
export function parseWalletCallback(): { wallet: string; address: string | null } | null {
  if (typeof window === 'undefined') return null;

  const params = new URLSearchParams(window.location.search);

  // Phantom callback format
  const phantomAddress = params.get('public_address') || params.get('publicKey');
  if (phantomAddress) {
    return { wallet: 'phantom', address: phantomAddress };
  }

  // Solflare callback format
  const solflareAddress = params.get('address');
  if (solflareAddress) {
    return { wallet: 'solflare', address: solflareAddress };
  }

  return null;
}

// Check if Phantom provider is connected
export function checkPhantomConnected(): string | null {
  if (typeof window === 'undefined') return null;

  try {
    if (window.solana?.isPhantom && window.solana?.isConnected && window.solana?.publicKey) {
      return window.solana.publicKey.toString();
    }
  } catch {
    // Ignore errors checking provider
  }

  return null;
}

// Check all wallet providers for existing connection
export function checkExistingConnection(): string | null {
  return checkPhantomConnected();
}

// Get redirect URL for wallet callback
export function getRedirectUrl(walletId: string): string {
  const base = DAPP_URL;
  return `${base}/?wallet=${walletId}&action=connect`;
}