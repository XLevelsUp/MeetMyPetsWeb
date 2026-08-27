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
 *
 * SHEET COLUMNS (row 1 header, exact order):
 *   Date | Time | Email | Phone | Source
 *   appendRow below writes in this order. If the sheet's real columns ever
 *   differ, values land in the wrong cells with no error — Sheets has no
 *   schema to enforce it.
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
      // Columns C-D: Email, Phone. Column order is Date | Time | Email | Phone | Source.
      const rows = sheet.getRange(2, 3, last - 1, 2).getValues();
      for (const [e0, p0] of rows) {
        // Returning here is what makes the welcome email send exactly once:
        // a repeat signup never reaches the appendRow below.
        if (email && String(e0).trim().toLowerCase() === email) return out({ ok: true });
        if (phone && String(p0).trim() === phone) return out({ ok: true });
      }
    }
    const now = new Date();
    sheet.appendRow([now, now, email, phone, data.source || 'waitlist']);
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
 * Logo mark shown in the email header. Hosted, not embedded: Outlook/Gmail
 * strip <style> blocks and gradients on live text, so the gradient dog mark
 * and wordmark from Figma are shipped as a static asset instead of markup.
 * Source: apps/marketing/public/brand-mark.png, deployed at this URL.
 *
 * Figma spec ("MeetMyPet Icon 9"): 103x103, top:56 left:145 on the 320-wide
 * card. Table centering (align="center") reproduces the visual position;
 * the raw left offset is not usable directly since it is relative to the
 * icon's own bounding box, not the table cell.
 */
const LOGO_URL = SITE_URL + '/brand-mark.png';

/** Gradient "MeetMyPets" wordmark, flattened to PNG (gradient text is not
 * reliable across email clients). Source: apps/marketing/public/email-wordmark.png. */
const WORDMARK_URL = SITE_URL + '/email-wordmark.png';

/** Figma "cil:badge" icon, exported as-is. Source: apps/marketing/public/cil_badge.png. */
const BADGE_URL = SITE_URL + '/cil_badge.png';

/** Figma "ci:chat-circle" paw icon, exported pre-rotated. Source: apps/marketing/public/ci_chat-circle.png. */
const PAW_URL = SITE_URL + '/ci_chat-circle.png';

/**
 * Email body — matches the Figma "Waitlist mail mobile" frame (light card
 * #FFFAFA, dark card variant from the design's night-mode screenshot).
 *
 * Table-based layout with inline styles on purpose — Outlook renders with
 * Word's engine, which ignores flexbox, grid and <style> blocks. This is
 * ugly HTML that displays correctly, rather than clean HTML that does not.
 *
 * Bricolage Grotesque and Nunito Sans are Figma's fonts, loaded here via
 * Google Fonts for clients that support @import/<link> (Apple Mail, most
 * webmail). Everywhere else (Outlook, some Gmail contexts) falls back to the
 * system stack — expected and harmless; the type scale and color survive
 * either way, only the face changes.
 *
 * Dark mode is CSS-only (prefers-color-scheme): Gmail/Outlook ignore the
 * media query and always render the light card, which is a safe default,
 * not a broken one. Apple/iOS/macOS Mail honor it and flip to the dark card.
 */
