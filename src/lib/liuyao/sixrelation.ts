/** 六亲. Port of SixRelation.java. */
import { controls, generates, type WuXing } from "./wuxing";

export type SixRelation = "父母" | "兄弟" | "子孙" | "官鬼" | "妻财";

/** Declaration order, matching SixRelation.values() in the Java reference. */
export const SIX_RELATIONS: readonly SixRelation[] = [
  "父母",
  "兄弟",
  "子孙",
  "官鬼",
  "妻财",
];

export function computeSixRelation(
  palace: WuXing,
  branch: WuXing,
): SixRelation {
  if (palace === branch) return "兄弟";
  if (generates(branch, palace)) return "父母";
  if (generates(palace, branch)) return "子孙";
  if (controls(branch, palace)) return "官鬼";
  return "妻财";
}
