import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { Router } from '@angular/router';
import { CalendarComponent, CalendarEvent } from '../../shared/calendar/calendar.component';
import { SchedulerService, ScheduledService } from '../../data-access/scheduler.service';
import { ServiceRequestsService, ServiceRequest } from '../../data-access/service-requests.service';
import { AuthService, UserProfile } from '../../data-access/auth.service';
import { Observable, map } from 'rxjs';

@Component({
  selector: 'app-scheduler',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatIconModule,
    MatButtonModule,
    MatSelectModule,
    MatInputModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatCheckboxModule,
    CalendarComponent
  ],
  templateUrl: './scheduler.component.html',
  styleUrl: './scheduler.component.scss'
})
export class SchedulerComponent implements OnInit {
  private fb = inject(FormBuilder);
  private schedulerService = inject(SchedulerService);
  private serviceRequestsService = inject(ServiceRequestsService);
  private authService = inject(AuthService);
  private router = inject(Router);

  // Available time slots based on selected duration
  availableTimeSlots: string[] = [];
  selectedTimeSlot: string = '';
  
  // Duration options (30 min increments up to 8 hours)
  durationOptions = [
    { value: 60, label: '1 hour' },
    { value: 90, label: '1.5 hours' },
    { value: 120, label: '2 hours' },
    { value: 150, label: '2.5 hours' },
    { value: 180, label: '3 hours' },
    { value: 210, label: '3.5 hours' },
    { value: 240, label: '4 hours' },
    { value: 270, label: '4.5 hours' },
    { value: 300, label: '5 hours' },
    { value: 330, label: '5.5 hours' },
    { value: 360, label: '6 hours' },
    { value: 390, label: '6.5 hours' },
    { value: 420, label: '7 hours' },
    { value: 450, label: '7.5 hours' },
    { value: 480, label: '8 hours' }
  ];

  // Selected services (checkboxes)
  selectedServices: Set<string> = new Set();
  
  // You can tweak these defaults in one place
  private readonly SLOT_MINUTES = 30;
  private readonly WORK_START = '08:00';
  private readonly WORK_END = '18:00';

  minDate: string = '';
  scheduleForm: FormGroup;
  serviceRequests$: Observable<ServiceRequest[]>;
  availableCustomers$: Observable<UserProfile[]>;
  selectedDate: Date | null = null;
  calendarEvents$: Observable<CalendarEvent[]>;
  isLoading = false;
  isSubmitting = false;
  selectedServiceRequest: ServiceRequest | null = null;
  selectedCustomer: UserProfile | null = null;

  serviceTypes = [
    { value: 'raccoon', label: 'Raccoon Removal' },
    { value: 'mice', label: 'Mice Control' },
    { value: 'bats', label: 'Bat Removal' },
    { value: 'squirrels', label: 'Squirrel Control' },
    { value: 'insects', label: 'Insect Control' },
    { value: 'dead_animal', label: 'Dead Animal Removal' },
    { value: 'other', label: 'Other Services' }
  ];

  priorities = [
    { value: 'low', label: 'Low' },
    { value: 'medium', label: 'Medium' },
    { value: 'high', label: 'High' },
    { value: 'emergency', label: 'Emergency' }
  ];

  constructor() {
    this.scheduleForm = this.fb.group({
      serviceRequestId: ['', Validators.required],
      customerId: ['', Validators.required],
      selectedServices: [[], Validators.required], // Array of selected service types
      description: ['', Validators.required],
      duration: [60, Validators.required], // Default 1 hour
      scheduledDate: ['', Validators.required],
      timeSlot: ['', Validators.required], // Selected time slot
      priority: ['medium', Validators.required],
      estimatedCost: [0],
      notes: [''],
      equipmentNeeded: [[]],
      assignedTechnician: ['']
    });

    this.serviceRequests$ = this.serviceRequestsService.getAllServiceRequests();
    this.availableCustomers$ = this.authService.getAllUsers().pipe(
      map(users => users.filter(user => user.role === 'user'))
    );

    this.calendarEvents$ = this.schedulerService.getAllScheduledServices().pipe(
      map(services => this.convertServicesToCalendarEvents(services))
    );
  }

  ngOnInit() {
    // Default date = today
    this.selectedDate = new Date();
    const today = new Date();
    this.minDate = today.toISOString().split('T')[0];
    this.scheduleForm.patchValue({ scheduledDate: this.formatDateForInput(this.selectedDate) });
    this.loadAvailableTimeSlots();
  }

