import {
  BrowserEngineAvailability,
  LanguageCategory,
  LanguageCode,
  SpeechEngineSupportInfo,
  SpokenLanguageOption,
  UniversalLanguageMode,
  UniversalLanguagePreferences,
  VoiceCapabilityStatus,
} from '../types/sahaaya';

const UNIVERSAL_LANG_STORAGE_KEY = 'sahaaya_universal_lang_prefs_v1';

export const DEFAULT_UNIVERSAL_LANGUAGE_PREFS: UniversalLanguagePreferences = {
  mode: 'auto',
  selectedLanguageId: 'en-IN',
  customLanguageName: '',
};

export const SPOKEN_LANGUAGE_CATALOG: SpokenLanguageOption[] = [
  // =========================================================
  // INDIAN LANGUAGES (23)
  // =========================================================
  {
    id: 'en-IN',
    name: 'English (India)',
    nativeName: 'English (India)',
    bcp47: 'en-IN',
    category: 'indian',
    uiLang: 'en',
    defaultCapability: 'voice_available',
    aliases: ['english', 'indian english', 'hinglish', 'kanglish', 'en'],
    capabilityNote:
      'Supported by standard Chromium/Safari Web Speech engines with Sahaaya Indian-accent command adaptation.',
  },
  {
    id: 'hi-IN',
    name: 'Hindi',
    nativeName: 'हिन्दी',
    bcp47: 'hi-IN',
    category: 'indian',
    uiLang: 'hi',
    defaultCapability: 'voice_available',
    aliases: ['hindi', 'hindustani', 'khari boli', 'hi'],
    capabilityNote:
      'Supported in standard Web Speech API browsers and Sahaaya UI.',
  },
  {
    id: 'kn-IN',
    name: 'Kannada',
    nativeName: 'ಕನ್ನಡ',
    bcp47: 'kn-IN',
    category: 'indian',
    uiLang: 'kn',
    defaultCapability: 'voice_available',
    aliases: ['kannada', 'kanarese', 'kn'],
    capabilityNote:
      'Supported in standard Web Speech API browsers and Sahaaya UI.',
  },
  {
    id: 'ml-IN',
    name: 'Malayalam',
    nativeName: 'മലയാളം',
    bcp47: 'ml-IN',
    category: 'indian',
    uiLang: 'en',
    defaultCapability: 'voice_available',
    aliases: ['malayalam', 'ml'],
    capabilityNote:
      'Recognised via browser Web Speech API when supported; Sahaaya responds cleanly with text fallback.',
  },
  {
    id: 'ta-IN',
    name: 'Tamil',
    nativeName: 'தமிழ்',
    bcp47: 'ta-IN',
    category: 'indian',
    uiLang: 'en',
    defaultCapability: 'voice_available',
    aliases: ['tamil', 'tamizh', 'ta'],
    capabilityNote:
      'Recognised via browser Web Speech API when supported; text input is always available.',
  },
  {
    id: 'te-IN',
    name: 'Telugu',
    nativeName: 'తెలుగు',
    bcp47: 'te-IN',
    category: 'indian',
    uiLang: 'en',
    defaultCapability: 'voice_available',
    aliases: ['telugu', 'te'],
    capabilityNote:
      'Recognised via browser Web Speech API when supported; text input is always available.',
  },
  {
    id: 'bn-IN',
    name: 'Bengali',
    nativeName: 'বাংলা',
    bcp47: 'bn-IN',
    category: 'indian',
    uiLang: 'en',
    defaultCapability: 'voice_available',
    aliases: ['bengali', 'bangla', 'bn'],
    capabilityNote:
      'Recognised via browser Web Speech API when supported; text input is always available.',
  },
  {
    id: 'mr-IN',
    name: 'Marathi',
    nativeName: 'मराठी',
    bcp47: 'mr-IN',
    category: 'indian',
    uiLang: 'hi',
    defaultCapability: 'voice_available',
    aliases: ['marathi', 'mr'],
    capabilityNote:
      'Recognised via browser Web Speech API when supported; text input is always available.',
  },
  {
    id: 'gu-IN',
    name: 'Gujarati',
    nativeName: 'ગુજરાતી',
    bcp47: 'gu-IN',
    category: 'indian',
    uiLang: 'en',
    defaultCapability: 'voice_available',
    aliases: ['gujarati', 'gu'],
    capabilityNote:
      'Recognised via browser Web Speech API when supported; text input is always available.',
  },
  {
    id: 'pa-IN',
    name: 'Punjabi',
    nativeName: 'ਪੰਜਾਬੀ',
    bcp47: 'pa-IN',
    category: 'indian',
    uiLang: 'hi',
    defaultCapability: 'voice_available',
    aliases: ['punjabi', 'panjabi', 'gurmukhi', 'pa'],
    capabilityNote:
      'Recognised via browser Web Speech API when supported; text input is always available.',
  },
  {
    id: 'or-IN',
    name: 'Odia',
    nativeName: 'ଓଡ଼ିଆ',
    bcp47: 'or-IN',
    category: 'indian',
    uiLang: 'en',
    defaultCapability: 'browser_dependent',
    aliases: ['odia', 'oriya', 'or'],
    capabilityNote:
      'Browser voice recognition varies by device and OS; text input works reliably everywhere.',
  },
  {
    id: 'as-IN',
    name: 'Assamese',
    nativeName: 'অসমীয়া',
    bcp47: 'as-IN',
    category: 'indian',
    uiLang: 'en',
    defaultCapability: 'browser_dependent',
    aliases: ['assamese', 'asamiya', 'as'],
    capabilityNote:
      'Browser voice recognition varies by device and OS; text input works reliably everywhere.',
  },
  {
    id: 'ur-IN',
    name: 'Urdu',
    nativeName: 'اردو',
    bcp47: 'ur-IN',
    category: 'indian',
    uiLang: 'hi',
    defaultCapability: 'voice_available',
    aliases: ['urdu', 'ur'],
    capabilityNote:
      'Recognised via browser Web Speech API when supported; text input is always available.',
  },
  {
    id: 'sa-IN',
    name: 'Sanskrit',
    nativeName: 'संस्कृतम्',
    bcp47: 'sa-IN',
    category: 'indian',
    uiLang: 'hi',
    defaultCapability: 'browser_dependent',
    aliases: ['sanskrit', 'samskritam', 'sa'],
    capabilityNote:
      'Browser speech support depends on installed device speech packs; text input is always supported.',
  },
  {
    id: 'ne-NP',
    name: 'Nepali',
    nativeName: 'नेपाली',
    bcp47: 'ne-NP',
    category: 'indian',
    uiLang: 'hi',
    defaultCapability: 'browser_dependent',
    aliases: ['nepali', 'gorkhali', 'ne'],
    capabilityNote:
      'Browser voice support depends on Chrome/Android speech service availability.',
  },
  {
    id: 'sd-IN',
    name: 'Sindhi',
    nativeName: 'सिंधी / سنڌي',
    bcp47: 'sd-IN',
    category: 'indian',
    uiLang: 'hi',
    defaultCapability: 'text_only_unverified',
    aliases: ['sindhi', 'sd'],
    capabilityNote:
      'Browser voice recognition is not verified for Sindhi. Text input is ready; native/open-source speech models require future integration.',
  },
  {
    id: 'ks-IN',
    name: 'Kashmiri',
    nativeName: 'कॉशुर / کٲشُر',
    bcp47: 'ks-IN',
    category: 'indian',
    uiLang: 'hi',
    defaultCapability: 'text_only_unverified',
    aliases: ['kashmiri', 'koshur', 'ks'],
    capabilityNote:
      'Browser voice recognition is not verified for Kashmiri. Text input is ready; future speech pack integration required.',
  },
  {
    id: 'kok-IN',
    name: 'Konkani',
    nativeName: 'कोंकणी / ಕೊಂಕಣಿ',
    bcp47: 'kok-IN',
    category: 'indian',
    uiLang: 'en',
    defaultCapability: 'text_only_unverified',
    aliases: ['konkani', 'konkanni', 'kok'],
    capabilityNote:
      'Standard browsers do not verify Konkani voice recognition. You can use text input or mixed English/Hindi/Kannada commands; native model integration is planned.',
  },
  {
    id: 'doi-IN',
    name: 'Dogri',
    nativeName: 'डोगरी',
    bcp47: 'doi-IN',
    category: 'indian',
    uiLang: 'hi',
    defaultCapability: 'text_only_unverified',
    aliases: ['dogri', 'doi'],
    capabilityNote:
      'Browser voice recognition is not verified for Dogri. Text input works immediately.',
  },
  {
    id: 'mai-IN',
    name: 'Maithili',
    nativeName: 'मैथिली',
    bcp47: 'mai-IN',
    category: 'indian',
    uiLang: 'hi',
    defaultCapability: 'text_only_unverified',
    aliases: ['maithili', 'mai'],
    capabilityNote:
      'Browser voice recognition is not verified for Maithili. Text input works immediately.',
  },
  {
    id: 'sat-IN',
    name: 'Santali',
    nativeName: 'ᱥᱟᱱᱛᱟᱲᱤ',
    bcp47: 'sat-IN',
    category: 'indian',
    uiLang: 'en',
    defaultCapability: 'text_only_unverified',
    aliases: ['santali', 'santhali', 'ol chiki', 'sat'],
    capabilityNote:
      'Browser voice recognition is not verified for Santali. Text input works immediately; future speech model integration required.',
  },
  {
    id: 'brx-IN',
    name: 'Bodo',
    nativeName: 'बड़ो',
    bcp47: 'brx-IN',
    category: 'indian',
    uiLang: 'hi',
    defaultCapability: 'text_only_unverified',
    aliases: ['bodo', 'boro', 'brx'],
    capabilityNote:
      'Browser voice recognition is not verified for Bodo. Text input works immediately.',
  },
  {
    id: 'mni-IN',
    name: 'Manipuri',
    nativeName: 'মৈতৈলোন্',
    bcp47: 'mni-IN',
    category: 'indian',
    uiLang: 'en',
    defaultCapability: 'text_only_unverified',
    aliases: ['manipuri', 'meitei', 'meetei', 'mni'],
    capabilityNote:
      'Browser voice recognition is not verified for Manipuri. Text input works immediately.',
  },

  // =========================================================
  // REGIONAL & COMMUNITY LANGUAGES (9)
  // =========================================================
  {
    id: 'tcy-IN',
    name: 'Tulu',
    nativeName: 'ತುಳು',
    bcp47: 'tcy-IN',
    category: 'regional',
    uiLang: 'kn',
    defaultCapability: 'text_only_unverified',
    aliases: ['tulu', 'tuluva', 'tcy'],
    capabilityNote:
      'Standard web browsers do not verify Tulu speech recognition. Text input and mixed Tulu-English/Kannada text commands are supported; full Tulu speech requires future Android/open-source model integration.',
  },
  {
    id: 'kfr-IN',
    name: 'Kutchi / Kachchi',
    nativeName: 'કચ્છી / कच्छी',
    bcp47: 'kfr-IN',
    category: 'regional',
    uiLang: 'hi',
    defaultCapability: 'text_only_unverified',
    aliases: ['kutchi', 'kachchi', 'cutchi', 'kutchchi', 'kfr'],
    capabilityNote:
      'Standard web browsers do not verify Kutchi / Kachchi speech recognition. Text input is available; native speech requires future integration.',
  },
  {
    id: 'bho-IN',
    name: 'Bhojpuri',
    nativeName: 'भोजपुरी',
    bcp47: 'bho-IN',
    category: 'regional',
    uiLang: 'hi',
    defaultCapability: 'text_only_unverified',
    aliases: ['bhojpuri', 'bho'],
    capabilityNote:
      'Browser voice recognition is not verified for Bhojpuri. Text input works immediately.',
  },
  {
    id: 'raj-IN',
    name: 'Rajasthani',
    nativeName: 'राजस्थानी',
    bcp47: 'raj-IN',
    category: 'regional',
    uiLang: 'hi',
    defaultCapability: 'text_only_unverified',
    aliases: ['rajasthani', 'marwari', 'mewari', 'raj'],
    capabilityNote:
      'Browser voice recognition is not verified for Rajasthani. Text input works immediately.',
  },
  {
    id: 'bgc-IN',
    name: 'Haryanvi',
    nativeName: 'हरियाणवी',
    bcp47: 'bgc-IN',
    category: 'regional',
    uiLang: 'hi',
    defaultCapability: 'text_only_unverified',
    aliases: ['haryanvi', 'bgc'],
    capabilityNote:
      'Browser voice recognition is not verified for Haryanvi. Text input works immediately.',
  },
  {
    id: 'hne-IN',
    name: 'Chhattisgarhi',
    nativeName: 'छत्तीसगढ़ी',
    bcp47: 'hne-IN',
    category: 'regional',
    uiLang: 'hi',
    defaultCapability: 'text_only_unverified',
    aliases: ['chhattisgarhi', 'hne'],
    capabilityNote:
      'Browser voice recognition is not verified for Chhattisgarhi. Text input works immediately.',
  },
  {
    id: 'gbm-IN',
    name: 'Garhwali',
    nativeName: 'गढ़वाली',
    bcp47: 'gbm-IN',
    category: 'regional',
    uiLang: 'hi',
    defaultCapability: 'text_only_unverified',
    aliases: ['garhwali', 'gbm'],
    capabilityNote:
      'Browser voice recognition is not verified for Garhwali. Text input works immediately.',
  },
  {
    id: 'kfy-IN',
    name: 'Kumaoni',
    nativeName: 'कुमाऊँनी',
    bcp47: 'kfy-IN',
    category: 'regional',
    uiLang: 'hi',
    defaultCapability: 'text_only_unverified',
    aliases: ['kumaoni', 'kumauni', 'kfy'],
    capabilityNote:
      'Browser voice recognition is not verified for Kumaoni. Text input works immediately.',
  },
  {
    id: 'other-regional',
    name: 'Other regional languages',
    nativeName: 'Other / Community Language',
    bcp47: 'en-IN',
    category: 'regional',
    uiLang: 'en',
    defaultCapability: 'future_integration_required',
    aliases: ['other regional', 'dialect', 'tribal', 'community', 'kodava', 'beary', 'lambadi'],
    capabilityNote:
      'Custom community and regional languages require future open-source or native Android speech integration; text input is supported.',
  },

  // =========================================================
  // INTERNATIONAL LANGUAGES (14)
  // =========================================================
  {
    id: 'en-US',
    name: 'English (International / US)',
    nativeName: 'English (US)',
    bcp47: 'en-US',
    category: 'international',
    uiLang: 'en',
    defaultCapability: 'voice_available',
    aliases: ['english us', 'american english', 'international english'],
    capabilityNote: 'Supported in standard Web Speech API browsers.',
  },
  {
    id: 'ar-SA',
    name: 'Arabic',
    nativeName: 'العربية',
    bcp47: 'ar-SA',
    category: 'international',
    uiLang: 'en',
    defaultCapability: 'voice_available',
    aliases: ['arabic', 'arabi', 'ar'],
    capabilityNote: 'Supported by standard Web Speech API browsers; text input always works.',
  },
  {
    id: 'fr-FR',
    name: 'French',
    nativeName: 'Français',
    bcp47: 'fr-FR',
    category: 'international',
    uiLang: 'en',
    defaultCapability: 'voice_available',
    aliases: ['french', 'francais', 'fr'],
    capabilityNote: 'Supported by standard Web Speech API browsers; text input always works.',
  },
  {
    id: 'es-ES',
    name: 'Spanish',
    nativeName: 'Español',
    bcp47: 'es-ES',
    category: 'international',
    uiLang: 'en',
    defaultCapability: 'voice_available',
    aliases: ['spanish', 'espanol', 'es'],
    capabilityNote: 'Supported by standard Web Speech API browsers; text input always works.',
  },
  {
    id: 'de-DE',
    name: 'German',
    nativeName: 'Deutsch',
    bcp47: 'de-DE',
    category: 'international',
    uiLang: 'en',
    defaultCapability: 'voice_available',
    aliases: ['german', 'deutsch', 'de'],
    capabilityNote: 'Supported by standard Web Speech API browsers; text input always works.',
  },
  {
    id: 'pt-PT',
    name: 'Portuguese',
    nativeName: 'Português',
    bcp47: 'pt-PT',
    category: 'international',
    uiLang: 'en',
    defaultCapability: 'voice_available',
    aliases: ['portuguese', 'portugues', 'pt'],
    capabilityNote: 'Supported by standard Web Speech API browsers; text input always works.',
  },
  {
    id: 'zh-CN',
    name: 'Chinese',
    nativeName: '中文',
    bcp47: 'zh-CN',
    category: 'international',
    uiLang: 'en',
    defaultCapability: 'voice_available',
    aliases: ['chinese', 'mandarin', 'putonghua', 'zh'],
    capabilityNote: 'Supported by standard Web Speech API browsers; text input always works.',
  },
  {
    id: 'ja-JP',
    name: 'Japanese',
    nativeName: '日本語',
    bcp47: 'ja-JP',
    category: 'international',
    uiLang: 'en',
    defaultCapability: 'voice_available',
    aliases: ['japanese', 'nihongo', 'ja'],
    capabilityNote: 'Supported by standard Web Speech API browsers; text input always works.',
  },
  {
    id: 'ko-KR',
    name: 'Korean',
    nativeName: '한국어',
    bcp47: 'ko-KR',
    category: 'international',
    uiLang: 'en',
    defaultCapability: 'voice_available',
    aliases: ['korean', 'hangul', 'ko'],
    capabilityNote: 'Supported by standard Web Speech API browsers; text input always works.',
  },
  {
    id: 'ru-RU',
    name: 'Russian',
    nativeName: 'Русский',
    bcp47: 'ru-RU',
    category: 'international',
    uiLang: 'en',
    defaultCapability: 'voice_available',
    aliases: ['russian', 'russkiy', 'ru'],
    capabilityNote: 'Supported by standard Web Speech API browsers; text input always works.',
  },
  {
    id: 'it-IT',
    name: 'Italian',
    nativeName: 'Italiano',
    bcp47: 'it-IT',
    category: 'international',
    uiLang: 'en',
    defaultCapability: 'voice_available',
    aliases: ['italian', 'italiano', 'it'],
    capabilityNote: 'Supported by standard Web Speech API browsers; text input always works.',
  },
  {
    id: 'id-ID',
    name: 'Indonesian',
    nativeName: 'Bahasa Indonesia',
    bcp47: 'id-ID',
    category: 'international',
    uiLang: 'en',
    defaultCapability: 'voice_available',
    aliases: ['indonesian', 'bahasa', 'id'],
    capabilityNote: 'Supported by standard Web Speech API browsers; text input always works.',
  },
  {
    id: 'th-TH',
    name: 'Thai',
    nativeName: 'ไทย',
    bcp47: 'th-TH',
    category: 'international',
    uiLang: 'en',
    defaultCapability: 'voice_available',
    aliases: ['thai', 'th'],
    capabilityNote: 'Supported by standard Web Speech API browsers; text input always works.',
  },
  {
    id: 'tr-TR',
    name: 'Turkish',
    nativeName: 'Türkçe',
    bcp47: 'tr-TR',
    category: 'international',
    uiLang: 'en',
    defaultCapability: 'voice_available',
    aliases: ['turkish', 'turkce', 'tr'],
    capabilityNote: 'Supported by standard Web Speech API browsers; text input always works.',
  },
];

