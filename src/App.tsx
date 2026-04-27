import { useState, useEffect } from 'react';
import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';

import { isMobileDevice } from './utils/mobileWallet';
import { WalletSelectorModal } from './utils/WalletSelectorModal';

const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

declare global {
  interface Window {
    solana?: any;
    solflare?: any;
  }
}

/* =========================
   WAIT FOR WALLET (FIX MOBILE)
========================= */
const waitForWallet = async (timeout = 6000): Promise<string | null> => {
  const start = Date.now();

  while (Date.now() - start < timeout) {
    if (window.solana?.isPhantom && window.solana.publicKey) {
      return window.solana.publicKey.toString();
    }

    if (window.solflare?.isSolflare && window.solflare.publicKey) {
      return window.solflare.publicKey.toString();
    }

    await new Promise(r => setTimeout(r, 300));
  }

  return null;
};

function App() {
  const [address, setAddress] = useState('');
  const [balance, setBalance] = useState<number | null>(null);
  const [showMobileModal, setShowMobileModal] = useState(false);

  const fetchBalance = async (addr: string) => {
    try {
      const bal = await connection.getBalance(new PublicKey(addr));
      setBalance(bal / LAMPORTS_PER_SOL);
    } catch {}
  };

  const detectWallet = async (): Promise<boolean> => {
    const addr = await waitForWallet();

    if (addr) {
      setAddress(addr);
      await fetchBalance(addr);
      sessionStorage.setItem('wallet_address', addr);
      setShowMobileModal(false);
      return true;
    }

    return false;
  };

  /* =========================
     RESTORE SESSION
  ========================== */
  useEffect(() => {
    const cached = sessionStorage.getItem('wallet_address');

    if (cached) {
      setAddress(cached);
      fetchBalance(cached);
      return;
    }

    if (isMobileDevice()) {
      setShowMobileModal(true);
    }
  }, []);

  /* =========================
     RETURN FROM WALLET
  ========================== */
  useEffect(() => {
    const run = async () => {
      const connected = await detectWallet();

      if (!connected && window.solana?.connect) {
        try {
          const resp = await window.solana.connect();
          const addr = resp.publicKey.toString();

          setAddress(addr);
          await fetchBalance(addr);
          sessionStorage.setItem('wallet_address', addr);
          setShowMobileModal(false);
        } catch {}
      }
    };

    run();
  }, []);

  const connect = async () => {
    if (isMobileDevice()) {
      setShowMobileModal(true);
      return;
    }

    const resp = await window.solana.connect();
    const addr = resp.publicKey.toString();

    setAddress(addr);
    await fetchBalance(addr);
    sessionStorage.setItem('wallet_address', addr);
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>Solana Wallet</h2>

      {!address ? (
        <button onClick={connect}>Connect Wallet</button>
      ) : (
        <>
          <p>{address}</p>
          <p>{balance} SOL</p>
        </>
      )}

      {showMobileModal && (
        <WalletSelectorModal
          onClose={() => setShowMobileModal(false)}
          onConnected={(addr) => {
            setAddress(addr);
            setShowMobileModal(false);
            fetchBalance(addr);
          }}
          onError={() => {}}
        />
      )}
    </div>
  );
}

export default App;