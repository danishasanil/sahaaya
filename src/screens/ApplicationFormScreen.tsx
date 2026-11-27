import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Circle,
  Edit3,
  Mic,
  RotateCcw,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import {
  APPLICATION_FIELD_ORDER,
  INDIAN_STATES,
  TRANSLATIONS,
} from '../i18n/translations';
import { ApplicationData, ApplicationFieldKey, LanguageCode } from '../types/sahaaya';
import { getCompletionStats, validateAllFields, validateField } from '../utils/applicationLogic';

interface ApplicationFormScreenProps {
  language: LanguageCode;
  data: ApplicationData;
  focusedField?: ApplicationFieldKey | null;
  onUpdateField: (field: ApplicationFieldKey, value: string) => void;
  onSpeakField: (field: ApplicationFieldKey) => void;
  onBackToAssistant: () => void;
  onContinueToReview: () => void;
  onResetForm: () => void;
}

export function ApplicationFormScreen({
  language,
  data,
  focusedField,
  onUpdateField,
  onSpeakField,
  onBackToAssistant,
  onContinueToReview,
  onResetForm,
}: ApplicationFormScreenProps) {
  const t = TRANSLATIONS[language];
  const stats = getCompletionStats(data);
  const [touched, setTouched] = useState<Partial<Record<ApplicationFieldKey, boolean>>>({});
  const [showAllErrors, setShowAllErrors] = useState(false);
  const [editingField, setEditingField] = useState<ApplicationFieldKey | null>(
    focusedField || null
  );
  const inputRefs = useRef<
    Partial<Record<ApplicationFieldKey, HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | null>>
  >({});

  useEffect(() => {
    if (stats.filledCount === 0) {
      setTouched({});
      setShowAllErrors(false);
    }
  }, [stats.filledCount]);

  useEffect(() => {
    if (focusedField) {
      setEditingField(focusedField);
      const el = inputRefs.current[focusedField];
      if (el) {
        el.focus();
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [focusedField]);

  const handleContinue = () => {
    const errors = validateAllFields(data, language);
    if (Object.keys(errors).length > 0) {
      setShowAllErrors(true);
      const firstErrorField = APPLICATION_FIELD_ORDER.find((f) => Boolean(errors[f]));
      if (firstErrorField) {
        const el = inputRefs.current[firstErrorField];
        el?.focus();
        el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }
    onContinueToReview();
  };

  const handleFieldEditToggle = (field: ApplicationFieldKey) => {
    setEditingField(field);
    setTimeout(() => {
      inputRefs.current[field]?.focus();
    }, 30);
  };

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
      {/* Header & Progress */}
      <div className="rounded-3xl bg-[#FFFCF7] border border-[var(--sahaaya-border)] shadow-[var(--sahaaya-shadow)] p-6 sm:p-8 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="space-y-1.5">
            <h1 className="font-display text-2xl sm:text-3xl font-semibold text-[#302B33]">
              {t.form.title}
            </h1>
            <p className="text-base text-[#5C5363] max-w-2xl">{t.form.subtitle}</p>
          </div>
          <button
            type="button"
            onClick={onResetForm}
            className="min-h-[44px] px-4 py-2 rounded-xl border border-[var(--sahaaya-border)] hover:bg-[#FBEEE9] text-[#5C5363] hover:text-[#302B33] text-sm font-semibold inline-flex items-center gap-2 self-start cursor-pointer whitespace-nowrap"
          >
            <RotateCcw className="w-4 h-4" aria-hidden="true" />
            <span>{t.form.clearDraft}</span>
          </button>
        </div>

        <div className="mt-6 space-y-2">
          <div className="flex items-center justify-between text-sm font-semibold">
            <span className="text-[#493451]">
              {t.form.progressText(stats.filledCount, stats.totalCount)}
            </span>
            <span className="text-[#5C5363] tabular-nums">{stats.percentage}%</span>
          </div>
          <div
            className="w-full h-3 rounded-full bg-[#EFEAF6] overflow-hidden"
            role="progressbar"
            aria-valuenow={stats.filledCount}
            aria-valuemin={0}
            aria-valuemax={stats.totalCount}
          >
            <div
              className="h-full rounded-full bg-[#648F83] transition-all duration-300"
              style={{ width: `${Math.max(stats.percentage, 4)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Validation Banner if needed */}
      {showAllErrors && Object.keys(validateAllFields(data, language)).length > 0 && (
        <div
          role="alert"
          className="mb-6 rounded-2xl bg-[#FBEEE9] border border-[#D98570]/50 p-4 flex items-center gap-3 text-[#302B33]"
        >
          <AlertTriangle className="w-5 h-5 text-[#D98570] shrink-0" aria-hidden="true" />
          <p className="text-base font-medium">{t.form.validationSummary}</p>
        </div>
      )}

      {/* 9 Application Fields Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {APPLICATION_FIELD_ORDER.map((fieldKey, index) => {
          const meta = t.fields[fieldKey];
          const value = data[fieldKey];
          const errorMsg =
            touched[fieldKey] || showAllErrors
              ? validateField(fieldKey, value, language)
              : null;
          const isValidFilled = value.trim().length > 0 && !validateField(fieldKey, value, language);
          const isFullWidth = fieldKey === 'address';
          const isHighlighted = editingField === fieldKey;

          return (
            <div
              key={fieldKey}
              className={`rounded-2xl bg-[#FFFCF7] border p-5 transition-colors ${
                isFullWidth ? 'md:col-span-2' : ''
              } ${
                errorMsg
                  ? 'border-[#D98570]'
                  : isHighlighted
                    ? 'border-[#493451]'
                    : 'border-[var(--sahaaya-border)]'
              }`}
            >
              {/* Field Label & Explicit Status + Individual Controls */}
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <label
                  htmlFor={`field-${fieldKey}`}
                  className="text-base font-semibold text-[#302B33] flex items-center gap-2"
                >
                  <span className="text-[#5C5363] tabular-nums">{index + 1}.</span>
                  <span>{meta.label}</span>
                </label>

                <div className="flex items-center gap-2">
                  {/* Accessible Status Text + Icon (Never color alone) */}
                  {isValidFilled ? (
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#648F83]">
                      <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden="true" />
                      <span>{t.form.completedLabel}</span>
                    </span>
                  ) : errorMsg ? (
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#D98570]">
                      <AlertTriangle className="w-4 h-4 shrink-0" aria-hidden="true" />
                      <span>{t.form.needsAttentionLabel}</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#5C5363]">
                      <Circle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                      <span>{t.form.pendingLabel}</span>
                    </span>
                  )}

                  {/* Individual Edit Button */}
                  <button
                    type="button"
                    onClick={() => handleFieldEditToggle(fieldKey)}
                    aria-label={`${t.form.editFieldLabel} ${meta.label}`}
                    className="min-h-[38px] px-2.5 py-1 rounded-lg hover:bg-[#EFEAF6] text-[#493451] text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>{t.form.editFieldLabel}</span>
                  </button>

                  {/* Individual Voice-fill Button */}
                  <button
                    type="button"
                    onClick={() => onSpeakField(fieldKey)}
                    aria-label={`${t.form.speakFieldLabel} ${meta.label}`}
                    className="min-h-[38px] px-2.5 py-1 rounded-lg bg-[#EFEAF6] hover:bg-[#A995C8]/35 text-[#493451] text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Mic className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>{t.form.speakFieldLabel}</span>
                  </button>
                </div>
              </div>

              {/* Input Control */}
              {fieldKey === 'gender' ? (
                <select
                  id={`field-${fieldKey}`}
                  ref={(el) => {
                    inputRefs.current[fieldKey] = el;
                  }}
                  value={value}
                  onChange={(e) => {
                    onUpdateField(fieldKey, e.target.value);
                    setTouched((prev) => ({ ...prev, [fieldKey]: true }));
                  }}
                  onBlur={() => setTouched((prev) => ({ ...prev, [fieldKey]: true }))}
                  className="w-full min-h-[52px] px-4 py-3 rounded-xl bg-[#F7F1E8] border border-[var(--sahaaya-border)] text-base text-[#302B33] focus:bg-[#FFFCF7]"
                >
                  <option value="">{t.form.selectOption}</option>
                  <option value="Male">{t.genderOptions.Male}</option>
                  <option value="Female">{t.genderOptions.Female}</option>
                  <option value="Other">{t.genderOptions.Other}</option>
                </select>
              ) : fieldKey === 'state' ? (
                <select
                  id={`field-${fieldKey}`}
                  ref={(el) => {
                    inputRefs.current[fieldKey] = el;
                  }}
                  value={value}
                  onChange={(e) => {
                    onUpdateField(fieldKey, e.target.value);
                    setTouched((prev) => ({ ...prev, [fieldKey]: true }));
                  }}
                  onBlur={() => setTouched((prev) => ({ ...prev, [fieldKey]: true }))}
                  className="w-full min-h-[52px] px-4 py-3 rounded-xl bg-[#F7F1E8] border border-[var(--sahaaya-border)] text-base text-[#302B33] focus:bg-[#FFFCF7]"
                >
                  <option value="">{t.form.selectOption}</option>
                  {INDIAN_STATES.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              ) : fieldKey === 'address' ? (
                <textarea
                  id={`field-${fieldKey}`}
                  ref={(el) => {
                    inputRefs.current[fieldKey] = el;
                  }}
                  rows={2}
                  value={value}
                  placeholder={meta.placeholder}
                  onChange={(e) => onUpdateField(fieldKey, e.target.value)}
                  onBlur={() => setTouched((prev) => ({ ...prev, [fieldKey]: true }))}
                  className="w-full min-h-[82px] px-4 py-3 rounded-xl bg-[#F7F1E8] border border-[var(--sahaaya-border)] text-base text-[#302B33] placeholder:text-[#5C5363]/70 focus:bg-[#FFFCF7]"
                />
              ) : (
                <input
                  id={`field-${fieldKey}`}
                  ref={(el) => {
                    inputRefs.current[fieldKey] = el;
                  }}
                  type={
                    fieldKey === 'dateOfBirth'
                      ? 'date'
                      : fieldKey === 'age' || fieldKey === 'annualIncome'
                        ? 'number'
                        : fieldKey === 'mobileNumber'
                          ? 'tel'
                          : 'text'
                  }
                  inputMode={
                    fieldKey === 'age' || fieldKey === 'annualIncome' || fieldKey === 'mobileNumber'
                      ? 'numeric'
                      : undefined
                  }
                  value={value}
                  placeholder={meta.placeholder}
                  onChange={(e) => onUpdateField(fieldKey, e.target.value)}
                  onBlur={() => setTouched((prev) => ({ ...prev, [fieldKey]: true }))}
                  className="w-full min-h-[52px] px-4 py-3 rounded-xl bg-[#F7F1E8] border border-[var(--sahaaya-border)] text-base text-[#302B33] placeholder:text-[#5C5363]/70 focus:bg-[#FFFCF7]"
                />
              )}

              {/* Validation Error Message */}
              {errorMsg && (
                <p className="mt-2 text-sm font-medium text-[#D98570]" role="alert">
                  {errorMsg}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* Bottom Action Bar */}
      <div className="mt-8 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <button
          type="button"
          onClick={onBackToAssistant}
          className="min-h-[54px] px-6 py-3 rounded-2xl border border-[var(--sahaaya-border)] bg-[#FFFCF7] hover:bg-[#EFEAF6] text-[#493451] font-semibold text-base inline-flex items-center justify-center gap-2.5 cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5" aria-hidden="true" />
          <span>{t.form.backToAssistant}</span>
        </button>

        <button
          type="button"
          onClick={handleContinue}
          className="min-h-[54px] px-7 py-3 rounded-2xl bg-[#493451] hover:bg-[#3A2841] text-[#FFFCF7] font-semibold text-lg inline-flex items-center justify-center gap-2.5 shadow-[0_10px_24px_-8px_rgba(73,52,81,0.4)] cursor-pointer"
        >
          <span>{t.form.continueToReview}</span>
          <ArrowRight className="w-5 h-5" aria-hidden="true" />
        </button>
      </div>
    </main>
  );
}
