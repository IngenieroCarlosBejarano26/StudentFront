import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { AuthService } from '../../../../core/services/auth.service';
import { NotificationService } from '../../../../core/services/notification.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, InputTextModule, ButtonModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly notifications = inject(NotificationService);

  readonly submitting = signal(false);
  readonly showPassword = signal(false);

  readonly form = this.fb.nonNullable.group({
    username: ['', Validators.required],
    password: ['', Validators.required]
  });

  togglePassword(): void {
    this.showPassword.update((visible) => !visible);
  }

  submit(): void {
    if (this.submitting() || this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    const credentials = this.form.getRawValue();
    this.auth.login({
      username: credentials.username.trim(),
      password: credentials.password
    }).subscribe({
      next: () => {
        this.submitting.set(false);
        void this.router.navigateByUrl(this.auth.homePath());
      },
      error: (error: HttpErrorResponse | Error) => {
        this.submitting.set(false);
        const apiMessage = error instanceof HttpErrorResponse
          ? error.error?.message
          : error.message;
        this.notifications.showError(
          'No se pudo iniciar sesión',
          apiMessage ?? 'Usuario o contraseña inválidos.'
        );
      }
    });
  }
}
