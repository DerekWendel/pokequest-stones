import React from 'react';
import type { SubStat } from '../../types';
import { SUB_STAT_DEFINITIONS } from '../../constants/stats';

interface SubStatBadgeProps {
  subStat: SubStat;
  compact?: boolean;
}

export const SubStatBadge: React.FC<SubStatBadgeProps> = ({ subStat, compact = false }) => {
  const meta = SUB_STAT_DEFINITIONS[subStat.type] || {
    label: subStat.type,
    shortLabel: subStat.type,
    badgeClass: 'bg-neutral-800 text-neutral-300 border-neutral-700',
    unit: '%',
  };

  const isNeg = subStat.type === 'TIME_TO_RECOVER';
  const sign = isNeg ? '-' : '+';
  const formattedVal = Number(subStat.value).toFixed(1);

  return (
    <span
      className={`inline-flex items-center gap-1 border rounded px-1.5 py-0.5 font-mono font-medium ${meta.badgeClass} ${
        compact ? 'text-[11px] leading-tight' : 'text-xs'
      }`}
      title={`${meta.label}: ${sign}${formattedVal}${meta.unit}`}
    >
      <span className="font-semibold text-neutral-300">{meta.shortLabel}:</span>
      <span className="font-bold">{sign}{formattedVal}{meta.unit}</span>
    </span>
  );
};

