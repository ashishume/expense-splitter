# Axpo Expense

A comprehensive expense management application with two powerful features: **Expense Splitter** for group expenses and **Expense Tracker** for personal finances. Built with React, TypeScript, and Firebase for real-time synchronization.

---

## Features Overview

### 🔀 Expense Splitter

Perfect for groups, trips, roommates, or any shared activity where you need to track expenses and settle up easily.

### 💰 Expense Tracker

Your personal finance companion for tracking income, expenses, savings, and investments with detailed insights and analytics.

---

## Screenshots

### Expense Splitter
<img width="200" height="500" alt="IMG_8435" src="https://github.com/user-attachments/assets/a2923d5b-70bc-4ea4-b7fd-ca85362fc935" />
<img width="200" height="500" alt="IMG_8444" src="https://github.com/user-attachments/assets/634ec328-57ce-4a00-ab72-ebb916acf2d3" />


<!-- Add screenshot here-->

#### Expense Tracking
<img width="200" height="500" alt="IMG_8436" src="https://github.com/user-attachments/assets/7ff3f589-1476-4332-8640-92d9bbe3be52" />
<img width="200" height="500" alt="IMG_8437" src="https://github.com/user-attachments/assets/a8352c23-436a-4495-a232-613e445e774f" />
<img width="200" height="500" alt="IMG_8439" src="https://github.com/user-attachments/assets/296a5158-a410-45a9-9cf8-8e59c2314d8d" />
<img width="200" height="500" alt="IMG_8440" src="https://github.com/user-attachments/assets/90d332f6-98a4-4082-bc21-340e38658dba" />
<img width="200" height="500" alt="IMG_8441" src="https://github.com/user-attachments/assets/63cd26a8-1315-4bc9-b1f4-346da4178dfc" />
<img width="200" height="500" alt="IMG_8442" src="https://github.com/user-attachments/assets/109d6513-8d40-4869-8a05-a8de2d608408" />


---

## 🔀 Expense Splitter Features

### Group Management

- **Create Groups**: Set up groups for trips, events, roommates, or any shared activity
- **Add Members**: Invite friends and manage group members
- **Real-time Updates**: All changes sync instantly across all group members

### Expense Tracking

- **Add Expenses**: Record expenses with amount, description, and date
- **Flexible Splitting**: Choose who paid and who shares the cost
- **Smart Payer Logic**: Payer can be included or excluded from the split
- **Edit & Delete**: Modify or remove expenses (only by the person who added them)

### Smart Settlement System

- **Automatic Calculation**: Instantly calculates who owes whom based on expenses
- **Settlement Generation**: Only users who participated in the same expenses can have settlements
- **Settle Up**: Mark settlements as paid with automatic balancing transactions
- **Real-time Balances**: All balances update instantly for everyone in the group

### Activity & Transparency

- **Activity Logs**: Complete history of all actions and changes in the group
- **Spending Summary**: Visual breakdown of expenses by member
- **Transaction History**: Track all expenses and settlements

---

## 💰 Expense Tracker Features

### Personal Expense Management

- **Quick Add**: Fast expense entry with voice input support
- **Category Tracking**: Organize expenses by categories (Food, Transport, Shopping, etc.)
- **Monthly View**: Navigate between months to review past spending
- **Edit & Delete**: Modify or remove expenses anytime

### Financial Overview

- **Monthly Statistics**: Comprehensive dashboard with key metrics
- **Savings Calculation**: Automatic calculation of savings (Income - Expenses - Fixed Costs - Investments)
- **Category Breakdown**: Visual breakdown of spending by category with percentages
- **Daily Average**: Track average daily spending
- **Biggest Expense**: Identify your largest expense of the month

### Income Management

- **Salary Tracking**: Set and manage monthly salary/income
- **Privacy Control**: Hide/show salary with a toggle for privacy
- **Monthly Instances**: Adjust income for specific months if needed

### Fixed Costs

- **Recurring Expenses**: Manage fixed monthly costs (Rent, Maid, Utilities, etc.)
- **Template System**: Create templates that auto-populate each month
- **Enable/Disable**: Toggle fixed costs on/off for specific months
- **Custom Amounts**: Override default amounts for any month

### Investments

- **Recurring Investments**: Track SIPs and regular investments (Mutual Funds, PPF, etc.)
- **One-Time Investments**: Record one-time investment transactions
- **Monthly Tracking**: Monitor investment amounts per month
- **Template Management**: Create and manage investment templates

### Activity & Insights

- **Activity Feed**: See all your expense-related activities in chronological order
- **Transaction List**: View all expenses in a detailed list format
- **Stats View**: Visual dashboard with charts and metrics
- **Month Comparison**: Compare spending across different months

