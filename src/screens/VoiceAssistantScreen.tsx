import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ClipboardCheck,
  Delete,
  Edit3,
  ExternalLink,
  FileText,
  Globe,
  HelpCircle,
  Mic,
  PhoneOff,
  RotateCcw,
  Send,
  Square,
  Type,
  Volume2,
} from 'lucide-react';
import { FormEvent, useEffect, useState } from 'react';
import { DemoDeviceScreen } from '../components/DemoDeviceScreen';
import { DemoExecutionPanel } from '../components/DemoExecutionPanel';
import { SahaayaOrbState, SahaayaVoiceOrb } from '../components/SahaayaVoiceOrb';
import { APPLICATION_FIELD_ORDER, TRANSLATIONS } from '../i18n/translations';
import { DemoExecutionSession } from '../types/demoExecution';
import {
  ApplicationData,
  ApplicationFieldKey,
  AssistantTask,
  ChatMessage,
  ConversationMode,
  LanguageCode,
  PendingConfirmation,
  PlatformCapabilities,
  SpeechCapabilities,
  SpeechErrorType,
  VoiceCapabilityStatus,
  VoiceSessionState,
} from '../types/sahaaya';
import {
  formatDisplayValue,
  getCompletionStats,
  validateField,
} from '../utils/applicationLogic';
import { formatPlatformSummary } from '../utils/platformCapabilities';

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

interface VoiceAssistantScreenProps {
  language: LanguageCode;
  conversationMode: ConversationMode;
  data: ApplicationData;
  messages: ChatMessage[];
  activeField: ApplicationFieldKey;
  recentUpdatedField?: ApplicationFieldKey | null;
  activeTask: AssistantTask | null;
  demoSession?: DemoExecutionSession | null;
  pendingConfirmation: PendingConfirmation | null;
  sessionState: VoiceSessionState;
  isConversationActive: boolean;
  isListening: boolean;
  isSpeaking: boolean;
  isProcessing: boolean;
  interimTranscript: string;
  speechError: SpeechErrorType | 'unexpected-stop';
  capabilities: SpeechCapabilities;
  platformCapabilities: PlatformCapabilities;
  hasCurrentLanguageVoice: boolean;
  speechRate?: 'normal' | 'slow';
  onToggleSpeechRate?: () => void;
  onStartConversation: () => void;
  onEndConversation: () => void;
  onSendText: (text: string) => void;
  onRepeat: () => void;
  onStopAll: () => void;
  onHelp: () => void;
  onSpeakMessage: (text: string) => void;
  onSelectFieldFocus: (field: ApplicationFieldKey) => void;
  onConfirmPendingYes: () => void;
  onConfirmPendingSpell: () => void;
  onConfirmPendingEdit: () => void;
  onConfirmPendingSaveEdit: (newValue: string) => void;
  onConfirmPendingCancelEdit: () => void;
  onSpellLetter: (char: string) => void;
  onSpellBackspace: () => void;
  onSpellClear: () => void;
  onSpellFinish: () => void;
  onConfirmTask: () => void;
  onCancelTask: () => void;
  spokenLanguageLabel?: string;
  spokenCapabilityStatus?: VoiceCapabilityStatus;
  spokenCapabilityLabel?: string;
  detectedLanguageNote?: string | null;
  onOpenLanguageSettings?: () => void;
  onOpenForm: () => void;
  onOpenReview: () => void;
  onDismissError: () => void;
}

