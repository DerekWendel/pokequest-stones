import type { SubStatType } from '../types';

export const MAX_POKEMON_LIMIT = 300;
export const MAX_STONES_LIMIT = 300;

export interface SubStatMeta {
  key: SubStatType;
  label: string;
  shortLabel: string;
  hardCap: number; // percentage value, e.g. 10.0 for 10%
  stepMin: number;
  stepMax: number;
  stepRangeText: string;
  unit: string;
  color: string;
  bgColor: string;
  borderColor: string;
  badgeClass: string;
  description: string;
}

export const SUB_STAT_DEFINITIONS: Record<SubStatType, SubStatMeta> = {
  HIT_HEAL: {
    key: 'HIT_HEAL',
    label: 'Hit Healing %',
    shortLabel: 'Hit Heal',
    hardCap: 10.0,
    stepMin: 1.0,
    stepMax: 2.9,
    stepRangeText: '1.0% – 2.9%',
    unit: '%',
    color: '#10B981', // emerald
    bgColor: 'bg-emerald-950/40',
    borderColor: 'border-emerald-500/50',
    badgeClass: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    description: 'Recovers HP equal to a % of damage dealt by regular attacks and moves.',
  },
  HEAL_FROM_KO: {
    key: 'HEAL_FROM_KO',
    label: 'Healing from K.O. %',
    shortLabel: 'Heal from KO',
    hardCap: 10.0,
    stepMin: 1.0,
    stepMax: 2.9,
    stepRangeText: '1.0% – 2.9%',
    unit: '%',
    color: '#14B8A6', // teal
    bgColor: 'bg-teal-950/40',
    borderColor: 'border-teal-500/50',
    badgeClass: 'bg-teal-500/15 text-teal-400 border-teal-500/30',
    description: 'Recovers HP percentage upon knocking out an enemy Pokémon.',
  },
  CRIT_RATE: {
    key: 'CRIT_RATE',
    label: 'Critical Hit Rate %',
    shortLabel: 'Crit Rate',
    hardCap: 100.0,
    stepMin: 2.0,
    stepMax: 29.9,
    stepRangeText: '2.0% – 29.9%',
    unit: '%',
    color: '#F59E0B', // amber
    bgColor: 'bg-amber-950/40',
    borderColor: 'border-amber-500/50',
    badgeClass: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    description: 'Increases the likelihood of landing a critical strike on hits.',
  },
  CRIT_DMG: {
    key: 'CRIT_DMG',
    label: 'Critical Hit Damage %',
    shortLabel: 'Crit Dmg',
    hardCap: 100.0,
    stepMin: 2.0,
    stepMax: 29.9,
    stepRangeText: '2.0% – 29.9%',
    unit: '%',
    color: '#EF4444', // red
    bgColor: 'bg-red-950/40',
    borderColor: 'border-red-500/50',
    badgeClass: 'bg-red-500/15 text-red-400 border-red-500/30',
    description: 'Multiplies damage output when landing a critical strike.',
  },
  STATUS_RESIST: {
    key: 'STATUS_RESIST',
    label: 'Resist Status Conditions %',
    shortLabel: 'Status Resist',
    hardCap: 100.0,
    stepMin: 5.0,
    stepMax: 29.9,
    stepRangeText: '5.0% – 29.9%',
    unit: '%',
    color: '#8B5CF6', // purple
    bgColor: 'bg-purple-950/40',
    borderColor: 'border-purple-500/50',
    badgeClass: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
    description: 'Reduces chances of suffering Burn, Freeze, Paralyze, Poison, or Confusion.',
  },
  STAT_LOWER_RESIST: {
    key: 'STAT_LOWER_RESIST',
    label: 'Resist to ↓ Effects %',
    shortLabel: 'Stat ↓ Resist',
    hardCap: 100.0,
    stepMin: 5.0,
    stepMax: 29.9,
    stepRangeText: '5.0% – 29.9%',
    unit: '%',
    color: '#A855F7', // violet
    bgColor: 'bg-violet-950/40',
    borderColor: 'border-violet-500/50',
    badgeClass: 'bg-violet-500/15 text-violet-400 border-violet-500/30',
    description: 'Reduces likelihood of suffering attack, defense, or speed stat-lowering debuffs.',
  },
  MOVE_SPEED: {
    key: 'MOVE_SPEED',
    label: 'Movement Speed %',
    shortLabel: 'Move Speed',
    hardCap: 200.0,
    stepMin: 10.0,
    stepMax: 69.0,
    stepRangeText: '10.0% – 69.0%',
    unit: '%',
    color: '#06B6D4', // cyan
    bgColor: 'bg-cyan-950/40',
    borderColor: 'border-cyan-500/50',
    badgeClass: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
    description: 'Increases expedition movement speed across the map.',
  },
  NATURAL_HEAL: {
    key: 'NATURAL_HEAL',
    label: 'Natural HP Healing %',
    shortLabel: 'Natural Heal',
    hardCap: 300.0,
    stepMin: 10.0,
    stepMax: 74.9,
    stepRangeText: '10.0% – 74.9%',
    unit: '%',
    color: '#84CC16', // lime
    bgColor: 'bg-lime-950/40',
    borderColor: 'border-lime-500/50',
    badgeClass: 'bg-lime-500/15 text-lime-400 border-lime-500/30',
    description: 'Increases passive health regeneration between waves and battles.',
  },
  TIME_TO_RECOVER: {
    key: 'TIME_TO_RECOVER',
    label: 'Time to Recover %',
    shortLabel: 'Time Recover',
    hardCap: 50.0,
    stepMin: 5.0,
    stepMax: 19.9,
    stepRangeText: '-5.0% – -19.9%',
    unit: '%',
    color: '#3B82F6', // blue
    bgColor: 'bg-blue-950/40',
    borderColor: 'border-blue-500/50',
    badgeClass: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    description: 'Decreases revival cooldown time when knocked out in an expedition.',
  },
  HP_UPON_RECOVERY: {
    key: 'HP_UPON_RECOVERY',
    label: 'HP upon Recovery %',
    shortLabel: 'HP on Recover',
    hardCap: 50.0,
    stepMin: 5.0,
    stepMax: 19.9,
    stepRangeText: '5.0% – 19.9%',
    unit: '%',
    color: '#EC4899', // pink
    bgColor: 'bg-pink-950/40',
    borderColor: 'border-pink-500/50',
    badgeClass: 'bg-pink-500/15 text-pink-400 border-pink-500/30',
    description: 'Increases starting health percentage upon being revived.',
  },
  STAT_STRENGTH: {
    key: 'STAT_STRENGTH',
    label: 'Stat Strength',
    shortLabel: 'Strength',
    hardCap: 999,
    stepMin: 1,
    stepMax: 999,
    stepRangeText: '1 – 999',
    unit: '',
    color: '#F59E0B', // amber/gold
    bgColor: 'bg-amber-950/40',
    borderColor: 'border-amber-500/50',
    badgeClass: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    description: 'Primary stone ATK or HP power value (1 - 999).',
  },
};

