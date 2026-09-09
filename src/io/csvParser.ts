import Papa from 'papaparse';
import type { PokemonProfile, PokemonSocket, PowerStone, SocketType, StatRequirements, StoneType, SubStat, SubStatType } from '../types';
import { SUB_STAT_KEYS, DEFAULT_PRIORITY_ORDER, isSlotUnlockedAtLevel, SUB_STAT_DEFINITIONS } from '../constants/stats';
import { GEN1_POKEDEX, getPokemonById } from '../constants/pokedex';
import { StoreDataSchema } from './validator';

export interface CsvImportResult {
  validStones: PowerStone[];
  errors: string[];
  totalRows: number;
}

export interface PokemonCsvImportResult {
  validPokemon: PokemonProfile[];
  errors: string[];
  totalRows: number;
}

export interface FullBackupData {
  stones: PowerStone[];
  pokemon: PokemonProfile[];
  teamPokemonIds?: string[];
  activePokemonId?: string | null;
  globalPriorities?: SubStatType[];
  globalMinRequirements?: StatRequirements;
}

// ---------------------------------------------------------------------------
// STONES CSV EXPORT & IMPORT
// ---------------------------------------------------------------------------

/**
 * Converts internal stones list into a formatted CSV string matching the TDD spec.
 */
export function exportStonesToCsv(stones: PowerStone[]): string {
  const headers = [
    'id',
    'type',
    'power',
    'substat1_name',
    'substat1_value',
    'substat2_name',
    'substat2_value',
    'substat3_name',
    'substat3_value',
    'is_locked',
    'assigned_pokemon_id',
    'assigned_slot_index',
  ];

  const rows = stones.map(s => {
    const sub1 = s.subStats[0];
    const sub2 = s.subStats[1];
    const sub3 = s.subStats[2];

    return [
      s.id,
      s.type,
      s.power.toString(),
      sub1 ? sub1.type : '',
      sub1 !== undefined ? sub1.value.toString() : '',
      sub2 ? sub2.type : '',
      sub2 !== undefined ? sub2.value.toString() : '',
      sub3 ? sub3.type : '',
      sub3 !== undefined ? sub3.value.toString() : '',
      s.isLocked ? 'true' : 'false',
      s.assignedPokemonId || '',
      s.assignedSlotIndex !== null && s.assignedSlotIndex !== undefined ? s.assignedSlotIndex.toString() : '',
    ];
  });

  return Papa.unparse({
    fields: headers,
    data: rows,
  });
}

/**
 * Triggers a browser download of the exported CSV data.
 */
