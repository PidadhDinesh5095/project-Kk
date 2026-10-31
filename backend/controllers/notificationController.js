import pool from '../db/pool.js';
import ApiResponse from '../utils/ApiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';

// GET /notifications?offset=0&limit=10
const listNotifications = asyncHandler(async (req, res) => {
  const rawLimit = Number(req.query.limit ?? 10);
  const rawOffset = Number(req.query.offset ?? 0);
  const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, 50) : 10;
  const offset = Number.isFinite(rawOffset) && rawOffset >= 0 ? rawOffset : 0;

  const [{ rows: totalRows }, { rows }] = await Promise.all([
    pool.query('SELECT COUNT(*)::int AS total FROM notifications WHERE user_id = $1', [req.user.id]),
    pool.query(
      'SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3',
      [req.user.id, limit, offset]
    ),
  ]);

  const total = Number(totalRows[0]?.total ?? 0);
  return ApiResponse.success(res, {
    items: rows,
    offset,
    limit,
    total,
    hasMore: offset + rows.length < total,
  });
});

// PATCH /notifications/:id/read
const markAsRead = asyncHandler(async (req, res) => {
  const { rows } = await pool.query(
    'UPDATE notifications SET read = true WHERE id = $1 AND user_id = $2 RETURNING *',
    [req.params.id, req.user.id]
  );
  if (rows.length === 0) return res.status(404).json({ success: false, message: 'Notification not found' });
  return ApiResponse.success(res, rows[0]);
});

// PATCH /notifications/mark-all-read
const markAllAsRead = asyncHandler(async (req, res) => {
  await pool.query('UPDATE notifications SET read = true WHERE user_id = $1 AND read = false', [req.user.id]);
  return ApiResponse.success(res, null, 200, 'All notifications marked as read');
});

const clearNotifications = asyncHandler(async (req, res) => {
  await pool.query('DELETE FROM notifications WHERE user_id = $1', [req.user.id]);
  return ApiResponse.success(res, null, 200, 'Notifications cleared');
});

// POST /notifications/device-token — registers an FCM token for push notifications.
// Without this, Socket.io only reaches a user with the app open in the foreground —
// this is what lets a notification reach a closed app.
const registerDeviceToken = asyncHandler(async (req, res) => {
  const { deviceToken } = req.body;
  await pool.query(
    `UPDATE users SET device_tokens = ARRAY(SELECT DISTINCT unnest(device_tokens || $1::text[])) WHERE id = $2`,
    [[deviceToken], req.user.id]
  );
  return ApiResponse.success(res, null, 200, 'Device token registered');
});

export default { listNotifications, markAsRead, markAllAsRead, clearNotifications, registerDeviceToken };
