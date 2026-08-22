import { Routes } from '@angular/router';
import { authChildGuard, authGuard, homeRedirectGuard } from './core/guards/auth.guard';
import { guestGuard, guestMatchGuard } from './core/guards/guest.guard';
import { RedirectHomeComponent } from './core/guards/redirect-home.component';
import { roleGuard, roleMatchGuard } from './core/guards/role.guard';
import { AppRoles } from './models/auth.model';
import { AppShellComponent } from './features/layout/app-shell/app-shell.component';

export const routes: Routes = [
  {
    path: 'login',
    canMatch: [guestMatchGuard],
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./features/auth/pages/login/login.component').then((m) => m.LoginComponent)
  },
  {
    path: 'forbidden',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/auth/pages/forbidden/forbidden.component').then((m) => m.ForbiddenComponent)
  },
  {
    path: '',
    canActivate: [authGuard],
    canActivateChild: [authChildGuard],
    component: AppShellComponent,
    children: [
      {
        path: 'profesor',
        data: { roles: [AppRoles.Profesor] },
        canMatch: [roleMatchGuard],
        canActivate: [roleGuard],
        loadComponent: () =>
          import('./features/professor/pages/register-student/register-student.component')
            .then((m) => m.RegisterStudentComponent)
      },
      {
        path: 'estudiante',
        data: { roles: [AppRoles.Estudiante] },
        canMatch: [roleMatchGuard],
        canActivate: [roleGuard],
        loadComponent: () =>
          import('./features/students/pages/student-registration/student-registration.component')
            .then((m) => m.StudentRegistrationComponent)
      },
      {
        path: '',
        pathMatch: 'full',
        canActivate: [homeRedirectGuard],
        component: RedirectHomeComponent
      },
      {
        path: '**',
        canActivate: [homeRedirectGuard],
        component: RedirectHomeComponent
      }
    ]
  },
  {
    path: '**',
    canActivate: [homeRedirectGuard],
    component: RedirectHomeComponent
  }
];
