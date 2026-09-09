import React from 'react';
import { POKEMON_TYPE_COLORS } from '../../constants/pokedex';

interface TypeBadgeProps {
  type: string;
  size?: 'sm' | 'md' | 'xs';
  className?: string;
}

export const TypeBadge: React.FC<TypeBadgeProps> = ({ type, size = 'md', className = '' }) => {
  const colors = POKEMON_TYPE_COLORS[type] || {
    bg: '#64748B',
    text: '#FFFFFF',
    border: '#475569',
  };

  const sizeClasses = {
    xs: 'px-1.5 py-0.2 text-[9px]',
    sm: 'px-2 py-0.5 text-[10px]',
    md: 'px-2.5 py-0.5 text-xs',
  };

  return (
    <span
      className={`inline-flex items-center justify-center font-mono font-black uppercase tracking-wider rounded select-none ${sizeClasses[size]} ${className}`}
      style={{
        backgroundColor: colors.bg,
        color: colors.text,
        border: `1px solid ${colors.border}`,
        textShadow: colors.text === '#FFFFFF' ? '0 1px 2px rgba(0,0,0,0.6)' : 'none',
        boxShadow: '0 1px 2px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.25)',
      }}
      title={`Type: ${type}`}
    >
      {type}
    </span>
  );
};
