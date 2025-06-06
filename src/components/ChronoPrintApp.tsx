"use client";

import type * as React from "react";
import { useState, useEffect, useCallback } from "react";
import { ScheduleForm } from "./ScheduleForm";
import { ScheduleList } from "./ScheduleList";
import { ExecutionLog } from "./ExecutionLog";
import type { Schedule, LogEntry, DayOfWeek, ScheduleType } from "@/types";
import { useToast } from "@/hooks/use-toast";
import {
  addMinutes,
  addDays,
  setHours,
  setMinutes,
  setSeconds,
  setMilliseconds,
  getDay,
  isAfter,
  parse,
} from "date-fns";
import { ALL_DAYS_OF_WEEK } from "@/types";
import {
  getSchedulesFromFirestore,
  addScheduleToFirestore,
  updateScheduleInFirestore,
  deleteScheduleFromFirestore,
  getLogsFromFirestore,
  addLogToFirestore,
} from "@/services/scheduleService";

export function ChronoPrintApp() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [executionLogs, setExecutionLogs] = useState<LogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const calculateNextRun = useCallback(
    (
      schedule: Omit<Schedule, "nextRun" | "id" | "createdAt"> & {
        nextRun?: Schedule["nextRun"];
      },
      fromTime: Date = new Date()
    ): Date | undefined => {
      if (!schedule.isEnabled) return undefined;

      let baseTime = new Date(fromTime); // Use a mutable copy

      const [hour, minute] = schedule.startTime.split(":").map(Number);
      let nextRunCand = setMilliseconds(
        setSeconds(setMinutes(setHours(new Date(baseTime), hour), minute), 0),
        0
      );

      // If schedule.type is Hourly, the logic needs to ensure it's calculated from 'fromTime' correctly.
      // For Daily/Weekly, if startTime has passed today, move to next day.
      if (schedule.type !== "Hourly" && isAfter(baseTime, nextRunCand)) {
        nextRunCand = addDays(nextRunCand, 1);
        nextRunCand = setMilliseconds(
          setSeconds(setMinutes(setHours(nextRunCand, hour), minute), 0),
          0
        );
      }

      switch (schedule.type) {
        case "Hourly":
          if (!schedule.interval) return undefined;
          // Start from `baseTime` or `schedule.startTime` on `baseTime`'s date if `schedule.startTime` is later than `baseTime` current minute.
          let candidate = setMilliseconds(
            setSeconds(
              setMinutes(setHours(new Date(baseTime), hour), minute),
              0
            ),
            0
          );

          // If the baseTime is past the startTime for today, start calculating from startTime on baseTime's date.
          // Otherwise, if baseTime is before startTime for today, the first run is startTime.
          if (isAfter(baseTime, candidate)) {
            // We need to find the next slot from 'baseTime' based on interval
            candidate = new Date(baseTime); // Start from current time
            candidate = setSeconds(candidate, 0);
            candidate = setMilliseconds(candidate, 0);

            // Align to the minute of the startTime for the initial seed if needed, or just progress by interval
            if (
              candidate.getMinutes() % schedule.interval !==
              minute % schedule.interval
            ) {
              candidate = setMinutes(
                candidate,
                Math.floor(candidate.getMinutes() / schedule.interval) *
                  schedule.interval +
                  (minute % schedule.interval)
              );
              if (candidate.getMinutes() >= 60) {
                candidate = addMinutes(
                  candidate,
                  schedule.interval -
                    (candidate.getMinutes() - (minute % schedule.interval))
                );
                candidate = setHours(candidate, candidate.getHours() + 1); //
                candidate = setMinutes(candidate, minute % schedule.interval);
              }
            }
          } else {
            // First run is startTime if baseTime is before it
            candidate = setMilliseconds(
              setSeconds(
                setMinutes(setHours(new Date(baseTime), hour), minute),
                0
              ),
              0
            );
          }

          while (
            !isAfter(candidate, baseTime) ||
            candidate.getMinutes() % schedule.interval !==
              minute % schedule.interval
          ) {
            candidate = addMinutes(candidate, schedule.interval);
          }
          return candidate;

        case "Daily":
          return nextRunCand;

        case "Weekly":
          if (!schedule.daysOfWeek || schedule.daysOfWeek.length === 0)
            return undefined;
          const numericDaysOfWeek = schedule.daysOfWeek.map((dayStr) =>
            ALL_DAYS_OF_WEEK.indexOf(dayStr as DayOfWeek)
          );

          let attempts = 0;
          while (attempts < 8) {
            if (numericDaysOfWeek.includes(getDay(nextRunCand))) {
              if (isAfter(nextRunCand, baseTime)) {
                return nextRunCand;
              }
            }
            nextRunCand = addDays(nextRunCand, 1);
            nextRunCand = setMilliseconds(
              setSeconds(setMinutes(setHours(nextRunCand, hour), minute), 0),
              0
            );
            attempts++;
          }
          return undefined;
        default:
          return undefined;
      }
    },
    []
  );

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      const [fetchedSchedules, fetchedLogs] = await Promise.all([
        getSchedulesFromFirestore(),
        getLogsFromFirestore(),
      ]);
      // The service functions now return data with Date objects already converted
      setSchedules(fetchedSchedules);
      setExecutionLogs(fetchedLogs);
      setIsLoading(false);
    };
    loadData();
  }, []);

  const handleAddSchedule = useCallback(
    async (
      newScheduleData: Omit<
        Schedule,
        "id" | "nextRun" | "isEnabled" | "createdAt"
      > & { interval?: number }
    ) => {
      const scheduleBase = {
        ...newScheduleData,
        isEnabled: true,
      };
      const nextRunTime = calculateNextRun(scheduleBase, new Date());

      const scheduleWithNextRun: Omit<Schedule, "id" | "createdAt"> & {
        nextRun?: Date;
      } = {
        ...scheduleBase,
        nextRun: nextRunTime,
      };

      const addedSchedule = await addScheduleToFirestore(
        scheduleWithNextRun as any
      ); // Cast as any because firestore service expects specific shape
      if (addedSchedule) {
        setSchedules((prevSchedules) => [...prevSchedules, addedSchedule]);
        toast({
          title: "Schedule Added",
          description: `${addedSchedule.jobName} has been scheduled.`,
        });
      } else {
        toast({
          title: "Error",
          description: `Failed to add schedule ${newScheduleData.jobName}.`,
          variant: "destructive",
        });
      }
    },
    [toast, calculateNextRun]
  );

  const handleToggleSchedule = useCallback(
    async (scheduleId: string, isEnabled: boolean) => {
      const scheduleToUpdate = schedules.find((s) => s.id === scheduleId);
      if (!scheduleToUpdate) return;

      const nextRunTime = isEnabled
        ? calculateNextRun({ ...scheduleToUpdate, isEnabled }, new Date())
        : undefined;
      const success = await updateScheduleInFirestore(scheduleId, {
        isEnabled,
        nextRun: nextRunTime,
      });

      if (success) {
        setSchedules((prev) =>
          prev.map((s) =>
            s.id === scheduleId ? { ...s, isEnabled, nextRun: nextRunTime } : s
          )
        );
        toast({
          title: `Schedule ${isEnabled ? "Enabled" : "Paused"}`,
          description: `${scheduleToUpdate.jobName} is now ${
            isEnabled ? "active" : "paused"
          }.`,
        });
      } else {
        toast({
          title: "Error",
          description: `Failed to update schedule ${scheduleToUpdate.jobName}.`,
          variant: "destructive",
        });
      }
    },
    [schedules, toast, calculateNextRun]
  );

  const handleDeleteSchedule = useCallback(
    async (scheduleId: string) => {
      const sch = schedules.find((s) => s.id === scheduleId);
      if (!sch) return;

      const success = await deleteScheduleFromFirestore(scheduleId);
      if (success) {
        setSchedules((prev) => prev.filter((s) => s.id !== scheduleId));
        setExecutionLogs((prev) =>
          prev.filter((log) => log.jobId !== scheduleId)
        ); // Also remove logs from UI
        toast({
          title: "Schedule Deleted",
          description: `${sch.jobName} and its logs have been deleted.`,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: `Failed to delete schedule ${sch.jobName}.`,
          variant: "destructive",
        });
      }
    },
    [schedules, toast]
  );

  const addLogEntry = useCallback(async (log: Omit<LogEntry, "id">) => {
    const executionTime =
      log.executionTime instanceof Date ? log.executionTime : new Date();
    const newLogEntryData = { ...log, executionTime };

    const addedLog = await addLogToFirestore(newLogEntryData);
    if (addedLog) {
      setExecutionLogs((prevLogs) =>
        [...prevLogs, addedLog].sort(
          (a, b) => b.executionTime.getTime() - a.executionTime.getTime()
        )
      );
    }
    // No toast for individual log entries to avoid clutter, unless there's an error (handled by service console.error)
  }, []);

  useEffect(() => {
    const intervalId = setInterval(async () => {
      const now = new Date();
      for (const schedule of schedules) {
        if (
          schedule.isEnabled &&
          schedule.nextRun &&
          isAfter(now, schedule.nextRun)
        ) {
          // schedule.nextRun is already a Date
          console.log(
            `JOB EXECUTING: "${
              schedule.jobName
            }" - Hello World! at ${now.toISOString()}`
          );

          const logData: Omit<LogEntry, "id"> = {
            jobId: schedule.id,
            jobName: schedule.jobName,
            executionTime: now, // Use the actual execution time
            message: `Executed "Hello World"`,
            status: "Success",
          };
          addLogEntry(logData); // This will save to Firestore and update local state

          // Recalculate next run based on the run that just occurred (schedule.nextRun)
          const nextRunTimeForThisSchedule = calculateNextRun(
            schedule,
            schedule.nextRun
          ); // schedule.nextRun is Date

          const success = await updateScheduleInFirestore(schedule.id, {
            nextRun: nextRunTimeForThisSchedule,
          });
          if (success) {
            setSchedules((prevSchedules) =>
              prevSchedules.map((s) =>
                s.id === schedule.id
                  ? { ...s, nextRun: nextRunTimeForThisSchedule }
                  : s
              )
            );
          } else {
            // Handle failure to update nextRun in Firestore if needed
            console.error(
              `Failed to update nextRun for schedule ${schedule.jobName}`
            );
          }
        }
      }
    }, 10000); // Check every 10 seconds

    return () => clearInterval(intervalId);
  }, [schedules, addLogEntry, calculateNextRun]);

  if (isLoading) {
    return (
      <div className="container mx-auto p-4 md:p-8 min-h-screen flex justify-center items-center">
        <p className="text-xl text-primary">Loading scheduler...</p>
      </div>
    );
  }

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
          <ScheduleList
            schedules={schedules}
            onToggleSchedule={handleToggleSchedule}
            onDeleteSchedule={handleDeleteSchedule}
          />
          <ExecutionLog logs={executionLogs} />
        </div>
      </div>
    </div>
  );
}
