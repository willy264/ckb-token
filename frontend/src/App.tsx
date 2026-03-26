import { useEffect, useState } from 'react'
import { ccc } from '@ckb-ccc/ccc'
import { Coins } from 'lucide-react'
import '@ckb-ccc/joy-id'

import { useCcc, useSigner } from '@ckb-ccc/connector-react'
import { CommandHeader } from './components/CommandHeader'
import { HeroSection } from './components/HeroSection'
import { LiveControlSurface } from './components/LiveControlSurface'
import { DeploymentGrid } from './components/DeploymentGrid'


const CKB_NETWORK = import.meta.env.VITE_CKB_NETWORK || import.meta.env.CKB_NETWORK || 'testnet'
const CKB_RPC_URL = import.meta.env.VITE_CKB_RPC_URL || import.meta.env.CKB_RPC_URL
const XUDT_CODE_HASH = import.meta.env.VITE_XUDT_CODE_HASH || import.meta.env.XUDT_CODE_HASH
const OWNER_LOCK_TX_HASH =
  import.meta.env.VITE_OWNER_LOCK_TX_HASH || import.meta.env.OWNER_LOCK_TX_HASH
const XUDT_TX_HASH = import.meta.env.VITE_XUDT_TX_HASH || import.meta.env.XUDT_TX_HASH

