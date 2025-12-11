/**
 * Formats a count to display "99+" when the value exceeds 99
 * This prevents UI layout issues with large numbers
 * @param count - The number to format
 * @returns Formatted string (e.g., 99+ for values > 99, or the original number as string)
 */
export const formatCount = (count: number): string => {
  if (typeof count !== 'number' || isNaN(count)) {
    return '0';
  }
  
  if (count > 99) {
    return '99+';
  }
  
  return count.toString();
};

/**
 * Formats a count for display in text with proper pluralization
 * @param count - The number to format
 * @param singular - Singular form of the word
 * @param plural - Plural form of the word (optional, defaults to singular + 's')
 * @returns Formatted string with count and proper word form
 */
export const formatCountWithText = (
  count: number, 
  singular: string, 
  plural?: string
): string => {
  const formattedCount = formatCount(count);
  const word = count === 1 ? singular : (plural || singular + 's');
  
  return `${formattedCount} ${word}`;
};
