import { Coins, Wallet } from 'lucide-react'
import { motion } from 'framer-motion'

type CommandHeaderProps = {
  networkLabel: string
  isConnected: boolean
  open: () => void
  disconnect: () => void
}

const compactButtonClass =
  'inline-flex items-center justify-center gap-2 rounded-full border border-[#8df019]/30 bg-[#8df019]/10 px-4 py-2 text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-[#8df019] transition duration-200 hover:border-[#8df019]/35 hover:bg-[#8df019]/10 disabled:cursor-not-allowed disabled:opacity-40'

export function CommandHeader({
  networkLabel,
  isConnected,
  open,
  disconnect,
}: CommandHeaderProps) {
  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="relative z-10 mx-4 flex gap-10 flex-wrapw-auto items-center justify-between rounded-full border border-white/10 bg-black/80 px-4 py-3 shadow-[0_18px_50px_rgba(0,0,0,0.45)] backdrop-blur sm:mx-auto sm:max-w-[560px]"
    >
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#8df019] text-black">
          <Coins size={18} />
        </div>

        <div className="flex flex-col">
          <span className="text-[0.52rem] font-semibold uppercase tracking-[0.34em] text-zinc-500">
            xUDT Console
          </span>
          <span className="m-0 p-0 text-xl font-semibold tracking-[-0.03em] text-white">
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
    </motion.header>
  )
}
