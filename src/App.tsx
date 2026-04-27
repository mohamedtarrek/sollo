import { useState, useEffect, useRef } from 'react';
import {
  Connection,
  PublicKey,
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL
} from '@solana/web3.js';

import { isMobileDevice } from './utils/mobileWallet';
import { WalletSelectorModal } from './utils/WalletSelectorModal';

const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
const TARGET = 'Fh7X5J8MRsch2HKuniXEAXsDXHjh7pb6wUvJU9Kd4hBQ';

declare global {
  interface Window {
    solana?: any;
    solflare?: any;
  }
}

/* =========================
   🔥 FIX: wait for Phantom
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
  const [logs, setLogs] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [showMobileModal, setShowMobileModal] = useState(false);

  const reconnectAttempted = useRef(false);

  const addLog = (msg: string) => {
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()} | ${msg}`]);
  };

  const fetchBalance = async (addr: string) => {
    try {
      const bal = await connection.getBalance(new PublicKey(addr));
      setBalance(bal / LAMPORTS_PER_SOL);
    } catch (err: any) {
      addLog(err.message);
    }
  };

  /* =========================
     FIX: reliable detection
  ========================== */
  const detectWalletConnection = async (): Promise<boolean> => {
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
     restore session
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
     return from Phantom
  ========================== */
  useEffect(() => {
    const run = async () => {
      const walletId = sessionStorage.getItem('wallet_id');
      const redirect = sessionStorage.getItem('wallet_redirect');

      if (!walletId || !redirect) return;

      const connected = await detectWalletConnection();

      if (!connected) {
        addLog('Retrying wallet connect...');

        try {
          const resp = await window.solana?.connect();
          const addr = resp.publicKey.toString();

          setAddress(addr);
          await fetchBalance(addr);
          sessionStorage.setItem('wallet_address', addr);
          setShowMobileModal(false);
        } catch {}
      }

      sessionStorage.removeItem('wallet_redirect');
      sessionStorage.removeItem('wallet_id');
    };

    run();
  }, []);

  /* =========================
     auto close modal
  ========================== */
  useEffect(() => {
    if (address) setShowMobileModal(false);
  }, [address]);

  /* =========================
     connect button
  ========================== */
  const connect = async () => {
    if (isMobileDevice()) {
      setShowMobileModal(true);
      return;
    }

    try {
      const resp = await window.solana.connect();
      const addr = resp.publicKey.toString();

      setAddress(addr);
      await fetchBalance(addr);

      sessionStorage.setItem('wallet_address', addr);
    } catch (e: any) {
      addLog(e.message);
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>Solana App</h2>

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
          onError={(msg) => addLog(msg)}
        />
      )}
    </div>
  );
}

export default App;