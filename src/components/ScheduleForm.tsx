"use client";

import type * as React from 'react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CalendarPlus, Clock, Repeat, CalendarDays } from 'lucide-react';
import type { Schedule, ScheduleType, DayOfWeek } from '@/types';
import { ALL_DAYS_OF_WEEK } from '@/types';

const scheduleSchema = z.object({
  jobName: z.string().min(1, "Job name is required."),
  type: z.enum(["Hourly", "Daily", "Weekly"], { required_error: "Schedule type is required." }),
  startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Invalid time format (HH:MM). E.g., 09:30 or 14:00."),
  interval: z.string().optional(), // String to handle empty input, convert to number later
  daysOfWeek: z.array(z.enum(ALL_DAYS_OF_WEEK)).optional(),
}).superRefine((data, ctx) => {
  if (data.type === "Hourly") {
    if (!data.interval || data.interval.trim() === "") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Interval is required for hourly schedules.",
        path: ["interval"],
      });
    } else {
      const intervalNum = parseInt(data.interval, 10);
      if (isNaN(intervalNum) || intervalNum < 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Interval must be a positive number.",
          path: ["interval"],
        });
      }
    }
  }
  if (data.type === "Weekly" && (!data.daysOfWeek || data.daysOfWeek.length === 0)) {
     ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "At least one day must be selected for weekly schedules.",
        path: ["daysOfWeek"],
      });
  }
});

type ScheduleFormValues = z.infer<typeof scheduleSchema>;

interface ScheduleFormProps {
  onAddSchedule: (schedule: Omit<Schedule, 'id' | 'nextRun' | 'isEnabled'> & { interval?: number }) => void;
}

export function ScheduleForm({ onAddSchedule }: ScheduleFormProps) {
  const form = useForm<ScheduleFormValues>({
    resolver: zodResolver(scheduleSchema),
    defaultValues: {
      jobName: '',
      type: undefined,
      startTime: '09:00',
      interval: '60',
      daysOfWeek: [],
    },
  });

  const [selectedType, setSelectedType] = useState<ScheduleType | undefined>(undefined);

  function onSubmit(values: ScheduleFormValues) {
    const scheduleData: Omit<Schedule, 'id' | 'nextRun' | 'isEnabled'> & { interval?: number } = {
      jobName: values.jobName,
      type: values.type!,
      startTime: values.startTime,
    };
    if (values.type === 'Hourly') {
      scheduleData.interval = parseInt(values.interval!, 10);
    }
    if (values.type === 'Weekly') {
      scheduleData.daysOfWeek = values.daysOfWeek as DayOfWeek[];
    }
    onAddSchedule(scheduleData);
    form.reset();
    setSelectedType(undefined);
  }

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center text-2xl font-headline">
          <CalendarPlus className="mr-2 h-6 w-6 text-primary" />
          Define New Schedule
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="jobName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Job Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Daily Backup" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Schedule Type</FormLabel>
                  <Select
                    onValueChange={(value) => {
                      field.onChange(value);
                      setSelectedType(value as ScheduleType);
                    }}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select schedule type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Hourly"><Clock className="inline-block mr-2 h-4 w-4" />Hourly</SelectItem>
                      <SelectItem value="Daily"><CalendarDays className="inline-block mr-2 h-4 w-4" />Daily</SelectItem>
                      <SelectItem value="Weekly"><Repeat className="inline-block mr-2 h-4 w-4" />Weekly</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="startTime"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Start Time (HH:MM)</FormLabel>
                  <FormControl>
                    <Input type="time" {...field} />
                  </FormControl>
                  <FormDescription>Enter time in 24-hour format (e.g., 14:30).</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {selectedType === 'Hourly' && (
              <FormField
                control={form.control}
                name="interval"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Interval (minutes)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="e.g., 30" {...field} onChange={e => field.onChange(e.target.value)} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {selectedType === 'Weekly' && (
              <FormField
                control={form.control}
                name="daysOfWeek"
                render={() => (
                  <FormItem>
                    <FormLabel>Days of the Week</FormLabel>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                      {ALL_DAYS_OF_WEEK.map((day) => (
                        <FormField
                          key={day}
                          control={form.control}
                          name="daysOfWeek"
                          render={({ field }) => {
                            return (
                              <FormItem
                                key={day}
                                className="flex flex-row items-start space-x-3 space-y-0"
                              >
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes(day)}
                                    onCheckedChange={(checked) => {
                                      return checked
                                        ? field.onChange([...(field.value || []), day])
                                        : field.onChange(
                                            (field.value || []).filter(
                                              (value) => value !== day
                                            )
                                          );
                                    }}
                                  />
                                </FormControl>
                                <FormLabel className="font-normal">
                                  {day}
                                </FormLabel>
                              </FormItem>
                            );
                          }}
                        />
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            
            <Button type="submit" className="w-full bg-accent hover:bg-accent/90 text-accent-foreground">
              Add Schedule
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
