# Google Cloud Service Account Setup for Gemini API

This guide explains how to configure the SRE Platform to use Google Gemini API with a service account instead of the Anthropic API. This is particularly useful for sandbox environments where you have access to a Google Cloud service account but not to API keys.

## Overview

The SRE Platform supports two AI providers:
1. **Anthropic Claude** (default) - Requires an API key
2. **Google Gemini** - Requires a service account JSON key

The system automatically selects the provider based on which credentials are available in your `.env` file.

## Priority Order

1. If `ANTHROPIC_API_KEY` is set and not empty → Uses Anthropic Claude
2. If `google-service-account-key.json` file exists in project root → Uses Google Gemini
3. If `GOOGLE_SERVICE_ACCOUNT_KEY` environment variable is set → Uses Google Gemini
4. If none are configured → Application will fail to start

## Setting Up Google Cloud Service Account

### Step 1: Create a Service Account in Google Cloud

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project (or create a new one)
3. Navigate to **IAM & Admin** → **Service Accounts**
4. Click **Create Service Account**
5. Provide a name (e.g., `sre-platform-gemini`)
6. Grant the following role: **Vertex AI User** or **AI Platform User**
7. Click **Done**

### Step 2: Create and Download Service Account Key

1. In the Service Accounts list, find your newly created service account
2. Click on the service account email
3. Go to the **Keys** tab
4. Click **Add Key** → **Create new key**
5. Select **JSON** format
6. Click **Create**
7. The JSON key file will be downloaded to your computer

### Step 3: Enable Required APIs

Make sure the following APIs are enabled in your Google Cloud project:

1. Go to **APIs & Services** → **Library**
2. Search for and enable:
   - **Vertex AI API**
   - **Generative Language API** (if using Gemini API directly)

### Step 4: Configure the Application

#### Option A: Using the JSON file directly (RECOMMENDED - Easiest and most reliable)

1. Rename the downloaded JSON file to `google-service-account-key.json`
2. Place it in the **project root directory** (same level as `docker-compose.yml`)
3. Comment out or remove the `ANTHROPIC_API_KEY` line in your `.env` file:
   ```bash
   # ANTHROPIC_API_KEY=your_anthropic_api_key_here
   ```
4. That's it! The application will automatically detect and use the JSON file.

**Note**: The file is already added to `.gitignore` so it won't be committed to version control.

#### Option B: Using environment variable (Fallback - Not recommended due to formatting issues)

If you cannot use the JSON file approach:

1. Open the downloaded JSON file
2. Copy the entire JSON content (it must be a single line)
3. Open your `.env` file in the backend directory
4. Comment out or remove the `ANTHROPIC_API_KEY` line:
   ```bash
   # ANTHROPIC_API_KEY=your_anthropic_api_key_here
   ```
5. Add the `GOOGLE_SERVICE_ACCOUNT_KEY` with the JSON content:
   ```bash
   GOOGLE_SERVICE_ACCOUNT_KEY={"type":"service_account","project_id":"your-project-id","private_key_id":"...","private_key":"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n","client_email":"...","client_id":"...","auth_uri":"https://accounts.google.com/o/oauth2/auth","token_uri":"https://oauth2.googleapis.com/token","auth_provider_x509_cert_url":"https://www.googleapis.com/oauth2/v1/certs","client_x509_cert_url":"..."}
   ```

**Important**: The entire JSON must be on a single line without line breaks. This method is prone to formatting errors, especially with newlines in the private key.

### Step 5: Restart the Application

After configuring the environment variable, restart your backend server.

#### For Docker/Container Environments:

```bash
# Rebuild and restart containers
docker-compose down
docker-compose up --build -d

# Check logs to verify AI provider
docker-compose logs backend | grep "AI Service"
```

#### For Local Development:

```bash
cd backend
npm run dev
```

You should see a log message indicating which AI provider is being used:
```
[AI Service] Initializing with Google Gemini (Service Account File)
Service account loaded: { project_id: 'your-project', client_email: 'your-sa@project.iam.gserviceaccount.com' }
```

### Step 6: Test the Integration

Run the test script to verify the AI service is working correctly:

#### In Docker:
```bash
docker-compose exec backend node test-ai-service.js
```

#### Locally:
```bash
cd backend
node test-ai-service.js
```