export const SUB_STAT_KEYS: SubStatType[] = [
  'HIT_HEAL',
  'HEAL_FROM_KO',
  'CRIT_RATE',
  'CRIT_DMG',
  'STATUS_RESIST',
  'STAT_LOWER_RESIST',
  'MOVE_SPEED',
  'TIME_TO_RECOVER',
  'HP_UPON_RECOVERY',
  'NATURAL_HEAL',
];

export const DEFAULT_PRIORITY_ORDER: SubStatType[] = [
  'HIT_HEAL',
  'HEAL_FROM_KO',
  'CRIT_RATE',
  'CRIT_DMG',
  'STATUS_RESIST',
  'STAT_LOWER_RESIST',
  'MOVE_SPEED',
  'TIME_TO_RECOVER',
  'HP_UPON_RECOVERY',
  'NATURAL_HEAL',
  'STAT_STRENGTH',
];

export const DEFAULT_STAT_WEIGHTS = {
  powerWeight: 0.05,
  weights: {
    HIT_HEAL: 10,
    HEAL_FROM_KO: 6,
    CRIT_RATE: 7,
    CRIT_DMG: 7,
    STATUS_RESIST: 8,
    STAT_LOWER_RESIST: 8,
    MOVE_SPEED: 4,
    NATURAL_HEAL: 2,
    TIME_TO_RECOVER: 3,
    HP_UPON_RECOVERY: 2,
    STAT_STRENGTH: 5,
  },
};

