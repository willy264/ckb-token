import { RefreshCw, Send, Check, Circle, PackageSearch } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { ccc } from '@ckb-ccc/ccc'

type TokenInfo = {
  name: string
  symbol: string
  decimals: number
  balance: string
  script: ccc.Script
  hash: string
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

type LiveControlSurfaceProps = {
  isConnected: boolean
  loading: boolean
  balance: string
  formatTokenBalance: (b: string, d?: number) => string
  formatAddress: (a: string) => string
  address: string
  walletName: string
  client: boolean
  tokens: TokenInfo[]
  activeTypeScript: ccc.Script | null
  setActiveTypeScript: (s: ccc.Script | null) => void
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
  tokens,
  activeTypeScript,
  setActiveTypeScript,
  recipient,
  setRecipient,
  transferAmount,
  setTransferAmount,
  handleTransfer,
  transferring,
}: LiveControlSurfaceProps) {
  const selectedTokenHash = activeTypeScript?.hash()
  const activeToken = tokens.find(t => t.hash === selectedTokenHash)

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
            Portfolio & Transfers
          </h2>
          <p className="mt-3 text-sm leading-7 text-zinc-400">
            Manage individual xUDT assets associated with your connected provider.
          </p>
        </div>

        {/* ── Total Portfolio Value ── */}
        <div className="mt-5 border-b border-t border-[#8df019]/30 bg-[#04050489] p-4 shadow-[0_28px_70px_rgba(0,0,0,0.48)] sm:mt-7 sm:p-5">
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.3em] text-zinc-500">
            Total Aggregate Balance
          </p>
          <strong className="mt-3 block text-4xl font-semibold tracking-[-0.08em] text-white sm:text-5xl">
            {loading && isConnected ? 'Refreshing...' : formatTokenBalance(balance)}
          </strong>
          <p className="mt-3 text-[0.72rem] font-semibold uppercase tracking-[0.26em] text-zinc-500">
            Calculated across {tokens.length} assets
          </p>
        </div>

        {/* ── Token Inventory ── */}
        <div className="mt-10 overflow-hidden border border-white/10 bg-black/20">
          <div className="bg-white/5 border-b border-white/10 px-4 py-3">
             <p className="text-[0.64rem] font-semibold uppercase tracking-[0.25em] text-zinc-400">Asset Inventory</p>
          </div>
          
          <div className="divide-y divide-white/5">
            {tokens.length > 0 ? (
              tokens.map((token) => {
                const isSelected = selectedTokenHash === token.hash
                return (
                  <button
                    key={token.hash}
                    onClick={() => setActiveTypeScript(token.script)}
                    className={`group flex w-full cursor-pointer items-center justify-between px-5 py-5 transition hover:bg-[#8df019]/5 ${
                      isSelected ? 'bg-[#8df019]/10' : ''
                    }`}
                  >
                    <div className="flex flex-col items-start text-left">
                      <div className="flex items-center gap-2">
                        <span className={`text-[0.72rem] font-bold uppercase tracking-[0.14em] ${isSelected ? 'text-[#8df019]' : 'text-white'}`}>
                          {token.name}
                        </span>
                        <span className="rounded-sm bg-white/5 px-1.5 py-0.5 text-[0.6rem] font-bold text-zinc-400 capitalize">
                          {token.symbol}
                        </span>
                      </div>
                      <span className="mt-1 text-[0.64rem] text-zinc-500 font-mono tracking-tight">
                        ID: {token.hash.slice(0, 10)}...{token.hash.slice(-8)}
                      </span>
                    </div>
                    <div className="flex items-center gap-4">
                       <div className="text-right">
                         <p className="text-lg font-semibold tracking-tighter text-white">
                           {formatTokenBalance(token.balance, token.decimals)}
                         </p>
                       </div>
                       
                       <div className="flex h-6 w-6 items-center justify-center">
                         {isSelected ? (
                           <motion.div
                             initial={{ scale: 0.5, opacity: 0 }}
                             animate={{ scale: 1, opacity: 1 }}
                             className="text-[#8df019]"
                           >
                             <Check size={18} strokeWidth={3} />
                           </motion.div>
                         ) : (
                           <Circle size={14} className="text-zinc-800 transition-colors group-hover:text-zinc-600" />
                         )}
                       </div>
                    </div>
                  </button>
                )
              })
            ) : isConnected && !loading ? (
              <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/5 text-zinc-600">
                  <PackageSearch size={24} />
                </div>
                <p className="mt-4 text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-zinc-400">No tokens found</p>
                <p className="mt-2 text-xs text-zinc-500">Connect a wallet with xUDT balances to see them here.</p>
              </div>
            ) : null}
          </div>
        </div>

        {/* ── Transfer Section ── */}
        <AnimatePresence>
          {isConnected && activeToken && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.4 }}
              className="mt-8 overflow-hidden rounded-xl border border-[#8df019]/20 bg-[#8df019]/5 p-5 shadow-[0_0_40px_rgba(141,240,25,0.05)]"
            >
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <p className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-[#8df019]">
                    Transfer {activeToken.symbol}
                  </p>
                  <p className="mt-1 text-[0.6rem] text-zinc-500 transition-opacity">
                    Authorized through JoyID biometric sign
                  </p>
                </div>
                <div className="flex items-center gap-2 rounded-full bg-black/40 px-3 py-1 border border-white/5">
                   <div className="h-2 w-2 rounded-full bg-[#8df019] animate-pulse" />
                   <span className="text-[0.6rem] font-bold uppercase tracking-wider text-white">Active Asset</span>
                </div>
              </div>
              
              <div className="flex flex-col gap-3">
                <input
                  className="w-full rounded-md border border-white/10 bg-black/40 px-3 py-3 text-sm text-white placeholder-zinc-600 focus:border-[#8df019]/50 focus:outline-none transition-colors"
                  onChange={(e) => setRecipient(e.target.value)}
                  placeholder="Recipient Address (ckt1q...)"
                  type="text"
                  value={recipient}
                />
                <div className="flex gap-3">
                  <div className="relative flex-1">
                    <input
                      className="w-full rounded-md border border-white/10 bg-black/40 px-3 py-3 pr-12 text-sm text-white placeholder-zinc-600 focus:border-[#8df019]/50 focus:outline-none transition-colors"
                      onChange={(e) => setTransferAmount(e.target.value)}
                      placeholder="0.00"
                      type="number"
                      value={transferAmount}
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[0.6rem] font-bold text-zinc-600 uppercase">
                      {activeToken.symbol}
                    </div>
                  </div>
                  <button
                    className="flex cursor-pointer items-center justify-center rounded-md bg-[#8df019] px-6 font-bold text-black transition-all hover:bg-[#a2ff3e] hover:shadow-[0_0_20px_rgba(141,240,25,0.4)] active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={transferring || loading}
                    onClick={() => void handleTransfer()}
                  >
                    {transferring ? <RefreshCw className="animate-spin" size={18} /> : <Send size={20}/>}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="mt-8">
          <ReadoutRow label="Wallet address" value={formatAddress(address)} />
          <ReadoutRow label="Wallet provider" value={isConnected ? walletName : 'Not connected'} />
          <ReadoutRow label="Client status" value={client ? 'Ready to query chain' : 'Initializing client'} />
        </div>
      </div>
    </motion.div>
  )
}
