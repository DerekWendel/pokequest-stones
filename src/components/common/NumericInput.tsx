import React, { useState, useEffect, useRef } from 'react';

export interface NumericInputProps {
  id?: string;
  name?: string;
  value: number | undefined | null;
  onChange: (value: number | undefined, rawText: string) => void;
  min?: number;
  max?: number;
  step?: number | string;
  placeholder?: string;
  allowEmpty?: boolean;
  emptyValue?: number | undefined;
  disabled?: boolean;
  readOnly?: boolean;
  className?: string;
  containerClassName?: string;
  showRangeBadge?: boolean;
  unit?: string;
  prefix?: string;
  ariaLabel?: string;
  autoFocus?: boolean;
  clampOnBlur?: boolean;
  formatDecimals?: number;
  maxDecimals?: number;
}

export const NumericInput: React.FC<NumericInputProps> = ({
  id,
  name,
  value,
  onChange,
  min,
  max,
  step = '1',
  placeholder,
  allowEmpty = false,
  emptyValue = undefined,
  disabled = false,
  readOnly = false,
  className = '',
  containerClassName = '',
  showRangeBadge = false,
  unit,
  prefix,
  ariaLabel,
  autoFocus = false,
  clampOnBlur = true,
  formatDecimals,
  maxDecimals,
}) => {
  // Local string state to allow free typing, deleting, backspacing, and intermediate values
  const [textValue, setTextValue] = useState<string>(() => {
    if (value === undefined || value === null) return '';
    return formatDecimals !== undefined ? value.toFixed(formatDecimals) : value.toString();
  });

  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync from parent value when NOT actively editing/focused, or when parent value significantly changes
  useEffect(() => {
    if (!isFocused) {
      if (value === undefined || value === null) {
        setTextValue('');
      } else {
        const formatted = formatDecimals !== undefined ? value.toFixed(formatDecimals) : value.toString();
        setTextValue(formatted);
      }
    }
  }, [value, isFocused, formatDecimals]);

  // Validation calculations
  const trimmed = textValue.trim();
  const isEmpty = trimmed === '';
  const parsedNum = isEmpty ? NaN : parseFloat(trimmed);
  const isNaNValue = !isEmpty && isNaN(parsedNum);

  const maxAllowedDecimals = maxDecimals !== undefined ? maxDecimals : (formatDecimals !== undefined ? formatDecimals : 1);

  // Check for excess decimal places beyond maxAllowedDecimals (e.g. tenths place)
  let hasExcessDecimals = false;
  let truncatedNum: number = parsedNum;
  if (!isEmpty && !isNaNValue && trimmed.includes('.')) {
    const parts = trimmed.split('.');
    if (parts[1] && parts[1].length > maxAllowedDecimals) {
      hasExcessDecimals = true;
      const truncatedStr = maxAllowedDecimals > 0
        ? `${parts[0]}.${parts[1].slice(0, maxAllowedDecimals)}`
        : parts[0];
      const parsed = parseFloat(truncatedStr);
      truncatedNum = isNaN(parsed) ? parsedNum : parsed;
    }
  }

  const isUnderMin = !isEmpty && !isNaNValue && min !== undefined && (hasExcessDecimals ? truncatedNum : parsedNum) < min;
  const isOverMax = !isEmpty && !isNaNValue && max !== undefined && (hasExcessDecimals ? truncatedNum : parsedNum) > max;
  const isRequiredEmpty = isEmpty && !allowEmpty;

  const isInvalid = isNaNValue || isUnderMin || isOverMax || hasExcessDecimals || isRequiredEmpty;

  // Calculate effective value according to rule: "Use the max or min valid value instead of an input value out of range" and truncate excess decimals
  const getEffectiveValue = (num: number, raw: string): number | undefined => {
    if (raw.trim() === '') {
      return allowEmpty ? emptyValue : min;
    }
    if (isNaN(num)) {
      return allowEmpty ? emptyValue : (min ?? 0);
    }

    let effectiveNum = num;
    if (raw.includes('.')) {
      const parts = raw.trim().split('.');
      if (parts[1] && parts[1].length > maxAllowedDecimals) {
        const truncatedStr = maxAllowedDecimals > 0
          ? `${parts[0]}.${parts[1].slice(0, maxAllowedDecimals)}`
          : parts[0];
        const parsed = parseFloat(truncatedStr);
        if (!isNaN(parsed)) {
          effectiveNum = parsed;
        }
      }
    }

    if (min !== undefined && effectiveNum < min) return min;
    if (max !== undefined && effectiveNum > max) return max;
    return effectiveNum;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setTextValue(raw);

    const trimmedRaw = raw.trim();
    if (trimmedRaw === '') {
      const eff = allowEmpty ? emptyValue : min;
      onChange(eff, raw);
      return;
    }

    const num = parseFloat(trimmedRaw);
    const eff = getEffectiveValue(num, raw);
    onChange(eff, raw);
  };

  const handleBlur = () => {
    setIsFocused(false);

    if (clampOnBlur) {
      if (isEmpty) {
        if (!allowEmpty && min !== undefined) {
          const formatted = min.toString();
          setTextValue(formatted);
          onChange(min, formatted);
        } else if (allowEmpty) {
          setTextValue('');
          onChange(emptyValue, '');
        }
      } else if (!isNaNValue) {
        const eff = getEffectiveValue(parsedNum, textValue);
        if (eff !== undefined) {
          const formatted = formatDecimals !== undefined ? eff.toFixed(formatDecimals) : eff.toString();
          setTextValue(formatted);
          onChange(eff, formatted);
        }
      }
    }
  };

  const handleFocus = () => {
    setIsFocused(true);
  };

  // Build range display string
  const rangeLabel = min !== undefined && max !== undefined
    ? `${min}–${max}`
    : min !== undefined
      ? `≥ ${min}`
      : max !== undefined
        ? `≤ ${max}`
        : null;

  return (
    <div className={`relative flex flex-col gap-0.5 ${containerClassName}`}>
      <div className="relative flex items-center w-full">
        {prefix && (
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-mono font-bold text-neutral-400 select-none pointer-events-none">
            {prefix}
          </span>
        )}

        <input
          ref={inputRef}
          id={id}
          name={name}
          type="number"
          step={step}
          min={min}
          max={max}
          value={textValue}
          placeholder={placeholder}
          disabled={disabled}
          readOnly={readOnly}
          autoFocus={autoFocus}
          aria-label={ariaLabel}
          aria-invalid={isInvalid ? 'true' : 'false'}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          className={`w-full font-mono transition-colors rounded ${
            isInvalid
              ? 'border-red-500/80 bg-red-950/20 text-red-200 focus:border-red-400 focus:ring-1 focus:ring-red-400/50'
              : 'border-neutral-700 bg-neutral-900 text-neutral-100 focus:border-amber-400'
          } ${prefix ? 'pl-7' : ''} ${unit ? 'pr-7' : ''} ${className}`}
        />

        {unit && (
          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] font-mono text-neutral-400 select-none pointer-events-none">
            {unit}
          </span>
        )}
      </div>

      {/* Range validation helper badge / notice */}
      {(isInvalid || showRangeBadge) && (rangeLabel || hasExcessDecimals) && !disabled && (
        <div className="flex items-center justify-between text-[10px] font-mono leading-tight px-1 mt-0.5 select-none">
          {isInvalid ? (
            <span className="text-red-400 font-semibold flex items-center gap-1">
              <span>⚠️</span>
              <span>
                {isOverMax
                  ? `Max is ${max} (using ${max})`
                  : isUnderMin
                    ? `Min is ${min} (using ${min})`
                    : hasExcessDecimals
                      ? (maxAllowedDecimals === 1
                          ? `Truncated to tenths (using ${truncatedNum})`
                          : `Truncated to ${maxAllowedDecimals} decimals (using ${truncatedNum})`)
                      : isRequiredEmpty
                        ? `Required (${rangeLabel})`
                        : `Valid range: ${rangeLabel}`}
              </span>
            </span>
          ) : (
            <span className="text-neutral-500">
              Range: {rangeLabel}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