/**
 * Pokémon Quest Power Charm Slot Unlock Groups & Levels
 * 
 * Group A (1, 3, 6, 10, 15, 61, 86, 95, 100)
 * Group B (1, 3, 8, 13, 23, 49, 69, 84, 100)
 * Group C (1, 4, 9, 14, 26, 45, 63, 78, 100)
 * Group D (1, 8, 15, 22, 29, 47, 65, 83, 100)
 * Group E (1, 13, 29, 36, 42, 47, 52, 71, 100)
 */

export type UnlockGroup = 'A' | 'B' | 'C' | 'D' | 'E';

export const UNLOCK_GROUPS: Record<
  UnlockGroup,
  { name: string; levels: readonly [number, number, number, number, number, number, number, number, number] }
> = {
  A: {
    name: 'Group A',
    levels: [1, 3, 6, 10, 15, 61, 86, 95, 100],
  },
  B: {
    name: 'Group B',
    levels: [1, 3, 8, 13, 23, 49, 69, 84, 100],
  },
  C: {
    name: 'Group C',
    levels: [1, 4, 9, 14, 26, 45, 63, 78, 100],
  },
  D: {
    name: 'Group D',
    levels: [1, 8, 15, 22, 29, 47, 65, 83, 100],
  },
  E: {
    name: 'Group E',
    levels: [1, 13, 29, 36, 42, 47, 52, 71, 100],
  },
};

