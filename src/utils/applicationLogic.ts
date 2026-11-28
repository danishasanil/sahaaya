import { APPLICATION_FIELD_ORDER, INDIAN_STATES, TRANSLATIONS } from '../i18n/translations';
import { ApplicationData, ApplicationFieldKey, LanguageCode } from '../types/sahaaya';

export const EMPTY_APPLICATION_DATA: ApplicationData = {
  fullName: '',
  age: '',
  dateOfBirth: '',
  gender: '',
  state: '',
  district: '',
  address: '',
  mobileNumber: '',
  annualIncome: '',
};

const STATE_ALIASES: Record<string, string> = {
  // Hindi aliases
  'कर्नाटक': 'Karnataka',
  'महाराष्ट्र': 'Maharashtra',
  'दिल्ली': 'Delhi',
  'तमिलनाडु': 'Tamil Nadu',
  'उत्तर प्रदेश': 'Uttar Pradesh',
  'केरल': 'Kerala',
  'गुजरात': 'Gujarat',
  'राजस्थान': 'Rajasthan',
  'बिहार': 'Bihar',
  'पश्चिम बंगाल': 'West Bengal',
  'तेलंगाना': 'Telangana',
  'आंध्र प्रदेश': 'Andhra Pradesh',
  'मध्य प्रदेश': 'Madhya Pradesh',
  'पंजाब': 'Punjab',
  'हरियाणा': 'Haryana',
  'ओडिशा': 'Odisha',
  'गोवा': 'Goa',
  'असम': 'Assam',
  // Kannada aliases
  'ಕರ್ನಾಟಕ': 'Karnataka',
  'ಮಹಾರಾಷ್ಟ್ರ': 'Maharashtra',
  'ದೆಹಲಿ': 'Delhi',
  'ತಮಿಳುನಾಡು': 'Tamil Nadu',
  'ಉತ್ತರ ಪ್ರದೇಶ': 'Uttar Pradesh',
  'ಕೇರಳ': 'Kerala',
  'ಗುಜರಾತ್': 'Gujarat',
  'ರಾಜಸ್ಥಾನ': 'Rajasthan',
  'ಬಿಹಾರ': 'Bihar',
  'ಪಶ್ಚಿಮ ಬಂಗಾಳ': 'West Bengal',
  'ತೆಲಂಗಾಣ': 'Telangana',
  'ಆಂಧ್ರ ಪ್ರದೇಶ': 'Andhra Pradesh',
  'ಮಧ್ಯ ಪ್ರದೇಶ': 'Madhya Pradesh',
  'ಪಂಜಾಬ್': 'Punjab',
  'ಹರಿಯಾಣ': 'Haryana',
  'ಒಡಿಶಾ': 'Odisha',
  'ಗೋವಾ': 'Goa',
  'ಅಸ್ಸಾಂ': 'Assam',
  'bangalore': 'Karnataka',
  'bengaluru': 'Karnataka',
  'mysore': 'Karnataka',
  'mysuru': 'Karnataka',
  'mumbai': 'Maharashtra',
  'pune': 'Maharashtra',
  'chennai': 'Tamil Nadu',
  'hyderabad': 'Telangana',
  'new delhi': 'Delhi',
};

const MONTH_MAP: Record<string, number> = {
  jan: 1, january: 1, 'जनवरी': 1, 'ಜನವರಿ': 1,
  feb: 2, february: 2, 'फ़रवरी': 2, 'फरवरी': 2, 'ಫೆಬ್ರವರಿ': 2,
  mar: 3, march: 3, 'मार्च': 3, 'ಮಾರ್ಚ್': 3,
  apr: 4, april: 4, 'अप्रैल': 4, 'ಏಪ್ರಿಲ್': 4,
  may: 5, 'मई': 5, 'ಮೇ': 5,
  jun: 6, june: 6, 'जून': 6, 'ಜೂನ್': 6,
  jul: 7, july: 7, 'जुलाई': 7, 'ಜುಲೈ': 7,
  aug: 8, august: 8, 'अगस्त': 8, 'ಆಗಸ್ಟ್': 8,
  sep: 9, sept: 9, september: 9, 'सितंबर': 9, 'ಸೆಪ್ಟೆಂಬರ್': 9,
  oct: 10, october: 10, 'अक्टूबर': 10, 'ಅಕ್ಟೋಬರ್': 10,
  nov: 11, november: 11, 'नवंबर': 11, 'ನವೆಂಬರ್': 11,
  dec: 12, december: 12, 'दिसंबर': 12, 'ಡಿಸೆಂಬರ್': 12,
};

