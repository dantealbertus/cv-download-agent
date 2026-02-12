const express = require('express');
const Anthropic = require('@anthropic-ai/sdk');
const axios = require('axios');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

// Health check endpoint
app.get('/', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'CV Download Agent is running',
    version: '1.0.0'
  });
});

// Main download endpoint
app.post('/download-cv', async (req, res) => {
  try {
    const { url } = req.body;
    
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    console.log('Received download request for:', url);

    const anthropic = new Anthropic({
      apiKey: ANTHROPIC_API_KEY,
    });

    // Use Claude to download the file via bash
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      tools: [
        {
          type: 'bash_20250124',
          name: 'bash',
        },
      ],
      messages: [
        {
          role: 'user',
          content: `Download the PDF file from this URL: ${url}
          
          Steps:
          1. Use curl -L to download the file (follow redirects)
          2. Save it as /tmp/cv.pdf
          3. Convert the file to base64 using: base64 /tmp/cv.pdf
          4. Return the base64 string
          
          Important: The URL might redirect to the actual file, so use -L flag with curl.`
        }
      ],
    });

    console.log('Claude response:', JSON.stringify(message, null, 2));

    // Extract the base64 content from Claude's response
    let base64Content = null;
    
    for (const block of message.content) {
      if (block.type === 'text') {
        // Look for base64 content in the text
        const text = block.text;
        // Base64 is typically very long, so we look for that pattern
        const base64Match = text.match(/[A-Za-z0-9+/=]{100,}/);
        if (base64Match) {
          base64Content = base64Match[0];
          break;
        }
      }
    }

    if (!base64Content) {
      return res.status(500).json({ 
        error: 'Failed to extract file content',
        claudeResponse: message.content
      });
    }

    // Extract filename from URL if available
    const urlParams = new URL(url);
    const filename = urlParams.searchParams.get('filename') || 'cv.pdf';

    res.json({
      success: true,
      filename: filename,
      filesize: base64Content.length,
      base64: base64Content,
      mimeType: 'application/pdf'
    });

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

app.listen(PORT, () => {
  console.log(`CV Download Agent listening on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});
