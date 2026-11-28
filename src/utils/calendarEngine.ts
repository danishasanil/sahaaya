import { DemoCalendarEvent } from '../types/demoExecution';
import { LanguageCode } from '../types/sahaaya';

const CALENDAR_STORAGE_KEY = 'sahaaya_demo_calendar_events_v1';

export interface CalendarGridCell {
  dateStr: string;
  dayNumber: number;
  inCurrentMonth: boolean;
  isToday: boolean;
}

export function formatIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function buildCalendarMonthGrid(
  year: number,
  monthIndex: number,
  referenceDate: Date = new Date()
): {
  monthLabel: string;
  cells: CalendarGridCell[];
} {
  const firstOfMonth = new Date(year, monthIndex, 1);
  const startWeekday = firstOfMonth.getDay(); // 0=Sun..6=Sat
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, monthIndex, 0).getDate();
  const todayStr = formatIsoDate(referenceDate);

  const cells: CalendarGridCell[] = [];

  for (let i = startWeekday - 1; i >= 0; i -= 1) {
    const dayNum = daysInPrevMonth - i;
    const d = new Date(year, monthIndex - 1, dayNum);
    const dateStr = formatIsoDate(d);
    cells.push({
      dateStr,
      dayNumber: dayNum,
      inCurrentMonth: false,
      isToday: dateStr === todayStr,
    });
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const d = new Date(year, monthIndex, day);
    const dateStr = formatIsoDate(d);
    cells.push({
      dateStr,
      dayNumber: day,
      inCurrentMonth: true,
      isToday: dateStr === todayStr,
    });
  }

  let nextDay = 1;
  while (cells.length % 7 !== 0 || cells.length < 35) {
    const d = new Date(year, monthIndex + 1, nextDay);
    const dateStr = formatIsoDate(d);
    cells.push({
      dateStr,
      dayNumber: nextDay,
      inCurrentMonth: false,
      isToday: dateStr === todayStr,
    });
    nextDay += 1;
  }

  const monthLabel = firstOfMonth.toLocaleString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  return { monthLabel, cells };
}

export function loadDemoCalendarEvents(): DemoCalendarEvent[] {
  try {
    if (typeof localStorage === 'undefined') return [];
    const raw = localStorage.getItem(CALENDAR_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as DemoCalendarEvent[]) : [];
  } catch {
    return [];
  }
}

export function saveDemoCalendarEvents(events: DemoCalendarEvent[]): void {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(CALENDAR_STORAGE_KEY, JSON.stringify(events));
  } catch {
    // Ignore storage quota errors
  }
}

