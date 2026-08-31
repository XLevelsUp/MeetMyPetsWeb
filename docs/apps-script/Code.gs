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
 * strip <style> blocks and gradients on live text, so the dog mark icon
 * from Figma is shipped as a static asset instead of markup.
 * Source: apps/marketing/public/brand-mark.png, deployed at this URL.
 * Figma spec ("MeetMyPet Icon 9"): 103x103, top:56 left:145 on the 320-wide
 * card. Table centering (align="center") reproduces the visual position;
 * the raw left offset is not usable directly since it is relative to the
 * icon's own bounding box, not the table cell.
 */
const LOGO_URL = SITE_URL + '/brand-mark.png';

/** Figma "cil:badge" icon, exported as-is. Source: apps/marketing/public/cil_badge.png. */
const BADGE_URL = SITE_URL + '/cil_badge.png';

/** Figma "ci:chat-circle" paw icon, exported pre-rotated. Source: apps/marketing/public/ci_chat-circle.png. */
const PAW_URL = SITE_URL + '/ci_chat-circle.png';

/**
 * Gradient "MeetMyPets" wordmark, flattened to PNG, for the header logo.
 * Live gradient text (background-clip:text) and custom webfonts are both
 * blocked by Gmail/Outlook, which strip <link> stylesheets and ignore
 * WebKit-only properties, rendering only the plain-text fallback. A PNG
 * renders identically everywhere. Source: apps/marketing/public/email-wordmark.png.
 */
const WORDMARK_URL = SITE_URL + '/email-wordmark.png';

/** Dark-text "MeetMyPets" wordmark, for the light-background footer shown in
 * dark mode. Source: apps/marketing/public/MeetMyPets (1).png. */
const FOOTER_WORDMARK_DARK_TEXT_URL = SITE_URL + '/MeetMyPets%20(1).png';

/** Light-text "MeetMyPets" wordmark, for the brand-color footer shown in
 * light mode. Source: apps/marketing/public/MeetMyPets (2).png. */
const FOOTER_WORDMARK_LIGHT_TEXT_URL = SITE_URL + '/MeetMyPets%20(2).png';

