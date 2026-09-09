import React, { useState } from 'react';
import type { PokemonProfile, StatRequirements, SubStatType, UnmetRequirement } from '../../types';
import { SUB_STAT_DEFINITIONS, SUB_STAT_KEYS, DEFAULT_PRIORITY_ORDER } from '../../constants/stats';
import { calculateEquippedStats } from '../../engine/scoring';
import { optimizeBuild, optimizeTeamBuild, getSocketCapacities } from '../../engine/optimizer';
import { useBuddyStore } from '../../store/useBuddyStore';
import { CapProgressBar } from '../common/CapProgressBar';
import { PokemonSprite } from '../common/PokemonSprite';
import { ListOrdered, Zap, RotateCcw, CheckCircle, Users, RefreshCw, SlidersHorizontal, AlertTriangle, X, GripVertical, HelpCircle, ChevronUp, ChevronDown } from 'lucide-react';
import { QuestFistIcon, QuestHeartIcon } from '../common/GameIcons';
import { NumericInput } from '../common/NumericInput';
import confetti from 'canvas-confetti';

interface OptimizerPanelProps {
  pokemon: PokemonProfile;
}

export const OptimizerPanel: React.FC<OptimizerPanelProps> = ({ pokemon }) => {
  const stones = useBuddyStore(state => state.stones);
  const pokemonList = useBuddyStore(state => state.pokemon);
  const teamPokemonIds = useBuddyStore(state => state.teamPokemonIds);
  const globalPriorities = useBuddyStore(state => state.globalPriorities || DEFAULT_PRIORITY_ORDER);
  const globalMinRequirements = useBuddyStore(state => state.globalMinRequirements);
  const setActivePokemon = useBuddyStore(state => state.setActivePokemon);
  const updatePriorities = useBuddyStore(state => state.updatePriorities);
  const updatePokemonMinRequirements = useBuddyStore(state => state.updatePokemonMinRequirements);
  const setPokemonUseCustomPriorities = useBuddyStore(state => state.setPokemonUseCustomPriorities);
  const setPokemonUseCustomMinRequirements = useBuddyStore(state => state.setPokemonUseCustomMinRequirements);
  const updateGlobalPriorities = useBuddyStore(state => state.updateGlobalPriorities);
  const resetGlobalPriorities = useBuddyStore(state => state.resetGlobalPriorities);
  const updateGlobalMinRequirements = useBuddyStore(state => state.updateGlobalMinRequirements);
  const resetGlobalMinRequirements = useBuddyStore(state => state.resetGlobalMinRequirements);
  const batchEquip = useBuddyStore(state => state.batchEquip);
  const batchEquipTeam = useBuddyStore(state => state.batchEquipTeam);
  const clearPokemonStones = useBuddyStore(state => state.clearPokemonStones);

  const [activeTab, setActiveTab] = useState<'STATS' | 'REQUIREMENTS' | 'PRIORITIES'>('STATS');
  const [justOptimized, setJustOptimized] = useState(false);
  const [optimizationErrors, setOptimizationErrors] = useState<{ pokemonName: string; unmet: UnmetRequirement[] }[] | null>(null);

  // Drag and drop state for priority reordering
  const [draggedPriorityIdx, setDraggedPriorityIdx] = useState<number | null>(null);
  const [dragOverPriorityIdx, setDragOverPriorityIdx] = useState<number | null>(null);

  // Compute stats for current equipped stones
  const equippedStones = stones.filter(s => s.assignedPokemonId === pokemon.id);
  const statSummary = calculateEquippedStats(equippedStones);

  // Get active team pokemon
  const teamPokemon = teamPokemonIds
    .map(id => pokemonList.find(p => p.id === id))
    .filter((p): p is PokemonProfile => p !== undefined);

  // Clear stale optimization errors when switching active Pokémon
  React.useEffect(() => {
    setOptimizationErrors(null);
  }, [pokemon.id]);

  const isCustomPrioritiesActive = Boolean(pokemon.useCustomPriorities);
  const isCustomRequirementsActive = Boolean(pokemon.useCustomMinRequirements);

  // Determine active priority list based on whether custom priorities are enabled for this pokemon
  const currentPriorities = React.useMemo<SubStatType[]>(() => {
    const sourceList = isCustomPrioritiesActive
      ? (pokemon.priorities || DEFAULT_PRIORITY_ORDER)
      : (globalPriorities || DEFAULT_PRIORITY_ORDER);

    const existing: SubStatType[] = sourceList || [];
    const missing = DEFAULT_PRIORITY_ORDER.filter(s => !existing.includes(s));
    return [...existing, ...missing];
  }, [isCustomPrioritiesActive, pokemon.priorities, globalPriorities]);

  // Determine active minimum requirements based on whether custom requirements are enabled for this pokemon
  const currentRequirements: StatRequirements = React.useMemo(() => {
    if (isCustomRequirementsActive) {
      return pokemon.minRequirements || {};
    }
    return globalMinRequirements || {};
  }, [isCustomRequirementsActive, pokemon.minRequirements, globalMinRequirements]);

  // Count active requirements for tab badge
  const activeRequirementsCount = React.useMemo(() => {
    let count = 0;
    if (currentRequirements.minAtkPower && currentRequirements.minAtkPower > 0) count++;
    if (currentRequirements.minHpPower && currentRequirements.minHpPower > 0) count++;
    if (currentRequirements.minSubStats) {
      for (const val of Object.values(currentRequirements.minSubStats)) {
        if (val !== undefined && val !== null && val > 0) count++;
      }
    }
    return count;
  }, [currentRequirements]);

  const socketCapacities = React.useMemo(() => getSocketCapacities(pokemon.sockets), [pokemon.sockets]);
  const maxPossibleAtk = socketCapacities.maxAtk * 999;
  const maxPossibleHp = socketCapacities.maxHp * 999;

  const handleUpdateReq = (updates: Partial<StatRequirements>) => {
    const next: StatRequirements = {
      minAtkPower: updates.minAtkPower !== undefined ? updates.minAtkPower : currentRequirements.minAtkPower,
      minHpPower: updates.minHpPower !== undefined ? updates.minHpPower : currentRequirements.minHpPower,
      minSubStats: updates.minSubStats !== undefined
        ? (updates.minSubStats ? { ...updates.minSubStats } : undefined)
        : (currentRequirements.minSubStats ? { ...currentRequirements.minSubStats } : undefined),
    };

    // Clean up empty or non-positive fields
    if (next.minAtkPower === undefined || next.minAtkPower <= 0) delete next.minAtkPower;
    if (next.minHpPower === undefined || next.minHpPower <= 0) delete next.minHpPower;
    if (next.minSubStats) {
      Object.keys(next.minSubStats).forEach(k => {
        const key = k as SubStatType;
        if (!next.minSubStats![key] || next.minSubStats![key]! <= 0) {
          delete next.minSubStats![key];
        }
      });
      if (Object.keys(next.minSubStats).length === 0) {
        delete next.minSubStats;
      }
    }

    if (isCustomRequirementsActive) {
      updatePokemonMinRequirements(pokemon.id, next);
    } else {
      updateGlobalMinRequirements(next);
    }
    // Clear stale optimization error message when user modifies requirements
    setOptimizationErrors(null);
  };

  const handleUpdateSubStatReq = (statKey: SubStatType, val: number | undefined) => {
    const nextSubStats: Partial<Record<SubStatType, number>> = { ...(currentRequirements.minSubStats || {}) };
    if (val === undefined || isNaN(val) || val <= 0) {
      delete nextSubStats[statKey];
    } else {
      const cap = SUB_STAT_DEFINITIONS[statKey]?.hardCap ?? 100;
      nextSubStats[statKey] = Math.min(cap, Math.max(0, Number(val.toFixed(1))));
    }
    handleUpdateReq({ minSubStats: nextSubStats });
  };

  const handleUpdatePowerReq = (type: 'ATK' | 'HP', val: number | undefined) => {
    const cleanVal = (val === undefined || isNaN(val) || val <= 0) ? undefined : Math.max(0, Math.min(9999, Math.round(val)));
    if (type === 'ATK') {
      handleUpdateReq({ minAtkPower: cleanVal });
    } else {
      handleUpdateReq({ minHpPower: cleanVal });
    }
  };

  const handleResetAllRequirements = () => {
    if (isCustomRequirementsActive) {
      updatePokemonMinRequirements(pokemon.id, {});
    } else {
      resetGlobalMinRequirements();
    }
    setOptimizationErrors(null);
  };

  const handleReorderPriority = (fromIdx: number, toIdx: number) => {
    if (fromIdx === toIdx || fromIdx < 0 || toIdx < 0 || fromIdx >= currentPriorities.length || toIdx >= currentPriorities.length) return;
    const next = [...currentPriorities];
    const [removed] = next.splice(fromIdx, 1);
    next.splice(toIdx, 0, removed);

    if (isCustomPrioritiesActive) {
      updatePriorities(pokemon.id, next);
    } else {
      updateGlobalPriorities(next);
    }
    setOptimizationErrors(null);
  };

  const handleToggleCustomPriorities = (enabled: boolean) => {
    setPokemonUseCustomPriorities(pokemon.id, enabled);
    setOptimizationErrors(null);
  };

  const handleToggleCustomRequirements = (enabled: boolean) => {
    setPokemonUseCustomMinRequirements(pokemon.id, enabled);
    setOptimizationErrors(null);
  };

  const handleResetPriorities = () => {
    if (isCustomPrioritiesActive) {
      updatePriorities(pokemon.id, DEFAULT_PRIORITY_ORDER);
    } else {
      resetGlobalPriorities();
    }
    setOptimizationErrors(null);
  };

  const handlePrioritizeStatLowerResist = () => {
    if (!isCustomPrioritiesActive) {
      setPokemonUseCustomPriorities(pokemon.id, true);
    }
    const filtered = currentPriorities.filter(s => s !== 'STAT_LOWER_RESIST');
    const next: SubStatType[] = ['STAT_LOWER_RESIST', ...filtered];
    updatePriorities(pokemon.id, next);
    setOptimizationErrors(null);
  };

  const handleRunOptimizerSingle = () => {
    const result = optimizeBuild(pokemon, stones, {
      globalPriorities: currentPriorities,
      globalMinRequirements: currentRequirements,
    });
    batchEquip(pokemon.id, result.assignments, result.updatedSockets);

    if (result.isRequirementSatisfied) {
      setOptimizationErrors(null);
      try {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.7 },
          colors: ['#E63946', '#1D3557', '#E9C46A', '#10B981'],
        });
      } catch {
        // ignore in test environments
      }
      setJustOptimized(true);
      setTimeout(() => setJustOptimized(false), 3000);
    } else {
      setJustOptimized(false);
      setOptimizationErrors([
        {
          pokemonName: pokemon.name,
          unmet: result.unmetRequirements,
        },
      ]);
    }
  };

  const handleRunOptimizerTeam = () => {
    if (teamPokemon.length === 0) return;

    const result = optimizeTeamBuild(teamPokemon, stones, {
      globalPriorities,
      globalMinRequirements,
    });
    batchEquipTeam(result.teamAssignments, result.teamSockets);

    if (result.isAllSatisfied) {
      setOptimizationErrors(null);
      try {
        confetti({
          particleCount: 90,
          spread: 80,
          origin: { y: 0.6 },
          colors: ['#E63946', '#1D3557', '#E9C46A', '#10B981'],
        });
      } catch {
        // ignore in test environments
      }
      setJustOptimized(true);
      setTimeout(() => setJustOptimized(false), 3000);
    } else {
      setJustOptimized(false);
      const errors: { pokemonName: string; unmet: UnmetRequirement[] }[] = [];
      result.unmetRequirementsByPokemon.forEach((unmet, pokeId) => {
        const poke = teamPokemon.find(p => p.id === pokeId);
        errors.push({
          pokemonName: poke ? poke.name : 'Unknown Pokémon',
          unmet,
        });
      });
      setOptimizationErrors(errors);
    }
  };

  return (
    <div className="bg-[#24272C] border-2 border-[#3D434A] rounded-xl p-4 shadow-[0_4px_0_#141618] flex flex-col gap-4">
      {/* Active Team Layer (3 Dedicated Team Member Slots) */}
      <div className="bg-[#181A1D] border border-neutral-800 rounded-lg p-3 flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="text-xs font-mono font-bold text-neutral-200">
              Active Team ({teamPokemon.length}/3)
            </span>
          </div>
          {teamPokemon.length < 3 && (
            <span className="text-[11px] text-neutral-500 font-mono hidden sm:inline">
              Set up to 3 Pokémon as Active
            </span>
          )}
        </div>

        {/* 3 Team Slots Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {[0, 1, 2].map((slotIdx) => {
            const member = teamPokemon[slotIdx];
            if (member) {
              const isViewing = member.id === pokemon.id;
              return (
                <button
                  key={member.id}
                  type="button"
                  onClick={() => setActivePokemon(member.id)}
                  className={`p-2 rounded-lg border text-xs font-mono flex items-center gap-2.5 transition-all text-left ${
                    isViewing
                      ? 'bg-amber-500/15 border-amber-400 text-amber-200 ring-1 ring-amber-400/80 shadow-[0_2px_6px_rgba(245,158,11,0.15)]'
                      : 'bg-neutral-900 border-neutral-700/80 text-neutral-300 hover:border-neutral-500 hover:bg-neutral-850'
                  }`}
                  title={isViewing ? `Currently Viewing ${member.name}` : `Switch view to ${member.name}`}
                >
                  <PokemonSprite pokedexId={member.pokedexId} size="sm" className="w-7 h-7 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-bold truncate text-xs text-neutral-100">{member.name}</span>
                      <span className="text-[10px] text-amber-400 shrink-0 font-mono">Slot {slotIdx + 1}</span>
                    </div>
                    <div className="text-[10px] text-neutral-400 font-mono flex items-center justify-between mt-0.5">
                      <span>Lv. {member.level || 100}</span>
                      {isViewing && (
                        <span className="text-amber-400 font-bold text-[9px] uppercase tracking-wider bg-amber-500/20 px-1 rounded">Viewing</span>
                      )}
                    </div>
                  </div>
                </button>
              );
            }

            return (
              <div
                key={`empty-${slotIdx}`}
                className="p-2 rounded-lg border-2 border-dashed border-neutral-800 bg-neutral-950/40 text-neutral-500 text-xs font-mono flex items-center justify-center gap-2 min-h-[46px]"
              >
                <span className="text-[11px]">+ Empty Slot {slotIdx + 1}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Optimization Error Alert Banner */}
      {optimizationErrors && (
        <div className="bg-red-950/80 border-2 border-red-500/80 rounded-xl p-3 text-red-200 font-mono shadow-[0_4px_12px_rgba(239,68,68,0.25)] flex flex-col gap-2 animate-in fade-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-red-400 font-black text-xs sm:text-sm">
              <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
              <span>Minimum Requirements Not Met</span>
            </div>
            <button
              type="button"
              onClick={() => setOptimizationErrors(null)}
              className="text-neutral-400 hover:text-white p-0.5 rounded hover:bg-red-900/50 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <p className="text-[11px] text-red-300">
            Could not fulfill all required lower bounds with available stones. Stones were assigned to get as close as possible:
          </p>
          <div className="flex flex-col gap-1.5 mt-0.5">
            {optimizationErrors.map((err, idx) => (
              <div key={idx} className="bg-neutral-900/90 rounded p-2 border border-red-900/60 text-xs">
                <span className="font-bold text-amber-300">{err.pokemonName}:</span>
                <ul className="list-disc list-inside mt-1 flex flex-col gap-0.5 text-neutral-300 text-[11px]">
                  {err.unmet.map((u, uIdx) => (
                    <li key={uIdx}>
                      <span className="font-semibold text-neutral-200">{u.statLabel}:</span> Required{' '}
                      <span className="font-bold text-red-400">{u.required}{u.unit}</span>, but only reached{' '}
                      <span className="font-bold text-neutral-100">{u.achieved}{u.unit}</span>.
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Header with Navigation Tabs */}
      <div className="flex flex-wrap items-center justify-between border-b border-neutral-800 pb-3 gap-2">
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          <button
            onClick={() => setActiveTab('STATS')}
            className={`px-3 py-1.5 text-xs font-mono font-bold rounded-lg border transition-all ${
              activeTab === 'STATS'
                ? 'bg-amber-500 text-neutral-950 border-amber-400 shadow-[0_2px_0_#92400e]'
                : 'bg-neutral-800 text-neutral-300 border-neutral-700 hover:bg-neutral-750'
            }`}
          >
            Stat Breakdown
          </button>
          <button
            onClick={() => setActiveTab('REQUIREMENTS')}
            className={`px-3 py-1.5 text-xs font-mono font-bold rounded-lg border flex items-center gap-1.5 transition-all ${
              activeTab === 'REQUIREMENTS'
                ? 'bg-amber-500 text-neutral-950 border-amber-400 shadow-[0_2px_0_#92400e]'
                : 'bg-neutral-800 text-neutral-300 border-neutral-700 hover:bg-neutral-750'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Minimum Requirements</span>
            {activeRequirementsCount > 0 && (
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                activeTab === 'REQUIREMENTS' ? 'bg-neutral-950 text-amber-400' : 'bg-amber-500/20 text-amber-300'
              }`}>
                {activeRequirementsCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('PRIORITIES')}
            className={`px-3 py-1.5 text-xs font-mono font-bold rounded-lg border flex items-center gap-1.5 transition-all ${
              activeTab === 'PRIORITIES'
                ? 'bg-amber-500 text-neutral-950 border-amber-400 shadow-[0_2px_0_#92400e]'
                : 'bg-neutral-800 text-neutral-300 border-neutral-700 hover:bg-neutral-750'
            }`}
          >
            <ListOrdered className="w-3.5 h-3.5" />
            <span>Priority Ordering</span>
          </button>

          {/* Help Tooltip to the right of the tab options (only visible on Priority Ordering tab) */}
          {activeTab === 'PRIORITIES' && (
            <div className="relative group/help flex items-center">
              <button
                type="button"
                className="p-1.5 rounded-lg text-neutral-400 hover:text-amber-300 hover:bg-neutral-800/80 transition-colors focus:outline-none"
                aria-label="Optimizer guidance help"
              >
                <HelpCircle className="w-4 h-4" />
              </button>
              <div className="absolute left-0 sm:left-auto sm:right-0 top-full mt-2 z-50 hidden group-hover/help:flex flex-col w-72 sm:w-80 p-3 bg-[#181A1D] border border-neutral-700 rounded-lg shadow-2xl text-[11px] font-mono text-neutral-300 pointer-events-none">
                <span className="text-amber-400 font-bold mb-1">Tip:</span>
                <span className="leading-relaxed">
                  Drag and drop items to reorder priority rankings (#1 down to #11). After minimum lower bounds are met, stones are chosen to maximize higher priority bonuses first.
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {justOptimized && (
            <span className="inline-flex items-center gap-1 text-xs font-mono text-emerald-400 font-bold animate-in fade-in">
              <CheckCircle className="w-3.5 h-3.5" /> Optimized!
            </span>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      {activeTab === 'STATS' ? (
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {SUB_STAT_KEYS.map((key) => {
              const info = statSummary.subStats[key];
              return (
                <CapProgressBar
                  key={key}
                  statKey={key}
                  raw={info.raw}
                  effective={info.effective}
                  cap={info.cap}
                  percentOfCap={info.percentOfCap}
                  isCapped={info.isCapped}
                />
              );
            })}
          </div>
        </div>
      ) : activeTab === 'REQUIREMENTS' ? (
        /* Minimum Requirements (Lower Bounds) Tab */
        <div className="flex flex-col gap-3">
          {/* Custom vs Global Configuration Toggle */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-neutral-900/90 p-3 rounded-lg border border-neutral-800">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={isCustomRequirementsActive}
                    onChange={(e) => handleToggleCustomRequirements(e.target.checked)}
                    className="w-4 h-4 rounded border-neutral-700 text-amber-500 focus:ring-amber-400 bg-neutral-950 cursor-pointer accent-amber-500"
                  />
                  <span className="text-xs font-mono font-bold text-neutral-100">
                    Custom Requirements for {pokemon.name}
                  </span>
                </label>
                <span
                  className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                    isCustomRequirementsActive
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                      : 'bg-neutral-800 text-neutral-400 border-neutral-700'
                  }`}
                >
                  {isCustomRequirementsActive ? 'Custom Requirements Active' : 'Using Shared Defaults'}
                </span>
              </div>
              <p className="text-[11px] font-mono text-neutral-400">
                {isCustomRequirementsActive
                  ? `Requirements are scoped exclusively to ${pokemon.name}.`
                  : 'Shared requirements applied to all Pokémon by default.'}
              </p>
            </div>

            <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
              <button
                type="button"
                onClick={handleResetAllRequirements}
                className="px-2.5 py-1 text-[11px] font-mono font-bold text-neutral-400 hover:text-amber-300 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 rounded flex items-center gap-1 transition-colors"
                title="Clear all minimum requirements"
              >
                <RotateCcw className="w-3 h-3" />
                <span>{isCustomRequirementsActive ? 'Clear Custom Bounds' : 'Clear Shared Bounds'}</span>
              </button>
            </div>
          </div>

          {/* Primary Power Requirements (ATK & HP) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {/* Min ATK Power */}
            <div className="p-2.5 rounded-lg bg-neutral-900/80 border border-red-500/30 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <div className="w-5 h-5 rounded bg-red-600/30 border border-red-500/50 flex items-center justify-center">
                    <QuestFistIcon size={12} fill="#EF4444" />
                  </div>
                  <span className="text-xs font-mono font-bold text-red-200">Min Attack Power</span>
                </div>
                {currentRequirements.minAtkPower ? (
                  <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border ${
                    statSummary.atkPower >= currentRequirements.minAtkPower
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      : 'bg-red-500/20 text-red-300 border-red-500/40'
                  }`}>
                    {statSummary.atkPower >= currentRequirements.minAtkPower ? 'Met' : 'Short'} ({statSummary.atkPower}/{currentRequirements.minAtkPower})
                  </span>
                ) : (
                  <span className="text-[10px] font-mono text-neutral-500">None</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <NumericInput
                  min={0}
                  max={maxPossibleAtk}
                  step={50}
                  placeholder="e.g. 3000"
                  value={currentRequirements.minAtkPower}
                  allowEmpty={true}
                  onChange={(val) => handleUpdatePowerReq('ATK', val)}
                  className="px-2 py-1 text-xs"
                  containerClassName="flex-1"
                />
                <button
                  type="button"
                  onClick={() => handleUpdatePowerReq('ATK', undefined)}
                  className="px-2 py-1 text-[10px] font-mono bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded border border-neutral-700 h-[26px]"
                >
                  Clear
                </button>
              </div>
              {currentRequirements.minAtkPower && currentRequirements.minAtkPower > maxPossibleAtk ? (
                <span className="text-[10px] font-mono text-amber-400">
                  ⚠️ Exceeds socket maximum ({maxPossibleAtk} across {socketCapacities.maxAtk} ATK slots)
                </span>
              ) : (
                <span className="text-[10px] font-mono text-neutral-500">
                  Max capacity: {maxPossibleAtk} ({socketCapacities.maxAtk} ATK slots)
                </span>
              )}
            </div>

            {/* Min HP Power */}
            <div className="p-2.5 rounded-lg bg-neutral-900/80 border border-blue-500/30 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <div className="w-5 h-5 rounded bg-blue-600/30 border border-blue-500/50 flex items-center justify-center">
                    <QuestHeartIcon size={12} fill="#3B82F6" />
                  </div>
                  <span className="text-xs font-mono font-bold text-blue-200">Min Defense / HP Power</span>
                </div>
                {currentRequirements.minHpPower ? (
                  <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border ${
                    statSummary.hpPower >= currentRequirements.minHpPower
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      : 'bg-red-500/20 text-red-300 border-red-500/40'
                  }`}>
                    {statSummary.hpPower >= currentRequirements.minHpPower ? 'Met' : 'Short'} ({statSummary.hpPower}/{currentRequirements.minHpPower})
                  </span>
                ) : (
                  <span className="text-[10px] font-mono text-neutral-500">None</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <NumericInput
                  min={0}
                  max={maxPossibleHp}
                  step={50}
                  placeholder="e.g. 2500"
                  value={currentRequirements.minHpPower}
                  allowEmpty={true}
                  onChange={(val) => handleUpdatePowerReq('HP', val)}
                  className="px-2 py-1 text-xs"
                  containerClassName="flex-1"
                />
                <button
                  type="button"
                  onClick={() => handleUpdatePowerReq('HP', undefined)}
                  className="px-2 py-1 text-[10px] font-mono bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded border border-neutral-700 h-[26px]"
                >
                  Clear
                </button>
              </div>
              {currentRequirements.minHpPower && currentRequirements.minHpPower > maxPossibleHp ? (
                <span className="text-[10px] font-mono text-amber-400">
                  ⚠️ Exceeds socket maximum ({maxPossibleHp} across {socketCapacities.maxHp} HP slots)
                </span>
              ) : (
                <span className="text-[10px] font-mono text-neutral-500">
                  Max capacity: {maxPossibleHp} ({socketCapacities.maxHp} HP slots)
                </span>
              )}
            </div>
          </div>

          {/* Sub-Stat Minimum Requirements List */}
          <div className="flex flex-col gap-2">
            <span className="text-xs font-mono font-bold text-neutral-300">Sub-Stat Lower Bounds:</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {SUB_STAT_KEYS.filter(k => k !== 'STAT_STRENGTH').map((key) => {
                const meta = SUB_STAT_DEFINITIONS[key];
                const reqValue = currentRequirements.minSubStats?.[key];
                const currentStat = statSummary.subStats[key];
                const isMet = reqValue !== undefined ? currentStat.effective >= reqValue : true;

                return (
                  <div
                    key={key}
                    className="p-2 rounded-lg bg-neutral-900/80 border border-neutral-800 hover:border-neutral-700 flex flex-col gap-1.5 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-xs font-mono font-bold text-neutral-200 truncate">
                          {meta.label}
                        </span>
                        <span className={`text-[9px] font-mono px-1 py-0.2 rounded border ${meta.badgeClass}`}>
                          {key === 'TIME_TO_RECOVER' ? `Cap: -${meta.hardCap}%` : `Cap: ${meta.hardCap}%`}
                        </span>
                      </div>
                      {reqValue !== undefined && (
                        <span className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded border shrink-0 ${
                          isMet
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                            : 'bg-red-500/20 text-red-300 border-red-500/40'
                        }`}>
                          {isMet ? 'Met' : 'Short'} ({key === 'TIME_TO_RECOVER' ? `-${currentStat.effective.toFixed(1)}%` : `${currentStat.effective.toFixed(1)}%`})
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <NumericInput
                        min={0}
                        max={meta.hardCap}
                        step={0.5}
                        formatDecimals={1}
                        unit={meta.unit}
                        placeholder={`0.0 - ${meta.hardCap}`}
                        value={reqValue}
                        allowEmpty={true}
                        onChange={(val) => handleUpdateSubStatReq(key, val)}
                        className="px-2 py-1 text-xs"
                        containerClassName="flex-1"
                      />

                      <button
                        type="button"
                        onClick={() => handleUpdateSubStatReq(key, meta.hardCap)}
                        className="px-2 py-1 text-[10px] font-mono font-bold bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 rounded border border-amber-500/30 transition-colors h-[26px]"
                        title={`Set requirement to hard cap (${meta.hardCap}%)`}
                      >
                        Cap
                      </button>

                      {reqValue !== undefined && (
                        <button
                          type="button"
                          onClick={() => handleUpdateSubStatReq(key, undefined)}
                          className="px-1.5 py-1 text-[10px] font-mono bg-neutral-800 hover:bg-neutral-700 text-neutral-400 rounded border border-neutral-700 h-[26px]"
                          title="Remove requirement"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        /* Priority Ordering Configuration Tab */
        <div className="flex flex-col gap-3">
          {/* Priority Mode Header: Toggle Custom vs Overall */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-neutral-900/90 p-3 rounded-lg border border-neutral-800">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={isCustomPrioritiesActive}
                    onChange={(e) => handleToggleCustomPriorities(e.target.checked)}
                    className="w-4 h-4 rounded border-neutral-700 text-amber-500 focus:ring-amber-400 bg-neutral-950 cursor-pointer accent-amber-500"
                  />
                  <span className="text-xs font-mono font-bold text-neutral-100">
                    Custom Priority for {pokemon.name}
                  </span>
                </label>
                <span
                  className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                    isCustomPrioritiesActive
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                      : 'bg-neutral-800 text-neutral-400 border-neutral-700'
                  }`}
                >
                  {isCustomPrioritiesActive ? 'Custom Override Active' : 'Using Overall Ranking'}
                </span>
              </div>
              <p className="text-[11px] font-mono text-neutral-400">
                {isCustomPrioritiesActive
                  ? `Custom ordering applies specifically to ${pokemon.name}.`
                  : 'Shared overall ranking used by default for all Pokémon.'}
              </p>
            </div>

            <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
              <button
                type="button"
                onClick={handlePrioritizeStatLowerResist}
                className="px-2.5 py-1 text-[11px] font-mono font-bold text-amber-300 hover:text-amber-200 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 rounded flex items-center gap-1.5 transition-colors"
                title="Move Stat Lowering Resist to #1 priority"
              >
                <img src="/assets/close_combat.png" alt="Close Combat" className="w-3.5 h-3.5 rounded object-contain shrink-0" />
                <span>Prioritize Close Combat</span>
              </button>
              {isCustomPrioritiesActive ? (
                <button
                  type="button"
                  onClick={() => handleToggleCustomPriorities(false)}
                  className="px-2.5 py-1 text-[11px] font-mono font-bold text-neutral-400 hover:text-neutral-200 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 rounded flex items-center gap-1 transition-colors"
                  title="Revert back to using the shared Overall Priority Ranking"
                >
                  <span>Revert to Overall</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleResetPriorities}
                  className="px-2.5 py-1 text-[11px] font-mono font-bold text-neutral-400 hover:text-amber-300 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 rounded flex items-center gap-1 transition-colors"
                  title="Reset overall priority ranking to default order"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Reset Overall Order</span>
                </button>
              )}
            </div>
          </div>

          {/* 11 Prioritized Stats Draggable List */}
          <div className="flex flex-col gap-1.5">
            {currentPriorities.map((key, idx) => {
              const meta = SUB_STAT_DEFINITIONS[key];
              const currentStat = statSummary.subStats[key];
              const isDragging = draggedPriorityIdx === idx;
              const isOver = dragOverPriorityIdx === idx;

              return (
                <div
                  key={key}
                  draggable
                  onDragStart={(e) => {
                    setDraggedPriorityIdx(idx);
                    e.dataTransfer.effectAllowed = 'move';
                    e.dataTransfer.setData('text/plain', idx.toString());
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'move';
                    if (dragOverPriorityIdx !== idx) {
                      setDragOverPriorityIdx(idx);
                    }
                  }}
                  onDragLeave={() => {
                    if (dragOverPriorityIdx === idx) {
                      setDragOverPriorityIdx(null);
                    }
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (draggedPriorityIdx !== null && draggedPriorityIdx !== idx) {
                      handleReorderPriority(draggedPriorityIdx, idx);
                    }
                    setDraggedPriorityIdx(null);
                    setDragOverPriorityIdx(null);
                  }}
                  onDragEnd={() => {
                    setDraggedPriorityIdx(null);
                    setDragOverPriorityIdx(null);
                  }}
                  className={`flex items-center justify-between gap-2 p-2 rounded-lg transition-all select-none cursor-grab active:cursor-grabbing ${
                    isDragging
                      ? 'opacity-40 border-2 border-dashed border-amber-500 bg-neutral-950/60'
                      : isOver
                      ? 'border-2 border-amber-400 bg-amber-950/40 ring-2 ring-amber-400/80 scale-[1.01]'
                      : 'bg-neutral-900/80 border border-neutral-800 hover:border-neutral-700 hover:bg-neutral-850'
                  }`}
                  title="Drag and drop to reorder priority"
                >
                  <div className="flex items-center gap-2.5 min-w-0 pointer-events-none">
                    {/* Rank Badge */}
                    <div className="w-7 h-7 rounded flex items-center justify-center font-mono text-xs font-black shrink-0 bg-neutral-800 text-neutral-400 border border-neutral-700">
                      #{idx + 1}
                    </div>

                    {/* Stat Meta & Cap Info */}
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-neutral-100 truncate">
                          {meta.label}
                        </span>
                        <span
                          className={`text-[10px] font-mono px-1.5 py-0.2 rounded border ${meta.badgeClass}`}
                        >
                          {key === 'STAT_STRENGTH' ? '1 – 999 Power' : key === 'TIME_TO_RECOVER' ? `Cap: -${meta.hardCap}%` : `Cap: ${meta.hardCap}%`}
                        </span>
                      </div>
                      <span className="text-[11px] font-mono text-neutral-400">
                        {key === 'STAT_STRENGTH' ? (
                          `Equipped Stones Total: ${statSummary.totalPower} Power`
                        ) : (
                          <>
                            Current: {key === 'TIME_TO_RECOVER' ? `-${currentStat.effective.toFixed(1)}%` : `${currentStat.effective.toFixed(1)}%`} / {key === 'TIME_TO_RECOVER' ? `-${meta.hardCap}%` : `${meta.hardCap}%`}
                            {currentStat.isCapped && (
                              <span className="text-emerald-400 font-bold ml-1.5">★ CAPPED</span>
                            )}
                          </>
                        )}
                      </span>
                    </div>
                  </div>

                  {/* Action Controls: Keyboard Move Up/Down + Drag Handle */}
                  <div className="flex items-center gap-1 shrink-0">
                    <div className="flex flex-row items-center gap-0.5">
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleReorderPriority(idx, idx - 1);
                        }}
                        className="p-1 text-neutral-400 hover:text-amber-300 disabled:opacity-20 disabled:hover:text-neutral-400 transition-colors rounded hover:bg-neutral-800"
                        aria-label={`Move ${meta.label} up in priority`}
                        title={`Move ${meta.label} up (#${idx})`}
                      >
                        <ChevronUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={idx === currentPriorities.length - 1}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleReorderPriority(idx, idx + 1);
                        }}
                        className="p-1 text-neutral-400 hover:text-amber-300 disabled:opacity-20 disabled:hover:text-neutral-400 transition-colors rounded hover:bg-neutral-800"
                        aria-label={`Move ${meta.label} down in priority`}
                        title={`Move ${meta.label} down (#${idx + 2})`}
                      >
                        <ChevronDown className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Drag Handle Icon */}
                    <div className="flex items-center text-neutral-500 group-hover:text-amber-300 p-1 rounded transition-colors shrink-0">
                      <GripVertical className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Solver Trigger Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-neutral-800">
        <div className="flex flex-wrap items-center gap-2">
          {/* Optimize Active Pokemon */}
          <button
            onClick={handleRunOptimizerSingle}
            className="quest-btn px-3.5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-neutral-950 font-mono font-black text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-[0_4px_0_#92400e] active:translate-y-1 active:shadow-none"
          >
            <Zap className="w-4 h-4 fill-neutral-950" />
            <span>Optimize Active</span>
          </button>

          {/* Optimize Entire Team (1-3 members) */}
          <button
            onClick={handleRunOptimizerTeam}
            className="quest-btn px-3.5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-neutral-950 font-mono font-black text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-[0_4px_0_#065f46] active:translate-y-1 active:shadow-none"
          >
            <Users className="w-4 h-4" />
            <span>Optimize Team ({teamPokemon.length})</span>
          </button>
        </div>

        <button
          onClick={() => clearPokemonStones(pokemon.id)}
          className="px-3 py-2 text-xs font-mono font-bold text-neutral-400 hover:text-neutral-200 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 rounded-lg flex items-center justify-center gap-1.5 transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Clear Equipped</span>
        </button>
      </div>
    </div>
  );
};


