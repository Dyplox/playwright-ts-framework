import 'dotenv/config';

/**
 * Multi-environment configuration.
 *
 * `local`  -> Toolshop running in Docker (docker compose of testsmith-io/practice-software-testing).
 *             Deterministic data, safe for parallel shards, visual and Lighthouse budgets.
 * `public` -> https://practicesoftwaretesting.com (shared instance). Used for smoke only.
 *
 * Any value can be overridden with BASE_URL / API_URL.
 */
export type EnvName = 'local' | 'public';

export interface Credentials {
  email: string;
  password: string;
}

export interface EnvConfig {
  name: EnvName;
  baseURL: string;
  apiURL: string;
  /**
   * True for private environments (local Docker): tests may create users, products and orders.
   * False for shared instances: tests reuse seeded accounts and never write catalog data.
   */
  ownsData: boolean;
  /** Seeded accounts shipped with Toolshop. Used when registering users is not appropriate. */
  seededCustomers: Credentials[];
  admin: Credentials;
}

const SEEDED_PASSWORD = 'welcome01';

const seededCustomers: Credentials[] = [
  { email: 'customer@practicesoftwaretesting.com', password: SEEDED_PASSWORD },
  { email: 'customer2@practicesoftwaretesting.com', password: SEEDED_PASSWORD },
  { email: 'customer3@practicesoftwaretesting.com', password: 'pass123' },
];

const admin: Credentials = { email: 'admin@practicesoftwaretesting.com', password: SEEDED_PASSWORD };

const environments: Record<EnvName, Omit<EnvConfig, 'name'>> = {
  local: {
    baseURL: 'http://localhost:4200',
    apiURL: 'http://localhost:8091',
    ownsData: true,
    seededCustomers,
    admin,
  },
  public: {
    baseURL: 'https://practicesoftwaretesting.com',
    apiURL: 'https://api.practicesoftwaretesting.com',
    // Be a good citizen on the shared instance: reuse seeded accounts instead of creating users.
    ownsData: false,
    seededCustomers,
    admin,
  },
};

function resolveEnvName(raw: string | undefined): EnvName {
  const name = (raw ?? 'local').toLowerCase();
  if (name !== 'local' && name !== 'public') {
    throw new Error(`Unknown TEST_ENV "${raw}". Valid values: local, public.`);
  }
  return name;
}

const name = resolveEnvName(process.env.TEST_ENV);

export const env: EnvConfig = {
  name,
  ...environments[name],
  baseURL: process.env.BASE_URL ?? environments[name].baseURL,
  apiURL: process.env.API_URL ?? environments[name].apiURL,
};
