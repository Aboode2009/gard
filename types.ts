export interface User {
  id: string;
  name: string;
  email: string;
  photoUrl: string;
}

export interface Shop {
  id: string;
  ownerId: string;
  name: string;
  description?: string;
  color: string;
  createdAt: number;
}

export interface Product {
  id: string;
  shopId: string; // Linked to a specific shop
  categoryId: string;
  name: string;
  quantity: number;
  price: number;
  image: string | null;
  description?: string;
  lastUpdated: number;
}

export interface Category {
  id: string;
  shopId: string; // Linked to a specific shop
  name: string;
  icon?: string;
  color?: string;
}

export interface AIPrediction {
  suggestedCategory: string;
  shortDescription: string;
}