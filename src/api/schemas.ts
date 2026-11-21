import { z } from 'zod';

/**
 * Consumer contract: the shape of every API response the framework relies on.
 *
 * - `ApiClient` parses each response with these schemas, so every test that touches the API
 *   also checks the contract (a renamed or retyped field fails at the API step, not three UI
 *   steps later).
 * - TypeScript types are inferred from them (src/api/types.ts): one source of truth.
 * - Objects are not strict and list only the fields the framework actually reads: the provider may
 *   add (or drop unused) fields without breaking this consumer.
 *
 * The provider's own OpenAPI spec is checked separately in tests/api/contract.spec.ts.
 */

export const BrandSchema = z.object({ id: z.string(), name: z.string() });

export const CategorySchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string().optional(),
});

export const ProductSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  price: z.number().nonnegative(),
  is_location_offer: z.boolean(),
  is_rental: z.boolean(),
  in_stock: z.boolean(),
  is_eco_friendly: z.boolean().optional(),
  co2_rating: z.string().optional(),
  brand: BrandSchema,
  category: CategorySchema,
  product_image: z.object({ id: z.string() }).optional(),
});

/** POST /products echoes the stored fields (relations are not expanded). */
export const CreatedProductSchema = z.object({ id: z.string(), name: z.string(), price: z.number() });

export const paginated = <T extends z.ZodType>(item: T) =>
  z.object({
    current_page: z.number().int().positive(),
    data: z.array(item),
    from: z.number().int().nullable(),
    last_page: z.number().int().positive(),
    per_page: z.number().int().positive(),
    to: z.number().int().nullable(),
    total: z.number().int().nonnegative(),
  });

export const AddressSchema = z.object({
  street: z.string().nullable(),
  house_number: z.string().nullable().optional(),
  city: z.string().nullable(),
  state: z.string().nullable(),
  country: z.string().nullable(),
  postal_code: z.string().nullable(),
});

export const UserSchema = z.object({
  id: z.string(),
  first_name: z.string(),
  last_name: z.string(),
  email: z.email(),
  phone: z.string().nullable().optional(),
  dob: z.string().nullable().optional(),
  address: AddressSchema,
});

export const LoginResponseSchema = z.object({
  access_token: z.string().min(20),
  token_type: z.string(),
  expires_in: z.number().positive(),
});

export const FavoriteSchema = z.object({
  id: z.string(),
  product_id: z.string(),
  product: ProductSchema.partial().optional(),
});

export const CreatedCartSchema = z.object({ id: z.string() });

export const CartSchema = z.object({
  id: z.string(),
  cart_items: z.array(
    z.object({
      id: z.string(),
      quantity: z.number().int().positive(),
      product_id: z.string(),
      product: ProductSchema.partial().optional(),
    }),
  ),
});

export const InvoiceSchema = z.object({
  id: z.string(),
  invoice_number: z.string().regex(/^INV-\d+$/),
  invoice_date: z.string(),
  status: z.string(),
  total: z.number().nullable(),
  billing_street: z.string(),
  billing_city: z.string(),
  billing_country: z.string(),
});

export const PostcodeLookupSchema = z.object({
  street: z.string(),
  house_number: z.string(),
  city: z.string(),
  state: z.string(),
  country: z.string(),
  postcode: z.string(),
});

export const StatusSchema = z.object({ version: z.string(), app_name: z.string() });

// ---- Error contracts -------------------------------------------------------------------

/** Toolshop validation errors: `{ field: ["message", ...] }` (not Laravel's default envelope). */
export const ValidationErrorSchema = z.record(z.string(), z.array(z.string()).nonempty());

/** 401 bodies come in two shapes depending on the endpoint. */
export const UnauthorizedSchema = z.union([
  z.object({ message: z.literal('Unauthorized') }),
  z.object({ error: z.literal('Unauthorized') }),
]);
