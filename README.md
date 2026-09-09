# 🎮 Pokémon Quest Power Stone & Team Optimizer

An interactive web application and optimization engine for **Pokémon Quest** designed to manage Power Stone inventories, configure Pokémon team rosters, and compute optimal Power Stone socket assignments across an entire team under complex stat caps, priorities, and lower-bound constraints.

🔗 **Live App**: [pokequeststones.web.app](https://pokequeststones.web.app)

---

## 🌟 Key Features

### 1. 🧠 Multi-Objective Team Optimizer Engine
- **Global Inventory Sharing**: Optimizes Power Stone distributions simultaneously across all 3 active team members from a shared stone pool.
- **Cap-Aware Marginal Scoring**: Prevents stat wastage by calculating diminishing and zero returns once a sub-stat reaches its hard cap (e.g., 10.0% Hit Healing, 100.0% Crit Rate).
- **Multi-Phase Optimization Pipeline**:
  - **Pass A (Greedy Heuristic)**: Initial allocation based on cap-aware marginal utility.
  - **Pass B (2-Opt Hill-Climbing Swaps)**: Pairwise and bench swaps to improve team score without violating socket types.
  - **Pass C (Multi-Stone Ejection Chains & Compound Swaps)**: Coordinated multi-stone transfers (e.g., swapping an ATK stone between two teammates while rebalancing an HP stone with the bench) to break out of local optima and satisfy difficult lower-bound constraints.
- **Strict Determinism**: Lexicographic tie-breaking ensures identical runs produce 100% idempotent assignments.

### 2. 📥 Comprehensive Backup & Game Save Import
- **Pokémon Quest Game Save (`user.json`) Import**:
  - Direct import support for decrypted game save files exported from **PqSave**, **PQSE**, and Nintendo Switch homebrew tools (e.g. **Checkpoint** / **EdiZon**).
  - Normalizes stone types (`1` = ATK / Mighty, `2` = HP / Sturdy).
  - Decodes internal sub-effect enum codes (`0`–`10`) and string labels.
  - Auto-detects fixed-point integer scaling (e.g. converting raw values like `28` to `2.8%`).
  - Automatically reconstructs Pokémon profiles, levels, socket types (ATK/HP/Multi), and equipped stone bindings.
- **Full App Backup (`.json`)**: Complete state serialization containing all stones, Pokémon, team setups, custom priorities, and stat requirements with 1-click restore.
- **Spreadsheet CSV Import & Export**: Import and export stones and Pokémon rosters via Excel/Google Sheets-compatible CSV files.
- **Flexible Conflict Resolution**: Supports `Overwrite / Update`, `Replace All`, `Keep Original (Merge)`, and `Duplicate` modes.

### 3. 🎯 Universal Number Input & Validation System
- **Keystroke-Friendly Editing**: Decoupled string state allows free backspacing and re-typing without aggressive snapping or jumping.
- **Authentic Stat Limits**: Inputs dynamically enforce single-stone maximum roll limits (e.g. `2.9%` for Hit Healing, `29.9%` for Critical Hit Rate) rather than arbitrary bounds.
- **Decimal Truncation Beyond Tenths**: Any input with decimals beyond the tenths place is flagged with inline feedback (`⚠️ Truncated to tenths (using 2.5)`) and evaluated at 1 decimal place.

### 4. 🧩 Interactive Power Charm Visualizer & Inventory
- **Power Charm Grid**: 3x3 interactive socket grid with automatic level-based unlock tracking (Level 1–100).
- **Live Cap Progress Bars**: Visual indicator of achieved stats vs cumulative hard caps.
- **Stone Drawer**: Filter by type, search sub-stats, sort by power or score, and lock valuable stones to protect them from batch changes.

---

## 🏗️ Architecture & Component Hierarchy

```
src/
├── components/
│   ├── common/                  # Reusable UI primitives & icons
│   │   ├── CapProgressBar.tsx   # Visual progress bar towards stat hard caps
│   │   ├── GameIcons.tsx        # Authentic Quest-styled SVG icons (Fist, Heart)
│   │   ├── NumericInput.tsx     # Universal free-typing numeric input with truncation
│   │   ├── PokemonSprite.tsx    # Gen 1 sprite renderer with fallback handling
│   │   └── SubStatBadge.tsx     # Color-coded sub-stat pill badges
│   ├── header/
│   │   └── AppHeader.tsx        # Top navigation, global stats, modal triggers
│   ├── inventory/
│   │   ├── StoneCard.tsx        # Individual stone card with sub-stats and lock toggle
│   │   └── StoneDrawer.tsx      # Paginated/filtered inventory list & batch tools
│   ├── modals/
│   │   ├── AddPokemonModal.tsx  # Two-stage Pokémon creator & socket configurator
│   │   ├── AddStoneModal.tsx    # Stone editor with single-stone cap validation
│   │   └── CsvModal.tsx         # Universal data backup, game save, & CSV pipeline
│   ├── optimizer/
│   │   └── OptimizerPanel.tsx   # Priority drag-and-drop, stat bounds, & optimizer run
│   └── visualizer/
│       ├── PokemonHero.tsx      # Active Pokémon banner, level, & stat summary
│       └── PowerCharmGrid.tsx   # 3x3 interactive socket layout and stone dropzone
├── constants/
│   ├── pokedex.ts               # Complete Gen 1 Pokédex (1–151) metadata & base stats
│   └── stats.ts                 # Sub-stat caps, roll ranges, socket unlock rules
├── engine/
│   ├── optimizer.ts             # Multi-pass team optimizer & compound ejection chains
│   └── scoring.ts               # Cap-aware marginal scoring & lexicographic comparator
├── io/
│   ├── csvParser.ts             # CSV & user.json parser, normalizer, and serializer
│   ├── validator.ts             # Zod runtime schemas for data integrity
│   └── fixtures/                # Real-world PqSave & Checkpoint save samples for testing
├── store/
│   └── useBuddyStore.ts         # Zustand centralized store with LocalStorage persistence
└── types/
    └── index.ts                 # Core TypeScript interface definitions
```

---

## 📊 Game Mechanics & Stat Caps Reference

| Sub-Stat | Key | Max Roll / Stone | Hard Cap | Effect |
| :--- | :--- | :--- | :--- | :--- |
| **Hit Healing %** | `HIT_HEAL` | `2.9%` | `10.0%` | Recovers HP equal to a % of damage dealt |
| **Healing from K.O. %** | `HEAL_FROM_KO` | `2.9%` | `10.0%` | Recovers HP upon knocking out an enemy |
| **Critical Hit Rate %** | `CRIT_RATE` | `29.9%` | `100.0%` | Increases chance to land critical hits |
| **Critical Hit Damage %** | `CRIT_DMG` | `29.9%` | `100.0%` | Multiplies damage on critical strikes |
| **Resist Status Conditions %** | `STATUS_RESIST` | `29.9%` | `100.0%` | Prevents Burn, Freeze, Paralyze, Poison, Confusion |
| **Resist to ↓ Effects %** | `STAT_LOWER_RESIST` | `29.9%` | `100.0%` | Prevents Attack, Defense, and Speed debuffs |
| **Movement Speed %** | `MOVE_SPEED` | `69.0%` | `200.0%` | Increases expedition map movement speed |
| **Natural HP Healing %** | `NATURAL_HEAL` | `74.9%` | `300.0%` | Increases passive HP recovery between waves |
| **Time to Recover %** | `TIME_TO_RECOVER` | `-19.9%` | `50.0%` | Decreases revival respawn cooldown |
| **HP upon Recovery %** | `HP_UPON_RECOVERY` | `19.9%` | `50.0%` | Increases HP percentage upon revival |
| **Primary Power** | `STAT_STRENGTH` | `999` | `999` | Base Mighty (ATK) or Sturdy (HP) power |

---

## 💾 Game Save (`user.json`) Import Specification

The application supports importing decrypted Pokémon Quest save files from homebrew tools:

```json
{
  "save_data": {
    "stones": [
      {
        "id": "stone_01",
        "type": 1,
        "power": 998,
        "sub_effects": [
          { "type": 0, "value": 2.8 },
          { "type": 1, "value": 25.4 }
        ],
        "is_locked": true,
        "assigned_pokemon_id": "p_machamp",
        "slot_index": 0
      }
    ],
    "pokemon": [
      {
        "id": "p_machamp",
        "pokedex_id": 68,
        "name": "Machamp",
        "level": 100,
        "slots": [
          { "slot_index": 0, "type": 1 },
          { "slot_index": 1, "type": 2 }
        ]
      }
    ]
  }
}
```

- **Type Normalization**: Maps `1` / `"ATK"` / `"Mighty"` to `ATK`, and `2` / `"HP"` / `"Sturdy"` to `HP`.
- **Sub-Stat Code Mapping**: Decodes `0` (`HIT_HEAL`), `1` (`CRIT_RATE`), `2` (`CRIT_DMG`), `3` (`STATUS_RESIST`), `4` (`STAT_LOWER_RESIST`), `5` (`MOVE_SPEED`), `6` (`NATURAL_HEAL`), `7` (`TIME_TO_RECOVER`), `8` (`HP_UPON_RECOVERY`), `9` (`HEAL_FROM_KO`).
- **Fixed-Point Detection**: Automatically scales `28` -> `2.8%` and `250` -> `25.0%`.

---

## 🛠️ Development & Testing

### Prerequisites
- Node.js 18+
- npm / yarn / pnpm

### Getting Started
```bash
# Clone repository
git clone https://github.com/DerekWendel/pokequest-stones.git
cd pokequest-stones

# Install dependencies
npm install

# Start development server
npm run dev
```

### Running Tests
```bash
# Run Vitest test suite
npm test

# Run linter
npm run lint

# Build production bundle
npm run build
```

---

## 📜 License
MIT License. Pokémon and Pokémon Quest are registered trademarks of Nintendo, Game Freak, and The Pokémon Company. This project is an unofficial open-source fan tool.