export function downloadCsvFile(csvContent: string, filename = `pokemon_quest_stones_${new Date().toISOString().slice(0, 10)}.csv`): void {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Sanitizes and parses raw CSV string data into typed PowerStone objects.
 */
export function parseStonesFromCsv(csvText: string): CsvImportResult {
  const parseResult = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader: header => header.trim().toLowerCase().replace(/\s+/g, '_'),
  });

  const validStones: PowerStone[] = [];
  const errors: string[] = [];

  if (parseResult.errors && parseResult.errors.length > 0) {
    parseResult.errors.forEach(err => {
      errors.push(`Line ${err.row ?? '?'}: ${err.message}`);
    });
  }

  const rows = parseResult.data;

  rows.forEach((row, index) => {
    const rowNum = index + 2; // account for 1-based index and header line

    // Sanitize type
    const rawType = (row['type'] || '').trim().toUpperCase();
    if (rawType !== 'ATK' && rawType !== 'HP') {
      errors.push(`Row ${rowNum}: Invalid stone type "${row['type']}". Expected "ATK" or "HP".`);
      return;
    }
    const type: StoneType = rawType;

    // Sanitize power
    const rawPower = Number((row['power'] || '').trim());
    if (isNaN(rawPower) || rawPower <= 0) {
      errors.push(`Row ${rowNum}: Invalid primary power "${row['power']}". Must be a positive number.`);
      return;
    }
    const power = Math.min(999, Math.round(rawPower));

    // Sanitize sub-stats (up to 3)
    const subStats: SubStat[] = [];

    for (let i = 1; i <= 3; i++) {
      const nameKey = `substat${i}_name`;
      const valKey = `substat${i}_value`;

      let rawName = (row[nameKey] || '').trim().toUpperCase().replace(/[\s.-]+/g, '_');
      const rawValStr = (row[valKey] || '').trim();

      // Normalize common aliases
      if (rawName === 'HEALING_FROM_KO' || rawName === 'HEALING_FROM_K_O' || rawName === 'HEAL_ON_KO' || rawName === 'HEALING_KO') {
        rawName = 'HEAL_FROM_KO';
      }

      if (rawName && rawValStr !== '') {
        const rawVal = parseFloat(rawValStr);
        if (isNaN(rawVal) || rawVal < 0) {
          errors.push(`Row ${rowNum}: Invalid value "${rawValStr}" for substat ${i}.`);
          continue;
        }

        // Validate key
        if (SUB_STAT_KEYS.includes(rawName as SubStatType)) {
          subStats.push({
            type: rawName as SubStatType,
            value: Number(rawVal.toFixed(1)),
          });
        } else {
          errors.push(`Row ${rowNum}: Unknown substat type "${rawName}".`);
        }
      }
    }

    // ID handling
    let id = (row['id'] || '').trim();
    if (!id) {
      id = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `stone-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    }

    // Lock status
    const rawLocked = (row['is_locked'] || '').trim().toLowerCase();
    const isLocked = rawLocked === 'true' || rawLocked === '1' || rawLocked === 'yes';

    // Assignments
    const assignedPokemonId = (row['assigned_pokemon_id'] || '').trim() || null;
    const rawSlot = (row['assigned_slot_index'] || '').trim();
    let assignedSlotIndex: number | null = null;
    if (rawSlot !== '') {
      const slotNum = parseInt(rawSlot, 10);
      if (!isNaN(slotNum) && slotNum >= 0 && slotNum <= 8) {
        assignedSlotIndex = slotNum;
      }
    }

    validStones.push({
      id,
      type,
      power,
      subStats,
      isLocked,
      assignedPokemonId,
      assignedSlotIndex,
    });
  });

  return {
    validStones,
    errors,
    totalRows: rows.length,
  };
}

/**
 * Detects duplicate IDs between existing local inventory and newly imported stones.
 */
export function detectCsvConflicts(
  existingStones: PowerStone[],
  importedStones: PowerStone[]
): {
  duplicates: { existing: PowerStone; imported: PowerStone }[];
  newStones: PowerStone[];
} {
  const existingMap = new Map<string, PowerStone>();
  existingStones.forEach(s => existingMap.set(s.id, s));

  const duplicates: { existing: PowerStone; imported: PowerStone }[] = [];
  const newStones: PowerStone[] = [];

  importedStones.forEach(imported => {
    if (existingMap.has(imported.id)) {
      duplicates.push({
        existing: existingMap.get(imported.id)!,
        imported,
      });
    } else {
      newStones.push(imported);
    }
  });

  return {
    duplicates,
    newStones,
  };
}

// ---------------------------------------------------------------------------
// POKÉMON CSV EXPORT & IMPORT
// ---------------------------------------------------------------------------

/**
 * Converts configured Pokémon profiles into a formatted CSV string.
 */
export function exportPokemonToCsv(pokemon: PokemonProfile[]): string {
  const headers = [
    'id',
    'pokedex_id',
    'species_name',
    'nickname',
    'level',
    'slot_1_type',
    'slot_2_type',
    'slot_3_type',
    'slot_4_type',
    'slot_5_type',
    'slot_6_type',
    'slot_7_type',
    'slot_8_type',
    'slot_9_type',
    'use_custom_priorities',
    'priorities',
    'use_custom_min_requirements',
    'min_atk_power',
    'min_hp_power',
    'min_sub_stats',
  ];

  const rows = pokemon.map(p => {
    const species = getPokemonById(p.pokedexId);
    const slots = p.sockets || [];
    const prioritiesStr = (p.priorities || []).join('>');
    const minAtk = p.minRequirements?.minAtkPower ? p.minRequirements.minAtkPower.toString() : '';
    const minHp = p.minRequirements?.minHpPower ? p.minRequirements.minHpPower.toString() : '';
    const minSubs = p.minRequirements?.minSubStats
      ? Object.entries(p.minRequirements.minSubStats)
          .filter(([, val]) => val !== undefined && val > 0)
          .map(([k, v]) => `${k}:${v}`)
          .join(';')
      : '';

    return [
      p.id,
      p.pokedexId.toString(),
      species.name,
      p.name,
      (p.level || 100).toString(),
      slots[0]?.type || 'ATK',
      slots[1]?.type || 'ATK',
      slots[2]?.type || 'ATK',
      slots[3]?.type || 'ATK',
      slots[4]?.type || 'ATK',
      slots[5]?.type || 'ATK',
      slots[6]?.type || 'ATK',
      slots[7]?.type || 'ATK',
      slots[8]?.type || 'ATK',
      p.useCustomPriorities ? 'true' : 'false',
      prioritiesStr,
      p.useCustomMinRequirements ? 'true' : 'false',
      minAtk,
      minHp,
      minSubs,
    ];
  });

  return Papa.unparse({
    fields: headers,
    data: rows,
  });
}

/**
 * Parses Pokémon roster CSV string into typed PokemonProfile objects.
 */
export function parsePokemonFromCsv(csvText: string): PokemonCsvImportResult {
  const parseResult = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader: header => header.trim().toLowerCase().replace(/\s+/g, '_'),
  });

  const validPokemon: PokemonProfile[] = [];
  const errors: string[] = [];

  if (parseResult.errors && parseResult.errors.length > 0) {
    parseResult.errors.forEach(err => {
      errors.push(`Line ${err.row ?? '?'}: ${err.message}`);
    });
  }

  const rows = parseResult.data;

  rows.forEach((row, index) => {
    const rowNum = index + 2;

    // Pokedex ID
    let pokedexId = parseInt((row['pokedex_id'] || '').trim(), 10);
    if (isNaN(pokedexId) || pokedexId < 1 || pokedexId > 151) {
      // Try resolving by species_name
      const speciesName = (row['species_name'] || '').trim();
      const match = GEN1_POKEDEX.find(p => p.name.toLowerCase() === speciesName.toLowerCase());
      if (match) {
        pokedexId = match.id;
      } else {
        errors.push(`Row ${rowNum}: Invalid pokedex_id "${row['pokedex_id']}". Must be between 1 and 151.`);
        return;
      }
    }

    // Name / Nickname
    const nickname = (row['nickname'] || row['name'] || '').trim() || getPokemonById(pokedexId).name;

    // Level
    const rawLevel = parseInt((row['level'] || '').trim(), 10);
    const level = isNaN(rawLevel) ? 100 : Math.max(1, Math.min(100, rawLevel));

    // Sockets 1 to 9
    const sockets: PokemonSocket[] = [];
    for (let i = 0; i < 9; i++) {
      const slotCol = `slot_${i + 1}_type`;
      const rawSlotType = (row[slotCol] || row[`socket_${i + 1}`] || row[`socket_${i + 1}_type`] || '').trim().toUpperCase();
      let socketType: SocketType = 'ATK';
      if (rawSlotType === 'HP') socketType = 'HP';
      else if (rawSlotType === 'MULTI' || rawSlotType === 'MIXED') socketType = 'MULTI';
      else socketType = 'ATK';

      sockets.push({
        slotIndex: i,
        type: socketType,
        isUnlocked: isSlotUnlockedAtLevel(i, level, pokedexId),
      });
    }

    // Priorities
    const rawCustom = (row['use_custom_priorities'] || '').trim().toLowerCase();
    const useCustomPriorities = rawCustom === 'true' || rawCustom === '1' || rawCustom === 'yes';

    const rawPriorities = (row['priorities'] || '').trim();
    let priorities: SubStatType[] = DEFAULT_PRIORITY_ORDER;
    if (rawPriorities) {
      const tokens = rawPriorities.split(/[>,;|]+/).map(t => t.trim().toUpperCase().replace(/[\s.-]+/g, '_'));
      const parsedList: SubStatType[] = [];
      tokens.forEach(tok => {
        if (tok === 'HEALING_FROM_KO' || tok === 'HEAL_ON_KO') tok = 'HEAL_FROM_KO';
        if (SUB_STAT_KEYS.includes(tok as SubStatType) || tok === 'STAT_STRENGTH') {
          if (!parsedList.includes(tok as SubStatType)) {
            parsedList.push(tok as SubStatType);
          }
        }
      });
      if (parsedList.length > 0) {
        const missing = DEFAULT_PRIORITY_ORDER.filter(s => !parsedList.includes(s));
        priorities = [...parsedList, ...missing];
      }
    }

    // Minimum Requirements
    const rawCustomMin = (row['use_custom_min_requirements'] || '').trim().toLowerCase();
    const useCustomMinRequirements = rawCustomMin === 'true' || rawCustomMin === '1' || rawCustomMin === 'yes';

    let minRequirements: StatRequirements | undefined = undefined;
    const rawMinAtk = parseInt((row['min_atk_power'] || '').trim(), 10);
    const rawMinHp = parseInt((row['min_hp_power'] || '').trim(), 10);
    const rawMinSubs = (row['min_sub_stats'] || '').trim();

    const minSubStats: Partial<Record<SubStatType, number>> = {};
    if (rawMinSubs) {
      const parts = rawMinSubs.split(/[;,|]+/);
      parts.forEach(part => {
        const [statKeyRaw, valRaw] = part.split(':');
        if (statKeyRaw && valRaw) {
          let key = statKeyRaw.trim().toUpperCase().replace(/[\s.-]+/g, '_');
          if (key === 'HEALING_FROM_KO' || key === 'HEAL_ON_KO') key = 'HEAL_FROM_KO';
          const num = parseFloat(valRaw.trim());
          if (SUB_STAT_KEYS.includes(key as SubStatType) && !isNaN(num) && num > 0) {
            minSubStats[key as SubStatType] = Number(num.toFixed(1));
          }
        }
      });
    }

    if ((!isNaN(rawMinAtk) && rawMinAtk > 0) || (!isNaN(rawMinHp) && rawMinHp > 0) || Object.keys(minSubStats).length > 0) {
      minRequirements = {
        minAtkPower: !isNaN(rawMinAtk) && rawMinAtk > 0 ? rawMinAtk : undefined,
        minHpPower: !isNaN(rawMinHp) && rawMinHp > 0 ? rawMinHp : undefined,
        minSubStats: Object.keys(minSubStats).length > 0 ? minSubStats : undefined,
      };
    }

    // ID
    let id = (row['id'] || '').trim();
    if (!id) {
      id = typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `poke-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    }

    validPokemon.push({
      id,
      pokedexId,
      name: nickname,
      level,
      sockets,
      useCustomPriorities,
      priorities,
      useCustomMinRequirements,
      minRequirements,
    });
  });

  return {
    validPokemon,
    errors,
    totalRows: rows.length,
  };
}

