import { Directive, Input, TemplateRef, ViewContainerRef, inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

@Directive({
  selector: '[appHasRole]',
  standalone: true
})
export class HasRoleDirective {
  private readonly auth = inject(AuthService);
  private readonly template = inject(TemplateRef<unknown>);
  private readonly viewContainer = inject(ViewContainerRef);
  private hasView = false;

  @Input() set appHasRole(roles: string | string[]) {
    const allowed = Array.isArray(roles) ? roles : [roles];
    const canShow = this.auth.hasAnyRole(allowed);

    if (canShow && !this.hasView) {
      this.viewContainer.createEmbeddedView(this.template);
      this.hasView = true;
      return;
    }

    if (!canShow && this.hasView) {
      this.viewContainer.clear();
      this.hasView = false;
    }
  }
}
