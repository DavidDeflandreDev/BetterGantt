/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { COLOR_SWATCHES, resolveTaskColor } from '../utils/colors';

interface ColorPickerProps {
  value?: string;
  onChange: (hex: string) => void;
  label?: string;
}

export default function ColorPicker({ value, onChange, label }: ColorPickerProps) {
  const current = resolveTaskColor(value);

  return (
    <div>
      {label && <label className="block text-slate-400 font-medium mb-1">{label}</label>}
      <div className="flex flex-wrap items-center gap-1.5 bg-slate-900 border border-slate-700 rounded p-1.5">
        {COLOR_SWATCHES.map(swatch => (
          <button
            key={swatch.id}
            type="button"
            title={swatch.label}
            onClick={() => onChange(swatch.hex)}
            className={`h-5 w-5 rounded-full shrink-0 cursor-pointer transition-transform hover:scale-110 ${
              current.toLowerCase() === swatch.hex.toLowerCase()
                ? 'ring-2 ring-offset-2 ring-offset-slate-900 ring-white'
                : 'ring-1 ring-black/20'
            }`}
            style={{ backgroundColor: swatch.hex }}
          />
        ))}

        {/* Free color picker for any custom hue */}
        <label
          className="h-5 w-5 rounded-full shrink-0 cursor-pointer relative overflow-hidden ring-1 ring-slate-600"
          title="Couleur personnalisée"
          style={{
            background: 'conic-gradient(red, yellow, lime, cyan, blue, magenta, red)',
          }}
        >
          <input
            type="color"
            value={current}
            onChange={e => onChange(e.target.value)}
            className="absolute inset-0 opacity-0 cursor-pointer"
          />
        </label>

        <span className="text-[10px] font-mono text-slate-400 ml-1">{current}</span>
      </div>
    </div>
  );
}