export const POKEMON_UNLOCK_GROUP_MAP: Record<number, UnlockGroup> = {
  // Group A (8 families, 14 species)
  35: 'A', 36: 'A', // Clefairy, Clefable
  37: 'A', 38: 'A', // Vulpix, Ninetales
  58: 'A', 59: 'A', // Growlithe, Arcanine
  77: 'A', 78: 'A', // Ponyta, Rapidash
  83: 'A',          // Farfetch'd
  88: 'A', 89: 'A', // Grimer, Muk
  95: 'A',          // Onix
  111: 'A', 112: 'A', // Rhyhorn, Rhydon

  // Group B (12 families, 33 species)
  1: 'B', 2: 'B', 3: 'B',     // Bulbasaur, Ivysaur, Venusaur
  4: 'B', 5: 'B', 6: 'B',     // Charmander, Charmeleon, Charizard
  7: 'B', 8: 'B', 9: 'B',     // Squirtle, Wartortle, Blastoise
  16: 'B', 17: 'B', 18: 'B',  // Pidgey, Pidgeotto, Pidgeot
  19: 'B', 20: 'B',           // Rattata, Raticate
  25: 'B', 26: 'B',           // Pikachu, Raichu
  63: 'B', 64: 'B', 65: 'B',  // Abra, Kadabra, Alakazam
  66: 'B', 67: 'B', 68: 'B',  // Machop, Machoke, Machamp
  74: 'B', 75: 'B', 76: 'B',  // Geodude, Graveler, Golem
  92: 'B', 93: 'B', 94: 'B',  // Gastly, Haunter, Gengar
  133: 'B', 134: 'B', 135: 'B', 136: 'B', // Eevee, Vaporeon, Jolteon, Flareon
  137: 'B',                   // Porygon

  // Group C (30 families, 57 species)
  23: 'C', 24: 'C',           // Ekans, Arbok
  27: 'C', 28: 'C',           // Sandshrew, Sandslash
  29: 'C', 30: 'C', 31: 'C',  // Nidoran♀, Nidorina, Nidoqueen
  32: 'C', 33: 'C', 34: 'C',  // Nidoran♂, Nidorino, Nidoking
  41: 'C', 42: 'C',           // Zubat, Golbat
  46: 'C', 47: 'C',           // Paras, Parasect
  48: 'C', 49: 'C',           // Venonat, Venomoth
  50: 'C', 51: 'C',           // Diglett, Dugtrio
  54: 'C', 55: 'C',           // Psyduck, Golduck
  60: 'C', 61: 'C', 62: 'C',  // Poliwag, Poliwhirl, Poliwrath
  72: 'C', 73: 'C',           // Tentacool, Tentacruel
  81: 'C', 82: 'C',           // Magnemite, Magneton
  84: 'C', 85: 'C',           // Doduo, Dodrio
  86: 'C', 87: 'C',           // Seel, Dewgong
  90: 'C', 91: 'C',           // Shellder, Cloyster
  96: 'C', 97: 'C',           // Drowzee, Hypno
  98: 'C', 99: 'C',           // Krabby, Kingler
  100: 'C', 101: 'C',         // Voltorb, Electrode
  104: 'C', 105: 'C',         // Cubone, Marowak
  109: 'C', 110: 'C',         // Koffing, Weezing
  114: 'C',                   // Tangela
  115: 'C',                   // Kangaskhan
  116: 'C', 117: 'C',         // Horsea, Seadra
  118: 'C', 119: 'C',         // Goldeen, Seaking
  122: 'C',                   // Mr. Mime
  124: 'C',                   // Jynx
  125: 'C',                   // Electabuzz
  126: 'C',                   // Magmar
  138: 'C', 139: 'C',         // Omanyte, Omastar
  140: 'C', 141: 'C',         // Kabuto, Kabutops

  // Group D (10 families, 21 species)
  10: 'D', 11: 'D', 12: 'D',  // Caterpie, Metapod, Butterfree
  13: 'D', 14: 'D', 15: 'D',  // Weedle, Kakuna, Beedrill
  43: 'D', 44: 'D', 45: 'D',  // Oddish, Gloom, Vileplume
  69: 'D', 70: 'D', 71: 'D',  // Bellsprout, Weepinbell, Victreebel
  79: 'D', 80: 'D',           // Slowpoke, Slowbro
  102: 'D', 103: 'D',         // Exeggcute, Exeggutor
  108: 'D',                   // Lickitung
  113: 'D',                   // Chansey
  120: 'D', 121: 'D',         // Staryu, Starmie
  132: 'D',                   // Ditto

  // Group E (19 families, 26 species)
  21: 'E', 22: 'E',           // Spearow, Fearow
  39: 'E', 40: 'E',           // Jigglypuff, Wigglytuff
  52: 'E', 53: 'E',           // Meowth, Persian
  56: 'E', 57: 'E',           // Mankey, Primeape
  106: 'E',                   // Hitmonlee
  107: 'E',                   // Hitmonchan
  123: 'E',                   // Scyther
  127: 'E',                   // Pinsir
  128: 'E',                   // Tauros
  129: 'E', 130: 'E',         // Magikarp, Gyarados
  131: 'E',                   // Lapras
  142: 'E',                   // Aerodactyl
  143: 'E',                   // Snorlax
  144: 'E',                   // Articuno
  145: 'E',                   // Zapdos
  146: 'E',                   // Moltres
  147: 'E', 148: 'E', 149: 'E', // Dratini, Dragonair, Dragonite
  150: 'E',                   // Mewtwo
  151: 'E',                   // Mew
};

export function getUnlockGroupForPokemon(pokedexId?: number): UnlockGroup {
  if (!pokedexId) return 'B';
  return POKEMON_UNLOCK_GROUP_MAP[pokedexId] || 'B';
}

export function getUnlockLevelsForPokemon(
  pokedexId?: number
): readonly [number, number, number, number, number, number, number, number, number] {
  const group = getUnlockGroupForPokemon(pokedexId);
  return UNLOCK_GROUPS[group].levels;
}

export function getSlotUnlockLevel(slotIndex: number, pokedexId?: number): number {
  const levels = getUnlockLevelsForPokemon(pokedexId);
  return levels[Math.max(0, Math.min(8, slotIndex))];
}

export function isSlotUnlockedAtLevel(slotIndex: number, level: number, pokedexId?: number): boolean {
  const unlockLevel = getSlotUnlockLevel(slotIndex, pokedexId);
  return (level || 1) >= unlockLevel;
}

/**
 * Calculates how many Power Charm slots are unlocked for a given Pokémon level (1 to 100)
 * based on its unlock group.
 */
