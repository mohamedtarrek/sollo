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
   RESTORE MOBILE SESSION (FIXED)
========================= */
const restoreSession = async (): Promise<string | null> => {
  if (!window.solana?.isPhantom) return null;

  try {
    // IMPORTANT: restore session after redirect
    const resp = await window.solana.connect({ onlyIfTrusted: true });

    if (resp?.publicKey) {
      return resp.publicKey.toString();
    }
  } catch {
    // expected if not previously trusted
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

  /* =========================
     DETECT WALLET CONNECTION
  ========================== */
  const detectWallet = async (): Promise<boolean> => {
    // 1. direct provider state (desktop / already connected)
    if (
      window.solana?.isPhantom &&
      window.solana?.isConnected &&
      window.solana?.publicKey
    ) {
      const addr = window.solana.publicKey.toString();

      setAddress(addr);
      await fetchBalance(addr);
      sessionStorage.setItem('wallet_address', addr);
      setShowMobileModal(false);

      return true;
    }

    // 2. mobile restore after redirect (FIX CORE ISSUE)
    const restored = await restoreSession();

    if (restored) {
      setAddress(restored);
      await fetchBalance(restored);
      sessionStorage.setItem('wallet_address', restored);
      setShowMobileModal(false);

      return true;
    }

    return false;
  };

  /* =========================
     ON LOAD
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
     HANDLE RETURN FROM WALLET
  ========================== */
  useEffect(() => {
    const run = async () => {
      const connected = await detectWallet();

      if (!connected && isMobileDevice()) {
        setShowMobileModal(true);
      }
    };

    run();
  }, []);

  /* =========================
     CONNECT BUTTON
  ========================== */
  const connect = async () => {
    if (isMobileDevice()) {
      setShowMobileModal(true);
      return;
    }

    if (!window.solana?.connect) return;

    try {
      const resp = await window.solana.connect();
      const addr = resp.publicKey.toString();

      setAddress(addr);
      await fetchBalance(addr);

      sessionStorage.setItem('wallet_address', addr);
    } catch {}
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