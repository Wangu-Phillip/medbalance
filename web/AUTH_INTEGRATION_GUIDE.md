# Authentication Integration Guide

Quick guide to integrate the Firebase authentication login page into your existing MedBalance AI app.

## 1. Update main.tsx

Wrap your app with the `AuthProvider`:

```tsx
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { AuthProvider } from "./context/AuthContext";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>,
);
```

## 2. Update App.tsx

Use the `useAuth` hook to conditionally render pages:

```tsx
import { useAuth } from "./context/AuthContext";
import LoginPage from "./pages/auth/LoginPage";
import { ProtectedRoute } from "./components/ProtectedRoute";

export default function App() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-cyan-400 font-semibold">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  // Your existing app content
  const [tab, setTab] = useState<TabKey>("landing");

  return (
    <ProtectedRoute>{/* Your existing navigation and pages */}</ProtectedRoute>
  );
}
```

## 3. Environment Setup

Create `.env.local` in the `web` directory:

```env
VITE_FIREBASE_API_KEY=your_key
VITE_FIREBASE_AUTH_DOMAIN=your_domain.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_bucket.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_API_BASE_URL=http://localhost:8000
```

## 4. Use in Navigation

Add a logout button in your header:

```tsx
import { useAuth } from "./context/AuthContext";
import { signOut } from "firebase/auth";
import { auth } from "./firebaseConfig";

export function Header() {
  const { user } = useAuth();

  const handleLogout = async () => {
    await signOut(auth);
  };

  return (
    <header className="border-b bg-white">
      <div className="mx-auto max-w-6xl px-4 py-4 flex justify-between items-center">
        <h1 className="text-xl font-semibold">MedBalance AI</h1>
        {user && (
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-600">{user.email}</span>
            <button
              onClick={handleLogout}
              className="px-4 py-2 rounded-md bg-slate-900 text-white hover:bg-slate-800"
            >
              Logout
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
```

## 5. Access User Information

Use the `useAuth` hook anywhere in your app:

```tsx
import { useAuth } from "./context/AuthContext";

function MyComponent() {
  const { user, isAuthenticated } = useAuth();

  return (
    <div>
      <p>Welcome, {user?.email}</p>
      <p>User ID: {user?.uid}</p>
    </div>
  );
}
```

## File Structure

```
web/
├── src/
│   ├── pages/
│   │   └── auth/
│   │       └── LoginPage.tsx          # Main login page ✨ NEW
│   ├── context/
│   │   └── AuthContext.tsx            # Auth provider & hook ✨ NEW
│   ├── components/
│   │   └── ProtectedRoute.tsx         # Route protection ✨ NEW
│   ├── firebaseConfig.ts              # Firebase setup ✨ NEW
│   ├── App.tsx                        # Update with auth logic
│   └── main.tsx                       # Update with AuthProvider
├── .env.example                       # Template ✨ NEW
└── .env.local                         # Your credentials (git ignored)
```

## Install Dependencies

From the `web` directory:

```bash
npm install
npm run dev
```

## Firebase Console Setup Checklist

- [ ] Create Firebase project
- [ ] Copy Firebase config
- [ ] Create `.env.local` with credentials
- [ ] Enable Email/Password authentication
- [ ] Create test users
- [ ] Run development server
- [ ] Test login functionality

## API Integration

The API axios instance is already configured in `src/api.ts`. To add authentication headers:

```tsx
import { auth } from "./firebaseConfig";

export const apiWithAuth = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:8000",
  headers: {
    "Content-Type": "application/json",
  },
});

// Add Firebase token to requests
apiWithAuth.interceptors.request.use(async (config) => {
  const token = await auth.currentUser?.getIdToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```

## Common Issues & Solutions

| Issue                     | Solution                                                                   |
| ------------------------- | -------------------------------------------------------------------------- |
| "Firebase is not defined" | Make sure `.env.local` is in the correct directory and server is restarted |
| Login not persisting      | Clear browser cache/localStorage and retry                                 |
| CORS errors               | Add domain to Firebase authorized domains in Console                       |
| Can't create users        | Enable Email/Password in Firebase Authentication settings                  |

## Next Steps

1. ✅ Replace your current navigation with authenticated version
2. ✅ Add user roles (admin, manager, viewer)
3. ✅ Implement password reset
4. ✅ Add profile management page
5. ✅ Set up Firestore for user profiles and permissions
