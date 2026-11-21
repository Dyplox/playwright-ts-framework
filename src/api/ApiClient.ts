import { expect, type APIRequestContext, type APIResponse } from '@playwright/test';
import type {
  Cart,
  Favorite,
  Invoice,
  LoginResponse,
  NewUser,
  Paginated,
  PostcodeLookup,
  Product,
  User,
} from './types';

type Query = Record<string, string | number | boolean>;

/**
 * Thin, typed client over Playwright's APIRequestContext.
 * Every call asserts the expected status so a broken precondition fails at the API step,
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
    return this.post<LoginResponse>('/users/login', { email, password }, 200);
  }

  async registerUser(user: NewUser): Promise<User> {
    return this.post<User>('/users/register', user, 201);
  }

  async me(): Promise<User> {
    return this.get<User>('/users/me');
  }

  // ---------- catalog ----------
  async listProducts(query: Query = {}): Promise<Paginated<Product>> {
    return this.get<Paginated<Product>>('/products', query);
  }

  async getProduct(id: string): Promise<Product> {
    return this.get<Product>(`/products/${id}`);
  }

  async searchProducts(q: string): Promise<Paginated<Product>> {
    return this.get<Paginated<Product>>('/products/search', { q });
  }

  // ---------- favorites ----------
  async addFavorite(productId: string): Promise<Favorite> {
    return this.post<Favorite>('/favorites', { product_id: productId }, 201);
  }

  async listFavorites(): Promise<Favorite[]> {
    return this.get<Favorite[]>('/favorites');
  }

  // ---------- address lookup ----------
  async postcodeLookup(country: string, postcode: string, houseNumber?: string): Promise<PostcodeLookup> {
    return this.get<PostcodeLookup>('/postcode-lookup', {
      country,
      postcode,
      ...(houseNumber ? { house_number: houseNumber } : {}),
    });
  }

  // ---------- invoices ----------
  async listInvoices(): Promise<Paginated<Invoice>> {
    return this.get<Paginated<Invoice>>('/invoices');
  }

  // ---------- cart ----------
  async createCart(): Promise<{ id: string }> {
    return this.post<{ id: string }>('/carts', {}, 201);
  }

  async addToCart(cartId: string, productId: string, quantity = 1): Promise<void> {
    await this.post(`/carts/${cartId}`, { product_id: productId, quantity }, 200);
  }

  async getCart(cartId: string): Promise<Cart> {
    return this.get<Cart>(`/carts/${cartId}`);
  }

  // ---------- plumbing ----------
  private headers(): Record<string, string> {
    return {
      Accept: 'application/json',
      ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
    };
  }

  private async get<T>(path: string, params?: Query): Promise<T> {
    const response = await this.request.get(`${this.apiURL}${path}`, {
      headers: this.headers(),
      ...(params ? { params } : {}),
    });
    return this.parse<T>(response, 200, `GET ${path}`);
  }

  private async post<T = unknown>(path: string, data: unknown, expected: number): Promise<T> {
    const response = await this.request.post(`${this.apiURL}${path}`, { headers: this.headers(), data });
    return this.parse<T>(response, expected, `POST ${path}`);
  }

  private async parse<T>(response: APIResponse, expected: number, label: string): Promise<T> {
    expect(response.status(), `${label} -> ${await response.text()}`).toBe(expected);
    return (await response.json()) as T;
  }
}
