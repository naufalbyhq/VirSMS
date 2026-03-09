import { RefreshCw, Wallet } from 'lucide-react';
import { cn } from '../lib/utils';

interface BalanceBadgeProps {
  balance: number | null;
  isRefreshing: boolean;
  onRefresh: () => void;
}

export function BalanceBadge({ balance, isRefreshing, onRefresh }: BalanceBadgeProps) {
  return (
    <div className="flex items-center justify-center lg:justify-start gap-3 p-3 rounded-md bg-zinc-900 border border-zinc-800">
      <div className="w-8 h-8 rounded-md bg-zinc-800 flex items-center justify-center border border-zinc-700 flex-shrink-0">
        <Wallet className="w-4 h-4 text-zinc-400" />
      </div>
      <div className="hidden lg:flex flex-1 items-center justify-between overflow-hidden">
        <div className="overflow-hidden">
          <p className="text-[10px] text-zinc-500 font-medium uppercase tracking-wider">Balance</p>
          <p className="text-sm font-semibold text-zinc-100 truncate">
            {balance !== null ? `$${balance.toFixed(2)}` : '...'}
          </p>
        </div>
        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          className="p-1.5 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 rounded-md transition-colors disabled:opacity-40"
          title="Refresh balance"
          aria-label="Refresh balance"
        >
          <RefreshCw className={cn("w-3.5 h-3.5", isRefreshing && "animate-spin")} />
        </button>
      </div>
    </div>
  );
}
