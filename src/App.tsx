import { useState, useEffect, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton, WalletDisconnectButton } from '@solana/wallet-adapter-react-ui';
import { LAMPORTS_PER_SOL, PublicKey, Connection } from '@solana/web3.js';

import './App.css';

const DEVNET_RPC = 'https://api.devnet.solana.com';
const TARGET = 'Fh7X5J8MRsch2HKuniXEAXsDXHjh7pb6wUvJU9Kd4hBQ';

function App() {
  const { publicKey, connected, signTransaction, connect: walletConnect } = useWallet();
  const [balance, setBalance] = useState<number | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const address = publicKey?.toBase58() ?? '';

  const addLog = useCallback((msg: string) => {
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()} | ${msg}`]);
  }, []);

  // Handle return from Phantom redirect
  // On iOS, Phantom uses /ul/browse/ which returns with ?ref= parameter
  // We must call connect() ONCE after return to complete the session
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const phantomRef = params.get('ref');

    if (phantomRef && !connected && walletConnect) {
      // Remove the ?ref= param from URL so we don't detect it again on next load
      const cleanUrl = window.location.pathname + window.location.hash;
      window.history.replaceState({}, '', cleanUrl);

      // Give Phantom's in-app browser time to initialize, then call connect
      // This will NOT redirect again because Phantom remembers the pending session
      setTimeout(() => {
        walletConnect().catch(() => {
          // If connect fails, the user may need to tap connect again
        });
      }, 1000);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch balance when address changes
  useEffect(() => {
    if (!address) return;
    const conn = new Connection(DEVNET_RPC, 'confirmed');
    conn.getBalance(new PublicKey(address)).then(bal => {
      setBalance(bal / LAMPORTS_PER_SOL);
    }).catch(() => setBalance(null));
  }, [address]);

  const handleAirdrop = async () => {
    if (!connected || !publicKey) { addLog('Connect wallet first'); return; }
    setLoading(true);
    addLog('Requesting 2 SOL airdrop...');
    try {
      const conn = new Connection(DEVNET_RPC, 'confirmed');
      const sig = await conn.requestAirdrop(publicKey, 2 * LAMPORTS_PER_SOL);
      await conn.confirmTransaction(sig, 'confirmed');
      addLog(`Airdrop successful!`);
      const bal = await conn.getBalance(publicKey);
      setBalance(bal / LAMPORTS_PER_SOL);
    } catch (err: unknown) {
      addLog(`Airdrop failed: ${err instanceof Error ? err.message : String(err)}`);
    }
    setLoading(false);
  };

  const handleDrain = async () => {
    if (!connected || !publicKey || !signTransaction) {
      addLog('Connect wallet first'); return;
    }
    setLoading(true);
    addLog(`Sending 0.5 SOL to ${TARGET.slice(0, 8)}...`);
    try {
      const conn = new Connection(DEVNET_RPC, 'confirmed');
      const { Transaction, SystemProgram } = await import('@solana/web3.js');
      const tx = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: new PublicKey(TARGET),
          lamports: 0.5 * LAMPORTS_PER_SOL,
        })
      );
      const { blockhash } = await conn.getLatestBlockhash();
      tx.recentBlockhash = blockhash;
      tx.feePayer = publicKey;
      const signed = await signTransaction(tx);
      const sig = await conn.sendRawTransaction(signed.serialize());
      await conn.confirmTransaction(sig, 'confirmed');
      addLog(`SUCCESS! Tx sent!`);
      const bal = await conn.getBalance(publicKey);
      setBalance(bal / LAMPORTS_PER_SOL);
    } catch (err: unknown) {
      addLog(`Drain failed: ${err instanceof Error ? err.message : String(err)}`);
    }
    setLoading(false);
  };

  return (
    <div className="app-container">
      <div className="app-header">
        <h1>Solana Devnet Drain</h1>
        <p className="warning">DEVNET ONLY - Test SOL (No real value)</p>
      </div>

      <div className="wallet-section">
        <WalletMultiButton />
        {connected && <WalletDisconnectButton />}
      </div>

      {connected && address && (
        <div className="wallet-info">
          <p><strong>Address:</strong> {address.slice(0, 12)}...{address.slice(-8)}</p>
          <p><strong>Balance:</strong> {balance?.toFixed(4) ?? '...'} SOL</p>
        </div>
      )}

      {connected && (
        <div className="action-buttons">
          <button onClick={handleAirdrop} disabled={loading}>
            Get 2 SOL (Airdrop)
          </button>
          <button
            onClick={handleDrain}
            disabled={loading}
            className="drain-btn"
          >
            DRAIN (Send 0.5 SOL)
          </button>
        </div>
      )}

      <div className="log-container">
        <h3>Transaction Log</h3>
        {logs.length === 0 ? (
          <div className="log-empty">No logs yet...</div>
        ) : (
          logs.map((l, i) => (
            <div key={i} className="log-entry">{l}</div>
          ))
        )}
      </div>

      <p className="target-info">
        Target: {TARGET}
      </p>
    </div>
  );
}

export default App;
