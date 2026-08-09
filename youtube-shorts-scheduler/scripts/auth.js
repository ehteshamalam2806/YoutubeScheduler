import http from 'http';
import { exec } from 'child_process';
import { google } from 'googleapis';
import dotenv from 'dotenv';

// Load environment variables from .env
dotenv.config();

const CLIENT_ID = process.env.YOUTUBE_CLIENT_ID;
const CLIENT_SECRET = process.env.YOUTUBE_CLIENT_SECRET;
const PORT = 3000;
const REDIRECT_URI = `http://localhost:${PORT}/oauth2callback`;

const REQUIRED_SCOPES = [
  'https://www.googleapis.com/auth/youtube.upload'
];

/**
 * Validates environment variables
 */
function validateEnv() {
  if (!CLIENT_ID || !CLIENT_SECRET) {
    console.error('❌ ERROR: Missing OAuth credentials in environment.');
    console.error('');
    console.error('Please configure your .env file with your Google OAuth credentials:');
    console.error('');
    console.error('YOUTUBE_CLIENT_ID=your_client_id_here');
    console.error('YOUTUBE_CLIENT_SECRET=your_client_secret_here');
    console.error('');
    console.error('Refer to .env.example for template structure.');
    process.exit(1);
  }
}

/**
 * Handles the authorization code exchange for tokens with diagnostic logging
 */
async function handleCodeExchange(oauth2Client, code) {
  try {
    const { tokens } = await oauth2Client.getToken(code);
    
    console.log('');
    console.log('--------------------------------------------------');
    console.log('Authentication successful.');
    console.log('--------------------------------------------------');

    if (tokens.refresh_token) {
      console.log('🔑 REFRESH TOKEN OBTAINED:');
      console.log('');
      console.log(tokens.refresh_token);
      console.log('');
      console.log('==================================================');
      console.log('🛡️ IMPORTANT SECURITY INSTRUCTIONS:');
      console.log('1. Copy the REFRESH TOKEN printed above.');
      console.log('2. Go to your GitHub Repository -> Settings -> Secrets and variables -> Actions.');
      console.log('3. Add a new Repository Secret named: YOUTUBE_REFRESH_TOKEN');
      console.log('4. NEVER commit or save this refresh token into Git repository files.');
      console.log('==================================================');
      return true;
    } else {
      console.warn('⚠️ WARNING: No refresh_token received in response.');
      console.warn('To force a new refresh token, revoke app access in your Google Account security settings and re-run npm run auth.');
      return false;
    }
  } catch (error) {
    console.error('');
    console.error('❌ Token Exchange Error Diagnostics:');
    console.error(`Message: ${error.message}`);
    if (error.code) console.error(`Error Code: ${error.code}`);
    if (error.status) console.error(`HTTP Status: ${error.status}`);
    if (error.response && error.response.data) {
      console.error('Response details:', JSON.stringify(error.response.data));
    }
    return false;
  }
}

/**
 * Main OAuth 2.0 Authorization Flow
 */
async function startAuthFlow() {
  validateEnv();

  const oauth2Client = new google.auth.OAuth2(
    CLIENT_ID,
    CLIENT_SECRET,
    REDIRECT_URI
  );

  // Generate Google Authorization URL with offline access to get a refresh token
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: REQUIRED_SCOPES,
    prompt: 'consent'
  });

  console.log('==================================================');
  console.log('⚡ YOUTUBE OAUTH 2.0 AUTHORIZATION INITIALIZED ⚡');
  console.log('==================================================');
  console.log('');
  console.log('1. Open the following URL in your browser if it does not open automatically:');
  console.log('');
  console.log(`   ${authUrl}`);
  console.log('');
  console.log('2. Log in with your Google account and grant YouTube upload permissions.');
  console.log(`3. Waiting for authorization callback on http://localhost:${PORT}/oauth2callback ...`);
  console.log('');

  // Attempt to open the auth URL in default OS browser
  const startCmd = process.platform === 'win32' ? `start "" "${authUrl}"` :
                   process.platform === 'darwin' ? `open "${authUrl}"` : `xdg-open "${authUrl}"`;
  exec(startCmd, () => {});

  let isCompleted = false;

  // Create temporary local HTTP callback server
  const server = http.createServer(async (req, res) => {
    try {
      const reqUrl = new URL(req.url, `http://localhost:${PORT}`);

      // Ignore favicon requests
      if (reqUrl.pathname === '/favicon.ico') {
        res.writeHead(204);
        res.end();
        return;
      }

      if (reqUrl.pathname === '/oauth2callback') {
        const code = reqUrl.searchParams.get('code');
        
        if (!code) {
          res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end('<h1>Authorization Failed</h1><p>No authorization code received from Google.</p>');
          console.error('❌ Authorization failed: No code query parameter received.');
          return;
        }

        if (isCompleted) return;

        const success = await handleCodeExchange(oauth2Client, code);

        if (success) {
          isCompleted = true;
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(`
            <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 40px auto; padding: 20px; border-radius: 12px; background: #0f172a; color: #f8fafc; text-align: center;">
              <h1 style="color: #10b981;">Authentication Successful! 🎉</h1>
              <p>Your YouTube Channel authorization has been granted successfully.</p>
              <p style="color: #94a3b8;">You can now close this browser tab and return to your terminal.</p>
            </div>
          `);
          setTimeout(() => {
            server.close();
            process.exit(0);
          }, 500);
        } else {
          res.writeHead(500, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end('<h1>Token Exchange Error</h1><p>Please check your local terminal for error details.</p>');
        }
      }
    } catch (error) {
      console.error('❌ Error handling callback request:', error.message);
    }
  });

  server.listen(PORT);
}

// Execute authorization flow
startAuthFlow();
