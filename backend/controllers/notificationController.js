import pool from '../db/pool.js';
import ApiResponse from '../utils/ApiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';

// GET /notifications
const listNotifications = asyncHandler(async (req, res) => {
  const { rows } = await pool.query(
    'SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 100',
    [req.user.id]
  );
  return ApiResponse.success(res, rows);
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
