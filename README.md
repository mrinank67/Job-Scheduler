
# ChronoPrint - Reliable Job Scheduler

ChronoPrint is a web application built with Next.js and Firebase that allows users to schedule and manage recurring jobs. It provides a user-friendly interface to define job schedules (hourly, daily, weekly) and view their execution logs.

## Key Features

- **Flexible Job Scheduling:** Define new job schedules with various recurrence options:
    - **Hourly:** Run jobs at specified minute intervals.
    - **Daily:** Run jobs once per day at a specific time.
    - **Weekly:** Run jobs on selected days of the week at a specific time.
- **Job Management:**
    - View a list of all scheduled jobs, including their type, recurrence details, and calculated next run time.
    - Easily pause or resume jobs by toggling their status.
    - Delete unwanted schedules.
- **Execution Logging:**
    - Track the history of job executions.
    - View logs with timestamps, status (Success/Failure), and messages for each run.
- **Persistent Storage:**
    - Schedules and execution logs are saved to and retrieved from Cloud Firestore, ensuring data persistence across sessions.
- **User-Friendly Interface:**
    - Clean and intuitive UI built with ShadCN UI components and Tailwind CSS.
    - Responsive design for usability on various screen sizes.
- **Real-time Updates (Conceptual):** The frontend polls for job execution and updates next run times, simulating a cron-like behavior within the client.

## Tech Stack

- **Frontend:**
    - [Next.js](https://nextjs.org/) (v15+ with App Router)
    - [React](https://reactjs.org/) (v18+)
    - [TypeScript](https://www.typescriptlang.org/)
    - [Tailwind CSS](https://tailwindcss.com/) (for styling)
    - [ShadCN UI](https://ui.shadcn.com/) (for pre-built UI components)
    - `date-fns` (for robust date and time manipulation)
    - `react-hook-form` & `zod` (for form handling and validation)
- **Backend & Database:**
    - [Firebase](https://firebase.google.com/)
        - Cloud Firestore (for NoSQL database storage)
- **AI (Placeholder for future integration):**
    - Genkit (for potential AI-driven features, not currently core to scheduler logic)

## Prerequisites

Before you begin, ensure you have the following installed:
- [Node.js](https://nodejs.org/) (v18 or later recommended)
- npm (Node Package Manager) or yarn

You will also need:
- A Firebase project.
- Cloud Firestore enabled in your Firebase project.

## Getting Started

Follow these steps to get the ChronoPrint application running locally:

1.  **Clone/Download the Project:**
    Obtain the project files and navigate into the project directory.
    ```bash
    # If using git
    # git clone <repository_url>
    cd ChronoPrint
    ```

2.  **Install Dependencies:**
    Install the necessary Node.js packages.
    ```bash
    npm install
    # or
    # yarn install
    ```

3.  **Configure Firebase:**
    You need to connect the application to your Firebase project.
    -   Open the file `src/lib/firebase.ts`.
    -   You will see a `firebaseConfig` object with placeholder values:
        ```typescript
        const firebaseConfig = {
          apiKey: "YOUR_API_KEY",
          authDomain: "YOUR_AUTH_DOMAIN",
          projectId: "YOUR_PROJECT_ID",
          storageBucket: "YOUR_STORAGE_BUCKET",
          messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
          appId: "YOUR_APP_ID"
        };
        ```
    -   Replace these placeholder values with your actual Firebase project's configuration. You can find these details in your Firebase project settings on the [Firebase Console](https://console.firebase.google.com/).
    -   **Security Note:** For development and demonstration, this method is straightforward. For production applications, consider using environment variables (e.g., via a `.env.local` file with `NEXT_PUBLIC_` prefixes for client-side vars) and Firebase App Check to secure your Firebase resources.

4.  **Run the Development Server:**
    Start the Next.js development server.
    ```bash
    npm run dev
    # or
    # yarn dev
    ```

5.  **Open in Browser:**
    The application will typically be available at `http://localhost:9002` (as specified in `package.json`). Open this URL in your web browser.

## How It Works

- **Scheduling Logic:** The core scheduling logic resides in `src/components/ChronoPrintApp.tsx`. It calculates `nextRun` times based on the schedule's type, start time, and interval/days.
- **Client-Side "Cron":** An interval timer (`setInterval`) in `ChronoPrintApp.tsx` periodically checks if any active jobs are due. When a job's `nextRun` time has passed, it simulates execution (currently `console.log("Hello World!")`), logs the execution, and recalculates the next run time for that schedule.
- **Firebase Interaction:** The `src/services/scheduleService.ts` file handles all Create, Read, Update, and Delete (CRUD) operations for schedules and logs with Cloud Firestore.

## Firebase Firestore Data Structure

The application uses two main collections in Firestore:

-   **`schedules` collection:** Stores the definitions for each job.
    -   `jobName`: (string) User-defined name for the job.
    -   `type`: (string) Type of schedule ('Hourly', 'Daily', 'Weekly').
    -   `startTime`: (string) Start time in HH:mm format.
    -   `interval?`: (number) Interval in minutes (for 'Hourly' type).
    -   `daysOfWeek?`: (array of strings) Selected days (for 'Weekly' type, e.g., ["Monday", "Friday"]).
    -   `nextRun?`: (Timestamp) The next calculated execution time.
    -   `isEnabled`: (boolean) Whether the schedule is active or paused.
    -   `createdAt`: (Timestamp) Server timestamp of when the schedule was created.

-   **`executionLogs` collection:** Stores a record for each time a job is executed.
    -   `jobId`: (string) ID of the schedule this log belongs to (references a document in the `schedules` collection).
    -   `jobName`: (string) Name of the job that was executed.
    -   `executionTime`: (Timestamp) Actual time the job was executed.
    -   `message`: (string) A message related to the execution (e.g., "Executed 'Hello World'").
    -   `status`: (string) Status of the execution ('Success' or 'Failure').
