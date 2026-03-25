import { useEffect, useState } from 'react'
import { ccc } from "@ckb-ccc/ccc"
import { Wallet, Coins, ArrowRightLeft, Sparkles, RefreshCw, AlertCircle } from 'lucide-react'
import '@ckb-ccc/joy-id'

import { useCcc, useSigner } from "@ckb-ccc/connector-react"

// Grab config directly from Vite environment (loaded from root .env)
const CKB_NETWORK = import.meta.env.CKB_NETWORK || 'testnet'
const XUDT_CODE_HASH = import.meta.env.XUDT_CODE_HASH
const OWNER_LOCK_TX_HASH = import.meta.env.OWNER_LOCK_TX_HASH
const XUDT_TX_HASH = import.meta.env.XUDT_TX_HASH

function App() {
  const { wallet, open, disconnect, client, setClient } = useCcc()
  const signer = useSigner()
  
  const [balance, setBalance] = useState<string>("0")
  const [loading, setLoading] = useState(false)
  const [address, setAddress] = useState<string>("")
  const [error, setError] = useState<string>("")

  // Set the correct client network
  useEffect(() => {
    if (CKB_NETWORK === 'testnet') {
      setClient(new ccc.ClientPublicTestnet())
    } else {
      setClient(new ccc.Client(import.meta.env.CKB_RPC_URL || 'http://127.0.0.1:8114'))
    }
  }, [setClient])

  useEffect(() => {
    if (signer) {
      signer.getRecommendedAddress().then(setAddress)
      fetchBalance()
    } else {
      setAddress("")
      setBalance("0")
    }
  }, [signer])

  const fetchBalance = async () => {
    if (!signer || !XUDT_CODE_HASH) return
    setLoading(true)
    setError("")
    try {
      // Get the address object to access its lock script
      const addr = await signer.getRecommendedAddress()
      const addrObj = await ccc.Address.fromString(addr, signer.client)
      const lock = addrObj.script

      // Fetch all cells for the address
      const cells = await signer.client.findCells({
        script: lock,
        scriptType: "lock",
        scriptSearchMode: "exact",
      })

      let total = 0n
      for await (const cell of cells) {
        const hasXudtType = cell.cellOutput.type && cell.cellOutput.type.codeHash === XUDT_CODE_HASH
        if (hasXudtType && cell.outputData.length >= 34) {
          // Output data starts with '0x', so 34 chars means "0x" + 16 bytes of hex
          const u128Bytes = ccc.bytesFrom(cell.outputData).slice(0, 16)
          total += ccc.numLeFromBytes(u128Bytes)
        }
      }
      setBalance(total.toString())
    } catch (err: any) {
      console.error(err)
      setError(err.message || 'Failed to fetch balance')
    }
    setLoading(false)
  }

  const formatAddress = (addr: string) => {
    if (!addr) return ""
    return `${addr.slice(0, 10)}...${addr.slice(-8)}`
  }

  return (
    <div className="container">
      <header className="header animate-fade-in delay-1">
        <div className="logo">
          <div className="logo-icon">
            <Coins size={24} color="#fff" />
          </div>
          <span className="text-gradient">xUDT Dashboard</span>
        </div>
        
        {wallet ? (
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <div className="status-badge">
              <span className="status-dot"></span>
              {wallet.name} Connected
            </div>
            <button className="btn btn-outline" onClick={disconnect}>
              Disconnect
            </button>
          </div>
        ) : (
          <button className="btn btn-primary" onClick={open}>
            <Wallet size={18} />
            Connect Wallet
          </button>
        )}
      </header>

      <main className="animate-fade-in delay-2">
        <div className="glass-card" style={{ maxWidth: '800px', margin: '0 auto' }}>
          <h2>Token Overview</h2>
          <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem', lineHeight: '1.6' }}>
            Welcome to your customized xUDT token dashboard running on {CKB_NETWORK}.
            Manage your assets, view balances, and transfer securely.
          </p>

          {!wallet ? (
            <div className="flex-center" style={{ padding: '4rem 0', flexDirection: 'column', gap: '1.5rem' }}>
              <Sparkles size={48} color="var(--primary)" style={{ opacity: 0.5 }} />
              <h3 style={{ color: 'var(--text-muted)' }}>Connect your JoyID or Web3 Wallet to continue</h3>
              <button className="btn btn-primary" onClick={open}>
                <Wallet size={18} />
                Connect Wallet
              </button>
            </div>
          ) : (
            <div className="dashboard-grid">
              <div className="stat-item">
                <span className="stat-label">Your Balance</span>
                <span className="stat-value">
                  {loading ? '...' : (Number(balance) / 10**8).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </span>
                <div className="stat-sub">
                  <Coins size={14} /> xUDT Tokens
                </div>
              </div>

              <div className="stat-item">
                <span className="stat-label">Wallet Address</span>
                <span className="stat-value" style={{ fontSize: '1.25rem', marginTop: '1rem', fontFamily: 'monospace' }}>
                  {formatAddress(address)}
                </span>
                <div className="stat-sub" style={{ cursor: 'pointer', color: 'var(--primary)' }} onClick={() => navigator.clipboard.writeText(address)}>
                  <ArrowRightLeft size={14} /> Copy full address
                </div>
              </div>
            </div>
          )}

          {wallet && (
            <div className="balance-box">
              <div style={{ flex: 1 }}>
                <h3 style={{ fontSize: '1.125rem' }}>Network Sync</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
                  Last synced: Just now
                </p>
              </div>
              <button 
                className="btn btn-primary" 
                onClick={fetchBalance}
                disabled={loading}
              >
                <RefreshCw size={18} className={loading ? "spin" : ""} />
                {loading ? 'Syncing...' : 'Refresh Balance'}
              </button>
            </div>
          )}

          {error && (
            <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '8px', color: '#f87171', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <AlertCircle size={20} />
              <span>{error}</span>
            </div>
          )}
        </div>

        <div className="glass-card animate-fade-in delay-3" style={{ maxWidth: '800px', margin: '2rem auto 0', padding: '1.5rem 2rem' }}>
          <h3 style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>Token Contract Details</h3>
          <div className="token-id-container">
            <strong>Code Hash:</strong> {XUDT_CODE_HASH || 'Not found'}
          </div>
          <div className="token-id-container">
            <strong>Deployment TX (Type):</strong> {XUDT_TX_HASH || 'Not found'}
          </div>
          <div className="token-id-container">
            <strong>Deployment TX (Lock):</strong> {OWNER_LOCK_TX_HASH || 'Not found'}
          </div>
        </div>
      </main>
      
      <style>{`
        .spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}

export default App
