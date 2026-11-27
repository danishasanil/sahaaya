import { AssistantTask } from '../types/sahaaya';
import {
  DemoAppId,
  DemoMapPlaceItem,
  DemoSearchResultItem,
  DemoSpotifyTrackItem,
} from '../types/demoExecution';
import {
  buildDirectionsUrl,
  buildSearchUrl,
  buildSpotifySearchUrl,
  buildWhatsAppPrefilledUrl,
  buildYouTubeSearchUrl,
} from './platformExecutor';

export interface DemoAppDescriptor {
  id: DemoAppId;
  name: string;
  supportsRealBrowser: boolean;
  requiresSensitiveConfirmation: boolean;
  description: string;
}

export const DEMO_APP_REGISTRY: Record<DemoAppId, DemoAppDescriptor> = {
  whatsapp: {
    id: 'whatsapp',
    name: 'WhatsApp',
    supportsRealBrowser: true,
    requiresSensitiveConfirmation: true,
    description: 'Messaging preview in Demo Mode or prefilled wa.me draft in Real Browser Mode.',
  },
  youtube: {
    id: 'youtube',
    name: 'YouTube',
    supportsRealBrowser: true,
    requiresSensitiveConfirmation: true,
    description: 'Simulated YouTube player card in Demo Mode or official YouTube website/search in Real Browser Mode.',
  },
  chrome: {
    id: 'chrome',
    name: 'Google Chrome',
    supportsRealBrowser: true,
    requiresSensitiveConfirmation: true,
    description: 'Simulated smartphone browser view in Demo Mode or Google Search tab in Real Browser Mode.',
  },
  maps: {
    id: 'maps',
    name: 'Google Maps',
    supportsRealBrowser: true,
    requiresSensitiveConfirmation: true,
    description: 'Simulated Maps view with example data (or permitted location) in Demo Mode, or Google Maps in Real Browser Mode.',
  },
  camera: {
    id: 'camera',
    name: 'Camera',
    supportsRealBrowser: false,
    requiresSensitiveConfirmation: false,
    description: 'Native device camera simulated inside Sahaaya Demo Mode.',
  },
  settings: {
    id: 'settings',
    name: 'Settings',
    supportsRealBrowser: false,
    requiresSensitiveConfirmation: false,
    description: 'Native device settings simulated inside Sahaaya Demo Mode.',
  },
  phone: {
    id: 'phone',
    name: 'Phone',
    supportsRealBrowser: false,
    requiresSensitiveConfirmation: false,
    description: 'Native phone dialer simulated inside Sahaaya Demo Mode.',
  },
  messages: {
    id: 'messages',
    name: 'Messages',
    supportsRealBrowser: false,
    requiresSensitiveConfirmation: false,
    description: 'Simulated SMS messages view inside Sahaaya Demo Mode.',
  },
  calculator: {
    id: 'calculator',
    name: 'Calculator',
    supportsRealBrowser: false,
    requiresSensitiveConfirmation: false,
    description: 'Interactive deterministic calculator inside Sahaaya Demo Mode.',
  },
  calendar: {
    id: 'calendar',
    name: 'Calendar',
    supportsRealBrowser: false,
    requiresSensitiveConfirmation: false,
    description: 'Simulated monthly calendar and local demo event schedule inside Sahaaya Demo Mode.',
  },
  spotify: {
    id: 'spotify',
    name: 'Spotify',
    supportsRealBrowser: true,
    requiresSensitiveConfirmation: true,
    description: 'Simulated Spotify search & preview player in Demo Mode, or official Spotify Web in Real Browser Mode.',
  },
  welfare_form: {
    id: 'welfare_form',
    name: 'Welfare Application',
    supportsRealBrowser: true,
    requiresSensitiveConfirmation: true,
    description: 'Interactive Senior Citizen Welfare Application form simulation.',
  },
  sahaaya_home: {
    id: 'sahaaya_home',
    name: 'Sahaaya Assistant',
    supportsRealBrowser: true,
    requiresSensitiveConfirmation: false,
    description: 'In-app Sahaaya navigation and accessibility guidance.',
  },
};

