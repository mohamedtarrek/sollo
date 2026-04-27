import { WALLETS, buildConnectionUrl, isInAppBrowser } from './mobileWallet';
import type { WalletInfo } from './mobileWallet';
import './WalletSelectorModal.css';

interface Props {
  onClose: () => void;
  onConnected: (address: string) => void;
  onError: (msg: string) => void;
}

const SESSION_KEY = 'solana_mobile_connect';
const CLUSTER = 'devnet';

export function WalletSelectorModal({ onClose, onConnected, onError }: Props) {
  const handleSelect = async (wallet: WalletInfo) => {
    try {
      // Check if already connected
      if (window.solana?.isConnected && window.solana?.publicKey) {
        const addr = window.solana.publicKey.toString();
        onConnected(addr);
        return;
      }

      // If inside wallet's in-app browser, use standard connect
      if (isInAppBrowser()) {
        try {
          const resp = await window.solana.connect();
          const addr = resp.publicKey.toString();
          onConnected(addr);
          return;
        } catch (err: any) {
          onError('Connection failed in browser');
          return;
        }
      }

      // Build return URL
      const sessionId = generateSessionId();

      // Store session for cross-origin communication
      sessionStorage.setItem(SESSION_KEY, JSON.stringify({
        id: sessionId,
        wallet: wallet.id,
        timestamp: Date.now(),
      }));

      // Build deep link with proper parameters
      const deepLink = buildConnectionUrl(wallet, CLUSTER);

      // Open wallet app
      window.location.href = deepLink;

      // Poll for connection after redirect returns
      const connected = await pollForConnection(30000);

      if (connected) {
        const addr = window.solana?.publicKey?.toString();
        if (addr) {
          sessionStorage.removeItem(SESSION_KEY);
          onConnected(addr);
        } else {
          sessionStorage.removeItem(SESSION_KEY);
          onError('Connection failed. Please try again.');
        }
      } else {
        // Check if maybe returned but not connected
        if (window.solana?.isConnected) {
          const addr = window.solana.publicKey.toString();
          sessionStorage.removeItem(SESSION_KEY);
          onConnected(addr);
        } else {
          sessionStorage.removeItem(SESSION_KEY);
          // Wallet not installed or user denied
          onError('Connection cancelled or wallet not found.');
        }
      }
    } catch (err: any) {
      sessionStorage.removeItem(SESSION_KEY);
      onError(err.message || 'Connection failed');
    }
  };

  const pollForConnection = (timeout: number): Promise<boolean> => {
    return new Promise((resolve) => {
      const start = Date.now();

      const check = () => {
        // Check if Phantom/Wallet has connected
        if (window.solana?.isConnected && window.solana?.publicKey) {
          resolve(true);
          return;
        }

        // Check sessionStorage for connection confirmation from wallet redirect
        try {
          const session = sessionStorage.getItem(SESSION_KEY);
          if (session) {
            const data = JSON.parse(session);
            if (data.connected && data.address) {
              resolve(true);
              return;
            }
          }
        } catch {}

        if (Date.now() - start > timeout) {
          resolve(false);
          return;
        }
        setTimeout(check, 500);
      };

      check();
    });
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
              onClick={() => handleSelect(wallet)}
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

function generateSessionId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}