import { describe, it, expect } from 'vitest';
import { calculateEffectiveDelta, calculateEquippedStats, calculateMarginalScore, calculateScoreTuple, compareTuples } from './scoring';
import type { PowerStone, StatWeights } from '../types';

describe('Cap-Aware Scoring Engine', () => {
  it('correctly respects 10.0% Hit Healing hard cap', () => {
    const existingStones: PowerStone[] = [
      {
        id: 's1',
        type: 'ATK',
        power: 900,
        subStats: [{ type: 'HIT_HEAL', value: 8.5 }],
        isLocked: false,
      },
    ];

    // Candidate stone with 2.5% Hit Healing
    // Remaining cap room is 10.0 - 8.5 = 1.5%
    const delta = calculateEffectiveDelta('HIT_HEAL', 2.5, existingStones);
    expect(delta).toBeCloseTo(1.5, 2);

    // If already at or above cap (e.g. 10.0%), effective delta is 0
    const cappedStones: PowerStone[] = [
      {
        id: 's2',
        type: 'ATK',
        power: 900,
        subStats: [{ type: 'HIT_HEAL', value: 10.0 }],
        isLocked: false,
      },
    ];
    const deltaWhenCapped = calculateEffectiveDelta('HIT_HEAL', 2.5, cappedStones);
    expect(deltaWhenCapped).toBe(0);
  });

  it('computes marginal score according to formula S(s|C) = (P_s * W_p) + sum(Delta_i * W_i)', () => {
    const equipped: PowerStone[] = [
      {
        id: 's1',
        type: 'ATK',
        power: 900,
        subStats: [{ type: 'HIT_HEAL', value: 7.0 }],
        isLocked: false,
      },
    ];

    const weights: StatWeights = {
      powerWeight: 0.1, // 950 * 0.1 = 95
      weights: {
        HIT_HEAL: 10,       // remaining room = 3.0, stone has 2.0 => delta = 2.0 => 2.0 * 10 = 20
        HEAL_FROM_KO: 0,
        CRIT_RATE: 5,       // remaining room = 100, stone has 10.0 => delta = 10.0 => 10.0 * 5 = 50
        CRIT_DMG: 0,
        STATUS_RESIST: 0,
        STAT_LOWER_RESIST: 0,
        MOVE_SPEED: 0,
        NATURAL_HEAL: 0,
        TIME_TO_RECOVER: 0,
        HP_UPON_RECOVERY: 0,
        STAT_STRENGTH: 0,
      },
    };

    const candidate: PowerStone = {
      id: 'c1',
      type: 'ATK',
      power: 950,
      subStats: [
        { type: 'HIT_HEAL', value: 2.0 },
        { type: 'CRIT_RATE', value: 10.0 },
      ],
      isLocked: false,
    };

    const score = calculateMarginalScore(candidate, equipped, weights);
    // Expected: 95 + 20 + 50 = 165
    expect(score).toBeCloseTo(165.0, 1);
  });

  it('calculates aggregate stats with percent of cap properly', () => {
    const equipped: PowerStone[] = [
      {
        id: 's1',
        type: 'ATK',
        power: 500,
        subStats: [
          { type: 'HIT_HEAL', value: 5.0 },
          { type: 'MOVE_SPEED', value: 50.0 },
        ],
        isLocked: false,
      },
      {
        id: 's2',
        type: 'HP',
        power: 400,
        subStats: [
          { type: 'HIT_HEAL', value: 6.0 }, // Total Hit Heal = 11.0% (over cap of 10.0%)
          { type: 'MOVE_SPEED', value: 50.0 }, // Total Move Speed = 100% (cap is 200%)
        ],
        isLocked: false,
      },
    ];

    const summary = calculateEquippedStats(equipped);
    expect(summary.totalPower).toBe(900);
    expect(summary.atkPower).toBe(500);
    expect(summary.hpPower).toBe(400);

    expect(summary.subStats.HIT_HEAL.raw).toBe(11.0);
    expect(summary.subStats.HIT_HEAL.effective).toBe(10.0);
    expect(summary.subStats.HIT_HEAL.percentOfCap).toBe(100);
    expect(summary.subStats.HIT_HEAL.isCapped).toBe(true);

    expect(summary.subStats.MOVE_SPEED.raw).toBe(100.0);
    expect(summary.subStats.MOVE_SPEED.effective).toBe(100.0);
    expect(summary.subStats.MOVE_SPEED.percentOfCap).toBe(50);
    expect(summary.subStats.MOVE_SPEED.isCapped).toBe(false);
  });

  it('calculates score using priority ordering where rank 1 strictly dominates rank 2 (lexicographic)', () => {
    const stoneA: PowerStone = {
      id: 'stone-a',
      type: 'ATK',
      power: 800,
      subStats: [{ type: 'HIT_HEAL', value: 1.0 }],
      isLocked: false,
    };

    const stoneB: PowerStone = {
      id: 'stone-b',
      type: 'ATK',
      power: 999,
      subStats: [
        { type: 'CRIT_RATE', value: 20.0 },
        { type: 'STAT_LOWER_RESIST', value: 20.0 },
      ],
      isLocked: false,
    };

    // Priority order: HIT_HEAL is #1, CRIT_RATE is #2, STAT_LOWER_RESIST is #3
    const priorities = ['HIT_HEAL', 'CRIT_RATE', 'STAT_LOWER_RESIST'] as const;

    const tupleA = calculateScoreTuple(stoneA, [], priorities as any);
    const tupleB = calculateScoreTuple(stoneB, [], priorities as any);

    // Tuple A: [1.0 (HIT_HEAL), 0, 0, 0.08 (power)]
    // Tuple B: [0, 20.0 (CRIT_RATE), 20.0 (STAT_LOWER_RESIST), 0.0999 (power)]
    // Lexicographically A > B because index 0: 1.0 > 0
    // Any gain at rank 1 strictly beats any combination at lower ranks.
    expect(compareTuples(tupleA, tupleB)).toBeGreaterThan(0);
  });

  it('handles STAT_LOWER_RESIST (100% hard cap) correctly in cap checks', () => {
    const equipped: PowerStone[] = [
      {
        id: 's1',
        type: 'HP',
        power: 900,
        subStats: [{ type: 'STAT_LOWER_RESIST', value: 90.0 }],
        isLocked: false,
      },
    ];

    const delta = calculateEffectiveDelta('STAT_LOWER_RESIST', 20.0, equipped);
    expect(delta).toBeCloseTo(10.0, 2); // 100 - 90 = 10 room
  });

  it('handles HEAL_FROM_KO (10.0% hard cap) correctly in cap checks', () => {
    const equipped: PowerStone[] = [
      {
        id: 's1',
        type: 'ATK',
        power: 900,
        subStats: [{ type: 'HEAL_FROM_KO', value: 8.0 }],
        isLocked: false,
      },
    ];

    const delta = calculateEffectiveDelta('HEAL_FROM_KO', 3.0, equipped);
    expect(delta).toBeCloseTo(2.0, 2); // 10 - 8 = 2 room remaining

    const summary = calculateEquippedStats(equipped);
    expect(summary.subStats.HEAL_FROM_KO.raw).toBe(8.0);
    expect(summary.subStats.HEAL_FROM_KO.cap).toBe(10.0);
    expect(summary.subStats.HEAL_FROM_KO.percentOfCap).toBe(80.0);
    expect(summary.subStats.HEAL_FROM_KO.isCapped).toBe(false);
  });
});
