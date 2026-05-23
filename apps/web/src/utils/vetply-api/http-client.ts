import { vetplyBusinessErrorBodySchema } from '@vetply/shared';
import axios, { isAxiosError } from 'axios';
import { toast } from 'sonner';
import { getPublicApiBaseUrl } from './base-url';
import { VetplyBadRequestError } from './vetply-bad-request-error';
import { VETPLY_ACCESS_TOKEN_KEY } from './storage';

const UNEXPECTED_MESSAGE =
  'Something unexpected happened. Please try again or contact support.';

export function vetplyApiUnexpectedErrorToastShown(err: unknown): boolean {
  if (!isAxiosError(err)) {
    return true;
  }
  const status = err.response?.status;
  const data = err.response?.data;
  if (status === 400 && data !== undefined && typeof data === 'object') {
    const parsed = vetplyBusinessErrorBodySchema.safeParse(data);
    if (parsed.success) {
      return false;
    }
  }
  if (status !== undefined && status >= 500) {
    return true;
  }
  if (err.response === undefined) {
    return true;
  }
  return false;
}

function readStoredToken(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }
  return localStorage.getItem(VETPLY_ACCESS_TOKEN_KEY);
}

export const vetplyApiClient = axios.create({
  baseURL: getPublicApiBaseUrl(),
});

vetplyApiClient.interceptors.request.use((config) => {
  const token = readStoredToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

vetplyApiClient.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (!isAxiosError(error)) {
      toast.error(UNEXPECTED_MESSAGE);
      return Promise.reject(error);
    }

    const status = error.response?.status;
    const data = error.response?.data;

    if (status === 400 && data !== undefined && typeof data === 'object') {
      const parsed = vetplyBusinessErrorBodySchema.safeParse(data);
      if (parsed.success) {
        return Promise.reject(
          new VetplyBadRequestError(parsed.data.failReason),
        );
      }
    }

    if (status !== undefined && status >= 500) {
      toast.error(UNEXPECTED_MESSAGE);
      return Promise.reject(error);
    }

    if (error.response === undefined) {
      toast.error(UNEXPECTED_MESSAGE);
      return Promise.reject(error);
    }

    return Promise.reject(error);
  },
);
