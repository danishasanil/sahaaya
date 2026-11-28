import { APPLICATION_FIELD_ORDER, TRANSLATIONS } from '../i18n/translations';
import {
  ApplicationData,
  AssistantTask,
  ExecutionMode,
  LanguageCode,
  PlatformCapabilities,
} from '../types/sahaaya';
import {
  formatDisplayValue,
  getCompletionStats,
  validateField,
} from './applicationLogic';

export type GeolocationResult =
  | { latitude: number; longitude: number }
  | { error: 'denied' | 'unavailable' };

export interface PlatformExecutionAdapter {
  openExternalUrl: (url: string) => boolean;
  getCurrentPosition: () => Promise<GeolocationResult>;
}

export interface WebDestination {
  appName: string;
  desktopUrl: string;
  mobileUrl: string;
  label: string;
}

export const WEB_APP_DESTINATIONS: Record<string, WebDestination> = {
  YouTube: {
    appName: 'YouTube',
    desktopUrl: 'https://www.youtube.com',
    mobileUrl: 'https://m.youtube.com',
    label: 'Open YouTube Website',
  },
  Google: {
    appName: 'Google',
    desktopUrl: 'https://www.google.com',
    mobileUrl: 'https://www.google.com',
    label: 'Open Google Search',
  },
  'Google Maps': {
    appName: 'Google Maps',
    desktopUrl: 'https://maps.google.com',
    mobileUrl: 'https://maps.google.com',
    label: 'Open Google Maps',
  },
  WhatsApp: {
    appName: 'WhatsApp',
    desktopUrl: 'https://web.whatsapp.com',
    mobileUrl: 'https://wa.me/',
    label: 'Open WhatsApp Web',
  },
  Chrome: {
    appName: 'Chrome',
    desktopUrl: 'https://www.google.com',
    mobileUrl: 'https://www.google.com',
    label: 'Open Google Search in Browser',
  },
  Spotify: {
    appName: 'Spotify',
    desktopUrl: 'https://open.spotify.com',
    mobileUrl: 'https://open.spotify.com',
    label: 'Open Spotify Web',
  },
};

export function createBrowserExecutionAdapter(): PlatformExecutionAdapter {
  return {
    openExternalUrl: (url: string) => {
      if (typeof document === 'undefined' || !url) return false;
      try {
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.target = '_blank';
        anchor.rel = 'noopener noreferrer';
        anchor.style.display = 'none';
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);
        return true;
      } catch {
        return false;
      }
    },
    getCurrentPosition: () =>
      new Promise<GeolocationResult>((resolve) => {
        if (typeof navigator === 'undefined' || !navigator.geolocation) {
          resolve({ error: 'unavailable' });
          return;
        }
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            resolve({
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
            });
          },
          (err) => {
            if (err && err.code === 1) {
              resolve({ error: 'denied' });
            } else {
              resolve({ error: 'unavailable' });
            }
          },
          { enableHighAccuracy: false, timeout: 7000, maximumAge: 60000 }
        );
      }),
  };
}

export function getWebDestinationForApp(
  appName: string | null,
  caps: PlatformCapabilities
): { url: string; label: string } | null {
  if (!appName) return null;
  const entry = WEB_APP_DESTINATIONS[appName];
  if (!entry) return null;
  return {
    url: caps.isMobile ? entry.mobileUrl : entry.desktopUrl,
    label: entry.label,
  };
}

export function buildSearchUrl(
  query: string,
  useMaps: boolean,
  coords?: { latitude: number; longitude: number } | null
): string {
  const cleanQuery = query.trim();
  if (useMaps || /\b(near me|nearby|closest)\b/i.test(cleanQuery)) {
    if (coords) {
      const stripped = cleanQuery
        .replace(/\b(near me|nearby|closest)\b/gi, '')
        .trim();
      const base = stripped || cleanQuery || 'places';
      return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        `${base} near ${coords.latitude.toFixed(5)},${coords.longitude.toFixed(5)}`
      )}`;
    }
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      cleanQuery
    )}`;
  }
  return `https://www.google.com/search?q=${encodeURIComponent(cleanQuery)}`;
}

export function buildYouTubeSearchUrl(query: string): string {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(
    query.trim()
  )}`;
}

export function buildSpotifySearchUrl(query: string): string {
  return `https://open.spotify.com/search/${encodeURIComponent(query.trim())}`;
}

export function buildDirectionsUrl(
  destination: string,
  coords?: { latitude: number; longitude: number } | null
): string {
  const base = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
    destination.trim()
  )}`;
  if (coords) {
    return `${base}&origin=${coords.latitude.toFixed(5)},${coords.longitude.toFixed(5)}`;
  }
  return base;
}

export function buildWhatsAppPrefilledUrl(messageContent: string): string {
  return `https://wa.me/?text=${encodeURIComponent(messageContent.trim())}`;
}

function buildOpenWebsitePrompt(appName: string, lang: LanguageCode): string {
  if (lang === 'hi') {
    return `मैं ब्राउज़र से फ़ोन का नेटिव ${appName} ऐप नहीं खोल सकता, लेकिन मैं नए ब्राउज़र टैब में आधिकारिक ${appName} वेबसाइट खोल सकता हूँ। क्या आप इसे खोलना चाहेंगे?`;
  }
  if (lang === 'kn') {
    return `ಬ್ರೌಸರ್‌ನಿಂದ ಫೋನ್‌ನ ನೇಟಿವ್ ${appName} ಆ್ಯಪ್ ತೆರೆಯಲು ಸಾಧ್ಯವಿಲ್ಲ, ಆದರೆ ಹೊಸ ಟ್ಯಾಬ್‌ನಲ್ಲಿ ಅಧಿಕೃತ ${appName} ವೆಬ್‌ಸೈಟ್ ತೆರೆಯಬಹುದು. ನಾನು ಅದನ್ನು ತೆರೆಯಲೇ?`;
  }
  return `I cannot launch a native ${appName} phone app from a browser, but I can open the official ${appName} website in a new browser tab. Would you like me to open it?`;
}