export function createDemoCalendarEvent(
  title: string,
  date: string,
  time: string
): DemoCalendarEvent {
  return {
    id: `cal-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    title: title.trim() || 'Reminder',
    date,
    time: time.trim() || 'All day',
    simulated: true,
    createdAt: new Date().toISOString(),
  };
}

export function addDemoCalendarEventToStore(
  event: DemoCalendarEvent,
  existing?: DemoCalendarEvent[]
): DemoCalendarEvent[] {
  const base = existing ?? loadDemoCalendarEvents();
  const next = [...base, event].sort((a, b) =>
    `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`)
  );
  saveDemoCalendarEvents(next);
  return next;
}

export function updateDemoCalendarEventInStore(
  eventIdOrQuery: string,
  patch: Partial<Pick<DemoCalendarEvent, 'title' | 'date' | 'time'>>,
  existing?: DemoCalendarEvent[]
): { events: DemoCalendarEvent[]; updated: DemoCalendarEvent | null } {
  const base = existing ?? loadDemoCalendarEvents();
  if (base.length === 0) return { events: [], updated: null };

  let targetIdx = base.findIndex((e) => e.id === eventIdOrQuery);
  if (targetIdx < 0 && eventIdOrQuery.trim()) {
    const lower = eventIdOrQuery.toLowerCase();
    targetIdx = base.findIndex(
      (e) =>
        e.title.toLowerCase().includes(lower) ||
        lower.includes(e.title.toLowerCase())
    );
  }
  if (targetIdx < 0) targetIdx = base.length - 1;

  const target = base[targetIdx];
  const updated: DemoCalendarEvent = {
    ...target,
    title: patch.title !== undefined ? patch.title.trim() || target.title : target.title,
    date: patch.date !== undefined ? patch.date : target.date,
    time: patch.time !== undefined ? patch.time.trim() || target.time : target.time,
  };
  const next = base
    .map((ev, idx) => (idx === targetIdx ? updated : ev))
    .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));
  saveDemoCalendarEvents(next);
  return { events: next, updated };
}

export function deleteDemoCalendarEventFromStore(
  eventIdOrQuery: string,
  existing?: DemoCalendarEvent[]
): { events: DemoCalendarEvent[]; removed: DemoCalendarEvent | null } {
  const base = existing ?? loadDemoCalendarEvents();
  if (base.length === 0) return { events: [], removed: null };

  const byIdIdx = base.findIndex((e) => e.id === eventIdOrQuery);
  if (byIdIdx >= 0) {
    const removed = base[byIdIdx];
    const next = base.filter((_, idx) => idx !== byIdIdx);
    saveDemoCalendarEvents(next);
    return { events: next, removed };
  }

  const lower = eventIdOrQuery.toLowerCase();
  const byTitleIdx = base.findIndex(
    (e) =>
      e.title.toLowerCase().includes(lower) ||
      lower.includes(e.title.toLowerCase())
  );
  const targetIdx = byTitleIdx >= 0 ? byTitleIdx : base.length - 1;
  const removed = base[targetIdx];
  const next = base.filter((_, idx) => idx !== targetIdx);
  saveDemoCalendarEvents(next);
  return { events: next, removed };
}

const WEEKDAYS = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
];

const MONTHS_INDEX: Record<string, { month: number; name: string }> = {
  january: { month: 0, name: 'January' },
  jan: { month: 0, name: 'January' },
  जनवरी: { month: 0, name: 'January' },
  ಜನವರಿ: { month: 0, name: 'January' },
  february: { month: 1, name: 'February' },
  feb: { month: 1, name: 'February' },
  फरवरी: { month: 1, name: 'February' },
  ಫೆಬ್ರವರಿ: { month: 1, name: 'February' },
  march: { month: 2, name: 'March' },
  mar: { month: 2, name: 'March' },
  मार्च: { month: 2, name: 'March' },
  ಮಾರ್ಚ್: { month: 2, name: 'March' },
  april: { month: 3, name: 'April' },
  apr: { month: 3, name: 'April' },
  अप्रैल: { month: 3, name: 'April' },
  ಏಪ್ರಿಲ್: { month: 3, name: 'April' },
  may: { month: 4, name: 'May' },
  मई: { month: 4, name: 'May' },
  ಮೇ: { month: 4, name: 'May' },
  june: { month: 5, name: 'June' },
  jun: { month: 5, name: 'June' },
  जून: { month: 5, name: 'June' },
  ಜೂನ್: { month: 5, name: 'June' },
  july: { month: 6, name: 'July' },
  jul: { month: 6, name: 'July' },
  जुलाई: { month: 6, name: 'July' },
  ಜುಲೈ: { month: 6, name: 'July' },
  august: { month: 7, name: 'August' },
  aug: { month: 7, name: 'August' },
  अगस्त: { month: 7, name: 'August' },
  ಆಗಸ್ಟ್: { month: 7, name: 'August' },
  september: { month: 8, name: 'September' },
  sep: { month: 8, name: 'September' },
  sept: { month: 8, name: 'September' },
  सितंबर: { month: 8, name: 'September' },
  ಸೆಪ್ಟೆಂಬರ್: { month: 8, name: 'September' },
  october: { month: 9, name: 'October' },
  oct: { month: 9, name: 'October' },
  अक्टूबर: { month: 9, name: 'October' },
  ಅಕ್ಟೋಬರ್: { month: 9, name: 'October' },
  november: { month: 10, name: 'November' },
  nov: { month: 10, name: 'November' },
  नवंबर: { month: 10, name: 'November' },
  ನವೆಂಬರ್: { month: 10, name: 'November' },
  december: { month: 11, name: 'December' },
  dec: { month: 11, name: 'December' },
  दिसंबर: { month: 11, name: 'December' },
  ಡಿಸೆಂಬರ್: { month: 11, name: 'December' },
};

function formatDayOrdinal(day: number): string {
  const mod100 = day % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${day}th`;
  switch (day % 10) {
    case 1:
      return `${day}st`;
    case 2:
      return `${day}nd`;
    case 3:
      return `${day}rd`;
    default:
      return `${day}th`;
  }
}

function normalizeIndicDigits(rawText: string): string {
  return rawText
    .replace(/[०-९]/g, (ch) => String(ch.charCodeAt(0) - 0x0966))
    .replace(/[೦-೯]/g, (ch) => String(ch.charCodeAt(0) - 0x0ce6));
}

export function extractDateFromText(
  rawText: string,
  referenceDate: Date = new Date()
): { date: string | null; label: string | null } {
  const normalized = normalizeIndicDigits(rawText);
  const lower = normalized.toLowerCase();

  if (/\btoday\b|आज|ಇಂದು|ಇವತ್ತು/.test(lower)) {
    return { date: formatIsoDate(referenceDate), label: 'today' };
  }
  if (/\btomorrow\b|कल|ನಾಳೆ/.test(lower)) {
    const d = new Date(referenceDate);
    d.setDate(d.getDate() + 1);
    return { date: formatIsoDate(d), label: 'tomorrow' };
  }
  if (/\bday\s+after\s+tomorrow\b|परसों|ನಾಡಿದ್ದು/.test(lower)) {
    const d = new Date(referenceDate);
    d.setDate(d.getDate() + 2);
    return { date: formatIsoDate(d), label: 'day after tomorrow' };
  }

  for (let i = 0; i < WEEKDAYS.length; i += 1) {
    const re = new RegExp(`\\b${WEEKDAYS[i]}\\b`, 'i');
    if (re.test(lower)) {
      const currentDay = referenceDate.getDay();
      let diff = (i - currentDay + 7) % 7;
      if (diff === 0) diff = 7;
      const d = new Date(referenceDate);
      d.setDate(d.getDate() + diff);
      return {
        date: formatIsoDate(d),
        label: WEEKDAYS[i].charAt(0).toUpperCase() + WEEKDAYS[i].slice(1),
      };
    }
  }

  const isoMatch = normalized.match(/\b(\d{4}-\d{2}-\d{2})\b/);
  if (isoMatch) {
    return { date: isoMatch[1], label: isoMatch[1] };
  }

  // Month-day or day-month phrases: "30th November", "November 30", "30 Nov 2026", "30 नवंबर", "ನವೆಂಬರ್ 30"
  const monthKeys = Object.keys(MONTHS_INDEX).join('|');
  const dayFirstRe = new RegExp(
    `(\\d{1,2})(?:st|nd|rd|th)?\\s+(?:of\\s+)?(${monthKeys})(?:[,\\s]+(\\d{4}))?`,
    'i'
  );
  const dayFirstMatch = normalized.match(dayFirstRe);
  if (dayFirstMatch) {
    const day = Number(dayFirstMatch[1]);
    const monthEntry = MONTHS_INDEX[dayFirstMatch[2].toLowerCase()] || MONTHS_INDEX[dayFirstMatch[2]];
    const year = dayFirstMatch[3] ? Number(dayFirstMatch[3]) : referenceDate.getFullYear();
    if (monthEntry && day >= 1 && day <= 31) {
      const d = new Date(year, monthEntry.month, day);
      if (d.getMonth() === monthEntry.month && d.getDate() === day) {
        return {
          date: formatIsoDate(d),
          label: `${formatDayOrdinal(day)} ${monthEntry.name}`,
        };
      }
    }
  }

  const monthFirstRe = new RegExp(
    `(${monthKeys})\\s+(\\d{1,2})(?:st|nd|rd|th)?(?:[,\\s]+(\\d{4}))?`,
    'i'
  );
  const monthFirstMatch = normalized.match(monthFirstRe);
  if (monthFirstMatch) {
    const monthEntry = MONTHS_INDEX[monthFirstMatch[1].toLowerCase()] || MONTHS_INDEX[monthFirstMatch[1]];
    const day = Number(monthFirstMatch[2]);
    const year = monthFirstMatch[3] ? Number(monthFirstMatch[3]) : referenceDate.getFullYear();
    if (monthEntry && day >= 1 && day <= 31) {
      const d = new Date(year, monthEntry.month, day);
      if (d.getMonth() === monthEntry.month && d.getDate() === day) {
        return {
          date: formatIsoDate(d),
          label: `${formatDayOrdinal(day)} ${monthEntry.name}`,
        };
      }
    }
  }

  // Numeric DD/MM or DD/MM/YYYY (e.g. 30/11 or 30-11-2026)
  const dmyMatch = normalized.match(/\b(\d{1,2})[/-](\d{1,2})(?:[/-](\d{4}))?\b/);
  if (dmyMatch) {
    const day = Number(dmyMatch[1]);
    const monthNum = Number(dmyMatch[2]) - 1;
    const year = dmyMatch[3] ? Number(dmyMatch[3]) : referenceDate.getFullYear();
    if (monthNum >= 0 && monthNum <= 11 && day >= 1 && day <= 31) {
      const d = new Date(year, monthNum, day);
      if (d.getMonth() === monthNum && d.getDate() === day) {
        const monthName = d.toLocaleString('en-US', { month: 'long' });
        return {
          date: formatIsoDate(d),
          label: `${formatDayOrdinal(day)} ${monthName}`,
        };
      }
    }
  }

  return { date: null, label: null };
}

export type TimePeriod = 'morning' | 'afternoon' | 'evening' | 'night';

export interface ExtractedTimeDetails {
  time24: string | null;
  displayTime: string | null;
  period: TimePeriod | null;
}

const SPOKEN_HOUR_MAP: Record<string, number> = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  एक: 1,
  दो: 2,
  तीन: 3,
  चार: 4,
  पांच: 5,
  पाँच: 5,
  छह: 6,
  छः: 6,
  सात: 7,
  आठ: 8,
  नौ: 9,
  दस: 10,
  ग्यारह: 11,
  बारह: 12,
  ಒಂದು: 1,
  ಎರಡು: 2,
  ಮೂರು: 3,
  ನಾಲ್ಕು: 4,
  ಐದು: 5,
  ಆರು: 6,
  ಏಳು: 7,
  ಎಂಟು: 8,
  ಒಂಬತ್ತು: 9,
  ಹತ್ತು: 10,
  ಹನ್ನೊಂದು: 11,
  ಹನ್ನೆರಡು: 12,
};

