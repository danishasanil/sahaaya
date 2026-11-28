import {
  ApplicationData,
  ApplicationFieldKey,
  AssistantTask,
  ExecutionMode,
  LanguageCode,
  PlatformCapabilities,
  TaskExecutionStatus,
} from '../types/sahaaya';
import {
  DemoAppId,
  DemoDeviceAppState,
  DemoExecutionSession,
  DemoExecutionStatus,
  DemoExecutionStep,
  DemoSimulationPayload,
  DemoSimulatorPhase,
} from '../types/demoExecution';
import { getCompletionStats } from './applicationLogic';
import {
  advanceTaskConversation,
  classifyPendingConfirmationReply,
  parseNaturalCommand,
} from './commandIntentEngine';
import { evaluateMathExpression } from './calculatorEngine';
import {
  addDemoCalendarEventToStore,
  createDemoCalendarEvent,
  deleteDemoCalendarEventFromStore,
  formatIsoDate,
  loadDemoCalendarEvents,
  updateDemoCalendarEventInStore,
} from './calendarEngine';
import {
  buildExampleMapPlaces,
  buildExampleSearchResults,
  buildExampleSpotifyTracks,
  DEMO_APP_REGISTRY,
  getRealUrlForTask,
  resolveDemoAppId,
} from './demoAppRegistry';
import {
  createBrowserExecutionAdapter,
  executeConfirmedTask,
  PlatformExecutionAdapter,
} from './platformExecutor';

function getStepTemplates(
  appId: DemoAppId,
  appName: string,
  actionLabel: string
): Array<{ id: string; label: string; phase?: DemoSimulatorPhase }> {
  if (appId === 'chrome') {
    return [
      { id: 'home', label: 'Simulated smartphone home screen', phase: 'home_screen' },
      { id: 'select', label: 'Selecting Chrome icon', phase: 'selecting_app' },
      { id: 'open', label: 'Opening Chrome browser', phase: 'opening_app' },
      { id: 'activate', label: 'Activating search & address bar', phase: 'activating_search' },
      { id: 'type', label: 'Typing search text', phase: 'typing_input' },
      { id: 'submit', label: 'Initiating search', phase: 'submitting_search' },
      { id: 'results', label: 'Displaying search results', phase: 'showing_results' },
      { id: 'ready', label: 'Results selectable in browser', phase: 'completed' },
    ];
  }
  if (appId === 'whatsapp') {
    return [
      { id: 'home', label: 'Simulated smartphone home screen', phase: 'home_screen' },
      { id: 'open', label: 'Opening WhatsApp', phase: 'opening_app' },
      { id: 'contacts', label: 'Showing chat & contact list', phase: 'contact_list' },
      { id: 'select_contact', label: 'Selecting contact', phase: 'selecting_contact' },
      { id: 'chat', label: 'Opening chat screen', phase: 'opening_chat' },
      { id: 'type', label: 'Typing message character by character', phase: 'typing_input' },
      { id: 'send', label: 'Pressing Send in simulation', phase: 'pressing_send' },
      { id: 'sent', label: 'Message shown with simulated sent indicator', phase: 'completed' },
    ];
  }
  if (appId === 'youtube') {
    return [
      { id: 'home', label: 'Simulated smartphone home screen', phase: 'home_screen' },
      { id: 'open', label: 'Opening YouTube application', phase: 'opening_app' },
      { id: 'activate', label: 'Activating search bar', phase: 'activating_search' },
      { id: 'type', label: 'Typing search query', phase: 'typing_input' },
      { id: 'results', label: 'Showing video search results', phase: 'showing_results' },
      { id: 'select_video', label: 'Selecting video result', phase: 'selecting_result' },
      { id: 'player', label: 'Opening video player with play/pause controls', phase: 'completed' },
    ];
  }
  if (appId === 'maps') {
    return [
      { id: 'home', label: 'Simulated smartphone home screen', phase: 'home_screen' },
      { id: 'open', label: 'Opening Google Maps interface', phase: 'opening_app' },
      { id: 'activate', label: 'Activating Maps search bar', phase: 'activating_search' },
      { id: 'type', label: 'Entering search query', phase: 'typing_input' },
      { id: 'location', label: 'Checking location permission', phase: 'requesting_location' },
      { id: 'results', label: 'Showing selectable nearby places', phase: 'completed' },
    ];
  }

  if (appId === 'spotify') {
    return [
      { id: 'home', label: 'Simulated smartphone home screen', phase: 'home_screen' },
      { id: 'open', label: 'Opening Spotify preview', phase: 'opening_app' },
      { id: 'activate', label: 'Activating music search', phase: 'activating_search' },
      { id: 'type', label: 'Typing music query', phase: 'typing_input' },
      { id: 'results', label: 'Showing simulated tracks', phase: 'showing_results' },
      { id: 'select_track', label: 'Selecting track preview', phase: 'selecting_result' },
      { id: 'player', label: 'Opening audio preview player', phase: 'completed' },
    ];
  }
  if (appId === 'calculator') {
    return [
      { id: 'home', label: 'Simulated smartphone home screen', phase: 'home_screen' },
      { id: 'open', label: 'Opening Calculator', phase: 'opening_app' },
      { id: 'compute', label: actionLabel, phase: 'player_or_detail' },
      { id: 'done', label: 'Result displayed on Calculator', phase: 'completed' },
    ];
  }
  if (appId === 'calendar') {
    return [
      { id: 'home', label: 'Simulated smartphone home screen', phase: 'home_screen' },
      { id: 'open', label: 'Opening Simulated Calendar', phase: 'opening_app' },
      { id: 'update', label: actionLabel, phase: 'player_or_detail' },
      { id: 'done', label: 'Calendar view updated locally', phase: 'completed' },
    ];
  }

  return [
    { id: 'understand', label: 'Understanding request' },
    { id: 'prepare', label: `Preparing ${appName}` },
    { id: 'open', label: `Opening ${appName}` },
    { id: 'perform', label: actionLabel },
  ];
}

function buildSteps(
  appName: string,
  actionLabel: string,
  status: DemoExecutionStatus,
  appId: DemoAppId = 'sahaaya_home',
  simPhase?: DemoSimulatorPhase
): DemoExecutionStep[] {
  const stepLabels = getStepTemplates(appId, appName, actionLabel);

  const phaseIndex = simPhase
    ? stepLabels.findIndex((s) => s.phase === simPhase)
    : -1;

  const orderMap: Record<DemoExecutionStatus, number> = {
    understanding_request: 0,
    waiting_for_confirmation: Math.min(1, stepLabels.length - 1),
    preparing_application: 0,
    opening_application: Math.min(2, stepLabels.length - 1),
    performing_action: Math.max(1, stepLabels.length - 2),
    completed: stepLabels.length,
    simulated_completion: stepLabels.length,
    cancelled: 1,
    failed: Math.max(1, stepLabels.length - 1),
  };

  const activeIdx = phaseIndex >= 0 ? phaseIndex : orderMap[status];

  return stepLabels.map((step, idx) => {
    if (status === 'cancelled') {
      return {
        id: step.id,
        label: step.label,
        status: idx === 0 ? 'done' : idx === 1 ? 'cancelled' : 'pending',
      };
    }
    if (status === 'failed') {
      return {
        id: step.id,
        label: step.label,
        status: idx < stepLabels.length - 1 ? 'done' : 'failed',
      };
    }
    if (status === 'completed' || status === 'simulated_completion') {
      return { id: step.id, label: step.label, status: 'done' };
    }
    if (status === 'waiting_for_confirmation') {
      return {
        id: step.id,
        label: step.label,
        status: idx === 0 ? 'done' : idx === 1 ? 'active' : 'pending',
      };
    }
    if (idx < activeIdx) return { id: step.id, label: step.label, status: 'done' };
    if (idx === activeIdx) return { id: step.id, label: step.label, status: 'active' };
    return { id: step.id, label: step.label, status: 'pending' };
  });
}

function buildActionLabel(task: AssistantTask, appId: DemoAppId): string {
  if (appId === 'whatsapp') return 'Sending WhatsApp message (Demo)';
  if (appId === 'youtube') {
    return task.target && task.target !== 'YouTube'
      ? `Loading "${task.target}"`
      : 'Opening YouTube player';
  }
  if (appId === 'spotify') {
    return task.target && task.target !== 'Spotify'
      ? `Searching "${task.target}" on Spotify (Demo)`
      : 'Opening Spotify preview';
  }
  if (appId === 'calculator') {
    return task.mathExpression
      ? `Calculating ${task.mathExpression}`
      : 'Opening Calculator (Demo)';
  }
  if (appId === 'calendar') {
    if (task.action === 'add_calendar_event' && task.calendarDraft?.title) {
      return `Adding "${task.calendarDraft.title}" (Demo)`;
    }
    if (task.action === 'edit_calendar_event') {
      return 'Updating simulated calendar event';
    }
    if (task.action === 'delete_calendar_event') {
      return 'Deleting simulated calendar event';
    }
    if (task.action === 'show_calendar_events') {
      return 'Viewing upcoming demo events';
    }
    return 'Opening Calendar (Demo)';
  }
  if (appId === 'chrome') {
    return task.target && task.target !== 'Chrome' && task.target !== 'Google'
      ? `Searching "${task.target}"`
      : 'Opening browser view';
  }
  if (appId === 'maps') {
    return task.target && task.target !== 'Google Maps'
      ? `Locating "${task.target}"`
      : 'Opening Maps view';
  }
  if (appId === 'welfare_form') return 'Populating application form';
  if (task.action === 'set_alarm') {
    return task.target ? `Set alarm (${task.target})` : 'Set system alarm';
  }
  if (task.action === 'make_call') {
    return 'Place phone call';
  }
  return `Opening ${task.application || DEMO_APP_REGISTRY[appId].name}`;
}

