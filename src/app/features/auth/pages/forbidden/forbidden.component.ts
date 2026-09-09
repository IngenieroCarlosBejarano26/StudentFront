import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-forbidden',
  standalone: true,
  imports: [ButtonModule],
  templateUrl: './forbidden.component.html',
  styleUrl: './forbidden.component.css'
})
export class ForbiddenComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  goHome(): void {
    void this.router.navigateByUrl(this.auth.homePath());
  }
}
