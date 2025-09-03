import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

export interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  events: CalendarEvent[];
}

export interface CalendarEvent {
  id: string;
  title: string;
  date: Date;
  type: 'service' | 'appointment' | 'other';
  status?: string;
}

@Component({
  selector: 'app-calendar',
  imports: [CommonModule, MatIconModule, MatButtonModule],
  templateUrl: './calendar.component.html',
  styleUrl: './calendar.component.scss'
})
export class CalendarComponent implements OnInit, OnChanges {
  @Input() events: CalendarEvent[] = [];
  @Input() selectedDate: Date | null = null;
  @Input() readonly = false;
  @Output() dateSelected = new EventEmitter<Date>();
  @Output() eventClicked = new EventEmitter<CalendarEvent>();

  currentDate = new Date();
  calendarDays: CalendarDay[] = [];
  weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  ngOnInit() {
    this.generateCalendar();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['events'] || changes['selectedDate']) {
      this.generateCalendar();
    }
  }

  generateCalendar() {
    const year = this.currentDate.getFullYear();
    const month = this.currentDate.getMonth();
    
    // Get first day of month and last day of month
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    // Get first day to show (might be from previous month)
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    // Get last day to show (might be from next month)
    const endDate = new Date(lastDay);
    const remainingDays = 6 - lastDay.getDay();
    endDate.setDate(endDate.getDate() + remainingDays);
    
    this.calendarDays = [];
    const currentIterDate = new Date(startDate);
    
    while (currentIterDate <= endDate) {
      const dayEvents = this.getEventsForDate(currentIterDate);
      
      this.calendarDays.push({
        date: new Date(currentIterDate),
        isCurrentMonth: currentIterDate.getMonth() === month,
        isToday: this.isSameDay(currentIterDate, new Date()),
        isSelected: this.selectedDate ? this.isSameDay(currentIterDate, this.selectedDate) : false,
        events: dayEvents
      });
      
      currentIterDate.setDate(currentIterDate.getDate() + 1);
    }
  }

  private getEventsForDate(date: Date): CalendarEvent[] {
    return this.events.filter(event => this.isSameDay(event.date, date));
  }

  private isSameDay(date1: Date, date2: Date): boolean {
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
  }

  onDateClick(day: CalendarDay) {
    if (!this.readonly) {
      this.dateSelected.emit(day.date);
    }
  }

  onEventClick(event: CalendarEvent, $event: Event) {
    $event.stopPropagation();
    this.eventClicked.emit(event);
  }

  previousMonth() {
    this.currentDate.setMonth(this.currentDate.getMonth() - 1);
    this.generateCalendar();
  }

  nextMonth() {
    this.currentDate.setMonth(this.currentDate.getMonth() + 1);
    this.generateCalendar();
  }

  goToToday() {
    this.currentDate = new Date();
    this.generateCalendar();
  }

  get currentMonthYear(): string {
    return `${this.monthNames[this.currentDate.getMonth()]} ${this.currentDate.getFullYear()}`;
  }

  getDayClasses(day: CalendarDay): string {
    let classes = 'min-h-[100px] p-2 border border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors';
    
    if (!day.isCurrentMonth) {
      classes += ' text-gray-400 bg-gray-50';
    }
    
    if (day.isToday) {
      classes += ' ring-2 ring-blue-500';
    }
    
    if (day.isSelected) {
      classes += ' bg-blue-100 text-blue-900';
    }
    
    if (this.readonly) {
      classes = classes.replace('cursor-pointer hover:bg-gray-50', 'cursor-default');
    }
    
    return classes;
  }

  getEventTypeClass(event: CalendarEvent): string {
    switch (event.type) {
      case 'service':
        return 'bg-blue-100 text-blue-800';
      case 'appointment':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }
}
