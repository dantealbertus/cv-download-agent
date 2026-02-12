const express = require('express');
const puppeteer = require('puppeteer');
const { google } = require('googleapis');
const fs = require('fs').promises;
const path = require('path');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const GOOGLE_DRIVE_FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID;
const OAUTH_CLIENT_ID = process.env.OAUTH_CLIENT_ID;
const OAUTH_CLIENT_SECRET = process.env.OAUTH_CLIENT_SECRET;
const OAUTH_REDIRECT_URI = process.env.OAUTH_REDIRECT_URI;

// Store tokens in memory (in production, use a database)
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

    // If we have stored tokens, set them
    if (tokensStore) {
      oauth2Client.setCredentials(tokensStore);
    }
  }
  return oauth2Client;
}

// Health check endpoint
app.get('/', (req, res) => {
  const isAuthorized = tokensStore !== null;
  res.json({ 
    status: 'ok', 
    message: 'CV Download Agent v2.1 with OAuth',
    version: '2.1.0',
    features: ['Headless Browser', 'Auto-click Download', 'OAuth Google Drive Upload'],
    authorized: isAuthorized,
    authUrl: isAuthorized ? null : `${req.protocol}://${req.get('host')}/auth`
  });
});

// OAuth authorization URL
app.get('/auth', (req, res) => {
  const client = getOAuth2Client();
  
  const authUrl = client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/drive.file'],
    prompt: 'consent' // Force to get refresh token
  });

  res.redirect(authUrl);
});

// OAuth callback
app.get('/oauth/callback', async (req, res) => {
  const { code } = req.query;
  
  if (!code) {
    return res.status(400).send('No authorization code provided');
  }

  try {
    const client = getOAuth2Client();
    const { tokens } = await client.getToken(code);
    
    // Store tokens
    tokensStore = tokens;
    client.setCredentials(tokens);

    console.log('OAuth tokens received and stored');
    
    res.send(`
      <html>
        <body style="font-family: Arial; padding: 50px; text-align: center;">
          <h1>✅ Authorization Successful!</h1>
          <p>CV Download Agent is now connected to your Google Drive.</p>
          <p>You can close this window and start using the agent.</p>
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
      return res.status(400).json({ error: 'URL is required' });
    }

    // Check if authorized
    if (!tokensStore) {
      return res.status(401).json({ 
        error: 'Not authorized. Please visit /auth to authorize Google Drive access.',
        authUrl: `${req.protocol}://${req.get('host')}/auth`
      });
    }

    console.log('Received download request for:', url);

    // Launch headless browser
    console.log('Launching browser...');
    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
      ],
    });

    const page = await browser.newPage();

    console.log('Navigating to URL...');
    await page.goto(url, { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    });

    console.log('Page loaded, waiting for download button...');
    
    // Wait a bit for any dynamic content to load
    await page.waitForTimeout(2000);

    // Try to find and click download button
    let downloadStarted = false;
    
    // Set up response listener BEFORE clicking
    const pdfPromise = new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Download timeout - no PDF received'));
      }, 60000);

      page.on('response', async (response) => {
        const contentType = response.headers()['content-type'] || '';
        const contentDisposition = response.headers()['content-disposition'] || '';
        
        if (contentType.includes('pdf') || 
            contentType.includes('application/octet-stream') ||
            contentDisposition.includes('attachment')) {
          
          console.log('PDF response detected:', response.url());
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

    // Try multiple strategies to trigger download
    console.log('Attempting to trigger download...');
    
    try {
      // Strategy 1: Look for elements with "download" text
      const downloadElement = await page.evaluateHandle(() => {
        const elements = Array.from(document.querySelectorAll('*'));
        return elements.find(el => {
          const text = el.textContent?.toLowerCase() || '';
          return text.includes('download') && 
                 (el.tagName === 'BUTTON' || el.tagName === 'A') &&
                 el.offsetParent !== null; // visible
        });
      });

      const hasElement = await downloadElement.evaluate(el => el !== null && el !== undefined);
      
      if (hasElement) {
        console.log('Found download element, clicking...');
        await downloadElement.click();
        downloadStarted = true;
      }
    } catch (e) {
      console.log('Strategy 1 failed, trying strategy 2...');
    }

    // Strategy 2: Click any visible button or link
    if (!downloadStarted) {
      try {
        await page.evaluate(() => {
          const buttons = Array.from(document.querySelectorAll('button, a, [role="button"]'));
          const visibleButton = buttons.find(b => b.offsetParent !== null);
          if (visibleButton) visibleButton.click();
        });
        downloadStarted = true;
        console.log('Clicked visible button/link');
      } catch (e) {
        console.log('Strategy 2 failed');
      }
    }

    console.log('Waiting for PDF download...');
    const pdfBuffer = await pdfPromise;

    console.log(`PDF downloaded, size: ${pdfBuffer.length} bytes`);

    // Extract filename from URL
    const urlParams = new URL(url);
    let filename = urlParams.searchParams.get('filename') || 'cv.pdf';
    if (!filename.endsWith('.pdf')) {
      filename += '.pdf';
    }

    // Upload to Google Drive
    let driveFileUrl = null;
    let driveFileId = null;

    if (GOOGLE_DRIVE_FOLDER_ID) {
      console.log('Uploading to Google Drive...');
      
      const client = getOAuth2Client();
      const drive = google.drive({ version: 'v3', auth: client });

      const fileMetadata = {
        name: filename,
        parents: [GOOGLE_DRIVE_FOLDER_ID],
      };

      const media = {
        mimeType: 'application/pdf',
        body: require('stream').Readable.from(pdfBuffer),
      };

      const file = await drive.files.create({
        requestBody: fileMetadata,
        media: media,
        fields: 'id, webViewLink, webContentLink',
      });

      driveFileId = file.data.id;
      driveFileUrl = file.data.webViewLink;

      console.log('Uploaded to Google Drive:', driveFileUrl);
    }

    // Close browser
    await browser.close();
    browser = null;

    // Return response
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
        reason: 'Google Drive folder not configured'
      }
    });

  } catch (error) {
    console.error('Error:', error);
    
    if (browser) {
      await browser.close();
    }

    res.status(500).json({ 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

app.listen(PORT, () => {
  console.log(`CV Download Agent v2.1 (OAuth) listening on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`OAuth configured: ${OAUTH_CLIENT_ID ? 'Yes' : 'No'}`);
  console.log(`Tokens stored: ${tokensStore ? 'Yes' : 'No'}`);
  console.log(`\nTo authorize: Visit /auth endpoint`);
});
