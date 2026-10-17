import type { Budget, Category, Expense, User } from './types';

const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:3001/api').replace(/\/$/, '');
const TOKEN_KEY = 'retain.token';

export function getToken() { return localStorage.getItem(TOKEN_KEY); }
export function setToken(token: string | null) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  const token = getToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, { ...init, headers });
  } catch {
    throw new Error('Cannot reach the Retain API. Start it with npm run server and try again.');
  }
  if (!response.ok) {
    const body = await response.json().catch(() => ({})) as { error?: string };
    throw new Error(body.error || `Request failed (${response.status})`);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export interface AuthResult { token: string; user: User }
export interface ExpensePage { items: Expense[]; total: number; page: number; pages: number }
export interface AdminInsights {
  users: number; expenses: number; totalValue: number; currentMonthExpenses: number;
  spendingByCategory: (Category & { count: number; total: number })[];
  topCategories: (Category & { count: number; total: number })[];
  leastUsed: (Category & { count: number; total: number })[];
  recentExpenses: Expense[]; recentUsers: User[];
}

export const api = {
  signup: (name: string, email: string, password: string, dateOfBirth: string, monthlyBudget: number) => request<AuthResult>('/auth/signup', { method: 'POST', body: JSON.stringify({ name, email, password, dateOfBirth, monthlyBudget }) }),
  login: (email: string, password: string) => request<AuthResult>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  me: () => request<User>('/auth/me'),
  updateProfile: (profile: { name: string; dateOfBirth: string }) => request<User>('/auth/profile', { method: 'PATCH', body: JSON.stringify(profile) }),
  logout: () => request<void>('/auth/logout', { method: 'POST' }),
  expenses: (params = 'page=1&limit=100') => request<ExpensePage>(`/expenses?${params}`),
  allExpenses: async () => {
    const first = await request<ExpensePage>('/expenses?page=1&limit=100');
    const items = [...first.items];
    for (let page = 2; page <= first.pages; page += 1) {
      const next = await request<ExpensePage>(`/expenses?page=${page}&limit=100`);
      items.push(...next.items);
    }
    return items;
  },
  createExpense: (expense: Omit<Expense, 'id'>) => request<Expense>('/expenses', { method: 'POST', body: JSON.stringify(expense) }),
  updateExpense: (expense: Expense) => request<Expense>(`/expenses/${encodeURIComponent(expense.id)}`, { method: 'PATCH', body: JSON.stringify(expense) }),
  deleteExpense: (id: string) => request<void>(`/expenses/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  budget: (month: string) => request<Budget>(`/budgets/${encodeURIComponent(month)}`),
  saveBudget: (month: string, amount: number) => request<Budget>(`/budgets/${encodeURIComponent(month)}`, { method: 'PUT', body: JSON.stringify({ amount }) }),
  categories: () => request<Category[]>('/categories'),
  createCategory: (name: string) => request<Category>('/categories', { method: 'POST', body: JSON.stringify({ name }) }),
  updateCategory: (category: Category) => request<Category>(`/categories/${encodeURIComponent(category.id)}`, { method: 'PATCH', body: JSON.stringify({ name: category.name, color: category.color }) }),
  deleteCategory: (id: string) => request<void>(`/categories/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  adminInsights: () => request<AdminInsights>('/admin/insights'),
};