function detectExplicitPeriod(rawText: string): TimePeriod | null {
  if (/\bmorning\b|सुबह|सवेरे|ಬೆಳಗ್ಗೆ|ಬೆಳಿಗ್ಗೆ/i.test(rawText)) return 'morning';
  if (/\bafternoon\b|दोपहर|ಮಧ್ಯಾಹ್ನ/i.test(rawText)) return 'afternoon';
  if (/\bevening\b|शाम|ಸಂಜೆ/i.test(rawText)) return 'evening';
  if (/\bnight\b|रात|ರಾತ್ರಿ/i.test(rawText)) return 'night';
  return null;
}

function to24Hour(hour: number, meridiem: 'AM' | 'PM' | null, explicitPeriod: TimePeriod | null): number {
  let h = hour;
  if (meridiem === 'AM') {
    if (h === 12) h = 0;
  } else if (meridiem === 'PM') {
    if (h >= 1 && h <= 11) h += 12;
  } else if (explicitPeriod === 'afternoon' || explicitPeriod === 'evening' || explicitPeriod === 'night') {
    if (h >= 1 && h <= 11 && !(explicitPeriod === 'night' && h === 12)) {
      if (explicitPeriod === 'night' && h <= 3) {
        // e.g. 2 at night -> 02:00
      } else {
        h += 12;
      }
    }
    if (explicitPeriod === 'night' && h === 12) {
      h = 0;
    }
  }
  return h;
}

