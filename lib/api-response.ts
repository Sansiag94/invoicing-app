import { NextResponse } from "next/server";
import { validateRequiredEnv } from "@/lib/env";

validateRequiredEnv();

type ApiErrorCode =
  | "bad_request"
  | "payment_required"
  | "unauthorized"
  | "forbidden"
  | "not_found"
  | "method_not_allowed"
  | "conflict"
  | "unprocessable_entity"
  | "too_many_requests"
  | "internal_error"
  | "bad_gateway"
  | "service_unavailable";

function statusToCode(status: number): ApiErrorCode {
  switch (status) {
    case 400:
      return "bad_request";
    case 402:
      return "payment_required";
    case 401:
      return "unauthorized";
    case 403:
      return "forbidden";
    case 404:
      return "not_found";
    case 405:
      return "method_not_allowed";
    case 409:
      return "conflict";
    case 422:
      return "unprocessable_entity";
    case 429:
      return "too_many_requests";
    case 502:
      return "bad_gateway";
    case 503:
      return "service_unavailable";
    default:
      return "internal_error";
  }
}

export function apiError(
  message: string,
  status = 500,
  options?: { code?: ApiErrorCode; details?: unknown }
) {
  const payload: {
    ok: false;
    error: string;
    code: ApiErrorCode;
    details?: unknown;
  } = {
    ok: false,
    error: message,
    code: options?.code ?? statusToCode(status),
  };

  if (typeof options?.details !== "undefined") {
    payload.details = options.details;
  }

  return NextResponse.json(payload, { status });
}
