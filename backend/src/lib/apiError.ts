export class ApiError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export function notFound(message = 'Resource không tồn tại') {
  return new ApiError(404, 'NOT_FOUND', message);
}

export function invalidInput(message = 'Dữ liệu đầu vào không hợp lệ') {
  return new ApiError(422, 'INVALID_INPUT', message);
}

export function conflict(code: string, message: string) {
  return new ApiError(409, code, message);
}