export function getUnlockedSlotsForLevel(level: number, pokedexId?: number): number {
  const lvl = Math.max(1, Math.min(100, Math.round(level) || 1));
  const levels = getUnlockLevelsForPokemon(pokedexId);
  let count = 0;
  for (let i = 0; i < levels.length; i++) {
    if (lvl >= levels[i]) count++;
  }
  return count;
}

/**
 * Pokémon Quest Stone Rarities & Colors (Gold, Silver, Bronze, Gray)
 * Based on the number of buffs / sub-stats.
 */
export type StoneRarity = 'GOLD' | 'SILVER' | 'BRONZE' | 'GRAY';

export interface StoneRarityMeta {
  rarity: StoneRarity;
  label: string;
  buffCount: number;
  cardBg: string;
  cardBorder: string;
  cardShadow: string;
  cardHeaderColor: string;
  badgeClass: string;
  slotBg: string;
  glowColor: string;
}

export const STONE_RARITY_CONFIG: Record<StoneRarity, StoneRarityMeta> = {
  GOLD: {
    rarity: 'GOLD',
    label: 'Gold',
    buffCount: 3,
    cardBg: 'bg-gradient-to-br from-[#3b2b0c] via-[#2a1e08] to-[#1a1305]',
    cardBorder: 'border-amber-400/80',
    cardShadow: 'shadow-[0_4px_0_#78350f,0_2px_10px_rgba(245,158,11,0.18)]',
    cardHeaderColor: 'text-amber-200',
    badgeClass: 'bg-amber-500/25 text-amber-300 border-amber-400/50',
    slotBg: 'bg-gradient-to-b from-[#3a2c0d] to-[#1e1606] border-amber-400/80 hover:border-amber-300',
    glowColor: '#F59E0B',
  },
  SILVER: {
    rarity: 'SILVER',
    label: 'Silver',
    buffCount: 2,
    cardBg: 'bg-gradient-to-br from-[#253040] via-[#1b2330] to-[#111720]',
    cardBorder: 'border-slate-300/80',
    cardShadow: 'shadow-[0_4px_0_#334155,0_2px_10px_rgba(203,213,225,0.18)]',
    cardHeaderColor: 'text-slate-100',
    badgeClass: 'bg-slate-400/25 text-slate-200 border-slate-300/50',
    slotBg: 'bg-gradient-to-b from-[#242f3f] to-[#121821] border-slate-300/80 hover:border-slate-200',
    glowColor: '#CBD5E1',
  },
  BRONZE: {
    rarity: 'BRONZE',
    label: 'Bronze',
    buffCount: 1,
    cardBg: 'bg-gradient-to-br from-[#361e12] via-[#26150c] to-[#170d07]',
    cardBorder: 'border-amber-600/80',
    cardShadow: 'shadow-[0_4px_0_#7c2d12,0_2px_10px_rgba(217,119,6,0.18)]',
    cardHeaderColor: 'text-amber-100',
    badgeClass: 'bg-amber-700/25 text-amber-300 border-amber-600/50',
    slotBg: 'bg-gradient-to-b from-[#341d11] to-[#190e08] border-amber-600/80 hover:border-amber-500',
    glowColor: '#D97706',
  },
  GRAY: {
    rarity: 'GRAY',
    label: 'Gray',
    buffCount: 0,
    cardBg: 'bg-gradient-to-br from-[#272a2e] via-[#1f2125] to-[#16181a]',
    cardBorder: 'border-neutral-600/70',
    cardShadow: 'shadow-[0_4px_0_#17191c]',
    cardHeaderColor: 'text-neutral-200',
    badgeClass: 'bg-neutral-800 text-neutral-400 border-neutral-700',
    slotBg: 'bg-gradient-to-b from-[#25282c] to-[#15171a] border-neutral-600/60 hover:border-neutral-500',
    glowColor: '#71717A',
  },
};

export function getStoneRarity(buffCount: number): StoneRarity {
  if (buffCount >= 3) return 'GOLD';
  if (buffCount === 2) return 'SILVER';
  if (buffCount === 1) return 'BRONZE';
  return 'GRAY';
}

export function getStoneRarityMeta(buffCount: number): StoneRarityMeta {
  const rarity = getStoneRarity(buffCount);
  return STONE_RARITY_CONFIG[rarity];
}


