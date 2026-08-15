import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  FormArray,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { CheckboxChangeEvent, CheckboxModule } from 'primeng/checkbox';
import { InputTextModule } from 'primeng/inputtext';
import { KeyFilterModule } from 'primeng/keyfilter';
import { MessageModule } from 'primeng/message';
import { EnrollmentService } from '../../../../core/services/enrollment.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { SignalRService } from '../../../../core/services/signal-r.service';
import { StudentService } from '../../../../core/services/student.service';
import { SubjectService } from '../../../../core/services/subject.service';
import { BulkEnrollmentRequestDto } from '../../../../models/bulk-enrollment.model';
import { Student, SubjectDto } from '../../../../models/subject.model';
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
    CardModule,
    InputTextModule,
    KeyFilterModule,
    CheckboxModule,
    ButtonModule,
    MessageModule
  ],
  templateUrl: './student-registration-form.component.html',
  styleUrl: './student-registration-form.component.css'
})
export class StudentRegistrationFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly subjectService = inject(SubjectService);
  private readonly studentService = inject(StudentService);
  private readonly enrollmentService = inject(EnrollmentService);
  private readonly signalRService = inject(SignalRService);
  private readonly notificationService = inject(NotificationService);
  private readonly destroyRef = inject(DestroyRef);

  readonly availableCourses = signal<SubjectWithTeacher[]>([]);
  readonly selectedCoursesWithClassmates = signal<CourseWithClassmates[]>([]);
  readonly selectedCount = signal(0);
  readonly submitting = signal(false);
  readonly formResetId = signal(0);
  readonly maxCourses = 3;

  form!: FormGroup;
  private coursesWithStudents: SubjectDto[] = [];
  private studentIdempotencyKey = crypto.randomUUID();
  private enrollmentIdempotencyKey = crypto.randomUUID();

  ngOnInit(): void {
    this.initializeForm();
    this.loadAvailableCourses();
    this.loadCoursesWithStudents();
    this.loadSignalR();
  }

  private loadSignalR(): void {
    this.signalRService
      .startConnection()
      .then(() => {
        this.signalRService.subscribeMessage<unknown>('EnrollmentsCreated', () => {
          this.loadCoursesWithStudents();
        });
      })
      .catch((error: unknown) => {
        console.error('Error al conectar con SignalR:', error);
      });
  }

  private initializeForm(): void {
    this.form = this.fb.group({
      fullName: ['', Validators.required],
      identificationNumber: ['', Validators.required],
      courses: this.fb.array([]),
    });
  }

  private loadAvailableCourses(): void {
    this.subjectService.getSubjects()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((response) => {
        this.availableCourses.set(response.result ?? []);
        this.initializeCourseSelections();
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

    if (this.form.valid) {
      const selectedCourses = this.getSelectedCourses();
      if (selectedCourses.length === 0) {
        this.notificationService.showWarning(
          'Advertencia',
          'Debes seleccionar al menos una materia'
        );
        return;
      }

      const student: Student = {
        studentId: 0,
        name: this.form.value.fullName,
        identificationNumber: this.form.value.identificationNumber,
      };

      this.submitting.set(true);
      this.studentService.createStudent(student, this.studentIdempotencyKey)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (response) => {
            if (response.success && response.result) {
              if (response.result.studentId > 0) {
                this.createStudentCourses(response.result.studentId);
                return;
              }
            }
            this.submitting.set(false);
            this.notificationService.showError('Error', response.message ?? 'No se pudo crear el estudiante');
          },
          error: () => {
            this.submitting.set(false);
            this.notificationService.showError('Error', 'No se pudo crear el estudiante');
          }
        });
    } else {
      this.handleFormValidation();
    }
  }

  private resetAfterSuccess(): void {
    this.submitting.set(false);
    this.studentIdempotencyKey = crypto.randomUUID();
    this.enrollmentIdempotencyKey = crypto.randomUUID();

    this.form.get('fullName')?.reset('');
    this.form.get('identificationNumber')?.reset('');
    this.coursesFormArray.controls.forEach((control) => {
      control.reset(false);
    });

    this.selectedCount.set(0);
    this.selectedCoursesWithClassmates.set([]);
    this.formResetId.update((value) => value + 1);
    this.form.markAsPristine();
    this.form.markAsUntouched();
    this.loadCoursesWithStudents();
  }

  private handleFormValidation(): void {
    if (this.form.get('fullName')?.errors?.['required']) {
      this.notificationService.showWarning('Advertencia', 'El nombre es obligatorio');
    }

    if (this.form.get('identificationNumber')?.errors?.['required']) {
      this.notificationService.showWarning('Advertencia', 'El número de identificación es obligatorio');
    }
  }

  private createStudentCourses(studentId: number): void {
    const selectedCourses = this.getSelectedCourses();
    const bulkEnrollmentRequestDto: BulkEnrollmentRequestDto = {
      studentId,
      subjectIds: selectedCourses.map((course) => course.subjectId),
    };

    this.enrollmentService.createEnrollment(
      bulkEnrollmentRequestDto,
      this.enrollmentIdempotencyKey
    )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.notificationService.showNewStudentNotification(
              this.form.value.fullName,
              selectedCourses.length
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
        error: () => {
          this.submitting.set(false);
          this.notificationService.showError('Error', 'No se pudieron crear las inscripciones');
        }
      });
  }
}
