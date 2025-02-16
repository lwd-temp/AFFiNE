import type { UserFriendlyError } from '@affine/graphql';

export class NetworkError extends Error {
  constructor(
    public readonly originError: Error,
    public readonly status?: number
  ) {
    super(`Network error: ${originError.message}`);
    this.stack = originError.stack;
  }
}

export function isNetworkError(error: Error): error is NetworkError {
  return error instanceof NetworkError;
}

export class BackendError extends Error {
  get status() {
    return this.originError.status;
  }

  constructor(public readonly originError: UserFriendlyError) {
    super(`Server error: ${originError.message}`);
    this.stack = originError.stack;
  }
}

export function isBackendError(error: Error): error is BackendError {
  return error instanceof BackendError;
}
