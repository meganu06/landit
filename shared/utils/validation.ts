import { VALID_EMAIL_DOMAIN, MIN_PASSWORD_LENGTH, CV_ALLOWED_MIME_TYPES, CV_MAX_FILE_SIZE_BYTES, CV_MIN_TEXT_LENGTH } from './constants';
import type { RegisterRequest, LoginRequest } from '../types/user.types';
import type { CreatePlacementRequest } from '../types/placement.types';

export function validateEmail(email: string): string | null {
  if (!email) return 'Email is required';
  if (!email.includes('@')) return 'Invalid email format';
  if (!email.endsWith(VALID_EMAIL_DOMAIN)) {
    return `Only University of Bath email addresses (${VALID_EMAIL_DOMAIN}) are allowed`;
  }
  return null;
}

export function validatePassword(password: string): string | null {
  if (!password) return 'Password is required';
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters`;
  }
  return null;
}

export function validateRegisterRequest(body: Partial<RegisterRequest>): string | null {
  if (!body.email || !body.password || !body.first_name || !body.last_name) {
    return 'email, password, first_name, and last_name are required';
  }
  return validateEmail(body.email) ?? validatePassword(body.password);
}

export function validateLoginRequest(body: Partial<LoginRequest>): string | null {
  if (!body.email || !body.password) {
    return 'email and password are required';
  }
  return null;
}

export function validateCVMimeType(mimetype: string): string | null {
  if (!CV_ALLOWED_MIME_TYPES.includes(mimetype)) {
    return 'Only PDF and DOCX files are accepted';
  }
  return null;
}

export function validateCVFileSize(size: number): string | null {
  if (size > CV_MAX_FILE_SIZE_BYTES) {
    return `File size must not exceed ${CV_MAX_FILE_SIZE_BYTES / (1024 * 1024)} MB`;
  }
  return null;
}

export function validateCVText(text: unknown): string | null {
  if (!text || typeof text !== 'string' || text.trim().length < CV_MIN_TEXT_LENGTH) {
    return 'No CV text provided';
  }
  return null;
}

export function validateCreatePlacementRequest(body: Partial<CreatePlacementRequest>): string | null {
  if (!body.company_id || !body.role_name || !body.description || !body.location) {
    return 'company_id, role_name, description, and location are required';
  }
  return null;
}

export function validatePlacementSkillExtraction(body: { description?: unknown; placementId?: unknown }): string | null {
  if (!body.description || !body.placementId) {
    return 'description and placementId are required';
  }
  return null;
}
