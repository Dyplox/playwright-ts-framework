import { expect, type APIRequestContext, type APIResponse } from '@playwright/test';
import type { z } from 'zod';
import {
  CartSchema,
  CreatedCartSchema,
  CreatedProductSchema,
  FavoriteSchema,
  InvoiceSchema,
  LoginResponseSchema,
  paginated,
  PostcodeLookupSchema,
  ProductSchema,
  UserSchema,
} from './schemas';
import type {
  Cart,
  CreatedProduct,
  Favorite,
  Invoice,
  LoginResponse,
  NewProduct,
  NewUser,
  Paginated,
  PostcodeLookup,
  Product,
  User,
} from './types';

type Query = Record<string, string | number | boolean>;

/**
 * Thin, typed client over Playwright's APIRequestContext.
 * Every call asserts the expected status AND parses the body with the consumer contract
 * (src/api/schemas.ts), so a broken precondition or a contract change fails at the API step,
 * not three UI steps later with a misleading error.
 */
export class ApiClient {
  constructor(
    private readonly request: APIRequestContext,
    private readonly apiURL: string,
    private token?: string,
  ) {}

  /** Returns a new client bound to a bearer token (immutable: the original stays anonymous). */
  withToken(token: string): ApiClient {
    return new ApiClient(this.request, this.apiURL, token);
  }

  // ---------- auth & users ----------
  async login(email: string, password: string): Promise<LoginResponse> {
    return this.post('/users/login', { email, password }, 200, LoginResponseSchema);
  }

  async registerUser(user: NewUser): Promise<User> {
    return this.post('/users/register', user, 201, UserSchema);
  }

  async me(): Promise<User> {
    return this.get('/users/me', UserSchema);
  }

  // ---------- catalog ----------
  async listProducts(query: Query = {}): Promise<Paginated<Product>> {
    return this.get('/products', paginated(ProductSchema), query);
  }

  async getProduct(id: string): Promise<Product> {
    return this.get(`/products/${id}`, ProductSchema);
  }

  async searchProducts(q: string): Promise<Paginated<Product>> {
    return this.get('/products/search', paginated(ProductSchema), { q });
  }

  /** Admin only: create a product. */
  async createProduct(product: NewProduct): Promise<CreatedProduct> {
    return this.post('/products', product, 201, CreatedProductSchema);
  }

  /** Admin only: delete a product. */
  async deleteProduct(id: string): Promise<void> {
    const response = await this.request.delete(`${this.apiURL}/products/${id}`, { headers: this.headers() });
    expect(response.status(), `DELETE /products/${id} -> ${await response.text()}`).toBe(204);
  }

  // ---------- favorites ----------
  async addFavorite(productId: string): Promise<Favorite> {
    return this.post('/favorites', { product_id: productId }, 201, FavoriteSchema);
  }

  async listFavorites(): Promise<Favorite[]> {
    return this.get('/favorites', FavoriteSchema.array());
  }

  // ---------- address lookup ----------
  async postcodeLookup(
    country: string,
    postcode: string,
    houseNumber?: string | null,
  ): Promise<PostcodeLookup> {
    return this.get('/postcode-lookup', PostcodeLookupSchema, {
      country,
      postcode,
      ...(houseNumber ? { house_number: houseNumber } : {}),
    });
  }

  // ---------- invoices ----------
  async listInvoices(page = 1): Promise<Paginated<Invoice>> {
    return this.get('/invoices', paginated(InvoiceSchema), { page });
  }

  // ---------- cart ----------
  async createCart(): Promise<{ id: string }> {
    return this.post('/carts', {}, 201, CreatedCartSchema);
  }

  async addToCart(cartId: string, productId: string, quantity = 1): Promise<void> {
    await this.post(`/carts/${cartId}`, { product_id: productId, quantity }, 200);
  }

  async getCart(cartId: string): Promise<Cart> {
    return this.get(`/carts/${cartId}`, CartSchema);
  }

  // ---------- plumbing ----------
  /** Raw access for negative/contract tests that need the untouched response. */
  async raw(method: 'GET' | 'POST' | 'DELETE', path: string, data?: unknown): Promise<APIResponse> {
    return this.request.fetch(`${this.apiURL}${path}`, {
      method,
      headers: this.headers(),
      ...(data === undefined ? {} : { data }),
    });
  }

  private headers(): Record<string, string> {
    return {
      Accept: 'application/json',
      ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
    };
  }

  private async get<S extends z.ZodType>(path: string, schema: S, params?: Query): Promise<z.infer<S>> {
    const response = await this.request.get(`${this.apiURL}${path}`, {
      headers: this.headers(),
      ...(params ? { params } : {}),
    });
    return this.parse(response, 200, `GET ${path}`, schema);
  }

  private async post<S extends z.ZodType>(
    path: string,
    data: unknown,
    expected: number,
    schema?: S,
  ): Promise<z.infer<S>> {
    const response = await this.request.post(`${this.apiURL}${path}`, { headers: this.headers(), data });
    return this.parse(response, expected, `POST ${path}`, schema);
  }

  private async parse<S extends z.ZodType>(
    response: APIResponse,
    expected: number,
    label: string,
    schema?: S,
  ): Promise<z.infer<S>> {
    expect(response.status(), `${label} -> ${await response.text()}`).toBe(expected);
    const body: unknown = await response.json();
    if (!schema) return body as z.infer<S>;
    const result = schema.safeParse(body);
    if (!result.success) {
      throw new Error(`Contract violation in ${label}:\n${result.error.issues.map(formatIssue).join('\n')}`);
    }
    return result.data;
  }
}

function formatIssue(issue: z.core.$ZodIssue): string {
  return `  - ${issue.path.join('.') || '(root)'}: ${issue.message}`;
}
