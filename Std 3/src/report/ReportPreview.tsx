import React, { useCallback, useMemo, useRef } from 'react';
import type { ReportCardData } from './useReportGenerator';
import './report-print.css';

const THEME = {
  primary: '#1e293b',
  secondary: '#334155',
  accent: '#6366f1',
  soft: '#eef2ff',
  badgeBg: '#e2e8f0',
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

function TierBadge({ tier }: { tier: string }) {
  const c = TIER_COLORS[tier] ?? { bg: THEME.badgeBg, text: THEME.primary, border: `${THEME.primary}44` };
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
  return (
    <h3
      style={{
        fontSize: 12,
        fontWeight: 800,
        color: THEME.primary,
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        margin: '18px 0 10px',
        paddingBottom: 6,
        borderBottom: `2px solid ${THEME.primary}`,
      }}
    >
      {children}
    </h3>
  );
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
      <td style={{ padding: '5px 8px', fontSize: 12, color: '#334155' }}>{label}</td>
      <td
        style={{
          padding: '5px 8px',
          fontSize: 12,
          color: '#0f172a',
          fontWeight: bold ? 700 : 500,
          textAlign: 'right',
        }}
      >
        {value}
      </td>
    </tr>
  );
}

export interface ReportPreviewProps {
  data: ReportCardData;
  onBack: () => void;
}