  async onDateSelected(date: Date) {
    this.selectedDate = date;
    this.scheduleForm.patchValue({ scheduledDate: this.formatDateForInput(date), timeSlot: '' });
    this.selectedTimeSlot = '';
    await this.loadAvailableTimeSlots();
  }

  async onDateInputChange(event: Event) {
    const target = event.target as HTMLInputElement;
    if (target.value) {
      const [year, month, day] = target.value.split('-').map(Number);
      const selectedDate = new Date(year, month - 1, day);
      await this.onDateSelected(selectedDate);
    }
  }

  /** Load available time slots based on selected duration */
  async loadAvailableTimeSlots() {
    if (!this.selectedDate) return;

    const selectedDuration = this.scheduleForm.get('duration')?.value || 60;
    
    this.availableTimeSlots = await this.schedulerService.getAvailableTimeSlots(this.selectedDate, {
      durationMinutes: selectedDuration,
      slotMinutes: this.SLOT_MINUTES,
      workStart: this.WORK_START,
      workEnd: this.WORK_END
    });

    // Clear selected time slot if it's no longer available
    if (this.selectedTimeSlot && !this.availableTimeSlots.includes(this.selectedTimeSlot)) {
      this.selectedTimeSlot = '';
      this.scheduleForm.patchValue({ timeSlot: '' });
    }
  }

  onServiceRequestSelected() {
    const serviceRequestId = this.scheduleForm.get('serviceRequestId')?.value;
    
    // Handle N/A selection
    if (serviceRequestId === 'n/a') {
      this.selectedServiceRequest = null;
      return; // Don't auto-populate form fields for standalone services
    }
    
    // Handle linking to existing service request
    if (serviceRequestId && serviceRequestId !== '') {
      this.serviceRequestsService.getServiceRequest(serviceRequestId).subscribe(request => {
        if (request) {
          this.selectedServiceRequest = request;
          
          // Clear current service selections and add the request's service type
          this.selectedServices.clear();
          if (request.problemType) {
            this.selectedServices.add(request.problemType);
          }
          
          this.scheduleForm.patchValue({
            customerId: request.customerId,
            selectedServices: Array.from(this.selectedServices),
            description: request.description,
            priority: request.emergency ? 'emergency' : 'medium'
          });
        }
      });
    } else {
      // Handle empty selection (back to default)
      this.selectedServiceRequest = null;
    }
  }

  onCustomerSelected() {
    const customerId = this.scheduleForm.get('customerId')?.value;
    if (customerId) {
      this.authService.getUserProfile(customerId).subscribe(customer => {
        this.selectedCustomer = customer;
      });
    }
  }

  /** When duration changes, reload available time slots */
  async onDurationChange() {
    this.selectedTimeSlot = '';
    this.scheduleForm.patchValue({ timeSlot: '' });
    await this.loadAvailableTimeSlots();
  }

  /** Toggle service selection */
  onServiceToggle(serviceValue: string) {
    if (this.selectedServices.has(serviceValue)) {
      this.selectedServices.delete(serviceValue);
    } else {
      this.selectedServices.add(serviceValue);
    }
    
    // Update form control
    this.scheduleForm.patchValue({ selectedServices: Array.from(this.selectedServices) });
  }

  /** Check if service is selected */
  isServiceSelected(serviceValue: string): boolean {
    return this.selectedServices.has(serviceValue);
  }

  /** Select a time slot */
  onTimeSlotSelect(timeSlot: string) {
    this.selectedTimeSlot = timeSlot;
    this.scheduleForm.patchValue({ timeSlot });
  }

  /** Check if time slot is selected */
  isTimeSlotSelected(timeSlot: string): boolean {
    return this.selectedTimeSlot === timeSlot;
  }

  /** Get no slots available message */
  getNoSlotsMessage(): string {
    if (!this.selectedDate) return '';
    
    const dateStr = this.selectedDate.toLocaleDateString();
    const duration = this.scheduleForm.get('duration')?.value || 60;
    const durationLabel = this.durationOptions.find(d => d.value === duration)?.label || `${duration} minutes`;
    
    return `No available time slots on ${dateStr} for ${durationLabel} duration. Consider reducing services (and/or estimated duration) or selecting another date.`;
  }

