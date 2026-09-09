import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { PokemonProfile, PokemonSocket, PowerStone, SocketType, StatRequirements, StatWeights, SubStatType } from '../types';
import { INITIAL_POKEMON, INITIAL_STONES } from './seedData';
import { StoreDataSchema } from '../io/validator';
import { isSlotUnlockedAtLevel, DEFAULT_PRIORITY_ORDER, MAX_POKEMON_LIMIT, MAX_STONES_LIMIT } from '../constants/stats';

export interface BuddyStoreState {
  version: number;
  stones: PowerStone[];
  pokemon: PokemonProfile[];
  activePokemonId: string | null;
  teamPokemonIds: string[]; // Up to 3 active team members
  globalPriorities: SubStatType[]; // Overall priority ranking shared across pokemon
  globalMinRequirements?: StatRequirements; // Overall lower bound requirements shared across pokemon

  // Search, Filter & Sort state
  searchQuery: string;
  typeFilter: 'ALL' | 'ATK' | 'HP';
  subStatFilter: 'ALL' | SubStatType;
  assignmentFilter: 'ALL' | 'UNASSIGNED' | 'ASSIGNED' | 'ACTIVE_POKEMON';
  lockedFilter: 'ALL' | 'LOCKED' | 'UNLOCKED';
  sortBy: 'POWER' | 'SUBSTAT_COUNT' | 'RECENT';
  sortOrder: 'asc' | 'desc';

  // Selected stone for quick actions
  selectedStoneId: string | null;

  // Actions: Stones
  addStone: (stone: Omit<PowerStone, 'id'> & { id?: string }) => PowerStone | null;
  updateStone: (id: string, updates: Partial<Omit<PowerStone, 'id'>>) => void;
  deleteStone: (id: string) => void;
  toggleLockStone: (id: string) => void;
  duplicateStone: (id: string) => PowerStone | null;
  bulkAddStones: (stones: PowerStone[], mode: 'replace' | 'merge' | 'overwrite_existing') => void;
  equipStone: (stoneId: string, pokemonId: string, slotIndex: number) => boolean;
  unequipStone: (stoneId: string) => void;
  clearPokemonStones: (pokemonId: string) => void;
  batchEquip: (pokemonId: string, assignments: Map<number, PowerStone>, updatedSockets?: PokemonSocket[]) => void;
  batchEquipTeam: (teamAssignments: Map<string, Map<number, PowerStone>>, teamSockets?: Map<string, PokemonSocket[]>) => void;

  // Actions: Pokemon Profiles
  addPokemon: (profile: Omit<PokemonProfile, 'id'> & { id?: string }) => PokemonProfile | null;
  bulkAddPokemon: (pokemon: PokemonProfile[], mode: 'replace' | 'merge' | 'overwrite_existing') => void;
  importFullBackup: (
    data: {
      stones?: PowerStone[];
      pokemon?: PokemonProfile[];
      teamPokemonIds?: string[];
      activePokemonId?: string | null;
      globalPriorities?: SubStatType[];
      globalMinRequirements?: StatRequirements;
    },
    mode: 'replace' | 'overwrite_existing' | 'merge'
  ) => void;
  updatePokemon: (id: string, updates: Partial<Omit<PokemonProfile, 'id'>>) => void;
  updatePriorities: (pokemonId: string, priorities: SubStatType[]) => void;
  updatePokemonMinRequirements: (pokemonId: string, minRequirements: StatRequirements) => void;
  setPokemonUseCustomPriorities: (pokemonId: string, useCustom: boolean) => void;
  setPokemonUseCustomMinRequirements: (pokemonId: string, useCustom: boolean) => void;
  setPokemonLevel: (pokemonId: string, level: number) => void;
  deletePokemon: (id: string) => void;
  duplicatePokemon: (id: string) => PokemonProfile | null;
  setActivePokemon: (id: string | null) => void;
  setTeamPokemonIds: (ids: string[]) => void;
  toggleTeamMember: (id: string) => void;
  updateSocketType: (pokemonId: string, slotIndex: number, type: SocketType) => void;
  updateWeights: (pokemonId: string, weights: StatWeights) => void;

