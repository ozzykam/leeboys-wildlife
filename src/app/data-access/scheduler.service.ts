import { Injectable, inject } from '@angular/core';
import { FirestoreService } from './firestore.service';
import { Observable, firstValueFrom } from 'rxjs';

export interface ScheduledService {
  id?: string;
  serviceRequestId?: string; // Link to original service request
  customerId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerAddress: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
  };
  serviceType: 'raccoon' | 'mice' | 'bats' | 'squirrels' | 'insects' | 'dead_animal' | 'other';
  description: string;
  scheduledDate: Date;
  startTime: string; // "HH:MM"
  endTime: string;   // "HH:MM"
  estimatedDuration: number; // minutes
  status: 'scheduled' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'rescheduled';
  priority: 'low' | 'medium' | 'high' | 'emergency';
  assignedTechnician?: string;
  notes?: string;
  equipmentNeeded?: string[];
  estimatedCost?: number;
  actualCost?: number;
  createdAt?: Date;
  updatedAt?: Date;
  createdBy: string; // Admin user ID who scheduled the service
}

/** Options for computing available time slots */
export type TimeSlotOptions = {
  slotMinutes?: number;     // slot granularity (default 30)
  workStart?: string;       // business day start "08:00"
  workEnd?: string;         // business day end   "18:00"
  durationMinutes?: number; // required continuous duration for a start slot (default 120)
};

@Injectable({
  providedIn: 'root'
})
export class SchedulerService {
  private firestoreService = inject(FirestoreService);
  private collectionName = 'scheduledServices';

  // -----------------------
  // Helpers (time utilities)
  // -----------------------
  private toDateOn(day: Date, hhmm: string): Date {
    const [h, m] = hhmm.split(':').map(Number);
    const d = new Date(day);
    d.setHours(h, m, 0, 0);
    return d;
  }

  private fmtHHMM(d: Date): string {
    const h = d.getHours().toString().padStart(2, '0');
    const m = d.getMinutes().toString().padStart(2, '0');
    return `${h}:${m}`;
  }

