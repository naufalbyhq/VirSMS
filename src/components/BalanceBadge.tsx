import { RefreshCw, Wallet } from 'lucide-react';
import { cn } from '../lib/utils';

interface BalanceBadgeProps {
  balance: number | null;
  isRefreshing: boolean;
  onRefresh: () => void;
}

export function BalanceBadge({ balance, isRefreshing, onRefresh }: BalanceBadgeProps) {
  return (
    <div className="flex items-center justify-center lg:justify-start gap-3 p-3 rounded-2xl bg-white/5 border border-white/10">
      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500/30 to-blue-600/30 flex items-center justify-center border border-indigo-500/20 flex-shrink-0">
        <Wallet className="w-4 h-4 text-indigo-400" />
      </div>
      <div className="hidden lg:flex flex-1 items-center justify-between overflow-hidden">
        <div className="overflow-hidden">
          <p className="text-xs text-slate-500 font-medium">Balance</p>
          <p className="text-sm font-bold text-white truncate">
            {balance !== null ? `~$${balance.toFixed(2)} USD` : 'Loading...'}
          </p>
        </div>
        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          className="p-1.5 text-slate-500 hover:text-white hover:bg-white/10 rounded-lg transition-all disabled:opacity-40"
          title="Refresh balance"
          aria-label="Refresh balance"
        >
          <RefreshCw className={cn("w-3.5 h-3.5", isRefreshing && "animate-spin")} />
        </button>
      </div>
    </div>
  );
}
