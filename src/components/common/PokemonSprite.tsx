import { useState, useEffect } from 'react';
import { getPokemonById } from '../../constants/pokedex';

interface PokemonSpriteProps {
  pokedexId: number;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showBadge?: boolean;
}

export const PokemonSprite = ({
  pokedexId,
  className = '',
  size = 'md',
  showBadge = false,
}: PokemonSpriteProps) => {
  const [imgError, setImgError] = useState(false);
  const pokemon = getPokemonById(pokedexId);

  useEffect(() => {
    setImgError(false);
  }, [pokedexId]);

  const sizeClasses = {
    sm: 'w-10 h-10',
    md: 'w-16 h-16',
    lg: 'w-24 h-24',
    xl: 'w-32 h-32',
  };

  const spriteUrl = `/assets/pokemon/${pokedexId}.png`;

  return (
    <div className={`relative flex items-center justify-center select-none ${sizeClasses[size]} ${className}`}>
      {!imgError ? (
        <img
          src={spriteUrl}
          alt={pokemon.name}
          className="w-full h-full object-contain filter drop-shadow-[0_4px_6px_rgba(0,0,0,0.5)] image-pixelated transition-transform hover:scale-105 duration-150"
          onError={() => {
            setImgError(true);
          }}
        />
      ) : (
        /* Isometric 3D Voxel Cube Fallback Component */
        <div className="w-full h-full flex flex-col items-center justify-center">
          <svg
            viewBox="0 0 100 100"
            className="w-full h-full drop-shadow-[0_4px_6px_rgba(0,0,0,0.6)]"
          >
            <defs>
              <linearGradient id={`grad-top-${pokedexId}`} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={pokemon.primaryColor} stopOpacity="1" />
                <stop offset="100%" stopColor="#ffffff" stopOpacity="0.3" />
              </linearGradient>
              <linearGradient id={`grad-left-${pokedexId}`} x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor={pokemon.primaryColor} stopOpacity="0.85" />
                <stop offset="100%" stopColor="#000000" stopOpacity="0.3" />
              </linearGradient>
              <linearGradient id={`grad-right-${pokedexId}`} x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor={pokemon.primaryColor} stopOpacity="0.65" />
                <stop offset="100%" stopColor="#000000" stopOpacity="0.6" />
              </linearGradient>
            </defs>

            {/* Isometric Top Face */}
            <polygon
              points="50,15 85,32 50,49 15,32"
              fill={pokemon.primaryColor}
              stroke="#1e2124"
              strokeWidth="2.5"
              strokeLinejoin="round"
            />
            {/* Isometric Left Face */}
            <polygon
              points="15,32 50,49 50,85 15,68"
              fill={`url(#grad-left-${pokedexId})`}
              stroke="#1e2124"
              strokeWidth="2.5"
              strokeLinejoin="round"
            />
            {/* Isometric Right Face */}
            <polygon
              points="50,49 85,32 85,68 50,85"
              fill={`url(#grad-right-${pokedexId})`}
              stroke="#1e2124"
              strokeWidth="2.5"
              strokeLinejoin="round"
            />

            {/* Voxel Eyes */}
            <rect x="25" y="46" width="6" height="8" rx="1" fill="#1e2124" transform="skewY(26) rotate(-2 25 46)" />
            <rect x="38" y="53" width="6" height="8" rx="1" fill="#1e2124" transform="skewY(26) rotate(-2 38 53)" />
            
            {/* Pokédex ID Badge on Cube */}
            <text
              x="50"
              y="34"
              textAnchor="middle"
              fill="#1e2124"
              fontSize="12"
              fontWeight="900"
              fontFamily="'M PLUS Rounded 1c', sans-serif"
              opacity="0.8"
            >
              #{pokedexId}
            </text>
          </svg>
        </div>
      )}

      {showBadge && (
        <span className="absolute -bottom-1 -right-1 bg-neutral-900/90 border border-neutral-700 text-[10px] px-1 rounded font-mono font-bold text-amber-200">
          #{pokedexId.toString().padStart(3, '0')}
        </span>
      )}
    </div>
  );
};
