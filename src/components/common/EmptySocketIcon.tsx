import React from 'react';
import type { SocketType } from '../../types';
import { Lock } from 'lucide-react';
import { QuestFistIcon, QuestHeartIcon, QuestMultiIcon } from './GameIcons';

interface EmptySocketIconProps {
  type: SocketType;
  isUnlocked: boolean;
  slotNumber: number;
  unlockLevel?: number;
  isEditMode?: boolean;
}

export const EmptySocketIcon: React.FC<EmptySocketIconProps> = ({
  type,
  isUnlocked,
  slotNumber,
  unlockLevel,
  isEditMode = false,
}) => {
  if (!isUnlocked) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center p-1.5 text-neutral-600 select-none">
        <div className="w-11 h-11 rounded-lg bg-[#141618] border-2 border-[#24272c] flex flex-col items-center justify-center shadow-[inset_0_3px_6px_rgba(0,0,0,0.8)]">
          <Lock className="w-5 h-5 text-neutral-500" />
        </div>
        <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-wider mt-1 font-bold">
          {unlockLevel !== undefined ? `Lv. ${unlockLevel}` : 'Locked'}
        </span>
      </div>
    );
  }

  const isAtk = type === 'ATK';
  const isHp = type === 'HP';

  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-1 select-none">
      {/* Carved stone socket recess with muted in-game fist / heart / multi emblem */}
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center border-2 transition-all shadow-[inset_0_3px_8px_rgba(0,0,0,0.9),0_2px_0_rgba(255,255,255,0.05)] bg-gradient-to-br from-[#16181b] to-[#0c0d0f] border-neutral-700/80 group-hover:border-neutral-500 group-hover:shadow-[inset_0_3px_8px_rgba(0,0,0,0.9),0_0_8px_rgba(255,255,255,0.06)]"
      >
        {isAtk && (
          <QuestFistIcon size={30} fill="#EF4444" className="opacity-60 group-hover:opacity-85 transition-opacity" />
        )}
        {isHp && (
          <QuestHeartIcon size={30} fill="#3B82F6" className="opacity-60 group-hover:opacity-85 transition-opacity" />
        )}
        {!isAtk && !isHp && (
          <QuestMultiIcon size={30} className="opacity-60 group-hover:opacity-85 transition-opacity" />
        )}
      </div>

      <span className="text-[10px] font-mono text-neutral-400 font-bold mt-1">
        {isEditMode ? 'Cycle' : `Slot #${slotNumber}`}
      </span>
    </div>
  );
};
