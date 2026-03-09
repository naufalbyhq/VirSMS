import { Globe, Clock, XCircle, CheckCircle2, Copy, Activity, ShieldCheck } from 'lucide-react';
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
    <div className="xl:col-span-5 flex flex-col">
      <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-6 flex-1 flex flex-col">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold text-zinc-100 tracking-tight">Active Sessions</h2>
            <p className="text-sm text-zinc-500 mt-0.5">Awaiting incoming SMS</p>
          </div>
        </div>

        {activeNumbers.length > 0 ? (
          <div className="flex-1 flex flex-col gap-4 overflow-y-auto custom-scrollbar pr-2">
            {activeNumbers.map(activeNumber => {
              const timeLeft = timeRemaining[activeNumber.activationId] || 0;
              const canCancel = timeLeft <= 1020;
              
              return (
                <div key={activeNumber.activationId} className="flex flex-col gap-3 animate-in fade-in zoom-in-95 duration-200 bg-zinc-900 border border-zinc-800 rounded-md p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-md bg-zinc-800 flex items-center justify-center text-lg border border-zinc-700">
                        {activeNumber.icon}
                      </div>
                      <div>
                        <div className="font-semibold text-zinc-100 text-sm">{activeNumber.service}</div>
                        <div className="text-xs text-zinc-500 flex items-center gap-1.5 mt-0.5">
                          <span>{activeNumber.flag}</span>
                          <span>{activeNumber.country}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <div className="flex items-center gap-1.5 text-xs font-medium text-zinc-400 bg-zinc-800/50 border border-zinc-800 px-2 py-1 rounded-sm">
                        <Clock className="w-3.5 h-3.5" />
                        <span className="font-mono">{formatTime(timeLeft)}</span>
                      </div>
                      <button
                        onClick={() => onCancel(activeNumber.activationId)}
                        disabled={!canCancel}
                        className={cn(
                          "flex items-center gap-1.5 px-2 py-1 rounded-sm text-xs font-medium transition-colors border",
                          canCancel
                            ? "bg-zinc-900 hover:bg-red-500/10 text-zinc-400 hover:text-red-400 border-zinc-800 hover:border-red-500/20"
                            : "bg-zinc-900 text-zinc-600 border-zinc-800 cursor-not-allowed"
                        )}
                        title={!canCancel ? "You can cancel after 3 minutes" : ""}
                        aria-label="Cancel number"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        Cancel
                      </button>
                      {!canCancel && (
                        <span className="text-[10px] text-zinc-500 mt-0.5">
                          Available in {formatCountdown(timeLeft - 1020)}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-4 bg-zinc-950 p-3 rounded-md border border-zinc-800">
                    <div className="text-lg sm:text-xl font-mono font-semibold text-zinc-100 tracking-tight select-text cursor-text">
                      {formatPhoneNumber(activeNumber.number, activeNumber.country)}
                    </div>
                    <button
                      onClick={() => onCopy(stripCountryCode(activeNumber.number, activeNumber.country), `num_${activeNumber.activationId}`)}
                      className="p-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 rounded-md transition-colors border border-zinc-800"
                      title="Copy number"
                      aria-label="Copy number"
                    >
                      {copied[`num_${activeNumber.activationId}`] ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>

                  <div className="bg-zinc-950 border border-zinc-800 rounded-md p-4 flex flex-col mt-1">
                    <div className="flex items-center gap-2 mb-3">
                      <ShieldCheck className="w-4 h-4 text-zinc-500" />
                      <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Incoming Messages</h3>
                    </div>
                    {activeNumber.status === 'waiting' ? (
                      <div className="flex-1 flex flex-col items-center justify-center text-center py-6">
                        <Activity className="w-5 h-5 text-zinc-500 animate-pulse mb-3" />
                        <p className="text-sm font-medium text-zinc-400">Listening for SMS...</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="bg-zinc-900 border border-zinc-800 rounded-md p-3 animate-in slide-in-from-bottom-2 duration-300">
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex items-center gap-2">
                              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">System Message</span>
                            </div>
                            <span className="text-[10px] font-medium text-zinc-500">Just now</span>
                          </div>
                          <div>
                            <p className="text-zinc-400 text-xs mb-2">Your {activeNumber.service} verification code is:</p>
                            <div className="flex items-center justify-between bg-zinc-950 border border-zinc-800 rounded-md p-2">
                              <strong className="text-zinc-100 text-lg font-mono tracking-widest">{activeNumber.smsCode}</strong>
                              <button
                                onClick={() => onCopy(activeNumber.smsCode ?? '', `code_${activeNumber.activationId}`)}
                                className="p-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 rounded-md transition-colors"
                                title="Copy code"
                                aria-label="Copy code"
                              >
                                {copied[`code_${activeNumber.activationId}`] ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                              </button>
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2 mt-3">
                          <button
                            onClick={() => onNextCode(activeNumber.activationId)}
                            className="flex-1 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 rounded-md font-medium transition-colors border border-zinc-800 text-xs"
                          >
                            Get Another Code
                          </button>
                          <button
                            onClick={() => onDone(activeNumber.activationId)}
                            className="flex-1 py-2 bg-zinc-100 hover:bg-white text-zinc-900 rounded-md font-medium transition-colors text-xs"
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
          <div className="flex-1 flex flex-col items-center justify-center text-center border border-dashed border-zinc-800 rounded-md p-8 bg-zinc-950/50">
            <div className="w-12 h-12 bg-zinc-900 rounded-md flex items-center justify-center mb-4 border border-zinc-800">
              <Globe className="w-6 h-6 text-zinc-600" />
            </div>
            <h3 className="text-sm font-semibold text-zinc-300 mb-1">No Active Session</h3>
            <p className="text-xs text-zinc-500 max-w-[200px] leading-relaxed">
              Select a service and region to generate a new virtual number.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
