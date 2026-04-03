import React, { useCallback, useMemo, useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import type { ReportCardData } from './useReportGenerator';
import './report-print.css';

type ParentPreferences = {
  parentName: string;
  dailySummary: boolean;
  weeklyReport: boolean;
  smsAlerts: boolean;
  allowGames: boolean;
  allowAiBuddy: boolean;
  allowExtendedPlay: boolean;
};

type ReportTheme = {
  label: string;
  primary: string;
  secondary: string;
  accent: string;
  soft: string;
  badgeBg: string;
  chip: string;
  frost: string;
  orbA: string;
  orbB: string;
};

const REPORT_THEMES: Record<number, ReportTheme> = {
  1: {
    label: 'Sky Bloom',
    primary: '#1e3a8a',
    secondary: '#2563eb',
    accent: '#38bdf8',
    soft: '#eaf4ff',
    badgeBg: '#dbeafe',
    chip: 'rgba(255,255,255,0.88)',
    frost: 'rgba(255,255,255,0.72)',
    orbA: 'rgba(56, 189, 248, 0.36)',
    orbB: 'rgba(37, 99, 235, 0.24)',
  },
  2: {
    label: 'Royal Iris',
    primary: '#4c1d95',
    secondary: '#6d28d9',
    accent: '#8b5cf6',
    soft: '#f5f3ff',
    badgeBg: '#ede9fe',
    chip: 'rgba(255,255,255,0.9)',
    frost: 'rgba(255,255,255,0.74)',
    orbA: 'rgba(139, 92, 246, 0.34)',
    orbB: 'rgba(109, 40, 217, 0.22)',
  },
  3: {
    label: 'Indigo Slate',
    primary: '#1e293b',
    secondary: '#334155',
    accent: '#6366f1',
    soft: '#eef2ff',
    badgeBg: '#e2e8f0',
    chip: 'rgba(255,255,255,0.89)',
    frost: 'rgba(255,255,255,0.72)',
    orbA: 'rgba(99, 102, 241, 0.26)',
    orbB: 'rgba(51, 65, 85, 0.24)',
  },
  4: {
    label: 'Amber Dusk',
    primary: '#92400e',
    secondary: '#b45309',
    accent: '#f59e0b',
    soft: '#fffbeb',
    badgeBg: '#fef3c7',
    chip: 'rgba(255,255,255,0.9)',
    frost: 'rgba(255,255,255,0.74)',
    orbA: 'rgba(245, 158, 11, 0.28)',
    orbB: 'rgba(180, 83, 9, 0.22)',
  },
  5: {
    label: 'Emerald Valley',
    primary: '#166534',
    secondary: '#15803d',
    accent: '#22c55e',
    soft: '#ecfdf5',
    badgeBg: '#dcfce7',
    chip: 'rgba(255,255,255,0.9)',
    frost: 'rgba(255,255,255,0.74)',
    orbA: 'rgba(34, 197, 94, 0.3)',
    orbB: 'rgba(21, 128, 61, 0.2)',
  },
  6: {
    label: 'Ocean Pulse',
    primary: '#0d617f',
    secondary: '#1b8aae',
    accent: '#06b6d4',
    soft: '#ecfeff',
    badgeBg: '#cffafe',
    chip: 'rgba(255,255,255,0.9)',
    frost: 'rgba(255,255,255,0.74)',
    orbA: 'rgba(6, 182, 212, 0.34)',
    orbB: 'rgba(13, 97, 127, 0.2)',
  },
};

const DEFAULT_PREFERENCES: ParentPreferences = {
  parentName: 'Parent',
  dailySummary: true,
  weeklyReport: true,
  smsAlerts: false,
  allowGames: true,
  allowAiBuddy: true,
  allowExtendedPlay: false,
};

const TIER_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  Strong: { bg: '#dcfce7', text: '#166534', border: '#86efac' },
  Active: { bg: '#dbeafe', text: '#1e40af', border: '#93c5fd' },
  Developing: { bg: '#fef9c3', text: '#854d0e', border: '#fde047' },
  Excellent: { bg: '#dcfce7', text: '#166534', border: '#86efac' },
  Good: { bg: '#dbeafe', text: '#1e40af', border: '#93c5fd' },
  'Needs Attention': { bg: '#fee2e2', text: '#991b1b', border: '#fca5a5' },
  Consistent: { bg: '#dcfce7', text: '#166534', border: '#86efac' },
  Progressing: { bg: '#dbeafe', text: '#1e40af', border: '#93c5fd' },
  'Needs Support': { bg: '#fef9c3', text: '#854d0e', border: '#fde047' },
};

function parseBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function findPreferenceKeys(grade: number): string[] {
  const keys: string[] = [`ssms_parent_settings_std_${grade}`];

  if (typeof window === 'undefined') {
    return keys;
  }

  const dynamicKeys: string[] = [];
  const gradePattern = new RegExp(`(?:^|[:_-])(?:std)?\\s*0*${grade}(?:[:_-]|$)`, 'i');

  try {
    for (let i = 0; i < window.localStorage.length; i += 1) {
      const key = window.localStorage.key(i);
      if (!key || !key.startsWith('ssms_parent_settings:')) continue;
      dynamicKeys.push(key);
    }
  } catch {
    return keys;
  }

  dynamicKeys.sort((a, b) => Number(gradePattern.test(b)) - Number(gradePattern.test(a)));
  return [...new Set([...keys, ...dynamicKeys])];
}

function readParentPreferences(grade: number): ParentPreferences {
  if (typeof window === 'undefined') {
    return DEFAULT_PREFERENCES;
  }

  const candidateKeys = findPreferenceKeys(grade);

  for (const key of candidateKeys) {
    try {
      const raw = window.localStorage.getItem(key);
      if (!raw) continue;

      const parsed = JSON.parse(raw) as Partial<ParentPreferences>;
      if (!parsed || typeof parsed !== 'object') continue;

      const parentName =
        typeof parsed.parentName === 'string' && parsed.parentName.trim() !== ''
          ? parsed.parentName.trim()
          : DEFAULT_PREFERENCES.parentName;

      return {
        parentName,
        dailySummary: parseBoolean(parsed.dailySummary, DEFAULT_PREFERENCES.dailySummary),
        weeklyReport: parseBoolean(parsed.weeklyReport, DEFAULT_PREFERENCES.weeklyReport),
        smsAlerts: parseBoolean(parsed.smsAlerts, DEFAULT_PREFERENCES.smsAlerts),
        allowGames: parseBoolean(parsed.allowGames, DEFAULT_PREFERENCES.allowGames),
        allowAiBuddy: parseBoolean(parsed.allowAiBuddy, DEFAULT_PREFERENCES.allowAiBuddy),
        allowExtendedPlay: parseBoolean(parsed.allowExtendedPlay, DEFAULT_PREFERENCES.allowExtendedPlay),
      };
    } catch {
      // Continue trying fallback keys.
    }
  }

  return DEFAULT_PREFERENCES;
}

function TierBadge({ tier, fallbackColor }: { tier: string; fallbackColor: string }) {
  const c = TIER_COLORS[tier] ?? {
    bg: `${fallbackColor}18`,
    text: fallbackColor,
    border: `${fallbackColor}44`,
  };

  return (
    <span
      style={{
        display: 'inline-block',
        padding: '3px 12px',
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 700,
        background: c.bg,
        color: c.text,
        border: `1px solid ${c.border}`,
      }}
    >
      {tier}
    </span>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="report-section-title">{children}</h3>;
}

function MetricRow({
  label,
  value,
  bold,
}: {
  label: string;
  value: React.ReactNode;
  bold?: boolean;
}) {
  return (
    <tr>
      <td className="report-label-cell">{label}</td>
      <td className="report-value-cell" style={{ fontWeight: bold ? 700 : 500 }}>
        {value}
      </td>
    </tr>
  );
}

function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, value));
}

function mapSkillToPercent(level: string): number {
  const key = level.trim().toLowerCase();
  if (key.includes('star')) return 100;
  if (key.includes('active')) return 82;
  if (key.includes('improv')) return 64;
  if (key.includes('develop')) return 46;
  return 55;
}

type ChartSlice = {
  label: string;
  value: number;
  color: string;
};