function buildDeviceAppState(
  appId: 'camera' | 'settings' | 'phone' | 'calculator' | 'calendar' | 'messages',
  lang: LanguageCode,
  task?: AssistantTask
): DemoDeviceAppState {
  if (appId === 'camera') {
    return {
      appId,
      title: 'Camera (Simulated)',
      subtitle: 'SIMULATED — DEMO MODE · Device viewfinder preview',
      items: [
        { id: 'mode', label: 'Camera Mode', value: 'Photo · Clear Text', active: true },
        { id: 'flash', label: 'Flash', value: 'Auto' },
        { id: 'zoom', label: 'Zoom', value: '1.0x' },
      ],
      actionMessage:
        lang === 'hi'
          ? 'डेमो मोड में कैमरा प्रीव्यू खुल गया है (असली फ़ोन कैमरा नहीं खुला है)।'
          : lang === 'kn'
            ? 'ಡೆಮೊ ಮೋಡ್‌ನಲ್ಲಿ ಕ್ಯಾಮೆರಾ ಪೂರ್ವವೀಕ್ಷಣೆ ತೆರೆದಿದೆ (ನಿಜವಾದ ಫೋನ್ ಕ್ಯಾಮೆರಾ ಅಲ್ಲ).'
            : 'Simulated Camera preview opened inside Sahaaya Demo Mode (real device camera was not accessed).',
    };
  }
  if (appId === 'settings') {
    return {
      appId,
      title: 'Phone Settings (Simulated)',
      subtitle: 'SIMULATED — DEMO MODE · Accessibility & Display',
      items: [
        { id: 'wifi', label: 'Wi-Fi', value: 'Connected (Demo)', active: true },
        { id: 'font', label: 'Display Text Size', value: 'Large (Accessible)', active: true },
        { id: 'volume', label: 'Voice Volume', value: 'High (85%)' },
        { id: 'battery', label: 'Battery Saver', value: 'Off' },
      ],
      actionMessage:
        lang === 'hi'
          ? 'डेमो मोड में सेटिंग्स स्क्रीन दिख रही है (असली फ़ोन सेटिंग्स नहीं बदली गईं)।'
          : lang === 'kn'
            ? 'ಡೆಮೊ ಮೋಡ್‌ನಲ್ಲಿ ಸೆಟ್ಟಿಂಗ್ಸ್ ಪರದೆ ತೋರಿಸಲಾಗಿದೆ (ನಿಜವಾದ ಫೋನ್ ಸೆಟ್ಟಿಂಗ್ಸ್ ಬದಲಾಗಿಲ್ಲ).'
            : 'Simulated Phone Settings screen displayed in Demo Mode (actual device settings were not modified).',
    };
  }
  if (appId === 'phone') {
    return {
      appId,
      title: 'Phone Dialer (Simulated)',
      subtitle: 'SIMULATED — DEMO MODE · No real call placed',
      items: [
        { id: 'speed1', label: 'Family Contact (Sample)', value: 'Ready to dial' },
        { id: 'helpline', label: 'Senior Citizen Helpline (Sample)', value: '14567' },
      ],
      actionMessage:
        lang === 'hi'
          ? 'डेमो मोड में नकली फ़ोन डायलर दिख रहा है। कोई असली फ़ोन कॉल नहीं की गई है।'
          : lang === 'kn'
            ? 'ಡೆಮೊ ಮೋಡ್‌ನಲ್ಲಿ ಸಿಮ್ಯುಲೇಟೆಡ್ ಫೋನ್ ಡಯಲರ್ ತೆರೆದಿದೆ. ಯಾವುದೇ ನಿಜವಾದ ಕರೆ ಮಾಡಲಾಗಿಲ್ಲ.'
            : 'Simulated Phone screen opened in Demo Mode. No phone call is placed and no contacts are accessed.',
    };
  }
  if (appId === 'messages') {
    return {
      appId: 'messages',
      title: 'Messages (Simulated)',
      subtitle: 'SIMULATED — DEMO MODE · Local SMS preview only',
      items: [
        { id: 'sms1', label: 'Pharmacy Reminder (Sample)', value: 'Refill ready at 5 PM' },
        { id: 'sms2', label: 'Bank Alert (Sample)', value: 'Pension credited (Demo)' },
      ],
      actionMessage:
        lang === 'hi'
          ? 'डेमो मोड में नकली संदेश स्क्रीन दिख रही है। कोई असली SMS नहीं भेजा या पढ़ा गया है।'
          : lang === 'kn'
            ? 'ಡೆಮೊ ಮೋಡ್‌ನಲ್ಲಿ ಸಿಮ್ಯುಲೇಟೆಡ್ ಸಂದೇಶ ಪರದೆ ತೆರೆದಿದೆ. ಯಾವುದೇ ನಿಜವಾದ SMS ಕಳುಹಿಸಲಾಗಿಲ್ಲ.'
            : 'Simulated Messages view opened in Demo Mode. No real SMS messages were sent or read.',
    };
  }
  if (appId === 'calendar') {
    return {
      appId: 'calendar',
      title: 'Calendar (Simulated)',
      subtitle: 'SIMULATED — DEMO MODE · Stored locally in browser only',
      items: [],
      actionMessage:
        'Simulated Calendar opened in Demo Mode. No real phone calendar event or alarm was created.',
    };
  }
  return {
    appId: 'calculator',
    title: 'Calculator (Simulated)',
    subtitle: 'SIMULATED — DEMO MODE · Deterministic keypad',
    items: [
      {
        id: 'display',
        label: 'Expression',
        value: task?.mathExpression || '0',
        active: true,
      },
      {
        id: 'result',
        label: 'Result',
        value: task?.mathResult || '0',
      },
    ],
    actionMessage: task?.mathExpression
      ? `${task.mathExpression} = ${task.mathResult || '0'}`
      : 'Simulated Calculator screen opened in Demo Mode.',
  };
}

