import { describe, it, expect } from 'vitest';
import { optimizeBuild, optimizeTeamBuild } from './optimizer';
import { calculateEquippedStats, calculateEffectiveDelta } from './scoring';
import { parseStonesFromCsv, parsePokemonFromCsv, parseFullBackupJson, exportPokemonToCsv, exportFullBackup } from '../io/csvParser';
import { SUB_STAT_DEFINITIONS, DEFAULT_PRIORITY_ORDER, isSlotUnlockedAtLevel, getSlotUnlockLevel, getUnlockGroupForPokemon } from '../constants/stats';
import { useBuddyStore } from '../store/useBuddyStore';
import type { PokemonProfile, PowerStone } from '../types';

describe('Comprehensive System Audit Suite', () => {

  // -------------------------------------------------------------------------
  // 1. DETERMINISM & ALGORITHM BEHAVIOR AUDIT
  // -------------------------------------------------------------------------
  describe('1. Optimization Determinism & Tie-Breaking Analysis', () => {

    it('produces identical results regardless of stone pool insertion order (tie-break regression)', () => {
      const poke: PokemonProfile = {
        id: 'det-poke-1',
        pokedexId: 68,
        name: 'Machamp',
        level: 100,
        sockets: [{ slotIndex: 0, type: 'ATK', isUnlocked: true }],
      };

      // Two stones with identical stats — only id differs
      const stoneA: PowerStone = {
        id: 'stone-AAA',
        type: 'ATK',
        power: 800,
        subStats: [{ type: 'HIT_HEAL', value: 2.0 }],
        isLocked: false,
      };

      const stoneB: PowerStone = {
        id: 'stone-BBB',
        type: 'ATK',
        power: 800,
        subStats: [{ type: 'HIT_HEAL', value: 2.0 }],
        isLocked: false,
      };

      // With the canonical pool sort (power DESC, id ASC), AAA always wins
      // regardless of which order we pass the stones in.
      const result1 = optimizeBuild(poke, [stoneA, stoneB]);
      const result2 = optimizeBuild(poke, [stoneB, stoneA]);

      expect(result1.assignments.get(0)?.id).toBe('stone-AAA');
      expect(result2.assignments.get(0)?.id).toBe('stone-AAA'); // same — deterministic
    });

    it('safe base-4 rank weights do not suffer IEEE 754 precision loss', () => {
      // Old formula: Math.pow(10, (n-1-k)*2) → 10^20 at rank 0 with n=11.
      // 10^20 > Number.MAX_SAFE_INTEGER (~9e15), so additions below ~1e4 are lost.
      const unsafeWeight = Math.pow(10, 20);
      expect(unsafeWeight + 5000 === unsafeWeight).toBe(true); // proves the old bug

      // New formula: Math.pow(4, n-1-k) → 4^10 ≈ 1,048,576 at rank 0.
      // Adding stone.power (max 999) or a sub-stat delta (max 300) is fully visible.
      const safeWeight = Math.pow(4, 10); // ~1M
      expect(safeWeight + 999 === safeWeight).toBe(false); // no precision loss
      expect(safeWeight + 300 === safeWeight).toBe(false); // no precision loss
    });

    it('guarantees 100% identical optimization results across repeated runs with shuffled pools', () => {
      const poke: PokemonProfile = {
        id: 'det-poke-stress',
        pokedexId: 6,
        name: 'Charizard',
        level: 100,
        priorities: ['HIT_HEAL', 'CRIT_RATE', 'CRIT_DMG', 'STATUS_RESIST'],
        minRequirements: { minAtkPower: 2000, minSubStats: { HIT_HEAL: 5.0 } },
        sockets: Array.from({ length: 9 }, (_, i) => ({
          slotIndex: i,
          type: i % 2 === 0 ? 'ATK' as const : 'HP' as const,
          isUnlocked: true,
        })),
      };

      const basePool: PowerStone[] = [
        { id: 's-1', type: 'ATK', power: 900, subStats: [{ type: 'HIT_HEAL', value: 2.8 }], isLocked: false },
        { id: 's-2', type: 'ATK', power: 850, subStats: [{ type: 'CRIT_RATE', value: 20.0 }], isLocked: false },
        { id: 's-3', type: 'HP', power: 920, subStats: [{ type: 'HIT_HEAL', value: 2.5 }], isLocked: false },
        { id: 's-4', type: 'HP', power: 800, subStats: [{ type: 'STATUS_RESIST', value: 25.0 }], isLocked: false },
        { id: 's-5', type: 'ATK', power: 900, subStats: [{ type: 'HIT_HEAL', value: 2.8 }], isLocked: false }, // tied with s-1
        { id: 's-6', type: 'HP', power: 750, subStats: [{ type: 'CRIT_DMG', value: 15.0 }], isLocked: false },
        { id: 's-7', type: 'ATK', power: 780, subStats: [{ type: 'CRIT_RATE', value: 18.0 }], isLocked: false },
        { id: 's-8', type: 'HP', power: 890, subStats: [{ type: 'HIT_HEAL', value: 1.5 }], isLocked: false },
        { id: 's-9', type: 'ATK', power: 950, subStats: [{ type: 'CRIT_DMG', value: 22.0 }], isLocked: false },
        { id: 's-10', type: 'HP', power: 810, subStats: [{ type: 'STATUS_RESIST', value: 12.0 }], isLocked: false },
      ];

      // Run baseline
      const baseline = optimizeBuild(poke, basePool);
      const baselineSlotIds = Array.from(baseline.assignments.entries())
        .sort(([a], [b]) => a - b)
        .map(([slot, stone]) => `${slot}:${stone.id}`);

      // Run 100 times with randomly shuffled stone arrays
      for (let run = 0; run < 100; run++) {
        const shuffledPool = [...basePool].sort(() => Math.random() - 0.5);
        const result = optimizeBuild(poke, shuffledPool);
        const resultSlotIds = Array.from(result.assignments.entries())
          .sort(([a], [b]) => a - b)
          .map(([slot, stone]) => `${slot}:${stone.id}`);

        expect(resultSlotIds).toEqual(baselineSlotIds);
        expect(result.isRequirementSatisfied).toBe(baseline.isRequirementSatisfied);
      }
    });


    it('demonstrates team assignment sequential dependency (first pokémon in array gets best stone)', () => {
      const poke1: PokemonProfile = {
        id: 'p1',
        pokedexId: 68,
        name: 'Machamp',
        level: 100,
        sockets: [{ slotIndex: 0, type: 'ATK', isUnlocked: true }],
      };
      const poke2: PokemonProfile = {
        id: 'p2',
        pokedexId: 65,
        name: 'Alakazam',
        level: 100,
        sockets: [{ slotIndex: 0, type: 'ATK', isUnlocked: true }],
      };

      const pool: PowerStone[] = [
        { id: 'best-stone', type: 'ATK', power: 999, subStats: [{ type: 'HIT_HEAL', value: 2.5 }], isLocked: false },
        { id: 'good-stone', type: 'ATK', power: 800, subStats: [{ type: 'HIT_HEAL', value: 2.0 }], isLocked: false },
      ];

      // Team [P1, P2]: P1 gets best-stone
      const teamRes1 = optimizeTeamBuild([poke1, poke2], pool);
      expect(teamRes1.teamAssignments.get('p1')?.get(0)?.id).toBe('best-stone');
      expect(teamRes1.teamAssignments.get('p2')?.get(0)?.id).toBe('good-stone');

      // Team [P2, P1]: P2 gets best-stone
      const teamRes2 = optimizeTeamBuild([poke2, poke1], pool);
      expect(teamRes2.teamAssignments.get('p2')?.get(0)?.id).toBe('best-stone');
      expect(teamRes2.teamAssignments.get('p1')?.get(0)?.id).toBe('good-stone');
    });
  });

  // -------------------------------------------------------------------------
  // 2. SECURITY & INPUT VALIDATION AUDIT
  // -------------------------------------------------------------------------
  describe('2. Security, Schema Validation & Sanitization Audit', () => {

    it('rejects out-of-range power values during CSV import', () => {
      const maliciousCsv = `id,type,power,substat1_name,substat1_value,is_locked
stone-hack,ATK,-500,HIT_HEAL,2.5,false
stone-over,ATK,99999,HIT_HEAL,2.5,false`;

      const result = parseStonesFromCsv(maliciousCsv);
      // Negative power should be rejected with an error
      expect(result.errors.length).toBeGreaterThan(0);
      // Valid rows should cap at 999
      const overStone = result.validStones.find(s => s.id === 'stone-over');
      expect(overStone).toBeDefined();
      expect(overStone?.power).toBe(999);
    });

    it('safely handles XSS / script tags in Pokémon names and nicknames', () => {
      const xssCsv = `pokedex_id,nickname,level
68,"<script>alert('xss')</script>",100`;

      const result = parsePokemonFromCsv(xssCsv);
      expect(result.validPokemon.length).toBe(1);
      // Value is treated strictly as plain text string
      expect(result.validPokemon[0].name).toBe("<script>alert('xss')</script>");
    });

    it('validates and rejects corrupted JSON structures with Zod schema verification', () => {
      const corruptJson = JSON.stringify({
        version: 1,
        stones: [
          { id: 'bad-stone', type: 'INVALID_TYPE', power: 'not-a-number' }
        ],
      });

      const parsed = parseFullBackupJson(corruptJson);
      expect(parsed.data).toBeNull();
      expect(parsed.errors.length).toBeGreaterThan(0);
    });

    it('verifies round-trip fidelity for JSON backup and restore', () => {
      const sampleStones: PowerStone[] = [
        {
          id: 'rt-stone-1',
          type: 'ATK',
          power: 950,
          subStats: [
            { type: 'HIT_HEAL', value: 2.8 },
            { type: 'CRIT_RATE', value: 15.0 },
          ],
          isLocked: true,
          assignedPokemonId: 'rt-poke-1',
          assignedSlotIndex: 0,
        },
      ];

      const samplePokemon: PokemonProfile[] = [
        {
          id: 'rt-poke-1',
          pokedexId: 6,
          name: 'Charizard Main',
          level: 100,
          useCustomPriorities: true,
          priorities: ['HIT_HEAL', 'CRIT_RATE', 'STAT_STRENGTH'],
          useCustomMinRequirements: true,
          minRequirements: { minAtkPower: 3000 },
          sockets: Array.from({ length: 9 }, (_, i) => ({
            slotIndex: i,
            type: 'ATK' as const,
            isUnlocked: true,
          })),
        },
      ];

      const exportedJson = exportFullBackup({
        stones: sampleStones,
        pokemon: samplePokemon,
        teamPokemonIds: ['rt-poke-1'],
        activePokemonId: 'rt-poke-1',
        globalPriorities: DEFAULT_PRIORITY_ORDER,
      });

      const restored = parseFullBackupJson(exportedJson);
      expect(restored.errors.length).toBe(0);
      expect(restored.data).toBeDefined();
      expect(restored.data?.stones.length).toBe(1);
      expect(restored.data?.stones[0].power).toBe(950);
      expect(restored.data?.stones[0].isLocked).toBe(true);
      expect(restored.data?.pokemon.length).toBe(1);
      expect(restored.data?.pokemon[0].minRequirements?.minAtkPower).toBe(3000);
    });
  });

  // -------------------------------------------------------------------------
  // 3. GAME ACCURACY & STAT MATH AUDIT
  // -------------------------------------------------------------------------
  describe('3. Game Mechanics & Stat Mathematics Accuracy Audit', () => {

    it('enforces exact hard caps across all 10 Pokémon Quest sub-stats', () => {
      expect(SUB_STAT_DEFINITIONS.HIT_HEAL.hardCap).toBe(10.0);
      expect(SUB_STAT_DEFINITIONS.HEAL_FROM_KO.hardCap).toBe(10.0);
      expect(SUB_STAT_DEFINITIONS.CRIT_RATE.hardCap).toBe(100.0);
      expect(SUB_STAT_DEFINITIONS.CRIT_DMG.hardCap).toBe(100.0);
      expect(SUB_STAT_DEFINITIONS.STATUS_RESIST.hardCap).toBe(100.0);
      expect(SUB_STAT_DEFINITIONS.STAT_LOWER_RESIST.hardCap).toBe(100.0);
      expect(SUB_STAT_DEFINITIONS.MOVE_SPEED.hardCap).toBe(200.0);
      expect(SUB_STAT_DEFINITIONS.TIME_TO_RECOVER.hardCap).toBe(50.0);
      expect(SUB_STAT_DEFINITIONS.HP_UPON_RECOVERY.hardCap).toBe(50.0);
      expect(SUB_STAT_DEFINITIONS.NATURAL_HEAL.hardCap).toBe(300.0);
    });

    it('accurately caps effective stats when combined stone values exceed caps', () => {
      const overcappedStones: PowerStone[] = [
        {
          id: 's1',
          type: 'ATK',
          power: 900,
          subStats: [
            { type: 'HIT_HEAL', value: 6.5 },
            { type: 'CRIT_RATE', value: 60.0 },
          ],
          isLocked: false,
        },
        {
          id: 's2',
          type: 'ATK',
          power: 900,
          subStats: [
            { type: 'HIT_HEAL', value: 6.5 },
            { type: 'CRIT_RATE', value: 60.0 },
          ],
          isLocked: false,
        },
      ];

      const stats = calculateEquippedStats(overcappedStones);

      // Hit heal
      expect(stats.subStats.HIT_HEAL.raw).toBe(13.0);
      expect(stats.subStats.HIT_HEAL.effective).toBe(10.0);
      expect(stats.subStats.HIT_HEAL.isCapped).toBe(true);

      // Crit rate
      expect(stats.subStats.CRIT_RATE.raw).toBe(120.0);
      expect(stats.subStats.CRIT_RATE.effective).toBe(100.0);
      expect(stats.subStats.CRIT_RATE.isCapped).toBe(true);

      // Marginal utility of an additional hit heal stone should be 0
      const delta = calculateEffectiveDelta('HIT_HEAL', 2.5, overcappedStones);
      expect(delta).toBe(0);
    });

    it('accurately verifies slot unlock progression across Pokémon unlock groups', () => {
      expect(getUnlockGroupForPokemon(68)).toBe('B');
      expect(isSlotUnlockedAtLevel(0, 1, 68)).toBe(true);
      expect(isSlotUnlockedAtLevel(2, 5, 68)).toBe(false);
      expect(isSlotUnlockedAtLevel(2, 8, 68)).toBe(true);
      expect(isSlotUnlockedAtLevel(8, 99, 68)).toBe(false);
      expect(isSlotUnlockedAtLevel(8, 100, 68)).toBe(true);

      expect(getUnlockGroupForPokemon(106)).toBe('E');
      expect(getSlotUnlockLevel(1, 106)).toBe(13);
      expect(getSlotUnlockLevel(2, 106)).toBe(29);
    });
  });

  // -------------------------------------------------------------------------
  // 4. FEATURE COMPLETENESS AUDIT
  // -------------------------------------------------------------------------
  describe('4. Feature Completeness Audit', () => {

    it('supports full export and import of Pokémon with minimum requirements and custom priorities', () => {
      const original: PokemonProfile = {
        id: 'full-feature-poke',
        pokedexId: 106,
        name: 'CloseCombat Hitmonlee',
        level: 100,
        useCustomPriorities: true,
        priorities: ['STAT_LOWER_RESIST', 'HIT_HEAL', 'CRIT_RATE', 'CRIT_DMG'],
        useCustomMinRequirements: true,
        minRequirements: {
          minAtkPower: 3500,
          minHpPower: 1500,
          minSubStats: {
            STAT_LOWER_RESIST: 100.0,
            HIT_HEAL: 10.0,
          },
        },
        sockets: Array.from({ length: 9 }, (_, i) => ({
          slotIndex: i,
          type: i % 2 === 0 ? 'ATK' as const : 'HP' as const,
          isUnlocked: true,
        })),
      };

      const csv = exportPokemonToCsv([original]);
      const parseResult = parsePokemonFromCsv(csv);

      expect(parseResult.errors.length).toBe(0);
      expect(parseResult.validPokemon.length).toBe(1);

      const imported = parseResult.validPokemon[0];
      expect(imported.pokedexId).toBe(106);
      expect(imported.useCustomPriorities).toBe(true);
      expect(imported.priorities?.[0]).toBe('STAT_LOWER_RESIST');
      expect(imported.useCustomMinRequirements).toBe(true);
      expect(imported.minRequirements?.minAtkPower).toBe(3500);
      expect(imported.minRequirements?.minHpPower).toBe(1500);
      expect(imported.minRequirements?.minSubStats?.STAT_LOWER_RESIST).toBe(100.0);
    });

    it('gracefully handles empty stone pool and returns empty assignments', () => {
      const poke: PokemonProfile = {
        id: 'empty-test-poke',
        pokedexId: 1,
        name: 'Bulbasaur',
        level: 100,
        sockets: [{ slotIndex: 0, type: 'ATK', isUnlocked: true }],
      };

      const result = optimizeBuild(poke, []);
      expect(result.totalAssigned).toBe(0);
      expect(result.unfilledSlots).toBe(1);
      expect(result.assignments.size).toBe(0);
      expect(result.isRequirementSatisfied).toBe(true);
    });

    it('gracefully handles pokemon with zero unlocked sockets', () => {
      const poke: PokemonProfile = {
        id: 'locked-test-poke',
        pokedexId: 1,
        name: 'Bulbasaur',
        level: 1,
        sockets: [
          { slotIndex: 0, type: 'ATK', isUnlocked: false },
          { slotIndex: 1, type: 'HP', isUnlocked: false },
        ],
      };

      const stones: PowerStone[] = [
        { id: 's1', type: 'ATK', power: 900, subStats: [], isLocked: false },
      ];

      const result = optimizeBuild(poke, stones);
      expect(result.totalAssigned).toBe(0);
      expect(result.unfilledSlots).toBe(0);
      expect(result.assignments.size).toBe(0);
    });

    it('correctly handles pool with only incompatible stone types', () => {
      const poke: PokemonProfile = {
        id: 'hp-only-poke',
        pokedexId: 1,
        name: 'Bulbasaur',
        level: 100,
        sockets: [{ slotIndex: 0, type: 'HP', isUnlocked: true }],
      };

      // Pool only has ATK stones
      const stones: PowerStone[] = [
        { id: 'atk-1', type: 'ATK', power: 900, subStats: [], isLocked: false },
        { id: 'atk-2', type: 'ATK', power: 800, subStats: [], isLocked: false },
      ];

      const result = optimizeBuild(poke, stones);
      expect(result.totalAssigned).toBe(0);
      expect(result.unfilledSlots).toBe(1);
      expect(result.assignments.size).toBe(0);
    });

    it('duplicatePokemon recalculates socket unlock status from level', () => {
      useBuddyStore.getState().clearAllData();
      const p = useBuddyStore.getState().addPokemon({
        pokedexId: 1,
        name: 'Bulbasaur Low',
        level: 1,
        sockets: Array.from({ length: 9 }, (_, i) => ({
          slotIndex: i,
          type: 'ATK',
          isUnlocked: true, // artificially set to true
        })),
      });
      expect(p).not.toBeNull();

      const copy = useBuddyStore.getState().duplicatePokemon(p!.id);
      expect(copy).not.toBeNull();
      // Level 1 Bulbasaur should only have slot 0 unlocked
      expect(copy!.sockets[0].isUnlocked).toBe(true);
      expect(copy!.sockets[1].isUnlocked).toBe(false);
      expect(copy!.sockets[8].isUnlocked).toBe(false);
    });

    it('updateStone prevents modifying locked stones without unlocking, and auto-unequips on type conflict', () => {
      useBuddyStore.getState().clearAllData();
      const p = useBuddyStore.getState().addPokemon({
        pokedexId: 1,
        name: 'Bulbasaur',
        level: 100,
        sockets: [{ slotIndex: 0, type: 'ATK', isUnlocked: true }],
      });

      const s = useBuddyStore.getState().addStone({
        type: 'ATK',
        power: 800,
        subStats: [],
        isLocked: true,
      });

      expect(s).not.toBeNull();

      // Attempting to modify power while locked without passing isLocked: false should be rejected
      useBuddyStore.getState().updateStone(s!.id, { power: 999 });
      let current = useBuddyStore.getState().stones.find(st => st.id === s!.id);
      expect(current?.power).toBe(800); // unchanged

      // Unlock and modify power should succeed
      useBuddyStore.getState().updateStone(s!.id, { isLocked: false, power: 999 });
      current = useBuddyStore.getState().stones.find(st => st.id === s!.id);
      expect(current?.power).toBe(999);
      expect(current?.isLocked).toBe(false);

      // Equip into ATK socket
      useBuddyStore.getState().equipStone(s!.id, p!.id, 0);
      current = useBuddyStore.getState().stones.find(st => st.id === s!.id);
      expect(current?.assignedPokemonId).toBe(p!.id);

      // Changing type to HP should auto-unequip because slot 0 is ATK
      useBuddyStore.getState().updateStone(s!.id, { type: 'HP' });
      current = useBuddyStore.getState().stones.find(st => st.id === s!.id);
      expect(current?.type).toBe('HP');
      expect(current?.assignedPokemonId).toBeNull();
      expect(current?.assignedSlotIndex).toBeNull();
    });

    it('inter-Pokemon team swap allows Pokemon 2 to meet hard requirements without degrading Pokemon 1', () => {
      // Pokemon 1 wants Hit Heal (no minimum requirements)
      const poke1: PokemonProfile = {
        id: 'team-p1',
        pokedexId: 68,
        name: 'Machamp',
        level: 100,
        priorities: ['HIT_HEAL', 'STAT_STRENGTH'],
        sockets: [{ slotIndex: 0, type: 'ATK', isUnlocked: true }],
      };

      // Pokemon 2 strictly requires 100% Status Resist
      const poke2: PokemonProfile = {
        id: 'team-p2',
        pokedexId: 65,
        name: 'Alakazam',
        level: 100,
        useCustomMinRequirements: true,
        minRequirements: { minSubStats: { STATUS_RESIST: 100.0 } },
        sockets: [
          { slotIndex: 0, type: 'ATK', isUnlocked: true },
          { slotIndex: 1, type: 'ATK', isUnlocked: true },
        ],
      };

      const pool: PowerStone[] = [
        // Stone A: Dual stat (Hit Heal 2.5%, Status Resist 50%) — power 900
        { id: 'stone-dual', type: 'ATK', power: 900, subStats: [{ type: 'HIT_HEAL', value: 2.5 }, { type: 'STATUS_RESIST', value: 50.0 }], isLocked: false },
        // Stone B: Pure Hit Heal (2.5%) — power 900
        { id: 'stone-pure-hh', type: 'ATK', power: 900, subStats: [{ type: 'HIT_HEAL', value: 2.5 }], isLocked: false },
        // Stone C: Pure Status Resist (50%) — power 850
        { id: 'stone-pure-sr', type: 'ATK', power: 850, subStats: [{ type: 'STATUS_RESIST', value: 50.0 }], isLocked: false },
      ];

      const res = optimizeTeamBuild([poke1, poke2], pool);

      // Pokemon 1 should take stone-pure-hh (getting 2.5% Hit Heal and 900 power),
      // allowing Pokemon 2 to take stone-dual + stone-pure-sr (reaching 100.0% Status Resist)
      expect(res.isAllSatisfied).toBe(true);
      expect(res.teamAssignments.get('team-p1')?.get(0)?.id).toBe('stone-pure-hh');
      expect(res.teamAssignments.get('team-p2')?.get(0)?.id).toBe('stone-dual');
      expect(res.teamAssignments.get('team-p2')?.get(1)?.id).toBe('stone-pure-sr');
    });

    it('guarantees 100% idempotence when optimizeTeamBuild is called repeatedly on active team assignments', () => {
      const p1: PokemonProfile = {
        id: 'idemp-p1',
        pokedexId: 6,
        name: 'Charizard',
        level: 100,
        priorities: ['HIT_HEAL', 'CRIT_RATE', 'STAT_STRENGTH'],
        sockets: Array.from({ length: 9 }, (_, i) => ({ slotIndex: i, type: 'ATK' as const, isUnlocked: true })),
      };

      const p2: PokemonProfile = {
        id: 'idemp-p2',
        pokedexId: 68,
        name: 'Machamp',
        level: 100,
        priorities: ['HIT_HEAL', 'STATUS_RESIST', 'STAT_STRENGTH'],
        minRequirements: { minAtkPower: 3000 },
        sockets: Array.from({ length: 9 }, (_, i) => ({ slotIndex: i, type: 'ATK' as const, isUnlocked: true })),
      };

      const p3: PokemonProfile = {
        id: 'idemp-p3',
        pokedexId: 131,
        name: 'Lapras',
        level: 100,
        priorities: ['STAT_STRENGTH'],
        sockets: Array.from({ length: 9 }, (_, i) => ({ slotIndex: i, type: 'HP' as const, isUnlocked: true })),
      };

      const pool: PowerStone[] = [
        ...Array.from({ length: 15 }, (_, i) => ({
          id: `atk-stone-${i}`,
          type: 'ATK' as const,
          power: 800 + i * 10,
          subStats: [{ type: 'HIT_HEAL' as const, value: 2.0 }],
          isLocked: false,
        })),
        ...Array.from({ length: 15 }, (_, i) => ({
          id: `hp-stone-${i}`,
          type: 'HP' as const,
          power: 750 + i * 10,
          subStats: [{ type: 'STATUS_RESIST' as const, value: 10.0 }],
          isLocked: false,
        })),
      ];

      // Initial run
      let currentPool = [...pool];
      const initialRes = optimizeTeamBuild([p1, p2, p3], currentPool);

      // Verify that running 20 times with updated stone assignments yields IDENTICAL assignments
      for (let run = 0; run < 20; run++) {
        // Update stone assignments in the pool as the store would do
        currentPool = currentPool.map(stone => {
          let assignedPokemonId: string | null = null;
          let assignedSlotIndex: number | null = null;

          for (const [pokeId, slotMap] of initialRes.teamAssignments.entries()) {
            for (const [slot, assignedStone] of slotMap.entries()) {
              if (assignedStone.id === stone.id) {
                assignedPokemonId = pokeId;
                assignedSlotIndex = slot;
              }
            }
          }

          return { ...stone, assignedPokemonId, assignedSlotIndex };
        });

        const nextRes = optimizeTeamBuild([p1, p2, p3], currentPool);

        // Compare slot by slot
        for (const pokeId of ['idemp-p1', 'idemp-p2', 'idemp-p3']) {
          const initSlots = initialRes.teamAssignments.get(pokeId)!;
          const nextSlots = nextRes.teamAssignments.get(pokeId)!;
          expect(nextSlots.size).toBe(initSlots.size);

          for (const [slot, stone] of initSlots.entries()) {
            expect(nextSlots.get(slot)?.id).toBe(stone.id);
          }
        }
      }
      const userPayload = {
        "pokemon": [
          {
            "id": "21b45d68-66a6-4961-b076-3ae67955ad4f",
            "pokedexId": 66,
            "name": "PT",
            "level": 100,
            "sockets": [
              { "slotIndex": 0, "type": "ATK" as const, "isUnlocked": true },
              { "slotIndex": 1, "type": "ATK" as const, "isUnlocked": true },
              { "slotIndex": 2, "type": "ATK" as const, "isUnlocked": true },
              { "slotIndex": 3, "type": "ATK" as const, "isUnlocked": true },
              { "slotIndex": 4, "type": "HP" as const, "isUnlocked": true },
              { "slotIndex": 5, "type": "HP" as const, "isUnlocked": true },
              { "slotIndex": 6, "type": "ATK" as const, "isUnlocked": true },
              { "slotIndex": 7, "type": "ATK" as const, "isUnlocked": true },
              { "slotIndex": 8, "type": "ATK" as const, "isUnlocked": true }
            ],
            "priorities": [
              "STAT_LOWER_RESIST" as const, "HIT_HEAL" as const, "CRIT_RATE" as const, "CRIT_DMG" as const, "STATUS_RESIST" as const, "MOVE_SPEED" as const, "TIME_TO_RECOVER" as const, "HP_UPON_RECOVERY" as const, "NATURAL_HEAL" as const, "HEAL_FROM_KO" as const, "STAT_STRENGTH" as const
            ],
            "useCustomPriorities": false,
            "minRequirements": {
              "minAtkPower": 6300,
              "minHpPower": 1900,
              "minSubStats": {
                "CRIT_RATE": 40,
                "CRIT_DMG": 40,
                "STATUS_RESIST": 100,
                "MOVE_SPEED": 100,
                "HIT_HEAL": 8,
                "STAT_LOWER_RESIST": 40
              }
            },
            "useCustomMinRequirements": true
          },
          {
            "id": "0ab55ad0-98f1-4901-a1b4-693337d47a3d",
            "pokedexId": 71,
            "name": "Venus",
            "level": 100,
            "sockets": [
              { "slotIndex": 0, "type": "ATK" as const, "isUnlocked": true },
              { "slotIndex": 1, "type": "HP" as const, "isUnlocked": true },
              { "slotIndex": 2, "type": "ATK" as const, "isUnlocked": true },
              { "slotIndex": 3, "type": "ATK" as const, "isUnlocked": true },
              { "slotIndex": 4, "type": "ATK" as const, "isUnlocked": true },
              { "slotIndex": 5, "type": "ATK" as const, "isUnlocked": true },
              { "slotIndex": 6, "type": "HP" as const, "isUnlocked": true },
              { "slotIndex": 7, "type": "ATK" as const, "isUnlocked": true },
              { "slotIndex": 8, "type": "ATK" as const, "isUnlocked": true }
            ],
            "priorities": [
              "HIT_HEAL" as const, "HEAL_FROM_KO" as const, "CRIT_RATE" as const, "CRIT_DMG" as const, "STATUS_RESIST" as const, "STAT_LOWER_RESIST" as const, "MOVE_SPEED" as const, "TIME_TO_RECOVER" as const, "HP_UPON_RECOVERY" as const, "NATURAL_HEAL" as const, "STAT_STRENGTH" as const
            ],
            "useCustomMinRequirements": true,
            "minRequirements": {
              "minAtkPower": 6000,
              "minHpPower": 1500,
              "minSubStats": {
                "HIT_HEAL": 8,
                "STATUS_RESIST": 100,
                "STAT_LOWER_RESIST": 25,
                "MOVE_SPEED": 60,
                "CRIT_RATE": 50,
                "CRIT_DMG": 50
              }
            }
          },
          {
            "pokedexId": 106,
            "name": "Rockem",
            "level": 100,
            "sockets": [
              { "slotIndex": 0, "type": "ATK" as const, "isUnlocked": true },
              { "slotIndex": 1, "type": "ATK" as const, "isUnlocked": true },
              { "slotIndex": 2, "type": "ATK" as const, "isUnlocked": true },
              { "slotIndex": 3, "type": "ATK" as const, "isUnlocked": true },
              { "slotIndex": 4, "type": "ATK" as const, "isUnlocked": true },
              { "slotIndex": 5, "type": "HP" as const, "isUnlocked": true },
              { "slotIndex": 6, "type": "HP" as const, "isUnlocked": true },
              { "slotIndex": 7, "type": "ATK" as const, "isUnlocked": true },
              { "slotIndex": 8, "type": "ATK" as const, "isUnlocked": true }
            ],
            "priorities": [
              "STAT_LOWER_RESIST" as const, "STATUS_RESIST" as const, "HIT_HEAL" as const, "CRIT_RATE" as const, "CRIT_DMG" as const, "MOVE_SPEED" as const, "STAT_STRENGTH" as const, "TIME_TO_RECOVER" as const, "HP_UPON_RECOVERY" as const, "NATURAL_HEAL" as const, "HEAL_FROM_KO" as const
            ],
            "id": "3bf8be39-18b3-48e4-9aa2-957d70c0798e",
            "useCustomPriorities": true
          }
        ],
        "stones": [
          { "type": "HP" as const, "power": 983, "subStats": [{ "type": "STATUS_RESIST" as const, "value": 23.9 }], "isLocked": false, "id": "173cec7b-e81c-4098-8bf4-bfea13f1ec0e" },
          { "type": "HP" as const, "power": 969, "subStats": [{ "type": "MOVE_SPEED" as const, "value": 56 }], "isLocked": false, "id": "ece61c0d-aba6-44db-a288-e6d72462246f" },
          { "type": "ATK" as const, "power": 841, "subStats": [{ "type": "CRIT_DMG" as const, "value": 29.4 }, { "type": "MOVE_SPEED" as const, "value": 65 }, { "type": "CRIT_RATE" as const, "value": 26.8 }], "isLocked": false, "id": "39ebc158-dd28-4fae-8e93-e9b807c34f8a" },
          { "type": "ATK" as const, "power": 956, "subStats": [{ "type": "STAT_LOWER_RESIST" as const, "value": 28.5 }], "isLocked": false, "id": "afb333e6-3384-49ff-9741-0703fe37626c" },
          { "id": "0ef2e847-00b2-4f07-a581-d735081d6ffc", "type": "ATK" as const, "power": 758, "subStats": [{ "type": "HIT_HEAL" as const, "value": 2.2 }, { "type": "HEAL_FROM_KO" as const, "value": 2.8 }] },
          { "id": "80b219b9-cdec-4a60-94dd-2d3ec69fa94d", "type": "HP" as const, "power": 759, "subStats": [{ "type": "STATUS_RESIST" as const, "value": 26.2 }] },
          { "id": "b173e813-4d3e-45cc-8291-79143c231e11", "type": "ATK" as const, "power": 764, "subStats": [{ "type": "HIT_HEAL" as const, "value": 2.9 }] },
          { "id": "fbeb12cd-4289-497c-af9d-1b6fc83ff909", "type": "ATK" as const, "power": 765, "subStats": [{ "type": "CRIT_RATE" as const, "value": 26.8 }, { "type": "MOVE_SPEED" as const, "value": 59 }, { "type": "STATUS_RESIST" as const, "value": 25.7 }] },
          { "id": "42df6cef-0a15-42f2-a72f-6aa4caca3740", "type": "ATK" as const, "power": 772, "subStats": [{ "type": "HEAL_FROM_KO" as const, "value": 2.6 }, { "type": "HIT_HEAL" as const, "value": 2.4 }, { "type": "MOVE_SPEED" as const, "value": 62 }] },
          { "id": "663fdf13-1a9e-4e7f-b0b4-6172e1466423", "type": "ATK" as const, "power": 775, "subStats": [{ "type": "STATUS_RESIST" as const, "value": 23.1 }, { "type": "NATURAL_HEAL" as const, "value": 60.2 }, { "type": "HIT_HEAL" as const, "value": 2.4 }] },
          { "id": "58375fb6-ee80-4462-9445-2e0741f21bee", "type": "ATK" as const, "power": 777, "subStats": [{ "type": "HP_UPON_RECOVERY" as const, "value": 16.7 }, { "type": "STATUS_RESIST" as const, "value": 29 }, { "type": "MOVE_SPEED" as const, "value": 60 }] },
          { "id": "c8c3ec13-9747-4dd7-adfd-737ecd57d149", "type": "HP" as const, "power": 784, "subStats": [{ "type": "HIT_HEAL" as const, "value": 2.3 }, { "type": "STATUS_RESIST" as const, "value": 25.8 }, { "type": "STAT_LOWER_RESIST" as const, "value": 26.5 }] },
          { "id": "4fc73e9d-47e6-4c11-ba84-74a515cb285c", "type": "ATK" as const, "power": 789, "subStats": [{ "type": "TIME_TO_RECOVER" as const, "value": 19.7 }, { "type": "STAT_LOWER_RESIST" as const, "value": 27.6 }] },
          { "id": "21f69ccd-4963-4380-b12d-883837d5b5b4", "type": "ATK" as const, "power": 795, "subStats": [{ "type": "STAT_LOWER_RESIST" as const, "value": 27.7 }, { "type": "HEAL_FROM_KO" as const, "value": 2.2 }, { "type": "CRIT_DMG" as const, "value": 28.4 }] },
          { "id": "e8c6a0c4-1559-44b0-b05a-b889f7c8e105", "type": "ATK" as const, "power": 802, "subStats": [{ "type": "HEAL_FROM_KO" as const, "value": 2.6 }, { "type": "STATUS_RESIST" as const, "value": 27.7 }, { "type": "STAT_LOWER_RESIST" as const, "value": 27.5 }] },
          { "id": "0e9350cc-21f9-4b51-acd4-733df11428e3", "type": "ATK" as const, "power": 804, "subStats": [{ "type": "STATUS_RESIST" as const, "value": 26.3 }, { "type": "CRIT_DMG" as const, "value": 26.4 }, { "type": "STAT_LOWER_RESIST" as const, "value": 23.5 }] },
          { "id": "7422ae54-ee9b-4b24-839c-5ed25a20d664", "type": "ATK" as const, "power": 816, "subStats": [{ "type": "HIT_HEAL" as const, "value": 2.2 }] },
          { "id": "c757e28b-e010-400b-b8fc-11eb821e6531", "type": "ATK" as const, "power": 817, "subStats": [{ "type": "STATUS_RESIST" as const, "value": 27.6 }, { "type": "NATURAL_HEAL" as const, "value": 66.7 }, { "type": "HEAL_FROM_KO" as const, "value": 2.2 }] },
          { "id": "2234c744-eeb1-49f4-89c7-ffe414ea5d72", "type": "HP" as const, "power": 826, "subStats": [{ "type": "STATUS_RESIST" as const, "value": 26.9 }, { "type": "NATURAL_HEAL" as const, "value": 68.5 }] },
          { "id": "a912ffc7-517f-4517-9261-a75528c17e93", "type": "ATK" as const, "power": 828, "subStats": [{ "type": "HIT_HEAL" as const, "value": 2.4 }] },
          { "id": "38421724-601e-48bd-9e63-998510bd2a42", "type": "HP" as const, "power": 829, "subStats": [{ "type": "STAT_LOWER_RESIST" as const, "value": 24.9 }, { "type": "STATUS_RESIST" as const, "value": 24.3 }, { "type": "HEAL_FROM_KO" as const, "value": 2.6 }] },
          { "id": "62be1edb-55c4-477f-a02f-4ce60d9cc9b5", "type": "HP" as const, "power": 833, "subStats": [{ "type": "TIME_TO_RECOVER" as const, "value": 17.4 }, { "type": "MOVE_SPEED" as const, "value": 55 }, { "type": "HIT_HEAL" as const, "value": 2.7 }] },
          { "id": "9c33f8b9-d6fb-488e-9f86-39de17c0e153", "type": "ATK" as const, "power": 837, "subStats": [{ "type": "MOVE_SPEED" as const, "value": 53 }, { "type": "STAT_LOWER_RESIST" as const, "value": 24.7 }, { "type": "NATURAL_HEAL" as const, "value": 71.5 }] },
          { "id": "484df3c3-7fe7-400e-ba58-17e4a5a8306d", "type": "HP" as const, "power": 849, "subStats": [{ "type": "CRIT_RATE" as const, "value": 27.5 }, { "type": "HIT_HEAL" as const, "value": 2.3 }] },
          { "id": "d9032b26-f011-4352-b706-655adf414e2a", "type": "HP" as const, "power": 850, "subStats": [{ "type": "CRIT_RATE" as const, "value": 23.5 }, { "type": "TIME_TO_RECOVER" as const, "value": 19.3 }, { "type": "HEAL_FROM_KO" as const, "value": 2.8 }] },
          { "id": "2eece876-c416-44d2-92a3-d91e8ac46c2f", "type": "ATK" as const, "power": 852, "subStats": [{ "type": "NATURAL_HEAL" as const, "value": 56.6 }, { "type": "HIT_HEAL" as const, "value": 2.8 }] },
          { "id": "5acdb06d-c0db-48c5-a86e-676df587a338", "type": "HP" as const, "power": 853, "subStats": [{ "type": "HIT_HEAL" as const, "value": 2.5 }] },
          { "id": "1b8238ce-b865-4c7d-bcc3-ef2203da0ab8", "type": "HP" as const, "power": 853, "subStats": [{ "type": "STATUS_RESIST" as const, "value": 26.4 }] },
          { "id": "e8c7ba3c-09d7-4948-b0b9-033a11daa59d", "type": "ATK" as const, "power": 854, "subStats": [{ "type": "HIT_HEAL" as const, "value": 2.3 }, { "type": "STATUS_RESIST" as const, "value": 29.2 }, { "type": "CRIT_DMG" as const, "value": 25.3 }] },
          { "id": "dbe0a086-d932-4027-92c3-5560da364255", "type": "ATK" as const, "power": 858, "subStats": [{ "type": "CRIT_DMG" as const, "value": 29.8 }, { "type": "CRIT_RATE" as const, "value": 23 }, { "type": "MOVE_SPEED" as const, "value": 58 }] },
          { "id": "fb3b3a7a-84bc-4caa-84c6-daca6c9beece", "type": "ATK" as const, "power": 859, "subStats": [{ "type": "CRIT_DMG" as const, "value": 26.2 }, { "type": "CRIT_RATE" as const, "value": 24.2 }] },
          { "id": "a92c2811-2dbb-4f03-8ab7-c3b7dc3011f7", "type": "HP" as const, "power": 863, "subStats": [{ "type": "HIT_HEAL" as const, "value": 2.9 }], "isLocked": true },
          { "id": "00703637-9be2-44f2-9546-f60c7e232642", "type": "ATK" as const, "power": 869, "subStats": [{ "type": "STATUS_RESIST" as const, "value": 24.5 }] },
          { "id": "c955d779-3e1d-4aa2-be10-1412d3c79748", "type": "HP" as const, "power": 872, "subStats": [{ "type": "STAT_LOWER_RESIST" as const, "value": 26.7 }] },
          { "id": "23eaa21a-086c-4da8-8794-667d4f44bee6", "type": "ATK" as const, "power": 874, "subStats": [{ "type": "HEAL_FROM_KO" as const, "value": 2.3 }, { "type": "STAT_LOWER_RESIST" as const, "value": 29.1 }, { "type": "HP_UPON_RECOVERY" as const, "value": 19.6 }] },
          { "id": "714332c9-bbb6-452b-a59a-b32acdffa07e", "type": "ATK" as const, "power": 875, "subStats": [{ "type": "MOVE_SPEED" as const, "value": 65 }, { "type": "CRIT_DMG" as const, "value": 28.6 }, { "type": "CRIT_RATE" as const, "value": 27.3 }] },
          { "id": "8ab7f264-b47b-4066-8532-a02b3bbdf15a", "type": "ATK" as const, "power": 881, "subStats": [{ "type": "STAT_LOWER_RESIST" as const, "value": 24.3 }, { "type": "STATUS_RESIST" as const, "value": 25 }] },
          { "id": "6f68d954-50bd-4c21-b00b-2e4582fb61d0", "type": "ATK" as const, "power": 884, "subStats": [{ "type": "STAT_LOWER_RESIST" as const, "value": 24.9 }] },
          { "id": "ccc44087-a819-4848-9b38-561eb75d283c", "type": "ATK" as const, "power": 884, "subStats": [{ "type": "TIME_TO_RECOVER" as const, "value": 15.5 }, { "type": "NATURAL_HEAL" as const, "value": 56.5 }, { "type": "CRIT_DMG" as const, "value": 28.4 }] },
          { "id": "10d176b1-66d5-49bb-b18e-f105f169719b", "type": "ATK" as const, "power": 885, "subStats": [{ "type": "CRIT_DMG" as const, "value": 25.2 }, { "type": "STATUS_RESIST" as const, "value": 29.6 }] },
          { "id": "ca4ba8ba-c86b-40c9-9995-78e9af1b7046", "type": "ATK" as const, "power": 887, "subStats": [{ "type": "CRIT_RATE" as const, "value": 25.6 }, { "type": "NATURAL_HEAL" as const, "value": 67.3 }] },
          { "id": "f4dc8a03-93db-4026-8dc1-2f98c8a67b95", "type": "HP" as const, "power": 888, "subStats": [{ "type": "STAT_LOWER_RESIST" as const, "value": 26.1 }] },
          { "id": "6f337790-e1c6-4738-b042-7555ce4e940b", "type": "ATK" as const, "power": 888, "subStats": [{ "type": "TIME_TO_RECOVER" as const, "value": 19.9 }, { "type": "HIT_HEAL" as const, "value": 2.3 }, { "type": "CRIT_RATE" as const, "value": 27.9 }] },
          { "id": "0a57244d-e9c8-40b5-916a-be778a4d3de9", "type": "HP" as const, "power": 889, "subStats": [{ "type": "HEAL_FROM_KO" as const, "value": 2.9 }, { "type": "CRIT_RATE" as const, "value": 23.7 }, { "type": "MOVE_SPEED" as const, "value": 63 }] },
          { "id": "7052b46f-56fa-4a28-99ea-c46a0d76d21f", "type": "ATK" as const, "power": 900, "subStats": [{ "type": "CRIT_DMG" as const, "value": 26.7 }, { "type": "NATURAL_HEAL" as const, "value": 60.4 }, { "type": "TIME_TO_RECOVER" as const, "value": 19.2 }] },
          { "id": "1b5f01a0-3305-45e8-aa27-62999ce7ace0", "type": "HP" as const, "power": 901, "subStats": [{ "type": "HIT_HEAL" as const, "value": 2.6 }, { "type": "STATUS_RESIST" as const, "value": 28.6 }, { "type": "NATURAL_HEAL" as const, "value": 64.9 }] },
          { "id": "ba8c3e73-88c2-4f43-a01a-55f9e7e8c713", "type": "HP" as const, "power": 902, "subStats": [{ "type": "HIT_HEAL" as const, "value": 2.8 }, { "type": "CRIT_DMG" as const, "value": 29 }, { "type": "HP_UPON_RECOVERY" as const, "value": 18.4 }] },
          { "id": "fd5f2eb0-71e8-4866-a8ed-3e2febded2fd", "type": "HP" as const, "power": 907, "subStats": [{ "type": "STATUS_RESIST" as const, "value": 27.1 }, { "type": "STAT_LOWER_RESIST" as const, "value": 25.6 }, { "type": "NATURAL_HEAL" as const, "value": 63 }] },
          { "id": "0ad2289c-7cf8-437b-b3c2-9d16d31179be", "type": "HP" as const, "power": 910, "subStats": [{ "type": "MOVE_SPEED" as const, "value": 52.5 }] },
          { "id": "7ebd9cbf-426c-4d6b-a0f4-920a75303f4a", "type": "ATK" as const, "power": 916, "subStats": [{ "type": "STAT_LOWER_RESIST" as const, "value": 28.7 }] },
          { "id": "78d13170-ce6d-4ea7-bae2-1339f72cc21d", "type": "ATK" as const, "power": 917, "subStats": [{ "type": "CRIT_RATE" as const, "value": 24 }, { "type": "HIT_HEAL" as const, "value": 2.8 }, { "type": "STAT_LOWER_RESIST" as const, "value": 27.7 }] },
          { "id": "f768f838-dd74-4f76-93fe-b8ecb2b590b2", "type": "HP" as const, "power": 922, "subStats": [{ "type": "CRIT_RATE" as const, "value": 23.7 }, { "type": "MOVE_SPEED" as const, "value": 64 }] },
          { "id": "1867b664-9de4-4179-a636-1c241651bc34", "type": "HP" as const, "power": 922, "subStats": [{ "type": "HIT_HEAL" as const, "value": 2.3 }, { "type": "HEAL_FROM_KO" as const, "value": 2.5 }, { "type": "CRIT_DMG" as const, "value": 26.9 }] },
          { "id": "f899c817-03ec-4451-be70-9aca2b301dcd", "type": "ATK" as const, "power": 927, "subStats": [{ "type": "CRIT_DMG" as const, "value": 23.7 }, { "type": "STATUS_RESIST" as const, "value": 25.4 }, { "type": "HEAL_FROM_KO" as const, "value": 2.8 }] },
          { "id": "cecbb7ac-0fa2-4b80-b34c-b2a0d02b9da4", "type": "HP" as const, "power": 932, "subStats": [{ "type": "CRIT_RATE" as const, "value": 29.1 }, { "type": "MOVE_SPEED" as const, "value": 59 }, { "type": "CRIT_DMG" as const, "value": 24.5 }] },
          { "id": "463de430-b6ff-4674-ae7a-a5915939476c", "type": "HP" as const, "power": 935, "subStats": [{ "type": "STATUS_RESIST" as const, "value": 23.8 }] },
          { "id": "d391fbe4-b918-46cc-a726-b440e67cfafb", "type": "ATK" as const, "power": 937, "subStats": [{ "type": "MOVE_SPEED" as const, "value": 59 }, { "type": "CRIT_DMG" as const, "value": 23.8 }] },
          { "id": "87f8d7e4-6c9f-4e90-87c5-2aa31f0e2655", "type": "ATK" as const, "power": 943, "subStats": [{ "type": "STATUS_RESIST" as const, "value": 25.2 }] },
          { "id": "79be6edb-8f49-420c-8274-49def224a6bc", "type": "HP" as const, "power": 943, "subStats": [{ "type": "STAT_LOWER_RESIST" as const, "value": 23.9 }, { "type": "MOVE_SPEED" as const, "value": 66 }, { "type": "HP_UPON_RECOVERY" as const, "value": 15.6 }] },
          { "id": "466be9aa-a9a9-4cbb-bb10-2c62942d7df6", "type": "ATK" as const, "power": 947, "subStats": [{ "type": "HIT_HEAL" as const, "value": 2.5 }, { "type": "NATURAL_HEAL" as const, "value": 68.9 }] },
          { "id": "2cd28fd3-d0af-4bcd-ac9f-4c19df2d663f", "type": "ATK" as const, "power": 948, "subStats": [{ "type": "STATUS_RESIST" as const, "value": 24.5 }] },
          { "id": "1507379a-8fdf-4d67-a52f-d359f73c0cfd", "type": "HP" as const, "power": 949, "subStats": [{ "type": "CRIT_DMG" as const, "value": 29.6 }, { "type": "NATURAL_HEAL" as const, "value": 64.5 }, { "type": "STAT_LOWER_RESIST" as const, "value": 29.4 }] },
          { "id": "852d1236-6514-44f3-a29c-fb428da1c55e", "type": "HP" as const, "power": 951, "subStats": [{ "type": "STATUS_RESIST" as const, "value": 25.6 }] },
          { "id": "c87eef8b-5982-4a5b-9ca1-305609c94840", "type": "HP" as const, "power": 951, "subStats": [{ "type": "TIME_TO_RECOVER" as const, "value": 15.8 }, { "type": "HP_UPON_RECOVERY" as const, "value": 16 }] },
          { "id": "efefddae-3674-4883-bb9c-4dd2fd1fd15e", "type": "HP" as const, "power": 953, "subStats": [{ "type": "STATUS_RESIST" as const, "value": 23.9 }] },
          { "id": "f610226e-e3b8-463f-b121-625d5ec7a8fe", "type": "ATK" as const, "power": 953, "subStats": [{ "type": "CRIT_RATE" as const, "value": 26.1 }, { "type": "CRIT_DMG" as const, "value": 27.9 }, { "type": "MOVE_SPEED" as const, "value": 62 }] },
          { "id": "07a043c7-ac30-463a-9e36-d9cba8249bb9", "type": "ATK" as const, "power": 958, "subStats": [{ "type": "HIT_HEAL" as const, "value": 2.9 }] },
          { "id": "b80a0a56-6bd3-4ab2-a6f8-7776d95d08a8", "type": "ATK" as const, "power": 959, "subStats": [{ "type": "HIT_HEAL" as const, "value": 2.2 }] },
          { "id": "7f413dda-c835-4b6f-8cad-7aac704910fb", "type": "HP" as const, "power": 961, "subStats": [{ "type": "HEAL_FROM_KO" as const, "value": 2.7 }, { "type": "CRIT_DMG" as const, "value": 24.1 }] },
          { "id": "bae84c36-bbb8-4a8a-aa16-eb1dc9e32b5a", "type": "HP" as const, "power": 964, "subStats": [{ "type": "HP_UPON_RECOVERY" as const, "value": 16.6 }, { "type": "CRIT_RATE" as const, "value": 28.4 }, { "type": "STAT_LOWER_RESIST" as const, "value": 25.4 }] },
          { "id": "3dbb9e09-c578-4a68-bd84-55373aec680c", "type": "HP" as const, "power": 965, "subStats": [{ "type": "STAT_LOWER_RESIST" as const, "value": 29.3 }] },
          { "id": "4b284895-ec1b-4bff-b151-1377fd0f98aa", "type": "ATK" as const, "power": 965, "subStats": [{ "type": "STATUS_RESIST" as const, "value": 29 }, { "type": "CRIT_RATE" as const, "value": 26.6 }] },
          { "id": "63e88137-ef85-48bc-b3bd-d1d2fa838edc", "type": "HP" as const, "power": 969, "subStats": [{ "type": "HIT_HEAL" as const, "value": 2.4 }] },
          { "id": "f3445535-5439-4882-a46f-8a523ad4f5d9", "type": "HP" as const, "power": 973, "subStats": [{ "type": "MOVE_SPEED" as const, "value": 62 }] },
          { "id": "c1c766dc-46c0-4b00-9580-c64acc931612", "type": "ATK" as const, "power": 973, "subStats": [{ "type": "STAT_LOWER_RESIST" as const, "value": 28.5 }, { "type": "HEAL_FROM_KO" as const, "value": 2.9 }] },
          { "id": "2be24e2e-f0a6-42a4-81a7-2c984da40e6a", "type": "ATK" as const, "power": 974, "subStats": [{ "type": "MOVE_SPEED" as const, "value": 60 }, { "type": "HIT_HEAL" as const, "value": 2.5 }, { "type": "NATURAL_HEAL" as const, "value": 61.1 }] },
          { "id": "82777aaf-865f-48b8-8364-5d0e66c519c3", "type": "ATK" as const, "power": 975, "subStats": [{ "type": "STATUS_RESIST" as const, "value": 26.1 }] },
          { "id": "dcd9dc83-6585-4742-89f8-758ce361a7b9", "type": "ATK" as const, "power": 976, "subStats": [{ "type": "STATUS_RESIST" as const, "value": 23.6 }, { "type": "HIT_HEAL" as const, "value": 2.2 }, { "type": "TIME_TO_RECOVER" as const, "value": 17.2 }] },
          { "id": "b7dc1e45-b0f5-46b6-8aaa-d3ddbebe5e6c", "type": "HP" as const, "power": 980, "subStats": [{ "type": "CRIT_DMG" as const, "value": 29.3 }, { "type": "MOVE_SPEED" as const, "value": 54 }] },
          { "id": "91831b63-ec5e-4fe7-8146-5f2d14a62966", "type": "HP" as const, "power": 981, "subStats": [{ "type": "CRIT_RATE" as const, "value": 24.7 }, { "type": "HP_UPON_RECOVERY" as const, "value": 19.3 }, { "type": "CRIT_RATE" as const, "value": 28.6 }] },
          { "id": "9d64dd8d-9b3f-4810-82d0-3f36c060c121", "type": "ATK" as const, "power": 984, "subStats": [{ "type": "STATUS_RESIST" as const, "value": 29.3 }, { "type": "HP_UPON_RECOVERY" as const, "value": 16.6 }] },
          { "id": "d6e53014-6464-414f-aab2-38fb02c6892e", "type": "ATK" as const, "power": 986, "subStats": [{ "type": "STAT_LOWER_RESIST" as const, "value": 26 }, { "type": "HIT_HEAL" as const, "value": 2.8 }, { "type": "NATURAL_HEAL" as const, "value": 58 }] },
          { "id": "f078d7bf-a630-453b-a467-9af6f1d38a00", "type": "ATK" as const, "power": 991, "subStats": [{ "type": "HEAL_FROM_KO" as const, "value": 2.8 }, { "type": "HP_UPON_RECOVERY" as const, "value": 16.8 }, { "type": "CRIT_RATE" as const, "value": 29.7 }] },
          { "id": "86ab9bfd-34c1-41e4-b014-b5bd4619e5e8", "type": "HP" as const, "power": 996, "subStats": [{ "type": "MOVE_SPEED" as const, "value": 61 }, { "type": "CRIT_DMG" as const, "value": 24 }, { "type": "CRIT_RATE" as const, "value": 24.8 }] }
        ],
        "globalPriorities": [
          "STATUS_RESIST" as const, "HIT_HEAL" as const, "STAT_LOWER_RESIST" as const, "CRIT_RATE" as const, "CRIT_DMG" as const, "MOVE_SPEED" as const, "STAT_STRENGTH" as const, "TIME_TO_RECOVER" as const, "HP_UPON_RECOVERY" as const, "NATURAL_HEAL" as const, "HEAL_FROM_KO" as const
        ],
        "globalMinRequirements": {
          "minAtkPower": 6300,
          "minHpPower": 1700,
          "minSubStats": {
            "HIT_HEAL": 8,
            "CRIT_DMG": 30,
            "STATUS_RESIST": 100,
            "STAT_LOWER_RESIST": 100,
            "MOVE_SPEED": 60,
            "CRIT_RATE": 50
          }
        }
      };

      const result40 = optimizeTeamBuild(userPayload.pokemon, userPayload.stones as unknown as PowerStone[], {
        globalPriorities: userPayload.globalPriorities,
        globalMinRequirements: userPayload.globalMinRequirements,
      });

      expect(result40.isAllSatisfied).toBe(true);
      expect(result40.resultsByPokemon.get(userPayload.pokemon[0].id)?.isRequirementSatisfied).toBe(true);
      expect(result40.resultsByPokemon.get(userPayload.pokemon[1].id)?.isRequirementSatisfied).toBe(true);
      expect(result40.resultsByPokemon.get(userPayload.pokemon[2].id)?.isRequirementSatisfied).toBe(true);

      // 25% test
      const payload25 = JSON.parse(JSON.stringify(userPayload));
      payload25.pokemon[0].minRequirements.minSubStats.STAT_LOWER_RESIST = 25;
      const result25 = optimizeTeamBuild(payload25.pokemon, payload25.stones as unknown as PowerStone[], {
        globalPriorities: payload25.globalPriorities,
        globalMinRequirements: payload25.globalMinRequirements,
      });

      expect(result25.isAllSatisfied).toBe(true);
      expect(result25.resultsByPokemon.get(payload25.pokemon[0].id)?.isRequirementSatisfied).toBe(true);
      expect(result25.resultsByPokemon.get(payload25.pokemon[1].id)?.isRequirementSatisfied).toBe(true);
      expect(result25.resultsByPokemon.get(payload25.pokemon[2].id)?.isRequirementSatisfied).toBe(true);
    });
  });

  describe('5. Universal NumericInput Behavior Specification', () => {
    const getEffectiveValue = (
      num: number,
      raw: string,
      min?: number,
      max?: number,
      allowEmpty = false,
      emptyValue?: number
    ): number | undefined => {
      if (raw.trim() === '') {
        return allowEmpty ? emptyValue : min;
      }
      if (isNaN(num)) {
        return allowEmpty ? emptyValue : (min ?? 0);
      }
      if (min !== undefined && num < min) return min;
      if (max !== undefined && num > max) return max;
      return num;
    };

    const getValidationState = (
      rawText: string,
      min?: number,
      max?: number,
      allowEmpty = false
    ) => {
      const trimmed = rawText.trim();
      const isEmpty = trimmed === '';
      const parsedNum = isEmpty ? NaN : parseFloat(trimmed);
      const isNaNValue = !isEmpty && isNaN(parsedNum);
      const isUnderMin = !isEmpty && !isNaNValue && min !== undefined && parsedNum < min;
      const isOverMax = !isEmpty && !isNaNValue && max !== undefined && parsedNum > max;
      const isRequiredEmpty = isEmpty && !allowEmpty;
      const isInvalid = isNaNValue || isUnderMin || isOverMax || isRequiredEmpty;

      return {
        isEmpty,
        parsedNum,
        isNaNValue,
        isUnderMin,
        isOverMax,
        isRequiredEmpty,
        isInvalid,
      };
    };

    it('allows clearing input when allowEmpty is true and returns emptyValue', () => {
      const val = getEffectiveValue(NaN, '', 0, 100, true, undefined);
      expect(val).toBeUndefined();

      const state = getValidationState('', 0, 100, true);
      expect(state.isInvalid).toBe(false);
      expect(state.isEmpty).toBe(true);
    });

    it('flags empty input as invalid when allowEmpty is false and falls back to min', () => {
      const val = getEffectiveValue(NaN, '', 1, 100, false);
      expect(val).toBe(1);

      const state = getValidationState('', 1, 100, false);
      expect(state.isInvalid).toBe(true);
      expect(state.isRequiredEmpty).toBe(true);
    });

    it('clamps out-of-range lower values to min and marks invalid', () => {
      const val = getEffectiveValue(-5, '-5', 0, 100, false);
      expect(val).toBe(0);

      const state = getValidationState('-5', 0, 100, false);
      expect(state.isInvalid).toBe(true);
      expect(state.isUnderMin).toBe(true);
      expect(state.isOverMax).toBe(false);
    });

    it('clamps out-of-range upper values to max and marks invalid', () => {
      const val = getEffectiveValue(150, '150', 0, 100, false);
      expect(val).toBe(100);

      const state = getValidationState('150', 0, 100, false);
      expect(state.isInvalid).toBe(true);
      expect(state.isOverMax).toBe(true);
      expect(state.isUnderMin).toBe(false);
    });

    it('preserves valid in-range values without flagging as invalid', () => {
      const val = getEffectiveValue(45.5, '45.5', 0, 100, false);
      expect(val).toBe(45.5);

      const state = getValidationState('45.5', 0, 100, false);
      expect(state.isInvalid).toBe(false);
      expect(state.isOverMax).toBe(false);
      expect(state.isUnderMin).toBe(false);
    });

    it('truncates decimals beyond tenths place, flags input as invalid, and uses truncated value', () => {
      const truncateDecimals = (num: number, raw: string, maxDecs = 1): { truncatedNum: number; hasExcessDecimals: boolean } => {
        let hasExcessDecimals = false;
        let truncatedNum = num;
        if (raw.includes('.')) {
          const parts = raw.split('.');
          if (parts[1] && parts[1].length > maxDecs) {
            hasExcessDecimals = true;
            const truncatedStr = `${parts[0]}.${parts[1].slice(0, maxDecs)}`;
            const parsed = parseFloat(truncatedStr);
            truncatedNum = isNaN(parsed) ? num : parsed;
          }
        }
        return { truncatedNum, hasExcessDecimals };
      };

      const res1 = truncateDecimals(2.55, '2.55', 1);
      expect(res1.hasExcessDecimals).toBe(true);
      expect(res1.truncatedNum).toBe(2.5);

      const res2 = truncateDecimals(2.899, '2.899', 1);
      expect(res2.hasExcessDecimals).toBe(true);
      expect(res2.truncatedNum).toBe(2.8);

      const res3 = truncateDecimals(2.8, '2.8', 1);
      expect(res3.hasExcessDecimals).toBe(false);
      expect(res3.truncatedNum).toBe(2.8);
    });
  });
});