const DIGIT_WORDS: Record<string, string> = {
  zero: '0', oh: '0',
  one: '1', two: '2', three: '3', four: '4', five: '5',
  six: '6', seven: '7', eight: '8', nine: '9',
  'शून्य': '0', 'एक': '1', 'दो': '2', 'तीन': '3', 'चार': '4',
  'पांच': '5', 'पाँच': '5', 'छह': '6', 'सात': '7', 'आठ': '8', 'नौ': '9',
  'ಸೊನ್ನೆ': '0', 'ಒಂದು': '1', 'ಎರಡು': '2', 'ಮೂರು': '3', 'ನಾಲ್ಕು': '4',
  'ಐದು': '5', 'ಆರು': '6', 'ಏಳು': '7', 'ಎಂಟು': '8', 'ಒಂಬತ್ತು': '9',
};

function normalizeIndicNumerals(input: string): string {
  // Convert Devanagari (०-९) and Kannada (೦-೯) digits to ASCII 0-9
  return input
    .replace(/[\u0966-\u096F]/g, (c) => String(c.charCodeAt(0) - 0x0966))
    .replace(/[\u0CE6-\u0CEF]/g, (c) => String(c.charCodeAt(0) - 0x0CE6));
}

export function validateField(
  field: ApplicationFieldKey,
  value: string,
  lang: LanguageCode
): string | null {
  const t = TRANSLATIONS[lang].fields[field];
  const trimmed = value.trim();

  if (!trimmed) {
    return t.errorRequired;
  }

  switch (field) {
    case 'fullName': {
      return trimmed.length >= 2 ? null : t.errorInvalid;
    }
    case 'age': {
      const num = Number(trimmed);
      if (!Number.isFinite(num) || !Number.isInteger(num) || num < 50 || num > 120) {
        return t.errorInvalid;
      }
      return null;
    }
    case 'dateOfBirth': {
      const parsed = new Date(trimmed);
      if (Number.isNaN(parsed.getTime())) {
        return t.errorInvalid;
      }
      const now = new Date();
      if (parsed >= now || parsed.getFullYear() < 1900) {
        return t.errorInvalid;
      }
      return null;
    }
    case 'gender': {
      return trimmed === 'Male' || trimmed === 'Female' || trimmed === 'Other'
        ? null
        : t.errorInvalid;
    }
    case 'state': {
      return trimmed.length >= 2 ? null : t.errorInvalid;
    }
    case 'district': {
      return trimmed.length >= 2 ? null : t.errorInvalid;
    }
    case 'address': {
      return trimmed.length >= 6 ? null : t.errorInvalid;
    }
    case 'mobileNumber': {
      const digits = trimmed.replace(/\D/g, '');
      return /^[6-9]\d{9}$/.test(digits) ? null : t.errorInvalid;
    }
    case 'annualIncome': {
      const num = Number(trimmed.replace(/[,₹\s]/g, ''));
      return Number.isFinite(num) && num >= 0 ? null : t.errorInvalid;
    }
    default:
      return null;
  }
}

export function validateAllFields(
  data: ApplicationData,
  lang: LanguageCode
): Partial<Record<ApplicationFieldKey, string>> {
  const errors: Partial<Record<ApplicationFieldKey, string>> = {};
  for (const field of APPLICATION_FIELD_ORDER) {
    const err = validateField(field, data[field], lang);
    if (err) {
      errors[field] = err;
    }
  }
  return errors;
}

export function getCompletionStats(data: ApplicationData): {
  filledCount: number;
  totalCount: number;
  percentage: number;
} {
  const totalCount = APPLICATION_FIELD_ORDER.length;
  const filledCount = APPLICATION_FIELD_ORDER.filter((key) => data[key].trim().length > 0).length;
  return {
    filledCount,
    totalCount,
    percentage: Math.round((filledCount / totalCount) * 100),
  };
}

