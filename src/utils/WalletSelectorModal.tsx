import {
  WALLETS,
  isMobileDevice,
  isWalletBrowser,
  buildDeepLink,
  cacheWalletAddress
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

      // Already cached
      const cached = sessionStorage.getItem('wallet_address');
      if (cached) {
        onConnected(cached);
        return;
      }

      // In-wallet browser
      if (isWalletBrowser()) {
        await handleInApp(walletId);
        return;
      }

      // Mobile external
      if (isMobileDevice()) {
        const link = buildDeepLink(walletId);

        sessionStorage.setItem('wallet_redirect', window.location.href);
        sessionStorage.setItem('wallet_id', walletId);

        window.location.href = link;
        return;
      }

      onError('Unsupported device');

    } catch (e: any) {
      onError(e.message || 'Failed');
    }
  };

  return (
    <div className="wallet-modal-overlay" onClick={onClose}>
      <div className="wallet-modal" onClick={(e) => e.stopPropagation()}>

        <h2>Connect Wallet</h2>

        <div className="wallet-list">
          {WALLETS.map((w) => (
            <button key={w.id} onClick={() => handleSelect(w.id)}>
              {w.icon} {w.name}
            </button>
          ))}
        </div>

      </div>
    </div>
  );
}

/* 🔥 FIXED IN-APP */
async function handleInApp(walletId: string) {
  if (walletId === 'phantom' && window.solana?.isPhantom) {
    const resp = await window.solana.connect();
    const addr = resp.publicKey.toString();
    cacheWalletAddress(addr);
    return addr;
  }

  if (walletId === 'solflare' && window.solflare?.isSolflare) {
    const resp = await window.solflare.connect();
    const addr = resp.publicKey.toString();
    cacheWalletAddress(addr);
    return addr;
  }

  throw new Error('Wallet not found');
}