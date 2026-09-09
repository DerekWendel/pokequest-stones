import React, { useState } from 'react';
import type { PokemonProfile } from '../../types';
import { PokemonSprite } from '../common/PokemonSprite';
import { TypeBadge } from '../common/TypeBadge';
import { getPokemonById } from '../../constants/pokedex';
import { useBuddyStore } from '../../store/useBuddyStore';
import { MAX_POKEMON_LIMIT } from '../../constants/stats';
import { NumericInput } from '../common/NumericInput';
import { Settings, Edit2, Check, Trash2, Copy, RotateCcw, ChevronUp, ChevronDown, Star } from 'lucide-react';
import { calculateEquippedStats } from '../../engine/scoring';

interface PokemonHeroProps {
  pokemon: PokemonProfile;
  isEditSocketsMode: boolean;
  setIsEditSocketsMode: (val: boolean | ((prev: boolean) => boolean)) => void;
  onOpenAddModal?: () => void;
}

export const PokemonHero: React.FC<PokemonHeroProps> = ({
  pokemon,
  isEditSocketsMode,
  setIsEditSocketsMode,
}) => {
  const species = getPokemonById(pokemon.pokedexId);
  const stones = useBuddyStore(state => state.stones);
  const pokemonList = useBuddyStore(state => state.pokemon);
  const teamPokemonIds = useBuddyStore(state => state.teamPokemonIds);
  const toggleTeamMember = useBuddyStore(state => state.toggleTeamMember);
  const updatePokemon = useBuddyStore(state => state.updatePokemon);
  const setPokemonLevel = useBuddyStore(state => state.setPokemonLevel);
  const duplicatePokemon = useBuddyStore(state => state.duplicatePokemon);
  const deletePokemon = useBuddyStore(state => state.deletePokemon);
  const clearPokemonStones = useBuddyStore(state => state.clearPokemonStones);

  const [isEditingName, setIsEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(pokemon.name);

  // Equipped stones count
  const equippedStones = stones.filter(s => s.assignedPokemonId === pokemon.id);
  const stats = calculateEquippedStats(equippedStones);

  const handleSaveName = () => {
    if (nameInput.trim()) {
      updatePokemon(pokemon.id, { name: nameInput.trim() });
    }
    setIsEditingName(false);
  };

  const handleLevelChange = (lvl: number) => {
    setPokemonLevel(pokemon.id, lvl);
  };

  const currentLevel = pokemon.level ?? 100;
  const isRosterFull = pokemonList.length >= MAX_POKEMON_LIMIT;
  const isActiveMember = teamPokemonIds.includes(pokemon.id);
  const isTeamFull = teamPokemonIds.length >= 3;

  return (
    <div className="bg-[#24272C] border-2 border-[#3D434A] rounded-xl p-4 shadow-[0_4px_0_#141618] flex flex-col gap-3.5">
      {/* Top Banner Row */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-neutral-800">
        <div className="flex items-center gap-3.5">
          <PokemonSprite pokedexId={pokemon.pokedexId} size="lg" className="shrink-0" />
          <div>
            <div className="flex items-center gap-2">
              {isEditingName ? (
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
                    autoFocus
                    className="bg-neutral-900 border border-amber-500 rounded px-2 py-0.5 text-base font-bold text-amber-300 font-mono focus:outline-none"
                  />
                  <button
                    onClick={handleSaveName}
                    className="p-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 group">
                  <h2 className="text-xl font-black text-amber-200 tracking-tight font-mono flex items-center gap-2">
                    {pokemon.name}
                  </h2>
                  <button
                    onClick={() => {
                      setNameInput(pokemon.name);
                      setIsEditingName(true);
                    }}
                    className="text-neutral-500 hover:text-amber-300 transition-colors p-1"
                    title="Rename Pokémon"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-400 font-mono mt-1">
              <span>{species.name}</span>
              <span>•</span>
              <span className="text-amber-400">#{species.id.toString().padStart(3, '0')}</span>
              <span>•</span>
              <TypeBadge type={species.type} size="xs" />
              <span>•</span>
              {/* Level Input Control */}
              <div className="flex items-center bg-neutral-900 border border-neutral-700 rounded-lg pl-2 pr-1 py-0.5 text-amber-300 font-bold gap-1 shadow-[0_2px_0_#181a1e]">
                <span className="text-xs text-neutral-400 select-none">Lv.</span>
                <NumericInput
                  min={1}
                  max={100}
                  value={currentLevel}
                  onChange={(val) => handleLevelChange(val ?? 1)}
                  className="w-9 bg-transparent text-center font-bold text-amber-200 focus:outline-none text-xs border-0 py-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  containerClassName="w-9"
                  showRangeBadge={false}
                />
                <div className="flex flex-col -my-0.5 ml-0.5">
                  <button
                    type="button"
                    onClick={() => handleLevelChange(currentLevel + 1)}
                    disabled={currentLevel >= 100}
                    className="p-0.5 text-neutral-400 hover:text-amber-300 disabled:opacity-20 hover:bg-neutral-800 rounded transition-colors !shadow-none"
                    title="Increase Level"
                  >
                    <ChevronUp className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleLevelChange(currentLevel - 1)}
                    disabled={currentLevel <= 1}
                    className="p-0.5 text-neutral-400 hover:text-amber-300 disabled:opacity-20 hover:bg-neutral-800 rounded transition-colors !shadow-none"
                    title="Decrease Level"
                  >
                    <ChevronDown className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2 self-end sm:self-center">
          {/* Active Team Toggle Button */}
          <button
            type="button"
            onClick={() => toggleTeamMember(pokemon.id)}
            disabled={!isActiveMember && isTeamFull}
            className={`px-2.5 py-1.5 rounded-lg border text-xs font-mono font-bold flex items-center gap-1.5 transition-all ${
              isActiveMember
                ? 'bg-amber-500/20 text-amber-300 border-amber-400/80 hover:bg-amber-500/30 shadow-[0_2px_0_#92400e]'
                : isTeamFull
                ? 'bg-neutral-900/50 text-neutral-600 border-neutral-800 opacity-40 cursor-not-allowed'
                : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-amber-300 border-neutral-700'
            }`}
            title={
              isActiveMember
                ? 'Active Team Member (Click to remove from active team)'
                : isTeamFull
                ? 'Active team is full'
                : 'Set as Active Pokémon (Add to team)'
            }
          >
            <Star className={`w-3.5 h-3.5 ${isActiveMember ? 'fill-amber-400 text-amber-400' : ''}`} />
            <span>{isActiveMember ? 'Active ★' : 'Active'}</span>
          </button>

          <button
            onClick={() => setIsEditSocketsMode(prev => !prev)}
            className={`px-3 py-1.5 text-xs font-mono font-bold rounded-lg border flex items-center gap-1.5 transition-all ${
              isEditSocketsMode
                ? 'bg-amber-500 text-neutral-950 border-amber-400 shadow-[0_2px_0_#92400e]'
                : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border-neutral-700'
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            <span>{isEditSocketsMode ? 'Done Configuring' : 'Config Sockets'}</span>
          </button>

          <button
            onClick={() => duplicatePokemon(pokemon.id)}
            disabled={isRosterFull}
            className={`p-1.5 border rounded-lg transition-colors ${
              isRosterFull
                ? 'text-neutral-600 bg-neutral-900 border-neutral-800 opacity-40 cursor-not-allowed'
                : 'text-neutral-400 hover:text-neutral-200 bg-neutral-800 hover:bg-neutral-700 border-neutral-700'
            }`}
            title={isRosterFull ? `Roster limit reached (${MAX_POKEMON_LIMIT}/${MAX_POKEMON_LIMIT})` : 'Duplicate Pokémon Profile'}
          >
            <Copy className="w-4 h-4" />
          </button>

          <button
            onClick={() => {
              if (confirm(`Are you sure you want to remove ${pokemon.name}? Assigned stones will return to your inventory.`)) {
                deletePokemon(pokemon.id);
              }
            }}
            className="p-1.5 text-neutral-400 hover:text-red-400 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 rounded-lg transition-colors"
            title="Delete Pokémon Profile"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Total Stat Power Output Banner */}
      <div className="bg-[#181A1D] border-2 border-neutral-800 rounded-lg p-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-4">
          <div>
            <div className="text-[10px] text-neutral-400 font-mono uppercase tracking-wider font-bold">
              Total Stone Power
            </div>
            <div className="text-lg font-black text-amber-300 font-mono leading-none">
              {stats.totalPower.toLocaleString()}
            </div>
          </div>

          <div className="h-7 w-px bg-neutral-800" />

          <div>
            <div className="text-[10px] text-red-400 font-mono uppercase tracking-wider font-bold">
              ATK Stone Power
            </div>
            <div className="text-sm font-bold text-red-300 font-mono leading-none">
              +{stats.atkPower.toLocaleString()}
            </div>
          </div>

          <div>
            <div className="text-[10px] text-blue-400 font-mono uppercase tracking-wider font-bold">
              HP Stone Power
            </div>
            <div className="text-sm font-bold text-blue-300 font-mono leading-none">
              +{stats.hpPower.toLocaleString()}
            </div>
          </div>
        </div>

        {equippedStones.length > 0 && (
          <button
            onClick={() => clearPokemonStones(pokemon.id)}
            className="px-2.5 py-1 text-xs font-mono font-bold text-neutral-400 hover:text-red-300 bg-neutral-900 hover:bg-red-950/40 border border-neutral-700 hover:border-red-500/50 rounded flex items-center gap-1 transition-all"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Clear Stones</span>
          </button>
        )}
      </div>
    </div>
  );
};
