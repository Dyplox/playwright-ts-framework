import type { z } from 'zod';
import type {
  AddressSchema,
  BrandSchema,
  CartSchema,
  CategorySchema,
  CreatedProductSchema,
  FavoriteSchema,
  InvoiceSchema,
  LoginResponseSchema,
  PostcodeLookupSchema,
  ProductSchema,
  UserSchema,
} from './schemas';

/** Response types are inferred from the consumer contract (src/api/schemas.ts). */
export type Brand = z.infer<typeof BrandSchema>;
export type Category = z.infer<typeof CategorySchema>;
export type Product = z.infer<typeof ProductSchema>;
export type CreatedProduct = z.infer<typeof CreatedProductSchema>;
export type User = z.infer<typeof UserSchema>;
export type LoginResponse = z.infer<typeof LoginResponseSchema>;
export type Favorite = z.infer<typeof FavoriteSchema>;
export type Cart = z.infer<typeof CartSchema>;
export type Invoice = z.infer<typeof InvoiceSchema>;
export type PostcodeLookup = z.infer<typeof PostcodeLookupSchema>;
export type ResponseAddress = z.infer<typeof AddressSchema>;

export interface Paginated<T> {
  current_page: number;
  data: T[];
  from: number | null;
  last_page: number;
  per_page: number;
  to: number | null;
  total: number;
}

/** Request payloads (what the framework sends). */
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

export interface NewProduct {
  name: string;
  description: string;
  price: number;
  category_id: string;
  brand_id: string;
  product_image_id: string;
  is_location_offer: boolean;
  is_rental: boolean;
}
