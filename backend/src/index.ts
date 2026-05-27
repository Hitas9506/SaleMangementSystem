import { env } from './config/env';
import { createApp } from './app';
import { startCronJobs } from './cron';

const app = createApp();

app.listen(env.PORT, () => {
  console.log(`VTShop backend listening on port ${env.PORT}`);
  startCronJobs();
});
