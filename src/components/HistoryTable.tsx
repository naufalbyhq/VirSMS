import { History } from 'lucide-react';
import { cn } from '../lib/utils';
import { SERVICES } from '../constants/services';
import { formatPhoneNumber } from '../lib/format';

export interface HistoryItem {
  id: string;
  service: string;
  country: string;
  number: string;
  date: string;
  status: string;
  code: string;
}

interface HistoryTableProps {
  items: HistoryItem[];
  limit?: number;
}

export function HistoryTable({ items, limit }: HistoryTableProps) {
  const rows = limit ? items.slice(0, limit) : items;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm whitespace-nowrap">
        <thead className="bg-zinc-900/50 text-zinc-500 text-xs uppercase tracking-wider font-semibold border-b border-zinc-800">
          <tr>
            <th className="px-6 py-4 font-medium">Service</th>
            <th className="px-6 py-4 font-medium">Number</th>
            <th className="px-6 py-4 font-medium">Date</th>
            <th className="px-6 py-4 font-medium">Status</th>
            <th className="px-6 py-4 font-medium">Code</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-800/50">
          {items.length === 0 ? (
            <tr>
              <td colSpan={5} className="px-6 py-12 text-center">
                <div className="flex flex-col items-center gap-2 text-zinc-500">
                  <History className="w-8 h-8 opacity-50 mb-2" />
                  <p className="font-medium text-sm">No activity yet</p>
                  <p className="text-xs">Purchase a number to see it here</p>
                </div>
              </td>
            </tr>
          ) : (
            rows.map((item) => (
              <tr key={item.id} className="hover:bg-zinc-900/30 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-md bg-zinc-900 flex items-center justify-center text-sm border border-zinc-800">
                      {SERVICES.find(s => s.name === item.service)?.icon || '📱'}
                    </div>
                    <div>
                      <div className="text-zinc-100 font-medium">{item.service}</div>
                      <div className="text-xs text-zinc-500">{item.country}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 font-mono text-zinc-300 text-sm">
                  {formatPhoneNumber(item.number, item.country)}
                </td>
                <td className="px-6 py-4 text-zinc-500 text-sm">{item.date}</td>
                <td className="px-6 py-4">
                  <span className={cn(
                    'px-2.5 py-1 rounded-sm text-xs font-medium border',
                    item.status === 'Completed'
                      ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                      : 'bg-zinc-900 text-zinc-400 border-zinc-800'
                  )}>
                    {item.status}
                  </span>
                </td>
                <td className="px-6 py-4 font-mono font-medium text-zinc-100">{item.code || '—'}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