export function resolveDemoAppId(task: AssistantTask): DemoAppId {
  const appLower = (task.application || '').toLowerCase();
  if (appLower.includes('spotify') || task.action === 'play_music' || task.action === 'search_spotify') {
    return 'spotify';
  }
  if (appLower.includes('calendar') || task.action === 'add_calendar_event' || task.action === 'open_calendar' || task.action === 'show_calendar_events' || task.action === 'delete_calendar_event') {
    return 'calendar';
  }
  if (appLower.includes('calculator') || task.action === 'calculate') {
    return 'calculator';
  }
  if (appLower === 'messages' || appLower === 'sms') {
    return 'messages';
  }
  if (task.intent === 'messaging' || appLower.includes('whatsapp')) {
    return 'whatsapp';
  }
  if (appLower.includes('youtube') || task.action === 'play_video' || task.action === 'search_youtube') {
    return 'youtube';
  }
  if (appLower.includes('chrome')) {
    return 'chrome';
  }
  if (appLower.includes('maps') || task.action === 'directions' || task.requiresLocation) {
    return 'maps';
  }
  if (
    appLower.includes('google') ||
    task.intent === 'search'
  ) {
    return 'chrome';
  }
  if (appLower.includes('camera')) return 'camera';
  if (appLower.includes('settings')) return 'settings';
  if (appLower.includes('phone') || appLower.includes('dialer')) return 'phone';
  if (task.intent === 'application_task') return 'welfare_form';
  return 'sahaaya_home';
}

export function getRealUrlForTask(
  task: AssistantTask,
  appId: DemoAppId,
  coords?: { latitude: number; longitude: number } | null
): string | null {
  if (appId === 'whatsapp') {
    return task.messageContent
      ? buildWhatsAppPrefilledUrl(task.messageContent)
      : 'https://web.whatsapp.com';
  }
  if (appId === 'youtube') {
    const query = task.target && task.target !== 'YouTube' ? task.target : '';
    return query ? buildYouTubeSearchUrl(query) : 'https://www.youtube.com';
  }
  if (appId === 'spotify') {
    const query = task.target && task.target !== 'Spotify' ? task.target : '';
    return query ? buildSpotifySearchUrl(query) : 'https://open.spotify.com';
  }
  if (appId === 'maps') {
    if (task.action === 'directions' && task.target) {
      return buildDirectionsUrl(task.target, coords);
    }
    const query = task.target && task.target !== 'Google Maps' ? task.target : '';
    return query ? buildSearchUrl(query, true, coords) : 'https://maps.google.com';
  }
  if (appId === 'chrome') {
    const query =
      task.target && task.target !== 'Chrome' && task.target !== 'Google'
        ? task.target
        : '';
    return query ? buildSearchUrl(query, false, null) : 'https://www.google.com';
  }
  return null;
}

export function buildExampleSpotifyTracks(query: string): DemoSpotifyTrackItem[] {
  const clean = query.trim() || 'Relaxing Music';
  return [
    {
      id: 'sp-1',
      title: `${clean} — Peaceful Selection (Demo)`,
      artist: 'Sahaaya Simulated Music Preview',
      duration: '04:12',
      album: 'Accessible Audio Collection (Demo)',
    },
    {
      id: 'sp-2',
      title: `${clean} — Evening Classics (Demo)`,
      artist: 'Simulated Track Listing',
      duration: '05:08',
      album: 'Calm Listening Demo',
    },
    {
      id: 'sp-3',
      title: `${clean} — Acoustic & Devotional Mix (Demo)`,
      artist: 'Simulated Track Listing',
      duration: '03:46',
      album: 'Demo Playlist',
    },
  ];
}

export function buildExampleSearchResults(query: string): DemoSearchResultItem[] {
  const clean = query.trim() || 'Indian citizen services';
  const encoded = encodeURIComponent(clean);
  if (/scholarship|छात्रवृत्ति|ವಿದ್ಯಾರ್ಥಿವೇತನ/i.test(clean)) {
    return [
      {
        title: `National Scholarship Portal (NSP) — ${clean}`,
        domain: 'scholarships.gov.in (Demonstration Card)',
        summary:
          'Central government scholarship portal for school, undergraduate, engineering, and postgraduate schemes in India. Tap "Open Real Google Search" below for live listings.',
        url: `https://www.google.com/search?q=${encoded}`,
        isExample: true,
      },
      {
        title: `State & Merit Scholarships Guide — ${clean}`,
        domain: 'ssp.karnataka.gov.in / myscheme.gov.in (Demonstration Card)',
        summary:
          'Simulated preview showing eligibility checklists, required income & caste/study certificates, and application timelines.',
        url: `https://www.google.com/search?q=${encoded}`,
        isExample: true,
      },
    ];
  }
  if (/pension|welfare|scheme|government|senior/i.test(clean)) {
    return [
      {
        title: `Example Result: Official Portal Information — ${clean}`,
        domain: 'india.gov.in (Demonstration Card)',
        summary:
          'Sample summary card showing how Sahaaya reads scheme eligibility, required documents, and step-by-step guidance aloud.',
        url: `https://www.google.com/search?q=${encoded}`,
        isExample: true,
      },
      {
        title: `Example Result: Senior Citizen Benefits & Helpline Guide`,
        domain: 'socialjustice.gov.in (Demonstration Card)',
        summary:
          'Simulated preview entry for hackathon demonstration. Tap "Open Real Google Search" below to view live web results.',
        url: `https://www.google.com/search?q=${encoded}`,
        isExample: true,
      },
    ];
  }

  return [
    {
      title: `Example Result: Guide for "${clean}"`,
      domain: 'google.com (Demonstration Preview)',
      summary:
        'Simulated smartphone search result card. No external search API is queried until you open real Google Search.',
      url: `https://www.google.com/search?q=${encoded}`,
      isExample: true,
    },
    {
      title: `Example Result: Accessible Summary for "${clean}"`,
      domain: 'sahaaya.demo (Demonstration Preview)',
      summary:
        'In a full Android assistant, Sahaaya summarizes top results in large text and reads them aloud clearly.',
      url: `https://www.google.com/search?q=${encoded}`,
      isExample: true,
    },
  ];
}