function buildInitialPayload(
  task: AssistantTask,
  appId: DemoAppId,
  mode: ExecutionMode,
  lang: LanguageCode,
  applicationData?: ApplicationData,
  activeField?: ApplicationFieldKey
): DemoSimulationPayload {
  const isSimulated = mode === 'interactive_demo' || !DEMO_APP_REGISTRY[appId].supportsRealBrowser;
  const realUrl = getRealUrlForTask(task, appId, null);

  if (appId === 'whatsapp') {
    const recipient = task.target || 'Contact';
    const draftMessage = task.messageContent || '';
    const contacts = [
      {
        id: 'target',
        name: recipient,
        preview: 'Family Contact · Ready to message',
        time: 'Now',
      },
      {
        id: 'daughter',
        name: recipient.toLowerCase() === 'daughter' ? 'Son' : 'Daughter',
        preview: 'Call me when free',
        time: '10:15 AM',
      },
      {
        id: 'clinic',
        name: 'Dr. Sharma Clinic',
        preview: 'Appointment reminder',
        time: 'Yesterday',
      },
      {
        id: 'care',
        name: 'Senior Care Group',
        preview: 'Morning walk at 7 AM',
        time: 'Yesterday',
      },
    ];
    return {
      appId,
      appName: 'WhatsApp',
      isSimulated,
      whatsAppState: {
        recipient,
        draftMessage,
        typingText: '',
        messages: [],
        sentInDemo: false,
        contacts,
        selectedContact: null,
        sendPressed: false,
      },
    };
  }

  if (appId === 'youtube') {
    const query =
      task.target && task.target !== 'YouTube' ? task.target : 'Hanuman Chalisa';
    const searchResults = [
      {
        id: 'yt-1',
        title: `${query} — Full Video Walkthrough (Demo)`,
        channel: 'Sahaaya Simulated Video Card (Demo)',
        duration: '04:32',
      },
      {
        id: 'yt-2',
        title: `${query} — Step-by-Step Guide (Demo)`,
        channel: 'Senior Friendly Media (Demo)',
        duration: '06:15',
      },
    ];
    return {
      appId,
      appName: 'YouTube',
      isSimulated,
      youTubeState: {
        query,
        searchTyped: '',
        videoTitle: `Demo Preview: ${query}`,
        channelName: 'Sahaaya Simulated Video Card (Not live API)',
        duration: '04:32',
        isPlaying: false,
        progressPercent: 0,
        watchUrl: realUrl || 'https://www.youtube.com',
        isSimulatedPreview: true,
        searchActive: false,
        searchResults,
        selectedVideoId: 'yt-1',
        playerOpen: false,
      },
    };
  }

  if (appId === 'chrome') {
    const rawTarget = task.searchQuery || task.target;
    const query =
      rawTarget && rawTarget !== 'Chrome' && rawTarget !== 'Google'
        ? rawTarget
        : '';
    return {
      appId,
      appName: 'Google Chrome',
      isSimulated,
      chromeState: {
        addressBar: query
          ? `https://www.google.com/search?q=${encodeURIComponent(query)}`
          : 'https://www.google.com',
        query,
        typedQuery: '',
        results: query ? buildExampleSearchResults(query) : [],
        searchUrl: realUrl || 'https://www.google.com',
        searchActive: false,
        isLoading: false,
        selectedResultIndex: null,
      },
    };
  }

  if (appId === 'maps') {
    const rawTarget = task.searchQuery || task.target;
    const query =
      rawTarget && rawTarget !== 'Google Maps' ? rawTarget : 'Nearby Pharmacies';
    return {
      appId,
      appName: 'Google Maps',
      isSimulated,
      mapsState: {
        query,
        destination: query,
        originLabel: 'Location not yet requested',
        isRealLocation: false,
        coordinates: null,
        places: buildExampleMapPlaces(query),
        routeSummary: `Example route preview for "${query}" (Demonstration data — no real location assumed).`,
        mapsUrl: realUrl || 'https://maps.google.com',
        searchActive: false,
        typedQuery: '',
        locationPromptVisible: false,
        selectedPlaceIndex: null,
      },
    };
  }

  if (appId === 'spotify') {
    const query =
      task.searchQuery ||
      (task.target && task.target !== 'Spotify' ? task.target : 'Relaxing music');
    const tracks = buildExampleSpotifyTracks(query);
    return {
      appId,
      appName: 'Spotify',
      isSimulated,
      spotifyState: {
        query,
        searchTyped: '',
        tracks,
        selectedTrackId: tracks[0]?.id || 'sp-1',
        isPlaying: false,
        progressPercent: 0,
        spotifyUrl: realUrl || 'https://open.spotify.com',
        isSimulatedPreview: true,
        searchActive: false,
        playerOpen: false,
      },
    };
  }

  if (appId === 'calculator') {
    const expr = task.mathExpression || '';
    const evalRes = expr ? evaluateMathExpression(expr) : null;
    const isErr = evalRes ? !evalRes.ok : false;
    const valStr = evalRes?.ok && evalRes.formattedValue ? evalRes.formattedValue : '0';
    return {
      appId,
      appName: DEMO_APP_REGISTRY.calculator.name,
      isSimulated: true,
      deviceAppState: buildDeviceAppState('calculator', lang, task),
      calculatorState: {
        expression: expr,
        displayValue: isErr ? evalRes?.error || 'Error' : valStr,
        result: evalRes?.ok ? valStr : null,
        error: isErr ? evalRes?.error || 'Error' : null,
        history:
          evalRes?.ok && evalRes.formattedValue
            ? [{ expression: evalRes.normalizedExpression, result: evalRes.formattedValue }]
            : [],
      },
    };
  }

  if (appId === 'calendar') {
    const now = new Date();
    const events = loadDemoCalendarEvents();
    const selectedDate = task.calendarDraft?.date || formatIsoDate(now);
    const parsedTarget = selectedDate ? new Date(`${selectedDate}T00:00:00`) : now;
    const viewYear = !Number.isNaN(parsedTarget.getTime())
      ? parsedTarget.getFullYear()
      : now.getFullYear();
    const viewMonth = !Number.isNaN(parsedTarget.getTime())
      ? parsedTarget.getMonth()
      : now.getMonth();
    return {
      appId,
      appName: DEMO_APP_REGISTRY.calendar.name,
      isSimulated: true,
      calendarState: {
        selectedDate,
        viewYear,
        viewMonth,
        events,
        lastActionNotice:
          'Simulated browser calendar only — no real phone calendar event or alarm was created.',
      },
    };
  }

  if (appId === 'messages') {
    return {
      appId,
      appName: DEMO_APP_REGISTRY.messages.name,
      isSimulated: true,
      deviceAppState: buildDeviceAppState('messages', lang, task),
      messagesState: {
        recipient: task.target || 'Family Contact',
        draftText: task.messageContent || '',
        inbox: [
          {
            id: 'sms-1',
            sender: 'Pharmacy Desk (Demo)',
            text: 'Your prescription refill is ready for pickup.',
            time: '10:30 AM',
          },
          {
            id: 'sms-2',
            sender: 'Daughter (Demo)',
            text: 'Call me whenever you reach home.',
            time: 'Yesterday',
          },
        ],
        sentInDemo: false,
      },
    };
  }

  if (
    appId === 'camera' ||
    appId === 'settings' ||
    appId === 'phone'
  ) {
    return {
      appId,
      appName: DEMO_APP_REGISTRY[appId].name,
      isSimulated: true,
      deviceAppState: buildDeviceAppState(appId, lang, task),
    };
  }

  if (appId === 'welfare_form' && applicationData) {
    const stats = getCompletionStats(applicationData);
    return {
      appId,
      appName: 'Senior Citizen Welfare Application',
      isSimulated: true,
      formState: {
        filledCount: stats.filledCount,
        totalCount: stats.totalCount,
        activeField,
        data: applicationData,
        submittedInDemo: false,
      },
    };
  }

  return {
    appId,
    appName: DEMO_APP_REGISTRY[appId].name,
    isSimulated,
  };
}

export function buildDemoConfirmationPrompt(
  task: AssistantTask,
  mode: ExecutionMode,
  lang: LanguageCode = 'en'
): string | undefined {
  const appId = resolveDemoAppId(task);

  if (appId === 'whatsapp' && task.executionStatus === 'awaiting_confirmation') {
    const recipient = task.target || 'your contact';
    const message = task.messageContent || '';
    if (mode === 'interactive_demo') {
      if (lang === 'hi') {
        return `प्राप्तकर्ता: ${recipient}। संदेश: "${message}"। आपका WhatsApp संदेश तैयार है। क्या मैं डेमो मोड में आगे बढ़ूँ?`;
      }
      if (lang === 'kn') {
        return `ಸ್ವೀಕರಿಸುವವರು: ${recipient}. ಸಂದೇಶ: "${message}". ನಿಮ್ಮ WhatsApp ಸಂದೇಶ ಸಿದ್ಧವಾಗಿದೆ. ನಾನು ಡೆಮೊ ಮೋಡ್‌ನಲ್ಲಿ ಮುಂದುವರಿಯಲೇ?`;
      }
      return `Recipient: ${recipient}. Message: "${message}". Your WhatsApp message is ready. Would you like me to proceed?`;
    }
  }

  if (mode === 'interactive_demo' && task.executionStatus === 'awaiting_confirmation') {
    const target = task.target || DEMO_APP_REGISTRY[appId].name;
    if (appId === 'youtube') {
      if (lang === 'hi') {
        return `मैंने डेमो मोड में YouTube के लिए "${target}" तैयार किया है। क्या आप आगे बढ़ना चाहते हैं?`;
      }
      if (lang === 'kn') {
        return `ಡೆಮೊ ಮೋಡ್‌ನಲ್ಲಿ YouTube ಗಾಗಿ "${target}" ಸಿದ್ಧಪಡಿಸಿದ್ದೇನೆ. ಮುಂದುವರಿಯೋಣವೇ?`;
      }
      return `I prepared "${target}" in the YouTube demo screen. Would you like me to proceed?`;
    }
    if (appId === 'spotify') {
      if (lang === 'hi') {
        return `मैंने डेमो मोड में Spotify के लिए "${target}" तैयार किया है। क्या आप आगे बढ़ना चाहते हैं?`;
      }
      if (lang === 'kn') {
        return `ಡೆಮೊ ಮೋಡ್‌ನಲ್ಲಿ Spotify ಗಾಗಿ "${target}" ಸಿದ್ಧಪಡಿಸಿದ್ದೇನೆ. ಮುಂದುವರಿಯೋಣವೇ?`;
      }
      return `I prepared "${target}" in the Spotify demo screen. Would you like me to proceed?`;
    }
    if (appId === 'maps') {
      if (lang === 'hi') {
        return `मैंने Google Maps डेमो में "${target}" खोजने की तैयारी की है। क्या आप आगे बढ़ना चाहते हैं?`;
      }
      if (lang === 'kn') {
        return `Google Maps ಡೆಮೊದಲ್ಲಿ "${target}" ಹುಡುಕಲು ಸಿದ್ಧಪಡಿಸಿದ್ದೇನೆ. ಮುಂದುವರಿಯೋಣವೇ?`;
      }
      return `I prepared "${target}" in the Google Maps demo. If location permission is unavailable, example demonstration data will be labelled clearly. Would you like me to continue?`;
    }
  }

  return undefined;
}

