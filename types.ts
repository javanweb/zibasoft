
export enum UserRole {
  OWNER = 'OWNER',
  MANAGER = 'MANAGER',
  STAFF = 'STAFF',
  CUSTOMER = 'CUSTOMER'
}

export interface UserProfile {
  name: string;
  phone: string;
}

export interface Service {
  id: string;
  name: string;
  price: number;
  durationMin: number;
  category: string;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
  category: string;
}

export interface Appointment {
  id: string;
  customerName: string;
  serviceId: string;
  serviceName: string; // Added for easier display
  staffName: string;   // Added for easier display
  date: string; // ISO string for the day
  time: string; // e.g. "14:30"
  status: 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';
  price?: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
  isThinking?: boolean;
}

export enum AppView {
  DASHBOARD = 'DASHBOARD',
  CALENDAR = 'CALENDAR',
  AI_CHAT = 'AI_CHAT',
  VOICE_AGENT = 'VOICE_AGENT', // Live API
  SMART_MIRROR = 'SMART_MIRROR', // Image Edit
  MAP_SEARCH = 'MAP_SEARCH', // Maps Grounding
  SERVICES = 'SERVICES',
  WALLET = 'WALLET',
  FAVORITES = 'FAVORITES',
  SUPPORT = 'SUPPORT'
}