export const ReportPreview: React.FC<ReportPreviewProps> = ({ data, onBack }) => {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  const pendingHomework = Math.max(0, data.homeworkTotal - data.homeworkCompleted);
  const attendancePct = Math.min(data.attendance.attendancePercentage, 100);

  const guidance = useMemo(() => {
    const tips: string[] = [];
    if (attendancePct < 75) tips.push('Focus on regular daily attendance to improve consistency and retention.');
    if (pendingHomework > 0) tips.push(`Complete ${pendingHomework} pending homework task${pendingHomework === 1 ? '' : 's'} this week.`);
    if (data.streak < 3) tips.push('Build a 3-day streak with short but regular practice sessions.');
    if (data.skills.reading.toLowerCase().includes('develop')) tips.push('Add 15 minutes of guided reading every day.');
    if (tips.length === 0) tips.push('Current performance is stable. Maintain this rhythm and continue revision practice.');
    return tips.slice(0, 3);
  }, [attendancePct, pendingHomework, data.streak, data.skills.reading]);

  const summaryCards = [
    { label: 'XP Earned', value: String(data.xp), note: `Level ${data.level}` },
    { label: 'Attendance', value: `${attendancePct}%`, note: `${data.attendance.presentDays}/${data.attendance.totalSchoolDays} days` },
    { label: 'Current Streak', value: `${data.streak} days`, note: data.engagementTier },
    { label: 'Homework', value: `${data.homeworkCompleted}/${data.homeworkTotal}`, note: pendingHomework > 0 ? `${pendingHomework} pending` : 'All complete' },
  ];

  return (
    <div className="report-preview-shell" style={{ maxWidth: 960, margin: '0 auto', padding: '16px 8px' }}>
      <div className="report-actions" style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
        <button
          onClick={onBack}
          style={{
            padding: '9px 20px',
            borderRadius: 10,
            border: '1px solid #d1d5db',
            background: '#fff',
            color: '#334155',
            fontSize: 13,
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          Back to Dashboard
        </button>
        <button
          onClick={handlePrint}
          style={{
            padding: '9px 20px',
            borderRadius: 10,
            border: 'none',
            background: `linear-gradient(135deg, ${THEME.primary}, ${THEME.secondary})`,
            color: '#fff',
            fontSize: 13,
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          Download / Print PDF
        </button>
      </div>

      <div ref={printRef} className="report-page report-theme">
        <header style={{ marginBottom: 18 }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              gap: 12,
              padding: '12px 14px',
              borderRadius: 14,
              background: `linear-gradient(135deg, ${THEME.soft}, #ffffff)`,
              border: `1px solid ${THEME.primary}22`,
            }}
          >
            <div>
              <h1 style={{ margin: 0, fontSize: 23, fontWeight: 900, color: THEME.primary, letterSpacing: '0.01em' }}>
                Student Progress Report
              </h1>
              <p style={{ margin: '4px 0 0', fontSize: 11, color: '#475569', fontWeight: 600 }}>
                Smart Study Companion - Standard {data.grade}
              </p>
            </div>
            <span
              style={{
                fontSize: 10,
                fontWeight: 800,
                color: THEME.primary,
                background: THEME.badgeBg,
                border: `1px solid ${THEME.primary}22`,
                borderRadius: 999,
                padding: '5px 10px',
              }}
            >
              Generated: {data.generatedAt}
            </span>
          </div>
        </header>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
            gap: 8,
            marginBottom: 14,
          }}
        >
          <div className="report-chip"><strong>Name:</strong> {data.studentName}</div>
          <div className="report-chip"><strong>Grade:</strong> Standard {data.grade}</div>
          <div className="report-chip"><strong>Academic Year:</strong> {data.academicYear}</div>
          <div className="report-chip"><strong>Tier:</strong> {data.engagementTier}</div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: 8,
            marginBottom: 4,
          }}
        >
          {summaryCards.map(card => (
            <div
              key={card.label}
              style={{
                borderRadius: 12,
                border: `1px solid ${THEME.primary}22`,
                background: '#ffffff',
                padding: '10px 12px',
              }}
            >
              <p style={{ margin: 0, fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', color: '#64748b' }}>{card.label.toUpperCase()}</p>
              <p style={{ margin: '5px 0 2px', fontSize: 17, fontWeight: 800, color: THEME.primary }}>{card.value}</p>
              <p style={{ margin: 0, fontSize: 10, color: '#475569' }}>{card.note}</p>
            </div>
          ))}
        </div>

        <SectionTitle>Engagement Overview</SectionTitle>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <tbody>
            <MetricRow label="Total XP Earned" value={data.xp} />
            <MetricRow label="Current Level" value={data.level} />
            <MetricRow label="Current Streak" value={`${data.streak} days`} />
            <MetricRow label="Badges Earned" value={data.badgeCount} />
            <MetricRow label="Engagement Tier" value={<TierBadge tier={data.engagementTier} />} bold />
          </tbody>
        </table>

        <SectionTitle>Attendance Record</SectionTitle>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <tbody>
            <MetricRow label="Total School Days" value={data.attendance.totalSchoolDays} />
            <MetricRow label="Days Present" value={data.attendance.presentDays} />
            <MetricRow label="Days Absent" value={data.attendance.absentDays} />
            <MetricRow label="Attendance Percentage" value={`${attendancePct}%`} bold />
            <MetricRow label="Attendance Status" value={<TierBadge tier={data.attendanceTier} />} bold />
          </tbody>
        </table>

        <SectionTitle>Homework Completion</SectionTitle>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <tbody>
            <MetricRow label="Total Assignments" value={data.homeworkTotal} />
            <MetricRow label="Completed" value={data.homeworkCompleted} />
            <MetricRow label="Pending" value={pendingHomework} />
            <MetricRow label="Homework Status" value={<TierBadge tier={data.homeworkTier} />} bold />
          </tbody>
        </table>

        <SectionTitle>Skills Assessment</SectionTitle>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <tbody>
            <MetricRow label="Reading" value={data.skills.reading} />
            <MetricRow label="Writing" value={data.skills.writing} />
            <MetricRow label="Participation" value={data.skills.participation} />
          </tbody>
        </table>
        <p style={{ fontSize: 10, color: '#64748b', fontStyle: 'italic', marginTop: 4 }}>
          Skills are qualitative indicators based on observed behavior and learning activity.
        </p>

        {data.badgeCount > 0 && (
          <>
            <SectionTitle>Achievements</SectionTitle>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {data.badgeNames.map(name => (
                <span
                  key={name}
                  style={{
                    padding: '4px 10px',
                    borderRadius: 999,
                    fontSize: 11,
                    fontWeight: 700,
                    background: THEME.badgeBg,
                    color: THEME.primary,
                    border: `1px solid ${THEME.primary}22`,
                  }}
                >
                  {name}
                </span>
              ))}
            </div>
          </>
        )}

        <SectionTitle>Assessment Summary</SectionTitle>
        <div style={{ fontSize: 12, color: '#334155', lineHeight: 1.65 }}>
          <p style={{ margin: '0 0 8px' }}>{data.aiFeedback.engagement}</p>
          <p style={{ margin: '0 0 8px' }}>{data.aiFeedback.attendance}</p>
          <p style={{ margin: '0 0 8px' }}>{data.aiFeedback.homework}</p>
          <p
            style={{
              margin: '12px 0 0',
              padding: '9px 12px',
              background: THEME.soft,
              borderLeft: `3px solid ${THEME.accent}`,
              borderRadius: 10,
              fontWeight: 600,
              fontSize: 12,
            }}
          >
            {data.aiFeedback.summary}
          </p>
        </div>

        <SectionTitle>Parent Guidance</SectionTitle>
        <ul style={{ margin: '0 0 0 18px', padding: 0, color: '#334155', fontSize: 12, lineHeight: 1.65 }}>
          {guidance.map(point => (
            <li key={point} style={{ marginBottom: 4 }}>{point}</li>
          ))}
        </ul>

        {data.teacherComment.trim() !== '' && (
          <>
            <SectionTitle>Teacher Comment</SectionTitle>
            <div
              style={{
                fontSize: 12,
                color: '#334155',
                lineHeight: 1.65,
                padding: '9px 12px',
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: 10,
                whiteSpace: 'pre-wrap',
              }}
            >
              {data.teacherComment}
            </div>
          </>
        )}

        <footer style={{ marginTop: 26, borderTop: '1px solid #cbd5e1', paddingTop: 10, textAlign: 'center' }}>
          <p style={{ fontSize: 9, color: '#94a3b8', fontStyle: 'italic', lineHeight: 1.6, maxWidth: 560, margin: '0 auto' }}>
            This report is generated from recorded activity data. It does not rank or compare students.
            AI feedback is template-based and final academic decisions remain with educators.
          </p>
          <p style={{ fontSize: 9, color: '#94a3b8', marginTop: 8 }}>
            Smart Study Companion - SSMS Standard {data.grade} - {data.academicYear}
          </p>
        </footer>
      </div>
    </div>
  );
};

ReportPreview.displayName = 'ReportPreview';
