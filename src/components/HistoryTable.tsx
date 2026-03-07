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
        <thead className="bg-black/40 text-slate-400 text-xs uppercase tracking-wider font-bold">
          <tr>
            <th className="px-8 py-5">Service</th>
            <th className="px-8 py-5">Number</th>
            <th className="px-8 py-5">Date</th>
            <th className="px-8 py-5">Status</th>
            <th className="px-8 py-5">Code</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {items.length === 0 ? (
            <tr>
              <td colSpan={5} className="px-8 py-16 text-center">
                <div className="flex flex-col items-center gap-3 text-slate-500">
                  <History className="w-10 h-10 opacity-30" />
                  <p className="font-medium">No activity yet</p>
                  <p className="text-xs">Purchase a number to see it here</p>
                </div>
              </td>
            </tr>
          ) : (
            rows.map((item) => (
              <tr key={item.id} className="hover:bg-white/[0.02] transition-colors">
                <td className="px-8 py-5">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-sm border border-white/10">
                      {SERVICES.find(s => s.name === item.service)?.icon || '📱'}
                    </div>
                    <div>
                      <div className="text-white font-bold">{item.service}</div>
                      <div className="text-xs text-slate-500">{item.country}</div>
                    </div>
                  </div>
                </td>
                <td className="px-8 py-5 font-mono text-slate-300 font-medium">
                  {formatPhoneNumber(item.number, item.country)}
                </td>
                <td className="px-8 py-5 text-slate-400">{item.date}</td>
                <td className="px-8 py-5">
                  <span className={cn(
                    'px-3 py-1.5 rounded-lg text-xs font-bold border',
                    item.status === 'Completed'
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      : 'bg-white/5 text-slate-400 border-white/10'
                  )}>
                    {item.status}
                  </span>
                </td>
                <td className="px-8 py-5 font-mono font-bold text-white">{item.code || '—'}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
