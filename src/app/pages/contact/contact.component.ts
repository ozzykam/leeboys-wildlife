import { Component, inject } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ServiceRequestsService, ServiceRequest } from '../../data-access/service-requests.service';

@Component({
  selector: 'app-contact',
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './contact.component.html',
  styleUrl: './contact.component.scss'
})
export class ContactComponent {
  private fb = inject(FormBuilder);
  private serviceRequestService = inject(ServiceRequestsService);

  serviceRequestForm: FormGroup;
  isSubmitting = false;
  submitSuccess = false;
  submitError = '';

  serviceTypes = [
    { value: 'insect', label: 'Insect Service' },
    { value: 'rodent', label: 'Rodent Service' },
    { value: 'snake', label: 'Snake Service' },
    { value: 'wildlife', label: 'Wildlife Removal (trapping and removing nuisance wildlife from your property)' },
    { value: 'exclusion', label: 'Exclusion Service (sealing to prevent animal re-entry)' }
  ];

  contactPreferences = [
    { value: 'phone', label: 'Phone' },
    { value: 'text', label: 'Text' },
    { value: 'email', label: 'Email' }
  ];

  problemAnimals = [
    { value: 'insects', label: 'Insects' },
    { value: 'spiders', label: 'Spiders' },
    { value: 'rats_mice', label: 'Rats/Mice' },
    { value: 'moles', label: 'Moles' },
    { value: 'squirrels', label: 'Squirrels' },
    { value: 'raccoons', label: 'Raccoons' },
    { value: 'skunks', label: 'Skunks' },
    { value: 'opossum', label: 'Opossum' },
    { value: 'bats', label: 'Bats' }
  ];

  // Custom phone validator
  phoneValidator(control: any) {
    if (!control.value) {
      return null; // Let required validator handle empty values
    }

    const phoneValue = control.value.toString();
    
    // Remove all non-digit characters to check if we have 10 digits
    const digitsOnly = phoneValue.replace(/\D/g, '');
    
    if (digitsOnly.length !== 10) {
      return { invalidPhone: true };
    }

    // Check if the format matches one of the accepted patterns
    const validPatterns = [
      /^\d{10}$/, // 1234567890
      /^\(\d{3}\)\s?\d{3}-\d{4}$/, // (123) 456-7890 or (123)456-7890
      /^\d{3}-\d{3}-\d{4}$/ // 123-456-7890
    ];

    const isValidFormat = validPatterns.some(pattern => pattern.test(phoneValue));
    
    return isValidFormat ? null : { invalidPhone: true };
  }