export function buildExampleMapPlaces(query: string): DemoMapPlaceItem[] {
  const lower = query.toLowerCase();
  if (/pharmacy|medical|chemist|medicine/i.test(lower)) {
    return [
      {
        name: 'Example Pharmacy A (Demo Data)',
        distance: '0.6 km · ~4 min',
        note: 'Simulated sample listing — not live GPS data',
        isExample: true,
      },
      {
        name: 'Example Jan Aushadhi Kendra (Demo Data)',
        distance: '1.2 km · ~7 min',
        note: 'Simulated sample listing — not live GPS data',
        isExample: true,
      },
    ];
  }

  if (/hospital|clinic|doctor/i.test(lower)) {
    return [
      {
        name: 'Example Community Hospital (Demo Data)',
        distance: '1.4 km · ~6 min',
        note: 'Simulated sample listing — not live GPS data',
        isExample: true,
      },
      {
        name: 'Example Senior Care Clinic (Demo Data)',
        distance: '2.1 km · ~9 min',
        note: 'Simulated sample listing — not live GPS data',
        isExample: true,
      },
    ];
  }

  if (/restaurant|food|hotel|dining|eat|cafe/i.test(lower)) {
    return [
      {
        name: 'Example Family Restaurant (Demo Data)',
        distance: '0.5 km · ~3 min',
        note: 'Simulated sample listing — not live GPS data',
        isExample: true,
      },
      {
        name: 'Example Tiffin & Meals Corner (Demo Data)',
        distance: '1.1 km · ~6 min',
        note: 'Simulated sample listing — not live GPS data',
        isExample: true,
      },
    ];
  }

  if (/\batm\b|bank|cash/i.test(lower)) {
    return [
      {
        name: 'Example National Bank ATM (Demo Data)',
        distance: '0.4 km · ~3 min',
        note: 'Simulated sample listing — not live GPS data',
        isExample: true,
      },
      {
        name: 'Example Public Bank Branch & ATM (Demo Data)',
        distance: '0.9 km · ~5 min',
        note: 'Simulated sample listing — not live GPS data',
        isExample: true,
      },
    ];
  }

  if (/grocery|groceries|supermarket|kirana|store|vegetables|market/i.test(lower)) {
    return [
      {
        name: 'Example Neighborhood Grocery Store (Demo Data)',
        distance: '0.4 km · ~3 min',
        note: 'Simulated sample listing — not live GPS data',
        isExample: true,
      },
      {
        name: 'Example Fresh Mart Supermarket (Demo Data)',
        distance: '1.0 km · ~5 min',
        note: 'Simulated sample listing — not live GPS data',
        isExample: true,
      },
    ];
  }

  if (/petrol|fuel|gas|pump|diesel/i.test(lower)) {
    return [
      {
        name: 'Example City Petrol Pump (Demo Data)',
        distance: '0.8 km · ~4 min',
        note: 'Simulated sample listing — not live GPS data',
        isExample: true,
      },
      {
        name: 'Example Highway Fuel Station (Demo Data)',
        distance: '1.6 km · ~7 min',
        note: 'Simulated sample listing — not live GPS data',
        isExample: true,
      },
    ];
  }

  return [
    {
      name: `Example ${query || 'Local Center'} (Demo Data)`,
      distance: '1.8 km · ~8 min',
      note: 'Simulated demonstration listing — enable Real Browser Mode for live Google Maps',
      isExample: true,
    },
  ];
}
