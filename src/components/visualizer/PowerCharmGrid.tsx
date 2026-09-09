import React, { useState } from 'react';
import type { PokemonProfile, PokemonSocket, PowerStone, SocketType } from '../../types';
import { useBuddyStore } from '../../store/useBuddyStore';
import { getSlotUnlockLevel, getStoneRarityMeta, SUB_STAT_DEFINITIONS } from '../../constants/stats';
import { X, Lock } from 'lucide-react';
import { PowerStoneIcon } from '../common/PowerStoneIcon';
import { EmptySocketIcon } from '../common/EmptySocketIcon';

interface PowerCharmGridProps {
  pokemon: PokemonProfile;
  isEditSocketsMode: boolean;
  onSelectSlotToEquip?: (slotIndex: number) => void;
}

export const PowerCharmGrid: React.FC<PowerCharmGridProps> = ({
  pokemon,
  isEditSocketsMode,
  onSelectSlotToEquip,
}) => {
  const stones = useBuddyStore(state => state.stones);
  const equipStone = useBuddyStore(state => state.equipStone);
  const unequipStone = useBuddyStore(state => state.unequipStone);
  const updateSocketType = useBuddyStore(state => state.updateSocketType);
  const selectedStoneId = useBuddyStore(state => state.selectedStoneId);
  const setSelectedStoneId = useBuddyStore(state => state.setSelectedStoneId);

  const [dragOverSlot, setDragOverSlot] = useState<number | null>(null);
  const [activePopupSlotIndex, setActivePopupSlotIndex] = useState<number | null>(null);

  // Map equipped stones for this pokemon by slotIndex
  const equippedBySlot = new Map<number, PowerStone>();
  stones.forEach(stone => {
    if (stone.assignedPokemonId === pokemon.id && stone.assignedSlotIndex !== null && stone.assignedSlotIndex !== undefined) {
      equippedBySlot.set(stone.assignedSlotIndex, stone);
    }
  });

  const handleCycleSocket = (socket: PokemonSocket) => {
    if (!isEditSocketsMode) return;
    const nextTypeMap: Record<SocketType, SocketType> = {
      ATK: 'HP',
      HP: 'MULTI',
      MULTI: 'ATK',
    };
    updateSocketType(pokemon.id, socket.slotIndex, nextTypeMap[socket.type]);
  };

  const handleDrop = (e: React.DragEvent, slotIndex: number) => {
    e.preventDefault();
    setDragOverSlot(null);
    const stoneId = e.dataTransfer.getData('text/plain');
    if (stoneId) {
      equipStone(stoneId, pokemon.id, slotIndex);
    }
  };

  const handleSlotClick = (socket: PokemonSocket) => {
    if (isEditSocketsMode) {
      handleCycleSocket(socket);
      return;
    }

    if (!socket.isUnlocked) return;

    // If a stone is selected in the inventory, attempt to equip it into this slot
    if (selectedStoneId) {
      const selectedStone = stones.find(s => s.id === selectedStoneId);
      if (selectedStone) {
        const canEquip =
          socket.type === 'MULTI' ||
          (socket.type === 'ATK' && selectedStone.type === 'ATK') ||
          (socket.type === 'HP' && selectedStone.type === 'HP');

        if (canEquip) {
          equipStone(selectedStoneId, pokemon.id, socket.slotIndex);
          setSelectedStoneId(null);
          return;
        }
      }
    }

    const equipped = equippedBySlot.get(socket.slotIndex);
    if (equipped) {
      // Toggle popup on click/tap
      setActivePopupSlotIndex(prev => (prev === socket.slotIndex ? null : socket.slotIndex));
      return;
    }

    if (onSelectSlotToEquip) {
      onSelectSlotToEquip(socket.slotIndex);
    }
  };

  return (
    <div className="relative">
      {/* 3x3 Charm Visualizer Grid */}
      <div className="bg-[#1E2124] p-3.5 rounded-xl border-4 border-[#3D434A] shadow-[0_8px_0_#141618,0_12px_24px_rgba(0,0,0,0.6)]">
        <div className="grid grid-cols-3 gap-2.5 sm:gap-3 aspect-square max-w-[420px] mx-auto">
          {pokemon.sockets.map((socket) => {
            const equipped = equippedBySlot.get(socket.slotIndex);
            const isDragOver = dragOverSlot === socket.slotIndex;
            const unlockLevel = getSlotUnlockLevel(socket.slotIndex, pokemon.pokedexId);
            const isPopupOpen = activePopupSlotIndex === socket.slotIndex;
            const equippedRarityMeta = equipped ? getStoneRarityMeta(equipped.subStats?.length || 0) : null;

            const slotLabel = `Slot ${socket.slotIndex + 1} (${socket.type} socket): ${
              !socket.isUnlocked
                ? `Locked until Level ${unlockLevel}`
                : equipped
                ? `Equipped ${equipped.type} Power Stone (${equipped.power} power, ${equipped.subStats?.length || 0} sub-stats)`
                : 'Empty slot'
            }`;

            return (
              <div
                key={socket.slotIndex}
                role="button"
                tabIndex={socket.isUnlocked ? 0 : -1}
                aria-label={slotLabel}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleSlotClick(socket);
                  }
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  if (socket.isUnlocked) setDragOverSlot(socket.slotIndex);
                }}
                onDragLeave={() => setDragOverSlot(null)}
                onDrop={(e) => handleDrop(e, socket.slotIndex)}
                onClick={() => handleSlotClick(socket)}
                className={`group relative rounded-xl transition-all duration-150 flex flex-col items-center justify-between p-2 select-none cursor-pointer border-2 ${
                  !socket.isUnlocked
                    ? 'bg-[#151719] border-neutral-800/80 opacity-60 cursor-not-allowed'
                    : isDragOver
                    ? 'border-yellow-400 bg-yellow-950/40 ring-2 ring-yellow-400 scale-[1.02]'
                    : equipped && equippedRarityMeta
                    ? equippedRarityMeta.slotBg
                    : 'bg-gradient-to-b from-[#1c1f24] to-[#121417] border-neutral-700/80 hover:border-neutral-500'
                } shadow-[inset_0_2px_6px_rgba(0,0,0,0.7),0_3px_0_rgba(0,0,0,0.5)]`}
              >
                {/* Slot Top Bar: Power Value (Upper Left) & Slot # */}
                <div className="w-full flex items-center justify-between text-[11px] font-mono leading-none z-10">
                  {equipped ? (
                    <span className="font-mono font-black text-white text-[11px] sm:text-xs tracking-tight drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]">
                      {equipped.power}
                    </span>
                  ) : (
                    <span />
                  )}

                  <span className="text-neutral-500 text-[10px] font-mono">
                    #{socket.slotIndex + 1}
                  </span>
                </div>

                {/* Slot Content Body */}
                <div className="my-auto flex flex-col items-center justify-center w-full">
                  {!socket.isUnlocked ? (
                    <EmptySocketIcon
                      type={socket.type}
                      isUnlocked={false}
                      slotNumber={socket.slotIndex + 1}
                      unlockLevel={unlockLevel}
                      isEditMode={isEditSocketsMode}
                    />
                  ) : equipped ? (
                    /* Equipped Stone: Render 3D Gemstone Image */
                    <div className="relative flex flex-col items-center justify-center py-1">
                      <PowerStoneIcon
                        type={equipped.type}
                        power={equipped.power}
                        size="md"
                        showPower={false}
                        className="transition-transform group-hover:scale-105"
                      />

                      {/* Sub-stat dot indicators */}
                      <div className="flex items-center gap-1 mt-1">
                        {equipped.subStats.map((sub, idx) => (
                          <span
                            key={idx}
                            className="w-2 h-2 rounded-full ring-1 ring-neutral-950"
                            style={{
                              backgroundColor: SUB_STAT_DEFINITIONS[sub.type]?.color || '#EC4899',
                            }}
                          />
                        ))}
                      </div>

                      {/* Unequip quick button on hover */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          unequipStone(equipped.id);
                        }}
                        className="absolute -top-1 -right-1 hidden group-hover:flex items-center justify-center w-5 h-5 bg-neutral-900/95 hover:bg-red-900 text-neutral-300 hover:text-red-200 border border-neutral-700 rounded-full transition-all shadow-md z-20"
                        title="Unequip Stone"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    /* Empty Socket: Game-accurate Carved Socket Icon with Fist/Heart */
                    <EmptySocketIcon
                      type={socket.type}
                      isUnlocked={true}
                      slotNumber={socket.slotIndex + 1}
                      isEditMode={isEditSocketsMode}
                    />
                  )}
                </div>

                {/* Sub-stat summary count or status */}
                <div className="w-full flex items-center justify-between text-[10px] font-mono text-neutral-400 z-10">
                  {equipped ? (
                    <span
                      className={`truncate font-bold ${
                        equippedRarityMeta?.cardHeaderColor || 'text-neutral-300'
                      }`}
                    >
                      {equipped.subStats.length} buff{equipped.subStats.length !== 1 ? 's' : ''}
                    </span>
                  ) : (
                    <span className="text-neutral-500 truncate">
                      {socket.isUnlocked
                        ? isEditSocketsMode
                          ? 'Click Cycle'
                          : 'Empty'
                        : `Lv. ${unlockLevel}`}
                    </span>
                  )}
                  {equipped?.isLocked && (
                    <span title="Stone Locked">
                      <Lock className="w-2.5 h-2.5 text-amber-400 shrink-0" />
                    </span>
                  )}
                </div>

                {/* Equipped Stone Boosts Popover / Tooltip */}
                {equipped && equippedRarityMeta && (
                  <div
                    className={`absolute z-30 pointer-events-none transition-all duration-150 ${
                      isPopupOpen
                        ? 'opacity-100 scale-100'
                        : 'opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-100'
                    } ${
                      socket.slotIndex < 3
                        ? 'top-full mt-1.5'
                        : 'bottom-full mb-1.5'
                    } left-1/2 -translate-x-1/2 w-48 sm:w-56 bg-[#16181B] border-2 border-amber-500/70 rounded-lg p-2.5 shadow-[0_6px_20px_rgba(0,0,0,0.85)] font-mono text-left`}
                  >
                    {/* Popover Header */}
                    <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-neutral-800">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            equipped.type === 'ATK' ? 'bg-red-500' : 'bg-blue-500'
                          }`}
                        />
                        <span className={`text-xs font-bold ${equippedRarityMeta.cardHeaderColor}`}>
                          {equipped.type === 'ATK' ? 'Mighty Stone' : 'Sturdy Stone'}
                        </span>
                      </div>
                      <span className="text-xs font-black text-amber-300">
                        +{equipped.power} Power
                      </span>
                    </div>

                    {/* Popover Sub-stats */}
                    {equipped.subStats.length > 0 ? (
                      <div className="flex flex-col gap-1">
                        {equipped.subStats.map((sub, idx) => {
                          const meta = SUB_STAT_DEFINITIONS[sub.type];
                          const isNeg = sub.type === 'TIME_TO_RECOVER';
                          const sign = isNeg ? '-' : '+';
                          return (
                            <div
                              key={idx}
                              className="flex items-center justify-between text-[11px] bg-neutral-900/80 px-2 py-1 rounded border border-neutral-800"
                            >
                              <span className="text-neutral-300 font-medium truncate pr-1">
                                {meta?.label || sub.type}
                              </span>
                              <span
                                className="font-bold shrink-0"
                                style={{ color: meta?.color || '#F59E0B' }}
                              >
                                {sign}{Number(sub.value).toFixed(1)}{meta?.unit || '%'}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-[10px] text-neutral-500 italic py-0.5">
                        No sub-stat boosts (Standard Stone)
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
