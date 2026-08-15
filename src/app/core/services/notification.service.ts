import { inject, Injectable } from '@angular/core';
import { MessageService } from 'primeng/api';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private readonly messageService = inject(MessageService);

  showSuccess(title: string, text: string): void {
    this.messageService.add({ severity: 'success', summary: title, detail: text, life: 4000 });
  }

  showWarning(title: string, text: string): void {
    this.messageService.add({ severity: 'warn', summary: title, detail: text, life: 4500 });
  }

  showError(title: string, text: string): void {
    this.messageService.add({ severity: 'error', summary: title, detail: text, life: 5000 });
  }

  showInfo(title: string, text: string): void {
    this.messageService.add({ severity: 'info', summary: title, detail: text, life: 4000 });
  }

  showNewStudentNotification(studentName: string, coursesCount: number): void {
    this.messageService.add({
      severity: 'success',
      summary: 'Estudiante registrado',
      detail: `${studentName} se inscribió en ${coursesCount} materia(s).`,
      life: 5000
    });
  }
}
