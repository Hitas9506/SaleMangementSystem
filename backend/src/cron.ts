import cron from 'node-cron';

import { sendDailyZaloReport, shouldSendZaloReportAt } from './lib/zaloReport';

let started = false;

export function startCronJobs() {
  if (started) return;
  started = true;

  cron.schedule('0 * * * *', async () => {
    try {
      const now = new Date();
      if (!(await shouldSendZaloReportAt(now))) return;
      const result = await sendDailyZaloReport(now);
      console.log('[ZALO REPORT CRON]', { sent: result.sent, mocked: result.mocked, recipient: result.recipient });
    } catch (error) {
      console.warn('[ZALO REPORT CRON FAILED]', error);
    }
  });
}
