import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { CalendarComponent, CalendarEvent } from '../../shared/calendar/calendar.component';
import { SchedulerService, ScheduledService } from '../../data-access/scheduler.service';
import { AuthService } from '../../data-access/auth.service';
import { Observable, map, switchMap, of, combineLatest } from 'rxjs';

@Component({
  selector: 'app-services-calendar',
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule,
    MatButtonModule,
    MatSelectModule,
    MatDialogModule,
    CalendarComponent
  ],
  templateUrl: './services-calendar.component.html',
  styleUrl: './services-calendar.component.scss'
})
export class ServicesCalendarComponent implements OnInit {
  private schedulerService = inject(SchedulerService);
  private authService = inject(AuthService);
  private dialog = inject(MatDialog);

  scheduledServices$: Observable<ScheduledService[]>;
  calendarEvents$: Observable<CalendarEvent[]>;
  isAdmin$ = this.authService.isAdmin$;
  selectedDate: Date | null = null;
  selectedService: ScheduledService | null = null;
  statusFilter: ScheduledService['status'] | 'all' = 'all';
  servicesForSelectedDate: ScheduledService[] = [];
  
  statusOptions = [
    { value: 'all', label: 'All Services' },
    { value: 'scheduled', label: 'Scheduled' },
    { value: 'confirmed', label: 'Confirmed' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'completed', label: 'Completed' },
    { value: 'cancelled', label: 'Cancelled' },
    { value: 'rescheduled', label: 'Rescheduled' }
  ];

  constructor() {
    this.scheduledServices$ = combineLatest([
      this.authService.user$,
      this.isAdmin$
    ]).pipe(
      switchMap(([user, isAdmin]) => {
        if (!user) return of([]);
        
        if (isAdmin) {
          return this.schedulerService.getAllScheduledServices();
        } else {
          return this.schedulerService.getScheduledServicesByCustomer(user.uid);
        }
      })
    );
    
    this.calendarEvents$ = this.scheduledServices$.pipe(
      map(services => this.convertServicesToCalendarEvents(services))
    );
  }

  ngOnInit() {
    this.selectedDate = new Date();
    this.loadServicesForDate(this.selectedDate);
  }

  onDateSelected(date: Date) {
    this.selectedDate = date;
    this.loadServicesForDate(date);
  }

  onEventClicked(event: CalendarEvent) {
    this.scheduledServices$.subscribe(services => {
      const service = services.find(s => s.id === event.id);
      if (service) {
        this.selectedService = service;
      }
    });
  }

  onStatusFilterChange() {
    this.calendarEvents$ = this.scheduledServices$.pipe(
      map(services => {
        let filteredServices = services;
        if (this.statusFilter !== 'all') {
          filteredServices = services.filter(service => service.status === this.statusFilter);
        }
        return this.convertServicesToCalendarEvents(filteredServices);
      })
    );
    
    if (this.selectedDate) {
      this.loadServicesForDate(this.selectedDate);
    }
  }

  private loadServicesForDate(date: Date) {
    this.schedulerService.getScheduledServicesByDate(date).subscribe(services => {
      if (this.statusFilter !== 'all') {
        this.servicesForSelectedDate = services.filter(service => service.status === this.statusFilter);
      } else {
        this.servicesForSelectedDate = services;
      }
    });
  }

  private convertServicesToCalendarEvents(services: ScheduledService[]): CalendarEvent[] {
    return services.map(service => ({
      id: service.id || '',
      title: `${this.getServiceTypeLabel(service.serviceType)} - ${service.customerName}`,
      date: new Date(service.scheduledDate),
      type: 'service',
      status: service.status
    }));
  }

  async updateServiceStatus(serviceId: string, status: ScheduledService['status']) {
    try {
      await this.schedulerService.updateServiceStatus(serviceId, status);
      // Refresh the selected date services
      if (this.selectedDate) {
        this.loadServicesForDate(this.selectedDate);
      }
    } catch (error) {
      console.error('Error updating service status:', error);
    }
  }

  getServiceTypeLabel(serviceType: string): string {
    const types = {
      'raccoon': 'Raccoon Removal',
      'mice': 'Mice Control',
      'bats': 'Bat Removal',
      'squirrels': 'Squirrel Control',
      'insects': 'Insect Control',
      'dead_animal': 'Dead Animal Removal',
      'other': 'Other Services'
    };
    return types[serviceType as keyof typeof types] || serviceType;
  }

  getPriorityClass(priority: string): string {
    switch (priority) {
      case 'emergency':
        return 'bg-red-100 text-red-800';
      case 'high':
        return 'bg-orange-100 text-orange-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'scheduled':
        return 'bg-blue-100 text-blue-800';
      case 'confirmed':
        return 'bg-green-100 text-green-800';
      case 'in_progress':
        return 'bg-purple-100 text-purple-800';
      case 'completed':
        return 'bg-emerald-100 text-emerald-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'rescheduled':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  formatTime(time: string): string {
    return this.schedulerService.formatTime(time);
  }

  formatDate(date: Date | any): string {
    if (!date) return 'N/A';
    
    if (date && typeof date === 'object' && date.toDate) {
      return date.toDate().toLocaleDateString();
    }
    
    if (typeof date === 'string') {
      const parsedDate = new Date(date);
      return isNaN(parsedDate.getTime()) ? 'Invalid Date' : parsedDate.toLocaleDateString();
    }
    
    if (date instanceof Date) {
      return isNaN(date.getTime()) ? 'Invalid Date' : date.toLocaleDateString();
    }
    
    const fallbackDate = new Date(date);
    return isNaN(fallbackDate.getTime()) ? 'Invalid Date' : fallbackDate.toLocaleDateString();
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  }

  closeServiceDetail() {
    this.selectedService = null;
  }
}
