/** Subset of the Toolshop API contract used by the framework. */

export interface Paginated<T> {
  current_page: number;
  data: T[];
  from: number | null;
  last_page: number;
  per_page: number;
  to: number | null;
  total: number;
}

export interface Brand {
  id: string;
  name: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  parent_id: string | null;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  is_location_offer: boolean;
  is_rental: boolean;
  in_stock: boolean;
  is_eco_friendly?: boolean;
  co2_rating?: string;
  brand: Brand;
  category: Category;
}

export interface Address {
  street: string;
  house_number?: string;
  city: string;
  state: string;
  country: string;
  postal_code: string;
}

export interface NewUser {
  first_name: string;
  last_name: string;
  address: Address;
  phone: string;
  dob: string;
  email: string;
  password: string;
}

export interface User extends Omit<NewUser, 'password'> {
  id: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

export interface Favorite {
  id: string;
  product_id: string;
  product?: Product;
}

export interface Cart {
  id: string;
  cart_items: Array<{ id: string; quantity: number; product_id: string; product?: Product }>;
}
