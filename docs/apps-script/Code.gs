/**
 * MeetMyPets waitlist backend — Google Apps Script web app.
 *
 * Receives a signup from the static site, appends it to the `waitlist` sheet,
 * and sends a confirmation email through Resend.
 *
 * This file is the source of truth for what is deployed. It is NOT executed
 * from this repo — paste it into the Sheet's Apps Script editor and deploy.
 * Keep the two in sync; a change here that is never pasted does nothing.
 *
 * DEPLOYING
 *   Extensions > Apps Script, replace Code.gs with this file, Save, then
 *   Deploy > Manage deployments > edit (pencil) > Version: New version.
 *   Saving alone does NOT update the live /exec URL.
 *
 * REQUIRED SETUP
 *   Project Settings > Script Properties:
 *     RESEND_API_KEY = re_...   (Resend key with sending access)
 *   Deploy > web app: Execute as "Me", Who has access "Anyone".
 *   "Anyone" is required — visitors are not signed in to Google.
 */

const SHEET_NAME = 'waitlist';

/** Verified sending domain in Resend. Mail from any other domain is rejected. */
const FROM = 'MeetMyPets <hello@meetmypets.app>';

/** Replies must land somewhere a human reads. See note in sendWelcomeEmail. */
const REPLY_TO = 'hello@meetmypets.app';

const SITE_URL = 'https://www.meetmypets.app';

function doPost(e) {
  const out = (o) => ContentService.createTextOutput(JSON.stringify(o))
    .setMimeType(ContentService.MimeType.JSON);

  let data;
  try { data = JSON.parse(e.postData.contents); }
  catch (err) { return out({ ok: false, error: 'bad_json' }); }

  // Honeypot: a hidden form field no human ever sees. Report success anyway
  // so a bot cannot detect that it was filtered.
  if (data.website) return out({ ok: true });

  const email = String(data.email || '').trim().toLowerCase();
  const phone = String(data.phone || '').trim();
  if (!email && !phone) return out({ ok: false, error: 'empty' });

  // Sheets has no unique constraint and appendRow is not atomic across
  // concurrent executions, so serialise the read-then-append.
  const lock = LockService.getScriptLock();
  try { lock.waitLock(10000); } catch (err) { return out({ ok: false, error: 'busy' }); }

  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
    const last = sheet.getLastRow();
    if (last > 1) {
      const rows = sheet.getRange(2, 2, last - 1, 2).getValues();
      for (const [e0, p0] of rows) {
        // Returning here is what makes the welcome email send exactly once:
        // a repeat signup never reaches the appendRow below.
        if (email && String(e0).trim().toLowerCase() === email) return out({ ok: true });
        if (phone && String(p0).trim() === phone) return out({ ok: true });
      }
    }
    sheet.appendRow([new Date(), email, phone, data.source || 'waitlist']);
  } finally {
    // Released BEFORE the email send — Resend takes a few hundred ms and
    // holding the script lock across it would serialise concurrent signups
    // behind a network call for no benefit. The row is already committed.
    lock.releaseLock();
  }

  // Phone-only signups are stored but cannot be emailed: a phone number does
  // not imply an inbox. Reaching them needs SMS, which is a separate service.
  if (email) sendWelcomeEmail(email);

  return out({ ok: true });
}

/**
 * Sends the confirmation email. Never throws.
 *
 * Capturing the lead matters more than confirming it: if Resend is down, the
 * key is revoked, or the network fails, the row is already saved and the user
 * still sees success. We lose one email, never a signup. Failures go to the
 * Apps Script execution log (View > Executions).
 */
function sendWelcomeEmail(to) {
  const apiKey = PropertiesService.getScriptProperties().getProperty('RESEND_API_KEY');
  if (!apiKey) {
    console.error('RESEND_API_KEY missing — skipping welcome email for ' + to);
    return;
  }

  try {
    const response = UrlFetchApp.fetch('https://api.resend.com/emails', {
      method: 'post',
      contentType: 'application/json',
      headers: { Authorization: 'Bearer ' + apiKey },
      // Return the error body instead of throwing on 4xx/5xx, so a bad key or
      // an unverified domain shows up in the log as a readable message.
      muteHttpExceptions: true,
      payload: JSON.stringify({
        from: FROM,
        to: [to],
        reply_to: REPLY_TO,
        subject: 'Your MeetMyPets pre-registration is confirmed',
        html: welcomeHtml(),
        // Plain-text alternative. Without it, spam filters score the message
        // worse and text-only clients render nothing.
        text: welcomeText(),
      }),
    });

    const code = response.getResponseCode();
    if (code < 200 || code >= 300) {
      console.error('Resend failed (' + code + ') for ' + to + ': ' + response.getContentText());
    }
  } catch (err) {
    console.error('Resend threw for ' + to + ': ' + err);
  }
}

/**
 * Email body. Confirms the pre-registration and sets expectations about when
 * the next email arrives — deliberately not a feature pitch. The reader has
 * already signed up; selling to them again is what makes a confirmation feel
 * like marketing.
 *
 * Table-based layout with inline styles on purpose — Outlook renders with
 * Word's engine, which ignores flexbox, grid and <style> blocks. This is
 * ugly HTML that displays correctly, rather than clean HTML that does not.
 */
