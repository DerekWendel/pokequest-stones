import { describe, it, expect } from 'vitest';
import {
  getUnlockGroupForPokemon,
  getUnlockLevelsForPokemon,
  getSlotUnlockLevel,
  getUnlockedSlotsForLevel,
  isSlotUnlockedAtLevel,
  POKEMON_UNLOCK_GROUP_MAP,
} from './stats';

describe('Pokemon Quest Slot Unlock System', () => {
  it('correctly maps all 151 Gen 1 Pokemon to their respective groups', () => {
    for (let id = 1; id <= 151; id++) {
      const group = getUnlockGroupForPokemon(id);
      expect(['A', 'B', 'C', 'D', 'E']).toContain(group);
      expect(POKEMON_UNLOCK_GROUP_MAP[id]).toBe(group);
    }
  });

  describe('Group A (Clefairy, Vulpix, Growlithe, Ponyta, Farfetch\'d, Grimer, Onix, Rhyhorn & evolutions)', () => {
    const groupAIds = [35, 36, 37, 38, 58, 59, 77, 78, 83, 88, 89, 95, 111, 112];
    const expectedLevels = [1, 3, 6, 10, 15, 61, 86, 95, 100];

    it('assigns all Group A members and evolutions to Group A', () => {
      groupAIds.forEach(id => {
        expect(getUnlockGroupForPokemon(id)).toBe('A');
        expect(getUnlockLevelsForPokemon(id)).toEqual(expectedLevels);
      });
    });

    it('calculates slot unlocks accurately at different levels for Clefairy (35)', () => {
      expect(getUnlockedSlotsForLevel(1, 35)).toBe(1);
      expect(getUnlockedSlotsForLevel(3, 35)).toBe(2);
      expect(getUnlockedSlotsForLevel(5, 35)).toBe(2);
      expect(getUnlockedSlotsForLevel(6, 35)).toBe(3);
      expect(getUnlockedSlotsForLevel(15, 35)).toBe(5);
      expect(getUnlockedSlotsForLevel(60, 35)).toBe(5);
      expect(getUnlockedSlotsForLevel(61, 35)).toBe(6);
      expect(getUnlockedSlotsForLevel(99, 35)).toBe(8);
      expect(getUnlockedSlotsForLevel(100, 35)).toBe(9);
    });
  });

  describe('Group B (Starters, Pidgey, Rattata, Pikachu, Abra, Machop, Geodude, Gastly, Eevee, Porygon & evolutions)', () => {
    const expectedLevels = [1, 3, 8, 13, 23, 49, 69, 84, 100];

    it('assigns Machamp (68) and evolutions to Group B', () => {
      expect(getUnlockGroupForPokemon(66)).toBe('B'); // Machop
      expect(getUnlockGroupForPokemon(67)).toBe('B'); // Machoke
      expect(getUnlockGroupForPokemon(68)).toBe('B'); // Machamp
      expect(getUnlockLevelsForPokemon(68)).toEqual(expectedLevels);
    });

    it('verifies slot unlock boundaries for Machamp (68)', () => {
      expect(getUnlockedSlotsForLevel(1, 68)).toBe(1);
      expect(getUnlockedSlotsForLevel(3, 68)).toBe(2);
      expect(getUnlockedSlotsForLevel(8, 68)).toBe(3);
      expect(getUnlockedSlotsForLevel(13, 68)).toBe(4);
      expect(getUnlockedSlotsForLevel(23, 68)).toBe(5);
      expect(getUnlockedSlotsForLevel(48, 68)).toBe(5);
      expect(getUnlockedSlotsForLevel(49, 68)).toBe(6);
      expect(getUnlockedSlotsForLevel(69, 68)).toBe(7);
      expect(getUnlockedSlotsForLevel(84, 68)).toBe(8);
      expect(getUnlockedSlotsForLevel(100, 68)).toBe(9);
    });
  });

  describe('Group C (Ekans, Sandshrew, Nidorans, Zubat, Omanyte, Kabuto, etc.)', () => {
    const expectedLevels = [1, 4, 9, 14, 26, 45, 63, 78, 100];

    it('assigns Omastar (139) to Group C', () => {
      expect(getUnlockGroupForPokemon(139)).toBe('C');
      expect(getUnlockLevelsForPokemon(139)).toEqual(expectedLevels);
      expect(getUnlockedSlotsForLevel(4, 139)).toBe(2);
      expect(getUnlockedSlotsForLevel(9, 139)).toBe(3);
      expect(getUnlockedSlotsForLevel(45, 139)).toBe(6);
      expect(getUnlockedSlotsForLevel(78, 139)).toBe(8);
    });
  });

  describe('Group D (Caterpie, Weedle, Oddish, Bellsprout, Slowpoke, Staryu, Ditto, etc.)', () => {
    const expectedLevels = [1, 8, 15, 22, 29, 47, 65, 83, 100];

    it('assigns Butterfree (12) and Ditto (132) to Group D', () => {
      expect(getUnlockGroupForPokemon(12)).toBe('D');
      expect(getUnlockGroupForPokemon(132)).toBe('D');
      expect(getUnlockLevelsForPokemon(12)).toEqual(expectedLevels);
      expect(getUnlockedSlotsForLevel(8, 12)).toBe(2);
      expect(getUnlockedSlotsForLevel(29, 12)).toBe(5);
      expect(getUnlockedSlotsForLevel(47, 12)).toBe(6);
      expect(getUnlockedSlotsForLevel(83, 12)).toBe(8);
    });
  });

  describe('Group E (Legendaries, Dratini line, Magikarp line, Snorlax, Mewtwo, Mew, etc.)', () => {
    const expectedLevels = [1, 13, 29, 36, 42, 47, 52, 71, 100];

    it('assigns Dragonite (149) and Mewtwo (150) to Group E', () => {
      expect(getUnlockGroupForPokemon(147)).toBe('E'); // Dratini
      expect(getUnlockGroupForPokemon(148)).toBe('E'); // Dragonair
      expect(getUnlockGroupForPokemon(149)).toBe('E'); // Dragonite
      expect(getUnlockGroupForPokemon(150)).toBe('E'); // Mewtwo
      expect(getUnlockLevelsForPokemon(149)).toEqual(expectedLevels);
      expect(getUnlockedSlotsForLevel(13, 149)).toBe(2);
      expect(getUnlockedSlotsForLevel(29, 149)).toBe(3);
      expect(getUnlockedSlotsForLevel(52, 149)).toBe(7);
      expect(getUnlockedSlotsForLevel(71, 149)).toBe(8);
    });
  });

  it('checks individual slot unlock level requirements and boolean queries', () => {
    // Group B: Machamp (68)
    expect(getSlotUnlockLevel(0, 68)).toBe(1);
    expect(getSlotUnlockLevel(5, 68)).toBe(49);
    expect(getSlotUnlockLevel(8, 68)).toBe(100);

    expect(isSlotUnlockedAtLevel(5, 48, 68)).toBe(false);
    expect(isSlotUnlockedAtLevel(5, 49, 68)).toBe(true);
  });
});
