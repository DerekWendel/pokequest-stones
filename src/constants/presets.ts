import type { StatWeights } from '../types';

export interface WeightPreset {
  id: string;
  name: string;
  description: string;
  weights: StatWeights;
}

export const WEIGHT_PRESETS: WeightPreset[] = [
  {
    id: 'hit_heal_buffer',
    name: 'Hit Heal Buffer / Bulk Carry',
    description: 'Prioritizes max 10% Hit Healing and Status Resistance to ensure relentless bulk and sustain.',
    weights: {
      powerWeight: 0.05,
      weights: {
        HIT_HEAL: 10,
        HEAL_FROM_KO: 6,
        STATUS_RESIST: 8,
        STAT_LOWER_RESIST: 8,
        CRIT_RATE: 6,
        CRIT_DMG: 6,
        MOVE_SPEED: 4,
        NATURAL_HEAL: 2,
        TIME_TO_RECOVER: 3,
        HP_UPON_RECOVERY: 2,
        STAT_STRENGTH: 5,
      },
    },
  },
  {
    id: 'glass_cannon',
    name: 'Glass Cannon DPS',
    description: 'Max crit rate and crit damage to obliterate bosses and clear waves instantly.',
    weights: {
      powerWeight: 0.1,
      weights: {
        CRIT_RATE: 10,
        CRIT_DMG: 10,
        HIT_HEAL: 7,
        HEAL_FROM_KO: 5,
        STATUS_RESIST: 5,
        STAT_LOWER_RESIST: 5,
        MOVE_SPEED: 4,
        NATURAL_HEAL: 1,
        TIME_TO_RECOVER: 2,
        HP_UPON_RECOVERY: 1,
        STAT_STRENGTH: 5,
      },
    },
  },
  {
    id: 'immortal_tank',
    name: 'Immortal Wall / Tank',
    description: 'Maximizes status resistance, natural recovery, and revival stats for pure survivability.',
    weights: {
      powerWeight: 0.02,
      weights: {
        STATUS_RESIST: 10,
        STAT_LOWER_RESIST: 10,
        HIT_HEAL: 9,
        HEAL_FROM_KO: 6,
        TIME_TO_RECOVER: 8,
        HP_UPON_RECOVERY: 7,
        NATURAL_HEAL: 5,
        MOVE_SPEED: 4,
        CRIT_RATE: 2,
        CRIT_DMG: 2,
        STAT_STRENGTH: 3,
      },
    },
  },
  {
    id: 'speedrunner',
    name: 'Speedrunner / Fast Clear',
    description: 'Max move speed and raw power for speedrunning expeditions.',
    weights: {
      powerWeight: 0.1,
      weights: {
        MOVE_SPEED: 10,
        HIT_HEAL: 8,
        HEAL_FROM_KO: 6,
        CRIT_RATE: 8,
        CRIT_DMG: 7,
        STATUS_RESIST: 5,
        STAT_LOWER_RESIST: 5,
        NATURAL_HEAL: 1,
        TIME_TO_RECOVER: 2,
        HP_UPON_RECOVERY: 1,
        STAT_STRENGTH: 5,
      },
    },
  },
  {
    id: 'pure_power',
    name: 'Pure Power Maximizer',
    description: 'Heavily prioritizes primary stone power over sub-stats.',
    weights: {
      powerWeight: 0.3,
      weights: {
        HIT_HEAL: 5,
        HEAL_FROM_KO: 4,
        CRIT_RATE: 4,
        CRIT_DMG: 4,
        STATUS_RESIST: 3,
        STAT_LOWER_RESIST: 3,
        MOVE_SPEED: 3,
        NATURAL_HEAL: 2,
        TIME_TO_RECOVER: 2,
        HP_UPON_RECOVERY: 2,
        STAT_STRENGTH: 10,
      },
    },
  },
];
