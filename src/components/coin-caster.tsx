"use client";

import { useEffect, useRef, useState } from "react";
import { coinSum, tossCoins, type CoinFace, type YaoSum } from "@/lib/liuyao/casting";

const YAO_LABELS = ["初爻", "二爻", "三爻", "四爻", "五爻", "上爻"] as const;

/** 一次锁定后的冷却：摇动/空格连续触发时只算一爻。 */
const SETTLE_COOLDOWN_MS = 600;

interface CoinCasterProps {
  onDone: (sums: YaoSum[]) => void;
  onCancel: () => void;
}

/**
 * Hand-shake casting: three coins tumble, the user taps 定 (or shakes the
 * device, or presses space) to settle one round per yao, six rounds bottom-up.
 */
export function CoinCaster({ onDone, onCancel }: CoinCasterProps) {
  const [settled, setSettled] = useState<number[]>([]);
  const [coins, setCoins] = useState<CoinFace[]>([2, 3, 2]);
  const [tumbling, setTumbling] = useState(true);
  // 事件处理器共用，避免闭包读到过期的 settled/冷却时间。
  const settledRef = useRef<number[]>([]);
  const tumblingRef = useRef(true);
  const lastSettleAtRef = useRef(0);
  const askedPermissionRef = useRef(false);

  useEffect(() => {
    const timer = setInterval(() => {
      if (tumblingRef.current) setCoins(tossCoins());
    }, 90);
    return () => clearInterval(timer);
  }, []);

  const settle = () => {
    const now = Date.now();
    if (settledRef.current.length >= 6 || now - lastSettleAtRef.current < SETTLE_COOLDOWN_MS) return;
    lastSettleAtRef.current = now;
    const face = tossCoins();
    const sum = coinSum(face);
    setCoins(face);
    const next = [...settledRef.current, sum];
    settledRef.current = next;
    setSettled(next);
    if (next.length === 6) {
      tumblingRef.current = false;
      setTumbling(false);
      onDone(next as YaoSum[]);
    }
  };

  // iOS 13+ 只在用户手势里弹窗一次。
  const askMotionPermission = () => {
    const dm = DeviceMotionEvent as unknown as {
      requestPermission?: () => Promise<string>;
    };
    if (typeof dm?.requestPermission !== "function" || askedPermissionRef.current) return;
    askedPermissionRef.current = true;
    void dm.requestPermission().catch(() => undefined);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        e.preventDefault();
        settle();
      }
    };
    const onMotion = (e: DeviceMotionEvent) => {
      const a = e.accelerationIncludingGravity;
      if (!a) return;
      const magnitude = Math.abs(a.x ?? 0) + Math.abs(a.y ?? 0) + Math.abs(a.z ?? 0);
      if (magnitude > 40) settle();
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("devicemotion", onMotion);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("devicemotion", onMotion);
    };
    // settle 只碰 ref 与 setState，首帧闭包即稳定。
  }, []);

  const round = Math.min(settled.length, YAO_LABELS.length - 1);
  return (
    <section className="caster" aria-label="摇卦">
      <div
        className="caster-coins"
        data-tumbling={tumbling}
        role="img"
        aria-label={`第${round + 1}次，铜钱${coins.map((c) => (c === 3 ? "背" : "字")).join("，")}`}
      >
        {coins.map((c, i) => (
          <span
            key={i}
            className={`coin ${c === 3 ? "coin-yang" : "coin-yin"}`}
            data-face={c === 3 ? "背(阳)" : "字(阴)"}
          >
            {c === 3 ? "陽" : "陰"}
          </span>
        ))}
      </div>
      <p className="caster-hint">
        {settled.length === 0 ? "铜钱翻转中——" : ""}按「定」或摇晃手机锁定第 {round + 1} 爻（
        {YAO_LABELS[round]}）
      </p>
      <div className="caster-actions">
        <button
          type="button"
          className="btn-cast"
          onClick={() => {
            askMotionPermission();
            settle();
          }}
        >
          定
        </button>
        <button type="button" className="btn-quiet" onClick={onCancel}>
          放弃
        </button>
      </div>
      <ol className="caster-log" aria-label="已定之爻">
        {settled.map((s, i) => (
          <li key={i}>
            {YAO_LABELS[i]} {s} {s === 6 || s === 9 ? <span className="dong">动</span> : null}
          </li>
        ))}
      </ol>
    </section>
  );
}
