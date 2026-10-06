/**
 * Capitalizes the first letter of each word in a string
 */
export const capitalizeWords = (str: string): string => {
  if (!str) return '';
  return str.replace(/\b([a-z])/g, (c) => c.toUpperCase());
};

/**
 * Derives the formatted full name (First, Middle, Last, Suffix) from profile or auth user metadata
 */
export const formatUserFullName = (
  profile?: {
    first_name?: string | null;
    middle_name?: string | null;
    last_name?: string | null;
    suffix?: string | null;
  } | null,
  user?: {
    email?: string | null;
    user_metadata?: Record<string, any> | null;
  } | null,
  fallback = 'User'
): string => {
  // 1. From database profile record
  if (profile?.first_name) {
    const parts = [
      profile.first_name,
      profile.middle_name,
      profile.last_name,
      profile.suffix,
    ]
      .filter(Boolean)
      .join(' ')
      .trim();

    if (parts) return capitalizeWords(parts);
  }

  // 2. From Supabase auth user_metadata (snake_case)
  if (user?.user_metadata?.first_name) {
    const parts = [
      user.user_metadata.first_name,
      user.user_metadata.middle_name,
      user.user_metadata.last_name,
      user.user_metadata.suffix,
    ]
      .filter(Boolean)
      .join(' ')
      .trim();

    if (parts) return capitalizeWords(parts);
  }

  // 3. From Supabase auth user_metadata (camelCase)
  if (user?.user_metadata?.firstName) {
    const parts = [
      user.user_metadata.firstName,
      user.user_metadata.middleName,
      user.user_metadata.lastName,
      user.user_metadata.suffix,
    ]
      .filter(Boolean)
      .join(' ')
      .trim();

    if (parts) return capitalizeWords(parts);
  }

  // 4. From full_name or name in user_metadata
  const metaFullName = user?.user_metadata?.full_name || user?.user_metadata?.name;
  if (metaFullName && String(metaFullName).trim()) {
    return capitalizeWords(String(metaFullName).trim());
  }

  // 5. From email username
  if (user?.email) {
    const username = user.email.split('@')[0].replace(/[._-]/g, ' ').trim();
    if (username) return capitalizeWords(username);
  }

  return fallback;
};
