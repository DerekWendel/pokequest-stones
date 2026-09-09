import type { PowerStone, StatWeights, SubStatType } from '../types';
import { SUB_STAT_DEFINITIONS, SUB_STAT_KEYS } from '../constants/stats';

export interface StatSummary {
  totalPower: number;
  atkPower: number;
  hpPower: number;
  subStats: Record<SubStatType, {
    raw: number;
    effective: number;
    cap: number;
    percentOfCap: number;
    isCapped: boolean;
  }>;
}

/**
 * Calculates the current total primary stats and sub-stats for an equipped set of stones.
 */
export function calculateEquippedStats(equippedStones: PowerStone[]): StatSummary {
  let totalPower = 0;
  let atkPower = 0;
  let hpPower = 0;

  const rawSubStats: Record<SubStatType, number> = {
    HIT_HEAL: 0,
    HEAL_FROM_KO: 0,
    CRIT_RATE: 0,
    CRIT_DMG: 0,
    STATUS_RESIST: 0,
    STAT_LOWER_RESIST: 0,
    MOVE_SPEED: 0,
    NATURAL_HEAL: 0,
    TIME_TO_RECOVER: 0,
    HP_UPON_RECOVERY: 0,
    STAT_STRENGTH: 0,
  };

  for (const stone of equippedStones) {
    totalPower += stone.power;
    if (stone.type === 'ATK') {
      atkPower += stone.power;
    } else if (stone.type === 'HP') {
      hpPower += stone.power;
    }

    if (stone.subStats) {
      for (const sub of stone.subStats) {
        if (rawSubStats[sub.type] !== undefined) {
          rawSubStats[sub.type] += sub.value;
        }
      }
    }
  }

  const subStatsResult = {} as StatSummary['subStats'];

  for (const key of SUB_STAT_KEYS) {
    const raw = Number((rawSubStats[key] ?? 0).toFixed(1));
    const cap = SUB_STAT_DEFINITIONS[key]?.hardCap ?? 100;
    const effective = Math.min(raw, cap);
    const percentOfCap = Math.min(100, Number(((effective / cap) * 100).toFixed(1)));
    const isCapped = raw >= cap;

    subStatsResult[key] = {
      raw,
      effective: Number(effective.toFixed(1)),
      cap,
      percentOfCap,
      isCapped,
    };
  }

  subStatsResult.STAT_STRENGTH = {
    raw: totalPower,
    effective: totalPower,
    cap: 999 * 9,
    percentOfCap: Math.min(100, Number(((totalPower / (999 * 9)) * 100).toFixed(1))),
    isCapped: false,
  };

  return {
    totalPower,
    atkPower,
    hpPower,
    subStats: subStatsResult,
  };
}

/**
 * Calculates the uncapped effective increase a candidate stone provides
 * for a specific sub-stat given the currently equipped stones.
 */
export function calculateEffectiveDelta(
  subStatType: SubStatType,
  subStatValue: number,
  currentEquippedStones: PowerStone[]
): number {
  if (subStatType === 'STAT_STRENGTH') return 0;

  const currentTotal = currentEquippedStones.reduce((sum, stone) => {
    const found = stone.subStats?.find(s => s.type === subStatType);
    return sum + (found ? found.value : 0);
  }, 0);

  const cap = SUB_STAT_DEFINITIONS[subStatType]?.hardCap ?? 100;
  const remainingRoom = Math.max(0, cap - currentTotal);
  return Number(Math.max(0, Math.min(remainingRoom, subStatValue)).toFixed(1));
}

/**
 * Builds a lexicographic score tuple for a candidate stone.
 *
 * The tuple has `n + 1` elements:
 *   [delta_rank0, delta_rank1, ..., delta_rank(n-1), power * 0.0001]
 *
 * Comparing tuples element-by-element (compareTuples) guarantees that ANY
 * positive contribution at rank k strictly beats ANY combination of
 * contributions at lower ranks, regardless of their magnitudes.  This is
 * correct even when max_cap values (e.g. NATURAL_HEAL = 300) are large,
 * and is immune to IEEE 754 precision loss because no cross-rank summation
 * occurs.
 */
export function calculateScoreTuple(
  candidateStone: PowerStone,
  currentEquippedStones: PowerStone[],
  priorities: SubStatType[]
): number[] {
  const n = priorities.length;
  const tuple: number[] = new Array(n + 1).fill(0);

  for (let k = 0; k < n; k++) {
    const statKey = priorities[k];
    if (statKey === 'STAT_STRENGTH') {
      tuple[k] = candidateStone.power / 1000;
    } else {
      const sub = candidateStone.subStats?.find(s => s.type === statKey);
      if (sub) {
        const delta = calculateEffectiveDelta(statKey, sub.value, currentEquippedStones);
        if (delta > 0) tuple[k] = delta;
      }
    }
  }

  // Power is the final tiebreaker within any matching tuple prefix.
  tuple[n] = candidateStone.power * 0.0001;
  return tuple;
}

/**
 * Lexicographic comparison of two score tuples.
 * Returns positive if a > b, negative if a < b, 0 if equal.
 */
export function compareTuples(a: number[], b: number[]): number {
  const len = Math.max(a.length, b.length);
  for (let i = 0; i < len; i++) {
    const valA = a[i] ?? 0;
    const valB = b[i] ?? 0;
    const diff = valA - valB;
    if (diff !== 0) return diff;
  }
  return 0;
}

/**
 * Calculates the marginal utility score of candidate stone s given equipped stones C
 * based on user's priority ordering (completing or maximizing higher priority bonuses first).
 *
 * Returns a single scalar for backward compatibility (legacy StatWeights branch).
 * For the priority-array branch, use calculateScoreTuple + compareTuples instead.
 */
export function calculateMarginalScore(
  candidateStone: PowerStone,
  currentEquippedStones: PowerStone[],
  prioritiesOrWeights?: SubStatType[] | StatWeights
): number {
  // If array of ordered priorities is provided, collapse tuple to scalar for
  // backward compatibility (tests, etc.).  The optimizer uses compareTuples directly.
  if (Array.isArray(prioritiesOrWeights)) {
    const tuple = calculateScoreTuple(candidateStone, currentEquippedStones, prioritiesOrWeights);
    // Sum with rank-scaled weights so the returned scalar is meaningful for assertions;
    // use a small base (4) so no IEEE 754 overflow occurs.
    const n = prioritiesOrWeights.length;
    return tuple.slice(0, n).reduce((acc, v, k) => acc + v * Math.pow(4, n - 1 - k), 0)
      + tuple[n]; // power tiebreaker
  }

  // Legacy fallback for StatWeights object:
  const weights = (prioritiesOrWeights?.weights || {}) as Record<SubStatType, number>;
  const powerScore = candidateStone.power * (prioritiesOrWeights?.powerWeight ?? 0.05);

  let subStatScore = 0;
  if (candidateStone.subStats) {
    for (const sub of candidateStone.subStats) {
      const weight = weights[sub.type] ?? 0;
      if (weight > 0) {
        const delta = calculateEffectiveDelta(sub.type, sub.value, currentEquippedStones);
        subStatScore += delta * weight;
      }
    }
  }

  return Number((powerScore + subStatScore).toFixed(3));
}
