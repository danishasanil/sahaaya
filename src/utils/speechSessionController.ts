import {
  LanguageCode,
  SpeechCapabilities,
  SpeechErrorType,
  VoiceSessionState,
} from '../types/sahaaya';

export interface SpeechRecognitionAlternativeLike {
  transcript: string;
  confidence: number;
}

export interface SpeechRecognitionResultLike {
  isFinal: boolean;
  length: number;
  [index: number]: SpeechRecognitionAlternativeLike;
}

export interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: SpeechRecognitionResultLike;
  };
}

export interface SpeechRecognitionErrorEventLike {
  error: string;
}

export interface SpeechRecognitionInstance {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  processLocally?: boolean;
  onstart: (() => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

export interface SpeechRecognitionConstructor {
  new (): SpeechRecognitionInstance;
  available?: (options: {
    langs: string[];
    processLocally?: boolean;
  }) => Promise<'available' | 'downloadable' | 'downloading' | 'unavailable'>;
  install?: (options: {
    langs: string[];
    processLocally?: boolean;
  }) => Promise<boolean>;
}

export interface SpeechSynthesisUtteranceLike {
  lang: string;
  rate: number;
  pitch: number;
  voice: SpeechSynthesisVoice | null;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
}

export interface SpeechSynthesisLike {
  cancel: () => void;
  speak: (utterance: SpeechSynthesisUtteranceLike) => void;
  getVoices: () => SpeechSynthesisVoice[];
  onvoiceschanged: (() => void) | null;
}

export type SpeechRateMode = 'normal' | 'slow';

export interface SpeechSnapshot {
  sessionState: VoiceSessionState;
  isConversationActive: boolean;
  isListening: boolean;
  isSpeaking: boolean;
  isProcessing: boolean;
  interimTranscript: string;
  speechError: SpeechErrorType | 'unexpected-stop';
  speechRate: SpeechRateMode;
  speechLocale: string;
  capabilities: SpeechCapabilities;
}

export interface SpeechEnvironment {
  getRecognitionCtor: () => SpeechRecognitionConstructor | null;
  getSynthesis: () => SpeechSynthesisLike | null;
  createUtterance: (text: string) => SpeechSynthesisUtteranceLike;
}

const BCP47_MAP: Record<LanguageCode, string> = {
  en: 'en-IN',
  hi: 'hi-IN',
  kn: 'kn-IN',
};

function defaultEnvironment(): SpeechEnvironment {
  return {
    getRecognitionCtor: () => {
      if (typeof window === 'undefined') return null;
      const w = window as unknown as {
        SpeechRecognition?: SpeechRecognitionConstructor;
        webkitSpeechRecognition?: SpeechRecognitionConstructor;
      };
      return w.SpeechRecognition || w.webkitSpeechRecognition || null;
    },
    getSynthesis: () => {
      if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null;
      return window.speechSynthesis as unknown as SpeechSynthesisLike;
    },
    createUtterance: (text: string) =>
      new SpeechSynthesisUtterance(text) as unknown as SpeechSynthesisUtteranceLike,
  };
}

export class SpeechSessionController {
  private env: SpeechEnvironment;
  private lang: LanguageCode;
  private speechLocale: string;
  private preferOnDevice = false;
  private onFinalTranscript: (transcript: string) => void;
  private onStateChange: (snapshot: SpeechSnapshot) => void;

  private sessionState: VoiceSessionState = 'idle';
  private isConversationActive = false;
  private interimTranscript = '';
  private speechError: SpeechErrorType | 'unexpected-stop' = null;
  private speechRate: SpeechRateMode = 'normal';
  private capabilities: SpeechCapabilities;

  private recognition: SpeechRecognitionInstance | null = null;
  private isStartingRecognition = false;
  private finalBuffer = '';
  private latestInterimChunk = '';
  private utteranceToken = 0;
  private unexpectedEndCount = 0;
  private resumeTimer: ReturnType<typeof setTimeout> | null = null;
  private speechWatchdogTimer: ReturnType<typeof setTimeout> | null = null;
  private isDestroyed = false;

  constructor(options: {
    lang: LanguageCode;
    speechLocale?: string;
    onFinalTranscript: (transcript: string) => void;
    onStateChange: (snapshot: SpeechSnapshot) => void;
    env?: SpeechEnvironment;
    speechRate?: SpeechRateMode;
  }) {
    this.env = options.env || defaultEnvironment();
    this.lang = options.lang;
    this.speechLocale = options.speechLocale || BCP47_MAP[options.lang];
    this.speechRate = options.speechRate || 'normal';
    this.onFinalTranscript = options.onFinalTranscript;
    this.onStateChange = options.onStateChange;

    const synth = this.env.getSynthesis();
    this.capabilities = {
      recognitionSupported: Boolean(this.env.getRecognitionCtor()),
      synthesisSupported: Boolean(synth),
      hasEnglishVoice: true,
      hasHindiVoice: false,
      hasKannadaVoice: false,
    };

    if (synth) {
      this.refreshVoices();
      synth.onvoiceschanged = () => this.refreshVoices();
    }
  }

  public getSnapshot(): SpeechSnapshot {
    return {
      sessionState: this.sessionState,
      isConversationActive: this.isConversationActive,
      isListening: this.sessionState === 'listening',
      isSpeaking: this.sessionState === 'speaking',
      isProcessing: this.sessionState === 'processing',
      interimTranscript: this.interimTranscript,
      speechError: this.speechError,
      speechRate: this.speechRate,
      speechLocale: this.speechLocale,
      capabilities: { ...this.capabilities },
    };
  }

  public setSpeechRate(rate: SpeechRateMode) {
    if (this.speechRate === rate) return;
    this.speechRate = rate;
    this.emit();
  }

  private emit() {
    if (!this.isDestroyed) {
      this.onStateChange(this.getSnapshot());
    }
  }

  public refreshVoices() {
    const synth = this.env.getSynthesis();
    if (!synth) return;
    const voices = synth.getVoices();
    if (!voices || voices.length === 0) return;

    this.capabilities = {
      ...this.capabilities,
      synthesisSupported: true,
      hasEnglishVoice: voices.some((v) => v.lang.toLowerCase().startsWith('en')),
      hasHindiVoice: voices.some((v) => v.lang.toLowerCase().startsWith('hi')),
      hasKannadaVoice: voices.some((v) => v.lang.toLowerCase().startsWith('kn')),
    };
    this.emit();
  }

  public setLanguage(lang: LanguageCode) {
    if (this.lang === lang) return;
    this.lang = lang;
    this.speechLocale = BCP47_MAP[lang];
    this.endConversation();
  }

  /**
   * Switches the spoken recognition BCP-47 locale without unnecessarily tearing down
   * an ongoing conversation session (if actively listening, cleanly restarts recognition
   * with the updated locale on the next cycle).
   */
  public setSpeechLocale(
    locale: string,
    options?: { preserveConversation?: boolean; preferOnDevice?: boolean }
  ) {
    const cleanLocale = locale.trim() || BCP47_MAP[this.lang];
    const nextOnDevice = Boolean(options?.preferOnDevice);
    if (this.speechLocale === cleanLocale && this.preferOnDevice === nextOnDevice) {
      return;
    }
    this.speechLocale = cleanLocale;
    this.preferOnDevice = nextOnDevice;

    const preserve = options?.preserveConversation ?? true;
    if (preserve && this.isConversationActive) {
      if (this.sessionState === 'listening') {
        this.teardownRecognition(true);
        this.sessionState = 'idle';
        this.emit();
        this.scheduleListeningResume(120);
      } else {
        this.emit();
      }
      return;
    }
    this.emit();
  }

  public hasVoiceForLocale(locale: string): boolean {
    const synth = this.env.getSynthesis();
    if (!synth) return false;
    const voices = synth.getVoices() || [];
    const target = locale.toLowerCase();
    const base = target.split('-')[0];
    return voices.some(
      (v) => v.lang.toLowerCase() === target || v.lang.toLowerCase().startsWith(base)
    );
  }

  public setCallbacks(
    onFinalTranscript: (transcript: string) => void,
    onStateChange: (snapshot: SpeechSnapshot) => void
  ) {
    this.onFinalTranscript = onFinalTranscript;
    this.onStateChange = onStateChange;
  }

  private clearTimers() {
    if (this.resumeTimer) {
      clearTimeout(this.resumeTimer);
      this.resumeTimer = null;
    }
    if (this.speechWatchdogTimer) {
      clearTimeout(this.speechWatchdogTimer);
      this.speechWatchdogTimer = null;
    }
  }

  private teardownRecognition(abortInstance: boolean) {
    this.isStartingRecognition = false;
    if (!this.recognition) return;

    const inst = this.recognition;
    this.recognition = null;
    inst.onstart = null;
    inst.onresult = null;
    inst.onerror = null;
    inst.onend = null;

    try {
      if (abortInstance) {
        inst.abort();
      } else {
        inst.stop();
      }
    } catch {
      // Ignore browser teardown errors
    }
  }

  public startConversation() {
    this.clearTimers();
    this.speechError = null;
    this.unexpectedEndCount = 0;

    if (!this.env.getRecognitionCtor()) {
      this.isConversationActive = false;
      this.sessionState = 'error';
      this.speechError = 'not-supported';
      this.emit();
      return;
    }

    this.cancelSynthesisOnly();
    this.isConversationActive = true;
    this.startListeningInternal();
  }

  public startConversationWithSpeech(text: string, overrideLang?: LanguageCode) {
    this.clearTimers();
    this.speechError = null;
    this.unexpectedEndCount = 0;
    this.isConversationActive = true;
    this.speak(text, overrideLang, { resumeListeningAfter: true });
  }

  public endConversation() {
    this.clearTimers();
    this.isConversationActive = false;
    this.unexpectedEndCount = 0;
    this.finalBuffer = '';
    this.latestInterimChunk = '';
    this.interimTranscript = '';
    this.teardownRecognition(true);
    this.cancelSynthesisOnly();
    if (this.sessionState !== 'error') {
      this.sessionState = 'idle';
    } else {
      this.sessionState = 'idle';
    }
    this.emit();
  }

  public pauseListeningForProcessing() {
    this.clearTimers();
    this.teardownRecognition(true);
    this.sessionState = 'processing';
    this.emit();
  }

  public finishProcessingWithoutSpeech() {
    if (this.isConversationActive && this.env.getRecognitionCtor()) {
      this.scheduleListeningResume(250);
    } else {
      this.sessionState = 'idle';
      this.emit();
    }
  }

  public clearSpeechError() {
    this.speechError = null;
    if (this.sessionState === 'error') {
      this.sessionState = 'idle';
    }
    this.emit();
  }

  private cancelSynthesisOnly() {
    this.utteranceToken += 1;
    if (this.speechWatchdogTimer) {
      clearTimeout(this.speechWatchdogTimer);
      this.speechWatchdogTimer = null;
    }
    const synth = this.env.getSynthesis();
    if (synth) {
      try {
        synth.cancel();
      } catch {
        // Ignore synthesis cancel errors
      }
    }
  }

  public stopSpeaking() {
    this.cancelSynthesisOnly();
    if (this.sessionState === 'speaking') {
      this.sessionState = 'idle';
      this.emit();
    }
  }

  public speak(
    text: string,
    overrideLang?: LanguageCode,
    options?: { resumeListeningAfter?: boolean }
  ) {
    const trimmed = text.trim();
    const shouldResume =
      options?.resumeListeningAfter !== undefined
        ? options.resumeListeningAfter
        : this.isConversationActive;

    // Prevent recognition from hearing assistant's own TTS
    this.clearTimers();
    this.teardownRecognition(true);
    this.finalBuffer = '';
    this.latestInterimChunk = '';
    this.interimTranscript = '';

    if (!trimmed) {
      if (shouldResume && this.isConversationActive) {
        this.scheduleListeningResume(250);
      } else {
        this.sessionState = 'idle';
        this.emit();
      }
      return;
    }

    const synth = this.env.getSynthesis();
    if (!synth) {
      if (shouldResume && this.isConversationActive && this.env.getRecognitionCtor()) {
        this.scheduleListeningResume(350);
      } else {
        this.sessionState = 'idle';
        this.emit();
      }
      return;
    }

    this.cancelSynthesisOnly();
    const myToken = this.utteranceToken;
    const targetLang = overrideLang || this.lang;
    const bcp47 = BCP47_MAP[targetLang];

    this.sessionState = 'speaking';
    this.emit();

    const finishSpeechTurn = () => {
      if (this.isDestroyed || myToken !== this.utteranceToken) return;
      if (this.speechWatchdogTimer) {
        clearTimeout(this.speechWatchdogTimer);
        this.speechWatchdogTimer = null;
      }

      if (shouldResume && this.isConversationActive && this.env.getRecognitionCtor()) {
        // Brief echo-guard cooldown before reopening mic
        this.sessionState = 'idle';
        this.emit();
        this.scheduleListeningResume(260);
      } else {
        this.sessionState = 'idle';
        this.emit();
      }
    };

    try {
      const utterance = this.env.createUtterance(trimmed);
      utterance.lang = bcp47;
      utterance.rate = this.speechRate === 'slow' ? 0.74 : 0.92;
      utterance.pitch = 1.0;

      const voices = synth.getVoices() || [];
      const exactVoice = voices.find(
        (v) => v.lang.toLowerCase() === bcp47.toLowerCase()
      );
      const prefixVoice = voices.find((v) =>
        v.lang.toLowerCase().startsWith(targetLang.toLowerCase())
      );
      if (exactVoice || prefixVoice) {
        utterance.voice = exactVoice || prefixVoice || null;
      }

      utterance.onstart = () => {
        if (myToken !== this.utteranceToken) return;
        this.sessionState = 'speaking';
        this.emit();
      };
      utterance.onend = finishSpeechTurn;
      utterance.onerror = finishSpeechTurn;

      // Safety watchdog in case browser TTS stalls without firing onend
      const maxWaitMs = Math.min(20000, Math.max(4500, trimmed.length * 100));
      this.speechWatchdogTimer = setTimeout(finishSpeechTurn, maxWaitMs);

      synth.speak(utterance);
    } catch {
      finishSpeechTurn();
    }
  }

  private scheduleListeningResume(delayMs: number) {
    if (this.resumeTimer) {
      clearTimeout(this.resumeTimer);
    }
    this.resumeTimer = setTimeout(() => {
      this.resumeTimer = null;
      if (this.isDestroyed || !this.isConversationActive) return;
      if (this.sessionState === 'speaking' || this.sessionState === 'processing') return;
      this.startListeningInternal();
    }, delayMs);
  }

  private startListeningInternal() {
    if (this.isDestroyed || this.isStartingRecognition) return;
    if (this.sessionState === 'speaking') return;

    const Ctor = this.env.getRecognitionCtor();
    if (!Ctor) {
      this.isConversationActive = false;
      this.sessionState = 'error';
      this.speechError = 'not-supported';
      this.emit();
      return;
    }

    // Ensure no duplicate recognition instances ever exist
    this.teardownRecognition(true);
    this.finalBuffer = '';
    this.latestInterimChunk = '';
    this.interimTranscript = '';
    this.isStartingRecognition = true;

    try {
      const recognition = new Ctor();
      recognition.lang = this.speechLocale || BCP47_MAP[this.lang];
      if (this.preferOnDevice && 'processLocally' in recognition) {
        recognition.processLocally = true;
      }
      // Single-utterance turn with automatic state-machine restart avoids duplicate
      // interim buffers on mobile Chrome while maintaining seamless continuous flow.
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        if (this.isDestroyed || this.recognition !== recognition) return;
        this.isStartingRecognition = false;
        this.sessionState = 'listening';
        this.speechError = null;
        this.emit();
      };

      recognition.onresult = (event: SpeechRecognitionEventLike) => {
        if (this.isDestroyed || this.recognition !== recognition) return;
        // Double guard: ignore results if TTS somehow became active
        if (this.sessionState === 'speaking') return;

        let interim = '';
        let finalText = '';

        for (let i = 0; i < event.results.length; i++) {
          const result = event.results[i];
          if (!result) continue;
          const text = result[0]?.transcript || '';
          if (result.isFinal) {
            finalText += text + ' ';
          } else {
            interim += text;
          }
        }

        if (finalText.trim() || interim.trim()) {
          this.unexpectedEndCount = 0;
          this.finalBuffer = finalText.trim();
          this.latestInterimChunk = interim.trim();
          this.interimTranscript = [this.finalBuffer, this.latestInterimChunk]
            .filter(Boolean)
            .join(' ');
          this.emit();
        }
      };

      recognition.onerror = (event: SpeechRecognitionErrorEventLike) => {
        if (this.isDestroyed || this.recognition !== recognition) return;
        this.isStartingRecognition = false;

        switch (event.error) {
          case 'not-allowed':
          case 'service-not-allowed':
            this.isConversationActive = false;
            this.sessionState = 'error';
            this.speechError = 'permission-denied';
            this.teardownRecognition(true);
            this.emit();
            break;
          case 'network':
            this.isConversationActive = false;
            this.sessionState = 'error';
            this.speechError = 'network';
            this.teardownRecognition(true);
            this.emit();
            break;
          case 'audio-capture':
            this.isConversationActive = false;
            this.sessionState = 'error';
            this.speechError = 'audio-capture';
            this.teardownRecognition(true);
            this.emit();
            break;
          case 'no-speech':
            this.speechError = 'no-speech';
            this.emit();
            break;
          case 'language-not-supported':
            // Stop retry loops immediately when browser rejects the selected speech locale
            this.isConversationActive = false;
            this.sessionState = 'error';
            this.speechError = 'not-supported';
            this.teardownRecognition(true);
            this.emit();
            break;
          case 'aborted':
            break;
          default:
            this.isConversationActive = false;
            this.sessionState = 'error';
            this.speechError = 'unknown';
            this.teardownRecognition(true);
            this.emit();
            break;
        }
      };

      recognition.onend = () => {
        if (this.isDestroyed || this.recognition !== recognition) return;
        this.isStartingRecognition = false;
        this.recognition = null;

        const committed = [this.finalBuffer.trim(), this.latestInterimChunk.trim()]
          .filter(Boolean)
          .join(' ')
          .trim();
        this.finalBuffer = '';
        this.latestInterimChunk = '';
        this.interimTranscript = '';

        if (committed) {
          this.sessionState = 'processing';
          this.emit();
          this.onFinalTranscript(committed);
          return;
        }

        // Handle unexpected recognition.onend during an active foreground session
        if (
          this.isConversationActive &&
          this.sessionState !== 'error' &&
          this.sessionState !== 'speaking' &&
          this.sessionState !== 'processing'
        ) {
          this.unexpectedEndCount += 1;
          if (this.unexpectedEndCount <= 4) {
            this.scheduleListeningResume(300);
          } else {
            this.isConversationActive = false;
            this.sessionState = 'idle';
            this.speechError = 'unexpected-stop';
            this.emit();
          }
        } else if (this.sessionState === 'listening') {
          this.sessionState = 'idle';
          this.emit();
        }
      };

      this.recognition = recognition;
      this.sessionState = 'listening';
      this.emit();
      recognition.start();
    } catch {
      this.isStartingRecognition = false;
      this.isConversationActive = false;
      this.sessionState = 'error';
      this.speechError = 'unknown';
      this.emit();
    }
  }

  public destroy() {
    this.isDestroyed = true;
    this.clearTimers();
    this.teardownRecognition(true);
    this.cancelSynthesisOnly();
  }
}
