# Quick Setup: Google Service Account for Gemini API

## TL;DR - Fastest Setup

1. Download your Google Cloud service account JSON file
2. Rename it to `google-service-account-key.json`
3. Place it in the project root directory (same level as `docker-compose.yml`)
4. Comment out `ANTHROPIC_API_KEY` in your `.env` file
5. Restart the application

That's it! The application will automatically detect and use the JSON file.

## File Location

```
sre-platform/
├── docker-compose.yml
├── google-service-account-key.json  ← Place your file here
├── backend/
├── app/
└── ...
```

## Why This Approach?

The previous method of embedding the JSON in an environment variable caused formatting issues, especially with:
- Newlines in the private key (`\n` characters)
- Special characters that need escaping
- HTTP 400 "API key not valid" errors

Using a JSON file directly:
- ✅ Avoids all formatting issues
- ✅ Easier to update (just replace the file)
- ✅ Works reliably in Docker containers
- ✅ Already added to `.gitignore` for security

## Verification

After starting the application, check the logs:

```bash
docker-compose logs backend | grep "AI Service"
```

You should see:
```
[AI Service] Initializing with Google Gemini (Service Account File)
[AI Service] Service account loaded: { project_id: 'your-project', client_email: 'your-sa@...' }
```

## Troubleshooting

### File not found
- Ensure the file is named exactly `google-service-account-key.json`
- Verify it's in the project root (not in `backend/` or any subdirectory)
- Check file permissions (should be readable)

### Still getting errors
- Verify the JSON file is valid (open it in a text editor)
- Make sure `ANTHROPIC_API_KEY` is commented out in `.env`
- Restart the Docker containers: `docker-compose restart backend`

### Need to use environment variable instead?
See the full documentation in [`GOOGLE_CLOUD_SETUP.md`](./GOOGLE_CLOUD_SETUP.md) for the fallback method (not recommended).

## Security Note

The file `google-service-account-key.json` is automatically ignored by Git (added to `.gitignore`), so it won't be committed to version control.
