import React, { useState, useRef, useEffect } from 'react';
import { useBuddyStore } from '../../store/useBuddyStore';
import {
  exportStonesToCsv,
  downloadCsvFile,
  parseStonesFromCsv,
  detectCsvConflicts,
  exportPokemonToCsv,
  parsePokemonFromCsv,
  detectPokemonConflicts,
  exportFullBackup,
  downloadJsonFile,
  parseFullBackupJson,
  parseUserJsonSave,
  type FullBackupData,
} from '../../io/csvParser';
import { MAX_STONES_LIMIT } from '../../constants/stats';
import type { PokemonProfile, PowerStone } from '../../types';
import { X, Download, Upload, AlertTriangle, CheckCircle, Layers, Database } from 'lucide-react';

interface CsvModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type ImportType = 'FULL_BACKUP' | 'USER_JSON_SAVE' | 'POKEMON_CSV' | 'STONES_CSV';

interface ParsedPayload {
  type: ImportType;
  fileName: string;
  fullBackup?: FullBackupData;
  stones?: PowerStone[];
  pokemon?: PokemonProfile[];
  errors: string[];
  totalRows?: number;
}

export const CsvModal: React.FC<CsvModalProps> = ({ isOpen, onClose }) => {
  const stones = useBuddyStore(state => state.stones);
  const pokemon = useBuddyStore(state => state.pokemon);
  const teamPokemonIds = useBuddyStore(state => state.teamPokemonIds);
  const activePokemonId = useBuddyStore(state => state.activePokemonId);
  const globalPriorities = useBuddyStore(state => state.globalPriorities);
  const globalMinRequirements = useBuddyStore(state => state.globalMinRequirements);

  const bulkAddStones = useBuddyStore(state => state.bulkAddStones);
  const bulkAddPokemon = useBuddyStore(state => state.bulkAddPokemon);
  const importFullBackup = useBuddyStore(state => state.importFullBackup);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [parsedPayload, setParsedPayload] = useState<ParsedPayload | null>(null);
  const [conflictResolution, setConflictResolution] = useState<'overwrite' | 'replace_all' | 'skip' | 'duplicate'>('overwrite');

  const handleClose = () => {
    setParsedPayload(null);
    setConflictResolution('overwrite');
    if (fileInputRef.current) fileInputRef.current.value = '';
    onClose();
  };

  useEffect(() => {
    if (!isOpen) {
      setParsedPayload(null);
      setConflictResolution('overwrite');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  if (!isOpen) return null;

  // Export handlers
  const handleExportFullBackup = () => {
    const jsonStr = exportFullBackup({
      stones,
      pokemon,
      teamPokemonIds,
      activePokemonId,
      globalPriorities,
      globalMinRequirements,
    });
    downloadJsonFile(jsonStr);
  };

  const handleExportStonesCsv = () => {
    const csv = exportStonesToCsv(stones);
    downloadCsvFile(csv);
  };

  const handleExportPokemonCsv = () => {
    const csv = exportPokemonToCsv(pokemon);
    downloadCsvFile(csv, `pokemon_quest_roster_${new Date().toISOString().slice(0, 10)}.csv`);
  };

  // Import handler (auto-detects JSON vs Pokémon CSV vs Stones CSV)
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileName = file.name;
    const isJson = fileName.toLowerCase().endsWith('.json');

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = (event.target?.result as string) || '';

      if (isJson || text.trim().startsWith('{')) {
        // Attempt Full Backup JSON parsing
        const backupResult = parseFullBackupJson(text);
        if (backupResult.data) {
          setParsedPayload({
            type: 'FULL_BACKUP',
            fileName,
            fullBackup: backupResult.data,
            pokemon: backupResult.data.pokemon,
            stones: backupResult.data.stones,
            errors: backupResult.errors,
          });
          return;
        }

        // Attempt Pokemon Quest user.json game save parsing
        const userJsonResult = parseUserJsonSave(text);
        if (userJsonResult.validStones.length > 0 || userJsonResult.validPokemon.length > 0) {
          setParsedPayload({
            type: 'USER_JSON_SAVE',
            fileName,
            pokemon: userJsonResult.validPokemon,
            stones: userJsonResult.validStones,
            errors: [...userJsonResult.errors, ...userJsonResult.warnings],
          });
          return;
        }

        // Neither format succeeded
        setParsedPayload({
          type: 'FULL_BACKUP',
          fileName,
          errors: backupResult.errors.length > 0 ? backupResult.errors : userJsonResult.errors,
        });
        return;
      }

      // Check CSV header to distinguish Pokemon vs Stones
      const firstLine = text.split('\n')[0].toLowerCase();
      if (firstLine.includes('pokedex_id') || firstLine.includes('species_name') || firstLine.includes('slot_1')) {
        // Pokémon CSV
        const result = parsePokemonFromCsv(text);
        setParsedPayload({
          type: 'POKEMON_CSV',
          fileName,
          pokemon: result.validPokemon,
          errors: result.errors,
          totalRows: result.totalRows,
        });
      } else {
        // Default to Stones CSV
        const result = parseStonesFromCsv(text);
        setParsedPayload({
          type: 'STONES_CSV',
          fileName,
          stones: result.validStones,
          errors: result.errors,
          totalRows: result.totalRows,
        });
      }
    };
    reader.readAsText(file);
  };

  const handleApplyImport = () => {
    if (!parsedPayload) return;

    if (parsedPayload.type === 'FULL_BACKUP' && parsedPayload.fullBackup) {
      const mode = conflictResolution === 'replace_all'
        ? 'replace'
        : conflictResolution === 'skip'
        ? 'merge'
        : 'overwrite_existing';
      importFullBackup(parsedPayload.fullBackup, mode);
    } else if (parsedPayload.type === 'USER_JSON_SAVE') {
      const mode = conflictResolution === 'replace_all'
        ? 'replace'
        : conflictResolution === 'skip'
        ? 'merge'
        : 'overwrite_existing';
      if (parsedPayload.pokemon && parsedPayload.pokemon.length > 0) {
        bulkAddPokemon(parsedPayload.pokemon, mode);
      }
      if (parsedPayload.stones && parsedPayload.stones.length > 0) {
        bulkAddStones(parsedPayload.stones, mode);
      }
    } else if (parsedPayload.type === 'POKEMON_CSV' && parsedPayload.pokemon) {
      const mode = conflictResolution === 'replace_all'
        ? 'replace'
        : conflictResolution === 'skip'
        ? 'merge'
        : 'overwrite_existing';
      bulkAddPokemon(parsedPayload.pokemon, mode);
    } else if (parsedPayload.type === 'STONES_CSV' && parsedPayload.stones) {
      if (conflictResolution === 'replace_all') {
        bulkAddStones(parsedPayload.stones, 'replace');
      } else if (conflictResolution === 'overwrite') {
        bulkAddStones(parsedPayload.stones, 'overwrite_existing');
      } else if (conflictResolution === 'skip') {
        bulkAddStones(parsedPayload.stones, 'merge');
      } else if (conflictResolution === 'duplicate') {
        const regenerated = parsedPayload.stones.map(s => {
          const isDupe = stones.some(existing => existing.id === s.id);
          if (isDupe) {
            const newId = typeof crypto !== 'undefined' && crypto.randomUUID
              ? crypto.randomUUID()
              : `stone-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
            return { ...s, id: newId };
          }
          return s;
        });
        bulkAddStones(regenerated, 'merge');
      }
    }

    handleClose();
  };

  // Conflict calculation for preview
  const stoneConflicts = parsedPayload?.stones ? detectCsvConflicts(stones, parsedPayload.stones) : null;
  const pokemonConflicts = parsedPayload?.pokemon ? detectPokemonConflicts(pokemon, parsedPayload.pokemon) : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="csv-modal-title"
        className="bg-[#24272C] border-2 border-[#3D434A] rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-[0_8px_0_#141618,0_16px_32px_rgba(0,0,0,0.8)] animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-3.5 border-b border-neutral-800 bg-[#1E2124]">
          <h3 id="csv-modal-title" className="text-base font-black text-amber-200 font-mono tracking-tight flex items-center gap-2">
            <Database className="w-5 h-5 text-amber-400" />
            <span>Data Backup & Import/Export</span>
          </h3>
          <button
            onClick={handleClose}
            aria-label="Close dialog"
            className="text-neutral-400 hover:text-neutral-200 p-1 rounded transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 flex flex-col gap-5 font-mono">
          {/* Export Section */}
          <div className="flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-neutral-200 uppercase tracking-wider flex items-center gap-1.5">
                <Download className="w-3.5 h-3.5 text-amber-400" />
                <span>Export & Back Up</span>
              </h4>
              <span className="text-[11px] text-neutral-400">
                {pokemon.length} Pokémon • {stones.length} Stones
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {/* Full Profile Backup */}
              <button
                type="button"
                onClick={handleExportFullBackup}
                className="p-3 rounded-lg border border-amber-500/50 bg-gradient-to-br from-amber-950/40 via-[#272115] to-[#1a1710] hover:border-amber-400 text-left flex flex-col justify-between gap-2 transition-all group shadow-[0_2px_0_#78350f]"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-200 group-hover:text-amber-100">
                      Full Backup
                    </span>
                    <span className="text-[9px] uppercase tracking-wider bg-amber-500/20 text-amber-300 px-1 py-0.2 rounded font-mono">
                      JSON
                    </span>
                  </div>
                  <p className="text-[10px] text-neutral-400 font-sans mt-1">
                    Complete snapshot of all Pokémon, sockets, stones, and team.
                  </p>
                </div>
                <div className="text-[11px] text-amber-400 font-bold flex items-center gap-1 mt-1">
                  <Download className="w-3 h-3" />
                  <span>Download .json</span>
                </div>
              </button>

              {/* Stones CSV */}
              <button
                type="button"
                onClick={handleExportStonesCsv}
                className="p-3 rounded-lg border border-neutral-700 bg-neutral-900/90 hover:border-neutral-500 text-left flex flex-col justify-between gap-2 transition-all group"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-neutral-200 group-hover:text-white">
                      Stones Spreadsheet
                    </span>
                    <span className="text-[9px] uppercase tracking-wider bg-neutral-800 text-neutral-300 px-1 py-0.2 rounded font-mono">
                      CSV
                    </span>
                  </div>
                  <p className="text-[10px] text-neutral-400 font-sans mt-1">
                    Export all {stones.length} Power Stones for Excel or Google Sheets.
                  </p>
                </div>
                <div className="text-[11px] text-neutral-300 group-hover:text-amber-300 font-bold flex items-center gap-1 mt-1">
                  <Download className="w-3 h-3" />
                  <span>Download Stones .csv</span>
                </div>
              </button>

              {/* Pokémon CSV */}
              <button
                type="button"
                onClick={handleExportPokemonCsv}
                className="p-3 rounded-lg border border-neutral-700 bg-neutral-900/90 hover:border-neutral-500 text-left flex flex-col justify-between gap-2 transition-all group"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-neutral-200 group-hover:text-white">
                      Pokémon Roster
                    </span>
                    <span className="text-[9px] uppercase tracking-wider bg-neutral-800 text-neutral-300 px-1 py-0.2 rounded font-mono">
                      CSV
                    </span>
                  </div>
                  <p className="text-[10px] text-neutral-400 font-sans mt-1">
                    Export all {pokemon.length} Pokémon profiles, levels & socket layouts.
                  </p>
                </div>
                <div className="text-[11px] text-neutral-300 group-hover:text-amber-300 font-bold flex items-center gap-1 mt-1">
                  <Download className="w-3 h-3" />
                  <span>Download Pokémon .csv</span>
                </div>
              </button>
            </div>
          </div>

          {/* Import Section */}
          <div className="flex flex-col gap-3 pt-2 border-t border-neutral-800">
            <div className="flex justify-between items-center">
              <h4 className="text-xs font-bold text-neutral-200 uppercase tracking-wider flex items-center gap-1.5">
                <Upload className="w-3.5 h-3.5 text-amber-400" />
                <span>Import Data</span>
              </h4>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,.csv,text/csv,application/json"
                onChange={handleFileChange}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-xs font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1.5"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Browse File</span>
              </button>
            </div>

            {/* Universal Dropzone Box */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-neutral-700 hover:border-amber-400/80 rounded-xl p-6 flex flex-col items-center justify-center text-center cursor-pointer bg-neutral-900/40 transition-colors"
            >
              <Upload className="w-8 h-8 text-neutral-500 mb-2" />
              <span className="text-xs text-neutral-300 font-bold">
                Click to browse or drop your file here
              </span>
              <span className="text-[11px] text-neutral-500 font-sans mt-1">
                Supports Game Saves (user.json), Full Backups (.json), Stones CSVs (.csv), or Pokémon Roster CSVs (.csv)
              </span>
            </div>

            {/* Import Status / Preview */}
            {parsedPayload && (
              <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-3 flex flex-col gap-3 animate-in fade-in">
                <div className="flex items-center justify-between text-xs pb-2 border-b border-neutral-800">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                    <span className="font-bold text-neutral-200">
                      {parsedPayload.type === 'FULL_BACKUP' && (
                        <span>
                          Full Backup: {parsedPayload.pokemon?.length || 0} Pokémon & {parsedPayload.stones?.length || 0} Stones
                        </span>
                      )}
                      {parsedPayload.type === 'USER_JSON_SAVE' && (
                        <span>
                          Game Save (user.json): {parsedPayload.stones?.length || 0} Stones & {parsedPayload.pokemon?.length || 0} Pokémon
                        </span>
                      )}
                      {parsedPayload.type === 'POKEMON_CSV' && (
                        <span>
                          Pokémon CSV: {parsedPayload.pokemon?.length || 0} Valid Pokémon Profiles
                        </span>
                      )}
                      {parsedPayload.type === 'STONES_CSV' && (
                        <span>
                          Stones CSV: {parsedPayload.stones?.length || 0} Valid Power Stones
                        </span>
                      )}
                    </span>
                  </div>
                  <span className="text-[11px] text-neutral-400 font-mono truncate max-w-[200px]">
                    {parsedPayload.fileName}
                  </span>
                </div>

                {/* Parsing Errors / Warnings */}
                {parsedPayload.errors.length > 0 && (
                  <div className="bg-red-950/40 border border-red-500/40 rounded p-2 text-xs text-red-300 max-h-24 overflow-y-auto">
                    <div className="font-bold flex items-center gap-1 mb-1">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>{parsedPayload.errors.length} parsing warning(s):</span>
                    </div>
                    {parsedPayload.errors.map((err, i) => (
                      <div key={i} className="text-[11px] font-sans leading-tight">• {err}</div>
                    ))}
                  </div>
                )}

                {/* Capacity Notice if applicable */}
                {parsedPayload.stones && stones.length + parsedPayload.stones.length > MAX_STONES_LIMIT && conflictResolution !== 'replace_all' && (
                  <div className="bg-amber-950/40 border border-amber-500/40 rounded p-2 text-xs text-amber-300 flex items-center gap-2">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span>
                      Inventory capacity note: Stones will be capped at the {MAX_STONES_LIMIT} maximum.
                    </span>
                  </div>
                )}

                {/* Conflict Resolution Selector */}
                <div className="bg-neutral-950/70 border border-amber-500/40 rounded-lg p-3 flex flex-col gap-2">
                  <div className="text-xs font-bold text-amber-300 flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Layers className="w-4 h-4 text-amber-400 shrink-0" />
                      <span>Choose Import Resolution Mode:</span>
                    </div>
                    {stoneConflicts && stoneConflicts.duplicates.length > 0 && (
                      <span className="text-[10px] text-neutral-400">
                        {stoneConflicts.duplicates.length} stone ID match(es)
                      </span>
                    )}
                    {pokemonConflicts && pokemonConflicts.duplicates.length > 0 && (
                      <span className="text-[10px] text-neutral-400">
                        {pokemonConflicts.duplicates.length} Pokémon ID match(es)
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
                    <button
                      type="button"
                      onClick={() => setConflictResolution('overwrite')}
                      className={`p-2.5 rounded-lg text-xs text-left border transition-all ${
                        conflictResolution === 'overwrite'
                          ? 'bg-amber-500/20 text-amber-200 font-bold border-amber-400 ring-1 ring-amber-400'
                          : 'bg-neutral-900 text-neutral-300 border-neutral-700 hover:border-neutral-600'
                      }`}
                    >
                      <div className="font-bold flex items-center justify-between">
                        <span>Overwrite / Update</span>
                        <span className="text-[9px] uppercase tracking-wider text-amber-400 bg-amber-500/20 px-1 rounded">Default</span>
                      </div>
                      <div className="text-[10px] text-neutral-400 font-sans mt-0.5">
                        Updates existing items with matching IDs and adds any new ones.
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setConflictResolution('replace_all')}
                      className={`p-2.5 rounded-lg text-xs text-left border transition-all ${
                        conflictResolution === 'replace_all'
                          ? 'bg-amber-500/20 text-amber-200 font-bold border-amber-400 ring-1 ring-amber-400'
                          : 'bg-neutral-900 text-neutral-300 border-neutral-700 hover:border-neutral-600'
                      }`}
                    >
                      <div className="font-bold flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-amber-400" />
                        <span>Replace All</span>
                      </div>
                      <div className="text-[10px] text-neutral-400 font-sans mt-0.5">
                        Clears existing data and loads exclusively the contents of this file.
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setConflictResolution('skip')}
                      className={`p-2.5 rounded-lg text-xs text-left border transition-all ${
                        conflictResolution === 'skip'
                          ? 'bg-amber-500/20 text-amber-200 font-bold border-amber-400 ring-1 ring-amber-400'
                          : 'bg-neutral-900 text-neutral-300 border-neutral-700 hover:border-neutral-600'
                      }`}
                    >
                      <div className="font-bold">Keep Original (Merge)</div>
                      <div className="text-[10px] text-neutral-400 font-sans mt-0.5">
                        Preserves existing items and only adds items with new IDs.
                      </div>
                    </button>

                    {parsedPayload.type === 'STONES_CSV' && (
                      <button
                        type="button"
                        onClick={() => setConflictResolution('duplicate')}
                        className={`p-2.5 rounded-lg text-xs text-left border transition-all ${
                          conflictResolution === 'duplicate'
                            ? 'bg-amber-500/20 text-amber-200 font-bold border-amber-400 ring-1 ring-amber-400'
                            : 'bg-neutral-900 text-neutral-300 border-neutral-700 hover:border-neutral-600'
                        }`}
                      >
                        <div className="font-bold">Duplicate as New</div>
                        <div className="text-[10px] text-neutral-400 font-sans mt-0.5">
                          Generates brand new IDs for matching stones so both sets are kept.
                        </div>
                      </button>
                    )}
                  </div>
                </div>

                {/* Confirm Import / Cancel Actions */}
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleClose}
                    className="px-4 py-2 text-xs text-neutral-400 hover:text-neutral-200 font-bold transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleApplyImport}
                    className="quest-btn flex-1 py-2.5 bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-bold flex items-center justify-center gap-2 shadow-[0_3px_0_#92400e]"
                  >
                    <CheckCircle className="w-4 h-4" />
                    <span>
                      Confirm & Import{' '}
                      {parsedPayload.type === 'FULL_BACKUP'
                        ? `${parsedPayload.pokemon?.length || 0} Pokémon & ${parsedPayload.stones?.length || 0} Stones`
                        : parsedPayload.type === 'POKEMON_CSV'
                        ? `${parsedPayload.pokemon?.length || 0} Pokémon`
                        : `${parsedPayload.stones?.length || 0} Stones`}
                    </span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