export function createDemoSessionForTask(
  task: AssistantTask,
  mode: ExecutionMode,
  lang: LanguageCode = 'en',
  options?: {
    applicationData?: ApplicationData;
    activeField?: ApplicationFieldKey;
  }
): DemoExecutionSession {
  const appId = resolveDemoAppId(task);
  const descriptor = DEMO_APP_REGISTRY[appId];
  const isSimulated = mode === 'interactive_demo' || !descriptor.supportsRealBrowser;
  const realUrl = getRealUrlForTask(task, appId, null);
  const actionLabel = buildActionLabel(task, appId);

  let status: DemoExecutionStatus = 'preparing_application';
  if (task.executionStatus === 'cancelled') {
    status = 'cancelled';
  } else if (task.executionStatus === 'awaiting_confirmation') {
    status = 'waiting_for_confirmation';
  } else if (task.executionStatus === 'executed_in_web') {
    status = 'completed';
  } else if (task.executionStatus === 'opened_externally') {
    status = 'completed';
  } else if (task.executionStatus === 'simulated_completed') {
    status = 'simulated_completion';
  } else if (
    task.executionStatus === 'failed' ||
    task.executionStatus === 'unavailable_on_web'
  ) {
    status = 'failed';
  }

  const resolvedAppName =
    appId === 'sahaaya_home' && task.application
      ? task.application
      : descriptor.name;

  const honestNotice = isSimulated
    ? 'SIMULATED — DEMO MODE: Local interactive demonstration only. No external app or real service was modified.'
    : 'REAL BROWSER MODE: Uses actual browser tabs, geolocation (with permission), and external web links.';

  return {
    taskId: task.id,
    mode,
    isSimulated,
    appId,
    appName: resolvedAppName,
    recognisedCommand: task.rawInstruction,
    requestedAction: actionLabel,
    status,
    simPhase: status === 'waiting_for_confirmation' ? 'home_screen' : undefined,
    steps: buildSteps(resolvedAppName, actionLabel, status, appId),
    payload: buildInitialPayload(
      task,
      appId,
      mode,
      lang,
      options?.applicationData,
      options?.activeField
    ),
    externalUrl: realUrl,
    externalLabel: task.externalLabel || (realUrl ? `Open Real ${resolvedAppName}` : null),
    resultSummary:
      status === 'waiting_for_confirmation'
        ? 'Waiting for your confirmation before proceeding.'
        : status === 'failed'
          ? task.capabilityNote || 'This action is not supported directly in this browser demo.'
          : 'Preparing demonstration...',
    honestNotice,
  };
}

export interface SimulatorTimelineStage {
  simPhase: DemoSimulatorPhase;
  status: DemoExecutionStatus;
  delayMs: number;
}

export function getSimulatorTimeline(appId: DemoAppId): SimulatorTimelineStage[] {
  if (appId === 'chrome') {
    return [
      { simPhase: 'home_screen', status: 'preparing_application', delayMs: 0 },
      { simPhase: 'selecting_app', status: 'preparing_application', delayMs: 420 },
      { simPhase: 'opening_app', status: 'opening_application', delayMs: 850 },
      { simPhase: 'activating_search', status: 'opening_application', delayMs: 1280 },
      { simPhase: 'typing_input', status: 'performing_action', delayMs: 1700 },
      { simPhase: 'submitting_search', status: 'performing_action', delayMs: 2650 },
      { simPhase: 'showing_results', status: 'performing_action', delayMs: 3150 },
    ];
  }
  if (appId === 'whatsapp') {
    return [
      { simPhase: 'home_screen', status: 'preparing_application', delayMs: 0 },
      { simPhase: 'selecting_app', status: 'preparing_application', delayMs: 400 },
      { simPhase: 'contact_list', status: 'opening_application', delayMs: 820 },
      { simPhase: 'selecting_contact', status: 'opening_application', delayMs: 1260 },
      { simPhase: 'opening_chat', status: 'performing_action', delayMs: 1700 },
      { simPhase: 'typing_input', status: 'performing_action', delayMs: 2120 },
      { simPhase: 'pressing_send', status: 'performing_action', delayMs: 3050 },
    ];
  }
  if (appId === 'youtube') {
    return [
      { simPhase: 'home_screen', status: 'preparing_application', delayMs: 0 },
      { simPhase: 'selecting_app', status: 'preparing_application', delayMs: 400 },
      { simPhase: 'opening_app', status: 'opening_application', delayMs: 820 },
      { simPhase: 'activating_search', status: 'opening_application', delayMs: 1240 },
      { simPhase: 'typing_input', status: 'performing_action', delayMs: 1650 },
      { simPhase: 'showing_results', status: 'performing_action', delayMs: 2550 },
      { simPhase: 'selecting_result', status: 'performing_action', delayMs: 3050 },
    ];
  }
  if (appId === 'maps') {
    return [
      { simPhase: 'home_screen', status: 'preparing_application', delayMs: 0 },
      { simPhase: 'selecting_app', status: 'preparing_application', delayMs: 400 },
      { simPhase: 'opening_app', status: 'opening_application', delayMs: 820 },
      { simPhase: 'activating_search', status: 'opening_application', delayMs: 1240 },
      { simPhase: 'typing_input', status: 'performing_action', delayMs: 1650 },
      { simPhase: 'requesting_location', status: 'performing_action', delayMs: 2450 },
    ];
  }
  if (appId === 'spotify') {
    return [
      { simPhase: 'home_screen', status: 'preparing_application', delayMs: 0 },
      { simPhase: 'selecting_app', status: 'preparing_application', delayMs: 380 },
      { simPhase: 'opening_app', status: 'opening_application', delayMs: 780 },
      { simPhase: 'activating_search', status: 'opening_application', delayMs: 1180 },
      { simPhase: 'typing_input', status: 'performing_action', delayMs: 1580 },
      { simPhase: 'showing_results', status: 'performing_action', delayMs: 2350 },
      { simPhase: 'selecting_result', status: 'performing_action', delayMs: 2800 },
    ];
  }
  return [
    { simPhase: 'home_screen', status: 'preparing_application', delayMs: 0 },
    { simPhase: 'opening_app', status: 'opening_application', delayMs: 360 },
    { simPhase: 'player_or_detail', status: 'performing_action', delayMs: 720 },
  ];
}

export function advanceDemoSimulatorPhase(
  session: DemoExecutionSession,
  simPhase: DemoSimulatorPhase,
  execStatus: DemoExecutionStatus,
  lang: LanguageCode = 'en'
): DemoExecutionSession {
  const nextPayload: DemoSimulationPayload = { ...session.payload };

  if (nextPayload.whatsAppState) {
    const wa = nextPayload.whatsAppState;
    const fullMsg = wa.draftMessage;
    nextPayload.whatsAppState = {
      ...wa,
      selectedContact:
        simPhase === 'selecting_contact' ||
        simPhase === 'opening_chat' ||
        simPhase === 'typing_input' ||
        simPhase === 'pressing_send' ||
        simPhase === 'completed'
          ? wa.recipient
          : null,
      typingText:
        simPhase === 'typing_input' || simPhase === 'pressing_send' ? fullMsg : '',
      sendPressed: simPhase === 'pressing_send' || simPhase === 'completed',
      sentInDemo: simPhase === 'completed',
      messages:
        simPhase === 'completed'
          ? [
              {
                id: `demo-wa-${session.taskId}`,
                sender: 'user',
                text: fullMsg,
                timestamp: 'Demo · Now',
                simulated: true,
              },
            ]
          : [],
    };
  }

  if (nextPayload.youTubeState) {
    const yt = nextPayload.youTubeState;
    nextPayload.youTubeState = {
      ...yt,
      searchActive:
        simPhase === 'activating_search' ||
        simPhase === 'typing_input' ||
        simPhase === 'showing_results' ||
        simPhase === 'selecting_result' ||
        simPhase === 'completed',
      searchTyped:
        simPhase === 'typing_input' ||
        simPhase === 'showing_results' ||
        simPhase === 'selecting_result' ||
        simPhase === 'completed'
          ? yt.query
          : '',
      playerOpen: simPhase === 'completed',
      isPlaying: simPhase === 'completed',
      progressPercent: simPhase === 'completed' ? 18 : 0,
    };
  }

  if (nextPayload.chromeState) {
    const ch = nextPayload.chromeState;
    nextPayload.chromeState = {
      ...ch,
      searchActive:
        simPhase === 'activating_search' ||
        simPhase === 'typing_input' ||
        simPhase === 'submitting_search' ||
        simPhase === 'showing_results' ||
        simPhase === 'completed',
      typedQuery:
        simPhase === 'typing_input' ||
        simPhase === 'submitting_search' ||
        simPhase === 'showing_results' ||
        simPhase === 'completed'
          ? ch.query
          : '',
      isLoading: simPhase === 'submitting_search',
    };
  }

  if (nextPayload.mapsState) {
    const mp = nextPayload.mapsState;
    nextPayload.mapsState = {
      ...mp,
      searchActive:
        simPhase === 'activating_search' ||
        simPhase === 'typing_input' ||
        simPhase === 'requesting_location' ||
        simPhase === 'showing_results' ||
        simPhase === 'completed',
      typedQuery:
        simPhase === 'typing_input' ||
        simPhase === 'requesting_location' ||
        simPhase === 'showing_results' ||
        simPhase === 'completed'
          ? mp.query
          : '',
      locationPromptVisible: simPhase === 'requesting_location',
    };
  }

  if (nextPayload.spotifyState) {
    const sp = nextPayload.spotifyState;
    nextPayload.spotifyState = {
      ...sp,
      searchActive:
        simPhase === 'activating_search' ||
        simPhase === 'typing_input' ||
        simPhase === 'showing_results' ||
        simPhase === 'selecting_result' ||
        simPhase === 'completed',
      searchTyped:
        simPhase === 'typing_input' ||
        simPhase === 'showing_results' ||
        simPhase === 'selecting_result' ||
        simPhase === 'completed'
          ? sp.query
          : '',
      playerOpen: simPhase === 'completed',
      isPlaying: simPhase === 'completed',
      progressPercent: simPhase === 'completed' ? 20 : 0,
    };
  }

  return {
    ...session,
    status: execStatus,
    simPhase,
    steps: buildSteps(session.appName, session.requestedAction, execStatus, session.appId, simPhase),
    payload: nextPayload,
    resultSummary:
      execStatus === 'simulated_completion'
        ? session.resultSummary
        : lang === 'hi'
          ? 'सहाय स्मार्टफोन चरण दिखा रहा है...'
          : lang === 'kn'
            ? 'ಸಹಾಯ ಸ್ಮಾರ್ಟ್‌ಫೋನ್ ಹಂತಗಳನ್ನು ತೋರಿಸುತ್ತಿದೆ...'
            : `Demonstrating ${session.appName} workflow step by step...`,
  };
}

