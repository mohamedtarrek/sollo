import { WALLETS, connectMobileWallet, getInstallUrl } from './mobileWallet';
import type { WalletInfo } from './mobileWallet';
import './WalletSelectorModal.css';

interface Props {
  onClose: () => void;
  onConnected: (address: string) => void;
  onError: (msg: string) => void;
}

export function WalletSelectorModal({ onClose, onConnected, onError }: Props) {
  const handleSelect = async (wallet: WalletInfo) => {
    try {
      // Check if already connected via mobile deep link callback
      if (window.solana?.isConnected && window.solana?.publicKey) {
        const addr = window.solana.publicKey.toString();
        onConnected(addr);
        return;
      }

      // Try deep link connection
      await connectMobileWallet(wallet);

      // Poll for connection result (wallet may connect via postMessage or storage)
      const connected = await pollForConnection(10000);
      if (connected) {
        const addr = window.solana?.publicKey?.toString();
        if (addr) {
          onConnected(addr);
        } else {
          onError('Connection failed. Please try again.');
        }
      } else {
        // Wallet not installed - show install prompt
        const installUrl = getInstallUrl(wallet.id);
        window.location.href = installUrl;
      }
    } catch (err: any) {
      onError(err.message || 'Connection failed');
    }
  };

  const pollForConnection = (timeout: number): Promise<boolean> => {
    return new Promise((resolve) => {
      const start = Date.now();

      const check = () => {
        if (window.solana?.isConnected && window.solana?.publicKey) {
          resolve(true);
          return;
        }
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