  // Actions: Priorities & Requirements (Global / Overall)
  updateGlobalPriorities: (priorities: SubStatType[]) => void;
  resetGlobalPriorities: () => void;
  updateGlobalMinRequirements: (minRequirements: StatRequirements) => void;
  resetGlobalMinRequirements: () => void;

  // Actions: Filters & UI
  setSearchQuery: (query: string) => void;
  setTypeFilter: (filter: 'ALL' | 'ATK' | 'HP') => void;
  setSubStatFilter: (filter: 'ALL' | SubStatType) => void;
  setAssignmentFilter: (filter: 'ALL' | 'UNASSIGNED' | 'ASSIGNED' | 'ACTIVE_POKEMON') => void;
  setLockedFilter: (filter: 'ALL' | 'LOCKED' | 'UNLOCKED') => void;
  setSortBy: (sort: 'POWER' | 'SUBSTAT_COUNT' | 'RECENT') => void;
  setSortOrder: (order: 'asc' | 'desc') => void;
  setSelectedStoneId: (id: string | null) => void;
  clearAllData: () => void;
  resetToSampleData: () => void;
}

const STORAGE_KEY = 'pquest_buddy_store_v1';
const CURRENT_VERSION = 1;

export const useBuddyStore = create<BuddyStoreState>()(
  persist(
    (set, get) => ({
      version: CURRENT_VERSION,
      stones: INITIAL_STONES,
      pokemon: INITIAL_POKEMON,
      activePokemonId: INITIAL_POKEMON[0]?.id || null,
      teamPokemonIds: INITIAL_POKEMON.slice(0, 3).map(p => p.id),
      globalPriorities: DEFAULT_PRIORITY_ORDER,

      searchQuery: '',
      typeFilter: 'ALL',
      subStatFilter: 'ALL',
      assignmentFilter: 'ALL',
      lockedFilter: 'ALL',
      sortBy: 'POWER',
      sortOrder: 'desc',
      selectedStoneId: null,

      // --- Stones CRUD ---
      addStone: (stoneInput) => {
        if (get().stones.length >= MAX_STONES_LIMIT) {
          return null;
        }

        const id = stoneInput.id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `stone-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`);
        const newStone: PowerStone = {
          ...stoneInput,
          id,
          assignedPokemonId: stoneInput.assignedPokemonId || null,
          assignedSlotIndex: stoneInput.assignedSlotIndex ?? null,
          isLocked: stoneInput.isLocked ?? false,
          subStats: stoneInput.subStats ?? [],
        };

        set(state => ({
          stones: [newStone, ...state.stones],
        }));

        return newStone;
      },

      updateStone: (id, updates) => {
        set(state => ({
          stones: state.stones.map(s => {
            if (s.id !== id) return s;
            // If stone is locked and update does not explicitly unlock it, prevent editing
            if (s.isLocked && updates.isLocked === undefined) {
              return s;
            }
            const updated = { ...s, ...updates };
            // If stone type changed while equipped, verify socket compatibility
            if (
              updated.type !== s.type &&
              updated.assignedPokemonId &&
              updated.assignedSlotIndex !== null &&
              updated.assignedSlotIndex !== undefined
            ) {
              const targetPoke = state.pokemon.find(p => p.id === updated.assignedPokemonId);
              const socket = targetPoke?.sockets.find(sock => sock.slotIndex === updated.assignedSlotIndex);
              if (socket && socket.type !== 'MULTI' && socket.type !== updated.type) {
                updated.assignedPokemonId = null;
                updated.assignedSlotIndex = null;
              }
            }
            return updated;
          }),
        }));
      },

      deleteStone: (id) => {
        set(state => ({
          stones: state.stones.filter(s => s.id !== id),
          selectedStoneId: state.selectedStoneId === id ? null : state.selectedStoneId,
        }));
      },

      toggleLockStone: (id) => {
        set(state => ({
          stones: state.stones.map(s => (s.id === id ? { ...s, isLocked: !s.isLocked } : s)),
        }));
      },

      duplicateStone: (id) => {
        if (get().stones.length >= MAX_STONES_LIMIT) return null;

        const original = get().stones.find(s => s.id === id);
        if (!original) return null;

        const newId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `stone-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
        const copy: PowerStone = {
          ...original,
          id: newId,
          assignedPokemonId: null,
          assignedSlotIndex: null,
          isLocked: false,
        };

        set(state => ({
          stones: [copy, ...state.stones],
        }));

        return copy;
      },

      bulkAddStones: (newStones, mode) => {
        set(state => {
          if (mode === 'replace') {
            return { stones: newStones.slice(0, MAX_STONES_LIMIT) };
          }
          if (mode === 'overwrite_existing') {
            const map = new Map<string, PowerStone>();
            state.stones.forEach(s => map.set(s.id, s));
            newStones.forEach(s => map.set(s.id, s));
            return { stones: Array.from(map.values()).slice(0, MAX_STONES_LIMIT) };
          }
          // Default merge (skip existing IDs)
          const existingIds = new Set(state.stones.map(s => s.id));
          const remainingRoom = Math.max(0, MAX_STONES_LIMIT - state.stones.length);
          const toAdd = newStones.filter(s => !existingIds.has(s.id)).slice(0, remainingRoom);
          return { stones: [...toAdd, ...state.stones] };
        });
      },

      equipStone: (stoneId, pokemonId, slotIndex) => {
        const state = get();
        const targetPokemon = state.pokemon.find(p => p.id === pokemonId);
        const stone = state.stones.find(s => s.id === stoneId);

        if (!targetPokemon || !stone) return false;

        const socket = targetPokemon.sockets.find(s => s.slotIndex === slotIndex);
        if (!socket || !socket.isUnlocked) return false;

        // Check compatibility
        if (socket.type === 'ATK' && stone.type !== 'ATK') return false;
        if (socket.type === 'HP' && stone.type !== 'HP') return false;

        // Update stones: unequip any stone currently in that slot, assign this stone
        set(curr => ({
          stones: curr.stones.map(s => {
            // Unequip old occupant of that slot on this pokemon
            if (s.assignedPokemonId === pokemonId && s.assignedSlotIndex === slotIndex && s.id !== stoneId) {
              return { ...s, assignedPokemonId: null, assignedSlotIndex: null };
            }
            // Equip candidate stone
            if (s.id === stoneId) {
              return { ...s, assignedPokemonId: pokemonId, assignedSlotIndex: slotIndex };
            }
            return s;
          }),
        }));

        return true;
      },

      unequipStone: (stoneId) => {
        set(state => ({
          stones: state.stones.map(s =>
            s.id === stoneId ? { ...s, assignedPokemonId: null, assignedSlotIndex: null } : s
          ),
        }));
      },

      clearPokemonStones: (pokemonId) => {
        set(state => ({
          stones: state.stones.map(s =>
            s.assignedPokemonId === pokemonId ? { ...s, assignedPokemonId: null, assignedSlotIndex: null } : s
          ),
        }));
      },

      batchEquip: (pokemonId, assignments, updatedSockets) => {
        const assignedStoneIds = new Map<string, number>();
        assignments.forEach((stone, slotIndex) => {
          assignedStoneIds.set(stone.id, slotIndex);
        });

        set(state => ({
          stones: state.stones.map(s => {
            if (assignedStoneIds.has(s.id)) {
              return {
                ...s,
                assignedPokemonId: pokemonId,
                assignedSlotIndex: assignedStoneIds.get(s.id)!,
              };
            }
            // If it was assigned to this pokemon in a slot that got replaced or unassigned
            if (s.assignedPokemonId === pokemonId) {
              return { ...s, assignedPokemonId: null, assignedSlotIndex: null };
            }
            return s;
          }),
          pokemon: updatedSockets
            ? state.pokemon.map(p => (p.id === pokemonId ? { ...p, sockets: updatedSockets } : p))
            : state.pokemon,
        }));
      },

      batchEquipTeam: (teamAssignments, teamSockets) => {
        const stoneToPlacement = new Map<string, { pokemonId: string; slotIndex: number }>();
        const teamIds = new Set<string>();

        teamAssignments.forEach((slotsMap, pokeId) => {
          teamIds.add(pokeId);
          slotsMap.forEach((stone, slotIdx) => {
            stoneToPlacement.set(stone.id, { pokemonId: pokeId, slotIndex: slotIdx });
          });
        });

        set(state => ({
          stones: state.stones.map(s => {
            if (stoneToPlacement.has(s.id)) {
              const placement = stoneToPlacement.get(s.id)!;
              return {
                ...s,
                assignedPokemonId: placement.pokemonId,
                assignedSlotIndex: placement.slotIndex,
              };
            }
            // If it was assigned to one of the team members and was not reassigned
            if (s.assignedPokemonId && teamIds.has(s.assignedPokemonId)) {
              return { ...s, assignedPokemonId: null, assignedSlotIndex: null };
            }
            return s;
          }),
          pokemon: teamSockets
            ? state.pokemon.map(p => {
                const updated = teamSockets.get(p.id);
                return updated ? { ...p, sockets: updated } : p;
              })
            : state.pokemon,
        }));
      },

      // --- Pokémon CRUD ---
      addPokemon: (profileInput) => {
        if (get().pokemon.length >= MAX_POKEMON_LIMIT) {
          return null;
        }

        const id = profileInput.id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `poke-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`);
        const level = profileInput.level ?? 100;

        const newPokemon: PokemonProfile = {
          ...profileInput,
          id,
          level,
          priorities: profileInput.priorities || DEFAULT_PRIORITY_ORDER,
          sockets: profileInput.sockets.map((s, idx) => ({
            ...s,
            isUnlocked: isSlotUnlockedAtLevel(idx, level, profileInput.pokedexId),
          })),
        };

        set(state => {
          const nextTeam = state.teamPokemonIds.length < 3
            ? [...state.teamPokemonIds, id]
            : state.teamPokemonIds;

          return {
            pokemon: [...state.pokemon, newPokemon],
            activePokemonId: id,
            teamPokemonIds: nextTeam,
          };
        });

        return newPokemon;
      },

      bulkAddPokemon: (newPokemon, mode) => {
        set(state => {
          if (mode === 'replace') {
            const pokes = newPokemon.slice(0, MAX_POKEMON_LIMIT);
            const team = pokes.slice(0, 3).map(p => p.id);
            return {
              pokemon: pokes,
              activePokemonId: pokes[0]?.id || null,
              teamPokemonIds: team,
            };
          }
          if (mode === 'overwrite_existing') {
            const map = new Map<string, PokemonProfile>();
            state.pokemon.forEach(p => map.set(p.id, p));
            newPokemon.forEach(p => map.set(p.id, p));
            const pokes = Array.from(map.values()).slice(0, MAX_POKEMON_LIMIT);
            return {
              pokemon: pokes,
              activePokemonId: state.activePokemonId || pokes[0]?.id || null,
            };
          }
          // Default merge (skip existing IDs)
          const existingIds = new Set(state.pokemon.map(p => p.id));
          const remainingRoom = Math.max(0, MAX_POKEMON_LIMIT - state.pokemon.length);
          const toAdd = newPokemon.filter(p => !existingIds.has(p.id)).slice(0, remainingRoom);
          const pokes = [...state.pokemon, ...toAdd];
          return {
            pokemon: pokes,
            activePokemonId: state.activePokemonId || pokes[0]?.id || null,
          };
        });
      },

      importFullBackup: (data, mode) => {
        set(state => {
          const rawStones = data.stones || [];
          const rawPokemon = data.pokemon || [];

          if (mode === 'replace') {
            const nextPokemon = rawPokemon.slice(0, MAX_POKEMON_LIMIT);
            const nextStones = rawStones.slice(0, MAX_STONES_LIMIT);
            const nextActiveId = data.activePokemonId && nextPokemon.some(p => p.id === data.activePokemonId)
              ? data.activePokemonId
              : (nextPokemon[0]?.id || null);
            const validTeamIds = (data.teamPokemonIds || nextPokemon.slice(0, 3).map(p => p.id))
              .filter(id => nextPokemon.some(p => p.id === id))
              .slice(0, 3);

            return {
              pokemon: nextPokemon,
              stones: nextStones,
              activePokemonId: nextActiveId,
              teamPokemonIds: validTeamIds,
              globalPriorities: data.globalPriorities || state.globalPriorities || DEFAULT_PRIORITY_ORDER,
              globalMinRequirements: data.globalMinRequirements || state.globalMinRequirements,
            };
          }

          if (mode === 'overwrite_existing') {
            // Merge stones
            const stoneMap = new Map<string, PowerStone>();
            state.stones.forEach(s => stoneMap.set(s.id, s));
            rawStones.forEach(s => stoneMap.set(s.id, s));
            const nextStones = Array.from(stoneMap.values()).slice(0, MAX_STONES_LIMIT);

            // Merge pokemon
            const pokeMap = new Map<string, PokemonProfile>();
            state.pokemon.forEach(p => pokeMap.set(p.id, p));
            rawPokemon.forEach(p => pokeMap.set(p.id, p));
            const nextPokemon = Array.from(pokeMap.values()).slice(0, MAX_POKEMON_LIMIT);

            const nextActiveId = data.activePokemonId || state.activePokemonId || nextPokemon[0]?.id || null;
            const nextTeam = data.teamPokemonIds && data.teamPokemonIds.length > 0
              ? data.teamPokemonIds.filter(id => nextPokemon.some(p => p.id === id)).slice(0, 3)
              : state.teamPokemonIds.filter(id => nextPokemon.some(p => p.id === id)).slice(0, 3);

            return {
              pokemon: nextPokemon,
              stones: nextStones,
              activePokemonId: nextActiveId,
              teamPokemonIds: nextTeam.length > 0 ? nextTeam : nextPokemon.slice(0, 3).map(p => p.id),
              globalPriorities: data.globalPriorities || state.globalPriorities,
              globalMinRequirements: data.globalMinRequirements || state.globalMinRequirements,
            };
          }

          // mode === 'merge' (skip existing IDs)
          const existingStoneIds = new Set(state.stones.map(s => s.id));
          const stonesRoom = Math.max(0, MAX_STONES_LIMIT - state.stones.length);
          const stonesToAdd = rawStones.filter(s => !existingStoneIds.has(s.id)).slice(0, stonesRoom);

          const existingPokeIds = new Set(state.pokemon.map(p => p.id));
          const pokeRoom = Math.max(0, MAX_POKEMON_LIMIT - state.pokemon.length);
          const pokeToAdd = rawPokemon.filter(p => !existingPokeIds.has(p.id)).slice(0, pokeRoom);

          return {
            stones: [...state.stones, ...stonesToAdd],
            pokemon: [...state.pokemon, ...pokeToAdd],
          };
        });
      },

      updatePokemon: (id, updates) => {
        set(state => ({
          pokemon: state.pokemon.map(p => (p.id === id ? { ...p, ...updates } : p)),
        }));
      },

      updatePriorities: (id, priorities) => {
        set(state => ({
          pokemon: state.pokemon.map(p => (p.id === id ? { ...p, priorities, useCustomPriorities: true } : p)),
        }));
      },

      updatePokemonMinRequirements: (id, minRequirements) => {
        set(state => ({
          pokemon: state.pokemon.map(p => (p.id === id ? { ...p, minRequirements, useCustomMinRequirements: true } : p)),
        }));
      },

      setPokemonUseCustomPriorities: (id, useCustomPriorities) => {
        set(state => ({
          pokemon: state.pokemon.map(p => {
            if (p.id !== id) return p;
            return {
              ...p,
              useCustomPriorities,
              // If enabling custom priorities for the first time without prior list, initialize with current global priorities
              priorities: p.priorities || state.globalPriorities || DEFAULT_PRIORITY_ORDER,
            };
          }),
        }));
      },

      setPokemonUseCustomMinRequirements: (id, useCustomMinRequirements) => {
        set(state => ({
          pokemon: state.pokemon.map(p => {
            if (p.id !== id) return p;
            return {
              ...p,
              useCustomMinRequirements,
              minRequirements: p.minRequirements || (state.globalMinRequirements ? { ...state.globalMinRequirements } : {}),
            };
          }),
        }));
      },

      updateGlobalPriorities: (globalPriorities) => {
        set({ globalPriorities });
      },

      resetGlobalPriorities: () => {
        set({ globalPriorities: DEFAULT_PRIORITY_ORDER });
      },

      updateGlobalMinRequirements: (globalMinRequirements) => {
        set({ globalMinRequirements });
      },

      resetGlobalMinRequirements: () => {
        set({ globalMinRequirements: undefined });
      },

      setPokemonLevel: (pokemonId, level) => {
        const cleanLevel = Math.max(1, Math.min(100, Math.round(level) || 1));
        const targetPokemon = get().pokemon.find(p => p.id === pokemonId);
        const pokedexId = targetPokemon?.pokedexId;

        set(state => {
          // If level drop causes previously unlocked slots to lock, unequip stones in newly locked slots
          const updatedStones = state.stones.map(s => {
            if (s.assignedPokemonId === pokemonId && s.assignedSlotIndex !== null && s.assignedSlotIndex !== undefined) {
              if (!isSlotUnlockedAtLevel(s.assignedSlotIndex, cleanLevel, pokedexId)) {
                return { ...s, assignedPokemonId: null, assignedSlotIndex: null };
              }
            }
            return s;
          });

          return {
            stones: updatedStones,
            pokemon: state.pokemon.map(p => {
              if (p.id !== pokemonId) return p;
              return {
                ...p,
                level: cleanLevel,
                sockets: p.sockets.map((s, idx) => ({
                  ...s,
                  isUnlocked: isSlotUnlockedAtLevel(idx, cleanLevel, p.pokedexId),
                })),
              };
            }),
          };
        });
      },

      deletePokemon: (id) => {
        set(state => {
          const nextPokemon = state.pokemon.filter(p => p.id !== id);
          const nextActiveId = state.activePokemonId === id ? (nextPokemon[0]?.id || null) : state.activePokemonId;
          const nextTeam = state.teamPokemonIds.filter(teamId => teamId !== id);

          // Free all stones assigned to deleted pokemon
          const updatedStones = state.stones.map(s =>
            s.assignedPokemonId === id ? { ...s, assignedPokemonId: null, assignedSlotIndex: null } : s
          );

          return {
            pokemon: nextPokemon,
            activePokemonId: nextActiveId,
            teamPokemonIds: nextTeam,
            stones: updatedStones,
          };
        });
      },

      duplicatePokemon: (id) => {
        if (get().pokemon.length >= MAX_POKEMON_LIMIT) return null;

        const original = get().pokemon.find(p => p.id === id);
        if (!original) return null;

        const newId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `poke-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
        const level = original.level || 100;
        const copy: PokemonProfile = {
          ...original,
          id: newId,
          name: `${original.name} (Copy)`,
          level,
          sockets: original.sockets.map((s, idx) => ({
            ...s,
            isUnlocked: isSlotUnlockedAtLevel(idx, level, original.pokedexId),
          })),
          priorities: [...(original.priorities || DEFAULT_PRIORITY_ORDER)],
          minRequirements: original.minRequirements ? {
            minAtkPower: original.minRequirements.minAtkPower,
            minHpPower: original.minRequirements.minHpPower,
            minSubStats: original.minRequirements.minSubStats ? { ...original.minRequirements.minSubStats } : undefined,
          } : undefined,
          weights: original.weights?.weights ? {
            powerWeight: original.weights.powerWeight,
            weights: { ...original.weights.weights } as Record<SubStatType, number>,
          } : undefined,
        };

        set(state => ({
          pokemon: [...state.pokemon, copy],
          activePokemonId: newId,
        }));

        return copy;
      },

      setActivePokemon: (id) => {
        set({ activePokemonId: id });
      },

      setTeamPokemonIds: (ids) => {
        set({ teamPokemonIds: ids.slice(0, 3) });
      },

      toggleTeamMember: (id) => {
        set(state => {
          const isMember = state.teamPokemonIds.includes(id);
          if (isMember) {
            // Unselect favorite
            return { teamPokemonIds: state.teamPokemonIds.filter(m => m !== id) };
          } else {
            // Cannot add if already 3 favorites
            if (state.teamPokemonIds.length >= 3) {
              return state;
            }
            return { teamPokemonIds: [...state.teamPokemonIds, id] };
          }
        });
      },

      updateSocketType: (pokemonId, slotIndex, type) => {
        set(state => {
          // If a stone is equipped in this socket and its type becomes invalid, unequip it
          const updatedStones = state.stones.map(stone => {
            if (stone.assignedPokemonId === pokemonId && stone.assignedSlotIndex === slotIndex) {
              if ((type === 'ATK' && stone.type !== 'ATK') || (type === 'HP' && stone.type !== 'HP')) {
                return { ...stone, assignedPokemonId: null, assignedSlotIndex: null };
              }
            }
            return stone;
          });

          return {
            stones: updatedStones,
            pokemon: state.pokemon.map(p => {
              if (p.id !== pokemonId) return p;
              return {
                ...p,
                sockets: p.sockets.map(s => (s.slotIndex === slotIndex ? { ...s, type } : s)),
              };
            }),
          };
        });
      },

      updateWeights: (pokemonId, weights) => {
        set(state => ({
          pokemon: state.pokemon.map(p => (p.id === pokemonId ? { ...p, weights } : p)),
        }));
      },

      // --- UI & Filter actions ---
      setSearchQuery: (searchQuery) => set({ searchQuery }),
      setTypeFilter: (typeFilter) => set({ typeFilter }),
      setSubStatFilter: (subStatFilter) => set({ subStatFilter }),
      setAssignmentFilter: (assignmentFilter) => set({ assignmentFilter }),
      setLockedFilter: (lockedFilter) => set({ lockedFilter }),
      setSortBy: (sortBy) => set({ sortBy }),
      setSortOrder: (sortOrder) => set({ sortOrder }),
      setSelectedStoneId: (selectedStoneId) => set({ selectedStoneId }),

      clearAllData: () => {
        set({
          stones: [],
          pokemon: [],
          activePokemonId: null,
          teamPokemonIds: [],
          selectedStoneId: null,
        });
      },

      resetToSampleData: () => {
        set({
          stones: INITIAL_STONES,
          pokemon: INITIAL_POKEMON,
          activePokemonId: INITIAL_POKEMON[0]?.id || null,
          teamPokemonIds: INITIAL_POKEMON.slice(0, 3).map(p => p.id),
          globalMinRequirements: undefined,
        });
      },
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        version: state.version,
        stones: state.stones,
        pokemon: state.pokemon,
        activePokemonId: state.activePokemonId,
        teamPokemonIds: state.teamPokemonIds,
        globalPriorities: state.globalPriorities,
        globalMinRequirements: state.globalMinRequirements,
      }),
      onRehydrateStorage: () => (state, error) => {
        if (error) {
          console.error('Failed to rehydrate Quest Stone Buddy store:', error);
          try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
              localStorage.setItem('pquest_buddy_backup_error', raw);
            }
          } catch (e) {
            console.error('Failed to backup corrupted state:', e);
          }
        } else if (state) {
          // Schema verification using Zod
          const validation = StoreDataSchema.safeParse({
            version: state.version,
            stones: state.stones,
            pokemon: state.pokemon,
            activePokemonId: state.activePokemonId,
            teamPokemonIds: state.teamPokemonIds,
            globalPriorities: state.globalPriorities,
            globalMinRequirements: state.globalMinRequirements,
          });

          if (!validation.success) {
            console.warn('Store state failed schema validation. Falling back to clean sample state.', validation.error);
            try {
              const raw = localStorage.getItem(STORAGE_KEY);
              if (raw) {
                localStorage.setItem('pquest_buddy_backup_error', raw);
              }
            } catch (e) {
              console.error('Failed to save corrupted state:', e);
            }
            state.resetToSampleData();
          }
        }
      },
    }
  )
);
