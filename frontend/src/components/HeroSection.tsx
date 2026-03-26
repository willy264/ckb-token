import { Copy, RefreshCw, Wallet, AlertCircle } from 'lucide-react'
import { motion } from 'framer-motion'

const buttonBaseClass =
  'inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-semibold tracking-[0.02em] transition duration-200 disabled:cursor-not-allowed disabled:opacity-50'
const primaryButtonClass = `${buttonBaseClass} bg-[#8df019] text-black shadow-[0_0_26px_rgba(141,240,25,0.18)] hover:bg-[#a2ff3e]`
const secondaryButtonClass = `${buttonBaseClass} border border-[#8df019]/30 bg-transparent text-[#8df019] hover:bg-[#8df019]/10`
const pillClass =
  'inline-flex items-center rounded-full border border-white/10 bg-white/[0.02] px-4 py-2 text-[0.68rem] font-semibold uppercase tracking-[0.26em] text-zinc-300'

function MetaStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-l border-white/10 pl-4">
      <span className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-zinc-500">
        {label}
      </span>
      <strong className="mt-3 block text-sm font-medium leading-6 text-zinc-100">{value}</strong>
    </div>
  )
}

type HeroSectionProps = {
  configurationReady: boolean
  isConnected: boolean
  loading: boolean
  fetchBalance: () => void
  open: () => void
  heroSecondaryActionValue: string | undefined
  heroSecondaryActionKey: string
  copiedField: string
  copyText: (val: string, key: string) => void
  heroSecondaryActionLabel: string
  networkLabel: string
  walletName: string
  lastSyncedAt: Date | null
  formatSyncTime: (d: Date | null) => string
  error: string
}

export function HeroSection({
  configurationReady,
  isConnected,
  loading,
  fetchBalance,
  open,
  heroSecondaryActionValue,
  heroSecondaryActionKey,
  copiedField,
  copyText,
  heroSecondaryActionLabel,
  networkLabel,
  walletName,
  lastSyncedAt,
  formatSyncTime,
  error,
}: HeroSectionProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -30 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.6, delay: 0.1, ease: 'easeOut' }}
      className="border-b border-white/10 px-5 py-8 sm:px-8 sm:py-10 lg:border-b-0 lg:border-r lg:px-12"
    >
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

      <p className="mt-8 text-[0.68rem] font-semibold uppercase tracking-[0.4em] text-zinc-500 sm:mt-12">
        Ready to operate your treasury?
      </p>
      <h1 className="mt-3 font-display text-[2rem] leading-[0.95] tracking-[-0.04em] text-white sm:text-[3rem] lg:text-[4rem] xl:text-[4.4rem]">
        Manage xUDT balances and deployment state through a sharper command surface.
      </h1>
      <p className="mt-4 max-w-2xl text-sm leading-7 text-zinc-400 sm:text-base sm:leading-8">
        Connect a wallet, refresh balance state, and keep deployment references within view
        from a layout that feels more like a launch page than a standard dashboard.
      </p>

      <div className="mt-7 flex flex-wrap gap-3">
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

      <div className="mt-8 grid gap-5 border-t border-white/10 pt-7 sm:mt-10 sm:grid-cols-3">
        <MetaStat label="Network" value={networkLabel} />
        <MetaStat label="Wallet" value={isConnected ? `${walletName} connected` : 'No active wallet'} />
        <MetaStat label="Last sync" value={formatSyncTime(lastSyncedAt)} />
      </div>

      {error && (
        <section className="mt-16 overflow-hidden border-b border-t border-[#ff7f7f]/18 bg-[#120909] py-4 text-sm leading-7 text-[#ffd0d0] shadow-[0_20px_40px_rgba(0,0,0,0.35)] sm:px-8 lg:px-10">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 shrink-0" size={18} />
            <div>
              <strong className="block font-semibold text-white">Latest request failed</strong>
              <p className="mt-1">{error}</p>
            </div>
          </div>
        </section>
      )}
    </motion.div>
  )
}
