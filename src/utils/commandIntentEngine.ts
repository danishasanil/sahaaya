import {
  AssistantTask,
  CommandCategory,
  LanguageCode,
} from '../types/sahaaya';
import {
  buildCalculatorReply,
  extractCalculatorCommand,
} from './calculatorEngine';
import {
  buildCalendarPrompt,
  extractCalendarCommand,
  extractDateFromText,
  extractTimeDetailsFromText,
  extractTimeFromText,
} from './calendarEngine';
import { buildYouTubeSearchUrl } from './platformExecutor';
import { normalizeSpeechCommandPronunciation } from './pronunciationAndLanguageEngine';

export interface CommandParseResult {
  matched: boolean;
  task: AssistantTask | null;
  replyText: string;
  webAction?:
    | { type: 'go_home' }
    | { type: 'go_back' }
    | { type: 'scroll_down' }
    | { type: 'scroll_up' }
    | { type: 'read_screen' }
    | { type: 'explain_page' }
    | { type: 'read_latest_message' }
    | { type: 'explain_controls' }
    | { type: 'read_application' }
    | { type: 'explain_missing_fields' }
    | { type: 'start_application' }
    | { type: 'continue_application' }
    | { type: 'review_application' }
    | { type: 'open_form' };
}

interface KnownAppDefinition {
  canonicalName: string;
  patterns: RegExp[];
}

const KNOWN_APPS: KnownAppDefinition[] = [
  { canonicalName: 'YouTube', patterns: [/\byoutube\b/i, /यूट्यूब/, /ಯೂಟ್ಯೂಬ್/] },
  { canonicalName: 'WhatsApp', patterns: [/\bwhatsapp\b/i, /\bwhats app\b/i, /व्हाट्सएप|व्हाट्सऐप/, /ವಾಟ್ಸಾಪ್/] },
  { canonicalName: 'Spotify', patterns: [/\bspotify\b/i, /स्पॉटिफ़ाई|स्पॉटिफाई/, /ಸ್ಪಾಟಿಫೈ/] },
  { canonicalName: 'Google Maps', patterns: [/\bgoogle maps\b/i, /\bmaps\b/i, /गूगल मैप्स|मैप्स/, /ಗೂಗಲ್ ಮ್ಯಾಪ್ಸ್|ಮ್ಯಾಪ್ಸ್/] },
  { canonicalName: 'Chrome', patterns: [/\bgoogle chrome\b/i, /\bchrome\b/i, /\bbrowser\b/i, /गूगल क्रोम|क्रोम/, /ಕ್ರೋಮ್/] },
  { canonicalName: 'Google', patterns: [/\bgoogle\b/i, /गूगल/, /ಗೂಗಲ್/] },
  { canonicalName: 'Camera', patterns: [/\bcamera\b/i, /कैमरा/, /ಕ್ಯಾಮೆರಾ/] },
  { canonicalName: 'Settings', patterns: [/\bsettings\b/i, /सेटिंग्स/, /ಸೆಟ್ಟಿಂಗ್/] },
  { canonicalName: 'Phone', patterns: [/\bphone\b/i, /\bdialer\b/i, /फ़ोन|फोन/, /ಫೋನ್/] },
  { canonicalName: 'Messages', patterns: [/\bmessages\b/i, /\bsms\b/i, /संदेश|मैसेज/, /ಸಂದೇಶ/] },
  { canonicalName: 'Gallery', patterns: [/\bgallery\b/i, /\bphotos\b/i, /गैलरी/, /ಗ್ಯಾಲರಿ/] },
  { canonicalName: 'Calendar', patterns: [/\bcalendar\b/i, /कैलेंडर/, /ಕ್ಯಾಲೆಂಡರ್/] },
  { canonicalName: 'Clock', patterns: [/\bclock\b/i, /\balarm\b/i, /घड़ी|अलार्म|अलारम/, /ಗಡಿಯಾರ|ಅಲರಾಂ|ಅಲಾರಂ|ಅಲಾರಾಂ/] },
  { canonicalName: 'Calculator', patterns: [/\bcalculator\b/i, /कैलकुलेटर/, /ಕ್ಯಾಲ್ಕುಲೇಟರ್/] },
];

