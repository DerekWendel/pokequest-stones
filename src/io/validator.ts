import { z } from 'zod';

export const SubStatTypeSchema = z.enum([
  'HIT_HEAL',
  'HEAL_FROM_KO',
  'CRIT_RATE',
  'CRIT_DMG',
  'STATUS_RESIST',
  'STAT_LOWER_RESIST',
  'MOVE_SPEED',
  'NATURAL_HEAL',
  'TIME_TO_RECOVER',
  'HP_UPON_RECOVERY',
  'STAT_STRENGTH',
]);

export const StoneTypeSchema = z.enum(['ATK', 'HP']);
export const SocketTypeSchema = z.enum(['ATK', 'HP', 'MULTI']);

export const SubStatSchema = z.object({
  type: SubStatTypeSchema,
  value: z.number().min(0).max(500),
});

export const PowerStoneSchema = z.object({
  id: z.string().min(1),
  type: StoneTypeSchema,
  power: z.number().min(1).max(999),
  subStats: z.array(SubStatSchema).max(3),
  assignedPokemonId: z.string().nullable().optional(),
  assignedSlotIndex: z.number().min(0).max(8).nullable().optional(),
  isLocked: z.boolean().default(false),
});

export const PokemonSocketSchema = z.object({
  slotIndex: z.number().min(0).max(8),
  type: SocketTypeSchema,
  isUnlocked: z.boolean(),
});

export const StatWeightsSchema = z.object({
  powerWeight: z.number().min(0).max(1).optional(),
  weights: z.record(SubStatTypeSchema, z.number().min(0).max(10)).optional(),
});

export const StatRequirementsSchema = z.object({
  minAtkPower: z.number().min(0).max(10000).optional(),
  minHpPower: z.number().min(0).max(10000).optional(),
  minSubStats: z.record(z.string(), z.number().min(0).max(500)).optional(),
}).optional();

export const PokemonProfileSchema = z.object({
  id: z.string().min(1),
  pokedexId: z.number().min(1).max(151),
  name: z.string().min(1),
  level: z.number().min(1).max(100).default(100).optional(),
  sockets: z.array(PokemonSocketSchema).length(9),
  priorities: z.array(SubStatTypeSchema).optional(),
  useCustomPriorities: z.boolean().optional(),
  minRequirements: StatRequirementsSchema,
  useCustomMinRequirements: z.boolean().optional(),
  weights: StatWeightsSchema.optional(),
});

export const StoreDataSchema = z.object({
  version: z.number().optional().default(1),
  stones: z.array(PowerStoneSchema).optional().default([]),
  pokemon: z.array(PokemonProfileSchema).optional().default([]),
  activePokemonId: z.string().nullable().optional(),
  teamPokemonIds: z.array(z.string()).optional(),
  globalPriorities: z.array(SubStatTypeSchema).optional(),
  globalMinRequirements: StatRequirementsSchema,
});

