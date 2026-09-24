export type AuthFieldErrors = {
  email?: string;
  password?: string;
  displayName?: string;
  confirmPassword?: string;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateEmail(email: string): string | undefined {
  const trimmed = email.trim();
  if (!trimmed) return "Email is required.";
  if (trimmed.length > 40) return "Email must be 40 characters or fewer.";
  if (!EMAIL_PATTERN.test(trimmed)) return "Enter a valid email address.";
  return undefined;
}

export function validatePassword(password: string): string | undefined {
  if (!password) return "Password is required.";
  if (password.length < 8) return "Password must be at least 8 characters.";
  if (password.length > 25) return "Password must be 25 characters or fewer.";
  return undefined;
}

export function validateLoginForm(email: string, password: string): AuthFieldErrors {
  return {
    email: validateEmail(email),
    password: validatePassword(password),
  };
}

export function validateSignupForm(
  email: string,
  password: string,
  confirmPassword: string,
  displayName: string,
): AuthFieldErrors {
  const errors: AuthFieldErrors = {
    email: validateEmail(email),
    password: validatePassword(password),
    confirmPassword: undefined,
    displayName: undefined,
  };

  if (!displayName.trim()) {
    errors.displayName = "Display name is required.";
  } else if (displayName.trim().length > 80) {
    errors.displayName = "Display name must be 80 characters or fewer.";
  }

  if (!confirmPassword) {
    errors.confirmPassword = "Please confirm your password.";
  } else if (confirmPassword !== password) {
    errors.confirmPassword = "Passwords do not match.";
  }

  return errors;
}

export function hasFieldErrors(errors: AuthFieldErrors): boolean {
  return Object.values(errors).some(Boolean);
}
