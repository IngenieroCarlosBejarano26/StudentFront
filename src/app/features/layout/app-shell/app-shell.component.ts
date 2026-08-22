import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { HasRoleDirective } from '../../../core/directives/has-role.directive';
import { AuthService } from '../../../core/services/auth.service';
import { AppRoles } from '../../../models/auth.model';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, ButtonModule, HasRoleDirective],
  templateUrl: './app-shell.component.html',
  styleUrl: './app-shell.component.css'
})
export class AppShellComponent {
  readonly auth = inject(AuthService);
  readonly roles = AppRoles;

  logout(): void {
    this.auth.logout();
  }
}
