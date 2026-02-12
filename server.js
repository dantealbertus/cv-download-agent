const express = require('express');
const puppeteer = require('puppeteer-core');
const { google } = require('googleapis');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const GOOGLE_DRIVE_FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID;
const OAUTH_CLIENT_ID = process.env.OAUTH_CLIENT_ID;
const OAUTH_CLIENT_SECRET = process.env.OAUTH_CLIENT_SECRET;
const OAUTH_REDIRECT_URI = process.env.OAUTH_REDIRECT_URI;
const BROWSERLESS_API_KEY = process.env.BROWSERLESS_API_KEY;

// Store tokens in memory
let oauth2Client = null;
let tokensStore = null;

// Initialize OAuth2 client
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

// Health check
app.get('/', (req, res) => {
  const isAuthorized = tokensStore !== null;
  const browserlessConfigured = !!BROWSERLESS_API_KEY;
  
  res.json({ 
    status: 'ok', 
    message: 'CV Download Agent v2.3 - Browserless.io',
    version: '2.3.0',
    authorized: isAuthorized,
    browserless: browserlessConfigured,
    authUrl: isAuthorized ? null : `${req.protocol}://${req.get('host')}/auth`
  });
});

// OAuth authorization
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
    console.log('OAuth tokens stored');
    
    res.send(`
      <html>
        <body style="font-family: Arial; padding: 50px; text-align: center;">
          <h1>✅ Authorization Successful!</h1>
          <p>CV Download Agent is connected to Google Drive.</p>
          <a href="/">Back to Home</a>
        </body>
      </html>
    `);
  } catch (error) {
    console.error('OAuth error:', error);
    res.status(500).send('Authorization failed: ' + error.message);
  }
});

// Main download endpoint
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

    // Connect to Browserless
    const browserWSEndpoint = `wss://chrome.browserless.io?token=${BROWSERLESS_API_KEY}`;
    
    console.log('Connecting to Browserless...');
    browser = await puppeteer.connect({
      browserWSEndpoint
    });

    const page = await browser.newPage();

    console.log('Navigating...');
    await page.goto(url, { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    });

    await page.waitForTimeout(2000);

    // Set up PDF download listener
    const pdfPromise = new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Download timeout'));
      }, 60000);

      page.on('response', async (response) => {
        const contentType = response.headers()['content-type'] || '';
        const contentDisposition = response.headers()['content-disposition'] || '';
        
        if (contentType.includes('pdf') || 
            contentType.includes('octet-stream') ||
            contentDisposition.includes('attachment')) {
          
          console.log('PDF detected:', response.url());
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

    // Trigger download
    console.log('Triggering download...');
    try {
      const downloadElement = await page.evaluateHandle(() => {
        const elements = Array.from(document.querySelectorAll('*'));
        return elements.find(el => {
          const text = el.textContent?.toLowerCase() || '';
          return text.includes('download') && 
                 (el.tagName === 'BUTTON' || el.tagName === 'A') &&
                 el.offsetParent !== null;
        });
      });

      const hasElement = await downloadElement.evaluate(el => el !== null);
      if (hasElement) {
        await downloadElement.click();
      } else {
        await page.evaluate(() => {
          const buttons = document.querySelectorAll('button, a');
          const visible = Array.from(buttons).find(b => b.offsetParent !== null);
          if (visible) visible.click();
        });
      }
    } catch (e) {
      console.log('Click error:', e.message);
    }

    const pdfBuffer = await pdfPromise;
    console.log(`PDF downloaded: ${pdfBuffer.length} bytes`);

    // Extract filename
    const urlParams = new URL(url);
    let filename = urlParams.searchParams.get('filename') || 'cv.pdf';
    if (!filename.endsWith('.pdf')) filename += '.pdf';

    // Upload to Drive
    let driveFileUrl = null;
    let driveFileId = null;

    if (GOOGLE_DRIVE_FOLDER_ID) {
      console.log('Uploading to Drive...');
      
      const client = getOAuth2Client();
      const drive = google.drive({ version: 'v3', auth: client });

      const file = await drive.files.create({
        requestBody: {
          name: filename,
          parents: [GOOGLE_DRIVE_FOLDER_ID],
        },
        media: {
          mimeType: 'application/pdf',
          body: require('stream').Readable.from(pdfBuffer),
        },
        fields: 'id, webViewLink',
      });

      driveFileId = file.data.id;
      driveFileUrl = file.data.webViewLink;
      console.log('Uploaded:', driveFileUrl);
    }

    await browser.disconnect();
    browser = null;

    res.json({
      success: true,
      filename: filename,
      filesize: pdfBuffer.length,
      base64: pdfBuffer.toString('base64'),
      mimeType: 'application/pdf',
      googleDrive: driveFileUrl ? {
        fileId: driveFileId,
        viewUrl: driveFileUrl,
        uploaded: true
      } : {
        uploaded: false,
        reason: 'Folder not configured'
      }
    });

  } catch (error) {
    console.error('Error:', error);
    if (browser) {
      try {
        await browser.disconnect();
      } catch (e) {
        console.error('Browser disconnect error:', e);
      }
    }
    res.status(500).json({ 
      error: error.message
    });
  }
});

app.listen(PORT, () => {
  console.log(`CV Agent v2.3 (Browserless) on port ${PORT}`);
  console.log(`Browserless: ${BROWSERLESS_API_KEY ? 'Configured' : 'Missing'}`);
  console.log(`OAuth: ${OAUTH_CLIENT_ID ? 'Configured' : 'Missing'}`);
  console.log(`Tokens: ${tokensStore ? 'Stored' : 'Not stored'}`);
});
