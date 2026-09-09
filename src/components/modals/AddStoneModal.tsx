import React, { useState, useEffect } from 'react';
import type { PowerStone, StoneType, SubStat, SubStatType } from '../../types';
import { SUB_STAT_DEFINITIONS, SUB_STAT_KEYS, MAX_STONES_LIMIT } from '../../constants/stats';
import { NumericInput } from '../common/NumericInput';
import { useBuddyStore } from '../../store/useBuddyStore';
import { X, Plus, Trash2, Swords, Heart, Lock, Unlock, Check, AlertTriangle } from 'lucide-react';

interface AddStoneModalProps {
  isOpen: boolean;
  onClose: () => void;
  stoneToEdit?: PowerStone | null;
}

export const AddStoneModal: React.FC<AddStoneModalProps> = ({
  isOpen,
  onClose,
  stoneToEdit,
}) => {
  const stones = useBuddyStore(state => state.stones);
  const addStone = useBuddyStore(state => state.addStone);
  const updateStone = useBuddyStore(state => state.updateStone);

  const isInventoryFull = !stoneToEdit && stones.length >= MAX_STONES_LIMIT;

  const [type, setType] = useState<StoneType>('ATK');
  const [power, setPower] = useState<number>(950);
  const [subStats, setSubStats] = useState<SubStat[]>([]);
  const [isLocked, setIsLocked] = useState<boolean>(false);

  useEffect(() => {
    if (stoneToEdit) {
      setType(stoneToEdit.type);
      setPower(stoneToEdit.power);
      setSubStats(stoneToEdit.subStats ? [...stoneToEdit.subStats] : []);
      setIsLocked(stoneToEdit.isLocked || false);
    } else {
      setType('ATK');
      setPower(950);
      setSubStats([
        { type: 'HIT_HEAL', value: 2.5 },
      ]);
      setIsLocked(false);
    }
  }, [stoneToEdit, isOpen]);

  // Handle Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const isEditLocked = Boolean(stoneToEdit && isLocked);

  const handleAddSubStat = () => {
    if (subStats.length >= 3 || isEditLocked) return;
    // Pick first unused sub-stat key
    const used = new Set(subStats.map(s => s.type));
    const available = SUB_STAT_KEYS.find(k => !used.has(k));
    if (!available) return;
    const def = SUB_STAT_DEFINITIONS[available];
    setSubStats([...subStats, { type: available, value: Number(def.stepMin.toFixed(1)) }]);
  };

  const handleRemoveSubStat = (index: number) => {
    if (isEditLocked) return;
    setSubStats(subStats.filter((_, i) => i !== index));
  };

  const handleSubStatTypeChange = (index: number, newType: SubStatType) => {
    if (isEditLocked) return;
    const updated = [...subStats];
    const def = SUB_STAT_DEFINITIONS[newType];
    updated[index] = {
      type: newType,
      value: Number(def.stepMin.toFixed(1)),
    };
    setSubStats(updated);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isEditLocked) return;

    if (stoneToEdit) {
      updateStone(stoneToEdit.id, {
        type,
        power,
        subStats,
        isLocked,
      });
    } else {
      addStone({
        type,
        power,
        subStats,
        isLocked,
      });
    }
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-stone-modal-title"
        className="bg-[#24272C] border-2 border-[#3D434A] rounded-xl w-full max-w-lg overflow-hidden shadow-[0_8px_0_#141618,0_16px_32px_rgba(0,0,0,0.8)] animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-neutral-800 bg-[#1E2124]">
          <h3 id="add-stone-modal-title" className="text-base font-black text-amber-200 font-mono tracking-tight flex items-center gap-2">
            {stoneToEdit ? 'Edit Power Stone' : 'Add New Power Stone'}
          </h3>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="text-neutral-400 hover:text-neutral-200 p-1 rounded transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4 font-mono">
          {/* Inventory Full Warning */}
          {isInventoryFull && (
            <div className="bg-red-950/40 border border-red-500/50 rounded-lg p-3 flex items-center gap-2.5 text-red-300 text-xs">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
              <span>
                Inventory limit reached ({MAX_STONES_LIMIT}/{MAX_STONES_LIMIT} stones). Delete existing stones to add more.
              </span>
            </div>
          )}

          {/* Locked Stone Edit Warning Banner */}
          {stoneToEdit && isLocked && (
            <div className="bg-amber-950/50 border border-amber-500/60 rounded-lg p-3 flex items-center justify-between gap-3 text-amber-200 text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <Lock className="w-4 h-4 text-amber-400 shrink-0" />
                <span>This stone is locked. Unlock it to edit its stats.</span>
              </div>
              <button
                type="button"
                onClick={() => setIsLocked(false)}
                className="px-2.5 py-1 text-xs font-bold bg-amber-500 hover:bg-amber-400 text-neutral-950 rounded flex items-center gap-1 shrink-0 transition-colors"
              >
                <Unlock className="w-3.5 h-3.5" />
                <span>Unlock to Edit</span>
              </button>
            </div>
          )}

          {/* Stone Type Picker */}
          <div>
            <label className="text-xs text-neutral-400 font-bold block mb-1.5">Stone Category</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                disabled={isEditLocked}
                onClick={() => setType('ATK')}
                className={`p-3 rounded-lg border-2 flex items-center justify-center gap-2 font-bold text-sm transition-all ${
                  isEditLocked
                    ? 'opacity-60 cursor-not-allowed bg-neutral-900 border-neutral-800 text-neutral-500'
                    : type === 'ATK'
                    ? 'bg-red-950/60 border-red-500 text-red-300 ring-2 ring-red-500/40 shadow-[0_2px_0_#7f1d1d]'
                    : 'bg-neutral-900 border-neutral-700 text-neutral-400 hover:border-neutral-600'
                }`}
              >
                <Swords className="w-4 h-4" />
                <span>ATK (Mighty)</span>
              </button>

              <button
                type="button"
                disabled={isEditLocked}
                onClick={() => setType('HP')}
                className={`p-3 rounded-lg border-2 flex items-center justify-center gap-2 font-bold text-sm transition-all ${
                  isEditLocked
                    ? 'opacity-60 cursor-not-allowed bg-neutral-900 border-neutral-800 text-neutral-500'
                    : type === 'HP'
                    ? 'bg-blue-950/60 border-blue-500 text-blue-300 ring-2 ring-blue-500/40 shadow-[0_2px_0_#1e3a8a]'
                    : 'bg-neutral-900 border-neutral-700 text-neutral-400 hover:border-neutral-600'
                }`}
              >
                <Heart className="w-4 h-4" />
                <span>HP (Sturdy)</span>
              </button>
            </div>
          </div>

          {/* Primary Power Input */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label htmlFor="stone-power-input" className="text-xs text-neutral-400 font-bold">Primary Power Stat</label>
              <span className="text-xs text-amber-300 font-bold">{power}</span>
            </div>
            <NumericInput
              id="stone-power-input"
              min={1}
              max={999}
              value={power}
              disabled={isEditLocked}
              onChange={(val) => setPower(val ?? 1)}
              className="px-3 py-2 text-sm text-neutral-100 font-bold"
              placeholder="1-999"
            />
          </div>

          {/* Sub-stats List (0 to 3) */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-xs text-neutral-400 font-bold">
                Sub-Stats ({subStats.length} / 3)
              </label>
            </div>

            <div className="flex flex-col gap-2">
              {subStats.map((sub, idx) => {
                return (
                  <div
                    key={idx}
                    className="flex items-center gap-2 bg-neutral-900/90 p-2.5 rounded-lg border border-neutral-800"
                  >
                    {/* Sub-stat Selector with duplicate prevention */}
                    <select
                      value={sub.type}
                      disabled={isEditLocked}
                      aria-label={`Sub-stat ${idx + 1} type`}
                      onChange={(e) => handleSubStatTypeChange(idx, e.target.value as SubStatType)}
                      className="bg-neutral-800 border border-neutral-700 text-neutral-200 text-xs rounded-md px-2 py-1.5 focus:outline-none flex-1 min-w-0 font-mono truncate disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {SUB_STAT_KEYS.map((key) => {
                        const isAlreadyChosen = subStats.some((s, sIdx) => sIdx !== idx && s.type === key);
                        return (
                          <option key={key} value={key} disabled={isAlreadyChosen}>
                            {key === 'TIME_TO_RECOVER' ? 'Time to Recover (-%)' : SUB_STAT_DEFINITIONS[key].label}
                          </option>
                        );
                      })}
                    </select>

                    {/* Value Input */}
                    <div className="flex items-center gap-1 shrink-0">
                      <NumericInput
                        min={0}
                        max={SUB_STAT_DEFINITIONS[sub.type].stepMax}
                        step="0.1"
                        formatDecimals={1}
                        value={sub.value}
                        disabled={isEditLocked}
                        ariaLabel={`Sub-stat ${idx + 1} value`}
                        onChange={(val) => {
                          if (isEditLocked) return;
                          const updated = [...subStats];
                          updated[idx] = {
                            ...updated[idx],
                            value: val ?? 0,
                          };
                          setSubStats(updated);
                        }}
                        className="w-20 px-2 py-1.5 text-xs text-right text-neutral-100 font-bold"
                        containerClassName="w-20"
                        unit="%"
                        prefix={sub.type === 'TIME_TO_RECOVER' ? '-' : undefined}
                      />
                    </div>

                    {/* Delete Sub-stat */}
                    <button
                      type="button"
                      disabled={isEditLocked}
                      onClick={() => handleRemoveSubStat(idx)}
                      className="p-1.5 shrink-0 text-neutral-500 hover:text-red-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      aria-label={`Remove sub-stat ${idx + 1}`}
                      title="Remove sub-stat"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}

              {subStats.length === 0 && (
                <div className="text-xs text-neutral-500 italic py-2 text-center border border-dashed border-neutral-800 rounded-lg">
                  No sub-stats (Plain power stone).
                </div>
              )}

              {subStats.length < 3 && (
                <button
                  type="button"
                  disabled={isEditLocked}
                  onClick={handleAddSubStat}
                  className="w-full py-2 px-3 border border-dashed border-neutral-700 hover:border-amber-400/80 bg-neutral-900/50 hover:bg-neutral-850 text-neutral-300 hover:text-amber-300 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all mt-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Sub-Stat ({subStats.length}/3)</span>
                </button>
              )}
            </div>
          </div>

          {/* Lock Checkbox */}
          <div className="flex items-center gap-2 pt-2 border-t border-neutral-800">
            <label className="flex items-center gap-2 cursor-pointer text-xs text-neutral-300">
              <input
                type="checkbox"
                checked={isLocked}
                onChange={(e) => setIsLocked(e.target.checked)}
                className="w-4 h-4 accent-amber-400 rounded"
              />
              <span className="flex items-center gap-1 font-bold">
                <Lock className="w-3.5 h-3.5 text-amber-400" />
                <span>Lock Stone (Protects from accidental deletion/reassignment)</span>
              </span>
            </label>
          </div>

          {/* Footer Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-neutral-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs text-neutral-400 hover:text-neutral-200 font-bold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isInventoryFull || isEditLocked}
              className={`quest-btn px-5 py-2 text-xs font-bold flex items-center gap-1.5 ${
                isInventoryFull || isEditLocked
                  ? 'bg-neutral-800 text-neutral-500 border-neutral-700 opacity-50 cursor-not-allowed'
                  : 'bg-amber-500 hover:bg-amber-400 text-neutral-950 shadow-[0_3px_0_#92400e]'
              }`}
            >
              <Check className="w-4 h-4" />
              <span>{stoneToEdit ? 'Update Stone' : 'Add Stone'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
