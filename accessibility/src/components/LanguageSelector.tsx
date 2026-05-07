interface LanguageSelectorProps {
  value: string
  onChange: (lang: string) => void
  label?: string
}

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'Hindi' },
  { code: 'es', label: 'Spanish' },
  { code: 'fr', label: 'French' },
  { code: 'ar', label: 'Arabic' },
  { code: 'zh', label: 'Chinese (Simplified)' },
  { code: 'pt', label: 'Portuguese' },
  { code: 'ru', label: 'Russian' },
  { code: 'de', label: 'German' },
  { code: 'ja', label: 'Japanese' },
]

export function LanguageSelector({ value, onChange, label = 'Language' }: LanguageSelectorProps) {
  const id = `lang-select-${label.replace(/\s+/g, '-').toLowerCase()}`
  return (
    <div className="flex items-center gap-2">
      <label htmlFor={id} className="text-sm font-medium">{label}:</label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded border border-gray-300 px-2 py-1 text-sm"
        aria-label={label}
      >
        {LANGUAGES.map((l) => (
          <option key={l.code} value={l.code}>{l.label}</option>
        ))}
      </select>
    </div>
  )
}

export default LanguageSelector
