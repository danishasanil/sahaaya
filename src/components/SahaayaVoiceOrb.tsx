import { AlertCircle, MicOff, Sparkles } from 'lucide-react';

export type SahaayaOrbState =
  | 'idle'
  | 'listening'
  | 'processing'
  | 'executing'
  | 'speaking'
  | 'error';

interface SahaayaVoiceOrbProps {
  orbState: SahaayaOrbState;
  stateLabel: string;
  actionLabel: string;
  subCaption?: string;
  disabled?: boolean;
  onToggleConversation: () => void;
  ariaLabel: string;
}

export function SahaayaVoiceOrb({
  orbState,
  stateLabel,
  actionLabel,
  subCaption,
  disabled = false,
  onToggleConversation,
  ariaLabel,
}: SahaayaVoiceOrbProps) {
  const isListening = orbState === 'listening';
  const isProcessing = orbState === 'processing';
  const isExecuting = orbState === 'executing';
  const isSpeaking = orbState === 'speaking';
  const isError = orbState === 'error';

  const coreColorClass = disabled
    ? 'bg-[#EFEAF6] text-[#5C5363] border-2 border-[#A995C8]/40 cursor-not-allowed shadow-none'
    : isError
      ? 'bg-[#FBEEE9] text-[#493451] border-[3px] border-[#D98570]'
      : isListening
        ? 'bg-[#D98570] text-[#FFFCF7] border-[3px] border-[#FFFCF7]/75'
        : isExecuting
          ? 'bg-[#648F83] text-[#FFFCF7] border-[3px] border-[#FFFCF7]/75'
          : isSpeaking
            ? 'bg-[#493451] text-[#FFFCF7] border-[3px] border-[#A995C8]'
            : isProcessing
              ? 'bg-[#493451] text-[#FFFCF7] border-[3px] border-[#A995C8]/80'
              : 'bg-[#493451] hover:bg-[#3A2841] text-[#FFFCF7] border-[3px] border-[#A995C8]/45';

  return (
    <div className="flex flex-col items-center text-center select-none">
      {/* Interactive Central Orb Container */}
      <div className="relative flex items-center justify-center w-48 h-48 sm:w-52 sm:h-52 my-1">
        {/* Idle ambient soft halo */}
        {orbState === 'idle' && !disabled && (
          <span
            aria-hidden="true"
            className="absolute inset-4 rounded-full bg-[#A995C8]/20 animate-sahaaya-float pointer-events-none"
          />
        )}

        {/* Listening concentric audio-responsive ripples */}
        {isListening && (
          <>
            <span
              aria-hidden="true"
              className="absolute inset-3 rounded-full bg-[#D98570]/28 animate-sahaaya-ripple pointer-events-none"
            />
            <span
              aria-hidden="true"
              className="absolute inset-3 rounded-full bg-[#A995C8]/32 animate-sahaaya-ripple-delayed pointer-events-none"
            />
            <span
              aria-hidden="true"
              className="absolute inset-1 rounded-full border border-[#D98570]/35 pointer-events-none"
            />
          </>
        )}

        {/* Processing rotating orbital ring */}
        {isProcessing && (
          <span
            aria-hidden="true"
            className="absolute inset-3 rounded-full border-[3px] border-dashed border-[#A995C8] animate-sahaaya-orbit pointer-events-none"
          />
        )}

        {/* Executing smartphone-action orbital ring */}
        {isExecuting && (
          <>
            <span
              aria-hidden="true"
              className="absolute inset-2.5 rounded-full border-[3px] border-t-[#648F83] border-r-[#A995C8] border-b-[#648F83]/30 border-l-transparent animate-sahaaya-orbit pointer-events-none"
            />
            <span
              aria-hidden="true"
              className="absolute inset-5 rounded-full bg-[#648F83]/15 animate-sahaaya-speak-wave pointer-events-none"
            />
          </>
        )}

        {/* Speaking expanding and contracting voice waves */}
        {isSpeaking && (
          <>
            <span
              aria-hidden="true"
              className="absolute inset-2 rounded-full bg-[#A995C8]/30 animate-sahaaya-speak-wave pointer-events-none"
            />
            <span
              aria-hidden="true"
              className="absolute inset-5 rounded-full border-2 border-[#648F83]/45 animate-sahaaya-speak-wave pointer-events-none"
            />
          </>
        )}

        {/* Central Clickable Orb Button */}
        <button
          type="button"
          onClick={onToggleConversation}
          disabled={disabled}
          aria-label={ariaLabel}
          className={`relative z-10 w-36 h-36 sm:w-40 sm:h-40 rounded-full flex flex-col items-center justify-center gap-2 px-3 shadow-xl transition-transform active:scale-95 cursor-pointer ${coreColorClass} ${
            orbState === 'idle' && !disabled ? 'animate-sahaaya-float' : ''
          }`}
        >
          {disabled ? (
            <MicOff className="w-10 h-10" aria-hidden="true" />
          ) : isError ? (
            <AlertCircle className="w-10 h-10 text-[#D98570]" aria-hidden="true" />
          ) : (
            /* Custom Sahaaya Voice-Lotus Emblem SVG */
            <svg
              viewBox="0 0 64 64"
              className="w-12 h-12 shrink-0"
              fill="none"
              aria-hidden="true"
            >
              {/* Warm outer sound arc */}
              <path
                d="M15 33C15 23.611 22.611 16 32 16C41.389 16 49 23.611 49 33"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeOpacity="0.45"
              />
              {/* Left & right voice waves */}
              <path
                d="M20 33C20 26.373 25.373 21 32 21C38.627 21 44 26.373 44 33"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeOpacity="0.75"
              />
              {/* Central voice pillar / friendly mic form */}
              <rect
                x="27"
                y="23"
                width="10"
                height="17"
                rx="5"
                fill="currentColor"
              />
              <path
                d="M23 36C23 40.971 27.029 45 32 45C36.971 45 41 40.971 41 36"
                stroke="currentColor"
                strokeWidth="2.75"
                strokeLinecap="round"
              />
              <path
                d="M32 45V50M27 50H37"
                stroke="currentColor"
                strokeWidth="2.75"
                strokeLinecap="round"
              />
            </svg>
          )}

          <span className="text-xs sm:text-sm font-bold leading-tight tracking-wide">
            {actionLabel}
          </span>
        </button>
      </div>

      {/* Explicit Accessible State Badge + Voice Waveform Bars (Never Color Alone) */}
      <div
        aria-live="polite"
        className="mt-2 inline-flex items-center justify-center gap-2.5 px-4 py-1.5 rounded-full bg-[#F7F1E8] border border-[var(--sahaaya-border)]"
      >
        {(isListening || isSpeaking) && (
          <div className="flex items-center gap-1 h-4" aria-hidden="true">
            <span className="w-1 h-4 rounded-full bg-[#A995C8] animate-sahaaya-bar-1" />
            <span className="w-1 h-4 rounded-full bg-[#493451] animate-sahaaya-bar-2" />
            <span className="w-1 h-4 rounded-full bg-[#D98570] animate-sahaaya-bar-3" />
          </div>
        )}
        {(isProcessing || isExecuting) && (
          <Sparkles
            className={`w-4 h-4 shrink-0 ${
              isExecuting ? 'text-[#648F83]' : 'text-[#493451]'
            }`}
            aria-hidden="true"
          />
        )}
        {isError && (
          <AlertCircle className="w-4 h-4 shrink-0 text-[#D98570]" aria-hidden="true" />
        )}
        <span
          className={`text-sm font-semibold ${
            isError
              ? 'text-[#D98570]'
              : isExecuting
                ? 'text-[#355A50]'
                : 'text-[#493451]'
          }`}
        >
          {stateLabel}
        </span>
      </div>

      {subCaption && (
        <p className="mt-2 text-xs sm:text-sm text-[#5C5363] max-w-md leading-relaxed">
          {subCaption}
        </p>
      )}
    </div>
  );
}
