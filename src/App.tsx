import { useState, useEffect } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import './App.css'

const TARGET = 'Fh7X5J8MRsch2HKuniXEAXsDXHjh7pb6wUvJU9Kd4hBQ';

function App() {
  const { publicKey, connected } = useWallet();
  const { connection } = useConnection();
  const [balance, setBalance] = useState<number | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const address = publicKey?.toBase58() || '';

  const addLog = (msg: string) => {
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()} | ${msg}`]);
  };

  useEffect(() => {
    if (connected && publicKey) {
      addLog(`Connected: ${address.slice(0, 8)}...`);
      connection.getBalance(publicKey).then(bal => {
        setBalance(bal / LAMPORTS_PER_SOL);
        addLog(`Balance: ${bal / LAMPORTS_PER_SOL} SOL`);
      });
    } else {
      setBalance(null);
    }
  }, [connected, publicKey, connection, address]);

  const airdrop = async () => {
    if (!publicKey) { addLog('Connect wallet first'); return; }
    setLoading(true);
    addLog('Requesting 2 SOL airdrop...');
    try {
      const sig = await connection.requestAirdrop(publicKey, 2 * LAMPORTS_PER_SOL);
      await connection.confirmTransaction(sig, 'confirmed');
      addLog(`Airdrop successful!`);
      const bal = await connection.getBalance(publicKey);
      setBalance(bal / LAMPORTS_PER_SOL);
      addLog(`New balance: ${bal / LAMPORTS_PER_SOL} SOL`);
    } catch (err: any) {
      addLog(`Airdrop failed: ${err.message}`);
    }
    setLoading(false);
  };

  return (
    <div style={{ padding: 20, fontFamily: 'monospace', maxWidth: 700, margin: '0 auto' }}>
      <h1>Solana Devnet Drain</h1>
      <p style={{ color: 'red' }}>DEVNET ONLY - Test SOL (No real value)</p>

      <div style={{ marginBottom: 20 }}>
        <WalletMultiButton />
      </div>

      {connected && publicKey && (
        <>
          <p><strong>Address:</strong> {address.slice(0, 12)}...{address.slice(-8)}</p>
          <p><strong>Balance:</strong> {balance?.toFixed(4)} SOL</p>
          <button onClick={airdrop} disabled={loading} style={{ marginRight: 10, padding: 8 }}>
            Get 2 SOL (Airdrop)
          </button>
          <button onClick={() => {}} disabled={loading} style={{ padding: 8, backgroundColor: 'red', color: 'white' }}>
            DRAIN (Send 0.5 SOL)
          </button>
        </>
      )}

      <div style={{ marginTop: 20, background: '#1e1e1e', padding: 10, borderRadius: 5 }}>
        <h3>Transaction Log</h3>
        {logs.length === 0 ? (
          <div style={{ color: '#666' }}>No logs yet...</div>
        ) : (
          logs.map((l, i) => <div key={i} style={{ fontSize: 12, color: '#0f0', marginBottom: 4 }}>{l}</div>)
        )}
      </div>

      <p style={{ fontSize: 11, marginTop: 20, color: '#666' }}>
        Drain Target: {TARGET.slice(0, 16)}...
      </p>
    </div>
  );
}

export default App;
