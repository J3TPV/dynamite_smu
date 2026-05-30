// Natural-language command parser. Turns a free-form voice/text command into a
// structured candidate event. Deliberately dependency-free and deterministic so
// it works fully offline in the browser.

import { Category, ParsedCommand, Priority } from './types';
import { addDays, stripTime, toISODate } from './datetime';

const WEEKDAYS: Record<string, number> = {
  sunday: 0, sun: 0,
  monday: 1, mon: 1,
  tuesday: 2, tue: 2, tues: 2,
  wednesday: 3, wed: 3,
  thursday: 4, thu: 4, thurs: 4,
  friday: 5, fri: 5,
  saturday: 6, sat: 6,
};

const MONTHS: Record<string, number> = {
  january: 0, jan: 0, february: 1, feb: 1, march: 2, mar: 2, april: 3, apr: 3,
  may: 4, june: 5, jun: 5, july: 6, jul: 6, august: 7, aug: 7,
  september: 8, sep: 8, sept: 8, october: 9, oct: 9, november: 10, nov: 10,
  december: 11, dec: 11,
};

const NUM_WORDS: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8,
  nine: 9, ten: 10, eleven: 11, twelve: 12, a: 1, an: 1, half: 0.5,
};

// keyword -> category, used both for classification and duration hints
const CATEGORY_KEYWORDS: Array<{ words: string[]; category: Category; defaultDuration?: number }> = [
  { words: ['gym', 'workout', 'run', 'running', 'exercise', 'yoga', 'walk', 'jog', 'lift', 'cardio', 'training', 'swim'], category: 'health', defaultDuration: 60 },
  { words: ['doctor', 'dentist', 'therapy', 'appointment', 'medication', 'meditate', 'meditation'], category: 'health', defaultDuration: 45 },
  { words: ['meeting', 'standup', 'stand-up', 'sync', 'call', 'interview', 'presentation', '1:1', 'review', 'demo', 'client'], category: 'work', defaultDuration: 30 },
  { words: ['work', 'email', 'emails', 'report', 'deadline', 'project', 'deploy', 'code', 'coding', 'ticket', 'admin', 'paperwork'], category: 'work' },
  { words: ['study', 'studying', 'homework', 'assignment', 'exam', 'revise', 'revision', 'read', 'reading', 'lecture', 'class', 'course', 'research', 'thesis'], category: 'study', defaultDuration: 90 },
  // Social is checked before meal so "dinner with friends" reads as social, not a meal.
  { words: ['dinner with', 'lunch with', 'drinks', 'party', 'hangout', 'meet up', 'meetup', 'date night', 'birthday', 'wedding', 'with friends', 'family time'], category: 'social', defaultDuration: 120 },
  { words: ['lunch', 'dinner', 'breakfast', 'brunch', 'eat', 'cook', 'cooking', 'meal'], category: 'meal', defaultDuration: 45 },
  { words: ['sleep', 'nap', 'rest', 'relax', 'break', 'unwind', 'downtime'], category: 'rest', defaultDuration: 30 },
  { words: ['groceries', 'shopping', 'clean', 'cleaning', 'laundry', 'errand', 'errands', 'chores', 'haircut', 'bank', 'call mom', 'call dad'], category: 'personal', defaultDuration: 45 },
];

const COMMAND_VERBS = [
  'schedule', 'add', 'plan', 'book', 'set up', 'set', 'create', 'put', 'block',
  'remind me to', 'remind me', 'i need to', 'i want to', 'i have to', 'i have',
  'i have a', 'i got', "let's", 'lets', 'pencil in', 'arrange', 'organize',
];

const FILLER_WORDS = ['please', 'can you', 'could you', 'for me', 'um', 'uh', 'a', 'an', 'the', 'my'];

function normalize(text: string): string {
  return ' ' + text.toLowerCase().trim().replace(/[.,!?]/g, '').replace(/\s+/g, ' ') + ' ';
}

interface TimeParse {
  start: number | null;
  consumed: string[]; // substrings to strip from title
  assumed: boolean;
}

