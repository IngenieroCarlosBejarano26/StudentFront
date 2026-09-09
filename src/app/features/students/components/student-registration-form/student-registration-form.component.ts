import { Component, DestroyRef, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  FormArray,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule
} from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { CheckboxChangeEvent, CheckboxModule } from 'primeng/checkbox';
import { MessageModule } from 'primeng/message';
import { AuthService } from '../../../../core/services/auth.service';
import { EnrollmentService } from '../../../../core/services/enrollment.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { SignalRService } from '../../../../core/services/signal-r.service';
import { SubjectService } from '../../../../core/services/subject.service';
import { BulkEnrollmentRequestDto } from '../../../../models/bulk-enrollment.model';
import { SubjectDto } from '../../../../models/subject.model';
import { SubjectWithTeacher } from '../../../../models/teacher.model';
import { evaluateCourseSelection } from './course-selection.rules';

interface CourseWithClassmates {
  course: string;
  classmates: string[];
}

@Component({
  selector: 'app-student-registration-form',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    CheckboxModule,
    ButtonModule,
    MessageModule
  ],
  templateUrl: './student-registration-form.component.html',
  styleUrl: './student-registration-form.component.css'
})
export class StudentRegistrationFormComponent implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly subjectService = inject(SubjectService);
  private readonly enrollmentService = inject(EnrollmentService);
  private readonly signalRService = inject(SignalRService);
  private readonly notificationService = inject(NotificationService);
  private readonly auth = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);

  readonly availableCourses = signal<SubjectWithTeacher[]>([]);
  readonly enrolledSubjectIds = signal<number[]>([]);
  readonly selectedCoursesWithClassmates = signal<CourseWithClassmates[]>([]);
  readonly selectedCount = signal(0);
  readonly submitting = signal(false);
  readonly formResetId = signal(0);
  readonly maxCourses = 3;

  form!: FormGroup;
  private coursesWithStudents: SubjectDto[] = [];
  private enrollmentIdempotencyKey = crypto.randomUUID();

  ngOnInit(): void {
    this.form = this.fb.group({
      courses: this.fb.array([])
    });
    this.loadAvailableCourses();
    this.loadCoursesWithStudents();
    this.loadSignalR();
  }

  ngOnDestroy(): void {
    this.signalRService.stopConnection();
  }

  isEnrolled(subjectId: number): boolean {
    return this.enrolledSubjectIds().includes(subjectId);
  }

  private loadSignalR(): void {
    this.signalRService
      .startConnection()
      .then(() => {
        this.signalRService.subscribeMessage<unknown>('EnrollmentsCreated', () => {
          this.loadCoursesWithStudents();
          this.loadMyEnrollments();
        });
      })
      .catch((error: unknown) => {
        console.error('Error al conectar con SignalR:', error);
      });
  }

  private loadAvailableCourses(): void {
    this.subjectService.getSubjects()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((response) => {
        this.availableCourses.set(response.result ?? []);
        this.initializeCourseSelections();
        this.loadMyEnrollments();
      });
  }

  private loadMyEnrollments(): void {
    this.enrollmentService.getMyEnrollments()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((response) => {
        const ids = (response.result ?? []).map((enrollment) => enrollment.subjectId);
        this.enrolledSubjectIds.set(ids);
        this.applyEnrolledSelection();
      });
  }

  private loadCoursesWithStudents(): void {
    this.subjectService.groupBySubject()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((response) => {
        this.coursesWithStudents = this.processCoursesData(response.result);
        this.refreshClassmates();
      });
  }

  private processCoursesData(parsedData: SubjectDto[] | Record<string, unknown> | undefined): SubjectDto[] {
    if (Array.isArray(parsedData)) {
      return parsedData;
    }

    if (parsedData && typeof parsedData === 'object') {
      const courses = Object.values(parsedData);
      return Array.isArray(courses[0]) ? courses[0] as SubjectDto[] : courses as SubjectDto[];
    }

    return [];
  }

  private initializeCourseSelections(): void {
    const coursesArray = this.form.get('courses') as FormArray;
    coursesArray.clear();
    this.availableCourses().forEach(() => {
      coursesArray.push(this.fb.control(false));
    });
    this.applyEnrolledSelection();
  }

  private applyEnrolledSelection(): void {
    if (!this.form || this.coursesFormArray.length === 0) {
      return;
    }

    const enrolled = new Set(this.enrolledSubjectIds());
    this.availableCourses().forEach((course, index) => {
      const control = this.coursesFormArray.at(index);
      if (!control) {
        return;
      }

      if (enrolled.has(course.subjectId)) {
        control.setValue(true, { emitEvent: false });
        control.disable({ emitEvent: false });
        return;
      }

      control.enable({ emitEvent: false });
    });

    this.refreshClassmates();
  }

  get coursesFormArray(): FormArray {
    return this.form.get('courses') as FormArray;
  }

  private refreshClassmates(): void {
    const selectedCourses = this.getSelectedCourses();
    this.selectedCount.set(selectedCourses.length);
    this.selectedCoursesWithClassmates.set(selectedCourses.map((course) => {
      const courseWithStudents = this.findCourseWithStudents(course.subjectId);
      return {
        course: course.name,
        classmates: courseWithStudents?.students?.map((student) => student.name) || []
      };
    }));
  }

  getSelectedCourses(): SubjectWithTeacher[] {
    const courses = this.availableCourses();
    return this.coursesFormArray.controls
      .map((control, index) =>
        control.value ? courses[index] : null
      )
      .filter((course): course is SubjectWithTeacher => course !== null);
  }

  getNewSelectedCourses(): SubjectWithTeacher[] {
    const enrolled = new Set(this.enrolledSubjectIds());
    return this.getSelectedCourses().filter((course) => !enrolled.has(course.subjectId));
  }

  private findCourseWithStudents(subjectId: number): SubjectDto | undefined {
    if (!Array.isArray(this.coursesWithStudents)) {
      return undefined;
    }

    return this.coursesWithStudents.find(
      (course) => course.subjectId === subjectId
    );
  }

  onCourseChange(index: number, event: CheckboxChangeEvent): void {
    const control = this.coursesFormArray.at(index);
    const courses = this.availableCourses();
    if (!control || !courses[index]) {
      return;
    }

    const courseToSelect = courses[index];
    if (this.isEnrolled(courseToSelect.subjectId)) {
      control.setValue(true, { emitEvent: false });
      this.refreshClassmates();
      return;
    }

    const selectedOthers = this.coursesFormArray.controls
      .map((item, currentIndex) =>
        currentIndex !== index && item.value ? courses[currentIndex] : null
      )
      .filter((course): course is SubjectWithTeacher => course !== null);

    if (!event.checked) {
      control.setValue(false, { emitEvent: true });
      this.refreshClassmates();
      return;
    }

    const rejection = evaluateCourseSelection(
      selectedOthers.map((course) => ({ teacherId: course.teacher.teacherId })),
      { teacherId: courseToSelect.teacher.teacherId },
      this.maxCourses
    );

    if (rejection === 'max') {
      control.setValue(false, { emitEvent: true });
      this.refreshClassmates();
      this.notificationService.showWarning(
        'Advertencia',
        'No puedes seleccionar más de 3 materias'
      );
      return;
    }

    if (rejection === 'same-teacher') {
      control.setValue(false, { emitEvent: true });
      this.refreshClassmates();
      this.notificationService.showWarning(
        'Advertencia',
        'No puedes seleccionar materias del mismo profesor'
      );
      return;
    }

    control.setValue(true, { emitEvent: true });
    this.refreshClassmates();
  }

  onSubmit(): void {
    if (this.submitting()) {
      return;
    }

    const newCourses = this.getNewSelectedCourses();
    if (newCourses.length === 0) {
      this.notificationService.showWarning(
        'Advertencia',
        this.enrolledSubjectIds().length > 0
          ? 'Ya estás inscrito en las materias seleccionadas'
          : 'Debes seleccionar al menos una materia'
      );
      return;
    }

    const request: BulkEnrollmentRequestDto = {
      studentId: this.auth.studentId() ?? 0,
      subjectIds: newCourses.map((course) => course.subjectId)
    };

    this.submitting.set(true);
    this.enrollmentService.createEnrollment(request, this.enrollmentIdempotencyKey)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.notificationService.showSuccess(
              'Inscripción lista',
              `Quedaste inscrito en ${newCourses.length} materia(s).`
            );
            this.resetAfterSuccess();
            return;
          }

          this.submitting.set(false);
          this.notificationService.showError(
            'Error',
            response.message ?? 'No se pudieron crear las inscripciones'
          );
        },
        error: (error) => {
          this.submitting.set(false);
          this.notificationService.showError(
            'Error',
            error?.error?.message ?? 'No se pudieron crear las inscripciones'
          );
        }
      });
  }

  private resetAfterSuccess(): void {
    this.submitting.set(false);
    this.enrollmentIdempotencyKey = crypto.randomUUID();
    this.formResetId.update((value) => value + 1);
    this.loadCoursesWithStudents();
    this.loadMyEnrollments();
  }
}