function DonutChart({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  const pct = clampPercent(value);
  const style: React.CSSProperties = {
    background: `conic-gradient(${color} ${pct}%, rgba(148, 163, 184, 0.2) ${pct}% 100%)`,
  };

  return (
    <div className="report-chart-card">
      <p className="report-chart-title">{label}</p>
      <div className="report-donut-chart" style={style}>
        <div className="report-donut-center">
          <strong>{Math.round(pct)}%</strong>
        </div>
      </div>
      <p className="report-chart-footnote">Composite learning index</p>
    </div>
  );
}

function PieChart({
  label,
  slices,
}: {
  label: string;
  slices: ChartSlice[];
}) {
  const total = Math.max(1, slices.reduce((sum, item) => sum + Math.max(0, item.value), 0));
  let cumulative = 0;
  const gradientStops: string[] = [];

  for (const slice of slices) {
    const safeValue = Math.max(0, slice.value);
    const start = (cumulative / total) * 100;
    cumulative += safeValue;
    const end = (cumulative / total) * 100;
    gradientStops.push(`${slice.color} ${start}% ${end}%`);
  }

  const style: React.CSSProperties = {
    background: `conic-gradient(${gradientStops.join(', ')})`,
  };

  return (
    <div className="report-chart-card">
      <p className="report-chart-title">{label}</p>
      <div className="report-pie-chart" style={style} />
      <div className="report-legend-list">
        {slices.map(slice => (
          <div key={slice.label} className="report-legend-item">
            <span className="report-legend-dot" style={{ background: slice.color }} />
            <span>{slice.label}</span>
            <strong>{slice.value}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

function BarChart({
  label,
  bars,
}: {
  label: string;
  bars: Array<{ label: string; value: number; color: string }>;
}) {
  return (
    <div className="report-chart-card">
      <p className="report-chart-title">{label}</p>
      <div className="report-bar-chart">
        {bars.map(bar => {
          const width = clampPercent(bar.value);
          return (
            <div key={bar.label} className="report-bar-row">
              <span className="report-bar-label">{bar.label}</span>
              <div className="report-bar-track">
                <div
                  className="report-bar-fill"
                  style={{
                    width: `${width}%`,
                    background: `linear-gradient(90deg, ${bar.color}, ${bar.color}cc)`,
                  }}
                />
              </div>
              <strong className="report-bar-value">{Math.round(width)}%</strong>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function BulletChart({
  label,
  valuePct,
  markerPct,
  actualLabel,
}: {
  label: string;
  valuePct: number;
  markerPct: number;
  actualLabel: string;
}) {
  const safeValue = clampPercent(valuePct);
  const safeMarker = clampPercent(markerPct);

  return (
    <div className="report-chart-card">
      <p className="report-chart-title">{label}</p>
      <div className="report-bullet-wrap">
        <div className="report-bullet-track">
          <span className="report-bullet-range report-bullet-low" />
          <span className="report-bullet-range report-bullet-mid" />
          <span className="report-bullet-range report-bullet-high" />
          <span className="report-bullet-value" style={{ width: `${safeValue}%` }} />
          <span className="report-bullet-marker" style={{ left: `${safeMarker}%` }} />
        </div>
      </div>
      <div className="report-bullet-meta">
        <span>Actual: {actualLabel}</span>
        <span>Target marker: {Math.round(safeMarker)}%</span>
      </div>
    </div>
  );
}

export interface ReportPreviewProps {
  data: ReportCardData;
  onBack: () => void;
}

export const ReportPreview: React.FC<ReportPreviewProps> = ({ data, onBack }) => {
  const printRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownloadPdf = useCallback(async () => {
    if (!printRef.current || isDownloading) return;

    setIsDownloading(true);
    try {
      const canvas = await html2canvas(printRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
      });

      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 8;
      const contentWidth = pageWidth - margin * 2;
      const contentHeight = pageHeight - margin * 2;
      const pxPerMm = canvas.width / contentWidth;
      const pageCanvasHeight = Math.max(1, Math.floor(contentHeight * pxPerMm));

      const pageCanvas = document.createElement('canvas');
      const pageCtx = pageCanvas.getContext('2d');
      if (!pageCtx) throw new Error('Unable to initialize canvas context');

      let renderedHeight = 0;
      let pageIndex = 0;

      while (renderedHeight < canvas.height) {
        const sliceHeight = Math.min(pageCanvasHeight, canvas.height - renderedHeight);
        pageCanvas.width = canvas.width;
        pageCanvas.height = sliceHeight;

        pageCtx.fillStyle = '#ffffff';
        pageCtx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
        pageCtx.drawImage(
          canvas,
          0,
          renderedHeight,
          canvas.width,
          sliceHeight,
          0,
          0,
          canvas.width,
          sliceHeight,
        );

        if (pageIndex > 0) doc.addPage();
        const imageData = pageCanvas.toDataURL('image/png');
        const imageHeightMm = sliceHeight / pxPerMm;
        doc.addImage(imageData, 'PNG', margin, margin, contentWidth, imageHeightMm, undefined, 'FAST');

        renderedHeight += sliceHeight;
        pageIndex += 1;
      }

      const safeStudentName = data.studentName.replace(/[^a-zA-Z0-9_-]+/g, '_');
      const reportDate = new Date().toISOString().slice(0, 10);
      doc.save(`Report_Card_${safeStudentName}_${reportDate}.pdf`);
    } catch (error) {
      console.error('[ReportPreview] Failed to generate report PDF:', error);
    } finally {
      setIsDownloading(false);
    }
  }, [data.studentName, isDownloading]);

  const theme = useMemo(() => REPORT_THEMES[data.grade] ?? REPORT_THEMES[1], [data.grade]);
  const preferences = useMemo(() => readParentPreferences(data.grade), [data.grade]);

  const pendingHomework = Math.max(0, data.homeworkTotal - data.homeworkCompleted);
  const attendancePct = Math.max(0, Math.min(Number(data.attendance.attendancePercentage || 0), 100));
  const attendanceText = Number.isInteger(attendancePct) ? `${attendancePct}%` : `${attendancePct.toFixed(1)}%`;
  const homeworkPct = data.homeworkTotal > 0
    ? clampPercent((data.homeworkCompleted / data.homeworkTotal) * 100)
    : clampPercent(attendancePct > 0 ? 100 : 0);
  const engagementScore =
    data.engagementTier === 'Strong'
      ? 88
      : data.engagementTier === 'Active'
        ? 68
        : 45;
  const learningIndex = Math.round((attendancePct + homeworkPct + engagementScore) / 3);
  const attendanceSlices: ChartSlice[] = [
    { label: 'Present', value: data.attendance.presentDays, color: theme.primary },
    { label: 'Absent', value: data.attendance.absentDays, color: '#f97316' },
  ];
  const skillBars = [
    { label: 'Reading', value: mapSkillToPercent(data.skills.reading), color: theme.primary },
    { label: 'Writing', value: mapSkillToPercent(data.skills.writing), color: theme.secondary },
    { label: 'Participation', value: mapSkillToPercent(data.skills.participation), color: theme.accent },
  ];
  const xpTarget = 320;
  const xpPct = clampPercent((data.xp / xpTarget) * 100);
  const xpTargetMarkerPct = 75;

  const guidance = useMemo(() => {
    const tips: string[] = [];

    if (attendancePct < 75) {
      tips.push('Prioritize regular attendance to keep foundational continuity strong.');
    }

    if (pendingHomework > 0) {
      tips.push(`Complete ${pendingHomework} pending homework task${pendingHomework === 1 ? '' : 's'} this week.`);
    }

    if (data.streak < 3) {
      tips.push('Build a 3-day consistency streak with shorter but fixed daily study windows.');
    }

    if (!preferences.allowGames) {
      tips.push('Consider enabling learning games for short reinforcement sessions after core study.');
    }

    if (!preferences.weeklyReport) {
      tips.push('Weekly report notifications are disabled in Settings; enable them for scheduled reminders.');
    }

    if (tips.length === 0) {
      tips.push('Performance is stable. Maintain this pace and continue weekly revision for retention.');
    }

    return tips.slice(0, 4);
  }, [attendancePct, data.streak, pendingHomework, preferences.allowGames, preferences.weeklyReport]);

  const summaryCards = [
    { label: 'XP Earned', value: String(data.xp), note: `Level ${data.level}` },
    { label: 'Attendance', value: attendanceText, note: `${data.attendance.presentDays}/${data.attendance.totalSchoolDays} days` },
    { label: 'Current Streak', value: `${data.streak} days`, note: data.engagementTier },
    { label: 'Homework', value: `${data.homeworkCompleted}/${data.homeworkTotal}`, note: pendingHomework > 0 ? `${pendingHomework} pending` : 'All complete' },
    { label: 'Achievements', value: `${data.badgeCount}`, note: data.badgeCount > 0 ? 'Badges earned' : 'No badges yet' },
  ];

  const preferenceCards = [
    { label: 'Daily Summary', value: preferences.dailySummary ? 'Enabled' : 'Disabled' },
    { label: 'Weekly Report', value: preferences.weeklyReport ? 'Enabled' : 'Disabled' },
    { label: 'AI Buddy', value: preferences.allowAiBuddy ? 'Enabled' : 'Disabled' },
    { label: 'Learning Games', value: preferences.allowGames ? 'Enabled' : 'Disabled' },
    { label: 'SMS Alerts', value: preferences.smsAlerts ? 'Enabled' : 'Disabled' },
    { label: 'Extended Play', value: preferences.allowExtendedPlay ? 'Enabled' : 'Disabled' },
  ];

  const showAiNarrative = preferences.allowAiBuddy;

  const themeStyle = useMemo(
    () =>
      ({
        ['--report-primary' as string]: theme.primary,
        ['--report-secondary' as string]: theme.secondary,
        ['--report-accent' as string]: theme.accent,
        ['--report-soft' as string]: theme.soft,
        ['--report-badge' as string]: theme.badgeBg,
        ['--report-chip' as string]: theme.chip,
        ['--report-frost' as string]: theme.frost,
        ['--report-orb-a' as string]: theme.orbA,
        ['--report-orb-b' as string]: theme.orbB,
      }) as React.CSSProperties,
    [theme],
  );

  return (
    <div className="report-preview-shell">
      <div className="report-actions">
        <button className="report-btn report-btn-secondary" onClick={onBack}>
          Back to Dashboard
        </button>
        <button
          className="report-btn report-btn-primary"
          onClick={handleDownloadPdf}
          disabled={isDownloading}
        >
          {isDownloading ? 'Preparing PDF...' : 'Download Report Card'}
        </button>
      </div>

      <div ref={printRef} className={`report-page report-page-std-${data.grade}`} style={themeStyle}>
        <div className="report-orb report-orb-a" aria-hidden />
        <div className="report-orb report-orb-b" aria-hidden />

        <header className="report-header report-frost">
          <div>
            <h1 className="report-title">Student Progress Report</h1>
            <p className="report-subtitle">Smart Study Companion - Standard {data.grade}</p>
            <p className="report-parent">Prepared for {preferences.parentName}</p>
          </div>
          <div className="report-header-meta">
            <span className="report-pill">Std {data.grade} - {theme.label}</span>
            <span className="report-pill">Generated: {data.generatedAt}</span>
          </div>
        </header>

        <div className="report-chip-grid">
          <div className="report-chip"><strong>Name:</strong> {data.studentName}</div>
          <div className="report-chip"><strong>Grade:</strong> Standard {data.grade}</div>
          <div className="report-chip"><strong>Academic Year:</strong> {data.academicYear}</div>
          <div className="report-chip"><strong>Engagement Tier:</strong> {data.engagementTier}</div>
        </div>

        <div className="report-summary-grid">
          {summaryCards.map(card => (
            <div key={card.label} className="report-summary-card report-frost">
              <p className="report-summary-label">{card.label}</p>
              <p className="report-summary-value">{card.value}</p>
              <p className="report-summary-note">{card.note}</p>
            </div>
          ))}
        </div>

        <section className="report-section report-frost">
          <SectionTitle>Visual Insights</SectionTitle>
          <div className="report-chart-grid">
            <DonutChart
              label="Learning Index (Donut)"
              value={learningIndex}
              color={theme.primary}
            />
            <PieChart
              label="Attendance Mix (Pie)"
              slices={attendanceSlices}
            />
            <BarChart
              label="Skill Strength (Bar)"
              bars={skillBars}
            />
            <BulletChart
              label="XP Progress (Bullet)"
              valuePct={xpPct}
              markerPct={xpTargetMarkerPct}
              actualLabel={`${data.xp}/${xpTarget} XP`}
            />
          </div>
        </section>

        <section className="report-section report-frost">
          <SectionTitle>Engagement Overview</SectionTitle>
          <table className="report-table">
            <tbody>
              <MetricRow label="Total XP Earned" value={data.xp} />
              <MetricRow label="Current Level" value={data.level} />
              <MetricRow label="Current Streak" value={`${data.streak} days`} />
              <MetricRow label="Badges Earned" value={data.badgeCount} />
              <MetricRow
                label="Engagement Tier"
                value={<TierBadge tier={data.engagementTier} fallbackColor={theme.primary} />}
                bold
              />
            </tbody>
          </table>
        </section>

        <section className="report-section report-frost">
          <SectionTitle>Attendance Record</SectionTitle>
          <table className="report-table">
            <tbody>
              <MetricRow label="Total School Days" value={data.attendance.totalSchoolDays} />
              <MetricRow label="Days Present" value={data.attendance.presentDays} />
              <MetricRow label="Days Absent" value={data.attendance.absentDays} />
              <MetricRow label="Attendance Percentage" value={attendanceText} bold />
              <MetricRow
                label="Attendance Status"
                value={<TierBadge tier={data.attendanceTier} fallbackColor={theme.primary} />}
                bold
              />
            </tbody>
          </table>
        </section>

        <section className="report-section report-frost">
          <SectionTitle>Homework Completion</SectionTitle>
          <table className="report-table">
            <tbody>
              <MetricRow label="Total Assignments" value={data.homeworkTotal} />
              <MetricRow label="Completed" value={data.homeworkCompleted} />
              <MetricRow label="Pending" value={pendingHomework} />
              <MetricRow
                label="Homework Status"
                value={<TierBadge tier={data.homeworkTier} fallbackColor={theme.primary} />}
                bold
              />
            </tbody>
          </table>
        </section>

        <section className="report-section report-frost">
          <SectionTitle>Skills Assessment</SectionTitle>
          <table className="report-table">
            <tbody>
              <MetricRow label="Reading" value={data.skills.reading} />
              <MetricRow label="Writing" value={data.skills.writing} />
              <MetricRow label="Participation" value={data.skills.participation} />
            </tbody>
          </table>
          <p className="report-footnote">
            Skill indicators are qualitative observations from recorded activity and teacher input.
          </p>
        </section>

        {data.badgeCount > 0 && (
          <section className="report-section report-frost">
            <SectionTitle>Achievements</SectionTitle>
            <div className="report-achievements">
              {data.badgeNames.map(name => (
                <span key={name} className="report-achievement-pill">
                  {name}
                </span>
              ))}
            </div>
          </section>
        )}

        <section className="report-section report-frost">
          <SectionTitle>Applied Parent Preferences</SectionTitle>
          <div className="report-pref-grid">
            {preferenceCards.map(pref => (
              <div key={pref.label} className="report-pref-card">
                <p className="report-pref-label">{pref.label}</p>
                <p className="report-pref-value">{pref.value}</p>
              </div>
            ))}
          </div>
          {!preferences.weeklyReport && (
            <p className="report-note">Weekly report reminders are currently disabled in Settings.</p>
          )}
        </section>

        <section className="report-section report-frost">
          <SectionTitle>Assessment Summary</SectionTitle>
          <div className="report-body-copy">
            {showAiNarrative ? (
              <>
                <p>{data.aiFeedback.engagement}</p>
                <p>{data.aiFeedback.attendance}</p>
                <p>{data.aiFeedback.homework}</p>
              </>
            ) : (
              <p>
                AI Buddy insights are disabled in preferences. This section is based only on recorded engagement,
                attendance, and homework metrics.
              </p>
            )}
            <p className="report-highlight">{data.aiFeedback.summary}</p>
          </div>
        </section>

        <section className="report-section report-frost">
          <SectionTitle>Parent Guidance</SectionTitle>
          <ul className="report-list">
            {guidance.map(point => (
              <li key={point}>{point}</li>
            ))}
          </ul>
        </section>

        {data.teacherComment.trim() !== '' && (
          <section className="report-section report-frost">
            <SectionTitle>Teacher Comment</SectionTitle>
            <div className="report-comment-box">{data.teacherComment}</div>
          </section>
        )}

        <footer className="report-footer">
          <p>
            This report reflects recorded activity data only. It does not rank students or automate academic decisions.
          </p>
          <p>Smart Study Companion - SSMS Standard {data.grade} - {data.academicYear}</p>
        </footer>
      </div>
    </div>
  );
};

ReportPreview.displayName = 'ReportPreview';

