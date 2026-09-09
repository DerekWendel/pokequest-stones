import React, { useMemo } from 'react';
import type { PokemonProfile, PowerStone } from '../../types';
import { SUB_STAT_DEFINITIONS, SUB_STAT_KEYS, MAX_STONES_LIMIT } from '../../constants/stats';
import { useBuddyStore } from '../../store/useBuddyStore';
import { StoneCard } from './StoneCard';
import { Search, Plus, ArrowUpDown, Swords, Heart, Box, X } from 'lucide-react';

interface StoneDrawerProps {
  activePokemon: PokemonProfile | null;
  onOpenAddStoneModal: () => void;
  onEditStone: (stone: PowerStone) => void;
}

export const StoneDrawer: React.FC<StoneDrawerProps> = ({
  activePokemon,
  onOpenAddStoneModal,
  onEditStone,
}) => {
  const stones = useBuddyStore(state => state.stones);
  const searchQuery = useBuddyStore(state => state.searchQuery);
  const typeFilter = useBuddyStore(state => state.typeFilter);
  const subStatFilter = useBuddyStore(state => state.subStatFilter);
  const assignmentFilter = useBuddyStore(state => state.assignmentFilter);
  const lockedFilter = useBuddyStore(state => state.lockedFilter);
  const sortBy = useBuddyStore(state => state.sortBy);
  const sortOrder = useBuddyStore(state => state.sortOrder);

  const setSearchQuery = useBuddyStore(state => state.setSearchQuery);
  const setTypeFilter = useBuddyStore(state => state.setTypeFilter);
  const setSubStatFilter = useBuddyStore(state => state.setSubStatFilter);
  const setAssignmentFilter = useBuddyStore(state => state.setAssignmentFilter);
  const setSortBy = useBuddyStore(state => state.setSortBy);

  const isInventoryFull = stones.length >= MAX_STONES_LIMIT;

  // Filter and sort stones
  const filteredStones = useMemo(() => {
    return stones.filter(stone => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesType = stone.type.toLowerCase().includes(q);
        const matchesPower = stone.power.toString().includes(q);
        const matchesSubStat = stone.subStats.some(s =>
          s.type.toLowerCase().includes(q) ||
          SUB_STAT_DEFINITIONS[s.type]?.label.toLowerCase().includes(q)
        );
        if (!matchesType && !matchesPower && !matchesSubStat) return false;
      }

      // Type filter
      if (typeFilter !== 'ALL' && stone.type !== typeFilter) return false;

      // Sub-stat filter
      if (subStatFilter !== 'ALL') {
        const hasSub = stone.subStats.some(s => s.type === subStatFilter);
        if (!hasSub) return false;
      }

      // Assignment filter
      if (assignmentFilter === 'UNASSIGNED' && stone.assignedPokemonId) return false;
      if (assignmentFilter === 'ASSIGNED' && !stone.assignedPokemonId) return false;
      if (assignmentFilter === 'ACTIVE_POKEMON') {
        if (!activePokemon || stone.assignedPokemonId !== activePokemon.id) return false;
      }

      // Locked filter
      if (lockedFilter === 'LOCKED' && !stone.isLocked) return false;
      if (lockedFilter === 'UNLOCKED' && stone.isLocked) return false;

      return true;
    });
  }, [stones, searchQuery, typeFilter, subStatFilter, assignmentFilter, lockedFilter, activePokemon]);

  // Sort stones
  const sortedStones = useMemo(() => {
    return [...filteredStones].sort((a, b) => {
      let comparison = 0;

      if (sortBy === 'POWER') {
        comparison = b.power - a.power;
      } else if (sortBy === 'SUBSTAT_COUNT') {
        comparison = b.subStats.length - a.subStats.length;
      } else {
        // RECENT: preserve array order
        comparison = 0;
      }

      return sortOrder === 'asc' ? -comparison : comparison;
    });
  }, [filteredStones, sortBy, sortOrder]);

  return (
    <div className="bg-[#24272C] border-2 border-[#3D434A] rounded-xl p-4 shadow-[0_4px_0_#141618] flex flex-col gap-4">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-neutral-800">
        <div className="flex items-center gap-2">
          <Box className="w-5 h-5 text-amber-400" />
          <h3 className="text-base font-black text-amber-200 font-mono tracking-tight">
            Power Stone Inventory
          </h3>
          <span className={`px-2 py-0.5 rounded text-xs font-mono font-bold border ${
            isInventoryFull
              ? 'bg-red-950/60 text-red-300 border-red-500/50'
              : 'bg-neutral-800 text-neutral-400 border-neutral-700'
          }`}>
            {stones.length} / {MAX_STONES_LIMIT} Stones
          </span>
          {filteredStones.length !== stones.length && (
            <span className="text-[11px] text-neutral-500 font-mono">
              ({filteredStones.length} shown)
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={onOpenAddStoneModal}
            disabled={isInventoryFull}
            className={`quest-btn px-3 py-1.5 text-xs font-mono font-bold flex items-center gap-1.5 ${
              isInventoryFull
                ? 'bg-neutral-800 text-neutral-500 border-neutral-700 opacity-50 cursor-not-allowed'
                : 'bg-amber-500 hover:bg-amber-400 text-neutral-950 shadow-[0_3px_0_#92400e]'
            }`}
            title={isInventoryFull ? `Inventory limit reached (${MAX_STONES_LIMIT}/${MAX_STONES_LIMIT})` : 'Add Power Stone'}
          >
            <Plus className="w-4 h-4" />
            <span>Add Stone</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col lg:flex-row gap-2.5">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by power, sub-stat (e.g. 2.9, hit heal)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-neutral-900 border border-neutral-700 rounded-lg pl-9 pr-8 py-1.5 text-xs font-mono text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-amber-400"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filters Group */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Type Filter Buttons */}
          <div className="flex items-center bg-neutral-900 border border-neutral-700 rounded-lg p-0.5 text-xs font-mono">
            <button
              onClick={() => setTypeFilter('ALL')}
              className={`px-2.5 py-1 rounded font-bold transition-colors ${
                typeFilter === 'ALL'
                  ? 'bg-neutral-700 text-neutral-100'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setTypeFilter('ATK')}
              className={`px-2.5 py-1 rounded font-bold flex items-center gap-1 transition-colors ${
                typeFilter === 'ATK'
                  ? 'bg-red-500/20 text-red-400 border border-red-500/40'
                  : 'text-neutral-400 hover:text-red-400'
              }`}
            >
              <Swords className="w-3 h-3" />
              <span>ATK</span>
            </button>
            <button
              onClick={() => setTypeFilter('HP')}
              className={`px-2.5 py-1 rounded font-bold flex items-center gap-1 transition-colors ${
                typeFilter === 'HP'
                  ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40'
                  : 'text-neutral-400 hover:text-blue-400'
              }`}
            >
              <Heart className="w-3 h-3" />
              <span>HP</span>
            </button>
          </div>

          {/* Sub-stat Dropdown */}
          <select
            value={subStatFilter}
            onChange={(e) => setSubStatFilter(e.target.value as any)}
            className="bg-neutral-900 border border-neutral-700 text-neutral-300 text-xs font-mono rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-amber-400"
          >
            <option value="ALL">All Sub-Stats</option>
            {SUB_STAT_KEYS.map((key) => (
              <option key={key} value={key}>
                {SUB_STAT_DEFINITIONS[key].label}
              </option>
            ))}
          </select>

          {/* Assignment Filter */}
          <select
            value={assignmentFilter}
            onChange={(e) => setAssignmentFilter(e.target.value as any)}
            className="bg-neutral-900 border border-neutral-700 text-neutral-300 text-xs font-mono rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-amber-400"
          >
            <option value="ALL">All Assignments</option>
            <option value="UNASSIGNED">Unassigned Only</option>
            <option value="ACTIVE_POKEMON">Active Pokémon</option>
            <option value="ASSIGNED">Any Equipped</option>
          </select>

          {/* Sort By Dropdown */}
          <div className="flex items-center gap-1 bg-neutral-900 border border-neutral-700 rounded-lg px-2 py-0.5">
            <ArrowUpDown className="w-3 h-3 text-neutral-500" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-transparent text-neutral-300 text-xs font-mono py-1 focus:outline-none cursor-pointer"
            >
              <option value="POWER">Primary Power</option>
              <option value="SUBSTAT_COUNT">Sub-stat Count</option>
              <option value="RECENT">Recent</option>
            </select>
          </div>
        </div>
      </div>

      {/* Stone Grid Drawer */}
      {sortedStones.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 max-h-[520px] overflow-y-auto pr-1">
          {sortedStones.map((stone) => (
            <StoneCard
              key={stone.id}
              stone={stone}
              activePokemon={activePokemon}
              onEdit={onEditStone}
            />
          ))}
        </div>
      ) : (
        <div className="py-12 flex flex-col items-center justify-center text-center bg-neutral-900/40 rounded-xl border border-dashed border-neutral-800 p-6">
          <Box className="w-10 h-10 text-neutral-600 mb-2" />
          <h4 className="text-sm font-bold text-neutral-300 font-mono">No Power Stones Found</h4>
          <p className="text-xs text-neutral-500 max-w-sm mt-1">
            Try adjusting your search criteria or click "Add Stone" to create a new stone.
          </p>
        </div>
      )}
    </div>
  );
};
