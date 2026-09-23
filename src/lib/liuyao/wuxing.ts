/** 五行. Port of WuXing.java. */
export type WuXing = "金" | "木" | "水" | "火" | "土";

/** 五行相生: 金生水, 水生木, 木生火, 火生土, 土生金. */
export function generates(a: WuXing, b: WuXing): boolean {
  switch (a) {
    case "金":
      return b === "水";
    case "水":
      return b === "木";
    case "木":
      return b === "火";
    case "火":
      return b === "土";
    case "土":
      return b === "金";
  }
}

/** 五行相克: 金克木, 木克土, 土克水, 水克火, 火克金. */
export function controls(a: WuXing, b: WuXing): boolean {
  switch (a) {
    case "金":
      return b === "木";
    case "木":
      return b === "土";
    case "土":
      return b === "水";
    case "水":
      return b === "火";
    case "火":
      return b === "金";
  }
}
