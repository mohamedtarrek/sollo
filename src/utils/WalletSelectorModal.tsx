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

      const cached = sessionStorage.getItem('wallet_address');
      if (cached) {
        onConnected(cached);
        return;
      }

      if (isWalletBrowser()) {
        await handleInApp(walletId, onConnected, onError);
        return;
      }

      if (isMobileDevice()) {

        const link = buildDeepLink(walletId);

        // 🔥 IMPORTANT: mark session BEFORE redirect
        sessionStorage.setItem('wallet_redirect', 'true');
        sessionStorage.setItem('wallet_id', walletId);
        sessionStorage.setItem('wallet_start_time', Date.now().toString());

        // 🔥 small delay fixes Phantom race condition
        setTimeout(() => {
          window.location.href = link;
        }, 150);

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

/* =========================
   IN-APP CONNECT FIXED
========================= */
async function handleInApp(
  walletId: string,
  onConnected: (a: string) => void,
  onError: (m: string) => void
) {
  try {

    if (walletId === 'phantom' && window.solana?.isPhantom) {
      const resp = await window.solana.connect();
      const addr = resp.publicKey.toString();

      cacheWalletAddress(addr);
      onConnected(addr);
      return;
    }

    if (walletId === 'solflare' && window.solflare?.isSolflare) {
      const resp = await window.solflare.connect();
      const addr = resp.publicKey.toString();

      cacheWalletAddress(addr);
      onConnected(addr);
      return;
    }

    onError('Wallet not found');

  } catch (e: any) {
    onError('Connection rejected');
  }
}