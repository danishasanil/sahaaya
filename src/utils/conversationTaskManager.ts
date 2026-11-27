import { DemoExecutionSession } from '../types/demoExecution';
import {
  AssistantTask,
  ConversationMode,
  ExecutionMode,
  LanguageCode,
} from '../types/sahaaya';
import {
  advanceTaskConversation,
  isAbandonmentOrCancelCommand,
  parseNaturalCommand,
  parseWhatsAppEditCommand,
  transformWhatsAppDraft,
  WhatsAppEditCommand,
} from './commandIntentEngine';
import { getRealUrlForTask, resolveDemoAppId } from './demoAppRegistry';
import {
  buildDemoConfirmationPrompt,
  cancelDemoSession,
  createDemoSessionForTask,
  evaluatePendingTaskTurn,
} from './demoExecutionEngine';
import { buildDirectionsUrl } from './platformExecutor';

export interface LastTaskContext {
  task: AssistantTask;
  session: DemoExecutionSession;
  selectedIndex: number;
}

export type ContextualFollowUpResult =
  | {
      matched: true;
      action:
        | 'provide_link'
        | 'select_item'
        | 'next_item'
        | 'directions'
        | 'ask_new_search'
        | 'no_prior_context';
      replyText: string;
      url?: string | null;
      updatedContext?: LastTaskContext;
      newTask?: AssistantTask;
    }
  | { matched: false };

export function isLikelyUnrelatedQuestion(rawInput: string): boolean {
  const text = rawInput.trim();
  const lower = text.toLowerCase();
  if (!text) return false;
  return (
    /^(?:what|who|where|when|why|how|can you|could you|will you|do you|are you|is there)\b/i.test(
      lower
    ) ||
    /^(?:क्या|कौन|कहाँ|कब|क्यों|कैसे)\b/.test(text) ||
    /^(?:ಏನು|ಯಾರು|ಎಲ್ಲಿ|ಯಾವಾಗ|ಏಕೆ|ಹೇಗೆ)\b/.test(text)
  );
}

export function isGenericContinuationRequest(rawInput: string): boolean {
  const text = rawInput.trim();
  const lower = text
    .toLowerCase()
    .replace(/[-_]+/g, ' ')
    .replace(/[.!?।]+$/g, '')
    .trim();
  if (!lower) return false;

  return (
    /^(?:please\s+)?(?:continue|proceed|go ahead)(?:\s+with)?(?:\s+the)?\s+(?:browser\s+supported|supported|current|that|this)?\s*task(?:\s+please)?$/i.test(
      lower
    ) ||
    /^(?:please\s+)?(?:continue|proceed|go ahead)\s+with\s+(?:the\s+|that\s+|this\s+)?(?:browser\s+supported\s+)?(?:task|action|one)(?:\s+please)?$/i.test(
      lower
    ) ||
    /^(?:please\s+)?(?:do|continue|start)\s+(?:a\s+|the\s+)?browser\s+supported\s+task$/i.test(
      lower
    ) ||
    /(?:ब्राउज़र\s*समर्थित\s*कार्य|इसी\s*कार्य)\s*(?:के\s*साथ\s*)?(?:आगे\s*बढ़ें|जारी\s*रखें)/.test(
      text
    ) ||
    /(?:ಬ್ರೌಸರ್\s*ಬೆಂಬಲಿತ\s*ಕಾರ್ಯ|ಈ\s*ಕಾರ್ಯ)(?:ವನ್ನು|ದೊಂದಿಗೆ)?\s*(?:ಮುಂದುವರಿಸಿ|ಮುಂದುವರೆಸಿ)/.test(
      text
    )
  );
}