export function getLanguageOptionById(id: string): SpokenLanguageOption | undefined {
  return SPOKEN_LANGUAGE_CATALOG.find(
    (item) =>
      item.id.toLowerCase() === id.toLowerCase() ||
      item.bcp47.toLowerCase() === id.toLowerCase()
  );
}

export function getDefaultLanguageForUi(uiLang: LanguageCode): SpokenLanguageOption {
  if (uiLang === 'hi') return getLanguageOptionById('hi-IN')!;
  if (uiLang === 'kn') return getLanguageOptionById('kn-IN')!;
  return getLanguageOptionById('en-IN')!;
}

export function searchSupportedLanguages(
  query: string,
  category: LanguageCategory | 'all' = 'all'
): SpokenLanguageOption[] {
  const q = query.trim().toLowerCase();
  return SPOKEN_LANGUAGE_CATALOG.filter((lang) => {
    if (category !== 'all' && lang.category !== category) return false;
    if (!q) return true;
    return (
      lang.name.toLowerCase().includes(q) ||
      lang.nativeName.toLowerCase().includes(q) ||
      lang.bcp47.toLowerCase().includes(q) ||
      lang.id.toLowerCase().includes(q) ||
      lang.aliases.some((alias) => alias.toLowerCase().includes(q))
    );
  });
}

