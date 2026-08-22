import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../../models/api-response.model';
import { CreatedStudent } from '../../models/auth.model';

@Injectable({
  providedIn: 'root'
})
export class StudentService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/Student`;

  createStudent(
    student: { name: string; identificationNumber: string },
    idempotencyKey: string
  ): Observable<ApiResponse<CreatedStudent>> {
    return this.http.post<ApiResponse<CreatedStudent>>(`${this.apiUrl}/CreateStudent`, student, {
      headers: { 'Idempotency-Key': idempotencyKey }
    });
  }
}
