// kafka/handlers/campaign.handler.js
import pool from '../../db/pool.js';
import { EVENT_TYPES } from '../constants.js';
import { notify } from '../notify.js';

const PAGE_SIZE = 500;

// A broadcast has no single owner, so the handler FANS OUT: one per-user
// notification (keyed by that user's id) so per-user ordering still holds.
const handleBroadcast = async ({ title, body, data = {} }) => {
  let cursor = null;
  while (true) {
    const { rows } = await pool.query(
      `SELECT id FROM users
        WHERE active = true AND ($1::uuid IS NULL OR id > $1::uuid)
        ORDER BY id
        LIMIT ${PAGE_SIZE}`,
      [cursor]
    );
    if (rows.length === 0) break;

    for (const { id } of rows) {
      await notify(id, { type: 'GENERAL', title, body, data }); // push + in-app, no email
    }
    cursor = rows[rows.length - 1].id;
  }
};

const handleBirthday = async ({ userId, firstName }) => {
  await notify(userId, {
    type: 'GENERAL',
    title: `Happy Birthday${firstName ? `, ${firstName}` : ''}! 🎉`,
    body: 'Wishing you a wonderful day from all of us.',
    data: { screen: 'Home' },
  });
};

export const campaignHandlers = {
  [EVENT_TYPES.CAMPAIGN_BROADCAST]: handleBroadcast,
  [EVENT_TYPES.USER_BIRTHDAY]: handleBirthday,
};

export default campaignHandlers;
