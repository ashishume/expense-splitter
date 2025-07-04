# Axpo Expense Splitter

A modern, real-time expense splitting application built with React, TypeScript, and Firebase. Perfect for groups, trips, roommates, or any shared activity where you need to track expenses and settle up easily.

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
- **Build**: `npm run build`
- **Preview Production Build**: `npm run preview`

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

## License

[MIT](LICENSE)

---

Let me know if you want to add screenshots, demo links, or any other custom section! If you want me to update the README file directly, just say so.