/**
 * Detects duplicate IDs between existing local Pokémon and newly imported Pokémon.
 */
export function detectPokemonConflicts(
  existingPokemon: PokemonProfile[],
  importedPokemon: PokemonProfile[]
): {
  duplicates: { existing: PokemonProfile; imported: PokemonProfile }[];
  newPokemon: PokemonProfile[];
} {
  const existingMap = new Map<string, PokemonProfile>();
  existingPokemon.forEach(p => existingMap.set(p.id, p));

  const duplicates: { existing: PokemonProfile; imported: PokemonProfile }[] = [];
  const newPokemon: PokemonProfile[] = [];

  importedPokemon.forEach(imported => {
    if (existingMap.has(imported.id)) {
      duplicates.push({
        existing: existingMap.get(imported.id)!,
        imported,
      });
    } else {
      newPokemon.push(imported);
    }
  });

  return {
    duplicates,
    newPokemon,
  };
}

// ---------------------------------------------------------------------------
// FULL BACKUP (JSON) EXPORT & IMPORT
// ---------------------------------------------------------------------------

/**
 * Exports complete application snapshot (Pokémon, Stones, Active Team, Priorities) to JSON.
 */
export function exportFullBackup(data: FullBackupData): string {
  const payload = {
    version: 1,
    exportedAt: new Date().toISOString(),
    pokemon: data.pokemon,
    stones: data.stones,
    teamPokemonIds: data.teamPokemonIds || data.pokemon.slice(0, 3).map(p => p.id),
    activePokemonId: data.activePokemonId || data.pokemon[0]?.id || null,
    globalPriorities: data.globalPriorities || DEFAULT_PRIORITY_ORDER,
    globalMinRequirements: data.globalMinRequirements || undefined,
  };
  return JSON.stringify(payload, null, 2);
}