function inferPeriodFrom24Hour(hour24: number): TimePeriod {
  if (hour24 >= 4 && hour24 < 12) return 'morning';
  if (hour24 >= 12 && hour24 < 17) return 'afternoon';
  if (hour24 >= 17 && hour24 < 21) return 'evening';
  return 'night';
}

export function extractTimeDetailsFromText(rawText: string): ExtractedTimeDetails {
  const normalized = normalizeIndicDigits(rawText);
  const explicitPeriod = detectExplicitPeriod(normalized);

  // 1. 12-hour format with AM/PM: "5 AM", "5:30 pm"
  const time12 = normalized.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i);
  if (time12) {
    const rawHr = Number(time12[1]);
    const min = time12[2] || '00';
    const mer = time12[3].toUpperCase() as 'AM' | 'PM';
    if (rawHr >= 1 && rawHr <= 12) {
      const hr24 = to24Hour(rawHr, mer, explicitPeriod);
      const time24 = `${String(hr24).padStart(2, '0')}:${min}`;
      return {
        time24,
        displayTime: `${time12[1]}:${min} ${mer}`,
        period: explicitPeriod || inferPeriodFrom24Hour(hr24),
      };
    }
  }

  // 2. Numeric time with colon: "5:00", "14:30" (supports Kannada/Hindi suffix after it)
  const time24Match = normalized.match(/(?:^|\s|at\s+)([01]?\d|2[0-3]):([0-5]\d)(?=\s|$|[.,!?।]|ಗಂಟೆ|बजे)/i);
  if (time24Match) {
    const rawHr = Number(time24Match[1]);
    const min = time24Match[2];
    const hr24 = to24Hour(rawHr, null, explicitPeriod);
    const time24 = `${String(hr24).padStart(2, '0')}:${min}`;
    return {
      time24,
      displayTime: time24,
      period: explicitPeriod || inferPeriodFrom24Hour(hr24),
    };
  }

  // 3. Numeric hour with Kannada/Hindi/English hour unit: "5 ಗಂಟೆಗೆ", "5 बजे", "5 o'clock"
  const unitNumericMatch = normalized.match(
    /(?:^|\s)(\d{1,2})\s*(?:ಗಂಟೆಗೆ|ಗಂಟೆ|बजे|o'clock|oclock)(?=\s|$|[.,!?।])/i
  );
  if (unitNumericMatch) {
    const rawHr = Number(unitNumericMatch[1]);
    if (rawHr >= 0 && rawHr <= 23) {
      const hr24 = to24Hour(rawHr, null, explicitPeriod);
      const time24 = `${String(hr24).padStart(2, '0')}:00`;
      return {
        time24,
        displayTime: time24,
        period: explicitPeriod || inferPeriodFrom24Hour(hr24),
      };
    }
  }

  // 4. Spoken number words with hour unit: "ಐದು ಗಂಟೆಗೆ", "पांच बजे", "five o'clock"
  const spokenKeys = Object.keys(SPOKEN_HOUR_MAP).join('|');
  const spokenUnitRe = new RegExp(
    `(?:^|\\s)(${spokenKeys})\\s*(?:ಗಂಟೆಗೆ|ಗಂಟೆ|बजे|o'clock|oclock)(?=\\s|$|[.,!?।])`,
    'i'
  );
  const spokenMatch = normalized.match(spokenUnitRe);
  if (spokenMatch) {
    const token = spokenMatch[1];
    const rawHr = SPOKEN_HOUR_MAP[token] ?? SPOKEN_HOUR_MAP[token.toLowerCase()];
    if (rawHr !== undefined) {
      const hr24 = to24Hour(rawHr, null, explicitPeriod);
      const time24 = `${String(hr24).padStart(2, '0')}:00`;
      return {
        time24,
        displayTime: time24,
        period: explicitPeriod || inferPeriodFrom24Hour(hr24),
      };
    }
  }

  // 5. All day
  if (/\ball\s+day\b|\bno\s+specific\s+time\b|\banytime\b/i.test(normalized)) {
    return {
      time24: null,
      displayTime: 'All day',
      period: null,
    };
  }

  // 6. Period-only fallback
  if (explicitPeriod === 'morning') {
    return { time24: '09:00', displayTime: '09:00 AM', period: 'morning' };
  }
  if (explicitPeriod === 'afternoon') {
    return { time24: '14:00', displayTime: '02:00 PM', period: 'afternoon' };
  }
  if (explicitPeriod === 'evening') {
    return { time24: '18:00', displayTime: '06:00 PM', period: 'evening' };
  }
  if (explicitPeriod === 'night') {
    return { time24: '21:00', displayTime: '09:00 PM', period: 'night' };
  }

  return { time24: null, displayTime: null, period: null };
}

