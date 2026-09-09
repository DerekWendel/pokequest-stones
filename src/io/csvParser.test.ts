import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import {
  exportStonesToCsv,
  parseStonesFromCsv,
  detectCsvConflicts,
  exportPokemonToCsv,
  parsePokemonFromCsv,
  exportFullBackup,
  parseFullBackupJson,
  parseUserJsonSave,
  isUserJsonSave,
} from './csvParser';
import type { PowerStone } from '../types';

describe('CSV Pipeline', () => {
  const sampleStones: PowerStone[] = [
    {
      id: 'c2a3-481e',
      type: 'ATK',
      power: 980,
      subStats: [
        { type: 'HIT_HEAL', value: 2.8 },
        { type: 'CRIT_RATE', value: 18.4 },
        { type: 'CRIT_DMG', value: 22.1 },
      ],
      isLocked: false,
      assignedPokemonId: 'poke-001',
      assignedSlotIndex: 0,
    },
    {
      id: 'd9f1-901a',
      type: 'HP',
      power: 895,
      subStats: [
        { type: 'STATUS_RESIST', value: 25.0 },
        { type: 'HIT_HEAL', value: 2.5 },
      ],
      isLocked: true,
      assignedPokemonId: 'poke-001',
      assignedSlotIndex: 1,
    },
  ];

  it('exports and round-trips CSV accurately', () => {
    const csv = exportStonesToCsv(sampleStones);
    expect(csv).toContain('id,type,power');
    expect(csv).toContain('c2a3-481e');
    expect(csv).toContain('HIT_HEAL');
    expect(csv).toContain('2.8');

    const parsed = parseStonesFromCsv(csv);
    expect(parsed.errors.length).toBe(0);
    expect(parsed.validStones.length).toBe(2);

    const first = parsed.validStones[0];
    expect(first.id).toBe('c2a3-481e');
    expect(first.type).toBe('ATK');
    expect(first.power).toBe(980);
    expect(first.subStats.length).toBe(3);
    expect(first.subStats[0].type).toBe('HIT_HEAL');
    expect(first.subStats[0].value).toBe(2.8);
    expect(first.assignedPokemonId).toBe('poke-001');
    expect(first.assignedSlotIndex).toBe(0);
  });

  it('handles dirty data, lowercase tokens, and missing ids', () => {
    const dirtyCsv = `
id,type,power,substat1_name,substat1_value,substat2_name,substat2_value,substat3_name,substat3_value,is_locked,assigned_pokemon_id,assigned_slot_index
, atk , 950 , hit_heal , 2.5 , , , , , no , , 
stone-999, HP , 800 , status-resist , 20.0 , crit rate , 15.0 , , , true , poke-1 , 3
`;

    const parsed = parseStonesFromCsv(dirtyCsv);
    expect(parsed.validStones.length).toBe(2);
    expect(parsed.validStones[0].id).toBeTruthy(); // Auto-assigned UUID
    expect(parsed.validStones[0].type).toBe('ATK');
    expect(parsed.validStones[0].power).toBe(950);
    expect(parsed.validStones[0].subStats[0].type).toBe('HIT_HEAL');
    expect(parsed.validStones[0].subStats[0].value).toBe(2.5);

    expect(parsed.validStones[1].id).toBe('stone-999');
    expect(parsed.validStones[1].type).toBe('HP');
    expect(parsed.validStones[1].isLocked).toBe(true);
    expect(parsed.validStones[1].subStats.length).toBe(2);
    expect(parsed.validStones[1].subStats[0].type).toBe('STATUS_RESIST');
    expect(parsed.validStones[1].subStats[1].type).toBe('CRIT_RATE');
  });

  it('correctly parses STAT_LOWER_RESIST from CSV', () => {
    const csv = `
id,type,power,substat1_name,substat1_value,substat2_name,substat2_value,substat3_name,substat3_value,is_locked,assigned_pokemon_id,assigned_slot_index
s-stat-down,HP,950,stat_lower_resist,25.5,stat-lower-resist,15.0,,,false,,
`;
    const parsed = parseStonesFromCsv(csv);
    expect(parsed.errors.length).toBe(0);
    expect(parsed.validStones.length).toBe(1);
    expect(parsed.validStones[0].subStats[0].type).toBe('STAT_LOWER_RESIST');
    expect(parsed.validStones[0].subStats[0].value).toBe(25.5);
    expect(parsed.validStones[0].subStats[1].type).toBe('STAT_LOWER_RESIST');
    expect(parsed.validStones[0].subStats[1].value).toBe(15.0);
  });

  it('detects duplicate ID conflicts between existing and imported stones', () => {
    const existing = [sampleStones[0]];
    const imported = [
      { ...sampleStones[0], power: 999 }, // Duplicate ID
      sampleStones[1], // New ID
    ];

    const conflicts = detectCsvConflicts(existing, imported);
    expect(conflicts.duplicates.length).toBe(1);
    expect(conflicts.duplicates[0].existing.power).toBe(980);
    expect(conflicts.duplicates[0].imported.power).toBe(999);
    expect(conflicts.newStones.length).toBe(1);
  });

  it('exports and round-trips Pokemon profiles CSV accurately with priorities and minimum requirements', () => {
    const samplePokemon: any[] = [
      {
        id: 'poke-01',
        pokedexId: 1,
        name: 'Expedition Bulbasaur',
        level: 85,
        useCustomPriorities: true,
        useCustomMinRequirements: true,
        priorities: ['HIT_HEAL', 'CRIT_RATE', 'STAT_LOWER_RESIST'],
        minRequirements: {
          minAtkPower: 2500,
          minHpPower: 1800,
          minSubStats: {
            HIT_HEAL: 10.0,
            STATUS_RESIST: 50.0,
          },
        },
        sockets: [
          { slotIndex: 0, type: 'ATK', isUnlocked: true },
          { slotIndex: 1, type: 'HP', isUnlocked: true },
          { slotIndex: 2, type: 'MULTI', isUnlocked: true },
          { slotIndex: 3, type: 'ATK', isUnlocked: true },
          { slotIndex: 4, type: 'ATK', isUnlocked: true },
          { slotIndex: 5, type: 'HP', isUnlocked: true },
          { slotIndex: 6, type: 'MULTI', isUnlocked: true },
          { slotIndex: 7, type: 'HP', isUnlocked: true },
          { slotIndex: 8, type: 'ATK', isUnlocked: false },
        ],
      },
    ];

    const csv = exportPokemonToCsv(samplePokemon);
    expect(csv).toContain('id,pokedex_id,species_name,nickname');
    expect(csv).toContain('poke-01');
    expect(csv).toContain('Expedition Bulbasaur');
    expect(csv).toContain('85');
    expect(csv).toContain('2500');
    expect(csv).toContain('1800');
    expect(csv).toContain('HIT_HEAL:10');

    const parsed = parsePokemonFromCsv(csv);
    expect(parsed.errors.length).toBe(0);
    expect(parsed.validPokemon.length).toBe(1);

    const first = parsed.validPokemon[0];
    expect(first.id).toBe('poke-01');
    expect(first.pokedexId).toBe(1);
    expect(first.name).toBe('Expedition Bulbasaur');
    expect(first.level).toBe(85);
    expect(first.useCustomPriorities).toBe(true);
    expect(first.useCustomMinRequirements).toBe(true);
    expect(first.sockets[2].type).toBe('MULTI');
    expect(first.priorities?.[0]).toBe('HIT_HEAL');
    expect(first.minRequirements?.minAtkPower).toBe(2500);
    expect(first.minRequirements?.minHpPower).toBe(1800);
    expect(first.minRequirements?.minSubStats?.HIT_HEAL).toBe(10.0);
    expect(first.minRequirements?.minSubStats?.STATUS_RESIST).toBe(50.0);
  });

  it('exports and round-trips full application backup JSON with global and per-pokemon priorities and minimum requirements', () => {
    const backupData = {
      stones: sampleStones,
      pokemon: [
        {
          id: 'poke-01',
          pokedexId: 95,
          name: 'Rock Solid Onix',
          level: 100,
          useCustomPriorities: true,
          priorities: ['STAT_LOWER_RESIST' as const, 'HIT_HEAL' as const],
          minRequirements: {
            minAtkPower: 3000,
            minSubStats: {
              HIT_HEAL: 10.0,
            },
          },
          sockets: Array.from({ length: 9 }, (_, idx) => ({
            slotIndex: idx,
            type: idx % 2 === 0 ? ('ATK' as const) : ('HP' as const),
            isUnlocked: true,
          })),
        },
      ],
      teamPokemonIds: ['poke-01'],
      activePokemonId: 'poke-01',
      globalPriorities: ['HIT_HEAL' as const, 'CRIT_RATE' as const],
      globalMinRequirements: {
        minAtkPower: 2000,
        minHpPower: 2000,
        minSubStats: {
          CRIT_RATE: 50.0,
        },
      },
    };

    const jsonStr = exportFullBackup(backupData);
    expect(jsonStr).toContain('Rock Solid Onix');
    expect(jsonStr).toContain('c2a3-481e');
    expect(jsonStr).toContain('globalMinRequirements');

    const parsed = parseFullBackupJson(jsonStr);
    expect(parsed.errors.length).toBe(0);
    expect(parsed.data).not.toBeNull();
    expect(parsed.data?.pokemon.length).toBe(1);
    expect(parsed.data?.stones.length).toBe(2);
    expect(parsed.data?.teamPokemonIds).toEqual(['poke-01']);
    expect(parsed.data?.globalPriorities).toEqual(['HIT_HEAL', 'CRIT_RATE']);
    expect(parsed.data?.globalMinRequirements?.minAtkPower).toBe(2000);
    expect(parsed.data?.globalMinRequirements?.minSubStats?.CRIT_RATE).toBe(50.0);
    expect(parsed.data?.pokemon[0].minRequirements?.minAtkPower).toBe(3000);
  });

  describe('Pokémon Quest Game Save (user.json) Import Pipeline', () => {
    it('correctly parses PqSave / PQSE style stones with numeric IDs and string names', () => {
      const userJson = JSON.stringify({
        save_data: {
          stones: [
            {
              id: 'pq-stone-1',
              type: 1, // ATK
              power: 998,
              sub_effects: [
                { type: 0, value: 2.8 }, // HIT_HEAL
                { type: 1, value: 25.4 }, // CRIT_RATE
                { type: 2, value: 28.1 }, // CRIT_DMG
              ],
              is_locked: true,
            },
            {
              id: 'pq-stone-2',
              type: 'HP',
              power: 850,
              sub_stats: [
                { type: 'STATUS_RESIST', value: 29.9 },
                { type: 'STAT_LOWER_RESIST', value: 25.0 },
              ],
              is_locked: false,
            },
          ],
        },
      });

      expect(isUserJsonSave(JSON.parse(userJson))).toBe(true);

      const parsed = parseUserJsonSave(userJson);
      expect(parsed.errors.length).toBe(0);
      expect(parsed.validStones.length).toBe(2);

      const s1 = parsed.validStones[0];
      expect(s1.id).toBe('pq-stone-1');
      expect(s1.type).toBe('ATK');
      expect(s1.power).toBe(998);
      expect(s1.isLocked).toBe(true);
      expect(s1.subStats.length).toBe(3);
      expect(s1.subStats[0]).toEqual({ type: 'HIT_HEAL', value: 2.8 });
      expect(s1.subStats[1]).toEqual({ type: 'CRIT_RATE', value: 25.4 });
      expect(s1.subStats[2]).toEqual({ type: 'CRIT_DMG', value: 28.1 });

      const s2 = parsed.validStones[1];
      expect(s2.id).toBe('pq-stone-2');
      expect(s2.type).toBe('HP');
      expect(s2.power).toBe(850);
      expect(s2.subStats.length).toBe(2);
      expect(s2.subStats[0]).toEqual({ type: 'STATUS_RESIST', value: 29.9 });
      expect(s2.subStats[1]).toEqual({ type: 'STAT_LOWER_RESIST', value: 25.0 });
    });

    it('auto-detects and normalizes fixed-point integer values (e.g. 25 for 2.5% Hit Healing)', () => {
      const userJson = JSON.stringify({
        stones: [
          {
            type: 'ATK',
            power: 900,
            sub_stats: [
              { type: 'HIT_HEAL', value: 28 }, // 28 -> 2.8%
              { type: 'CRIT_RATE', value: 250 }, // 250 -> 25.0%
              { type: 'NATURAL_HEAL', value: 650 }, // 650 -> 65.0%
            ],
          },
        ],
      });

      const parsed = parseUserJsonSave(userJson);
      expect(parsed.validStones.length).toBe(1);
      const s = parsed.validStones[0];
      expect(s.subStats[0]).toEqual({ type: 'HIT_HEAL', value: 2.8 });
      expect(s.subStats[1]).toEqual({ type: 'CRIT_RATE', value: 25.0 });
      expect(s.subStats[2]).toEqual({ type: 'NATURAL_HEAL', value: 65.0 });
    });

    it('correctly parses Pokémon profiles and embedded equipped stones from user.json', () => {
      const userJson = JSON.stringify({
        pokemon: [
          {
            id: 'm1',
            pokedex_id: 68, // Machamp
            name: 'Champ',
            level: 100,
            slots: [
              {
                slot_index: 0,
                type: 'ATK',
                stone: {
                  id: 'stone-slot-0',
                  type: 'ATK',
                  power: 950,
                  sub_stats: [{ type: 'HIT_HEAL', value: 2.5 }],
                },
              },
              {
                slot_index: 1,
                type: 'HP',
              },
            ],
          },
        ],
      });

      const parsed = parseUserJsonSave(userJson);
      expect(parsed.validPokemon.length).toBe(1);
      expect(parsed.validPokemon[0].name).toBe('Champ');
      expect(parsed.validPokemon[0].pokedexId).toBe(68);
      expect(parsed.validPokemon[0].sockets[0].type).toBe('ATK');
      expect(parsed.validPokemon[0].sockets[1].type).toBe('HP');

      expect(parsed.validStones.length).toBe(1);
      expect(parsed.validStones[0].id).toBe('stone-slot-0');
      expect(parsed.validStones[0].assignedPokemonId).toBe('m1');
      expect(parsed.validStones[0].assignedSlotIndex).toBe(0);
    });

    it('evaluates against real-world PqSave JSON fixture file on disk', () => {
      const fixturePath = path.resolve(__dirname, 'fixtures/user_pqsave_sample.json');
      const fileContent = fs.readFileSync(fixturePath, 'utf-8');

      expect(isUserJsonSave(JSON.parse(fileContent))).toBe(true);

      const parsed = parseUserJsonSave(fileContent);
      expect(parsed.errors.length).toBe(0);
      expect(parsed.validPokemon.length).toBe(2);
      expect(parsed.validStones.length).toBe(3);

      // Machamp with 100 level and 9 sockets
      const machamp = parsed.validPokemon.find(p => p.name === 'Machamp');
      expect(machamp).toBeDefined();
      expect(machamp?.pokedexId).toBe(68);
      expect(machamp?.level).toBe(100);
      expect(machamp?.sockets.length).toBe(9);
      expect(machamp?.sockets.every(s => s.isUnlocked)).toBe(true);

      // Alakazam with 95 level
      const alakazam = parsed.validPokemon.find(p => p.name === 'Alakazam');
      expect(alakazam).toBeDefined();
      expect(alakazam?.pokedexId).toBe(65);
      expect(alakazam?.level).toBe(95);

      // Gold 998 ATK stone
      const s1 = parsed.validStones.find(s => s.id === 'stone_atk_gold_998');
      expect(s1).toBeDefined();
      expect(s1?.type).toBe('ATK');
      expect(s1?.power).toBe(998);
      expect(s1?.isLocked).toBe(true);
      expect(s1?.assignedPokemonId).toBe('p_machamp_01');
      expect(s1?.assignedSlotIndex).toBe(0);
      expect(s1?.subStats).toEqual([
        { type: 'HIT_HEAL', value: 2.9 },
        { type: 'CRIT_RATE', value: 29.4 },
        { type: 'CRIT_DMG', value: 28.5 },
      ]);
    });

    it('evaluates against real-world Checkpoint / PQSE JSON fixture file on disk', () => {
      const fixturePath = path.resolve(__dirname, 'fixtures/user_checkpoint_sample.json');
      const fileContent = fs.readFileSync(fixturePath, 'utf-8');

      expect(isUserJsonSave(JSON.parse(fileContent))).toBe(true);

      const parsed = parseUserJsonSave(fileContent);
      expect(parsed.errors.length).toBe(0);
      expect(parsed.validPokemon.length).toBe(1);
      expect(parsed.validStones.length).toBe(2);

      const venus = parsed.validPokemon[0];
      expect(venus.name).toBe('Venus');
      expect(venus.pokedexId).toBe(71);

      // Auto-scaled fixed-point sub-stats from Checkpoint
      const s1 = parsed.validStones.find(s => s.id === 'vic_stone_1');
      expect(s1).toBeDefined();
      expect(s1?.type).toBe('ATK');
      expect(s1?.power).toBe(985);
      expect(s1?.assignedPokemonId).toBe('victreebel-99');
      expect(s1?.assignedSlotIndex).toBe(0);
      expect(s1?.subStats).toEqual([
        { type: 'HIT_HEAL', value: 2.8 }, // 28 -> 2.8%
        { type: 'CRIT_RATE', value: 25.0 }, // 250 -> 25.0%
      ]);

      const s2 = parsed.validStones.find(s => s.id === 'inventory_stone_1');
      expect(s2).toBeDefined();
      expect(s2?.type).toBe('HP');
      expect(s2?.power).toBe(920);
      expect(s2?.isLocked).toBe(true);
      expect(s2?.subStats).toEqual([
        { type: 'STATUS_RESIST', value: 29.5 },
        { type: 'NATURAL_HEAL', value: 72.0 },
      ]);
    });
  });
});