export function advanceDemoAnimationStage(
  session: DemoExecutionSession,
  stage: 'preparing_application' | 'opening_application' | 'performing_action' | 'simulated_completion',
  lang: LanguageCode = 'en'
): DemoExecutionSession {
  const nextPayload: DemoSimulationPayload = { ...session.payload };

  if (nextPayload.whatsAppState) {
    const fullMsg = nextPayload.whatsAppState.draftMessage;
    if (stage === 'preparing_application') {
      nextPayload.whatsAppState = {
        ...nextPayload.whatsAppState,
        typingText: '',
        selectedContact: null,
        sendPressed: false,
      };
    } else if (stage === 'opening_application') {
      nextPayload.whatsAppState = {
        ...nextPayload.whatsAppState,
        selectedContact: nextPayload.whatsAppState.recipient,
        typingText: fullMsg.slice(0, Math.max(4, Math.ceil(fullMsg.length * 0.55))),
      };
    } else if (stage === 'performing_action') {
      nextPayload.whatsAppState = {
        ...nextPayload.whatsAppState,
        selectedContact: nextPayload.whatsAppState.recipient,
        typingText: fullMsg,
        sendPressed: true,
      };
    } else if (stage === 'simulated_completion') {
      nextPayload.whatsAppState = {
        ...nextPayload.whatsAppState,
        selectedContact: nextPayload.whatsAppState.recipient,
        typingText: '',
        sendPressed: true,
        sentInDemo: true,
        messages: [
          {
            id: `demo-wa-${session.taskId}`,
            sender: 'user',
            text: fullMsg,
            timestamp: 'Demo · Now',
            simulated: true,
          },
        ],
      };
    }
  }

  if (nextPayload.youTubeState) {
    const q = nextPayload.youTubeState.query;
    if (stage === 'opening_application') {
      nextPayload.youTubeState = {
        ...nextPayload.youTubeState,
        searchActive: true,
        searchTyped: q.slice(0, Math.max(3, Math.ceil(q.length * 0.6))),
      };
    } else if (stage === 'performing_action') {
      nextPayload.youTubeState = {
        ...nextPayload.youTubeState,
        searchActive: true,
        searchTyped: q,
        isPlaying: false,
      };
    } else if (stage === 'simulated_completion') {
      nextPayload.youTubeState = {
        ...nextPayload.youTubeState,
        searchActive: true,
        searchTyped: q,
        playerOpen: true,
        isPlaying: true,
        progressPercent: 28,
      };
    }
  }

  if (nextPayload.chromeState) {
    const q = nextPayload.chromeState.query;
    if (stage === 'opening_application') {
      nextPayload.chromeState = {
        ...nextPayload.chromeState,
        searchActive: true,
        typedQuery: q.slice(0, Math.max(3, Math.ceil(q.length * 0.6))),
      };
    } else if (stage === 'performing_action' || stage === 'simulated_completion') {
      nextPayload.chromeState = {
        ...nextPayload.chromeState,
        searchActive: true,
        typedQuery: q,
        isLoading: false,
      };
    }
  }

  if (nextPayload.mapsState) {
    const q = nextPayload.mapsState.query;
    if (stage === 'opening_application' || stage === 'performing_action' || stage === 'simulated_completion') {
      nextPayload.mapsState = {
        ...nextPayload.mapsState,
        searchActive: true,
        typedQuery: q,
        locationPromptVisible: false,
      };
    }
  }

  if (nextPayload.spotifyState) {
    const q = nextPayload.spotifyState.query;
    if (stage === 'opening_application') {
      nextPayload.spotifyState = {
        ...nextPayload.spotifyState,
        searchActive: true,
        searchTyped: q.slice(0, Math.max(3, Math.ceil(q.length * 0.6))),
      };
    } else if (stage === 'performing_action') {
      nextPayload.spotifyState = {
        ...nextPayload.spotifyState,
        searchActive: true,
        searchTyped: q,
        isPlaying: false,
      };
    } else if (stage === 'simulated_completion') {
      nextPayload.spotifyState = {
        ...nextPayload.spotifyState,
        searchActive: true,
        searchTyped: q,
        playerOpen: true,
        isPlaying: true,
        progressPercent: 24,
      };
    }
  }

  let resultSummary = session.resultSummary;
  if (stage === 'simulated_completion') {
    if (session.appId === 'whatsapp') {
      resultSummary =
        lang === 'hi'
          ? 'सहाय डेमो में आपका संदेश भेज दिया गया है। कोई असली WhatsApp संदेश नहीं भेजा गया।'
          : lang === 'kn'
            ? 'ಸಹಾಯ ಡೆಮೊದಲ್ಲಿ ನಿಮ್ಮ ಸಂದೇಶ ಕಳುಹಿಸಲಾಗಿದೆ. ಯಾವುದೇ ನಿಜವಾದ WhatsApp ಸಂದೇಶ ಕಳುಹಿಸಲಾಗಿಲ್ಲ.'
            : 'Your message has been sent in the Sahaaya demonstration. No real WhatsApp message was sent.';
    } else if (session.appId === 'youtube') {
      resultSummary = `Simulated YouTube preview opened for "${nextPayload.youTubeState?.query || 'YouTube'}". Real YouTube search link is also available.`;
    } else if (session.appId === 'spotify') {
      resultSummary = `Simulated Spotify preview opened for "${nextPayload.spotifyState?.query || 'Spotify'}" (simulated preview only — no real streaming API). Real Spotify search link is also available.`;
    } else if (session.appId === 'chrome') {
      resultSummary = nextPayload.chromeState?.query
        ? `Simulated Google Chrome search preview shown for "${nextPayload.chromeState.query}".`
        : 'Simulated Google Chrome browser interface opened in Demo Mode.';
    } else if (session.appId === 'maps') {
      resultSummary = nextPayload.mapsState?.isRealLocation
        ? `Maps demonstration updated using your permitted location for "${nextPayload.mapsState.destination}".`
        : `Simulated Google Maps demonstration shown for "${nextPayload.mapsState?.destination || 'Google Maps'}" using example data (real location was not used).`;
    } else if (session.appId === 'calculator' && nextPayload.calculatorState) {
      resultSummary = nextPayload.calculatorState.error
        ? nextPayload.calculatorState.error
        : nextPayload.calculatorState.expression
          ? `${nextPayload.calculatorState.expression} = ${nextPayload.calculatorState.displayValue}`
          : 'Simulated Calculator opened in Demo Mode.';
    } else if (session.appId === 'calendar' && nextPayload.calendarState) {
      resultSummary = nextPayload.calendarState.lastActionNotice;
    } else if (nextPayload.deviceAppState) {
      resultSummary = nextPayload.deviceAppState.actionMessage;
    } else {
      resultSummary = `${session.appName} completed in Interactive Demo Mode.`;
    }
  }

  const nextSimPhase: DemoSimulatorPhase | undefined =
    stage === 'simulated_completion'
      ? 'completed'
      : stage === 'preparing_application'
        ? 'home_screen'
        : stage === 'opening_application'
          ? 'opening_app'
          : 'typing_input';

  return {
    ...session,
    status: stage,
    simPhase: nextSimPhase,
    steps: buildSteps(session.appName, session.requestedAction, stage, session.appId, nextSimPhase),
    payload: nextPayload,
    resultSummary,
  };
}