---

## How It Works

### Expense Splitter - Settlement Flow

1. **Create a Group**: Set up a group and add members
2. **Add Expenses**: Enter expenses, specifying who paid and who shares the cost
3. **Automatic Calculation**: The app calculates balances for each group member
4. **Settlement Generation**: Only users who participated in the same expenses can have settlements between them
5. **Settle Up**: Click "Settle" to mark a payment as completed; a balancing transaction is created automatically
6. **Real-time Updates**: All balances and settlements update instantly for everyone in the group

### Expense Tracker - Financial Management

1. **Set Up Income**: Add your monthly salary/income
2. **Configure Fixed Costs**: Set up recurring expenses like rent, utilities
3. **Add Investments**: Track your SIPs and one-time investments
4. **Record Expenses**: Quickly add daily expenses with categories
5. **Monitor Savings**: View your savings calculated automatically (Income - Expenses - Fixed Costs - Investments)
6. **Analyze Spending**: Review category breakdowns and monthly trends

---

## Technology Stack

- **Frontend**: React 18 + TypeScript
- **Styling**: Tailwind CSS, Framer Motion
- **Backend**: Firebase Firestore (real-time database)
- **Authentication**: Firebase Auth (Google Sign-in)
- **Build Tool**: Vite
- **State Management**: React Hooks & Context API

---

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Firebase account

### Installation

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
   - Enable Firestore Database
   - Enable Google Authentication
   - Copy your Firebase config to `src/firebase.ts`
   - Set up Firestore security rules (see Firebase documentation)

4. **Configure environment variables**
   - Copy `.env.example` to `.env`
   - Add your Firebase configuration and other environment variables

5. **Run the development server**

   ```bash
   npm run dev
   ```

6. **Open your browser**
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
│   ├── AuthContext.tsx           # Authentication context provider
│   ├── useAuth.ts                # Custom hook for accessing auth context
│   ├── ExpenseTracker/           # Personal expense tracker components
│   │   ├── index.tsx             # Main tracker component
│   │   ├── QuickAddExpense.tsx   # Quick expense entry
│   │   ├── ExpenseList.tsx       # Expense list view
│   │   ├── MonthlyStats.tsx      # Statistics dashboard
│   │   ├── ActivityFeed.tsx      # Activity log
│   │   ├── FixedCostsManager.tsx # Fixed costs management
│   │   ├── SalaryManager.tsx     # Salary/income management
│   │   ├── InvestmentsManager.tsx # Investments management
│   │   └── ...
│   ├── GroupDetails/             # Group expense splitter components
│   │   ├── index.tsx             # Main group details component
│   │   ├── ExpenseForm.tsx       # Expense entry form
│   │   ├── ExpensesList.tsx      # Expenses list
│   │   ├── SettlementsList.tsx   # Settlements view
│   │   ├── SpendingSummary.tsx   # Spending breakdown
│   │   └── ...
│   ├── Groups.tsx                # Groups list component
│   ├── SignIn.tsx                # Sign-in component
│   └── ui/                       # Reusable UI components
├── services/                     # Firebase service functions
│   ├── personalExpenseStorage.ts
│   ├── fixedCostStorage.ts
│   ├── salaryStorage.ts
│   ├── investmentStorage.ts
│   └── ...
├── types/                        # TypeScript type definitions
│   ├── index.ts                  # Group expense types
│   └── personalExpense.ts        # Personal expense types
├── utils/                        # Utility functions
│   ├── expenseCalculations.ts    # Settlement calculations
│   ├── dateUtils.ts              # Date utilities
│   ├── speechParser.ts           # Voice input parsing
│   └── ...
├── firebase.ts                   # Firebase config and initialization
├── App.tsx                       # App root component
└── Index.tsx                     # Main app routing
```

---

## Key Features & Highlights

### Real-time Synchronization

- All changes sync instantly across devices and users
- No manual refresh needed
- Works seamlessly on mobile and desktop

### Privacy & Security

- Google OAuth authentication
- User-specific data isolation
- Secure Firebase rules

### Mobile Optimized

- Responsive design for all screen sizes
- Touch-friendly interface
- Optimized performance for mobile devices
- Service worker for offline support

### User Experience

- Modern, intuitive UI with smooth animations
- Quick expense entry with voice support
- Visual insights and statistics
- Activity logs for transparency

---

## Contributing

Pull requests are welcome! For major changes, please open an issue first to discuss what you would like to change.

---

## License

[Add your license here]

---

## Support

For issues, questions, or feature requests, please open an issue on GitHub.
