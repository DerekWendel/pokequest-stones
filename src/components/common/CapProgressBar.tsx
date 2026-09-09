import React from 'react';
import type { SubStatType } from '../../types';
import { SUB_STAT_DEFINITIONS } from '../../constants/stats';
import { AlertCircle } from 'lucide-react';

interface CapProgressBarProps {
  statKey: SubStatType;
  raw: number;
  effective: number;
  cap: number;
  percentOfCap: number;
  isCapped: boolean;
}

export const CapProgressBar: React.FC<CapProgressBarProps> = ({
  statKey,
  raw,
  effective,
  cap,
  percentOfCap,
  isCapped,
}) => {
  const meta = SUB_STAT_DEFINITIONS[statKey];
  const isOverCapped = raw > cap;
  const isNeg = statKey === 'TIME_TO_RECOVER';
  const prefix = isNeg ? '-' : '';

  return (
    <div className="bg-neutral-800/80 border border-neutral-700/60 rounded-lg p-2.5 flex flex-col gap-1.5 shadow-sm">
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5 font-medium text-neutral-200">
          <span
            className="w-2.5 h-2.5 rounded-full inline-block shrink-0 shadow-sm"
            style={{ backgroundColor: meta.color }}
          />
          <span className="truncate">{meta.label}</span>
        </div>

        <div className="flex items-center gap-1 font-mono font-bold">
          <span className={isCapped ? 'text-emerald-400' : 'text-neutral-100'}>
            {prefix}{effective.toFixed(1)}%
          </span>
          <span className="text-neutral-500">/</span>
          <span className="text-neutral-400">{prefix}{cap.toFixed(1)}%</span>
          {isCapped && (
            <span className="ml-1 text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-1 py-0.2 rounded uppercase font-sans tracking-wide">
              MAX
            </span>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="relative w-full h-2.5 bg-neutral-900 rounded-full overflow-hidden border border-neutral-700/60">
        <div
          className="h-full rounded-full transition-all duration-300 ease-out shadow-inner"
          style={{
            width: `${percentOfCap}%`,
            backgroundColor: isCapped ? '#10B981' : meta.color,
          }}
        />
      </div>

      {/* Over-cap warning note if user wasted stats beyond hard cap */}
      {isOverCapped && (
        <div className="flex items-center gap-1 text-[11px] text-amber-400/90 font-mono mt-0.5">
          <AlertCircle className="w-3 h-3 shrink-0" />
          <span>{prefix}{Number((raw - cap).toFixed(1))}% over cap (wasted utility)</span>
        </div>
      )}
    </div>
  );
};