export function VoiceAssistantScreen({
  language,
  conversationMode,
  data,
  messages,
  activeField,
  recentUpdatedField = null,
  activeTask,
  demoSession = null,
  pendingConfirmation,
  sessionState,
  isConversationActive,
  isListening,
  isSpeaking,
  isProcessing,
  interimTranscript,
  speechError,
  capabilities,
  platformCapabilities,
  hasCurrentLanguageVoice,
  speechRate = 'normal',
  onToggleSpeechRate,
  onStartConversation,
  onEndConversation,
  onSendText,
  onRepeat,
  onStopAll,
  onHelp,
  onSpeakMessage,
  onSelectFieldFocus,
  onConfirmPendingYes,
  onConfirmPendingSpell,
  onConfirmPendingEdit,
  onConfirmPendingSaveEdit,
  onConfirmPendingCancelEdit,
  onSpellLetter,
  onSpellBackspace,
  onSpellClear,
  onSpellFinish,
  onConfirmTask,
  onCancelTask,
  spokenLanguageLabel,
  spokenCapabilityStatus,
  spokenCapabilityLabel,
  detectedLanguageNote,
  onOpenLanguageSettings,
  onOpenForm,
  onOpenReview,
  onDismissError,
}: VoiceAssistantScreenProps) {
  const t = TRANSLATIONS[language];
  const [textInput, setTextInput] = useState('');
  const [manualEditValue, setManualEditValue] = useState('');
  const [manualEditError, setManualEditError] = useState<string | null>(null);
  const [isDemoGuideOpen, setIsDemoGuideOpen] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const stats = getCompletionStats(data);
  const currentFieldMeta = t.fields[activeField];

  const isExecutingDemo = Boolean(
    demoSession &&
      (demoSession.status === 'preparing_application' ||
        demoSession.status === 'opening_application' ||
        demoSession.status === 'performing_action')
  );

  const orbState: SahaayaOrbState =
    sessionState === 'error'
      ? 'error'
      : isExecutingDemo
        ? 'executing'
        : isSpeaking
          ? 'speaking'
          : isProcessing
            ? 'processing'
            : isListening
              ? 'listening'
              : 'idle';

  const latestAssistantMsg = [...messages]
    .reverse()
    .find((m) => m.sender === 'assistant');
  const latestUserMsg = [...messages].reverse().find((m) => m.sender === 'user');

  useEffect(() => {
    if (pendingConfirmation?.mode === 'edit') {
      setManualEditValue(pendingConfirmation.value);
      setManualEditError(null);
    }
  }, [pendingConfirmation]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const cleaned = textInput.trim();
    if (!cleaned) return;
    onSendText(cleaned);
    setTextInput('');
  };

  const renderSpeechAlert = () => {
    if (!capabilities.recognitionSupported) {
      return {
        title: t.assistant.speechUnsupportedTitle,
        body: t.assistant.speechUnsupportedBody,
        tone: 'terracotta',
      };
    }
    if (speechError === 'permission-denied') {
      return {
        title: t.assistant.permissionDeniedTitle,
        body: t.assistant.permissionDeniedBody,
        tone: 'terracotta',
      };
    }
    if (speechError === 'no-speech') {
      return {
        title: t.assistant.readyToListen,
        body: t.assistant.noSpeechBody,
        tone: 'lavender',
      };
    }
    if (speechError === 'network' || speechError === 'audio-capture' || speechError === 'unknown') {
      return {
        title: t.assistant.stateLabels.error,
        body: t.assistant.networkErrorBody,
        tone: 'terracotta',
      };
    }
    if (speechError === 'unexpected-stop') {
      return {
        title: t.assistant.stateLabels.idle,
        body: t.assistant.unexpectedStopNotice,
        tone: 'lavender',
      };
    }
    if (
      spokenCapabilityStatus === 'text_only_unverified' ||
      spokenCapabilityStatus === 'future_integration_required'
    ) {
      return {
        title: `${spokenLanguageLabel || 'Selected language'} — ${spokenCapabilityLabel || 'Text input available'}`,
        body: 'Standard web browsers do not verify speech recognition for this language. You can type or use mixed English/Hindi/Kannada commands below anytime.',
        tone: 'lavender',
      };
    }
    if (capabilities.synthesisSupported && !hasCurrentLanguageVoice && language !== 'en') {
      return {
        title: t.languages[language].native,
        body: t.assistant.missingVoiceNotice,
        tone: 'lavender',
      };
    }
    return null;
  };

  const alertInfo = renderSpeechAlert();

  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      {/* Top Progress Strip */}
      <div className="mb-6 rounded-2xl bg-[#FFFCF7] border border-[var(--sahaaya-border)] p-4 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1.5 flex-1">
          <div className="flex items-center justify-between gap-4">
            <h1 className="font-display text-xl sm:text-2xl font-semibold text-[#302B33]">
              {t.assistant.title}
            </h1>
            <span className="text-sm font-semibold text-[#493451] tabular-nums whitespace-nowrap">
              {stats.filledCount} / {stats.totalCount} {t.assistant.progressLabel}
            </span>
          </div>
          <div
            className="w-full h-2.5 rounded-full bg-[#EFEAF6] overflow-hidden"
            role="progressbar"
            aria-valuenow={stats.filledCount}
            aria-valuemin={0}
            aria-valuemax={stats.totalCount}
          >
            <div
              className="h-full rounded-full bg-[#493451] transition-all duration-300"
              style={{ width: `${Math.max(stats.percentage, 5)}%` }}
            />
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onOpenForm}
            className="min-h-[44px] px-4 py-2 rounded-xl border border-[var(--sahaaya-border)] bg-[#FFFCF7] hover:bg-[#EFEAF6] text-[#493451] text-sm font-semibold inline-flex items-center gap-2 cursor-pointer whitespace-nowrap"
          >
            <FileText className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>{t.assistant.openFormButton}</span>
          </button>
          <button
            type="button"
            onClick={onOpenReview}
            className="min-h-[44px] px-4 py-2 rounded-xl bg-[#493451] hover:bg-[#3A2841] text-[#FFFCF7] text-sm font-semibold inline-flex items-center gap-2 cursor-pointer whitespace-nowrap"
          >
            <ClipboardCheck className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>{t.assistant.reviewButton}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left/Primary Column: Central Microphone Studio + Conversation + Text Fallback */}
        <section className="lg:col-span-8 space-y-5">
          {/* Central Microphone Studio Card (Main Visual Focus) */}
          <div className="rounded-3xl bg-[#FFFCF7] border border-[var(--sahaaya-border)] shadow-[var(--sahaaya-shadow)] p-6 sm:p-8 flex flex-col items-center text-center">
            <p className="text-sm font-semibold text-[#493451] mb-1">
              {pendingConfirmation
                ? t.fields[pendingConfirmation.field].label
                : conversationMode === 'welfare_form'
                  ? currentFieldMeta.label
                  : t.assistant.generalModeTitle}
            </p>
            <p className="text-base sm:text-lg text-[#5C5363] max-w-xl mb-3">
              {isConversationActive
                ? t.assistant.conversationActiveHint
                : conversationMode === 'welfare_form'
                  ? t.assistant.subtitle
                  : t.assistant.generalSubtitle}
            </p>

            {/* Compact Spoken Language & Auto-Detect Switcher Pill */}
            {(spokenLanguageLabel || detectedLanguageNote) && (
              <div className="mb-4 flex flex-wrap items-center justify-center gap-2">
                {onOpenLanguageSettings && (
                  <button
                    type="button"
                    onClick={onOpenLanguageSettings}
                    className="min-h-[38px] px-3.5 py-1.5 rounded-xl bg-[#EFEAF6] hover:bg-[#A995C8]/35 text-[#493451] text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <Globe className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                    <span>Voice: {spokenLanguageLabel}</span>
                  </button>
                )}
                {detectedLanguageNote && (
                  <span className="px-3 py-1.5 rounded-xl bg-[#F7F1E8] border border-[var(--sahaaya-border)] text-xs font-medium text-[#5C5363]">
                    {detectedLanguageNote}
                  </span>
                )}
              </div>
            )}

            {/* Central Animated Sahaaya Voice Orb */}
            <SahaayaVoiceOrb
              orbState={orbState}
              stateLabel={t.assistant.stateLabels[orbState]}
              actionLabel={
                isConversationActive
                  ? t.assistant.endConversation
                  : t.assistant.startConversation
              }
              subCaption={
                isExecutingDemo && demoSession
                  ? `${demoSession.appName} · ${demoSession.requestedAction}`
                  : undefined
              }
              disabled={!capabilities.recognitionSupported}
              onToggleConversation={
                isConversationActive ? onEndConversation : onStartConversation
              }
              ariaLabel={
                isConversationActive
                  ? t.assistant.endConversation
                  : t.assistant.startConversation
              }
            />

            {/* Explicit Start / End Conversation Primary Action Bar */}
            <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
              {!isConversationActive ? (
                <button
                  type="button"
                  onClick={onStartConversation}
                  disabled={!capabilities.recognitionSupported}
                  className="min-h-[48px] px-6 py-2.5 rounded-2xl bg-[#493451] hover:bg-[#3A2841] disabled:opacity-50 text-[#FFFCF7] font-semibold text-base inline-flex items-center gap-2.5 cursor-pointer whitespace-nowrap shadow-sm"
                >
                  <Mic className="w-5 h-5" aria-hidden="true" />
                  <span>{t.assistant.startConversation}</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onEndConversation}
                  className="min-h-[48px] px-6 py-2.5 rounded-2xl bg-[#D98570] hover:bg-[#c5735e] text-[#FFFCF7] font-semibold text-base inline-flex items-center gap-2.5 cursor-pointer whitespace-nowrap shadow-sm"
                >
                  <PhoneOff className="w-5 h-5" aria-hidden="true" />
                  <span>{t.assistant.endConversation}</span>
                </button>
              )}
            </div>

            {/* Live Speech Transcript Strip (Shown actively when listening or interim exists) */}
            {(interimTranscript || isListening) && (
              <div
                aria-live="polite"
                className="w-full mt-5 rounded-2xl bg-[#F7F1E8] border border-[var(--sahaaya-border)] px-4 py-3 text-left"
              >
                <p className="text-xs font-semibold text-[#5C5363] mb-0.5">
                  {t.assistant.transcriptLabel}
                </p>
                <p className="text-base text-[#302B33] min-h-[1.5rem]">
                  {interimTranscript || t.assistant.liveTranscriptPlaceholder}
                </p>
              </div>
            )}

            {/* Repeat, Stop, Help Controls */}
            <div className="w-full mt-5 flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={onRepeat}
                className="min-h-[46px] px-4 py-2.5 rounded-xl border border-[var(--sahaaya-border)] bg-[#FFFCF7] hover:bg-[#EFEAF6] text-[#302B33] font-semibold text-sm inline-flex items-center gap-2 cursor-pointer whitespace-nowrap"
              >
                <RotateCcw className="w-4 h-4 text-[#493451]" aria-hidden="true" />
                <span>{t.assistant.repeatButton}</span>
              </button>

              <button
                type="button"
                onClick={onStopAll}
                className="min-h-[46px] px-4 py-2.5 rounded-xl border border-[var(--sahaaya-border)] bg-[#FFFCF7] hover:bg-[#FBEEE9] text-[#302B33] font-semibold text-sm inline-flex items-center gap-2 cursor-pointer whitespace-nowrap"
              >
                <Square className="w-4 h-4 text-[#D98570]" aria-hidden="true" />
                <span>{t.assistant.stopButton}</span>
              </button>

              <button
                type="button"
                onClick={onHelp}
                className="min-h-[46px] px-4 py-2.5 rounded-xl border border-[var(--sahaaya-border)] bg-[#FFFCF7] hover:bg-[#EFEAF6] text-[#302B33] font-semibold text-sm inline-flex items-center gap-2 cursor-pointer whitespace-nowrap"
              >
                <HelpCircle className="w-4 h-4 text-[#493451]" aria-hidden="true" />
                <span>{t.assistant.helpButton}</span>
              </button>

              {onToggleSpeechRate && (
                <button
                  type="button"
                  onClick={onToggleSpeechRate}
                  aria-pressed={speechRate === 'slow'}
                  className={`min-h-[46px] px-4 py-2.5 rounded-xl border font-semibold text-sm inline-flex items-center gap-2 cursor-pointer whitespace-nowrap transition-colors ${
                    speechRate === 'slow'
                      ? 'bg-[#EFEAF6] border-[#493451]/40 text-[#493451]'
                      : 'border-[var(--sahaaya-border)] bg-[#FFFCF7] hover:bg-[#EFEAF6] text-[#302B33]'
                  }`}
                >
                  <Volume2 className="w-4 h-4 text-[#493451]" aria-hidden="true" />
                  <span>
                    {t.assistant.slowSpeechLabel}
                    {speechRate === 'slow' ? ' · ON' : ''}
                  </span>
                </button>
              )}
            </div>
          </div>

          {/* Smart Confirmation / Letter-by-Letter Spelling / Manual Edit Card */}
          {pendingConfirmation && (
            <div
              role="region"
              aria-label={
                pendingConfirmation.field === 'fullName'
                  ? t.assistant.confirmCard.titleName
                  : t.assistant.confirmCard.titleDetail(
                      t.fields[pendingConfirmation.field].label
                    )
              }
              className="rounded-3xl bg-[#FFFCF7] border-2 border-[#493451]/35 shadow-[var(--sahaaya-shadow)] p-5 sm:p-6 space-y-4"
            >
              {pendingConfirmation.mode === 'confirm' && (
                <>
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-[#493451]">
                      {pendingConfirmation.field === 'fullName'
                        ? t.assistant.confirmCard.titleName
                        : t.assistant.confirmCard.titleDetail(
                            t.fields[pendingConfirmation.field].label
                          )}
                    </p>
                    <p className="text-sm text-[#5C5363]">
                      {t.assistant.confirmCard.heardLabel}
                    </p>
                    <p className="font-display text-2xl font-semibold text-[#302B33] break-words">
                      {formatDisplayValue(
                        pendingConfirmation.field,
                        pendingConfirmation.value,
                        language
                      )}
                    </p>
                  </div>

                  <p className="text-base font-medium text-[#302B33]">
                    {t.assistant.confirmCard.question}
                  </p>

                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={onConfirmPendingYes}
                      className="min-h-[48px] px-5 py-2.5 rounded-xl bg-[#493451] hover:bg-[#3A2841] text-[#FFFCF7] font-semibold text-base inline-flex items-center gap-2 cursor-pointer"
                    >
                      <CheckCircle2 className="w-5 h-5" aria-hidden="true" />
                      <span>{t.assistant.confirmCard.yesCorrect}</span>
                    </button>

                    {pendingConfirmation.field === 'fullName' && (
                      <button
                        type="button"
                        onClick={onConfirmPendingSpell}
                        className="min-h-[48px] px-5 py-2.5 rounded-xl bg-[#EFEAF6] hover:bg-[#A995C8]/35 text-[#493451] font-semibold text-base inline-flex items-center gap-2 cursor-pointer"
                      >
                        <Type className="w-5 h-5" aria-hidden="true" />
                        <span>{t.assistant.confirmCard.spellName}</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={onConfirmPendingEdit}
                      className="min-h-[48px] px-5 py-2.5 rounded-xl border border-[var(--sahaaya-border)] bg-[#F7F1E8] hover:bg-[#EFEAF6] text-[#302B33] font-semibold text-base inline-flex items-center gap-2 cursor-pointer"
                    >
                      <Edit3 className="w-4 h-4 text-[#493451]" aria-hidden="true" />
                      <span>{t.assistant.confirmCard.editField}</span>
                    </button>
                  </div>
                </>
              )}

              {pendingConfirmation.mode === 'spell' && (
                <div className="space-y-4">
                  <div className="space-y-1">
                    <h3 className="font-display text-xl font-semibold text-[#302B33]">
                      {t.assistant.confirmCard.spellingTitle}
                    </h3>
                    <p className="text-sm text-[#5C5363]">
                      {t.assistant.confirmCard.spellingHint}
                    </p>
                  </div>

                  {/* Constructed Name Preview */}
                  <div className="rounded-2xl bg-[#F7F1E8] border border-[var(--sahaaya-border)] p-4">
                    <p className="font-display text-2xl font-semibold text-[#493451] min-h-[2rem] tracking-wide">
                      {pendingConfirmation.value || '—'}
                    </p>
                  </div>

                  {/* Accessible Letter-by-Letter Pad */}
                  <div className="flex flex-wrap gap-1.5">
                    {ALPHABET.map((letter) => (
                      <button
                        key={letter}
                        type="button"
                        onClick={() => onSpellLetter(letter)}
                        className="min-w-[40px] min-h-[42px] px-2 rounded-lg bg-[#F7F1E8] hover:bg-[#EFEAF6] border border-[var(--sahaaya-border)] text-[#302B33] font-semibold text-base cursor-pointer"
                      >
                        {letter}
                      </button>
                    ))}
                  </div>

                  {/* Space, Backspace, Clear, Confirm Spelled Name */}
                  <div className="flex flex-wrap items-center gap-2.5 pt-1">
                    <button
                      type="button"
                      onClick={() => onSpellLetter(' ')}
                      className="min-h-[44px] px-4 py-2 rounded-xl border border-[var(--sahaaya-border)] bg-[#FFFCF7] hover:bg-[#EFEAF6] text-[#302B33] font-semibold text-sm cursor-pointer"
                    >
                      {t.assistant.confirmCard.spaceKey}
                    </button>
                    <button
                      type="button"
                      onClick={onSpellBackspace}
                      className="min-h-[44px] px-4 py-2 rounded-xl border border-[var(--sahaaya-border)] bg-[#FFFCF7] hover:bg-[#EFEAF6] text-[#302B33] font-semibold text-sm inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <Delete className="w-4 h-4" aria-hidden="true" />
                      <span>{t.assistant.confirmCard.backspaceKey}</span>
                    </button>
                    <button
                      type="button"
                      onClick={onSpellClear}
                      className="min-h-[44px] px-4 py-2 rounded-xl border border-[var(--sahaaya-border)] bg-[#FFFCF7] hover:bg-[#FBEEE9] text-[#5C5363] font-semibold text-sm cursor-pointer"
                    >
                      {t.assistant.confirmCard.clearKey}
                    </button>
                    <button
                      type="button"
                      onClick={onSpellFinish}
                      disabled={pendingConfirmation.value.trim().length < 2}
                      className="min-h-[46px] px-5 py-2 rounded-xl bg-[#493451] hover:bg-[#3A2841] disabled:opacity-50 text-[#FFFCF7] font-semibold text-base inline-flex items-center gap-2 cursor-pointer ml-auto"
                    >
                      <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
                      <span>{t.assistant.confirmCard.doneSpelling}</span>
                    </button>
                  </div>
                </div>
              )}

              {pendingConfirmation.mode === 'edit' && (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const err = validateField(
                      pendingConfirmation.field,
                      manualEditValue,
                      language
                    );
                    if (err) {
                      setManualEditError(err);
                      return;
                    }
                    onConfirmPendingSaveEdit(manualEditValue.trim());
                  }}
                  className="space-y-3"
                >
                  <label
                    htmlFor="sahaaya-manual-confirm-edit"
                    className="block font-display text-lg font-semibold text-[#302B33]"
                  >
                    {t.fields[pendingConfirmation.field].label}
                  </label>
                  <input
                    id="sahaaya-manual-confirm-edit"
                    type={
                      pendingConfirmation.field === 'dateOfBirth'
                        ? 'date'
                        : pendingConfirmation.field === 'annualIncome'
                          ? 'number'
                          : pendingConfirmation.field === 'mobileNumber'
                            ? 'tel'
                            : 'text'
                    }
                    value={manualEditValue}
                    onChange={(e) => {
                      setManualEditValue(e.target.value);
                      setManualEditError(null);
                    }}
                    className="w-full min-h-[52px] px-4 py-3 rounded-xl bg-[#F7F1E8] border border-[var(--sahaaya-border)] text-lg text-[#302B33] focus:bg-[#FFFCF7]"
                  />
                  {manualEditError && (
                    <p className="text-sm font-medium text-[#D98570]" role="alert">
                      {manualEditError}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-3 pt-1">
                    <button
                      type="submit"
                      className="min-h-[48px] px-5 py-2.5 rounded-xl bg-[#493451] hover:bg-[#3A2841] text-[#FFFCF7] font-semibold text-base inline-flex items-center gap-2 cursor-pointer"
                    >
                      <CheckCircle2 className="w-5 h-5" aria-hidden="true" />
                      <span>{t.assistant.confirmCard.editSave}</span>
                    </button>
                    <button
                      type="button"
                      onClick={onConfirmPendingCancelEdit}
                      className="min-h-[48px] px-4 py-2.5 rounded-xl border border-[var(--sahaaya-border)] bg-[#F7F1E8] hover:bg-[#EFEAF6] text-[#302B33] font-semibold text-base cursor-pointer"
                    >
                      {t.assistant.confirmCard.editCancel}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* Speech Capability / Error Banner (when applicable) */}
          {alertInfo && (
            <div
              role="status"
              className={`rounded-2xl p-4 border flex items-start justify-between gap-3 ${
                alertInfo.tone === 'terracotta'
                  ? 'bg-[#FBEEE9] border-[#D98570]/40 text-[#302B33]'
                  : 'bg-[#EFEAF6] border-[#A995C8]/50 text-[#302B33]'
              }`}
            >
              <div className="flex items-start gap-3">
                <AlertCircle
                  className={`w-5 h-5 shrink-0 mt-0.5 ${
                    alertInfo.tone === 'terracotta' ? 'text-[#D98570]' : 'text-[#493451]'
                  }`}
                  aria-hidden="true"
                />
                <div className="text-sm">
                  <p className="font-semibold">{alertInfo.title}</p>
                  <p className="text-[#5C5363] mt-0.5">{alertInfo.body}</p>
                </div>
              </div>
              {speechError && (
                <button
                  type="button"
                  onClick={onDismissError}
                  className="text-xs font-semibold text-[#493451] underline shrink-0 py-1 px-2 cursor-pointer"
                >
                  OK
                </button>
              )}
            </div>
          )}

          {/* Gemini Live-Style Current Turn Focus + Optional History + Text Input Fallback */}
          <div className="rounded-3xl bg-[#FFFCF7] border border-[var(--sahaaya-border)] shadow-[var(--sahaaya-shadow)] p-5 sm:p-6 space-y-5">
            {/* Concise Current Turn Focus */}
            <div className="space-y-3">
              {/* What You Said */}
              {(interimTranscript || latestUserMsg) && (
                <div className="rounded-2xl bg-[#F7F1E8] border border-[var(--sahaaya-border)] px-4 py-3">
                  <p className="text-xs font-semibold text-[#5C5363] mb-1">
                    {t.assistant.youSaidLabel}
                  </p>
                  <p className="text-base font-medium text-[#302B33]">
                    “{interimTranscript || latestUserMsg?.text}”
                  </p>
                </div>
              )}

              {/* What Sahaaya Understood (when a command/task is active) */}
              {activeTask && activeTask.intent !== 'general_conversation' && (
                <div className="rounded-2xl bg-[#EFEAF6]/75 border border-[#A995C8]/45 px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 text-sm">
                  <div>
                    <span className="text-xs font-semibold text-[#5C5363] mr-2">
                      {t.assistant.understoodLabel}:
                    </span>
                    <span className="font-semibold text-[#493451]">
                      {t.assistant.taskInspector.categoryLabels[activeTask.intent]}
                      {activeTask.application ? ` · ${activeTask.application}` : ''}
                      {activeTask.target && activeTask.target !== activeTask.application
                        ? ` (${activeTask.target})`
                        : ''}
                    </span>
                  </div>
                  <span className="text-xs font-bold text-[#493451]">
                    {t.assistant.taskInspector.statusLabels[activeTask.executionStatus]}
                  </span>
                </div>
              )}

              {/* Sahaaya's Current Spoken Response */}
              {latestAssistantMsg && (
                <div
                  aria-live="polite"
                  className="rounded-2xl bg-[#FFFCF7] border-2 border-[#493451]/18 px-4 py-4"
                >
                  <div className="flex items-center justify-between gap-3 mb-1.5">
                    <span className="text-xs font-bold text-[#493451]">
                      {t.assistant.sahaayaReplyLabel}
                    </span>
                    <button
                      type="button"
                      onClick={() => onSpeakMessage(latestAssistantMsg.text)}
                      aria-label="Listen to Sahaaya's response"
                      className="min-h-[36px] px-2.5 py-1 rounded-lg bg-[#EFEAF6] hover:bg-[#A995C8]/30 text-[#493451] text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Volume2 className="w-4 h-4" aria-hidden="true" />
                      <span>{t.assistant.repeatButton}</span>
                    </button>
                  </div>
                  <p className="text-base sm:text-lg text-[#302B33] leading-relaxed">
                    {latestAssistantMsg.text}
                  </p>
                </div>
              )}

              {/* Collapsible Turn History */}
              {messages.length > 2 && (
                <div>
                  <button
                    type="button"
                    onClick={() => setShowHistory((prev) => !prev)}
                    aria-expanded={showHistory}
                    className="min-h-[36px] text-xs font-semibold text-[#493451] hover:underline inline-flex items-center gap-1 cursor-pointer"
                  >
                    <span>
                      {showHistory
                        ? t.assistant.hideHistoryLabel
                        : `${t.assistant.showHistoryLabel} (${messages.length})`}
                    </span>
                    {showHistory ? (
                      <ChevronUp className="w-3.5 h-3.5" aria-hidden="true" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5" aria-hidden="true" />
                    )}
                  </button>

                  {showHistory && (
                    <div className="mt-2.5 space-y-2 max-h-[220px] overflow-y-auto pr-1 border-t border-[var(--sahaaya-border)] pt-2.5">
                      {messages.map((msg) => {
                        const isAssistant = msg.sender === 'assistant';
                        return (
                          <div
                            key={msg.id}
                            className={`rounded-xl px-3.5 py-2 text-sm ${
                              isAssistant
                                ? 'bg-[#F7F1E8] text-[#302B33]'
                                : 'bg-[#EFEAF6] text-[#493451]'
                            }`}
                          >
                            <span className="text-[11px] font-bold mr-2">
                              {isAssistant ? 'Sahaaya' : 'You'} ({msg.timestamp}):
                            </span>
                            <span>{msg.text}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Quick Example Prompt Suggestions */}
            <div className="pt-2 border-t border-[var(--sahaaya-border)]">
              <p className="text-xs font-semibold text-[#5C5363] mb-2">
                {t.assistant.quickExamplesLabel}
              </p>
              <div className="flex flex-wrap gap-2">
                {conversationMode === 'welfare_form' ? (
                  <button
                    type="button"
                    onClick={() => onSendText(currentFieldMeta.example)}
                    className="min-h-[40px] px-3.5 py-1.5 rounded-xl bg-[#EFEAF6] hover:bg-[#A995C8]/30 text-[#493451] text-sm font-medium transition-colors cursor-pointer text-left"
                  >
                    Sample (Demo): “{currentFieldMeta.example}”
                  </button>
                ) : (
                  t.assistant.generalExamples.map((example) => (
                    <button
                      key={example}
                      type="button"
                      onClick={() => onSendText(example)}
                      className="min-h-[40px] px-3.5 py-1.5 rounded-xl bg-[#EFEAF6] hover:bg-[#A995C8]/30 text-[#493451] text-sm font-medium transition-colors cursor-pointer text-left"
                    >
                      “{example}”
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* Accessible Text Input Fallback */}
            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 pt-1">
              <label htmlFor="sahaaya-text-fallback" className="sr-only">
                {t.assistant.typePlaceholder}
              </label>
              <input
                id="sahaaya-text-fallback"
                type="text"
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder={t.assistant.typePlaceholder}
                className="flex-1 min-h-[52px] px-4 py-3 rounded-2xl bg-[#F7F1E8] border border-[var(--sahaaya-border)] text-base text-[#302B33] placeholder:text-[#5C5363]/75 focus:bg-[#FFFCF7]"
              />
              <button
                type="submit"
                disabled={!textInput.trim()}
                className="min-h-[52px] px-6 py-3 rounded-2xl bg-[#493451] hover:bg-[#3A2841] disabled:opacity-50 text-[#FFFCF7] font-semibold text-base inline-flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap shrink-0"
              >
                <Send className="w-4 h-4" aria-hidden="true" />
                <span>{t.assistant.sendButton}</span>
              </button>
            </form>
          </div>
        </section>

        {/* Right Column: Interactive Demo Device, Execution Steps & Live Application Progress */}
        <aside className="lg:col-span-4 space-y-5">
          {demoSession ? (
            <>
              <DemoExecutionPanel
                key={`exec-${demoSession.taskId}`}
                language={language}
                session={demoSession}
                onConfirm={onConfirmTask}
                onCancel={onCancelTask}
              />
              {demoSession.appId !== 'sahaaya_home' && (
                <DemoDeviceScreen
                  key={`device-${demoSession.taskId}`}
                  language={language}
                  session={demoSession}
                  applicationData={data}
                />
              )}
            </>
          ) : (
            /* Compact Natural-Language Task Inspector (Idle / General Conversation) */
            <section
              aria-label={t.assistant.taskInspector.sectionTitle}
              className="rounded-3xl bg-[#FFFCF7] border border-[var(--sahaaya-border)] shadow-[var(--sahaaya-shadow)] p-5 sm:p-6 space-y-3"
            >
              <h2 className="font-display text-lg font-semibold text-[#302B33]">
                {t.assistant.taskInspector.sectionTitle}
              </h2>

              {!activeTask ? (
                <p className="text-sm text-[#5C5363] leading-relaxed">
                  {t.assistant.taskInspector.emptyHint}
                </p>
              ) : (
                <div className="space-y-2.5 text-sm">
                  <div className="border-t border-[var(--sahaaya-border)] pt-2.5">
                    <p className="text-xs font-semibold text-[#5C5363]">
                      {t.assistant.taskInspector.instructionLabel}
                    </p>
                    <p className="text-[#302B33] font-medium mt-0.5 break-words">
                      “{activeTask.rawInstruction}”
                    </p>
                  </div>

                  <div className="border-t border-[var(--sahaaya-border)] pt-2.5">
                    <p className="text-xs font-semibold text-[#5C5363]">
                      {t.assistant.taskInspector.detectedTaskLabel}
                    </p>
                    <p className="text-[#493451] font-semibold mt-0.5">
                      {t.assistant.taskInspector.categoryLabels[activeTask.intent]}
                      {activeTask.application ? ` · ${activeTask.application}` : ''}
                      {activeTask.target && activeTask.target !== activeTask.application
                        ? ` (${activeTask.target})`
                        : ''}
                    </p>
                    {activeTask.messageContent && (
                      <p className="text-xs text-[#5C5363] mt-1">
                        “{activeTask.messageContent}”
                      </p>
                    )}
                  </div>

                  <div className="border-t border-[var(--sahaaya-border)] pt-2.5">
                    <p className="text-xs font-semibold text-[#5C5363]">
                      {t.assistant.taskInspector.requiredInfoLabel}
                    </p>
                    <p className="text-[#302B33] mt-0.5">
                      {activeTask.missingParameters.length > 0
                        ? activeTask.missingParameters.join(', ')
                        : t.assistant.taskInspector.noneNeeded}
                    </p>
                  </div>

                  <div className="border-t border-[var(--sahaaya-border)] pt-2.5">
                    <p className="text-xs font-semibold text-[#5C5363]">
                      {t.assistant.taskInspector.statusLabel}
                    </p>
                    <p
                      className={`font-semibold mt-0.5 ${
                        activeTask.executionStatus === 'executed_in_web' ||
                        activeTask.executionStatus === 'opened_externally' ||
                        activeTask.executionStatus === 'simulated_completed'
                          ? 'text-[#648F83]'
                          : activeTask.executionStatus === 'unavailable_on_web' ||
                              activeTask.executionStatus === 'cancelled' ||
                              activeTask.executionStatus === 'failed' ||
                              activeTask.executionStatus === 'requires_permission'
                            ? 'text-[#D98570]'
                            : 'text-[#493451]'
                      }`}
                    >
                      {t.assistant.taskInspector.statusLabels[activeTask.executionStatus]}
                    </p>
                    {activeTask.capabilityNote && (
                      <p className="text-xs text-[#5C5363] mt-1 leading-relaxed">
                        {activeTask.capabilityNote}
                      </p>
                    )}
                  </div>

                  {activeTask.executionStatus === 'awaiting_confirmation' && (
                    <div className="pt-2 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={onConfirmTask}
                        className="min-h-[44px] px-4 py-2 rounded-xl bg-[#493451] hover:bg-[#3A2841] text-[#FFFCF7] text-sm font-semibold cursor-pointer whitespace-nowrap"
                      >
                        {t.assistant.taskInspector.confirmTaskButton}
                      </button>
                      <button
                        type="button"
                        onClick={onCancelTask}
                        className="min-h-[44px] px-4 py-2 rounded-xl border border-[var(--sahaaya-border)] bg-[#F7F1E8] hover:bg-[#EFEAF6] text-[#302B33] text-sm font-semibold cursor-pointer whitespace-nowrap"
                      >
                        {t.assistant.taskInspector.cancelTaskButton}
                      </button>
                    </div>
                  )}

                  {activeTask.externalUrl &&
                    (activeTask.executionStatus === 'opened_externally' ||
                      activeTask.executionStatus === 'failed' ||
                      activeTask.executionStatus === 'requires_permission' ||
                      activeTask.executionStatus === 'unavailable_on_web') && (
                      <div className="pt-2">
                        <a
                          href={activeTask.externalUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="min-h-[44px] w-full px-4 py-2.5 rounded-xl bg-[#EFEAF6] hover:bg-[#A995C8]/35 text-[#493451] text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors"
                        >
                          <span>
                            {activeTask.externalLabel ||
                              t.assistant.taskInspector.openExternalButton}
                          </span>
                          <ExternalLink className="w-4 h-4 shrink-0" aria-hidden="true" />
                        </a>
                      </div>
                    )}
                </div>
              )}
            </section>
          )}

          <div className="rounded-3xl bg-[#FFFCF7] border border-[var(--sahaaya-border)] shadow-[var(--sahaaya-shadow)] p-5 sm:p-6">
            <h2 className="font-display text-xl font-semibold text-[#302B33]">
              {t.assistant.capturedSummaryTitle}
            </h2>
            <p className="text-sm text-[#5C5363] mt-1 mb-4">
              {t.assistant.emptySummaryHint}
            </p>

            <ul className="divide-y divide-[var(--sahaaya-border)]">
              {APPLICATION_FIELD_ORDER.map((fieldKey, idx) => {
                const value = data[fieldKey];
                const isFilled = value.trim().length > 0;
                const isCurrent =
                  conversationMode === 'welfare_form' && activeField === fieldKey;
                const isJustUpdated = recentUpdatedField === fieldKey;

                return (
                  <li key={fieldKey}>
                    <button
                      type="button"
                      onClick={() => onSelectFieldFocus(fieldKey)}
                      className={`w-full py-3 px-2.5 text-left flex items-start justify-between gap-3 rounded-xl transition-all duration-300 cursor-pointer ${
                        isJustUpdated
                          ? 'bg-[#EAF2EF] ring-2 ring-[#648F83]/50'
                          : isCurrent
                            ? 'bg-[#EFEAF6]'
                            : 'hover:bg-[#F7F1E8]'
                      }`}
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-[#5C5363]">
                          {idx + 1}. {t.fields[fieldKey].label}
                        </p>
                        <p
                          className={`text-sm mt-0.5 truncate ${
                            isFilled ? 'font-semibold text-[#302B33]' : 'text-[#5C5363]/75'
                          }`}
                        >
                          {isFilled
                            ? formatDisplayValue(fieldKey, value, language)
                            : t.form.pendingLabel}
                        </p>
                      </div>
                      {isFilled ? (
                        <CheckCircle2
                          className="w-5 h-5 text-[#648F83] shrink-0 mt-1"
                          aria-label={t.form.completedLabel}
                        />
                      ) : (
                        <span
                          className={`text-xs font-semibold px-2 py-0.5 rounded-md shrink-0 mt-1 ${
                            isCurrent
                              ? 'bg-[#493451] text-[#FFFCF7]'
                              : 'text-[#5C5363]'
                          }`}
                        >
                          {isCurrent ? 'Active' : '—'}
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Unobtrusive Cross-Platform Demo Guide & Real Example Commands */}
          <section
            aria-label={t.assistant.demoGuide.title}
            className="rounded-3xl bg-[#FFFCF7] border border-[var(--sahaaya-border)] shadow-[var(--sahaaya-shadow)] p-5 sm:p-6"
          >
            <button
              type="button"
              onClick={() => setIsDemoGuideOpen((prev) => !prev)}
              aria-expanded={isDemoGuideOpen}
              className="w-full min-h-[44px] flex items-center justify-between gap-3 text-left cursor-pointer"
            >
              <span className="font-display text-lg font-semibold text-[#302B33]">
                {t.assistant.demoGuide.title}
              </span>
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#493451] whitespace-nowrap shrink-0">
                <span>
                  {isDemoGuideOpen
                    ? t.assistant.demoGuide.toggleHide
                    : t.assistant.demoGuide.toggleShow}
                </span>
                {isDemoGuideOpen ? (
                  <ChevronUp className="w-4 h-4" aria-hidden="true" />
                ) : (
                  <ChevronDown className="w-4 h-4" aria-hidden="true" />
                )}
              </span>
            </button>

            <div className="mt-2 pt-2 border-t border-[var(--sahaaya-border)] text-xs text-[#5C5363] space-y-1">
              <p>
                <span className="font-semibold text-[#302B33]">
                  {t.assistant.demoGuide.platformLabel}:
                </span>{' '}
                {formatPlatformSummary(platformCapabilities, language)}
              </p>
              <p>
                <span className="font-semibold text-[#302B33]">
                  {t.assistant.demoGuide.micLabel}:
                </span>{' '}
                {platformCapabilities.microphonePermission === 'granted'
                  ? t.assistant.demoGuide.micGranted
                  : platformCapabilities.microphonePermission === 'denied'
                    ? t.assistant.demoGuide.micDenied
                    : platformCapabilities.microphonePermission === 'unsupported'
                      ? t.assistant.demoGuide.micUnsupported
                      : t.assistant.demoGuide.micPrompt}
              </p>
            </div>

            {isDemoGuideOpen && (
              <div className="mt-4 pt-3 border-t border-[var(--sahaaya-border)] space-y-4">
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-[#493451]">
                    {t.assistant.demoGuide.tryCommandsLabel}
                  </p>
                  <div className="flex flex-col gap-2">
                    {t.assistant.demoGuide.examples.map((cmd) => (
                      <button
                        key={cmd}
                        type="button"
                        onClick={() => onSendText(cmd)}
                        className="min-h-[44px] w-full px-3.5 py-2 rounded-xl bg-[#F7F1E8] hover:bg-[#EFEAF6] border border-[var(--sahaaya-border)] text-left text-sm font-medium text-[#302B33] transition-colors cursor-pointer"
                      >
                        “{cmd}”
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2 text-xs text-[#5C5363] leading-relaxed border-t border-[var(--sahaaya-border)] pt-3">
                  <div>
                    <p className="font-semibold text-[#648F83]">
                      {t.assistant.demoGuide.browserWorksTitle}
                    </p>
                    <p className="mt-0.5">{t.assistant.demoGuide.browserWorksBody}</p>
                  </div>
                  <div>
                    <p className="font-semibold text-[#493451]">
                      {t.assistant.demoGuide.androidFutureTitle}
                    </p>
                    <p className="mt-0.5">{t.assistant.demoGuide.androidFutureBody}</p>
                  </div>
                  <p className="text-[#5C5363] pt-1">{t.assistant.demoGuide.httpsNote}</p>
                </div>
              </div>
            )}
          </section>
        </aside>
      </div>
    </main>
  );
}
