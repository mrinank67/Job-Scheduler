
import type { Timestamp } from 'firebase/firestore';

export type ScheduleType = 'Hourly' | 'Daily' | 'Weekly';

export const ALL_DAYS_OF_WEEK = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;
export type DayOfWeek = typeof ALL_DAYS_OF_WEEK[number];


export interface Schedule {
  id: string;
  jobName: string;
  type: ScheduleType;
  startTime: string; // HH:mm format
  interval?: number; // in minutes, for Hourly
  daysOfWeek?: DayOfWeek[]; // for Weekly
  nextRun?: Date | Timestamp; // Can be Date in app, Timestamp in Firestore
  isEnabled: boolean;
  createdAt?: Timestamp; // Firestore server timestamp
}

export interface FirestoreSchedule extends Omit<Schedule, 'nextRun' | 'createdAt'> {
  nextRun?: Timestamp;
  createdAt: Timestamp;
}

export interface LogEntry {
  id:string;
  jobId: string;
  jobName: string;
  executionTime: Date | Timestamp; // Can be Date in app, Timestamp in Firestore
  message: string;
  status: 'Success' | 'Failure';
}

export interface FirestoreLogEntry extends Omit<LogEntry, 'executionTime'> {
  executionTime: Timestamp;
}
