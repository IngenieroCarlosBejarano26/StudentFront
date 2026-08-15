import { Component } from '@angular/core';
import { StudentRegistrationFormComponent } from '../../components/student-registration-form/student-registration-form.component';

@Component({
  selector: 'app-student-registration',
  standalone: true,
  imports: [StudentRegistrationFormComponent],
  templateUrl: './student-registration.component.html',
  styleUrl: './student-registration.component.css'
})
export class StudentRegistrationComponent {

}
