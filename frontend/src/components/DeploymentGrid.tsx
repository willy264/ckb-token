import { Copy } from 'lucide-react'
import { motion } from 'framer-motion'

const compactButtonClass =
  'inline-flex cursor-pointer items-center justify-center gap-2 rounded-full border border-[#8df019]/30 bg-[#8df019]/10 px-4 py-2 text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-[#8df019] transition duration-200 hover:border-[#8df019]/35 hover:bg-[#8df019]/10 disabled:cursor-not-allowed disabled:opacity-40'

type DeploymentGridProps = {
  formatTokenBalance: (b: string) => string
  balance: string
  formatSyncTime: (d: Date | null) => string
  lastSyncedAt: Date | null
  isConnected: boolean
  walletName: string
  client: boolean
  configurationReady: boolean
  XUDT_CODE_HASH: string
  XUDT_TX_HASH: string
  OWNER_LOCK_TX_HASH: string
  copiedField: string
  copyText: (val: string, key: string) => void
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.4
    }
  }
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0, 
    transition: { duration: 0.5, ease: 'easeOut' as const } 
  }
}

export function DeploymentGrid({
  formatTokenBalance,
  balance,
  formatSyncTime,
  lastSyncedAt,
  isConnected,
  walletName,
  client,
  configurationReady,
  XUDT_CODE_HASH,
  XUDT_TX_HASH,
  OWNER_LOCK_TX_HASH,
  copiedField,
  copyText
}: DeploymentGridProps) {
  return (
    <motion.section 
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="mt-8 overflow-hidden border-b border-t border-white/10 bg-[#04050489] shadow-[0_28px_70px_rgba(0,0,0,0.48)] sm:px-8 lg:px-10"
    >
      <div className="grid md:grid-cols-2 xl:grid-cols-4">
        <motion.div variants={itemVariants} className="border-b border-white/10 px-5 py-7 sm:px-7 sm:py-9 md:border-r xl:border-b-0">
          <p className="text-[0.72rem] font-semibold uppercase tracking-[0.26em] text-[#8df019]">
            Balance
          </p>
          <strong className="mt-5 block text-3xl font-semibold tracking-[-0.06em] text-white sm:text-4xl">
            {formatTokenBalance(balance)}
          </strong>
          <p className="mt-4 text-sm leading-7 text-zinc-400">
            Live xUDT units currently associated with the connected wallet.
          </p>
          <p className="mt-8 text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-zinc-500">
            Last sync
          </p>
          <p className="mt-3 text-sm text-zinc-200">{formatSyncTime(lastSyncedAt)}</p>
        </motion.div>

        <motion.div variants={itemVariants} className="border-b border-white/10 px-5 py-7 sm:px-7 sm:py-9 xl:border-b-0 xl:border-r">
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
        </motion.div>

        <motion.div variants={itemVariants} className="border-b border-white/10 px-5 py-7 sm:px-7 sm:py-9 md:border-r xl:border-b-0">
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
        </motion.div>

        <motion.div variants={itemVariants} className="px-5 py-7 sm:px-7 sm:py-9">
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
        </motion.div>
      </div>
    </motion.section>
  )
}
