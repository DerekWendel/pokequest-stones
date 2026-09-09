import type { PokemonProfile, PokemonSocket, PowerStone, SocketType, StatRequirements, SubStatType, UnmetRequirement } from '../types';
import { calculateEquippedStats, compareTuples } from './scoring';
import { DEFAULT_PRIORITY_ORDER, SUB_STAT_DEFINITIONS } from '../constants/stats';

export interface OptimizationResult {
  assignments: Map<number, PowerStone>;
  equippedStonesList: PowerStone[];
  totalAssigned: number;
  unfilledSlots: number;
  isRequirementSatisfied: boolean;
  unmetRequirements: UnmetRequirement[];
  updatedSockets: PokemonSocket[];
}

export interface TeamOptimizationResult {
  teamAssignments: Map<string, Map<number, PowerStone>>; // pokemonId -> slotIndex -> PowerStone
  teamSockets: Map<string, PokemonSocket[]>; // pokemonId -> updatedSockets
  totalStonesUsed: number;
  resultsByPokemon: Map<string, OptimizationResult>;
  isAllSatisfied: boolean;
  unmetRequirementsByPokemon: Map<string, UnmetRequirement[]>;
}

export interface SocketCapacities {
  maxAtk: number;
  maxHp: number;
  totalUnlocked: number;
  fixedAtkCount: number;
  fixedHpCount: number;
  multiCount: number;
}

export function getSocketCapacities(sockets: PokemonSocket[]): SocketCapacities {
  const unlocked = sockets.filter(s => s.isUnlocked);
  let fixedAtkCount = 0;
  let fixedHpCount = 0;
  let multiCount = 0;

  for (const s of unlocked) {
    if (s.type === 'ATK') fixedAtkCount++;
    else if (s.type === 'HP') fixedHpCount++;
    else multiCount++;
  }

  return {
    maxAtk: fixedAtkCount + multiCount,
    maxHp: fixedHpCount + multiCount,
    totalUnlocked: unlocked.length,
    fixedAtkCount,
    fixedHpCount,
    multiCount,
  };
}

export function canFitStoneTypes(
  atkCount: number,
  hpCount: number,
  capacities: SocketCapacities
): boolean {
  if (atkCount + hpCount > capacities.totalUnlocked) return false;
  const excessAtk = Math.max(0, atkCount - capacities.fixedAtkCount);
  const excessHp = Math.max(0, hpCount - capacities.fixedHpCount);
  return excessAtk + excessHp <= capacities.multiCount;
}

export interface PokemonStateEval {
  isSatisfied: boolean;
  unmetCount: number;
  normalizedDeficit: number;
  scoreTuple: number[]; // [delta_rank0, delta_rank1, ..., power * 0.0001]
  totalPower: number;
}