export function isConversationalCorrectionWithoutTarget(rawInput: string): boolean {
  const text = rawInput.trim();
  const lower = text.toLowerCase();
  if (!lower) return false;
  return (
    /^(?:no|nope|sorry)[,.\s]+(?:that(?:'s| is)|it(?:'s| is))\s+not\s+(?:correct|right)\b/i.test(
      lower
    ) ||
    /^(?:no|nope)[,.\s]+(?:that(?:'s| is)|it(?:'s| is))\s+(?:wrong|incorrect)\b/i.test(
      lower
    ) ||
    /^(?:actually|wait)[,.\s]+(?:my\s+name\s+is|that(?:'s| is)\s+not\s+(?:correct|right)|let\s+me\s+correct)/i.test(
      lower
    ) ||
    /^(?:let\s+me\s+correct\s+(?:that|it)|that\s+is\s+not\s+what\s+i\s+(?:meant|said))/i.test(
      lower
    ) ||
    /^(?:नहीं|गलत)[,.\s]+(?:यह\s*सही\s*नहीं|मेरा\s*नाम)/.test(text) ||
    /^(?:ಇಲ್ಲ|ತಪ್ಪು)[,.\s]+(?:ಇದು\s*ಸರಿಯಲ್ಲ|ನನ್ನ\s*ಹೆಸರು)/.test(text)
  );
}

function buildGenericContinuationResponse(
  activeTask: AssistantTask | null,
  lastContext: LastTaskContext | null,
  mode: ExecutionMode,
  lang: LanguageCode
): {
  replyText: string;
  taskToExecute?: AssistantTask;
} {
  if (activeTask && activeTask.executionStatus === 'awaiting_confirmation') {
    const label =
      activeTask.target && activeTask.target !== activeTask.application
        ? `${activeTask.application || 'task'} (${activeTask.target})`
        : activeTask.application || 'the current task';
    return {
      taskToExecute: activeTask,
      replyText:
        lang === 'hi'
          ? `ठीक है, मैं ${label} के साथ आगे बढ़ रही हूँ।`
          : lang === 'kn'
            ? `ಸರಿ, ನಾನು ${label} ಜೊತೆ ಮುಂದುವರಿಯುತ್ತಿದ್ದೇನೆ.`
            : `Continuing with ${label}.`,
    };
  }

  if (activeTask && activeTask.executionStatus === 'needs_info') {
    const missing = activeTask.missingParameters.join(', ') || 'more details';
    return {
      replyText:
        lang === 'hi'
          ? `हमें अभी पिछले कार्य (${activeTask.application || 'कार्य'}) को पूरा करने के लिए ${missing} की आवश्यकता है। कृपया वह जानकारी बताएँ, या कुछ नया कहें।`
          : lang === 'kn'
            ? `ಹಿಂದಿನ ಕಾರ್ಯವನ್ನು (${activeTask.application || 'ಕಾರ್ಯ'}) ಪೂರ್ಣಗೊಳಿಸಲು ನಮಗೆ ಇನ್ನೂ ${missing} ಅಗತ್ಯವಿದೆ. ದಯವಿಟ್ಟು ಆ ವಿವರ ತಿಳಿಸಿ, ಅಥವಾ ಹೊಸದಾಗಿ ಏನಾದರೂ ಹೇಳಿ.`
            : `We still need ${missing} to finish your ${activeTask.application || 'current'} request. Please share that detail, or tell me a new task to start.`,
    };
  }

  if (activeTask && activeTask.executionStatus === 'unavailable_on_web') {
    const appLabel = activeTask.application || 'that app';
    return {
      replyText:
        lang === 'hi'
          ? `${appLabel} वेब ब्राउज़र में सीधे उपलब्ध नहीं है${mode === 'real_browser' ? ' (आप इसके लिए ऊपर Interactive Demo Mode चुन सकते हैं)' : ''}। इसके बजाय आप मुझे YouTube खोलने, Google पर कुछ खोजने, Google Maps पर स्थान देखने, या WhatsApp संदेश तैयार करने के लिए कह सकते हैं।`
          : lang === 'kn'
            ? `${appLabel} ವೆಬ್ ಬ್ರೌಸರ್‌ನಲ್ಲಿ ನೇರವಾಗಿ ಲಭ್ಯವಿಲ್ಲ${mode === 'real_browser' ? ' (ಇದಕ್ಕಾಗಿ ಮೇಲೆ Interactive Demo Mode ಆಯ್ಕೆಮಾಡಬಹುದು)' : ''}. ಬದಲಾಗಿ ನೀವು YouTube ತೆರೆಯಲು, Google ನಲ್ಲಿ ಹುಡುಕಲು, Google Maps ನೋಡಲು, ಅಥವಾ WhatsApp ಸಂದೇಶ ಸಿದ್ಧಪಡಿಸಲು ಹೇಳಬಹುದು.`
            : `${appLabel} cannot be opened directly in Real Browser Mode${mode === 'real_browser' ? ' (you can switch to Interactive Demo Mode above to try the simulated version)' : ''}. For a browser-supported task, try asking me to search Google, open YouTube, find a nearby place on Google Maps, or prepare a WhatsApp message.`,
    };
  }

  if (lastContext) {
    const recentName = lastContext.task.application || lastContext.session.appName;
    return {
      replyText:
        lang === 'hi'
          ? `पिछला कार्य (${recentName}) पूरा हो चुका है। आगे आप YouTube वीडियो खोजने, Google पर खोज करने, नज़दीकी जगह ढूँढने, कैलकुलेटर या कैलेंडर उपयोग करने के लिए कह सकते हैं।`
          : lang === 'kn'
            ? `ಹಿಂದಿನ ಕಾರ್ಯ (${recentName}) ಪೂರ್ಣಗೊಂಡಿದೆ. ಮುಂದೆ ನೀವು YouTube ವೀಡಿಯೊ ಹುಡುಕಲು, Google ನಲ್ಲಿ ಹುಡುಕಲು, ಹತ್ತಿರದ ಸ್ಥಳ ಹುಡುಕಲು, ಕ್ಯಾಲ್ಕುಲೇಟರ್ ಅಥವಾ ಕ್ಯಾಲೆಂಡರ್ ಬಳಸಲು ಹೇಳಬಹುದು.`
            : `Your previous task (${recentName}) is already complete. Tell me what you would like to do next—such as searching Google, opening a YouTube video, finding a nearby pharmacy, using the Calculator, or scheduling in the Calendar.`,
    };
  }

  return {
    replyText:
      lang === 'hi'
        ? 'अभी कोई कार्य लंबित नहीं है। आप मुझसे "YouTube खोलो", "नज़दीकी मेडिकल स्टोर ढूँढो", "250 + 350 जोड़ो", या "कैलेंडर में मीटिंग जोड़ो" कह सकते हैं।'
        : lang === 'kn'
          ? 'ಸದ್ಯಕ್ಕೆ ಯಾವುದೇ ಬಾಕಿ ಕಾರ್ಯವಿಲ್ಲ. ನೀವು "YouTube ತೆರೆಯಿರಿ", "ಹತ್ತಿರದ ಔಷಧಾಲಯ ಹುಡುಕಿ", "250 + 350 ಲೆಕ್ಕ ಹಾಕಿ", ಅಥವಾ "ಕ್ಯಾಲೆಂಡರ್‌ನಲ್ಲಿ ಮೀಟಿಂಗ್ ಸೇರಿಸಿ" ಎಂದು ಕೇಳಬಹುದು.'
          : 'There is no pending task right now. You can ask me to search Google, open a YouTube video, find nearby places on Google Maps, calculate a number, schedule in the Calendar, or prepare a WhatsApp message.',
  };
}

function getSafeExternalUrl(context: LastTaskContext): string | null {
  const { task, session, selectedIndex } = context;
  if (session.appId === 'chrome' && session.payload.chromeState) {
    const item = session.payload.chromeState.results[selectedIndex];
    if (item?.url) return item.url;
    if (session.payload.chromeState.searchUrl) return session.payload.chromeState.searchUrl;
  }
  if (session.appId === 'youtube' && session.payload.youTubeState) {
    return session.payload.youTubeState.watchUrl || session.externalUrl || null;
  }
  if (session.appId === 'spotify' && session.payload.spotifyState) {
    return session.payload.spotifyState.spotifyUrl || session.externalUrl || null;
  }
  if (session.appId === 'maps' && session.payload.mapsState) {
    return session.payload.mapsState.mapsUrl || session.externalUrl || null;
  }
  return (
    session.externalUrl ||
    task.externalUrl ||
    getRealUrlForTask(task, session.appId, session.payload.mapsState?.coordinates)
  );
}

export function applySelectionToSession(
  session: DemoExecutionSession,
  selectedIndex: number
): { session: DemoExecutionSession; label: string } {
  const nextPayload = { ...session.payload };
  let label = session.appName;

  if (nextPayload.youTubeState && nextPayload.youTubeState.searchResults?.length) {
    const list = nextPayload.youTubeState.searchResults;
    const clamped = ((selectedIndex % list.length) + list.length) % list.length;
    const picked = list[clamped];
    nextPayload.youTubeState = {
      ...nextPayload.youTubeState,
      selectedVideoId: picked.id,
      videoTitle: picked.title,
      channelName: picked.channel,
      duration: picked.duration,
      playerOpen: true,
      isPlaying: true,
      progressPercent: 18,
    };
    label = picked.title;
  } else if (nextPayload.chromeState && nextPayload.chromeState.results.length) {
    const list = nextPayload.chromeState.results;
    const clamped = ((selectedIndex % list.length) + list.length) % list.length;
    const picked = list[clamped];
    nextPayload.chromeState = {
      ...nextPayload.chromeState,
      selectedResultIndex: clamped,
    };
    label = picked.title;
  } else if (nextPayload.mapsState && nextPayload.mapsState.places.length) {
    const list = nextPayload.mapsState.places;
    const clamped = ((selectedIndex % list.length) + list.length) % list.length;
    const picked = list[clamped];
    nextPayload.mapsState = {
      ...nextPayload.mapsState,
      selectedPlaceIndex: clamped,
    };
    label = picked.name;
  } else if (nextPayload.spotifyState && nextPayload.spotifyState.tracks.length) {
    const list = nextPayload.spotifyState.tracks;
    const clamped = ((selectedIndex % list.length) + list.length) % list.length;
    const picked = list[clamped];
    nextPayload.spotifyState = {
      ...nextPayload.spotifyState,
      selectedTrackId: picked.id,
      playerOpen: true,
      isPlaying: true,
      progressPercent: 20,
    };
    label = `${picked.title} — ${picked.artist}`;
  }

  return {
    session: {
      ...session,
      payload: nextPayload,
    },
    label,
  };
}

function getItemCount(session: DemoExecutionSession): number {
  if (session.payload.youTubeState?.searchResults?.length) {
    return session.payload.youTubeState.searchResults.length;
  }
  if (session.payload.chromeState?.results.length) {
    return session.payload.chromeState.results.length;
  }
  if (session.payload.mapsState?.places.length) {
    return session.payload.mapsState.places.length;
  }
  if (session.payload.spotifyState?.tracks.length) {
    return session.payload.spotifyState.tracks.length;
  }
  return 0;
}

function parseOrdinalIndex(rawText: string): number | null {
  const lower = rawText.toLowerCase();
  if (/\b(?:first|1st|one)\b|पहला|पहले|ಮೊದಲ/.test(lower)) return 0;
  if (/\b(?:second|2nd|two)\b|दूसरा|दूसरे|ಎರಡನೇ/.test(lower)) return 1;
  if (/\b(?:third|3rd|three)\b|तीसरा|तीसरे|ಮೂರನೇ/.test(lower)) return 2;
  return null;
}

export function parseContextualFollowUp(
  rawInput: string,
  lastContext: LastTaskContext | null,
  lang: LanguageCode = 'en'
): ContextualFollowUpResult {
  const text = rawInput.trim();
  const lower = text.toLowerCase();

  const isLinkRequest =
    /\b(?:give|send|show|share|get)\s+(?:me\s+)?(?:the\s+|that\s+|a\s+)?(?:link|url|website)\b|^link\s+please[.!?]*$/i.test(
      lower
    ) ||
    /लिंक\s*(?:दो|दीजिए|भेजो|दिखाओ)/.test(text) ||
    /ಲಿಂಕ್\s*(?:ಕೊಡಿ|ತೋರಿಸಿ|ನೀಡಿ)/.test(text);

  const isOrdinalOrOpenIt =
    /\b(?:open|play|show(?:\s+me)?|select|choose)\s+(?:the\s+)?(?:first|second|third|1st|2nd|3rd)\s+(?:video|result|option|track|song|place|link)\b/i.test(
      lower
    ) ||
    /^(?:play|open|show)\s+(?:that|it|this|this\s+one|the\s+video|the\s+song)[.!?]*$/i.test(
      lower
    ) ||
    /(?:पहला|दूसरा|तीसरा)\s*(?:वीडियो|परिणाम|गाना)|(?:ಮೊದಲ|ಎರಡನೇ|ಮೂರನೇ)\s*(?:ವೀಡಿಯೊ|ಫಲಿತಾಂಶ|ಹಾಡು)/.test(
      text
    );

  const isMoreOrAnother =
    /\b(?:show(?:\s+me)?|find|open|play)\s+(?:another|more|next)\s+(?:videos?|results?|tracks?|songs?|places?|pharmacy|pharmacies|hospitals?|options?)\b|\bshow\s+me\s+more\b|\bnext\s+(?:video|result|song|track)\b/i.test(
      lower
    ) ||
    /अगला\s*(?:वीडियो|परिणाम|गाना)|और\s*परिणाम|ಮತ್ತೊಂದು\s*(?:ವೀಡಿಯೊ|ಫಲಿತಾಂಶ)/.test(text);

  const isDirectionsFollowUp =
    /^(?:please\s+|can\s+you\s+)?(?:give|show|get)\s+(?:me\s+)?directions(?:\s+there|\s+to\s+it)?[.!?]*$/i.test(
      lower
    ) ||
    /^(?:how\s+do\s+i\s+get\s+there|directions\s+please)[.!?]*$/i.test(lower) ||
    /रास्ता\s*(?:दिखाओ|बताओ)|ದಾರಿ\s*ತೋರಿಸಿ/.test(text);

  const isSearchSomethingElse =
    /\bsearch\s+for\s+something\s+else\b|\bfind\s+something\s+else\b/i.test(lower);

  const looksContextual =
    isLinkRequest ||
    isOrdinalOrOpenIt ||
    isMoreOrAnother ||
    isDirectionsFollowUp ||
    isSearchSomethingElse;

  if (!looksContextual) {
    return { matched: false };
  }

  if (!lastContext) {
    return {
      matched: true,
      action: 'no_prior_context',
      replyText:
        lang === 'hi'
          ? 'अभी कोई पिछला खोज परिणाम या लिंक उपलब्ध नहीं है। पहले आप कुछ खोजने या खोलने के लिए कहें।'
          : lang === 'kn'
            ? 'ಸದ್ಯಕ್ಕೆ ಯಾವುದೇ ಹಿಂದಿನ ಹುಡುಕಾಟ ಫಲಿತಾಂಶ ಅಥವಾ ಲಿಂಕ್ ಇಲ್ಲ. ಮೊದಲು ಏನಾದರೂ ಹುಡುಕಲು ಅಥವಾ ತೆರೆಯಲು ಹೇಳಿ.'
            : 'There is no recent search or active item to refer to yet. Please ask me to search for something or open an app first.',
    };
  }

  if (isSearchSomethingElse) {
    const newTask: AssistantTask = {
      id: `task-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      rawInstruction: text,
      intent: 'search',
      application: 'Google Search',
      action: 'web_search',
      target: null,
      searchQuery: null,
      messageContent: null,
      locationIntent: 'none',
      requiredParameters: ['query'],
      missingParameters: ['query'],
      confirmationRequired: true,
      executionStatus: 'needs_info',
    };
    return {
      matched: true,
      action: 'ask_new_search',
      newTask,
      replyText:
        lang === 'hi'
          ? 'ठीक है, आप अब क्या खोजना चाहते हैं?'
          : lang === 'kn'
            ? 'ಸರಿ, ಈಗ ನೀವು ಏನನ್ನು ಹುಡುಕಲು ಬಯಸುತ್ತೀರಿ?'
            : 'Sure, what would you like me to search for next?',
    };
  }

  if (isLinkRequest) {
    const url = getSafeExternalUrl(lastContext);
    if (!url) {
      return {
        matched: true,
        action: 'provide_link',
        url: null,
        replyText:
          lang === 'hi'
            ? 'यह कार्य केवल स्थानीय डेमो ऐप में चल रहा है, इसके लिए कोई बाहरी वेबसाइट लिंक उपलब्ध नहीं है।'
            : lang === 'kn'
              ? 'ಈ ಕಾರ್ಯವು ಸ್ಥಳೀಯ ಡೆಮೊ ಆ್ಯಪ್‌ನಲ್ಲಿ ಮಾತ್ರ ಇದೆ, ಇದಕ್ಕೆ ಯಾವುದೇ ಬಾಹ್ಯ ವೆಬ್‌ಸೈಟ್ ಲಿಂಕ್ ಇಲ್ಲ.'
              : `${lastContext.session.appName} runs locally in Demo Mode and does not have an external web link.`,
      };
    }

    const topic =
      lastContext.task.searchQuery ||
      lastContext.task.target ||
      lastContext.session.appName;
    return {
      matched: true,
      action: 'provide_link',
      url,
      updatedContext: lastContext,
      replyText:
        lang === 'hi'
          ? `"${topic}" के लिए यह रहा वास्तविक लिंक: ${url}`
          : lang === 'kn'
            ? `"${topic}" ಗಾಗಿ ನಿಜವಾದ ಲಿಂಕ್ ಇಲ್ಲಿದೆ: ${url}`
            : `Here is the real link for "${topic}": ${url}`,
    };
  }

  if (isDirectionsFollowUp) {
    const placeName =
      lastContext.session.payload.mapsState?.places?.[lastContext.selectedIndex]?.name
        ?.replace(/\s*\(Demo Data\)/i, '')
        .trim() ||
      lastContext.task.target ||
      'hospital';
    const coords = lastContext.session.payload.mapsState?.coordinates || null;
    const url = buildDirectionsUrl(placeName, coords);
    const dirTask: AssistantTask = {
      id: `task-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      rawInstruction: text,
      intent: 'search',
      application: 'Google Maps',
      action: 'directions',
      target: placeName,
      searchQuery: placeName,
      messageContent: null,
      locationIntent: 'directions',
      requiredParameters: [],
      missingParameters: [],
      confirmationRequired: false,
      requiresLocation: true,
      externalUrl: url,
      externalLabel: `Open Directions to ${placeName}`,
      executionStatus: 'simulated_completed',
    };
    const nextSession: DemoExecutionSession = {
      ...lastContext.session,
      taskId: dirTask.id,
      appId: 'maps',
      appName: 'Google Maps',
      recognisedCommand: text,
      requestedAction: `Directions to "${placeName}"`,
      externalUrl: url,
      externalLabel: dirTask.externalLabel,
      payload: {
        ...lastContext.session.payload,
        appId: 'maps',
        appName: 'Google Maps',
        mapsState: {
          ...(lastContext.session.payload.mapsState || {
            query: placeName,
            destination: placeName,
            originLabel: 'Example Demo Area',
            isRealLocation: false,
            places: [],
            routeSummary: '',
            mapsUrl: url,
          }),
          destination: placeName,
          mapsUrl: url,
          routeSummary: `Simulated route preview to ${placeName}. Use the real Google Maps link for live navigation.`,
        },
      },
      resultSummary: `Prepared simulated route preview and real Google Maps directions link for ${placeName}.`,
    };
    const updatedContext: LastTaskContext = {
      task: dirTask,
      session: nextSession,
      selectedIndex: lastContext.selectedIndex,
    };
    return {
      matched: true,
      action: 'directions',
      url,
      updatedContext,
      replyText:
        lang === 'hi'
          ? `मैंने "${placeName}" के लिए दिशा-निर्देश लिंक तैयार कर दिया है: ${url}`
          : lang === 'kn'
            ? `"${placeName}" ಗೆ ದಾರಿ ತೋರಿಸುವ ಲಿಂಕ್ ಸಿದ್ಧವಾಗಿದೆ: ${url}`
            : `I prepared the route preview for ${placeName} in the demo screen. Real Google Maps directions link: ${url}`,
    };
  }

  const count = getItemCount(lastContext.session);
  if (count === 0) {
    const url = getSafeExternalUrl(lastContext);
    return {
      matched: true,
      action: 'select_item',
      url,
      updatedContext: lastContext,
      replyText: url
        ? `Opened the current preview for "${lastContext.task.target || lastContext.session.appName}". Link: ${url}`
        : `Showing the current ${lastContext.session.appName} preview in Demo Mode.`,
    };
  }

  const requestedOrdinal = parseOrdinalIndex(text);
  const targetIdx = isMoreOrAnother
    ? (lastContext.selectedIndex + 1) % count
    : requestedOrdinal !== null
      ? Math.min(requestedOrdinal, count - 1)
      : lastContext.selectedIndex;

  const { session: updatedSession, label } = applySelectionToSession(
    lastContext.session,
    targetIdx
  );
  const updatedContext: LastTaskContext = {
    task: lastContext.task,
    session: updatedSession,
    selectedIndex: targetIdx,
  };
  const url = getSafeExternalUrl(updatedContext);

  if (isMoreOrAnother) {
    return {
      matched: true,
      action: 'next_item',
      url,
      updatedContext,
      replyText:
        lang === 'hi'
          ? `मैंने अगला विकल्प खोला है: ${label}।`
          : lang === 'kn'
            ? `ಮುಂದಿನ ಆಯ್ಕೆಯನ್ನು ತೋರಿಸುತ್ತಿದ್ದೇನೆ: ${label}.`
            : `Showing the next demo option (${targetIdx + 1} of ${count}): ${label}.`,
    };
  }

  return {
    matched: true,
    action: 'select_item',
    url,
    updatedContext,
    replyText:
      lang === 'hi'
        ? `मैंने चुना है: ${label}।`
        : lang === 'kn'
          ? `ಇದನ್ನು ತೆರೆಯಲಾಗಿದೆ: ${label}.`
          : `Opened "${label}" in the ${updatedSession.appName} demo screen.${
              url ? ` Link: ${url}` : ''
            }`,
  };
}

export function applyWhatsAppDraftEdit(
  task: AssistantTask,
  session: DemoExecutionSession | null,
  editCmd: WhatsAppEditCommand,
  mode: ExecutionMode,
  lang: LanguageCode = 'en'
): {
  task: AssistantTask;
  session: DemoExecutionSession | null;
  replyText: string;
} {
  const currentRecipient = task.target || task.recipient || 'your contact';
  const currentMessage =
    task.messageContent ||
    session?.payload.whatsAppState?.draftMessage ||
    'Hello';

  if (editCmd.type === 'ask_new_message') {
    const nextTask: AssistantTask = {
      ...task,
      messageContent: null,
      missingParameters: ['messageContent'],
      executionStatus: 'needs_info',
    };
    const nextSession = session
      ? {
          ...session,
          status: 'waiting_for_confirmation' as const,
        }
      : null;
    return {
      task: nextTask,
      session: nextSession,
      replyText:
        lang === 'hi'
          ? 'नया संदेश क्या लिखना है?'
          : lang === 'kn'
            ? 'ಹೊಸ ಸಂದೇಶದಲ್ಲಿ ಏನು ಬರೆಯಬೇಕು?'
            : 'What would you like the new message to say?',
    };
  }

  let nextRecipient = currentRecipient;
  let nextMessage = currentMessage;

  if (editCmd.type === 'make_personal') {
    nextMessage = transformWhatsAppDraft(currentMessage, currentRecipient, 'personal', lang);
  } else if (editCmd.type === 'make_shorter') {
    nextMessage = transformWhatsAppDraft(currentMessage, currentRecipient, 'shorter', lang);
  } else if (editCmd.type === 'change_message') {
    nextMessage = editCmd.newText;
  } else if (editCmd.type === 'change_recipient') {
    nextRecipient = editCmd.newRecipient;
  }

  const nextTask: AssistantTask = {
    ...task,
    target: nextRecipient,
    recipient: nextRecipient,
    messageContent: nextMessage,
    missingParameters: [],
    executionStatus: 'awaiting_confirmation',
  };

  const realUrl = getRealUrlForTask(nextTask, 'whatsapp', null);
  nextTask.externalUrl = realUrl;

  const nextSession = createDemoSessionForTask(nextTask, mode, lang);
  const replyText =
    buildDemoConfirmationPrompt(nextTask, mode, lang) ||
    `Updated your WhatsApp message for ${nextRecipient}: "${nextMessage}". Would you like me to continue?`;

  return {
    task: nextTask,
    session: nextSession,
    replyText,
  };
}

export type ConversationTurnOutcome =
  | {
      outcome: 'cancelled_pending';
      task: AssistantTask | null;
      session: DemoExecutionSession | null;
      replyText: string;
    }
  | {
      outcome: 'updated_whatsapp_draft';
      task: AssistantTask;
      session: DemoExecutionSession | null;
      replyText: string;
    }
  | {
      outcome: 'execute_pending';
      task: AssistantTask;
    }
  | {
      outcome: 'reprompt_pending';
      task: AssistantTask;
      replyText: string;
    }
  | {
      outcome: 'advanced_needs_info';
      task: AssistantTask;
      session: DemoExecutionSession | null;
      replyText: string;
      executeImmediately: boolean;
    }
  | {
      outcome: 'contextual_follow_up';
      result: Extract<ContextualFollowUpResult, { matched: true }>;
    }
  | {
      outcome: 'generic_continuation';
      replyText: string;
    }
  | {
      outcome: 'no_active_form_correction';
      replyText: string;
    }
  | {
      outcome: 'pass_to_new_command';
      abandonedPrevious: boolean;
    };

/**
 * Deterministic conversation & task state-machine arbiter:
 * 1. Explicit cancellation/abandonment clears pending/incomplete tasks cleanly.
 * 2. WhatsApp draft edits update the prepared message & re-confirm without auto-sending.
 * 3. Awaiting confirmation accepts natural affirmative/negative replies.
 * 4. Generic continuation phrases inspect actual pending/recent state instead of inventing tasks.
 * 5. Active needs_info collects missing slot UNLESS user gave a new command or unrelated question.
 * 6. Contextual follow-ups operate cleanly on lastTaskContext.
 * 7. Unsolicited correction phrases in general mode ask for clarification instead of opening welfare form.
 */
export function resolveTaskContextTurn(
  rawInput: string,
  activeTask: AssistantTask | null,
  demoSession: DemoExecutionSession | null,
  lastContext: LastTaskContext | null,
  mode: ExecutionMode,
  lang: LanguageCode = 'en',
  conversationMode: ConversationMode = 'general'
): ConversationTurnOutcome {
  const cleaned = rawInput.trim();
  const hasPendingOrNeedsInfo =
    activeTask?.executionStatus === 'awaiting_confirmation' ||
    activeTask?.executionStatus === 'needs_info' ||
    demoSession?.status === 'waiting_for_confirmation';

  // 1. Always allow abandoning or cancelling an incomplete or awaiting task
  if (hasPendingOrNeedsInfo && isAbandonmentOrCancelCommand(cleaned)) {
    const cancelledTask: AssistantTask | null = activeTask
      ? { ...activeTask, executionStatus: 'cancelled' }
      : null;
    const cancelledSessionRes = demoSession
      ? cancelDemoSession(demoSession, lang)
      : null;
    return {
      outcome: 'cancelled_pending',
      task: cancelledTask,
      session: cancelledSessionRes?.session || null,
      replyText:
        cancelledSessionRes?.replyText ||
        (lang === 'hi'
          ? 'ठीक है, मैंने पिछला कार्य रद्द कर दिया है। अब आप कुछ नया पूछ सकते हैं।'
          : lang === 'kn'
            ? 'ಸರಿ, ಹಿಂದಿನ ಕಾರ್ಯವನ್ನು ರದ್ದುಗೊಳಿಸಿದ್ದೇನೆ. ಈಗ ನೀವು ಬೇರೆ ಏನಾದರೂ ಕೇಳಬಹುದು.'
            : 'Okay, I cancelled that previous request. What would you like to do instead?'),
    };
  }

  // 2. WhatsApp draft editing while awaiting confirmation or immediately after WhatsApp draft
  const editSourceTask =
    activeTask && resolveDemoAppId(activeTask) === 'whatsapp'
      ? activeTask
      : lastContext && lastContext.session.appId === 'whatsapp'
        ? lastContext.task
        : null;
  if (editSourceTask) {
    const editCmd = parseWhatsAppEditCommand(cleaned);
    if (editCmd) {
      const updated = applyWhatsAppDraftEdit(
        editSourceTask,
        demoSession || lastContext?.session || null,
        editCmd,
        mode,
        lang
      );
      return {
        outcome: 'updated_whatsapp_draft',
        task: updated.task,
        session: updated.session,
        replyText: updated.replyText,
      };
    }
  }

  // 3. Generic continuation requests ("Continue with the browser supported task.")
  if (isGenericContinuationRequest(cleaned)) {
    const cont = buildGenericContinuationResponse(activeTask, lastContext, mode, lang);
    if (cont.taskToExecute) {
      return { outcome: 'execute_pending', task: cont.taskToExecute };
    }
    return {
      outcome: 'generic_continuation',
      replyText: cont.replyText,
    };
  }

  // 4. Pending confirmation turn ("Yes, please open", "No, cancel", etc.)
  const pendingTurn = evaluatePendingTaskTurn(
    cleaned,
    activeTask,
    demoSession,
    mode,
    lang
  );
  if (pendingTurn.handled) {
    if (pendingTurn.action === 'execute') {
      return { outcome: 'execute_pending', task: pendingTurn.task };
    }
    if (pendingTurn.action === 'cancel') {
      return {
        outcome: 'cancelled_pending',
        task: pendingTurn.task,
        session: pendingTurn.session,
        replyText: pendingTurn.replyText,
      };
    }
    return {
      outcome: 'reprompt_pending',
      task: pendingTurn.task,
      replyText: pendingTurn.replyText,
    };
  }

  // 5. Incomplete task awaiting missing info (e.g. recipient, message body, education level, calendar date/time/title)
  if (activeTask && activeTask.executionStatus === 'needs_info') {
    const maybeNewCmd = parseNaturalCommand(cleaned, lang);
    const isExplicitNewCommand =
      maybeNewCmd.matched &&
      maybeNewCmd.task &&
      maybeNewCmd.task.intent !== 'general_conversation';

    if (isExplicitNewCommand || isLikelyUnrelatedQuestion(cleaned)) {
      return {
        outcome: 'pass_to_new_command',
        abandonedPrevious: true,
      };
    }

    const advanced = advanceTaskConversation(activeTask, cleaned, lang);
    if (advanced.task.executionStatus === 'cancelled') {
      return {
        outcome: 'cancelled_pending',
        task: advanced.task,
        session: demoSession ? cancelDemoSession(demoSession, lang).session : null,
        replyText: advanced.replyText,
      };
    }

    return {
      outcome: 'advanced_needs_info',
      task: advanced.task,
      session: createDemoSessionForTask(advanced.task, mode, lang),
      replyText: advanced.replyText,
      executeImmediately:
        advanced.task.application === 'Calendar' &&
        advanced.task.executionStatus === 'ready',
    };
  }

  // 6. Contextual follow-ups ("Give me the link.", "Open the first video.", "Show me the second result.", etc.)
  const followUp = parseContextualFollowUp(cleaned, lastContext, lang);
  if (followUp.matched) {
    return {
      outcome: 'contextual_follow_up',
      result: followUp,
    };
  }

  // 7. Guard: conversational correction in general mode ("No, it's not correct, my name is...")
  // must NOT hijack into Welfare Application form when no welfare form session is active
  if (
    conversationMode !== 'welfare_form' &&
    isConversationalCorrectionWithoutTarget(cleaned)
  ) {
    return {
      outcome: 'no_active_form_correction',
      replyText:
        lang === 'hi'
          ? 'क्षमा करें यदि मैंने कुछ गलत समझा। अभी कोई कल्याण आवेदन फ़ॉर्म खुला नहीं है। कृपया बताएँ कि आप क्या सुधारना चाहते हैं या नया काम क्या करना है (जैसे "मेरा कल्याण आवेदन शुरू करें" या "YouTube खोलो")।'
          : lang === 'kn'
            ? 'ನಾನು ತಪ್ಪಾಗಿ ಅರ್ಥಮಾಡಿಕೊಂಡಿದ್ದರೆ ಕ್ಷಮಿಸಿ. ಸದ್ಯಕ್ಕೆ ಯಾವುದೇ ಕಲ್ಯಾಣ ಅರ್ಜಿ ಫಾರ್ಮ್ ತೆರೆದಿಲ್ಲ. ದಯವಿಟ್ಟು ನೀವು ಏನನ್ನು ಸರಿಪಡಿಸಲು ಬಯಸುತ್ತೀರಿ ಅಥವಾ ಮುಂದಿನ ಕಾರ್ಯವೇನು ಎಂದು ಹೇಳಿ.'
            : 'Sorry if I misunderstood earlier. There is no active welfare form open right now—please tell me what you would like to update or start next (for example, say "Start my welfare application" to fill the form, or ask for another task).',
    };
  }

  return {
    outcome: 'pass_to_new_command',
    abandonedPrevious: false,
  };
}
