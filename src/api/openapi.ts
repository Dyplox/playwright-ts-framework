import Ajv2020, { type ErrorObject, type ValidateFunction } from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

type HttpMethod = 'get' | 'post' | 'put' | 'patch' | 'delete' | 'query';

export interface OpenApiDocument {
  openapi: string;
  paths: Record<string, Partial<Record<HttpMethod, { responses?: Record<string, unknown> }>>>;
  components?: Record<string, Record<string, unknown>>;
}

const SPEC_ID = 'openapi.json';

/**
 * Provider contract: validates real responses against the OpenAPI document the API publishes
 * (Toolshop serves it at /docs). Uses JSON Schema 2020-12, the dialect of OpenAPI 3.1+.
 */
export class OpenApiContract {
  private readonly ajv: Ajv2020;
  private readonly cache = new Map<string, ValidateFunction>();

  constructor(private readonly spec: OpenApiDocument) {
    // `strict: false`: OpenAPI adds keywords (example, xml, discriminator...) unknown to JSON Schema.
    this.ajv = new Ajv2020({ strict: false, allErrors: true });
    addFormats(this.ajv);
    this.ajv.addSchema(spec, SPEC_ID);
  }

  get version(): string {
    return this.spec.openapi;
  }

  hasOperation(method: HttpMethod, path: string): boolean {
    return Boolean(this.spec.paths[path]?.[method]);
  }

  /** Status codes documented for an operation, e.g. ["200", "401"]. */
  documentedStatuses(method: HttpMethod, path: string): string[] {
    return Object.keys(this.spec.paths[path]?.[method]?.responses ?? {});
  }

  /**
   * Validates a body against the documented schema for method + path + status.
   * Returns human-readable errors (empty array = valid).
   */
  validate(method: HttpMethod, path: string, status: number, body: unknown): string[] {
    const validator = this.validatorFor(method, path, status);
    if (validator(body)) return [];
    return (validator.errors ?? []).map(formatError);
  }

  private validatorFor(method: HttpMethod, path: string, status: number): ValidateFunction {
    const key = `${method} ${path} ${status}`;
    const cached = this.cache.get(key);
    if (cached) return cached;

    const operation = this.spec.paths[path]?.[method];
    if (!operation)
      throw new Error(`Contract violation: ${method.toUpperCase()} ${path} is not in the OpenAPI spec`);
    let response = operation.responses?.[String(status)];
    if (!response) {
      throw new Error(`Contract violation: ${status} is not documented for ${method.toUpperCase()} ${path}`);
    }
    response = this.deref(response);
    const schema = (response as { content?: Record<string, { schema?: unknown }> }).content?.[
      'application/json'
    ]?.schema;
    if (!schema) throw new Error(`${key}: documented without an application/json schema`);

    const validator = this.ajv.compile(rebase(schema) as object);
    this.cache.set(key, validator);
    return validator;
  }

  /** Resolves a `#/components/...` reference inside the spec (used for shared responses). */
  private deref(node: unknown): unknown {
    const ref = (node as { $ref?: string }).$ref;
    if (!ref) return node;
    return ref
      .replace(/^#\//, '')
      .split('/')
      .reduce<unknown>((acc, part) => (acc as Record<string, unknown>)[part], this.spec);
  }
}

/** Local refs ("#/components/...") must point into the registered spec document. */
function rebase(schema: unknown): unknown {
  if (Array.isArray(schema)) return schema.map(rebase);
  if (schema && typeof schema === 'object') {
    return Object.fromEntries(
      Object.entries(schema).map(([k, v]) =>
        k === '$ref' && typeof v === 'string' && v.startsWith('#/') ? [k, `${SPEC_ID}${v}`] : [k, rebase(v)],
      ),
    );
  }
  return schema;
}

function formatError(e: ErrorObject): string {
  return `${e.instancePath || '(root)'} ${e.message ?? ''}${e.params ? ` ${JSON.stringify(e.params)}` : ''}`;
}
