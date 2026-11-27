import {
  AlertCircle,
  CheckCircle2,
  Edit3,
  Square,
  Volume2,
  XCircle,
} from 'lucide-react';
import { APPLICATION_FIELD_ORDER, TRANSLATIONS } from '../i18n/translations';
import { ApplicationData, ApplicationFieldKey, LanguageCode } from '../types/sahaaya';
import { formatDisplayValue, validateAllFields } from '../utils/applicationLogic';

interface ReviewScreenProps {
  language: LanguageCode;
  data: ApplicationData;
  isSpeaking: boolean;
  onReadAloud: (summaryText: string) => void;
  onStopReading: () => void;
  onEditField: (field: ApplicationFieldKey) => void;
  onConfirmSubmit: () => void;
  onGoBackToForm: () => void;
}

export function ReviewScreen({
  language,
  data,
  isSpeaking,
  onReadAloud,
  onStopReading,
  onEditField,
  onConfirmSubmit,
  onGoBackToForm,
}: ReviewScreenProps) {
  const t = TRANSLATIONS[language];
  const errors = validateAllFields(data, language);
  const hasMissingOrInvalid = Object.keys(errors).length > 0;

  const handleReadAloudClick = () => {
    if (isSpeaking) {
      onStopReading();
      return;
    }
    const summaryLines = APPLICATION_FIELD_ORDER.map((key) => {
      const label = t.fields[key].label;
      const val = formatDisplayValue(key, data[key], language);
      return `${label}: ${val}`;
    }).join('. ');

    onReadAloud(t.review.readAloudTemplate(summaryLines));
  };

  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
      {/* Header & Read Aloud Control */}
      <div className="rounded-3xl bg-[#FFFCF7] border border-[var(--sahaaya-border)] shadow-[var(--sahaaya-shadow)] p-6 sm:p-8 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
        <div className="space-y-1.5">
          <h1 className="font-display text-2xl sm:text-3xl font-semibold text-[#302B33]">
            {t.review.title}
          </h1>
          <p className="text-base text-[#5C5363]">{t.review.subtitle}</p>
        </div>

        <button
          type="button"
          onClick={handleReadAloudClick}
          className={`min-h-[52px] px-5 py-3 rounded-2xl font-semibold text-base inline-flex items-center justify-center gap-2.5 transition-colors cursor-pointer shrink-0 whitespace-nowrap ${
            isSpeaking
              ? 'bg-[#D98570] text-[#FFFCF7]'
              : 'bg-[#EFEAF6] hover:bg-[#A995C8]/35 text-[#493451]'
          }`}
        >
          {isSpeaking ? (
            <>
              <Square className="w-4 h-4 fill-current" aria-hidden="true" />
              <span>{t.review.stopReading}</span>
            </>
          ) : (
            <>
              <Volume2 className="w-5 h-5" aria-hidden="true" />
              <span>{t.review.readAloud}</span>
            </>
          )}
        </button>
      </div>

      {/* Incomplete Warning if fields are missing */}
      {hasMissingOrInvalid && (
        <div
          role="alert"
          className="mb-6 rounded-2xl bg-[#FBEEE9] border border-[#D98570]/50 p-4 flex items-start gap-3 text-[#302B33]"
        >
          <AlertCircle className="w-5 h-5 text-[#D98570] shrink-0 mt-0.5" aria-hidden="true" />
          <p className="text-base font-medium">{t.review.missingNotice}</p>
        </div>
      )}

      {/* All 9 Application Fields Summary Card */}
      <section className="rounded-3xl bg-[#FFFCF7] border border-[var(--sahaaya-border)] shadow-[var(--sahaaya-shadow)] divide-y divide-[var(--sahaaya-border)] overflow-hidden">
        {APPLICATION_FIELD_ORDER.map((fieldKey, index) => {
          const label = t.fields[fieldKey].label;
          const rawValue = data[fieldKey];
          const displayVal = formatDisplayValue(fieldKey, rawValue, language);
          const fieldError = errors[fieldKey];

          return (
            <div
              key={fieldKey}
              className="px-5 sm:px-7 py-4 sm:py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div className="space-y-1 min-w-0">
                <p className="text-sm font-semibold text-[#5C5363]">
                  {index + 1}. {label}
                </p>
                <p
                  className={`text-lg font-semibold break-words ${
                    fieldError ? 'text-[#D98570]' : 'text-[#302B33]'
                  }`}
                >
                  {displayVal}
                </p>
                {fieldError && (
                  <p className="text-sm text-[#D98570]">{fieldError}</p>
                )}
              </div>

              <button
                type="button"
                onClick={() => onEditField(fieldKey)}
                aria-label={`${t.review.editButton} ${label}`}
                className="min-h-[44px] px-4 py-2 rounded-xl border border-[var(--sahaaya-border)] bg-[#F7F1E8] hover:bg-[#EFEAF6] text-[#493451] text-sm font-semibold inline-flex items-center justify-center gap-2 self-start sm:self-center shrink-0 cursor-pointer whitespace-nowrap"
              >
                <Edit3 className="w-4 h-4" aria-hidden="true" />
                <span>{t.review.editButton}</span>
              </button>
            </div>
          );
        })}
      </section>

      {/* Explicit Confirmation Box */}
      <section className="mt-6 rounded-3xl bg-[#FFFCF7] border border-[var(--sahaaya-border)] shadow-[var(--sahaaya-shadow)] p-6 sm:p-8 text-center space-y-5">
        <div className="space-y-2 max-w-2xl mx-auto">
          <h2 className="font-display text-xl sm:text-2xl font-semibold text-[#302B33]">
            {t.review.confirmationQuestion}
          </h2>
          <p className="text-sm sm:text-base text-[#5C5363]">
            {t.review.confirmationSubtext}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-4 pt-1">
          <button
            type="button"
            onClick={onGoBackToForm}
            className="min-h-[54px] px-6 py-3 rounded-2xl border border-[var(--sahaaya-border)] bg-[#F7F1E8] hover:bg-[#EFEAF6] text-[#302B33] font-semibold text-base inline-flex items-center justify-center gap-2.5 cursor-pointer"
          >
            <XCircle className="w-5 h-5 text-[#D98570]" aria-hidden="true" />
            <span>{t.review.noGoBack}</span>
          </button>

          <button
            type="button"
            onClick={hasMissingOrInvalid ? onGoBackToForm : onConfirmSubmit}
            className="min-h-[54px] px-7 py-3 rounded-2xl bg-[#493451] hover:bg-[#3A2841] text-[#FFFCF7] font-semibold text-lg inline-flex items-center justify-center gap-2.5 shadow-[0_10px_24px_-8px_rgba(73,52,81,0.4)] cursor-pointer"
          >
            <CheckCircle2 className="w-5 h-5" aria-hidden="true" />
            <span>{t.review.yesSubmit}</span>
          </button>
        </div>
      </section>
    </main>
  );
}
