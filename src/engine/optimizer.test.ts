import { describe, it, expect } from 'vitest';
import { optimizeBuild, optimizeTeamBuild } from './optimizer';
import type { PokemonProfile, PowerStone } from '../types';

describe('Greedy Build Optimizer', () => {
  const samplePokemon: PokemonProfile = {
    id: 'test-poke-1',
    pokedexId: 68,
    name: 'Test Machamp',
    level: 100,
    priorities: ['HIT_HEAL', 'CRIT_RATE', 'CRIT_DMG', 'STAT_LOWER_RESIST', 'STATUS_RESIST', 'MOVE_SPEED', 'NATURAL_HEAL', 'TIME_TO_RECOVER', 'HP_UPON_RECOVERY'],
    sockets: [
      { slotIndex: 0, type: 'ATK', isUnlocked: true },
      { slotIndex: 1, type: 'HP', isUnlocked: true },
      { slotIndex: 2, type: 'MULTI', isUnlocked: true },
      { slotIndex: 3, type: 'ATK', isUnlocked: false }, // locked slot
    ],
  };

  const samplePokemon2: PokemonProfile = {
    id: 'test-poke-2',
    pokedexId: 65,
    name: 'Test Alakazam',
    level: 100,
    priorities: ['CRIT_RATE', 'CRIT_DMG', 'HIT_HEAL', 'STATUS_RESIST', 'STAT_LOWER_RESIST', 'MOVE_SPEED', 'NATURAL_HEAL', 'TIME_TO_RECOVER', 'HP_UPON_RECOVERY'],
    sockets: [
      { slotIndex: 0, type: 'ATK', isUnlocked: true },
      { slotIndex: 1, type: 'MULTI', isUnlocked: true },
    ],
  };

  const stonePool: PowerStone[] = [
    {
      id: 'stone-atk-1',
      type: 'ATK',
      power: 800,
      subStats: [{ type: 'HIT_HEAL', value: 2.8 }],
      isLocked: false,
    },
    {
      id: 'stone-atk-2',
      type: 'ATK',
      power: 700,
      subStats: [{ type: 'HIT_HEAL', value: 1.0 }],
      isLocked: false,
    },
    {
      id: 'stone-hp-1',
      type: 'HP',
      power: 850,
      subStats: [{ type: 'HIT_HEAL', value: 2.5 }],
      isLocked: false,
    },
    {
      id: 'stone-hp-2',
      type: 'HP',
      power: 600,
      subStats: [],
      isLocked: false,
    },
    {
      id: 'stone-atk-3',
      type: 'ATK',
      power: 900,
      subStats: [{ type: 'CRIT_RATE', value: 20.0 }],
      isLocked: false,
    },
  ];

  it('correctly matches socket type constraints and skips locked slots', () => {
    const result = optimizeBuild(samplePokemon, stonePool);

    expect(result.totalAssigned).toBe(3); // 3 unlocked slots
    expect(result.unfilledSlots).toBe(0);

    // Chosen stones are sorted by power descending:
    // 1. stone-hp-1 (power 850, HP) -> Slot 0
    // 2. stone-atk-1 (power 800, ATK) -> Slot 1
    // 3. stone-atk-2 (power 700, ATK) -> Slot 2
    const slot0Stone = result.assignments.get(0);
    expect(slot0Stone).toBeDefined();
    expect(slot0Stone?.id).toBe('stone-hp-1');
    expect(slot0Stone?.power).toBe(850);

    const slot1Stone = result.assignments.get(1);
    expect(slot1Stone).toBeDefined();
    expect(slot1Stone?.id).toBe('stone-atk-1');
    expect(slot1Stone?.power).toBe(800);

    const slot2Stone = result.assignments.get(2);
    expect(slot2Stone).toBeDefined();
    expect(slot2Stone?.id).toBe('stone-atk-2');
    expect(slot2Stone?.power).toBe(700);

    // Socket types are updated to match sorted stone positions:
    expect(result.updatedSockets.find(s => s.slotIndex === 0)?.type).toBe('HP');
    expect(result.updatedSockets.find(s => s.slotIndex === 1)?.type).toBe('ATK');
    expect(result.updatedSockets.find(s => s.slotIndex === 2)?.type).toBe('ATK');

    // Slot 3 is locked, should not have assignment and keeps original socket type
    expect(result.assignments.get(3)).toBeUndefined();
    expect(result.updatedSockets.find(s => s.slotIndex === 3)?.type).toBe('ATK');
  });

  it('orders equipped stones in descending power order and moves Sturdy (HP) sockets into correct positions', () => {
    const poke: PokemonProfile = {
      id: 'poke-power-order-test',
      pokedexId: 6, // Charizard
      name: 'Charizard',
      level: 100,
      priorities: ['STAT_STRENGTH'],
      sockets: [
        { slotIndex: 0, type: 'HP', isUnlocked: true },
        { slotIndex: 1, type: 'HP', isUnlocked: true },
        { slotIndex: 2, type: 'ATK', isUnlocked: true },
        { slotIndex: 3, type: 'ATK', isUnlocked: true },
        { slotIndex: 4, type: 'ATK', isUnlocked: true },
      ],
    };

    const stones: PowerStone[] = [
      { id: 's-atk-999', type: 'ATK', power: 999, subStats: [], isLocked: false },
      { id: 's-atk-950', type: 'ATK', power: 950, subStats: [], isLocked: false },
      { id: 's-atk-800', type: 'ATK', power: 800, subStats: [], isLocked: false },
      { id: 's-hp-980', type: 'HP', power: 980, subStats: [], isLocked: false },
      { id: 's-hp-900', type: 'HP', power: 900, subStats: [], isLocked: false },
    ];

    const result = optimizeBuild(poke, stones);

    // Should be sorted strictly descending by power:
    // Slot 0: 999 (ATK)
    // Slot 1: 980 (HP)
    // Slot 2: 950 (ATK)
    // Slot 3: 900 (HP)
    // Slot 4: 800 (ATK)
    expect(result.assignments.get(0)?.id).toBe('s-atk-999');
    expect(result.assignments.get(1)?.id).toBe('s-hp-980');
    expect(result.assignments.get(2)?.id).toBe('s-atk-950');
    expect(result.assignments.get(3)?.id).toBe('s-hp-900');
    expect(result.assignments.get(4)?.id).toBe('s-atk-800');

    // Sockets should be moved into matching positions:
    expect(result.updatedSockets.find(s => s.slotIndex === 0)?.type).toBe('ATK');
    expect(result.updatedSockets.find(s => s.slotIndex === 1)?.type).toBe('HP');
    expect(result.updatedSockets.find(s => s.slotIndex === 2)?.type).toBe('ATK');
    expect(result.updatedSockets.find(s => s.slotIndex === 3)?.type).toBe('HP');
    expect(result.updatedSockets.find(s => s.slotIndex === 4)?.type).toBe('ATK');
  });

  it('optimizes across an entire team of Pokémon without duplicate stones', () => {
    const teamResult = optimizeTeamBuild([samplePokemon, samplePokemon2], stonePool);

    expect(teamResult.teamAssignments.has('test-poke-1')).toBe(true);
    expect(teamResult.teamAssignments.has('test-poke-2')).toBe(true);

    const poke1Stones = Array.from(teamResult.teamAssignments.get('test-poke-1')!.values()).map(s => s.id);
    const poke2Stones = Array.from(teamResult.teamAssignments.get('test-poke-2')!.values()).map(s => s.id);

    // Check no duplicate stone assigned to both team members
    for (const id of poke1Stones) {
      expect(poke2Stones).not.toContain(id);
    }
  });

  it('respects optional custom priorities per pokemon over global priorities (e.g. Close Combat Stat Lowering Resist)', () => {
    const closeCombatPokemon: PokemonProfile = {
      id: 'test-close-combat',
      pokedexId: 106, // Hitmonlee
      name: 'Close Combat Hitmonlee',
      level: 100,
      useCustomPriorities: true,
      priorities: ['STAT_LOWER_RESIST', 'HIT_HEAL', 'CRIT_RATE', 'CRIT_DMG', 'STATUS_RESIST', 'MOVE_SPEED', 'NATURAL_HEAL', 'TIME_TO_RECOVER', 'HP_UPON_RECOVERY'],
      sockets: [
        { slotIndex: 0, type: 'ATK', isUnlocked: true },
      ],
    };

    const stonesForTest: PowerStone[] = [
      {
        id: 'stone-hitheal',
        type: 'ATK',
        power: 800,
        subStats: [{ type: 'HIT_HEAL', value: 2.5 }],
        isLocked: false,
      },
      {
        id: 'stone-statlower',
        type: 'ATK',
        power: 800,
        subStats: [{ type: 'STAT_LOWER_RESIST', value: 30.0 }],
        isLocked: false,
      },
    ];

    // Global priorities has HIT_HEAL as #1
    const globalPriorities = ['HIT_HEAL', 'CRIT_RATE', 'CRIT_DMG', 'STAT_LOWER_RESIST', 'STATUS_RESIST', 'MOVE_SPEED', 'NATURAL_HEAL', 'TIME_TO_RECOVER', 'HP_UPON_RECOVERY'] as const;

    // When custom is enabled, it should pick STAT_LOWER_RESIST
    const customResult = optimizeBuild(closeCombatPokemon, stonesForTest, {
      globalPriorities: [...globalPriorities],
    });
    expect(customResult.assignments.get(0)?.id).toBe('stone-statlower');

    // If custom is disabled, it should fall back to global priorities and pick HIT_HEAL
    const globalFallbackPokemon: PokemonProfile = {
      ...closeCombatPokemon,
      useCustomPriorities: false,
    };
    const globalResult = optimizeBuild(globalFallbackPokemon, stonesForTest, {
      globalPriorities: [...globalPriorities],
    });
    expect(globalResult.assignments.get(0)?.id).toBe('stone-hitheal');
  });

  it('satisfies lower bounds / minimum requirements FIRST before applying priority ordering', () => {
    const pokeWithRequirements: PokemonProfile = {
      id: 'test-req-poke',
      pokedexId: 68,
      name: 'Requirement Machamp',
      level: 100,
      useCustomPriorities: true,
      useCustomMinRequirements: true,
      priorities: ['HIT_HEAL', 'CRIT_RATE', 'STAT_STRENGTH'], // Priority #1 is Hit Heal
      minRequirements: {
        minAtkPower: 1500,
        minSubStats: {
          STATUS_RESIST: 50.0, // Lower bound requirement on Status Resist (not priority #1)
        },
      },
      sockets: [
        { slotIndex: 0, type: 'MULTI', isUnlocked: true },
        { slotIndex: 1, type: 'MULTI', isUnlocked: true },
      ],
    };

    const stones: PowerStone[] = [
      {
        id: 'stone-prio-only',
        type: 'ATK',
        power: 900,
        subStats: [{ type: 'HIT_HEAL', value: 2.5 }],
        isLocked: false,
      },
      {
        id: 'stone-meets-status-resist',
        type: 'ATK',
        power: 800,
        subStats: [{ type: 'STATUS_RESIST', value: 60.0 }],
        isLocked: false,
      },
      {
        id: 'stone-high-atk',
        type: 'ATK',
        power: 850,
        subStats: [{ type: 'CRIT_RATE', value: 10.0 }],
        isLocked: false,
      },
    ];

    const result = optimizeBuild(pokeWithRequirements, stones);

    expect(result.isRequirementSatisfied).toBe(true);
    expect(result.unmetRequirements.length).toBe(0);

    const equippedIds = Array.from(result.assignments.values()).map(s => s.id);
    // Must contain stone-meets-status-resist to satisfy the lower bound
    expect(equippedIds).toContain('stone-meets-status-resist');
  });

  it('allows configuring custom minimum requirements independently from custom priorities (one, both, or neither)', () => {
    // Only custom min requirements (uses global priorities)
    const customReqOnlyPoke: PokemonProfile = {
      id: 'poke-custom-req-only',
      pokedexId: 68,
      name: 'Req Only Machamp',
      level: 100,
      useCustomPriorities: false,
      useCustomMinRequirements: true,
      minRequirements: {
        minSubStats: { MOVE_SPEED: 40.0 },
      },
      sockets: [{ slotIndex: 0, type: 'ATK', isUnlocked: true }],
    };

    const stones: PowerStone[] = [
      { id: 'stone-speed', type: 'ATK', power: 700, subStats: [{ type: 'MOVE_SPEED', value: 45.0 }], isLocked: false },
      { id: 'stone-crit', type: 'ATK', power: 900, subStats: [{ type: 'CRIT_RATE', value: 20.0 }], isLocked: false },
    ];

    // Global priorities has CRIT_RATE first, but custom requirement forces MOVE_SPEED
    const result = optimizeBuild(customReqOnlyPoke, stones, {
      globalPriorities: ['CRIT_RATE', 'HIT_HEAL', 'MOVE_SPEED'],
    });

    expect(result.isRequirementSatisfied).toBe(true);
    expect(result.assignments.get(0)?.id).toBe('stone-speed');
  });

  it('reports isRequirementSatisfied: false and unmetRequirements when requirements cannot be met', () => {
    const impossiblePokemon: PokemonProfile = {
      id: 'impossible-poke',
      pokedexId: 65,
      name: 'High Expectation Alakazam',
      level: 100,
      useCustomMinRequirements: true,
      minRequirements: {
        minAtkPower: 5000, // 2 slots cannot reach 5000 power
        minSubStats: {
          HIT_HEAL: 10.0,  // stones only have 2.0%
        },
      },
      sockets: [
        { slotIndex: 0, type: 'ATK', isUnlocked: true },
        { slotIndex: 1, type: 'ATK', isUnlocked: true },
      ],
    };

    const stones: PowerStone[] = [
      {
        id: 'stone-1',
        type: 'ATK',
        power: 800,
        subStats: [{ type: 'HIT_HEAL', value: 2.0 }],
        isLocked: false,
      },
      {
        id: 'stone-2',
        type: 'ATK',
        power: 800,
        subStats: [],
        isLocked: false,
      },
    ];

    const result = optimizeBuild(impossiblePokemon, stones);

    expect(result.isRequirementSatisfied).toBe(false);
    expect(result.unmetRequirements.length).toBe(2);

    const atkError = result.unmetRequirements.find(u => u.statKey === 'ATK_POWER');
    expect(atkError).toBeDefined();
    expect(atkError?.required).toBe(5000);
    expect(atkError?.achieved).toBe(1600);

    const hitHealError = result.unmetRequirements.find(u => u.statKey === 'HIT_HEAL');
    expect(hitHealError).toBeDefined();
    expect(hitHealError?.required).toBe(10.0);
    expect(hitHealError?.achieved).toBe(2.0);
  });

  it('detects unmet requirements across a team build in optimizeTeamBuild', () => {
    const p1: PokemonProfile = {
      id: 'p1',
      pokedexId: 1,
      name: 'Bulbasaur',
      level: 100,
      useCustomMinRequirements: true,
      minRequirements: { minAtkPower: 1000 },
      sockets: [{ slotIndex: 0, type: 'ATK', isUnlocked: true }],
    };

    const p2: PokemonProfile = {
      id: 'p2',
      pokedexId: 4,
      name: 'Charmander',
      level: 100,
      useCustomMinRequirements: true,
      minRequirements: { minAtkPower: 1000 }, // Only 1 ATK stone exists with 800 power
      sockets: [{ slotIndex: 0, type: 'ATK', isUnlocked: true }],
    };

    const stones: PowerStone[] = [
      { id: 'stone-atk', type: 'ATK', power: 800, subStats: [], isLocked: false },
    ];

    const teamResult = optimizeTeamBuild([p1, p2], stones);
    expect(teamResult.isAllSatisfied).toBe(false);
    expect(teamResult.unmetRequirementsByPokemon.size).toBeGreaterThan(0);
  });
});

