export interface BulkEnrollmentRequestDto {
  studentId: number;
  subjectIds: number[];
}

export interface EnrollmentDto {
  enrollmentId: number;
  studentId: number;
  subjectId: number;
}
