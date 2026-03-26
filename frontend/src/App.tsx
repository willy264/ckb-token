import { useEffect, useState } from 'react'
import { ccc } from '@ckb-ccc/ccc'
import { AlertCircle, Coins, Copy, RefreshCw, Wallet } from 'lucide-react'
import '@ckb-ccc/joy-id'

import { useCcc, useSigner } from '@ckb-ccc/connector-react'

const CKB_NETWORK = import.meta.env.VITE_CKB_NETWORK || import.meta.env.CKB_NETWORK || 'testnet'
const CKB_RPC_URL = import.meta.env.VITE_CKB_RPC_URL || import.meta.env.CKB_RPC_URL
const XUDT_CODE_HASH = import.meta.env.VITE_XUDT_CODE_HASH || import.meta.env.XUDT_CODE_HASH
const OWNER_LOCK_TX_HASH =
  import.meta.env.VITE_OWNER_LOCK_TX_HASH || import.meta.env.OWNER_LOCK_TX_HASH
const XUDT_TX_HASH = import.meta.env.VITE_XUDT_TX_HASH || import.meta.env.XUDT_TX_HASH

const TOKEN_DECIMALS = 8

const buttonBaseClass =
  'inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-semibold tracking-[0.02em] transition duration-200 disabled:cursor-not-allowed disabled:opacity-50'
const primaryButtonClass =
  `${buttonBaseClass} bg-[#8df019] text-black shadow-[0_0_26px_rgba(141,240,25,0.18)] hover:bg-[#a2ff3e]`
const secondaryButtonClass =
  `${buttonBaseClass} border border-[#8df019]/30 bg-transparent text-[#8df019] hover:bg-[#8df019]/10`
const compactButtonClass =
  'inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white/[0.02] px-4 py-2 text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-zinc-100 transition duration-200 hover:border-[#8df019]/35 hover:bg-[#8df019]/10 disabled:cursor-not-allowed disabled:opacity-40'
const pillClass =
  'inline-flex items-center rounded-full border border-white/10 bg-white/[0.02] px-4 py-2 text-[0.68rem] font-semibold uppercase tracking-[0.26em] text-zinc-300'

function formatAddress(value: string) {
  if (!value) return 'Not connected'
  return `${value.slice(0, 14)}...${value.slice(-10)}`
}

function addThousandsSeparators(value: string) {
  return value.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

function formatTokenBalance(rawBalance: string, decimals = TOKEN_DECIMALS) {
  const normalized = rawBalance && /^\d+$/.test(rawBalance) ? rawBalance : '0'
  const padded = normalized.padStart(decimals + 1, '0')
  const whole = padded.slice(0, -decimals).replace(/^0+(?=\d)/, '') || '0'
  const fraction = padded.slice(-decimals).replace(/0+$/, '').slice(0, 4)

  return fraction ? `${addThousandsSeparators(whole)}.${fraction}` : addThousandsSeparators(whole)
}

function formatSyncTime(value: Date | null) {
  if (!value) return 'Awaiting first sync'

  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
  }).format(value)
}

function getNetworkLabel(network: string) {
  if (network === 'mainnet') return 'CKB Mainnet'
  if (network === 'testnet') return 'CKB Testnet'
  return 'Custom CKB Network'
}

type ReadoutRowProps = {
  label: string
  value: string
}

function ReadoutRow({ label, value }: ReadoutRowProps) {
  return (
    <div className="flex flex-col gap-3 border-t border-white/10 py-6 first:border-t-0 first:pt-0 sm:flex-row sm:items-start sm:justify-between">
      <span className="text-[0.72rem] font-semibold uppercase tracking-[0.22em] text-zinc-500">
        {label}
      </span>
      <strong className="max-w-md text-sm font-medium leading-7 text-zinc-100 sm:text-right">
        {value}
      </strong>
    </div>
  )
}

type MetaStatProps = {
  label: string
  value: string
}

function MetaStat({ label, value }: MetaStatProps) {
  return (
    <div className="border-l border-white/10 pl-4">
      <span className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-zinc-500">
        {label}
      </span>
      <strong className="mt-3 block text-sm font-medium leading-6 text-zinc-100">{value}</strong>
    </div>
  )
}

