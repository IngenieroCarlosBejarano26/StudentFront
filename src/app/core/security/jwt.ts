import { AppRoles } from '../../models/auth.model';

const ROLE_CLAIM = 'http://schemas.microsoft.com/ws/2008/06/identity/claims/role';
const NAME_CLAIM = 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name';

export interface JwtPayload {
  sub?: string;
  unique_name?: string;
  name?: string;
  role?: string | string[];
  student_id?: string;
  teacher_id?: string;
  exp?: number;
  [key: string]: unknown;
}

export function decodeJwtPayload(token: string): JwtPayload | null {
  const parts = token.split('.');
  if (parts.length !== 3) {
    return null;
  }

  try {
    const normalized = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(normalized.length + (4 - (normalized.length % 4)) % 4, '=');
    return JSON.parse(atob(padded)) as JwtPayload;
  } catch {
    return null;
  }
}

export function isJwtExpired(payload: JwtPayload, skewMs = 30_000): boolean {
  if (typeof payload.exp !== 'number') {
    return true;
  }

  return payload.exp * 1000 <= Date.now() + skewMs;
}

export function readJwtRole(payload: JwtPayload): string | null {
  const raw = payload.role ?? payload[ROLE_CLAIM];
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (value === AppRoles.Profesor || value === AppRoles.Estudiante) {
    return value;
  }

  return null;
}

export function readJwtUsername(payload: JwtPayload): string {
  const name = payload.unique_name ?? payload.name ?? payload[NAME_CLAIM];
  return typeof name === 'string' ? name : '';
}

export function readJwtStudentId(payload: JwtPayload): number | null {
  return readPositiveInt(payload.student_id);
}

export function readJwtTeacherId(payload: JwtPayload): number | null {
  return readPositiveInt(payload.teacher_id);
}

function readPositiveInt(raw: unknown): number | null {
  if (typeof raw !== 'string' && typeof raw !== 'number') {
    return null;
  }

  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}
