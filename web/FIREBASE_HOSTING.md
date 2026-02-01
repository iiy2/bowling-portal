# Firebase Hosting Deployment Guide

## Prerequisites

1. **Firebase CLI**: Install Firebase CLI globally
   ```bash
   npm install -g firebase-tools
   ```

2. **Firebase Login**: Login to Firebase CLI
   ```bash
   firebase login
   ```

## Configuration

The project is configured to deploy to Firebase project: `bowling-league-b4e28`

- **firebase.json**: Hosting configuration with SPA rewrites and caching
- **.firebaserc**: Firebase project configuration
- **.env.production**: Production environment variables

## Build and Deploy

### 1. Install Dependencies
```bash
cd web
npm install
```

### 2. Build for Production
```bash
npm run build
```

This creates the `dist` folder with the production build.

### 3. Deploy to Firebase Hosting
```bash
firebase deploy --only hosting
```

After deployment, your app will be available at:
- https://bowling-league-b4e28.web.app
- https://bowling-league-b4e28.firebaseapp.com

## Environment Variables

### Development
Create `.env` file:
```env
VITE_API_URL=http://localhost:3000
```

### Production
The `.env.production` file is used during build:
```env
VITE_API_URL=https://us-central1-bowling-league-b4e28.cloudfunctions.net/api
```

## Quick Deploy Script

Add this script to `package.json` for convenience:
```json
{
  "scripts": {
    "deploy": "npm run build && firebase deploy --only hosting"
  }
}
```

Then run:
```bash
npm run deploy
```

## Preview Deployment

Test your deployment before going live:
```bash
firebase hosting:channel:deploy preview
```

This creates a preview URL without affecting production.

## Monitoring

View hosting statistics at:
https://console.firebase.google.com/project/bowling-league-b4e28/hosting

## Troubleshooting

### Build Errors
- Ensure all dependencies are installed: `npm install`
- Check for TypeScript errors: `npm run lint`

### Deployment Errors
- Verify Firebase CLI is logged in: `firebase login`
- Check project ID in `.firebaserc`
- Ensure `dist` folder exists after build

### Routing Issues
The `firebase.json` is configured to rewrite all routes to `index.html` for SPA routing. If you still see 404 errors:
- Clear browser cache
- Check that rewrites are configured correctly

### CORS Issues
If you get CORS errors when calling the API, ensure:
1. The API has CORS enabled for your hosting domain
2. The `VITE_API_URL` is correct in `.env.production`

## CI/CD with GitHub Actions

Create `.github/workflows/deploy-web.yml`:
```yaml
name: Deploy Web to Firebase Hosting

on:
  push:
    branches:
      - main
    paths:
      - 'web/**'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - name: Install dependencies
        run: cd web && npm ci
      - name: Build
        run: cd web && npm run build
      - name: Deploy to Firebase
        uses: FirebaseExtended/action-hosting-deploy@v0
        with:
          repoToken: '${{ secrets.GITHUB_TOKEN }}'
          firebaseServiceAccount: '${{ secrets.FIREBASE_SERVICE_ACCOUNT }}'
          channelId: live
          projectId: bowling-league-b4e28
          entryPoint: ./web
```

To set up:
1. Generate a service account key in Firebase Console
2. Add it to GitHub Secrets as `FIREBASE_SERVICE_ACCOUNT`
