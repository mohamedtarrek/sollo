import {
  WALLETS,
  isMobileDevice,
  isWalletBrowser,
  cacheWallet,
} from './mobileWallet';

import './WalletSelectorModal.css';

interface Props {
  onClose: () => void;
  onConnected: (address: string) => void;
  onError: (msg: string) => void;
}

export function WalletSelectorModal({ onClose, onConnected, onError }: Props) {
  const handleSelect = async (walletId: string) => {
    try {
      // 1. provider already connected
      const provider = window.solana;
      if (provider?.isPhantom?.() && provider?.publicKey) {
        const addr = provider.publicKey.toString();
        cacheWallet(addr);
        onConnected(addr);
        return;
      }

      // 2. cached session
      const cached = sessionStorage.getItem('wallet_address');
      if (cached) {
        onConnected(cached);
        return;
      }

      // 3. in-app browser
      if (isWalletBrowser()) {
        await handleInAppConnect(walletId, onConnected, onError);
        return;
      }

      // 4. mobile external
      if (isMobileDevice()) {
        await handleMobileConnect(walletId);
        return;
      }

      onError('Wallet not supported');
    } catch (e: any) {
      onError(e.message || 'Connection failed');
    }
  };

  return (
    <div className="wallet-modal-overlay" onClick={onClose}>
      <div className="wallet-modal" onClick={(e) => e.stopPropagation()}>
        <div className="wallet-modal-header">
          <h2>Connect Wallet</h2>
          <button onClick={onClose}>×</button>
        </div>

        <div className="wallet-list">
          {WALLETS.map((w) => (
            <button key={w.id} onClick={() => handleSelect(w.id)}>
              <span>{w.icon}</span> {w.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* =========================
   IN-APP CONNECT
========================= */
async function handleInAppConnect(
  walletId: string,
  onConnected: (a: string) => void,
  onError: (m: string) => void
) {
  try {
    const provider = window.solana;

    if (walletId === 'phantom' && provider?.isPhantom) {
      const resp = await provider.connect();
      const addr = resp.publicKey.toString();

      cacheWallet(addr);
      onConnected(addr);
      return;
    }

    onError('Wallet not found');
  } catch {
    onError('Connection rejected');
  }
}

/* =========================
   MOBILE UNIVERSAL LINK
========================= */
async function handleMobileConnect(walletId: string) {
  const base = window.location.origin;

  if (walletId === 'phantom') {
    const url = new URL('https://phantom.app/ul/v1/connect');

    url.searchParams.append('app_url', base);
    url.searchParams.append('redirect_link', window.location.href);
    url.searchParams.append('cluster', 'devnet');

    sessionStorage.setItem('wallet_redirect', window.location.href);

    window.location.href = url.toString();
    return;
  }

  if (walletId === 'solflare') {
    const url = new URL('https://solflare.com/ul/v1/connect');
    url.searchParams.append('redirect_url', window.location.href);
    url.searchParams.append('cluster', 'devnet');

    sessionStorage.setItem('wallet_redirect', window.location.href);

    window.location.href = url.toString();
    return;
  }
}