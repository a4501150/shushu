import type { SavedReading } from "@/lib/store/history";

/**
 * Backend seam for the future data/auth service (user accounts, sync, shared
 * links). The app runs fully offline against the no-op implementation; when a
 * backend exists, provide an HTTP implementation and wire it here.
 */
export interface ApiClient {
  currentUser(): Promise<{ id: string; name: string } | null>;
  pushReading(reading: SavedReading): Promise<void>;
}

export const noopClient: ApiClient = {
  async currentUser() {
    return null;
  },
  async pushReading() {},
};

export const apiClient: ApiClient = noopClient;
