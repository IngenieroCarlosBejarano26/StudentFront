import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { KeyFilterModule } from 'primeng/keyfilter';
import { MessageModule } from 'primeng/message';
import { NotificationService } from '../../../../core/services/notification.service';
import { SignalRService } from '../../../../core/services/signal-r.service';
import { StudentService } from '../../../../core/services/student.service';
import { SubjectService } from '../../../../core/services/subject.service';
import { CreatedStudent } from '../../../../models/auth.model';
import { SubjectDto } from '../../../../models/subject.model';

@Component({
  selector: 'app-register-student',
  standalone: true,
  imports: [ReactiveFormsModule, CardModule, InputTextModule, KeyFilterModule, ButtonModule, MessageModule],
  templateUrl: './register-student.component.html',
  styleUrl: './register-student.component.css'
})
export class RegisterStudentComponent implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly students = inject(StudentService);
  private readonly subjects = inject(SubjectService);
  private readonly notifications = inject(NotificationService);
  private readonly signalR = inject(SignalRService);
  private readonly destroyRef = inject(DestroyRef);

  readonly submitting = signal(false);
  readonly created = signal<CreatedStudent | null>(null);
  readonly mySubjects = signal<SubjectDto[]>([]);
  private idempotencyKey = crypto.randomUUID();

  readonly form = this.fb.nonNullable.group({
    name: ['', Validators.required],
    identificationNumber: ['', Validators.required]
  });

  ngOnInit(): void {
    this.loadMyStudents();
    this.signalR
      .startConnection()
      .then(() => {
        this.signalR.subscribeMessage<unknown>('EnrollmentsCreated', () => this.loadMyStudents());
      })
      .catch((error: unknown) => {
        console.error('Error al conectar con SignalR:', error);
      });
  }

  ngOnDestroy(): void {
    this.signalR.stopConnection();
  }

  submit(): void {
    if (this.submitting() || this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.students.createStudent(this.form.getRawValue(), this.idempotencyKey).subscribe({
      next: (response) => {
        this.submitting.set(false);
        if (!response.success || !response.result) {
          this.notifications.showError('Error', response.message ?? 'No se pudo registrar al estudiante');
          return;
        }

        this.created.set(response.result);
        this.idempotencyKey = crypto.randomUUID();
        this.form.reset({ name: '', identificationNumber: '' });
        this.notifications.showSuccess(
          'Estudiante registrado',
          'Guarda el usuario y la contraseña temporal. Solo se muestran una vez.'
        );
      },
      error: (error: HttpErrorResponse) => {
        this.submitting.set(false);
        this.notifications.showError(
          'Error',
          error.error?.message ?? 'No se pudo registrar al estudiante'
        );
      }
    });
  }

  private loadMyStudents(): void {
    this.subjects.groupBySubject()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => this.mySubjects.set(response.result ?? []),
        error: () => this.mySubjects.set([])
      });
  }
}
