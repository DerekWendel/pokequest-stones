import React from 'react';
import type { PowerStone, PokemonProfile } from '../../types';
import { useBuddyStore } from '../../store/useBuddyStore';
import { MAX_STONES_LIMIT, getStoneRarityMeta } from '../../constants/stats';
import { SubStatBadge } from '../common/SubStatBadge';
import { PowerStoneIcon } from '../common/PowerStoneIcon';
import { Lock, Unlock, Copy, Trash2, Edit2, Check } from 'lucide-react';

interface StoneCardProps {
  stone: PowerStone;
  activePokemon: PokemonProfile | null;
  onEdit: (stone: PowerStone) => void;
}

export const StoneCard: React.FC<StoneCardProps> = ({ stone, activePokemon, onEdit }) => {
  const stones = useBuddyStore(state => state.stones);
  const pokemonList = useBuddyStore(state => state.pokemon);
  const toggleLockStone = useBuddyStore(state => state.toggleLockStone);
  const duplicateStone = useBuddyStore(state => state.duplicateStone);
  const deleteStone = useBuddyStore(state => state.deleteStone);
  const selectedStoneId = useBuddyStore(state => state.selectedStoneId);
  const setSelectedStoneId = useBuddyStore(state => state.setSelectedStoneId);

  const isInventoryFull = stones.length >= MAX_STONES_LIMIT;

  const isSelected = selectedStoneId === stone.id;
  const buffCount = stone.subStats?.length || 0;
  const rarityMeta = getStoneRarityMeta(buffCount);

  // Assignment info
  const assignedPokemon = stone.assignedPokemonId
    ? pokemonList.find(p => p.id === stone.assignedPokemonId)
    : null;

  const isAssignedToActive = activePokemon && stone.assignedPokemonId === activePokemon.id;

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('text/plain', stone.id);
  };

  const handleCardClick = () => {
    setSelectedStoneId(isSelected ? null : stone.id);
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onClick={handleCardClick}
      className={`group relative rounded-xl border-2 p-3 flex flex-col justify-between gap-2.5 cursor-pointer transition-all ${
        rarityMeta.cardBg
      } ${
        isSelected
          ? 'ring-2 ring-white ring-offset-2 ring-offset-neutral-900 border-white shadow-[0_0_18px_rgba(255,255,255,0.35)] scale-[1.01]'
          : isAssignedToActive
          ? `${rarityMeta.cardBorder} ${rarityMeta.cardShadow} ring-1 ring-emerald-400/80`
          : `${rarityMeta.cardBorder} ${rarityMeta.cardShadow} hover:brightness-110`
      }`}
    >
      {/* Top Row: 3D Stone Icon, Primary Power, Actions */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          {/* Authentic 3D Mighty / Sturdy Stone Icon */}
          <PowerStoneIcon
            type={stone.type}
            showPower={false}
            size="md"
            className="shrink-0 transition-transform group-hover:scale-105"
          />

          <div>
            <div className="flex items-center gap-1.5 font-mono">
              <span className={`text-xs font-bold ${rarityMeta.cardHeaderColor}`}>
                {stone.type === 'ATK' ? 'Mighty Stone' : 'Sturdy Stone'}
              </span>
            </div>

            {/* Power display where score used to be */}
            <div className="text-xs font-mono text-amber-300 font-bold mt-0.5">
              <span>Power: {stone.power}</span>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={() => toggleLockStone(stone.id)}
            className={`p-1 rounded transition-colors ${
              stone.isLocked
                ? 'text-amber-400 hover:bg-amber-400/20'
                : 'text-neutral-600 hover:text-neutral-400 hover:bg-neutral-800'
            }`}
            title={stone.isLocked ? 'Stone Locked' : 'Lock Stone'}
          >
            {stone.isLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
          </button>

          <button
            type="button"
            onClick={() => onEdit(stone)}
            className="p-1 text-neutral-500 hover:text-neutral-200 hover:bg-neutral-800 rounded"
            title="Edit Stone"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => duplicateStone(stone.id)}
            disabled={isInventoryFull}
            className={`p-1 rounded transition-colors ${
              isInventoryFull
                ? 'text-neutral-700 opacity-40 cursor-not-allowed'
                : 'text-neutral-500 hover:text-neutral-200 hover:bg-neutral-800'
            }`}
            title={isInventoryFull ? `Inventory limit reached (${MAX_STONES_LIMIT}/${MAX_STONES_LIMIT})` : 'Duplicate Stone'}
          >
            <Copy className="w-3.5 h-3.5" />
          </button>

          {!stone.isLocked && (
            <button
              type="button"
              onClick={() => deleteStone(stone.id)}
              className="p-1 text-neutral-500 hover:text-red-400 hover:bg-neutral-800 rounded"
              title="Delete Stone"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Sub-stat Buffs Preview Row */}
      <div className="flex flex-wrap gap-1 min-h-[22px] items-center">
        {stone.subStats.length > 0 ? (
          stone.subStats.map((sub, idx) => (
            <SubStatBadge key={idx} subStat={sub} compact />
          ))
        ) : (
          <span className="text-[10px] text-neutral-500 font-mono italic">No sub-stat buffs</span>
        )}
      </div>

      {/* Card Footer: Assignment Status & Selection hint */}
      <div className="flex items-center justify-between pt-1 border-t border-neutral-800 text-[10px] font-mono">
        {assignedPokemon ? (
          <span
            className={`truncate font-bold ${
              isAssignedToActive ? 'text-emerald-400' : 'text-neutral-400'
            }`}
          >
            Equipped: {assignedPokemon.name} (Slot {(stone.assignedSlotIndex ?? 0) + 1})
          </span>
        ) : (
          <span className="text-neutral-500">Unassigned (Inventory)</span>
        )}

        {isSelected && (
          <span className="text-amber-300 font-bold flex items-center gap-0.5">
            <Check className="w-2.5 h-2.5" /> Selected
          </span>
        )}
      </div>
    </div>
  );
};
