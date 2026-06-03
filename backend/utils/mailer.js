/**
 * @file Mailer utility.
 * @description Sends transactional emails. Uses SMTP env vars if configured
 *              (production / staging). Otherwise falls back to logging the
 *              reset link to the console — perfect for local development and
 *              the in-memory database flow.
 *
 * SMTP env vars (all optional):
 *   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM
 */

const nodemailer = require('nodemailer');

/**
 * Cached nodemailer transporter. `null` = not yet initialized,
 * `false` = no SMTP configured (dev mode), otherwise a real transporter.
 * @type {import('nodemailer').Transporter|false|null}
 */
let transporter = null;

/**
 * Lazily build and cache the nodemailer transporter. Reads the
 * `SMTP_HOST` / `SMTP_USER` / `SMTP_PASS` env vars the first time
 * it's called. Returns `false` (sentinel) when SMTP is not configured
 * so the caller knows to fall back to the console-logger.
 *
 * @returns {import('nodemailer').Transporter|false}
 */
const getTransporter = () => {
    if (transporter !== null) return transporter;

    const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
    if (SMTP_HOST && SMTP_USER && SMTP_PASS) {
        transporter = nodemailer.createTransport({
            host: SMTP_HOST,
            port: parseInt(SMTP_PORT || '587', 10),
            secure: parseInt(SMTP_PORT || '587', 10) === 465,
            auth: { user: SMTP_USER, pass: SMTP_PASS },
        });
        console.log('📧 SMTP configured: emails will be sent via', SMTP_HOST);
    } else {
        transporter = false; // sentinel for "log to console"
        console.log('📧 SMTP not configured — reset links will be logged to the server console.');
    }
    return transporter;
};

/**
 * Send a password-reset email.
 * @param {Object} params
 * @param {string} params.to Recipient email address
 * @param {string} params.username Recipient username (for the greeting)
 * @param {string} params.resetUrl Full URL with the reset token
 * @returns {Promise<{ delivered: boolean, preview?: string }>}
 */
const sendPasswordResetEmail = async ({ to, username, resetUrl }) => {
    const subject = 'Reset your Social App password';
    const text =
        `Hi @${username},\n\n` +
        `We received a request to reset your password. Click the link below to set a new one:\n\n` +
        `${resetUrl}\n\n` +
        `This link expires in 1 hour. If you didn't request this, you can ignore this email.\n\n` +
        `— The Social App team`;
    const html =
        `<p>Hi <strong>@${username}</strong>,</p>` +
        `<p>We received a request to reset your password. Click the button below to set a new one:</p>` +
        `<p><a href="${resetUrl}" style="display:inline-block;padding:12px 20px;background:#1877F2;color:white;border-radius:24px;text-decoration:none;font-weight:600">Reset password</a></p>` +
        `<p>Or paste this link in your browser:<br><code>${resetUrl}</code></p>` +
        `<p>This link expires in <strong>1 hour</strong>. If you didn't request this, you can ignore this email.</p>` +
        `<p style="color:#888;font-size:12px">— The Social App team</p>`;

    const t = getTransporter();
    if (!t) {
        // No SMTP — log it (dev mode)
        console.log('\n📨 PASSWORD RESET EMAIL (preview mode)');
        console.log(`   To:      ${to}`);
        console.log(`   Subject: ${subject}`);
        console.log(`   Link:    ${resetUrl}\n`);
        return { delivered: false, preview: resetUrl };
    }

    try {
        await t.sendMail({
            from: process.env.SMTP_FROM || `"Social App" <${process.env.SMTP_USER}>`,
            to,
            subject,
            text,
            html,
        });
        return { delivered: true };
    } catch (err) {
        console.error('📧 Failed to send reset email:', err.message);
        return { delivered: false, error: err.message };
    }
};

module.exports = { sendPasswordResetEmail };
