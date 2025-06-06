
import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
  Timestamp,
  orderBy,
  query,
  serverTimestamp,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Schedule, FirestoreSchedule, LogEntry, FirestoreLogEntry, DayOfWeek, ScheduleType } from '@/types';

const schedulesCollection = collection(db, 'schedules');
const logsCollection = collection(db, 'executionLogs');

// Helper to convert FirestoreSchedule to Schedule (Timestamp to Date)
const fromFirestoreSchedule = (firestoreDoc: FirestoreSchedule & { id: string }): Schedule => {
  return {
    ...firestoreDoc,
    nextRun: firestoreDoc.nextRun?.toDate(),
    createdAt: firestoreDoc.createdAt?.toDate(), // Keep as Date if needed, or handle as Timestamp
  };
};

// Helper to convert Schedule to FirestoreSchedule (Date to Timestamp)
const toFirestoreSchedule = (appSchedule: Partial<Omit<Schedule, 'id' | 'createdAt'>>): Partial<Omit<FirestoreSchedule, 'createdAt'>> => {
  const firestoreData: Partial<Omit<FirestoreSchedule, 'createdAt'>> = { ...appSchedule };
  if (appSchedule.nextRun instanceof Date) {
    firestoreData.nextRun = Timestamp.fromDate(appSchedule.nextRun);
  } else if (appSchedule.nextRun === undefined) {
    firestoreData.nextRun = undefined; // Explicitly set to undefined if that's the intention
  }
  // isEnabled can be directly passed
  return firestoreData;
};


export const getSchedulesFromFirestore = async (): Promise<Schedule[]> => {
  try {
    const q = query(schedulesCollection, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(docSnap => fromFirestoreSchedule({ ...docSnap.data() as FirestoreSchedule, id: docSnap.id }));
  } catch (error) {
    console.error("Error fetching schedules: ", error);
    return [];
  }
};

export const addScheduleToFirestore = async (
  scheduleData: Omit<Schedule, 'id' | 'nextRun' | 'isEnabled' | 'createdAt'> & { interval?: number, nextRun?: Date, isEnabled: boolean }
): Promise<Schedule | null> => {
  try {
    const dataToSave = {
      ...toFirestoreSchedule(scheduleData),
      jobName: scheduleData.jobName,
      type: scheduleData.type,
      startTime: scheduleData.startTime,
      daysOfWeek: scheduleData.daysOfWeek || [],
      interval: scheduleData.interval || null,
      isEnabled: scheduleData.isEnabled,
      createdAt: serverTimestamp(),
    };
    const docRef = await addDoc(schedulesCollection, dataToSave);
    return fromFirestoreSchedule({ ...scheduleData, ...dataToSave, id: docRef.id, createdAt: Timestamp.now() } as FirestoreSchedule & { id: string });
  } catch (error) {
    console.error("Error adding schedule: ", error);
    return null;
  }
};

export const updateScheduleInFirestore = async (scheduleId: string, updates: Partial<Pick<Schedule, 'isEnabled' | 'nextRun' | 'jobName' | 'type' | 'startTime' | 'interval' | 'daysOfWeek'>>): Promise<boolean> => {
  try {
    const scheduleRef = doc(db, 'schedules', scheduleId);
    await updateDoc(scheduleRef, toFirestoreSchedule(updates));
    return true;
  } catch (error) {
    console.error("Error updating schedule: ", error);
    return false;
  }
};

export const deleteScheduleFromFirestore = async (scheduleId: string): Promise<boolean> => {
  try {
    // Also delete associated logs
    const logsQuery = query(logsCollection, where('jobId', '==', scheduleId));
    const logSnapshot = await getDocs(logsQuery);
    const batch = writeBatch(db);
    logSnapshot.docs.forEach(logDoc => {
      batch.delete(doc(db, 'executionLogs', logDoc.id));
    });
    
    const scheduleRef = doc(db, 'schedules', scheduleId);
    batch.delete(scheduleRef);
    
    await batch.commit();
    return true;
  } catch (error) {
    console.error("Error deleting schedule and its logs: ", error);
    return false;
  }
};


// Helper to convert FirestoreLogEntry to LogEntry
const fromFirestoreLog = (firestoreDoc: FirestoreLogEntry & { id: string }): LogEntry => {
  return {
    ...firestoreDoc,
    executionTime: firestoreDoc.executionTime.toDate(),
  };
};

export const getLogsFromFirestore = async (): Promise<LogEntry[]> => {
  try {
    const q = query(logsCollection, orderBy('executionTime', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(docSnap => fromFirestoreLog({ ...docSnap.data() as FirestoreLogEntry, id: docSnap.id }));
  } catch (error) {
    console.error("Error fetching logs: ", error);
    return [];
  }
};

export const addLogToFirestore = async (logData: Omit<LogEntry, 'id' | 'executionTime'> & { executionTime: Date }): Promise<LogEntry | null> => {
  try {
    const dataToSave = {
      ...logData,
      executionTime: Timestamp.fromDate(logData.executionTime),
    };
    const docRef = await addDoc(logsCollection, dataToSave);
    return { ...logData, id: docRef.id };
  } catch (error) {
    console.error("Error adding log: ", error);
    return null;
  }
};
