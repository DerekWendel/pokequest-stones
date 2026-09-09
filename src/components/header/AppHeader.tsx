import React from 'react';
import { useBuddyStore } from '../../store/useBuddyStore';
import { PokemonSprite } from '../common/PokemonSprite';
import { MAX_POKEMON_LIMIT } from '../../constants/stats';
import { Plus, FileSpreadsheet, Trash2, ChevronDown } from 'lucide-react';

interface AppHeaderProps {
  onOpenAddPokemonModal: () => void;
  onOpenCsvModal: () => void;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  onOpenAddPokemonModal,
  onOpenCsvModal,
}) => {
  const pokemonList = useBuddyStore(state => state.pokemon);
  const activePokemonId = useBuddyStore(state => state.activePokemonId);
  const teamPokemonIds = useBuddyStore(state => state.teamPokemonIds);
  const setActivePokemon = useBuddyStore(state => state.setActivePokemon);
  const clearAllData = useBuddyStore(state => state.clearAllData);

  const activePokemon = pokemonList.find(p => p.id === activePokemonId) || pokemonList[0];
  const isRosterFull = pokemonList.length >= MAX_POKEMON_LIMIT;

  const handleReset = () => {
    if (confirm('Are you sure you want to clear everything? This will remove all Pokémon and Power Stones from your local session.')) {
      clearAllData();
    }
  };

  return (
    <header className="bg-[#1E2124] border-b-4 border-[#3D434A] shadow-[0_4px_12px_rgba(0,0,0,0.5)] px-4 py-3 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Brand: Pokemon Quest Stone Helper with authentic in-round speed boost icon */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-[#1E2A38] to-[#121820] rounded-lg flex items-center justify-center border-2 border-cyan-400/60 shadow-[0_3px_0_#0E1726]">
            <img
              src="/assets/speed_boost.png"
              alt="Pokemon Quest Stone Helper"
              className="w-7 h-7 object-contain drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]"
            />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-black text-amber-200 tracking-tight font-mono leading-none">
              POKEMON QUEST STONE HELPER
            </h1>
          </div>
        </div>

        {/* Center: Active Pokémon Selector & Team Tabs */}
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto justify-center md:justify-start">
          {/* Active Pokémon Dropdown with appearance-none to prevent redundant native arrow */}
          <div className="relative flex-1 md:w-64 bg-neutral-900 border-2 border-[#3D434A] rounded-lg p-1 flex items-center gap-2 shadow-inner">
            {activePokemon && (
              <PokemonSprite pokedexId={activePokemon.pokedexId} size="sm" className="shrink-0" />
            )}
            <select
              value={activePokemonId || ''}
              onChange={(e) => setActivePokemon(e.target.value)}
              disabled={pokemonList.length === 0}
              className="w-full bg-transparent text-xs font-mono font-bold text-amber-200 focus:outline-none cursor-pointer py-1 appearance-none pr-8 disabled:text-neutral-500"
            >
              {pokemonList.length === 0 ? (
                <option value="" disabled className="bg-neutral-900 text-neutral-500">
                  No Pokémon in Roster
                </option>
              ) : (
                pokemonList.map((p) => {
                  const isTeamMember = teamPokemonIds.includes(p.id);
                  return (
                    <option key={p.id} value={p.id} className="bg-neutral-900 text-neutral-200">
                      {isTeamMember ? '★ ' : ''}{p.name} (Lv. {p.level || 100})
                    </option>
                  );
                })
              )}
            </select>
            <ChevronDown className="w-4 h-4 text-neutral-500 absolute right-2 pointer-events-none" />
          </div>

          <button
            onClick={onOpenAddPokemonModal}
            disabled={isRosterFull}
            className="quest-btn px-3 py-2 bg-neutral-800 hover:bg-neutral-700 disabled:opacity-40 disabled:cursor-not-allowed text-amber-300 border-neutral-700 text-xs font-mono font-bold flex items-center gap-1 shrink-0"
            title={isRosterFull ? 'Roster full (300/300 Pokémon max)' : `Add Pokémon to Roster (${pokemonList.length}/${MAX_POKEMON_LIMIT})`}
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Add Pokémon</span>
            <span className="text-[10px] text-neutral-400 font-normal">({pokemonList.length}/{MAX_POKEMON_LIMIT})</span>
          </button>
        </div>

        {/* Right Actions: CSV and Reset */}
        <div className="flex items-center gap-2 self-end md:self-auto">
          <button
            onClick={onOpenCsvModal}
            className="quest-btn px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border-neutral-700 text-xs font-mono font-bold flex items-center gap-1.5 shadow-[0_3px_0_#141618]"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>CSV Import / Export</span>
          </button>

          <button
            onClick={handleReset}
            className="p-2 bg-neutral-900 hover:bg-red-950/40 text-neutral-400 hover:text-red-400 border border-neutral-800 hover:border-red-500/50 rounded-lg transition-colors"
            title="Clear All Data (Empty Inventory & Roster)"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
