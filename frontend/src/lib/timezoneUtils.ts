/**
 * Timezone utility functions for converting UTC to IST (India Standard Time, UTC+5:30)
 * 
 * Note: Backend now stores timestamps in UTC for consistency.
 * Responses include IST timezone info (+05:30) via the serializer.
 * JavaScript Date() parses these correctly and we use toLocaleString with 
 * timeZone: "Asia/Kolkata" to ensure correct IST display.
 */

/**
 * Convert datetime string (UTC or with timezone info) to IST and format for display
 * Backend returns timestamps as UTC and we convert them to IST for display
 */
export function formatDateToIST(dateString: string | null | undefined): string {
  if (!dateString) return "—";
  
  try {
    // Backend sends ISO strings with timezone info (e.g., "2024-01-15T12:00:00+00:00" or "2024-01-15T17:30:00+05:30")
    // JavaScript Date() parses these correctly
    const date = new Date(dateString);
    
    // Validate date
    if (isNaN(date.getTime())) {
      console.error("Invalid date string:", dateString);
      return "Invalid date";
    }
    
    // Use toLocaleString with timeZone: "Asia/Kolkata" to display in IST
    // This works correctly whether the input is UTC or already has timezone info
    return date.toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true
    });
  } catch (error) {
    console.error("Error formatting date to IST:", error);
    // Fallback: try to parse and display
    try {
      const date = new Date(dateString);
      return date.toLocaleString("en-IN", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true
      });
    } catch {
      return "Invalid date";
    }
  }
}

/**
 * Convert UTC datetime string to IST date only (no time)
 */
export function formatDateOnlyToIST(dateString: string | null | undefined): string {
  if (!dateString) return "—";
  
  try {
    const date = new Date(dateString);
    
    if (isNaN(date.getTime())) {
      return "Invalid date";
    }
    
    return date.toLocaleDateString("en-IN", {
      timeZone: "Asia/Kolkata",
      day: "numeric",
      month: "short",
      year: "numeric"
    });
  } catch (error) {
    console.error("Error formatting date to IST:", error);
    return dateString;
  }
}

/**
 * Get current time in IST as ISO string
 */
export function getCurrentISTTime(): string {
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000; // 5:30 hours in milliseconds
  const istTime = new Date(now.getTime() + istOffset);
  return istTime.toISOString();
}
