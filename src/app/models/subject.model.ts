export interface Student {
  studentId: number;
  identificationNumber: string;
  name: string;
}

export interface Teacher {
  teacherId: number;
  name: string;
}

export interface SubjectDto {
  subjectId: number;
  subjectName: string;
  teacher: Teacher;
  students: Student[];
}
