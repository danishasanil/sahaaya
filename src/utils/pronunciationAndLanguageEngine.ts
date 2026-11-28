import {
  LanguageCode,
  LanguageDetectionResult,
  PronunciationNormalizationResult,
} from '../types/sahaaya';

interface PhoneticReplacement {
  label: string;
  pattern: RegExp;
  replacement: string;
}

/**
 * Deterministic pronunciation & Indian-English STT adaptation rules
 * applied ONLY to command matching (never to personal names or form fields).
 */
const COMMAND_PHONETIC_REPLACEMENTS: PhoneticReplacement[] = [
  // YouTube variants
  {
    label: 'YouTube',
    pattern:
      /\b(?:you\s+tube|u\s+tube|u-tube|utube|yutub|yootube|yo\s+tube|you-tube|yu\s*tube|ytube)\b/gi,
    replacement: 'YouTube',
  },
  // WhatsApp variants (careful not to hijack "what's up" greeting unless paired with send/message/open)
  {
    label: 'WhatsApp',
    pattern:
      /\b(?:whats\s+app|what's\s+app|whatapp|watsapp|watsap|wats\s+app|whattsapp|whatsup\s+(?=message|msg)|whats\s+up\s+(?=message|msg))\b/gi,
    replacement: 'WhatsApp',
  },
  {
    label: 'WhatsApp',
    pattern: /\b(?:open|launch|start)\s+(?:whats\s+up|whatsup|watsap)\b/gi,
    replacement: 'open WhatsApp',
  },
  // Google Maps & Chrome & Google variants
  {
    label: 'Google Maps',
    pattern: /\b(?:gugal|goggle|googal|googel)\s+maps?\b/gi,
    replacement: 'Google Maps',
  },
  {
    label: 'Google Chrome',
    pattern: /\b(?:gugal|goggle|googal|googel)\s+(?:chrome|krome|chrom)\b/gi,
    replacement: 'Google Chrome',
  },
  {
    label: 'Chrome',
    pattern: /\b(?:krome|chrom)\b/gi,
    replacement: 'Chrome',
  },
  {
    label: 'Google',
    pattern: /\b(?:gugal|goggle|googal|googel)\b/gi,
    replacement: 'Google',
  },
  // Calculator, Calendar, Spotify, Camera, Settings
  {
    label: 'Calculator',
    pattern: /\b(?:calculater|calclator|calcultor|calulator|kalkulator)\b/gi,
    replacement: 'Calculator',
  },
  {
    label: 'Calendar',
    pattern: /\b(?:calender|calandar|kalendar|kalander)\b/gi,
    replacement: 'Calendar',
  },
  {
    label: 'Spotify',
    pattern: /\b(?:spotifi|spotfy|spottify|spotyfy)\b/gi,
    replacement: 'Spotify',
  },
  {
    label: 'Camera',
    pattern: /\b(?:camara|camra|kemra)\b/gi,
    replacement: 'Camera',
  },
  {
    label: 'Settings',
    pattern: /\b(?:setings|seting|settins)\b/gi,
    replacement: 'Settings',
  },
  // Common Indian English / STT word slips in everyday elderly queries
  {
    label: 'pharmacy',
    pattern: /\b(?:farmacy|farmasy|pharmasy|pharamacy)\b/gi,
    replacement: 'pharmacy',
  },
  {
    label: 'hospital',
    pattern: /\b(?:hospitel|hospitl|hosptial)\b/gi,
    replacement: 'hospital',
  },
  {
    label: 'recipe',
    pattern: /\b(?:recipie|resipi|receipe|recepie|recipy)\b/gi,
    replacement: 'recipe',
  },
  {
    label: 'scholarship',
    pattern: /\b(?:scolarship|scholership|scholarhip)\b/gi,
    replacement: 'scholarship',
  },
  {
    label: 'video',
    pattern: /\b(?:vedio|vdo|vedeo|vidio)\b/gi,
    replacement: 'video',
  },
];

/**
 * Normalizes slow/hesitant pauses, filler words, repeated words, and accented
 * command pronunciations without touching personal names when used by callers
 * only for command intent routing.
 */
export function normalizeSpeechCommandPronunciation(
  rawTranscript: string
): PronunciationNormalizationResult {
  const original = rawTranscript.trim();
  if (!original) {
    return { normalizedCommand: '', matchedCorrections: [] };
  }

  let text = original
    // Collapse pause markers / ellipses often inserted by slow STT
    .replace(/\.{2,}|…+|—+/g, ' ')
    // Remove hesitant speech fillers
    .replace(/\b(?:uh+|um+|erm+|ah+|hmm+)\b[, ]*/gi, ' ')
    // Collapse accidental repeated words ("open open youtube")
    .replace(/\b([a-zA-Z]{2,})\s+\1\b/gi, '$1')
    // Strip Indian English conversational framing ("do one thing", "please open for me")
    .replace(/\bdo\s+one\s+thing[, ]*/gi, '')
    .replace(/\s+for\s+me([.!?]*)$/i, '$1')
    .replace(/\s+/g, ' ')
    .trim();

  const matchedCorrections: string[] = [];

  for (const rule of COMMAND_PHONETIC_REPLACEMENTS) {
    if (rule.pattern.test(text)) {
      rule.pattern.lastIndex = 0;
      text = text.replace(rule.pattern, rule.replacement);
      if (!matchedCorrections.includes(rule.label)) {
        matchedCorrections.push(rule.label);
      }
    }
  }

  // Normalize mixed-language (Kanglish / Hinglish / Tulu-English) action verbs cleanly
  // e.g., "YouTube open maadi" -> "open YouTube"
  const kanglishOpen = text.match(
    /^(.+?)\s+(?:open|start|launch)\s+(?:maadi|madi|madri|madu|maadu|maadiri|malpule|malpu)[.!?]*$/i
  );
  if (kanglishOpen && kanglishOpen[1].trim().length >= 2) {
    text = `open ${kanglishOpen[1].trim()}`;
    matchedCorrections.push('mixed-language-open');
  }

  const kanglishPlay = text.match(
    /^(.+?)\s+(?:play)\s+(?:maadi|madi|madri|madu|maadu|malpule)[.!?]*$/i
  );
  if (kanglishPlay && kanglishPlay[1].trim().length >= 2) {
    text = `play ${kanglishPlay[1].trim()}`;
    matchedCorrections.push('mixed-language-play');
  }

  const kanglishSearch = text.match(
    /^(.+?)\s+(?:search\s+(?:maadi|madi|madri|madu|malpule)|huduki|huduku|hudukiri)[.!?]*$/i
  );
  if (kanglishSearch && kanglishSearch[1].trim().length >= 2) {
    text = `search for ${kanglishSearch[1].trim()}`;
    matchedCorrections.push('mixed-language-search');
  }

  // Hinglish patterns:
  // "YouTube kholo" / "YouTube chalu karo" -> "open YouTube"
  const hinglishOpen = text.match(
    /^(?:mujhe\s+|please\s+|zara\s+)?(.+?)\s+(?:kholo|kholiye|khol\s+do|chalu\s+karo|chalao|open\s+karo|open\s+kijiye)[.!?]*$/i
  );
  if (hinglishOpen && hinglishOpen[1].trim().length >= 2) {
    const body = hinglishOpen[1].trim();
    if (/recipe|video|gaana|song|bhajan/i.test(body)) {
      text = `play ${body}`;
    } else {
      text = `open ${body}`;
    }
    matchedCorrections.push('mixed-language-hindi-open');
  }

  // "Mujhe ek pharmacy nearby find karni hai" / "Mere paas pharmacy dhundo"
  const hinglishFind = text.match(
    /^(?:mujhe\s+|hamein\s+)?(?:ek\s+|koi\s+)?(.+?)\s+(?:find\s+karni\s+hai|find\s+karna\s+hai|dhundo|dhundho|khojo|search\s+karo|batao)[.!?]*$/i
  );
  if (hinglishFind && hinglishFind[1].trim().length >= 2) {
    text = `find ${hinglishFind[1].trim()}`;
    matchedCorrections.push('mixed-language-hindi-search');
  }

  // "Chicken curry recipe video dikhao"
  const hinglishShow = text.match(
    /^(?:mujhe\s+)?(.+?)\s+(?:dikhao|dikhaiye|bataiye|sunao)[.!?]*$/i
  );
  if (hinglishShow && hinglishShow[1].trim().length >= 2) {
    text = `show me ${hinglishShow[1].trim()}`;
    matchedCorrections.push('mixed-language-hindi-show');
  }

  return {
    normalizedCommand: text.replace(/\s+/g, ' ').trim(),
    matchedCorrections,
  };
}

/**
 * Deterministic spoken & written language detector across Indian scripts,
 * international scripts, and Romanized mixed-language (Hinglish / Kanglish / Tulu-English).
 * Never invents transcripts or fabricates accent labels.
 */
export function detectSpokenLanguage(
  rawTranscript: string,
  options?: { currentUiLang?: LanguageCode }
): LanguageDetectionResult {
  const text = rawTranscript.trim();
  const fallbackUiLang: LanguageCode = options?.currentUiLang || 'en';

  if (!text) {
    return {
      detectedLanguageId: fallbackUiLang === 'hi' ? 'hi-IN' : fallbackUiLang === 'kn' ? 'kn-IN' : 'en-IN',
      detectedName: 'Unknown (empty)',
      uiResponseLang: fallbackUiLang,
      isMixedLanguage: false,
      confidence: 'low',
      shouldClarify: true,
      reason: 'Empty transcript',
    };
  }

  const hasLatin = /[a-zA-Z]/.test(text);

  // 1. Native Script Detection (high confidence)
  if (/[\u0C80-\u0CFF]/.test(text)) {
    return {
      detectedLanguageId: 'kn-IN',
      detectedName: 'Kannada',
      uiResponseLang: 'kn',
      isMixedLanguage: hasLatin,
      secondaryLanguageId: hasLatin ? 'en-IN' : undefined,
      confidence: 'high',
      shouldClarify: false,
      reason: 'Kannada script detected',
    };
  }

  if (/[\u0900-\u097F]/.test(text)) {
    const isMarathi = /(?:आहे|तुम्ही|माझं|माझे|कुठे|करा|सांगा|मदत करा)/.test(text);
    return {
      detectedLanguageId: isMarathi ? 'mr-IN' : 'hi-IN',
      detectedName: isMarathi ? 'Marathi' : 'Hindi',
      uiResponseLang: 'hi',
      isMixedLanguage: hasLatin,
      secondaryLanguageId: hasLatin ? 'en-IN' : undefined,
      confidence: 'high',
      shouldClarify: false,
      reason: isMarathi ? 'Marathi Devanagari cues detected' : 'Devanagari script detected',
    };
  }

  if (/[\u0D00-\u0D7F]/.test(text)) {
    return {
      detectedLanguageId: 'ml-IN',
      detectedName: 'Malayalam',
      uiResponseLang: 'en',
      isMixedLanguage: hasLatin,
      secondaryLanguageId: hasLatin ? 'en-IN' : undefined,
      confidence: 'high',
      shouldClarify: false,
      reason: 'Malayalam script detected',
    };
  }

  if (/[\u0B80-\u0BFF]/.test(text)) {
    return {
      detectedLanguageId: 'ta-IN',
      detectedName: 'Tamil',
      uiResponseLang: 'en',
      isMixedLanguage: hasLatin,
      secondaryLanguageId: hasLatin ? 'en-IN' : undefined,
      confidence: 'high',
      shouldClarify: false,
      reason: 'Tamil script detected',
    };
  }

  if (/[\u0C00-\u0C7F]/.test(text)) {
    return {
      detectedLanguageId: 'te-IN',
      detectedName: 'Telugu',
      uiResponseLang: 'en',
      isMixedLanguage: hasLatin,
      secondaryLanguageId: hasLatin ? 'en-IN' : undefined,
      confidence: 'high',
      shouldClarify: false,
      reason: 'Telugu script detected',
    };
  }

  if (/[\u0980-\u09FF]/.test(text)) {
    return {
      detectedLanguageId: 'bn-IN',
      detectedName: 'Bengali',
      uiResponseLang: 'en',
      isMixedLanguage: hasLatin,
      secondaryLanguageId: hasLatin ? 'en-IN' : undefined,
      confidence: 'high',
      shouldClarify: false,
      reason: 'Bengali script detected',
    };
  }

  if (/[\u0A80-\u0AFF]/.test(text)) {
    return {
      detectedLanguageId: 'gu-IN',
      detectedName: 'Gujarati',
      uiResponseLang: 'en',
      isMixedLanguage: hasLatin,
      secondaryLanguageId: hasLatin ? 'en-IN' : undefined,
      confidence: 'high',
      shouldClarify: false,
      reason: 'Gujarati script detected',
    };
  }

  if (/[\u0A00-\u0A7F]/.test(text)) {
    return {
      detectedLanguageId: 'pa-IN',
      detectedName: 'Punjabi',
      uiResponseLang: 'hi',
      isMixedLanguage: hasLatin,
      secondaryLanguageId: hasLatin ? 'en-IN' : undefined,
      confidence: 'high',
      shouldClarify: false,
      reason: 'Gurmukhi script detected',
    };
  }

  if (/[\u0B00-\u0B7F]/.test(text)) {
    return {
      detectedLanguageId: 'or-IN',
      detectedName: 'Odia',
      uiResponseLang: 'en',
      isMixedLanguage: hasLatin,
      confidence: 'high',
      shouldClarify: false,
      reason: 'Odia script detected',
    };
  }

  if (/[\u0600-\u06FF]/.test(text)) {
    const hasUrduChars = /[پچژگٹڈڑںےھ]/.test(text);
    return {
      detectedLanguageId: hasUrduChars ? 'ur-IN' : 'ar-SA',
      detectedName: hasUrduChars ? 'Urdu' : 'Arabic',
      uiResponseLang: hasUrduChars ? 'hi' : 'en',
      isMixedLanguage: hasLatin,
      confidence: 'high',
      shouldClarify: false,
      reason: hasUrduChars ? 'Urdu script characters detected' : 'Arabic script detected',
    };
  }

  if (/[\u4E00-\u9FFF]/.test(text)) {
    return {
      detectedLanguageId: 'zh-CN',
      detectedName: 'Chinese',
      uiResponseLang: 'en',
      isMixedLanguage: hasLatin,
      confidence: 'high',
      shouldClarify: false,
      reason: 'Chinese characters detected',
    };
  }

  if (/[\u3040-\u30FF]/.test(text)) {
    return {
      detectedLanguageId: 'ja-JP',
      detectedName: 'Japanese',
      uiResponseLang: 'en',
      isMixedLanguage: hasLatin,
      confidence: 'high',
      shouldClarify: false,
      reason: 'Japanese script detected',
    };
  }

  if (/[\uAC00-\uD7AF]/.test(text)) {
    return {
      detectedLanguageId: 'ko-KR',
      detectedName: 'Korean',
      uiResponseLang: 'en',
      isMixedLanguage: hasLatin,
      confidence: 'high',
      shouldClarify: false,
      reason: 'Korean Hangul detected',
    };
  }

  // 2. Romanized mixed-language detection (Kannada-English, Tulu-English, Hindi-English)
  const lower = text.toLowerCase();
  const hasEnglishWords =
    /\b(?:open|play|search|find|youtube|whatsapp|google|maps|chrome|calculator|calendar|spotify|pharmacy|hospital|nearby|video|recipe|message|please|can|you|help|me|for|the|is|this|link)\b/i.test(
      lower
    );

  if (
    /\b(?:malpule|malpu|paater|pater|yereg|aanda|kudla|tulu)\b/i.test(lower)
  ) {
    return {
      detectedLanguageId: 'tcy-IN',
      detectedName: hasEnglishWords ? 'Tulu + English' : 'Tulu',
      uiResponseLang: 'kn',
      isMixedLanguage: hasEnglishWords,
      secondaryLanguageId: hasEnglishWords ? 'en-IN' : undefined,
      confidence: 'medium',
      shouldClarify: false,
      reason: 'Romanized Tulu lexical cues detected',
    };
  }

  if (
    /\b(?:maadi|madi|madri|madu|maadu|maadiri|huduki|huduku|kodi|helu|heli|nodona|nanna|nanage|hattira|banni|olli|kannada)\b/i.test(
      lower
    )
  ) {
    return {
      detectedLanguageId: 'kn-IN',
      detectedName: hasEnglishWords ? 'Kannada + English' : 'Kannada',
      uiResponseLang: 'kn',
      isMixedLanguage: hasEnglishWords,
      secondaryLanguageId: hasEnglishWords ? 'en-IN' : undefined,
      confidence: 'high',
      shouldClarify: false,
      reason: 'Romanized Kannada lexical cues detected',
    };
  }

  if (
    /\b(?:mujhe|hamein|kholo|kholiye|karo|karni|karna|chahiye|dhundo|dhundho|khojo|bhejo|batao|dikhao|mera|mere|meri|paas|dawai|namaste|dhanyavad|kya|kaise|ek|hai|hain|ko|se|mein)\b/i.test(
      lower
    )
  ) {
    return {
      detectedLanguageId: 'hi-IN',
      detectedName: hasEnglishWords ? 'Hindi + English' : 'Hindi',
      uiResponseLang: 'hi',
      isMixedLanguage: hasEnglishWords,
      secondaryLanguageId: hasEnglishWords ? 'en-IN' : undefined,
      confidence: 'high',
      shouldClarify: false,
      reason: 'Romanized Hindi lexical cues detected',
    };
  }

  // 3. Low-confidence / incoherent / punctuation-only check
  const alphaTokens = text.replace(/[^\p{L}\p{N}\s]/gu, '').trim().split(/\s+/).filter(Boolean);
  const onlyFillers =
    alphaTokens.length > 0 &&
    alphaTokens.every((tok) => /^(?:uh+|um+|erm+|ah+|hmm+|err+|h+m+)$/i.test(tok));
  const hasRealWord =
    hasEnglishWords ||
    /\b(?:yes|no|ok|okay|sure|cancel|stop|hello|hi|hey|good|thanks|thank|back|home|form|review|repeat|spell|edit|ramesh|lakshmi|sita|meena|rahul|son|daughter)\b/i.test(
      lower
    ) ||
    /^\d+$/.test(alphaTokens.join('')) ||
    (alphaTokens.length >= 2 && alphaTokens.every((tok) => /[aeiouy]/i.test(tok) || /\d/.test(tok))) ||
    (alphaTokens.length === 1 && alphaTokens[0].length >= 2 && /[aeiouy]/i.test(alphaTokens[0]));

  if (alphaTokens.length === 0 || onlyFillers || !hasRealWord) {
    return {
      detectedLanguageId: fallbackUiLang === 'hi' ? 'hi-IN' : fallbackUiLang === 'kn' ? 'kn-IN' : 'en-IN',
      detectedName: 'Unclear / Low Confidence',
      uiResponseLang: fallbackUiLang,
      isMixedLanguage: false,
      confidence: 'low',
      shouldClarify: true,
      reason: 'Transcript is too short or unclear to determine language reliably',
    };
  }

  // 4. Standard English / International Latin script
  if (
    /\b(?:bonjour|merci|ouvrir|chercher|salut)\b/i.test(lower)
  ) {
    return {
      detectedLanguageId: 'fr-FR',
      detectedName: 'French',
      uiResponseLang: 'en',
      isMixedLanguage: hasEnglishWords,
      confidence: 'medium',
      shouldClarify: false,
      reason: 'French lexical cues detected',
    };
  }

  if (/\b(?:hola|gracias|abrir|buscar)\b/i.test(lower)) {
    return {
      detectedLanguageId: 'es-ES',
      detectedName: 'Spanish',
      uiResponseLang: 'en',
      isMixedLanguage: hasEnglishWords,
      confidence: 'medium',
      shouldClarify: false,
      reason: 'Spanish lexical cues detected',
    };
  }

  return {
    detectedLanguageId: 'en-IN',
    detectedName: 'English (India)',
    uiResponseLang: 'en',
    isMixedLanguage: false,
    confidence: 'high',
    shouldClarify: false,
    reason: 'English / Latin command text detected',
  };
}

export function buildLowConfidenceClarificationReply(
  uiLang: LanguageCode = 'en'
): string {
  if (uiLang === 'hi') {
    return 'मुझे आपकी बात स्पष्ट रूप से समझ नहीं आई। कृपया धीरे से फिर दोहराएँ, या ऊपर से अपनी पसंदीदा भाषा चुनें।';
  }
  if (uiLang === 'kn') {
    return 'ನನಗೆ ನಿಮ್ಮ ಮಾತು ಸ್ಪಷ್ಟವಾಗಿ ಅರ್ಥವಾಗಲಿಲ್ಲ. ದಯವಿಟ್ಟು ನಿಧಾನವಾಗಿ ಮತ್ತೆ ಹೇಳಿ, ಅಥವಾ ಮೇಲಿನಿಂದ ನಿಮ್ಮ ಭಾಷೆಯನ್ನು ಆಯ್ಕೆಮಾಡಿ.';
  }
  return "I didn't catch that clearly. Could you please repeat it slowly, or choose your preferred language from the language selector?";
}
