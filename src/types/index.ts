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
  nextRun?: Date;
  isEnabled: boolean;
}

export interface LogEntry {
  id: string;
  jobId: string;
  jobName: string;
  executionTime: Date;
  message: string;
  status: 'Success' | 'Failure';
}
