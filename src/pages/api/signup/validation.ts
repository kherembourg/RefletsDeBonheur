import { type ThemeId, themeList } from '../../../lib/themes';
import { RESERVED_SLUGS, isValidSlugFormat } from '../../../lib/slugValidation';
import { validatePassword, getPasswordRequirementsMessage } from '../../../lib/passwordValidation';
import { isValidEmail } from '../../../lib/validation/emailValidation';
import { apiResponse } from '../../../lib/api/middleware';

const validThemeIds = themeList.map(theme => theme.id);

export interface SignupFields {
  email: string;
  password: string;
  partner1_name: string;
  partner2_name: string;
  slug: string;
  theme_id: ThemeId;
}

/**
 * Validate common signup fields shared between trial and paid flows.
 * Returns a Response if validation fails, or null if all fields are valid.
 */
export function validateSignupFields(fields: SignupFields): Response | null {
  const { email, password, partner1_name, partner2_name, slug, theme_id } = fields;

  if (!email || !password || !partner1_name || !partner2_name || !slug || !theme_id) {
    return apiResponse.error(
      'Missing required fields',
      'Email, password, partner names, slug, and theme are required.',
      400
    );
  }

  if (!isValidEmail(email)) {
    return apiResponse.error('Invalid email', 'Please enter a valid email address.', 400, 'email');
  }

  const passwordValidation = validatePassword(password);
  if (!passwordValidation.isValid) {
    return apiResponse.error('Weak password', getPasswordRequirementsMessage(), 400, 'password');
  }

  if (!validThemeIds.includes(theme_id)) {
    return apiResponse.error('Invalid theme', 'Please select a valid theme.', 400, 'theme_id');
  }

  const normalizedSlug = slug.toLowerCase().trim();
  if (!isValidSlugFormat(normalizedSlug)) {
    return apiResponse.error(
      'Invalid slug format',
      'URL must be 3-50 characters, lowercase letters, numbers, and hyphens only.',
      400,
      'slug'
    );
  }

  if (RESERVED_SLUGS.has(normalizedSlug)) {
    return apiResponse.error('Slug reserved', 'This URL is reserved and cannot be used.', 400, 'slug');
  }

  return null;
}
