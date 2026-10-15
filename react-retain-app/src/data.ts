import type { Category, Expense } from './types';
export const categories: Category[] = [
  { id: 'food', name: 'Food & drink', color: '#e9a77d', icon: 'fork' }, { id: 'transport', name: 'Transport', color: '#86a8a3', icon: 'car' },
  { id: 'shopping', name: 'Shopping', color: '#b7a0c9', icon: 'bag' }, { id: 'bills', name: 'Bills & utilities', color: '#e0c16f', icon: 'bolt' },
  { id: 'health', name: 'Health', color: '#d88c91', icon: 'heart' }, { id: 'entertainment', name: 'Entertainment', color: '#7f9ac5', icon: 'play' },
  { id: 'home', name: 'Home', color: '#91ad78', icon: 'home' }, { id: 'other', name: 'Other', color: '#9ca3af', icon: 'dots' }
];
const today = new Date();
const day = (n: number) => new Date(today.getFullYear(), today.getMonth(), n).toISOString().slice(0, 10);
export const seedExpenses: Expense[] = [
  {id:'e1',userId:'demo',title:'Sunday brunch',amount:32.5,categoryId:'food',date:day(10),'paymentMethod':'Card',notes:'With Maya'},
  {id:'e2',userId:'demo',title:'Monthly groceries',amount:86.2,categoryId:'food',date:day(9),paymentMethod:'Card'},
  {id:'e3',userId:'demo',title:'Metro pass',amount:48,categoryId:'transport',date:day(8),paymentMethod:'Card'},
  {id:'e4',userId:'demo',title:'New linen shirt',amount:64,categoryId:'shopping',date:day(7),paymentMethod:'Card'},
  {id:'e5',userId:'demo',title:'Electricity bill',amount:72.35,categoryId:'bills',date:day(6),paymentMethod:'Bank transfer'},
  {id:'e6',userId:'demo',title:'Coffee & croissant',amount:8.75,categoryId:'food',date:day(5),paymentMethod:'Cash'},
  {id:'e7',userId:'demo',title:'Yoga class',amount:18,categoryId:'health',date:day(4),paymentMethod:'Card'},
  {id:'e8',userId:'demo',title:'Cinema tickets',amount:27,categoryId:'entertainment',date:day(3),paymentMethod:'Card'},
  {id:'e9',userId:'demo',title:'Ride home',amount:14.4,categoryId:'transport',date:day(2),paymentMethod:'Mobile money'},
  {id:'e10',userId:'demo',title:'House plants',amount:22,categoryId:'home',date:day(1),paymentMethod:'Cash'}
];