/**
 * Triggers a browser download of JSON backup content.
 */
export function downloadJsonFile(
  jsonContent: string,
  filename = `pokemon_quest_backup_${new Date().toISOString().slice(0, 10)}.json`
): void {
  const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Safely parses and validates a Full Backup JSON string.
 */
export function parseFullBackupJson(jsonText: string): {
  data: FullBackupData | null;
  errors: string[];
} {
  try {
    const raw = JSON.parse(jsonText);
    const parsed = StoreDataSchema.safeParse(raw);
    if (!parsed.success) {
      return {
        data: null,
        errors: parsed.error.issues.map(i => `${i.path.join('.')}: ${i.message}`),
      };
    }
    return {
      data: {
        stones: (parsed.data.stones || []) as PowerStone[],
        pokemon: (parsed.data.pokemon || []) as PokemonProfile[],
        teamPokemonIds: parsed.data.teamPokemonIds,
        activePokemonId: parsed.data.activePokemonId,
        globalPriorities: parsed.data.globalPriorities,
        globalMinRequirements: parsed.data.globalMinRequirements,
      },
      errors: [],
    };
  } catch (err: any) {
    return {
      data: null,
      errors: [`JSON parse error: ${err?.message || 'Invalid JSON format'}`],
    };
  }
}

// ---------------------------------------------------------------------------
// POKÉMON QUEST GAME SAVE (USER.JSON / PQSAVE / PQSE) IMPORT
// ---------------------------------------------------------------------------

export interface UserJsonImportResult {
  validStones: PowerStone[];
  validPokemon: PokemonProfile[];
  errors: string[];
  warnings: string[];
  totalStonesFound: number;
  totalPokemonFound: number;
}

/**
 * Normalizes stone type representation from user.json.
 * Handles 'ATK', 'HP', numbers 1 (ATK) / 2 (HP), 'Mighty', 'Sturdy', etc.
 */
export function normalizeStoneType(raw: any): StoneType | null {
  if (raw === undefined || raw === null) return null;

  if (typeof raw === 'number') {
    if (raw === 1) return 'ATK';
    if (raw === 2) return 'HP';
    if (raw === 0) return 'ATK';
  }

  const str = String(raw).trim().toUpperCase();
  if (str === 'ATK' || str === 'MIGHTY' || str === 'ATTACK' || str === '1') return 'ATK';
  if (str === 'HP' || str === 'STURDY' || str === 'HEALTH' || str === 'DEFENSE' || str === '2') return 'HP';

  return null;
}

/**
 * Normalizes socket type representation from user.json.
 * Handles 'ATK', 'HP', 'MULTI', numbers 0/1/2, 'Any', 'Mixed', etc.
 */
export function normalizeSocketType(raw: any): SocketType {
  if (raw === undefined || raw === null) return 'MULTI';

  if (typeof raw === 'number') {
    if (raw === 1) return 'ATK';
    if (raw === 2) return 'HP';
    if (raw === 3 || raw === 0) return 'MULTI';
  }

  const str = String(raw).trim().toUpperCase();
  if (str === 'ATK' || str === 'MIGHTY' || str === 'ATTACK' || str === '1') return 'ATK';
  if (str === 'HP' || str === 'STURDY' || str === 'HEALTH' || str === 'DEFENSE' || str === '2') return 'HP';
  if (str === 'MULTI' || str === 'MIXED' || str === 'ANY' || str === 'BOTH' || str === '3' || str === '0') return 'MULTI';

  return 'MULTI';
}

/**
 * Normalizes sub-stat type identifier from user.json / PqSave / PQSE.
 * Handles canonical keys, labels, snake_case, and integer enum IDs (0-10).
 */
export function normalizeSubStatType(raw: any): SubStatType | null {
  if (raw === undefined || raw === null) return null;

  // Numeric enum code mapping (0-10)
  if (typeof raw === 'number' || (!isNaN(Number(raw)) && typeof raw === 'string' && raw.trim() !== '')) {
    const code = Number(raw);
    switch (code) {
      case 0: return 'HIT_HEAL';
      case 1: return 'CRIT_RATE';
      case 2: return 'CRIT_DMG';
      case 3: return 'STATUS_RESIST';
      case 4: return 'STAT_LOWER_RESIST';
      case 5: return 'MOVE_SPEED';
      case 6: return 'NATURAL_HEAL';
      case 7: return 'TIME_TO_RECOVER';
      case 8: return 'HP_UPON_RECOVERY';
      case 9: return 'HEAL_FROM_KO';
      case 10: return 'STAT_STRENGTH';
      default: break;
    }
  }

  const str = String(raw).trim().toUpperCase().replace(/[\s\-_%]/g, '');

  if (str === 'HITHEAL' || str === 'HITHEALING' || str === 'HEALINGONHIT') return 'HIT_HEAL';
  if (str === 'HEALFROMKO' || str === 'HEALINGFROMKO' || str === 'KOHEAL' || str === 'HEALONKO') return 'HEAL_FROM_KO';
  if (str === 'CRITRATE' || str === 'CRITICALHITRATE' || str === 'CRITICALRATE') return 'CRIT_RATE';
  if (str === 'CRITDMG' || str === 'CRITICALHITDAMAGE' || str === 'CRITICALDAMAGE' || str === 'CRITDAMAGE') return 'CRIT_DMG';
  if (str === 'STATUSRESIST' || str === 'RESISTSTATUSCONDITIONS' || str === 'STATUSRESISTANCE' || str === 'STATUSCONDITIONRESIST') return 'STATUS_RESIST';
  if (str === 'STATLOWERRESIST' || str === 'RESISTTOEFFECTS' || str === 'RESISTEFFECTS' || str === 'STATDOWNRESIST' || str === 'STATLOWRESIST') return 'STAT_LOWER_RESIST';
  if (str === 'MOVESPEED' || str === 'MOVEMENTSPEED' || str === 'SPEED') return 'MOVE_SPEED';
  if (str === 'NATURALHEAL' || str === 'NATURALHPHEALING' || str === 'NATURALHEALING' || str === 'HPRECOVERY') return 'NATURAL_HEAL';
  if (str === 'TIMETORECOVER' || str === 'TIMERECOVER' || str === 'REVIVALTIME' || str === 'RECOVERYTIME') return 'TIME_TO_RECOVER';
  if (str === 'HPUPONRECOVERY' || str === 'HPONRECOVERY' || str === 'HPONREVIVAL' || str === 'REVIVALHP') return 'HP_UPON_RECOVERY';
  if (str === 'STATSTRENGTH' || str === 'STRENGTH' || str === 'POWER') return 'STAT_STRENGTH';

  return null;
}

/**
 * Normalizes sub-stat numerical values.
 * Auto-detects fixed-point integers (e.g. 25 for 2.5% when stepMax is 2.9%).
 */
export function normalizeSubStatValue(type: SubStatType, rawVal: any): number {
  if (rawVal === undefined || rawVal === null) return 0;

  let val = typeof rawVal === 'number' ? rawVal : parseFloat(String(rawVal).replace(/[^0-9.-]/g, ''));
  if (isNaN(val)) return 0;

  val = Math.abs(val);

  const def = SUB_STAT_DEFINITIONS[type];
  if (def) {
    // If value is multiplied by 10 (e.g. 25 instead of 2.5 for Hit Healing, or 250 for 25.0% Crit Rate)
    if (val > def.stepMax * 3 && val / 10 <= def.stepMax * 1.5) {
      val = val / 10;
    }
  }

  return Number(val.toFixed(1));
}

/**
 * Checks whether an arbitrary JSON object represents a Pokémon Quest user.json save file.
 */
export function isUserJsonSave(data: any): boolean {
  if (!data || typeof data !== 'object') return false;

  const root = data.save_data || data.user_data || data.data || data.PqSaveData || data.Save || data;

  const hasStonesArray = Array.isArray(root.stones) || Array.isArray(root.power_stones) || Array.isArray(root.p_stones) || Array.isArray(root.pstones) || Array.isArray(root.items);
  const hasPokemonArray = Array.isArray(root.pokemon) || Array.isArray(root.pokemons) || Array.isArray(root.monsters) || Array.isArray(root.Monster);

  return Boolean(hasStonesArray || hasPokemonArray);
}

/**
 * Parses stones and Pokémon from a Pokémon Quest user.json file (e.g. from PqSave, PQSE, Checkpoint).
 */
export function parseUserJsonSave(jsonText: string): UserJsonImportResult {
  const result: UserJsonImportResult = {
    validStones: [],
    validPokemon: [],
    errors: [],
    warnings: [],
    totalStonesFound: 0,
    totalPokemonFound: 0,
  };

  let parsed: any;
  try {
    parsed = JSON.parse(jsonText);
  } catch (err: any) {
    result.errors.push(`Invalid JSON format: ${err?.message || 'Syntax Error'}`);
    return result;
  }

  if (!parsed || typeof parsed !== 'object') {
    result.errors.push('Uploaded JSON is not an object.');
    return result;
  }

  const root = parsed.save_data || parsed.user_data || parsed.data || parsed.PqSaveData || parsed.Save || parsed;

  // 1. Parse Pokémon first (so stones can link to them)
  const rawPokemonList: any[] = root.pokemon || root.pokemons || root.monsters || root.Monster || root.party || [];
  const pokemonIdMap = new Map<string | number, string>();

  rawPokemonList.forEach((rawPoke, pIndex) => {
    if (!rawPoke || typeof rawPoke !== 'object') return;
    result.totalPokemonFound++;

    try {
      let pokedexId = rawPoke.pokedex_id ?? rawPoke.pokedexId ?? rawPoke.species_id ?? rawPoke.dex_no ?? rawPoke.monster_no ?? rawPoke.monster_id ?? rawPoke.pokemon_id;
      if (typeof pokedexId === 'string' && isNaN(Number(pokedexId))) {
        const match = GEN1_POKEDEX.find(p => p.name.toLowerCase() === pokedexId.trim().toLowerCase());
        pokedexId = match ? match.id : 1;
      } else {
        pokedexId = Number(pokedexId);
      }

      if (isNaN(pokedexId) || pokedexId < 1 || pokedexId > 151) {
        result.warnings.push(`Pokemon at index ${pIndex} has invalid Pokédex ID ${pokedexId}, defaulting to Bulbasaur (#1).`);
        pokedexId = 1;
      }

      const speciesMeta = getPokemonById(pokedexId);
      const name = rawPoke.name || rawPoke.nickname || speciesMeta?.name || `Pokémon #${pokedexId}`;

      let level = Number(rawPoke.level ?? rawPoke.lvl ?? 100);
      if (isNaN(level) || level < 1) level = 1;
      if (level > 100) level = 100;

      const pokeId = rawPoke.id ? String(rawPoke.id) : `userjson_p_${pIndex}_${pokedexId}_${Date.now().toString(36)}`;
      pokemonIdMap.set(rawPoke.id ?? pIndex, pokeId);

      const rawSockets = rawPoke.sockets || rawPoke.slots || rawPoke.stone_slots || rawPoke.p_stone_slots || [];
      const sockets: PokemonSocket[] = [];

      for (let sIdx = 0; sIdx < 9; sIdx++) {
        const rawSocket = Array.isArray(rawSockets) ? rawSockets[sIdx] : undefined;
        let socketType: SocketType = 'MULTI';

        if (rawSocket) {
          if (typeof rawSocket === 'object') {
            socketType = normalizeSocketType(rawSocket.type ?? rawSocket.socket_type ?? rawSocket.kind);
          } else {
            socketType = normalizeSocketType(rawSocket);
          }
        }

        sockets.push({
          slotIndex: sIdx,
          type: socketType,
          isUnlocked: isSlotUnlockedAtLevel(sIdx, level),
        });
      }

      result.validPokemon.push({
        id: pokeId,
        pokedexId,
        name,
        level,
        sockets,
        priorities: undefined,
        useCustomPriorities: false,
      });

      // Check if this Pokemon has embedded equipped stones in slots
      if (Array.isArray(rawPoke.slots)) {
        rawPoke.slots.forEach((slotItem: any, sIdx: number) => {
          if (slotItem && typeof slotItem === 'object' && (slotItem.stone || slotItem.power_stone || slotItem.p_stone)) {
            const stoneObj = slotItem.stone || slotItem.power_stone || slotItem.p_stone;
            parseAndAddStone(stoneObj, pokeId, sIdx);
          }
        });
      }

      if (Array.isArray(rawPoke.equipped_stones) || Array.isArray(rawPoke.equippedStones)) {
        const equippedList = rawPoke.equipped_stones || rawPoke.equippedStones;
        equippedList.forEach((stoneObj: any, sIdx: number) => {
          if (stoneObj && typeof stoneObj === 'object') {
            parseAndAddStone(stoneObj, pokeId, stoneObj.slot_index ?? stoneObj.slot ?? sIdx);
          }
        });
      }
    } catch (err: any) {
      result.errors.push(`Error parsing Pokemon at index ${pIndex}: ${err?.message || 'Unknown error'}`);
    }
  });

  // 2. Parse general stone collection / inventory
  const rawStonesList: any[] = root.stones || root.power_stones || root.p_stones || root.pstones || root.stone_list || root.items || [];

  function parseAndAddStone(rawStone: any, defaultPokeId: string | null = null, defaultSlotIndex: number | null = null) {
    if (!rawStone || typeof rawStone !== 'object') return;
    result.totalStonesFound++;

    const stoneType = normalizeStoneType(rawStone.type ?? rawStone.stone_type ?? rawStone.kind);
    if (!stoneType) {
      result.warnings.push(`Stone #${result.totalStonesFound} skipped: invalid stone type.`);
      return;
    }

    let power = Number(rawStone.power ?? rawStone.value ?? rawStone.power_value ?? rawStone.stat_value ?? 500);
    if (isNaN(power) || power < 1) power = 1;
    if (power > 999) power = 999;

    const rawSubStats = rawStone.sub_stats ?? rawStone.subStats ?? rawStone.sub_effects ?? rawStone.subEffects ?? rawStone.effects ?? rawStone.attributes ?? [];
    const subStats: SubStat[] = [];

    if (Array.isArray(rawSubStats)) {
      for (const rawSub of rawSubStats) {
        if (!rawSub) continue;
        const subType = normalizeSubStatType(rawSub.type ?? rawSub.id ?? rawSub.effect_type ?? rawSub.name ?? rawSub.key);
        if (!subType) continue;

        const subVal = normalizeSubStatValue(subType, rawSub.value ?? rawSub.val ?? rawSub.amount ?? rawSub.percentage);
        subStats.push({ type: subType, value: subVal });
        if (subStats.length >= 3) break;
      }
    } else if (typeof rawSubStats === 'object') {
      for (const [key, val] of Object.entries(rawSubStats)) {
        const subType = normalizeSubStatType(key);
        if (!subType) continue;
        const subVal = normalizeSubStatValue(subType, val);
        subStats.push({ type: subType, value: subVal });
        if (subStats.length >= 3) break;
      }
    }

    let assignedPokemonId: string | null = defaultPokeId;
    let assignedSlotIndex: number | null = defaultSlotIndex;

    const rawAssignedPoke = rawStone.assigned_pokemon_id ?? rawStone.assignedPokemonId ?? rawStone.pokemon_id ?? rawStone.assigned_to;
    if (rawAssignedPoke !== undefined && rawAssignedPoke !== null && rawAssignedPoke !== '') {
      assignedPokemonId = pokemonIdMap.get(rawAssignedPoke) || String(rawAssignedPoke);
    }

    const rawSlotIndex = rawStone.assigned_slot_index ?? rawStone.assignedSlotIndex ?? rawStone.slot_index ?? rawStone.slot;
    if (rawSlotIndex !== undefined && rawSlotIndex !== null && !isNaN(Number(rawSlotIndex))) {
      const idx = Number(rawSlotIndex);
      if (idx >= 0 && idx <= 8) {
        assignedSlotIndex = idx;
      }
    }

    const isLocked = Boolean(rawStone.is_locked ?? rawStone.isLocked ?? rawStone.locked ?? false);
    const stoneId = rawStone.id ? String(rawStone.id) : `userjson_s_${result.validStones.length}_${Date.now().toString(36)}`;

    if (result.validStones.some(s => s.id === stoneId)) return;

    result.validStones.push({
      id: stoneId,
      type: stoneType,
      power,
      subStats,
      isLocked,
      assignedPokemonId,
      assignedSlotIndex,
    });
  }

  rawStonesList.forEach((stoneObj) => {
    parseAndAddStone(stoneObj);
  });

  return result;
}
