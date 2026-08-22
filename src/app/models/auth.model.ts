export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  expiresAtUtc: string;
  username: string;
  role: string;
  studentId?: number | null;
  teacherId?: number | null;
}

export interface AuthSession {
  token: string;
  expiresAtUtc: string;
  username: string;
  role: string;
  studentId: number | null;
  teacherId: number | null;
}

export interface CreatedStudent {
  studentId: number;
  name: string;
  identificationNumber: string;
  username: string;
  temporaryPassword: string;
}

export const AppRoles = {
  Profesor: 'Profesor',
  Estudiante: 'Estudiante'
} as const;