export function extractTimeFromText(rawText: string): string | null {
  return extractTimeDetailsFromText(rawText).displayTime;
}

export interface CalendarCommandExtraction {
  matched: boolean;
  subAction: 'open_calendar' | 'show_upcoming' | 'add_event' | 'edit_event' | 'delete_event';
  title: string | null;
  date: string | null;
  dateLabel: string | null;
  time: string | null;
  needsTitle?: boolean;
  missingSlots: Array<'date' | 'time' | 'title'>;
}

export function extractCalendarCommand(
  rawText: string,
  referenceDate: Date = new Date()
): CalendarCommandExtraction {
  const text = rawText.trim();
  const lower = text.toLowerCase();

  // 1. Open / Show calendar
  if (
    /^(?:can\s+you\s+|could\s+you\s+|please\s+)?(?:open|launch|start|show(?:\s+me)?)(?:\s+the|\s+my)?\s+(?:calendar|कैलेंडर|ಕ್ಯಾಲೆಂಡರ್)[.!?।]*$/i.test(
      lower
    ) ||
    /^(?:मेरा\s*)?कैलेंडर\s*(?:खोलो|खोलिए|दिखाओ)[.!?।]*$/.test(text) ||
    /^(?:ನನ್ನ\s*)?ಕ್ಯಾಲೆಂಡರ್\s*(?:ತೆರೆಯಿರಿ|ತೋರಿಸಿ)[.!?।]*$/.test(text)
  ) {
    return {
      matched: true,
      subAction: 'open_calendar',
      title: null,
      date: null,
      dateLabel: null,
      time: null,
      missingSlots: [],
    };
  }

  // 2. Show upcoming events
  if (
    /\b(?:show|list|what(?:'s| is on)|check|view)\b.*\b(?:upcoming\s+events|calendar\s+events|events|appointments|schedule|reminders)\b/i.test(
      lower
    ) ||
    /\bmy\s+upcoming\s+events\b/i.test(lower) ||
    /आगामी\s*(?:कार्यक्रम|अपॉइंटमेंट)|ಮುಂಬರುವ\s*(?:ಕಾರ್ಯಕ್ರಮ|ಅಪಾಯಿಂಟ್)/.test(text)
  ) {
    return {
      matched: true,
      subAction: 'show_upcoming',
      title: null,
      date: null,
      dateLabel: null,
      time: null,
      missingSlots: [],
    };
  }

  // 3. Delete appointment / event
  if (
    /\b(?:delete|remove|cancel)\b.*\b(?:appointment|event|meeting|reminder)\b/i.test(
      lower
    ) ||
    /(?:अपॉइंटमेंट|मीटिंग|रिमाइंडर)\s*(?:हटाओ|रद्द)/.test(text) ||
    /(?:ಅಪಾಯಿಂಟ್|ಮೀಟಿಂಗ್|ರಿಮೈಂಡರ್).*(?:ತೆಗೆದುಹಾಕಿ|ರದ್ದು)/.test(text)
  ) {
    const titleMatch = text.match(
      /\b(?:delete|remove|cancel)\s+(?:my\s+|the\s+)?(.+?)[.!?।]*$/i
    );
    return {
      matched: true,
      subAction: 'delete_event',
      title: titleMatch?.[1]?.trim() || 'appointment',
      date: null,
      dateLabel: null,
      time: null,
      missingSlots: [],
    };
  }

  // 3b. Edit existing appointment / event
  if (
    /\b(?:edit|update|reschedule|rename|change)\b.*\b(?:appointment|event|meeting|reminder|calendar)\b/i.test(
      lower
    )
  ) {
    const dateInfo = extractDateFromText(text, referenceDate);
    const timeInfo = extractTimeFromText(text);
    const renameMatch = text.match(/\b(?:to|as)\s+["']?([^"'.!?]+)["']?$/i);
    return {
      matched: true,
      subAction: 'edit_event',
      title: renameMatch?.[1]?.trim() || 'meeting',
      date: dateInfo.date,
      dateLabel: dateInfo.label,
      time: timeInfo,
      missingSlots: [],
    };
  }

  // 4. Add event / Schedule meeting / Remind me about ...
  const addOrRemindMatch =
    /\b(?:add|schedule|create|book|set|put)\b.*\b(?:appointment|event|meeting|reminder|calendar)\b/i.test(
      lower
    ) ||
    /\bremind\s+me\s+(?:about|of|to)\b/i.test(lower) ||
    /(?:अपॉइंटमेंट|मीटिंग|रिमाइंडर|कार्यक्रम).*(?:जोड़ो|बनाओ|रखो|याद दिलाओ|शेड्यूल)/.test(text) ||
    /(?:ಅಪಾಯಿಂಟ್|ಮೀಟಿಂಗ್|ರಿಮೈಂಡರ್|ಕಾರ್ಯಕ್ರಮ).*(?:ಸೇರಿಸಿ|ನೆನಪಿಸಿ|ನಿಗದಿ)/.test(text);

  if (!addOrRemindMatch) {
    return {
      matched: false,
      subAction: 'open_calendar',
      title: null,
      date: null,
      dateLabel: null,
      time: null,
      missingSlots: [],
    };
  }

  const dateInfo = extractDateFromText(text, referenceDate);
  const timeInfo = extractTimeFromText(text);
  const monthKeys = Object.keys(MONTHS_INDEX).join('|');
  const monthDateCleanup1 = new RegExp(
    `\\b(?:on\\s+)?\\d{1,2}(?:st|nd|rd|th)?\\s+(?:of\\s+)?(?:${monthKeys})(?:[,\\s]+\\d{4})?\\b`,
    'gi'
  );
  const monthDateCleanup2 = new RegExp(
    `\\b(?:on\\s+)?(?:${monthKeys})\\s+\\d{1,2}(?:st|nd|rd|th)?(?:[,\\s]+\\d{4})?\\b`,
    'gi'
  );

  const hasIndefiniteUnnamedNoun =
    /\b(?:schedule|add|create|book|set|put)\s+(?:a|an)\s+(?:meeting|event|appointment|reminder)\b/i.test(
      lower
    ) && !/\b(?:called|named|for|about)\s+[a-z0-9]/i.test(lower);

  const hasMyNamedNoun = /\bmy\s+(?:meeting|appointment|doctor|event)\b/i.test(lower);

  let title = text
    .replace(/^(?:(?:hey|hi|hello)\s+)?sahaaya[, ]+\s*/i, '')
    .replace(
      /^(?:please\s+|can\s+you\s+|could\s+you\s+|help\s+me\s+)*(?:add|schedule|create|book|set|put|remind\s+me\s+(?:about|of|to))\s+(?:a\s+|an\s+|the\s+|my\s+)?/i,
      ''
    )
    .replace(/\b(?:in\s+the\s+calendar|on\s+the\s+calendar|to\s+the\s+calendar|to\s+my\s+calendar|on\s+my\s+calendar|in\s+my\s+calendar|in\s+calendar)\b/gi, '')
    .replace(monthDateCleanup1, '')
    .replace(monthDateCleanup2, '')
    .replace(/\b(?:on\s+)?\d{1,2}[/-]\d{1,2}(?:[/-]\d{4})?\b/gi, '')
    .replace(
      /\b(?:today|tomorrow|day\s+after\s+tomorrow|on\s+(?:sunday|monday|tuesday|wednesday|thursday|friday|saturday)|(?:sunday|monday|tuesday|wednesday|thursday|friday|saturday))\b/gi,
      ''
    )
    .replace(/\b(?:at\s+)?\d{1,2}(?::\d{2})?\s*(?:am|pm)\b/gi, '')
    .replace(/\b(?:at\s+)?(?:[01]?\d|2[0-3]):[0-5]\d\b/gi, '')
    .replace(/\b(?:in\s+the\s+)?(?:morning|afternoon|evening)\b/gi, '')
    .replace(/\b(?:called|named)\s+/i, '')
    .replace(/\b(?:on|at|for)\s*$/i, '')
    .replace(/[.!?।]+$/, '')
    .replace(/\s+/g, ' ')
    .trim();

  const isGenericTitleOnly =
    !title ||
    /^(?:meeting|event|appointment|reminder|something|calendar)$/i.test(title);
  const needsTitle =
    !hasMyNamedNoun && (hasIndefiniteUnnamedNoun || isGenericTitleOnly);

  if (!title) title = 'Reminder';
  title = title.charAt(0).toUpperCase() + title.slice(1);

  const missingSlots: Array<'date' | 'time' | 'title'> = [];
  if (!dateInfo.date) missingSlots.push('date');
  if (!timeInfo) missingSlots.push('time');
  if (needsTitle) missingSlots.push('title');

  return {
    matched: true,
    subAction: 'add_event',
    title,
    date: dateInfo.date,
    dateLabel: dateInfo.label,
    time: timeInfo,
    needsTitle,
    missingSlots,
  };
}

export function buildCalendarPrompt(
  extraction: CalendarCommandExtraction,
  lang: LanguageCode
): string {
  if (extraction.subAction === 'open_calendar') {
    if (lang === 'hi') {
      return 'डेमो मोड में कैलेंडर खोल दिया गया है (कोई असली फ़ोन कैलेंडर या अलार्म नहीं बनाया गया)।';
    }
    if (lang === 'kn') {
      return 'ಡೆಮೊ ಮೋಡ್‌ನಲ್ಲಿ ಕ್ಯಾಲೆಂಡರ್ ತೆರೆಯಲಾಗಿದೆ (ಯಾವುದೇ ನಿಜವಾದ ಫೋನ್ ಕ್ಯಾಲೆಂಡರ್ ಅಥವಾ ಅಲಾರಾಂ ರಚಿಸಲಾಗಿಲ್ಲ).';
    }
    return 'Simulated Calendar opened in Sahaaya Demo Mode. You can view dates, switch months, and add, edit, or remove local demo events.';
  }

  if (extraction.missingSlots.includes('date')) {
    const noun = (extraction.title || 'event').toLowerCase();
    if (lang === 'hi') {
      return `"${extraction.title || 'कार्यक्रम'}" के लिए आप किस दिन की तारीख रखना चाहते हैं? (जैसे "कल", "सोमवार", या "30 नवंबर")`;
    }
    if (lang === 'kn') {
      return `"${extraction.title || 'ಕಾರ್ಯಕ್ರಮ'}" ಗಾಗಿ ಯಾವ ದಿನಾಂಕವನ್ನು ನಿಗದಿಪಡಿಸಬೇಕು? (ಉದಾ. "ನಾಳೆ", "ಸೋಮವಾರ", ಅಥವಾ "ನವೆಂಬರ್ 30")`;
    }
    return `Of course. Which date should I put "${noun}" in your calendar? For example, you can say "tomorrow", "Monday", or "30th November".`;
  }

  if (extraction.missingSlots.includes('time')) {
    const noun =
      extraction.needsTitle && extraction.title
        ? `a ${extraction.title.toLowerCase()}`
        : `"${extraction.title || 'this event'}"`;
    if (lang === 'hi') {
      return `ज़रूर, मैं कैलेंडर में मदद कर सकता हूँ। इसे किस समय पर रखना है? (जैसे "सुबह 10 बजे" या "पूरा दिन")`;
    }
    if (lang === 'kn') {
      return `ಖಂಡಿತ, ನಾನು ಕ್ಯಾಲೆಂಡರ್‌ನಲ್ಲಿ ಸಹಾಯ ಮಾಡಬಲ್ಲೆ. ಇದನ್ನು ಯಾವ ಸಮಯಕ್ಕೆ ನಿಗದಿಪಡಿಸಬೇಕು? (ಉದಾ. "10 AM" ಅಥವಾ "All day")`;
    }
    return `Of course. I can help you schedule ${noun}. What time should I put it in your calendar?`;
  }

  if (extraction.missingSlots.includes('title')) {
    const noun = (extraction.title || 'event').toLowerCase();
    if (lang === 'hi') {
      return `इस ${noun === 'meeting' ? 'मीटिंग' : 'कार्यक्रम'} का नाम क्या रखना चाहेंगे?`;
    }
    if (lang === 'kn') {
      return `ಈ ${noun === 'meeting' ? 'ಮೀಟಿಂಗ್' : 'ಕಾರ್ಯಕ್ರಮ'}ಗೆ ಯಾವ ಹೆಸರನ್ನು ಇಡಲು ಬಯಸುತ್ತೀರಿ?`;
    }
    return `What would you like to name the ${noun === 'reminder' ? 'event' : noun}?`;
  }

  return '';
}
