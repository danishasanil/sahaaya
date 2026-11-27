import { ArrowRight, FileText, Mic, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { LanguageSelector } from '../components/LanguageSelector';
import { SahaayaLogo } from '../components/SahaayaLogo';
import { TRANSLATIONS } from '../i18n/translations';
import { LanguageCode } from '../types/sahaaya';

interface WelcomeScreenProps {
  language: LanguageCode;
  hasDraftProgress: boolean;
  onLanguageChange: (lang: LanguageCode) => void;
  onStartAssistant: () => void;
  onStartWithCommand?: (command: string) => void;
  onOpenForm: () => void;
}

export function WelcomeScreen({
  language,
  hasDraftProgress,
  onLanguageChange,
  onStartAssistant,
  onStartWithCommand,
  onOpenForm,
}: WelcomeScreenProps) {
  const t = TRANSLATIONS[language];
  const [imgError, setImgError] = useState(false);

  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12 lg:py-16">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
        {/* Left Column: Warm Greeting, Language Choice & Primary CTA */}
        <div className="lg:col-span-7 space-y-7">
          <div className="space-y-4">
            <div className="flex items-center gap-3.5">
              <SahaayaLogo size={48} />
              <div>
                <p className="font-display text-2xl sm:text-3xl font-bold text-[#493451] leading-tight">
                  {t.brandName}
                </p>
                <p className="text-sm sm:text-base font-medium text-[#5C5363]">
                  {t.tagline}
                </p>
              </div>
            </div>

            <p className="text-sm font-medium text-[#5C5363] pt-2">
              {t.welcome.demoBadgeText}
            </p>

            <h1 className="font-display text-3xl sm:text-4xl lg:text-[2.75rem] font-semibold text-[#302B33] leading-[1.2] text-balance">
              {t.welcome.greeting}
            </h1>

            <p className="text-lg sm:text-xl text-[#5C5363] max-w-2xl leading-relaxed">
              {t.welcome.description}
            </p>
          </div>

          {/* Everyday Voice Examples */}
          <div className="space-y-2.5">
            <p className="text-sm font-semibold text-[#493451]">
              {t.welcome.examplesLabel}
            </p>
            <div className="flex flex-wrap gap-2">
              {t.welcome.quickCapabilities.map((example) => (
                <button
                  key={example}
                  type="button"
                  onClick={() =>
                    onStartWithCommand
                      ? onStartWithCommand(example)
                      : onStartAssistant()
                  }
                  className="min-h-[44px] px-3.5 py-2 rounded-xl border border-[var(--sahaaya-border)] bg-[#FFFCF7] hover:bg-[#EFEAF6] text-sm font-medium text-[#302B33] transition-colors cursor-pointer text-left"
                >
                  “{example}”
                </button>
              ))}
            </div>
          </div>

          {/* Language Selection */}
          <div className="space-y-2.5">
            <p className="text-sm font-semibold text-[#493451]">
              {t.welcome.chooseLanguage}
            </p>
            <LanguageSelector language={language} onChange={onLanguageChange} />
          </div>

          {/* Primary Action & Secondary Form Option */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 pt-1">
            <button
              type="button"
              onClick={onStartAssistant}
              className="min-h-[56px] px-7 py-3.5 rounded-2xl bg-[#493451] hover:bg-[#3A2841] text-[#FFFCF7] font-semibold text-lg inline-flex items-center justify-center gap-3 shadow-[0_12px_28px_-10px_rgba(73,52,81,0.45)] transition-transform active:scale-[0.99] cursor-pointer whitespace-nowrap"
            >
              <Mic className="w-5 h-5 shrink-0" aria-hidden="true" />
              <span>
                {hasDraftProgress ? t.welcome.resumeButton : t.welcome.startButton}
              </span>
              <ArrowRight className="w-5 h-5 shrink-0" aria-hidden="true" />
            </button>

            <button
              type="button"
              onClick={onOpenForm}
              className="min-h-[52px] px-5 py-3 rounded-2xl border border-[var(--sahaaya-border)] bg-[#FFFCF7] hover:bg-[#EFEAF6] text-[#493451] font-semibold text-base inline-flex items-center justify-center gap-2.5 transition-colors cursor-pointer whitespace-nowrap"
            >
              <FileText className="w-5 h-5 shrink-0" aria-hidden="true" />
              <span>{t.welcome.directFormLink}</span>
            </button>
          </div>

          {/* Privacy Reassurance */}
          <div className="flex items-start gap-3 pt-2 max-w-xl text-sm text-[#5C5363]">
            <ShieldCheck
              className="w-5 h-5 text-[#648F83] shrink-0 mt-0.5"
              aria-hidden="true"
            />
            <p className="leading-relaxed">{t.welcome.privacyNote}</p>
          </div>
        </div>

        {/* Right Column: Large Editorial Microphone Illustration Card */}
        <div className="lg:col-span-5">
          <div className="rounded-3xl bg-[#FFFCF7] border border-[var(--sahaaya-border)] shadow-[var(--sahaaya-shadow)] p-6 sm:p-8">
            <div className="aspect-square w-full overflow-hidden rounded-2xl bg-[#FFFCF7] flex items-center justify-center">
              {!imgError ? (
                <img
                  src="/src/assets/images/welcome_voice_illustration_1795754122488.jpg"
                  alt="Warm editorial illustration of a microphone with gentle sound waves"
                  referrerPolicy="no-referrer"
                  onError={() => setImgError(true)}
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center gap-4 p-8 text-center bg-[#EFEAF6]/50 rounded-2xl">
                  <div className="w-24 h-24 rounded-full bg-[#493451] text-[#FFFCF7] flex items-center justify-center">
                    <Mic className="w-11 h-11" aria-hidden="true" />
                  </div>
                  <p className="font-display text-xl font-semibold text-[#493451]">
                    {t.brandName}
                  </p>
                </div>
              )}
            </div>
            <div className="mt-5 pt-4 border-t border-[var(--sahaaya-border)] flex items-center justify-between gap-4 text-sm text-[#5C5363]">
              <span>English · हिन्दी · ಕನ್ನಡ</span>
              <span className="font-semibold text-[#493451]">
                {t.welcome.cardSubtitle}
              </span>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

