# Axpo Expense Splitter

A modern expense splitting application built with React, TypeScript, and Firebase. This app helps groups of people track shared expenses and settle debts efficiently.

## Features

- **Google Authentication**: Seamless sign-in with Google accounts
- **Automatic User Registration**: Users are automatically added to the database when they sign in with Google
- **User Management**: Add and manage users for expense tracking
- **Group Management**: Create groups to organize expenses by activity or trip
- **Expense Tracking**: Add expenses with detailed descriptions and split them among group members
- **Smart Settlement System**: Automatically calculate who owes whom within each group
- **Real-time Updates**: All changes are synchronized in real-time using Firebase
- **Activity Logs**: Track all actions and changes in the application
- **Responsive Design**: Works seamlessly on desktop and mobile devices

## Settlement System

The settlement system is designed to be accurate and group-specific:

- **Group-Specific Calculations**: Settlements are calculated separately for each group/activity
- **Involved Users Only**: Only users who participated in the same expenses can have settlements between them
- **Settle Button**: Each settlement has a "Settle" button to mark payments as completed
- **Automatic Transaction Creation**: When settled, the system creates a balancing transaction
- **Real-time Updates**: Settlement status updates immediately across all connected devices

## How Settlements Work

1. **Expense Creation**: When expenses are added to a group, the system tracks who paid and who owes money
2. **Balance Calculation**: For each group, the system calculates individual balances based on payments and splits
3. **Settlement Generation**: Settlements are created only between people who were involved in the same expenses
4. **Settlement Display**: Settlements are shown in the "Settlements" tab, grouped by activity/trip
5. **Settlement Action**: Users can click "Settle" to mark a payment as complete
6. **Transaction Creation**: The system creates a balancing transaction and removes the settlement
7. **Real-time Sync**: All balances update immediately across all devices

## Technology Stack

- **Frontend**: React 18 with TypeScript
- **Styling**: Tailwind CSS with Framer Motion animations
- **Backend**: Firebase Firestore for real-time data
- **Authentication**: Firebase Auth with Google Sign-in
- **Build Tool**: Vite for fast development and building

## Getting Started

1. Clone the repository
2. Install dependencies: `npm install`
3. Set up Firebase configuration in `src/firebase.ts`
4. Run the development server: `npm run dev`
5. Open your browser and navigate to the local development URL

## Development

- **Type Checking**: `npx tsc --noEmit`
- **Build**: `npm run build`
- **Preview**: `npm run preview`

## Project Structure

```
src/
├── components/          # React components
│   ├── AuthContext.tsx  # Authentication context with auto-user registration
│   ├── Expenses.tsx     # Expense management
│   ├── Groups.tsx       # Group management
│   ├── Settlements.tsx  # Settlement display and actions
│   ├── Users.tsx        # User management
│   └── Logs.tsx         # Activity logs
├── types/               # TypeScript type definitions
│   └── index.ts         # Shared interfaces for User, Group, Expense, etc.
├── utils/
│   └── logger.ts        # Logging utilities
├── firebase.ts          # Firebase configuration
├── expense-splitter.tsx # Main application component
└── App.tsx             # Root component
```