export function getCapabilityStatusLabel(
  status: VoiceCapabilityStatus,
  uiLang: LanguageCode = 'en'
): string {
  if (uiLang === 'hi') {
    switch (status) {
      case 'voice_available':
        return 'आवाज़ पहचान उपलब्ध';
      case 'on_device_available':
        return 'ऑन-डिवाइस पहचान उपलब्ध';
      case 'browser_dependent':
        return 'ब्राउज़र-निर्भर आवाज़ पहचान';
      case 'text_only_unverified':
        return 'टेक्स्ट उपलब्ध; आवाज़ पहचान सत्यापित नहीं';
      case 'future_integration_required':
        return 'भविष्य में एकीकरण आवश्यक';
    }
  }
  if (uiLang === 'kn') {
    switch (status) {
      case 'voice_available':
        return 'ಧ್ವನಿ ಗುರುತಿಸುವಿಕೆ ಲಭ್ಯವಿದೆ';
      case 'on_device_available':
        return 'ಆನ್-ಡಿವೈಸ್ ಗುರುತಿಸುವಿಕೆ ಲಭ್ಯವಿದೆ';
      case 'browser_dependent':
        return 'ಬ್ರೌಸರ್-ಆಧಾರಿತ ಗುರುತಿಸುವಿಕೆ';
      case 'text_only_unverified':
        return 'ಪಠ್ಯ ಲಭ್ಯ; ಧ್ವನಿ ಗುರುತಿಸುವಿಕೆ ದೃಢೀಕರಿಸಲ್ಪಟ್ಟಿಲ್ಲ';
      case 'future_integration_required':
        return 'ಭವಿಷ್ಯದ ಏಕೀಕರಣ ಅಗತ್ಯವಿದೆ';
    }
  }
  switch (status) {
    case 'voice_available':
      return 'Voice recognition available';
    case 'on_device_available':
      return 'On-device recognition available';
    case 'browser_dependent':
      return 'Browser-dependent recognition';
    case 'text_only_unverified':
      return 'Text input available; voice recognition not verified';
    case 'future_integration_required':
      return 'Future integration required';
  }
}