Expected output:
```
=== AI Service Test ===

Test 1: Initializing AI Service...
✓ AI Service initialized successfully
  Provider: google
  Model: gemini-2.0-flash-exp

Test 2: Testing AI completion...
  Prompt: "Say "Hello, AI service is working!" and nothing else."
✓ AI completion successful
  Response: "Hello, AI service is working!"
  Duration: 1234ms
  Input tokens: 15
  Output tokens: 8

=== All Tests Passed ===
```

## Switching Between Providers

### To use Anthropic Claude:
```bash
# In .env
ANTHROPIC_API_KEY=sk-ant-api03-...

# Remove or rename google-service-account-key.json if present
```

### To use Google Gemini:
```bash
# In .env
# ANTHROPIC_API_KEY=sk-ant-api03-...  # Comment this out

# Place google-service-account-key.json in project root
# OR set environment variable (not recommended):
# GOOGLE_SERVICE_ACCOUNT_KEY={"type":"service_account",...}
```

## Troubleshooting

### Error: "No AI provider configured"
- Make sure at least one of the following is configured:
  - `ANTHROPIC_API_KEY` in your `.env` file
  - `google-service-account-key.json` file in project root
  - `GOOGLE_SERVICE_ACCOUNT_KEY` environment variable
- Check that the values are not empty strings

### Error: "Invalid google-service-account-key.json file"
- Ensure the JSON file is valid and properly formatted
- Verify the file is named exactly `google-service-account-key.json`
- Check that the file is in the project root directory (same level as `docker-compose.yml`)
- Make sure the file contains all required fields: `type`, `project_id`, `private_key`, `client_email`, etc.

### Error: "Invalid GOOGLE_SERVICE_ACCOUNT_KEY format" (when using environment variable)
- Ensure the JSON is valid and properly formatted
- Make sure there are no extra line breaks in the JSON string
- Verify that all special characters are properly escaped
- **Recommended**: Use the JSON file approach instead to avoid formatting issues

### Error: "Permission denied" or "API not enabled"
- Verify that the Vertex AI API is enabled in your Google Cloud project
- Check that your service account has the correct IAM roles
- Ensure your Google Cloud project has billing enabled

### Error: "Authentication failed"
- Verify that the service account JSON key is correct and not expired
- Check that the `client_email` in the JSON matches your service account
- Ensure the private key is complete and properly formatted

## Model Information

When using Google Gemini, the system uses:
- **Model**: `gemini-2.0-flash-exp` (latest Gemini model)
- **Temperature**: 0.7
- **Max Output Tokens**: Configurable per request (default: 8192)

## Security Best Practices

1. **Never commit service account keys to version control**
   - Add `*.json` to `.gitignore` for service account files
   - Use environment variables for production deployments

2. **Rotate keys regularly**
   - Create new service account keys periodically
   - Delete old keys from Google Cloud Console

3. **Use least privilege**
   - Only grant the minimum required IAM roles
   - Consider using separate service accounts for different environments

4. **Secure storage**
   - In production, use secret management services (e.g., Google Secret Manager, AWS Secrets Manager)
   - Never expose service account keys in logs or error messages

## Sandbox Environment Notes

For temporary sandbox environments that are destroyed after one day:

1. Create a service account in your Google Cloud project before the sandbox is created
2. Download the JSON key and store it securely on your local machine
3. When setting up a new sandbox:
   - Simply place the `google-service-account-key.json` file in the project root
   - Or add the `GOOGLE_SERVICE_ACCOUNT_KEY` to the `.env` file (less reliable)
4. The service account will continue to work even after the sandbox is destroyed, as it's tied to your Google Cloud project, not the sandbox

**Tip**: Keep the JSON file on your local machine so you can quickly copy it to new sandbox environments.

## Cost Considerations

- Google Gemini API pricing may differ from Anthropic Claude
- Monitor your usage in the Google Cloud Console
- Set up billing alerts to avoid unexpected charges
- Consider using quotas to limit API usage

## Support

For issues related to:
- **Google Cloud setup**: Refer to [Google Cloud Documentation](https://cloud.google.com/docs)
- **Gemini API**: See [Gemini API Documentation](https://ai.google.dev/docs)
- **Application integration**: Check the application logs and ensure the AI service is properly initialized
