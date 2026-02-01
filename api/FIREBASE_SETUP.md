# Firebase Deployment Setup - Next Steps

## ✅ Build Issues Fixed

The TypeScript compilation issues have been resolved. The API now builds successfully.

## 🔧 Firebase Setup Required

Before you can deploy, you need to complete these steps:

### 1. Create or Select a Firebase Project

Option A: **Create a new Firebase project**
```bash
firebase projects:create
```

Option B: **Use an existing Firebase project**
- List your projects: `firebase projects:list`
- Use one of them in the next step

### 2. Link Your Project

Edit `.firebaserc` and replace `your-firebase-project-id` with your actual project ID:

```json
{
  "projects": {
    "default": "your-actual-project-id"
  }
}
```

Or use the Firebase CLI:
```bash
firebase use --add
```

### 3. Enable Required Services

In the [Firebase Console](https://console.firebase.google.com/):

1. Go to your project
2. Navigate to **Build > Functions**
3. Click "Get started" to enable Cloud Functions
4. This will also enable:
   - Cloud Build API
   - Cloud Run Admin API
   - Artifact Registry API

### 4. Upgrade to Blaze Plan (Pay-as-you-go)

Firebase Functions requires the Blaze plan:
1. Go to your Firebase project settings
2. Click on "Upgrade" under the plan section
3. Follow the prompts to upgrade to Blaze (pay-as-you-go)

**Note:** The free tier includes generous limits:
- 2M function invocations/month
- 400,000 GB-seconds
- 200,000 CPU-seconds

### 5. Set up Permissions (If you see permission errors)

If you get "Missing permissions required for functions deploy" error:

1. Go to [Google Cloud Console IAM](https://console.cloud.google.com/iam-admin/iam)
2. Find your account
3. Add these roles:
   - **Cloud Functions Developer**
   - **Service Account User**
   - **Cloud Build Editor** (or Cloud Build Service Account)

### 6. Deploy

Once setup is complete:

```bash
cd /home/iiy/projects/bowling-league-organizer/api
npm run deploy
```

## Environment Variables

Before deploying, set your environment variables:

```bash
# Database connection
firebase functions:config:set database.url="your-postgresql-connection-string"

# JWT secret
firebase functions:config:set jwt.secret="your-jwt-secret-key"

# Frontend URL
firebase functions:config:set frontend.url="https://your-frontend-domain.com"

# View current config
firebase functions:config:get
```

## Database Setup

### Option 1: Use Cloud SQL (Recommended for production)

1. Create a PostgreSQL instance in [Cloud SQL](https://console.cloud.google.com/sql/instances)
2. Create a database and user
3. Get the connection string
4. Set the DATABASE_URL environment variable

### Option 2: Use External Database Service

Services like Supabase, Neon, or Railway work well:

Example for Supabase:
```bash
firebase functions:config:set database.url="postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres"
```

### Run Migrations

After setting up the database:

```bash
# Set DATABASE_URL locally for migrations
export DATABASE_URL="your-connection-string"

# Run migrations
npx prisma migrate deploy

# Generate Prisma client
npx prisma generate
```

## Testing After Deployment

Your API will be available at:
```
https://us-central1-your-project-id.cloudfunctions.net/api
```

Test the deployment:
```bash
# Health check
curl https://us-central1-your-project-id.cloudfunctions.net/api

# View API docs
open https://us-central1-your-project-id.cloudfunctions.net/api/docs
```

## Troubleshooting

### "Missing permissions" error
- Ensure you have the correct IAM roles assigned
- Make sure you're logged in with the correct Google account: `firebase login --reauth`

### "Billing account not configured" error
- Upgrade to the Blaze (pay-as-you-go) plan in Firebase Console

### Function timeout
- Default timeout is 60s
- For longer operations, update `firebase.json`:
  ```json
  {
    "functions": {
      "source": ".",
      "runtime": "nodejs20",
      "timeout": "300s"
    }
  }
  ```

### Cold starts
- First request after inactivity may take 10-30 seconds
- Consider using Cloud Scheduler to keep functions warm
- Or migrate to Cloud Run for always-warm instances

## Next Steps After Successful Deployment

1. **Update frontend**: Set the API URL in your web app's environment variables
2. **Set up CI/CD**: Add GitHub Actions for automated deployments (see FIREBASE_DEPLOYMENT.md)
3. **Monitor**: Use Firebase Console to monitor function performance and errors
4. **Set up alerts**: Configure Cloud Monitoring for error notifications

## Quick Reference Commands

```bash
# Login to Firebase
firebase login

# List projects
firebase projects:list

# Switch project
firebase use your-project-id

# Deploy
npm run deploy

# View logs
npm run firebase:logs

# Test locally
firebase emulators:start --only functions
```