export function cancelDemoSession(
  session: DemoExecutionSession,
  lang: LanguageCode = 'en'
): { session: DemoExecutionSession; replyText: string } {
  const cancelled: DemoExecutionSession = {
    ...session,
    status: 'cancelled',
    steps: buildSteps(session.appName, session.requestedAction, 'cancelled', session.appId),
    resultSummary: 'Demonstration cancelled by user before execution.',
  };
  const replyText =
    lang === 'hi'
      ? 'ठीक है, मैंने इस कार्य को रद्द कर दिया है। बताइए, मैं आपकी और क्या मदद कर सकती हूँ?'
      : lang === 'kn'
        ? 'ಸರಿ, ಈ ಕಾರ್ಯವನ್ನು ರದ್ದುಗೊಳಿಸಿದ್ದೇನೆ. ನಾನು ನಿಮಗೆ ಬೇರೆ ಯಾವ ಸಹಾಯ ಮಾಡಲಿ?'
        : 'Okay, I have cancelled that demonstration. How else can I help you?';
  return { session: cancelled, replyText };
}

export function mapDemoStatusToTaskStatus(
  demoStatus: DemoExecutionStatus
): TaskExecutionStatus {
  switch (demoStatus) {
    case 'waiting_for_confirmation':
      return 'awaiting_confirmation';
    case 'preparing_application':
    case 'opening_application':
    case 'performing_action':
      return 'executing';
    case 'completed':
      return 'opened_externally';
    case 'simulated_completion':
      return 'simulated_completed';
    case 'cancelled':
      return 'cancelled';
    case 'failed':
      return 'failed';
    default:
      return 'ready';
  }
}

