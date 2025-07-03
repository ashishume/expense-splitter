export interface User {
  id: string;
  name: string;
  email?: string;
  groups?: string[];
  createdAt?: string;
  lastLogin?: string;
}

export interface Group {
  id: string;
  name: string;
  members: string[];
  createdAt: string;
}

export interface Expense {
  id: string;
  paidBy: string;
  paidByName: string;
  amount: number;
  description: string;
  splitWith: string[];
  date: string;
  groupId?: string;
  isSettlement?: boolean;
}

export interface Settlement {
  id: string;
  from: string;
  fromName: string;
  to: string;
  toName: string;
  amount: number;
  groupId?: string;
  date: string;
}
