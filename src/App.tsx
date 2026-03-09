import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  History,
  LayoutDashboard,
  Zap,
  AlertCircle,
  Trash2,
  Download,
  XCircle,
} from 'lucide-react';
import { cn } from './lib/utils';
import { getNumber, setStatus } from './lib/api';
import { SERVICES } from './constants/services';
import { COUNTRIES } from './constants/countries';
import { getCountryFlag } from './constants/countryFlags';
import { HistoryTable } from './components/HistoryTable';
import type { HistoryItem } from './components/HistoryTable';
import { useBalance } from './hooks/useBalance';
import { usePrices } from './hooks/usePrices';
import { usePolling } from './hooks/usePolling';
import { BalanceBadge } from './components/BalanceBadge';
import { PurchasePanel } from './components/PurchasePanel';
import { ActiveSessionsPanel } from './components/ActiveSessionsPanel';

function playChime() {
  try {
    const ctx = new AudioContext();
    const frequencies = [523.25, 659.25, 783.99, 1046.5];
    frequencies.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.value = freq;
      const t = ctx.currentTime + i * 0.15;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.25, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
      osc.start(t);
      osc.stop(t + 0.4);
    });
  } catch (err) {
    console.error('Failed to play chime:', err);
  }
}

function exportHistoryCSV(items: HistoryItem[]) {
  const header = 'Service,Country,Number,Date,Status,Code';
  const rows = items.map(i =>
    [i.service, i.country, i.number, i.date, i.status, i.code || ''].map(v => `"${v.replace(/"/g, '""')}"`).join(',')
  );
  const csv = [header, ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `virsms-history-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

interface ActiveNumber {
  activationId: string;
  number: string;
  service: string;
  country: string;
  flag: string;
  icon: string | undefined;
  color: string | undefined;
  status: string;
  smsCode: string | null;
}

export default function App() {
  const [selectedService, setSelectedService] = useState(SERVICES[0].id);
  const [selectedCountry, setSelectedCountry] = useState(COUNTRIES[0].id);
  const [page, setPage] = useState<'dashboard' | 'history'>('dashboard');
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [activeNumbers, setActiveNumbers] = useState<ActiveNumber[]>([]);
  const [copied, setCopied] = useState<Record<string, boolean>>({});
  const [timeRemaining, setTimeRemaining] = useState<Record<string, number>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [hideOutOfStock, setHideOutOfStock] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCountryDropdownOpen, setIsCountryDropdownOpen] = useState(false);
  const [countrySearchQuery, setCountrySearchQuery] = useState('');

  const { balance, isRefreshing, refresh: handleRefreshBalance } = useBalance();
  const { prices, isLoading: loadingPrices } = usePrices(selectedCountry);

  const [history, setHistory] = useState<HistoryItem[]>(() => {
    try {
      const saved = localStorage.getItem('virsms_history');
      return saved ? JSON.parse(saved) : [];
    } catch (err) {
      console.error('Failed to load history from localStorage:', err);
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('virsms_history', JSON.stringify(history));
    } catch (err) {
      console.error('Failed to save history to localStorage:', err);
    }
  }, [history]);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        const next = { ...prev };
        let changed = false;
        for (const id in next) {
          if (next[id] > 0) {
            next[id] -= 1;
            changed = true;
          }
        }
        return changed ? next : prev;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    activeNumbers.forEach(activeNumber => {
      if (activeNumber.status === 'waiting' && timeRemaining[activeNumber.activationId] === 0) {
        setStatus(activeNumber.activationId, 8)
          .then(() => {
            setActiveNumbers(prev => prev.filter(n => n.activationId !== activeNumber.activationId));
            setError('Session expired — number was automatically cancelled after 20 minutes.');
          })
          .catch(() => {
            setActiveNumbers(prev => prev.filter(n => n.activationId !== activeNumber.activationId));
            setError('Session timed out.');
          });
      }
    });
  }, [activeNumbers, timeRemaining]);

  const handleReceived = useCallback((activationId: string, code: string, newItem: HistoryItem) => {
    setHistory(h => [newItem, ...h]);
    setActiveNumbers(prev => prev.map(n => 
      n.activationId === activationId 
        ? { ...n, status: 'received', smsCode: code } 
        : n
    ));
    playChime();
  }, []);

  const handleCancelled = useCallback((activationId: string) => {
    setActiveNumbers(prev => prev.filter(n => n.activationId !== activationId));
  }, []);

  usePolling({
    activeNumbers,
    onReceived: handleReceived,
    onCancelled: handleCancelled,
    onError: setError,
  });

  const handleCopy = useCallback((text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(prev => ({ ...prev, [id]: true }));
    setTimeout(() => setCopied(prev => ({ ...prev, [id]: false })), 2000);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const receivedNumbers = activeNumbers.filter(n => n.status === 'received');
      if (receivedNumbers.length === 0) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'c' || e.key === 'C' || e.key === 'Enter') {
        const latest = receivedNumbers[receivedNumbers.length - 1];
        handleCopy(latest.smsCode ?? '', `code_${latest.activationId}`);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [activeNumbers, handleCopy]);

  const handlePurchase = useCallback(async () => {
    setError(null);
    setIsPurchasing(true);
    try {
      const session = await getNumber(selectedService, selectedCountry);
      const service = SERVICES.find(s => s.id === selectedService);
      const country = COUNTRIES.find(c => c.id === selectedCountry);
      
      const newNumber: ActiveNumber = {
        activationId: session.activationId,
        number: session.phone,
        service: service?.name ?? 'Unknown',
        country: country?.name ?? 'Unknown',
        flag: getCountryFlag(country?.name ?? ''),
        icon: service?.icon,
        color: service?.color,
        status: 'waiting',
        smsCode: null,
      };
      
      setActiveNumbers(prev => [newNumber, ...prev]);
      setTimeRemaining(prev => ({ ...prev, [session.activationId]: 1200 }));
      
      handleRefreshBalance();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to purchase number';
      setError(msg);
    } finally {
      setIsPurchasing(false);
    }
  }, [selectedService, selectedCountry, handleRefreshBalance]);

  const handleCancel = useCallback(async (activationId: string) => {
    try {
      await setStatus(activationId, 8);
      setActiveNumbers(prev => prev.filter(n => n.activationId !== activationId));
      handleRefreshBalance();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to cancel number';
      setError(msg);
    }
  }, [handleRefreshBalance]);

  const handleNextCode = useCallback(async (activationId: string) => {
    try {
      await setStatus(activationId, 3);
      setActiveNumbers(prev => prev.map(n => 
        n.activationId === activationId 
          ? { ...n, status: 'waiting', smsCode: null } 
          : n
      ));
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to request another code';
      setError(msg);
    }
  }, []);

  const sortedFilteredServices = useMemo(() => {
    return SERVICES
      .filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()))
      .filter(s => hideOutOfStock ? (prices[s.id]?.phones ?? 0) > 0 : true)
      .sort((a, b) => {
        const aStock = prices[a.id]?.phones ?? -1;
        const bStock = prices[b.id]?.phones ?? -1;
        const aIn = aStock > 0 ? 1 : 0;
        const bIn = bStock > 0 ? 1 : 0;
        return bIn - aIn;
      });
  }, [prices, searchQuery, hideOutOfStock]);

  const filteredCountries = useMemo(() => {
    return COUNTRIES.filter(c => 
      c.name.toLowerCase().includes(countrySearchQuery.toLowerCase())
    );
  }, [countrySearchQuery]);

  const clearHistory = useCallback(() => {
    if (window.confirm('Clear all history? This cannot be undone.')) {
      setHistory([]);
      try {
        localStorage.removeItem('virsms_history');
      } catch (err) {
        console.error('Failed to clear history from localStorage:', err);
      }
    }
  }, []);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-400 font-sans selection:bg-zinc-800 flex overflow-hidden relative">
      <aside className="w-20 lg:w-64 border-r border-zinc-800 bg-zinc-950 flex-col hidden md:flex relative z-20 transition-all duration-300">
        <div className="h-16 flex items-center justify-center lg:justify-start lg:px-6 border-b border-zinc-800">
          <div className="flex items-center gap-3 text-zinc-100 font-semibold text-lg tracking-tight">
            <div className="w-8 h-8 rounded-md bg-zinc-100 flex items-center justify-center">
              <Zap className="w-4 h-4 text-zinc-950 fill-zinc-950" />
            </div>
            <span className="hidden lg:block">VirSMS</span>
          </div>
        </div>

        <nav className="flex-1 py-6 px-3 space-y-1">
          <button
            onClick={() => setPage('dashboard')}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
              page === 'dashboard'
                ? "bg-zinc-800 text-zinc-100"
                : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50"
            )}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span className="hidden lg:block">Dashboard</span>
          </button>
          <button
            onClick={() => setPage('history')}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
              page === 'history'
                ? "bg-zinc-800 text-zinc-100"
                : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50"
            )}
          >
            <History className="w-4 h-4" />
            <span className="hidden lg:block">History</span>
            {history.length > 0 && (
              <span className="hidden lg:block ml-auto text-[10px] font-medium bg-zinc-800 text-zinc-300 px-1.5 py-0.5 rounded-sm">
                {history.length}
              </span>
            )}
          </button>
        </nav>

        <div className="p-4 border-t border-zinc-800">
          <BalanceBadge balance={balance} isRefreshing={isRefreshing} onRefresh={handleRefreshBalance} />
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-screen overflow-hidden relative z-10 bg-zinc-950">
        <header className="h-16 flex items-center justify-between px-6 lg:px-8 border-b border-zinc-800 bg-zinc-950 z-20">
          <div className="flex items-center gap-4">
            <div className="md:hidden w-8 h-8 rounded-md bg-zinc-100 flex items-center justify-center">
              <Zap className="w-4 h-4 text-zinc-950 fill-zinc-950" />
            </div>
            <h1 className="text-lg font-semibold text-zinc-100 tracking-tight hidden sm:block">
              {page === 'history' ? 'History' : 'Overview'}
            </h1>
          </div>
          <div className="flex items-center gap-4 lg:gap-6">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-md text-xs font-medium text-zinc-400">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>Operational</span>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6 lg:p-8 z-10 custom-scrollbar">
          <div className="max-w-6xl mx-auto space-y-8">

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-md p-3 flex items-center gap-3 text-red-400 animate-in fade-in slide-in-from-top-4">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <p className="text-sm font-medium">{error}</p>
                <button 
                  onClick={() => setError(null)} 
                  className="ml-auto p-1 hover:bg-red-500/20 rounded-md transition-colors"
                  aria-label="Close error"
                >
                  <XCircle className="w-4 h-4" />
                </button>
              </div>
            )}

            {page === 'history' ? (
              <div className="bg-zinc-950 border border-zinc-800 rounded-lg overflow-hidden">
                <div className="p-6 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/50">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-zinc-800 rounded-md text-zinc-300 border border-zinc-700">
                      <History className="w-4 h-4" />
                    </div>
                    <div>
                      <h2 className="text-base font-semibold text-zinc-100 tracking-tight">All Activity</h2>
                      <p className="text-xs text-zinc-500 mt-0.5">{history.length} total record{history.length !== 1 ? 's' : ''}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => exportHistoryCSV(history)}
                      disabled={history.length === 0}
                      className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-md text-xs font-medium text-zinc-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Export CSV
                    </button>
                    <button
                      onClick={clearHistory}
                      disabled={history.length === 0}
                      className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900 hover:bg-red-500/10 border border-zinc-800 hover:border-red-500/20 rounded-md text-xs font-medium text-zinc-300 hover:text-red-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Clear All
                    </button>
                  </div>
                </div>
                <HistoryTable items={history} />
              </div>
            ) : (
              <div className="space-y-8">
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
                  <PurchasePanel
                    services={SERVICES}
                    selectedService={selectedService}
                    onServiceSelect={setSelectedService}
                    countries={COUNTRIES}
                    selectedCountry={selectedCountry}
                    onCountrySelect={setSelectedCountry}
                    prices={prices}
                    loadingPrices={loadingPrices}
                    searchQuery={searchQuery}
                    onSearchChange={setSearchQuery}
                    hideOutOfStock={hideOutOfStock}
                    onHideOutOfStockChange={setHideOutOfStock}
                    countrySearchQuery={countrySearchQuery}
                    onCountrySearchChange={setCountrySearchQuery}
                    isCountryDropdownOpen={isCountryDropdownOpen}
                    setIsCountryDropdownOpen={setIsCountryDropdownOpen}
                    isPurchasing={isPurchasing}
                    onPurchase={handlePurchase}
                    sortedFilteredServices={sortedFilteredServices}
                    filteredCountries={filteredCountries}
                  />

                  <ActiveSessionsPanel
                    activeNumbers={activeNumbers}
                    timeRemaining={timeRemaining}
                    onCancel={handleCancel}
                    onCopy={handleCopy}
                    onNextCode={handleNextCode}
                    onDone={(id) => setActiveNumbers(prev => prev.filter(n => n.activationId !== id))}
                    copied={copied}
                  />
                </div>

                <div className="bg-zinc-950 border border-zinc-800 rounded-lg overflow-hidden">
                  <div className="p-6 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/50">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-zinc-800 rounded-md text-zinc-300 border border-zinc-700">
                        <History className="w-4 h-4" />
                      </div>
                      <div>
                        <h2 className="text-base font-semibold text-zinc-100 tracking-tight">Recent Activity</h2>
                        <p className="text-xs text-zinc-500 mt-0.5">Your latest purchased numbers</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setPage('history')}
                        className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-md text-xs font-medium text-zinc-300 transition-colors"
                      >
                        View All
                      </button>
                      <button
                        onClick={clearHistory}
                        disabled={history.length === 0}
                        className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900 hover:bg-red-500/10 border border-zinc-800 hover:border-red-500/20 rounded-md text-xs font-medium text-zinc-300 hover:text-red-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Clear
                      </button>
                    </div>
                  </div>
                  <HistoryTable items={history} limit={10} />
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
