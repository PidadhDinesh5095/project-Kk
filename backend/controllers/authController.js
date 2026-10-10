import pool from '../db/pool.js';
import otpService from '../utils/otpService.js';
import __cjsModule2 from '../utils/tokenService.js';
const { signAccessToken, signRefreshToken, hashToken, verifyRefreshToken } = __cjsModule2;
import ApiResponse from '../utils/ApiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';

// POST /auth/otp/send
// POST /auth/otp/send
// Also reports whether this number is already registered, so the frontend can
// show "Welcome Back" vs "Create Account" copy before the customer even enters
// the OTP — the actual account creation still happens in /otp/verify below,
// not here, since creating a row for a phone number that never completes OTP
// verification would leave orphaned unverified "users" in the database.
const sendOtp = asyncHandler(async (req, res) => {
  const { phone } = req.body;
  console.log(`[auth] sendOtp for ${phone}`);
  await otpService.checkOtpSendRateLimit(phone);

  const { rows } = await pool.query('SELECT id FROM users WHERE phone = $1', [phone]);
  const isRegistered = rows.length > 0;

  const result = await otpService.requestOtp(phone);
  console.log(`[auth] sendOtp result for ${phone}:`, result);
  return ApiResponse.success(res, { ...result, isRegistered }, 200, 'OTP sent');
});

// POST /auth/otp/verify
// If the phone isn't already a user, this call ALSO creates the user record.
const verifyOtp = asyncHandler(async (req, res) => {
  const { phone, otp } = req.body;
  await otpService.verifyOtp(phone, otp);

  let { rows } = await pool.query('SELECT * FROM users WHERE phone = $1', [phone]);
  let user = rows[0];
  let isNewUser = false;

  if (!user) {
    const insertResult = await pool.query(
      'INSERT INTO users (phone) VALUES ($1) RETURNING *',
      [phone]
    );
    user = insertResult.rows[0];
    isNewUser = true;

    await pool.query(
      'INSERT INTO wallets (user_id) VALUES ($1)',
      [user.id]
    );
  } else {
    const { rows: addressRows } = await pool.query(
      'SELECT EXISTS (SELECT 1 FROM addresses WHERE user_id = $1) AS has_address',
      [user.id]
    );
    isNewUser = !addressRows[0].has_address;
  }

  const accessToken = signAccessToken(user.id);
  const refreshToken = signRefreshToken(user.id);
  await pool.query('UPDATE users SET refresh_token_hash = $1, updated_at = now() WHERE id = $2', [
    hashToken(refreshToken),
    user.id,
  ]);

  return ApiResponse.success(res, {
    accessToken,
    refreshToken,
    isNewUser,
    profileCompleted: user.profile_completed,
    user: { id: user.id, phone: user.phone },
  });
});

// POST /auth/refresh
const refresh = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    return res.status(401).json({ success: false, message: 'Invalid or expired refresh token' });
  }

  const { rows } = await pool.query('SELECT * FROM users WHERE id = $1', [payload.sub]);
  const user = rows[0];
  if (!user || user.refresh_token_hash !== hashToken(refreshToken)) {
    return res.status(401).json({ success: false, message: 'Refresh token no longer valid' });
  }

  const newAccessToken = signAccessToken(user.id);
  return ApiResponse.success(res, { accessToken: newAccessToken });
});

// POST /auth/logout
const logout = asyncHandler(async (req, res) => {
  await pool.query('UPDATE users SET refresh_token_hash = NULL WHERE id = $1', [req.user.id]);
  return ApiResponse.success(res, null, 200, 'Logged out');
});

export default { sendOtp, verifyOtp, refresh, logout };
