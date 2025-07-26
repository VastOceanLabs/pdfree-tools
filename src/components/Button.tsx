import React, { forwardRef, useId } from 'react';

// === BUTTON VARIANT TYPES ===
type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'success' | 'warning' | 'error';
type ButtonSize = 'sm' | 'base' | 'lg';

// === COMMON BUTTON PROPS ===
type CommonButtonProps = {
  /** Visual variant of the button */
  variant?: ButtonVariant;
  
  /** Size of the button */
  size?: ButtonSize;
  
  /** Loading state - shows spinner and disables interaction */
  loading?: boolean;
  
  /** Icon to display before the text */
  icon?: React.ReactNode;
  
  /** Icon to display after the text */
  iconAfter?: React.ReactNode;
  
  /** Full width button */
  fullWidth?: boolean;
  
  /** Additional CSS classes */
  className?: string;
  
  /** Children content */
  children?: React.ReactNode;
};

// === DISCRIMINATED UNION TYPES ===
type ButtonAsButton = CommonButtonProps & 
  Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, keyof CommonButtonProps | 'href' | 'target' | 'rel'> & {
    as?: 'button';
  };

type ButtonAsAnchor = CommonButtonProps & 
  Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, keyof CommonButtonProps | 'type'> & {
    as: 'a';
    href: string;
  };

export type ButtonProps = ButtonAsButton | ButtonAsAnchor;

// === LOADING SPINNER COMPONENT ===
const LoadingSpinner: React.FC<{ size: ButtonSize }> = ({ size }) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    base: 'w-5 h-5',
    lg: 'w-6 h-6'
  };

  return (
    <svg
      className={`animate-spin ${sizeClasses[size]}`}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
};

// === FUNCTION OVERLOADS ===
function Button(props: ButtonAsButton, ref?: React.Ref<HTMLButtonElement>): JSX.Element;
function Button(props: ButtonAsAnchor, ref?: React.Ref<HTMLAnchorElement>): JSX.Element;

