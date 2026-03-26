import { RefreshCw, Send } from 'lucide-react'
import { motion } from 'framer-motion'
import { ccc } from '@ckb-ccc/ccc'

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

type LiveControlSurfaceProps = {
  isConnected: boolean
  loading: boolean
  balance: string
  formatTokenBalance: (b: string) => string
  formatAddress: (a: string) => string
  address: string
  walletName: string
  client: boolean
  activeTypeScript: ccc.Script | null
  recipient: string
  setRecipient: (v: string) => void
  transferAmount: string
  setTransferAmount: (v: string) => void
  handleTransfer: () => void
  transferring: boolean
}

export function LiveControlSurface({
  isConnected,
  loading,
  balance,
  formatTokenBalance,
  formatAddress,
  address,
  walletName,
  client,
  activeTypeScript,
  recipient,
  setRecipient,
  transferAmount,
  setTransferAmount,
  handleTransfer,
  transferring,
}: LiveControlSurfaceProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.6, delay: 0.2, ease: 'easeOut' }}
      className="px-5 py-8 sm:px-8 sm:py-10 lg:px-9"
    >
      <div className="bg-black/70 p-4 sm:p-6">
        <div>
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.34em] text-[#8df019]">
            Live control surface
          </p>
          <h2 className="mt-2 text-xl font-semibold tracking-[-0.04em] text-white sm:text-[1.8rem] sm:mt-3">
            Wallet and chain state
          </h2>
          <p className="mt-3 text-sm leading-7 text-zinc-400">
            The balance, address, and sync posture stay visible here while the lower grid carries the supporting deployment detail.
          </p>
        </div>

        <div className="mt-5 border-b border-t border-[#8df019]/30 bg-[#04050489] p-4 shadow-[0_28px_70px_rgba(0,0,0,0.48)] sm:mt-7 sm:p-5">
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.3em] text-zinc-500">
            Current balance
          </p>
          <strong className="mt-3 block text-4xl font-semibold tracking-[-0.08em] text-white sm:text-5xl">
            {loading && isConnected ? 'Refreshing...' : formatTokenBalance(balance)}
          </strong>
          <p className="mt-3 text-[0.72rem] font-semibold uppercase tracking-[0.26em] text-zinc-500">
            xUDT units available
          </p>

          {isConnected && activeTypeScript && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              transition={{ duration: 0.4 }}
              className="mt-8 overflow-hidden border-t border-white/5 pt-6"
            >
              <p className="mb-4 text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-[#8df019]">
                Transfer Assets
              </p>
              <div className="flex flex-col gap-3">
                <input
                  className="w-full rounded-md border border-white/10 bg-black/40 px-3 py-2 text-sm text-white placeholder-zinc-600 focus:border-[#8df019]/50 focus:outline-none"
                  onChange={(e) => setRecipient(e.target.value)}
                  placeholder="Recipient Address (ckt1q...)"
                  type="text"
                  value={recipient}
                />
                <div className="flex gap-3">
                  <input
                    className="w-full rounded-md border border-white/10 bg-black/40 px-3 py-2 text-sm text-white placeholder-zinc-600 focus:border-[#8df019]/50 focus:outline-none"
                    onChange={(e) => setTransferAmount(e.target.value)}
                    placeholder="Amount"
                    type="number"
                    value={transferAmount}
                  />
                  <button
                    className="flex cursor-pointer items-center justify-center rounded-md bg-[#8df019] px-4 font-semibold text-black transition hover:bg-[#a2ff3e] disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={transferring || loading}
                    onClick={() => void handleTransfer()}
                  >
                    {transferring ? <RefreshCw className="animate-spin" size={16} /> : <Send size={16} />}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </div>

        <div className="mt-7">
          <ReadoutRow label="Wallet address" value={formatAddress(address)} />
          <ReadoutRow label="Wallet provider" value={isConnected ? walletName : 'Not connected'} />
          <ReadoutRow label="Client status" value={client ? 'Ready to query chain' : 'Initializing client'} />
        </div>

      </div>
    </motion.div>
  )
}