  async onSubmit() {
    if (this.scheduleForm.valid && this.selectedCustomer) {
      this.isSubmitting = true;

      try {
        const formData = this.scheduleForm.value;
        const currentUser = this.authService.currentUser;

        if (!currentUser) {
          throw new Error('User not authenticated');
        }

        // Calculate end time based on selected duration
        const [startHour, startMinute] = formData.timeSlot.split(':').map(Number);
        const endTime = new Date();
        endTime.setHours(startHour, startMinute + formData.duration, 0, 0);
        const endTimeStr = `${endTime.getHours().toString().padStart(2, '0')}:${endTime.getMinutes().toString().padStart(2, '0')}`;
        
        // Combine selected services into a single service type string
        const serviceTypeStr = formData.selectedServices.join(', ');

        const scheduledService: Omit<ScheduledService, 'id' | 'createdAt' | 'updatedAt'> = {
          serviceRequestId: formData.serviceRequestId === 'n/a' ? undefined : formData.serviceRequestId || undefined,
          customerId: formData.customerId,
          customerName: this.selectedCustomer.displayName,
          customerEmail: this.selectedCustomer.email,
          customerPhone: this.selectedCustomer.phone || '',
          customerAddress: this.selectedCustomer.address || {
            street: '',
            city: '',
            state: '',
            zipCode: ''
          },
          serviceType: serviceTypeStr as any, // We'll store as string for now
          description: formData.description,
          scheduledDate: formData.scheduledDate,
          startTime: formData.timeSlot,
          endTime: endTimeStr,
          estimatedDuration: formData.duration,
          status: 'scheduled',
          priority: formData.priority,
          assignedTechnician: formData.assignedTechnician,
          notes: formData.notes,
          equipmentNeeded: formData.equipmentNeeded || [],
          estimatedCost: formData.estimatedCost || 0,
          createdBy: currentUser.uid
        };

        await this.schedulerService.scheduleService(scheduledService);

        // Update service request status if linked (but not for N/A)
        if (formData.serviceRequestId && formData.serviceRequestId !== 'n/a') {
          await this.serviceRequestsService.updateServiceRequestStatus(formData.serviceRequestId, 'scheduled');
        }

        // Reset form and navigate
        this.scheduleForm.reset();
        this.scheduleForm.patchValue({ duration: 60, priority: 'medium' }); // Reset to defaults
        this.availableTimeSlots = [];
        this.selectedServices.clear();
        this.selectedTimeSlot = '';
        this.selectedServiceRequest = null;
        this.selectedCustomer = null;
        this.router.navigate(['/upcoming-services']);

      } catch (error) {
        console.error('Error scheduling service:', error);
      } finally {
        this.isSubmitting = false;
      }
    }
  }

  private convertServicesToCalendarEvents(services: ScheduledService[]): CalendarEvent[] {
    return services.map(service => ({
      id: service.id || '',
      title: `${service.serviceType} - ${service.customerName}`,
      date: this.convertTimestampToDate(service.scheduledDate) || new Date(),
      type: 'service',
      status: service.status
    }));
  }

  formatTime(time: string): string {
    return this.schedulerService.formatTime(time);
  }

  getServiceTypeLabel(value: string): string {
    const type = this.serviceTypes.find(t => t.value === value);
    return type ? type.label : value;
  }

  getPriorityLabel(value: string): string {
    const priority = this.priorities.find(p => p.value === value);
    return priority ? priority.label : value;
  }

  /** Convert Firestore Timestamp to JavaScript Date */
  convertTimestampToDate(timestamp: any): Date | null {
    if (!timestamp) return null;
    
    // If it's already a Date object, return it
    if (timestamp instanceof Date) {
      return timestamp;
    }
    
    // If it's a Firestore Timestamp
    if (timestamp && typeof timestamp === 'object' && timestamp.toDate) {
      return timestamp.toDate();
    }
    
    // If it's a string, try to parse it
    if (typeof timestamp === 'string') {
      return new Date(timestamp);
    }
    
    // If it's a number (unix timestamp), convert it
    if (typeof timestamp === 'number') {
      return new Date(timestamp);
    }
    
    return null;
  }

  /** Format timestamp for display */
  formatTimestamp(timestamp: any, format: 'short' | 'medium' | 'long' = 'short'): string {
    const date = this.convertTimestampToDate(timestamp);
    if (!date) return 'N/A';
    
    switch (format) {
      case 'short':
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      case 'medium':
        return date.toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' }) + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      case 'long':
        return date.toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) + ' ' + date.toLocaleTimeString();
      default:
        return date.toString();
    }
  }

  /** Format Date object for HTML date input (yyyy-MM-dd format) */
  formatDateForInput(date: Date): string {
    if (!date) return '';
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
