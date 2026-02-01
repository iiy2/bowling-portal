# Firebase Functions Deployment Guide

## Prerequisites

1. **Firebase CLI**: Install Firebase CLI globally
   ```bash
   npm install -g firebase-tools
   ```

2. **Firebase Project**: Create a Firebase project at [Firebase Console](https://console.firebase.google.com/)

3. **Firebase Login**: Login to Firebase CLI
   ```bash
   firebase login
   ```

## Initial Setup

1. **Link Firebase Project**: Update the project ID in `.firebaserc`
   ```json
   {
     "projects": {
       "default": "your-firebase-project-id"
     }
   }
   ```

2. **Initialize Firebase** (if needed):
   ```bash
   cd api
   firebase init functions
   ```
   - Select your Firebase project
   - Choose TypeScript
   - Select "No" for ESLint (we already have it)
   - Select "No" for installing dependencies (we'll do it manually)

3. **Install Dependencies**:
   ```bash
   cd api
   npm install
   ```

## Environment Variables

### Local Development
Create a `.env` file in the `api` directory with your environment variables:
```env
DATABASE_URL="postgresql://user:password@host:port/database"
JWT_SECRET="your-jwt-secret"
FRONTEND_URL="http://localhost:5173"
```

### Firebase Functions Environment
Set environment variables for Firebase Functions:

```bash
# Set individual variables
firebase functions:config:set database.url="postgresql://user:password@host:port/database"
firebase functions:config:set jwt.secret="your-jwt-secret"
firebase functions:config:set frontend.url="https://your-app.web.app"

# Or set from a file
firebase functions:config:set $(cat .env | xargs)
```

Access environment variables in your code:
```typescript
import * as functions from 'firebase-functions';

const config = functions.config();
const databaseUrl = config.database?.url || process.env.DATABASE_URL;
```

## Database Setup

### Option 1: Cloud SQL (Recommended for Production)
1. Create a Cloud SQL PostgreSQL instance in Google Cloud Console
2. Enable Cloud SQL Admin API
3. Create a database and user
4. Update DATABASE_URL with Cloud SQL connection string
5. Configure Cloud SQL Proxy or use Unix socket connection

### Option 2: External Database
Use any PostgreSQL database accessible from the internet (Supabase, Neon, etc.)

### Run Prisma Migrations
```bash
cd api
npx prisma migrate deploy
npx prisma generate
```

## Build and Deploy

### 1. Build the Application
```bash
cd api
npm run build
```

### 2. Deploy to Firebase Functions
```bash
# Deploy all functions
npm run deploy

# Or use Firebase CLI directly
firebase deploy --only functions

# Deploy specific function
firebase deploy --only functions:api
```

### 3. View Deployment
After deployment, Firebase will provide a URL like:
```
https://us-central1-your-project-id.cloudfunctions.net/api
```

## Testing the Deployment

Test your deployed API:
```bash
# Health check (adjust endpoint based on your setup)
curl https://us-central1-your-project-id.cloudfunctions.net/api

# API docs
open https://us-central1-your-project-id.cloudfunctions.net/api/docs
```

## Monitoring and Logs

### View Logs
```bash
# View all logs
npm run firebase:logs

# Or use Firebase CLI
firebase functions:log

# View real-time logs
firebase functions:log --only api
```

### Firebase Console
Monitor your functions at: https://console.firebase.google.com/project/your-project-id/functions

## Important Considerations

### 1. Cold Starts
Firebase Functions have cold start delays. Consider:
- Using Firebase Functions 2nd generation for better performance
- Implementing Cloud Scheduler to keep functions warm
- Optimizing bundle size

### 2. Timeout Configuration
Update `firebase.json` if you need longer timeouts:
```json
{
  "functions": {
    "source": ".",
    "runtime": "nodejs20",
    "timeout": "540s",
    "memory": "1GB"
  }
}
```

### 3. CORS Configuration
The API is configured to accept all origins. For production, update CORS in [src/index.ts](src/index.ts):
```typescript
app.enableCors({
  origin: ['https://your-domain.com', 'https://your-app.web.app'],
  credentials: true,
});
```

### 4. Pricing
- Firebase Functions free tier: 2M invocations/month
- Monitor usage in Firebase Console
- Consider Cloud Run for more predictable pricing

## Updating the Frontend

Update your frontend API URL to point to the Firebase Functions endpoint:

In `web/.env.production`:
```env
VITE_API_URL=https://us-central1-your-project-id.cloudfunctions.net/api
```

## Troubleshooting

### Build Errors
- Ensure all dependencies are installed
- Check TypeScript errors: `npm run lint`
- Verify tsconfig.json settings

### Deployment Errors
- Check Firebase CLI version: `firebase --version`
- Verify project ID in `.firebaserc`
- Check Firebase Console for quota limits

### Runtime Errors
- Check logs: `npm run firebase:logs`
- Verify environment variables are set
- Check database connection

### Database Connection Issues
- Verify DATABASE_URL is set correctly
- Check firewall rules for external databases
- For Cloud SQL, ensure Cloud SQL Admin API is enabled

## Alternative: Firebase Functions 2nd Generation

For better performance, consider using 2nd generation functions. Update [src/index.ts](src/index.ts):

```typescript
import { onRequest } from 'firebase-functions/v2/https';

// ... existing code ...

export const api = onRequest(
  {
    timeoutSeconds: 540,
    memory: '1GiB',
    maxInstances: 10,
  },
  server
);
```

And update `firebase.json`:
```json
{
  "functions": [
    {
      "source": ".",
      "codebase": "default",
      "runtime": "nodejs20"
    }
  ]
}
```

## CI/CD with GitHub Actions

Create `.github/workflows/deploy-firebase.yml`:
```yaml
name: Deploy to Firebase Functions

on:
  push:
    branches:
      - main

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - name: Install dependencies
        run: cd api && npm ci
      - name: Build
        run: cd api && npm run build
      - name: Deploy to Firebase
        uses: w9jds/firebase-action@master
        with:
          args: deploy --only functions
        env:
          FIREBASE_TOKEN: ${{ secrets.FIREBASE_TOKEN }}
          PROJECT_PATH: api
```

Generate Firebase token:
```bash
firebase login:ci
```
Add the token to GitHub Secrets as `FIREBASE_TOKEN`.

## Support

For issues and questions:
- Firebase Functions docs: https://firebase.google.com/docs/functions
- NestJS docs: https://docs.nestjs.com/
- Prisma docs: https://www.prisma.io/docs/
