import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../../models/api-response.model';
import { BulkEnrollmentRequestDto, EnrollmentDto } from '../../models/bulk-enrollment.model';

@Injectable({
  providedIn: 'root'
})
export class EnrollmentService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/Enrollment`;

  getMyEnrollments(): Observable<ApiResponse<EnrollmentDto[]>> {
    return this.http.get<ApiResponse<EnrollmentDto[]>>(`${this.apiUrl}/GetMyEnrollments`);
  }

  createEnrollment(
    request: BulkEnrollmentRequestDto,
    idempotencyKey: string
  ): Observable<ApiResponse<unknown>> {
    return this.http.post<ApiResponse<unknown>>(`${this.apiUrl}/CreateEnrollment`, request, {
      headers: { 'Idempotency-Key': idempotencyKey }
    });
  }
}
