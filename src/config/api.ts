import { getV1GatewayBaseUrl } from "../services/v1Api";

function trimTrailingSlashes(value: string): string {
  return value.replace(/\/+$/, "");
}

export function getRequiredV1GatewayBaseUrl(): string {
  const base = getV1GatewayBaseUrl();
  if (!base) {
    throw new Error(
      "API base URL is not configured. Set `VITE_API_URL` (or `VITE_API_V1_URL`) in your `.env` file.",
    );
  }
  return trimTrailingSlashes(base);
}

export function v1ApiUrl(path: string): string {
  const base = getRequiredV1GatewayBaseUrl();
  const normalized = path.startsWith("/") ? path : `/${path}`;
  const withV1 = normalized.startsWith("/v1/")
    ? normalized
    : `/v1${normalized}`;
  return `${base}${withV1}`;
}
