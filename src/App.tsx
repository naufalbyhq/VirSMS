import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Smartphone,
  Globe,
  Copy,
  MessageSquare,
  History,
  CheckCircle2,
  Clock,
  ChevronDown,
  LayoutDashboard,
  Zap,
  ShieldCheck,
  Activity,
  XCircle,
  Search,
  AlertCircle,
  RefreshCw,
  Trash2,
  Download,
  EyeOff,
  Eye,
  Wallet,
} from 'lucide-react';
import { cn } from './lib/utils';
import { getBalance, getNumber, getStatus, setStatus, getPrices, type ServicePrice } from './lib/api';
import { formatPhoneNumber } from './lib/format';
import { SERVICES } from './constants/services';
import { COUNTRIES } from './constants/countries';
import { getCountryFlag } from './constants/countryFlags';
import { HistoryTable } from './components/HistoryTable';
import type { HistoryItem } from './components/HistoryTable';

function formatCountdown(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

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
  const [balance, setBalance] = useState<number | null>(null);
  const [isRefreshingBalance, setIsRefreshingBalance] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [hideOutOfStock, setHideOutOfStock] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [prices, setPrices] = useState<Record<string, ServicePrice>>({});
  const [loadingPrices, setLoadingPrices] = useState(false);

  const [isCountryDropdownOpen, setIsCountryDropdownOpen] = useState(false);
  const [countrySearchQuery, setCountrySearchQuery] = useState('');
  const countryDropdownRef = useRef<HTMLDivElement>(null);

  const selectedCardRef = useRef<HTMLButtonElement>(null);
  const serviceGridRef = useRef<HTMLDivElement>(null);
  const prevSmsCodes = useRef<Record<string, string | null>>({});

  const [history, setHistory] = useState<HistoryItem[]>(() => {
    const saved = localStorage.getItem('virsms_history');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('virsms_history', JSON.stringify(history));
  }, [history]);

  useEffect(() => {
    getBalance().then(setBalance).catch(err => console.error('Failed to fetch balance:', err));
    const interval = setInterval(() => {
      getBalance().then(setBalance).catch(err => console.error('Failed to refresh balance:', err));
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const handleRefreshBalance = async () => {
    setIsRefreshingBalance(true);
    try {
      const bal = await getBalance();
      setBalance(bal);
    } catch (err) {
      console.error('Failed to refresh balance:', err);
    } finally {
      setIsRefreshingBalance(false);
    }
  };

  useEffect(() => {
    setLoadingPrices(true);
    getPrices(selectedCountry)
      .then(setPrices)
      .catch(err => console.error('Failed to fetch prices:', err))
      .finally(() => setLoadingPrices(false));
  }, [selectedCountry]);

  useEffect(() => {
    if (!loadingPrices && selectedCardRef.current && serviceGridRef.current) {
      selectedCardRef.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [loadingPrices, selectedCountry]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (countryDropdownRef.current && !countryDropdownRef.current.contains(event.target as Node)) {
        setIsCountryDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  useEffect(() => {
    const waitingNumbers = activeNumbers.filter(n => n.status === 'waiting');
    if (waitingNumbers.length === 0) return;

    const pollTimer = setInterval(async () => {
      for (const activeNumber of waitingNumbers) {
        try {
          const status = await getStatus(activeNumber.activationId);
          if (status.type === 'OK') {
            const newItem: HistoryItem = {
              id: activeNumber.activationId + String(Date.now()),
              service: activeNumber.service,
              country: activeNumber.country,
              number: activeNumber.number,
              date: new Date().toLocaleString(),
              status: 'Completed',
              code: status.code,
            };
            setHistory(h => [newItem, ...h]);
            setActiveNumbers(prev => prev.map(n => 
              n.activationId === activeNumber.activationId 
                ? { ...n, status: 'received', smsCode: status.code } 
                : n
            ));
            if (prevSmsCodes.current[activeNumber.activationId] !== status.code) {
              prevSmsCodes.current[activeNumber.activationId] = status.code;
              playChime();
            }
          } else if (status.type === 'CANCEL') {
            setActiveNumbers(prev => prev.filter(n => n.activationId !== activeNumber.activationId));
            setError('Number was cancelled.');
          }
        } catch (err) {
          console.error('Polling error:', err);
        }
      }
    }, 5000);
    return () => clearInterval(pollTimer);
  }, [activeNumbers]);

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

  const handlePurchase = async () => {
    setError(null);
    setIsPurchasing(true);
    try {
      const session = await getNumber(selectedService, selectedCountry);
      const service = SERVICES.find(s => s.id === selectedService);
      const country = COUNTRIES.find(c => c.id === selectedCountry);
      prevSmsCodes.current[session.activationId] = null;
      
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
      
      const newBalance = await getBalance();
      setBalance(newBalance);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to purchase number';
      setError(msg);
    } finally {
      setIsPurchasing(false);
    }
  };

  const handleCancel = async (activationId: string) => {
    try {
      await setStatus(activationId, 8);
      setActiveNumbers(prev => prev.filter(n => n.activationId !== activationId));
      const newBalance = await getBalance();
      setBalance(newBalance);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to cancel number';
      setError(msg);
    }
  };

  const handleNextCode = async (activationId: string) => {
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
  };

  const sortedFilteredServices = SERVICES
    .filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()))
    .filter(s => hideOutOfStock ? (prices[s.id]?.phones ?? 0) > 0 : true)
    .sort((a, b) => {
      const aStock = prices[a.id]?.phones ?? -1;
      const bStock = prices[b.id]?.phones ?? -1;
      const aIn = aStock > 0 ? 1 : 0;
      const bIn = bStock > 0 ? 1 : 0;
      return bIn - aIn;
    });

  const filteredCountries = COUNTRIES.filter(c => 
    c.name.toLowerCase().includes(countrySearchQuery.toLowerCase())
  );

  const clearHistory = () => {
    if (window.confirm('Clear all history? This cannot be undone.')) {
      setHistory([]);
      localStorage.removeItem('virsms_history');
    }
  };

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
                onClick={handleRefreshBalance}
                disabled={isRefreshingBalance}
                className="p-1.5 text-slate-500 hover:text-white hover:bg-white/10 rounded-lg transition-all disabled:opacity-40"
                title="Refresh balance"
              >
                <RefreshCw className={cn("w-3.5 h-3.5", isRefreshingBalance && "animate-spin")} />
              </button>
            </div>
          </div>
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
                <button onClick={() => setError(null)} className="ml-auto p-1 hover:bg-red-500/20 rounded-lg transition-colors">
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

                  <div className="xl:col-span-7 relative group">
                    <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent rounded-3xl blur-xl transition-all duration-500 group-hover:bg-white/10" />
                    <div className="relative bg-[#111118]/80 border border-white/10 rounded-3xl p-8 backdrop-blur-xl shadow-2xl">
                      <div className="flex items-center gap-4 mb-8">
                        <div className="p-3 bg-indigo-500/20 rounded-2xl text-indigo-400 border border-indigo-500/20 shadow-[0_0_20px_rgba(99,102,241,0.2)]">
                          <Smartphone className="w-6 h-6" />
                        </div>
                        <div>
                          <h2 className="text-xl font-bold text-white tracking-tight">Purchase Number</h2>
                          <p className="text-sm text-slate-400 mt-1">Select a service and region to begin</p>
                        </div>
                      </div>

                      <div className="space-y-8">
                        <div>
                          <div className="flex items-center justify-between mb-4">
                            <label className="text-sm font-semibold text-slate-300 uppercase tracking-wider">1. Select Service</label>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => setHideOutOfStock(h => !h)}
                                className={cn(
                                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all",
                                  hideOutOfStock
                                    ? "bg-indigo-500/20 text-indigo-300 border-indigo-500/30"
                                    : "bg-black/20 text-slate-500 border-white/10 hover:border-white/20 hover:text-slate-300"
                                )}
                                title={hideOutOfStock ? "Showing in-stock only" : "Show all services"}
                              >
                                {hideOutOfStock ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                {hideOutOfStock ? 'In-stock only' : 'All'}
                              </button>
                              <div className="relative">
                                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                  type="text"
                                  placeholder="Search services..."
                                  value={searchQuery}
                                  onChange={(e) => setSearchQuery(e.target.value)}
                                  className="bg-black/20 border border-white/10 rounded-lg pl-9 pr-4 py-1.5 text-sm text-white focus:outline-none focus:border-indigo-500/50 transition-colors w-44"
                                />
                              </div>
                            </div>
                          </div>
                          <div ref={serviceGridRef} className="h-72 overflow-y-auto pr-1 custom-scrollbar rounded-xl">
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                              {sortedFilteredServices.map(service => {
                                const priceData = prices[service.id];
                                const hasStock = priceData && priceData.phones > 0;
                                const isSelected = selectedService === service.id;
                                return (
                                  <button
                                    key={service.id}
                                    ref={isSelected ? selectedCardRef : null}
                                    onClick={() => setSelectedService(service.id)}
                                    disabled={!priceData || !hasStock}
                                    className={cn(
                                      "relative flex flex-col items-start p-4 rounded-2xl border transition-all duration-300 text-left overflow-hidden group/btn",
                                      isSelected
                                        ? "bg-white/10 border-indigo-500/50 shadow-[0_0_30px_rgba(99,102,241,0.15)]"
                                        : "bg-black/20 border-white/5 hover:border-white/20 hover:bg-white/5",
                                      (!priceData || !hasStock) && "opacity-50 grayscale cursor-not-allowed"
                                    )}
                                  >
                                    {isSelected && (
                                      <div className={cn("absolute inset-0 opacity-20 bg-gradient-to-br", service.color)} />
                                    )}
                                    <div className="flex items-center justify-between w-full mb-3 relative z-10">
                                      <span className="text-2xl filter drop-shadow-md">{service.icon}</span>
                                      <span className={cn(
                                        "text-xs font-bold px-2 py-1 rounded-lg flex items-center gap-1",
                                        isSelected ? "bg-indigo-500 text-white" : "bg-white/10 text-slate-300"
                                      )}>
                                        {loadingPrices ? (
                                          <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                        ) : priceData ? (
                                          `~$${priceData.price.toFixed(2)}`
                                        ) : '-'}
                                      </span>
                                    </div>
                                    <div className="relative z-10 w-full">
                                      <div className={cn(
                                        "font-bold tracking-tight truncate w-full text-sm",
                                        isSelected ? "text-white" : "text-slate-300"
                                      )}>{service.name}</div>
                                      <div className="text-[10px] text-slate-500 mt-1 font-medium">
                                        {loadingPrices ? '...' : priceData ? `${priceData.phones} pcs` : 'Out of stock'}
                                      </div>
                                    </div>
                                  </button>
                                );
                              })}
                              {sortedFilteredServices.length === 0 && (
                                <div className="col-span-full py-8 text-center text-slate-500 text-sm">
                                  No services found matching "{searchQuery}"
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4">2. Select Region</label>
                          <div className="relative group/select" ref={countryDropdownRef}>
                            <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/20 to-blue-500/20 rounded-2xl blur-md opacity-0 group-hover/select:opacity-100 transition-opacity" />
                            <button
                              type="button"
                              onClick={() => setIsCountryDropdownOpen(!isCountryDropdownOpen)}
                              className="relative w-full flex items-center justify-between bg-[#0a0a0e] border border-white/10 text-white rounded-2xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all font-medium text-lg shadow-inner"
                            >
                              <span className="flex items-center gap-2">
                                {getCountryFlag(COUNTRIES.find(c => c.id === selectedCountry)?.name ?? '')}
                                {COUNTRIES.find(c => c.id === selectedCountry)?.name}
                              </span>
                              <ChevronDown className={cn("w-5 h-5 text-slate-400 transition-transform", isCountryDropdownOpen && "rotate-180")} />
                            </button>
                            
                            {isCountryDropdownOpen && (
                              <div className="absolute z-50 w-full mt-2 bg-[#111118] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-80">
                                <div className="p-3 border-b border-white/5 bg-black/20">
                                  <div className="relative">
                                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input
                                      type="text"
                                      placeholder="Search countries..."
                                      value={countrySearchQuery}
                                      onChange={(e) => setCountrySearchQuery(e.target.value)}
                                      className="w-full bg-black/20 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500/50 transition-colors"
                                      autoFocus
                                    />
                                  </div>
                                </div>
                                <div className="overflow-y-auto custom-scrollbar flex-1 p-2">
                                  {filteredCountries.length === 0 ? (
                                    <div className="py-8 text-center text-slate-500 text-sm">
                                      No countries found
                                    </div>
                                  ) : (
                                    filteredCountries.map(country => (
                                      <button
                                        key={country.id}
                                        onClick={() => {
                                          setSelectedCountry(country.id);
                                          setIsCountryDropdownOpen(false);
                                          setCountrySearchQuery('');
                                        }}
                                        className={cn(
                                          "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-colors",
                                          selectedCountry === country.id
                                            ? "bg-indigo-500/20 text-white font-bold"
                                            : "text-slate-300 hover:bg-white/5 hover:text-white"
                                        )}
                                      >
                                        <span className="text-xl">{getCountryFlag(country.name)}</span>
                                        <span>{country.name}</span>
                                      </button>
                                    ))
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="pt-4">
                          {(() => {
                            const selectedPriceData = prices[selectedService];
                            const selectedServiceObj = SERVICES.find(s => s.id === selectedService);
                            const selectedCountryObj = COUNTRIES.find(c => c.id === selectedCountry);
                            return (
                              <>
                                {selectedPriceData && (
                                  <div className="mb-4 flex items-center justify-between px-4 py-3 bg-black/30 border border-white/5 rounded-2xl text-sm">
                                    <div className="flex items-center gap-2 text-slate-400">
                                      <span className="text-base">{selectedServiceObj?.icon}</span>
                                      <span className="text-white font-medium">{selectedServiceObj?.name}</span>
                                      <span className="text-slate-600">·</span>
                                      <span>{getCountryFlag(selectedCountryObj?.name ?? '')} {selectedCountryObj?.name}</span>
                                    </div>
                                    <div className="text-emerald-400 font-bold">~${selectedPriceData.price.toFixed(2)}</div>
                                  </div>
                                )}
                                <button
                                  onClick={handlePurchase}
                                  disabled={isPurchasing || sortedFilteredServices.length === 0}
                                  className="relative w-full group/btn overflow-hidden rounded-2xl disabled:opacity-70 disabled:cursor-not-allowed"
                                >
                                  <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 via-blue-600 to-indigo-600 bg-[length:200%_auto] animate-gradient" />
                                  <div className="relative px-6 py-4 flex items-center justify-center gap-3 text-white font-bold text-lg tracking-wide">
                                    {isPurchasing ? (
                                      <>
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        <span>Allocating Number...</span>
                                      </>
                                    ) : (
                                      <span>
                                        Get Number
                                        {selectedPriceData && (
                                          <span className="ml-2 opacity-80 font-normal text-base">
                                            · ~${selectedPriceData.price.toFixed(2)}
                                          </span>
                                        )}
                                      </span>
                                    )}
                                  </div>
                                </button>
                              </>
                            );
                          })()}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="xl:col-span-5 relative group flex flex-col">
                    <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent rounded-3xl blur-xl transition-all duration-500 group-hover:bg-white/10" />
                    <div className="relative bg-[#111118]/80 border border-white/10 rounded-3xl p-8 backdrop-blur-xl shadow-2xl flex-1 flex flex-col">
                      <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-4">
                          <div className="p-3 bg-emerald-500/20 rounded-2xl text-emerald-400 border border-emerald-500/20 shadow-[0_0_20px_rgba(16,185,129,0.2)]">
                            <MessageSquare className="w-6 h-6" />
                          </div>
                          <div>
                            <h2 className="text-xl font-bold text-white tracking-tight">Active Sessions</h2>
                            <p className="text-sm text-slate-400 mt-1">Awaiting incoming SMS</p>
                          </div>
                        </div>
                      </div>

                      {activeNumbers.length > 0 ? (
                        <div className="flex-1 flex flex-col gap-6 overflow-y-auto custom-scrollbar pr-2">
                          {activeNumbers.map(activeNumber => {
                            const timeLeft = timeRemaining[activeNumber.activationId] || 0;
                            const canCancel = timeLeft <= 1020;
                            
                            return (
                              <div key={activeNumber.activationId} className="flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-300 bg-black/20 border border-white/5 rounded-2xl p-4">
                                <div className="relative overflow-hidden bg-black/40 border border-white/10 rounded-2xl p-4">
                                  <div className={cn("absolute top-0 left-0 w-full h-1 bg-gradient-to-r", activeNumber.color || "from-indigo-500 to-blue-500")} />
                                  <div className="flex justify-between items-start mb-4">
                                    <div className="flex items-center gap-3">
                                      <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-xl border border-white/10 shadow-inner">
                                        {activeNumber.icon}
                                      </div>
                                      <div>
                                        <div className="font-bold text-white">{activeNumber.service}</div>
                                        <div className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                                          <span>{activeNumber.flag}</span>
                                          <span>{activeNumber.country}</span>
                                        </div>
                                      </div>
                                    </div>
                                    <div className="flex flex-col items-end gap-2">
                                      <div className="flex items-center gap-2 text-sm font-bold text-amber-400 bg-amber-400/10 border border-amber-400/20 px-3 py-1.5 rounded-xl shadow-[0_0_15px_rgba(251,191,36,0.15)]">
                                        <Clock className="w-4 h-4" />
                                        <span className="font-mono">{formatTime(timeLeft)}</span>
                                      </div>
                                      <button
                                        onClick={() => handleCancel(activeNumber.activationId)}
                                        disabled={!canCancel}
                                        className={cn(
                                          "flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium transition-colors border",
                                          canCancel
                                            ? "bg-red-500/10 hover:bg-red-500/20 text-red-400 border-red-500/20"
                                            : "bg-slate-500/10 text-slate-500 border-slate-500/20 cursor-not-allowed opacity-50"
                                        )}
                                        title={!canCancel ? "You can cancel after 3 minutes" : ""}
                                      >
                                        <XCircle className="w-3.5 h-3.5" />
                                        Cancel
                                      </button>
                                      {!canCancel && (
                                        <span className="text-[10px] text-slate-500 mt-1">
                                          Available in {formatCountdown(timeLeft - 1020)}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex items-center justify-between gap-4 bg-white/5 p-3 rounded-xl border border-white/5">
                                    <div className="text-xl sm:text-2xl font-mono font-bold text-white tracking-tighter">
                                      {formatPhoneNumber(activeNumber.number, activeNumber.country)}
                                    </div>
                                    <button
                                      onClick={() => handleCopy(formatPhoneNumber(activeNumber.number, activeNumber.country), `num_${activeNumber.activationId}`)}
                                      className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all active:scale-95 border border-white/10 hover:border-white/30"
                                      title="Copy number"
                                    >
                                      {copied[`num_${activeNumber.activationId}`] ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                                    </button>
                                  </div>
                                </div>

                                <div className="bg-black/20 border border-white/5 rounded-2xl p-4 flex flex-col">
                                  <div className="flex items-center gap-2 mb-4">
                                    <ShieldCheck className="w-4 h-4 text-indigo-400" />
                                    <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Incoming Messages</h3>
                                  </div>
                                  {activeNumber.status === 'waiting' ? (
                                    <div className="flex-1 flex flex-col items-center justify-center text-center py-4">
                                      <div className="relative mb-3">
                                        <div className="w-12 h-12 border-2 border-indigo-500/30 rounded-full animate-[ping_2s_cubic-bezier(0,0,0.2,1)_infinite] absolute inset-0" />
                                        <div className="w-12 h-12 bg-indigo-500/20 rounded-full flex items-center justify-center relative z-10 border border-indigo-500/30 backdrop-blur-sm">
                                          <Activity className="w-5 h-5 text-indigo-400 animate-pulse" />
                                        </div>
                                      </div>
                                      <div>
                                        <p className="text-sm font-bold text-white mb-1">Listening for SMS...</p>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="space-y-3">
                                      <div className="relative bg-gradient-to-br from-indigo-500/20 to-blue-600/20 border border-indigo-500/30 rounded-2xl p-4 animate-in slide-in-from-bottom-4 duration-500 shadow-[0_0_30px_rgba(99,102,241,0.15)] overflow-hidden">
                                        <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full blur-2xl -mr-8 -mt-8 pointer-events-none" />
                                        <div className="flex justify-between items-start mb-2 relative z-10">
                                          <div className="flex items-center gap-2">
                                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                                            <span className="text-[10px] font-bold text-indigo-300 uppercase tracking-wider">System Message</span>
                                          </div>
                                          <span className="text-[10px] font-medium text-slate-400 bg-black/20 px-2 py-1 rounded-md">Just now</span>
                                        </div>
                                        <div className="relative z-10">
                                          <p className="text-slate-300 text-xs mb-2">Your {activeNumber.service} verification code is:</p>
                                          <div className="flex items-center justify-between bg-black/40 border border-white/10 rounded-xl p-2.5">
                                            <strong className="text-white text-xl font-mono tracking-[0.2em]">{activeNumber.smsCode}</strong>
                                            <button
                                              onClick={() => handleCopy(activeNumber.smsCode ?? '', `code_${activeNumber.activationId}`)}
                                              className="p-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-all active:scale-95"
                                              title="Copy code"
                                            >
                                              {copied[`code_${activeNumber.activationId}`] ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                                            </button>
                                          </div>
                                        </div>
                                      </div>
                                      <div className="flex gap-2 mt-2">
                                        <button
                                          onClick={() => handleNextCode(activeNumber.activationId)}
                                          className="flex-1 py-2 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-400 rounded-xl font-bold transition-all border border-indigo-500/30 shadow-[0_0_15px_rgba(99,102,241,0.15)] text-xs"
                                        >
                                          Get Another Code
                                        </button>
                                        <button
                                          onClick={() => setActiveNumbers(prev => prev.filter(n => n.activationId !== activeNumber.activationId))}
                                          className="flex-1 py-2 bg-white/5 hover:bg-white/10 text-white rounded-xl font-bold transition-all border border-white/10 text-xs"
                                        >
                                          Done
                                        </button>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-center border-2 border-dashed border-white/10 rounded-2xl p-8 bg-black/20">
                          <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-6 border border-white/5 shadow-inner">
                            <Globe className="w-10 h-10 text-slate-500" />
                          </div>
                          <h3 className="text-lg font-bold text-white mb-2">No Active Session</h3>
                          <p className="text-sm text-slate-400 max-w-[240px] leading-relaxed">
                            Select a service and region from the left panel to generate a new virtual number.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
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

      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }
      `}} />
    </div>
  );
}