export function evaluatePokemonBuild(
  equipped: PowerStone[],
  pokemon: PokemonProfile,
  globalPriorities?: SubStatType[],
  globalMinRequirements?: StatRequirements
): PokemonStateEval {
  const priorityOrder = (pokemon.useCustomPriorities && pokemon.priorities && pokemon.priorities.length > 0)
    ? pokemon.priorities
    : (globalPriorities || DEFAULT_PRIORITY_ORDER);

  const effectiveRequirements = pokemon.useCustomMinRequirements
    ? pokemon.minRequirements
    : globalMinRequirements;

  const stats = calculateEquippedStats(equipped);
  let unmetCount = 0;
  let normalizedDeficit = 0;

  if (effectiveRequirements) {
    if (effectiveRequirements.minAtkPower && effectiveRequirements.minAtkPower > 0) {
      if (stats.atkPower < effectiveRequirements.minAtkPower) {
        unmetCount++;
        normalizedDeficit += (effectiveRequirements.minAtkPower - stats.atkPower) / effectiveRequirements.minAtkPower;
      }
    }

    if (effectiveRequirements.minHpPower && effectiveRequirements.minHpPower > 0) {
      if (stats.hpPower < effectiveRequirements.minHpPower) {
        unmetCount++;
        normalizedDeficit += (effectiveRequirements.minHpPower - stats.hpPower) / effectiveRequirements.minHpPower;
      }
    }

    if (effectiveRequirements.minSubStats) {
      for (const [keyStr, reqVal] of Object.entries(effectiveRequirements.minSubStats)) {
        const key = keyStr as SubStatType;
        if (reqVal && reqVal > 0) {
          const achieved = stats.subStats[key]?.effective ?? 0;
          if (achieved < reqVal) {
            unmetCount++;
            normalizedDeficit += (reqVal - achieved) / reqVal;
          }
        }
      }
    }
  }

  const n = priorityOrder.length;
  const scoreTuple: number[] = new Array(n + 1).fill(0);
  for (let k = 0; k < n; k++) {
    const key = priorityOrder[k];
    if (key === 'STAT_STRENGTH') {
      scoreTuple[k] = stats.totalPower / 1000;
    } else {
      scoreTuple[k] = stats.subStats[key]?.effective ?? 0;
    }
  }
  scoreTuple[n] = stats.totalPower * 0.0001;

  return {
    isSatisfied: unmetCount === 0,
    unmetCount,
    normalizedDeficit,
    scoreTuple,
    totalPower: stats.totalPower,
  };
}

export function comparePokemonStateEvals(a: PokemonStateEval, b: PokemonStateEval): number {
  // 1. Satisfaction
  if (a.isSatisfied !== b.isSatisfied) {
    return a.isSatisfied ? 1 : -1;
  }
  // 2. Unmet requirement count (fewer is better)
  if (a.unmetCount !== b.unmetCount) {
    return b.unmetCount - a.unmetCount;
  }
  // 3. Lower normalized deficit
  if (Math.abs(a.normalizedDeficit - b.normalizedDeficit) > 0.0001) {
    return b.normalizedDeficit - a.normalizedDeficit;
  }
  // 4. Lexicographical priority tuple
  return compareTuples(a.scoreTuple, b.scoreTuple);
}

/**
 * Builds the final UnmetRequirement list for reporting to the UI.
 */
export function getUnmetRequirementsList(
  equipped: PowerStone[],
  pokemon: PokemonProfile,
  globalMinRequirements?: StatRequirements
): UnmetRequirement[] {
  const effectiveRequirements = pokemon.useCustomMinRequirements
    ? pokemon.minRequirements
    : globalMinRequirements;

  if (!effectiveRequirements) return [];

  const stats = calculateEquippedStats(equipped);
  const unmet: UnmetRequirement[] = [];

  if (effectiveRequirements.minAtkPower && effectiveRequirements.minAtkPower > 0) {
    if (stats.atkPower < effectiveRequirements.minAtkPower) {
      unmet.push({
        statLabel: 'Attack Power',
        statKey: 'ATK_POWER',
        required: effectiveRequirements.minAtkPower,
        achieved: stats.atkPower,
        unit: '',
      });
    }
  }

  if (effectiveRequirements.minHpPower && effectiveRequirements.minHpPower > 0) {
    if (stats.hpPower < effectiveRequirements.minHpPower) {
      unmet.push({
        statLabel: 'Defense / HP Power',
        statKey: 'HP_POWER',
        required: effectiveRequirements.minHpPower,
        achieved: stats.hpPower,
        unit: '',
      });
    }
  }

  if (effectiveRequirements.minSubStats) {
    for (const [keyStr, reqVal] of Object.entries(effectiveRequirements.minSubStats)) {
      const key = keyStr as SubStatType;
      if (reqVal && reqVal > 0) {
        const achieved = stats.subStats[key]?.effective ?? 0;
        if (achieved < reqVal) {
          const meta = SUB_STAT_DEFINITIONS[key];
          unmet.push({
            statLabel: meta?.label || key,
            statKey: key,
            required: reqVal,
            achieved: achieved,
            unit: meta?.unit || '%',
          });
        }
      }
    }
  }

  return unmet;
}

