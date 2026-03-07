import { MessageSquare, Globe, Clock, XCircle, CheckCircle2, Copy, Activity, ShieldCheck } from 'lucide-react';
import { cn } from '../lib/utils';
import { formatPhoneNumber, stripCountryCode } from '../lib/format';

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

interface ActiveSessionsPanelProps {
  activeNumbers: ActiveNumber[];
  timeRemaining: Record<string, number>;
  onCancel: (id: string) => void;
  onCopy: (text: string, id: string) => void;
  onNextCode: (id: string) => void;
  onDone: (id: string) => void;
  copied: Record<string, boolean>;
}

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function formatCountdown(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function ActiveSessionsPanel({
  activeNumbers,
  timeRemaining,
  onCancel,
  onCopy,
  onNextCode,
  onDone,
  copied,
}: ActiveSessionsPanelProps) {
  return (
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
                          onClick={() => onCancel(activeNumber.activationId)}
                          disabled={!canCancel}
                          className={cn(
                            "flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium transition-colors border",
                            canCancel
                              ? "bg-red-500/10 hover:bg-red-500/20 text-red-400 border-red-500/20"
                              : "bg-slate-500/10 text-slate-500 border-slate-500/20 cursor-not-allowed opacity-50"
                          )}
                          title={!canCancel ? "You can cancel after 3 minutes" : ""}
                          aria-label="Cancel number"
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
                      <div className="text-xl sm:text-2xl font-mono font-bold text-white tracking-tighter select-text cursor-text">
                        {formatPhoneNumber(activeNumber.number, activeNumber.country)}
                      </div>
                      <button
                        onClick={() => onCopy(stripCountryCode(activeNumber.number, activeNumber.country), `num_${activeNumber.activationId}`)}
                        className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all active:scale-95 border border-white/10 hover:border-white/30"
                        title="Copy number"
                        aria-label="Copy number"
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
                                onClick={() => onCopy(activeNumber.smsCode ?? '', `code_${activeNumber.activationId}`)}
                                className="p-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-all active:scale-95"
                                title="Copy code"
                                aria-label="Copy code"
                              >
                                {copied[`code_${activeNumber.activationId}`] ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                              </button>
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2 mt-2">
                          <button
                            onClick={() => onNextCode(activeNumber.activationId)}
                            className="flex-1 py-2 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-400 rounded-xl font-bold transition-all border border-indigo-500/30 shadow-[0_0_15px_rgba(99,102,241,0.15)] text-xs"
                          >
                            Get Another Code
                          </button>
                          <button
                            onClick={() => onDone(activeNumber.activationId)}
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
  );
}
