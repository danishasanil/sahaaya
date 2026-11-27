import { TRANSLATIONS } from '../i18n/translations';
import { LanguageCode } from '../types/sahaaya';

interface LanguageSelectorProps {
  language: LanguageCode;
  onChange: (lang: LanguageCode) => void;
  compact?: boolean;
}

const LANGUAGE_LIST: LanguageCode[] = ['en', 'hi', 'kn'];

export function LanguageSelector({
  language,
  onChange,
  compact = false,
}: LanguageSelectorProps) {
  const t = TRANSLATIONS[language];

  return (
    <div
      role="group"
      aria-label={t.languageLabel}
      className={`inline-flex flex-wrap items-center gap-1.5 rounded-2xl p-1.5 border border-[var(--sahaaya-border)] bg-[var(--sahaaya-ivory)] ${
        compact ? '' : 'w-full sm:w-auto'
      }`}
    >
      {LANGUAGE_LIST.map((code) => {
        const isActive = language === code;
        const item = t.languages[code];
        return (
          <button
            key={code}
            type="button"
            onClick={() => onChange(code)}
            aria-pressed={isActive}
            className={`min-h-[44px] px-4 py-2 rounded-xl font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer flex items-center justify-center gap-2 ${
              compact ? 'text-sm px-3' : 'flex-1 sm:flex-initial text-base'
            } ${
              isActive
                ? 'bg-[#493451] text-[#FFFCF7] shadow-sm'
                : 'text-[#302B33] hover:bg-[#EFEAF6]'
            }`}
          >
            <span>{item.native}</span>
            {!compact && code !== 'en' && (
              <span
                className={`text-xs font-normal ${
                  isActive ? 'text-[#A995C8]' : 'text-[#5C5363]'
                }`}
              >
                {item.name}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