/**
 * Converts a chosen list of equipped stones into power-sorted grid socket assignments.
 */
export function buildSortedGridAssignments(
  pokemon: PokemonProfile,
  equipped: PowerStone[]
): {
  assignments: Map<number, PowerStone>;
  sortedStones: PowerStone[];
  updatedSockets: PokemonSocket[];
} {
  const sortedStones = [...equipped].sort((a, b) => {
    if (b.power !== a.power) return b.power - a.power;
    if (a.type !== b.type) return a.type === 'ATK' ? -1 : 1;
    const bSubCount = b.subStats?.length || 0;
    const aSubCount = a.subStats?.length || 0;
    if (bSubCount !== aSubCount) return bSubCount - aSubCount;
    return a.id.localeCompare(b.id);
  });

  const sortedUnlockedSockets = [...pokemon.sockets]
    .filter(s => s.isUnlocked)
    .sort((a, b) => a.slotIndex - b.slotIndex);

  const assignments = new Map<number, PowerStone>();
  const socketTypeMap = new Map<number, SocketType>();

  for (let i = 0; i < sortedUnlockedSockets.length; i++) {
    const socket = sortedUnlockedSockets[i];
    const stone = sortedStones[i];
    if (stone) {
      assignments.set(socket.slotIndex, stone);
      socketTypeMap.set(socket.slotIndex, stone.type);
    }
  }

  const updatedSockets: PokemonSocket[] = pokemon.sockets.map(s => {
    if (socketTypeMap.has(s.slotIndex)) {
      return {
        ...s,
        type: socketTypeMap.get(s.slotIndex)!,
      };
    }
    return s;
  });

  return { assignments, sortedStones, updatedSockets };
}

/**
 * Deterministic Greedy Constrained Optimization solver for a single Pokémon.
 */
