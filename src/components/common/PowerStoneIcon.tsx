import React, { useState } from 'react';
import type { StoneType } from '../../types';
import { QuestFistIcon, QuestHeartIcon } from './GameIcons';

interface PowerStoneIconProps {
  type: StoneType;
  power?: number | string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showPower?: boolean;
  variant?: 'cube' | 'gem';
}

export const PowerStoneIcon: React.FC<PowerStoneIconProps> = ({
  type,
  power,
  size = 'md',
  className = '',
  showPower = true,
  variant = 'cube',
}) => {
  const [imgError, setImgError] = useState(false);

  const sizeMap = {
    sm: 'w-10 h-10',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
    xl: 'w-20 h-20',
  };

  const isAtk = type === 'ATK';
  const imgUrl = isAtk
    ? variant === 'gem'
      ? '/assets/stones/power_stone_atk.png'
      : '/assets/stones/stone_atk_cube.png'
    : variant === 'gem'
    ? '/assets/stones/power_stone_hp.png'
    : '/assets/stones/stone_hp_cube.png';

  return (
    <div className={`relative flex items-center justify-center select-none shrink-0 ${sizeMap[size]} ${className}`}>
      {!imgError ? (
        <img
          src={imgUrl}
          alt={isAtk ? 'Mighty Stone' : 'Sturdy Stone'}
          className="w-full h-full object-contain filter drop-shadow-[0_4px_6px_rgba(0,0,0,0.6)] image-pixelated"
          onError={() => setImgError(true)}
        />
      ) : (
        /* Dynamic SVG Fallback */
        <div
          className={`w-full h-full rounded-xl flex items-center justify-center border-2 shadow-lg ${
            isAtk
              ? 'bg-gradient-to-br from-red-600 to-red-900 border-red-400'
              : 'bg-gradient-to-br from-blue-600 to-blue-900 border-blue-400'
          }`}
        >
          {isAtk ? <QuestFistIcon size="60%" fill="#FFF" /> : <QuestHeartIcon size="60%" fill="#FFF" />}
        </div>
      )}

      {/* Primary Power Label Display (without redundant ATK/HP text label) */}
      {showPower && power !== undefined && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
          <span className="font-mono font-black text-white text-xs sm:text-sm tracking-tight drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)]">
            {power}
          </span>
        </div>
      )}
    </div>
  );
};
