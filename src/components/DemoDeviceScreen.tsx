import {
  ArrowLeft,
  Calculator,
  CalendarDays,
  Camera,
  Check,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  Compass,
  Delete,
  ExternalLink,
  Globe,
  Home,
  Loader2,
  MapPin,
  MessageCircle,
  MessageSquare,
  Music,
  Navigation,
  Pause,
  Pencil,
  Phone,
  Play,
  Plus,
  Search,
  Send,
  Settings,
  Smartphone,
  Trash2,
  Video,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { APPLICATION_FIELD_ORDER, TRANSLATIONS } from '../i18n/translations';
import {
  DemoAppId,
  DemoCalendarEvent,
  DemoExecutionSession,
} from '../types/demoExecution';
import { ApplicationData, LanguageCode } from '../types/sahaaya';
import { getCompletionStats } from '../utils/applicationLogic';
import { evaluateMathExpression } from '../utils/calculatorEngine';
import {
  addDemoCalendarEventToStore,
  buildCalendarMonthGrid,
  createDemoCalendarEvent,
  deleteDemoCalendarEventFromStore,
  formatIsoDate,
  loadDemoCalendarEvents,
  updateDemoCalendarEventInStore,
} from '../utils/calendarEngine';
import {
  buildExampleMapPlaces,
  buildExampleSearchResults,
  buildExampleSpotifyTracks,
} from '../utils/demoAppRegistry';

interface DemoDeviceScreenProps {
  language: LanguageCode;
  session: DemoExecutionSession;
  applicationData?: ApplicationData;
}

const HOME_SCREEN_APPS: Array<{
  id: DemoAppId;
  label: string;
  bg: string;
  fg: string;
}> = [
  { id: 'phone', label: 'Phone', bg: 'bg-[#648F83]', fg: 'text-[#FFFCF7]' },
  { id: 'messages', label: 'Messages', bg: 'bg-[#A995C8]', fg: 'text-[#FFFCF7]' },
  { id: 'whatsapp', label: 'WhatsApp', bg: 'bg-[#4E8072]', fg: 'text-[#FFFCF7]' },
  { id: 'chrome', label: 'Chrome', bg: 'bg-[#493451]', fg: 'text-[#FFFCF7]' },
  { id: 'youtube', label: 'YouTube', bg: 'bg-[#D98570]', fg: 'text-[#FFFCF7]' },
  { id: 'maps', label: 'Maps', bg: 'bg-[#5B7C8D]', fg: 'text-[#FFFCF7]' },
  { id: 'camera', label: 'Camera', bg: 'bg-[#302B33]', fg: 'text-[#FFFCF7]' },
  { id: 'settings', label: 'Settings', bg: 'bg-[#6E6476]', fg: 'text-[#FFFCF7]' },
  { id: 'calculator', label: 'Calculator', bg: 'bg-[#493451]', fg: 'text-[#FFFCF7]' },
  { id: 'calendar', label: 'Calendar', bg: 'bg-[#D98570]', fg: 'text-[#FFFCF7]' },
  { id: 'spotify', label: 'Spotify', bg: 'bg-[#3E6B5E]', fg: 'text-[#FFFCF7]' },
];

function formatPlaybackSeconds(totalSec: number): string {
  const mins = Math.floor(totalSec / 60);
  const secs = totalSec % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function DemoDeviceScreen({
  language,
  session,
  applicationData,
}: DemoDeviceScreenProps) {
  const t = TRANSLATIONS[language];
  const { payload, simPhase } = session;

  const [youTubePlayingOverride, setYouTubePlayingOverride] = useState<boolean | null>(null);
  const [selectedVideoIdx, setSelectedVideoIdx] = useState<number>(0);
  const [ytElapsedSec, setYtElapsedSec] = useState<number>(12);
  const [openedChromeResultIdx, setOpenedChromeResultIdx] = useState<number | null>(null);
  const [selectedMapPlaceIdx, setSelectedMapPlaceIdx] = useState<number>(0);
  const [settingsToggles, setSettingsToggles] = useState<Record<string, boolean>>({
    wifi: true,
    font: true,
  });
  const [cameraCaptured, setCameraCaptured] = useState(false);

  // Simulator navigation state (Back / Home inside device frame)
  const [localScreenOverride, setLocalScreenOverride] = useState<
    'home' | DemoAppId | null
  >(null);

  // Deterministic Calculator state
  const [calcExpr, setCalcExpr] = useState<string>('');
  const [calcDisplay, setCalcDisplay] = useState<string>('0');
  const [calcError, setCalcError] = useState<string | null>(null);
  const [calcHistory, setCalcHistory] = useState<
    Array<{ expression: string; result: string }>
  >([]);

  // Calendar local interactive state
  const todayRef = new Date();
  const [calYear, setCalYear] = useState<number>(todayRef.getFullYear());
  const [calMonth, setCalMonth] = useState<number>(todayRef.getMonth());
  const [calSelectedDate, setCalSelectedDate] = useState<string>(
    formatIsoDate(todayRef)
  );
  const [calEvents, setCalEvents] = useState<DemoCalendarEvent[]>(() =>
    loadDemoCalendarEvents()
  );
  const [calNewTitle, setCalNewTitle] = useState<string>('');
  const [calNewTime, setCalNewTime] = useState<string>('10:00 AM');
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [editEventTitle, setEditEventTitle] = useState<string>('');
  const [editEventTime, setEditEventTime] = useState<string>('');

  // Spotify interactive preview state
  const [spotifyPlayingOverride, setSpotifyPlayingOverride] = useState<boolean | null>(null);
  const [selectedSpotifyTrackIdx, setSelectedSpotifyTrackIdx] = useState<number>(0);
  const [spElapsedSec, setSpElapsedSec] = useState<number>(15);

  // Phone & Messages interactive demo state
  const [dialedNumber, setDialedNumber] = useState<string>('');
  const [isDemoCallActive, setIsDemoCallActive] = useState<boolean>(false);
  const [smsDraft, setSmsDraft] = useState<string>('');
  const [smsSentList, setSmsSentList] = useState<Array<{ id: string; text: string }>>([]);

  // Effective app shown inside simulator bezel
  const activeAppId: DemoAppId =
    localScreenOverride && localScreenOverride !== 'home'
      ? localScreenOverride
      : payload.appId;

  // Character-by-character typing progress when simPhase === 'typing_input'
  const targetTypingText =
    activeAppId === 'chrome'
      ? payload.chromeState?.query || ''
      : activeAppId === 'whatsapp'
        ? payload.whatsAppState?.draftMessage || ''
        : activeAppId === 'youtube'
          ? payload.youTubeState?.query || ''
          : activeAppId === 'spotify'
            ? payload.spotifyState?.query || ''
            : activeAppId === 'maps'
              ? payload.mapsState?.query || ''
              : '';

  const [typedCount, setTypedCount] = useState<number>(0);

  // Reset interactive local state when starting a different task
  useEffect(() => {
    setLocalScreenOverride(null);
    setYouTubePlayingOverride(null);
    setSelectedVideoIdx(0);
    setYtElapsedSec(12);
    setOpenedChromeResultIdx(null);
    setSelectedMapPlaceIdx(0);
    setTypedCount(0);
    setSpotifyPlayingOverride(null);
    setSelectedSpotifyTrackIdx(0);
    setSpElapsedSec(15);
    setIsDemoCallActive(false);

    if (payload.calculatorState) {
      setCalcExpr(payload.calculatorState.expression || '');
      setCalcDisplay(payload.calculatorState.displayValue || '0');
      setCalcError(payload.calculatorState.error || null);
      setCalcHistory(payload.calculatorState.history || []);
    }
    if (payload.calendarState) {
      setCalYear(payload.calendarState.viewYear);
      setCalMonth(payload.calendarState.viewMonth);
      setCalSelectedDate(payload.calendarState.selectedDate);
      setCalEvents(payload.calendarState.events);
    }
  }, [session.taskId]);

  // Sync voice-driven payload selection & calendar updates on same task
  useEffect(() => {
    if (payload.youTubeState?.selectedVideoId && payload.youTubeState.searchResults) {
      const idx = payload.youTubeState.searchResults.findIndex(
        (v) => v.id === payload.youTubeState?.selectedVideoId
      );
      if (idx >= 0) setSelectedVideoIdx(idx);
    }
    if (
      typeof payload.chromeState?.selectedResultIndex === 'number' &&
      payload.chromeState.selectedResultIndex >= 0
    ) {
      setOpenedChromeResultIdx(payload.chromeState.selectedResultIndex);
    }
    if (
      typeof payload.mapsState?.selectedPlaceIndex === 'number' &&
      payload.mapsState.selectedPlaceIndex >= 0
    ) {
      setSelectedMapPlaceIdx(payload.mapsState.selectedPlaceIndex);
    }
    if (payload.spotifyState?.selectedTrackId && payload.spotifyState.tracks) {
      const spIdx = payload.spotifyState.tracks.findIndex(
        (tr) => tr.id === payload.spotifyState?.selectedTrackId
      );
      if (spIdx >= 0) setSelectedSpotifyTrackIdx(spIdx);
    }
    if (payload.calendarState) {
      setCalEvents(payload.calendarState.events);
      setCalSelectedDate(payload.calendarState.selectedDate);
      setCalYear(payload.calendarState.viewYear);
      setCalMonth(payload.calendarState.viewMonth);
    }
  }, [payload]);

  useEffect(() => {
    if (simPhase !== 'typing_input') {
      if (
        simPhase === 'submitting_search' ||
        simPhase === 'showing_results' ||
        simPhase === 'selecting_result' ||
        simPhase === 'pressing_send' ||
        simPhase === 'requesting_location' ||
        simPhase === 'completed' ||
        !simPhase
      ) {
        setTypedCount(targetTypingText.length);
      } else {
        setTypedCount(0);
      }
      return;
    }

    if (!targetTypingText) return;
    setTypedCount(0);
    const intervalMs = Math.max(22, Math.min(48, Math.floor(780 / targetTypingText.length)));
    const timer = window.setInterval(() => {
      setTypedCount((prev) => {
        if (prev >= targetTypingText.length) {
          window.clearInterval(timer);
          return prev;
        }
        return prev + 1;
      });
    }, intervalMs);

    return () => window.clearInterval(timer);
  }, [simPhase, targetTypingText, session.taskId]);

  const isYtPlaying =
    youTubePlayingOverride !== null
      ? youTubePlayingOverride
      : Boolean(payload.youTubeState?.isPlaying);

  const ytPlayerVisible = Boolean(
    payload.youTubeState?.playerOpen ||
      youTubePlayingOverride !== null ||
      (!simPhase && session.status === 'simulated_completion') ||
      simPhase === 'completed'
  );

  useEffect(() => {
    if (activeAppId !== 'youtube' || !ytPlayerVisible || !isYtPlaying) return;
    const timer = window.setInterval(() => {
      setYtElapsedSec((prev) => (prev >= 272 ? 0 : prev + 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [activeAppId, ytPlayerVisible, isYtPlaying]);

  const isSpPlaying =
    spotifyPlayingOverride !== null
      ? spotifyPlayingOverride
      : Boolean(payload.spotifyState?.isPlaying);

  const spPlayerVisible = Boolean(
    payload.spotifyState?.playerOpen ||
      spotifyPlayingOverride !== null ||
      localScreenOverride === 'spotify' ||
      (!simPhase && session.status === 'simulated_completion') ||
      simPhase === 'completed'
  );

  useEffect(() => {
    if (activeAppId !== 'spotify' || !spPlayerVisible || !isSpPlaying) return;
    const timer = window.setInterval(() => {
      setSpElapsedSec((prev) => (prev >= 252 ? 0 : prev + 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [activeAppId, spPlayerVisible, isSpPlaying]);

  const showHomeScreen =
    localScreenOverride === 'home' ||
    (localScreenOverride === null &&
      (simPhase === 'home_screen' || simPhase === 'selecting_app'));

  const chromeTypedDisplay =
    simPhase === 'typing_input'
      ? targetTypingText.slice(0, typedCount)
      : payload.chromeState?.typedQuery || '';

  const waTypedDisplay =
    simPhase === 'typing_input'
      ? targetTypingText.slice(0, typedCount)
      : payload.whatsAppState?.typingText || '';

  const ytTypedDisplay =
    simPhase === 'typing_input'
      ? targetTypingText.slice(0, typedCount)
      : payload.youTubeState?.searchTyped || '';

  const spTypedDisplay =
    simPhase === 'typing_input'
      ? targetTypingText.slice(0, typedCount)
      : payload.spotifyState?.searchTyped || '';

  const mapsTypedDisplay =
    simPhase === 'typing_input'
      ? targetTypingText.slice(0, typedCount)
      : payload.mapsState?.typedQuery || '';

  const activeYouTubeResult =
    payload.youTubeState?.searchResults?.[selectedVideoIdx] || null;

  const displayedYtTitle =
    activeYouTubeResult?.title || payload.youTubeState?.videoTitle || '';
  const displayedYtChannel =
    activeYouTubeResult?.channel || payload.youTubeState?.channelName || '';
  const displayedYtDuration =
    activeYouTubeResult?.duration || payload.youTubeState?.duration || '04:32';

  const spotifyTracks =
    payload.spotifyState?.tracks || buildExampleSpotifyTracks('Relaxing music');
  const activeSpotifyTrack =
    spotifyTracks[selectedSpotifyTrackIdx] || spotifyTracks[0];

  const handleSimulatorBack = () => {
    if (openedChromeResultIdx !== null && activeAppId === 'chrome') {
      setOpenedChromeResultIdx(null);
      return;
    }
    setLocalScreenOverride('home');
  };

  const handleCalculatorKey = (key: string) => {
    if (key === 'C') {
      setCalcExpr('');
      setCalcDisplay('0');
      setCalcError(null);
      return;
    }
    if (key === '⌫') {
      const nextExpr = calcExpr.slice(0, -1);
      setCalcExpr(nextExpr);
      setCalcDisplay(nextExpr || '0');
      setCalcError(null);
      return;
    }
    if (key === '=') {
      const exprToRun = calcExpr || calcDisplay;
      const res = evaluateMathExpression(exprToRun);
      if (res.ok && res.formattedValue) {
        setCalcDisplay(res.formattedValue);
        setCalcExpr(res.formattedValue);
        setCalcError(null);
        setCalcHistory((prev) => [
          { expression: res.normalizedExpression, result: res.formattedValue! },
          ...prev.slice(0, 3),
        ]);
      } else {
        setCalcError(res.error || 'Error');
        setCalcDisplay(res.error || 'Error');
      }
      return;
    }
    const base = calcError ? '' : calcExpr;
    const nextExpr = `${base}${key}`;
    setCalcExpr(nextExpr);
    setCalcDisplay(nextExpr);
    setCalcError(null);
  };

  const currentAppDisplayName =
    HOME_SCREEN_APPS.find((a) => a.id === activeAppId)?.label || payload.appName;

  return (
    <section
      aria-label={t.assistant.demoMode.deviceScreenTitle}
      className="rounded-3xl bg-[#FFFCF7] border border-[var(--sahaaya-border)] shadow-[var(--sahaaya-shadow)] p-5 sm:p-6 space-y-4"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Smartphone className="w-5 h-5 text-[#493451]" aria-hidden="true" />
          <h2 className="font-display text-lg font-semibold text-[#302B33]">
            {t.assistant.demoMode.deviceScreenTitle}
          </h2>
        </div>
        <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-[#EFEAF6] text-[#493451]">
          {payload.isSimulated
            ? t.assistant.demoMode.simulatedBadge
            : t.assistant.demoMode.realBadge}
        </span>
      </div>

      {/* Smartphone Bezel Frame (Warm Plum & Ivory aesthetic) */}
      <div className="rounded-[28px] border-[3px] border-[#493451] bg-[#F7F1E8] overflow-hidden shadow-inner">
        {/* Simulated Status Bar with Back & Home Navigation */}
        <div className="bg-[#493451] text-[#FFFCF7] px-3.5 py-2 flex items-center justify-between gap-2 text-xs font-medium">
          <span className="tabular-nums truncate">9:41 · Sahaaya Phone</span>
          <div className="flex items-center gap-1.5 shrink-0">
            {!showHomeScreen && payload.appId !== 'welfare_form' && (
              <>
                <button
                  type="button"
                  onClick={handleSimulatorBack}
                  aria-label="Phone Back"
                  title="Back"
                  className="min-h-[28px] px-2 py-0.5 rounded-lg bg-[#FFFCF7]/15 hover:bg-[#FFFCF7]/25 text-[#FFFCF7] inline-flex items-center gap-1 text-[11px] font-semibold cursor-pointer"
                >
                  <ArrowLeft className="w-3 h-3" aria-hidden="true" />
                  <span>Back</span>
                </button>
                <button
                  type="button"
                  onClick={() => setLocalScreenOverride('home')}
                  aria-label="Phone Home"
                  title="Home Screen"
                  className="min-h-[28px] px-2 py-0.5 rounded-lg bg-[#FFFCF7]/15 hover:bg-[#FFFCF7]/25 text-[#FFFCF7] inline-flex items-center gap-1 text-[11px] font-semibold cursor-pointer"
                >
                  <Home className="w-3 h-3" aria-hidden="true" />
                  <span>Home</span>
                </button>
              </>
            )}
            <span className="px-2 py-0.5 rounded bg-[#A995C8]/25 text-[#FFFCF7] font-semibold">
              {showHomeScreen ? 'Home Screen' : currentAppDisplayName}
            </span>
          </div>
        </div>

        {/* Always-Visible Demo Mode Disclosure Strip inside Phone View */}
        {payload.isSimulated && (
          <div className="bg-[#FBEEE9] border-b border-[#D98570]/35 px-3.5 py-1.5 text-[11px] font-bold text-[#493451] text-center tracking-wide">
            {t.assistant.demoMode.simulatedBadge}
          </div>
        )}

        {/* 0. SIMULATED SMARTPHONE HOME SCREEN & ALL 11 APPS */}
        {showHomeScreen && payload.appId !== 'welfare_form' && (
          <div className="bg-[#FFFCF7] p-4 space-y-4">
            <div className="rounded-2xl bg-[#EFEAF6] px-3 py-2 flex items-center gap-2 text-xs text-[#493451]">
              <Search className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              <span className="font-medium truncate">
                {simPhase === 'selecting_app' && localScreenOverride === null
                  ? `Opening ${payload.appName}...`
                  : 'Tap any app icon to preview inside Demo Phone'}
              </span>
            </div>

            <div className="grid grid-cols-4 gap-2 py-1">
              {HOME_SCREEN_APPS.map((app) => {
                const isTarget =
                  localScreenOverride === null &&
                  simPhase === 'selecting_app' &&
                  app.id === payload.appId;

                return (
                  <button
                    key={app.id}
                    type="button"
                    onClick={() => setLocalScreenOverride(app.id)}
                    className={`flex flex-col items-center gap-1.5 p-1.5 rounded-2xl transition-all duration-300 cursor-pointer ${
                      isTarget
                        ? 'bg-[#EFEAF6] ring-2 ring-[#493451] scale-105 shadow-sm'
                        : 'hover:bg-[#EFEAF6]/70'
                    }`}
                  >
                    <div
                      className={`w-11 h-11 rounded-2xl ${app.bg} ${app.fg} flex items-center justify-center shadow-sm`}
                    >
                      {app.id === 'phone' && <Phone className="w-5 h-5" aria-hidden="true" />}
                      {app.id === 'messages' && (
                        <MessageSquare className="w-5 h-5" aria-hidden="true" />
                      )}
                      {app.id === 'whatsapp' && (
                        <MessageCircle className="w-5 h-5" aria-hidden="true" />
                      )}
                      {app.id === 'chrome' && <Globe className="w-5 h-5" aria-hidden="true" />}
                      {app.id === 'youtube' && <Video className="w-5 h-5" aria-hidden="true" />}
                      {app.id === 'maps' && <Compass className="w-5 h-5" aria-hidden="true" />}
                      {app.id === 'camera' && <Camera className="w-5 h-5" aria-hidden="true" />}
                      {app.id === 'settings' && (
                        <Settings className="w-5 h-5" aria-hidden="true" />
                      )}
                      {app.id === 'calculator' && (
                        <Calculator className="w-5 h-5" aria-hidden="true" />
                      )}
                      {app.id === 'calendar' && (
                        <CalendarDays className="w-5 h-5" aria-hidden="true" />
                      )}
                      {app.id === 'spotify' && (
                        <Music className="w-5 h-5" aria-hidden="true" />
                      )}
                    </div>
                    <span className="text-[11px] font-semibold text-[#302B33] text-center leading-tight">
                      {app.label}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="text-center text-xs font-medium text-[#5C5363] pb-1">
              {simPhase === 'selecting_app' && localScreenOverride === null
                ? `Selecting ${payload.appName} icon...`
                : 'Unified Sahaaya Home Screen · 11 Apps'}
            </div>
          </div>
        )}

        {/* 1. WHATSAPP DEMO VIEW */}
        {!showHomeScreen && activeAppId === 'whatsapp' && (() => {
          const wa = payload.whatsAppState || {
            recipient: 'Family Contact',
            draftMessage: '',
            typingText: '',
            messages: [],
            sentInDemo: false,
            contacts: [
              { id: 'c1', name: 'Daughter', preview: 'Call me when free', time: '10:15 AM' },
              { id: 'c2', name: 'Dr. Sharma Clinic', preview: 'Appointment reminder', time: 'Yesterday' },
            ],
            selectedContact: null,
            sendPressed: false,
          };
          return (
          <div className="bg-[#FFFCF7] p-4 space-y-3">
            {/* Persistent WhatsApp Demo Disclosure */}
            <div className="rounded-xl bg-[#FBEEE9] border border-[#D98570]/45 px-3 py-2 text-[11px] font-bold text-[#493451] text-center">
              SIMULATED — DEMO MODE. No real WhatsApp message was sent.
            </div>

            {simPhase === 'contact_list' || simPhase === 'selecting_contact' ? (
              /* Simulated WhatsApp Contact List */
              <div className="space-y-2.5">
                <div className="flex items-center justify-between pb-2 border-b border-[var(--sahaaya-border)]">
                  <div className="flex items-center gap-2">
                    <MessageCircle className="w-4 h-4 text-[#648F83]" aria-hidden="true" />
                    <span className="text-sm font-bold text-[#302B33]">WhatsApp Chats</span>
                  </div>
                  <span className="text-[11px] font-semibold text-[#5C5363]">
                    {simPhase === 'selecting_contact'
                      ? `Selecting ${wa.recipient}...`
                      : 'Choose contact'}
                  </span>
                </div>

                <div className="space-y-2">
                  {(
                    wa.contacts || [
                      {
                        id: 'fallback-contact',
                        name: wa.recipient,
                        preview: 'Family contact · Demo',
                        time: 'Now',
                      },
                    ]
                  ).map((contact) => {
                    const isSelected =
                      simPhase === 'selecting_contact' &&
                      contact.name.toLowerCase() ===
                        wa?.recipient.toLowerCase();

                    return (
                      <div
                        key={contact.id}
                        className={`rounded-xl px-3 py-2.5 flex items-center justify-between gap-2 border transition-all duration-300 ${
                          isSelected
                            ? 'bg-[#EAF2EF] border-[#648F83] ring-2 ring-[#648F83]/45'
                            : 'bg-[#F7F1E8] border-[var(--sahaaya-border)]'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-9 h-9 rounded-full bg-[#648F83] text-[#FFFCF7] flex items-center justify-center font-bold text-sm shrink-0">
                            {contact.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-[#302B33] truncate">
                              {contact.name}
                            </p>
                            <p className="text-[11px] text-[#5C5363] truncate">
                              {contact.preview}
                            </p>
                          </div>
                        </div>
                        {isSelected ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#648F83] text-[#FFFCF7] shrink-0">
                            Selected
                          </span>
                        ) : (
                          <span className="text-[10px] text-[#5C5363] shrink-0">
                            {contact.time}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              /* Simulated WhatsApp Active Chat Screen */
              <>
                <div className="flex items-center justify-between pb-2.5 border-b border-[var(--sahaaya-border)]">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-full bg-[#648F83] text-[#FFFCF7] flex items-center justify-center font-bold text-sm">
                      {wa.recipient.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-[#302B33]">
                        {wa.recipient}
                      </p>
                      <p className="text-[11px] text-[#5C5363]">
                        Simulated Chat · Local Demo Only
                      </p>
                    </div>
                  </div>
                  <MessageCircle className="w-5 h-5 text-[#648F83]" aria-hidden="true" />
                </div>

                <div className="min-h-[120px] rounded-2xl bg-[#F7F1E8] p-3 flex flex-col justify-end space-y-2.5">
                  {wa.messages.length === 0 ? (
                    <p className="text-xs text-[#5C5363] text-center my-auto px-2">
                      {session.status === 'waiting_for_confirmation'
                        ? `Ready to message ${wa.recipient}: "${wa.draftMessage}"`
                        : simPhase === 'opening_chat'
                          ? `Opened chat with ${wa.recipient}...`
                          : simPhase === 'typing_input'
                            ? 'Composing message...'
                            : simPhase === 'pressing_send'
                              ? 'Pressing Send button in demo...'
                              : 'Preparing WhatsApp chat...'}
                    </p>
                  ) : (
                    wa.messages.map((msg) => (
                      <div
                        key={msg.id}
                        className="self-end max-w-[85%] rounded-2xl rounded-br-sm bg-[#648F83] text-[#FFFCF7] px-3.5 py-2.5 shadow-sm transition-all duration-300"
                      >
                        <p className="text-sm leading-snug">{msg.text}</p>
                        <div className="mt-1 flex items-center justify-end gap-1 text-[10px] text-[#FFFCF7]/85">
                          <span>{msg.timestamp}</span>
                          <CheckCheck className="w-3.5 h-3.5" aria-label="Simulated sent checkmarks" />
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Simulated Message Composer & Send Button */}
                <div className="flex items-center gap-2">
                  <div className="flex-1 rounded-xl border border-[var(--sahaaya-border)] bg-[#F7F1E8] px-3 py-2 text-xs text-[#302B33] min-h-[38px] flex items-center justify-between gap-2">
                    <span className="truncate">
                      {wa.sentInDemo ? (
                        'Message sent in Sahaaya demo'
                      ) : waTypedDisplay ? (
                        <>
                          {waTypedDisplay}
                          {simPhase === 'typing_input' && (
                            <span className="inline-block w-0.5 h-3.5 bg-[#493451] ml-0.5 align-middle animate-sahaaya-caret" />
                          )}
                        </>
                      ) : session.status === 'waiting_for_confirmation' ? (
                        wa.draftMessage
                      ) : (
                        <span className="text-[#5C5363]">Type a message</span>
                      )}
                    </span>
                    {wa.sentInDemo && (
                      <span className="text-[10px] font-bold text-[#648F83] shrink-0">
                        DEMO SENT
                      </span>
                    )}
                  </div>
                  <div
                    aria-hidden="true"
                    className={`w-9 h-9 rounded-full flex items-center justify-center transition-transform ${
                      wa.sendPressed && !wa.sentInDemo
                        ? 'bg-[#493451] text-[#FFFCF7] scale-90 ring-2 ring-[#A995C8]'
                        : wa.sentInDemo
                          ? 'bg-[#648F83] text-[#FFFCF7]'
                          : 'bg-[#EFEAF6] text-[#493451]'
                    }`}
                  >
                    <Send className="w-4 h-4" />
                  </div>
                </div>
              </>
            )}
          </div>
          );
        })()}

        {/* 2. YOUTUBE DEMO VIEW */}
        {!showHomeScreen && activeAppId === 'youtube' && (() => {
          const yt = payload.youTubeState || {
            query: 'Yoga for beginners',
            searchTyped: 'Yoga for beginners',
            videoTitle: 'Yoga for Beginners — Demo Preview',
            channelName: 'Sahaaya Simulated Video Card (Demo)',
            duration: '04:32',
            isPlaying: false,
            progressPercent: 18,
            watchUrl: 'https://www.youtube.com',
            isSimulatedPreview: true,
            searchActive: true,
            searchResults: [
              { id: 'yt-d1', title: 'Gentle Morning Yoga (Demo)', channel: 'Sahaaya Demo', duration: '04:32' },
            ],
            selectedVideoId: 'yt-d1',
            playerOpen: true,
          };
          return (
          <div className="bg-[#FFFCF7] p-4 space-y-3">
            {/* Search Bar */}
            <div
              className={`flex items-center gap-2 rounded-xl border px-3 py-2 transition-colors ${
                yt.searchActive || simPhase === 'activating_search' || simPhase === 'typing_input'
                  ? 'border-[#493451] bg-[#FFFCF7] ring-2 ring-[#A995C8]/40'
                  : 'border-[var(--sahaaya-border)] bg-[#F7F1E8]'
              }`}
            >
              <Search className="w-4 h-4 text-[#D98570] shrink-0" aria-hidden="true" />
              <span className="text-sm text-[#302B33] font-medium truncate">
                {ytTypedDisplay ||
                  (simPhase === 'activating_search'
                    ? 'Search YouTube...'
                    : yt.query)}
                {simPhase === 'typing_input' && (
                  <span className="inline-block w-0.5 h-3.5 bg-[#493451] ml-0.5 align-middle animate-sahaaya-caret" />
                )}
              </span>
            </div>

            {!ytPlayerVisible ? (
              /* YouTube Search Results List before Video Selection */
              <div className="space-y-2">
                <p className="text-[11px] font-semibold text-[#5C5363]">
                  {simPhase === 'showing_results' || simPhase === 'selecting_result'
                    ? 'YouTube search results (tap any video to preview)'
                    : simPhase === 'typing_input'
                      ? 'Typing query into YouTube...'
                      : 'Opening YouTube...'}
                </p>

                {(simPhase === 'showing_results' || simPhase === 'selecting_result') &&
                  yt.searchResults && (
                    <div className="space-y-2">
                      {yt.searchResults.map((vid, idx) => {
                        const isHighlighted =
                          simPhase === 'selecting_result' && idx === selectedVideoIdx;
                        return (
                          <button
                            key={vid.id}
                            type="button"
                            onClick={() => {
                              setSelectedVideoIdx(idx);
                              setYouTubePlayingOverride(true);
                            }}
                            className={`w-full text-left rounded-xl p-2.5 border flex items-center justify-between gap-2 cursor-pointer transition-all ${
                              isHighlighted
                                ? 'bg-[#EFEAF6] border-[#493451] ring-2 ring-[#493451]/35'
                                : 'bg-[#F7F1E8] hover:bg-[#EFEAF6]/70 border-[var(--sahaaya-border)]'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-12 h-9 rounded-lg bg-[#493451] text-[#FFFCF7] flex items-center justify-center shrink-0">
                                <Play className="w-4 h-4" aria-hidden="true" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-[#302B33] truncate">
                                  {vid.title}
                                </p>
                                <p className="text-[11px] text-[#5C5363] truncate">
                                  {vid.channel} · {vid.duration}
                                </p>
                              </div>
                            </div>
                            {isHighlighted && (
                              <span className="text-[10px] font-bold text-[#493451] shrink-0">
                                Selecting...
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
              </div>
            ) : (
              /* YouTube Interactive Simulated Video Player */
              <>
                <div className="rounded-2xl overflow-hidden border border-[var(--sahaaya-border)] bg-[#302B33] text-[#FFFCF7]">
                  <div className="aspect-video flex flex-col items-center justify-center p-4 text-center relative bg-[#493451]">
                    <span className="absolute top-2.5 left-2.5 text-[10px] font-bold px-2 py-0.5 rounded bg-[#FFFCF7]/15 text-[#FFFCF7]">
                      SIMULATED PLAYBACK · DEMO MODE
                    </span>

                    <button
                      type="button"
                      onClick={() => setYouTubePlayingOverride((prev) => !(prev ?? isYtPlaying))}
                      aria-label={isYtPlaying ? 'Pause simulated video' : 'Play simulated video'}
                      className="w-14 h-14 rounded-full bg-[#D98570] hover:bg-[#c5735e] text-[#FFFCF7] flex items-center justify-center shadow-md cursor-pointer transition-transform active:scale-95"
                    >
                      {isYtPlaying ? (
                        <Pause className="w-6 h-6" aria-hidden="true" />
                      ) : (
                        <Play className="w-6 h-6 ml-0.5" aria-hidden="true" />
                      )}
                    </button>

                    <div className="mt-2.5 flex items-center gap-2 text-xs text-[#FFFCF7]/95 font-medium tabular-nums">
                      {isYtPlaying && (
                        <span className="inline-flex items-center gap-0.5 h-3" aria-hidden="true">
                          <span className="w-1 h-3 rounded-full bg-[#D98570] animate-sahaaya-bar-1" />
                          <span className="w-1 h-3 rounded-full bg-[#FFFCF7] animate-sahaaya-bar-2" />
                          <span className="w-1 h-3 rounded-full bg-[#A995C8] animate-sahaaya-bar-3" />
                        </span>
                      )}
                      <span>
                        {isYtPlaying ? 'Playing demo' : 'Paused'} · {formatPlaybackSeconds(ytElapsedSec)} /{' '}
                        {displayedYtDuration}
                      </span>
                    </div>
                  </div>
                  <div className="h-1.5 w-full bg-[#5C5363]">
                    <div
                      className="h-full bg-[#D98570] transition-all duration-500"
                      style={{
                        width: `${Math.min(100, Math.max(8, Math.round((ytElapsedSec / 272) * 100)))}%`,
                      }}
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <p className="text-sm font-bold text-[#302B33]">{displayedYtTitle}</p>
                  <p className="text-xs text-[#5C5363]">{displayedYtChannel}</p>
                </div>

                {yt.searchResults &&
                  yt.searchResults.length > 1 && (
                    <div className="space-y-1.5 pt-1">
                      <p className="text-[11px] font-semibold text-[#5C5363]">
                        Other simulated results:
                      </p>
                      <div className="flex flex-col gap-1.5">
                        {yt.searchResults.map((vid, idx) => (
                          <button
                            key={vid.id}
                            type="button"
                            onClick={() => {
                              setSelectedVideoIdx(idx);
                              setYtElapsedSec(0);
                              setYouTubePlayingOverride(true);
                            }}
                            className={`text-left rounded-lg px-2.5 py-1.5 text-xs border cursor-pointer ${
                              idx === selectedVideoIdx
                                ? 'bg-[#EFEAF6] border-[#493451]/45 font-semibold text-[#493451]'
                                : 'bg-[#F7F1E8] border-[var(--sahaaya-border)] text-[#302B33]'
                            }`}
                          >
                            {vid.title} · {vid.duration}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
              </>
            )}

            <a
              href={yt.watchUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="min-h-[42px] w-full px-3 py-2 rounded-xl bg-[#EFEAF6] hover:bg-[#A995C8]/30 text-[#493451] text-xs font-semibold inline-flex items-center justify-center gap-1.5"
            >
              <span>Open Real YouTube Search</span>
              <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
            </a>
          </div>
          );
        })()}

        {/* 3. GOOGLE CHROME / SEARCH DEMO VIEW */}
        {!showHomeScreen && activeAppId === 'chrome' && (() => {
          const ch = payload.chromeState || {
            addressBar: 'https://www.google.com',
            query: 'Senior Citizen Schemes',
            typedQuery: 'Senior Citizen Schemes',
            results: buildExampleSearchResults('Senior Citizen Schemes'),
            searchUrl: 'https://www.google.com',
            searchActive: false,
            isLoading: false,
          };
          return (
          <div className="bg-[#FFFCF7] p-4 space-y-3">
            {/* Chrome Address & Search Bar */}
            <div
              className={`rounded-xl border px-3 py-2 space-y-1 transition-colors ${
                ch.searchActive ||
                simPhase === 'activating_search' ||
                simPhase === 'typing_input'
                  ? 'border-[#493451] bg-[#FFFCF7] ring-2 ring-[#A995C8]/40'
                  : 'border-[var(--sahaaya-border)] bg-[#F7F1E8]'
              }`}
            >
              <p className="text-[11px] text-[#5C5363] truncate">
                {openedChromeResultIdx !== null && ch.results[openedChromeResultIdx]
                  ? `https://${ch.results[openedChromeResultIdx].domain}/info`
                  : ch.addressBar}
              </p>
              <div className="flex items-center gap-2">
                <Search className="w-4 h-4 text-[#493451] shrink-0" aria-hidden="true" />
                <span className="text-sm font-semibold text-[#302B33] truncate">
                  {chromeTypedDisplay ||
                    (simPhase === 'activating_search'
                      ? 'Search Google or type URL...'
                      : ch.query || 'Google Chrome ready')}
                  {simPhase === 'typing_input' && (
                    <span className="inline-block w-0.5 h-3.5 bg-[#493451] ml-0.5 align-middle animate-sahaaya-caret" />
                  )}
                </span>
              </div>
            </div>

            {/* Loading Bar during Search Submission */}
            {(ch.isLoading || simPhase === 'submitting_search') && (
              <div className="space-y-2 py-3 text-center">
                <div className="h-1.5 w-full rounded-full bg-[#EFEAF6] overflow-hidden">
                  <div className="h-full w-2/3 rounded-full bg-[#493451] animate-pulse" />
                </div>
                <p className="text-xs font-medium text-[#5C5363] inline-flex items-center gap-1.5">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-[#493451]" aria-hidden="true" />
                  <span>Searching in Chrome Demo...</span>
                </p>
              </div>
            )}

            {/* In-Phone Selected Result Detail View */}
            {openedChromeResultIdx !== null && ch.results[openedChromeResultIdx] ? (
              <div className="rounded-2xl border border-[#493451]/30 bg-[#F7F1E8] p-3.5 space-y-2.5">
                <button
                  type="button"
                  onClick={() => setOpenedChromeResultIdx(null)}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-[#493451] hover:underline cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Back to Search Results</span>
                </button>
                <p className="text-[11px] font-semibold text-[#648F83]">
                  {ch.results[openedChromeResultIdx].domain} · Simulated Webpage
                </p>
                <h3 className="text-sm font-bold text-[#302B33]">
                  {ch.results[openedChromeResultIdx].title}
                </h3>
                <p className="text-xs text-[#5C5363] leading-relaxed">
                  {ch.results[openedChromeResultIdx].summary}
                </p>
                <div className="rounded-xl bg-[#FFFCF7] border border-[var(--sahaaya-border)] p-2.5 text-[11px] text-[#302B33]">
                  Example preview page inside Sahaaya Demo. Use “Open Real Google Search” below to visit live websites in a new tab.
                </div>
              </div>
            ) : (simPhase === 'showing_results' ||
                simPhase === 'completed' ||
                !simPhase) &&
              ch.results.length > 0 ? (
              <div className="space-y-2">
                <p className="text-[11px] font-semibold text-[#5C5363]">
                  Tap any result to preview in Chrome Demo:
                </p>
                {ch.results.map((item, idx) => (
                  <button
                    key={item.title}
                    type="button"
                    onClick={() => setOpenedChromeResultIdx(idx)}
                    className="w-full text-left rounded-xl border border-[var(--sahaaya-border)] bg-[#F7F1E8] hover:bg-[#EFEAF6] p-3 space-y-1 transition-colors cursor-pointer"
                  >
                    <p className="text-[11px] font-semibold text-[#648F83]">
                      {item.domain}
                    </p>
                    <p className="text-sm font-bold text-[#493451]">{item.title}</p>
                    <p className="text-xs text-[#5C5363] leading-relaxed">
                      {item.summary}
                    </p>
                  </button>
                ))}
              </div>
            ) : simPhase &&
              simPhase !== 'submitting_search' &&
              simPhase !== 'showing_results' &&
              simPhase !== 'completed' ? (
              <p className="text-xs text-[#5C5363] py-3 text-center">
                {simPhase === 'opening_app'
                  ? 'Chrome browser opening...'
                  : simPhase === 'activating_search'
                    ? 'Search bar activated...'
                    : 'Typing your search query...'}
              </p>
            ) : null}

            <a
              href={ch.searchUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="min-h-[42px] w-full px-3 py-2 rounded-xl bg-[#EFEAF6] hover:bg-[#A995C8]/30 text-[#493451] text-xs font-semibold inline-flex items-center justify-center gap-1.5"
            >
              <span>Open Real Google Search</span>
              <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
            </a>
          </div>
          );
        })()}

        {/* 4. GOOGLE MAPS DEMO VIEW */}
        {!showHomeScreen && activeAppId === 'maps' && (() => {
          const mp = payload.mapsState || {
            query: 'Nearby Pharmacies',
            destination: 'Nearby Pharmacies',
            originLabel: 'Example Demo Area',
            isRealLocation: false,
            places: buildExampleMapPlaces('pharmacies'),
            routeSummary: 'Simulated nearby places preview.',
            mapsUrl: 'https://maps.google.com',
          };
          return (
          <div className="bg-[#FFFCF7] p-4 space-y-3">
            {/* Maps Top Search Bar */}
            <div
              className={`flex items-center gap-2 rounded-xl border px-3 py-2 transition-colors ${
                mp.searchActive ||
                simPhase === 'activating_search' ||
                simPhase === 'typing_input'
                  ? 'border-[#493451] bg-[#FFFCF7] ring-2 ring-[#A995C8]/40'
                  : 'border-[var(--sahaaya-border)] bg-[#F7F1E8]'
              }`}
            >
              <MapPin className="w-4 h-4 text-[#D98570] shrink-0" aria-hidden="true" />
              <span className="text-sm font-medium text-[#302B33] truncate">
                {mapsTypedDisplay ||
                  (simPhase === 'activating_search'
                    ? 'Search Google Maps...'
                    : mp.query)}
                {simPhase === 'typing_input' && (
                  <span className="inline-block w-0.5 h-3.5 bg-[#493451] ml-0.5 align-middle animate-sahaaya-caret" />
                )}
              </span>
            </div>

            {/* Location Permission Check Step */}
            {(mp.locationPromptVisible || simPhase === 'requesting_location') && (
              <div className="rounded-xl bg-[#EFEAF6] border border-[#A995C8]/60 p-3 text-xs text-[#302B33] space-y-1">
                <p className="font-bold text-[#493451] flex items-center gap-1.5">
                  <Navigation className="w-3.5 h-3.5 text-[#493451]" aria-hidden="true" />
                  <span>Checking Location Permission</span>
                </p>
                <p className="text-[#5C5363]">
                  {mp.isRealLocation
                    ? 'Using your permitted browser location for nearby search.'
                    : 'Real GPS location is not required in Demo Mode — preparing clearly labelled example nearby places.'}
                </p>
              </div>
            )}

            {(simPhase === 'completed' || simPhase === 'showing_results' || !simPhase) && (
              <>
                {/* Visual Map Canvas Preview */}
                <div className="rounded-2xl border border-[var(--sahaaya-border)] bg-[#EAF2EF]/75 p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-[#302B33] truncate">
                      {mp.destination}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#FFFCF7] text-[#493451] shrink-0">
                      {mp.isRealLocation ? 'REAL LOCATION' : 'EXAMPLE DATA'}
                    </span>
                  </div>

                  {/* Stylized Pin Row */}
                  <div className="rounded-xl bg-[#FFFCF7]/80 border border-[#648F83]/25 p-2.5 flex items-center justify-around">
                    {mp.places.map((place, idx) => (
                      <button
                        key={place.name}
                        type="button"
                        onClick={() => setSelectedMapPlaceIdx(idx)}
                        className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg cursor-pointer transition-all ${
                          selectedMapPlaceIdx === idx
                            ? 'bg-[#EFEAF6] ring-1 ring-[#493451]'
                            : 'opacity-75 hover:opacity-100'
                        }`}
                      >
                        <MapPin
                          className={`w-4 h-4 ${
                            selectedMapPlaceIdx === idx ? 'text-[#D98570]' : 'text-[#648F83]'
                          }`}
                          aria-hidden="true"
                        />
                        <span className="text-[10px] font-bold text-[#302B33]">
                          {place.distance}
                        </span>
                      </button>
                    ))}
                  </div>

                  <p className="text-[11px] text-[#5C5363]">
                    Origin: {mp.originLabel}
                  </p>
                </div>

                {/* Selectable Nearby Places */}
                <div className="space-y-2">
                  {mp.places.map((place, idx) => {
                    const isSelected = idx === selectedMapPlaceIdx;
                    return (
                      <button
                        key={place.name}
                        type="button"
                        onClick={() => setSelectedMapPlaceIdx(idx)}
                        className={`w-full text-left rounded-xl border px-3 py-2.5 cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-[#EFEAF6] border-[#493451]/45 ring-1 ring-[#493451]/30'
                            : 'bg-[#F7F1E8] hover:bg-[#EFEAF6]/60 border-[var(--sahaaya-border)]'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold text-[#302B33]">
                            {place.name}
                          </span>
                          <span className="text-[11px] font-semibold text-[#648F83] shrink-0">
                            {place.distance}
                          </span>
                        </div>
                        <p className="text-[11px] text-[#5C5363] mt-0.5">{place.note}</p>
                      </button>
                    );
                  })}
                </div>
              </>
            )}

            <a
              href={mp.mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="min-h-[42px] w-full px-3 py-2 rounded-xl bg-[#EFEAF6] hover:bg-[#A995C8]/30 text-[#493451] text-xs font-semibold inline-flex items-center justify-center gap-1.5"
            >
              <span>Open Real Google Maps</span>
              <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
            </a>
          </div>
          );
        })()}

        {/* 5. SPOTIFY MUSIC PREVIEW VIEW */}
        {!showHomeScreen && activeAppId === 'spotify' && (
          <div className="bg-[#FFFCF7] p-4 space-y-3">
            <div className="rounded-xl bg-[#EAF2EF] border border-[#648F83]/40 px-3 py-2 text-[11px] font-bold text-[#302B33] text-center">
              SIMULATED SPOTIFY PREVIEW · No real music streaming API
            </div>

            <div
              className={`flex items-center gap-2 rounded-xl border px-3 py-2 transition-colors ${
                payload.spotifyState?.searchActive ||
                simPhase === 'activating_search' ||
                simPhase === 'typing_input'
                  ? 'border-[#493451] bg-[#FFFCF7] ring-2 ring-[#A995C8]/40'
                  : 'border-[var(--sahaaya-border)] bg-[#F7F1E8]'
              }`}
            >
              <Music className="w-4 h-4 text-[#648F83] shrink-0" aria-hidden="true" />
              <span className="text-sm text-[#302B33] font-medium truncate">
                {spTypedDisplay ||
                  (simPhase === 'activating_search'
                    ? 'Search songs, devotional, artists...'
                    : payload.spotifyState?.query || 'Relaxing music')}
                {simPhase === 'typing_input' && (
                  <span className="inline-block w-0.5 h-3.5 bg-[#493451] ml-0.5 align-middle animate-sahaaya-caret" />
                )}
              </span>
            </div>

            {spPlayerVisible && activeSpotifyTrack && (
              <div className="rounded-2xl bg-[#302B33] text-[#FFFCF7] p-3.5 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-bold truncate">{activeSpotifyTrack.title}</p>
                    <p className="text-[11px] text-[#FFFCF7]/75 truncate">
                      {activeSpotifyTrack.artist} · {activeSpotifyTrack.album}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setSpotifyPlayingOverride((prev) => !(prev ?? isSpPlaying))
                    }
                    aria-label={isSpPlaying ? 'Pause Spotify preview' : 'Play Spotify preview'}
                    className="w-10 h-10 rounded-full bg-[#648F83] hover:bg-[#53786d] text-[#FFFCF7] flex items-center justify-center shrink-0 cursor-pointer"
                  >
                    {isSpPlaying ? (
                      <Pause className="w-4 h-4" aria-hidden="true" />
                    ) : (
                      <Play className="w-4 h-4 ml-0.5" aria-hidden="true" />
                    )}
                  </button>
                </div>

                <div className="h-1.5 w-full rounded-full bg-[#5C5363]">
                  <div
                    className="h-full rounded-full bg-[#648F83] transition-all duration-500"
                    style={{
                      width: `${Math.min(100, Math.max(8, Math.round((spElapsedSec / 252) * 100)))}%`,
                    }}
                  />
                </div>

                <div className="flex items-center justify-between text-[10px] text-[#FFFCF7]/80 tabular-nums">
                  <span>{isSpPlaying ? 'Playing simulated preview' : 'Paused'}</span>
                  <span>
                    {formatPlaybackSeconds(spElapsedSec)} / {activeSpotifyTrack.duration}
                  </span>
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <p className="text-[11px] font-semibold text-[#5C5363]">
                Simulated tracks (tap to preview):
              </p>
              {spotifyTracks.map((track, idx) => (
                <button
                  key={track.id}
                  type="button"
                  onClick={() => {
                    setSelectedSpotifyTrackIdx(idx);
                    setSpElapsedSec(0);
                    setSpotifyPlayingOverride(true);
                  }}
                  className={`w-full text-left rounded-xl border px-3 py-2 text-xs cursor-pointer transition-colors ${
                    idx === selectedSpotifyTrackIdx
                      ? 'bg-[#EFEAF6] border-[#493451]/45 font-semibold text-[#493451]'
                      : 'bg-[#F7F1E8] hover:bg-[#EFEAF6]/60 border-[var(--sahaaya-border)] text-[#302B33]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate font-bold">{track.title}</span>
                    <span className="text-[11px] text-[#5C5363] shrink-0">
                      {track.duration}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#5C5363] truncate">{track.artist}</p>
                </button>
              ))}
            </div>

            <a
              href={
                payload.spotifyState?.spotifyUrl ||
                'https://open.spotify.com/search/relaxing%20music'
              }
              target="_blank"
              rel="noopener noreferrer"
              className="min-h-[42px] w-full px-3 py-2 rounded-xl bg-[#EFEAF6] hover:bg-[#A995C8]/30 text-[#493451] text-xs font-semibold inline-flex items-center justify-center gap-1.5"
            >
              <span>Open Real Spotify Web</span>
              <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
            </a>
          </div>
        )}

        {/* 6. REAL DETERMINISTIC CALCULATOR VIEW */}
        {!showHomeScreen && activeAppId === 'calculator' && (
          <div className="bg-[#FFFCF7] p-4 space-y-3">
            <div className="flex items-center gap-2 pb-1 border-b border-[var(--sahaaya-border)]">
              <Calculator className="w-4 h-4 text-[#493451]" aria-hidden="true" />
              <span className="text-sm font-bold text-[#302B33]">Calculator (Demo)</span>
            </div>

            <div className="rounded-2xl bg-[#F7F1E8] border border-[var(--sahaaya-border)] p-3 text-right space-y-0.5">
              <p className="text-xs text-[#5C5363] truncate min-h-[16px]">
                {calcExpr || 'Enter numbers or ask Sahaaya'}
              </p>
              <p
                className={`font-display text-2xl font-bold tabular-nums break-words ${
                  calcError ? 'text-[#D98570] text-base' : 'text-[#302B33]'
                }`}
              >
                {calcDisplay}
              </p>
            </div>

            <div className="grid grid-cols-4 gap-1.5">
              {[
                'C',
                '⌫',
                '%',
                '/',
                '7',
                '8',
                '9',
                '*',
                '4',
                '5',
                '6',
                '-',
                '1',
                '2',
                '3',
                '+',
                '0',
                '.',
                '(',
                '=',
              ].map((key) => {
                const isOp = ['/', '*', '-', '+', '%', '='].includes(key);
                const isEquals = key === '=';
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleCalculatorKey(key)}
                    aria-label={key === '⌫' ? 'Backspace' : key === 'C' ? 'Clear' : key}
                    className={`min-h-[42px] rounded-xl font-bold text-sm cursor-pointer transition-colors ${
                      isEquals
                        ? 'bg-[#493451] hover:bg-[#3A2841] text-[#FFFCF7]'
                        : isOp
                          ? 'bg-[#A995C8]/30 hover:bg-[#A995C8]/45 text-[#493451]'
                          : key === 'C'
                            ? 'bg-[#FBEEE9] text-[#B65E47]'
                            : 'bg-[#F7F1E8] hover:bg-[#EFEAF6] text-[#302B33]'
                    }`}
                  >
                    {key === '⌫' ? <Delete className="w-4 h-4 mx-auto" /> : key}
                  </button>
                );
              })}
            </div>

            {calcHistory.length > 0 && (
              <div className="rounded-xl bg-[#F7F1E8] px-3 py-2 space-y-1">
                <p className="text-[11px] font-semibold text-[#5C5363]">Recent:</p>
                {calcHistory.map((item, i) => (
                  <p key={`${item.expression}-${i}`} className="text-xs text-[#302B33] tabular-nums">
                    {item.expression} = <span className="font-bold">{item.result}</span>
                  </p>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 7. USABLE SIMULATED CALENDAR VIEW */}
        {!showHomeScreen && activeAppId === 'calendar' && (() => {
          const grid = buildCalendarMonthGrid(calYear, calMonth);
          const eventsForSelected = calEvents.filter((e) => e.date === calSelectedDate);
          return (
            <div className="bg-[#FFFCF7] p-4 space-y-3">
              <div className="rounded-xl bg-[#FBEEE9] border border-[#D98570]/45 px-2.5 py-1.5 text-[11px] font-semibold text-[#493451] text-center">
                Simulated local calendar — no real phone calendar or alarm created
              </div>

              {/* Month Header + Prev/Next */}
              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (calMonth === 0) {
                      setCalMonth(11);
                      setCalYear((y) => y - 1);
                    } else {
                      setCalMonth((m) => m - 1);
                    }
                  }}
                  aria-label="Previous month"
                  className="w-8 h-8 rounded-lg bg-[#EFEAF6] hover:bg-[#A995C8]/35 text-[#493451] flex items-center justify-center cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" aria-hidden="true" />
                </button>
                <span className="text-sm font-bold text-[#302B33]">{grid.monthLabel}</span>
                <button
                  type="button"
                  onClick={() => {
                    if (calMonth === 11) {
                      setCalMonth(0);
                      setCalYear((y) => y + 1);
                    } else {
                      setCalMonth((m) => m + 1);
                    }
                  }}
                  aria-label="Next month"
                  className="w-8 h-8 rounded-lg bg-[#EFEAF6] hover:bg-[#A995C8]/35 text-[#493451] flex items-center justify-center cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>

              {/* Weekday Headers & Grid */}
              <div className="grid grid-cols-7 gap-1 text-center">
                {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
                  <span key={d} className="text-[10px] font-bold text-[#5C5363] py-0.5">
                    {d}
                  </span>
                ))}
                {grid.cells.map((cell) => {
                  const hasEvent = calEvents.some((ev) => ev.date === cell.dateStr);
                  const isSelected = cell.dateStr === calSelectedDate;
                  return (
                    <button
                      key={cell.dateStr}
                      type="button"
                      onClick={() => setCalSelectedDate(cell.dateStr)}
                      className={`min-h-[30px] rounded-lg text-xs font-semibold flex flex-col items-center justify-center relative cursor-pointer ${
                        isSelected
                          ? 'bg-[#493451] text-[#FFFCF7]'
                          : cell.isToday
                            ? 'bg-[#FBEEE9] text-[#493451] ring-1 ring-[#D98570]'
                            : cell.inCurrentMonth
                              ? 'bg-[#F7F1E8] hover:bg-[#EFEAF6] text-[#302B33]'
                              : 'text-[#5C5363]/45'
                      }`}
                    >
                      <span>{cell.dayNumber}</span>
                      {hasEvent && (
                        <span
                          className={`w-1 h-1 rounded-full mt-0.5 ${
                            isSelected ? 'bg-[#FFFCF7]' : 'bg-[#648F83]'
                          }`}
                        />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Quick Add Event for Selected Date */}
              <div className="rounded-xl bg-[#F7F1E8] border border-[var(--sahaaya-border)] p-2.5 space-y-2">
                <p className="text-[11px] font-bold text-[#493451]">
                  Events on {calSelectedDate}
                </p>
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    value={calNewTitle}
                    onChange={(e) => setCalNewTitle(e.target.value)}
                    placeholder="Event title"
                    aria-label="New simulated calendar event title"
                    className="flex-1 min-w-0 rounded-lg border border-[var(--sahaaya-border)] bg-[#FFFCF7] px-2 py-1 text-xs text-[#302B33]"
                  />
                  <input
                    type="text"
                    value={calNewTime}
                    onChange={(e) => setCalNewTime(e.target.value)}
                    placeholder="10:00 AM"
                    aria-label="New simulated calendar event time"
                    className="w-20 rounded-lg border border-[var(--sahaaya-border)] bg-[#FFFCF7] px-2 py-1 text-xs text-[#302B33]"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (!calNewTitle.trim()) return;
                      const ev = createDemoCalendarEvent(
                        calNewTitle.trim(),
                        calSelectedDate,
                        calNewTime.trim() || 'All day'
                      );
                      setCalEvents((prev) => addDemoCalendarEventToStore(ev, prev));
                      setCalNewTitle('');
                    }}
                    aria-label="Add simulated event"
                    className="px-2.5 py-1 rounded-lg bg-[#493451] text-[#FFFCF7] text-xs font-semibold inline-flex items-center gap-1 cursor-pointer shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Add</span>
                  </button>
                </div>

                {(eventsForSelected.length > 0 ? eventsForSelected : calEvents.slice(0, 3)).length ===
                0 ? (
                  <p className="text-[11px] text-[#5C5363]">
                    No simulated events yet. Tap Add or tell Sahaaya.
                  </p>
                ) : (
                  <div className="space-y-1.5">
                    {(eventsForSelected.length > 0
                      ? eventsForSelected
                      : calEvents.slice(0, 3)
                    ).map((ev) => {
                      const isEditing = editingEventId === ev.id;
                      if (isEditing) {
                        return (
                          <div
                            key={ev.id}
                            className="rounded-lg bg-[#FFFCF7] border border-[#493451]/40 p-2 space-y-1.5"
                          >
                            <div className="flex gap-1.5">
                              <input
                                type="text"
                                value={editEventTitle}
                                onChange={(e) => setEditEventTitle(e.target.value)}
                                aria-label="Edit simulated event title"
                                className="flex-1 min-w-0 rounded-md border border-[var(--sahaaya-border)] bg-[#F7F1E8] px-2 py-1 text-xs text-[#302B33]"
                              />
                              <input
                                type="text"
                                value={editEventTime}
                                onChange={(e) => setEditEventTime(e.target.value)}
                                aria-label="Edit simulated event time"
                                className="w-20 rounded-md border border-[var(--sahaaya-border)] bg-[#F7F1E8] px-2 py-1 text-xs text-[#302B33]"
                              />
                            </div>
                            <div className="flex gap-1.5 justify-end">
                              <button
                                type="button"
                                onClick={() => setEditingEventId(null)}
                                className="px-2 py-1 rounded-md border border-[var(--sahaaya-border)] text-[11px] font-semibold text-[#5C5363] cursor-pointer"
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  const res = updateDemoCalendarEventInStore(
                                    ev.id,
                                    {
                                      title: editEventTitle.trim() || ev.title,
                                      time: editEventTime.trim() || ev.time,
                                    },
                                    calEvents
                                  );
                                  setCalEvents(res.events);
                                  setEditingEventId(null);
                                }}
                                className="px-2.5 py-1 rounded-md bg-[#493451] text-[#FFFCF7] text-[11px] font-semibold cursor-pointer"
                              >
                                Save
                              </button>
                            </div>
                          </div>
                        );
                      }

                      return (
                        <div
                          key={ev.id}
                          className="rounded-lg bg-[#FFFCF7] border border-[var(--sahaaya-border)] px-2.5 py-1.5 flex items-center justify-between gap-2"
                        >
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-[#302B33] truncate">
                              {ev.title}
                            </p>
                            <p className="text-[10px] text-[#5C5363]">
                              {ev.date} · {ev.time} (Demo)
                            </p>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingEventId(ev.id);
                                setEditEventTitle(ev.title);
                                setEditEventTime(ev.time);
                              }}
                              aria-label={`Edit ${ev.title}`}
                              className="p-1.5 rounded-lg text-[#493451] hover:bg-[#EFEAF6] cursor-pointer"
                            >
                              <Pencil className="w-3.5 h-3.5" aria-hidden="true" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const res = deleteDemoCalendarEventFromStore(ev.id, calEvents);
                                setCalEvents(res.events);
                              }}
                              aria-label={`Delete ${ev.title}`}
                              className="p-1.5 rounded-lg text-[#D98570] hover:bg-[#FBEEE9] cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          );
        })()}

        {/* 8. NATIVE DEVICE APPS (CAMERA, SETTINGS, PHONE, MESSAGES) */}
        {!showHomeScreen &&
          (activeAppId === 'camera' ||
            activeAppId === 'settings' ||
            activeAppId === 'phone' ||
            activeAppId === 'messages') && (
          <div className="bg-[#FFFCF7] p-4 space-y-3">
            <div className="flex items-center gap-2.5 pb-2 border-b border-[var(--sahaaya-border)]">
              {activeAppId === 'camera' && (
                <Camera className="w-5 h-5 text-[#493451]" aria-hidden="true" />
              )}
              {activeAppId === 'settings' && (
                <Settings className="w-5 h-5 text-[#493451]" aria-hidden="true" />
              )}
              {activeAppId === 'phone' && (
                <Phone className="w-5 h-5 text-[#493451]" aria-hidden="true" />
              )}
              {activeAppId === 'messages' && (
                <MessageSquare className="w-5 h-5 text-[#493451]" aria-hidden="true" />
              )}
              <div>
                <p className="text-sm font-bold text-[#302B33]">
                  {activeAppId === 'camera'
                    ? 'Camera (Simulated)'
                    : activeAppId === 'settings'
                      ? 'Phone Settings (Simulated)'
                      : activeAppId === 'messages'
                        ? 'Messages (Simulated)'
                        : 'Phone Dialer (Simulated)'}
                </p>
                <p className="text-[11px] text-[#5C5363]">
                  SIMULATED — DEMO MODE
                </p>
              </div>
            </div>

            {activeAppId === 'camera' ? (
              <div className="space-y-3">
                <div className="aspect-[4/3] rounded-2xl bg-[#302B33] text-[#FFFCF7] flex flex-col items-center justify-center p-4 text-center border border-[var(--sahaaya-border)]">
                  <Camera className="w-10 h-10 text-[#A995C8] mb-2" aria-hidden="true" />
                  <p className="text-xs font-semibold">
                    {cameraCaptured
                      ? 'Demo Shutter Clicked (No real photo saved)'
                      : 'Simulated Camera Viewfinder'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setCameraCaptured((prev) => !prev)}
                  className="min-h-[42px] w-full rounded-xl bg-[#493451] text-[#FFFCF7] text-xs font-semibold cursor-pointer"
                >
                  {cameraCaptured ? 'Reset Demo Viewfinder' : 'Simulate Capture Button'}
                </button>
              </div>
            ) : activeAppId === 'phone' ? (
              <div className="space-y-2.5">
                <div className="rounded-xl bg-[#F7F1E8] border border-[var(--sahaaya-border)] px-3 py-2 text-center">
                  <p className="font-display text-lg font-bold text-[#302B33] tabular-nums min-h-[28px]">
                    {dialedNumber || 'Enter number'}
                  </p>
                  {isDemoCallActive && (
                    <p className="text-[11px] font-bold text-[#648F83]">
                      Simulated Call Preview (No real phone call placed)
                    </p>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  {['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'].map((k) => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => setDialedNumber((p) => `${p}${k}`)}
                      className="min-h-[38px] rounded-xl bg-[#EFEAF6] hover:bg-[#A995C8]/35 text-[#493451] font-bold text-sm cursor-pointer"
                    >
                      {k}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsDemoCallActive((p) => !p)}
                    className={`flex-1 min-h-[40px] rounded-xl text-xs font-bold cursor-pointer ${
                      isDemoCallActive
                        ? 'bg-[#D98570] text-[#FFFCF7]'
                        : 'bg-[#648F83] text-[#FFFCF7]'
                    }`}
                  >
                    {isDemoCallActive ? 'End Demo Call' : 'Simulate Call'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDialedNumber('');
                      setIsDemoCallActive(false);
                    }}
                    className="px-3 min-h-[40px] rounded-xl border border-[var(--sahaaya-border)] text-xs font-semibold text-[#5C5363] cursor-pointer"
                  >
                    Clear
                  </button>
                </div>
              </div>
            ) : activeAppId === 'messages' ? (
              <div className="space-y-2.5">
                <div className="space-y-1.5">
                  {(payload.messagesState?.inbox || [
                    {
                      id: 'sms-1',
                      sender: 'Pharmacy Desk (Demo)',
                      text: 'Your prescription refill is ready.',
                      time: '10:30 AM',
                    },
                  ]).map((sms) => (
                    <div
                      key={sms.id}
                      className="rounded-xl bg-[#F7F1E8] border border-[var(--sahaaya-border)] px-3 py-2"
                    >
                      <div className="flex justify-between text-[11px] font-bold text-[#493451]">
                        <span>{sms.sender}</span>
                        <span className="text-[#5C5363] font-normal">{sms.time}</span>
                      </div>
                      <p className="text-xs text-[#302B33] mt-0.5">{sms.text}</p>
                    </div>
                  ))}
                  {smsSentList.map((m) => (
                    <div
                      key={m.id}
                      className="rounded-xl bg-[#648F83] text-[#FFFCF7] px-3 py-2 text-xs ml-6"
                    >
                      {m.text} (Demo SMS)
                    </div>
                  ))}
                </div>
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    value={smsDraft}
                    onChange={(e) => setSmsDraft(e.target.value)}
                    placeholder="Type demo SMS..."
                    aria-label="Type simulated SMS"
                    className="flex-1 rounded-xl border border-[var(--sahaaya-border)] bg-[#F7F1E8] px-2.5 py-2 text-xs text-[#302B33]"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (!smsDraft.trim()) return;
                      setSmsSentList((p) => [
                        ...p,
                        { id: `sms-out-${Date.now()}`, text: smsDraft.trim() },
                      ]);
                      setSmsDraft('');
                    }}
                    aria-label="Send simulated SMS"
                    className="px-3 rounded-xl bg-[#493451] text-[#FFFCF7] text-xs font-semibold cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {(payload.deviceAppState?.items || [
                  { id: 'wifi', label: 'Wi-Fi', value: 'Connected (Demo)', active: true },
                  { id: 'font', label: 'Display Text Size', value: 'Large (Accessible)', active: true },
                  { id: 'volume', label: 'Voice Volume', value: 'High (85%)' },
                ]).map((item) => {
                  const isOn =
                    item.id in settingsToggles ? settingsToggles[item.id] : Boolean(item.active);
                  return (
                    <div
                      key={item.id}
                      className="rounded-xl border border-[var(--sahaaya-border)] bg-[#F7F1E8] px-3 py-2.5 flex items-center justify-between gap-2"
                    >
                      <div>
                        <p className="text-xs font-bold text-[#302B33]">{item.label}</p>
                        <p className="text-[11px] text-[#5C5363]">{item.value}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setSettingsToggles((prev) => ({
                            ...prev,
                            [item.id]: !isOn,
                          }))
                        }
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer ${
                          isOn
                            ? 'bg-[#648F83] text-[#FFFCF7]'
                            : 'bg-[#EFEAF6] text-[#5C5363]'
                        }`}
                      >
                        {isOn ? 'ON' : 'OFF'}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* 6. WELFARE FORM LIVE POPULATION PREVIEW */}
        {payload.appId === 'welfare_form' && payload.formState && (() => {
          const liveData = applicationData || payload.formState.data;
          const liveStats = getCompletionStats(liveData);
          return (
            <div className="bg-[#FFFCF7] p-4 space-y-2.5">
              <div className="flex items-center justify-between text-xs font-semibold text-[#493451]">
                <span>Live Form Progress</span>
                <span>
                  {liveStats.filledCount} / {liveStats.totalCount}
                </span>
              </div>
              <div className="space-y-1.5">
                {APPLICATION_FIELD_ORDER.slice(0, 5).map((f) => {
                  const val = liveData[f] || '';
                  const isActive = payload.formState?.activeField === f;
                  return (
                    <div
                      key={f}
                      className={`rounded-lg px-2.5 py-1.5 text-xs flex items-center justify-between gap-2 border ${
                        isActive
                          ? 'bg-[#EFEAF6] border-[#493451]/40'
                          : 'bg-[#F7F1E8] border-[var(--sahaaya-border)]'
                      }`}
                    >
                      <span className="font-medium text-[#5C5363] truncate">
                        {t.fields[f].label}
                      </span>
                      <span className="font-semibold text-[#302B33] truncate flex items-center gap-1">
                        {val ? (
                          <>
                            <Check className="w-3 h-3 text-[#648F83]" aria-hidden="true" />
                            <span>{val}</span>
                          </>
                        ) : (
                          '—'
                        )}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}
      </div>
    </section>
  );
}