/**
 * Email body — matches the Figma "Waitlist mail mobile" frame (light card,
 * gradient wordmark, dark card variant from the design's night-mode screenshot).
 *
 * Table-based layout with inline styles on purpose — Outlook renders with
 * Word's engine, which ignores flexbox, grid and <style> blocks. This is
 * ugly HTML that displays correctly, rather than clean HTML that does not.
 *
 * Bricolage Grotesque and Nunito Sans are Figma's fonts, loaded here via
 * Google Fonts for clients that support @import/<link> (Apple Mail, most
 * webmail). Everywhere else (Outlook, some Gmail contexts) falls back to the
 * system stack — expected and harmless; the type scale and color survive
 * either way, only the face changes. The wordmark itself (Love Ya Like A
 * Sister) is shipped as a PNG rather than live text — see WORDMARK_URL.
 *
 * Dark mode is CSS-only (prefers-color-scheme): Gmail/Outlook ignore the
 * media query and always render the light card, which is a safe default,
 * not a broken one. Apple/iOS/macOS Mail honor it and flip to the dark card.
 *
 * Responsive tiers: mobile 0-767px (360x763, footer hidden), tablet
 * 768-1023px (600x900, footer stays hidden), desktop >=1024px (600x1200,
 * footer becomes visible).
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

    '/* 0. THEME TOKENS — light is the default (root), dark overrides via media query */',
    ':root {',
    '--page-bg: #E9E9E9;',
    '--card-bg: #FFFFFF;',
    '--heading-color: #FF3153;',
    '--message-text: #333333;',
    '--user-email-color: #FFC107;',
    '--heart-color: #FF3153;',
    '--button-bg: #FFB800;',
    '--button-text: #111111;',
    '--validity-text: #333333;',
    '--sign-off-text: #222222;',
    '--footer-bg: #FF3153;',
    '--footer-sub-text: #FFFFFF;',
    '--footer-bottom-bg: #FFFFFF;',
    '--card-shadow: 0 10px 30px rgba(0, 0, 0, 0.08);',
    '}',

    '@media (prefers-color-scheme: dark) {',
    ':root {',
    '--page-bg: #14171F;',
    '--card-bg: #252C3D;',
    '--heading-color: #FF3153;',
    '--message-text: #E8E8E8;',
    '--user-email-color: #FFC107;',
    '--heart-color: #FF3153;',
    '--button-bg: #FFB800;',
    '--button-text: #111111;',
    '--validity-text: #E8E8E8;',
    '--sign-off-text: #FFFFFF;',
    '--footer-bg: #F5F2EF;',
    '--footer-sub-text: #667086;',
    '--footer-bottom-bg: #252C3D;',
    '--card-shadow: none;',
    '}',
    '}',

    '/* 1. PAGE / LAYOUT */',
    'html, body { height:100%; margin:0; padding:0; background:var(--page-bg, #E9E9E9); }',
    '.mmp-preheader { display:none; max-height:0; overflow:hidden; opacity:0; line-height:1px; }',
    '.mmp-viewport { width:100%; max-width:400px; margin:0 auto; display:flex; align-items:center; justify-content:center; min-height:100vh; }',
    '.mmp-outer { width:100%; box-sizing:border-box; background:var(--page-bg, #E9E9E9); padding:32px 16px; }',

    '/* 2. CARD CONTAINER — mobile: 0-767px, 360x763 */',
    '.mmp-card { width:100%; max-width:360px; min-height:763px; background:var(--card-bg, #FFFFFF); border-radius:24px; box-shadow:var(--card-shadow, 0 10px 30px rgba(0, 0, 0, 0.08)); font-family:\'Nunito Sans\',-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,Helvetica,Arial,sans-serif; }',

    '/* FOOTER hidden on mobile and tablet — desktop-only (see 1024px tier) */',
    '.mmp-footer-box, .mmp-footer-spacer { display:none; }',

    '/* 3. LOGO */',
    '.mmp-logo-cell { padding:56px 24px 0; }',
    '.mmp-logo-icon { display:block; width:103px; height:103px; margin:0 auto; }',
    '.mmp-logo-wordmark { display:block; width:163px; height:28px; margin:8px auto 0; }',

    '/* 4. HEADLINE */',
    '.mmp-headline-cell { padding:12px 16px 0; }',
    '.mmp-headline { font-family:\'Bricolage Grotesque\',-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,Helvetica,Arial,sans-serif; font-size:16px; font-weight:500; line-height:100%; color:var(--heading-color, #FF3153); }',
    '.mmp-headline-text { display:block; font-family:\'Bricolage Grotesque\',-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,Helvetica,Arial,sans-serif; font-size:20px; font-weight:500; font-style:normal; line-height:100%; letter-spacing:0; text-align:center; }',

    '/* 5. BADGE + EARLY CREW MESSAGE */',
    '.mmp-badge-cell { padding:28px 32px 0; }',
    '.mmp-badge-icon { display:block; width:40px; height:40px; margin:0 auto; }',
    '.mmp-crew-text { margin:12px 0 0; font-family:\'Bricolage Grotesque\',-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,Helvetica,Arial,sans-serif; font-size:20px; font-weight:500; line-height:100%; color:var(--user-email-color, #FFC107); }',

    '/* 6. BODY TEXT (shared) */',
    '.mmp-body { font-family:\'Nunito Sans\',-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,Helvetica,Arial,sans-serif; font-size:13px; font-weight:500; line-height:13px; color:var(--message-text, #333333); }',
    '.mmp-thanks-cell { padding:20px 38px 0; }',

    '/* 7. CALLOUT BOX */',
    '.mmp-callout-cell { padding:28px 38px 0; }',
    '.mmp-callout-inner {',
    'position: relative;',
    'background: #FF1744;',
    'border-radius:14px;',
    '}',
    '@media (prefers-color-scheme: dark) {',
    '.mmp-callout-inner { background: rgba(102, 112, 134, 0.5) !important; }',
    '}',
    // Gmail (incl. mobile apps) does not honor prefers-color-scheme; it
    // stamps [data-ogsc] on the document root when its own dark mode is on.
    // Covered both ways since Gmail's exact target element is undocumented.
    '[data-ogsc] .mmp-callout-inner, .mmp-callout-inner[data-ogsc] { background: rgba(102, 112, 134, 0.5) !important; }',
    '.mmp-callout-text { padding:19px 12px; font-family:\'Nunito Sans\',-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,Helvetica,Arial,sans-serif; font-weight:500; font-style:normal; font-size:16px; line-height:100%; letter-spacing:0; text-align:center; color:#FFFAFA; position: relative; z-index: 1; }',

    '/* 8. STAY CONNECTED ROW */',
    '.mmp-stay-cell { padding:17px 32px 0; }',
    '.mmp-stay-table { margin:0 auto; }',
    '.mmp-stay { font-family:\'Bricolage Grotesque\',-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,Helvetica,Arial,sans-serif; font-size:16px; font-weight:500; line-height:16px; color:var(--sign-off-text, #222222); }',
    '.mmp-stay-text { padding-right:6px; }',
    '.mmp-stay-icon-cell { width:24px; }',
    '.mmp-stay-icon { display:block; width:24px; height:24px; opacity:0.9; }',

    '/* 9. FOLLOW / SOCIAL LINKS */',
    '.mmp-follow-cell { padding:23px 38px 0; font-weight:400; }',
    '.mmp-links-cell { padding:18px 38px 0; font-weight:400; }',
    '.mmp-link { color:var(--message-text, #333333); }',
    '.mmp-follow-text, .mmp-links-text { font-size:13px; line-height:100%; }',

    '/* 10. CLOSING SIGN-OFF */',
    '.mmp-closing-cell { padding:28px 32px 40px; font-family:\'Nunito Sans\',-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,Helvetica,Arial,sans-serif; font-size:16px; font-weight:600; font-style:semi-bold; line-height:100%; color:var(--sign-off-text, #222222); }',
    '.mmp-closing-text { font-size:16px; line-height:100%; }',

    '/* 11. FOOTER */',
    '.mmp-footer-box { background:var(--footer-bg, #FF3153); padding:28px 32px; box-sizing:border-box; }',
    '.mmp-footer-wordmark-light { display:block; width:145px; height:27px; margin:0 auto; }',
    '.mmp-footer-wordmark-dark { display:none; width:145px; height:27px; margin:0 auto; }',
    '@media (prefers-color-scheme: dark) {',
    '.mmp-footer-wordmark-light { display:none !important; }',
    '.mmp-footer-wordmark-dark { display:block !important; }',
    '}',
    '.mmp-footer-links { display:block; margin:19px auto 0; color:var(--footer-sub-text, #FFFFFF); font-family:\'Nunito Sans\',-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,Helvetica,Arial,sans-serif; font-size:12px; font-weight:400; line-height:100%; text-align:center; }',
    '.mmp-footer-notice { display:block; max-width:374px; margin:10px auto 0; color:var(--footer-sub-text, #FFFFFF); font-family:\'Nunito Sans\',-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,Helvetica,Arial,sans-serif; font-size:11px; font-weight:400; line-height:140%; text-align:center; padding:0 8px; box-sizing:border-box; }',
    '.mmp-footer-spacer { background:var(--footer-bottom-bg, #FFFFFF); border-bottom-left-radius:24px; border-bottom-right-radius:24px; overflow:hidden; }',

    '/* 12. TABLET (768px - 1023px): 600x900, footer stays hidden */',
    '@media (min-width: 768px) {',
    '.mmp-viewport { max-width:632px !important; align-items:flex-start; }',
    '.mmp-outer { padding:62px 16px 32px !important; }',
    '.mmp-card { width:100% !important; max-width:600px !important; min-height:900px !important; }',
    '.mmp-logo-icon { width:193px !important; height:193px !important; max-width:100% !important; }',
    '.mmp-logo-wordmark { width:183.0188px !important; height:33.6248px !important; max-width:100% !important; margin-top:12px !important; }',
    '.mmp-headline-cell { padding:22px 30px 0 !important; }',
    '.mmp-badge-cell { padding:52px 60px 0 !important; }',
    '.mmp-badge-icon { width:56px !important; height:56px !important; }',
    '.mmp-crew-text { font-family:\'Bricolage Grotesque\',-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,Helvetica,Arial,sans-serif !important; font-size:28px !important; font-weight:500 !important; font-style:normal !important; line-height:100% !important; letter-spacing:0 !important; text-align:center !important; margin-top:22px !important; }',
    '.mmp-thanks-cell { padding:37px 70px 0 !important; }',
    '.mmp-thanks-text { font-family:\'Nunito Sans\',-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,Helvetica,Arial,sans-serif !important; font-size:16px !important; font-weight:500 !important; font-style:normal !important; line-height:100% !important; letter-spacing:0 !important; text-align:center !important; }',
    '.mmp-callout-cell { padding:52px 36px 0 !important; }',
    '.mmp-callout-inner { width:100% !important; max-width:100% !important; min-height:112px !important; border-radius:14px !important; }',
    '.mmp-callout-text { padding:36px 22px !important; font-family:\'Nunito Sans\',-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,Helvetica,Arial,sans-serif !important; font-size:16px !important; font-weight:500 !important; font-style:normal !important; line-height:100% !important; letter-spacing:0 !important; text-align:center !important; }',
    '.mmp-stay-cell { padding:32px 60px 0 !important; }',
    '.mmp-stay-text { font-family:\'Bricolage Grotesque\',-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,Helvetica,Arial,sans-serif !important; font-size:20px !important; font-weight:500 !important; font-style:normal !important; line-height:100% !important; letter-spacing:0 !important; text-align:center !important; padding-right:11px !important; }',
    '.mmp-stay-icon { width:31px !important; height:31px !important; opacity:0.9 !important; }',
    '.mmp-follow-cell { padding:43px 71px 0 !important; }',
    '.mmp-follow-text { font-family:\'Nunito Sans\',-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,Helvetica,Arial,sans-serif !important; font-size:16px !important; font-weight:400 !important; font-style:normal !important; line-height:100% !important; letter-spacing:0 !important; text-align:center !important; }',
    '.mmp-links-cell { padding:34px 71px 0 !important; }',
    '.mmp-links-text { font-family:\'Nunito Sans\',-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,Helvetica,Arial,sans-serif !important; font-size:16px !important; font-weight:400 !important; font-style:normal !important; line-height:100% !important; letter-spacing:0 !important; text-align:center !important; }',
    '.mmp-links-text .mmp-link { text-decoration-line:underline !important; text-decoration-style:solid !important; text-decoration-thickness:0% !important; text-decoration-skip-ink:auto !important; }',
    '.mmp-closing-cell { padding:52px 60px 75px !important; }',
    '.mmp-closing-text { font-family:\'Nunito Sans\',-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,Helvetica,Arial,sans-serif !important; font-size:20px !important; font-weight:600 !important; font-style:semi-bold !important; line-height:100% !important; letter-spacing:0 !important; text-align:center !important; }',
    '}',

    '/* 13. DESKTOP (>=1024px): 600x1200, footer becomes visible */',
    '@media (min-width: 1024px) {',
    '.mmp-card { width:600px !important; max-width:600px !important; min-height:1200px !important; }',
    '.mmp-logo-cell { padding-top:16px !important; }',
    '.mmp-logo-icon { width:109.8894px !important; height:109.8894px !important; }',
    '.mmp-logo-wordmark { width:183.0188px !important; height:33.6248px !important; }',
    '.mmp-headline-cell { padding:24px 36px 0 !important; }',
    '.mmp-headline-text { width:528px !important; max-width:100% !important; font-size:24px !important; line-height:100% !important; }',
    '.mmp-badge-cell { padding:8px 36px 0 !important; }',
    '.mmp-badge-icon { width:56px !important; height:56px !important; }',
    '.mmp-thanks-cell { padding:26px 36px 0 !important; }',
    '.mmp-thanks-text { width:528px !important; max-width:100% !important; font-family:\'Nunito Sans\',-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,Helvetica,Arial,sans-serif !important; font-size:16px !important; font-weight:500 !important; font-style:normal !important; line-height:100% !important; letter-spacing:0 !important; text-align:center !important; }',
    '.mmp-callout-cell { padding:36px 36px 0 !important; }',
    '.mmp-callout-inner { width:528px !important; max-width:100% !important; height:112px !important; min-height:112px !important; border-radius:14px !important; }',
    '.mmp-stay-cell { padding:22px 60px 0 !important; }',
    '.mmp-follow-cell { padding:30px 71px 0 !important; }',
    '.mmp-links-cell { padding:24px 71px 0 !important; }',
    '.mmp-closing-cell { padding:36px 60px 52px !important; }',
    '.mmp-footer-box, .mmp-footer-spacer { display:block !important; }',
    '.mmp-footer-box { width:600px !important; max-width:100% !important; height:auto !important; }',
    '.mmp-footer-spacer { width:600px !important; max-width:100% !important; height:24px !important; }',
    '}',

    '</style>',

    '</head>',

    '<body>',
    '<div class="mmp-preheader">You are on the early access list. We will email you the day MeetMyPets goes live.</div>',
    '<div class="mmp-viewport">',
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="mmp-outer">',
    '<tr>',
    '<td align="center">',
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="mmp-card">',

    '<!-- 3. LOGO -->',
    '<tr>',
    '<td align="center" class="mmp-logo-cell">',
    '<a href="' + SITE_URL + '" target="_blank" style="text-decoration:none;">',
    '<img src="' + LOGO_URL + '" width="103" height="103" alt="" class="mmp-logo-icon" style="border:0;">',
    '<img src="' + WORDMARK_URL + '" width="163" height="28" alt="MeetMyPets" class="mmp-logo-wordmark" style="border:0;">',
    '</a>',
    '</td>',
    '</tr>',

    '<!-- 4. HEADLINE -->',
    '<tr>',
    '<td align="center" class="mmp-headline mmp-headline-cell">',
    '<span class="mmp-headline-text">You&rsquo;re in &mdash; welcome to MeetMyPets!</span>',
    '</td>',
    '</tr>',

    '<!-- 5. BADGE + EARLY CREW MESSAGE -->',
    '<tr>',
    '<td align="center" class="mmp-badge-cell">',
    '<img src="' + BADGE_URL + '" width="40" height="40" alt="" class="mmp-badge-icon">',
    '<p class="mmp-crew-text">You&rsquo;re officially part of the MeetMyPets early crew!</p>',
    '</td>',
    '</tr>',

    '<!-- 6. THANKS LINE -->',
    '<tr>',
    '<td align="center" class="mmp-body mmp-thanks-cell">',
    '<span class="mmp-thanks-text">Thanks for joining us before launch. Your spot is saved.</span>',
    '</td>',
    '</tr>',

    '<!-- 7. CALLOUT BOX -->',
    '<tr>',
    '<td class="mmp-callout-cell">',
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="mmp-callout mmp-callout-inner">',
    '<tr>',
    '<td align="center" class="mmp-body mmp-callout-text">',
    'No endless emails. Just one important update when we&rsquo;re ready. Something exciting is coming for you and your pet.',
    '</td>',
    '</tr>',
    '</table>',
    '</td>',
    '</tr>',

    '<!-- 8. STAY CONNECTED ROW -->',
    '<tr>',
    '<td align="center" class="mmp-stay-cell">',
    '<table role="presentation" align="center" cellpadding="0" cellspacing="0" border="0" class="mmp-stay-table">',
    '<tr>',
    '<td class="mmp-stay mmp-stay-text">Stay connected</td>',
    '<td class="mmp-stay-icon-cell"><img src="' + PAW_URL + '" width="24" height="24" alt="" class="mmp-stay-icon"></td>',
    '</tr>',
    '</table>',
    '</td>',
    '</tr>',

    '<!-- 9. FOLLOW / SOCIAL LINKS -->',
    '<tr>',
    '<td align="center" class="mmp-body mmp-follow-cell">',
    '<span class="mmp-follow-text">Follow us for pet stories, tips, fun, and sneak peeks.</span>',
    '</td>',
    '</tr>',
    '<tr>',
    '<td align="center" class="mmp-body mmp-links-cell">',
    '<span class="mmp-links-text">Website: <a href="' + SITE_URL + '" class="mmp-link">MeetMyPets</a><br>' +
      'Instagram: <a href="https://instagram.com/meetmypets.app" class="mmp-link">@meetmypets.app</a></span>',
    '</td>',
    '</tr>',

    '<!-- 10. CLOSING SIGN-OFF -->',
    '<tr>',
    '<td align="center" class="mmp-stay mmp-closing-cell">',
    '<span class="mmp-closing-text">See you and your pet soon,<br>Team MeetMyPets &#10084;&#65039;</span>',
    '</td>',
    '</tr>',

    '<!-- FOOTER (desktop-only; see 1024px tier) -->',
    '<tr>',
    '<td align="center" valign="top" class="mmp-footer-box">',
    '<img src="' + FOOTER_WORDMARK_LIGHT_TEXT_URL + '" width="145" height="27" alt="MeetMyPets" class="mmp-footer-wordmark-light" style="border:0;">',
    '<img src="' + FOOTER_WORDMARK_DARK_TEXT_URL + '" width="145" height="27" alt="MeetMyPets" class="mmp-footer-wordmark-dark" style="border:0;">',
    '<span class="mmp-footer-links">Privacy &bull; Terms &bull; Support</span>',
    '<span class="mmp-footer-notice">You received this email because an account was created with this address.</span>',
    '</td>',
    '</tr>',
    '<tr>',
    '<td class="mmp-footer-spacer" aria-hidden="true">&nbsp;</td>',
    '</tr>',

    '</table>',
    '</td>',
    '</tr>',
    '</table>',
    '</div>',
    '</body>',
    '</html>',
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
    '',
    '---',
    'Privacy - Terms - Support',
    'You received this email because an account was created with this address.',
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