export async function runDemoExecution(
  task: AssistantTask,
  mode: ExecutionMode,
  caps: PlatformCapabilities,
  lang: LanguageCode = 'en',
  adapter: PlatformExecutionAdapter = createBrowserExecutionAdapter()
): Promise<{
  task: AssistantTask;
  session: DemoExecutionSession;
  replyText: string;
}> {
  const appId = resolveDemoAppId(task);
  const baseSession = createDemoSessionForTask(task, mode, lang);

  // Never falsely create or complete native system alarms inside browser demo
  if (task.action === 'set_alarm') {
    const alarmReply =
      lang === 'hi'
        ? 'यह वेब ब्राउज़र डेमो आपके फ़ोन का असली सिस्टम अलार्म सीधे सेट नहीं कर सकता (इसके लिए भविष्य में Android डिवाइस एकीकरण की आवश्यकता होगी)। विकल्प के रूप में, आप चाहें तो मैं इसे सहाय के स्थानीय डेमो कैलेंडर में एक रिमाइंडर के रूप में जोड़ सकता हूँ।'
        : lang === 'kn'
          ? 'ಈ ವೆಬ್ ಬ್ರೌಸರ್ ಡೆಮೊ ನಿಮ್ಮ ಫೋನ್‌ನ ನಿಜವಾದ ಸಿಸ್ಟಮ್ ಅಲಾರಂ ಅನ್ನು ನೇರವಾಗಿ ಇಡಲು ಸಾಧ್ಯವಿಲ್ಲ (ಇದಕ್ಕೆ ಭವಿಷ್ಯದ Android ಸಾಧನ ಏಕೀಕರಣ ಅಗತ್ಯವಿದೆ). ಪರ್ಯಾಯವಾಗಿ, ನೀವು ಬಯಸಿದರೆ ನಾನು ಇದನ್ನು ಸಹಾಯದ ಸ್ಥಳೀಯ ಡೆಮೊ ಕ್ಯಾಲೆಂಡರ್‌ನಲ್ಲಿ ರಿಮೈಂಡರ್ ಆಗಿ ಸೇರಿಸಬಲ್ಲೆ.'
          : 'This browser demo cannot directly set your phone’s system alarm—that requires future native Android Clock integration. As an alternative, I can add a local reminder in Sahaaya’s Demo Calendar if you would like, without setting a real phone alarm.';
    return {
      task: {
        ...task,
        executionStatus: 'unavailable_on_web',
      },
      session: {
        ...baseSession,
        status: 'failed',
        resultSummary: alarmReply,
      },
      replyText: alarmReply,
    };
  }

  // Real Browser Mode -> use real browser executor when supported
  if (mode === 'real_browser' && DEMO_APP_REGISTRY[appId].supportsRealBrowser) {
    const realRes = await executeConfirmedTask(task, caps, lang, adapter);
    const completedStatus: DemoExecutionStatus =
      realRes.task.executionStatus === 'opened_externally' ||
      realRes.task.executionStatus === 'executed_in_web'
        ? 'completed'
        : realRes.task.executionStatus === 'cancelled'
          ? 'cancelled'
          : 'failed';

    const session: DemoExecutionSession = {
      ...baseSession,
      isSimulated: false,
      status: completedStatus,
      steps: buildSteps(baseSession.appName, baseSession.requestedAction, completedStatus),
      externalUrl: realRes.task.externalUrl || baseSession.externalUrl,
      externalLabel: realRes.task.externalLabel || baseSession.externalLabel,
      resultSummary: realRes.replyText,
    };

    return {
      task: realRes.task,
      session,
      replyText: realRes.replyText,
    };
  }

  // Interactive Demo Mode (or native-only apps like Camera, Settings, Phone, Calculator)
  let sessionWithMapsLocation = baseSession;
  if (appId === 'maps' && task.requiresLocation && caps.geolocationSupported) {
    const pos = await adapter.getCurrentPosition();
    if (!('error' in pos) && sessionWithMapsLocation.payload.mapsState) {
      const realMapsUrl = getRealUrlForTask(task, 'maps', pos);
      sessionWithMapsLocation = {
        ...sessionWithMapsLocation,
        externalUrl: realMapsUrl,
        payload: {
          ...sessionWithMapsLocation.payload,
          mapsState: {
            ...sessionWithMapsLocation.payload.mapsState,
            originLabel: `Permitted browser location (${pos.latitude.toFixed(4)}, ${pos.longitude.toFixed(4)})`,
            isRealLocation: true,
            coordinates: pos,
            routeSummary: `Showing permitted browser location (${pos.latitude.toFixed(4)}, ${pos.longitude.toFixed(4)}) with sample nearby cards.`,
            mapsUrl: realMapsUrl || sessionWithMapsLocation.payload.mapsState.mapsUrl,
          },
        },
      };
    } else if (sessionWithMapsLocation.payload.mapsState) {
      sessionWithMapsLocation = {
        ...sessionWithMapsLocation,
        payload: {
          ...sessionWithMapsLocation.payload,
          mapsState: {
            ...sessionWithMapsLocation.payload.mapsState,
            originLabel: 'Example Demo Area (Real location permission not granted)',
            isRealLocation: false,
          },
        },
      };
    }
  }

  let sessionBeforeComplete = sessionWithMapsLocation;

  // Apply deterministic Calendar state updates in localStorage/demo store
  if (appId === 'calendar' && sessionBeforeComplete.payload.calendarState) {
    const calState = { ...sessionBeforeComplete.payload.calendarState };
    let notice = calState.lastActionNotice;
    if (
      task.action === 'add_calendar_event' &&
      task.calendarDraft?.date &&
      task.calendarDraft?.time
    ) {
      const created = createDemoCalendarEvent(
        task.calendarDraft.title || 'Reminder',
        task.calendarDraft.date,
        task.calendarDraft.time
      );
      const updatedEvents = addDemoCalendarEventToStore(created, calState.events);
      const dt = new Date(`${created.date}T00:00:00`);
      calState.events = updatedEvents;
      calState.selectedDate = created.date;
      if (!Number.isNaN(dt.getTime())) {
        calState.viewYear = dt.getFullYear();
        calState.viewMonth = dt.getMonth();
      }
      const whenLabel = task.calendarDraft.dateLabel || created.date;
      notice = `Your event, ${created.title}, is scheduled for ${whenLabel} at ${created.time} in the Sahaaya demo calendar (local simulation only — no real phone calendar event or alarm was created). Would you like to review or edit it?`;
    } else if (task.action === 'edit_calendar_event') {
      const patch: Partial<{ title: string; date: string; time: string }> = {};
      if (task.calendarDraft?.date) patch.date = task.calendarDraft.date;
      if (task.calendarDraft?.time) patch.time = task.calendarDraft.time;
      if (task.calendarDraft?.title && task.calendarDraft.title !== 'meeting') {
        patch.title = task.calendarDraft.title;
      }
      const editRes = updateDemoCalendarEventInStore(
        task.calendarDraft?.title || task.target || '',
        patch,
        calState.events
      );
      calState.events = editRes.events;
      if (editRes.updated) {
        calState.selectedDate = editRes.updated.date;
        const dt = new Date(`${editRes.updated.date}T00:00:00`);
        if (!Number.isNaN(dt.getTime())) {
          calState.viewYear = dt.getFullYear();
          calState.viewMonth = dt.getMonth();
        }
        notice = `Updated simulated calendar event to "${editRes.updated.title}" on ${editRes.updated.date} at ${editRes.updated.time} (local demo only).`;
      } else {
        notice = 'No matching events found to edit in the simulated calendar.';
      }
    } else if (task.action === 'delete_calendar_event') {
      const delRes = deleteDemoCalendarEventFromStore(
        task.calendarDraft?.title || task.target || '',
        calState.events
      );
      calState.events = delRes.events;
      notice = delRes.removed
        ? `Removed "${delRes.removed.title}" from the simulated calendar.`
        : 'No matching events found in the simulated calendar.';
    } else if (task.action === 'show_calendar_events') {
      calState.events = loadDemoCalendarEvents();
      notice =
        calState.events.length > 0
          ? `Showing ${calState.events.length} upcoming simulated calendar event(s).`
          : 'There are no upcoming events in your simulated calendar yet.';
    }
    calState.lastActionNotice = notice;
    sessionBeforeComplete = {
      ...sessionBeforeComplete,
      payload: {
        ...sessionBeforeComplete.payload,
        calendarState: calState,
      },
    };
  }

  const completedSession = advanceDemoAnimationStage(
    sessionBeforeComplete,
    'simulated_completion',
    lang
  );

  let replyText = completedSession.resultSummary;
  if (appId === 'whatsapp') {
    replyText =
      lang === 'hi'
        ? 'सहाय डेमो में आपका संदेश भेज दिया गया है। कोई असली WhatsApp संदेश नहीं भेजा गया।'
        : lang === 'kn'
          ? 'ಸಹಾಯ ಡೆಮೊದಲ್ಲಿ ನಿಮ್ಮ ಸಂದೇಶ ಕಳುಹಿಸಲಾಗಿದೆ. ಯಾವುದೇ ನಿಜವಾದ WhatsApp ಸಂದೇಶ ಕಳುಹಿಸಲಾಗಿಲ್ಲ.'
          : 'Your message has been sent in the Sahaaya demonstration. Note: no real WhatsApp message was sent.';
  } else if (appId === 'youtube') {
    const query = completedSession.payload.youTubeState?.query || 'YouTube';
    replyText =
      lang === 'hi'
        ? `डेमो मोड में "${query}" के लिए YouTube प्रीव्यू खुल गया है। आप नीचे असली YouTube खोज भी खोल सकते हैं।`
        : lang === 'kn'
          ? `ಡೆಮೊ ಮೋಡ್‌ನಲ್ಲಿ "${query}" ಗಾಗಿ YouTube ಪೂರ್ವವೀಕ್ಷಣೆ ತೆರೆದಿದೆ. ನೀವು ನಿಜವಾದ YouTube ಹುಡುಕಾಟವನ್ನೂ ತೆರೆಯಬಹುದು.`
          : `I opened the simulated YouTube preview for "${query}" in Demo Mode. You can also open the real YouTube search link anytime.`;
  } else if (appId === 'spotify') {
    const query = completedSession.payload.spotifyState?.query || 'Relaxing music';
    replyText =
      lang === 'hi'
        ? `डेमो मोड में "${query}" के लिए Spotify प्रीव्यू खुल गया है (यह नकली प्लेयर प्रीव्यू है, असली स्ट्रीमिंग नहीं)। आप नीचे असली Spotify वेब लिंक खोल सकते हैं।`
        : lang === 'kn'
          ? `ಡೆಮೊ ಮೋಡ್‌ನಲ್ಲಿ "${query}" ಗಾಗಿ Spotify ಪೂರ್ವವೀಕ್ಷಣೆ ತೆರೆದಿದೆ (ಇದು ಸಿಮ್ಯುಲೇಟೆಡ್ ಪ್ಲೇಯರ್ ಮಾತ್ರ). ನೀವು ನಿಜವಾದ Spotify ವೆಬ್ ಲಿಂಕ್ ಅನ್ನೂ ತೆರೆಯಬಹುದು.`
          : `I opened the simulated Spotify preview for "${query}" in Demo Mode (simulated preview only — no real streaming API). You can also open the real Spotify Web search link anytime.`;
  } else if (appId === 'calculator') {
    const cs = completedSession.payload.calculatorState;
    if (cs?.error) {
      replyText =
        lang === 'hi'
          ? 'शून्य (0) से भाग नहीं दिया जा सकता। कृपया कोई दूसरी संख्या आज़माएँ।'
          : lang === 'kn'
            ? 'ಸೊನ್ನೆಯಿಂದ (0) ಭಾಗಿಸಲು ಸಾಧ್ಯವಿಲ್ಲ. ದಯವಿಟ್ಟು ಬೇರೆ ಸಂಖ್ಯೆಯನ್ನು ಪ್ರಯತ್ನಿಸಿ.'
            : cs.error;
    } else if (cs?.expression && cs?.result) {
      replyText =
        lang === 'hi'
          ? `कैलकुलेटर में गणना तैयार है: ${cs.expression} = ${cs.result}।`
          : lang === 'kn'
            ? `ಕ್ಯಾಲ್ಕುಲೇಟರ್‌ನಲ್ಲಿ ಲೆಕ್ಕಾಚಾರ ಸಿದ್ಧವಾಗಿದೆ: ${cs.expression} = ${cs.result}.`
            : `${cs.expression} equals ${cs.result}.`;
    } else {
      replyText =
        lang === 'hi'
          ? 'डेमो मोड में कैलकुलेटर खोल दिया गया है।'
          : lang === 'kn'
            ? 'ಡೆಮೊ ಮೋಡ್‌ನಲ್ಲಿ ಕ್ಯಾಲ್ಕುಲೇಟರ್ ತೆರೆಯಲಾಗಿದೆ.'
            : 'Calculator opened in Sahaaya Demo Mode.';
    }
  } else if (appId === 'calendar' && completedSession.payload.calendarState) {
    const cal = completedSession.payload.calendarState;
    if (task.action === 'add_calendar_event' && task.calendarDraft?.date) {
      replyText =
        lang === 'hi'
          ? `मैंने आपके स्थानीय डेमो कैलेंडर में "${task.calendarDraft.title}" (${task.calendarDraft.dateLabel || task.calendarDraft.date}, ${task.calendarDraft.time}) जोड़ दिया है। ध्यान दें: यह केवल ब्राउज़र डेमो है, असली फ़ोन कैलेंडर या अलार्म नहीं बनाया गया।`
          : lang === 'kn'
            ? `ನಿಮ್ಮ ಸ್ಥಳೀಯ ಡೆಮೊ ಕ್ಯಾಲೆಂಡರ್‌ನಲ್ಲಿ "${task.calendarDraft.title}" (${task.calendarDraft.dateLabel || task.calendarDraft.date}, ${task.calendarDraft.time}) ಸೇರಿಸಲಾಗಿದೆ. ಗಮನಿಸಿ: ಇದು ಕೇವಲ ಡೆಮೊ, ನಿಜವಾದ ಫೋನ್ ಕ್ಯಾಲೆಂಡರ್ ಅಥವಾ ಅಲಾರಾಂ ಅಲ್ಲ.`
            : cal.lastActionNotice;
    } else if (task.action === 'show_calendar_events') {
      const evSummary =
        cal.events.length > 0
          ? cal.events
              .slice(0, 4)
              .map((e) => `${e.title} (${e.date} at ${e.time})`)
              .join('; ')
          : '';
      replyText =
        cal.events.length > 0
          ? `You have ${cal.events.length} simulated event(s): ${evSummary}.`
          : 'There are no upcoming events in your simulated calendar yet.';
    } else {
      replyText = cal.lastActionNotice;
    }
  }

  const updatedTask: AssistantTask = {
    ...task,
    executionStatus:
      task.executionStatus === 'failed' ? 'failed' : 'simulated_completed',
    externalUrl: completedSession.externalUrl,
    externalLabel: completedSession.externalLabel,
    capabilityNote: completedSession.honestNotice,
  };

  return {
    task: updatedTask,
    session: completedSession,
    replyText,
  };
}