function welcomeHtml() {
  return [
    '<!DOCTYPE html>',
    '<html><head><meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width,initial-scale=1">',
    '<title>Your MeetMyPets pre-registration is confirmed</title></head>',
    '<body style="margin:0;padding:0;background:#f6e7de;">',
    // Hidden preview line — what inboxes show next to the subject.
    '<div style="display:none;max-height:0;overflow:hidden;opacity:0;">',
    'You are on the early access list. We will email you the day MeetMyPets goes live.',
    '</div>',
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"',
    ' style="background:#f6e7de;padding:32px 16px;">',
    '<tr><td align="center">',
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"',
    ' style="max-width:520px;background:#ffffff;border-radius:16px;',
    'font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,Helvetica,Arial,sans-serif;">',

    '<tr><td style="padding:40px 32px 0;">',
    '<p style="margin:0;font-size:12px;font-weight:600;letter-spacing:0.14em;',
    'text-transform:uppercase;color:#c2531f;">Pre-registration confirmed</p>',
    '<h1 style="margin:12px 0 0;font-size:26px;line-height:1.25;color:#1c1917;">',
    'You are on the list</h1>',
    '<p style="margin:16px 0 0;font-size:16px;line-height:1.6;color:#57534e;">',
    'Your pre-registration for MeetMyPets is complete &mdash; thanks for joining us ',
    'this early. Your spot is saved, and there is nothing else you need to do.',
    '</p>',
    '</td></tr>',

    // "What happens next" instead of a feature list: someone who just signed
    // up has already been sold. What they actually want to know is when they
    // will hear from us and what they are expected to do in the meantime.
    '<tr><td style="padding:28px 32px 0;">',
    '<p style="margin:0 0 12px;font-size:15px;font-weight:600;color:#1c1917;">',
    'What happens next</p>',
    '<p style="margin:0 0 10px;font-size:15px;line-height:1.6;color:#57534e;">',
    'We are putting the finishing touches on the iOS and Android apps. The day ',
    'they go live, you will get an email from us with your download link.</p>',
    '<p style="margin:0;font-size:15px;line-height:1.6;color:#57534e;">',
    'Until then you can sit back &mdash; we will not fill your inbox in the meantime.</p>',
    '</td></tr>',

    '<tr><td style="padding:28px 32px 40px;">',
    '<a href="' + SITE_URL + '"',
    ' style="display:inline-block;background:#c2531f;color:#ffffff;text-decoration:none;',
    'font-size:15px;font-weight:600;padding:14px 28px;border-radius:999px;">',
    'Explore MeetMyPets</a>',
    '</td></tr>',

    '</table>',

    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"',
    ' style="max-width:520px;font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',',
    'Roboto,Helvetica,Arial,sans-serif;">',
    '<tr><td style="padding:24px 32px;text-align:center;">',
    '<p style="margin:0;font-size:12px;line-height:1.6;color:#78716c;">',
    'You are receiving this because you pre-registered at meetmypets.app.<br>',
    'We do not sell or share your details.</p>',
    '<p style="margin:12px 0 0;font-size:12px;line-height:1.6;color:#78716c;">',
    '<a href="' + SITE_URL + '/privacy/" style="color:#78716c;">Privacy policy</a>',
    ' &nbsp;&middot;&nbsp; ',
    '<a href="' + SITE_URL + '/terms/" style="color:#78716c;">Terms of service</a>',
    '</p>',
    '<p style="margin:12px 0 0;font-size:12px;line-height:1.6;color:#78716c;">',
    'XLU Technologies Private Limited</p>',
    '</td></tr>',
    '</table>',

    '</td></tr></table></body></html>',
  ].join('');
}

/**
 * Plain-text alternative. Mirrors welcomeHtml so both versions say the same
 * thing — a text part that contradicts the HTML part is a spam signal.
 *
 * Joined with '\r\n', not '\n'. RFC 5322 specifies CRLF as the line ending
 * for mail; a bare \n is stripped somewhere in the pipeline and the whole
 * body arrives as one run-on paragraph.
 */
function welcomeText() {
  return [
    'PRE-REGISTRATION CONFIRMED',
    '',
    'You are on the list',
    '',
    'Your pre-registration for MeetMyPets is complete - thanks for joining us',
    'this early. Your spot is saved, and there is nothing else you need to do.',
    '',
    'What happens next',
    '',
    'We are putting the finishing touches on the iOS and Android apps. The day',
    'they go live, you will get an email from us with your download link.',
    '',
    'Until then you can sit back - we will not fill your inbox in the meantime.',
    '',
    'Explore MeetMyPets: ' + SITE_URL,
    '',
    '---',
    'You are receiving this because you pre-registered at meetmypets.app.',
    'We do not sell or share your details.',
    'Privacy policy: ' + SITE_URL + '/privacy/',
    'Terms of service: ' + SITE_URL + '/terms/',
    'XLU Technologies Private Limited',
  ].join('\r\n');
}

/**
 * Preview the email without going through the site — select sendTestEmail in
 * the editor and Run. Useful after any copy change.
 *
 * The recipient comes from a Script Property so no personal address is
 * committed here. Set it once:
 *   Project Settings > Script Properties > TEST_EMAIL = you@example.com
 *
 * Not called by doPost; harmless to leave in place or delete.
 */
function sendTestEmail() {
  const to = PropertiesService.getScriptProperties().getProperty('TEST_EMAIL');
  if (!to) {
    // Thrown, not logged: this runs only by hand, and a silent no-op would
    // look identical to a successful send.
    throw new Error('Set a TEST_EMAIL script property first (Project Settings).');
  }
  console.log('Sending test email to ' + to);
  sendWelcomeEmail(to);
}
