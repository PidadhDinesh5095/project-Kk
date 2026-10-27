// kafka/retry.js
import { RETRY_CONFIG } from './constants.js';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const withRetry = async (
  fn,
  {
    retries = RETRY_CONFIG.MAX_RETRIES,
    initialDelay = RETRY_CONFIG.INITIAL_RETRY_TIME,
    factor = RETRY_CONFIG.RETRY_FACTOR,
    context = 'kafka-task',
  } = {}
) => {
  let attempt = 0;
  let delay = initialDelay;

  while (true) {
    try {
      return await fn();
    } catch (err) {
      attempt += 1;
      if (attempt > retries) {
        console.error(`[retry] ${context} failed after ${retries} retries:`, err.message);
        throw err;
      }
      console.warn(`[retry] ${context} failed (retry ${attempt}/${retries}) in ${delay}ms:`, err.message);
      await sleep(delay);
      delay *= factor;
    }
  }
};

export default withRetry;
