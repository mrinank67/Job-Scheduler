
"use client";

import type * as React from 'react';
import { useState, useEffect, useCallback } from 'react';
import { ScheduleForm } from './ScheduleForm';
import { ScheduleList } from './ScheduleList';
import { ExecutionLog } from './ExecutionLog';
import type { Schedule, LogEntry, DayOfWeek, ScheduleType } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { addMinutes, addDays, setHours, setMinutes, setSeconds, setMilliseconds, getDay, isAfter, parse } from 'date-fns';
import { ALL_DAYS_OF_WEEK } from '@/types';


export function ChronoPrintApp() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [executionLogs, setExecutionLogs] = useState<LogEntry[]>([]);
  const { toast } = useToast();

  const calculateNextRun = useCallback((schedule: Omit<Schedule, 'nextRun'>, fromTime: Date = new Date()): Date | undefined => {
    if (!schedule.isEnabled) return undefined;

    const [hour, minute] = schedule.startTime.split(':').map(Number);
    let nextRunCand = setMilliseconds(setSeconds(setMinutes(setHours(new Date(fromTime), hour), minute), 0), 0);

    if (isAfter(fromTime, nextRunCand) && schedule.type !== 'Hourly') { // If start time today already passed for Daily/Weekly
        nextRunCand = addDays(nextRunCand, 1);
    }
    
    switch (schedule.type) {
      case 'Hourly':
        if (!schedule.interval) return undefined;
        // Start from 'fromTime' and find the next interval tick past 'fromTime' that also matches startTime minute, or simply add interval from 'fromTime' if it's already a tick.
        // Simplified: add interval to fromTime if fromTime IS a scheduled tick, otherwise find next tick from startTime
        let candidate = setMilliseconds(setSeconds(setMinutes(setHours(new Date(fromTime), hour), minute),0),0);
        while(isAfter(fromTime, candidate) || candidate.getMinutes() !== minute) { // Ensure we start from a time that has the correct minute as startTime
            candidate = addMinutes(candidate, schedule.interval);
            if (candidate.getHours() !== hour && fromTime.getHours() === hour && fromTime.getMinutes() < minute) { // Edge case: if current hour, but before start minute
                candidate = setMinutes(setHours(new Date(fromTime),hour), minute);
            }
        }
        // Ensure it's in the future relative to `fromTime`
        while (!isAfter(candidate, fromTime)) {
            candidate = addMinutes(candidate, schedule.interval);
        }
        return candidate;

      case 'Daily':
         // nextRunCand is already set for today or tomorrow at startTime
        return nextRunCand;

      case 'Weekly':
        if (!schedule.daysOfWeek || schedule.daysOfWeek.length === 0) return undefined;
        const numericDaysOfWeek = schedule.daysOfWeek.map(dayStr => ALL_DAYS_OF_WEEK.indexOf(dayStr as DayOfWeek));
        
        let attempts = 0; // Prevent infinite loop
        while (attempts < 8) { // Check current day and next 7 days
            if (numericDaysOfWeek.includes(getDay(nextRunCand))) {
                if (isAfter(nextRunCand, fromTime)) { // Found a future run on an allowed day
                    return nextRunCand;
                }
            }
            nextRunCand = addDays(nextRunCand, 1);
            nextRunCand = setMilliseconds(setSeconds(setMinutes(setHours(nextRunCand, hour), minute),0),0); // ensure time is correct for the new day
            attempts++;
        }
        return undefined; // Should not happen if daysOfWeek is valid
      default:
        return undefined;
    }
  }, []);


  const handleAddSchedule = useCallback((newScheduleData: Omit<Schedule, 'id' | 'nextRun' | 'isEnabled'> & { interval?: number }) => {
    const newSchedule: Schedule = {
      ...newScheduleData,
      id: crypto.randomUUID(),
      isEnabled: true,
      nextRun: undefined, // Will be set below
    };
    newSchedule.nextRun = calculateNextRun(newSchedule, new Date());

    setSchedules((prevSchedules) => [...prevSchedules, newSchedule]);
    toast({
      title: "Schedule Added",
      description: `${newSchedule.jobName} has been scheduled.`,
    });
  }, [toast, calculateNextRun]);

  const handleToggleSchedule = useCallback((scheduleId: string, isEnabled: boolean) => {
    setSchedules(prev => prev.map(s => {
      if (s.id === scheduleId) {
        const updatedSchedule = { ...s, isEnabled };
        updatedSchedule.nextRun = isEnabled ? calculateNextRun(updatedSchedule, new Date()) : undefined;
        return updatedSchedule;
      }
      return s;
    }));
    const sch = schedules.find(s => s.id === scheduleId);
    if (sch) {
       toast({
        title: `Schedule ${isEnabled ? 'Enabled' : 'Paused'}`,
        description: `${sch.jobName} is now ${isEnabled ? 'active' : 'paused'}.`,
      });
    }
  }, [toast, calculateNextRun, schedules]);

  const handleDeleteSchedule = useCallback((scheduleId: string) => {
    const sch = schedules.find(s => s.id === scheduleId);
    setSchedules(prev => prev.filter(s => s.id !== scheduleId));
    if (sch) {
      toast({
        title: "Schedule Deleted",
        description: `${sch.jobName} has been deleted.`,
        variant: "destructive",
      });
    }
  }, [toast, schedules]);


  const addLogEntry = useCallback((log: Omit<LogEntry, 'id'>) => {
    setExecutionLogs(prevLogs => [...prevLogs, { ...log, id: crypto.randomUUID() }]);
  }, []);

  useEffect(() => {
    const intervalId = setInterval(() => {
      const now = new Date();
      schedules.forEach(schedule => {
        if (schedule.isEnabled && schedule.nextRun && isAfter(now, schedule.nextRun)) {
          console.log(`JOB EXECUTING: "${schedule.jobName}" - Hello World! at ${now.toISOString()}`);
          addLogEntry({
            jobId: schedule.id,
            jobName: schedule.jobName,
            executionTime: now,
            message: `Executed "Hello World"`,
            status: 'Success',
          });

          // Recalculate next run based on the run that just occurred
          const nextRunTimeForThisSchedule = calculateNextRun(schedule, schedule.nextRun);
          
          setSchedules(prevSchedules =>
            prevSchedules.map(s =>
              s.id === schedule.id ? { ...s, nextRun: nextRunTimeForThisSchedule } : s
            )
          );
        }
      });
    }, 10000); // Check every 10 seconds for demo purposes

    return () => clearInterval(intervalId);
  }, [schedules, addLogEntry, calculateNextRun]);


  return (
    <div className="container mx-auto p-4 md:p-8 min-h-screen">
      <header className="mb-12 text-center">
        <h1 className="font-headline text-5xl font-bold text-primary tracking-tight">
          ChronoPrint
        </h1>
        <p className="text-muted-foreground mt-2 text-lg">
          Your reliable job scheduler for seamless automation.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        <div className="lg:col-span-1">
          <ScheduleForm onAddSchedule={handleAddSchedule} />
        </div>
        <div className="lg:col-span-2 space-y-8">
          <ScheduleList schedules={schedules} onToggleSchedule={handleToggleSchedule} onDeleteSchedule={handleDeleteSchedule} />
          <ExecutionLog logs={executionLogs} />
        </div>
      </div>
    </div>
  );
}
