export interface Subject {
  subjectId: number;
  name: string;
  credits: number;
  teacherId: number;
}

export interface Teacher {
  teacherId: number;
  name: string;
  subjects?: Subject[];
}

export interface SubjectWithTeacher extends Subject {
  teacher: Teacher;
}
