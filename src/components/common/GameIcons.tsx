import React from 'react';

interface GameIconProps {
  className?: string;
  size?: number | string;
  fill?: string;
}

/**
 * Authentic Pokémon Quest Fist Symbol (ATK / Mighty symbol)
 * Uses the exact in-game voxel G-spiral clenched fist geometry.
 */
export const QuestFistIcon: React.FC<GameIconProps> = ({
  className = '',
  size = 24,
  fill = 'currentColor',
}) => {
  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={`inline-block select-none ${className}`}
      fill="none"
    >
      <g fill={fill}>
        {/* Outer Fist Silhouette with rounded voxel corners & bottom wrist notch */}
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M 24,14 C 18,14 14,18 14,24 L 14,70 C 14,76 18,80 24,80 L 32,80 L 32,92 C 32,95 35,98 38,98 L 62,98 C 65,98 68,95 68,92 L 68,80 L 76,80 C 82,80 86,76 86,70 L 86,24 C 86,18 82,14 76,14 Z M 14,46 L 56,46 L 56,70 L 68,70 L 68,36 L 56,36 L 56,36 L 14,36 Z"
        />
      </g>
    </svg>
  );
};

/**
 * Authentic Pokémon Quest Heart Symbol (HP / Sturdy symbol)
 * Uses the exact in-game voxel heart geometry.
 */
export const QuestHeartIcon: React.FC<GameIconProps> = ({
  className = '',
  size = 24,
  fill = 'currentColor',
}) => {
  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={`inline-block select-none ${className}`}
      fill="none"
    >
      <g fill={fill}>
        {/* Authentic Blocky / Diamond Point Voxel Heart */}
        <path
          d="M 50,28 L 68,14 C 76,8 86,14 88,24 C 90,34 84,46 74,56 L 50,86 L 26,56 C 16,46 10,34 12,24 C 14,14 24,8 32,14 Z"
        />
      </g>
    </svg>
  );
};

/**
 * Authentic Dual Multi-Socket Symbol (Combined Fist & Heart)
 */
export const QuestMultiIcon: React.FC<GameIconProps> = ({
  className = '',
  size = 24,
}) => {
  return (
    <div className={`relative inline-flex items-center justify-center select-none ${className}`} style={{ width: size, height: size }}>
      <div className="absolute -left-0.5 top-0 w-[55%] h-[55%]">
        <QuestFistIcon size="100%" fill="#EF4444" />
      </div>
      <div className="absolute -right-0.5 bottom-0 w-[55%] h-[55%]">
        <QuestHeartIcon size="100%" fill="#3B82F6" />
      </div>
    </div>
  );
};