function App() {
  const { wallet, open, disconnect, client, setClient } = useCcc()
  const signer = useSigner()

  const [balance, setBalance] = useState('0')
  const [loading, setLoading] = useState(false)
  const [address, setAddress] = useState('')
  const [error, setError] = useState('')
  const [copiedField, setCopiedField] = useState('')
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null)
  const [syncProgress, setSyncProgress] = useState<{ current: number; target: number } | null>(null)

  useEffect(() => {
    if (CKB_NETWORK === 'mainnet') {
      setClient(
        new ccc.ClientPublicMainnet({
          url: CKB_RPC_URL,
        }),
      )
      return
    }

    setClient(
      new ccc.ClientPublicTestnet({
        url: CKB_RPC_URL,
      }),
    )
  }, [setClient])

  const checkSyncStatus = async () => {
    if (!client || !XUDT_TX_HASH) {
      setSyncProgress(null)
      return
    }
    try {
      const tx = await client.getTransaction(XUDT_TX_HASH)
      const tip = await client.getTip()
      if (tx && tx.status === 'committed' && tx.blockNumber !== undefined) {
        const depth = Number(tip - tx.blockNumber)
        // CKB testnet indexers usually need ~15-20 confirmations to reflect complex script changes reliably
        const targetConfirmations = 20
        if (depth < targetConfirmations) {
          setSyncProgress({ current: depth, target: targetConfirmations })
        } else {
          setSyncProgress(null)
        }
      } else {
        setSyncProgress({ current: 0, target: 20 })
      }
    } catch (err) {
      console.error('Failed to check sync status:', err)
      setSyncProgress(null)
    }
  }

  const fetchBalance = async () => {
    if (!signer || !XUDT_CODE_HASH) return

    setLoading(true)
    setError('')

    try {
      const recommendedAddress = await signer.getRecommendedAddress()
      const addressObject = await ccc.Address.fromString(recommendedAddress, signer.client)
      const lock = addressObject.script
      const cells = await signer.client.findCells({
        script: lock,
        scriptType: 'lock',
        scriptSearchMode: 'exact',
      })

      let total = 0n
      for await (const cell of cells) {
        const hasXudtType =
          cell.cellOutput.type && cell.cellOutput.type.codeHash === XUDT_CODE_HASH

        if (hasXudtType && cell.outputData.length >= 34) {
          const u128Bytes = ccc.bytesFrom(cell.outputData).slice(0, 16)
          total += ccc.numLeFromBytes(u128Bytes)
        }
      }

      setBalance(total.toString())
      setLastSyncedAt(new Date())
      void checkSyncStatus()
    } catch (caughtError: unknown) {
      console.error(caughtError)
      setError(caughtError instanceof Error ? caughtError.message : 'Failed to fetch balance')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!signer) {
      setAddress('')
      setBalance('0')
      setLastSyncedAt(null)
      setSyncProgress(null)
      return
    }

    void signer.getRecommendedAddress().then(setAddress)
    void fetchBalance()
  }, [signer])

  useEffect(() => {
    if (!signer || !client) return
    void checkSyncStatus()
  }, [signer, client])

  const copyText = async (value: string, field: string) => {
    try {
      await navigator.clipboard.writeText(value)
      setCopiedField(field)
      window.setTimeout(() => {
        setCopiedField((current) => (current === field ? '' : current))
      }, 1800)
    } catch {
      setError('Clipboard access is unavailable in this browser session.')
    }
  }

  const networkLabel = getNetworkLabel(CKB_NETWORK)
  const configurationReady = Boolean(XUDT_CODE_HASH && OWNER_LOCK_TX_HASH && XUDT_TX_HASH)
  const isConnected = Boolean(wallet)
  const walletName = wallet?.name || 'Wallet'
  const heroSecondaryActionLabel = isConnected ? 'Copy wallet address' : 'Copy code hash'
  const heroSecondaryActionValue = isConnected ? address : XUDT_CODE_HASH
  const heroSecondaryActionKey = isConnected ? 'address' : 'xudt-code-hash'

  return (
    <div className="min-h-screen bg-[#020302] text-zinc-100">
      <div className="relative mx-auto flex min-h-screen w-full max-w-[1600px] flex-col overflow-hidden pb-8 pt-8">
        <div className="pointer-events-none absolute inset-y-0 left-0 hidden w-12 border-r border-[#8df019]/10 bg-[repeating-linear-gradient(45deg,rgba(141,240,25,0.14)_0,rgba(141,240,25,0.14)_4px,transparent_4px,transparent_10px)] opacity-35 lg:block" />
        <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-12 border-l border-[#8df019]/10 bg-[repeating-linear-gradient(45deg,rgba(141,240,25,0.14)_0,rgba(141,240,25,0.14)_4px,transparent_4px,transparent_10px)] opacity-35 lg:block" />
        <div className="pointer-events-none absolute bottom-60 right-12 hidden h-24 w-24 lg:block">
          <div className="absolute inset-0 border border-[#8df019]/35 border-l-0 border-t-0" />
          <div className="absolute bottom-4 left-4 h-2.5 w-2.5 rounded-full bg-[#8df019]/80" />
        </div>

        <header className=" relative z-10 mx-auto flex w-full max-w-[560px] items-center justify-between rounded-full border border-white/10 bg-black/80 px-4 py-3 shadow-[0_18px_50px_rgba(0,0,0,0.45)] backdrop-blur">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#8df019] text-black">
              <Coins size={18} />
            </div>

            <div className="flex flex-col">
              <span className="text-[0.52rem] font-semibold uppercase tracking-[0.34em] text-zinc-500">
                xUDT Console
              </span>
              <span className="text-xl m-0 p-0 font-semibold tracking-[-0.03em] text-white">
                Command Deck
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="hidden rounded-full border border-white/10 px-3 py-2 text-[0.62rem] font-semibold uppercase tracking-[0.28em] text-zinc-400 sm:inline-flex">
              {networkLabel}
            </span>

            {isConnected ? (
              <button className={compactButtonClass} onClick={disconnect} type="button">
                Disconnect
              </button>
            ) : (
              <button className={compactButtonClass} onClick={open} type="button">
                <Wallet size={14} />
                Connect
              </button>
            )}
          </div>
        </header>

        <main className="relative z-10 flex-1 pt-8">
          <section className="sm:px-8 lg:px-10 overflow-hidden border-b border-t border-white/10 bg-[#04050489] shadow-[0_34px_90px_rgba(0,0,0,0.55)]">
            <div className="grid gap-0 lg:grid-cols-[minmax(0,1.2fr)_460px]">
              <div className="border-b border-white/10 px-7 py-10 sm:px-10 sm:py-12 lg:border-b-0 lg:border-r lg:px-12">
                <div className="flex flex-wrap items-center gap-3">
                  <span className={pillClass}>Signal-first treasury interface</span>
                  <span
                    className={`${pillClass} ${
                      configurationReady
                        ? 'border-[#8df019]/20 bg-[#8df019]/10 text-[#d9ffc0]'
                        : 'border-amber-500/20 bg-amber-500/10 text-amber-200'
                    }`}
                  >
                    {configurationReady ? 'Deployment ready' : 'Configuration incomplete'}
                  </span>
                </div>

                <p className="mt-14 text-[0.7rem] font-semibold uppercase tracking-[0.4em] text-zinc-500">
                  Ready to operate your treasury?
                </p>
                <h1 className="mt-4 max-w-4xl font-display text-[2.8rem] leading-[0.96] tracking-[-0.055em] text-white sm:text-[4.4rem]">
                  Manage xUDT balances and deployment state through a sharper command surface.
                </h1>
                <p className="mt-6 max-w-2xl text-base leading-8 text-zinc-400">
                  Connect a wallet, refresh balance state, and keep deployment references within
                  view from a layout that feels more like a launch page than a standard dashboard.
                </p>

                <div className="mt-10 flex flex-wrap gap-3">
                  {isConnected ? (
                    <button
                      className={primaryButtonClass}
                      disabled={loading}
                      onClick={() => {
                        void fetchBalance()
                      }}
                      type="button"
                    >
                      <RefreshCw className={loading ? 'animate-spin' : ''} size={18} />
                      {loading ? 'Refreshing balance' : 'Refresh balance'}
                    </button>
                  ) : (
                    <button className={primaryButtonClass} onClick={open} type="button">
                      <Wallet size={18} />
                      Connect wallet
                    </button>
                  )}

                  <button
                    className={secondaryButtonClass}
                    disabled={!heroSecondaryActionValue}
                    onClick={() => {
                      if (heroSecondaryActionValue) {
                        void copyText(heroSecondaryActionValue, heroSecondaryActionKey)
                      }
                    }}
                    type="button"
                  >
                    <Copy size={18} />
                    {copiedField === heroSecondaryActionKey ? 'Copied' : heroSecondaryActionLabel}
                  </button>
                </div>

                <div className="mt-14 grid gap-6 border-t border-white/10 pt-9 sm:grid-cols-3">
                  <MetaStat label="Network" value={networkLabel} />
                  <MetaStat label="Wallet" value={isConnected ? `${walletName} connected` : 'No active wallet'} />
                  <MetaStat label="Last sync" value={formatSyncTime(lastSyncedAt)} />
                </div>


                
                {error && (
                  <section className="mt-16 sm:px-8 lg:px-10 overflow-hidden border-b border-t border-[#ff7f7f]/18 bg-[#120909] py-4 text-sm leading-7 text-[#ffd0d0] shadow-[0_20px_40px_rgba(0,0,0,0.35)]">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="mt-0.5 shrink-0" size={18} />
                      <div>
                        <strong className="block font-semibold text-white">Latest request failed</strong>
                        <p className="mt-1">{error}</p>
                      </div>
                    </div>
                  </section>
                )}
              </div>

              <div className="px-7 py-10 sm:px-8 sm:py-12 lg:px-9">
                <div className="bg-black/70 p-6">
                  <div>
                    <p className="text-[0.68rem] font-semibold uppercase tracking-[0.34em] text-[#8df019]">
                      Live control surface
                    </p>
                    <h2 className="mt-3 text-[2rem] font-semibold tracking-[-0.04em] text-white">
                      Wallet and chain state
                    </h2>
                    <p className="mt-3 text-sm leading-7 text-zinc-400">
                      The balance, address, and sync posture stay visible here while the lower grid
                      carries the supporting deployment detail.
                    </p>
                  </div>

                  <div className="mt-7 p-5 border-b border-t border-[#8df019]/30 bg-[#04050489] shadow-[0_28px_70px_rgba(0,0,0,0.48)]">
                    <p className="text-[0.68rem] font-semibold uppercase tracking-[0.3em] text-zinc-500">
                      Current balance
                    </p>
                    <strong className="mt-4 block text-5xl font-semibold tracking-[-0.08em] text-white">
                      {loading && isConnected ? 'Refreshing...' : formatTokenBalance(balance)}
                    </strong>
                    <p className="mt-3 text-[0.72rem] font-semibold uppercase tracking-[0.26em] text-zinc-500">
                      xUDT units available
                    </p>
                  </div>

                  <div className="mt-7">
                    <ReadoutRow label="Wallet address" value={formatAddress(address)} />
                    <ReadoutRow label="Wallet provider" value={isConnected ? walletName : 'Not connected'} />
                    <ReadoutRow label="Client status" value={client ? 'Ready to query chain' : 'Initializing client'} />
                  </div>

                  <div className="mt-7 rounded-[1.5rem] border border-[#8df019]/18 bg-[#070a06] p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.32em] text-[#8df019]">
                          {syncProgress ? 'Indexer synchronizing' : 'Indexer ready'}
                        </p>
                        <p className="mt-2 text-sm leading-7 text-zinc-400">
                          {syncProgress
                            ? `Confirmation depth ${syncProgress.current} of ${syncProgress.target} blocks.`
                            : 'The tracked deployment transaction has already cleared the progress window.'}
                        </p>
                      </div>

                      {syncProgress ? (
                        <RefreshCw className="mt-1 animate-spin text-[#8df019]/70" size={18} />
                      ) : (
                        <div className="mt-1 h-2.5 w-2.5 rounded-full bg-[#8df019]" />
                      )}
                    </div>

                    {syncProgress && (
                      <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-white/8">
                        <div
                          className="h-full bg-[#8df019] transition-all duration-1000 ease-out"
                          style={{ width: `${Math.min(100, (syncProgress.current / syncProgress.target) * 100)}%` }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="mt-8 overflow-hidden sm:px-8 lg:px-10 border-b border-t border-white/10 bg-[#04050489] shadow-[0_28px_70px_rgba(0,0,0,0.48)]">
            <div className="grid md:grid-cols-2 xl:grid-cols-4">
              <div className="border-b border-white/10 px-7 py-9 md:border-r xl:border-b-0">
                <p className="text-[0.72rem] font-semibold uppercase tracking-[0.26em] text-[#8df019]">
                  Balance
                </p>
                <strong className="mt-6 block text-4xl font-semibold tracking-[-0.06em] text-white">
                  {formatTokenBalance(balance)}
                </strong>
                <p className="mt-4 text-sm leading-7 text-zinc-400">
                  Live xUDT units currently associated with the connected wallet.
                </p>
                <p className="mt-8 text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-zinc-500">
                  Last sync
                </p>
                <p className="mt-3 text-sm text-zinc-200">{formatSyncTime(lastSyncedAt)}</p>
              </div>

              <div className="border-b border-white/10 px-7 py-9 xl:border-b-0 xl:border-r">
                <p className="text-[0.72rem] font-semibold uppercase tracking-[0.26em] text-[#8df019]">
                  Session
                </p>
                <div className="mt-6 space-y-5">
                  <div>
                    <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-zinc-500">
                      Wallet state
                    </p>
                    <p className="mt-2 text-sm leading-7 text-zinc-200">
                      {isConnected ? `${walletName} connected` : 'No wallet connected'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-zinc-500">
                      Client
                    </p>
                    <p className="mt-2 text-sm leading-7 text-zinc-200">
                      {client ? 'Ready to query chain' : 'Initializing client'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-zinc-500">
                      Environment
                    </p>
                    <p className="mt-2 text-sm leading-7 text-zinc-200">
                      {configurationReady
                        ? 'Deployment references are loaded and available.'
                        : 'Some required deployment references are missing.'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="border-b border-white/10 px-7 py-9 md:border-r xl:border-b-0">
                <p className="text-[0.72rem] font-semibold uppercase tracking-[0.26em] text-[#8df019]">
                  Registry
                </p>
                <div className="mt-6">
                  <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-zinc-500">
                    xUDT code hash
                  </p>
                  <code className="mt-3 block break-all font-mono text-sm leading-7 text-zinc-200">
                    {XUDT_CODE_HASH || 'Not configured'}
                  </code>
                </div>
                <button
                  className={`mt-6 ${compactButtonClass}`}
                  disabled={!XUDT_CODE_HASH}
                  onClick={() => {
                    if (XUDT_CODE_HASH) {
                      void copyText(XUDT_CODE_HASH, 'xudt-code-hash')
                    }
                  }}
                  type="button"
                >
                  <Copy size={14} />
                  {copiedField === 'xudt-code-hash' ? 'Copied' : 'Copy code hash'}
                </button>
              </div>

              <div className="px-7 py-9">
                <p className="text-[0.72rem] font-semibold uppercase tracking-[0.26em] text-[#8df019]">
                  Deployment
                </p>
                <div className="mt-6 space-y-5">
                  <div>
                    <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-zinc-500">
                      Type transaction
                    </p>
                    <code className="mt-3 block break-all font-mono text-sm leading-7 text-zinc-200">
                      {XUDT_TX_HASH || 'Not configured'}
                    </code>
                  </div>
                  <div>
                    <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-zinc-500">
                      Lock transaction
                    </p>
                    <code className="mt-3 block break-all font-mono text-sm leading-7 text-zinc-200">
                      {OWNER_LOCK_TX_HASH || 'Not configured'}
                    </code>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </main>

        <footer className="relative z-10 mt-6  bg-[#04050489] sm:px-8 lg:px-10 flex flex-col gap-4 border-t border-white/10 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#8df019] text-black">
              <Coins size={16} />
            </div>
            <p className="text-sm text-zinc-400">
              xUDT Command Deck. Wallet-aware treasury interface for CKB.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <span className={pillClass}>{networkLabel}</span>
            <span className={pillClass}>{isConnected ? 'Wallet online' : 'Wallet offline'}</span>
          </div>
        </footer>
      </div>
    </div>
  )
}

export default App
