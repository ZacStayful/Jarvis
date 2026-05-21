'use client';

import { useEffect, useState } from 'react';
import { C } from '@/lib/jarvis-design';

export type Preset = 'week' | 'month' | 'year' | 'custom';

export interface DateRange {
  from: string; // YYYY-MM-DD
  to: string;
  preset: Preset;
}

interface DateRangePickerProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
}

const PRESETS: Array<{ id: Preset; label: string; days: number }> = [
  { id: 'week',  label: 'WEEK',  days: 7 },
  { id: 'month', label: 'MONTH', days: 30 },
  { id: 'year',  label: 'YEAR',  days: 365 },
];

export function fromPreset(id: Preset): DateRange {
  const to = new Date();
  const days = PRESETS.find(p => p.id === id)?.days ?? 30;
  const from = new Date(to.getTime() - days * 24 * 60 * 60 * 1000);
  return { from: iso(from), to: iso(to), preset: id };
}

function iso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function DateRangePicker({ value, onChange }: DateRangePickerProps) {
  const [showCustom, setShowCustom] = useState(value.preset === 'custom');

  // Keep showCustom in sync if parent flips us back to a preset
  useEffect(() => {
    setShowCustom(value.preset === 'custom');
  }, [value.preset]);

  const handlePreset = (id: Preset) => {
    setShowCustom(false);
    onChange(fromPreset(id));
  };

  const handleCustomToggle = () => {
    setShowCustom(s => !s);
    if (!showCustom) {
      onChange({ ...value, preset: 'custom' });
    }
  };

  const handleFromChange = (next: string) => {
    onChange({ ...value, from: next, preset: 'custom' });
  };
  const handleToChange = (next: string) => {
    onChange({ ...value, to: next, preset: 'custom' });
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        background: C.surface,
        border: `1px solid ${C.border}`,
        borderRadius: 6,
        padding: '4px 8px',
      }}
    >
      <span
        className="font-mono"
        style={{
          fontSize: 9,
          color: C.textLow,
          letterSpacing: '0.18em',
          marginRight: 4,
        }}
      >
        RANGE
      </span>

      {PRESETS.map(p => {
        const active = value.preset === p.id;
        return (
          <button
            key={p.id}
            onClick={() => handlePreset(p.id)}
            className="font-mono"
            style={{
              fontSize: 10,
              letterSpacing: '0.14em',
              padding: '4px 9px',
              borderRadius: 3,
              border: `1px solid ${active ? C.primary : C.border}`,
              background: active ? `${C.primary}22` : 'transparent',
              color: active ? C.bright : C.textMid,
              cursor: 'pointer',
              transition: 'all .15s',
            }}
          >
            {p.label}
          </button>
        );
      })}

      <button
        onClick={handleCustomToggle}
        className="font-mono"
        style={{
          fontSize: 10,
          letterSpacing: '0.14em',
          padding: '4px 9px',
          borderRadius: 3,
          border: `1px solid ${value.preset === 'custom' ? C.primary : C.border}`,
          background: value.preset === 'custom' ? `${C.primary}22` : 'transparent',
          color: value.preset === 'custom' ? C.bright : C.textMid,
          cursor: 'pointer',
        }}
      >
        CUSTOM
      </button>

      {showCustom && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 6 }}>
          <input
            type="date"
            value={value.from}
            max={value.to}
            onChange={e => handleFromChange(e.target.value)}
            className="font-mono"
            style={inputStyle}
          />
          <span style={{ color: C.textLow, fontSize: 11 }}>→</span>
          <input
            type="date"
            value={value.to}
            min={value.from}
            onChange={e => handleToChange(e.target.value)}
            className="font-mono"
            style={inputStyle}
          />
        </div>
      )}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  background: C.bg,
  border: `1px solid ${C.border}`,
  borderRadius: 3,
  color: C.text,
  padding: '3px 6px',
  fontSize: 11,
  fontFamily: 'var(--font-mono)',
  colorScheme: 'dark',
};