// === MAIN BUTTON COMPONENT ===
function Button(
  props: ButtonProps,
  ref?: React.Ref<HTMLButtonElement> | React.Ref<HTMLAnchorElement>
): JSX.Element {
  const {
    variant = 'primary',
    size = 'base',
    loading = false,
    icon,
    iconAfter,
    fullWidth = false,
    className = '',
    children,
    ...restProps
  } = props;

  // Generate unique ID for loading status
  const loadingId = useId();

  // === VARIANT STYLES ===
  const variantStyles = {
    primary: {
      base: 'bg-primary-600 text-white border-primary-600',
      hover: 'hover:bg-primary-700 hover:border-primary-700',
      active: 'active:bg-primary-800 active:translate-y-px',
      disabled: 'disabled:bg-primary-300 disabled:border-primary-300 disabled:cursor-not-allowed',
      focus: 'focus-visible:ring-primary-500'
    },
    secondary: {
      base: 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600',
      hover: 'hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-400 dark:hover:border-gray-500',
      active: 'active:bg-gray-100 dark:active:bg-gray-600 active:translate-y-px',
      disabled: 'disabled:bg-gray-100 dark:disabled:bg-gray-700 disabled:text-gray-400 dark:disabled:text-gray-500 disabled:cursor-not-allowed',
      focus: 'focus-visible:ring-primary-500'
    },
    ghost: {
      base: 'bg-transparent text-gray-700 dark:text-gray-300 border-transparent',
      hover: 'hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white',
      active: 'active:bg-gray-200 dark:active:bg-gray-700 active:translate-y-px',
      disabled: 'disabled:text-gray-400 dark:disabled:text-gray-600 disabled:cursor-not-allowed',
      focus: 'focus-visible:ring-primary-500'
    },
    success: {
      base: 'bg-success-600 text-white border-success-600',
      hover: 'hover:bg-success-700 hover:border-success-700',
      active: 'active:bg-success-800 active:translate-y-px',
      disabled: 'disabled:bg-success-300 disabled:border-success-300 disabled:cursor-not-allowed',
      focus: 'focus-visible:ring-success-500'
    },
    warning: {
      base: 'bg-warning-600 text-white border-warning-600',
      hover: 'hover:bg-warning-700 hover:border-warning-700',
      active: 'active:bg-warning-800 active:translate-y-px',
      disabled: 'disabled:bg-warning-300 disabled:border-warning-300 disabled:cursor-not-allowed',
      focus: 'focus-visible:ring-warning-500'
    },
    error: {
      base: 'bg-error-600 text-white border-error-600',
      hover: 'hover:bg-error-700 hover:border-error-700',
      active: 'active:bg-error-800 active:translate-y-px',
      disabled: 'disabled:bg-error-300 disabled:border-error-300 disabled:cursor-not-allowed',
      focus: 'focus-visible:ring-error-500'
    }
  };

  // === SIZE STYLES ===
  const sizeStyles = {
    sm: {
      padding: 'px-3 py-2',
      text: 'text-sm',
      height: 'min-h-[40px]',
      width: 'min-w-[44px]', // WCAG 2.2 target size
      gap: 'gap-2'
    },
    base: {
      padding: 'px-4 py-3',
      text: 'text-base',
      height: 'min-h-[48px]', // WCAG touch target minimum
      width: 'min-w-[48px]',
      gap: 'gap-2'
    },
    lg: {
      padding: 'px-6 py-4',
      text: 'text-lg',
      height: 'min-h-[56px]', // Larger touch target for primary actions
      width: 'min-w-[56px]',
      gap: 'gap-3'
    }
  };

  // === COMPUTE BASE CLASSES ===
  const baseClasses = [
    // Layout and positioning
    'inline-flex items-center justify-center',
    'font-medium',
    'border',
    'rounded-lg',
    'transition-all duration-200',
    'outline-none',
    
    // Accessibility
    'focus-visible:outline-none',
    'focus-visible:ring-2',
    'focus-visible:ring-offset-2',
    'focus-visible:ring-offset-white dark:focus-visible:ring-offset-gray-900',
    
    // Full width option
    fullWidth ? 'w-full' : 'w-auto',
    
    // Size-specific classes
    sizeStyles[size].padding,
    sizeStyles[size].text,
    sizeStyles[size].height,
    sizeStyles[size].width,
    sizeStyles[size].gap,
    
    // Variant-specific classes
    variantStyles[variant].base,
    variantStyles[variant].hover,
    variantStyles[variant].active,
    variantStyles[variant].disabled,
    variantStyles[variant].focus,
    
    // Cursor
    'cursor-pointer',
    
    // Custom classes (last so they can override)
    className
  ].filter(Boolean).join(' ');

  // === RENDER CONTENT ===
  const renderContent = () => (
    <>
      {/* Loading spinner or icon */}
      {loading ? (
        <LoadingSpinner size={size} />
      ) : icon ? (
        <span className="flex-shrink-0" aria-hidden="true">
          {icon}
        </span>
      ) : null}

      {/* Button text */}
      {children && (
        <span className={loading ? 'opacity-70' : ''}>
          {children}
        </span>
      )}

      {/* Icon after text (not shown during loading) */}
      {!loading && iconAfter && (
        <span className="flex-shrink-0" aria-hidden="true">
          {iconAfter}
        </span>
      )}

      {/* Screen reader loading announcement */}
      {loading && (
        <span 
          id={loadingId} 
          role="status" 
          aria-live="polite" 
          className="sr-only"
        >
          Loading
        </span>
      )}
    </>
  );

  // === RENDER AS ANCHOR ===
  if (props.as === 'a') {
    const { href, target, rel, ...anchorProps } = restProps as ButtonAsAnchor;
    
    // Determine if anchor should be disabled
    const isDisabled = loading || anchorProps.disabled;
    
    // Auto-add security attributes for external links
    const safeRel = target === '_blank' 
      ? rel ?? 'noopener noreferrer' 
      : rel;

    // Disabled anchor styles (since disabled: pseudo-class doesn't work on <a>)
    const disabledAnchorClasses = isDisabled 
      ? 'pointer-events-none opacity-50 cursor-not-allowed' 
      : '';

    return (
      <a
        ref={ref as React.Ref<HTMLAnchorElement>}
        href={isDisabled ? undefined : href}
        target={target}
        rel={safeRel}
        role="button"
        tabIndex={isDisabled ? -1 : undefined}
        aria-disabled={isDisabled}
        aria-busy={loading}
        aria-describedby={loading ? loadingId : undefined}
        data-disabled={isDisabled ? 'true' : undefined}
        className={`${baseClasses} ${disabledAnchorClasses}`}
        {...(isDisabled && {
          onClick: (e) => e.preventDefault(),
          onKeyDown: (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
            }
          }
        })}
        {...(anchorProps as Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'href' | 'target' | 'rel'>)}
      >
        {renderContent()}
      </a>
    );
  }

  // === RENDER AS BUTTON ===
  const { type = 'button', disabled, ...buttonProps } = restProps as ButtonAsButton;
  const isDisabled = disabled || loading;

  return (
    <button
      ref={ref as React.Ref<HTMLButtonElement>}
      type={type}
      disabled={isDisabled}
      aria-busy={loading}
      aria-describedby={loading ? loadingId : undefined}
      className={baseClasses}
      {...buttonProps}
    >
      {renderContent()}
    </button>
  );
}

// === EXPORT WITH FORWARD REF ===
const ForwardedButton = forwardRef(Button);
ForwardedButton.displayName = 'Button';

export default ForwardedButton;

// === NAMED EXPORTS FOR CONVENIENCE ===
export type { ButtonVariant, ButtonSize };