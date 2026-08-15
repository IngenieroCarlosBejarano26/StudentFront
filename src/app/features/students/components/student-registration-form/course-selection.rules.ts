export type CourseSelectionRejection = 'max' | 'same-teacher';

export interface CourseTeacher {
  teacherId: number;
}

export function evaluateCourseSelection(
  selectedOthers: CourseTeacher[],
  courseToSelect: CourseTeacher,
  maxCourses: number
): CourseSelectionRejection | null {
  if (selectedOthers.length >= maxCourses) {
    return 'max';
  }

  if (selectedOthers.some((course) => course.teacherId === courseToSelect.teacherId)) {
    return 'same-teacher';
  }

  return null;
}

export function applyCourseSelections(
  current: CourseTeacher[],
  incoming: CourseTeacher[],
  maxCourses: number
): CourseTeacher[] {
  const selected: CourseTeacher[] = [...current];

  for (const course of incoming) {
    if (evaluateCourseSelection(selected, course, maxCourses) === null) {
      selected.push(course);
    }
  }

  return selected;
}
