import { useRef, useEffect } from 'react';
import { Smartphone, Search, EyeOff, Eye, ChevronDown } from 'lucide-react';
import { cn } from '../lib/utils';
import { getCountryFlag } from '../constants/countryFlags';
import type { ServicePrice } from '../lib/api';

interface Service {
  id: string;
  name: string;
  icon: string;
  color: string;
}

interface Country {
  id: number;
  name: string;
}

interface PurchasePanelProps {
  services: Service[];
  selectedService: string;
  onServiceSelect: (id: string) => void;
  countries: Country[];
  selectedCountry: number;
  onCountrySelect: (id: number) => void;
  prices: Record<string, ServicePrice>;
  loadingPrices: boolean;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  hideOutOfStock: boolean;
  onHideOutOfStockChange: (hide: boolean) => void;
  countrySearchQuery: string;
  onCountrySearchChange: (query: string) => void;
  isCountryDropdownOpen: boolean;
  setIsCountryDropdownOpen: (open: boolean) => void;
  isPurchasing: boolean;
  onPurchase: () => void;
  sortedFilteredServices: Service[];
  filteredCountries: Country[];
}

export function PurchasePanel({
  services,
  selectedService,
  onServiceSelect,
  countries,
  selectedCountry,
  onCountrySelect,
  prices,
  loadingPrices,
  searchQuery,
  onSearchChange,
  hideOutOfStock,
  onHideOutOfStockChange,
  countrySearchQuery,
  onCountrySearchChange,
  isCountryDropdownOpen,
  setIsCountryDropdownOpen,
  isPurchasing,
  onPurchase,
  sortedFilteredServices,
  filteredCountries,
}: PurchasePanelProps) {
  const selectedCardRef = useRef<HTMLButtonElement>(null);
  const serviceGridRef = useRef<HTMLDivElement>(null);
  const countryDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!loadingPrices && selectedCardRef.current && serviceGridRef.current) {
      selectedCardRef.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [loadingPrices, selectedService]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (countryDropdownRef.current && !countryDropdownRef.current.contains(event.target as Node)) {
        setIsCountryDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [setIsCountryDropdownOpen]);

  const selectedServiceObj = services.find(s => s.id === selectedService);
  const selectedCountryObj = countries.find(c => c.id === selectedCountry);
  const selectedPriceData = prices[selectedService];

  return (
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
                  onClick={() => onHideOutOfStockChange(!hideOutOfStock)}
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
                    onChange={(e) => onSearchChange(e.target.value)}
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
                      onClick={() => onServiceSelect(service.id)}
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
                  {getCountryFlag(selectedCountryObj?.name ?? '')}
                  {selectedCountryObj?.name}
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
                        onChange={(e) => onCountrySearchChange(e.target.value)}
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
                            onCountrySelect(country.id);
                            setIsCountryDropdownOpen(false);
                            onCountrySearchChange('');
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
              onClick={onPurchase}
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
          </div>
        </div>
      </div>
    </div>
  );
}
