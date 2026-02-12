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

    // Use Claude with bash tool to download the file
    let messages = [
      {
        role: 'user',
        content: `Download this PDF file and convert it to base64:

curl -L "${url}" -o /tmp/cv.pdf && base64 /tmp/cv.pdf

Execute the command above. I need the base64 output.`
      }
    ];

    let base64Content = null;
    let conversationMessages = [...messages];

    // Agentic loop: continue until we get the result
    for (let i = 0; i < 5; i++) {
      const message = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        tools: [
          {
            type: 'bash_20250124',
            name: 'bash',
          },
        ],
        messages: conversationMessages,
      });

      console.log(`Turn ${i + 1}:`, JSON.stringify(message, null, 2));

      // Check if Claude used the bash tool
      let toolUseBlock = null;
      let textContent = '';

      for (const block of message.content) {
        if (block.type === 'tool_use' && block.name === 'bash') {
          toolUseBlock = block;
        }
        if (block.type === 'text') {
          textContent += block.text;
        }
      }

      if (toolUseBlock) {
        // Simulate tool execution (in production, Railway would execute this)
        console.log('Executing bash command:', toolUseBlock.input.command);
        
        // For now, let's try a direct download approach instead
        try {
          const response = await axios.get(url, {
            responseType: 'arraybuffer',
            maxRedirects: 5,
            timeout: 30000,
          });
          
          base64Content = Buffer.from(response.data).toString('base64');
          break;
        } catch (downloadError) {
          console.error('Direct download failed:', downloadError.message);
          return res.status(500).json({ 
            error: 'Failed to download file directly',
            details: downloadError.message
          });
        }
      }

      // Check for base64 in text content
      const lines = textContent.split('\n');
      for (const line of lines) {
        if (line.length > 1000 && /^[A-Za-z0-9+/=]+$/.test(line.trim())) {
          base64Content = line.trim();
          break;
        }
      }

      if (base64Content) break;

      // If we're done but no result, stop
      if (message.stop_reason === 'end_turn') {
        break;
      }

      // Add assistant response to conversation
      conversationMessages.push({
        role: 'assistant',
        content: message.content
      });

      // Add user message to continue
      conversationMessages.push({
        role: 'user',
        content: 'Please provide the base64 output.'
      });
    }

    if (!base64Content) {
      return res.status(500).json({ 
        error: 'Failed to extract file content'
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
