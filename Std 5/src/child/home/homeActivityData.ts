/**
 * child/home/homeActivityData.ts
 * --------------------------------------------------
 * Shared live data helpers for child home widgets.
 *
 * Sources:
 * - ssms_audit_log
 * - ssms_stats_v2
 * - ssms_homework
 * - ssms_garden_log
 */

type AnyRecord = Record<string, unknown>;

type AuditLikeEntry = {
  timestamp?: unknown;
  action?: unknown;
  category?: unknown;
  details?: unknown;
};

export interface LearningSyncData {
  lastReview: string;
  weeklyMinutes: number;
  encouragement: string;
  activeDays: number[];
  strengths: string[];
  improvements: string[];
  weeklyXP: number;
  completionPct: number;
}

export interface QuestClaimState {
  date: string;
  claimed: Record<string, boolean>;
}

const QUEST_STORAGE_PREFIX = 'ssms_daily_quests_v2';
const LETTER_GAME_HINTS = ['matchletters', 'letterafter', 'letterbefore', 'wordbuilder', 'guesstheword'];

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function normalizeKeyPart(value: string): string {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return normalized || 'student';
}

export function toLocalDateKey(value: Date | string = new Date()): string {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) {
    return toLocalDateKey(new Date());
  }
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function asRecord(value: unknown): AnyRecord {
  return value && typeof value === 'object' ? (value as AnyRecord) : {};
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function asNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function readAuditEntries(): AuditLikeEntry[] {
  const parsed = safeParse<unknown>(localStorage.getItem('ssms_audit_log'), []);
  return Array.isArray(parsed) ? (parsed as AuditLikeEntry[]) : [];
}

function buildCurrentWeekKeys(now = new Date()): string[] {
  const dayOfWeek = now.getDay();
  const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const monday = new Date(now);
  monday.setDate(now.getDate() - mondayOffset);
  monday.setHours(0, 0, 0, 0);

  const keys: string[] = [];
  for (let i = 0; i < 7; i += 1) {
    const date = new Date(monday);
    date.setDate(monday.getDate() + i);
    keys.push(toLocalDateKey(date));
  }
  return keys;
}

function estimateEntryMinutes(entry: AuditLikeEntry): number {
  const details = asRecord(entry.details);
  const directMinutes =
    asNumber(details.minutes) ||
    asNumber(details.durationMinutes) ||
    asNumber(details.timeMinutes);
  if (directMinutes > 0) return Math.round(directMinutes);

  const durationMs =
    asNumber(details.durationMs) ||
    asNumber(details.timeMs) ||
    asNumber(details.elapsedMs);
  if (durationMs > 0) return Math.max(1, Math.round(durationMs / 60000));

  const action = asString(entry.action).toLowerCase();
  const category = asString(entry.category).toLowerCase();

  if (action === 'game_complete') return 12;
  if (category === 'game') return 4;
  if (category === 'ai') return 6;
  if (category === 'homework') return 8;
  if (action.includes('book') || action.includes('read') || action.includes('pdf')) return 8;
  return 3;
}

function readHomeworkSummary(): { total: number; done: number; pct: number } {
  const parsed = safeParse<unknown>(localStorage.getItem('ssms_homework'), []);
  if (!Array.isArray(parsed)) {
    return { total: 0, done: 0, pct: 0 };
  }
  const total = parsed.length;
  if (total === 0) return { total: 0, done: 0, pct: 0 };
  const done = parsed.filter(item => asRecord(item).isDone === true).length;
  const pct = Math.round((done / total) * 100);
  return { total, done, pct };
}

function getRelativeDayLabel(value: unknown): string {
  const raw = asString(value);
  if (!raw) return '';
  const base = new Date(raw);
  if (Number.isNaN(base.getTime())) return raw;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const baseDate = new Date(base);
  baseDate.setHours(0, 0, 0, 0);

  const diffDays = Math.round((today.getTime() - baseDate.getTime()) / (24 * 60 * 60 * 1000));
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';

  const day = pad2(baseDate.getDate());
  const month = baseDate.toLocaleString('en-US', { month: 'short' });
  return `${day} ${month}`;
}

function readGardenCompletedToday(todayKey: string): boolean {
  const parsed = safeParse<unknown>(localStorage.getItem('ssms_garden_log'), {});
  const data = asRecord(parsed);
  return data.waterDate === todayKey || data.sunshineDate === todayKey || data.plantDate === todayKey;
}

function deriveEncouragement(completionPct: number, weeklyMinutes: number, activeDays: number): string {
  if (completionPct >= 80) {
    return 'Excellent consistency this week. Keep this rhythm going!';
  }
  if (completionPct >= 50) {
    return 'Good progress. One more focused session will boost your streak.';
  }
  if (weeklyMinutes > 0 || activeDays > 0) {
    return 'Nice start. Keep learning daily to build momentum.';
  }
  return 'Start one game or reading activity today to kick off your streak.';
}

function deriveStrengths(categoryCounts: Record<string, number>, activeDays: number): string[] {
  const labels: Array<{ label: string; count: number }> = [
    { label: 'Game Practice', count: categoryCounts.game },
    { label: 'Homework Focus', count: categoryCounts.homework },
    { label: 'Reading Time', count: categoryCounts.reading },
    { label: 'AI Learning', count: categoryCounts.ai },
  ];

  const strengths = labels
    .filter(item => item.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 2)
    .map(item => item.label);

  if (strengths.length > 0) return strengths;
  if (activeDays > 0) return ['Daily Check-ins'];
  return ['Getting Started'];
}

function deriveImprovements(
  categoryCounts: Record<string, number>,
  homeworkTotal: number,
  homeworkDone: number,
): string[] {
  const items: string[] = [];

  if (categoryCounts.reading === 0) items.push('Reading Practice');
  if (categoryCounts.game === 0) items.push('Game Completion');
  if (homeworkTotal > 0 && homeworkDone < homeworkTotal) items.push('Homework Completion');
  if (categoryCounts.ai === 0) items.push('Ask AI Questions');

  if (items.length < 2) items.push('Daily Consistency');
  if (items.length < 2) items.push('Short Focus Sessions');

  return items.slice(0, 2);
}

export function deriveLearningSyncData(): LearningSyncData {
  const syncOverride = asRecord(safeParse<unknown>(localStorage.getItem('ssms_learning_sync'), {}));
  const weekKeys = buildCurrentWeekKeys(new Date());
  const weekKeySet = new Set(weekKeys);
  const auditEntries = readAuditEntries();

  const meaningfulEntries = auditEntries.filter(entry => {
    const category = asString(entry.category).toLowerCase();
    return category !== 'navigation' && category !== 'parent';
  });

  const weekEntries = meaningfulEntries.filter(entry => weekKeySet.has(toLocalDateKey(asString(entry.timestamp))));

  const activeDaySet = new Set<string>();
  let weeklyMinutes = 0;
  let weeklyXP = 0;
  const categoryCounts = {
    game: 0,
    homework: 0,
    ai: 0,
    reading: 0,
  };

  for (const entry of weekEntries) {
    const dateKey = toLocalDateKey(asString(entry.timestamp));
    activeDaySet.add(dateKey);
    weeklyMinutes += estimateEntryMinutes(entry);

    const details = asRecord(entry.details);
    weeklyXP += asNumber(details.xp);

    const action = asString(entry.action).toLowerCase();
    const category = asString(entry.category).toLowerCase();

    if (category === 'game') categoryCounts.game += 1;
    if (category === 'homework') categoryCounts.homework += 1;
    if (category === 'ai') categoryCounts.ai += 1;
    if (action.includes('book') || action.includes('read') || action.includes('pdf')) categoryCounts.reading += 1;
  }

  if (weeklyXP <= 0) {
    weeklyXP = weekEntries.filter(entry => asString(entry.action).toLowerCase() === 'game_complete').length * 10;
  }

  const activeDays = weekKeys.map(key => (activeDaySet.has(key) ? 1 : 0));
  const activeCount = activeDays.filter(Boolean).length;

  const homework = readHomeworkSummary();
  const activeScore = clamp(Math.round((activeCount / 5) * 100), 0, 100);
  const minutesScore = clamp(Math.round((weeklyMinutes / 120) * 100), 0, 100);
  const homeworkScore = homework.total > 0 ? clamp(homework.pct, 0, 100) : (activeCount > 0 ? 100 : 0);
  const completionPct = clamp(Math.round((activeScore + minutesScore + homeworkScore) / 3), 0, 100);

  const parentEntries = auditEntries
    .filter(entry => {
      const action = asString(entry.action).toLowerCase();
      const category = asString(entry.category).toLowerCase();
      return category === 'parent' || action.includes('parent');
    })
    .sort((a, b) => new Date(asString(b.timestamp)).getTime() - new Date(asString(a.timestamp)).getTime());

  const overrideLastReview = asString(syncOverride.lastReview).trim();
  const parentLastReview = parentEntries.length > 0
    ? getRelativeDayLabel(parentEntries[0].timestamp)
    : '';
  const lastReview = overrideLastReview || parentLastReview || 'Not yet';

  const overrideEncouragement = asString(syncOverride.encouragement).trim();
  const encouragement =
    overrideEncouragement || deriveEncouragement(completionPct, weeklyMinutes, activeCount);

  const strengths = deriveStrengths(categoryCounts, activeCount);
  const improvements = deriveImprovements(categoryCounts, homework.total, homework.done);

  return {
    lastReview,
    weeklyMinutes,
    encouragement,
    activeDays,
    strengths,
    improvements,
    weeklyXP,
    completionPct,
  };
}

export function buildStudentStorageId(
  studentId: string | undefined,
  studentName: string | undefined,
  grade: number | undefined,
): string {
  if (studentId && studentId.trim()) {
    return normalizeKeyPart(studentId);
  }
  const fallbackName = studentName && studentName.trim() ? studentName : 'student';
  return normalizeKeyPart(`${grade ?? 0}-${fallbackName}`);
}

export function getQuestStorageKey(studentStorageId: string): string {
  return `${QUEST_STORAGE_PREFIX}:${normalizeKeyPart(studentStorageId)}`;
}

export function loadQuestClaimState(storageKey: string): QuestClaimState {
  const todayKey = toLocalDateKey();
  const parsed = safeParse<unknown>(localStorage.getItem(storageKey), null);
  const data = asRecord(parsed);
  const date = asString(data.date);
  const claimedRaw = asRecord(data.claimed);
  const claimed: Record<string, boolean> = {};

  for (const [id, value] of Object.entries(claimedRaw)) {
    claimed[id] = value === true;
  }

  if (date === todayKey) {
    return { date, claimed };
  }

  return { date: todayKey, claimed: {} };
}

export function saveQuestClaimState(storageKey: string, state: QuestClaimState): void {
  try {
    localStorage.setItem(storageKey, JSON.stringify(state));
  } catch {
    // Ignore storage write failures.
  }
}

export function buildQuestProgress(questIds: string[]): Record<string, number> {
  const todayKey = toLocalDateKey();
  const entries = readAuditEntries().filter(entry => toLocalDateKey(asString(entry.timestamp)) === todayKey);

  let gameCompletions = 0;
  let letterProgress = 0;
  let journeyProgress = 0;

  for (const entry of entries) {
    const action = asString(entry.action).toLowerCase();
    const category = asString(entry.category).toLowerCase();
    const details = asRecord(entry.details);
    const gameHint = asString(details.game || details.gameId).toLowerCase();

    const isGameComplete =
      action === 'game_complete' ||
      (category === 'game' && (action.includes('complete') || action.includes('won')));

    if (isGameComplete) {
      gameCompletions += 1;
    }

    const isLetterActivity =
      action.includes('letter') ||
      action === 'match_round_complete' ||
      action === 'word_correct' ||
      action === 'guess_correct' ||
      LETTER_GAME_HINTS.some(hint => gameHint.includes(hint));

    if (isLetterActivity) {
      letterProgress += 1;
    }

    const isJourneyActivity =
      action === 'game_complete' ||
      action.includes('level_complete') ||
      action.includes('mini_level') ||
      action.includes('chapter_complete') ||
      action.includes('journey');

    if (isJourneyActivity) {
      journeyProgress += 1;
    }
  }

  const gardenProgress = readGardenCompletedToday(todayKey) ? 1 : 0;

  const progress: Record<string, number> = {};
  for (const id of questIds) {
    if (id === 'q_games') {
      progress[id] = gameCompletions;
    } else if (id === 'q_letters') {
      progress[id] = letterProgress;
    } else if (id === 'q_journey') {
      progress[id] = journeyProgress;
    } else if (id === 'q_garden') {
      progress[id] = gardenProgress;
    } else {
      progress[id] = 0;
    }
  }

  return progress;
}