  private overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
    return aStart < bEnd && bStart < aEnd;
  }

  /** Treat any non-cancelled item as blocking by default */
  private isBlocking(s: ScheduledService): boolean {
    return s.status !== 'cancelled';
  }

  // --------------
  // CRUD & queries
  // --------------
  async scheduleService(service: Omit<ScheduledService, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const serviceData = {
      ...service,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    const docRef = await this.firestoreService.addDocument(this.collectionName, serviceData);
    return docRef.id;
  }

  getAllScheduledServices(): Observable<ScheduledService[]> {
    return this.firestoreService.getCollectionObservable(this.collectionName);
  }

  getScheduledServicesByCustomer(customerId: string): Observable<ScheduledService[]> {
    return this.firestoreService.getCollectionQuery(
      this.collectionName,
      [{ field: 'customerId', operator: '==', value: customerId }],
      'scheduledDate',
      'asc'
    );
  }

  getScheduledServicesByDateRange(startDate: Date, endDate: Date): Observable<ScheduledService[]> {
    return this.firestoreService.getCollectionQuery(
      this.collectionName,
      [
        { field: 'scheduledDate', operator: '>=', value: startDate },
        { field: 'scheduledDate', operator: '<=', value: endDate }
      ],
      'scheduledDate',
      'asc'
    );
  }

  getScheduledServicesByDate(date: Date): Observable<ScheduledService[]> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    return this.getScheduledServicesByDateRange(startOfDay, endOfDay);
  }

  getScheduledServicesByStatus(status: ScheduledService['status']): Observable<ScheduledService[]> {
    return this.firestoreService.getCollectionQuery(
      this.collectionName,
      [{ field: 'status', operator: '==', value: status }],
      'scheduledDate',
      'asc'
    );
  }

  getUrgentServices(): Observable<ScheduledService[]> {
    return this.firestoreService.getCollectionQuery(
      this.collectionName,
      [
        { field: 'priority', operator: 'in', value: ['high', 'emergency'] },
        { field: 'status', operator: 'in', value: ['scheduled', 'confirmed'] }
      ],
      'scheduledDate',
      'asc'
    );
  }

  getScheduledServiceById(serviceId: string): Observable<ScheduledService | null> {
    return this.firestoreService.getDocumentObservable(this.collectionName, serviceId);
  }

  async updateServiceStatus(serviceId: string, status: ScheduledService['status']): Promise<void> {
    await this.firestoreService.updateDocument(this.collectionName, serviceId, {
      status,
      updatedAt: new Date()
    });
  }

  async updateScheduledService(serviceId: string, updates: Partial<ScheduledService>): Promise<void> {
    await this.firestoreService.updateDocument(this.collectionName, serviceId, {
      ...updates,
      updatedAt: new Date()
    });
  }

  async rescheduleService(
    serviceId: string,
    newDate: Date,
    newStartTime: string,
    newEndTime: string,
    reason?: string
  ): Promise<void> {
    const updates: Partial<ScheduledService> = {
      scheduledDate: newDate,
      startTime: newStartTime,
      endTime: newEndTime,
      status: 'rescheduled',
      notes: reason ? `Rescheduled: ${reason}` : 'Rescheduled'
    };
    await this.updateScheduledService(serviceId, updates);
  }

  async cancelService(serviceId: string, reason?: string): Promise<void> {
    const updates: Partial<ScheduledService> = {
      status: 'cancelled',
      notes: reason ? `Cancelled: ${reason}` : 'Cancelled'
    };
    await this.updateScheduledService(serviceId, updates);
  }

  async completeService(serviceId: string, actualCost?: number, notes?: string): Promise<void> {
    const updates: Partial<ScheduledService> = {
      status: 'completed',
      actualCost,
      notes: notes || 'Service completed'
    };
    await this.updateScheduledService(serviceId, updates);
  }

  async deleteScheduledService(serviceId: string): Promise<void> {
    await this.firestoreService.deleteDocument(this.collectionName, serviceId);
  }

  // -------------------------------------------------------
  // 🔹 NEW: Smart availability (start slots & end slots)
  // -------------------------------------------------------

  /** Internal: get all blocking services for a given date */
  private async getBlockingServicesForDate(date: Date): Promise<ScheduledService[]> {
    const dayServices = await firstValueFrom(this.getScheduledServicesByDate(date));
    return (dayServices || []).filter(s => this.isBlocking(s));
  }

  /**
   * Get available START slots that can fit `durationMinutes` continuously
   * within work hours, without overlapping existing bookings.
   */
  async getAvailableTimeSlots(
    date: Date,
    opts: TimeSlotOptions = {}
  ): Promise<string[]> {
    const {
      slotMinutes = 30,
      workStart = '08:00',
      workEnd = '18:00',
      durationMinutes = 120
    } = opts;

    // fetch blocking bookings for the day
    const services = await this.getBlockingServicesForDate(date);

    const busy: Array<{ start: Date; end: Date }> = services.map(s => ({
      start: this.toDateOn(date, s.startTime),
      end: this.toDateOn(date, s.endTime)
    }));

    const dayStart = this.toDateOn(date, workStart);
    const dayEnd = this.toDateOn(date, workEnd);

    const slots: string[] = [];
    for (let t = new Date(dayStart); t < dayEnd; t = new Date(t.getTime() + slotMinutes * 60000)) {
      const candStart = t;
      const candEnd = new Date(candStart.getTime() + durationMinutes * 60000);
      if (candEnd > dayEnd) continue;

      const conflict = busy.some(b => this.overlaps(candStart, candEnd, b.start, b.end));
      if (!conflict) slots.push(this.fmtHHMM(candStart));
    }
    return slots;
  }

  /**
   * Get valid END times after a chosen start, trimmed to the next conflict or day end.
   * Returns times in `slotMinutes` increments strictly greater than the start.
   */
  async getEndTimeOptions(
    date: Date,
    startHHMM: string,
    opts: Omit<TimeSlotOptions, 'durationMinutes'> = {}
  ): Promise<string[]> {
    const {
      slotMinutes = 30,
      workStart = '08:00',
      workEnd = '18:00'
    } = opts;

    const services = await this.getBlockingServicesForDate(date);
    const busy: Array<{ start: Date; end: Date }> = services.map(s => ({
      start: this.toDateOn(date, s.startTime),
      end: this.toDateOn(date, s.endTime)
    }));

    const start = this.toDateOn(date, startHHMM);
    const dayEnd = this.toDateOn(date, workEnd);

    // Earliest blocking start after our selected start
    let freeUntil = dayEnd;
    for (const b of busy) {
      if (b.start > start && b.start < freeUntil) {
        freeUntil = b.start;
      }
      // also guard against overlap where a busy block already started before our start and ends after
      if (b.start <= start && b.end > start) {
        // no room at all if we're inside an existing block
        freeUntil = start;
        break;
      }
    }
    if (freeUntil <= start) return [];

    const ends: string[] = [];
    for (let t = new Date(start.getTime() + slotMinutes * 60000); t <= freeUntil; t = new Date(t.getTime() + slotMinutes * 60000)) {
      ends.push(this.fmtHHMM(t));
    }
    return ends;
  }

  // -----------------------
  // Existing utility methods
  // -----------------------
  calculateDuration(startTime: string, endTime: string): number {
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);

    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;

    return endMinutes - startMinutes;
  }

  formatTime(time: string): string {
    // Accept "HH:MM" or already-formatted input like "9:30 AM" and normalize
    if (time.includes('AM') || time.includes('PM')) return time;

    const [hour, minute] = time.split(':');
    const hourNum = parseInt(hour, 10);
    const ampm = hourNum >= 12 ? 'PM' : 'AM';
    const displayHour = hourNum === 0 ? 12 : hourNum > 12 ? hourNum - 12 : hourNum;
    return `${displayHour}:${minute} ${ampm}`;
  }

  // -----------------------
  // Stats (unchanged)
  // -----------------------
  async getServiceStatistics(): Promise<{
    total: number;
    scheduled: number;
    completed: number;
    cancelled: number;
    thisWeek: number;
    thisMonth: number;
  }> {
    const allServices = await this.firestoreService.getCollection(this.collectionName);

    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    return {
      total: allServices.length,
      scheduled: allServices.filter(s => s.status === 'scheduled' || s.status === 'confirmed').length,
      completed: allServices.filter(s => s.status === 'completed').length,
      cancelled: allServices.filter(s => s.status === 'cancelled').length,
      thisWeek: allServices.filter(s => new Date(s.scheduledDate) >= startOfWeek).length,
      thisMonth: allServices.filter(s => new Date(s.scheduledDate) >= startOfMonth).length
    };
  }
}
