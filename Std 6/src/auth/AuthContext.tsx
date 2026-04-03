import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { authenticateStudent, getStudentProfileById, saveStudentProfileOverrides, type StudentProfile } from '../data/studentProfiles';
import { logAction } from '../utils/auditLog';

export type UserRole = 'student' | 'parent';
export interface AuthUser { role: UserRole; grade: number; name: string; }
export interface AuthActionResult { ok: boolean; error?: string; }
export interface AuthNotice { tone: 'success'; message: string; }
interface AuthState { isAuthenticated: boolean; user: AuthUser; studentProfile: StudentProfile | null; parentVerified: boolean; }
export interface AuthContextType {
  user: AuthUser; isAuthenticated: boolean; studentProfile: StudentProfile | null; isParentAccessPromptOpen: boolean; notice: AuthNotice | null;
  switchRole: () => boolean; setRole: (role: UserRole) => boolean; setGrade: (grade: number) => void;
  login: (studentId: string, password: string) => AuthActionResult;
  loginWithParentAccessKey: (studentId: string, accessKey: string) => AuthActionResult;
  logout: () => void; updateStudentProfile: (updates: Partial<StudentProfile>) => AuthActionResult;
  requestParentAccess: () => void; cancelParentAccess: () => void; verifyParentAccessKey: (accessKey: string) => AuthActionResult;
  switchToStudentView: () => void; clearNotice: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);
const SESSION_STORAGE_KEY = 'ssms_std6_student_session_v1';
const LEGACY_ROLE_STORAGE_KEY = 'ssms_std6_auth_role_legacy';
const DEFAULT_USER: AuthUser = { role: 'student', grade: 6, name: 'Explorer' };
interface PersistedSession { studentId: string; }
const persistSession = (studentId: string) => { try { localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({ studentId })); } catch {} };
const clearSessionStorage = () => { try { localStorage.removeItem(SESSION_STORAGE_KEY); localStorage.removeItem(LEGACY_ROLE_STORAGE_KEY); } catch {} };

