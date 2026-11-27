import {
  CheckCircle2,
  Download,
  Home,
  Info,
  RotateCcw,
} from 'lucide-react';
import { useState } from 'react';
import { TRANSLATIONS } from '../i18n/translations';
import { ApplicationData, LanguageCode } from '../types/sahaaya';
import { buildReceiptText } from '../utils/applicationLogic';

interface SuccessScreenProps {
  language: LanguageCode;
  data: ApplicationData;
  confirmationNumber: string;
  submittedAt: string;
  onStartNew: () => void;
  onBackHome: () => void;
}

export function SuccessScreen({
  language,
  data,
  confirmationNumber,
  submittedAt,
  onStartNew,
  onBackHome,
}: SuccessScreenProps) {
  const t = TRANSLATIONS[language];
  const [imgError, setImgError] = useState(false);

  const handleDownloadReceipt = () => {
    const content = buildReceiptText(data, confirmationNumber, submittedAt, language);
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Sahaaya-Demo-Receipt-${confirmationNumber}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      <section className="rounded-3xl bg-[#FFFCF7] border border-[var(--sahaaya-border)] shadow-[var(--sahaaya-shadow)] p-6 sm:p-10 text-center space-y-6">
        {/* Success Illustration */}
        <div className="mx-auto max-w-[260px] aspect-[4/3] rounded-2xl overflow-hidden bg-[#FFFCF7] flex items-center justify-center">
          {!imgError ? (
            <img
              src="/src/assets/images/success_completion_illustration_1795754123143.jpg"
              alt="Editorial illustration showing a completed welfare application document with a teal checkmark seal"
              referrerPolicy="no-referrer"
              onError={() => setImgError(true)}
              className="w-full h-full object-contain"
            />
          ) : (
            <div className="w-full h-full rounded-2xl bg-[#EAF2EF] flex items-center justify-center">
              <CheckCircle2 className="w-16 h-16 text-[#648F83]" aria-hidden="true" />
            </div>
          )}
        </div>

        {/* Success Headline */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 text-[#648F83] font-semibold text-sm">
            <CheckCircle2 className="w-5 h-5" aria-hidden="true" />
            <span>{t.welcome.demoBadgeText}</span>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-semibold text-[#302B33] text-balance">
            {t.success.title}
          </h1>
        </div>

        {/* Confirmation Details Box */}
        <div className="rounded-2xl bg-[#F7F1E8] border border-[var(--sahaaya-border)] p-5 sm:p-6 max-w-lg mx-auto space-y-3 text-left">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
            <span className="text-sm font-medium text-[#5C5363]">
              {t.success.confirmationLabel}
            </span>
            <span className="text-lg font-bold text-[#493451] tabular-nums tracking-wide">
              {confirmationNumber}
            </span>
          </div>
          <div className="border-t border-[var(--sahaaya-border)] pt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
            <span className="text-sm font-medium text-[#5C5363]">
              {t.success.applicantLabel}
            </span>
            <span className="text-base font-semibold text-[#302B33]">
              {data.fullName || '—'}
            </span>
          </div>
          <div className="border-t border-[var(--sahaaya-border)] pt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
            <span className="text-sm font-medium text-[#5C5363]">
              {t.success.submittedOn}
            </span>
            <span className="text-sm font-semibold text-[#302B33] tabular-nums">
              {submittedAt}
            </span>
          </div>
        </div>

        {/* Download Receipt Primary Action */}
        <div className="pt-1">
          <button
            type="button"
            onClick={handleDownloadReceipt}
            className="min-h-[54px] px-7 py-3.5 rounded-2xl bg-[#493451] hover:bg-[#3A2841] text-[#FFFCF7] font-semibold text-lg inline-flex items-center justify-center gap-2.5 shadow-[0_10px_24px_-8px_rgba(73,52,81,0.4)] cursor-pointer"
          >
            <Download className="w-5 h-5" aria-hidden="true" />
            <span>{t.success.downloadReceipt}</span>
          </button>
        </div>

        {/* Clear Simulated Application Disclaimer */}
        <div
          role="note"
          className="rounded-2xl bg-[#EFEAF6] border border-[#A995C8]/45 p-4 sm:p-5 text-left flex items-start gap-3.5"
        >
          <Info className="w-5 h-5 text-[#493451] shrink-0 mt-0.5" aria-hidden="true" />
          <div className="space-y-1.5 text-sm">
            <p className="font-bold text-[#493451] tracking-wide">
              {t.assistant.demoMode.demoSubmissionBanner}
            </p>
            <p className="font-semibold text-[#493451]">{t.success.disclaimerTitle}</p>
            <p className="text-[#302B33] leading-relaxed">{t.success.disclaimerBody}</p>
          </div>
        </div>

        {/* Secondary Navigation Actions */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={onStartNew}
            className="min-h-[48px] px-5 py-2.5 rounded-xl border border-[var(--sahaaya-border)] bg-[#FFFCF7] hover:bg-[#EFEAF6] text-[#493451] font-semibold text-base inline-flex items-center justify-center gap-2 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" aria-hidden="true" />
            <span>{t.success.startNew}</span>
          </button>

          <button
            type="button"
            onClick={onBackHome}
            className="min-h-[48px] px-5 py-2.5 rounded-xl border border-[var(--sahaaya-border)] bg-[#F7F1E8] hover:bg-[#EFEAF6] text-[#302B33] font-semibold text-base inline-flex items-center justify-center gap-2 cursor-pointer"
          >
            <Home className="w-4 h-4" aria-hidden="true" />
            <span>{t.success.backHome}</span>
          </button>
        </div>
      </section>
    </main>
  );
}