function welcomeHtml() {
  return [
    '<!DOCTYPE html>',
    '<html><head><meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width,initial-scale=1">',
    '<meta name="color-scheme" content="light dark">',
    '<meta name="supported-color-schemes" content="light dark">',
    '<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@500&family=Nunito+Sans:wght@400;500;600&display=swap" rel="stylesheet">',
    '<title>Your MeetMyPets pre-registration is confirmed</title>',
    '<style>',
    '@media (prefers-color-scheme: dark) {',
    '.mmp-card { background:#1c2033 !important; }',
    '.mmp-headline { color:#FF1744 !important; }',
    '.mmp-body, .mmp-footer, .mmp-stay { color:#F5F5F7 !important; }',
    '.mmp-link { color:#F5F5F7 !important; }',
    '}',
    // Tablet/desktop (Figma "600x900" frame): 1.875x scale of the 320px
    // mobile card. Ignored by clients with no media-query support (Outlook
    // desktop), which safely keep the mobile layout as a fallback.
    '@media (min-width: 481px) {',
    '.mmp-card { max-width:600px !important; }',
    '.mmp-logo-icon { width:193px !important; height:193px !important; }',
    '.mmp-logo-wordmark { width:306px !important; height:53px !important; }',
    '.mmp-headline-cell { padding:22px 30px 0 !important; }',
    '.mmp-headline-text { font-size:30px !important; line-height:30px !important; }',
    '.mmp-badge-cell { padding:52px 60px 0 !important; }',
    '.mmp-badge-icon { width:75px !important; height:75px !important; }',
    '.mmp-crew-text { font-size:37px !important; line-height:37px !important; margin-top:22px !important; }',
    '.mmp-thanks-cell { padding:37px 70px 0 !important; }',
    '.mmp-thanks-text { font-size:24px !important; line-height:24px !important; }',
    '.mmp-callout-cell { padding:52px 70px 0 !important; }',
    '.mmp-callout-inner { border-radius:26px !important; }',
    '.mmp-callout-text { padding:36px 22px !important; font-size:24px !important; line-height:24px !important; }',
    '.mmp-stay-cell { padding:32px 60px 0 !important; }',
    '.mmp-stay-text { font-size:30px !important; line-height:30px !important; padding-right:11px !important; }',
    '.mmp-stay-icon { width:45px !important; height:45px !important; }',
    '.mmp-follow-cell { padding:43px 71px 0 !important; }',
    '.mmp-follow-text { font-size:24px !important; line-height:24px !important; }',
    '.mmp-links-cell { padding:34px 71px 0 !important; }',
    '.mmp-links-text { font-size:24px !important; line-height:24px !important; }',
    '.mmp-closing-cell { padding:52px 60px 75px !important; }',
    '.mmp-closing-text { font-size:30px !important; line-height:30px !important; }',
    '}',
    '</style>',
    '</head>',
    '<body style="margin:0;padding:0;background:#f4f4f5;">',
    // Hidden preview line — what inboxes show next to the subject.
    '<div style="display:none;max-height:0;overflow:hidden;opacity:0;">',
    'You are on the early access list. We will email you the day MeetMyPets goes live.',
    '</div>',
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"',
    ' style="background:#f4f4f5;padding:32px 16px;">',
    '<tr><td align="center">',
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="mmp-card"',
    ' style="max-width:320px;background:#FFFAFA;border-radius:24px;',
    'font-family:\'Nunito Sans\',-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,Helvetica,Arial,sans-serif;">',

    // Logo mark — Figma: icon 103x103 top:56, wordmark 186x31.5 top:160 (i.e.
    // touching the icon's bottom edge). Wordmark is a flattened gradient PNG:
    // email clients cannot render gradient text reliably as live markup.
    '<tr><td align="center" style="padding:56px 24px 0;">',
    '<img src="' + LOGO_URL + '" width="103" height="103" alt="" class="mmp-logo-icon"',
    ' style="display:block;width:103px;height:103px;margin:0 auto;">',
    '<img src="' + WORDMARK_URL + '" width="163" height="28" alt="MeetMyPets" class="mmp-logo-wordmark"',
    ' style="display:block;width:163px;height:28px;margin:1px auto 0;">',
    '</td></tr>',

    // Headline — Figma: Bricolage Grotesque 500 16px/100%, #FF1744, 281x19 box.
    // nowrap matches the fixed-width Figma box, which never wraps this line.
    '<tr><td align="center" class="mmp-headline mmp-headline-cell" style="padding:12px 16px 0;white-space:nowrap;',
    'font-family:\'Bricolage Grotesque\',-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,Helvetica,Arial,sans-serif;',
    'font-size:16px;font-weight:500;line-height:16px;color:#FF1744;">',
    '<span class="mmp-headline-text">You&rsquo;re in &mdash; welcome to MeetMyPets!</span>',
    '</td></tr>',

    // Badge icon (Figma "cil:badge", 40x40) + "officially part of the crew"
    '<tr><td align="center" class="mmp-badge-cell" style="padding:28px 32px 0;">',
    '<img src="' + BADGE_URL + '" width="40" height="40" alt="" class="mmp-badge-icon"',
    ' style="display:block;width:40px;height:40px;margin:0 auto;">',
    '<p class="mmp-crew-text" style="margin:12px 0 0;font-family:\'Bricolage Grotesque\',-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,Helvetica,Arial,sans-serif;',
    'font-size:20px;font-weight:500;line-height:20px;color:#FFC107;">',
    'You&rsquo;re officially part of the MeetMyPets early crew!</p>',
    '</td></tr>',

    // Body copy — Nunito Sans 500 13px/100%, #212738
    '<tr><td align="center" class="mmp-body mmp-thanks-cell" style="padding:20px 38px 0;',
    'font-family:\'Nunito Sans\',-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,Helvetica,Arial,sans-serif;',
    'font-size:13px;font-weight:500;line-height:13px;color:#212738;">',
    '<span class="mmp-thanks-text">Thanks for joining us before launch. Your spot is saved.</span>',
    '</td></tr>',

    // Callout box — Figma "Rectangle 111": 244x112, radius 14, #FFFAFA @ 20%
    '<tr><td class="mmp-callout-cell" style="padding:28px 38px 0;">',
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="mmp-callout mmp-callout-inner"',
    ' style="background:rgba(255,250,250,0.2);border-radius:14px;">',
    '<tr><td align="center" class="mmp-body mmp-callout-text" style="padding:19px 12px;',
    'font-family:\'Nunito Sans\',-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,Helvetica,Arial,sans-serif;',
    'font-size:13px;font-weight:500;line-height:13px;color:#212738;">',
    'No endless emails. Just one important update when we&rsquo;re ready. ',
    'Something exciting is coming for you and your pet.',
    '</td></tr>',
    '</table>',
    '</td></tr>',

    // Stay connected — Bricolage Grotesque 500 16px/100%, #212738 + paw icon
    // (Figma "ci:chat-circle", 24x24, pre-rotated -180 in the exported PNG)
    '<tr><td align="center" class="mmp-stay-cell" style="padding:17px 32px 0;">',
    '<table role="presentation" align="center" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;"><tr>',
    '<td class="mmp-stay mmp-stay-text" style="font-family:\'Bricolage Grotesque\',-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,Helvetica,Arial,sans-serif;',
    'font-size:16px;font-weight:500;line-height:16px;color:#212738;padding-right:6px;">',
    'Stay connected</td>',
    '<td style="width:24px;">',
    '<img src="' + PAW_URL + '" width="24" height="24" alt="" class="mmp-stay-icon"',
    ' style="display:block;width:24px;height:24px;opacity:0.9;">',
    '</td>',
    '</tr></table>',
    '</td></tr>',

    '<tr><td align="center" class="mmp-body mmp-follow-cell" style="padding:23px 38px 0;',
    'font-family:\'Nunito Sans\',-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,Helvetica,Arial,sans-serif;',
    'font-size:13px;font-weight:400;line-height:13px;color:#212738;">',
    '<span class="mmp-follow-text">Follow us for pet stories, tips, fun, and sneak peeks.</span>',
    '</td></tr>',

    '<tr><td align="center" class="mmp-body mmp-links-cell" style="padding:18px 38px 0;',
    'font-family:\'Nunito Sans\',-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,Helvetica,Arial,sans-serif;',
    'font-size:13px;font-weight:400;line-height:13px;color:#212738;">',
    '<span class="mmp-links-text">Website: <a href="' + SITE_URL + '" class="mmp-link" style="color:#212738;">MeetMyPets</a><br>',
    'Instagram: <a href="https://instagram.com/meetmypets.app" class="mmp-link" style="color:#212738;">@meetmypets.app</a></span>',
    '</td></tr>',

    '<tr><td align="center" class="mmp-stay mmp-closing-cell" style="padding:28px 32px 40px;',
    'font-family:\'Nunito Sans\',-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,Helvetica,Arial,sans-serif;',
    'font-size:16px;font-weight:600;line-height:16px;color:#212738;">',
    '<span class="mmp-closing-text">See you and your pet soon,<br>Team MeetMyPets &#10084;&#65039;</span>',
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
    'MeetMyPets',
    '',
    'You\'re in - welcome to MeetMyPets!',
    '',
    'You\'re officially part of the MeetMyPets early crew!',
    '',
    'Thanks for joining us before launch. Your spot is saved.',
    '',
    'No endless emails. Just one important update when we\'re ready.',
    'Something exciting is coming for you and your pet.',
    '',
    'Stay connected',
    '',
    'Follow us for pet stories, tips, fun, and sneak peeks.',
    '',
    'Website: ' + SITE_URL,
    'Instagram: @meetmypets.app (https://instagram.com/meetmypets.app)',
    '',
    'See you and your pet soon,',
    'Team MeetMyPets',
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
