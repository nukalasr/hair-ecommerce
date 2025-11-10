import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { ValidationUtil } from '../../utils/validation.util';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './register.component.html',
  styleUrls: ['./auth.component.css']
})
export class RegisterComponent {
  email: string = '';
  password: string = '';
  confirmPassword: string = '';
  firstName: string = '';
  lastName: string = '';
  role: 'buyer' | 'seller' = 'buyer';
  isLoading: boolean = false;
  errorMessage: string = '';

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  register(): void {
    if (!this.email || !this.password || !this.firstName || !this.lastName) {
      this.errorMessage = 'Please fill in all fields';
      return;
    }

    // Validate email
    if (!ValidationUtil.isValidEmail(this.email)) {
      this.errorMessage = 'Please enter a valid email address';
      return;
    }

    // Validate names
    const firstNameValidation = ValidationUtil.validateName(this.firstName, 'First name');
    if (!firstNameValidation.valid) {
      this.errorMessage = firstNameValidation.message;
      return;
    }

    const lastNameValidation = ValidationUtil.validateName(this.lastName, 'Last name');
    if (!lastNameValidation.valid) {
      this.errorMessage = lastNameValidation.message;
      return;
    }

    if (this.password !== this.confirmPassword) {
      this.errorMessage = 'Passwords do not match';
      return;
    }

    // Validate password strength
    const passwordValidation = ValidationUtil.isStrongPassword(this.password);
    if (!passwordValidation.valid) {
      this.errorMessage = passwordValidation.message;
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    this.authService.register({
      email: this.email.trim(),
      password: this.password,
      firstName: firstNameValidation.sanitized,
      lastName: lastNameValidation.sanitized,
      role: this.role
    }).subscribe({
      next: (result) => {
        this.isLoading = false;
        if (result.success) {
          this.router.navigate(['/']);
        } else {
          this.errorMessage = result.message;
        }
      },
      error: (error) => {
        this.isLoading = false;
        this.errorMessage = 'An error occurred during registration. Please try again.';
        console.error('Registration error:', error);
      }
    });
  }
}
