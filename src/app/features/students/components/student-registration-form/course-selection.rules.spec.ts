import { applyCourseSelections, evaluateCourseSelection } from './course-selection.rules';

describe('evaluateCourseSelection', () => {
  it('rechaza la cuarta materia', () => {
    const selected = [{ teacherId: 1 }, { teacherId: 2 }, { teacherId: 3 }];

    expect(evaluateCourseSelection(selected, { teacherId: 4 }, 3)).toBe('max');
  });

  it('rechaza el mismo profesor', () => {
    const selected = [{ teacherId: 1 }];

    expect(evaluateCourseSelection(selected, { teacherId: 1 }, 3)).toBe('same-teacher');
  });

  it('acepta una materia valida', () => {
    const selected = [{ teacherId: 1 }];

    expect(evaluateCourseSelection(selected, { teacherId: 2 }, 3)).toBeNull();
  });
});

describe('applyCourseSelections', () => {
  it('aplica selecciones en serie y no pasa de 3', () => {
    const result = applyCourseSelections(
      [],
      [{ teacherId: 1 }, { teacherId: 2 }, { teacherId: 3 }, { teacherId: 4 }],
      3
    );

    expect(result.length).toBe(3);
  });

  it('en una carrera con el mismo snapshot, ambas ven cupo y hay que serializar', () => {
    const snapshot = [{ teacherId: 1 }, { teacherId: 2 }];
    const first = evaluateCourseSelection(snapshot, { teacherId: 3 }, 3);
    const second = evaluateCourseSelection(snapshot, { teacherId: 4 }, 3);

    expect(first).toBeNull();
    expect(second).toBeNull();

    const serialized = applyCourseSelections(snapshot, [{ teacherId: 3 }, { teacherId: 4 }], 3);
    expect(serialized.length).toBe(3);
  });
});