function buildNativeOnlyReply(
  appName: string,
  isUnknown: boolean,
  lang: LanguageCode
): string {
  if (lang === 'hi') {
    if (isUnknown) {
      return `"${appName}" वेब ब्राउज़र में समर्थित नहीं है और सहाय यहाँ बाहरी फ़ोन ऐप नहीं खोल सकता। इसके बजाय आप मुझे Google पर "${appName}" खोजने के लिए कह सकते हैं।`;
    }
    return `${appName} एक डिवाइस सुविधा है जिसे वेब ब्राउज़र से नहीं खोला जा सकता। आप इसे अपने फ़ोन या कंप्यूटर के मुख्य मेनू से सीधे खोल सकते हैं।`;
  }
  if (lang === 'kn') {
    if (isUnknown) {
      return `"${appName}" ಈ ವೆಬ್ ಬ್ರೌಸರ್‌ನಲ್ಲಿ ಲಭ್ಯವಿಲ್ಲ ಮತ್ತು ಸಹಾಯ ಇತರ ಫೋನ್ ಆ್ಯಪ್‌ಗಳನ್ನು ತೆರೆಯಲು ಸಾಧ್ಯವಿಲ್ಲ. ಬದಲಾಗಿ ನೀವು Google ನಲ್ಲಿ "${appName}" ಹುಡುಕಲು ಹೇಳಬಹುದು.`;
    }
    return `${appName} ಸಾಧನದ ಆಂತರಿಕ ಸೌಲಭ್ಯವಾಗಿದ್ದು ವೆಬ್ ಬ್ರೌಸರ್‌ನಿಂದ ತೆರೆಯಲು ಸಾಧ್ಯವಿಲ್ಲ. ದಯವಿಟ್ಟು ನಿಮ್ಮ ಸಾಧನದ ಮೆನುವಿನಿಂದ ನೇರವಾಗಿ ತೆರೆಯಿರಿ.`;
  }
  if (isUnknown) {
    return `"${appName}" cannot be opened as a mobile app from a web browser. As an alternative, you can ask me to search for "${appName}" on Google.`;
  }
  return `${appName} is a device-level feature that web browsers cannot open directly. Please open ${appName} from your device menu, or ask me a browser-supported task.`;
}

