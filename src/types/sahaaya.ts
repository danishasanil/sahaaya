export type LanguageCode = 'en' | 'hi' | 'kn';

export type TextScale = 'a' | 'a+' | 'a++';

export type ScreenId = 'welcome' | 'assistant' | 'form' | 'review' | 'success';

export type ApplicationFieldKey =
  | 'fullName'
  | 'age'
  | 'dateOfBirth'
  | 'gender'
  | 'state'
  | 'district'
  | 'address'
  | 'mobileNumber'
  | 'annualIncome';

export interface ApplicationData {
  fullName: string;
  age: string;
  dateOfBirth: string;
  gender: '' | 'Male' | 'Female' | 'Other';
  state: string;
  district: string;
  address: string;
  mobileNumber: string;
  annualIncome: string;
}

export interface ChatMessage {
  id: string;
  sender: 'assistant' | 'user';
  text: string;
  timestamp: string;
  fieldHint?: ApplicationFieldKey;
}

export type SpeechErrorType =
  | 'not-supported'
  | 'permission-denied'
  | 'no-speech'
  | 'network'
  | 'audio-capture'
  | 'unknown'
  | null;

export type VoiceSessionState =
  | 'idle'
  | 'listening'
  | 'processing'
  | 'speaking'
  | 'error';

export type ConfirmationMode = 'confirm' | 'spell' | 'edit';

export interface PendingConfirmation {
  field: ApplicationFieldKey;
  value: string;
  mode: ConfirmationMode;
  spelledTokens: string[];
}

export interface SpeechCapabilities {
  recognitionSupported: boolean;
  synthesisSupported: boolean;
  hasEnglishVoice: boolean;
  hasHindiVoice: boolean;
  hasKannadaVoice: boolean;
}

export type PlatformType = 'desktop' | 'android' | 'ios' | 'unknown';

export type BrowserName =
  | 'chrome'
  | 'edge'
  | 'safari'
  | 'firefox'
  | 'samsung-internet'
  | 'unknown';

export type PermissionStatus = 'granted' | 'denied' | 'prompt' | 'unsupported';

export interface PlatformCapabilities {
  platform: PlatformType;
  browser: BrowserName;
  isMobile: boolean;
  isSecureContext: boolean;
  speechRecognitionSupported: boolean;
  speechSynthesisSupported: boolean;
  geolocationSupported: boolean;
  microphonePermission: PermissionStatus;
  canOpenExternalWebsites: boolean;
  canControlExternalApps: false;
  canReadExternalScreens: false;
  canSendMessagesDirectly: false;
}

export type ExecutionMode = 'interactive_demo' | 'real_browser';

export type ConversationMode = 'general' | 'welfare_form';

export type CommandCategory =
  | 'general_conversation'
  | 'app_launch'
  | 'unknown_app'
  | 'search'
  | 'messaging'
  | 'screen_assistance'
  | 'navigation'
  | 'application_task';

export type TaskExecutionStatus =
  | 'ready'
  | 'needs_info'
  | 'awaiting_confirmation'
  | 'executing'
  | 'executed_in_web'
  | 'simulated_completed'
  | 'opened_externally'
  | 'requires_permission'
  | 'unavailable_on_web'
  | 'failed'
  | 'cancelled';

export type LocationIntent = 'none' | 'nearby' | 'explicit_place' | 'directions';

export interface AssistantTask {
  id: string;
  rawInstruction: string;
  normalizedInstruction?: string;
  intent: CommandCategory;
  application: string | null;
  action: string;
  target: string | null;
  searchQuery?: string | null;
  recipient?: string | null;
  messageContent: string | null;
  locationIntent?: LocationIntent;
  requiredParameters: string[];
  missingParameters: string[];
  confirmationRequired: boolean;
  executionStatus: TaskExecutionStatus;
  capabilityNote?: string;
  externalUrl?: string | null;
  externalLabel?: string | null;
  requiresLocation?: boolean;
  locationStatus?: 'not_needed' | 'granted' | 'denied' | 'unavailable';
  mathExpression?: string | null;
  mathResult?: string | null;
  calendarDraft?: {
    subAction: 'open_calendar' | 'show_upcoming' | 'add_event' | 'edit_event' | 'delete_event';
    title: string | null;
    date: string | null;
    dateLabel?: string | null;
    time: string | null;
    needsTitle?: boolean;
  } | null;
  educationLevel?: string | null;
}

export type UniversalLanguageMode = 'auto' | 'select' | 'custom';

export type LanguageCategory = 'indian' | 'regional' | 'international';

export type VoiceCapabilityStatus =
  | 'voice_available'
  | 'on_device_available'
  | 'browser_dependent'
  | 'text_only_unverified'
  | 'future_integration_required';

export interface SpokenLanguageOption {
  id: string;
  name: string;
  nativeName: string;
  bcp47: string;
  category: LanguageCategory;
  uiLang: LanguageCode;
  defaultCapability: VoiceCapabilityStatus;
  aliases: string[];
  capabilityNote: string;
}

export interface UniversalLanguagePreferences {
  mode: UniversalLanguageMode;
  selectedLanguageId: string;
  customLanguageName: string;
}

export interface LanguageDetectionResult {
  detectedLanguageId: string;
  detectedName: string;
  uiResponseLang: LanguageCode;
  isMixedLanguage: boolean;
  secondaryLanguageId?: string;
  confidence: 'high' | 'medium' | 'low';
  shouldClarify: boolean;
  reason: string;
}

export interface PronunciationNormalizationResult {
  normalizedCommand: string;
  matchedCorrections: string[];
}

export type BrowserEngineAvailability =
  | 'available'
  | 'downloadable'
  | 'downloading'
  | 'unavailable'
  | 'unknown';

export interface SpeechEngineSupportInfo {
  locale: string;
  recognitionSupported: boolean;
  onDeviceSupported: boolean;
  availability: BrowserEngineAvailability;
  effectiveStatus: VoiceCapabilityStatus;
}