function createTaskId(): string {
  return `task-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

function buildCapabilityReply(
  intent: CommandCategory,
  appName: string | null,
  lang: LanguageCode
): string {
  if (lang === 'hi') {
    if (intent === 'unknown_app') {
      return `मैंने "${appName || 'उस ऐप'}" को खोलने का आपका अनुरोध समझा, लेकिन यह वेब डेमो में समर्थित नहीं है और वेब ब्राउज़र से बाहरी मोबाइल ऐप नहीं खोले जा सकते।`;
    }
    return `मैं समझ गया कि आप ${appName || 'यह ऐप'} खोलना चाहते हैं। सुरक्षा और ब्राउज़र सीमाओं के कारण यह वेब प्रोटोटाइप दूसरे मोबाइल ऐप नहीं खोल सकता। Android पर सहाय आपकी अनुमति से इसे खोलेगा।`;
  }
  if (lang === 'kn') {
    if (intent === 'unknown_app') {
      return `"${appName || 'ಆ ಆ್ಯಪ್'}" ತೆರೆಯುವ ನಿಮ್ಮ ವಿನಂತಿಯನ್ನು ನಾನು ಅರ್ಥಮಾಡಿಕೊಂಡೆ, ಆದರೆ ಈ ವೆಬ್ ಡೆಮೊದಲ್ಲಿ ಅದು ಬೆಂಬಲಿತವಾಗಿಲ್ಲ ಮತ್ತು ಬ್ರೌಸರ್‌ನಿಂದ ಇತರ ಮೊಬೈಲ್ ಆ್ಯಪ್‌ಗಳನ್ನು ತೆರೆಯಲು ಸಾಧ್ಯವಿಲ್ಲ.`;
    }
    return `ನೀವು ${appName || 'ಆ ಆ್ಯಪ್'} ತೆರೆಯಲು ಬಯಸುತ್ತೀರಿ ಎಂದು ನನಗೆ ಅರ್ಥವಾಯಿತು. ಆದರೆ ಈ ವೆಬ್ ಪ್ರೋಟೋಟೈಪ್‌ನಿಂದ ಫೋನ್‌ನ ಇತರ ಆ್ಯಪ್‌ಗಳನ್ನು ತೆರೆಯಲು ಸಾಧ್ಯವಿಲ್ಲ. Android ನಲ್ಲಿ ನಿಮ್ಮ ಅನುಮತಿಯೊಂದಿಗೆ ಸಹಾಯ ಇದನ್ನು ಮಾಡುತ್ತದೆ.`;
  }
  if (intent === 'unknown_app') {
    return `I understood your request to open "${appName || 'that application'}", but it is not a recognised app and this web prototype cannot open other mobile apps on your phone.`;
  }
  return `I understood that you want to open ${appName || 'that app'}. Because this is a web prototype, Sahaaya cannot launch external mobile apps on your device. On Android, Sahaaya would open ${appName || 'it'} only with your confirmation.`;
}

function buildSearchQuestion(lang: LanguageCode): string {
  if (lang === 'hi') return 'आप क्या खोजना चाहते हैं?';
  if (lang === 'kn') return 'ನೀವು ಏನನ್ನು ಹುಡುಕಲು ಬಯಸುತ್ತೀರಿ?';
  return 'What would you like me to search for?';
}

function buildSearchConfirmQuestion(query: string, lang: LanguageCode): string {
  if (lang === 'hi') {
    return `मैंने "${query}" खोजने का कार्य तैयार किया है। क्या आप आगे बढ़ना चाहते हैं?`;
  }
  if (lang === 'kn') {
    return `"${query}" ಹುಡುಕುವ ಕಾರ್ಯವನ್ನು ನಾನು ಸಿದ್ಧಪಡಿಸಿದ್ದೇನೆ. ಮುಂದುವರಿಯೋಣವೇ?`;
  }
  return `I prepared a search for "${query}". Would you like to continue?`;
}

function buildMessagingQuestion(
  missing: 'recipient' | 'messageContent',
  lang: LanguageCode
): string {
  if (missing === 'recipient') {
    if (lang === 'hi') return 'आप किसे संदेश भेजना चाहते हैं?';
    if (lang === 'kn') return 'ನೀವು ಯಾರಿಗೆ ಸಂದೇಶ ಕಳುಹಿಸಲು ಬಯಸುತ್ತೀರಿ?';
    return 'Who would you like to message?';
  }
  if (lang === 'hi') return 'आप संदेश में क्या लिखना चाहते हैं?';
  if (lang === 'kn') return 'ಸಂದೇಶದಲ್ಲಿ ನೀವು ಏನು ಹೇಳಲು ಬಯಸುತ್ತೀರಿ?';
  return 'What would you like the message to say?';
}

function buildMessagingConfirmQuestion(
  recipient: string,
  content: string,
  lang: LanguageCode
): string {
  if (lang === 'hi') {
    return `${recipient} के लिए आपका संदेश है: "${content}"। क्या आप आगे बढ़ना चाहते हैं?`;
  }
  if (lang === 'kn') {
    return `${recipient} ಅವರಿಗೆ ನಿಮ್ಮ ಸಂದೇಶ: "${content}". ಮುಂದುವರಿಯಲು ಬಯಸುವಿರಾ?`;
  }
  return `Your message to ${recipient} says: "${content}". Would you like to continue?`;
}

export type PendingConfirmationDecision = 'confirm' | 'cancel' | null;

export function normalizeConfirmationText(rawText: string): string {
  return rawText
    .trim()
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[\p{P}\p{S}]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const NEGATIVE_CANCEL_REGEX =
  /^(?:(?:no|nope)(?:\s+(?:thanks|thank you|cancel|cancel it|cancel this|cancel that|stop|stop it|abort|forget it|forget that|skip it|skip this|never mind|nevermind|dont|do not|dont do it|do not do it|dont open|do not open|dont open it|do not open it|dont send|do not send|dont send it|do not send it|not now|leave it|discard))?|cancel|cancel it|cancel this|cancel that|stop|stop it|never mind|nevermind|dont|do not|dont do it|do not do it|abort|not now|not sure|thats not right|that is not right|not right|not correct|wrong|dont open|do not open|dont open it|do not open it|dont send|do not send|dont send it|do not send it|skip it|skip this|forget it|forget that|leave it|discard|start over|do something else|lets do something else)(?:\s+(?:please|thanks|thank you))?$/;

const NEGATIVE_EXACT_REGEX =
  /^(?:नहीं|ना|मत\s*करो|रद्द\s*(?:करो|करें|कर\s*दो)?|रुको|बंद\s*करो|छोड़ो|रहने\s*दो|ಬೇಡ|ಇಲ್ಲ|ರದ್ದು\s*(?:ಮಾಡಿ)?|ನಿಲ್ಲಿಸಿ|ಬಿಡಿ)(?:[\s,]+(?:धन्यवाद|शुक्रिया|कृपया|ಧನ್ಯವಾದ|ದಯವಿಟ್ಟು|ಬೇಡ))?$/;

const AFFIRMATIVE_EXACT_OR_PREFIX_REGEX =
  /^(yes|yeah|yep|yea|sure|ok|okay|absolutely|definitely|of course|proceed|continue|confirm|correct|right|alright|fine|affirmative)(\s+(please|go ahead|do it|do that|open|open it|open that|open the draft|send|send it|continue|proceed|sure|ok|okay|correct|right|thanks|thank you))*$/;

const AFFIRMATIVE_PHRASE_REGEX =
  /^(?:(?:yes|yeah|sure|ok|okay|alright|please|well)\s+)*(?:yes please|yes please open|yes please open it|yes go ahead|yeah sure|go ahead and open it|go ahead and open|go ahead|please continue|please proceed|do it|do that|please do|please do it|please open|please open it|open it|open that|open the draft|thats right|that is right|you can open|you can proceed|sounds good|send it|please send|please send it)(?:\s+(?:please|now|thanks|thank you))?$/;

const AFFIRMATIVE_EXACT_INDIC_REGEX =
  /^(?:हाँ|हां|जी|जी\s*हाँ|सही|सही\s*है|ठीक\s*है|बिल्कुल|चलो|आगे\s*बढ़ो|आगे\s*बढ़ें|खोल\s*दो|कर\s*दो|भेज\s*दो|ಹೌದು|ಸರಿ|ಖಂಡಿತ|ಮುಂದುವರಿಸಿ|ಮುಂದುವರೆಸಿ|ತೆರೆಯಿರಿ|ಮಾಡಿ|ಕಳುಹಿಸಿ)(?:[\s,]+(?:कृपया|प्लीज|आगे\s*बढ़ो|आगे\s*बढ़ें|खोल\s*दो|कर\s*दो|भेज\s*दो|ದಯವಿಟ್ಟು|ಮುಂದುವರಿಸಿ|ಮುಂದುವರೆಸಿ|ತೆರೆಯಿರಿ|ಮಾಡಿ|ಕಳುಹಿಸಿ))*$/;

function stripTrailingIndicPunctuation(rawText: string): string {
  return rawText
    .trim()
    .replace(/[.!?।,]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function classifyPendingConfirmationReply(
  rawText: string
): PendingConfirmationDecision {
  const text = rawText.trim();
  if (!text) return null;

  const normalized = normalizeConfirmationText(text);
  const indicCleaned = stripTrailingIndicPunctuation(text).replace(/[,]+/g, ' ').replace(/\s+/g, ' ').trim();

  if (
    NEGATIVE_CANCEL_REGEX.test(normalized) ||
    NEGATIVE_EXACT_REGEX.test(indicCleaned)
  ) {
    return 'cancel';
  }

  // Guard against negated phrases like "not ..." or "never ..."
  if (/\b(not|no|dont|do not|never)\b/.test(normalized)) {
    return null;
  }

  if (
    AFFIRMATIVE_EXACT_OR_PREFIX_REGEX.test(normalized) ||
    AFFIRMATIVE_PHRASE_REGEX.test(normalized) ||
    AFFIRMATIVE_EXACT_INDIC_REGEX.test(indicCleaned)
  ) {
    return 'confirm';
  }

  return null;
}

function isAffirmative(text: string): boolean {
  return classifyPendingConfirmationReply(text) === 'confirm';
}

function isNegativeOrCancel(text: string): boolean {
  return classifyPendingConfirmationReply(text) === 'cancel';
}

export function isAbandonmentOrCancelCommand(rawText: string): boolean {
  const normalized = normalizeConfirmationText(rawText);
  if (!normalized) return false;
  if (
    /^(?:cancel|forget that|forget it|never mind|nevermind|stop|stop this|skip this|leave it|discard|start over|let us do something else|lets do something else|do something else|something else|go back|not now|no thanks|no thank you)$/i.test(
      normalized
    )
  ) {
    return true;
  }
  return (
    /\b(?:forget that|forget it|do something else|never mind|nevermind|cancel this|cancel that|skip this|start over)\b/.test(
      normalized
    ) ||
    /रद्द करो|छोड़ो|रहने दो|कुछ और करते|ರದ್ದುಮಾಡಿ|ಬೇಡ ಬಿಡಿ|ಬೇರೆ ಏನಾದರೂ/.test(
      rawText
    )
  );
}

export type WhatsAppEditCommand =
  | { type: 'make_personal' }
  | { type: 'make_shorter' }
  | { type: 'change_message'; newText: string }
  | { type: 'ask_new_message' }
  | { type: 'change_recipient'; newRecipient: string };

export function parseWhatsAppEditCommand(
  rawText: string
): WhatsAppEditCommand | null {
  const text = rawText.trim();
  const lower = text.toLowerCase();

  if (
    /\bmake\s+(?:it|this|the\s+message)\s+(?:more\s+)?(?:personal|warm|warmer|friendly|heartfelt)\b|\bmore\s+personal\b|\bpersonalize\b|और\s+अपनापन|ಇನ್ನಷ್ಟು\s+ಆತ್ಮೀಯ/i.test(
      lower
    )
  ) {
    return { type: 'make_personal' };
  }

  if (
    /\bmake\s+(?:it|this|the\s+message)\s+(?:shorter|short|brief|concise)\b|\bshorten\s+(?:it|the\s+message)\b|छोटा\s+करो|संक्षिप्त|ಚಿಕ್ಕದು\s+ಮಾಡಿ/i.test(
      lower
    )
  ) {
    return { type: 'make_shorter' };
  }

  const changeMsgMatch = text.match(
    /^(?:please\s+)?(?:change|update|edit|replace|rewrite)\s+(?:the\s+)?message\s+(?:to|with|as)\s+(.+)$/i
  );
  if (changeMsgMatch && changeMsgMatch[1].trim()) {
    return {
      type: 'change_message',
      newText: changeMsgMatch[1].trim().replace(/^["']|["']$/g, ''),
    };
  }

  const sayInsteadMatch = text.match(/^say\s+["']?(.+?)["']?\s+instead[.!?]*$/i);
  if (sayInsteadMatch && sayInsteadMatch[1].trim()) {
    return { type: 'change_message', newText: sayInsteadMatch[1].trim() };
  }

  if (/^(?:please\s+)?(?:change|edit|rewrite|update)\s+(?:the\s+)?message[.!?]*$/i.test(lower)) {
    return { type: 'ask_new_message' };
  }

  const changeRecipMatch = text.match(
    /^(?:please\s+)?(?:(?:change|update)\s+(?:the\s+)?recipient\s+to|send\s+(?:it\s+|this\s+)?to)\s+(.+?)(?:\s+instead)?[.!?]*$/i
  );
  if (changeRecipMatch && changeRecipMatch[1].trim()) {
    return {
      type: 'change_recipient',
      newRecipient: changeRecipMatch[1].trim(),
    };
  }

  return null;
}

export function transformWhatsAppDraft(
  currentDraft: string,
  recipient: string | null,
  editType: 'personal' | 'shorter',
  lang: LanguageCode = 'en'
): string {
  const cleanRecipient =
    recipient && !/^(friend|contact|my friend)$/i.test(recipient.trim())
      ? recipient.trim()
      : '';
  const isBirthday = /birthday|जन्मदिन|ಹುಟ್ಟುಹಬ್ಬ/i.test(currentDraft);

  if (editType === 'personal') {
    if (lang === 'hi') {
      return isBirthday
        ? `${cleanRecipient ? `प्रिय ${cleanRecipient}, ` : ''}आपको जन्मदिन की दिल से बहुत-बहुत शुभकामनाएँ! ईश्वर आपको हमेशा अच्छा स्वास्थ्य, खुशियाँ और लंबा सुखी जीवन दें।`
        : `${cleanRecipient ? `प्रिय ${cleanRecipient}, ` : ''}${currentDraft.replace(/[.।]+$/, '')}। अपना ध्यान रखिएगा, बहुत स्नेह।`;
    }
    if (lang === 'kn') {
      return isBirthday
        ? `${cleanRecipient ? `ಆತ್ಮೀಯ ${cleanRecipient}, ` : ''}ನಿಮಗೆ ಹುಟ್ಟುಹಬ್ಬದ ಹೃತ್ಪೂರ್ವಕ ಶುಭಾಶಯಗಳು! ದೇವರು ನಿಮಗೆ ಉತ್ತಮ ಆರೋಗ್ಯ ಮತ್ತು ಸಂತೋಷವನ್ನು ನೀಡಲಿ.`
        : `${cleanRecipient ? `ಆತ್ಮೀಯ ${cleanRecipient}, ` : ''}${currentDraft.replace(/[.]+$/, '')}. ನಿಮ್ಮ ಆರೋಗ್ಯದ ಕಡೆ ಗಮನ ಕೊಡಿ, ಪ್ರೀತಿಯಿಂದ.`;
    }
    if (isBirthday) {
      return cleanRecipient
        ? `Dear ${cleanRecipient}, wishing you a very happy birthday filled with good health, joy, and a wonderful year ahead!`
        : 'Wishing you a very happy birthday filled with good health, joy, and a wonderful year ahead! So grateful to have you in my life.';
    }
    const base = currentDraft.replace(/[.!?]+$/, '').trim();
    return cleanRecipient
      ? `Dear ${cleanRecipient}, ${base.charAt(0).toLowerCase() + base.slice(1)}. Thinking of you warmly!`
      : `Thinking of you warmly—${base.charAt(0).toLowerCase() + base.slice(1)}.`;
  }

  // shorter
  if (isBirthday) {
    if (lang === 'hi') return 'जन्मदिन की हार्दिक शुभकामनाएँ!';
    if (lang === 'kn') return 'ಹುಟ್ಟುಹಬ್ಬದ ಶುಭಾಶಯಗಳು!';
    return 'Happy birthday! Wishing you the very best.';
  }
  const firstClause = currentDraft
    .split(/[.!?]|,\s+(?:and|filled|so)\b/i)[0]
    .trim();
  const concise =
    firstClause.length > 60 ? `${firstClause.slice(0, 57).trim()}...` : firstClause;
  return concise.endsWith('.') || concise.endsWith('!') ? concise : `${concise}.`;
}

export function normalizeConversationalUtterance(rawInstruction: string): string {
  let core = rawInstruction.trim();
  const prefixPatterns = [
    /^(?:(?:hey|hi|hello)\s+)?sahaaya[, ]+\s*/i,
    /^(?:yes|yeah|sure|ok|okay|no|nope|actually|wait)[,\s]+(?=(?:please|kindly|can|could|would|open|launch|start|set|create|find|search|calculate|add|schedule|send|prepare|tell|wish|play|watch|show|make|wake)\b)/i,
    /^(?:can\s+you|could\s+you|would\s+you|will\s+you)\s+/i,
    /^(?:i\s+would\s+like\s+you\s+to|i'd\s+like\s+you\s+to|i\s+want\s+you\s+to|i\s+need\s+you\s+to)\s+/i,
    /^(?:i\s+would\s+like\s+to|i'd\s+like\s+to|i\s+want\s+to|i\s+need\s+to|i\s+wish\s+to)\s+/i,
    /^(?:please|kindly)\s+/i,
    /^(?:help\s+me\s+(?:to\s+)?)/i,
  ];
  let changed = true;
  while (changed) {
    changed = false;
    for (const re of prefixPatterns) {
      const next = core.replace(re, '').trim();
      if (next !== core && next.length > 0) {
        core = next;
        changed = true;
      }
    }
  }
  return core;
}

function extractSpotifyCommand(commandCore: string, rawText: string): {
  matched: boolean;
  isSearch: boolean;
  query: string | null;
} {
  const lower = commandCore.toLowerCase();
  if (/\b(?:from\s+my\s+radio|on\s+the\s+radio|radio|fm|youtube|videos?)\b/i.test(rawText)) {
    return { matched: false, isSearch: false, query: null };
  }

  // Compound: "Open Spotify and play/search ..."
  const compoundSpotify = commandCore.match(
    /^(?:open|launch|start)\s+spotify\s+(?:and|to)\s+(?:play|search(?:\s+for)?|find)\s+(.+)$/i
  );
  if (compoundSpotify) {
    const q = compoundSpotify[1].replace(/[.!?]+$/, '').trim();
    return {
      matched: true,
      isSearch: true,
      query: q.length >= 2 ? q : 'Relaxing music',
    };
  }

  // Explicit "Open Spotify"
  if (
    /^(?:open|launch|start)\s+spotify[.!?]*$/i.test(lower) ||
    /स्पॉटिफ़ाई|स्पॉटिफाई|ಸ್ಪಾಟಿಫೈ/.test(rawText)
  ) {
    return { matched: true, isSearch: false, query: null };
  }

  // "Search Spotify for ..." / "Find ... on Spotify"
  const searchSpotify = commandCore.match(
    /^(?:search|find|play)\s+(?:on\s+)?spotify(?:\s+for)?\s+(.+)$/i
  );
  if (searchSpotify) {
    const q = searchSpotify[1].replace(/[.!?]+$/, '').trim();
    return { matched: true, isSearch: true, query: q.length >= 2 ? q : null };
  }

  // Preserve Test 50 & Test 58: "Play relaxing music" / "Play some relaxing music" stays YouTube,
  // while "Play meditation music", "Search for relaxing music", "Find devotional songs",
  // "Search for Kannada songs", "Find Hindi songs" route to Spotify.
  if (/\bplay\s+(?:some\s+)?meditation\s+music\b/i.test(lower)) {
    return { matched: true, isSearch: false, query: 'meditation music' };
  }

  const musicSearchMatch = commandCore.match(
    /^(?:search(?:\s+for)?|find)\s+(?:some\s+)?(.+?\b(?:songs?|music|bhajans?|tracks?|playlists?|melodies))\b(?:\s+on\s+spotify)?[.!?]*$/i
  );
  if (musicSearchMatch) {
    const q = musicSearchMatch[1]
      .replace(/^(?:a|an|the|some)\s+/i, '')
      .replace(/[.!?]+$/, '')
      .trim();
    if (q.length >= 2) {
      return { matched: true, isSearch: true, query: q };
    }
  }

  return { matched: false, isSearch: false, query: null };
}

function extractVideoQuery(commandCore: string): {
  matched: boolean;
  isYouTubeSearch: boolean;
  query: string | null;
} {
  const coreLower = commandCore.toLowerCase();

  // Do not capture radio playback, Chrome browser requests, Maps directions, Spotify, or welfare form actions
  if (/\b(?:from\s+my\s+radio|on\s+the\s+radio|radio|fm)\b/i.test(commandCore)) {
    return { matched: false, isYouTubeSearch: false, query: null };
  }
  if (/\b(?:chrome|browser)\b/i.test(coreLower)) {
    return { matched: false, isYouTubeSearch: false, query: null };
  }
  if (/\b(?:google\s+maps|maps|directions)\b/i.test(coreLower)) {
    return { matched: false, isYouTubeSearch: false, query: null };
  }
  if (/\b(?:form|application|scholarship|scholarships)\b/i.test(coreLower)) {
    return { matched: false, isYouTubeSearch: false, query: null };
  }

  const cleanTopic = (raw: string): string =>
    raw
      .replace(/^\s*(?:on|in|from)\s+youtube\b/i, '')
      .replace(
        /^\s*(?:that|which)\s+(?:helps?\s+me\s+(?:to\s+)?(?:understand|learn(?:\s+about)?|know(?:\s+about)?)|shows?(?:\s+me)?|teaches?(?:\s+me)?|explains?(?:\s+to\s+me)?|demonstrates?|tells?(?:\s+me)?|has|is\s+about)\s+(?:the\s+|me\s+)?/i,
        ''
      )
      .replace(
        /^\s*(?:to\s+help\s+me\s+(?:understand|learn(?:\s+about)?)|showing|teaching|explaining|demonstrating)\s+(?:the\s+|me\s+)?/i,
        ''
      )
      .replace(/^\s*(?:about|of|on|for|with)\s+(?:the\s+)?/i, '')
      .replace(/^\s*(?:a|an|the|some)\s+/i, '')
      .replace(/\s+(?:youtube\s+)?videos?(?:\s+(?:on|in)\s+youtube)?[.!?]*$/i, '')
      .replace(/\s+(?:on|in)\s+youtube[.!?]*$/i, '')
      .replace(/[.!?]+$/, '')
      .trim();

  // 1. Compound YouTube ("Open YouTube and play Hanuman Chalisa", "Open YouTube and show me the yoga video")
  const compoundYouTubeMatch = commandCore.match(
    /^(?:open|launch|start)\s+youtube\s+(?:and|to)\s+(?:play|watch|show(?:\s+me)?|search(?:\s+for)?|find)\s+(.+)$/i
  );
  if (compoundYouTubeMatch) {
    const cleaned = cleanTopic(
      compoundYouTubeMatch[1].replace(/^(?:a\s+|an\s+|the\s+)?(?:youtube\s+)?videos?\s*/i, '')
    );
    return {
      matched: true,
      isYouTubeSearch: false,
      query: cleaned.length >= 2 ? cleaned : 'Relaxing music',
    };
  }

  // 2. Explicit YouTube search ("Search YouTube for English lessons", "Find a Surya Namaskara tutorial on YouTube")
  const searchYouTubeMatch = commandCore.match(
    /^(?:search(?:\s+on)?\s+youtube(?:\s+for)?|find\s+(?:on\s+)?youtube(?:\s+for)?)\s+(.+)$/i
  );
  if (searchYouTubeMatch) {
    const cleaned = cleanTopic(searchYouTubeMatch[1]);
    return {
      matched: true,
      isYouTubeSearch: true,
      query:
        cleaned.length >= 2 && !/^(something|anything|it|videos?)$/i.test(cleaned)
          ? cleaned
          : null,
    };
  }

  // 2b. "<verb> ... (youtube) video ... <showing/explaining/that helps...> <postTopic>"
  // Handles e.g. "open a yoga video showing how to perform Surya Namaskara?"
  const preAndPostVideoMatch = commandCore.match(
    /^(?:open|show(?:\s+me)?|find|play|watch|search(?:\s+for)?|get(?:\s+me)?|look\s+for|looking\s+for)\s+(?:a\s+|an\s+|any\s+|the\s+|some\s+)?(.+?)\s+(?:youtube\s+)?videos?\s+(.+)$/i
  );
  if (preAndPostVideoMatch) {
    const prePart = cleanTopic(preAndPostVideoMatch[1]);
    const postPart = cleanTopic(preAndPostVideoMatch[2]);
    const chosen =
      postPart.length >= 4 && !/^(?:on|in)\s+youtube$/i.test(postPart)
        ? postPart
        : prePart;
    if (chosen.length >= 2 && !/^(youtube|a|an|the|any|some|particular)$/i.test(chosen)) {
      return {
        matched: true,
        isYouTubeSearch: /^search(?:\s+for)?\b/i.test(commandCore),
        query: chosen,
      };
    }
  }

  // 3. Topic before "video(s)" ("Play a chicken curry cooking video", "Can you help me find a yoga video?")
  if (!/^search(?:\s+for)?\b/i.test(commandCore)) {
    const topicBeforeVideoMatch = commandCore.match(
      /^(?:open|show(?:\s+me)?|find|play|watch|get(?:\s+me)?)\s+(?:a\s+|an\s+|any\s+|the\s+|some\s+)?(.+?)\s+(?:youtube\s+)?videos?(?:\s+(?:on|in)\s+youtube)?[.!?]*$/i
    );
    if (topicBeforeVideoMatch) {
      const cand = cleanTopic(topicBeforeVideoMatch[1]);
      if (cand.length >= 2 && !/^(youtube|a|an|the|any|some|particular)$/i.test(cand)) {
        return {
          matched: true,
          isYouTubeSearch: false,
          query: cand,
        };
      }
    }
  }

  // 4. "<verb> ... [youtube] video(s) <connector/topic>" ("Find videos teaching English.", "Find a video showing how to make dosa.")
  const videoVerbMatch = commandCore.match(
    /^(?:open|show(?:\s+me)?|find|play|watch|search(?:\s+for)?|get(?:\s+me)?|look\s+for|looking\s+for)\s+(?:a\s+|an\s+|any\s+|the\s+|some\s+|particular\s+)?(?:youtube\s+)?videos?\b(.*)$/i
  );
  if (videoVerbMatch) {
    const cleaned = cleanTopic(videoVerbMatch[1]);
    const isGeneric = /^(?:something|anything|one|here)$/i.test(cleaned);
    return {
      matched: true,
      isYouTubeSearch: false,
      query: cleaned.length >= 2 && !isGeneric ? cleaned : null,
    };
  }

  // 5. Learning / Recipe natural requests ("I want to learn yoga", "Show me a chicken curry recipe")
  const learnMatch = commandCore.match(/^(?:learn)\s+(.+?)[.!?]*$/i);
  if (learnMatch) {
    const cleaned = cleanTopic(learnMatch[1]);
    if (cleaned.length >= 2) {
      return { matched: true, isYouTubeSearch: false, query: cleaned };
    }
  }

  const recipeMatch = commandCore.match(
    /^(?:show(?:\s+me)?|find|get(?:\s+me)?)\s+(?:a\s+|an\s+|the\s+)?(.+?\brecipe\b.*?)[.!?]*$/i
  );
  if (recipeMatch) {
    const cleaned = cleanTopic(recipeMatch[1]);
    if (cleaned.length >= 2) {
      return { matched: true, isYouTubeSearch: false, query: cleaned };
    }
  }

  // 6. Visual tutorial / how-to ("Show me how to use a smartphone", "Show me a gardening tutorial")
  // (Search for ... tutorials stays Google Search!)
  if (!/^search(?:\s+for)?\b/i.test(commandCore)) {
    const tutorialMatch = commandCore.match(
      /^(?:show(?:\s+me)?|teach(?:\s+me)?)\s+(?:a\s+|an\s+|the\s+)?(how\s+to\s+.+|.+\btutorial\b.*)[.!?]*$/i
    );
    if (tutorialMatch) {
      const cleaned = tutorialMatch[1].replace(/[.!?]+$/, '').trim();
      if (cleaned.length >= 2) {
        return {
          matched: true,
          isYouTubeSearch: false,
          query: cleaned,
        };
      }
    }
  }

  // 7. Direct play/watch ("Play Hanuman Chalisa", "Play some relaxing music", "Watch a gardening tutorial")
  const playOrWatchMatch = commandCore.match(/^(?:play|watch)\s+(.+)$/i);
  if (playOrWatchMatch) {
    const rawTopic = playOrWatchMatch[1]
      .replace(/\s+(?:on|in)\s+youtube[.!?]*$/i, '')
      .replace(/[.!?]+$/, '')
      .trim();
    const cleaned = rawTopic.replace(/^(?:a|an|some)\s+/i, '').trim();
    const isGeneric = /^(?:a\s+)?(?:video|youtube\s+video|something|music|song)$/i.test(
      rawTopic
    );
    return {
      matched: true,
      isYouTubeSearch: false,
      query:
        cleaned.length >= 2 && !isGeneric ? cleaned : rawTopic || 'Relaxing music',
    };
  }

  return { matched: false, isYouTubeSearch: false, query: null };
}

export function parseNaturalCommand(
  rawInstruction: string,
  lang: LanguageCode = 'en'
): CommandParseResult {
  const text = rawInstruction.trim();
  const pronNormalized = normalizeSpeechCommandPronunciation(text).normalizedCommand;
  const effectiveText = pronNormalized || text;
  const lower = effectiveText.toLowerCase();
  const commandCore = normalizeConversationalUtterance(effectiveText);
  const commandCoreLower = commandCore.toLowerCase();

  // P4. Scholarship Discovery Intent (checked BEFORE welfare application_task so scholarships never open Senior Welfare Form)
  if (
    /\bscholarships?\b/i.test(lower) ||
    text.includes('छात्रवृत्ति') ||
    text.includes('ವಿದ್ಯಾರ್ಥಿವೇತನ')
  ) {
    const hasSpecificLevelOrRegion =
      /\b(?:engineering|medical|college|undergraduate|postgraduate|graduate|school|phd|diploma|science|arts|commerce|karnataka|india|government|merit|minority|sc|st|obc|women|girls)\b/i.test(
        lower
      ) ||
      /इंजीनियरिंग|कॉलेज|कर्नाटक|ಸರ್ಕಾರಿ|ಎಂಜಿನಿಯರಿಂಗ್|ಕಾಲೇಜು|ಕರ್ನಾಟಕ/.test(text);

    if (!hasSpecificLevelOrRegion) {
      const task: AssistantTask = {
        id: createTaskId(),
        rawInstruction: text,
        normalizedInstruction: commandCore,
        intent: 'search',
        application: 'Google Search',
        action: 'scholarship_search',
        target: null,
        searchQuery: null,
        messageContent: null,
        locationIntent: 'none',
        requiredParameters: ['educationLevel'],
        missingParameters: ['educationLevel'],
        confirmationRequired: true,
        requiresLocation: false,
        executionStatus: 'needs_info',
        capabilityNote:
          'Scholarship search uses Google Search externally; asks education level first when unspecified.',
      };
      return {
        matched: true,
        task,
        replyText:
          lang === 'hi'
            ? 'मैं आपके लिए छात्रवृत्ति खोज सकती हूँ। कृपया बताएँ आप किस पढ़ाई या स्तर के लिए छात्रवृत्ति ढूँढ रहे हैं—जैसे स्कूल, कॉलेज, अंडरग्रेजुएट, या इंजीनियरिंग?'
            : lang === 'kn'
              ? 'ನಾನು ನಿಮಗಾಗಿ ವಿದ್ಯಾರ್ಥಿವೇತನಗಳನ್ನು ಹುಡುಕಬಲ್ಲೆ. ನೀವು ಯಾವ ಶಿಕ್ಷಣ ಮಟ್ಟ ಅಥವಾ ಕೋರ್ಸ್‌ಗಾಗಿ ಹುಡುಕುತ್ತಿದ್ದೀರಿ—ಉದಾಹರಣೆಗೆ ಶಾಲೆ, ಕಾಲೇಜು, ಪದವಿ (Undergraduate), ಅಥವಾ ಎಂಜಿನಿಯರಿಂಗ್?'
              : 'I can help you search for scholarships. Which education level or course are you looking for—such as school, college, undergraduate, or engineering?',
      };
    }

    let cleanedScholarshipQuery = commandCore
      .replace(/^(?:find|search(?:\s+for)?|look\s+for|get(?:\s+me)?|i\s+need)\s+/i, '')
      .replace(/^(?:a|an|some)\s+/i, '')
      .replace(/[.!?]+$/, '')
      .trim();
    if (/^scholarship\s+for\s+college$/i.test(cleanedScholarshipQuery)) {
      cleanedScholarshipQuery = 'scholarships for college';
    }
    if (text.includes('छात्रवृत्ति') && !/scholarship/i.test(cleanedScholarshipQuery)) {
      cleanedScholarshipQuery = `${text.replace(/[.।!?]+$/, '').trim()} scholarships`;
    }
    if (text.includes('ವಿದ್ಯಾರ್ಥಿವೇತನ') && !/scholarship/i.test(cleanedScholarshipQuery)) {
      cleanedScholarshipQuery = `${text.replace(/[.!?]+$/, '').trim()} scholarships`;
    }

    const task: AssistantTask = {
      id: createTaskId(),
      rawInstruction: text,
      normalizedInstruction: commandCore,
      intent: 'search',
      application: 'Google Search',
      action: 'scholarship_search',
      target: cleanedScholarshipQuery,
      searchQuery: cleanedScholarshipQuery,
      messageContent: null,
      locationIntent: 'none',
      requiredParameters: ['query'],
      missingParameters: [],
      confirmationRequired: true,
      requiresLocation: false,
      executionStatus: 'awaiting_confirmation',
      capabilityNote:
        'Searches externally for scholarships via Google Search (separate from the Senior Citizen Welfare demo form).',
    };
    return {
      matched: true,
      task,
      replyText: buildSearchConfirmQuestion(cleanedScholarshipQuery, lang),
    };
  }

  // P5. Calculator Math & Open Intent (safe deterministic parser, zero eval)
  const calcRes = extractCalculatorCommand(text);
  if (calcRes.matched) {
    if (calcRes.openOnly) {
      const task: AssistantTask = {
        id: createTaskId(),
        rawInstruction: text,
        normalizedInstruction: commandCore,
        intent: 'app_launch',
        application: 'Calculator',
        action: 'launch_app',
        target: 'Calculator',
        messageContent: null,
        requiredParameters: [],
        missingParameters: [],
        confirmationRequired: false,
        executionStatus: 'unavailable_on_web',
        capabilityNote:
          'Interactive deterministic Calculator available in Sahaaya Demo Mode.',
      };
      return {
        matched: true,
        task,
        replyText: buildCapabilityReply('app_launch', 'Calculator', lang),
      };
    }

    const evalObj = calcRes.evaluation;
    const task: AssistantTask = {
      id: createTaskId(),
      rawInstruction: text,
      normalizedInstruction: commandCore,
      intent: 'app_launch',
      application: 'Calculator',
      action: 'calculate',
      target:
        evalObj?.ok && evalObj.formattedValue
          ? evalObj.formattedValue
          : calcRes.expression || 'Calculator',
      mathExpression: evalObj?.normalizedExpression || calcRes.expression,
      mathResult: evalObj?.ok ? evalObj.formattedValue! : evalObj?.error || null,
      messageContent: null,
      requiredParameters: [],
      missingParameters: [],
      confirmationRequired: false,
      executionStatus: evalObj && !evalObj.ok ? 'failed' : 'ready',
      capabilityNote: 'Evaluated locally with deterministic math parser (no eval).',
    };
    return {
      matched: true,
      task,
      replyText: buildCalculatorReply(calcRes, lang),
    };
  }

  // P5b. Unsupported Native System Alarms (EN / HI / KN — never falsely claim an alarm was created)
  if (
    /\b(?:set|create|put|add|turn\s+on|schedule)\b.*\balarms?\b|\balarms?\s+(?:for|at)\b|\bwake\s+me\s+up\b/i.test(
      lower
    ) ||
    /अलार्म|अलारम/.test(text) ||
    /(?:सुबह|बजे|कल|आज).*जगा\s*(?:दो|देना|दीजिए)/.test(text) ||
    /ಅಲರಾಂ|ಅಲಾರಂ|ಅಲಾರಾಂ/.test(text) ||
    /(?:ಗಂಟೆಗೆ|ನಾಳೆ|ಇಂದು|ಬೆಳಗ್ಗೆ|ಬೆಳಿಗ್ಗೆ|ನನ್ನನ್ನು).*ಎಬ್ಬಿಸಿ/.test(text)
  ) {
    const timeDetails = extractTimeDetailsFromText(text);
    const extractedTime = timeDetails.time24;
    const extractedDate = extractDateFromText(text);
    const alarmSummaryParts: string[] = [];
    if (extractedDate.label) alarmSummaryParts.push(extractedDate.label);
    if (extractedTime) alarmSummaryParts.push(extractedTime);
    if (timeDetails.period) alarmSummaryParts.push(timeDetails.period);
    const alarmLabel =
      alarmSummaryParts.length > 0
        ? `Alarm (${alarmSummaryParts.join(' · ')})`
        : 'System Alarm';
    const task: AssistantTask = {
      id: createTaskId(),
      rawInstruction: text,
      normalizedInstruction: commandCore,
      intent: 'app_launch',
      semanticIntent: 'SET_ALARM',
      application: 'Clock / Alarm',
      action: 'set_alarm',
      target: alarmLabel,
      messageContent: null,
      alarmDraft: {
        time: extractedTime,
        date: extractedDate.date,
        dateLabel: extractedDate.label,
        period: timeDetails.period,
      },
      requiredParameters: [],
      missingParameters: [],
      confirmationRequired: false,
      executionStatus: 'unavailable_on_web',
      capabilityNote:
        'Browser demo cannot directly set phone system alarms (requires future native Android Clock integration). Offered local Demo Calendar reminder as an alternative.',
    };
    return {
      matched: true,
      task,
      replyText:
        lang === 'hi'
          ? 'यह वेब ब्राउज़र डेमो आपके फ़ोन का असली सिस्टम अलार्म सीधे सेट नहीं कर सकता (इसके लिए भविष्य में Android डिवाइस एकीकरण की आवश्यकता होगी)। विकल्प के रूप में, आप चाहें तो मैं इसे सहाय के स्थानीय डेमो कैलेंडर में एक रिमाइंडर के रूप में जोड़ सकता हूँ।'
          : lang === 'kn'
            ? 'ಈ ವೆಬ್ ಬ್ರೌಸರ್ ಡೆಮೊ ನಿಮ್ಮ ಫೋನ್‌ನ ನಿಜವಾದ ಸಿಸ್ಟಮ್ ಅಲಾರಂ ಅನ್ನು ನೇರವಾಗಿ ಇಡಲು ಸಾಧ್ಯವಿಲ್ಲ (ಇದಕ್ಕೆ ಭವಿಷ್ಯದ Android ಸಾಧನ ಏಕೀಕರಣ ಅಗತ್ಯವಿದೆ). ಪರ್ಯಾಯವಾಗಿ, ನೀವು ಬಯಸಿದರೆ ನಾನು ಇದನ್ನು ಸಹಾಯದ ಸ್ಥಳೀಯ ಡೆಮೊ ಕ್ಯಾಲೆಂಡರ್‌ನಲ್ಲಿ ರಿಮೈಂಡರ್ ಆಗಿ ಸೇರಿಸಬಲ್ಲೆ.'
            : 'This browser demo cannot directly set your phone’s system alarm—that requires future native Android Clock integration. As an alternative, I can add a local reminder in Sahaaya’s Demo Calendar if you would like, without setting a real phone alarm.',
    };
  }

  // P5c. Native Phone Calls ("Make a phone call", "Call my brother", HI/KN)
  if (
    /^(?:please\s+)?(?:make\s+(?:a\s+)?(?:phone\s+)?call|place\s+(?:a\s+)?call|call\s+(?:someone|my\s+[\w\s]+|\d{5,})|dial\s+(?:a\s+number|\d{3,}))[.!?]*$/i.test(
      commandCoreLower
    ) ||
    /(?:फ़ोन\s*कॉल|कॉल\s*(?:करो|लगाओ|करना))/.test(text) ||
    /(?:ಫೋನ್\s*ಕರೆ|ಕರೆ\s*(?:ಮಾಡಿ|ಮಾಡಬೇಕು))/.test(text)
  ) {
    const task: AssistantTask = {
      id: createTaskId(),
      rawInstruction: text,
      normalizedInstruction: commandCore,
      intent: 'app_launch',
      application: 'Phone',
      action: 'make_call',
      target: 'Phone Call',
      messageContent: null,
      requiredParameters: [],
      missingParameters: [],
      confirmationRequired: false,
      executionStatus: 'unavailable_on_web',
      capabilityNote:
        'Browser demo cannot place cellular phone calls directly (requires future native Android Phone integration).',
    };
    return {
      matched: true,
      task,
      replyText:
        lang === 'hi'
          ? 'यह वेब ब्राउज़र डेमो असली फ़ोन कॉल नहीं कर सकता (इसके लिए Android डिवाइस एकीकरण की आवश्यकता है)। डेमो मोड में आप नकली डायलर स्क्रीन देख सकते हैं, या WhatsApp संदेश ड्राफ्ट तैयार कर सकते हैं।'
          : lang === 'kn'
            ? 'ಈ ವೆಬ್ ಬ್ರೌಸರ್ ಡೆಮೊ ನಿಜವಾದ ಫೋನ್ ಕರೆ ಮಾಡಲು ಸಾಧ್ಯವಿಲ್ಲ (ಇದಕ್ಕೆ Android ಸಾಧನ ಏಕೀಕರಣ ಅಗತ್ಯವಿದೆ). ಡೆಮೊ ಮೋಡ್‌ನಲ್ಲಿ ನೀವು ಸಿಮ್ಯುಲೇಟೆಡ್ ಡಯಲರ್ ನೋಡಬಹುದು ಅಥವಾ WhatsApp ಸಂದೇಶ ಸಿದ್ಧಪಡಿಸಬಹುದು.'
            : 'This browser demo cannot place real phone calls directly—calling requires future native Android integration. In Interactive Demo Mode you can preview the simulated Phone dialer, or I can help you prepare a WhatsApp message draft instead.',
    };
  }

  // P6. Simulated Calendar Intent (EN / HI / KN)
  const calRes = extractCalendarCommand(text);
  if (calRes.matched) {
    const needsClarification =
      calRes.subAction === 'add_event' && calRes.missingSlots.length > 0;
    const task: AssistantTask = {
      id: createTaskId(),
      rawInstruction: text,
      normalizedInstruction: commandCore,
      intent: 'app_launch',
      application: 'Calendar',
      action:
        calRes.subAction === 'add_event'
          ? 'add_calendar_event'
          : calRes.subAction === 'edit_event'
            ? 'edit_calendar_event'
            : calRes.subAction === 'delete_event'
              ? 'delete_calendar_event'
              : calRes.subAction === 'show_upcoming'
                ? 'show_calendar_events'
                : 'open_calendar',
      target: calRes.title || 'Calendar',
      messageContent: null,
      calendarDraft: {
        subAction: calRes.subAction,
        title: calRes.title,
        date: calRes.date,
        dateLabel: calRes.dateLabel,
        time: calRes.time,
        needsTitle: calRes.needsTitle,
      },
      requiredParameters:
        calRes.subAction === 'add_event' ? ['date', 'time'] : [],
      missingParameters: needsClarification ? calRes.missingSlots : [],
      confirmationRequired: false,
      executionStatus: needsClarification ? 'needs_info' : 'ready',
      capabilityNote:
        'Simulated local browser Calendar only. Never creates real phone calendar events or alarms.',
    };
    return {
      matched: true,
      task,
      replyText: buildCalendarPrompt(calRes, lang),
    };
  }

  // F. Existing Application Tasks (checked before generic open/launch)
  if (
    /\b(review my application|review application|check my application)\b/i.test(lower) ||
    text.includes('आवेदन की समीक्षा') ||
    text.includes('ಅರ್ಜಿ ಪರಿಶೀಲಿಸಿ')
  ) {
    const task: AssistantTask = {
      id: createTaskId(),
      rawInstruction: text,
      intent: 'application_task',
      application: 'Sahaaya Welfare Application',
      action: 'review_application',
      target: 'Review Screen',
      messageContent: null,
      requiredParameters: [],
      missingParameters: [],
      confirmationRequired: false,
      executionStatus: 'executed_in_web',
    };
    return {
      matched: true,
      task,
      replyText:
        lang === 'hi'
          ? 'मैं आपको आपके आवेदन की समीक्षा पृष्ठ पर ले जा रहा हूँ।'
          : lang === 'kn'
            ? 'ನಿಮ್ಮ ಅರ್ಜಿಯ ಪರಿಶೀಲನಾ ಪುಟವನ್ನು ತೆರೆಯುತ್ತಿದ್ದೇನೆ.'
            : 'Opening the Review screen for your Senior Citizen Welfare Application.',
      webAction: { type: 'review_application' },
    };
  }

  if (
    /\b(open form|open application form|show form|view form)\b/i.test(lower)
  ) {
    const task: AssistantTask = {
      id: createTaskId(),
      rawInstruction: text,
      intent: 'application_task',
      application: 'Sahaaya Welfare Application',
      action: 'open_form',
      target: 'Application Form',
      messageContent: null,
      requiredParameters: [],
      missingParameters: [],
      confirmationRequired: false,
      executionStatus: 'executed_in_web',
    };
    return {
      matched: true,
      task,
      replyText:
        lang === 'hi'
          ? 'मैं पूरा आवेदन पत्र खोल रहा हूँ।'
          : lang === 'kn'
            ? 'ಪೂರ್ಣ ಅರ್ಜಿ ನಮೂನೆಯನ್ನು ತೆರೆಯುತ್ತಿದ್ದೇನೆ.'
            : 'Opening the full Senior Citizen Welfare Application form.',
      webAction: { type: 'open_form' },
    };
  }

  if (
    /\b(fill my senior citizen application|fill.*application|fill.*welfare|fill.*form|complete.*form|complete.*application|start.*application|continue my application|resume.*application|enter my details|apply for.*(?:scheme|welfare|pension|senior))\b/i.test(
      lower
    ) ||
    text.includes('आवेदन भर') ||
    text.includes('ಅರ್ಜಿ ಭರ್ತಿ')
  ) {
    const isContinue = /continue|resume/i.test(lower);
    const task: AssistantTask = {
      id: createTaskId(),
      rawInstruction: text,
      intent: 'application_task',
      application: 'Sahaaya Welfare Application',
      action: isContinue ? 'continue_application' : 'start_application',
      target: 'Senior Citizen Welfare Application',
      messageContent: null,
      requiredParameters: [],
      missingParameters: [],
      confirmationRequired: false,
      executionStatus: 'executed_in_web',
    };
    return {
      matched: true,
      task,
      replyText: '',
      webAction: {
        type: isContinue ? 'continue_application' : 'start_application',
      },
    };
  }

  // E. Navigation Commands
  if (
    /^(go back|back|previous page|पिछले पृष्ठ|ಹಿಂದೆ ಹೋಗಿ)$/i.test(lower) ||
    /\bgo back\b/i.test(lower)
  ) {
    const task: AssistantTask = {
      id: createTaskId(),
      rawInstruction: text,
      intent: 'navigation',
      application: 'Sahaaya',
      action: 'go_back',
      target: 'Previous Screen',
      messageContent: null,
      requiredParameters: [],
      missingParameters: [],
      confirmationRequired: false,
      executionStatus: 'executed_in_web',
    };
    return {
      matched: true,
      task,
      replyText:
        lang === 'hi'
          ? 'मैं आपको पिछले पृष्ठ पर वापस ले जा रहा हूँ।'
          : lang === 'kn'
            ? 'ಹಿಂದಿನ ಪುಟಕ್ಕೆ ಕರೆದೊಯ್ಯುತ್ತಿದ್ದೇನೆ.'
            : 'Going back to the previous screen.',
      webAction: { type: 'go_back' },
    };
  }

  if (
    /^(go home|home|welcome screen|मुख्य पृष्ठ|ಮುಖಪುಟ)$/i.test(lower) ||
    /\bgo home\b/i.test(lower)
  ) {
    const task: AssistantTask = {
      id: createTaskId(),
      rawInstruction: text,
      intent: 'navigation',
      application: 'Sahaaya',
      action: 'go_home',
      target: 'Welcome Screen',
      messageContent: null,
      requiredParameters: [],
      missingParameters: [],
      confirmationRequired: false,
      executionStatus: 'executed_in_web',
    };
    return {
      matched: true,
      task,
      replyText:
        lang === 'hi'
          ? 'मैं आपको मुख्य पृष्ठ पर ले जा रहा हूँ।'
          : lang === 'kn'
            ? 'ಮುಖಪುಟಕ್ಕೆ ಕರೆದೊಯ್ಯುತ್ತಿದ್ದೇನೆ.'
            : 'Returning to the Sahaaya Welcome screen.',
      webAction: { type: 'go_home' },
    };
  }

  if (/\bscroll down\b|नीचे स्क्रॉल|ಕೆಳಗೆ ಸ್ಕ್ರಾಲ್/i.test(lower)) {
    const task: AssistantTask = {
      id: createTaskId(),
      rawInstruction: text,
      intent: 'navigation',
      application: 'Sahaaya',
      action: 'scroll_down',
      target: 'Current Page',
      messageContent: null,
      requiredParameters: [],
      missingParameters: [],
      confirmationRequired: false,
      executionStatus: 'executed_in_web',
    };
    return {
      matched: true,
      task,
      replyText:
        lang === 'hi'
          ? 'पेज को नीचे स्क्रॉल कर दिया गया है।'
          : lang === 'kn'
            ? 'ಪುಟವನ್ನು ಕೆಳಗೆ ಸ್ಕ್ರಾಲ್ ಮಾಡಲಾಗಿದೆ.'
            : 'Scrolling down the page.',
      webAction: { type: 'scroll_down' },
    };
  }

  if (/\bscroll up\b|ऊपर स्क्रॉल|ಮೇಲೆ ಸ್ಕ್ರಾಲ್/i.test(lower)) {
    const task: AssistantTask = {
      id: createTaskId(),
      rawInstruction: text,
      intent: 'navigation',
      application: 'Sahaaya',
      action: 'scroll_up',
      target: 'Current Page',
      messageContent: null,
      requiredParameters: [],
      missingParameters: [],
      confirmationRequired: false,
      executionStatus: 'executed_in_web',
    };
    return {
      matched: true,
      task,
      replyText:
        lang === 'hi'
          ? 'पेज को ऊपर स्क्रॉल कर दिया गया है।'
          : lang === 'kn'
            ? 'ಪುಟವನ್ನು ಮೇಲೆ ಸ್ಕ್ರಾಲ್ ಮಾಡಲಾಗಿದೆ.'
            : 'Scrolling up the page.',
      webAction: { type: 'scroll_up' },
    };
  }

  // D. Screen Assistance Commands
  // Check external app screen read first so we never claim to read another app's screen
  const externalAppMention = KNOWN_APPS.find((app) =>
    app.patterns.some((re) => re.test(text))
  );
  if (
    externalAppMention &&
    /\b(read|explain|what is on)\b.*\b(screen|message|chat|page)\b/i.test(lower)
  ) {
    const task: AssistantTask = {
      id: createTaskId(),
      rawInstruction: text,
      intent: 'screen_assistance',
      application: externalAppMention.canonicalName,
      action: 'read_external_screen',
      target: `${externalAppMention.canonicalName} Screen`,
      messageContent: null,
      requiredParameters: [],
      missingParameters: [],
      confirmationRequired: false,
      executionStatus: 'unavailable_on_web',
      capabilityNote:
        'Web browsers cannot read screens of external mobile applications.',
    };
    return {
      matched: true,
      task,
      replyText: `I cannot read ${externalAppMention.canonicalName}'s screen from a web browser. Sahaaya can only read and explain what is currently inside Sahaaya itself.`,
    };
  }

  if (
    /\b(read my screen|read the screen|read screen|read this page|read the page|स्क्रीन पढ़|ಪರದೆ ಓದಿ)\b/i.test(
      lower
    )
  ) {
    const task: AssistantTask = {
      id: createTaskId(),
      rawInstruction: text,
      intent: 'screen_assistance',
      application: 'Sahaaya',
      action: 'read_screen',
      target: 'Current Sahaaya Screen',
      messageContent: null,
      requiredParameters: [],
      missingParameters: [],
      confirmationRequired: false,
      executionStatus: 'executed_in_web',
    };
    return {
      matched: true,
      task,
      replyText: '',
      webAction: { type: 'read_screen' },
    };
  }

  if (
    /\b(explain this page|explain what is on this page|what is on this page|understand this page|explain page|explain screen|इस पेज को समझा|ಈ ಪುಟವನ್ನು ವಿವರಿಸಿ)\b/i.test(
      lower
    )
  ) {
    const task: AssistantTask = {
      id: createTaskId(),
      rawInstruction: text,
      intent: 'screen_assistance',
      application: 'Sahaaya',
      action: 'explain_page',
      target: 'Current Sahaaya Page',
      messageContent: null,
      requiredParameters: [],
      missingParameters: [],
      confirmationRequired: false,
      executionStatus: 'executed_in_web',
    };
    return {
      matched: true,
      task,
      replyText: '',
      webAction: { type: 'explain_page' },
    };
  }

  if (/\b(read the latest message|read latest message|read last message)\b/i.test(lower)) {
    const task: AssistantTask = {
      id: createTaskId(),
      rawInstruction: text,
      intent: 'screen_assistance',
      application: 'Sahaaya',
      action: 'read_latest_message',
      target: 'Latest Conversation Message',
      messageContent: null,
      requiredParameters: [],
      missingParameters: [],
      confirmationRequired: false,
      executionStatus: 'executed_in_web',
    };
    return {
      matched: true,
      task,
      replyText: '',
      webAction: { type: 'read_latest_message' },
    };
  }

  if (
    /\b(read my application|read application|read my form|read the form|read welfare application)\b/i.test(
      lower
    ) ||
    text.includes('आवेदन पढ़') ||
    text.includes('ಅರ್ಜಿ ಓದಿ')
  ) {
    const task: AssistantTask = {
      id: createTaskId(),
      rawInstruction: text,
      intent: 'screen_assistance',
      application: 'Sahaaya',
      action: 'read_application',
      target: 'Senior Citizen Welfare Application',
      messageContent: null,
      requiredParameters: [],
      missingParameters: [],
      confirmationRequired: false,
      executionStatus: 'executed_in_web',
    };
    return {
      matched: true,
      task,
      replyText: '',
      webAction: { type: 'read_application' },
    };
  }

  if (
    /\b(explain missing fields|missing fields|what fields are missing|which fields are missing|what is missing|remaining fields)\b/i.test(
      lower
    ) ||
    text.includes('बाकी जानकारी') ||
    text.includes('ಬಾಕಿ ಇರುವ ವಿವರ')
  ) {
    const task: AssistantTask = {
      id: createTaskId(),
      rawInstruction: text,
      intent: 'screen_assistance',
      application: 'Sahaaya',
      action: 'explain_missing_fields',
      target: 'Missing Application Fields',
      messageContent: null,
      requiredParameters: [],
      missingParameters: [],
      confirmationRequired: false,
      executionStatus: 'executed_in_web',
    };
    return {
      matched: true,
      task,
      replyText: '',
      webAction: { type: 'explain_missing_fields' },
    };
  }

  if (
    /\bwhat does this button do\b|\b(?:explain|understand).*\bbuttons?\b/i.test(lower)
  ) {
    const task: AssistantTask = {
      id: createTaskId(),
      rawInstruction: text,
      intent: 'screen_assistance',
      application: 'Sahaaya',
      action: 'explain_controls',
      target: 'Sahaaya Voice & Navigation Controls',
      messageContent: null,
      requiredParameters: [],
      missingParameters: [],
      confirmationRequired: false,
      executionStatus: 'executed_in_web',
    };
    return {
      matched: true,
      task,
      replyText: '',
      webAction: { type: 'explain_controls' },
    };
  }

  // C. Messaging Commands (Sensitive action: always requires confirmation)
  // Supports natural birthday/wishes/tell/asking phrasing in EN, HI, and KN.
  const isBirthdayOrWishMsg =
    !/\byoutube\b/i.test(lower) &&
    (/\b(?:wish|congratulate)\s+(?:my\s+)?[a-zA-Z\u0900-\u097F\u0C80-\u0CFF]+/i.test(lower) ||
      /\btell\s+(?:my\s+)?(?:daughter|son|wife|husband|friend|mother|father|sister|brother|uncle|aunt|[A-Z][a-z]+)\s+(?:that\s+)?/i.test(
        commandCore
      ) ||
      /जन्मदिन\s*की\s*शुभकामना|संदेश\s*भेज|व्हाट्सएप\s*संदेश/.test(text) ||
      /ಹುಟ್ಟುಹಬ್ಬದ\s*ಶುಭಾಶಯ|ಸಂದೇಶ\s*ಕಳುಹಿಸಿ|ವಾಟ್ಸಾಪ್\s*ಸಂದೇಶ/.test(text));

  const isHindiMessaging =
    /(?:व्हाट्सएप|व्हाट्सऐप|संदेश|मैसेज)/.test(text) &&
    /(?:भेज|तैयार|लिख|करना|करो|बनाओ)/.test(text);
  const isKannadaMessaging =
    /(?:ವಾಟ್ಸಾಪ್|ಸಂದೇಶ|ಮೆಸೇಜ್)/.test(text) &&
    /(?:ಕಳುಹಿಸ|ತಯಾರಿಸ|ಸಿದ್ಧಪಡಿಸ|ಬರೆ|ಬೇಕು|ಮಾಡಿ)/.test(text);

  if (
    !/\byoutube\b/i.test(lower) &&
    (isBirthdayOrWishMsg ||
      isHindiMessaging ||
      isKannadaMessaging ||
      /\b(?:send|compose|prepare|write)\s+(?:(?:\w+\s+){0,4}?)(?:whatsapp\s+|text\s+)?messages?\b|\bmessage\s+(?:to|for)\b|\bi\s+want\s+to\s+message\b|\bwhatsapp\s+message\b|\btext\s+message\b/i.test(
        lower
      ))
  ) {
    const isWhatsApp =
      /\bwhatsapp\b/i.test(lower) ||
      /व्हाट्सएप|व्हाट्सऐप|ವಾಟ್ಸಾಪ್/.test(text) ||
      isHindiMessaging ||
      isKannadaMessaging ||
      isBirthdayOrWishMsg;
    const appName = isWhatsApp ? 'WhatsApp' : 'Messages / WhatsApp';

    let messageContent: string | null = null;
    let recipient: string | null = null;

    // 1. Direct "Tell my daughter I will reach home at 6."
    const tellMatch = commandCore.match(
      /^tell\s+(?:my\s+)?([a-zA-Z\u0900-\u097F\u0C80-\u0CFF][\w\s.'-]{0,24}?)\s+(?:that\s+)?(.+)$/i
    );
    if (tellMatch && !/\b(?:about|how|what|why|when)\b/i.test(tellMatch[2].split(/\s+/)[0])) {
      recipient = tellMatch[1].trim();
      const body = tellMatch[2].trim();
      messageContent = body.charAt(0).toUpperCase() + body.slice(1);
    }

    // 2. "I want to wish my friend a happy birthday."
    if (!recipient) {
      const wishMatch = commandCore.match(
        /^wish\s+(?:my\s+)?([a-zA-Z\u0900-\u097F\u0C80-\u0CFF][\w\s.'-]{0,24}?)\s+(?:a\s+)?(?:very\s+)?happy\s+birthday\b/i
      );
      if (wishMatch) {
        recipient = wishMatch[1].trim();
      }
    }

    // 3. Standard "saying ...", "that says ...", "asking him to ..."
    if (!messageContent) {
      const contentMatch = text.match(
        /\b(?:saying(?:\s+that)?|that says|with message|telling\s+(?:him|her|them)\s+(?:to|that)?|asking\s+(?:him|her|them)\s+(?:to|that)?)\s+(.+)$/i
      );
      if (contentMatch && contentMatch[1].trim()) {
        const rawBody = contentMatch[1].trim();
        const isImperative = /\b(?:telling|asking)\b/i.test(contentMatch[0]);
        messageContent = isImperative
          ? rawBody.charAt(0).toUpperCase() + rawBody.slice(1)
          : rawBody;
      } else {
        // Hindi: "... संदेश भेजो कि <body...>"
        const hiBody = text.match(/(?:कि|संदेश\s+लिखो|मैसेज\s+लिखो)\s+(.+)$/);
        if (hiBody && hiBody[1].trim()) {
          messageContent = hiBody[1].trim();
        }
        // Kannada: "<recipient>ಗೆ <body...> ಎಂದು ... ಸಂದೇಶ ಕಳುಹಿಸಿ"
        const knBody = text.match(/(?:ಗೆ|ರಿಗೆ)\s+(.+?)\s+ಎಂದು\s+/);
        if (!messageContent && knBody && knBody[1].trim()) {
          messageContent = knBody[1].trim();
        }
      }
    }

    const contentSplitIdx = (() => {
      const m = text.match(
        /\b(?:saying(?:\s+that)?|that says|with message|telling\s+(?:him|her|them)|asking\s+(?:him|her|them))\b/i
      );
      return m?.index ?? -1;
    })();
    const withoutContent =
      contentSplitIdx >= 0 ? text.slice(0, contentSplitIdx).trim() : text;

    if (!recipient) {
      const beforeMsgMatch = withoutContent.match(
        /\b(?:send|tell|text)\s+(?:my\s+)?([a-zA-Z\u0900-\u097F\u0C80-\u0CFF][\w\s.'-]{0,30}?)\s+(?:a\s+)?(?:whatsapp\s+|text\s+)?message\b/i
      );
      if (beforeMsgMatch && beforeMsgMatch[1].trim()) {
        const cand = beforeMsgMatch[1].trim();
        if (!/^(a|an|the|whatsapp|text|my|birthday)$/i.test(cand)) {
          recipient = cand;
        }
      }
    }

    if (!recipient) {
      const toMatch = withoutContent.match(
        /\b(?:(?:send|prepare|compose|write)\s+(?:a\s+)?(?:birthday\s+)?(?:whatsapp\s+|text\s+)?message\s+(?:to|for)|message\s+(?:to|for)|want\s+to\s+message|text\s+(?:to|for)|message)\s+(.+)$/i
      );
      if (toMatch && toMatch[1].trim()) {
        const cleanedRecipient = toMatch[1]
          .replace(/\b(on whatsapp|via whatsapp|please)\b/gi, '')
          .replace(/[.!?]+$/, '')
          .trim();
        if (
          cleanedRecipient.length >= 2 &&
          !/^(a|an|the|message|whatsapp)$/i.test(cleanedRecipient)
        ) {
          recipient = cleanedRecipient;
        }
      }
    }

    // Hindi/Kannada recipient extraction ("मेरे भाई को व्हाट्सएप मैसेज...", "मेरे भाई के लिए मैसेज...", "ನನ್ನ ಅಣ್ಣನಿಗೆ ವಾಟ್ಸಾಪ್ ಮೆಸೇಜ್...")
    if (!recipient) {
      const hiRecip = text.match(
        /(?:मेरे\s+|मेरी\s+|अपने\s+|अपनी\s+)?([\u0900-\u097F]+)\s+(?:को|के\s+लिए)\s+(?:जन्मदिन|व्हाट्सएप|व्हाट्सऐप|संदेश|मैसेज)/
      );
      if (hiRecip) recipient = hiRecip[1].trim();
    }
    if (!recipient) {
      const knTextClean = text.replace(/[\u200C\u200D]/g, '');
      const knRecip = knTextClean.match(
        /(?:ನನ್ನ\s+)?([\u0C80-\u0CFF]+?)(?:ನಿಗೆ|ರಿಗೆ|ಗೆ)(?:\s|$)/
      );
      if (knRecip && knRecip[1].trim().length >= 2) {
        recipient = knRecip[1].trim();
      }
    }

    const missingParameters: string[] = [];
    if (!recipient) missingParameters.push('recipient');
    if (!messageContent) missingParameters.push('messageContent');

    const status =
      missingParameters.length > 0 ? 'needs_info' : 'awaiting_confirmation';

    const task: AssistantTask = {
      id: createTaskId(),
      rawInstruction: text,
      normalizedInstruction: commandCore,
      intent: 'messaging',
      application: appName,
      action: isBirthdayOrWishMsg ? 'compose_birthday_message' : 'compose_message',
      target: recipient,
      recipient,
      messageContent,
      locationIntent: 'none',
      requiredParameters: ['recipient', 'messageContent'],
      missingParameters,
      confirmationRequired: true,
      executionStatus: status,
      capabilityNote:
        'Messaging is a sensitive action. Sahaaya prepares and confirms the message before proceeding.',
    };

    const replyText = !recipient
      ? buildMessagingQuestion('recipient', lang)
      : !messageContent
        ? buildMessagingQuestion('messageContent', lang)
        : buildMessagingConfirmQuestion(recipient, messageContent, lang);

    return {
      matched: true,
      task,
      replyText,
    };
  }

  // Compound Smartphone Commands ("Open Chrome and search for...", "Open Maps and find...")
  const compoundChromeMatch = commandCore.match(
    /^(?:open|launch|start)\s+(google\s+chrome|chrome|browser|google)\s+(?:and|to)\s+(?:search(?:\s+google)?(?:\s+for)?|find|look\s+up)\s+(.+)$/i
  );
  if (compoundChromeMatch) {
    const isChrome = /\b(chrome|browser)\b/i.test(compoundChromeMatch[1]);
    const cleanedQuery = compoundChromeMatch[2].replace(/[.!?]+$/, '').trim();
    const hasQuery =
      cleanedQuery.length >= 2 && !/^(something|anything|it)$/i.test(cleanedQuery);
    const task: AssistantTask = {
      id: createTaskId(),
      rawInstruction: text,
      normalizedInstruction: commandCore,
      intent: 'search',
      application: isChrome ? 'Chrome' : 'Google Search',
      action: 'web_search',
      target: hasQuery ? cleanedQuery : null,
      searchQuery: hasQuery ? cleanedQuery : null,
      messageContent: null,
      locationIntent: 'none',
      requiredParameters: ['query'],
      missingParameters: hasQuery ? [] : ['query'],
      confirmationRequired: true,
      requiresLocation: false,
      executionStatus: hasQuery ? 'awaiting_confirmation' : 'needs_info',
      capabilityNote: 'Chrome search is confirmed before opening or demonstrating results.',
    };
    return {
      matched: true,
      task,
      replyText: hasQuery
        ? buildSearchConfirmQuestion(cleanedQuery, lang)
        : buildSearchQuestion(lang),
    };
  }

  const compoundMapsMatch = commandCore.match(
    /^(?:open|launch|start)\s+(?:google\s+)?maps\s+(?:and|to)\s+(?:(show|get|find)\s+directions\s+(?:to|for)|find|search(?:\s+for)?|locate)\s+(.+)$/i
  );
  if (compoundMapsMatch) {
    const isDirections = Boolean(compoundMapsMatch[1]);
    const query = compoundMapsMatch[2].replace(/[.!?]+$/, '').trim();
    const hasQuery = query.length >= 2;
    const task: AssistantTask = {
      id: createTaskId(),
      rawInstruction: text,
      normalizedInstruction: commandCore,
      intent: 'search',
      application: 'Google Maps',
      action: isDirections ? 'directions' : 'web_search',
      target: hasQuery ? query : null,
      searchQuery: hasQuery ? query : null,
      messageContent: null,
      locationIntent: isDirections ? 'directions' : 'nearby',
      requiredParameters: [isDirections ? 'destination' : 'query'],
      missingParameters: hasQuery ? [] : [isDirections ? 'destination' : 'query'],
      confirmationRequired: true,
      requiresLocation: true,
      executionStatus: hasQuery ? 'awaiting_confirmation' : 'needs_info',
    };
    return {
      matched: true,
      task,
      replyText: hasQuery
        ? buildSearchConfirmQuestion(isDirections ? `directions to ${query}` : query, lang)
        : buildSearchQuestion(lang),
    };
  }

  // B2. Google Maps Directions Commands
  const directionsMatch = commandCore.match(
    /^(?:show|get|find|give me)?\s*directions\s+(?:to|for)\s+(.+)$/i
  );
  if (directionsMatch) {
    const dest = directionsMatch[1].replace(/[.!?]+$/, '').trim();
    const hasDest = dest.length >= 2;
    const task: AssistantTask = {
      id: createTaskId(),
      rawInstruction: text,
      normalizedInstruction: commandCore,
      intent: 'search',
      application: 'Google Maps',
      action: 'directions',
      target: hasDest ? dest : null,
      searchQuery: hasDest ? dest : null,
      messageContent: null,
      locationIntent: 'directions',
      requiredParameters: ['destination'],
      missingParameters: hasDest ? [] : ['destination'],
      confirmationRequired: true,
      requiresLocation: true,
      executionStatus: hasDest ? 'awaiting_confirmation' : 'needs_info',
    };
    return {
      matched: true,
      task,
      replyText: hasDest
        ? buildSearchConfirmQuestion(`directions to ${dest}`, lang)
        : lang === 'hi'
          ? 'आप कहाँ जाने का रास्ता देखना चाहते हैं?'
          : lang === 'kn'
            ? 'ನೀವು ಎಲ್ಲಿಗೆ ದಾರಿ ನೋಡಲು ಬಯಸುತ್ತೀರಿ?'
            : 'Where would you like directions to?',
    };
  }

  // P7. Spotify Music & Songs Intent
  const spotifyRes = extractSpotifyCommand(commandCore, text);
  if (spotifyRes.matched) {
    const hasTopic = Boolean(spotifyRes.query && spotifyRes.query.length >= 2);
    const task: AssistantTask = {
      id: createTaskId(),
      rawInstruction: text,
      normalizedInstruction: commandCore,
      intent: spotifyRes.isSearch ? 'search' : 'app_launch',
      application: 'Spotify',
      action: spotifyRes.isSearch ? 'search_spotify' : hasTopic ? 'play_music' : 'open_website',
      target: hasTopic ? spotifyRes.query : 'Spotify',
      searchQuery: hasTopic ? spotifyRes.query : null,
      messageContent: null,
      locationIntent: 'none',
      requiredParameters: [],
      missingParameters: [],
      confirmationRequired: true,
      requiresLocation: false,
      executionStatus: 'awaiting_confirmation',
      capabilityNote:
        'Spotify preview plays simulated tracks in Demo Mode or opens Spotify Web in Real Browser Mode.',
    };
    return {
      matched: true,
      task,
      replyText: hasTopic
        ? lang === 'hi'
          ? `मैंने Spotify पर "${spotifyRes.query}" खोजने की तैयारी की है। क्या आप आगे बढ़ना चाहते हैं?`
          : lang === 'kn'
            ? `Spotify ನಲ್ಲಿ "${spotifyRes.query}" ಹುಡುಕಲು ಸಿದ್ಧಪಡಿಸಿದ್ದೇನೆ. ಮುಂದುವರಿಯೋಣವೇ?`
            : `I prepared "${spotifyRes.query}" on Spotify. Would you like me to proceed?`
        : lang === 'hi'
          ? 'मैंने Spotify डेमो स्क्रीन तैयार की है। क्या आप इसे खोलना चाहेंगे?'
          : lang === 'kn'
            ? 'Spotify ಡೆಮೊ ಪರದೆ ಸಿದ್ಧವಾಗಿದೆ. ನಾನು ಇದನ್ನು ತೆರೆಯಲೇ?'
            : 'I prepared Spotify in the demo screen. Would you like me to open it?',
    };
  }

  // B1-HI/KN. Hindi & Kannada YouTube / Video Requests
  if (/वीडियो|यूट्यूब|रेसिपी|भजन|चलाओ|दिखाओ/.test(text) && !/कैलकुलेटर|कैलेंडर|अस्पताल|छात्रवृत्ति|अलार्म/.test(text)) {
    const hiTopic = text
      .replace(/^(?:कृपया\s+)?(?:मुझे\s+)?(?:यूट्यूब\s*(?:खोलो|खोलें|पर|में)?\s*(?:और)?\s*)?/i, '')
      .replace(/\s*(?:यूट्यूब\s*(?:पर|में)\s*)?(?:का\s+|के\s+|की\s+)?(?:वीडियो\s*(?:दिखाओ|दिखाइए|चलाओ|खोलो)|वीडियो|दिखाओ|दिखाइए|चलाओ)[.।!?]*$/i, '')
      .replace(/\s*(?:का|के|की)\s*$/i, '')
      .trim();
    if (hiTopic.length >= 2) {
      const task: AssistantTask = {
        id: createTaskId(),
        rawInstruction: text,
        normalizedInstruction: hiTopic,
        intent: 'search',
        application: 'YouTube',
        action: 'search_youtube',
        target: hiTopic,
        searchQuery: hiTopic,
        externalUrl: buildYouTubeSearchUrl(hiTopic),
        messageContent: null,
        locationIntent: 'none',
        requiredParameters: ['videoQuery'],
        missingParameters: [],
        confirmationRequired: true,
        executionStatus: 'awaiting_confirmation',
      };
      return {
        matched: true,
        task,
        replyText: `मैंने YouTube पर "${hiTopic}" के लिए वीडियो खोज तैयार की है। क्या आप आगे बढ़ना चाहते हैं?`,
      };
    }
  }

  if (/ವೀಡಿಯೊ|ವಿಡಿಯೋ|ಯೂಟ್ಯೂಬ್|ರೆಸಿಪಿ|ತೋರಿಸಿ|ಪ್ಲೇ\s*ಮಾಡಿ/.test(text) && !/ಕ್ಯಾಲ್ಕುಲೇಟರ್|ಕ್ಯಾಲೆಂಡರ್|ಆಸ್ಪತ್ರೆ|ವಿದ್ಯಾರ್ಥಿವೇತನ|ಅಲಾರಂ|ಅಲಾರಾಂ/.test(text)) {
    const knTopic = text
      .replace(/^(?:ದಯವಿಟ್ಟು\s+)?(?:ನನಗೆ\s+)?(?:ಯೂಟ್ಯೂಬ್\s*(?:ತೆರೆಯಿರಿ|ನಲ್ಲಿ|ಅಲ್ಲಿ)?\s*(?:ಮತ್ತು)?\s*)?/i, '')
      .replace(/\s*(?:ಯೂಟ್ಯೂಬ್‌?(?:ನಲ್ಲಿ|ಅಲ್ಲಿ)\s*)?(?:ವೀಡಿಯೊ|ವಿಡಿಯೋ)?\s*(?:ತೋರಿಸಿ|ಪ್ಲೇ\s*ಮಾಡಿ|ಹುಡುಕಿ|ತೆರೆಯಿರಿ)[.!?]*$/i, '')
      .replace(/ದ\s*$/i, '')
      .trim();
    if (knTopic.length >= 2) {
      const task: AssistantTask = {
        id: createTaskId(),
        rawInstruction: text,
        normalizedInstruction: knTopic,
        intent: 'search',
        application: 'YouTube',
        action: 'search_youtube',
        target: knTopic,
        searchQuery: knTopic,
        externalUrl: buildYouTubeSearchUrl(knTopic),
        messageContent: null,
        locationIntent: 'none',
        requiredParameters: ['videoQuery'],
        missingParameters: [],
        confirmationRequired: true,
        executionStatus: 'awaiting_confirmation',
      };
      return {
        matched: true,
        task,
        replyText: `YouTube ನಲ್ಲಿ "${knTopic}" ವೀಡಿಯೊ ಹುಡುಕಾಟವನ್ನು ಸಿದ್ಧಪಡಿಸಿದ್ದೇನೆ. ಮುಂದುವರಿಯೋಣವೇ?`,
      };
    }
  }

  // B1. General Video / Tutorial / YouTube Intent Extraction
  const videoRes = extractVideoQuery(commandCore);
  if (videoRes.matched) {
    const hasTopic = Boolean(videoRes.query && videoRes.query.length >= 2);
    const task: AssistantTask = {
      id: createTaskId(),
      rawInstruction: text,
      normalizedInstruction: commandCore,
      intent: videoRes.isYouTubeSearch ? 'search' : 'app_launch',
      application: 'YouTube',
      action: videoRes.isYouTubeSearch ? 'search_youtube' : 'play_video',
      target: hasTopic ? videoRes.query : null,
      searchQuery: hasTopic ? videoRes.query : null,
      externalUrl: hasTopic ? buildYouTubeSearchUrl(videoRes.query!) : null,
      messageContent: null,
      locationIntent: 'none',
      requiredParameters: ['videoQuery'],
      missingParameters: hasTopic ? [] : ['videoQuery'],
      confirmationRequired: true,
      executionStatus: hasTopic ? 'awaiting_confirmation' : 'needs_info',
    };
    return {
      matched: true,
      task,
      replyText: hasTopic
        ? lang === 'hi'
          ? `मैंने YouTube पर "${videoRes.query}" के लिए वीडियो खोज तैयार की है। क्या आप आगे बढ़ना चाहते हैं?`
          : lang === 'kn'
            ? `YouTube ನಲ್ಲಿ "${videoRes.query}" ವೀಡಿಯೊ ಹುಡುಕಾಟವನ್ನು ಸಿದ್ಧಪಡಿಸಿದ್ದೇನೆ. ಮುಂದುವರಿಯೋಣವೇ?`
            : `I prepared "${videoRes.query}" on YouTube. Would you like me to proceed?`
        : lang === 'hi'
          ? 'आप YouTube पर कौन-सा वीडियो देखना चाहते हैं?'
          : lang === 'kn'
            ? 'YouTube ನಲ್ಲಿ ನೀವು ಯಾವ ವೀಡಿಯೊ ನೋಡಲು ಬಯಸುತ್ತೀರಿ?'
            : 'Which YouTube video would you like me to open?',
    };
  }

  // B-HI/KN. Hindi & Kannada Search / Nearby Maps Commands
  if (/नज़दीकी|पास का|ढूँढो|खोजो|बताओ/.test(text) && !/छात्रवृत्ति/.test(text)) {
    const isNearbyHi = /नज़दीकी|पास का|पास के/.test(text);
    const cleanedHi = text
      .replace(/^(?:नज़दीकी|पास\s*का|पास\s*के)\s*/i, '')
      .replace(/\s*(?:ढूँढो|खोजो|बताओ)[.।!?]*$/i, '')
      .trim();
    if (cleanedHi.length >= 2) {
      const task: AssistantTask = {
        id: createTaskId(),
        rawInstruction: text,
        normalizedInstruction: cleanedHi,
        intent: 'search',
        application: isNearbyHi ? 'Google Maps' : 'Google Search',
        action: 'web_search',
        target: cleanedHi,
        searchQuery: cleanedHi,
        messageContent: null,
        locationIntent: isNearbyHi ? 'nearby' : 'none',
        requiresLocation: isNearbyHi,
        requiredParameters: ['query'],
        missingParameters: [],
        confirmationRequired: true,
        executionStatus: 'awaiting_confirmation',
      };
      return {
        matched: true,
        task,
        replyText: buildSearchConfirmQuestion(cleanedHi, lang),
      };
    }
  }

  if (/ಹತ್ತಿರದ|ಹುಡುಕಿ/.test(text) && !/ವಿದ್ಯಾರ್ಥಿವೇತನ/.test(text)) {
    const isNearbyKn = /ಹತ್ತಿರದ/.test(text);
    const cleanedKn = text
      .replace(/^ಹತ್ತಿರದ\s*/i, '')
      .replace(/\s*ಹುಡುಕಿ[.!?]*$/i, '')
      .trim();
    if (cleanedKn.length >= 2) {
      const task: AssistantTask = {
        id: createTaskId(),
        rawInstruction: text,
        normalizedInstruction: cleanedKn,
        intent: 'search',
        application: isNearbyKn ? 'Google Maps' : 'Google Search',
        action: 'web_search',
        target: cleanedKn,
        searchQuery: cleanedKn,
        messageContent: null,
        locationIntent: isNearbyKn ? 'nearby' : 'none',
        requiresLocation: isNearbyKn,
        requiredParameters: ['query'],
        missingParameters: [],
        confirmationRequired: true,
        executionStatus: 'awaiting_confirmation',
      };
      return {
        matched: true,
        task,
        replyText: buildSearchConfirmQuestion(cleanedKn, lang),
      };
    }
  }

  // B. Search & Nearby Place Commands
  if (
    /^(?:search|find|locate|look\s+up|where\s+(?:is|are|can\s+i\s+find)|show(?:\s+me)?)\b/i.test(
      commandCoreLower
    ) ||
    /\b(search google|search youtube|search for|find nearby|find an?|near\s+me|nearby|close\s+to\s+me|around\s+me|nearest|closest)\b/i.test(
      commandCoreLower
    )
  ) {
    const isYouTubeSearch = /\b(youtube|videos?)\b/i.test(commandCoreLower);
    const isGoogle =
      (/\bgoogle\b/i.test(commandCoreLower) && !/\bmaps\b/i.test(commandCoreLower)) ||
      /\binformation\s+about\b/i.test(commandCoreLower);
    const isNearby =
      (/\b(near\s+me|nearby|close\s+to\s+me|around\s+me|nearest|closest)\b/i.test(
        commandCoreLower
      ) ||
        /^where\s+can\s+i\s+find\b/i.test(commandCoreLower)) &&
      !/\bin\s+[A-Z][a-z]+/.test(commandCore);
    const hasLeadingNearbyAdj = /\b(?:search(?:\s+for)?|find|show(?:\s+me)?|locate)\s+(?:a\s+|an\s+|the\s+)?nearby\s+/i.test(
      commandCoreLower
    );

    let cleanedQuery = commandCore
      .replace(
        /^(?:search\s+google\s+for|search\s+youtube\s+for|search\s+google|search\s+youtube|search\s+for|search|find\s+information\s+about|find|locate|look\s+up|where\s+can\s+i\s+find|where\s+(?:is|are)|show\s+me|show)(?:\s+|$)/i,
        ''
      )
      .replace(/^(?:for|about)\s+/i, '')
      .replace(/\s+on\s+(?:google|youtube|maps|google\s+maps)[.!?]*$/i, '')
      .replace(/[.!?]+$/, '')
      .trim();

    cleanedQuery = cleanedQuery.replace(/^(?:a|an|the)\s+/i, '').trim();
    if (!hasLeadingNearbyAdj) {
      cleanedQuery = cleanedQuery
        .replace(/^(?:nearest|closest|nearby)\s+/i, '')
        .replace(
          /\s+(?:near\s+me|nearby|close\s+to\s+me|around\s+me|closest\s+to\s+me|near\s+here)$/i,
          ''
        )
        .trim();
    }
    cleanedQuery = cleanedQuery.replace(/^(?:a|an|the)\s+/i, '').trim();

    const isGenericPlaceholder = /^(something|anything|stuff|things|it|this|that)$/i.test(
      cleanedQuery
    );
    const hasQuery = cleanedQuery.length >= 2 && !isGenericPlaceholder;
    const targetDisplay =
      hasQuery && /^search\s+for\s+hospitals\s+near\s+me[.!?]*$/i.test(commandCore)
        ? 'hospitals near me'
        : hasQuery
          ? cleanedQuery
          : null;
    const task: AssistantTask = {
      id: createTaskId(),
      rawInstruction: text,
      normalizedInstruction: commandCore,
      intent: 'search',
      application: isYouTubeSearch
        ? 'YouTube'
        : isNearby && !isGoogle
          ? 'Google Maps'
          : 'Google Search',
      action: isYouTubeSearch ? 'search_youtube' : 'web_search',
      target: targetDisplay,
      searchQuery: hasQuery ? cleanedQuery : null,
      externalUrl: isYouTubeSearch && hasQuery ? buildYouTubeSearchUrl(cleanedQuery) : undefined,
      messageContent: null,
      locationIntent: isNearby && !isYouTubeSearch ? 'nearby' : 'none',
      requiresLocation: isNearby && !isYouTubeSearch && !isGoogle,
      requiredParameters: ['query'],
      missingParameters: hasQuery ? [] : ['query'],
      confirmationRequired: true,
      executionStatus: hasQuery ? 'awaiting_confirmation' : 'needs_info',
      capabilityNote:
        'Search is confirmed before opening or demonstrating results.',
    };

    return {
      matched: true,
      task,
      replyText: hasQuery
        ? buildSearchConfirmQuestion(cleanedQuery, lang)
        : buildSearchQuestion(lang),
    };
  }

  // A. Application Launching Commands (Known Apps & Unknown Apps, EN prefix + HI/KN SOV suffix)
  const launchMatch =
    commandCore.match(/^(?:open|launch|start)\s+(?:my\s+|the\s+)?(.+)$/i) ||
    commandCore.match(
      /^(.+?)\s+(?:खोलो|खोलें|खोलिए|शुरू\s*करो|चलाओ|ओपन\s*करो|ತೆರೆಯಿರಿ|ತೆರೆ|ಪ್ರಾರಂಭಿಸಿ|ಓಪನ್\s*ಮಾಡಿ)[.।!?]*$/i
    );
  if (launchMatch) {
    const requestedTarget = launchMatch[1].replace(/[.।!?]+$/, '').trim();
    if (/^(?:an?\s+)?(?:application|app)$/i.test(requestedTarget)) {
      const task: AssistantTask = {
        id: createTaskId(),
        rawInstruction: text,
        intent: 'app_launch',
        application: null,
        action: 'open_app',
        target: null,
        messageContent: null,
        requiredParameters: ['application'],
        missingParameters: ['application'],
        confirmationRequired: true,
        executionStatus: 'needs_info',
      };
      return {
        matched: true,
        task,
        replyText:
          lang === 'hi'
            ? 'आप कौन-सा ऐप खोलना चाहते हैं? जैसे WhatsApp, YouTube, Google Chrome, Google Maps, कैमरा या सेटिंग्स।'
            : lang === 'kn'
              ? 'ನೀವು ಯಾವ ಆ್ಯಪ್ ತೆರೆಯಲು ಬಯಸುತ್ತೀರಿ? ಉದಾಹರಣೆಗೆ WhatsApp, YouTube, Google Chrome, Google Maps, ಕ್ಯಾಮೆರಾ ಅಥವಾ ಸೆಟ್ಟಿಂಗ್ಸ್.'
              : 'Which application would you like me to open? For example, WhatsApp, YouTube, Google Chrome, Google Maps, Camera, or Settings.',
      };
    }

    const matchedApp = KNOWN_APPS.find((app) =>
      app.patterns.some((re) => re.test(requestedTarget))
    );

    if (matchedApp) {
      const task: AssistantTask = {
        id: createTaskId(),
        rawInstruction: text,
        intent: 'app_launch',
        application: matchedApp.canonicalName,
        action: 'launch_app',
        target: matchedApp.canonicalName,
        messageContent: null,
        requiredParameters: [],
        missingParameters: [],
        confirmationRequired: false,
        executionStatus: 'unavailable_on_web',
        capabilityNote:
          'Android device integration is required to open external smartphone apps.',
      };
      return {
        matched: true,
        task,
        replyText: buildCapabilityReply('app_launch', matchedApp.canonicalName, lang),
      };
    }

    // Unknown application fallback (make sure it doesn't swallow phrases like "open my application" or pronoun confirmations like "open it")
    if (
      !/\b(application|form)\b/i.test(requestedTarget) &&
      !/^(?:it|this|that|them|one|this one|that one)$/i.test(requestedTarget)
    ) {
      const task: AssistantTask = {
        id: createTaskId(),
        rawInstruction: text,
        intent: 'unknown_app',
        application: requestedTarget,
        action: 'launch_app',
        target: requestedTarget,
        messageContent: null,
        requiredParameters: [],
        missingParameters: [],
        confirmationRequired: false,
        executionStatus: 'unavailable_on_web',
        capabilityNote:
          'Unrecognised application. External apps cannot be launched from a web browser.',
      };
      return {
        matched: true,
        task,
        replyText: buildCapabilityReply('unknown_app', requestedTarget, lang),
      };
    }
  }

  // G. General Conversation (deterministic, zero-API natural responses)
  if (
    /^(hello|hi|hey|namaste|good morning|good afternoon|good evening)\b/i.test(
      lower
    ) ||
    /\bhow are you\b/i.test(lower) ||
    text.includes('नमस्ते') ||
    text.includes('ನಮಸ್ಕಾರ')
  ) {
    const task: AssistantTask = {
      id: createTaskId(),
      rawInstruction: text,
      intent: 'general_conversation',
      application: 'Sahaaya',
      action: 'greeting',
      target: 'General Conversation',
      messageContent: null,
      requiredParameters: [],
      missingParameters: [],
      confirmationRequired: false,
      executionStatus: 'executed_in_web',
    };
    return {
      matched: true,
      task,
      replyText:
        lang === 'hi'
          ? 'नमस्ते! मैं ठीक हूँ और आपकी मदद के लिए तैयार हूँ। आप मुझसे कुछ खोजने, वेबसाइट खोलने, संदेश तैयार करने या फॉर्म भरने के लिए कह सकते हैं।'
          : lang === 'kn'
            ? 'ನಮಸ್ಕಾರ! ನಾನು ಚೆನ್ನಾಗಿದ್ದೇನೆ ಮತ್ತು ನಿಮಗೆ ಸಹಾಯ ಮಾಡಲು ಸಿದ್ಧನಿದ್ದೇನೆ. ನೀವು ಮಾಹಿತಿ ಹುಡುಕಲು, ವೆಬ್‌ಸೈಟ್ ತೆರೆಯಲು, ಸಂದೇಶ ಸಿದ್ಧಪಡಿಸಲು ಅಥವಾ ಫಾರ್ಮ್ ಭರ್ತಿ ಮಾಡಲು ಕೇಳಬಹುದು.'
            : "Hello! I'm doing well and ready to help. You can ask me to search for something, open a website like YouTube, prepare a WhatsApp message, explain this page, or help you with a form.",
    };
  }

  if (
    /\b(who are you|what are you|what can you do|what can you help me with|how can you help|what are your features|what do you do)\b/i.test(
      lower
    ) ||
    text.includes('आप कौन') ||
    text.includes('क्या कर सकते') ||
    text.includes('ನೀವು ಯಾರು') ||
    text.includes('ಏನು ಮಾಡಬಲ್ಲಿರಿ')
  ) {
    const task: AssistantTask = {
      id: createTaskId(),
      rawInstruction: text,
      intent: 'general_conversation',
      application: 'Sahaaya',
      action: 'describe_capabilities',
      target: 'Assistant Capabilities',
      messageContent: null,
      requiredParameters: [],
      missingParameters: [],
      confirmationRequired: false,
      executionStatus: 'executed_in_web',
    };
    return {
      matched: true,
      task,
      replyText:
        lang === 'hi'
          ? 'मैं सहाय हूँ—एक आवाज़-आधारित डिजिटल सहायक। मैं आपके कहने पर YouTube या Google जैसी वेबसाइट खोलने, नज़दीकी अस्पताल या जानकारी खोजने, WhatsApp संदेश तैयार करने, स्क्रीन समझाने और कल्याण आवेदन फ़ॉर्म भरने में मदद कर सकती हूँ।'
          : lang === 'kn'
            ? 'ನಾನು ಸಹಾಯಾ—ಧ್ವನಿ-ಆಧಾರಿತ ಡಿಜಿಟಲ್ ಸಹಾಯಕ. ನೀವು ಹೇಳಿದಂತೆ YouTube ಅಥವಾ Google ನಂತಹ ವೆಬ್‌ಸೈಟ್ ತೆರೆಯಲು, ಹತ್ತಿರದ ಆಸ್ಪತ್ರೆ ಅಥವಾ ಮಾಹಿತಿ ಹುಡುಕಲು, WhatsApp ಸಂದೇಶ ಸಿದ್ಧಪಡಿಸಲು, ಪರದೆ ವಿವರಿಸಲು ಮತ್ತು ಕಲ್ಯಾಣ ಅರ್ಜಿ ಭರ್ತಿ ಮಾಡಲು ನಾನು ಸಹಾಯ ಮಾಡುತ್ತೇನೆ.'
            : "I'm Sahaaya, a voice-first digital accessibility assistant. I can help you open websites like YouTube or Google, search for nearby hospitals or information, prepare WhatsApp messages for you to review, explain what's on this page, or help you fill out a welfare form.",
    };
  }

  if (
    /\b(i need some help|can you help me|help me please|i don't know how to use this phone|dont know how to use|confused|how does this work)\b/i.test(
      lower
    ) ||
    text.includes('मदद चाहिए') ||
    text.includes('ಸಹಾಯ ಬೇಕು')
  ) {
    const task: AssistantTask = {
      id: createTaskId(),
      rawInstruction: text,
      intent: 'general_conversation',
      application: 'Sahaaya',
      action: 'reassure_and_guide',
      target: 'User Guidance',
      messageContent: null,
      requiredParameters: [],
      missingParameters: [],
      confirmationRequired: false,
      executionStatus: 'executed_in_web',
    };
    return {
      matched: true,
      task,
      replyText:
        lang === 'hi'
          ? 'चिंता न करें, आराम से समय लें। आप बस एक सरल वाक्य बोलें या लिखें—जैसे "Open YouTube", "Search for nearby hospitals", "Prepare a WhatsApp message", या "Explain what is on this page"।'
          : lang === 'kn'
            ? 'ಚಿಂತಿಸಬೇಡಿ, ನಿಧಾನವಾಗಿ ಪ್ರಯತ್ನಿಸಿ. ನೀವು ಸರಳವಾಗಿ ಹೀಗೆ ಹೇಳಬಹುದು ಅಥವಾ ಟೈಪ್ ಮಾಡಬಹುದು—"Open YouTube", "Search for nearby hospitals", "Prepare a WhatsApp message", ಅಥವಾ "Explain what is on this page".'
            : 'Take your time—I am here to make things simple. Just tell me what you would like to do, such as "Open YouTube", "Search for nearby hospitals", "Prepare a message", "Explain what is on this page", or "Help me fill out a form".',
    };
  }

  if (/^(thank you|thanks|ok|okay|that's nice|great|dhanyavad|ಧನ್ಯವಾದ)\b/i.test(lower)) {
    const task: AssistantTask = {
      id: createTaskId(),
      rawInstruction: text,
      intent: 'general_conversation',
      application: 'Sahaaya',
      action: 'polite_ack',
      target: 'General Conversation',
      messageContent: null,
      requiredParameters: [],
      missingParameters: [],
      confirmationRequired: false,
      executionStatus: 'executed_in_web',
    };
    return {
      matched: true,
      task,
      replyText:
        lang === 'hi'
          ? 'आपका स्वागत है! बताइए, क्या मैं आपकी कोई और मदद कर सकती हूँ?'
          : lang === 'kn'
            ? 'ನಿಮಗೆ ಸ್ವಾಗತ! ನಾನು ನಿಮಗೆ ಬೇರೆ ಯಾವ ಸಹಾಯ ಮಾಡಲಿ?'
            : "You're very welcome! Let me know what else you would like help with.",
    };
  }

  return {
    matched: false,
    task: null,
    replyText: '',
  };
}

export function buildGeneralFallbackResponse(
  rawInstruction: string,
  lang: LanguageCode = 'en'
): string {
  const fullUtterance = rawInstruction.trim();
  if (lang === 'hi') {
    return `मैंने "${fullUtterance}" सुना, लेकिन इस वेब डेमो में मैं इसे सीधे नहीं कर सकता। मैं वेबसाइट खोलने (जैसे YouTube या Google), कुछ खोजने, WhatsApp संदेश तैयार करने, स्क्रीन समझाने या कल्याण फ़ॉर्म भरने में आपकी मदद कर सकती हूँ।`;
  }
  if (lang === 'kn') {
    return `ನಾನು "${fullUtterance}" ಎಂದು ಕೇಳಿಸಿಕೊಂಡೆ, ಆದರೆ ಈ ವೆಬ್ ಡೆಮೊದಲ್ಲಿ ನಾನು ಇದನ್ನು ನೇರವಾಗಿ ಮಾಡಲು ಸಾಧ್ಯವಿಲ್ಲ. ವೆಬ್‌ಸೈಟ್ ತೆರೆಯಲು (YouTube/Google), ಮಾಹಿತಿ ಹುಡುಕಲು, WhatsApp ಸಂದೇಶ ಸಿದ್ಧಪಡಿಸಲು, ಪರದೆ ವಿವರಿಸಲು ಅಥವಾ ಫಾರ್ಮ್ ಭರ್ತಿ ಮಾಡಲು ನಾನು ಸಹಾಯ ಮಾಡಬಲ್ಲೆ.`;
  }
  return `I heard "${fullUtterance}", and I'm not able to perform that exact request directly in this browser demo. I can help you open websites like YouTube or Google, search for nearby places or information, prepare a WhatsApp message, explain this page, or help you fill out a welfare form—what would you like to try?`;
}

export function advanceTaskConversation(
  task: AssistantTask,
  userReply: string,
  lang: LanguageCode = 'en'
): { task: AssistantTask; replyText: string } {
  const reply = userReply.trim();

  if (isNegativeOrCancel(reply)) {
    const cancelledTask: AssistantTask = {
      ...task,
      executionStatus: 'cancelled',
    };
    return {
      task: cancelledTask,
      replyText:
        lang === 'hi'
          ? 'ठीक है, मैंने इस कार्य को रद्द कर दिया है। बताइए, मैं आपकी और क्या मदद कर सकता हूँ?'
          : lang === 'kn'
            ? 'ಸರಿ, ಈ ಕಾರ್ಯವನ್ನು ರದ್ದುಗೊಳಿಸಿದ್ದೇನೆ. ನಾನು ನಿಮಗೆ ಬೇರೆ ಯಾವ ಸಹಾಯ ಮಾಡಲಿ?'
            : 'Okay, I have cancelled that task. How else can I help you?',
    };
  }

  // Handle incomplete app_launch target (e.g., "Open an application" -> user names app, or YouTube video topic)
  if (task.intent === 'app_launch' && task.executionStatus === 'needs_info') {
    const cleaned = reply.replace(/[.!?]+$/, '').trim();
    if (task.action === 'play_video') {
      if (cleaned.length < 2) {
        return {
          task,
          replyText:
            lang === 'hi'
              ? 'आप YouTube पर कौन-सा वीडियो देखना चाहते हैं?'
              : lang === 'kn'
                ? 'YouTube ನಲ್ಲಿ ನೀವು ಯಾವ ವೀಡಿಯೊ ನೋಡಲು ಬಯಸುತ್ತೀರಿ?'
                : 'Which YouTube video would you like me to open?',
        };
      }
      const nextTask: AssistantTask = {
        ...task,
        target: cleaned,
        searchQuery: cleaned,
        externalUrl: buildYouTubeSearchUrl(cleaned),
        missingParameters: [],
        executionStatus: 'awaiting_confirmation',
      };
      return {
        task: nextTask,
        replyText: `I prepared the YouTube video search for "${cleaned}". Would you like me to proceed?`,
      };
    }

    const matchedApp = KNOWN_APPS.find((app) =>
      app.patterns.some((re) => re.test(cleaned))
    );
    if (matchedApp) {
      const nextTask: AssistantTask = {
        ...task,
        application: matchedApp.canonicalName,
        target: matchedApp.canonicalName,
        missingParameters: [],
        confirmationRequired: true,
        executionStatus: 'awaiting_confirmation',
      };
      return {
        task: nextTask,
        replyText: `I prepared ${matchedApp.canonicalName}. Would you like me to proceed?`,
      };
    }
  }

  // Handle incomplete Calendar event date, time, and title
  if (
    task.application === 'Calendar' &&
    task.action === 'add_calendar_event' &&
    task.executionStatus === 'needs_info' &&
    task.calendarDraft
  ) {
    const waitingForTitleOnly =
      Boolean(task.calendarDraft.date) &&
      Boolean(task.calendarDraft.time) &&
      (Boolean(task.calendarDraft.needsTitle) || task.missingParameters.includes('title'));

    let nextTitle = task.calendarDraft.title || 'Reminder';
    let stillNeedsTitle = Boolean(task.calendarDraft.needsTitle);
    let dateInfo = task.calendarDraft.date
      ? { date: task.calendarDraft.date, label: task.calendarDraft.dateLabel || task.calendarDraft.date }
      : extractDateFromText(reply);
    let timeInfo = task.calendarDraft.time || extractTimeFromText(reply);

    if (waitingForTitleOnly) {
      const cleanedTitle = reply
        .replace(/^(?:call\s+it|name\s+it|it(?:'s|\s+is)\s+called|it(?:'s|\s+is)|title\s+is|for)\s+/i, '')
        .replace(/[.!?।]+$/g, '')
        .trim();
      if (cleanedTitle.length >= 2) {
        nextTitle = cleanedTitle.charAt(0).toUpperCase() + cleanedTitle.slice(1);
        stillNeedsTitle = false;
      }
    }

    const missingSlots: Array<'date' | 'time' | 'title'> = [];
    if (!dateInfo.date) missingSlots.push('date');
    if (!timeInfo) missingSlots.push('time');
    if (stillNeedsTitle) missingSlots.push('title');

    const nextTask: AssistantTask = {
      ...task,
      target: nextTitle,
      calendarDraft: {
        ...task.calendarDraft,
        title: nextTitle,
        date: dateInfo.date,
        dateLabel: dateInfo.label,
        time: timeInfo,
        needsTitle: stillNeedsTitle,
      },
      missingParameters: missingSlots,
      executionStatus: missingSlots.length === 0 ? 'ready' : 'needs_info',
    };

    if (missingSlots.length > 0) {
      return {
        task: nextTask,
        replyText: buildCalendarPrompt(
          {
            matched: true,
            subAction: 'add_event',
            title: nextTitle,
            date: dateInfo.date,
            dateLabel: dateInfo.label,
            time: timeInfo,
            needsTitle: stillNeedsTitle,
            missingSlots,
          },
          lang
        ),
      };
    }

    return {
      task: nextTask,
      replyText:
        lang === 'hi'
          ? `कैलेंडर में "${nextTitle}" (${dateInfo.label || dateInfo.date}, ${timeInfo}) जोड़ा जा रहा है।`
          : lang === 'kn'
            ? `ಕ್ಯಾಲೆಂಡರ್‌ನಲ್ಲಿ "${nextTitle}" (${dateInfo.label || dateInfo.date}, ${timeInfo}) ಸೇರಿಸಲಾಗುತ್ತಿದೆ.`
            : `Adding "${nextTitle}" to your simulated calendar for ${dateInfo.label || dateInfo.date} at ${timeInfo}.`,
    };
  }

  // Handle incomplete search query (including scholarship education level follow-up)
  if (task.intent === 'search' && task.executionStatus === 'needs_info') {
    const cleaned = reply
      .replace(/^(search for|find|i want to search for|for|i am looking for|im looking for)\s+/i, '')
      .replace(/[.!?]+$/, '')
      .trim();
    if (cleaned.length < 2) {
      return {
        task,
        replyText: buildSearchQuestion(lang),
      };
    }
    const refinedQuery =
      task.action === 'scholarship_search' && !/scholarship/i.test(cleaned)
        ? `scholarships for ${cleaned} students`
        : cleaned;
    const nextTask: AssistantTask = {
      ...task,
      target: refinedQuery,
      searchQuery: refinedQuery,
      externalUrl:
        task.action === 'search_youtube'
          ? buildYouTubeSearchUrl(refinedQuery)
          : task.externalUrl,
      educationLevel: task.action === 'scholarship_search' ? cleaned : task.educationLevel,
      missingParameters: [],
      executionStatus: 'awaiting_confirmation',
    };
    return {
      task: nextTask,
      replyText: buildSearchConfirmQuestion(refinedQuery, lang),
    };
  }

  // Handle incomplete messaging slot filling
  if (task.intent === 'messaging' && task.executionStatus === 'needs_info') {
    if (!task.target) {
      const recipient = reply
        .replace(/^(?:to|message)\s+/i, '')
        .replace(/[.!?]+$/, '')
        .trim();
      if (recipient.length < 2) {
        return { task, replyText: buildMessagingQuestion('recipient', lang) };
      }
      const nextMissing = task.messageContent ? [] : ['messageContent'];
      const nextTask: AssistantTask = {
        ...task,
        target: recipient,
        recipient,
        missingParameters: nextMissing,
        executionStatus: nextMissing.length === 0 ? 'awaiting_confirmation' : 'needs_info',
      };
      return {
        task: nextTask,
        replyText: task.messageContent
          ? buildMessagingConfirmQuestion(recipient, task.messageContent, lang)
          : buildMessagingQuestion('messageContent', lang),
      };
    }

    if (!task.messageContent) {
      const msgBody = reply
        .replace(/^["']|["']$/g, '')
        .replace(/^(?:say|write|the message should say)\s+/i, '')
        .trim();
      if (!msgBody) {
        return { task, replyText: buildMessagingQuestion('messageContent', lang) };
      }
      const nextTask: AssistantTask = {
        ...task,
        messageContent: msgBody,
        missingParameters: [],
        executionStatus: 'awaiting_confirmation',
      };
      const readyMsg =
        task.action === 'compose_birthday_message'
          ? lang === 'hi'
            ? `${task.target} के लिए आपका जन्मदिन संदेश तैयार है: "${msgBody}"। क्या आप आगे बढ़ना चाहते हैं?`
            : lang === 'kn'
              ? `${task.target} ಅವರಿಗೆ ನಿಮ್ಮ ಹುಟ್ಟುಹಬ್ಬದ ಸಂದೇಶ ಸಿದ್ಧವಾಗಿದೆ: "${msgBody}". ಮುಂದುವರಿಯೋಣವೇ?`
              : `Your birthday message to ${task.target} is ready: "${msgBody}". Would you like to continue?`
          : buildMessagingConfirmQuestion(task.target, msgBody, lang);
      return {
        task: nextTask,
        replyText: readyMsg,
      };
    }
  }

  // Handle explicit confirmation for pending actions (messaging, search, app_launch)
  if (task.executionStatus === 'awaiting_confirmation') {
    if (isAffirmative(reply)) {
      if (task.intent === 'messaging') {
        const doneTask: AssistantTask = {
          ...task,
          executionStatus: 'unavailable_on_web',
        };
        return {
          task: doneTask,
          replyText:
            lang === 'hi'
              ? `${task.target} के लिए आपका संदेश ("${task.messageContent}") तैयार और पुष्ट हो गया है, लेकिन यह वेब प्रोटोटाइप व्हाट्सएप या एसएमएस संदेश नहीं भेज सकता।`
              : lang === 'kn'
                ? `${task.target} ಅವರಿಗೆ ನಿಮ್ಮ ಸಂದೇಶ ("${task.messageContent}") ಸಿದ್ಧವಾಗಿದೆ ಮತ್ತು ದೃಢಪಟ್ಟಿದೆ, ಆದರೆ ಈ ವೆಬ್ ಪ್ರೋಟೋಟೈಪ್ ವಾಟ್ಸಾಪ್ ಅಥವಾ ಎಸ್‌ಎಂಎಸ್ ಕಳುಹಿಸಲು ಸಾಧ್ಯವಿಲ್ಲ.`
                : `Your message to ${task.target} ("${task.messageContent}") is confirmed, but this web prototype cannot send ${task.application || 'WhatsApp'} messages directly. Android app integration is required to send it.`,
        };
      }

      if (task.intent === 'search') {
        const doneTask: AssistantTask = {
          ...task,
          executionStatus: 'unavailable_on_web',
        };
        return {
          task: doneTask,
          replyText:
            lang === 'hi'
              ? `"${task.target}" के लिए खोज अनुरोध तैयार है, लेकिन यह वेब डेमो बाहरी खोज ऐप नहीं खोल सकता।`
              : lang === 'kn'
                ? `"${task.target}" ಹುಡುಕಾಟ ವಿನಂತಿ ಸಿದ್ಧವಾಗಿದೆ, ಆದರೆ ಈ ವೆಬ್ ಡೆಮೊ ಬಾಹ್ಯ ಹುಡುಕಾಟ ಆ್ಯಪ್ ತೆರೆಯಲು ಸಾಧ್ಯವಿಲ್ಲ.`
                : `Your search request for "${task.target}" is confirmed, but launching external ${task.application || 'Search'} apps is not available in this web prototype.`,
        };
      }

      if (task.intent === 'app_launch') {
        const targetName = task.target || task.application || 'this application';
        const doneTask: AssistantTask = {
          ...task,
          executionStatus: 'unavailable_on_web',
        };
        return {
          task: doneTask,
          replyText:
            lang === 'hi'
              ? `${targetName} खोलने की पुष्टि हो गई है।`
              : lang === 'kn'
                ? `${targetName} ತೆರೆಯಲು ದೃಢೀಕರಿಸಲಾಗಿದೆ.`
                : `Confirmed opening ${targetName}.`,
        };
      }
    }

    // Re-prompt politely if confirmation answer was ambiguous
    if (task.intent === 'messaging' && task.target && task.messageContent) {
      return {
        task,
        replyText: buildMessagingConfirmQuestion(
          task.target,
          task.messageContent,
          lang
        ),
      };
    }
    if (task.intent === 'search' && task.target) {
      return {
        task,
        replyText: buildSearchConfirmQuestion(task.target, lang),
      };
    }
    if (task.intent === 'app_launch') {
      const targetName = task.target || task.application || 'this application';
      return {
        task,
        replyText:
          lang === 'hi'
            ? `क्या आप चाहते हैं कि मैं ${targetName} खोलूँ? कृपया हाँ या नहीं कहें।`
            : lang === 'kn'
              ? `ನಾನು ${targetName} ತೆರೆಯಬೇಕೆ? ದಯವಿಟ್ಟು ಹೌದು ಅಥವಾ ಬೇಡ ಎಂದು ಹೇಳಿ.`
              : `Would you like me to open ${targetName}? Please say Yes to continue or No to cancel.`,
      };
    }
  }

  return {
    task,
    replyText: '',
  };
}