export function getNextMissingField(data: ApplicationData): ApplicationFieldKey | null {
  for (const field of APPLICATION_FIELD_ORDER) {
    if (!data[field].trim()) {
      return field;
    }
  }
  return null;
}

function toTitleCase(text: string): string {
  return text
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function parseFieldValue(
  field: ApplicationFieldKey,
  rawText: string,
  currentData?: ApplicationData
): string | null {
  const normalized = normalizeIndicNumerals(rawText).trim();
  if (!normalized) return null;

  switch (field) {
    case 'fullName': {
      // 1. Handle combined "The first name is X and the second/last name is Y"
      const firstAndLastMatch = normalized.match(
        /(?:the\s+|my\s+)?first\s+name\s+(?:is\s+)?([a-zA-Z\u0900-\u097F\u0C80-\u0CFF'-]+(?:\.[a-zA-Z])?)\s*(?:,?\s*(?:and\s+)?)(?:the\s+|my\s+)?(?:second|last|sur)\s*name\s+(?:is\s+)?([a-zA-Z\u0900-\u097F\u0C80-\u0CFF'-]+(?:\.[a-zA-Z])?)[.।!?]*$/i
      );
      if (firstAndLastMatch) {
        const firstPart = firstAndLastMatch[1].replace(/[.।!?]+$/, '').trim();
        const lastPart = firstAndLastMatch[2].replace(/[.।!?]+$/, '').trim();
        const combined = `${firstPart} ${lastPart}`.trim();
        return /^[a-zA-Z\s.'-]+$/.test(combined) ? toTitleCase(combined) : combined;
      }

      // 2. Handle partial "Change my first name to X" / "My first name is X"
      const firstNameOnlyMatch = normalized.match(
        /^(?:(?:no|nope|sorry|actually|wait)[,.\s]+)*(?:(?:change|update|edit|fix|correct|set)\s+)?(?:the\s+|my\s+)?first\s+name\s+(?:to|is|as)\s+([a-zA-Z\u0900-\u097F\u0C80-\u0CFF.'-]+?)[.।!?]*$/i
      );
      if (firstNameOnlyMatch) {
        const newFirstRaw = firstNameOnlyMatch[1].replace(/[.।!?]+$/, '').trim();
        const newFirst = /^[a-zA-Z.'-]+$/.test(newFirstRaw) ? toTitleCase(newFirstRaw) : newFirstRaw;
        const existingParts = (currentData?.fullName || '').trim().split(/\s+/).filter(Boolean);
        if (existingParts.length >= 2) {
          return [newFirst, ...existingParts.slice(1)].join(' ');
        }
        return newFirst;
      }

      // 3. Handle partial "Change my second/last/surname to Y"
      const lastNameOnlyMatch = normalized.match(
        /^(?:(?:no|nope|sorry|actually|wait)[,.\s]+)*(?:(?:change|update|edit|fix|correct|set)\s+)?(?:the\s+|my\s+)?(?:(?:second|last)\s+name|surname)\s+(?:to|is|as)\s+([a-zA-Z\u0900-\u097F\u0C80-\u0CFF.'-]+?)[.।!?]*$/i
      );
      if (lastNameOnlyMatch) {
        const newLastRaw = lastNameOnlyMatch[1].replace(/[.।!?]+$/, '').trim();
        const newLast = /^[a-zA-Z.'-]+$/.test(newLastRaw) ? toTitleCase(newLastRaw) : newLastRaw;
        const existingParts = (currentData?.fullName || '').trim().split(/\s+/).filter(Boolean);
        if (existingParts.length >= 2) {
          return [...existingParts.slice(0, -1), newLast].join(' ');
        }
        if (existingParts.length === 1) {
          return `${existingParts[0]} ${newLast}`;
        }
        return newLast;
      }

      let stripped = normalized
        .replace(
          /^(?:(?:no|nope|sorry|actually|wait)[,.\s]+)+/i,
          ''
        )
        .replace(
          /^(?:(?:that(?:'s| is)|it(?:'s| is)|this is)\s+)?(?:not\s+correct|not\s+right|incorrect|wrong)[,.\s]*/i,
          ''
        )
        .replace(
          /^(?:let\s+me\s+correct\s+(?:that|it|my\s+name)|please\s+correct\s+(?:that|it|my\s+name)|(?:please\s+)?change\s+(?:my\s+|the\s+)?(?:full\s+)?name\s+(?:to|is|as))[,.\s]*/i,
          ''
        )
        .replace(
          /^(?:my\s+full\s+name\s+is|my\s+name\s+is|i\s+am|this\s+is|it(?:'s|\s+is)|call\s+me|name\s+is|name)\s+/i,
          ''
        )
        .replace(/^(मेरा नाम|मेरा पूरा नाम|मैं)\s+/i, '')
        .replace(/\s+(है|हूँ)$/i, '')
        .replace(/^(ನನ್ನ ಪೂರ್ಣ ಹೆಸರು|ನನ್ನ ಹೆಸರು|ನಾನು)\s+/i, '')
        .replace(/[.।!?]+$/, '')
        .trim();
      if (
        !stripped ||
        /^(?:not\s+correct|not\s+right|incorrect|wrong|correct|right|that|that is|it is|thanks|thank you|cancel|stop|never mind|leave it|spell|spell my name)$/i.test(
          stripped
        )
      ) {
        return null;
      }
      if (stripped.length < 2) return null;
      return /^[a-zA-Z\s.'-]+$/.test(stripped) ? toTitleCase(stripped) : stripped;
    }

    case 'age': {
      const match = normalized.match(/\b(\d{2,3})\b/);
      if (match) {
        return match[1];
      }
      return null;
    }

    case 'dateOfBirth': {
      // ISO format YYYY-MM-DD
      const isoMatch = normalized.match(/\b(\d{4})[-/](\d{1,2})[-/](\d{1,2})\b/);
      if (isoMatch) {
        const [, y, m, d] = isoMatch;
        return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
      }
      // DD-MM-YYYY or DD/MM/YYYY
      const dmyMatch = normalized.match(/\b(\d{1,2})[-/.\s](\d{1,2})[-/.\s](\d{4})\b/);
      if (dmyMatch) {
        const [, d, m, y] = dmyMatch;
        return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
      }
      // Spoken month name e.g., "15 August 1958" or "August 15, 1958"
      const tokens = normalized.toLowerCase().replace(/[,]/g, ' ').split(/\s+/);
      let day: number | null = null;
      let month: number | null = null;
      let year: number | null = null;
      for (const token of tokens) {
        if (MONTH_MAP[token]) {
          month = MONTH_MAP[token];
        } else {
          const cleanTok = token.replace(/^(\d{1,2})(st|nd|rd|th)$/, '$1');
          if (/^\d{4}$/.test(cleanTok)) {
            year = Number(cleanTok);
          } else if (/^\d{1,2}$/.test(cleanTok)) {
            const val = Number(cleanTok);
            if (val >= 1 && val <= 31 && day === null) {
              day = val;
            }
          }
        }
      }
      if (day && month && year) {
        return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      }
      return null;
    }

    case 'gender': {
      const lower = normalized.toLowerCase();
      if (
        /\b(female|woman|lady|girl|f)\b/.test(lower) ||
        normalized.includes('महिला') ||
        normalized.includes('स्त्री') ||
        normalized.includes('औरत') ||
        normalized.includes('ಮಹಿಳೆ') ||
        normalized.includes('ಹೆಣ್ಣು')
      ) {
        return 'Female';
      }
      if (
        /\b(male|man|gentleman|m)\b/.test(lower) ||
        normalized.includes('पुरुष') ||
        normalized.includes('आदमी') ||
        normalized.includes('ಪುರುಷ') ||
        normalized.includes('ಗಂಡು')
      ) {
        return 'Male';
      }
      if (
        /\b(other|non-binary|transgender)\b/.test(lower) ||
        normalized.includes('अन्य') ||
        normalized.includes('ಇತರೆ')
      ) {
        return 'Other';
      }
      return null;
    }

    case 'state': {
      const lower = normalized
        .toLowerCase()
        .replace(/^(i live in|my state is|state is|from|in)\s+/i, '')
        .trim();
      for (const [alias, canonical] of Object.entries(STATE_ALIASES)) {
        if (lower.includes(alias.toLowerCase()) || normalized.includes(alias)) {
          return canonical;
        }
      }
      const matched = INDIAN_STATES.find(
        (s) => lower.includes(s.toLowerCase()) || s.toLowerCase() === lower
      );
      return matched || (normalized.length >= 3 ? toTitleCase(lower) : null);
    }

    case 'district': {
      const cleaned = normalized
        .replace(/^(my district is|district is|district|from|in)\s+/i, '')
        .replace(/^(मेरा ज़िला|मेरा जिला|ज़िला|जिला)\s+/i, '')
        .replace(/\s+(है|ज़िले में|जिले में)$/i, '')
        .replace(/^(ನನ್ನ ಜಿಲ್ಲೆ|ಜಿಲ್ಲೆ)\s+/i, '')
        .replace(/[.।]+$/, '')
        .trim();
      if (cleaned.length < 2) return null;
      return /^[a-zA-Z\s.'-]+$/.test(cleaned) ? toTitleCase(cleaned) : cleaned;
    }

    case 'address': {
      const cleaned = normalized
        .replace(/^(my address is|my home address is|address is|i live at)\s+/i, '')
        .replace(/^(मेरा पता|मेरा घर का पता)\s+/i, '')
        .replace(/\s+(है)$/i, '')
        .replace(/^(ನನ್ನ ವಿಳಾಸ|ವಿಳಾಸ)\s+/i, '')
        .replace(/[.।]+$/, '')
        .trim();
      return cleaned.length >= 5 ? cleaned : null;
    }

    case 'mobileNumber': {
      // Replace spoken digit words with digits first
      const withDigits = normalized
        .toLowerCase()
        .split(/\s+/)
        .map((w) => DIGIT_WORDS[w] ?? w)
        .join('');
      const digits = withDigits.replace(/\D/g, '');
      // Handle +91 or leading 0
      const trimmed10 = digits.length > 10 ? digits.slice(-10) : digits;
      return /^[6-9]\d{9}$/.test(trimmed10) ? trimmed10 : null;
    }

    case 'annualIncome': {
      const lower = normalized.toLowerCase().replace(/,/g, '');
      // Match patterns like "1 lakh 20 thousand", "1.5 lakh", "200000"
      const lakhMatch = lower.match(/(\d+(?:\.\d+)?)\s*(lakh|lakhs|lac|lacs|लाख|ಲಕ್ಷ)/);
      const thousandMatch = lower.match(/(\d+(?:\.\d+)?)\s*(thousand|k|हजार|हज़ार|ಸಾವಿರ)/);
      let total = 0;
      if (lakhMatch) {
        total += Math.round( parseFloat(lakhMatch[1]) * 100000 );
      }
      if (thousandMatch) {
        total += Math.round( parseFloat(thousandMatch[1]) * 1000 );
      }
      if (total > 0) {
        return String(total);
      }
      const numMatch = lower.match(/(\d+)/);
      if (numMatch) {
        return numMatch[1];
      }
      return null;
    }

    default:
      return null;
  }
}

function detectExplicitFieldCorrection(text: string): ApplicationFieldKey | null {
  const lower = text.toLowerCase();
  if (
    /\b(change|update|edit|fix)\b.*?\b(?:(?:my|the)\s+)?(?:(?:full|first|second|middle|last|sur)\s+)?name\b|\b(?:change|update|edit|fix)\b.*?\bsurname\b|\bcorrect\s+(?:my\s+|the\s+)?(?:(?:full|first|second|last)\s+)?name\b|नाम.*बदल|ಹೆಸರು.*ಬದಲ/.test(
      lower
    )
  ) {
    return 'fullName';
  }
  if (
    /\b(change|update|edit|fix)\b.*?\b(?:my\s+|the\s+)?age\b|\bcorrect\s+(?:my\s+|the\s+)?age\b|उम्र.*बदल|ವಯಸ್ಸು.*ಬದಲ/.test(
      lower
    )
  ) {
    return 'age';
  }
  if (
    /\b(change|update|edit|fix)\b.*?\b(?:my\s+|the\s+)?(birth|dob)\b|\bcorrect\s+(?:my\s+|the\s+)?(birth|dob)\b|जन्म.*बदल|ಜನ್ಮ.*ಬದಲ/.test(
      lower
    )
  ) {
    return 'dateOfBirth';
  }
  if (
    /\b(change|update|edit|fix)\b.*?\b(?:my\s+|the\s+)?gender\b|\bcorrect\s+(?:my\s+|the\s+)?gender\b|लिंग.*बदल|ಲಿಂಗ.*ಬದಲ/.test(
      lower
    )
  ) {
    return 'gender';
  }
  if (
    /\b(change|update|edit|fix)\b.*?\b(?:my\s+|the\s+)?state\b|\bcorrect\s+(?:my\s+|the\s+)?state\b|राज्य.*बदल|ರಾಜ್ಯ.*ಬದಲ/.test(
      lower
    )
  ) {
    return 'state';
  }
  if (
    /\b(change|update|edit|fix)\b.*?\b(?:my\s+|the\s+)?district\b|\bcorrect\s+(?:my\s+|the\s+)?district\b|ज़िला.*बदल|जिला.*बदल|ಜಿಲ್ಲೆ.*ಬದಲ/.test(
      lower
    )
  ) {
    return 'district';
  }
  if (
    /\b(change|update|edit|fix)\b.*?\b(?:my\s+|the\s+)?address\b|\bcorrect\s+(?:my\s+|the\s+)?address\b|पता.*बदल|ವಿಳಾಸ.*ಬದಲ/.test(
      lower
    )
  ) {
    return 'address';
  }
  if (
    /\b(change|update|edit|fix)\b.*?\b(?:my\s+|the\s+)?(mobile|phone|number)\b|\bcorrect\s+(?:my\s+|the\s+)?(mobile|phone|number)\b|मोबाइल.*बदल|ಮೊಬೈಲ್.*ಬದಲ/.test(
      lower
    )
  ) {
    return 'mobileNumber';
  }
  if (
    /\b(change|update|edit|fix)\b.*?\b(?:my\s+|the\s+)?(income|salary)\b|\bcorrect\s+(?:my\s+|the\s+)?(income|salary)\b|आय.*बदल|ಆದಾಯ.*ಬದಲ/.test(
      lower
    )
  ) {
    return 'annualIncome';
  }
  return null;
}

export type VoiceParseOutcome =
  | { type: 'intent'; intent: 'repeat' | 'stop' | 'help' | 'review' | 'form' | 'next' }
  | { type: 'field_updated'; field: ApplicationFieldKey; value: string; isCorrection: boolean }
  | { type: 'unrecognized'; targetField: ApplicationFieldKey };

export function parseVoiceInput(
  rawTranscript: string,
  activeField: ApplicationFieldKey,
  currentData: ApplicationData
): VoiceParseOutcome {
  const text = rawTranscript.trim();
  const lower = text.toLowerCase();

  // 1. Check simple navigation / conversational commands
  if (/^(repeat|say again|pardon|दोहराओ|फिर से बोलो|ಮತ್ತೆ ಹೇಳಿ)$/i.test(lower)) {
    return { type: 'intent', intent: 'repeat' };
  }
  if (/^(stop|pause|quiet|रुको|रुकें|निल्लि|ನಿಲ್ಲಿಸಿ|ನಿಲ್ಲು)$/i.test(lower)) {
    return { type: 'intent', intent: 'stop' };
  }
  if (/^(help|assist|how to|मदद|सहायता|ಸಹಾಯ)$/i.test(lower)) {
    return { type: 'intent', intent: 'help' };
  }
  if (/^(review|check application|समीक्षा|ಪರಿಶೀಲನೆ|ಪರಿಶೀಲಿಸಿ)$/i.test(lower)) {
    return { type: 'intent', intent: 'review' };
  }
  if (/^(open form|show form|view form|फ़ॉर्म|ಅರ್ಜಿ)$/i.test(lower)) {
    return { type: 'intent', intent: 'form' };
  }
  if (/^(skip|next|अगला|ಮುಂದಿನದು)$/i.test(lower)) {
    return { type: 'intent', intent: 'next' };
  }

  // 2. Check if user explicitly wants to correct another field
  const correctionField = detectExplicitFieldCorrection(text);
  const targetField = correctionField || activeField;
  const parsedValue = parseFieldValue(targetField, text, currentData);

  if (parsedValue !== null) {
    return {
      type: 'field_updated',
      field: targetField,
      value: parsedValue,
      isCorrection: Boolean(correctionField),
    };
  }

  return { type: 'unrecognized', targetField: activeField };
}

export function formatDisplayValue(
  field: ApplicationFieldKey,
  value: string,
  lang: LanguageCode
): string {
  if (!value.trim()) return TRANSLATIONS[lang].review.notProvided;
  if (field === 'gender' && (value === 'Male' || value === 'Female' || value === 'Other')) {
    return TRANSLATIONS[lang].genderOptions[value];
  }
  if (field === 'annualIncome') {
    const num = Number(value.replace(/[,₹\s]/g, ''));
    if (Number.isFinite(num)) {
      return `₹ ${num.toLocaleString('en-IN')}`;
    }
  }
  if (field === 'mobileNumber') {
    const d = value.replace(/\D/g, '');
    if (d.length === 10) {
      return `${d.slice(0, 5)} ${d.slice(5)}`;
    }
  }
  return value;
}

export function generateConfirmationNumber(): string {
  const year = new Date().getFullYear();
  const randomCode = Math.floor(100000 + Math.random() * 900000);
  return `SAH-${year}-${randomCode}`;
}

export function buildReceiptText(
  data: ApplicationData,
  confirmationNumber: string,
  submittedAt: string,
  lang: LanguageCode
): string {
  const t = TRANSLATIONS[lang];
  const lines = [
    '====================================================',
    'SAHAAYA — SIMULATED DEMO APPLICATION RECEIPT',
    'Tagline: Your Voice. Your Phone. Your Freedom.',
    '====================================================',
    '',
    `Confirmation Number : ${confirmationNumber}`,
    `Completed On        : ${submittedAt}`,
    `Application Type    : Senior Citizen Welfare Application (Demo)`,
    '',
    '--- APPLICANT DETAILS ---',
    ...APPLICATION_FIELD_ORDER.map((key) => {
      const label = t.fields[key].label.padEnd(22, ' ');
      const val = formatDisplayValue(key, data[key], lang);
      return `${label}: ${val}`;
    }),
    '',
    '--- IMPORTANT DISCLAIMER ---',
    'This receipt is generated from a simulated demonstration prototype.',
    'It is NOT an official government record and no real application',
    'has been submitted to any government authority.',
    '====================================================',
  ];
  return lines.join('\n');
}

export function requiresExplicitConfirmation(field: ApplicationFieldKey): boolean {
  return (
    field === 'fullName' ||
    field === 'mobileNumber' ||
    field === 'dateOfBirth' ||
    field === 'annualIncome'
  );
}

export type ConfirmationReplyIntent = 'confirm' | 'spell' | 'edit' | 'reject' | null;

export function parseConfirmationReply(rawText: string): ConfirmationReplyIntent {
  const text = rawText.trim();
  const lower = text.toLowerCase();

  if (
    /\b(spell|spelling|letter by letter|letters)\b/.test(lower) ||
    text.includes('वर्तनी') ||
    text.includes('अक्षर') ||
    text.includes('ಅಕ್ಷರ')
  ) {
    return 'spell';
  }

  if (
    /\b(no|nope|wrong|incorrect|not right|not correct)\b/.test(lower) ||
    text.includes('नहीं') ||
    text.includes('गलत') ||
    text.includes('ಇಲ್ಲ') ||
    text.includes('ತಪ್ಪು')
  ) {
    return 'reject';
  }

  if (
    /\b(edit|change|modify|fix|update|re-enter)\b/.test(lower) ||
    text.includes('बदल') ||
    text.includes('सुधार') ||
    text.includes('ತಿದ್ದು') ||
    text.includes('ಬದಲ')
  ) {
    return 'edit';
  }

  if (
    /\b(yes|yeah|yep|confirm|proceed|continue|go ahead|ok|okay|sure|that is right|thats right)\b/.test(lower) ||
    /(?<!not\s)\b(correct|right)\b/.test(lower) ||
    text.includes('हाँ') ||
    text.includes('हां') ||
    text.includes('सही') ||
    text.includes('ಹೌದು') ||
    text.includes('ಸರಿ')
  ) {
    return 'confirm';
  }

  return null;
}

export function formatSpelledName(tokens: string[]): string {
  const joined = tokens.join('').replace(/\s+/g, ' ').trim().toLowerCase();
  if (!joined) return '';
  return toTitleCase(joined);
}

export type SpelledParseResult =
  | { action: 'done' }
  | { action: 'clear'; tokens: string[] }
  | { action: 'update'; tokens: string[]; constructedName: string }
  | { action: 'unrecognized' };

const PHONETIC_HINT_REGEX = /^([a-zA-Z])\s+(?:as\s+in|for|like)\s+[a-zA-Z]+$/i;

export function parseSpelledInput(
  rawText: string,
  existingTokens: string[]
): SpelledParseResult {
  const text = rawText.trim();
  const lower = text.toLowerCase();

  if (
    /^(done|finish|finished|confirm|complete|save|हो गया|पूरा|ಮುಗಿಯಿತು|ಸರಿ)$/i.test(lower)
  ) {
    return { action: 'done' };
  }

  if (/^(clear|reset|start over|साफ़|ತೆರವು)$/i.test(lower)) {
    return { action: 'clear', tokens: [] };
  }

  if (/^(backspace|delete|undo|remove|मिटाएँ|मिटाओ|ಅಳಿಸಿ)$/i.test(lower)) {
    const nextTokens = existingTokens.slice(0, -1);
    return {
      action: 'update',
      tokens: nextTokens,
      constructedName: formatSpelledName(nextTokens),
    };
  }

  // Handle "R as in Rose" or "A for Apple"
  const phoneticMatch = text.match(PHONETIC_HINT_REGEX);
  if (phoneticMatch) {
    const nextTokens = [...existingTokens, phoneticMatch[1].toUpperCase()];
    return {
      action: 'update',
      tokens: nextTokens,
      constructedName: formatSpelledName(nextTokens),
    };
  }

  // Handle space-separated or comma-separated letters e.g. "R A M E S H" or "R A M space R A O"
  const parts = text
    .replace(/[,.-]+/g, ' ')
    .split(/\s+/)
    .filter(Boolean);

  const extracted: string[] = [];
  for (const part of parts) {
    const pLower = part.toLowerCase();
    if (pLower === 'space' || pLower === 'blank') {
      extracted.push(' ');
    } else if (/^[a-zA-Z]$/.test(part)) {
      extracted.push(part.toUpperCase());
    } else if (/^[a-zA-Z]{2,12}$/.test(part) && parts.length === 1) {
      // If browser STT fused spoken letters like "RAM" or user typed letters together
      for (const ch of part.split('')) {
        extracted.push(ch.toUpperCase());
      }
    }
  }

  if (extracted.length === 0) {
    return { action: 'unrecognized' };
  }

  const nextTokens = [...existingTokens, ...extracted];
  return {
    action: 'update',
    tokens: nextTokens,
    constructedName: formatSpelledName(nextTokens),
  };
}

export function formatValueForSpeech(
  field: ApplicationFieldKey,
  value: string,
  lang: LanguageCode
): string {
  if (!value.trim()) return '';

  if (field === 'mobileNumber') {
    const d = value.replace(/\D/g, '');
    if (d.length === 10) {
      return `${d.slice(0, 5).split('').join(' ')}, ${d.slice(5).split('').join(' ')}`;
    }
  }

  if (field === 'dateOfBirth') {
    const parsed = new Date(`${value}T00:00:00`);
    if (!Number.isNaN(parsed.getTime())) {
      const locale = lang === 'hi' ? 'hi-IN' : lang === 'kn' ? 'kn-IN' : 'en-IN';
      return parsed.toLocaleDateString(locale, {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    }
  }

  if (field === 'annualIncome') {
    const num = Number(value.replace(/[,₹\s]/g, ''));
    if (Number.isFinite(num)) {
      if (lang === 'hi') return `${num.toLocaleString('en-IN')} रुपये`;
      if (lang === 'kn') return `${num.toLocaleString('en-IN')} ರೂಪಾಯಿ`;
      return `${num.toLocaleString('en-IN')} rupees`;
    }
  }

  return formatDisplayValue(field, value, lang);
}