function loadPersistedState(): AuthState {
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return { isAuthenticated: false, user: DEFAULT_USER, studentProfile: null, parentVerified: false };
    const parsed = JSON.parse(raw) as PersistedSession;
    if (!parsed.studentId) return { isAuthenticated: false, user: DEFAULT_USER, studentProfile: null, parentVerified: false };
    const profile = getStudentProfileById(parsed.studentId);
    if (!profile) return { isAuthenticated: false, user: DEFAULT_USER, studentProfile: null, parentVerified: false };
    return { isAuthenticated: true, user: { role: 'student', grade: profile.grade, name: profile.studentName }, studentProfile: profile, parentVerified: false };
  } catch { return { isAuthenticated: false, user: DEFAULT_USER, studentProfile: null, parentVerified: false }; }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState>(loadPersistedState);
  const [isParentAccessPromptOpen, setParentAccessPromptOpen] = useState(false);
  const [notice, setNotice] = useState<AuthNotice | null>(null);

  const requestParentAccess = useCallback(() => { if (!authState.isAuthenticated || authState.user.role !== 'student') return; setAuthState(prev => ({ ...prev, parentVerified: false })); setParentAccessPromptOpen(true); }, [authState.isAuthenticated, authState.user.role]);
  const cancelParentAccess = useCallback(() => setParentAccessPromptOpen(false), []);
  const switchToStudentView = useCallback(() => { setAuthState(prev => prev.user.role === 'student' && !prev.parentVerified ? prev : ({ ...prev, parentVerified: false, user: { ...prev.user, role: 'student' } })); setParentAccessPromptOpen(false); }, []);

  const verifyParentAccessKey = useCallback((accessKey: string): AuthActionResult => {
    if (!authState.isAuthenticated || !authState.studentProfile) return { ok: false, error: 'Please login first' };
    if (accessKey.trim() !== authState.studentProfile.parentAccessKey) return { ok: false, error: 'Invalid Parent Access Key' };
    setAuthState(prev => ({ ...prev, parentVerified: true, user: { ...prev.user, role: 'parent' } }));
    setParentAccessPromptOpen(false); setNotice({ tone: 'success', message: 'Parent view unlocked' });
    logAction('parent_authenticated', 'parent', { studentId: authState.studentProfile.studentId }); return { ok: true };
  }, [authState.isAuthenticated, authState.studentProfile]);

  const login = useCallback((studentId: string, password: string): AuthActionResult => {
    const profile = authenticateStudent(studentId, password);
    if (!profile) return { ok: false, error: 'Invalid Student ID or Password' };
    setAuthState({ isAuthenticated: true, user: { role: 'student', grade: profile.grade, name: profile.studentName }, studentProfile: profile, parentVerified: false });
    setParentAccessPromptOpen(false); setNotice(null); persistSession(profile.studentId); return { ok: true };
  }, []);

  const loginWithParentAccessKey = useCallback((studentId: string, accessKey: string): AuthActionResult => {
    const normalizedId = studentId.trim().toUpperCase();
    if (!normalizedId) return { ok: false, error: 'Student ID is required' };
    const profile = getStudentProfileById(normalizedId);
    if (!profile) return { ok: false, error: 'Invalid Student ID' };
    if (!accessKey.trim()) return { ok: false, error: 'Parent Access Key is required' };
    if (accessKey.trim() !== profile.parentAccessKey) return { ok: false, error: 'Invalid Parent Access Key' };
    setAuthState({ isAuthenticated: true, user: { role: 'parent', grade: profile.grade, name: profile.parentName || `${profile.studentName} Parent` }, studentProfile: profile, parentVerified: true });
    setParentAccessPromptOpen(false); setNotice({ tone: 'success', message: 'Parent view unlocked' }); persistSession(profile.studentId);
    logAction('parent_authenticated', 'parent', { studentId: profile.studentId, source: 'login' }); return { ok: true };
  }, []);

  const logout = useCallback(() => { setAuthState({ isAuthenticated: false, user: DEFAULT_USER, studentProfile: null, parentVerified: false }); setParentAccessPromptOpen(false); setNotice(null); clearSessionStorage(); }, []);
  const updateStudentProfile = useCallback((updates: Partial<StudentProfile>): AuthActionResult => {
    if (!authState.isAuthenticated || !authState.studentProfile) return { ok: false, error: 'Please login first' };
    const nextProfile = saveStudentProfileOverrides(authState.studentProfile.studentId, updates);
    if (!nextProfile) return { ok: false, error: 'Unable to save profile settings' };
    setAuthState(prev => ({ ...prev, user: { ...prev.user, name: nextProfile.studentName, grade: nextProfile.grade }, studentProfile: nextProfile })); return { ok: true };
  }, [authState.isAuthenticated, authState.studentProfile]);

  const setRole = useCallback((role: UserRole): boolean => {
    if (!authState.isAuthenticated) return false;
    if (role === authState.user.role) return true;
    if (role === 'parent') { requestParentAccess(); return false; }
    switchToStudentView(); return true;
  }, [authState.isAuthenticated, authState.user.role, requestParentAccess, switchToStudentView]);
  const switchRole = useCallback((): boolean => !authState.isAuthenticated ? false : authState.user.role === 'parent' ? (switchToStudentView(), true) : setRole('parent'), [authState.isAuthenticated, authState.user.role, setRole, switchToStudentView]);
  const setGrade = useCallback((grade: number) => setAuthState(prev => ({ ...prev, user: { ...prev.user, grade }, studentProfile: prev.studentProfile ? { ...prev.studentProfile, grade } : prev.studentProfile })), []);
  const clearNotice = useCallback(() => setNotice(null), []);

  const value = useMemo<AuthContextType>(() => ({
    user: authState.user, isAuthenticated: authState.isAuthenticated, studentProfile: authState.studentProfile, isParentAccessPromptOpen, notice,
    switchRole, setRole, setGrade, login, loginWithParentAccessKey, logout, updateStudentProfile, requestParentAccess, cancelParentAccess, verifyParentAccessKey, switchToStudentView, clearNotice,
  }), [authState.user, authState.isAuthenticated, authState.studentProfile, isParentAccessPromptOpen, notice, switchRole, setRole, setGrade, login, loginWithParentAccessKey, logout, updateStudentProfile, requestParentAccess, cancelParentAccess, verifyParentAccessKey, switchToStudentView, clearNotice]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}