export function prepareTaskForPlatform(
  task: AssistantTask,
  caps: PlatformCapabilities,
  lang: LanguageCode = 'en',
  executionMode: ExecutionMode = 'real_browser'
): { task: AssistantTask; replyOverride?: string } {
  // Never overwrite incomplete multi-turn slot-filling or invalid/failed tasks with unavailable_on_web
  if (task.executionStatus === 'needs_info' || task.executionStatus === 'failed') {
    if (
      (task.application === 'Calendar' || task.application === 'Calculator') &&
      executionMode === 'real_browser'
    ) {
      const appName = task.application;
      return {
        task: {
          ...task,
          confirmationRequired: false,
          executionStatus: 'unavailable_on_web',
          externalUrl: null,
          externalLabel: null,
          capabilityNote: `${appName} requires native device access in Real Browser Mode. Switch to Interactive Demo Mode to use Sahaaya's simulated ${appName}.`,
        },
        replyOverride:
          lang === 'hi'
            ? `Real Browser Mode में ब्राउज़र फ़ोन के असली ${appName} को सीधे नहीं बदल सकता। सहाय के स्थानीय सिम्युलेटेड ${appName} का उपयोग करने के लिए ऊपर Interactive Demo Mode चुनें।`
            : lang === 'kn'
              ? `Real Browser Mode ನಲ್ಲಿ ಬ್ರೌಸರ್ ಫೋನ್‌ನ ನಿಜವಾದ ${appName} ಅನ್ನು ನೇರವಾಗಿ ಬದಲಾಯಿಸಲು ಸಾಧ್ಯವಿಲ್ಲ. ಸಹಾಯದ ಸಿಮ್ಯುಲೇಟೆಡ್ ${appName} ಬಳಸಲು ಮೇಲೆ Interactive Demo Mode ಆಯ್ಕೆಮಾಡಿ.`
              : `In Real Browser Mode, web browsers cannot access or modify your device's native ${appName}. Switch to Interactive Demo Mode above to schedule or view events in Sahaaya's simulated ${appName}.`,
      };
    }
    return { task };
  }

  if (task.intent === 'app_launch') {
    if (task.application === 'Calendar' || task.application === 'Calculator') {
      if (executionMode === 'interactive_demo') {
        return { task };
      }
      const appName = task.application;
      return {
        task: {
          ...task,
          confirmationRequired: false,
          executionStatus: 'unavailable_on_web',
          externalUrl: null,
          externalLabel: null,
          capabilityNote: `${appName} requires native device access in Real Browser Mode. Switch to Interactive Demo Mode to use Sahaaya's simulated ${appName}.`,
        },
        replyOverride:
          lang === 'hi'
            ? `Real Browser Mode में ब्राउज़र फ़ोन के असली ${appName} को सीधे नहीं खोल या बदल सकता। सिम्युलेटेड ${appName} का उपयोग करने के लिए Interactive Demo Mode चुनें।`
            : lang === 'kn'
              ? `Real Browser Mode ನಲ್ಲಿ ಬ್ರೌಸರ್ ಫೋನ್‌ನ ನಿಜವಾದ ${appName} ಅನ್ನು ನೇರವಾಗಿ ತೆರೆಯಲು ಸಾಧ್ಯವಿಲ್ಲ. ಸಿಮ್ಯುಲೇಟೆಡ್ ${appName} ಬಳಸಲು Interactive Demo Mode ಆಯ್ಕೆಮಾಡಿ.`
              : `In Real Browser Mode, web browsers cannot access your device's native ${appName}. Switch to Interactive Demo Mode above to use Sahaaya's simulated ${appName}.`,
      };
    }

    if (
      task.application === 'YouTube' &&
      task.action === 'play_video' &&
      task.target &&
      caps.canOpenExternalWebsites
    ) {
      const ytUrl = buildYouTubeSearchUrl(task.target);
      return {
        task: {
          ...task,
          confirmationRequired: true,
          executionStatus: 'awaiting_confirmation',
          externalUrl: ytUrl,
          externalLabel: `Search "${task.target}" on YouTube`,
          capabilityNote:
            'Opens YouTube search results for this video in a new browser tab after confirmation.',
        },
      };
    }

    if (
      task.application === 'Spotify' &&
      (task.action === 'play_music' || task.action === 'search_spotify') &&
      task.target &&
      task.target !== 'Spotify' &&
      caps.canOpenExternalWebsites
    ) {
      const spotifyUrl = buildSpotifySearchUrl(task.target);
      return {
        task: {
          ...task,
          confirmationRequired: true,
          executionStatus: 'awaiting_confirmation',
          externalUrl: spotifyUrl,
          externalLabel: `Search "${task.target}" on Spotify`,
          capabilityNote:
            'Opens Spotify Web search for this music in a new browser tab after confirmation.',
        },
      };
    }

    const dest = getWebDestinationForApp(task.application, caps);
    if (dest && caps.canOpenExternalWebsites) {
      const prepared: AssistantTask = {
        ...task,
        action: 'open_website',
        confirmationRequired: true,
        executionStatus: 'awaiting_confirmation',
        externalUrl: dest.url,
        externalLabel: dest.label,
        capabilityNote:
          'Opens the official website in a new browser tab. Web browsers cannot control external native smartphone apps.',
      };
      return {
        task: prepared,
        replyOverride: buildOpenWebsitePrompt(task.application || 'website', lang),
      };
    }

    const appLabel = task.application || 'this app';
    return {
      task: {
        ...task,
        confirmationRequired: false,
        executionStatus: 'unavailable_on_web',
        externalUrl: null,
        externalLabel: null,
        capabilityNote: `${appLabel} requires native device access and cannot be opened from a web browser.`,
      },
      replyOverride: buildNativeOnlyReply(appLabel, false, lang),
    };
  }

  if (task.intent === 'unknown_app') {
    const appLabel = task.application || 'this application';
    const searchUrl = buildSearchUrl(appLabel, false);
    return {
      task: {
        ...task,
        confirmationRequired: false,
        executionStatus: 'unavailable_on_web',
        externalUrl: searchUrl,
        externalLabel: `Search "${appLabel}" on Google`,
        capabilityNote:
          'External mobile apps cannot be launched from a browser. Offered a Google search link as a safe alternative.',
      },
      replyOverride: buildNativeOnlyReply(appLabel, true, lang),
    };
  }

  if (task.intent === 'search') {
    const query = task.target || '';
    const isYouTubeSearch =
      task.application === 'YouTube' || task.action === 'search_youtube';
    const isSpotifySearch =
      task.application === 'Spotify' || task.action === 'search_spotify';
    const isDirections = task.action === 'directions';
    const isChromeExplicit = /\bchrome\b/i.test(task.application || '');
    const requiresLocation =
      !isChromeExplicit &&
      !isSpotifySearch &&
      (Boolean(task.requiresLocation) ||
        isDirections ||
        /\b(near me|nearby|closest)\b/i.test(`${query} ${task.rawInstruction}`));
    const useMaps =
      !isChromeExplicit &&
      !isSpotifySearch &&
      (isDirections || requiresLocation || /maps/i.test(task.application || ''));

    if (task.executionStatus === 'awaiting_confirmation' && query) {
      const url = isYouTubeSearch
        ? buildYouTubeSearchUrl(query)
        : isSpotifySearch
          ? buildSpotifySearchUrl(query)
          : isDirections
            ? buildDirectionsUrl(query, null)
            : buildSearchUrl(query, useMaps, null);
      const replyOverride = requiresLocation
        ? lang === 'hi'
          ? `मैंने "${query}" खोजने की तैयारी की है। आगे बढ़ने पर मैं नज़दीकी परिणाम दिखाने के लिए आपके ब्राउज़र से स्थान (Location) की अनुमति माँगूँगा। क्या आप आगे बढ़ना चाहते हैं?`
          : lang === 'kn'
            ? `"${query}" ಹುಡುಕಲು ಸಿದ್ಧವಾಗಿದೆ. ಮುಂದುವರಿದರೆ ಹತ್ತಿರದ ಫಲಿತಾಂಶ ತೋರಿಸಲು ನಿಮ್ಮ ಬ್ರೌಸರ್‌ನಿಂದ ಸ್ಥಳ (Location) ಅನುಮತಿ ಕೇಳಲಾಗುತ್ತದೆ. ಮುಂದುವರಿಯೋಣವೇ?`
            : `I prepared a search for "${query}". If you continue, I will request your browser location permission to open nearby results on Google Maps. Would you like to continue?`
        : undefined;

      return {
        task: {
          ...task,
          requiresLocation,
          locationStatus: 'not_needed',
          externalUrl: url,
          externalLabel: isYouTubeSearch
            ? `Search "${query}" on YouTube`
            : isSpotifySearch
              ? `Search "${query}" on Spotify`
              : useMaps
                ? 'Open in Google Maps'
                : 'Open Search Results',
          capabilityNote: requiresLocation
            ? 'Requires your browser location permission on confirmation, or your city/area name.'
            : 'Opens search results in a new browser tab after your confirmation.',
        },
        replyOverride,
      };
    }

    return {
      task: {
        ...task,
        requiresLocation,
        locationStatus: 'not_needed',
      },
    };
  }

  if (task.intent === 'messaging') {
    if (task.executionStatus === 'awaiting_confirmation' && task.messageContent) {
      const url = buildWhatsAppPrefilledUrl(task.messageContent);
      const recipient = task.target || 'your contact';
      const replyOverride =
        lang === 'hi'
          ? `${recipient} के लिए संदेश तैयार है: "${task.messageContent}"। पुष्टि करने पर यह संदेश WhatsApp में खुल जाएगा ताकि आप स्वयं जाँच कर भेज सकें (सहाय अपने आप नहीं भेजेगा)। क्या आप आगे बढ़ना चाहते हैं?`
          : lang === 'kn'
            ? `${recipient} ಅವರಿಗೆ ಸಂದೇಶ ಸಿದ್ಧವಾಗಿದೆ: "${task.messageContent}". ದೃಢಪಡಿಸಿದರೆ WhatsApp ನಲ್ಲಿ ಈ ಸಂದೇಶ ತೆರೆಯುತ್ತದೆ, ನಂತರ ನೀವೇ ಪರಿಶೀಲಿಸಿ ಕಳುಹಿಸಬಹುದು (ಸಹಾಯ ತಾನಾಗಿಯೇ ಕಳುಹಿಸುವುದಿಲ್ಲ). ಮುಂದುವರಿಯೋಣವೇ?`
            : `Your message for ${recipient} is prepared: "${task.messageContent}". Confirming will open WhatsApp with this draft prefilled so you can choose ${recipient} and press Send yourself (Sahaaya will not send it automatically). Would you like to continue?`;

      return {
        task: {
          ...task,
          externalUrl: url,
          externalLabel: 'Open WhatsApp Draft',
          capabilityNote:
            'Opens WhatsApp with a prefilled message draft. Sahaaya never sends messages automatically.',
        },
        replyOverride,
      };
    }
  }

  return { task };
}