export type PendingTaskTurnResolution =
  | { handled: false; action: 'none' }
  | { handled: true; action: 'execute'; task: AssistantTask }
  | {
      handled: true;
      action: 'cancel';
      task: AssistantTask | null;
      session: DemoExecutionSession | null;
      replyText: string;
    }
  | {
      handled: true;
      action: 'edit';
      task: AssistantTask;
      session: DemoExecutionSession | null;
      replyText: string;
    }
  | {
      handled: true;
      action: 'reprompt';
      task: AssistantTask;
      replyText: string;
    };

function isPendingEditRequest(rawText: string): boolean {
  const normalized = rawText
    .trim()
    .toLowerCase()
    .replace(/[.!?।]+$/g, '')
    .trim();
  if (!normalized) return false;
  return (
    /^(?:please\s+)?(?:edit|change|modify|update|rewrite)(?:\s+(?:it|this|that|the\s+request|the\s+message|the\s+search|my\s+request))?$/i.test(
      normalized
    ) ||
    /^(?:बदलो|बदलें|संपादित\s*करो|बदलना\s*है)$/.test(normalized) ||
    /^(?:ಬದಲಿಸಿ|ತಿದ್ದುಪಡಿ\s*ಮಾಡಿ|ಬದಲಾಯಿಸಿ)$/.test(normalized)
  );
}

function reconstructTaskFromDemoSession(
  session: DemoExecutionSession
): AssistantTask {
  const intent =
    session.appId === 'whatsapp'
      ? 'messaging'
      : session.appId === 'chrome' ||
          session.appId === 'maps' ||
          session.appId === 'spotify'
        ? 'search'
        : session.appId === 'welfare_form'
          ? 'application_task'
          : 'app_launch';

  return {
    id: session.taskId,
    rawInstruction: session.recognisedCommand,
    intent,
    application: session.appName,
    action:
      session.appId === 'youtube'
        ? 'play_video'
        : session.appId === 'spotify'
          ? 'play_music'
          : session.appId === 'calculator'
            ? 'calculate'
            : session.appId === 'calendar'
              ? 'open_calendar'
              : 'open_website',
    target:
      session.payload.whatsAppState?.recipient ||
      session.payload.youTubeState?.query ||
      session.payload.spotifyState?.query ||
      session.payload.chromeState?.query ||
      session.payload.mapsState?.query ||
      session.appName,
    messageContent: session.payload.whatsAppState?.draftMessage || null,
    requiredParameters: [],
    missingParameters: [],
    confirmationRequired: true,
    executionStatus: 'awaiting_confirmation',
    externalUrl: session.externalUrl,
    externalLabel: session.externalLabel,
  };
}

export function evaluatePendingTaskTurn(
  rawInput: string,
  activeTask: AssistantTask | null,
  demoSession: DemoExecutionSession | null,
  mode: ExecutionMode,
  lang: LanguageCode = 'en'
): PendingTaskTurnResolution {
  const isTaskAwaiting = activeTask?.executionStatus === 'awaiting_confirmation';
  const isSessionAwaiting = demoSession?.status === 'waiting_for_confirmation';

  if (!isTaskAwaiting && !isSessionAwaiting) {
    return { handled: false, action: 'none' };
  }

  const effectiveTask: AssistantTask | null = isTaskAwaiting
    ? activeTask
    : demoSession
      ? reconstructTaskFromDemoSession(demoSession)
      : null;

  if (!effectiveTask) {
    return { handled: false, action: 'none' };
  }

  // Classify substantive new requests BEFORE applying any old pending confirmation
  const maybeNewCommand = parseNaturalCommand(rawInput, lang);
  if (
    maybeNewCommand.matched &&
    (maybeNewCommand.task?.intent !== 'general_conversation' ||
      maybeNewCommand.task?.action !== 'polite_ack')
  ) {
    return { handled: false, action: 'none' };
  }

  if (
    /^(repeat|say again|pardon|help|assist|how to|review|check application|open form|show form|view form|दोहराओ|फिर से बोलो|मदद|सहायता|समीक्षा|फ़ॉर्म|ಮತ್ತೆ ಹೇಳಿ|ಸಹಾಯ|ಪರಿಶೀಲನೆ|ಪರಿಶೀಲಿಸಿ|ಅರ್ಜಿ)$/i.test(
      rawInput.trim().toLowerCase()
    )
  ) {
    return { handled: false, action: 'none' };
  }

  const decision = classifyPendingConfirmationReply(rawInput);

  if (decision === 'confirm') {
    return {
      handled: true,
      action: 'execute',
      task: effectiveTask,
    };
  }

  if (decision === 'cancel') {
    const cancelledTask: AssistantTask = {
      ...effectiveTask,
      executionStatus: 'cancelled',
    };
    const cancelledSessionRes = demoSession
      ? cancelDemoSession(demoSession, lang)
      : null;
    const cancelReply =
      cancelledSessionRes?.replyText ||
      advanceTaskConversation(effectiveTask, rawInput, lang).replyText;

    return {
      handled: true,
      action: 'cancel',
      task: activeTask ? cancelledTask : null,
      session: cancelledSessionRes ? cancelledSessionRes.session : null,
      replyText: cancelReply,
    };
  }

  if (isPendingEditRequest(rawInput)) {
    if (effectiveTask.intent === 'messaging') {
      const editedTask: AssistantTask = {
        ...effectiveTask,
        messageContent: null,
        missingParameters: ['messageContent'],
        executionStatus: 'needs_info',
      };
      return {
        handled: true,
        action: 'edit',
        task: editedTask,
        session: createDemoSessionForTask(editedTask, mode, lang),
        replyText:
          lang === 'hi'
            ? 'नया संदेश क्या लिखना है?'
            : lang === 'kn'
              ? 'ಹೊಸ ಸಂದೇಶದಲ್ಲಿ ಏನು ಬರೆಯಬೇಕು?'
              : 'What would you like the new message to say?',
      };
    }
    if (effectiveTask.application === 'YouTube') {
      const editedTask: AssistantTask = {
        ...effectiveTask,
        intent: 'search',
        action: 'search_youtube',
        target: null,
        searchQuery: null,
        externalUrl: null,
        missingParameters: ['videoQuery'],
        executionStatus: 'needs_info',
      };
      return {
        handled: true,
        action: 'edit',
        task: editedTask,
        session: createDemoSessionForTask(editedTask, mode, lang),
        replyText:
          lang === 'hi'
            ? 'आप YouTube पर कौन-सा नया वीडियो खोजना चाहते हैं?'
            : lang === 'kn'
              ? 'YouTube ನಲ್ಲಿ ನೀವು ಬೇರೆ ಯಾವ ವೀಡಿಯೊ ಹುಡುಕಲು ಬಯಸುತ್ತೀರಿ?'
              : 'Which YouTube video would you like me to search for instead?',
      };
    }
    if (effectiveTask.intent === 'search') {
      const editedTask: AssistantTask = {
        ...effectiveTask,
        target: null,
        searchQuery: null,
        externalUrl: null,
        missingParameters: ['query'],
        executionStatus: 'needs_info',
      };
      return {
        handled: true,
        action: 'edit',
        task: editedTask,
        session: createDemoSessionForTask(editedTask, mode, lang),
        replyText:
          lang === 'hi'
            ? 'आप इसके बजाय क्या खोजना चाहते हैं?'
            : lang === 'kn'
              ? 'ಬದಲಿಗೆ ನೀವು ಏನನ್ನು ಹುಡುಕಲು ಬಯಸುತ್ತೀರಿ?'
              : 'What would you like me to search for instead?',
      };
    }
    const editedTask: AssistantTask = {
      ...effectiveTask,
      target: null,
      missingParameters: ['application'],
      executionStatus: 'needs_info',
    };
    return {
      handled: true,
      action: 'edit',
      task: editedTask,
      session: createDemoSessionForTask(editedTask, mode, lang),
      replyText:
        lang === 'hi'
          ? 'ठीक है, आप इसके बजाय क्या करना चाहेंगे?'
          : lang === 'kn'
            ? 'ಸರಿ, ಬದಲಿಗೆ ನೀವು ಏನು ಮಾಡಲು ಬಯಸುತ್ತೀರಿ?'
            : 'Sure—what would you like me to open or do instead?',
    };
  }

  const demoPrompt = buildDemoConfirmationPrompt(effectiveTask, mode, lang);
  const adv = advanceTaskConversation(effectiveTask, rawInput, lang);
  const reprompt =
    demoPrompt ||
    adv.replyText ||
    (lang === 'hi'
      ? 'क्या आप चाहते हैं कि मैं आगे बढ़ूँ? कृपया हाँ या नहीं कहें।'
      : lang === 'kn'
        ? 'ನಾನು ಮುಂದುವರಿಯಬೇಕೆ? ದಯವಿಟ್ಟು ಹೌದು ಅಥವಾ ಬೇಡ ಎಂದು ಹೇಳಿ.'
        : 'Would you like me to proceed with this action? Please say Yes to continue or No to cancel.');

  return {
    handled: true,
    action: 'reprompt',
    task: effectiveTask,
    replyText: reprompt,
  };
}
