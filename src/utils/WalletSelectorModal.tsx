import {
  WALLETS,
  isMobileDevice,
  isWalletBrowser,
  checkExistingConnection,
  buildPhantomDeepLink,
  buildSolflareDeepLink,
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
      // Check for existing connection first
      const existingAddress = checkExistingConnection();
      if (existingAddress) {
        onConnected(existingAddress);
        return;
      }

      // Check URL params for callback data (after wallet redirected back)
      const callback = parseWalletCallback();
      if (callback?.address) {
        onConnected(callback.address);
        return;
      }

      // If in wallet's in-app browser, use provider directly
      if (isWalletBrowser()) {
        await handleWalletBrowserConnect(walletId, onConnected, onError);
        return;
      }

      // Mobile external browser: use deep link
      if (isMobileDevice()) {
        await handleMobileDeepLink(walletId, onConnected, onError);
        return;
      }

      // Desktop: shouldn't reach here, but fallback
      onError('Wallet not found');
    } catch (err: any) {
      onError(err.message || 'Connection failed');
    }
  };

  return (
    <div className="wallet-modal-overlay" onClick={onClose}>
      <div className="wallet-modal" onClick={e => e.stopPropagation()}>
        <div className="wallet-modal-header">
          <h2>Connect Wallet</h2>
          <button className="wallet-modal-close" onClick={onClose}>×</button>
        </div>

        <p className="wallet-modal-subtitle">Select a wallet to connect</p>

        <div className="wallet-list">
          {WALLETS.map(wallet => (
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

        <div className="wallet-modal-footer">
          <p>Don't have a wallet?</p>
          <a
            href="https://phantom.app/"
            target="_blank"
            rel="noopener noreferrer"
            className="install-link"
          >
            Install Phantom →
          </a>
        </div>
      </div>
    </div>
  );
}

// Handle connection when inside wallet's in-app browser
async function handleWalletBrowserConnect(
  walletId: string,
  onConnected: (address: string) => void,
  onError: (msg: string) => void
): Promise<void> {
  try {
    // Phantom in-app browser has window.solana
    if (walletId === 'phantom' && window.solana?.isPhantom) {
      const resp = await window.solana.connect();
      const addr = resp.publicKey.toString();
      onConnected(addr);
      return;
    }

    // Solflare in-app browser
    if (walletId === 'solflare' && (window as any).solflare?.isSolflare) {
      const resp = await (window as any).solflare.connect();
      const addr = resp.publicKey.toString();
      onConnected(addr);
      return;
    }

    onError('Wallet not detected in browser');
  } catch (err: any) {
    if (err.message?.includes('rejected') || err.message?.includes('cancelled')) {
      onError('Connection cancelled');
    } else {
      onError('Connection failed');
    }
  }
}

// Handle mobile deep link connection
async function handleMobileDeepLink(
  walletId: string,
  onConnected: (address: string) => void,
  onError: (msg: string) => void
): Promise<void> {
  let deepLink: string;

  // Build wallet-specific deep link
  switch (walletId) {
    case 'phantom':
      deepLink = buildPhantomDeepLink();
      break;
    case 'solflare':
      deepLink = buildSolflareDeepLink();
      break;
    default:
      deepLink = WALLETS.find(w => w.id === walletId)?.deepLink || '';
  }

  if (!deepLink) {
    onError('Wallet not supported');
    return;
  }

  // Store return URL for session restoration
  sessionStorage.setItem('wallet_connect_return', window.location.href);
  sessionStorage.setItem('wallet_connect_id', walletId);
  sessionStorage.setItem('wallet_connect_time', Date.now().toString());

  // Open wallet app
  window.location.href = deepLink;

  // For React, we can't wait here - the page will navigate away
  // Instead, on next render, check for callback data
  // This is handled by checking parseWalletCallback on component mount

  // Set up a one-time check on return
  const checkReturn = () => {
    const callback = parseWalletCallback();
    if (callback?.address) {
      sessionStorage.removeItem('wallet_connect_return');
      sessionStorage.removeItem('wallet_connect_id');
      sessionStorage.removeItem('wallet_connect_time');
      onConnected(callback.address);
      return true;
    }
    return false;
  };

  // If we returned from wallet quickly (user cancelled or error)
  setTimeout(() => {
    if (checkReturn()) return;

    // Check if wallet provider connected while we were gone
    const connected = checkExistingConnection();
    if (connected) {
      onConnected(connected);
      return;
    }

    // Otherwise assume wallet not installed or user cancelled
    // Don't show error immediately - let them try again
  }, 3000);
}

// Check if returning from a wallet connection attempt
export function checkReturningFromWallet(): string | null {
  try {
    const returnUrl = sessionStorage.getItem('wallet_connect_return');
    const walletId = sessionStorage.getItem('wallet_connect_id');
    const timestamp = sessionStorage.getItem('wallet_connect_time');

    if (!returnUrl || !walletId || !timestamp) return null;

    // Only valid for 5 minutes
    const age = Date.now() - parseInt(timestamp);
    if (age > 300000) {
      sessionStorage.removeItem('wallet_connect_return');
      sessionStorage.removeItem('wallet_connect_id');
      sessionStorage.removeItem('wallet_connect_time');
      return null;
    }

    // Check URL for callback data
    const callback = parseWalletCallback();
    if (callback?.address) {
      sessionStorage.removeItem('wallet_connect_return');
      sessionStorage.removeItem('wallet_connect_id');
      sessionStorage.removeItem('wallet_connect_time');
      return callback.address;
    }

    // Check if connected via provider
    return checkExistingConnection();
  } catch {
    return null;
  }
}