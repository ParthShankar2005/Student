/**
 * parent/ParentNav.tsx
 * ─────────────────────────────────────────────────────
 * Premium Parent Sidebar + Mobile Bottom Nav
 *
 * Sidebar: Glass blur, soft vertical gradient, active pastel glow,
 *          icon circle backgrounds, section dividers, labels.
 * Active: Soft forest bg + colored left border.
 * No black text. Uses deep green / earth / leaf palette.
 */

import React, { useCallback, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../auth/AuthContext';
import { getAuditLog } from '../utils/auditLog';
import { buildLiveMonitoring, type LiveMonitoringState } from './liveMonitoring';

/* ── Screen type ── */

export type ParentScreen = 'overview' | 'progress' | 'games' | 'attendance' | 'ai-buddy' | 'books' | 'brain-boost' | 'puzzle-zone' | 'report' | 'settings';

/* ── Nav Items ── */

interface NavItem {
  key: ParentScreen;
  label: string;
  sublabel: string;
  icon: string;
  gradient: string;
  glowColor: string;
  accentColor: string;
  iconBg: string;
}

const NAV_ITEMS: NavItem[] = [
  { key: 'overview',    label: 'Overview',       sublabel: 'Dashboard',     icon: '📊', gradient: 'from-emerald-400 to-green-500', glowColor: 'rgba(63,143,58,0.20)',   accentColor: '#3f8f3a', iconBg: 'rgba(63,143,58,0.10)' },
  { key: 'progress',    label: 'Progress',       sublabel: 'Academics',     icon: '📈', gradient: 'from-lime-400 to-emerald-500',  glowColor: 'rgba(122,163,68,0.20)',  accentColor: '#7aa344', iconBg: 'rgba(122,163,68,0.10)' },
  { key: 'games',       label: 'Games',          sublabel: 'Play Progress', icon: '🎮', gradient: 'from-amber-400 to-lime-500',    glowColor: 'rgba(95,139,61,0.20)',   accentColor: '#5f8b3d', iconBg: 'rgba(95,139,61,0.10)' },
  { key: 'attendance',  label: 'Attendance',     sublabel: 'Tracking',      icon: '📅', gradient: 'from-teal-400 to-emerald-500',  glowColor: 'rgba(20,184,166,0.20)',  accentColor: '#14b8a6', iconBg: 'rgba(20,184,166,0.10)' },
  { key: 'ai-buddy',    label: 'AI Insights',    sublabel: 'Smart Help',    icon: '🧠', gradient: 'from-amber-400 to-orange-500',  glowColor: 'rgba(245,158,11,0.20)',  accentColor: '#f59e0b', iconBg: 'rgba(245,158,11,0.10)' },
  { key: 'books',       label: 'Books',          sublabel: 'Library',       icon: '📚', gradient: 'from-lime-400 to-amber-500',    glowColor: 'rgba(163,230,53,0.20)',  accentColor: '#84cc16', iconBg: 'rgba(163,230,53,0.10)' },
  { key: 'brain-boost', label: 'Brain Boost',    sublabel: 'Think & Learn', icon: '🧠', gradient: 'from-green-400 to-emerald-500', glowColor: 'rgba(63,143,58,0.20)',   accentColor: '#3f8f3a', iconBg: 'rgba(63,143,58,0.10)' },
  { key: 'puzzle-zone', label: 'Puzzle Zone',    sublabel: 'Solve & Explore', icon: '🧩', gradient: 'from-emerald-400 to-lime-500', glowColor: 'rgba(20,184,166,0.20)',  accentColor: '#14b8a6', iconBg: 'rgba(20,184,166,0.10)' },
  { key: 'report',      label: 'Report Card',    sublabel: 'Download PDF',  icon: '📄', gradient: 'from-emerald-400 to-teal-500',  glowColor: 'rgba(20,184,166,0.20)',  accentColor: '#14b8a6', iconBg: 'rgba(20,184,166,0.10)' },
  { key: 'settings',    label: 'Settings',       sublabel: 'Preferences',   icon: '⚙️', gradient: 'from-stone-400 to-emerald-500', glowColor: 'rgba(120,113,108,0.18)', accentColor: '#78716c', iconBg: 'rgba(120,113,108,0.08)' },
];

/* Divider after these indices (0-based): After Attendance (idx 3) and after Books (idx 5) */
const DIVIDER_AFTER = new Set([3, 5]);

/* ── Sidebar Item (desktop) ─────────────────────── */

const SidebarItem: React.FC<{
  item: NavItem;
  isActive: boolean;
  onNavigate: (screen: ParentScreen) => void;
}> = React.memo(({ item, isActive, onNavigate }) => {
  const handleClick = useCallback(() => onNavigate(item.key), [onNavigate, item.key]);

  return (
    <motion.button
      onClick={handleClick}
      className="relative w-full flex items-center gap-2 rounded-2xl text-left transition-all duration-200 group cursor-pointer"
      style={{
        padding: 'clamp(5px, 0.7vh, 12px) 12px clamp(5px, 0.7vh, 12px) 16px',
        ...(isActive ? {
          background: 'linear-gradient(135deg, rgba(127,174,101,0.12), rgba(167,201,127,0.08))',
          boxShadow: `0 3px 18px ${item.glowColor}, 0 1px 3px rgba(92,106,196,0.04)`,
          border: '1px solid rgba(127,174,101,0.12)',
        } : {
          background: 'transparent',
          border: '1px solid transparent',
        }),
      }}
      whileHover={!isActive ? { x: 2, background: 'rgba(127,174,101,0.05)' } : {}}
      whileTap={{ scale: 0.97 }}
    >
      {/* Left accent stripe */}
      {isActive && (
        <motion.div
          className="absolute left-0 top-[14%] bottom-[14%] w-[3.5px] rounded-r-full"
          style={{
            background: `linear-gradient(180deg, ${item.accentColor}, ${item.accentColor}88)`,
          }}
          layoutId="parent-sidebar-accent"
          transition={{ type: 'spring', stiffness: 350, damping: 30 }}
        />
      )}

      {/* Icon circle */}
      <motion.div
        className="relative flex items-center justify-center rounded-xl shrink-0"
        style={isActive ? {
          width: 36, height: 36,
          background: `linear-gradient(135deg, ${item.accentColor}22, ${item.accentColor}11)`,
          boxShadow: `0 2px 10px ${item.glowColor}`,
        } : {
          width: 32, height: 32,
          background: item.iconBg,
        }}
        animate={isActive ? { scale: [1, 1.02, 1] } : {}}
        transition={isActive ? { duration: 3, repeat: Infinity, ease: 'easeInOut' } : {}}
      >
        <span style={{ fontSize: isActive ? 16 : 14 }}>{item.icon}</span>
      </motion.div>

      {/* Label + sublabel */}
      <div style={{ minWidth: 0, flex: 1, overflow: 'hidden' }}>
        <span style={{
          fontSize: 'clamp(11px, 1.3vw, 13px)', fontWeight: isActive ? 700 : 600,
          color: isActive ? '#2E5E3A' : '#3E7A4D',
          display: 'block', lineHeight: 1.3,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {item.label}
        </span>
        <span style={{
          fontSize: 'clamp(8px, 1vw, 10px)', fontWeight: 500,
          color: isActive ? '#6C9274' : '#A0AEC0',
          display: 'block', lineHeight: 1.3,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {item.sublabel}
        </span>
      </div>
    </motion.button>
  );
});
SidebarItem.displayName = 'ParentSidebarItem';

/* ── Bottom Tab (mobile) ────────────────────────── */

const BottomTab: React.FC<{
  item: NavItem;
  isActive: boolean;
  onNavigate: (screen: ParentScreen) => void;
}> = React.memo(({ item, isActive, onNavigate }) => {
  const handleClick = useCallback(() => onNavigate(item.key), [onNavigate, item.key]);

  return (
    <motion.button
      onClick={handleClick}
      className="relative flex flex-col items-center justify-center gap-0.5 py-1 flex-1 cursor-pointer"
      whileTap={{ scale: 0.88 }}
    >
      {isActive && (
        <motion.div
          className={`absolute -top-0.5 w-11 h-11 rounded-2xl bg-gradient-to-br ${item.gradient} opacity-10`}
          layoutId="parent-mobile-tab-bg"
          transition={{ type: 'spring', stiffness: 350, damping: 30 }}
        />
      )}
      <motion.span
        className="text-xl relative z-10"
        animate={isActive ? { scale: 1.18, y: -1 } : { scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      >
        {item.icon}
      </motion.span>
      <span style={{
        fontSize: 10, fontWeight: isActive ? 700 : 600,
        color: isActive ? '#2E5E3A' : '#6C9274',
        position: 'relative', zIndex: 10,
      }}>
        {item.label}
      </span>
    </motion.button>
  );
});
BottomTab.displayName = 'ParentBottomTab';

/* ── Main ParentNav ─────────────────────────────── */

interface Props {
  active: ParentScreen;
  onNavigate: (screen: ParentScreen) => void;
}

export const ParentNav: React.FC<Props> = React.memo(({ active, onNavigate }) => {
  const { user } = useAuth();
  const firstName = user.name?.split(' ')[0] || 'Parent';

  const [liveMonitoring, setLiveMonitoring] = useState<LiveMonitoringState>(() => buildLiveMonitoring(getAuditLog()));

  useEffect(() => {
    const sync = () => setLiveMonitoring(buildLiveMonitoring(getAuditLog()));
    sync();
    const timer = window.setInterval(sync, 2000);
    window.addEventListener('storage', sync);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('storage', sync);
    };
  }, []);

  return (
  <>
    {/* ── Desktop Sidebar ── */}
    <motion.aside
      className="hidden lg:flex fixed left-0 w-[240px] flex-col pb-0 px-3 z-30 overflow-hidden"
      style={{
        top: 0,
        height: '100vh',
        paddingTop: 0,
        background: 'linear-gradient(180deg, #edf7e8 0%, #e0f0da 38%, #eaf5e5 72%, #f4f8ea 100%)',
        backdropFilter: 'blur(32px)',
        WebkitBackdropFilter: 'blur(32px)',
        borderRadius: '0 30px 30px 0',
        boxShadow: '4px 0 32px rgba(79,134,83,0.16), 1px 0 0 rgba(255,255,255,0.64)',
      }}
    >
      {/* ── Guardian Console header ── */}
      <div style={{
        padding: '20px 16px 12px',
        borderBottom: '1px solid rgba(127,174,101,0.1)',
        flexShrink: 0,
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          background: 'linear-gradient(135deg, rgba(63,143,58,0.10), rgba(127,174,101,0.08))',
          borderRadius: 18,
          padding: '10px 14px',
          border: '1px solid rgba(63,143,58,0.12)',
        }}>
          {/* Avatar */}
          <div style={{
            width: 38, height: 38, borderRadius: '50%',
            background: 'linear-gradient(135deg, #8FCF94 0%, #A7C97F 50%, #D8B674 100%)',
            boxShadow: '0 3px 12px rgba(127,174,101,0.35)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 15, fontWeight: 800, color: '#fff',
            flexShrink: 0,
          }}>
            {firstName[0]}
          </div>
          {/* Title */}
          <div style={{ minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: 12, fontWeight: 800, color: '#3F8F3A', lineHeight: '16px', whiteSpace: 'nowrap' }}>Guardian Console</p>
            <p style={{ margin: 0, fontSize: 9, fontWeight: 500, color: '#7E9A67', lineHeight: '14px', whiteSpace: 'nowrap' }}>Std 5 · Analytics View</p>
          </div>
        </div>
      </div>

      {/* Scrollable nav items */}
      <nav style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(2px, 0.6vh, 8px)', flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden', paddingTop: 4, paddingBottom: 8, scrollbarWidth: 'none', msOverflowStyle: 'none' }} className="hide-scrollbar">
        {NAV_ITEMS.map((item, idx) => (
          <React.Fragment key={item.key}>
            <SidebarItem
              item={item}
              isActive={active === item.key}
              onNavigate={onNavigate}
            />
            {DIVIDER_AFTER.has(idx) && (
              <div style={{
                height: 1, margin: '2px 16px',
                background: 'linear-gradient(90deg, transparent, rgba(127,174,101,0.12), transparent)',
              }} />
            )}
          </React.Fragment>
        ))}
      </nav>

      {/* Live monitoring */}
      <div style={{
        flexShrink: 0,
        padding: '8px 8px 12px',
        borderTop: '1px solid rgba(127,174,101,0.08)',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8,
        }}>
          <motion.div
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: liveMonitoring.indicatorColor,
              boxShadow: `0 0 8px ${liveMonitoring.indicatorColor}66`,
              flexShrink: 0,
            }}
            animate={{ scale: [1, 1.25, 1], opacity: [1, 0.72, 1] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
          />
          <p style={{ fontSize: 10, fontWeight: 800, color: '#2E5E3A', margin: 0, letterSpacing: '0.08em' }}>LIVE STATUS</p>
          <span
            style={{
              marginLeft: 'auto',
              fontSize: 9,
              fontWeight: 800,
              color: liveMonitoring.badgeColor,
              background: `${liveMonitoring.badgeColor}1f`,
              padding: '3px 8px',
              borderRadius: 999,
            }}
          >
            {liveMonitoring.badge}
          </span>
        </div>
        <div style={{
          display: 'flex', flexDirection: 'column', gap: 6,
          background: 'rgba(63,143,58,0.05)', borderRadius: 14,
          padding: '9px 12px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
            <span style={{ fontSize: 10, fontWeight: 600, color: '#6C9274' }}>Last activity</span>
            <span style={{ fontSize: 10, fontWeight: 700, color: '#2E5E3A', textAlign: 'right' }}>{liveMonitoring.lastSession}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
            <span style={{ fontSize: 10, fontWeight: 600, color: '#6C9274' }}>Recent session</span>
            <span style={{ fontSize: 10, fontWeight: 700, color: '#2E5E3A', textAlign: 'right' }}>{liveMonitoring.sessionLength}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start' }}>
            <span style={{ fontSize: 10, fontWeight: 600, color: '#6C9274' }}>Current activity</span>
            <span style={{ fontSize: 10, fontWeight: 700, color: '#3F8F3A', textAlign: 'right', maxWidth: 120, lineHeight: 1.35 }}>
              {liveMonitoring.currentActivity}
            </span>
          </div>
        </div>
      </div>
    </motion.aside>

    {/* ── Mobile Bottom Bar ── */}
    <motion.nav
      className="fixed bottom-0 left-0 right-0 h-16 z-40 flex items-center justify-around px-2 lg:hidden"
      style={{
        background: 'linear-gradient(180deg, rgba(241,250,237,0.94) 0%, rgba(255,255,255,0.98) 100%)',
        backdropFilter: 'blur(28px)',
        WebkitBackdropFilter: 'blur(28px)',
        borderTop: '1px solid rgba(127,174,101,0.1)',
        boxShadow: '0 -2px 24px rgba(79,134,83,0.12)',
      }}
      initial={{ y: 64 }}
      animate={{ y: 0 }}
      transition={{ type: 'spring', stiffness: 200, damping: 25 }}
    >
      {NAV_ITEMS.map(item => (
        <BottomTab
          key={item.key}
          item={item}
          isActive={active === item.key}
          onNavigate={onNavigate}
        />
      ))}
    </motion.nav>
  </>
  );
});

ParentNav.displayName = 'ParentNav';