export function optimizeBuild(
  pokemon: PokemonProfile,
  allStones: PowerStone[],
  options: {
    excludedStoneIds?: Set<string>;
    globalPriorities?: SubStatType[];
    globalMinRequirements?: StatRequirements;
    filterAssigned?: boolean;
  } = {}
): OptimizationResult {
  const {
    excludedStoneIds = new Set<string>(),
    globalPriorities,
    globalMinRequirements,
    filterAssigned = true,
  } = options;

  // Filter stone pool
  const pool: PowerStone[] = allStones.filter(stone => {
    if (excludedStoneIds.has(stone.id)) return false;
    if (filterAssigned && stone.assignedPokemonId && stone.assignedPokemonId !== pokemon.id) {
      return false;
    }
    return true;
  });

  // Canonical tie-breaking: sort pool by (power DESC, id ASC)
  pool.sort((a, b) => (b.power !== a.power ? b.power - a.power : a.id.localeCompare(b.id)));

  const capacities = getSocketCapacities(pokemon.sockets);
  const equipped: PowerStone[] = [];
  let atkCount = 0;
  let hpCount = 0;

  // Phase 1: Forward Greedy Assignment respecting socket capacities and deficit elimination
  for (let slot = 0; slot < capacities.totalUnlocked; slot++) {
    let bestIndex = -1;
    let bestEval: PokemonStateEval | null = null;

    for (let i = 0; i < pool.length; i++) {
      const stone = pool[i];
      const nextAtk = atkCount + (stone.type === 'ATK' ? 1 : 0);
      const nextHp = hpCount + (stone.type === 'HP' ? 1 : 0);

      if (!canFitStoneTypes(nextAtk, nextHp, capacities)) {
        continue;
      }

      const simEquipped = [...equipped, stone];
      const simEval = evaluatePokemonBuild(simEquipped, pokemon, globalPriorities, globalMinRequirements);

      if (!bestEval || comparePokemonStateEvals(simEval, bestEval) > 0) {
        bestEval = simEval;
        bestIndex = i;
      }
    }

    if (bestIndex !== -1) {
      const chosen = pool[bestIndex];
      equipped.push(chosen);
      if (chosen.type === 'ATK') atkCount++;
      else hpCount++;
      pool.splice(bestIndex, 1);
    }
  }

  // Phase 2: Local 1-Opt Swap Refinement (Hill Climbing to convergence)
  let improved = true;
  let pass = 0;
  const MAX_PASSES = 50;

  while (improved && pass++ < MAX_PASSES) {
    improved = false;
    const currentEval = evaluatePokemonBuild(equipped, pokemon, globalPriorities, globalMinRequirements);

    for (let eqIdx = 0; eqIdx < equipped.length; eqIdx++) {
      const currentStone = equipped[eqIdx];

      for (let poolIdx = 0; poolIdx < pool.length; poolIdx++) {
        const candidate = pool[poolIdx];

        const testAtk = atkCount - (currentStone.type === 'ATK' ? 1 : 0) + (candidate.type === 'ATK' ? 1 : 0);
        const testHp = hpCount - (currentStone.type === 'HP' ? 1 : 0) + (candidate.type === 'HP' ? 1 : 0);

        if (!canFitStoneTypes(testAtk, testHp, capacities)) {
          continue;
        }

        const simEquipped = [...equipped];
        simEquipped[eqIdx] = candidate;
        const simEval = evaluatePokemonBuild(simEquipped, pokemon, globalPriorities, globalMinRequirements);

        if (comparePokemonStateEvals(simEval, currentEval) > 0) {
          equipped[eqIdx] = candidate;
          pool[poolIdx] = currentStone;
          atkCount = testAtk;
          hpCount = testHp;
          improved = true;
          break; // restart inner scan with improved state
        }
      }
      if (improved) break;
    }
  }

  const { assignments, sortedStones, updatedSockets } = buildSortedGridAssignments(pokemon, equipped);
  const unmetRequirements = getUnmetRequirementsList(sortedStones, pokemon, globalMinRequirements);

  return {
    assignments,
    equippedStonesList: sortedStones,
    totalAssigned: assignments.size,
    unfilledSlots: capacities.totalUnlocked - assignments.size,
    isRequirementSatisfied: unmetRequirements.length === 0,
    unmetRequirements,
    updatedSockets,
  };
}

/**
 * Optimizes power stone allocations across an entire active team (1, 2, or 3 Pokémon)
 * using a Global Constrained Matching engine with Inter-Pokémon 2-Opt Swaps.
 */
