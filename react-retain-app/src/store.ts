import { configureStore, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { Expense } from './types';
interface Filters { search: string; category: string; payment: string; from: string; to: string; sort: 'date-desc'|'date-asc'|'amount-desc'|'amount-asc' }
const initial: Filters = {search:'',category:'all',payment:'all',from:'',to:'',sort:'date-desc'};
const slice=createSlice({name:'filters',initialState:initial,reducers:{setSearch:(s,a:PayloadAction<string>)=>{s.search=a.payload},setCategory:(s,a:PayloadAction<string>)=>{s.category=a.payload},setPayment:(s,a:PayloadAction<string>)=>{s.payment=a.payload},setFrom:(s,a:PayloadAction<string>)=>{s.from=a.payload},setTo:(s,a:PayloadAction<string>)=>{s.to=a.payload},setSort:(s,a:PayloadAction<Filters['sort']>)=>{s.sort=a.payload},clearFilters:()=>initial}});
export const {setSearch,setCategory,setPayment,setFrom,setTo,setSort,clearFilters}=slice.actions;
export const store=configureStore({reducer:{filters:slice.reducer}});
export type RootState=ReturnType<typeof store.getState>; export type AppDispatch=typeof store.dispatch;
export function selectFilteredExpenses(expenses:Expense[],filters:Filters){return [...expenses].filter(e=>e.title.toLowerCase().includes(filters.search.toLowerCase())||e.notes?.toLowerCase().includes(filters.search.toLowerCase())).filter(e=>filters.category==='all'||e.categoryId===filters.category).filter(e=>filters.payment==='all'||e.paymentMethod===filters.payment).filter(e=>(!filters.from||e.date>=filters.from)&&(!filters.to||e.date<=filters.to)).sort((a,b)=>filters.sort==='date-asc'?a.date.localeCompare(b.date):filters.sort==='amount-desc'?b.amount-a.amount:filters.sort==='amount-asc'?a.amount-b.amount:b.date.localeCompare(a.date))}
