import {
  WALLETS,
  isMobileDevice,
  isWalletBrowser,
  checkExistingConnection,
  parseWalletCallback,
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
      // 1. Already connected?
      const existing = checkExistingConnection();
      if (existing) {
        onConnected(existing);
        return;
      }

      // 2. Callback return from wallet
      const callback = parseWalletCallback();
      if (callback?.address) {
        onConnected(callback.address);
        return;
      }

      // 3. Inside wallet browser (Phantom / Solflare)
      if (isWalletBrowser()) {
        await handleInAppConnect(walletId, onConnected, onError);
        return;
      }

      // 4. Mobile external browser → USE PROPER UNIVERSAL LINK
      if (isMobileDevice()) {
        await handleMobileConnect(walletId);
        return;
      }

      onError('Wallet not supported on this device');
    } catch (err: any) {
      onError(err?.message || 'Connection failed');
    }
  };

  return (
    <div className="wallet-modal-overlay" onClick={onClose}>
      <div className="wallet-modal" onClick={(e) => e.stopPropagation()}>
        <div className="wallet-modal-header">
          <h2>Connect Wallet</h2>
          <button className="wallet-modal-close" onClick={onClose}>×</button>
        </div>

        <p className="wallet-modal-subtitle">Select your wallet</p>

        <div className="wallet-list">
          {WALLETS.map((wallet) => (
            <button
              key={wallet.id}
              className="wallet-option"
              onClick={() => handleSelect(wallet.id)}
            >
              <span className="wallet-icon">{wallet.icon}</span>
              <span className="wallet-name">{wallet.name}</span>
              <span className="wallet-arrow">→</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* =========================
   IN-APP WALLET BROWSER
========================= */
async function handleInAppConnect(
  walletId: string,
  onConnected: (a: string) => void,
  onError: (m: string) => void
) {
  try {
    if (walletId === 'phantom' && (window as any).solana?.isPhantom) {
      const resp = await (window as any).solana.connect();
      onConnected(resp.publicKey.toString());
      return;
    }

    if (walletId === 'solflare' && (window as any).solflare?.isSolflare) {
      const resp = await (window as any).solflare.connect();
      onConnected(resp.publicKey.toString());
      return;
    }

    onError('Wallet not found inside browser');
  } catch (e: any) {
    onError('Connection rejected');
  }
}

/* =========================
   MOBILE FIXED FLOW (IMPORTANT)
   Phantom UNIVERSAL LINK
========================= */
async function handleMobileConnect(walletId: string) {
  const baseUrl = window.location.origin;
  const redirect = window.location.href;

  // store state
  sessionStorage.setItem('wallet_redirect', redirect);
  sessionStorage.setItem('wallet_id', walletId);

  if (walletId === 'phantom') {
    const url = new URL('https://phantom.app/ul/v1/connect');

    url.searchParams.append('app_url', baseUrl);
    url.searchParams.append('redirect_link', redirect);
    url.searchParams.append('dapp_encryption_public_key', '');
    url.searchParams.append('cluster', 'devnet');

    window.location.href = url.toString();
    return;
  }

  if (walletId === 'solflare') {
    window.location.href =
      `https://solflare.com/ul/v1/connect?redirect_url=${encodeURIComponent(redirect)}`;
    return;
  }

  throw new Error('Unsupported wallet');
}

/* =========================
   RETURN HANDLER
========================= */
export function checkReturningFromWallet(): string | null {
  try {
    const callback = parseWalletCallback();
    if (callback?.address) {
      sessionStorage.clear();
      return callback.address;
    }
    return checkExistingConnection();
  } catch {
    return null;
  }
}