export function optimizeTeamBuild(
  team: PokemonProfile[],
  allStones: PowerStone[],
  options: {
    excludedStoneIds?: Set<string>;
    globalPriorities?: SubStatType[];
    globalMinRequirements?: StatRequirements;
  } = {}
): TeamOptimizationResult {
  const {
    excludedStoneIds = new Set<string>(),
    globalPriorities,
    globalMinRequirements,
  } = options;

  // Available stones pool includes unassigned stones and stones assigned to any member of this team
  const teamMemberIds = new Set(team.map(p => p.id));
  const pool: PowerStone[] = allStones.filter(s => {
    if (excludedStoneIds.has(s.id)) return false;
    return !s.assignedPokemonId || teamMemberIds.has(s.assignedPokemonId);
  });

  // Pre-sort canonically: (power DESC, id ASC)
  pool.sort((a, b) => (b.power !== a.power ? b.power - a.power : a.id.localeCompare(b.id)));

  // Team equipped lists: Map<pokemonId, PowerStone[]>
  const teamEquipped = new Map<string, PowerStone[]>();
  const remainingPool = [...pool];

  // Step 1: Initial Hierarchical Greedy Allocation (P1 -> P2 -> P3)
  for (const pokemon of team) {
    const res = optimizeBuild(pokemon, remainingPool, {
      ...options,
      filterAssigned: false, // pool is already cleaned and shared
    });

    const chosen = res.equippedStonesList;
    teamEquipped.set(pokemon.id, chosen);

    // Remove chosen stones from remaining bench pool
    const chosenIds = new Set(chosen.map(s => s.id));
    for (let i = remainingPool.length - 1; i >= 0; i--) {
      if (chosenIds.has(remainingPool[i].id)) {
        remainingPool.splice(i, 1);
      }
    }
  }

  function calculateCurrentTeamDeficit() {
    let unmetTotal = 0;
    let deficitTotal = 0;
    for (const p of team) {
      const eq = teamEquipped.get(p.id) || [];
      const ev = evaluatePokemonBuild(eq, p, globalPriorities, globalMinRequirements);
      if (!ev.isSatisfied) {
        unmetTotal += ev.unmetCount;
        deficitTotal += ev.normalizedDeficit;
      }
    }
    return { unmetTotal, deficitTotal };
  }

  // Step 2: Team-Wide Multi-Way Matching & Ejection Chains (Global 2-Opt + 3-Way Swaps)
  let teamImproved = true;
  let teamPass = 0;
  const MAX_TEAM_PASSES = 60;

  while (teamImproved && teamPass++ < MAX_TEAM_PASSES) {
    teamImproved = false;

    // Pass A: Inter-Pokémon Swaps between all pairs (P_a ↔ P_b) where index a < b
    for (let a = 0; a < team.length; a++) {
      for (let b = a + 1; b < team.length; b++) {
        const pokeA = team[a];
        const pokeB = team[b];

        const capA = getSocketCapacities(pokeA.sockets);
        const capB = getSocketCapacities(pokeB.sockets);

        const stonesA = teamEquipped.get(pokeA.id) || [];
        const stonesB = teamEquipped.get(pokeB.id) || [];

        const evalA = evaluatePokemonBuild(stonesA, pokeA, globalPriorities, globalMinRequirements);
        const evalB = evaluatePokemonBuild(stonesB, pokeB, globalPriorities, globalMinRequirements);

        for (let idxA = 0; idxA < stonesA.length; idxA++) {
          for (let idxB = 0; idxB < stonesB.length; idxB++) {
            const stoneA = stonesA[idxA];
            const stoneB = stonesB[idxB];

            // Test if stoneB can fit into pokeA, and stoneA can fit into pokeB
            const atkA = stonesA.filter((s, i) => (i === idxA ? stoneB.type === 'ATK' : s.type === 'ATK')).length;
            const hpA = stonesA.length - atkA;
            if (!canFitStoneTypes(atkA, hpA, capA)) continue;

            const atkB = stonesB.filter((s, i) => (i === idxB ? stoneA.type === 'ATK' : s.type === 'ATK')).length;
            const hpB = stonesB.length - atkB;
            if (!canFitStoneTypes(atkB, hpB, capB)) continue;

            const simStonesA = [...stonesA];
            simStonesA[idxA] = stoneB;
            const simEvalA = evaluatePokemonBuild(simStonesA, pokeA, globalPriorities, globalMinRequirements);

            const simStonesB = [...stonesB];
            simStonesB[idxB] = stoneA;
            const simEvalB = evaluatePokemonBuild(simStonesB, pokeB, globalPriorities, globalMinRequirements);

            const cmpA = comparePokemonStateEvals(simEvalA, evalA);
            const cmpB = comparePokemonStateEvals(simEvalB, evalB);

            let acceptSwap = false;

            // Condition 1: Fixes unmet requirement on either Pokemon without breaking requirements on the other
            const oldTeamUnmet = (evalA.isSatisfied ? 0 : evalA.unmetCount) + (evalB.isSatisfied ? 0 : evalB.unmetCount);
            const newTeamUnmet = (simEvalA.isSatisfied ? 0 : simEvalA.unmetCount) + (simEvalB.isSatisfied ? 0 : simEvalB.unmetCount);
            const oldTeamDeficit = evalA.normalizedDeficit + evalB.normalizedDeficit;
            const newTeamDeficit = simEvalA.normalizedDeficit + simEvalB.normalizedDeficit;

            if (newTeamUnmet < oldTeamUnmet) {
              acceptSwap = true;
            } else if (newTeamUnmet === oldTeamUnmet && newTeamDeficit < oldTeamDeficit - 0.001) {
              acceptSwap = true;
            } else if (evalA.isSatisfied && evalB.isSatisfied && simEvalA.isSatisfied && simEvalB.isSatisfied) {
              // Condition 2: Both satisfied — P_a (higher priority) strictly improves
              if (cmpA > 0) {
                acceptSwap = true;
              }
              // Condition 3: P_a is completely indifferent (equal score & power), but P_b strictly improves
              else if (cmpA === 0 && cmpB > 0) {
                acceptSwap = true;
              }
            }

            if (acceptSwap) {
              stonesA[idxA] = stoneB;
              stonesB[idxB] = stoneA;
              teamImproved = true;
              break;
            }
          }
          if (teamImproved) break;
        }
        if (teamImproved) break;
      }
      if (teamImproved) break;
    }

    if (teamImproved) continue;

    // Pass B: Bench Swaps between any Pokemon and remaining bench stones
    for (const pokemon of team) {
      const cap = getSocketCapacities(pokemon.sockets);
      const equipped = teamEquipped.get(pokemon.id) || [];
      const currentEval = evaluatePokemonBuild(equipped, pokemon, globalPriorities, globalMinRequirements);

      for (let eqIdx = 0; eqIdx < equipped.length; eqIdx++) {
        const curStone = equipped[eqIdx];

        for (let bIdx = 0; bIdx < remainingPool.length; bIdx++) {
          const benchStone = remainingPool[bIdx];

          const testAtk = equipped.filter((s, i) => (i === eqIdx ? benchStone.type === 'ATK' : s.type === 'ATK')).length;
          const testHp = equipped.length - testAtk;
          if (!canFitStoneTypes(testAtk, testHp, cap)) continue;

          const simEquipped = [...equipped];
          simEquipped[eqIdx] = benchStone;
          const simEval = evaluatePokemonBuild(simEquipped, pokemon, globalPriorities, globalMinRequirements);

          if (comparePokemonStateEvals(simEval, currentEval) > 0) {
            equipped[eqIdx] = benchStone;
            remainingPool[bIdx] = curStone;
            teamImproved = true;
            break;
          }
        }
        if (teamImproved) break;
      }
      if (teamImproved) break;
    }

    if (teamImproved) continue;

    // Pass C: Coordinated Multi-Stone Swaps / Ejection Chains
    // When team still has unmet requirements, evaluate coordinated trades between pairs of Pokemon and the bench
    const curDeficit = calculateCurrentTeamDeficit();
    if (curDeficit.unmetTotal > 0) {
      for (let a = 0; a < team.length; a++) {
        for (let b = 0; b < team.length; b++) {
          if (a === b) continue;
          const pokeA = team[a];
          const pokeB = team[b];
          const capA = getSocketCapacities(pokeA.sockets);
          const capB = getSocketCapacities(pokeB.sockets);
          const stonesA = teamEquipped.get(pokeA.id) || [];
          const stonesB = teamEquipped.get(pokeB.id) || [];

          const evalA = evaluatePokemonBuild(stonesA, pokeA, globalPriorities, globalMinRequirements);
          const evalB = evaluatePokemonBuild(stonesB, pokeB, globalPriorities, globalMinRequirements);
          const oldUnmet = (evalA.isSatisfied ? 0 : evalA.unmetCount) + (evalB.isSatisfied ? 0 : evalB.unmetCount);
          const oldDeficit = evalA.normalizedDeficit + evalB.normalizedDeficit;

          // Pattern 1 & 2: Single-stone transfer with bench replacement
          for (let idxA = 0; idxA < stonesA.length; idxA++) {
            const sA = stonesA[idxA];
            for (let idxB = 0; idxB < stonesB.length; idxB++) {
              const sB = stonesB[idxB];
              for (let idxBench = 0; idxBench < remainingPool.length; idxBench++) {
                const sBench = remainingPool[idxBench];

                // Coordinated Pattern 1: pokeB takes sA (replacing sB -> bench), pokeA takes sBench (replacing sA)
                {
                  const atkA = stonesA.filter((s, i) => (i === idxA ? sBench.type === 'ATK' : s.type === 'ATK')).length;
                  const hpA = stonesA.length - atkA;
                  const atkB = stonesB.filter((s, i) => (i === idxB ? sA.type === 'ATK' : s.type === 'ATK')).length;
                  const hpB = stonesB.length - atkB;

                  if (canFitStoneTypes(atkA, hpA, capA) && canFitStoneTypes(atkB, hpB, capB)) {
                    const simA = [...stonesA];
                    simA[idxA] = sBench;
                    const simEvalA = evaluatePokemonBuild(simA, pokeA, globalPriorities, globalMinRequirements);

                    const simB = [...stonesB];
                    simB[idxB] = sA;
                    const simEvalB = evaluatePokemonBuild(simB, pokeB, globalPriorities, globalMinRequirements);

                    const newUnmet = (simEvalA.isSatisfied ? 0 : simEvalA.unmetCount) + (simEvalB.isSatisfied ? 0 : simEvalB.unmetCount);
                    const newDef = simEvalA.normalizedDeficit + simEvalB.normalizedDeficit;

                    if (newUnmet < oldUnmet || (newUnmet === oldUnmet && newDef < oldDeficit - 0.001)) {
                      stonesA[idxA] = sBench;
                      stonesB[idxB] = sA;
                      remainingPool[idxBench] = sB;
                      teamImproved = true;
                      break;
                    }
                  }
                }

                // Coordinated Pattern 2: pokeA takes sB (replacing sA -> bench), pokeB takes sBench (replacing sB)
                {
                  const atkA = stonesA.filter((s, i) => (i === idxA ? sB.type === 'ATK' : s.type === 'ATK')).length;
                  const hpA = stonesA.length - atkA;
                  const atkB = stonesB.filter((s, i) => (i === idxB ? sBench.type === 'ATK' : s.type === 'ATK')).length;
                  const hpB = stonesB.length - atkB;

                  if (canFitStoneTypes(atkA, hpA, capA) && canFitStoneTypes(atkB, hpB, capB)) {
                    const simA = [...stonesA];
                    simA[idxA] = sB;
                    const simEvalA = evaluatePokemonBuild(simA, pokeA, globalPriorities, globalMinRequirements);

                    const simB = [...stonesB];
                    simB[idxB] = sBench;
                    const simEvalB = evaluatePokemonBuild(simB, pokeB, globalPriorities, globalMinRequirements);

                    const newUnmet = (simEvalA.isSatisfied ? 0 : simEvalA.unmetCount) + (simEvalB.isSatisfied ? 0 : simEvalB.unmetCount);
                    const newDef = simEvalA.normalizedDeficit + simEvalB.normalizedDeficit;

                    if (newUnmet < oldUnmet || (newUnmet === oldUnmet && newDef < oldDeficit - 0.001)) {
                      stonesA[idxA] = sB;
                      stonesB[idxB] = sBench;
                      remainingPool[idxBench] = sA;
                      teamImproved = true;
                      break;
                    }
                  }
                }
              }
              if (teamImproved) break;
            }
            if (teamImproved) break;
          }

          if (teamImproved) break;

          // Pattern 3: Dual Type-Preserving Compound Swap (pokeB swaps stone of type T1 with pokeA, pokeA swaps stone of type T2 with bench)
          // This allows cross-type rebalancing without violating fixed socket type constraints on either Pokemon!
          for (let idxA1 = 0; idxA1 < stonesA.length; idxA1++) {
            const sA1 = stonesA[idxA1];
            for (let idxB = 0; idxB < stonesB.length; idxB++) {
              const sB = stonesB[idxB];
              if (sA1.type !== sB.type) continue; // Same type between pokeA and pokeB preserves socket capacities

              for (let idxA2 = 0; idxA2 < stonesA.length; idxA2++) {
                if (idxA1 === idxA2) continue;
                const sA2 = stonesA[idxA2];

                for (let idxBench = 0; idxBench < remainingPool.length; idxBench++) {
                  const sBench = remainingPool[idxBench];
                  if (sA2.type !== sBench.type) continue; // Same type between pokeA and bench preserves socket capacities

                  const simA = [...stonesA];
                  simA[idxA1] = sB;
                  simA[idxA2] = sBench;
                  const simEvalA = evaluatePokemonBuild(simA, pokeA, globalPriorities, globalMinRequirements);

                  const simB = [...stonesB];
                  simB[idxB] = sA1;
                  const simEvalB = evaluatePokemonBuild(simB, pokeB, globalPriorities, globalMinRequirements);

                  const newUnmet = (simEvalA.isSatisfied ? 0 : simEvalA.unmetCount) + (simEvalB.isSatisfied ? 0 : simEvalB.unmetCount);
                  const newDef = simEvalA.normalizedDeficit + simEvalB.normalizedDeficit;

                  if (newUnmet < oldUnmet || (newUnmet === oldUnmet && newDef < oldDeficit - 0.001)) {
                    stonesA[idxA1] = sB;
                    stonesA[idxA2] = sBench;
                    stonesB[idxB] = sA1;
                    remainingPool[idxBench] = sA2;
                    teamImproved = true;
                    break;
                  }
                }
                if (teamImproved) break;
              }
              if (teamImproved) break;
            }
            if (teamImproved) break;
          }

          if (teamImproved) break;
        }
        if (teamImproved) break;
      }
    }
  }

  // Step 3: Build Final Results
  const teamAssignments = new Map<string, Map<number, PowerStone>>();
  const teamSockets = new Map<string, PokemonSocket[]>();
  const resultsByPokemon = new Map<string, OptimizationResult>();
  const unmetRequirementsByPokemon = new Map<string, UnmetRequirement[]>();
  const globallyUsedStoneIds = new Set<string>();
  let isAllSatisfied = true;

  for (const pokemon of team) {
    const equipped = teamEquipped.get(pokemon.id) || [];
    const { assignments, sortedStones, updatedSockets } = buildSortedGridAssignments(pokemon, equipped);
    const unmet = getUnmetRequirementsList(sortedStones, pokemon, globalMinRequirements);

    if (unmet.length > 0) {
      isAllSatisfied = false;
      unmetRequirementsByPokemon.set(pokemon.id, unmet);
    }

    const optResult: OptimizationResult = {
      assignments,
      equippedStonesList: sortedStones,
      totalAssigned: assignments.size,
      unfilledSlots: getSocketCapacities(pokemon.sockets).totalUnlocked - assignments.size,
      isRequirementSatisfied: unmet.length === 0,
      unmetRequirements: unmet,
      updatedSockets,
    };

    teamAssignments.set(pokemon.id, assignments);
    teamSockets.set(pokemon.id, updatedSockets);
    resultsByPokemon.set(pokemon.id, optResult);

    assignments.forEach(stone => globallyUsedStoneIds.add(stone.id));
  }

  return {
    teamAssignments,
    teamSockets,
    totalStonesUsed: globallyUsedStoneIds.size,
    resultsByPokemon,
    isAllSatisfied,
    unmetRequirementsByPokemon,
  };
}


