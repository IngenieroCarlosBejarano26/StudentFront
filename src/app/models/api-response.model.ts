export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  result?: T;
  errorCode?: string;
}
