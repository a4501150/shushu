export type ArtKind =
  | "liuyao" | "xiaoliuren" | "bazi" | "ziwei" | "qimen"
  | "shanghan" | "jinkui" | "wuyunliuqi" | "sanyin" | "fuxingjue";

/** 命盘类：问题可不填（本命解读）。 */
export const LIFE_ARTS: ReadonlySet<ArtKind> = new Set(["bazi", "ziwei"]);

/** 医类：可无问题（辨证参考条目）。 */
export const YI_ARTS: ReadonlySet<ArtKind> = new Set([
  "shanghan", "jinkui", "wuyunliuqi", "sanyin", "fuxingjue",
]);

export interface SavedReading {
  id: string;
  createdAt: string; // ISO
  art: ArtKind;
  question: string;
  /** plain-text board, exactly what the copy button produced */
  boardText: string;
  /** raw casting line; absent in entries saved before it was recorded */
  artifacts?: string;
  /** 命盘类流年占问的时点行；本命解读没有 */
  readingTime?: string;
}

/**
 * Backend seam. Today this is localStorage; a future backend implements the
 * same interface over HTTP and the UI does not change.
 */
export interface HistoryRepo {
  save(reading: Omit<SavedReading, "id" | "createdAt">): SavedReading;
  list(): SavedReading[];
  get(id: string): SavedReading | null;
  remove(id: string): void;
  clear(): void;
}

const KEY = "shushu.history.v1";

export class LocalHistoryRepo implements HistoryRepo {
  private all(): SavedReading[] {
    if (typeof window === "undefined") return [];
    try {
      return JSON.parse(window.localStorage.getItem(KEY) ?? "[]") as SavedReading[];
    } catch {
      return [];
    }
  }

  save(reading: Omit<SavedReading, "id" | "createdAt">): SavedReading {
    const full: SavedReading = {
      ...reading,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    const items = this.all();
    items.unshift(full);
    window.localStorage.setItem(KEY, JSON.stringify(items.slice(0, 100)));
    window.dispatchEvent(new CustomEvent("shushu:history-saved"));
    return full;
  }

  list(): SavedReading[] {
    return this.all();
  }

  get(id: string): SavedReading | null {
    return this.all().find((r) => r.id === id) ?? null;
  }

  remove(id: string): void {
    const items = this.all().filter((r) => r.id !== id);
    window.localStorage.setItem(KEY, JSON.stringify(items));
  }

  clear(): void {
    window.localStorage.setItem(KEY, "[]");
  }
}

export const historyRepo: HistoryRepo = new LocalHistoryRepo();
