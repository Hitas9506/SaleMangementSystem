import cron from 'node-cron';

let started = false;

export function startCronJobs() {
  if (started) return;
  started = true;

  // Cron jobs can be added here in the future
  // Example: cron.schedule('0 * * * *', async () => { ... });
}
