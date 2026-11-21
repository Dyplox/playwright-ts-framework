import type { OpenApiContract } from './openapi';

/**
 * Known gaps between what the API does and what its OpenAPI document says.
 * Same policy as the accessibility exceptions: each gap is specific, explained, and a test
 * fails when it stops reproducing (so the list never hides future regressions).
 */
export type ContractGap =
  | {
      kind: 'undocumented-status';
      method: 'get' | 'post';
      path: string;
      status: number;
      note: string;
    }
  | {
      kind: 'schema';
      method: 'get' | 'post';
      path: string;
      status: number;
      /** Substring of the Ajv error that is tolerated, e.g. "/from must be integer". */
      error: string;
      note: string;
    };

export const CONTRACT_GAPS: readonly ContractGap[] = [
  {
    kind: 'undocumented-status',
    method: 'post',
    path: '/users/login',
    status: 401,
    note: 'Wrong credentials return 401 {"error":"Unauthorized"}, but the spec only documents 200.',
  },
  {
    kind: 'undocumented-status',
    method: 'post',
    path: '/users/register',
    status: 422,
    note: 'Validation errors return 422 {field: [messages]}; the spec documents 400/409 but not 422.',
  },
  {
    kind: 'schema',
    method: 'get',
    path: '/invoices',
    status: 200,
    error: '/from must be integer',
    note: 'An empty page returns "from": null and "to": null; the spec types both as integer.',
  },
  {
    kind: 'schema',
    method: 'get',
    path: '/invoices',
    status: 200,
    error: '/to must be integer',
    note: 'An empty page returns "from": null and "to": null; the spec types both as integer.',
  },
];

/** Removes the validation errors covered by a documented schema gap. */
export function withoutKnownGaps(method: string, path: string, status: number, errors: string[]): string[] {
  const tolerated = CONTRACT_GAPS.filter(
    (g) => g.kind === 'schema' && g.method === method && g.path === path && g.status === status,
  ).map((g) => (g.kind === 'schema' ? g.error : ''));
  return errors.filter((e) => !tolerated.some((t) => e.includes(t)));
}

/** True while the API still deviates from its spec in the way the gap describes. */
export function stillReproduces(gap: ContractGap, contract: OpenApiContract, body: unknown): boolean {
  if (gap.kind === 'undocumented-status') {
    return !contract.documentedStatuses(gap.method, gap.path).includes(String(gap.status));
  }
  return contract.validate(gap.method, gap.path, gap.status, body).some((e) => e.includes(gap.error));
}
