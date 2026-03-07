import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  History,
  LayoutDashboard,
  Zap,
  Activity,
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
    <div className="min-h-screen bg-[#0a0a0e] text-slate-300 font-sans selection:bg-indigo-500/30 flex overflow-hidden relative">
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none mix-blend-overlay" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")' }}></div>
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-indigo-600/20 blur-[120px] rounded-full pointer-events-none mix-blend-screen" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[40%] h-[60%] bg-blue-600/10 blur-[150px] rounded-full pointer-events-none mix-blend-screen" />

      <aside className="w-20 lg:w-72 border-r border-white/5 bg-black/20 backdrop-blur-2xl flex-col hidden md:flex relative z-20 transition-all duration-300">
        <div className="h-20 flex items-center justify-center lg:justify-start lg:px-8 border-b border-white/5">
          <div className="flex items-center gap-3 text-white font-bold text-2xl tracking-tighter">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center shadow-[0_0_20px_rgba(99,102,241,0.4)]">
              <Zap className="w-5 h-5 text-white fill-white/20" />
            </div>
            <span className="hidden lg:block bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60">VirSMS</span>
          </div>
        </div>

        <nav className="flex-1 py-8 px-4 space-y-2">
          <button
            onClick={() => setPage('dashboard')}
            className={cn(
              "w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl font-medium transition-all group",
              page === 'dashboard'
                ? "bg-white/5 text-white border border-white/10 shadow-[0_0_15px_rgba(255,255,255,0.05)]"
                : "text-slate-400 hover:text-white hover:bg-white/5 border border-transparent"
            )}
          >
            <LayoutDashboard className={cn("w-5 h-5 group-hover:scale-110 transition-transform", page === 'dashboard' ? "text-indigo-400" : "")} />
            <span className="hidden lg:block">Dashboard</span>
          </button>
          <button
            onClick={() => setPage('history')}
            className={cn(
              "w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl font-medium transition-all group",
              page === 'history'
                ? "bg-white/5 text-white border border-white/10 shadow-[0_0_15px_rgba(255,255,255,0.05)]"
                : "text-slate-400 hover:text-white hover:bg-white/5 border border-transparent"
            )}
          >
            <History className={cn("w-5 h-5 group-hover:scale-110 transition-all", page === 'history' ? "text-blue-400" : "group-hover:text-blue-400")} />
            <span className="hidden lg:block">History</span>
            {history.length > 0 && (
              <span className="hidden lg:block ml-auto text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/20 px-2 py-0.5 rounded-full">
                {history.length}
              </span>
            )}
          </button>
        </nav>

        <div className="p-4 lg:p-6 border-t border-white/5">
          <BalanceBadge balance={balance} isRefreshing={isRefreshing} onRefresh={handleRefreshBalance} />
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-screen overflow-hidden relative z-10">
        <header className="h-20 flex items-center justify-between px-6 lg:px-12 border-b border-white/5 bg-black/10 backdrop-blur-md z-20">
          <div className="flex items-center gap-4">
            <div className="md:hidden w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center shadow-[0_0_20px_rgba(99,102,241,0.4)]">
              <Zap className="w-5 h-5 text-white fill-white/20" />
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight hidden sm:block">
              {page === 'history' ? 'History' : 'Overview'}
            </h1>
          </div>
          <div className="flex items-center gap-4 lg:gap-6">
            <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-full text-sm font-medium text-slate-300">
              <Activity className="w-4 h-4 text-emerald-400" />
              <span>System Operational</span>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6 lg:p-12 z-10 custom-scrollbar">
          <div className="max-w-7xl mx-auto space-y-8 lg:space-y-12">

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 flex items-center gap-3 text-red-400 animate-in fade-in slide-in-from-top-4">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <p className="text-sm font-medium">{error}</p>
                <button 
                  onClick={() => setError(null)} 
                  className="ml-auto p-1 hover:bg-red-500/20 rounded-lg transition-colors"
                  aria-label="Close error"
                >
                  <XCircle className="w-4 h-4" />
                </button>
              </div>
            )}

            {page === 'history' ? (
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent rounded-3xl blur-xl" />
                <div className="relative bg-[#111118]/80 border border-white/10 rounded-3xl backdrop-blur-xl shadow-2xl overflow-hidden">
                  <div className="p-6 lg:p-8 border-b border-white/5 flex items-center justify-between bg-black/20">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-white/5 rounded-2xl text-slate-300 border border-white/10">
                        <History className="w-5 h-5" />
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-white tracking-tight">All Activity</h2>
                        <p className="text-sm text-slate-400 mt-1">{history.length} total record{history.length !== 1 ? 's' : ''}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => exportHistoryCSV(history)}
                        disabled={history.length === 0}
                        className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-indigo-500/10 border border-white/10 hover:border-indigo-500/20 rounded-xl text-sm font-bold text-white hover:text-indigo-400 transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <Download className="w-4 h-4" />
                        Export CSV
                      </button>
                      <button
                        onClick={clearHistory}
                        disabled={history.length === 0}
                        className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-red-500/10 border border-white/10 hover:border-red-500/20 rounded-xl text-sm font-bold text-white hover:text-red-400 transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <Trash2 className="w-4 h-4" />
                        Clear All
                      </button>
                    </div>
                  </div>
                  <HistoryTable items={history} />
                </div>
              </div>
            ) : (
              <div className="space-y-8 lg:space-y-12">
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
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

                <div className="relative group">
                  <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent rounded-3xl blur-xl transition-all duration-500 group-hover:bg-white/10" />
                  <div className="relative bg-[#111118]/80 border border-white/10 rounded-3xl backdrop-blur-xl shadow-2xl overflow-hidden">
                    <div className="p-6 lg:p-8 border-b border-white/5 flex items-center justify-between bg-black/20">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-white/5 rounded-2xl text-slate-300 border border-white/10">
                          <History className="w-5 h-5" />
                        </div>
                        <div>
                          <h2 className="text-xl font-bold text-white tracking-tight">Recent Activity</h2>
                          <p className="text-sm text-slate-400 mt-1">Your latest purchased numbers</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => setPage('history')}
                          className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm font-bold text-white transition-all active:scale-95"
                        >
                          View All
                        </button>
                        <button
                          onClick={clearHistory}
                          disabled={history.length === 0}
                          className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-red-500/10 border border-white/10 hover:border-red-500/20 rounded-xl text-sm font-bold text-white hover:text-red-400 transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <Trash2 className="w-4 h-4" />
                          Clear
                        </button>
                      </div>
                    </div>
                    <HistoryTable items={history} limit={10} />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
