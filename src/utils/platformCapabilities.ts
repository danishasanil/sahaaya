import {
  BrowserName,
  LanguageCode,
  PermissionStatus,
  PlatformCapabilities,
  PlatformType,
} from '../types/sahaaya';

export interface PlatformDetectionEnvironment {
  userAgent?: string;
  platform?: string;
  maxTouchPoints?: number;
  isSecureContext?: boolean;
  hasSpeechRecognition?: boolean;
  hasSpeechSynthesis?: boolean;
  hasGeolocation?: boolean;
  microphonePermission?: PermissionStatus;
  permissionsQuery?: (descriptor: { name: string }) => Promise<{ state: string }>;
}

export function detectPlatformType(
  userAgent: string,
  platform = '',
  maxTouchPoints = 0
): PlatformType {
  if (/Android/i.test(userAgent)) {
    return 'android';
  }
  if (
    /iPhone|iPad|iPod/i.test(userAgent) ||
    (/Macintosh|MacIntel/i.test(platform) && maxTouchPoints > 1)
  ) {
    return 'ios';
  }
  if (
    /Windows|Macintosh|Mac OS X|Linux|CrOS|X11/i.test(userAgent) ||
    /Win|Mac|Linux/i.test(platform)
  ) {
    return 'desktop';
  }
  return 'unknown';
}

export function detectBrowserName(userAgent: string): BrowserName {
  if (/SamsungBrowser\//i.test(userAgent)) return 'samsung-internet';
  if (/Edg\//i.test(userAgent) || /EdgA\//i.test(userAgent) || /EdgiOS\//i.test(userAgent)) {
    return 'edge';
  }
  if (/Firefox\//i.test(userAgent) || /FxiOS\//i.test(userAgent)) return 'firefox';
  if (/Chrome\//i.test(userAgent) || /CriOS\//i.test(userAgent)) return 'chrome';
  if (/Safari\//i.test(userAgent)) return 'safari';
  return 'unknown';
}

export function detectPlatformCapabilities(
  env?: PlatformDetectionEnvironment
): PlatformCapabilities {
  const hasWindow = typeof window !== 'undefined';
  const hasNavigator = typeof navigator !== 'undefined';

  const userAgent =
    env?.userAgent ?? (hasNavigator ? navigator.userAgent || '' : '');
  const navPlatform =
    env?.platform ?? (hasNavigator ? navigator.platform || '' : '');
  const maxTouchPoints =
    env?.maxTouchPoints ?? (hasNavigator ? navigator.maxTouchPoints || 0 : 0);

  const platform = detectPlatformType(userAgent, navPlatform, maxTouchPoints);
  const browser = detectBrowserName(userAgent);
  const isMobile = platform === 'android' || platform === 'ios';

  const isSecureContext =
    env?.isSecureContext ?? (hasWindow ? Boolean(window.isSecureContext) : false);

  const speechRecognitionSupported =
    env?.hasSpeechRecognition ??
    (hasWindow &&
      Boolean(
        (window as unknown as Record<string, unknown>).SpeechRecognition ||
          (window as unknown as Record<string, unknown>).webkitSpeechRecognition
      ));

  const speechSynthesisSupported =
    env?.hasSpeechSynthesis ??
    (hasWindow && 'speechSynthesis' in window);

  const geolocationSupported =
    env?.hasGeolocation ??
    (hasNavigator && 'geolocation' in navigator);

  const microphonePermission: PermissionStatus =
    env?.microphonePermission ??
    (speechRecognitionSupported ? 'prompt' : 'unsupported');

  return {
    platform,
    browser,
    isMobile,
    isSecureContext,
    speechRecognitionSupported,
    speechSynthesisSupported,
    geolocationSupported,
    microphonePermission,
    canOpenExternalWebsites: true,
    canControlExternalApps: false,
    canReadExternalScreens: false,
    canSendMessagesDirectly: false,
  };
}

export async function queryMicrophonePermission(
  env?: PlatformDetectionEnvironment
): Promise<PermissionStatus> {
  if (env?.microphonePermission) {
    return env.microphonePermission;
  }

  const queryFn =
    env?.permissionsQuery ??
    (typeof navigator !== 'undefined' && navigator.permissions?.query
      ? (desc: { name: string }) =>
          navigator.permissions.query(desc as PermissionDescriptor)
      : undefined);

  if (!queryFn) {
    const caps = detectPlatformCapabilities(env);
    return caps.speechRecognitionSupported ? 'prompt' : 'unsupported';
  }

  try {
    const status = await queryFn({ name: 'microphone' });
    if (
      status.state === 'granted' ||
      status.state === 'denied' ||
      status.state === 'prompt'
    ) {
      return status.state;
    }
    return 'prompt';
  } catch {
    const caps = detectPlatformCapabilities(env);
    return caps.speechRecognitionSupported ? 'prompt' : 'unsupported';
  }
}

export function formatPlatformSummary(
  caps: PlatformCapabilities,
  lang: LanguageCode = 'en'
): string {
  const platformLabel =
    caps.platform === 'android'
      ? 'Android Browser'
      : caps.platform === 'ios'
        ? 'iOS Browser'
        : caps.platform === 'desktop'
          ? 'Desktop Browser'
          : 'Web Browser';

  const browserLabel =
    caps.browser === 'chrome'
      ? 'Chrome'
      : caps.browser === 'edge'
        ? 'Edge'
        : caps.browser === 'safari'
          ? 'Safari'
          : caps.browser === 'firefox'
            ? 'Firefox'
            : caps.browser === 'samsung-internet'
              ? 'Samsung Internet'
              : 'Standard Browser';

  if (lang === 'hi') {
    return `${platformLabel} · ${browserLabel}`;
  }
  if (lang === 'kn') {
    return `${platformLabel} · ${browserLabel}`;
  }
  return `${platformLabel} · ${browserLabel}`;
}
