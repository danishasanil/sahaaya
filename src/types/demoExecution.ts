import { ApplicationData, ApplicationFieldKey, ExecutionMode } from './sahaaya';

export type DemoAppId =
  | 'whatsapp'
  | 'youtube'
  | 'chrome'
  | 'maps'
  | 'camera'
  | 'settings'
  | 'phone'
  | 'messages'
  | 'calculator'
  | 'calendar'
  | 'spotify'
  | 'welfare_form'
  | 'sahaaya_home';

export type DemoStepStatus = 'pending' | 'active' | 'done' | 'cancelled' | 'failed';

export type DemoExecutionStatus =
  | 'understanding_request'
  | 'waiting_for_confirmation'
  | 'preparing_application'
  | 'opening_application'
  | 'performing_action'
  | 'completed'
  | 'simulated_completion'
  | 'cancelled'
  | 'failed';

export interface DemoExecutionStep {
  id: string;
  label: string;
  status: DemoStepStatus;
  detail?: string;
}

export type DemoSimulatorPhase =
  | 'home_screen'
  | 'selecting_app'
  | 'opening_app'
  | 'activating_search'
  | 'typing_input'
  | 'contact_list'
  | 'selecting_contact'
  | 'opening_chat'
  | 'pressing_send'
  | 'submitting_search'
  | 'requesting_location'
  | 'showing_results'
  | 'selecting_result'
  | 'player_or_detail'
  | 'completed';

export interface DemoWhatsAppMessage {
  id: string;
  sender: 'user' | 'contact';
  text: string;
  timestamp: string;
  simulated: true;
}

export interface DemoSearchResultItem {
  title: string;
  domain: string;
  summary: string;
  url: string;
  isExample: boolean;
}

export interface DemoMapPlaceItem {
  name: string;
  distance: string;
  note: string;
  isExample: boolean;
}

export interface DemoWhatsAppState {
  recipient: string;
  draftMessage: string;
  typingText: string;
  messages: DemoWhatsAppMessage[];
  sentInDemo: boolean;
  contacts?: Array<{ id: string; name: string; preview: string; time: string }>;
  selectedContact?: string | null;
  sendPressed?: boolean;
}

export interface DemoYouTubeState {
  query: string;
  searchTyped: string;
  videoTitle: string;
  channelName: string;
  duration: string;
  isPlaying: boolean;
  progressPercent: number;
  watchUrl: string;
  isSimulatedPreview: boolean;
  searchActive?: boolean;
  searchResults?: Array<{ id: string; title: string; channel: string; duration: string }>;
  selectedVideoId?: string | null;
  playerOpen?: boolean;
}

export interface DemoChromeState {
  addressBar: string;
  query: string;
  typedQuery: string;
  results: DemoSearchResultItem[];
  searchUrl: string;
  searchActive?: boolean;
  isLoading?: boolean;
  selectedResultIndex?: number | null;
}

export interface DemoMapsState {
  query: string;
  destination: string;
  originLabel: string;
  isRealLocation: boolean;
  coordinates?: { latitude: number; longitude: number } | null;
  places: DemoMapPlaceItem[];
  routeSummary: string;
  mapsUrl: string;
  searchActive?: boolean;
  typedQuery?: string;
  locationPromptVisible?: boolean;
  selectedPlaceIndex?: number | null;
}

export interface DemoDeviceAppState {
  appId: 'camera' | 'settings' | 'phone' | 'calculator' | 'calendar' | 'messages';
  title: string;
  subtitle: string;
  items: Array<{ id: string; label: string; value: string; active?: boolean }>;
  actionMessage: string;
}

export interface DemoCalculatorState {
  expression: string;
  displayValue: string;
  result: string | null;
  error?: string | null;
  history: Array<{ expression: string; result: string }>;
}

export interface DemoCalendarEvent {
  id: string;
  title: string;
  date: string;
  time: string;
  simulated: true;
  createdAt: string;
}

export interface DemoCalendarState {
  selectedDate: string;
  viewYear: number;
  viewMonth: number; // 0-11
  events: DemoCalendarEvent[];
  lastActionNotice: string;
}

export interface DemoSpotifyTrackItem {
  id: string;
  title: string;
  artist: string;
  duration: string;
  album: string;
}

export interface DemoSpotifyState {
  query: string;
  searchTyped: string;
  tracks: DemoSpotifyTrackItem[];
  selectedTrackId: string | null;
  isPlaying: boolean;
  progressPercent: number;
  spotifyUrl: string;
  isSimulatedPreview: boolean;
  searchActive?: boolean;
  playerOpen?: boolean;
}

export interface DemoMessagesState {
  recipient: string;
  draftText: string;
  inbox: Array<{ id: string; sender: string; text: string; time: string }>;
  sentInDemo: boolean;
}

export interface DemoFormState {
  filledCount: number;
  totalCount: number;
  activeField?: ApplicationFieldKey;
  lastUpdatedField?: ApplicationFieldKey;
  data: ApplicationData;
  submittedInDemo: boolean;
  confirmationNumber?: string;
}

export interface DemoSimulationPayload {
  appId: DemoAppId;
  appName: string;
  isSimulated: boolean;
  whatsAppState?: DemoWhatsAppState;
  youTubeState?: DemoYouTubeState;
  chromeState?: DemoChromeState;
  mapsState?: DemoMapsState;
  deviceAppState?: DemoDeviceAppState;
  calculatorState?: DemoCalculatorState;
  calendarState?: DemoCalendarState;
  spotifyState?: DemoSpotifyState;
  messagesState?: DemoMessagesState;
  formState?: DemoFormState;
}

export interface DemoExecutionSession {
  taskId: string;
  mode: ExecutionMode;
  isSimulated: boolean;
  appId: DemoAppId;
  appName: string;
  recognisedCommand: string;
  requestedAction: string;
  status: DemoExecutionStatus;
  simPhase?: DemoSimulatorPhase;
  steps: DemoExecutionStep[];
  payload: DemoSimulationPayload;
  externalUrl?: string | null;
  externalLabel?: string | null;
  resultSummary: string;
  honestNotice: string;
}