  constructor() {
    this.serviceRequestForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      firstName: ['', [Validators.required, Validators.minLength(2)]],
      lastName: ['', [Validators.required, Validators.minLength(2)]],
      address: ['', [Validators.required]],
      phone: ['', [Validators.required, this.phoneValidator]],
      contactPreference: ['', [Validators.required]],
      contactPreferenceOther: [''],
      serviceTypes: this.fb.array([], [Validators.required]),
      serviceTypesOther: [''],
      problemAnimals: this.fb.array([], [Validators.required]),
      problemAnimalsOther: [''],
      additionalInfo: [''],
      currentCompany: [''],
      priceRange: [''],
      contactAgreement: [false, [Validators.requiredTrue]]
    });
  }

  async onSubmit() {
    if (this.serviceRequestForm.valid) {
      this.isSubmitting = true;
      this.submitError = '';

      try {
        const formValue = this.serviceRequestForm.value;
        
        // Combine first and last name for customerName
        const fullName = `${formValue.firstName} ${formValue.lastName}`.trim();
        
        // Determine the primary problem type from selected animals
        const primaryProblemType = this.determinePrimaryProblemType(formValue.problemAnimals);
        
        // Create description from all the collected information
        const description = this.buildDescription(formValue);
        
        const serviceRequest: Omit<ServiceRequest, 'id' | 'createdAt' | 'updatedAt' | 'status'> = {
          customerName: fullName,
          phone: formValue.phone,
          email: formValue.email,
          address: {
            street: formValue.address,
            city: '', // We're using single address field now
            state: '',
            zip: '',
          },
          problemType: primaryProblemType,
          description: description,
          emergency: false // No emergency field in new form
        };

        await this.serviceRequestService.createServiceRequest(serviceRequest);
        
        this.submitSuccess = true;
        
        // Reset form and clear arrays
        this.serviceRequestForm.reset();
        this.serviceTypesArray.clear();
        this.problemAnimalsArray.clear();
        
        // Reset success message after 5 seconds
        setTimeout(() => {
          this.submitSuccess = false;
        }, 5000);

      } catch (error) {
        console.error('Error submitting service request:', error);
        this.submitError = 'There was an error submitting your request. Please try again or call us directly.';
      } finally {
        this.isSubmitting = false;
      }
    } else {
      // Mark all fields as touched to show validation errors
      Object.keys(this.serviceRequestForm.controls).forEach(key => {
        this.serviceRequestForm.get(key)?.markAsTouched();
      });
    }
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.serviceRequestForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  getFieldError(fieldName: string): string {
    const field = this.serviceRequestForm.get(fieldName);
    if (field && field.errors) {
      if (field.errors['required']) {
        switch (fieldName) {
          case 'firstName': return 'First name is required';
          case 'lastName': return 'Last name is required';
          case 'email': return 'Email is required';
          case 'phone': return 'Phone number is required';
          case 'address': return 'Address is required';
          case 'contactPreference': return 'Contact preference is required';
          case 'serviceTypes': return 'Please select at least one service';
          case 'problemAnimals': return 'Please select at least one problem animal/pest';
          default: return `${fieldName} is required`;
        }
      }
      if (field.errors['email']) return 'Please enter a valid email address';
      if (field.errors['invalidPhone']) return 'Please enter a valid 10-digit phone number (formats: 1234567890, (123) 456-7890, or 123-456-7890)';
      if (field.errors['pattern']) {
        if (fieldName === 'phone') return 'Please enter a valid phone number';
      }
      if (field.errors['minlength']) return `${fieldName} is too short`;
    }
    return '';
  }

  // Helper methods for checkbox arrays
  get serviceTypesArray() {
    return this.serviceRequestForm.get('serviceTypes') as FormArray;
  }

  get problemAnimalsArray() {
    return this.serviceRequestForm.get('problemAnimals') as FormArray;
  }

  onServiceTypeChange(event: any, value: string) {
    const serviceTypesArray = this.serviceTypesArray;
    if (event.target.checked) {
      serviceTypesArray.push(this.fb.control(value));
    } else {
      const index = serviceTypesArray.controls.findIndex(control => control.value === value);
      if (index !== -1) {
        serviceTypesArray.removeAt(index);
      }
    }
  }

  onProblemAnimalChange(event: any, value: string) {
    const problemAnimalsArray = this.problemAnimalsArray;
    if (event.target.checked) {
      problemAnimalsArray.push(this.fb.control(value));
    } else {
      const index = problemAnimalsArray.controls.findIndex(control => control.value === value);
      if (index !== -1) {
        problemAnimalsArray.removeAt(index);
      }
    }
  }

  isServiceTypeChecked(value: string): boolean {
    return this.serviceTypesArray.value.includes(value);
  }

  isProblemAnimalChecked(value: string): boolean {
    return this.problemAnimalsArray.value.includes(value);
  }

  // Helper method to determine primary problem type from selected animals
  private determinePrimaryProblemType(problemAnimals: string[]): ServiceRequest['problemType'] {
    if (!problemAnimals || problemAnimals.length === 0) return 'other';
    
    // Priority mapping - more specific types first
    if (problemAnimals.includes('raccoons')) return 'raccoon';
    if (problemAnimals.includes('squirrels')) return 'squirrels';
    if (problemAnimals.includes('rats_mice')) return 'mice';
    if (problemAnimals.includes('insects') || problemAnimals.includes('spiders')) return 'insects';
    if (problemAnimals.includes('bats')) return 'bats';
    
    // Default to other for less common animals
    return 'other';
  }

  // Helper method to build comprehensive description from form data
  private buildDescription(formValue: any): string {
    let description = '';

    // Service types
    if (formValue.serviceTypes && formValue.serviceTypes.length > 0) {
      const serviceLabels = formValue.serviceTypes.map((type: string) => {
        const service = this.serviceTypes.find(s => s.value === type);
        return service ? service.label : type;
      });
      if (formValue.serviceTypesOther) {
        serviceLabels.push(formValue.serviceTypesOther);
      }
      description += `REQUESTED SERVICES: ${serviceLabels.join(', ')}\n\n`;
    }

    // Problem animals
    if (formValue.problemAnimals && formValue.problemAnimals.length > 0) {
      const animalLabels = formValue.problemAnimals.map((animal: string) => {
        const animalObj = this.problemAnimals.find(a => a.value === animal);
        return animalObj ? animalObj.label : animal;
      });
      if (formValue.problemAnimalsOther) {
        animalLabels.push(formValue.problemAnimalsOther);
      }
      description += `PROBLEM ANIMALS/PESTS: ${animalLabels.join(', ')}\n\n`;
    }

    // Contact preference
    if (formValue.contactPreference) {
      let contactPref = formValue.contactPreference;
      if (contactPref === 'other' && formValue.contactPreferenceOther) {
        contactPref = formValue.contactPreferenceOther;
      }
      description += `PREFERRED CONTACT METHOD: ${contactPref}\n\n`;
    }

    // Additional information
    if (formValue.additionalInfo) {
      description += `ADDITIONAL DETAILS: ${formValue.additionalInfo}\n\n`;
    }

    // Previous company info
    if (formValue.currentCompany) {
      description += `PREVIOUS/CURRENT COMPANY INFO: ${formValue.currentCompany}\n\n`;
    }

    // Budget range
    if (formValue.priceRange) {
      description += `BUDGET RANGE: ${formValue.priceRange}\n\n`;
    }

    return description.trim() || 'No additional details provided.';
  }
}