export async function executeConfirmedTask(
  task: AssistantTask,
  caps: PlatformCapabilities,
  lang: LanguageCode = 'en',
  adapter: PlatformExecutionAdapter = createBrowserExecutionAdapter()
): Promise<{ task: AssistantTask; replyText: string }> {
  // Never execute native system alarms in browser mode
  if (task.action === 'set_alarm') {
    return {
      task: {
        ...task,
        executionStatus: 'unavailable_on_web',
      },
      replyText:
        lang === 'hi'
          ? 'यह वेब ब्राउज़र डेमो आपके फ़ोन का असली सिस्टम अलार्म सीधे सेट नहीं कर सकता (इसके लिए भविष्य में Android डिवाइस एकीकरण की आवश्यकता होगी)। विकल्प के रूप में, आप चाहें तो मैं इसे सहाय के स्थानीय डेमो कैलेंडर में एक रिमाइंडर के रूप में जोड़ सकता हूँ।'
          : lang === 'kn'
            ? 'ಈ ವೆಬ್ ಬ್ರೌಸರ್ ಡೆಮೊ ನಿಮ್ಮ ಫೋನ್‌ನ ನಿಜವಾದ ಸಿಸ್ಟಮ್ ಅಲಾರಂ ಅನ್ನು ನೇರವಾಗಿ ಇಡಲು ಸಾಧ್ಯವಿಲ್ಲ (ಇದಕ್ಕೆ ಭವಿಷ್ಯದ Android ಸಾಧನ ಏಕೀಕರಣ ಅಗತ್ಯವಿದೆ). ಪರ್ಯಾಯವಾಗಿ, ನೀವು ಬಯಸಿದರೆ ನಾನು ಇದನ್ನು ಸಹಾಯದ ಸ್ಥಳೀಯ ಡೆಮೊ ಕ್ಯಾಲೆಂಡರ್‌ನಲ್ಲಿ ರಿಮೈಂಡರ್ ಆಗಿ ಸೇರಿಸಬಲ್ಲೆ.'
            : 'This browser demo cannot directly set your phone’s system alarm—that requires future native Android Clock integration. As an alternative, I can add a local reminder in Sahaaya’s Demo Calendar if you would like, without setting a real phone alarm.',
    };
  }

  // 1. Open Website (YouTube, Google, Google Maps, WhatsApp Web, Chrome -> Google Search, Spotify)
  if (task.intent === 'app_launch') {
    const isYouTubeVideo =
      task.application === 'YouTube' && task.action === 'play_video' && task.target;
    const isSpotifyMusic =
      task.application === 'Spotify' &&
      (task.action === 'play_music' || task.action === 'search_spotify') &&
      task.target &&
      task.target !== 'Spotify';
    const dest = getWebDestinationForApp(task.application, caps);
    const url = isYouTubeVideo
      ? buildYouTubeSearchUrl(task.target!)
      : isSpotifyMusic
        ? buildSpotifySearchUrl(task.target!)
        : task.externalUrl || dest?.url || null;
    if (!url) {
      return {
        task: {
          ...task,
          executionStatus: 'unavailable_on_web',
        },
        replyText: buildNativeOnlyReply(task.application || 'this app', false, lang),
      };
    }

    const opened = adapter.openExternalUrl(url);
    const appName = task.application || 'website';
    if (!opened) {
      return {
        task: {
          ...task,
          executionStatus: 'failed',
          externalUrl: url,
          externalLabel: dest?.label || `Open ${appName} Website`,
        },
        replyText:
          lang === 'hi'
            ? `ब्राउज़र ने नया टैब अपने आप खुलने से रोका है। ${appName} वेबसाइट खोलने के लिए कृपया स्क्रीन पर दिए बटन को दबाएँ।`
            : lang === 'kn'
              ? `ಬ್ರೌಸರ್ ಸ್ವಯಂಚಾಲಿತವಾಗಿ ಹೊಸ ಟ್ಯಾಬ್ ತೆರೆಯುವುದನ್ನು ತಡೆದಿದೆ. ${appName} ವೆಬ್‌ಸೈಟ್ ತೆರೆಯಲು ದಯವಿಟ್ಟು ಪರದೆಯ ಮೇಲಿನ ಬಟನ್ ಒತ್ತಿರಿ.`
              : `Your browser prevented the tab from opening automatically. Please tap the "${dest?.label || `Open ${appName} Website`}" button on screen to open the official ${appName} website.`,
      };
    }

    return {
      task: {
        ...task,
        executionStatus: 'opened_externally',
        externalUrl: url,
        externalLabel: isYouTubeVideo
          ? `Open "${task.target}" on YouTube`
          : isSpotifyMusic
            ? `Open "${task.target}" on Spotify`
            : dest?.label || `Open ${appName} Website`,
        capabilityNote: isYouTubeVideo
          ? `Opened YouTube search results for "${task.target}" in a new browser tab.`
          : isSpotifyMusic
            ? `Opened Spotify search for "${task.target}" in a new browser tab.`
            : `Opened the official ${appName} website in a new browser tab (not a native phone app).`,
      },
      replyText: isYouTubeVideo
        ? lang === 'hi'
          ? `मैंने नए ब्राउज़र टैब में YouTube पर "${task.target}" खोज परिणाम खोल दिए हैं।`
          : lang === 'kn'
            ? `ಹೊಸ ಬ್ರೌಸರ್ ಟ್ಯಾಬ್‌ನಲ್ಲಿ YouTube ನಲ್ಲಿ "${task.target}" ಹುಡುಕಾಟ ಫಲಿತಾಂಶ ತೆರೆದಿದ್ದೇನೆ.`
            : `I opened YouTube results for "${task.target}" in a new browser tab.`
        : isSpotifyMusic
          ? lang === 'hi'
            ? `मैंने नए ब्राउज़र टैब में Spotify पर "${task.target}" खोल दिया है।`
            : lang === 'kn'
              ? `ಹೊಸ ಬ್ರೌಸರ್ ಟ್ಯಾಬ್‌ನಲ್ಲಿ Spotify ನಲ್ಲಿ "${task.target}" ತೆರೆದಿದ್ದೇನೆ.`
              : `I opened Spotify search results for "${task.target}" in a new browser tab.`
          : lang === 'hi'
            ? `मैंने नए ब्राउज़र टैब में आधिकारिक ${appName} वेबसाइट खोल दी है (यह फ़ोन का नेटिव ऐप नहीं है)। यदि टैब न दिखे, तो स्क्रीन पर दिए लिंक बटन का उपयोग करें।`
            : lang === 'kn'
              ? `ನಾನು ಹೊಸ ಬ್ರೌಸರ್ ಟ್ಯಾಬ್‌ನಲ್ಲಿ ಅಧಿಕೃತ ${appName} ವೆಬ್‌ಸೈಟ್ ತೆರೆದಿದ್ದೇನೆ (ಇದು ಫೋನ್‌ನ ನೇಟಿವ್ ಆ್ಯಪ್ ಅಲ್ಲ). ಟ್ಯಾಬ್ ಕಾಣದಿದ್ದರೆ ಪರದೆಯ ಮೇಲಿನ ಲಿಂಕ್ ಬಟನ್ ಬಳಸಿ.`
              : `I opened the official ${appName} website in a new browser tab (not a native mobile app). You can also tap the link button on screen anytime.`,
    };
  }

  // 2. Search (including YouTube search, Spotify search & location-aware nearby/directions searches)
  if (task.intent === 'search') {
    const query = (task.target || '').trim();
    if (!query) {
      return {
        task: { ...task, executionStatus: 'needs_info' },
        replyText:
          lang === 'hi'
            ? 'आप क्या खोजना चाहते हैं?'
            : lang === 'kn'
              ? 'ನೀವು ಏನನ್ನು ಹುಡುಕಲು ಬಯಸುತ್ತೀರಿ?'
              : 'What would you like me to search for?',
      };
    }

    const isYouTubeSearch =
      task.application === 'YouTube' || task.action === 'search_youtube';
    if (isYouTubeSearch) {
      const ytUrl = buildYouTubeSearchUrl(query);
      const opened = adapter.openExternalUrl(ytUrl);
      return {
        task: {
          ...task,
          executionStatus: opened ? 'opened_externally' : 'failed',
          locationStatus: 'not_needed',
          externalUrl: ytUrl,
          externalLabel: `Open "${query}" on YouTube`,
        },
        replyText: opened
          ? lang === 'hi'
            ? `मैंने नए ब्राउज़र टैब में YouTube पर "${query}" खोज परिणाम खोल दिए हैं।`
            : lang === 'kn'
              ? `ಹೊಸ ಬ್ರೌಸರ್ ಟ್ಯಾಬ್‌ನಲ್ಲಿ YouTube ನಲ್ಲಿ "${query}" ಹುಡುಕಾಟ ಫಲಿತಾಂಶಗಳನ್ನು ತೆರೆದಿದ್ದೇನೆ.`
              : `I opened YouTube search results for "${query}" in a new browser tab.`
          : lang === 'hi'
            ? 'ब्राउज़र ने YouTube को अपने आप खुलने से रोका है। कृपया स्क्रीन पर दिए बटन को दबाएँ।'
            : lang === 'kn'
              ? 'ಬ್ರೌಸರ್ ಸ್ವಯಂಚಾಲಿತವಾಗಿ YouTube ತೆರೆಯುವುದನ್ನು ತಡೆದಿದೆ. ದಯವಿಟ್ಟು ಪರದೆಯ ಮೇಲಿನ ಬಟನ್ ಒತ್ತಿರಿ.'
              : 'Your browser blocked opening YouTube automatically. Please tap the button on screen.',
      };
    }

    const isSpotifySearch =
      task.application === 'Spotify' || task.action === 'search_spotify';
    if (isSpotifySearch) {
      const spotifyUrl = buildSpotifySearchUrl(query);
      const opened = adapter.openExternalUrl(spotifyUrl);
      return {
        task: {
          ...task,
          executionStatus: opened ? 'opened_externally' : 'failed',
          locationStatus: 'not_needed',
          externalUrl: spotifyUrl,
          externalLabel: `Open "${query}" on Spotify`,
        },
        replyText: opened
          ? `I opened Spotify search results for "${query}" in a new browser tab.`
          : `Your browser blocked opening Spotify automatically. Please tap the button on screen.`,
      };
    }

    const isDirections = task.action === 'directions';
    const useMaps =
      isDirections ||
      Boolean(task.requiresLocation) ||
      /\b(near me|nearby|closest)\b/i.test(query) ||
      /maps/i.test(task.application || '');

    if (task.requiresLocation) {
      if (!caps.geolocationSupported) {
        const fallbackUrl = isDirections
          ? buildDirectionsUrl(query, null)
          : buildSearchUrl(query, true, null);
        return {
          task: {
            ...task,
            executionStatus: 'requires_permission',
            locationStatus: 'unavailable',
            externalUrl: fallbackUrl,
            externalLabel: 'Open General Google Maps Search',
            capabilityNote:
              'Browser location is unavailable on this device. Please share your city or area name.',
          },
          replyText:
            lang === 'hi'
              ? 'इस ब्राउज़र में आपका स्थान (Location) उपलब्ध नहीं है। कृपया अपने शहर या इलाके का नाम बताएँ (जैसे "मैसूर में अस्पताल"), या स्क्रीन पर सामान्य खोज लिंक खोलें।'
              : lang === 'kn'
                ? 'ಈ ಬ್ರೌಸರ್‌ನಲ್ಲಿ ಸ್ಥಳ (Location) ಸೌಲಭ್ಯ ಲಭ್ಯವಿಲ್ಲ. ದಯವಿಟ್ಟು ನಿಮ್ಮ ನಗರ ಅಥವಾ ಪ್ರದೇಶದ ಹೆಸರನ್ನು ಹೇಳಿ (ಉದಾ. "ಮೈಸೂರಿನಲ್ಲಿ ಆಸ್ಪತ್ರೆ"), ಅಥವಾ ಪರದೆಯ ಮೇಲಿನ ಸಾಮಾನ್ಯ ಹುಡುಕಾಟ ಲಿಂಕ್ ಬಳಸಿ.'
                : 'Location detection is unavailable in this browser, so I cannot detect your current location automatically. Please tell me your city or area name (for example, "Search hospitals in Mysuru"), or use the general search button on screen.',
        };
      }

      const pos = await adapter.getCurrentPosition();
      if ('error' in pos) {
        const fallbackUrl = isDirections
          ? buildDirectionsUrl(query, null)
          : buildSearchUrl(query, true, null);
        return {
          task: {
            ...task,
            executionStatus: 'requires_permission',
            locationStatus: pos.error,
            externalUrl: fallbackUrl,
            externalLabel: 'Open General Google Maps Search',
            capabilityNote:
              pos.error === 'denied'
                ? 'Location permission was denied. No coordinates were assumed.'
                : 'Location could not be read right now. No coordinates were assumed.',
          },
          replyText:
            lang === 'hi'
              ? 'स्थान (Location) की अनुमति नहीं मिली, इसलिए मैं आपका सटीक स्थान नहीं जान सकता। कृपया अपने शहर या इलाके का नाम बताएँ, या सामान्य खोज लिंक खोलें।'
              : lang === 'kn'
                ? 'ಸ್ಥಳ (Location) ಅನುಮತಿ ಸಿಗದ ಕಾರಣ ನಿಮ್ಮ ಪ್ರಸ್ತುತ ಸ್ಥಳವನ್ನು ತಿಳಿಯಲು ಸಾಧ್ಯವಾಗಲಿಲ್ಲ. ದಯವಿಟ್ಟು ನಿಮ್ಮ ನಗರ ಅಥವಾ ಪ್ರದೇಶದ ಹೆಸರನ್ನು ಹೇಳಿ, ಅಥವಾ ಸಾಮಾನ್ಯ ಹುಡುಕಾಟ ಲಿಂಕ್ ತೆರೆಯಿರಿ.'
                : 'Location permission was not granted, so I cannot detect where you are without guessing. Please tell me your city or area name, or tap the general search link on screen.',
        };
      }

      const geoUrl = isDirections
        ? buildDirectionsUrl(query, pos)
        : buildSearchUrl(query, true, pos);
      const opened = adapter.openExternalUrl(geoUrl);
      return {
        task: {
          ...task,
          executionStatus: opened ? 'opened_externally' : 'failed',
          locationStatus: 'granted',
          externalUrl: geoUrl,
          externalLabel: 'Open Nearby Results in Google Maps',
          capabilityNote: 'Used your permitted device location to open Google Maps.',
        },
        replyText: opened
          ? lang === 'hi'
            ? `आपकी अनुमति से मैंने नज़दीकी "${query}" के लिए Google Maps खोल दिया है।`
            : lang === 'kn'
              ? `ನಿಮ್ಮ ಸ್ಥಳದ ಅನುಮತಿಯೊಂದಿಗೆ ಹತ್ತಿರದ "${query}" ಗಾಗಿ Google Maps ತೆರೆದಿದ್ದೇನೆ.`
              : `Using your permitted location, I opened Google Maps search results for "${query}" in a new browser tab.`
          : `Location was granted, but your browser blocked automatic tab opening. Please tap "Open Nearby Results in Google Maps" on screen.`,
      };
    }

    const searchUrl = buildSearchUrl(query, useMaps, null);
    const opened = adapter.openExternalUrl(searchUrl);
    return {
      task: {
        ...task,
        executionStatus: opened ? 'opened_externally' : 'failed',
        locationStatus: 'not_needed',
        externalUrl: searchUrl,
        externalLabel: useMaps ? 'Open in Google Maps' : 'Open Google Search',
      },
      replyText: opened
        ? lang === 'hi'
          ? `मैंने नए ब्राउज़र टैब में "${query}" के लिए खोज परिणाम खोल दिए हैं।`
          : lang === 'kn'
            ? `ಹೊಸ ಬ್ರೌಸರ್ ಟ್ಯಾಬ್‌ನಲ್ಲಿ "${query}" ಹುಡುಕಾಟ ಫಲಿತಾಂಶಗಳನ್ನು ತೆರೆದಿದ್ದೇನೆ.`
            : `I opened search results for "${query}" in a new browser tab.`
        : `Your browser blocked opening a new tab automatically. Please tap the search link button on screen.`,
    };
  }

  // 3. Messaging (Prepare WhatsApp prefilled link, NEVER send automatically)
  if (task.intent === 'messaging') {
    const content = (task.messageContent || '').trim();
    const recipient = (task.target || 'your contact').trim();
    if (!content) {
      return {
        task: { ...task, executionStatus: 'needs_info' },
        replyText:
          lang === 'hi'
            ? 'आप संदेश में क्या लिखना चाहते हैं?'
            : lang === 'kn'
              ? 'ಸಂದೇಶದಲ್ಲಿ ನೀವು ಏನು ಹೇಳಲು ಬಯಸುತ್ತೀರಿ?'
              : 'What would you like the message to say?',
      };
    }

    const waUrl = buildWhatsAppPrefilledUrl(content);
    const opened = adapter.openExternalUrl(waUrl);

    return {
      task: {
        ...task,
        executionStatus: opened ? 'opened_externally' : 'failed',
        externalUrl: waUrl,
        externalLabel: 'Open WhatsApp with Prefilled Draft',
        capabilityNote:
          'Message was prepared only and NOT sent. Select the contact and press Send in WhatsApp.',
      },
      replyText: opened
        ? lang === 'hi'
          ? `मैंने ${recipient} के लिए आपका तैयार संदेश ("${content}") WhatsApp में खोल दिया है। संदेश अभी भेजा नहीं गया है—कृपया ${recipient} को चुनकर स्वयं Send दबाएँ।`
          : lang === 'kn'
            ? `${recipient} ಅವರಿಗಾಗಿ ನಿಮ್ಮ ಸಿದ್ಧಪಡಿಸಿದ ಸಂದೇಶವನ್ನು ("${content}") WhatsApp ನಲ್ಲಿ ತೆರೆದಿದ್ದೇನೆ. ಸಂದೇಶ ಇನ್ನೂ ಕಳುಹಿಸಲ್ಪಟ್ಟಿಲ್ಲ—ದಯವಿಟ್ಟು ${recipient} ಅವರನ್ನು ಆಯ್ಕೆ ಮಾಡಿ ನೀವೇ Send ಒತ್ತಿರಿ.`
            : `I opened WhatsApp with your prepared message ("${content}") ready for ${recipient}. Sahaaya has not sent this message—please select ${recipient} in WhatsApp and press Send yourself.`
        : `Your browser blocked opening WhatsApp automatically. Please tap "Open WhatsApp with Prefilled Draft" on screen, then select ${recipient} and press Send yourself. The message has not been sent.`,
    };
  }

  return {
    task,
    replyText: '',
  };
}

