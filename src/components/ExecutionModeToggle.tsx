import { Globe, Smartphone } from 'lucide-react';
import { TRANSLATIONS } from '../i18n/translations';
import { ExecutionMode, LanguageCode } from '../types/sahaaya';

interface ExecutionModeToggleProps {
  language: LanguageCode;
  mode: ExecutionMode;
  onChange: (mode: ExecutionMode) => void;
}

export function ExecutionModeToggle({
  language,
  mode,
  onChange,
}: ExecutionModeToggleProps) {
  const t = TRANSLATIONS[language];
  const isDemo = mode === 'interactive_demo';

  return (
    <div
      role="region"
      aria-label={t.assistant.demoMode.label}
      className="border-b border-[var(--sahaaya-border)] bg-[#EFEAF6]/55 px-4 sm:px-6 py-2.5"
    >
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="flex items-center gap-2 text-xs sm:text-sm text-[#493451]">
          <span className="font-semibold">{t.assistant.demoMode.label}:</span>
          <span className="text-[#5C5363]">
            {isDemo
              ? t.assistant.demoMode.interactiveDemoHint
              : t.assistant.demoMode.realBrowserHint}
          </span>
        </div>

        <div
          role="group"
          aria-label={t.assistant.demoMode.label}
          className="inline-flex rounded-xl bg-[#FFFCF7] border border-[var(--sahaaya-border)] p-1 gap-1 self-start sm:self-auto"
        >
          <button
            type="button"
            onClick={() => onChange('interactive_demo')}
            aria-pressed={isDemo}
            className={`min-h-[38px] px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
              isDemo
                ? 'bg-[#493451] text-[#FFFCF7] shadow-sm'
                : 'text-[#5C5363] hover:text-[#302B33] hover:bg-[#F7F1E8]'
            }`}
          >
            <Smartphone className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>{t.assistant.demoMode.interactiveDemo}</span>
          </button>

          <button
            type="button"
            onClick={() => onChange('real_browser')}
            aria-pressed={!isDemo}
            className={`min-h-[38px] px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
              !isDemo
                ? 'bg-[#648F83] text-[#FFFCF7] shadow-sm'
                : 'text-[#5C5363] hover:text-[#302B33] hover:bg-[#F7F1E8]'
            }`}
          >
            <Globe className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>{t.assistant.demoMode.realBrowser}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
