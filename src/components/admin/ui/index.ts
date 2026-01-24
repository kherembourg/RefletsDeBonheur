/**
 * Admin UI Components
 *
 * Centralized exports for all reusable admin components.
 * These components use the admin theme system for consistent styling.
 */

// Buttons
export { AdminButton, type AdminButtonProps, type ButtonVariant, type ButtonSize } from './AdminButton';

// Cards
export {
  AdminCard,
  AdminCardHeader,
  AdminCardTitle,
  AdminCardBody,
  AdminCardFooter,
  type AdminCardProps,
  type AdminCardHeaderProps,
  type AdminCardTitleProps,
  type AdminCardBodyProps,
  type AdminCardFooterProps,
} from './AdminCard';

// Form inputs
export { AdminInput, type AdminInputProps } from './AdminInput';
export { AdminTextarea, type AdminTextareaProps } from './AdminTextarea';
export { AdminSelect, type AdminSelectProps, type AdminSelectOption } from './AdminSelect';
export { AdminToggle, type AdminToggleProps } from './AdminToggle';

// Feedback
export { AdminModal, type AdminModalProps } from './AdminModal';
export { AdminBadge, type AdminBadgeProps, type BadgeVariant, type BadgeSize } from './AdminBadge';

// Navigation
export { AdminPagination, type AdminPaginationProps } from './AdminPagination';

// Layout
export {
  AdminSection,
  AdminDivider,
  AdminEmptyState,
  type AdminSectionProps,
  type AdminDividerProps,
  type AdminEmptyStateProps,
} from './AdminSection';

// Re-export theme utilities
export { adminStyles, adminColors, cn } from '../../../styles/admin-theme';
