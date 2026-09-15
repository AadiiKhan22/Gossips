export type ProfileFieldErrors = {
  username?: string;
  displayName?: string;
  avatarUrl?: string;
  bio?: string;
};

const USERNAME_PATTERN = /^[a-z0-9_]+$/;

export function validateUsername(username: string): string | undefined {
  const trimmed = username.trim().toLowerCase();

  if (!trimmed) return "Username is required.";
  if (trimmed.length < 3) return "Username must be at least 3 characters.";
  if (trimmed.length > 30) return "Username must be 30 characters or fewer.";
  if (!USERNAME_PATTERN.test(trimmed)) {
    return "Username can only contain lowercase letters, numbers, and underscores.";
  }

  return undefined;
}

export function validateDisplayName(displayName: string): string | undefined {
  const trimmed = displayName.trim();
  if (!trimmed) return "Display name is required.";
  if (trimmed.length > 80) return "Display name must be 80 characters or fewer.";
  return undefined;
}

export function validateAvatarUrl(avatarUrl: string): string | undefined {
  const trimmed = avatarUrl.trim();
  if (!trimmed) return undefined;

  try {
    const url = new URL(trimmed);
    if (!["http:", "https:"].includes(url.protocol)) {
      return "Avatar URL must use http or https.";
    }
  } catch {
    return "Enter a valid avatar URL.";
  }

  return undefined;
}

export function validateBio(bio: string): string | undefined {
  if (bio.length > 280) return "Bio must be 280 characters or fewer.";
  return undefined;
}

export function validateProfileForm(
  username: string,
  displayName: string,
  avatarUrl: string,
  bio: string,
): ProfileFieldErrors {
  return {
    username: validateUsername(username),
    displayName: validateDisplayName(displayName),
    avatarUrl: validateAvatarUrl(avatarUrl),
    bio: validateBio(bio),
  };
}

export function hasProfileFieldErrors(errors: ProfileFieldErrors): boolean {
  return Object.values(errors).some(Boolean);
}

export function normalizeUsername(username: string): string {
  return username.trim().toLowerCase();
}
