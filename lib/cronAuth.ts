import { getCronSecret } from "@/lib/env";

export class CronAuthorizationError extends Error {
  readonly status: number;

  constructor(message: string, status = 401) {
    super(message);
    this.name = "CronAuthorizationError";
    this.status = status;
  }
}

export function getCronAuthorizationToken(request: Request): string | null {
  const headerValue = request.headers.get("x-cron-secret")?.trim();
  if (headerValue) {
    return headerValue;
  }

  const authorization = request.headers.get("authorization")?.trim();
  if (!authorization) {
    return null;
  }

  const [scheme, token] = authorization.split(/\s+/, 2);
  if (scheme?.toLowerCase() !== "bearer" || !token?.trim()) {
    return null;
  }

  return token.trim();
}

export function assertAuthorizedCronRequest(request: Request): void {
  const secret = getCronSecret();

  if (!secret) {
    throw new CronAuthorizationError("CRON_SECRET is not configured", 500);
  }

  const token = getCronAuthorizationToken(request);
  if (token !== secret) {
    throw new CronAuthorizationError("Unauthorized cron request", 401);
  }
}

export function isCronAuthorizationError(error: unknown): error is CronAuthorizationError {
  return error instanceof CronAuthorizationError;
}
