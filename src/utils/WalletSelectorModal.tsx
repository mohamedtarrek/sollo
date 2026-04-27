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
      // Already connected?
      if (window.solana?.isPhantom && window.solana?.isConnected && window.solana?.publicKey) {
        onConnected(window.solana.publicKey.toString());
        return;
      }
      if (window.solflare?.isSolflare && window.solflare.isConnected && window.solflare.publicKey) {
        onConnected(window.solflare.publicKey.toString());
        return;
      }

      // Check session cache
      const cached = sessionStorage.getItem('wallet_address');
      if (cached) {
        onConnected(cached);
        return;
      }

      // Inside wallet browser - use provider directly
      if (isWalletBrowser()) {
        await handleInAppConnect(walletId, onConnected, onError);
        return;
      }

      // Mobile external browser - use deep link
      if (isMobileDevice()) {
        handleMobileDeepLink(walletId);
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

/* IN-APP WALLET BROWSER */
async function handleInAppConnect(
  walletId: string,
  onConnected: (a: string) => void,
  onError: (m: string) => void
) {
  try {
    if (walletId === 'phantom' && (window as any).solana?.isPhantom) {
      let resp;
      try {
        resp = await (window as any).solana.connect({ onlyIfTrusted: true });
      } catch {
        resp = await (window as any).solana.connect();
      }
      const addr = resp.publicKey.toString();
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

/* MOBILE DEEP LINK - FIXED */
function handleMobileDeepLink(walletId: string) {
  const currentUrl = window.location.href;
  const encodedUrl = encodeURIComponent(currentUrl);

  let deepLink = '';

  switch (walletId) {
    case 'phantom':
      deepLink = `phantom://browse?url=${encodedUrl}`;
      break;
    case 'solflare':
      deepLink = `solflare://browse?url=${encodedUrl}`;
      break;
    case 'trust':
      deepLink = `trust://browser?url=${encodedUrl}`;
      break;
    case 'coinbase':
      deepLink = `cbwallet://browser?url=${encodedUrl}`;
      break;
    case 'exodus':
      deepLink = `exodus://open?url=${encodedUrl}`;
      break;
    case 'sollet':
      deepLink = `https://www.sollet.io/`;
      break;
    default:
      deepLink = `https://phantom.app/ul/browse?url=${encodedUrl}`;
  }

  // Store redirect info
  sessionStorage.setItem('wallet_redirect', currentUrl);
  sessionStorage.setItem('wallet_id', walletId);
  sessionStorage.setItem('wallet_connect_started', Date.now().toString());

  // Open the wallet app
  window.location.href = deepLink;

  // Fallback: if user doesn't have wallet installed
  setTimeout(() => {
    const wallet = WALLETS.find(w => w.id === walletId);
    if (wallet && confirm(`Don't have ${wallet.name} installed? Open install page?`)) {
      window.location.href = wallet.installUrl;
    }
  }, 2000);
}