const TOKEN_DECIMALS = 8

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

  const [activeTypeScript, setActiveTypeScript] = useState<ccc.Script | null>(null)
  const [recipient, setRecipient] = useState('')
  const [transferAmount, setTransferAmount] = useState('')
  const [transferring, setTransferring] = useState(false)

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
      let foundScript: ccc.Script | undefined = undefined

      for await (const cell of cells) {
        const hasXudtType =
          cell.cellOutput.type && cell.cellOutput.type.codeHash === XUDT_CODE_HASH

        if (hasXudtType && cell.outputData.length >= 34) {
          const u128Bytes = ccc.bytesFrom(cell.outputData).slice(0, 16)
          total += ccc.numLeFromBytes(u128Bytes)
          if (!foundScript) {
             foundScript = cell.cellOutput.type
          }
        }
      }

      setBalance(total.toString())
      setActiveTypeScript(foundScript || null)
      setLastSyncedAt(new Date())
      void checkSyncStatus()
    } catch (caughtError: unknown) {
      console.error(caughtError)
      setError(caughtError instanceof Error ? caughtError.message : 'Failed to fetch balance')
    } finally {
      setLoading(false)
    }
  }

  const handleTransfer = async () => {
    if (!signer || !client || !activeTypeScript || !XUDT_TX_HASH) return
    setTransferring(true)
    setError('')

    try {
      if (!recipient || !transferAmount || isNaN(Number(transferAmount))) {
        throw new Error('Please enter a valid recipient address and amount.')
      }

      const recipientAddress = await ccc.Address.fromString(recipient, client)
      const amountBigInt = BigInt(Math.floor(Number(transferAmount) * 10 ** TOKEN_DECIMALS))

      const tx = ccc.Transaction.from({
        outputs: [
          {
            lock: recipientAddress.script,
            type: activeTypeScript,
          },
        ],
        outputsData: [ccc.numLeToBytes(amountBigInt, 16)],
      })

      tx.addCellDeps({
        outPoint: {
          txHash: XUDT_TX_HASH,
          index: 0,
        },
        depType: 'code',
      })

      await tx.completeInputsByUdt(signer, activeTypeScript)
      await tx.completeInputsByCapacity(signer)

      // Calculate change
      let udtInputs = 0n
      for (const input of tx.inputs) {
        if (input.cellOutput && input.cellOutput.type && input.cellOutput.type.hash() === activeTypeScript.hash()) {
          udtInputs += ccc.numLeFromBytes(ccc.bytesFrom(input.outputData || '0x').slice(0, 16))
        }
      }

      const udtChange = udtInputs - amountBigInt
      if (udtChange > 0n) {
        const fromAddressStr = await signer.getRecommendedAddress()
        const fromAddress = await ccc.Address.fromString(fromAddressStr, client)
        await tx.addOutput(
          { lock: fromAddress.script, type: activeTypeScript },
          ccc.numLeToBytes(udtChange, 16)
        )
      }

      await tx.completeFeeBy(signer)
      await signer.sendTransaction(tx)

      setRecipient('')
      setTransferAmount('')
      
      // Allow the indexing slightly then sync
      window.setTimeout(() => {
        void fetchBalance()
      }, 4000)
    } catch (e: unknown) {
      console.error(e)
      setError(e instanceof Error ? e.message : 'Transfer transaction failed.')
    } finally {
      setTransferring(false)
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
      <div className="relative mx-auto flex min-h-screen w-full max-w-[1600px] flex-col pb-8 pt-6 sm:pt-8">
        <div className="pointer-events-none absolute inset-y-0 left-0 hidden w-12 border-r border-[#8df019]/10 bg-[repeating-linear-gradient(45deg,rgba(141,240,25,0.14)_0,rgba(141,240,25,0.14)_4px,transparent_4px,transparent_10px)] opacity-35 lg:block" />
        <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-12 border-l border-[#8df019]/10 bg-[repeating-linear-gradient(45deg,rgba(141,240,25,0.14)_0,rgba(141,240,25,0.14)_4px,transparent_4px,transparent_10px)] opacity-35 lg:block" />

        <CommandHeader
          disconnect={disconnect}
          isConnected={isConnected}
          networkLabel={networkLabel}
          open={open}
        />

        <main className="relative z-10 flex-1 pt-6 sm:pt-8">
          <section className="overflow-hidden border-b border-t border-white/10 bg-[#04050489] shadow-[0_34px_90px_rgba(0,0,0,0.55)] sm:px-8 lg:px-10">
            <div className="grid lg:grid-cols-[minmax(0,1.2fr)_420px] xl:grid-cols-[minmax(0,1.2fr)_460px]">
              <HeroSection
                configurationReady={configurationReady}
                copiedField={copiedField}
                copyText={copyText}
                error={error}
                fetchBalance={fetchBalance}
                formatSyncTime={formatSyncTime}
                heroSecondaryActionKey={heroSecondaryActionKey}
                heroSecondaryActionLabel={heroSecondaryActionLabel}
                heroSecondaryActionValue={heroSecondaryActionValue}
                isConnected={isConnected}
                lastSyncedAt={lastSyncedAt}
                loading={loading}
                networkLabel={networkLabel}
                open={open}
                walletName={walletName}
              />
              <LiveControlSurface
                activeTypeScript={activeTypeScript}
                address={address}
                balance={balance}
                client={!!client}
                formatAddress={formatAddress}
                formatTokenBalance={formatTokenBalance}
                handleTransfer={handleTransfer}
                isConnected={isConnected}
                loading={loading}
                recipient={recipient}
                setRecipient={setRecipient}
                setTransferAmount={setTransferAmount}
                transferAmount={transferAmount}
                transferring={transferring}
                walletName={walletName}
              />
            </div>
          </section>

          <DeploymentGrid
            OWNER_LOCK_TX_HASH={OWNER_LOCK_TX_HASH}
            XUDT_CODE_HASH={XUDT_CODE_HASH}
            XUDT_TX_HASH={XUDT_TX_HASH}
            balance={balance}
            client={!!client}
            configurationReady={configurationReady}
            copiedField={copiedField}
            copyText={copyText}
            formatSyncTime={formatSyncTime}
            formatTokenBalance={formatTokenBalance}
            isConnected={isConnected}
            lastSyncedAt={lastSyncedAt}
            syncProgress={syncProgress}
            walletName={walletName}
          />
        </main>

        <footer className="relative z-10 mt-6 flex flex-col gap-4 border-t border-white/10 bg-[#04050489] px-5 pt-6 pb-4 sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-10">
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