export interface SpeechRecognitionAvailabilityConstructor {
  available?: (options: {
    langs: string[];
    processLocally?: boolean;
  }) => Promise<BrowserEngineAvailability>;
  install?: (options: {
    langs: string[];
    processLocally?: boolean;
  }) => Promise<boolean>;
}

export async function probeBrowserSpeechLanguageSupport(
  option: SpokenLanguageOption | null,
  options?: {
    recognitionSupported?: boolean;
    recognitionCtor?: SpeechRecognitionAvailabilityConstructor | null;
  }
): Promise<SpeechEngineSupportInfo> {
  const recognitionSupported =
    options?.recognitionSupported ??
    (typeof window !== 'undefined' &&
      Boolean(
        (window as unknown as Record<string, unknown>).SpeechRecognition ||
          (window as unknown as Record<string, unknown>).webkitSpeechRecognition
      ));

  const locale = option?.bcp47 || 'en-IN';
  const baseStatus: VoiceCapabilityStatus =
    option?.defaultCapability || 'future_integration_required';

  if (!recognitionSupported) {
    return {
      locale,
      recognitionSupported: false,
      onDeviceSupported: false,
      availability: 'unavailable',
      effectiveStatus:
        baseStatus === 'future_integration_required'
          ? 'future_integration_required'
          : 'text_only_unverified',
    };
  }

  // Try modern Web Speech API SpeechRecognition.available() if implemented by browser
  const ctor =
    options?.recognitionCtor ??
    (typeof window !== 'undefined'
      ? ((window as unknown as Record<string, unknown>).SpeechRecognition ||
          (window as unknown as Record<string, unknown>)
            .webkitSpeechRecognition) as SpeechRecognitionAvailabilityConstructor | undefined
      : undefined);

  if (
    ctor &&
    typeof ctor.available === 'function' &&
    option &&
    option.id !== 'other-regional'
  ) {
    try {
      const localAvail = await ctor.available({
        langs: [locale],
        processLocally: true,
      });
      if (localAvail === 'available') {
        return {
          locale,
          recognitionSupported: true,
          onDeviceSupported: true,
          availability: 'available',
          effectiveStatus: 'on_device_available',
        };
      }
      const cloudAvail = await ctor.available({ langs: [locale] });
      if (cloudAvail === 'available') {
        return {
          locale,
          recognitionSupported: true,
          onDeviceSupported: false,
          availability: 'available',
          effectiveStatus: 'voice_available',
        };
      }
      if (cloudAvail === 'downloadable' || cloudAvail === 'downloading') {
        return {
          locale,
          recognitionSupported: true,
          onDeviceSupported: false,
          availability: cloudAvail,
          effectiveStatus: 'browser_dependent',
        };
      }
      if (cloudAvail === 'unavailable') {
        return {
          locale,
          recognitionSupported: true,
          onDeviceSupported: false,
          availability: 'unavailable',
          effectiveStatus:
            baseStatus === 'future_integration_required'
              ? 'future_integration_required'
              : 'text_only_unverified',
        };
      }
    } catch {
      // Fall through cleanly to conservative catalog defaults
    }
  }

  return {
    locale,
    recognitionSupported,
    onDeviceSupported: false,
    availability: 'unknown',
    effectiveStatus: baseStatus,
  };
}