function parseTime(text: string): TimeParse {
  const consumed: string[] = [];

  // Named times
  const named: Record<string, number> = {
    noon: 12 * 60,
    midnight: 0,
    'midday': 12 * 60,
  };
  for (const [word, val] of Object.entries(named)) {
    if (text.includes(` ${word} `)) {
      consumed.push(word);
      return { start: val, consumed, assumed: false };
    }
  }

  // Explicit clock time: "at 3pm", "3:30 pm", "15:00", "at 9"
  const clock = text.match(/\b(?:at\s+)?(\d{1,2})(?::(\d{2}))?\s*(am|pm|a\.m\.|p\.m\.)?\b/);
  if (clock) {
    let h = parseInt(clock[1], 10);
    const m = clock[2] ? parseInt(clock[2], 10) : 0;
    const mer = clock[3]?.replace(/\./g, '');
    // Only treat bare numbers as a time when there's an am/pm OR a colon OR an "at"
    const hasAt = /\bat\s+\d/.test(text);
    if (h <= 23 && (mer || clock[2] || hasAt)) {
      if (mer === 'pm' && h < 12) h += 12;
      if (mer === 'am' && h === 12) h = 0;
      // Bare "at 8" with no meridiem: assume daytime sensibly (8 -> 8am, 1-7 -> pm)
      if (!mer && h >= 1 && h <= 7 && !clock[2]) h += 12;
      consumed.push(clock[0].trim());
      return { start: h * 60 + m, consumed, assumed: false };
    }
  }

  // Parts of day
  const partsOfDay: Record<string, number> = {
    'early morning': 7 * 60,
    morning: 9 * 60,
    afternoon: 14 * 60,
    evening: 18 * 60,
    tonight: 20 * 60,
    night: 20 * 60,
  };
  for (const [word, val] of Object.entries(partsOfDay)) {
    if (text.includes(` ${word} `) || text.includes(` ${word.replace(' ', ' ')} `)) {
      consumed.push(word);
      return { start: val, consumed, assumed: true };
    }
  }

  return { start: null, consumed, assumed: true };
}

interface DateParse {
  date: string;
  consumed: string[];
}

function parseDate(text: string, now: Date): DateParse {
  const today = stripTime(now);
  const consumed: string[] = [];

  if (text.includes(' today ') || text.includes(' tonight ')) {
    consumed.push('today');
    return { date: toISODate(today), consumed };
  }
  if (text.includes(' tomorrow ')) {
    consumed.push('tomorrow');
    return { date: toISODate(addDays(today, 1)), consumed };
  }
  if (text.includes(' day after tomorrow ')) {
    consumed.push('day after tomorrow');
    return { date: toISODate(addDays(today, 2)), consumed };
  }

  // "in N days" / "in a week"
  const inN = text.match(/\bin (\d+|a|an|two|three|four|five|six|seven) (day|days|week|weeks)\b/);
  if (inN) {
    const n = NUM_WORDS[inN[1]] ?? parseInt(inN[1], 10) ?? 1;
    const mult = inN[2].startsWith('week') ? 7 : 1;
    consumed.push(inN[0]);
    return { date: toISODate(addDays(today, n * mult)), consumed };
  }

  // "next monday" / "this friday" / bare "monday"
  const wd = text.match(/\b(next |this )?(sunday|monday|tuesday|wednesday|thursday|friday|saturday|sun|mon|tue|tues|wed|thu|thurs|fri|sat)\b/);
  if (wd) {
    const target = WEEKDAYS[wd[2]];
    const cur = today.getDay();
    let delta = (target - cur + 7) % 7;
    if (delta === 0) delta = 7; // upcoming, not today, when a weekday is named
    if (wd[1]?.trim() === 'next' && delta <= 7) {
      // "next monday" => the monday of next week if this week's already passed-ish
      if (delta < 7) delta += 0; // keep nearest upcoming; "next" already implies future
    }
    consumed.push(wd[0]);
    return { date: toISODate(addDays(today, delta)), consumed };
  }

  // "june 3", "3rd of june", "on the 5th"
  const md = text.match(/\b(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|sept|oct|nov|dec)\s+(\d{1,2})(?:st|nd|rd|th)?\b/);
  if (md) {
    const month = MONTHS[md[1]];
    const day = parseInt(md[2], 10);
    let year = today.getFullYear();
    const candidate = new Date(year, month, day);
    if (stripTime(candidate) < today) year += 1;
    consumed.push(md[0]);
    return { date: toISODate(new Date(year, month, day)), consumed };
  }

  // default: today
  return { date: toISODate(today), consumed: [] };
}

interface DurationParse {
  duration: number | null;
  consumed: string[];
}

function parseDuration(text: string): DurationParse {
  const consumed: string[] = [];
  // "for 2 hours", "1.5 hours", "30 minutes", "90 min", "an hour and a half"
  const hourHalf = text.match(/\b(an? |\d+(?:\.\d+)?\s*)hours?\s+and\s+a\s+half\b/);
  if (hourHalf) {
    const base = hourHalf[1].trim();
    const n = NUM_WORDS[base] ?? parseFloat(base) ?? 1;
    consumed.push(hourHalf[0]);
    return { duration: Math.round((n + 0.5) * 60), consumed };
  }

  const hr = text.match(/\b(?:for\s+)?(\d+(?:\.\d+)?|half an|an?|one|two|three|four|five|six)\s*(hours?|hrs?|h)\b/);
  if (hr) {
    let n: number;
    if (hr[1] === 'half an') n = 0.5;
    else n = NUM_WORDS[hr[1]] ?? parseFloat(hr[1]);
    consumed.push(hr[0]);
    return { duration: Math.round(n * 60), consumed };
  }

  const min = text.match(/\b(?:for\s+)?(\d+|ten|fifteen|twenty|thirty|forty|forty-five|sixty|ninety)\s*(minutes?|mins?|m)\b/);
  if (min) {
    const wordMap: Record<string, number> = {
      ten: 10, fifteen: 15, twenty: 20, thirty: 30, forty: 40, 'forty-five': 45, sixty: 60, ninety: 90,
    };
    const n = wordMap[min[1]] ?? parseInt(min[1], 10);
    consumed.push(min[0]);
    return { duration: n, consumed };
  }

  return { duration: null, consumed: [] };
}

