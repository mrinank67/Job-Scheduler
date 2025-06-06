"use client";

import type * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { List, Clock3, CalendarDays, Repeat, Trash2 } from "lucide-react";
import type { Schedule } from "@/types";
import { format } from "date-fns";

interface ScheduleListProps {
  schedules: Schedule[];
  onToggleSchedule: (scheduleId: string, isEnabled: boolean) => void;
  onDeleteSchedule: (scheduleId: string) => void;
}

function formatRecurrence(schedule: Schedule): string {
  switch (schedule.type) {
    case "Hourly":
      return `Every ${schedule.interval} min`;
    case "Daily":
      return `Daily`;
    case "Weekly":
      return `On ${schedule.daysOfWeek?.join(", ")}`;
    default:
      return "N/A";
  }
}

function getScheduleTypeIcon(type: Schedule["type"]) {
  switch (type) {
    case "Hourly":
      return <Clock3 className="h-5 w-5 text-primary" />;
    case "Daily":
      return <CalendarDays className="h-5 w-5 text-primary" />;
    case "Weekly":
      return <Repeat className="h-5 w-5 text-primary" />;
    default:
      return null;
  }
}

export function ScheduleList({
  schedules,
  onToggleSchedule,
  onDeleteSchedule,
}: ScheduleListProps) {
  if (schedules.length === 0) {
    return (
      <Card className="shadow-lg mt-8">
        <CardHeader>
          <CardTitle className="flex items-center text-2xl font-headline">
            <List className="mr-2 h-6 w-6 text-primary" />
            Scheduled Jobs
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-4">
            No schedules defined yet. Add a new schedule to get started!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-lg mt-8">
      <CardHeader>
        <CardTitle className="flex items-center text-2xl font-headline">
          <List className="mr-2 h-6 w-6 text-primary" />
          Scheduled Jobs
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Job Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Details</TableHead>
              <TableHead>Next Run</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {schedules.map((schedule) => {
              let nextRunDisplay = "Paused / Not set";
              if (schedule.nextRun && schedule.isEnabled) {
                // schedule.nextRun is already a Date object due to type standardization
                nextRunDisplay = format(schedule.nextRun, "MMM d, HH:mm");
              }
              return (
                <TableRow key={schedule.id}>
                  <TableCell className="font-medium">
                    {schedule.jobName}
                  </TableCell>
                  <TableCell className="flex items-center">
                    {getScheduleTypeIcon(schedule.type)}
                    <span className="ml-2">{schedule.type}</span>
                  </TableCell>
                  <TableCell>
                    {`At ${schedule.startTime}, ${formatRecurrence(schedule)}`}
                  </TableCell>
                  <TableCell>{nextRunDisplay}</TableCell>
                  <TableCell>
                    <Badge
                      variant={schedule.isEnabled ? "default" : "secondary"}
                      className={
                        schedule.isEnabled
                          ? "bg-green-500 hover:bg-green-600"
                          : "bg-yellow-500 hover:bg-yellow-600"
                      }
                    >
                      {schedule.isEnabled ? "Active" : "Paused"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Switch
                      checked={schedule.isEnabled}
                      onCheckedChange={(checked) =>
                        onToggleSchedule(schedule.id, checked)
                      }
                      aria-label={
                        schedule.isEnabled
                          ? "Pause schedule"
                          : "Enable schedule"
                      }
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onDeleteSchedule(schedule.id)}
                      aria-label="Delete schedule"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
