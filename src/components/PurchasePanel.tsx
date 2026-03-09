import { useRef, useEffect } from 'react';
import { Search, EyeOff, Eye, ChevronDown } from 'lucide-react';
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
    <div className="xl:col-span-7 flex flex-col gap-6">
      <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold text-zinc-100 tracking-tight">1. Select Service</h2>
            <p className="text-sm text-zinc-500 mt-0.5">Choose the platform you need a number for</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onHideOutOfStockChange(!hideOutOfStock)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border transition-colors",
                hideOutOfStock
                  ? "bg-zinc-100 text-zinc-900 border-zinc-100"
                  : "bg-zinc-900 text-zinc-400 border-zinc-800 hover:border-zinc-700 hover:text-zinc-300"
              )}
              title={hideOutOfStock ? "Showing in-stock only" : "Show all services"}
            >
              {hideOutOfStock ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              {hideOutOfStock ? 'In-stock only' : 'All'}
            </button>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                placeholder="Search services..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="bg-zinc-900 border border-zinc-800 rounded-md pl-9 pr-4 py-1.5 text-sm text-zinc-100 focus:outline-none focus:border-zinc-600 transition-colors w-44 placeholder:text-zinc-600"
              />
            </div>
          </div>
        </div>

        <div ref={serviceGridRef} className="h-72 overflow-y-auto pr-2 custom-scrollbar">
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
                    "relative flex flex-col items-start p-4 rounded-md border transition-all duration-200 text-left overflow-hidden",
                    isSelected
                      ? "bg-zinc-900 border-zinc-500"
                      : "bg-zinc-950 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900/50",
                    (!priceData || !hasStock) && "opacity-50 grayscale cursor-not-allowed"
                  )}
                >
                  <div className="flex items-center justify-between w-full mb-3">
                    <span className="text-2xl">{service.icon}</span>
                    <span className={cn(
                      "text-xs font-medium px-2 py-0.5 rounded-sm flex items-center gap-1",
                      isSelected ? "bg-zinc-100 text-zinc-900" : "bg-zinc-800 text-zinc-300"
                    )}>
                      {loadingPrices ? (
                        <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      ) : priceData ? (
                        `~$${priceData.price.toFixed(2)}`
                      ) : '-'}
                    </span>
                  </div>
                  <div className="w-full">
                    <div className={cn(
                      "font-semibold tracking-tight truncate w-full text-sm",
                      isSelected ? "text-zinc-100" : "text-zinc-300"
                    )}>{service.name}</div>
                    <div className="text-[10px] text-zinc-500 mt-0.5 font-medium">
                      {loadingPrices ? '...' : priceData ? `${priceData.phones} pcs` : 'Out of stock'}
                    </div>
                  </div>
                </button>
              );
            })}
            {sortedFilteredServices.length === 0 && (
              <div className="col-span-full py-8 text-center text-zinc-500 text-sm">
                No services found matching "{searchQuery}"
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-6">
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-zinc-100 tracking-tight">2. Select Region</h2>
          <p className="text-sm text-zinc-500 mt-0.5">Choose the country for your number</p>
        </div>
        
        <div className="relative" ref={countryDropdownRef}>
          <button
            type="button"
            onClick={() => setIsCountryDropdownOpen(!isCountryDropdownOpen)}
            className="w-full flex items-center justify-between bg-zinc-900 border border-zinc-800 text-zinc-100 rounded-md px-4 py-3 focus:outline-none focus:border-zinc-600 transition-colors font-medium text-base"
          >
            <span className="flex items-center gap-3">
              <span className="text-xl">{getCountryFlag(selectedCountryObj?.name ?? '')}</span>
              {selectedCountryObj?.name}
            </span>
            <ChevronDown className={cn("w-4 h-4 text-zinc-500 transition-transform", isCountryDropdownOpen && "rotate-180")} />
          </button>
          
          {isCountryDropdownOpen && (
            <div className="absolute z-50 w-full mt-2 bg-zinc-900 border border-zinc-800 rounded-md shadow-xl overflow-hidden flex flex-col max-h-80">
              <div className="p-2 border-b border-zinc-800">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                  <input
                    type="text"
                    placeholder="Search countries..."
                    value={countrySearchQuery}
                    onChange={(e) => onCountrySearchChange(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-md pl-9 pr-4 py-2 text-sm text-zinc-100 focus:outline-none focus:border-zinc-600 transition-colors placeholder:text-zinc-600"
                    autoFocus
                  />
                </div>
              </div>
              <div className="overflow-y-auto custom-scrollbar flex-1 p-1">
                {filteredCountries.length === 0 ? (
                  <div className="py-8 text-center text-zinc-500 text-sm">
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
                        "w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-left transition-colors",
                        selectedCountry === country.id
                          ? "bg-zinc-800 text-zinc-100 font-medium"
                          : "text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-100"
                      )}
                    >
                      <span className="text-lg">{getCountryFlag(country.name)}</span>
                      <span className="text-sm">{country.name}</span>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 pt-6 border-t border-zinc-800">
          {selectedPriceData && (
            <div className="mb-4 flex items-center justify-between px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-md text-sm">
              <div className="flex items-center gap-2 text-zinc-400">
                <span className="text-base">{selectedServiceObj?.icon}</span>
                <span className="text-zinc-100 font-medium">{selectedServiceObj?.name}</span>
                <span className="text-zinc-600">·</span>
                <span>{getCountryFlag(selectedCountryObj?.name ?? '')} {selectedCountryObj?.name}</span>
              </div>
              <div className="text-zinc-100 font-semibold">~${selectedPriceData.price.toFixed(2)}</div>
            </div>
          )}
          <button
            onClick={onPurchase}
            disabled={isPurchasing || sortedFilteredServices.length === 0}
            className="w-full bg-zinc-100 hover:bg-white text-zinc-900 rounded-md px-6 py-3 flex items-center justify-center gap-2 font-semibold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPurchasing ? (
              <>
                <div className="w-4 h-4 border-2 border-zinc-900/30 border-t-zinc-900 rounded-full animate-spin" />
                <span>Allocating Number...</span>
              </>
            ) : (
              <span>
                Get Number
                {selectedPriceData && (
                  <span className="ml-2 opacity-60 font-normal">
                    · ~${selectedPriceData.price.toFixed(2)}
                  </span>
                )}
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
