import {
  WALLETS,
  isMobileDevice,
  isWalletBrowser,
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
      // 1. Already connected via provider? Check provider state directly
      if (window.solana?.isPhantom && window.solana?.isConnected && window.solana?.publicKey) {
        onConnected(window.solana.publicKey.toString());
        return;
      }

      // 2. Check session cache
      const cached = sessionStorage.getItem('wallet_address');
      if (cached) {
        onConnected(cached);
        return;
      }

      // 3. Inside wallet browser (Phantom / Solflare) - use provider directly
      if (isWalletBrowser()) {
        await handleInAppConnect(walletId, onConnected, onError);
        return;
      }

      // 4. Mobile external browser - use universal link
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
   Phantom/Solflare in-app browser
========================= */
async function handleInAppConnect(
  walletId: string,
  onConnected: (a: string) => void,
  onError: (m: string) => void
) {
  try {
    if (walletId === 'phantom' && (window as any).solana?.isPhantom) {
      // Try silent connect first (onlyIfTrusted) - avoids repeated prompts on page reload
      // If already trusted, this restores session without UI
      let resp;
      try {
        resp = await (window as any).solana.connect({ onlyIfTrusted: true });
      } catch {
        // Not trusted yet - do full connect
        resp = await (window as any).solana.connect();
      }
      const addr = resp.publicKey.toString();
      // Cache for session persistence
      sessionStorage.setItem('wallet_address', addr);
      sessionStorage.setItem('wallet_connected_at', Date.now().toString());
      onConnected(addr);
      return;
    }

    if (walletId === 'solflare' && (window as any).solflare?.isSolflare) {
      let resp;
      try {
        resp = await (window as any).solflare.connect({ onlyIfTrusted: true });
      } catch {
        resp = await (window as any).solflare.connect();
      }
      const addr = resp.publicKey.toString();
      sessionStorage.setItem('wallet_address', addr);
      sessionStorage.setItem('wallet_connected_at', Date.now().toString());
      onConnected(addr);
      return;
    }

    onError('Wallet not found inside browser');
  } catch (e: any) {
    onError('Connection rejected');
  }
}

/* =========================
   MOBILE EXTERNAL BROWSER
   Uses Universal Link (not deep link)
   This ensures provider state is set after redirect
========================= */
async function handleMobileConnect(walletId: string) {
  const baseUrl = window.location.origin;

  if (walletId === 'phantom') {
    // Universal link opens in same browser, user approves, redirects back
    // Provider will be connected when page reloads
    const url = new URL('https://phantom.app/ul/v1/connect');
    url.searchParams.append('app_url', baseUrl);
    url.searchParams.append('redirect_link', window.location.href);
    url.searchParams.append('dapp_encryption_public_key', '');
    url.searchParams.append('cluster', 'devnet');

    // Store current state so we know we initiated connection
    sessionStorage.setItem('wallet_redirect', window.location.href);
    sessionStorage.setItem('wallet_id', walletId);
    sessionStorage.setItem('wallet_connect_started', Date.now().toString());

    window.location.href = url.toString();
    // After redirect, App.tsx useEffect will detect provider connection
    return;
  }

  if (walletId === 'solflare') {
    const url = new URL('https://solflare.com/ul/v1/connect');
    url.searchParams.append('redirect_url', window.location.href);
    url.searchParams.append('cluster', 'devnet');

    sessionStorage.setItem('wallet_redirect', window.location.href);
    sessionStorage.setItem('wallet_id', walletId);
    sessionStorage.setItem('wallet_connect_started', Date.now().toString());

    window.location.href = url.toString();
    return;
  }

  throw new Error('Unsupported wallet');
}