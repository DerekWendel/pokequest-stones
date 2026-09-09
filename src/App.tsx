import { useState } from 'react';
import { useBuddyStore } from './store/useBuddyStore';
import { AppHeader } from './components/header/AppHeader';
import { PokemonHero } from './components/visualizer/PokemonHero';
import { PowerCharmGrid } from './components/visualizer/PowerCharmGrid';
import { OptimizerPanel } from './components/optimizer/OptimizerPanel';
import { StoneDrawer } from './components/inventory/StoneDrawer';
import { AddPokemonModal } from './components/modals/AddPokemonModal';
import { AddStoneModal } from './components/modals/AddStoneModal';
import { CsvModal } from './components/modals/CsvModal';
import type { PowerStone } from './types';

export function App() {
  const pokemonList = useBuddyStore(state => state.pokemon);
  const activePokemonId = useBuddyStore(state => state.activePokemonId);

  const [isEditSocketsMode, setIsEditSocketsMode] = useState(false);
  const [isAddPokemonOpen, setIsAddPokemonOpen] = useState(false);
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [isAddStoneOpen, setIsAddStoneOpen] = useState(false);
  const [stoneToEdit, setStoneToEdit] = useState<PowerStone | null>(null);

  const activePokemon = pokemonList.find(p => p.id === activePokemonId) || pokemonList[0];

  const handleOpenAddStone = () => {
    setStoneToEdit(null);
    setIsAddStoneOpen(true);
  };

  const handleEditStone = (stone: PowerStone) => {
    setStoneToEdit(stone);
    setIsAddStoneOpen(true);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#1A1D20] text-[#F4E8C1]">
      {/* Top Navigation & Selector */}
      <AppHeader
        onOpenAddPokemonModal={() => setIsAddPokemonOpen(true)}
        onOpenCsvModal={() => setIsCsvModalOpen(true)}
      />

      {/* Main App Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-5 flex flex-col gap-5">
        {activePokemon ? (
          <>
            {/* Top Workspace Grid: Visualizer & Optimizer */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
              {/* Left Column (5/12 cols): Pokémon Hero & 3x3 Charm Visualizer */}
              <div className="lg:col-span-5 flex flex-col gap-4">
                <PokemonHero
                  pokemon={activePokemon}
                  isEditSocketsMode={isEditSocketsMode}
                  setIsEditSocketsMode={setIsEditSocketsMode}
                  onOpenAddModal={() => setIsAddPokemonOpen(true)}
                />

                <PowerCharmGrid
                  pokemon={activePokemon}
                  isEditSocketsMode={isEditSocketsMode}
                />
              </div>

              {/* Right Column (7/12 cols): Cap-Aware Breakdown & Optimizer Panel */}
              <div className="lg:col-span-7">
                <OptimizerPanel pokemon={activePokemon} />
              </div>
            </div>

            {/* Bottom Drawer: Stone Inventory */}
            <div>
              <StoneDrawer
                activePokemon={activePokemon}
                onOpenAddStoneModal={handleOpenAddStone}
                onEditStone={handleEditStone}
              />
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center bg-[#24272C] border-2 border-[#3D434A] rounded-2xl">
            <h2 className="text-xl font-bold font-mono text-amber-200 mb-2">No Pokémon in Roster</h2>
            <p className="text-sm text-neutral-400 max-w-md mb-4 font-sans">
              Add your first Pokémon to start configuring sockets and optimizing power stones!
            </p>
            <button
              onClick={() => setIsAddPokemonOpen(true)}
              className="quest-btn px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-neutral-950 text-sm font-bold font-mono shadow-[0_4px_0_#92400e]"
            >
              Add Pokémon
            </button>
          </div>
        )}
      </main>

      {/* Modals */}
      <AddPokemonModal
        isOpen={isAddPokemonOpen}
        onClose={() => setIsAddPokemonOpen(false)}
      />

      <AddStoneModal
        isOpen={isAddStoneOpen}
        onClose={() => setIsAddStoneOpen(false)}
        stoneToEdit={stoneToEdit}
      />

      <CsvModal
        isOpen={isCsvModalOpen}
        onClose={() => setIsCsvModalOpen(false)}
      />
    </div>
  );
}

export default App;
