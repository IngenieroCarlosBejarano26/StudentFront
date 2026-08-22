import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { map, Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../../models/api-response.model';
import { AppRoles, AuthSession, LoginRequest, LoginResponse } from '../../models/auth.model';
import {
  decodeJwtPayload,
  isJwtExpired,
  readJwtRole,
  readJwtStudentId,
  readJwtTeacherId,
  readJwtUsername
} from '../security/jwt';

const TOKEN_KEY = 'access_token';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly session = signal<AuthSession | null>(this.readSession());

  readonly current = this.session.asReadonly();
  readonly isAuthenticated = computed(() => this.hasValidSession(this.session()));
  readonly role = computed(() => this.session()?.role ?? null);
  readonly username = computed(() => this.session()?.username ?? null);
  readonly studentId = computed(() => this.session()?.studentId ?? null);
  readonly token = computed(() => this.hasValidSession(this.session()) ? this.session()?.token ?? null : null);
  readonly homePath = computed(() =>
    this.role() === AppRoles.Profesor ? '/profesor' : '/estudiante'
  );

  login(request: LoginRequest): Observable<AuthSession> {
    const payload: LoginRequest = {
      username: request.username.trim(),
      password: request.password
    };

    return this.http
      .post<ApiResponse<LoginResponse>>(`${environment.apiUrl}/Auth/Login`, payload)
      .pipe(
        map((response) => {
          if (!response.success || !response.result?.token) {
            throw new Error(response.message ?? 'Usuario o contraseña inválidos.');
          }

          const session = this.sessionFromToken(response.result.token);
          if (!session) {
            throw new Error('El token recibido no es válido.');
          }

          return session;
        }),
        tap((session) => this.persist(session))
      );
  }

  logout(): void {
    this.clearSession();
    void this.router.navigateByUrl('/login');
  }

  clearSession(): void {
    sessionStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem('auth_session');
    this.session.set(null);
  }

  hasRole(role: string): boolean {
    return this.role() === role;
  }

  hasAnyRole(roles: string[]): boolean {
    const current = this.role();
    return current !== null && roles.includes(current);
  }

  private persist(session: AuthSession): void {
    sessionStorage.setItem(TOKEN_KEY, session.token);
    this.session.set(session);
  }

  private readSession(): AuthSession | null {
    const token = sessionStorage.getItem(TOKEN_KEY) ?? localStorage.getItem(TOKEN_KEY);
    const session = this.sessionFromToken(token);
    if (!session && token) {
      sessionStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem('auth_session');
    }

    return session;
  }

  private sessionFromToken(token: string | null): AuthSession | null {
    if (!token) {
      return null;
    }

    const payload = decodeJwtPayload(token);
    if (!payload || isJwtExpired(payload)) {
      return null;
    }

    const role = readJwtRole(payload);
    if (!role) {
      return null;
    }

    return {
      token,
      expiresAtUtc: new Date(payload.exp! * 1000).toISOString(),
      username: readJwtUsername(payload),
      role,
      studentId: readJwtStudentId(payload),
      teacherId: readJwtTeacherId(payload)
    };
  }

  private hasValidSession(session: AuthSession | null): boolean {
    if (!session?.token) {
      return false;
    }

    const payload = decodeJwtPayload(session.token);
    return payload !== null && !isJwtExpired(payload) && readJwtRole(payload) === session.role;
  }
}
