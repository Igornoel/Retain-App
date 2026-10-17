export type Role = 'user' | 'admin';
export interface User { id: string; name: string; email: string; role: Role; dateOfBirth: string | null }
export interface Category { id: string; name: string; color: string; icon: string }
export interface Expense { id: string; userId: string; title: string; amount: number; categoryId: string; date: string; paymentMethod: string; notes?: string }
export interface Budget { month: string; amount: number }
