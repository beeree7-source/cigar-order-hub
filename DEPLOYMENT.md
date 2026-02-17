# Deployment Guide

## Frontend Deployment (Vercel)

### Prerequisites
- Vercel account
- Backend API deployed and accessible

### Steps

1. **Connect Repository to Vercel**
   - Go to [Vercel Dashboard](https://vercel.com/dashboard)
   - Click "New Project"
   - Import the `cigar-order-hub` repository
   - Select the `frontend` directory as the root directory

2. **Configure Build Settings**
   - Framework Preset: **Next.js**
   - Build Command: `npm run build` (default)
   - Output Directory: `.next` (default)
   - Install Command: `npm install` (default)

3. **Set Environment Variables**
   In the Vercel project settings, add the following environment variable:
   ```
   NEXT_PUBLIC_API_URL=https://your-backend-api-url.com
   ```
   
   **Important:** Replace `your-backend-api-url.com` with your actual backend URL.

4. **Deploy**
   - Click "Deploy"
   - Vercel will build and deploy your application

### After Deployment

Once deployed, you'll receive a URL like: `https://your-app.vercel.app`

**Important:** Update the backend CORS configuration with your Vercel URL!

---

## Backend Deployment

### Prerequisites
- Backend hosting service (e.g., Railway, Render, Heroku, AWS, etc.)
- Database (SQLite is included, or use PostgreSQL for production)

### Environment Variables Required

Set the following environment variable in your backend hosting service:

```
FRONTEND_URL=https://your-app.vercel.app
PORT=4000
ACCOUNTING_SUITE_ENABLED=false
```

`ACCOUNTING_SUITE_ENABLED` controls Accounting Hub availability:
- `false` (default): Accounting Suite paused; QuickBooks sync and `POST /api/accounting/invoices/upload` remain available.
- `true`: Full Accounting Hub endpoints enabled.

### Steps (Example for Railway/Render)

1. Connect your repository
2. Set the root directory to `backend`
3. Add environment variables listed above
4. Deploy

### CORS Configuration

The backend is configured to accept requests from the URL specified in `FRONTEND_URL` environment variable. Make sure to set this correctly in your backend hosting service.

---

## Local Development

### Backend
```bash
cd backend
npm install
npm start
```
Runs on http://localhost:4000

### Frontend
```bash
cd frontend
npm install
npm run dev
```
Runs on http://localhost:3000

### Environment Variables

The `.env.local` file is already configured for local development:
- Frontend: `NEXT_PUBLIC_API_URL=http://localhost:4000`

For backend, you can optionally create a `.env` file:
- Backend: `FRONTEND_URL=http://localhost:3000`
- Backend: `ACCOUNTING_SUITE_ENABLED=false`

---

## Troubleshooting

### CORS Errors
If you see CORS errors in the browser console:
1. Verify `FRONTEND_URL` is set correctly in backend environment
2. Ensure the URL matches exactly (including https/http and no trailing slash)

### API Connection Errors
If the frontend can't connect to the API:
1. Check that `NEXT_PUBLIC_API_URL` is set in Vercel environment variables
2. Verify the backend is running and accessible
3. Check browser console for error messages

### Build Failures on Vercel
1. Ensure all dependencies are in `package.json`
2. Check build logs for specific error messages
3. Verify TypeScript compilation succeeds locally first

---

## Security Notes

- Never commit `.env` or `.env.local` files (they're in `.gitignore`)
- Always use environment variables for API URLs and secrets
- Keep your backend API URL private if it contains sensitive endpoints
- Consider adding authentication to your backend endpoints
