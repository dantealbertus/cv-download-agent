const express = require('express');
const puppeteer = require('puppeteer-core');
const { google } = require('googleapis');
const { Readable } = require('stream');

const app = express();

/* =========================
   MIDDLEWARE
========================= */

// Body parser (belangrijk voor Make)
app.use(express.json({ limit: '10mb' }));

// Debug logging
app.use((req, res, next) => {
  console.log('Incoming request:', req.method, req.url);
  next();
});

/* =========================
   TEST DOWNLOAD ROUTE
========================= */

app.post('/download-cv', async (req, res) => {
  let browser;

  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'URL required' });
    }

    const browserWSEndpoint = `wss://chrome.browserless.io?token=${process.env.BROWSERLESS_API_KEY}`;

    browser = await require('puppeteer-core').connect({
      browserWSEndpoint
    });

    const page = await browser.newPage();

    await page.goto(url, {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    const pageTitle = await page.title();

    await browser.disconnect();

    return res.json({
      success: true,
      pageTitle
    });

  } catch (error) {
    if (browser) {
      try { await browser.disconnect(); } catch {}
    }

    console.error('Goto error:', error);
    return res.status(500).json({ error: error.message });
  }
});

/* =========================
   ENV CONFIG
========================= */

const PORT = process.env.PORT || 3000;
const GOOGLE_DRIVE_FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID;
const OAUTH_CLIENT_ID = process.env.OAUTH_CLIENT_ID;
const OAUTH_CLIENT_SECRET = process.env.OAUTH_CLIENT_SECRET;
const OAUTH_REDIRECT_URI = process.env.OAUTH_REDIRECT_URI;
const BROWSERLESS_API_KEY = process.env.BROWSERLESS_API_KEY;

/* =========================
   OAUTH SETUP
========================= */

let oauth2Client = null;
let tokensStore = null;

function getOAuth2Client() {
  if (!oauth2Client) {
    oauth2Client = new google.auth.OAuth2(
      OAUTH_CLIENT_ID,
      OAUTH_CLIENT_SECRET,
      OAUTH_REDIRECT_URI
    );

    if (tokensStore) {
      oauth2Client.setCredentials(tokensStore);
    }
  }
  return oauth2Client;
}

/* =========================
   ROUTES
========================= */

// Health check
app.get('/', (req, res) => {
  const isAuthorized = tokensStore !== null;
  const browserlessConfigured = !!BROWSERLESS_API_KEY;

  res.json({
    status: 'ok',
    version: '2.3.0',
    authorized: isAuthorized,
    browserless: browserlessConfigured,
    authUrl: isAuthorized ? null : `${req.protocol}://${req.get('host')}/auth`
  });
});

// OAuth start
app.get('/auth', (req, res) => {
  const client = getOAuth2Client();

  const authUrl = client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/drive.file'],
    prompt: 'consent'
  });

  res.redirect(authUrl);
});

// OAuth callback
app.get('/oauth/callback', async (req, res) => {
  const { code } = req.query;

  if (!code) {
    return res.status(400).send('No authorization code');
  }

  try {
    const client = getOAuth2Client();
    const { tokens } = await client.getToken(code);

    tokensStore = tokens;
    client.setCredentials(tokens);

    res.send('Authorization successful. You can close this window.');
  } catch (error) {
    console.error('OAuth error:', error);
    res.status(500).send('Authorization failed: ' + error.message);
  }
});

// Debug endpoint
app.post('/ping', (req, res) => {
  res.json({ ok: true, body: req.body });
});

/* =========================
   MAIN DOWNLOAD ENDPOINT
========================= */

app.post('/download-cv', async (req, res) => {
  let browser = null;

  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'URL required' });
    }

    if (!tokensStore) {
      return res.status(401).json({
        error: 'Not authorized. Visit /auth',
        authUrl: `${req.protocol}://${req.get('host')}/auth`
      });
    }

    if (!BROWSERLESS_API_KEY) {
      return res.status(500).json({
        error: 'Browserless API key not configured'
      });
    }

    console.log('Download request:', url);

    const browserWSEndpoint = `wss://chrome.browserless.io?token=${BROWSERLESS_API_KEY}`;

    browser = await puppeteer.connect({
      browserWSEndpoint
    });

    const page = await browser.newPage();

    await page.goto(url, {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    await page.waitForTimeout(2000);

    const pdfPromise = new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Download timeout'));
      }, 60000);

      page.on('response', async (response) => {
        const contentType = response.headers()['content-type'] || '';
        const contentDisposition = response.headers()['content-disposition'] || '';

        if (
          contentType.includes('pdf') ||
          contentType.includes('octet-stream') ||
          contentDisposition.includes('attachment')
        ) {
          clearTimeout(timeout);
          try {
            const buffer = await response.buffer();
            resolve(buffer);
          } catch (err) {
            reject(err);
          }
        }
      });
    });

    // Try clicking download button
    try {
      await page.evaluate(() => {
        const elements = Array.from(document.querySelectorAll('button, a'));
        const target = elements.find(el =>
          el.textContent?.toLowerCase().includes('download') &&
          el.offsetParent !== null
        );
        if (target) target.click();
      });
    } catch (e) {
      console.log('Click attempt failed:', e.message);
    }

    const pdfBuffer = await pdfPromise;

    const parsedUrl = new URL(url);
    let filename = parsedUrl.searchParams.get('filename') || 'cv.pdf';
    if (!filename.endsWith('.pdf')) filename += '.pdf';

    let driveFileUrl = null;
    let driveFileId = null;

    if (GOOGLE_DRIVE_FOLDER_ID) {
      const client = getOAuth2Client();
      const drive = google.drive({ version: 'v3', auth: client });

      const file = await drive.files.create({
        requestBody: {
          name: filename,
          parents: [GOOGLE_DRIVE_FOLDER_ID],
        },
        media: {
          mimeType: 'application/pdf',
          body: Readable.from(pdfBuffer),
        },
        fields: 'id, webViewLink',
      });

      driveFileId = file.data.id;
      driveFileUrl = file.data.webViewLink;
    }

    await browser.disconnect();

    res.json({
      success: true,
      filename,
      filesize: pdfBuffer.length,
      base64: pdfBuffer.toString('base64'),
      mimeType: 'application/pdf',
      googleDrive: driveFileUrl
        ? {
            fileId: driveFileId,
            viewUrl: driveFileUrl,
            uploaded: true
          }
        : {
            uploaded: false,
            reason: 'Folder not configured'
          }
    });

  } catch (error) {
    console.error('Download error:', error);

    if (browser) {
      try {
        await browser.disconnect();
      } catch {}
    }

    res.status(500).json({
      error: error.message
    });
  }
});

/* =========================
   START SERVER
========================= */

app.listen(PORT, () => {
  console.log(`CV Agent running on port ${PORT}`);
});