export function buildApplicationReadout(
  data: ApplicationData,
  lang: LanguageCode
): string {
  const t = TRANSLATIONS[lang];
  const stats = getCompletionStats(data);
  const enteredItems = APPLICATION_FIELD_ORDER.filter(
    (key) => data[key].trim().length > 0
  ).map((key) => `${t.fields[key].label}: ${formatDisplayValue(key, data[key], lang)}`);

  const missingLabels = APPLICATION_FIELD_ORDER.filter(
    (key) => !data[key].trim()
  ).map((key) => t.fields[key].label);

  if (lang === 'hi') {
    const filledSummary =
      enteredItems.length > 0
        ? `अब तक भरी गई जानकारियाँ: ${enteredItems.join('; ')}।`
        : 'अभी तक कोई जानकारी नहीं भरी गई है।';
    const missingSummary =
      missingLabels.length > 0
        ? `बाकी ${missingLabels.length} जानकारियाँ हैं: ${missingLabels.join(', ')}।`
        : 'सभी 9 जानकारियाँ पूरी हो चुकी हैं और समीक्षा के लिए तैयार हैं।';
    return `आपके वरिष्ठ नागरिक कल्याण आवेदन में ${stats.totalCount} में से ${stats.filledCount} जानकारियाँ भरी हैं। ${filledSummary} ${missingSummary}`;
  }

  if (lang === 'kn') {
    const filledSummary =
      enteredItems.length > 0
        ? `ಇದುವರೆಗೆ ಭರ್ತಿ ಮಾಡಿದ ವಿವರಗಳು: ${enteredItems.join('; ')}.`
        : 'ಇದುವರೆಗೆ ಯಾವುದೇ ವಿವರ ಭರ್ತಿ ಮಾಡಿಲ್ಲ.';
    const missingSummary =
      missingLabels.length > 0
        ? `ಇನ್ನೂ ಬಾಕಿ ಇರುವ ${missingLabels.length} ವಿವರಗಳು: ${missingLabels.join(', ')}.`
        : 'ಎಲ್ಲಾ 9 ವಿವರಗಳು ಪೂರ್ಣಗೊಂಡಿವೆ ಮತ್ತು ಪರಿಶೀಲನೆಗೆ ಸಿದ್ಧವಾಗಿವೆ.';
    return `ನಿಮ್ಮ ಹಿರಿಯ ನಾಗರಿಕರ ಕಲ್ಯಾಣ ಅರ್ಜಿಯಲ್ಲಿ ${stats.totalCount} ರಲ್ಲಿ ${stats.filledCount} ವಿವರಗಳು ಪೂರ್ಣಗೊಂಡಿವೆ. ${filledSummary} ${missingSummary}`;
  }

  const filledSummary =
    enteredItems.length > 0
      ? `Entered details: ${enteredItems.join('; ')}.`
      : 'No details have been entered yet.';
  const missingSummary =
    missingLabels.length > 0
      ? `Still missing (${missingLabels.length}): ${missingLabels.join(', ')}.`
      : 'All 9 details are filled in and ready for your final review.';

  return `Your Senior Citizen Welfare Application has ${stats.filledCount} of ${stats.totalCount} details completed. ${filledSummary} ${missingSummary}`;
}

