# Firebase Authentication Setup Guide

This guide explains how to set up and configure Firebase Authentication for the MedBalance AI application.

## Prerequisites

- Firebase project created at [Firebase Console](https://console.firebase.google.com)
- Firebase CLI installed (optional, for advanced setup)

## Step 1: Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Click "Create a new project"
3. Enter "medbalance-ai" as the project name
4. Follow the setup wizard
5. Once created, go to Project Settings (gear icon)

## Step 2: Get Firebase Credentials

1. In Firebase Console, click on your project
2. Click the "Settings" gear icon → Project Settings
3. Scroll to "Your apps" section
4. Click "Add app" → select "Web"
5. Register the app with nickname "medbalance-web"
6. Copy the Firebase config object

## Step 3: Configure Environment Variables

1. In the `web` directory, create a `.env.local` file (or copy from `.env.example`)
2. Add your Firebase credentials:

```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_API_BASE_URL=http://localhost:8000
```

## Step 4: Enable Email/Password Authentication

1. In Firebase Console, go to Authentication (left sidebar)
2. Click on the "Sign-in method" tab
3. Click "Email/Password"
4. Toggle "Enable" and save
5. Click "Add new user" to create test accounts

## Step 5: Install Dependencies

```bash
cd web
npm install
```

This will install Firebase and all required dependencies.

## Step 6: Update App.tsx to Include Authentication

Wrap your app with `AuthProvider` in `main.tsx`:

```tsx
import { AuthProvider } from "./context/AuthContext";
import App from "./App";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>,
);
```

Then use the `ProtectedRoute` component to protect your pages:

```tsx
import { ProtectedRoute } from "./components/ProtectedRoute";
import LoginPage from "./pages/auth/LoginPage";

// In your App component:
{
  isAuthenticated ? (
    <ProtectedRoute>
      <YourProtectedPage />
    </ProtectedRoute>
  ) : (
    <LoginPage />
  );
}
```

## Step 7: Test the Login Page

1. Run the development server:

   ```bash
   npm run dev
   ```

2. Navigate to `/auth/login` or use the LoginPage component directly
3. Create a test user in Firebase Console
4. Test logging in with the test user credentials

## Features Implemented

### LoginPage Component (`src/pages/auth/LoginPage.tsx`)

- ✅ Email/Password login form
- ✅ Real-time Firebase authentication
- ✅ Error handling with user-friendly messages
- ✅ Password visibility toggle
- ✅ Session persistence (local storage)
- ✅ Loading states
- ✅ Logout functionality
- ✅ Responsive design with Tailwind CSS
- ✅ Modern UI with background animations

### AuthContext (`src/context/AuthContext.tsx`)

- ✅ Global authentication state management
- ✅ User information access throughout the app
- ✅ Loading state handling
- ✅ Authentication status checking

### ProtectedRoute Component (`src/components/ProtectedRoute.tsx`)

- ✅ Route protection for authenticated pages
- ✅ Automatic redirect to login for unauthenticated users
- ✅ Loading state display
- ✅ Clean separation of concerns

## Firebase Error Handling

The login page handles all common Firebase authentication errors:

- `auth/user-not-found` - Email address not registered
- `auth/wrong-password` - Incorrect password
- `auth/invalid-email` - Invalid email format
- `auth/user-disabled` - Account disabled
- `auth/too-many-requests` - Too many failed attempts

## Testing

### Test Credentials

Create these test users in Firebase Console:

1. **Admin User**
   - Email: `admin@medbalance.com`
   - Password: `Admin123!@#`

2. **District Manager**
   - Email: `manager@medbalance.com`
   - Password: `Manager123!@#`

## Security Best Practices

1. ✅ Never commit `.env.local` to version control
2. ✅ Use `.env.example` as a template
3. ✅ Sensitive data stored in environment variables
4. ✅ Password validation on client and server
5. ✅ Session persistence using browser local storage
6. ✅ User state managed through Firebase directly

## Troubleshooting

### "Firebase config is not defined"

- Make sure `.env.local` is in the `web` directory with proper Firebase credentials
- Restart the dev server after adding environment variables

### Authentication not persisting

- Check browser localStorage is enabled
- Verify `.env.local` contains correct Firebase credentials

### CORS errors

- Ensure your Firebase project allows your domain
- Check Firebase Console → Settings → Authorized domains

## Next Steps

1. Integrate login page into your main routing flow
2. Add user role management (admin, manager, viewer)
3. Implement password reset functionality
4. Add social login options (Google, GitHub)
5. Set up Firebase Firestore for user profiles
