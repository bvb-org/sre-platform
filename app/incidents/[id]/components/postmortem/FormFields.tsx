import { useState } from 'react';
import { Globe, X, Info } from 'lucide-react';

export function InputField({ label, value, onChange, placeholder }: { 
  label: string; 
  value: string; 
  onChange: (value: string) => void; 
  placeholder?: string 
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-text-primary mb-1">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent-purple"
      />
    </div>
  );
}

export function TextAreaField({ label, value, onChange, placeholder, rows = 3 }: { 
  label: string; 
  value: string; 
  onChange: (value: string) => void; 
  placeholder?: string; 
  rows?: number 
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-text-primary mb-1">{label}</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent-purple resize-none"
      />
    </div>
  );
}

export function DateTimeField({ label, value, onChange }: { 
  label: string; 
  value: string; 
  onChange: (value: string) => void 
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-text-primary mb-1">{label}</label>
      <input
        type="datetime-local"
        value={value ? new Date(value).toISOString().slice(0, 16) : ''}
        onChange={(e) => onChange(e.target.value ? new Date(e.target.value).toISOString() : '')}
        className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent-purple"
      />
    </div>
  );
}

export function CheckboxField({ label, checked, onChange }: { 
  label: string; 
  checked: boolean; 
  onChange: (value: boolean) => void 
}) {
  return (
    <label className="flex items-center gap-2 cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="w-4 h-4 text-accent-purple border-border rounded focus:ring-2 focus:ring-accent-purple"
      />
      <span className="text-sm font-medium text-text-primary">{label}</span>
    </label>
  );
}

export function MultiSelectField({ label, value, onChange, placeholder }: { 
  label: string; 
  value: string[]; 
  onChange: (value: string[]) => void; 
  placeholder?: string 
}) {
  const [inputValue, setInputValue] = useState('');

  const addItem = () => {
    if (inputValue.trim() && !value.includes(inputValue.trim())) {
      onChange([...value, inputValue.trim()]);
      setInputValue('');
    }
  };

  const removeItem = (item: string) => {
    onChange(value.filter(v => v !== item));
  };

  return (
    <div>
      <label className="block text-sm font-medium text-text-primary mb-1">{label}</label>
      <div className="flex gap-2 mb-2">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              addItem();
            }
          }}
          placeholder={placeholder}
          className="flex-1 px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent-purple"
        />
        <button
          onClick={addItem}
          className="px-4 py-2 bg-accent-purple text-white rounded-lg hover:bg-purple-700 transition-colors text-sm"
        >
          Add
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {value.map((item, index) => (
          <span key={index} className="inline-flex items-center gap-1 px-3 py-1 bg-background border border-border rounded-full text-sm">
            <Globe className="w-3 h-3" />
            {item}
            <button onClick={() => removeItem(item)} className="ml-1 hover:text-status-critical">
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
      </div>
    </div>
  );
}

export function SectionCard({ title, icon: Icon, tooltip, children }: { 
  title: string; 
  icon?: any; 
  tooltip?: string; 
  children: React.ReactNode 
}) {
  return (
    <div className="bg-white border border-border rounded-lg p-6">
      <div className="flex items-center gap-2 mb-4">
        {Icon && <Icon className="w-5 h-5 text-accent-purple" />}
        <h3 className="text-lg font-semibold text-text-primary">{title}</h3>
        {tooltip && (
          <div className="group relative">
            <Info className="w-4 h-4 text-text-secondary cursor-help" />
            <div className="absolute left-0 top-6 w-64 bg-gray-900 text-white text-xs rounded p-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
              {tooltip}
            </div>
          </div>
        )}
      </div>
      {children}
    </div>
  );
}
