import { Globe } from 'lucide-react';
import { TRANSLATIONS } from '../i18n/translations';
import { LanguageCode, ScreenId, TextScale } from '../types/sahaaya';
import { LanguageSelector } from './LanguageSelector';
import { SahaayaLogo } from './SahaayaLogo';
import { TextScaleToggle } from './TextScaleToggle';

interface TopBarProps {
  currentScreen: ScreenId;
  language: LanguageCode;
  textScale: TextScale;
  spokenLanguageLabel?: string;
  onOpenLanguageSettings?: () => void;
  onNavigate: (screen: ScreenId) => void;
  onLanguageChange: (lang: LanguageCode) => void;
  onTextScaleChange: (scale: TextScale) => void;
}

export function TopBar({
  currentScreen,
  language,
  textScale,
  spokenLanguageLabel,
  onOpenLanguageSettings,
  onNavigate,
  onLanguageChange,
  onTextScaleChange,
}: TopBarProps) {
  const t = TRANSLATIONS[language];

  const navItems: { id: ScreenId; label: string }[] = [
    { id: 'welcome', label: t.nav.home },
    { id: 'assistant', label: t.nav.assistant },
    { id: 'form', label: t.nav.form },
    { id: 'review', label: t.nav.review },
  ];

  return (
    <header className="sticky top-0 z-30 border-b border-[var(--sahaaya-border)] bg-[#FFFCF7]/95 backdrop-blur-md">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 min-h-[64px] py-2 flex items-center justify-between gap-4 sm:gap-8">
        {/* Zone 1: Brand Title */}
        <button
          type="button"
          onClick={() => onNavigate('welcome')}
          className="flex items-center gap-3 text-left whitespace-nowrap shrink-0 cursor-pointer rounded-xl py-1 pr-2 hover:opacity-90 transition-opacity"
        >
          <SahaayaLogo size={36} />
          <span className="font-display text-xl font-semibold tracking-tight text-[#493451]">
            Sahaaya
          </span>
        </button>

        {/* Zone 2: Clean single-line screen navigation links */}
        <nav
          aria-label="Primary navigation"
          className="hidden md:flex items-center gap-6 text-[0.95rem] font-medium"
        >
          {navItems.map((item) => {
            const isActive = currentScreen === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onNavigate(item.id)}
                aria-current={isActive ? 'page' : undefined}
                className={`py-2 px-1 border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  isActive
                    ? 'border-[#493451] text-[#493451] font-semibold'
                    : 'border-transparent text-[#5C5363] hover:text-[#302B33] hover:border-[#A995C8]'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Accessibility controls (Text scale + compact language + universal voice selector) */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="hidden lg:block">
            <LanguageSelector
              language={language}
              onChange={onLanguageChange}
              compact
            />
          </div>
          {onOpenLanguageSettings && (
            <button
              type="button"
              onClick={onOpenLanguageSettings}
              aria-label="Open all voice languages"
              className="min-h-[42px] px-3 py-1.5 rounded-xl border border-[var(--sahaaya-border)] bg-[#FFFCF7] hover:bg-[#EFEAF6] text-[#493451] text-xs sm:text-sm font-semibold inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <Globe className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span className="max-w-[130px] truncate">
                {spokenLanguageLabel || 'All Languages'}
              </span>
            </button>
          )}
          <TextScaleToggle
            textScale={textScale}
            onChange={onTextScaleChange}
            ariaLabel={t.textSizeLabel}
          />
        </div>
      </div>

      {/* Compact mobile screen switcher (only when past Welcome screen) */}
      {currentScreen !== 'welcome' && currentScreen !== 'success' && (
        <nav
          aria-label="Mobile screen navigation"
          className="flex md:hidden items-center justify-around border-t border-[var(--sahaaya-border)] bg-[#FFFCF7] px-2 py-1"
        >
          {navItems.map((item) => {
            const isActive = currentScreen === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onNavigate(item.id)}
                aria-current={isActive ? 'page' : undefined}
                className={`min-h-[40px] px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  isActive
                    ? 'bg-[#EFEAF6] text-[#493451]'
                    : 'text-[#5C5363] hover:text-[#302B33]'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>
      )}
    </header>
  );
}
