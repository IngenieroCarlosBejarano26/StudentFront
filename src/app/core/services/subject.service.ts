import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../../models/api-response.model';
import { SubjectDto } from '../../models/subject.model';
import { SubjectWithTeacher } from '../../models/teacher.model';

@Injectable({
  providedIn: 'root'
})
export class SubjectService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/Subject`;

  getSubjects(): Observable<ApiResponse<SubjectWithTeacher[]>> {
    return this.http.get<ApiResponse<SubjectWithTeacher[]>>(`${this.apiUrl}/GetAllSubjects`);
  }

  groupBySubject(): Observable<ApiResponse<SubjectDto[]>> {
    return this.http.get<ApiResponse<SubjectDto[]>>(`${this.apiUrl}/GroupBySubject`);
  }
}
