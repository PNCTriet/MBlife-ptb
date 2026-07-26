import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let browserClient: SupabaseClient | null = null;

export function createBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY"
    );
  }

  // Reuse one client in the browser — creating a fresh client per click
  // opens new auth/realtime wiring and makes Safari "Load failed" more likely
  // when the admin page fires many back-to-back REST calls.
  if (typeof window !== "undefined") {
    if (!browserClient) {
      browserClient = createClient(url, key, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      });
    }
    return browserClient;
  }

  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

/** Safari/WebKit surfaces aborted or flaky fetches as "Load failed". */
export function isTransientNetworkError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();
  return (
    error.name === "TypeError" ||
    message.includes("load failed") ||
    message.includes("failed to fetch") ||
    message.includes("networkerror") ||
    message.includes("network request failed") ||
    message.includes("fetch failed")
  );
}

export function networkErrorHint(error: unknown): string {
  if (!isTransientNetworkError(error)) {
    return error instanceof Error ? error.message : "Lỗi không xác định";
  }
  return `${error instanceof Error ? error.message : "Load failed"} — kết nối tới Supabase bị đứt tạm thời. Thử lại.`;
}

/** Retry only genuine transport failures, not RLS / validation errors. */
export async function withNetworkRetry<T>(
  run: () => Promise<T>,
  attempts = 3
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await run();
    } catch (error) {
      lastError = error;
      if (!isTransientNetworkError(error) || attempt === attempts) throw error;
      await new Promise((resolve) => setTimeout(resolve, 250 * attempt));
    }
  }
  throw lastError;
}
