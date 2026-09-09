export type StoneType = 'ATK' | 'HP';

export type SocketType = 'ATK' | 'HP' | 'MULTI';

export type SubStatType =
  | 'HIT_HEAL'             // Cap: 10.0%
  | 'HEAL_FROM_KO'         // Cap: 10.0%
  | 'CRIT_RATE'            // Cap: 100.0%
  | 'CRIT_DMG'             // Cap: 100.0%
  | 'STATUS_RESIST'        // Cap: 100.0%
  | 'STAT_LOWER_RESIST'    // Cap: 100.0%
  | 'MOVE_SPEED'           // Cap: 200.0%
  | 'NATURAL_HEAL'         // Cap: 300.0%
  | 'TIME_TO_RECOVER'      // Cap: 50.0%
  | 'HP_UPON_RECOVERY'     // Cap: 50.0%
  | 'STAT_STRENGTH';       // Primary Power (1 - 999)

export interface SubStat {
  type: SubStatType;
  value: number; // Stored as raw float, e.g., 2.5 for 2.5%
}

export interface PowerStone {
  id: string;              // UUID
  type: StoneType;         // 'ATK' (Mighty) or 'HP' (Sturdy)
  power: number;           // Primary power stat (e.g., 999)
  subStats: SubStat[];     // 0 to 3 sub-stats
  assignedPokemonId?: string | null; // Null if loose in inventory
  assignedSlotIndex?: number | null; // 0 to 8 (index of 3x3 grid)
  isLocked: boolean;       // Prevents deletion/reassignment
}

export interface PokemonSocket {
  slotIndex: number;       // 0 to 8
  type: SocketType;        // 'ATK', 'HP', or 'MULTI'
  isUnlocked: boolean;     // Handles leveling progression (1-9 open)
}

export interface StatWeights {
  powerWeight?: number;
  weights?: Record<SubStatType, number>;
}

export interface StatRequirements {
  minAtkPower?: number;
  minHpPower?: number;
  minSubStats?: Partial<Record<SubStatType, number>>;
}

export interface UnmetRequirement {
  statLabel: string;
  statKey: string;
  required: number;
  achieved: number;
  unit: string;
}

export interface PokemonProfile {
  id: string;              // Unique instance ID
  pokedexId: number;       // 1-151 (links to sprite)
  name: string;            // Custom nickname (e.g., "Main Machamp")
  level: number;           // 1-100 (dictates unlocked slots)
  sockets: PokemonSocket[]; // Exactly 9 elements
  priorities?: SubStatType[]; // Custom priority ordering for this pokemon (if enabled)
  useCustomPriorities?: boolean; // Whether this pokemon overrides the overall priority ranking
  minRequirements?: StatRequirements; // Custom minimum stat requirements for this pokemon
  useCustomMinRequirements?: boolean; // Whether this pokemon overrides the overall minimum requirements
  weights?: StatWeights;    // Legacy fallback
}

export interface StoreState {
  version: number;
  stones: PowerStone[];
  pokemon: PokemonProfile[];
  activePokemonId: string | null;
  teamPokemonIds: string[]; // Up to 3 active team members
  globalPriorities: SubStatType[]; // Overall priority ranking shared across pokemon
  globalMinRequirements?: StatRequirements; // Global minimum stat requirements

  // UI filter/sort state
  searchQuery: string;
  typeFilter: 'ALL' | 'ATK' | 'HP';
  subStatFilter: 'ALL' | SubStatType;
  assignmentFilter: 'ALL' | 'UNASSIGNED' | 'ASSIGNED' | 'ACTIVE_POKEMON';
  lockedFilter: 'ALL' | 'LOCKED' | 'UNLOCKED';
  sortBy: 'POWER' | 'SUBSTAT_COUNT' | 'RECENT';
  sortOrder: 'asc' | 'desc';
}

export interface CsvRowData {
  id?: string;
  type: StoneType;
  power: number;
  substat1_name?: string;
  substat1_value?: number;
  substat2_name?: string;
  substat2_value?: number;
  substat3_name?: string;
  substat3_value?: number;
  is_locked?: boolean;
  assigned_pokemon_id?: string;
  assigned_slot_index?: number;
}