export function resolveEffectiveSpokenLocale(
  prefs: UniversalLanguagePreferences,
  uiLang: LanguageCode,
  detectedLangId?: string | null
): {
  locale: string;
  option: SpokenLanguageOption | null;
  displayLabel: string;
  capabilityStatus: VoiceCapabilityStatus;
} {
  if (prefs.mode === 'custom') {
    const customLabel = prefs.customLanguageName.trim() || 'Custom language';
    // Try matching catalog in case user typed a known language like "Kutchi" or "Tulu" or "Tamil"
    const matched = searchSupportedLanguages(customLabel)[0];
    if (matched && matched.id !== 'other-regional') {
      return {
        locale: matched.bcp47,
        option: matched,
        displayLabel: `${matched.name} (${customLabel})`,
        capabilityStatus: matched.defaultCapability,
      };
    }
    return {
      locale: getDefaultLanguageForUi(uiLang).bcp47,
      option: null,
      displayLabel: customLabel,
      capabilityStatus: 'future_integration_required',
    };
  }

  if (prefs.mode === 'auto') {
    if (detectedLangId) {
      const detectedOpt = getLanguageOptionById(detectedLangId);
      if (detectedOpt) {
        return {
          locale: detectedOpt.bcp47,
          option: detectedOpt,
          displayLabel: `Auto (${detectedOpt.name})`,
          capabilityStatus: detectedOpt.defaultCapability,
        };
      }
    }
    const uiDefault = getDefaultLanguageForUi(uiLang);
    return {
      locale: uiDefault.bcp47,
      option: uiDefault,
      displayLabel: `Auto (${uiDefault.name})`,
      capabilityStatus: uiDefault.defaultCapability,
    };
  }

  const chosen =
    getLanguageOptionById(prefs.selectedLanguageId) ||
    getDefaultLanguageForUi(uiLang);
  return {
    locale: chosen.bcp47,
    option: chosen,
    displayLabel: `${chosen.nativeName} · ${chosen.name}`,
    capabilityStatus: chosen.defaultCapability,
  };
}

export function loadUniversalLanguagePrefs(): UniversalLanguagePreferences {
  try {
    if (typeof localStorage === 'undefined') {
      return { ...DEFAULT_UNIVERSAL_LANGUAGE_PREFS };
    }
    const raw = localStorage.getItem(UNIVERSAL_LANG_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_UNIVERSAL_LANGUAGE_PREFS };
    const parsed = JSON.parse(raw) as Partial<UniversalLanguagePreferences>;
    const mode: UniversalLanguageMode =
      parsed.mode === 'auto' || parsed.mode === 'select' || parsed.mode === 'custom'
        ? parsed.mode
        : 'auto';
    return {
      mode,
      selectedLanguageId:
        typeof parsed.selectedLanguageId === 'string' && parsed.selectedLanguageId
          ? parsed.selectedLanguageId
          : 'en-IN',
      customLanguageName:
        typeof parsed.customLanguageName === 'string'
          ? parsed.customLanguageName
          : '',
    };
  } catch {
    return { ...DEFAULT_UNIVERSAL_LANGUAGE_PREFS };
  }
}

export function saveUniversalLanguagePrefs(
  prefs: UniversalLanguagePreferences
): void {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(UNIVERSAL_LANG_STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // Ignore storage quota errors
  }
}