function classify(text: string): { category: Category; defaultDuration?: number } {
  for (const entry of CATEGORY_KEYWORDS) {
    for (const w of entry.words) {
      if (text.includes(` ${w} `) || text.includes(` ${w}`)) {
        return { category: entry.category, defaultDuration: entry.defaultDuration };
      }
    }
  }
  return { category: 'personal' };
}

function detectPriority(text: string): { priority: Priority; consumed: string[] } {
  const consumed: string[] = [];
  if (/\b(urgent|asap|important|high priority|critical|must)\b/.test(text)) {
    const m = text.match(/\b(urgent|asap|important|high priority|critical)\b/);
    if (m) consumed.push(m[0]);
    return { priority: 'high', consumed };
  }
  if (/\b(low priority|whenever|sometime|if i have time|optional)\b/.test(text)) {
    const m = text.match(/\b(low priority|whenever|sometime|optional)\b/);
    if (m) consumed.push(m[0]);
    return { priority: 'low', consumed };
  }
  return { priority: 'medium', consumed };
}

function buildTitle(raw: string, consumed: string[]): string {
  let t = ' ' + raw.toLowerCase().replace(/[.,!?]/g, '') + ' ';

  // Strip command verbs from the front
  for (const verb of COMMAND_VERBS.sort((a, b) => b.length - a.length)) {
    const re = new RegExp(`^\\s*${verb}\\s+`, 'i');
    if (re.test(t)) {
      t = t.replace(re, ' ');
      break;
    }
  }

  // Strip consumed time/date/duration/priority substrings
  for (const c of consumed) {
    if (!c) continue;
    t = t.replace(new RegExp(`\\b${escapeRegExp(c)}\\b`, 'gi'), ' ');
  }

  // Strip leftover connective words around stripped phrases
  t = t.replace(/\b(at|on|for|in|to|this|next|the)\b\s*$/gi, ' ');
  t = t.replace(/^\s*(at|on|for|in|to|with|about)\b/gi, ' ');
  t = t.replace(/\s+/g, ' ').trim();

  // Remove a couple leading fillers
  const words = t.split(' ').filter(Boolean);
  while (words.length && FILLER_WORDS.includes(words[0])) words.shift();

  let title = words.join(' ').trim();
  if (!title) title = 'Untitled';
  // Capitalize first letter
  return title.charAt(0).toUpperCase() + title.slice(1);
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function parseCommand(raw: string, now: Date = new Date()): ParsedCommand {
  const text = normalize(raw);
  const notes: string[] = [];

  const date = parseDate(text, now);
  const time = parseTime(text);
  const dur = parseDuration(text);
  const klass = classify(text);
  const prio = detectPriority(text);

  const consumed = [
    ...date.consumed,
    ...time.consumed,
    ...dur.consumed,
    ...prio.consumed,
  ];
  const title = buildTitle(raw, consumed);

  let start = time.start;
  let assumedTime = time.assumed;
  if (start === null) {
    // Pick a sensible default slot based on category
    const defaults: Partial<Record<Category, number>> = {
      work: 9 * 60,
      study: 10 * 60,
      health: 7 * 60,
      meal: 12 * 60 + 30,
      social: 19 * 60,
      rest: 21 * 60,
      personal: 17 * 60,
    };
    start = defaults[klass.category] ?? 9 * 60;
    assumedTime = true;
  }

  let duration = dur.duration ?? klass.defaultDuration ?? 60;

  // Confidence heuristic
  let confidence = 0.4;
  if (title && title !== 'Untitled') confidence += 0.3;
  if (!time.assumed) confidence += 0.2;
  if (date.consumed.length) confidence += 0.1;
  confidence = Math.min(1, confidence);

  // Notes
  if (assumedTime) notes.push(`No time given — defaulted to ${formatHM(start)}.`);
  if (dur.duration === null) notes.push(`Assumed ${duration >= 60 ? duration / 60 + 'h' : duration + ' min'} duration.`);
  if (date.consumed.length === 0) notes.push('No date given — scheduled for today.');
  if (prio.priority !== 'medium') notes.push(`Marked ${prio.priority} priority.`);
  notes.push(`Categorized as ${klass.category}.`);

  return {
    title,
    date: date.date,
    start,
    duration,
    category: klass.category,
    priority: prio.priority,
    confidence,
    notes,
    assumedTime,
  };
}

function formatHM(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  const ampm = h < 12 ? 'AM' : 'PM';
  let h12 = h % 12;
  if (h12 === 0) h12 = 12;
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
}
