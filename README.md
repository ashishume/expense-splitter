# Axpo Expense Splitter

A modern, real-time expense splitting application built with React, TypeScript, and Firebase. Perfect for groups, trips, roommates, or any shared activity where you need to track expenses and settle up easily.

---

## Features

- **Google Authentication**: Secure sign-in with Google accounts.
- **Automatic User Registration**: Users are added to the database on first sign-in.
- **Group Management**: Create and manage groups for trips, events, or activities.
- **Expense Tracking**: Add expenses, specify payer, split with selected group members, and add descriptions.
- **Smart Settlement System**: Instantly calculates who owes whom, only between users involved in the same group expenses.
- **Settle Up**: Mark settlements as paid; the app creates balancing transactions automatically.
- **Activity Logs**: See a history of all actions and changes.
- **Responsive UI**: Works beautifully on desktop and mobile.
- **Real-time Sync**: All changes are instantly reflected for all users via Firebase.
- **Modern UI**: Built with Tailwind CSS and Framer Motion for smooth animations.

---

## How Settlements Work

1. **Add Expenses**: Enter expenses in a group, specifying who paid and who shares the cost.
2. **Automatic Calculation**: The app calculates balances for each group member.
3. **Settlement Generation**: Only users who participated in the same expenses can have settlements between them.
4. **Settle Up**: Click "Settle" to mark a payment as completed; a balancing transaction is created.
5. **Real-time Updates**: All balances and settlements update instantly for everyone in the group.

---

## Technology Stack

- **Frontend**: React 18 + TypeScript
- **Styling**: Tailwind CSS, Framer Motion
- **Backend**: Firebase Firestore (real-time database)
- **Authentication**: Firebase Auth (Google Sign-in)
- **Build Tool**: Vite

---

## Getting Started

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/axpo-expense.git
   cd axpo-expense
   ```
2. **Install dependencies**
   ```bash
   npm install
   ```
3. **Set up Firebase**
   - Create a Firebase project at [Firebase Console](https://console.firebase.google.com/)
   - Enable Firestore and Google Authentication
   - Copy your Firebase config to `src/firebase.ts`
4. **Run the development server**
   ```bash
   npm run dev
   ```
5. **Open your browser**
   - Visit the local development URL (usually `http://localhost:5173`)

---

## Development Scripts

- **Type Checking**: `npx tsc --noEmit`
- **Linting**: `npm run lint`
- **Build**: `npm run build` (automatically bumps service worker version)
- **Build (Manual)**: `npm run build:manual` (skips version bump)
- **Bump Service Worker Version**: `npm run bump-sw`
- **Preview Production Build**: `npm run preview`

---

## Deployment & Cache Management

This app includes an advanced **automatic update system** to ensure mobile browsers always get the latest updates **without user confirmation**.

### Quick Deployment Steps:

1. **Build the app** (this automatically bumps the service worker version):

   ```bash
   npm run build
   ```

2. **Deploy the `dist/` folder** to your web server

3. **Done!** Users will automatically receive the update within 60 seconds

### How Auto-Update Works:

When you deploy a new version:

1. User visits the app (or app checks for updates every 60 seconds)
2. Brief toast notification: "Updating to latest version... 🔄"
3. Page automatically reloads with new version (1.5 seconds later)
4. User is now on the latest version - no action needed!

### Key Features:

- ✅ **Automatic version bumping** on every build
- ✅ **Automatic updates** - no user confirmation needed
- ✅ **Network-first caching** for HTML/JS/CSS
- ✅ **Content-hash based filenames** for asset cache busting
- ✅ **Seamless user experience** with brief notification
- ✅ **Mobile-optimized** service worker
- ✅ **Updates within 60 seconds** of deployment

For customization options and troubleshooting, see [AUTO_UPDATE_GUIDE.md](./AUTO_UPDATE_GUIDE.md).

---

## Project Structure

```
src/
├── components/
│   ├── AuthContext.tsx      # Authentication context provider
│   ├── useAuth.ts           # Custom hook for accessing auth context
│   ├── Expenses.tsx         # Expense management UI
│   ├── Groups.tsx           # Group management UI
│   ├── Settlements.tsx      # Settlement logic and UI
│   ├── Users.tsx            # User management UI
│   ├── Logs.tsx             # Activity log UI
│   └── icons/               # Icon components
├── types/                   # TypeScript type definitions
├── utils/                   # Utility functions (e.g., logger)
├── firebase.ts              # Firebase config and initialization
├── expense-splitter.tsx     # Main application logic
├── App.tsx                  # App root
└── styles/                  # CSS and variables
```

---

## Contributing

Pull requests are welcome! For major changes, please open an issue first to discuss what you would like to change.

---

## Screenshots

### Authentication

![Login Screen](/public/screenshots/login.PNG)

### Group Management

![Group Management](/public/screenshots/group.PNG)

### Expense Tracking

![Expenses Dashboard](/public/screenshots/expenses.PNG)
![Recent Expenses](/public/screenshots/recent-expenses.PNG)

### Settlements

![My Settlements](/public/screenshots/my-settlements.PNG)
![Settled Transactions](/public/screenshots/settled.PNG)

### Activity Logs

![Activity Logs](/public/screenshots/logs.PNG)
