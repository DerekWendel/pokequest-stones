import React, { useState, useEffect, useRef } from 'react';
import { GEN1_POKEDEX, getPokemonById } from '../../constants/pokedex';
import type { PokemonSocket } from '../../types';
import { useBuddyStore } from '../../store/useBuddyStore';
import { PokemonSprite } from '../common/PokemonSprite';
import { TypeBadge } from '../common/TypeBadge';
import { DEFAULT_STAT_WEIGHTS, DEFAULT_PRIORITY_ORDER, getUnlockedSlotsForLevel, MAX_POKEMON_LIMIT } from '../../constants/stats';
import { NumericInput } from '../common/NumericInput';
import { X, Search, Check, Plus, Swords, Heart, CircleDot, AlertTriangle, ArrowRight, ArrowLeft } from 'lucide-react';

interface AddPokemonModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AddPokemonModal: React.FC<AddPokemonModalProps> = ({ isOpen, onClose }) => {
  const addPokemon = useBuddyStore(state => state.addPokemon);
  const pokemonList = useBuddyStore(state => state.pokemon);

  const isRosterFull = pokemonList.length >= MAX_POKEMON_LIMIT;

  // Stages: 1 = Select Species, 2 = Configure Details
  const [stage, setStage] = useState<1 | 2>(1);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPokedexId, setSelectedPokedexId] = useState<number>(1); // default Bulbasaur
  const [nickname, setNickname] = useState('Bulbasaur');
  const [level, setLevel] = useState<number>(100);

  // Exact socket configuration counts (default 9 ATK, 0 HP, 0 Mixed)
  const [atkCount, setAtkCount] = useState<number>(9);
  const [hpCount, setHpCount] = useState<number>(0);
  const [mixedCount, setMixedCount] = useState<number>(0);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const nicknameInputRef = useRef<HTMLInputElement>(null);

  // Reset state when opening modal
  useEffect(() => {
    if (isOpen) {
      setStage(1);
      setSearchQuery('');
      setSelectedPokedexId(1);
      setNickname('Bulbasaur');
      setLevel(100);
      setAtkCount(9);
      setHpCount(0);
      setMixedCount(0);
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  // Focus nickname input when advancing to stage 2
  useEffect(() => {
    if (stage === 2) {
      setTimeout(() => {
        nicknameInputRef.current?.focus();
        nicknameInputRef.current?.select();
      }, 50);
    }
  }, [stage]);

  // Handle Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const totalSockets = atkCount + hpCount + mixedCount;
  const isSumValid = totalSockets === 9;

  const filteredPokedex = GEN1_POKEDEX.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.id.toString().includes(searchQuery) ||
    p.type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelectSpecies = (id: number) => {
    setSelectedPokedexId(id);
    const spec = getPokemonById(id);
    setNickname(`${spec.name}`);
  };

  const handleSpeciesCardDoubleClick = (id: number) => {
    handleSelectSpecies(id);
    setStage(2);
  };

  const handleAtkChange = (val: number) => {
    setAtkCount(Math.max(0, Math.min(9, val || 0)));
  };

  const handleHpChange = (val: number) => {
    setHpCount(Math.max(0, Math.min(9, val || 0)));
  };

  const handleMixedChange = (val: number) => {
    setMixedCount(Math.max(0, Math.min(9, val || 0)));
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (stage === 1) {
      setStage(2);
      return;
    }

    if (!isSumValid || isRosterFull) return;

    const sockets: PokemonSocket[] = [];
    const cleanLevel = Math.max(1, Math.min(100, Math.round(level) || 1));
    const unlockedCount = getUnlockedSlotsForLevel(cleanLevel, selectedPokedexId);

    const types: ('ATK' | 'HP' | 'MULTI')[] = [
      ...Array(atkCount).fill('ATK'),
      ...Array(hpCount).fill('HP'),
      ...Array(mixedCount).fill('MULTI'),
    ];

    for (let i = 0; i < 9; i++) {
      sockets.push({
        slotIndex: i,
        type: types[i] || 'ATK',
        isUnlocked: i < unlockedCount,
      });
    }

    addPokemon({
      pokedexId: selectedPokedexId,
      name: nickname.trim() || getPokemonById(selectedPokedexId).name,
      level: cleanLevel,
      sockets,
      priorities: DEFAULT_PRIORITY_ORDER,
      weights: {
        powerWeight: DEFAULT_STAT_WEIGHTS.powerWeight,
        weights: { ...DEFAULT_STAT_WEIGHTS.weights },
      },
    });

    onClose();
  };

  const selectedSpecies = getPokemonById(selectedPokedexId);
  const unlockedSlotsPreview = getUnlockedSlotsForLevel(level, selectedPokedexId);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-pokemon-modal-title"
        className="bg-[#24272C] border-2 border-[#3D434A] rounded-xl w-full max-w-2xl overflow-hidden shadow-[0_8px_0_#141618,0_16px_32px_rgba(0,0,0,0.8)] animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Modal Header & Stepper */}
        <div className="px-5 py-3.5 border-b border-neutral-800 bg-[#1E2124]">
          <div className="flex items-center justify-between mb-2">
            <h3 id="add-pokemon-modal-title" className="text-base font-black text-amber-200 font-mono tracking-tight flex items-center gap-2">
              <Plus className="w-5 h-5 text-amber-400" />
              <span>Add Pokémon to Roster</span>
              <span className="text-xs text-neutral-400 font-normal">({pokemonList.length}/{MAX_POKEMON_LIMIT})</span>
            </h3>
            <button
              onClick={onClose}
              aria-label="Close dialog"
              className="text-neutral-400 hover:text-neutral-200 p-1 rounded transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Step Indicator */}
          <div className="flex items-center gap-2 text-xs font-mono">
            <button
              type="button"
              onClick={() => setStage(1)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-colors ${
                stage === 1
                  ? 'bg-amber-500 text-neutral-950 font-bold shadow-sm'
                  : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
              }`}
            >
              <span className="w-4 h-4 rounded-full bg-black/20 flex items-center justify-center text-[10px]">1</span>
              <span>Select Species</span>
              {stage === 2 && <Check className="w-3.5 h-3.5 text-emerald-400 ml-0.5" />}
            </button>

            <span className="text-neutral-600">→</span>

            <button
              type="button"
              onClick={() => setStage(2)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-colors ${
                stage === 2
                  ? 'bg-amber-500 text-neutral-950 font-bold shadow-sm'
                  : 'bg-neutral-800/60 text-neutral-400 hover:bg-neutral-800'
              }`}
            >
              <span className="w-4 h-4 rounded-full bg-black/20 flex items-center justify-center text-[10px]">2</span>
              <span>Configure Details</span>
            </button>
          </div>
        </div>

        <form onSubmit={handleCreate} className="p-5 flex flex-col gap-4 font-mono">
          {/* Roster Full Alert if at capacity */}
          {isRosterFull && (
            <div className="bg-red-950/40 border border-red-500/50 rounded-lg p-3 flex items-center gap-2.5 text-xs text-red-300">
              <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
              <span>Roster limit reached ({MAX_POKEMON_LIMIT} Pokémon maximum). Please remove a Pokémon to add a new one.</span>
            </div>
          )}

          {/* ============================================================ */}
          {/* STAGE 1: SELECT SPECIES                                      */}
          {/* ============================================================ */}
          {stage === 1 && (
            <div className="flex flex-col gap-3 animate-in fade-in duration-100">
              <div className="flex justify-between items-center">
                <label htmlFor="species-search-input" className="text-xs text-neutral-300 font-bold">
                  Search & Choose Pokémon Species
                </label>
                <span className="text-[11px] text-neutral-500">{filteredPokedex.length} species found</span>
              </div>

              {/* Primary Search Input */}
              <div className="relative">
                <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  id="species-search-input"
                  ref={searchInputRef}
                  type="text"
                  placeholder="Type a Pokémon name, #ID, or type (e.g. Machop, Fire, 25)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-neutral-900 border-2 border-neutral-700 rounded-lg pl-9 pr-9 py-2 text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition-colors"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      searchInputRef.current?.focus();
                    }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-200 p-1 rounded"
                    title="Clear search"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Species Grid */}
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 max-h-72 overflow-y-auto pr-1 bg-neutral-900/60 p-2.5 rounded-lg border border-neutral-800">
                {filteredPokedex.map((pokemon) => {
                  const isSelected = pokemon.id === selectedPokedexId;
                  return (
                    <button
                      key={pokemon.id}
                      type="button"
                      onClick={() => handleSelectSpecies(pokemon.id)}
                      onDoubleClick={() => handleSpeciesCardDoubleClick(pokemon.id)}
                      className={`p-2 rounded-lg border flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-amber-950/70 border-amber-400 ring-2 ring-amber-400 text-amber-200 scale-[1.02]'
                          : 'bg-neutral-800/90 border-neutral-700 hover:border-neutral-500 text-neutral-300 hover:bg-neutral-750'
                      }`}
                      title={`${pokemon.name} (#${pokemon.id}) - Double-click to select and proceed`}
                    >
                      <PokemonSprite pokedexId={pokemon.id} size="md" />
                      <span className="text-[11px] font-bold truncate max-w-full">{pokemon.name}</span>
                      <div className="flex items-center gap-1">
                        <span className="text-[9px] text-neutral-400 font-mono">#{pokemon.id}</span>
                        <TypeBadge type={pokemon.type} size="xs" />
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Selected Species Preview Pill */}
              <div className="flex items-center justify-between bg-neutral-900/90 border border-neutral-700 p-2.5 rounded-lg text-xs">
                <div className="flex items-center gap-2.5">
                  <PokemonSprite pokedexId={selectedPokedexId} size="sm" />
                  <div>
                    <span className="text-neutral-400 text-[10px] block">Selected Species:</span>
                    <span className="text-amber-300 font-bold">{selectedSpecies.name}</span>
                    <span className="text-neutral-400 ml-1.5 font-mono">(#{selectedSpecies.id.toString().padStart(3, '0')})</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setStage(2)}
                  className="quest-btn px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-bold flex items-center gap-1.5 rounded shadow-[0_2px_0_#92400e]"
                >
                  <span>Next: Details</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* STAGE 2: CONFIGURE DETAILS                                   */}
          {/* ============================================================ */}
          {stage === 2 && (
            <div className="flex flex-col gap-4 animate-in fade-in duration-100">
              {/* Selected Species Summary Banner */}
              <div className="flex items-center justify-between bg-neutral-900/90 border border-neutral-700 p-3 rounded-lg">
                <div className="flex items-center gap-3">
                  <PokemonSprite pokedexId={selectedPokedexId} size="md" className="shrink-0" />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-black text-amber-200">{selectedSpecies.name}</span>
                      <span className="text-xs text-neutral-400 font-mono">#{selectedSpecies.id.toString().padStart(3, '0')}</span>
                      <TypeBadge type={selectedSpecies.type} size="xs" />
                    </div>
                    <span className="text-[11px] text-amber-300/80 font-bold block mt-0.5">
                      {unlockedSlotsPreview} of 9 Power Stone Slots Unlocked
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setStage(1)}
                  className="text-xs text-amber-400 hover:text-amber-300 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 px-2.5 py-1.5 rounded flex items-center gap-1 transition-colors"
                  title="Change species selection"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Change</span>
                </button>
              </div>

              {/* Nickname & Level Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label htmlFor="pokemon-nickname-input" className="text-xs text-neutral-300 font-bold block mb-1">
                    Custom Nickname
                  </label>
                  <input
                    id="pokemon-nickname-input"
                    ref={nicknameInputRef}
                    type="text"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    placeholder="e.g. Expedition Leader"
                    className="w-full bg-neutral-900 border border-neutral-700 rounded-md px-3 py-2 text-sm font-bold text-amber-200 focus:outline-none focus:border-amber-400"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="pokemon-level-input" className="text-xs text-neutral-300 font-bold block mb-1">
                    Level (1-100)
                  </label>
                  <NumericInput
                    id="pokemon-level-input"
                    min={1}
                    max={100}
                    value={level}
                    onChange={(val) => setLevel(val ?? 1)}
                    className="px-3 py-2 text-sm font-bold text-amber-200"
                    placeholder="1-100"
                  />
                </div>
              </div>

              {/* Exact Socket Allocation: ATK, HP, Mixed */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs text-neutral-300 font-bold">
                    Socket Configuration (Must sum to 9)
                  </label>
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-mono font-bold border transition-colors ${
                      isSumValid
                        ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500/50'
                        : 'bg-red-950/60 text-red-300 border-red-500/50'
                    }`}
                  >
                    Total: {totalSockets} / 9 {isSumValid ? '✓' : `(${9 - totalSockets > 0 ? `+${9 - totalSockets} needed` : `${totalSockets - 9} over`})`}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2.5">
                  {/* ATK Sockets */}
                  <div className="bg-neutral-900/90 border-2 border-red-500/40 rounded-lg p-3 flex flex-col items-center gap-2">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-red-400">
                      <Swords className="w-4 h-4" />
                      <span>ATK Slots</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleAtkChange(atkCount - 1)}
                        disabled={atkCount <= 0}
                        className="w-7 h-7 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-bold disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center border border-neutral-700 transition-colors"
                      >
                        -
                      </button>
                      <NumericInput
                        min={0}
                        max={9}
                        value={atkCount}
                        onChange={(val) => handleAtkChange(val ?? 0)}
                        className="w-12 text-center font-black text-base py-0.5 text-red-300"
                        containerClassName="w-12"
                      />
                      <button
                        type="button"
                        onClick={() => handleAtkChange(atkCount + 1)}
                        disabled={atkCount >= 9}
                        className="w-7 h-7 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-bold disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center border border-neutral-700 transition-colors"
                      >
                        +
                      </button>
                    </div>
                    <span className="text-[10px] text-neutral-500 font-sans">Mighty (Attack)</span>
                  </div>

                  {/* HP Sockets */}
                  <div className="bg-neutral-900/90 border-2 border-blue-500/40 rounded-lg p-3 flex flex-col items-center gap-2">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-blue-400">
                      <Heart className="w-4 h-4" />
                      <span>HP Slots</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleHpChange(hpCount - 1)}
                        disabled={hpCount <= 0}
                        className="w-7 h-7 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-bold disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center border border-neutral-700 transition-colors"
                      >
                        -
                      </button>
                      <NumericInput
                        min={0}
                        max={9}
                        value={hpCount}
                        onChange={(val) => handleHpChange(val ?? 0)}
                        className="w-12 text-center font-black text-base py-0.5 text-blue-300"
                        containerClassName="w-12"
                      />
                      <button
                        type="button"
                        onClick={() => handleHpChange(hpCount + 1)}
                        disabled={hpCount >= 9}
                        className="w-7 h-7 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-bold disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center border border-neutral-700 transition-colors"
                      >
                        +
                      </button>
                    </div>
                    <span className="text-[10px] text-neutral-500 font-sans">Sturdy (Health)</span>
                  </div>

                  {/* Mixed Sockets */}
                  <div className="bg-neutral-900/90 border-2 border-amber-500/40 rounded-lg p-3 flex flex-col items-center gap-2">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-amber-300">
                      <CircleDot className="w-4 h-4" />
                      <span>Mixed Slots</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleMixedChange(mixedCount - 1)}
                        disabled={mixedCount <= 0}
                        className="w-7 h-7 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-bold disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center border border-neutral-700 transition-colors"
                      >
                        -
                      </button>
                      <NumericInput
                        min={0}
                        max={9}
                        value={mixedCount}
                        onChange={(val) => handleMixedChange(val ?? 0)}
                        className="w-12 text-center font-black text-base py-0.5 text-amber-200"
                        containerClassName="w-12"
                      />
                      <button
                        type="button"
                        onClick={() => handleMixedChange(mixedCount + 1)}
                        disabled={mixedCount >= 9}
                        className="w-7 h-7 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-bold disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center border border-neutral-700 transition-colors"
                      >
                        +
                      </button>
                    </div>
                    <span className="text-[10px] text-neutral-500 font-sans">Multi (Wildcard)</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Footer Buttons (Stage 2) */}
          {stage === 2 && (
            <div className="flex items-center justify-between pt-3 border-t border-neutral-800">
              <button
                type="button"
                onClick={() => setStage(1)}
                className="px-3 py-2 text-xs text-neutral-300 hover:text-neutral-100 font-bold flex items-center gap-1 transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Species</span>
              </button>

              <button
                type="submit"
                disabled={isRosterFull || !isSumValid}
                className="quest-btn px-5 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed text-neutral-950 text-xs font-bold flex items-center gap-1.5 shadow-[0_3px_0_#92400e]"
                title={
                  isRosterFull
                    ? `Roster limit reached (${MAX_POKEMON_LIMIT}/${MAX_POKEMON_LIMIT})`
                    : !isSumValid
                    ? `Total sockets must sum to 9 (currently ${totalSockets})`
                    : 'Add Pokémon'
                }
              >
                <Check className="w-4 h-4" />
                <span>Add Pokémon</span>
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};
