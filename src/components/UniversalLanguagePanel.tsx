import {
  AlertCircle,
  Check,
  Globe,
  Mic,
  Search,
  Sparkles,
  Type,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import {
  LanguageCategory,
  LanguageCode,
  SpeechEngineSupportInfo,
  SpokenLanguageOption,
  UniversalLanguageMode,
  UniversalLanguagePreferences,
  VoiceCapabilityStatus,
} from '../types/sahaaya';
import {
  getCapabilityStatusLabel,
  getLanguageOptionById,
  probeBrowserSpeechLanguageSupport,
  resolveEffectiveSpokenLocale,
  searchSupportedLanguages,
} from '../utils/languageRegistry';
import { LanguageSelector } from './LanguageSelector';

interface UniversalLanguagePanelProps {
  uiLanguage: LanguageCode;
  prefs: UniversalLanguagePreferences;
  recognitionSupported: boolean;
  detectedLanguageLabel?: string | null;
  onUiLanguageChange: (lang: LanguageCode) => void;
  onPrefsChange: (next: UniversalLanguagePreferences) => void;
  onClose?: () => void;
  isModal?: boolean;
}

const CATEGORY_TABS: Array<{ id: LanguageCategory | 'all'; label: string }> = [
  { id: 'all', label: 'All Languages' },
  { id: 'indian', label: 'Indian Languages' },
  { id: 'regional', label: 'Regional & Community' },
  { id: 'international', label: 'International' },
];

function getStatusBadgeStyle(status: VoiceCapabilityStatus): {
  bg: string;
  text: string;
  border: string;
} {
  switch (status) {
    case 'voice_available':
    case 'on_device_available':
      return {
        bg: 'bg-[#EAF2EF]',
        text: 'text-[#396256]',
        border: 'border-[#648F83]/35',
      };
    case 'browser_dependent':
      return {
        bg: 'bg-[#EFEAF6]',
        text: 'text-[#493451]',
        border: 'border-[#A995C8]/45',
      };
    case 'text_only_unverified':
    case 'future_integration_required':
      return {
        bg: 'bg-[#FBEEE9]',
        text: 'text-[#8B4736]',
        border: 'border-[#D98570]/40',
      };
  }
}

export function UniversalLanguagePanel({
  uiLanguage,
  prefs,
  recognitionSupported,
  detectedLanguageLabel,
  onUiLanguageChange,
  onPrefsChange,
  onClose,
  isModal = false,
}: UniversalLanguagePanelProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<LanguageCategory | 'all'>('all');
  const [probedSupport, setProbedSupport] = useState<SpeechEngineSupportInfo | null>(
    null
  );

  const filteredLanguages = useMemo(
    () => searchSupportedLanguages(searchQuery, categoryFilter),
    [searchQuery, categoryFilter]
  );

  const groupedLanguages = useMemo(() => {
    const groups: Record<LanguageCategory, SpokenLanguageOption[]> = {
      indian: [],
      regional: [],
      international: [],
    };
    for (const item of filteredLanguages) {
      groups[item.category].push(item);
    }
    return groups;
  }, [filteredLanguages]);

  const effective = useMemo(
    () => resolveEffectiveSpokenLocale(prefs, uiLanguage),
    [prefs, uiLanguage]
  );

  useEffect(() => {
    let active = true;
    void probeBrowserSpeechLanguageSupport(effective.option, {
      recognitionSupported,
    }).then((info) => {
      if (active) setProbedSupport(info);
    });
    return () => {
      active = false;
    };
  }, [effective.option, recognitionSupported]);

  const effectiveStatus: VoiceCapabilityStatus =
    probedSupport?.effectiveStatus || effective.capabilityStatus;

  const setMode = (mode: UniversalLanguageMode) => {
    onPrefsChange({
      ...prefs,
      mode,
    });
  };

  const selectLanguage = (option: SpokenLanguageOption) => {
    onPrefsChange({
      ...prefs,
      mode: 'select',
      selectedLanguageId: option.id,
    });
  };

  const selectedOption = getLanguageOptionById(prefs.selectedLanguageId);

  const content = (
    <div
      className={`rounded-3xl bg-[#FFFCF7] border border-[var(--sahaaya-border)] shadow-[var(--sahaaya-shadow)] p-5 sm:p-6 space-y-5 ${
        isModal ? 'max-h-[88vh] overflow-y-auto w-full max-w-3xl' : ''
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-[#493451]">
            <Globe className="w-5 h-5 shrink-0" aria-hidden="true" />
            <h2 className="font-display text-xl sm:text-2xl font-semibold text-[#302B33]">
              Universal Voice & Language Settings
            </h2>
          </div>
          <p className="text-sm text-[#5C5363]">
            Choose your spoken voice language independently from the screen display language, or turn on automatic detection.
          </p>
        </div>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close language settings"
            className="min-w-[44px] min-h-[44px] rounded-xl border border-[var(--sahaaya-border)] bg-[#F7F1E8] hover:bg-[#EFEAF6] text-[#302B33] flex items-center justify-center cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        )}
      </div>

      {/* Screen Display Language (UI) */}
      <div className="rounded-2xl bg-[#F7F1E8] border border-[var(--sahaaya-border)] p-4 space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-semibold text-[#493451]">
            Screen Display Language (Buttons & Menus)
          </p>
          <span className="text-xs text-[#5C5363]">
            Kept separate from your spoken language
          </span>
        </div>
        <LanguageSelector language={uiLanguage} onChange={onUiLanguageChange} />
      </div>

      {/* Mode Selection: 1. Auto Detect, 2. Select My Language, 3. Other / Custom */}
      <div className="space-y-2.5">
        <p className="text-sm font-semibold text-[#493451]">
          Spoken & Input Language Mode
        </p>
        <div
          role="radiogroup"
          aria-label="Spoken language selection mode"
          className="grid grid-cols-1 sm:grid-cols-3 gap-2.5"
        >
          <button
            type="button"
            role="radio"
            aria-checked={prefs.mode === 'auto'}
            onClick={() => setMode('auto')}
            className={`min-h-[54px] px-4 py-3 rounded-2xl border text-left transition-colors cursor-pointer flex items-start gap-2.5 ${
              prefs.mode === 'auto'
                ? 'bg-[#493451] text-[#FFFCF7] border-[#493451]'
                : 'bg-[#FFFCF7] text-[#302B33] border-[var(--sahaaya-border)] hover:bg-[#EFEAF6]'
            }`}
          >
            <Sparkles className="w-5 h-5 shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <p className="font-semibold text-sm sm:text-base leading-snug">
                Automatic Language Detection
              </p>
              <p
                className={`text-xs mt-0.5 ${
                  prefs.mode === 'auto' ? 'text-[#EFEAF6]' : 'text-[#5C5363]'
                }`}
              >
                Detects English, Hindi, Kannada & mixed speech
              </p>
            </div>
          </button>

          <button
            type="button"
            role="radio"
            aria-checked={prefs.mode === 'select'}
            onClick={() => setMode('select')}
            className={`min-h-[54px] px-4 py-3 rounded-2xl border text-left transition-colors cursor-pointer flex items-start gap-2.5 ${
              prefs.mode === 'select'
                ? 'bg-[#493451] text-[#FFFCF7] border-[#493451]'
                : 'bg-[#FFFCF7] text-[#302B33] border-[var(--sahaaya-border)] hover:bg-[#EFEAF6]'
            }`}
          >
            <Mic className="w-5 h-5 shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <p className="font-semibold text-sm sm:text-base leading-snug">
                Select My Language
              </p>
              <p
                className={`text-xs mt-0.5 ${
                  prefs.mode === 'select' ? 'text-[#EFEAF6]' : 'text-[#5C5363]'
                }`}
              >
                Choose Indian, regional, or global language
              </p>
            </div>
          </button>

          <button
            type="button"
            role="radio"
            aria-checked={prefs.mode === 'custom'}
            onClick={() => setMode('custom')}
            className={`min-h-[54px] px-4 py-3 rounded-2xl border text-left transition-colors cursor-pointer flex items-start gap-2.5 ${
              prefs.mode === 'custom'
                ? 'bg-[#493451] text-[#FFFCF7] border-[#493451]'
                : 'bg-[#FFFCF7] text-[#302B33] border-[var(--sahaaya-border)] hover:bg-[#EFEAF6]'
            }`}
          >
            <Type className="w-5 h-5 shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <p className="font-semibold text-sm sm:text-base leading-snug">
                Other / Custom Language
              </p>
              <p
                className={`text-xs mt-0.5 ${
                  prefs.mode === 'custom' ? 'text-[#EFEAF6]' : 'text-[#5C5363]'
                }`}
              >
                Enter any regional or community language
              </p>
            </div>
          </button>
        </div>
      </div>

      {/* Honest Current Voice Capability Status Summary */}
      <div
        role="status"
        className="rounded-2xl bg-[#F7F1E8] border border-[var(--sahaaya-border)] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
      >
        <div className="space-y-1">
          <p className="text-xs font-semibold text-[#5C5363]">
            Active Voice Input Setting
          </p>
          <p className="font-display text-lg font-semibold text-[#302B33]">
            {prefs.mode === 'auto'
              ? detectedLanguageLabel
                ? `Automatic Detection · Detected: ${detectedLanguageLabel}`
                : `Automatic Detection (${effective.locale})`
              : prefs.mode === 'custom'
                ? prefs.customLanguageName.trim() || 'Custom Language (not entered yet)'
                : `${selectedOption?.nativeName || ''} · ${selectedOption?.name || effective.displayLabel}`}
          </p>
          {effective.option?.capabilityNote && prefs.mode !== 'auto' && (
            <p className="text-xs text-[#5C5363] leading-relaxed">
              {effective.option.capabilityNote}
            </p>
          )}
        </div>
        <span
          className={`px-3 py-1.5 rounded-xl border text-xs font-semibold whitespace-nowrap self-start sm:self-center ${
            getStatusBadgeStyle(effectiveStatus).bg
          } ${getStatusBadgeStyle(effectiveStatus).text} ${
            getStatusBadgeStyle(effectiveStatus).border
          }`}
        >
          {getCapabilityStatusLabel(effectiveStatus, uiLanguage)}
        </span>
      </div>

      {/* Custom Language Input */}
      {prefs.mode === 'custom' && (
        <div className="rounded-2xl bg-[#FBEEE9]/70 border border-[#D98570]/40 p-4 space-y-3">
          <label
            htmlFor="sahaaya-custom-language-input"
            className="block text-sm font-semibold text-[#302B33]"
          >
            Enter your language or dialect name
          </label>
          <input
            id="sahaaya-custom-language-input"
            type="text"
            value={prefs.customLanguageName}
            onChange={(e) =>
              onPrefsChange({
                ...prefs,
                mode: 'custom',
                customLanguageName: e.target.value,
              })
            }
            placeholder="e.g., Kodava, Beary, Lambadi, Sankethi..."
            className="w-full min-h-[48px] px-4 py-2.5 rounded-xl bg-[#FFFCF7] border border-[var(--sahaaya-border)] text-base text-[#302B33]"
          />
          <div className="flex items-start gap-2 text-xs text-[#5C5363]">
            <AlertCircle
              className="w-4 h-4 text-[#D98570] shrink-0 mt-0.5"
              aria-hidden="true"
            />
            <p>
              Browser speech recognition is not verified for custom community languages. Text input remains fully available, and future native Android/open-source speech packs can plug into this setting.
            </p>
          </div>
        </div>
      )}

      {/* Searchable Categorized Language Directory */}
      {prefs.mode === 'select' && (
        <div className="space-y-4">
          {/* Search Bar & Category Filter */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search
                className="w-4 h-4 text-[#5C5363] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                aria-hidden="true"
              />
              <label htmlFor="sahaaya-language-search" className="sr-only">
                Search language by name
              </label>
              <input
                id="sahaaya-language-search"
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search any language (e.g., Tulu, Malayalam, Kutchi, Tamil, French)..."
                className="w-full min-h-[48px] pl-10 pr-4 py-2.5 rounded-xl bg-[#F7F1E8] border border-[var(--sahaaya-border)] text-base text-[#302B33] placeholder:text-[#5C5363]/75 focus:bg-[#FFFCF7]"
              />
            </div>
          </div>

          {/* Category Tabs */}
          <div className="flex flex-wrap gap-2">
            {CATEGORY_TABS.map((tab) => {
              const active = categoryFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setCategoryFilter(tab.id)}
                  aria-pressed={active}
                  className={`min-h-[40px] px-3.5 py-1.5 rounded-xl text-sm font-semibold transition-colors cursor-pointer ${
                    active
                      ? 'bg-[#493451] text-[#FFFCF7]'
                      : 'bg-[#F7F1E8] text-[#302B33] border border-[var(--sahaaya-border)] hover:bg-[#EFEAF6]'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Categorized Results */}
          {filteredLanguages.length === 0 ? (
            <div className="rounded-2xl bg-[#F7F1E8] border border-[var(--sahaaya-border)] p-5 text-center space-y-2">
              <p className="text-base font-medium text-[#302B33]">
                No matching listed language found for “{searchQuery}”.
              </p>
              <button
                type="button"
                onClick={() =>
                  onPrefsChange({
                    mode: 'custom',
                    selectedLanguageId: prefs.selectedLanguageId,
                    customLanguageName: searchQuery.trim(),
                  })
                }
                className="min-h-[44px] px-4 py-2 rounded-xl bg-[#493451] text-[#FFFCF7] text-sm font-semibold cursor-pointer"
              >
                Use “{searchQuery.trim()}” as Custom Language
              </button>
            </div>
          ) : (
            <div className="space-y-5 max-h-[340px] overflow-y-auto pr-1">
              {(
                [
                  { key: 'indian', title: 'Indian Languages' },
                  { key: 'regional', title: 'Regional & Community Languages' },
                  { key: 'international', title: 'International Languages' },
                ] as const
              ).map(({ key, title }) => {
                const items = groupedLanguages[key];
                if (items.length === 0) return null;
                return (
                  <section key={key} aria-label={title} className="space-y-2.5">
                    <h3 className="text-xs font-bold uppercase tracking-wide text-[#5C5363]">
                      {title} ({items.length})
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {items.map((opt) => {
                        const isSelected = prefs.selectedLanguageId === opt.id;
                        const status: VoiceCapabilityStatus =
                          !recognitionSupported &&
                          opt.defaultCapability !== 'future_integration_required'
                            ? 'text_only_unverified'
                            : opt.defaultCapability;
                        const badge = getStatusBadgeStyle(status);
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => selectLanguage(opt)}
                            aria-pressed={isSelected}
                            className={`min-h-[64px] p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex items-start justify-between gap-2 ${
                              isSelected
                                ? 'bg-[#EFEAF6] border-[#493451] ring-2 ring-[#493451]/25'
                                : 'bg-[#FFFCF7] border-[var(--sahaaya-border)] hover:bg-[#F7F1E8]'
                            }`}
                          >
                            <div className="space-y-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-semibold text-base text-[#302B33]">
                                  {opt.nativeName}
                                </span>
                                {opt.nativeName !== opt.name && (
                                  <span className="text-sm text-[#5C5363]">
                                    {opt.name}
                                  </span>
                                )}
                              </div>
                              <span
                                className={`inline-block px-2 py-0.5 rounded-lg border text-[11px] font-semibold ${badge.bg} ${badge.text} ${badge.border}`}
                              >
                                {getCapabilityStatusLabel(status, uiLanguage)}
                              </span>
                            </div>
                            {isSelected && (
                              <span className="w-6 h-6 rounded-full bg-[#493451] text-[#FFFCF7] flex items-center justify-center shrink-0 mt-0.5">
                                <Check className="w-3.5 h-3.5" aria-hidden="true" />
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </section>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );

  if (isModal) {
    return (
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Universal Voice and Language Settings"
        className="fixed inset-0 z-50 bg-[#302B33]/45 backdrop-blur-xs flex items-center justify-center p-4"
      >
        {content}
      </div>
    );
  }

  return content;
}
