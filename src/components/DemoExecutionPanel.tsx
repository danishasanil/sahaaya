import {
  CheckCircle2,
  Circle,
  ExternalLink,
  Globe,
  Loader2,
  Smartphone,
  XCircle,
} from 'lucide-react';
import { TRANSLATIONS } from '../i18n/translations';
import { DemoExecutionSession, DemoExecutionStatus } from '../types/demoExecution';
import { LanguageCode } from '../types/sahaaya';

interface DemoExecutionPanelProps {
  language: LanguageCode;
  session: DemoExecutionSession;
  onConfirm?: () => void;
  onCancel?: () => void;
}

const DEMO_STATUS_LABELS: Record<DemoExecutionStatus, string> = {
  understanding_request: 'Understanding request',
  waiting_for_confirmation: 'Waiting for confirmation',
  preparing_application: 'Preparing application',
  opening_application: 'Opening application',
  performing_action: 'Performing action',
  completed: 'Completed',
  simulated_completion: 'Simulated completion',
  cancelled: 'Cancelled',
  failed: 'Failed',
};

export function DemoExecutionPanel({
  language,
  session,
  onConfirm,
  onCancel,
}: DemoExecutionPanelProps) {
  const t = TRANSLATIONS[language];
  const isWaiting = session.status === 'waiting_for_confirmation';
  const isRunning =
    session.status === 'understanding_request' ||
    session.status === 'preparing_application' ||
    session.status === 'opening_application' ||
    session.status === 'performing_action';

  return (
    <section
      aria-label={t.assistant.demoMode.executionPanelTitle}
      className="rounded-3xl bg-[#FFFCF7] border border-[var(--sahaaya-border)] shadow-[var(--sahaaya-shadow)] p-5 sm:p-6 space-y-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-lg font-semibold text-[#302B33]">
          {t.assistant.demoMode.executionPanelTitle}
        </h2>
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold tracking-wide ${
            session.isSimulated
              ? 'bg-[#EFEAF6] text-[#493451] border border-[#A995C8]/60'
              : 'bg-[#EAF2EF] text-[#355A50] border border-[#648F83]/40'
          }`}
        >
          {session.isSimulated ? (
            <Smartphone className="w-3.5 h-3.5" aria-hidden="true" />
          ) : (
            <Globe className="w-3.5 h-3.5" aria-hidden="true" />
          )}
          <span>
            {session.isSimulated
              ? t.assistant.demoMode.simulatedBadge
              : t.assistant.demoMode.realBadge}
          </span>
        </span>
      </div>

      {/* Metadata Summary */}
      <div className="rounded-2xl bg-[#F7F1E8] border border-[var(--sahaaya-border)] p-3.5 space-y-2 text-sm">
        <div>
          <span className="text-xs font-semibold text-[#5C5363] block">
            {t.assistant.taskInspector.instructionLabel}
          </span>
          <span className="text-[#302B33] font-medium break-words">
            “{session.recognisedCommand}”
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-[var(--sahaaya-border)]">
          <div>
            <span className="text-xs font-semibold text-[#5C5363] block">
              Application
            </span>
            <span className="text-[#493451] font-semibold">{session.appName}</span>
          </div>
          <div>
            <span className="text-xs font-semibold text-[#5C5363] block">
              Status
            </span>
            <span
              className={`font-semibold ${
                session.status === 'completed' ||
                session.status === 'simulated_completion'
                  ? 'text-[#648F83]'
                  : session.status === 'cancelled' || session.status === 'failed'
                    ? 'text-[#D98570]'
                    : 'text-[#493451]'
              }`}
            >
              {DEMO_STATUS_LABELS[session.status]}
            </span>
          </div>
        </div>
        <div className="pt-1 border-t border-[var(--sahaaya-border)]">
          <span className="text-xs font-semibold text-[#5C5363] block">
            Requested Action
          </span>
          <span className="text-[#302B33] font-medium">
            {session.requestedAction}
          </span>
        </div>
      </div>

      {/* Explicit WhatsApp Confirmation Preview */}
      {isWaiting && session.payload.whatsAppState && (
        <div className="rounded-2xl bg-[#EFEAF6] border border-[#A995C8]/60 p-3.5 space-y-1.5 text-sm">
          <p className="text-[#302B33]">
            <span className="font-semibold text-[#493451]">Recipient:</span>{' '}
            {session.payload.whatsAppState.recipient}
          </p>
          <p className="text-[#302B33]">
            <span className="font-semibold text-[#493451]">Message:</span>{' '}
            “{session.payload.whatsAppState.draftMessage}”
          </p>
          <p className="text-xs font-semibold text-[#493451] pt-1">
            Your WhatsApp message is ready. Would you like me to proceed?
          </p>
        </div>
      )}

      {/* Execution Steps Timeline */}
      <ol className="space-y-2.5" aria-label="Execution steps">
        {session.steps.map((step) => (
          <li
            key={step.id}
            className="flex items-center gap-2.5 text-sm"
          >
            {step.status === 'done' && (
              <CheckCircle2
                className="w-4 h-4 text-[#648F83] shrink-0"
                aria-hidden="true"
              />
            )}
            {step.status === 'active' && (
              <Loader2
                className="w-4 h-4 text-[#493451] animate-spin shrink-0"
                aria-hidden="true"
              />
            )}
            {step.status === 'pending' && (
              <Circle
                className="w-4 h-4 text-[#A995C8] shrink-0"
                aria-hidden="true"
              />
            )}
            {(step.status === 'cancelled' || step.status === 'failed') && (
              <XCircle
                className="w-4 h-4 text-[#D98570] shrink-0"
                aria-hidden="true"
              />
            )}
            <span
              className={
                step.status === 'done'
                  ? 'text-[#302B33] font-medium'
                  : step.status === 'active'
                    ? 'text-[#493451] font-semibold'
                    : step.status === 'cancelled' || step.status === 'failed'
                      ? 'text-[#D98570] font-medium'
                      : 'text-[#5C5363]'
              }
            >
              {step.label}
            </span>
          </li>
        ))}
      </ol>

      {/* Confirmation or Cancel Controls */}
      {(isWaiting || isRunning) && (
        <div className="flex flex-wrap gap-2 pt-1">
          {isWaiting && onConfirm && (
            <button
              type="button"
              onClick={onConfirm}
              className="min-h-[44px] px-4 py-2 rounded-xl bg-[#493451] hover:bg-[#3A2841] text-[#FFFCF7] text-sm font-semibold cursor-pointer"
            >
              {t.assistant.taskInspector.confirmTaskButton}
            </button>
          )}
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="min-h-[44px] px-4 py-2 rounded-xl border border-[var(--sahaaya-border)] bg-[#F7F1E8] hover:bg-[#EFEAF6] text-[#302B33] text-sm font-semibold cursor-pointer"
            >
              {t.assistant.taskInspector.cancelTaskButton}
            </button>
          )}
        </div>
      )}

      {/* Honest Notice & Optional Real External Destination */}
      <div className="rounded-xl bg-[#F7F1E8] border border-[var(--sahaaya-border)] p-3 text-xs text-[#5C5363] space-y-2">
        <p className="leading-relaxed">{session.resultSummary}</p>
        <p className="font-semibold text-[#493451] leading-relaxed">
          {session.honestNotice}
        </p>
        {session.externalUrl && (
          <a
            href={session.externalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="min-h-[40px] w-full px-3.5 py-2 rounded-xl bg-[#EFEAF6] hover:bg-[#A995C8]/35 text-[#493451] text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-colors"
          >
            <span>{session.externalLabel || 'Open Real Website'}</span>
            <ExternalLink className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          </a>
        )}
      </div>
    </section>
  );
}