export function buildMissingFieldsExplanation(
  data: ApplicationData,
  lang: LanguageCode
): string {
  const t = TRANSLATIONS[lang];
  const missing = APPLICATION_FIELD_ORDER.filter((key) => !data[key].trim());
  const invalid = APPLICATION_FIELD_ORDER.filter(
    (key) => data[key].trim().length > 0 && validateField(key, data[key], lang) !== null
  );

  if (missing.length === 0 && invalid.length === 0) {
    if (lang === 'hi') {
      return 'सभी 9 जानकारियाँ सही ढंग से भरी जा चुकी हैं। कोई जानकारी बाकी नहीं है—आप "आवेदन जाँचें" पर जाकर समीक्षा कर सकते हैं।';
    }
    if (lang === 'kn') {
      return 'ಎಲ್ಲಾ 9 ವಿವರಗಳನ್ನು ಸರಿಯಾಗಿ ಭರ್ತಿ ಮಾಡಲಾಗಿದೆ. ಯಾವುದೇ ವಿವರ ಬಾಕಿ ಇಲ್ಲ—ನೀವು ಈಗ ಅರ್ಜಿಯನ್ನು ಪರಿಶೀಲಿಸಬಹುದು.';
    }
    return 'All 9 application fields are complete and valid. No fields are missing—you can open Review Application whenever you are ready.';
  }

  const missingDetails = missing.map(
    (key) => `${t.fields[key].label} (example: "${t.fields[key].example}")`
  );

  if (lang === 'hi') {
    const parts: string[] = [];
    if (missingDetails.length > 0) {
      parts.push(`अभी ${missingDetails.length} जानकारियाँ बाकी हैं: ${missingDetails.join('; ')}।`);
    }
    if (invalid.length > 0) {
      parts.push(
        `कृपया इन जानकारियों की जाँच करें: ${invalid.map((k) => t.fields[k].label).join(', ')}।`
      );
    }
    return parts.join(' ');
  }

  if (lang === 'kn') {
    const parts: string[] = [];
    if (missingDetails.length > 0) {
      parts.push(`ಇನ್ನೂ ${missingDetails.length} ವಿವರಗಳು ಬಾಕಿ ಇವೆ: ${missingDetails.join('; ')}.`);
    }
    if (invalid.length > 0) {
      parts.push(
        `ದಯವಿಟ್ಟು ಈ ವಿವರಗಳನ್ನು ಪರಿಶೀಲಿಸಿ: ${invalid.map((k) => t.fields[k].label).join(', ')}.`
      );
    }
    return parts.join(' ');
  }

  const parts: string[] = [];
  if (missingDetails.length > 0) {
    parts.push(
      `There ${missingDetails.length === 1 ? 'is 1 missing field' : `are ${missingDetails.length} missing fields`}: ${missingDetails.join('; ')}.`
    );
  }
  if (invalid.length > 0) {
    parts.push(
      `Also, please check: ${invalid.map((k) => t.fields[k].label).join(', ')}.`
    );
  }
  return parts.join(' ');
}
