
"use client";

import type * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { FileText, CheckCircle2, XCircle } from 'lucide-react';
import type { LogEntry } from '@/types';
import { format } from 'date-fns';
import { ScrollArea } from '@/components/ui/scroll-area'; // Assuming global scroll area
import type { Timestamp } from 'firebase/firestore';


interface ExecutionLogProps {
  logs: LogEntry[];
}

export function ExecutionLog({ logs }: ExecutionLogProps) {
  if (logs.length === 0) {
    return (
      <Card className="shadow-lg mt-8">
        <CardHeader>
          <CardTitle className="flex items-center text-2xl font-headline">
            <FileText className="mr-2 h-6 w-6 text-primary" />
            Job Execution Log
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-4">No job executions logged yet.</p>
        </CardContent>
      </Card>
    );
  }
  return (
    <Card className="shadow-lg mt-8">
      <CardHeader>
        <CardTitle className="flex items-center text-2xl font-headline">
          <FileText className="mr-2 h-6 w-6 text-primary" />
          Job Execution Log
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[300px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Job Name</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Message</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log) => { // Already sorted by ChronoPrintApp
                const executionTimeDate = log.executionTime instanceof Date ? log.executionTime : (log.executionTime as Timestamp).toDate();
                return (
                  <TableRow key={log.id}>
                    <TableCell className="font-medium">{log.jobName}</TableCell>
                    <TableCell>{format(executionTimeDate, 'MMM d, yyyy HH:mm:ss')}</TableCell>
                    <TableCell>
                      <Badge variant={log.status === 'Success' ? 'default' : 'destructive'} className={log.status === 'Success' ? 'bg-green-500 hover:bg-green-600' : ''}>
                        {log.status === 'Success' ? 
                          <CheckCircle2 className="mr-1 h-4 w-4 inline-block" /> : 
                          <XCircle className="mr-1 h-4 w-4 inline-block" />
                        }
                        {log.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{log.message}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
