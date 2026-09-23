"use client";

import { useEffect, useRef, useState } from "react";
import { CoinCaster } from "@/components/coin-caster";
import { BoardView } from "@/components/board-view";
import { universeCasting, type YaoSum } from "@/lib/liuyao/casting";
import { compute as computeLiuyao } from "@/lib/liuyao/panel";
import { formatRaw as formatLiuyaoRaw } from "@/lib/liuyao/format";
import { analyzeStrength, fullLiuyaoBoard } from "@/lib/liuyao/wang-shuai";
import {
  computeFromMoment,
  computeFromStrokes,
  formatText as formatXlr,
} from "@/lib/xiaoliuren";
import { computeBazi, formatText as formatBazi, qianKun, type Gender } from "@/lib/bazi";
import { computeQimen, formatText as formatQimen } from "@/lib/qimen";
import { type ChartMoment } from "@/lib/calendar";
import { fmtUtcOffset, fromLocalDate, PLACES, REGIONS, trueSolarOf, type Place } from "@/lib/calendar/solar-time";
import { splitGanZhi } from "@/lib/ganzhi";
import { pad2 } from "@/lib/textwidth";
import { historyRepo, LIFE_ARTS, type ArtKind, type SavedReading } from "@/lib/store/history";
import { HistoryList } from "@/components/history-list";
import dynamic from "next/dynamic";

// 两本医书数据只在点开时才需要，从首屏 bundle 里分出。
const YiGuide = dynamic(
  () => import("@/components/yi-guide").then((m) => m.YiGuide),
  { ssr: false },
);

type NavId = "shan" | "yi" | "ming" | "xiang" | "bu";

const NAVS: readonly {
  id: NavId;
  label: string;
  note: string;
  arts: readonly { kind: ArtKind; name: string }[];
}[] = [
  { id: "shan", label: "山", note: "神仙导引养生之家，暂未收录。", arts: [] },
  {
    id: "yi",
    label: "医",
    note: "",
    arts: [
      { kind: "shanghan", name: "伤寒六经" },
      { kind: "jinkui", name: "金匮要略" },
      { kind: "wuyunliuqi", name: "五运六气" },
      { kind: "sanyin", name: "三因极一" },
      { kind: "fuxingjue", name: "辅行诀" },
    ],
  },
  {
    id: "ming",
    label: "命",
    note: "",
    arts: [
      { kind: "bazi", name: "四柱八字" },
      { kind: "ziwei", name: "紫微斗数" },
    ],
  },
  { id: "xiang", label: "相", note: "相法（人相、宅相），暂未收录。", arts: [] },
  {
    id: "bu",
    label: "卜",
    note: "",
    arts: [
      { kind: "liuyao", name: "六爻" },
      { kind: "xiaoliuren", name: "小六壬" },
      { kind: "qimen", name: "奇门遁甲" },
    ],
  },
];

function navOfArt(art: ArtKind): NavId {
  for (const n of NAVS) if (n.arts.some((a) => a.kind === art)) return n.id;
  return "bu";
}

type Step = "setup" | "casting" | "board";
type DateTimeArt = "bazi" | "ziwei" | "qimen";
type DateTimeRun = (m: ChartMoment, gender: Gender) => Promise<Outcome>;

interface Outcome {
  boardText: string;
  artifacts: string;
  readingTime?: string;
  /** 五运六气：本盘所附三因方方名，供跳转目录 */
  fangs?: string[];
  /** 五运六气：折叠展示的推演方法 */
  methodText?: string;
}

function fmtMomentHead(m: ChartMoment): string {
  return (
    `公历 ${m.solar.year}-${pad2(m.solar.month)}-${pad2(m.solar.day)} ` +
    `${pad2(m.solar.hour)}:${pad2(m.solar.minute)}`
  );
}

function withNote(s: string, note?: string): string {
  return note ? `${s} · ${note}` : s;
}

function momentArtifacts(m: ChartMoment, extra: string): string {
  return withNote(
    fmtMomentHead(m),
    `干支 ${m.yearGanZhi}年 ${m.monthGanZhi}月 ${m.dayGanZhi}日 ${m.timeGanZhi}时 · ${extra}`,
  );
}

const GROUPED = REGIONS.map((region) => ({
  region,
  list: PLACES.filter((p) => p.region === region),
}));

const DATETIME_ARTS: Record<DateTimeArt, DateTimeRun> = {
  bazi: async (m, gender) => {
    const r = computeBazi(m, gender);
    return {
      boardText: formatBazi(r),
      artifacts: momentArtifacts(m, `排盘方式：四柱（${qianKun(gender)}）`),
    };
  },
  // iztro 只在排紫微时按需加载（≈144KB gzip）。
  ziwei: async (m, gender) => {
    const { computeZiwei, formatText } = await import("@/lib/ziwei");
    const r = computeZiwei(m, gender);
    return {
      boardText: formatText(r),
      artifacts: momentArtifacts(m, `排盘方式：紫微斗数（${qianKun(gender)}）`),
    };
  },
  qimen: async (m) => {
    const r = computeQimen(m);
    return {
      boardText: formatQimen(r),
      artifacts: momentArtifacts(m, "排盘方式：时家奇门（拆补法）"),
    };
  },
};

export function Wizard() {
  const [step, setStep] = useState<Step>("setup");
  const [nav, setNav] = useState<NavId>("bu");
  const [question, setQuestion] = useState("");
  const [art, setArt] = useState<ArtKind>("liuyao");
  const [wuyunYear, setWuyunYear] = useState(String(new Date().getFullYear()));
  const [wuyunMode, setWuyunMode] = useState<"year" | "natal">("year");
  const [wuyunBirth, setWuyunBirth] = useState("");
  const [wuyunTime, setWuyunTime] = useState("");
  const [sanyinJump, setSanyinJump] = useState<string | null>(null);
  const [liuyaoMode, setLiuyaoMode] = useState<"hand" | "noise">("hand");
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [strokeInput, setStrokeInput] = useState("");
  const [when, setWhen] = useState("");
  const [asking, setAsking] = useState("");
  const [useSolar, setUseSolar] = useState(false);
  const [place, setPlace] = useState("");
  const [customLng, setCustomLng] = useState("");
  const [customTz, setCustomTz] = useState("");
  const [yearly, setYearly] = useState(false);
  const [gender, setGender] = useState<Gender>("male");
  const noiseAbortRef = useRef<AbortController | null>(null);

  // 选了地点即按真太阳时排盘，note 为附在原始数据后的校时说明
  const solarAt = (d: Date): { m: ChartMoment; note?: string; err?: string } => {
    const { p, err } = chosenPlace();
    if (err) return { m: fromLocalDate(d), err };
    const { moment, correctionMinutes } = trueSolarOf(d, p);
    if (!p) return { m: moment };
    const sign = correctionMinutes >= 0 ? "+" : "−";
    return {
      m: moment,
      note: `按${p.name}真太阳时排盘（钟表校正 ${sign}${Math.abs(correctionMinutes)} 分）`,
    };
  };

  const finish = (o: Outcome) => {
    historyRepo.save({
      art,
      question,
      boardText: o.boardText,
      artifacts: o.artifacts,
      readingTime: o.readingTime,
    });
    setOutcome(o);
    setStep("board");
  };

  const openSaved = (r: SavedReading) => {
    setArt(r.art);
    setNav(navOfArt(r.art));
    setQuestion(r.question);
    setOutcome({ boardText: r.boardText, artifacts: r.artifacts ?? "", readingTime: r.readingTime });
    setStep("board");
  };

  const finishLiuyao = (sums: YaoSum[], source: string) => {
    const { m, note, err } = solarAt(new Date());
    if (err) {
      setError(err);
      return;
    }
    const [dayGan, dayZhi] = splitGanZhi(m.dayGanZhi);
    const [, monthZhi] = splitGanZhi(m.monthGanZhi);
    const result = computeLiuyao(sums, dayGan, dayZhi, monthZhi);
    finish({
      boardText: `${formatLiuyaoRaw(sums, result).trimEnd()}\n\n${fullLiuyaoBoard(result, analyzeStrength(result)).trimEnd()}`,
      artifacts: momentArtifacts(
        m,
        withNote(`六爻(自下而上) ${sums.join(" ")} · 起卦方式：${source}`, note)
      ),
    });
  };

  const castLiuyaoNoise = async () => {
    setError(null);
    const ctrl = new AbortController();
    noiseAbortRef.current = ctrl;
    try {
      finishLiuyao(await universeCasting(fetch, undefined, ctrl.signal), "宇宙噪声（random.org）");
    } catch (e) {
      if (!ctrl.signal.aborted) setError(e instanceof Error ? e.message : String(e));
    } finally {
      noiseAbortRef.current = null;
    }
  };

  const castXiaoliuren = () => {
    setError(null);
    const { m, note, err } = solarAt(new Date());
    if (err) {
      setError(err);
      return;
    }
    const r = computeFromMoment(m);
    finish({
      boardText: formatXlr(r),
      artifacts: momentArtifacts(m, withNote("起课方式：按时起课", note)),
    });
  };

  const castXiaoliurenStrokes = () => {
    setError(null);
    const { m, note, err } = solarAt(new Date());
    if (err) {
      setError(err);
      return;
    }
    const out = computeFromStrokes(strokeInput, m);
    if (!out.ok) {
      setError(`以下字无笔画数据，请换字重试：${out.unsupported.map((u) => u.char).join(" ")}`);
      return;
    }
    finish({
      boardText: formatXlr(out.result),
      artifacts: momentArtifacts(m, withNote(`起课方式：字数起课（${strokeInput}）`, note)),
    });
  };

  const castFromDateTime = async () => {
    setError(null);
    // 奇门为时家：默认用此刻，可选填指定起局时间；命盘类必须给出生时间
    const d = when ? new Date(when) : new Date();
    if (Number.isNaN(d.getTime())) {
      setError("请填写有效的日期时间。");
      return;
    }
    const { m, note, err } = solarAt(d);
    if (err) {
      setError(err);
      return;
    }
    // 命盘类启用流年占问后，附占问时点的岁运；本命解读不带此行
    let readingTime: string | undefined;
    if ((art === "bazi" || art === "ziwei") && yearly && question.trim()) {
      let s2: ReturnType<typeof solarAt>;
      if (asking.trim()) {
        const a = new Date(asking);
        if (Number.isNaN(a.getTime())) {
          setError("占问时点无效，请填写可解析的日期时间。");
          return;
        }
        s2 = solarAt(a);
      } else {
        s2 = solarAt(new Date());
      }
      if (s2.err) {
        setError(s2.err);
        return;
      }
      const m2 = s2.m;
      readingTime = withNote(
        art === "bazi"
          ? `${fmtMomentHead(m2)} · 流年${m2.yearGanZhi} 流月${m2.monthGanZhi} 流日${m2.dayGanZhi} 流时${m2.timeGanZhi}`
          : `${fmtMomentHead(m2)} · 流年${m2.yearGanZhi} 流月${m2.monthGanZhi}（大限、流年宫以盘面岁运参看）`,
        s2.note, // 占问时点同样按真太阳时校正过，流时可信
      );
    }
    const run = DATETIME_ARTS[art as DateTimeArt];
    try {
      const out = await run(m, gender);
      finish({
        ...out,
        artifacts: withNote(out.artifacts, note),
        readingTime,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const castWuyun = async () => {
    setError(null);
    // 数据与历表较大：推演时才加载
    const { compute, computeNatal, formatText, formatNatalText, METHOD_NOTES } =
      await import("@/lib/wuyunliuqi");
    const fangsOf = (r: ReturnType<typeof compute>) => [
      r.suiyun.formula.name,
      r.sitian.formula.name,
    ];
    if (wuyunMode === "natal") {
      const md = /^(\d{4})-(\d{2})-(\d{2})$/.exec(wuyunBirth);
      const [, sy, smo, sd] = md ? md.map(Number) : [];
      if (!md || new Date(sy, smo - 1, sd).getDate() !== sd) {
        setError("请填写公历出生日期。");
        return;
      }
      const hour = /^\d{2}:\d{2}$/.test(wuyunTime) ? Number(wuyunTime.slice(0, 2)) : undefined;
      let n;
      try {
        n = computeNatal(sy, smo, sd, hour);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
        return;
      }
      finish({
        boardText: formatNatalText(n.result, n),
        artifacts:
          `出生日期 ${n.birthDate}${wuyunTime ? ` ${wuyunTime}` : ""} · 干支 ${n.result.ganZhi}年 · 落${n.bu}` +
          `（${n.from.jieqi}${n.from.date} 至 ${n.to.jieqi}${n.to.date}），` +
          `主气${n.zhuQi}、客气${n.keQi}；排盘方式：五运六气禀赋`,
        fangs: fangsOf(n.result),
        methodText: METHOD_NOTES,
      });
      return;
    }
    const year = Number(wuyunYear);
    if (!Number.isInteger(year) || year < 4 || year > 2100) {
      setError("请填写公元 4～2100 之间的公历年份。");
      return;
    }
    const r = compute(year);
    finish({
      boardText: formatText(r),
      artifacts:
        `公历 ${year} 年 · 干支 ${r.ganZhi}年 · ` +
        `推演方式：五运六气（${r.suiyun.yun}，${r.sitianQi}司天、${r.zaiquan}在泉，附三因司天方）`,
      fangs: fangsOf(r),
      methodText: METHOD_NOTES,
    });
  };

  const reset = () => {
    noiseAbortRef.current?.abort();
    setOutcome(null);
    setError(null);
    setSanyinJump(null);
    setStep("setup");
  };

  useEffect(() => {
    window.addEventListener("shushu:home", reset);
    return () => window.removeEventListener("shushu:home", reset);
  }, []);

  const datetimeArt =
    art === "bazi" || art === "ziwei" || art === "qimen" ? DATETIME_ARTS[art] : undefined;
  const lifeArt = LIFE_ARTS.has(art);
  // 本命盘总是先排；勾了流年占问才要求问题、才问时点。
  const questionDisabled = lifeArt && !yearly;
  const canCast = questionDisabled ? true : Boolean(question.trim());
  const medicalBrowse = art === "shanghan" || art === "jinkui" || art === "sanyin" || art === "fuxingjue";
  const wuyunArt = art === "wuyunliuqi";
  // nav 只能取 NAVS 内的 id；山/相占位标签保留上次选中的 art，只显示占位语。
  const active = NAVS.find((n) => n.id === nav)!;
  const showForm = active.arts.some((a) => a.kind === art);
  const useCustom = place === "__custom";
  const chosenPlace = (): { p: Place | null; err?: string } => {
    if (!useSolar) return { p: null };
    if (!useCustom) return { p: PLACES.find((x) => x.name === place) ?? null };
    const p: Place = { name: "自定义", lng: Number(customLng), tz: Number(customTz), region: "自定义" };
    if (
      customLng.trim() === "" || customTz.trim() === "" ||
      !Number.isFinite(p.lng) || Math.abs(p.lng) > 180 ||
      !Number.isFinite(p.tz) || Math.abs(p.tz) > 14
    ) {
      return { p: null, err: "自定义地点需填写有效经度（−180～180，西经为负）与时区（UTC −12～+14）。" };
    }
    return { p };
  };
  const placeField = (
    <div className="field">
      <label className="yearly-toggle">
        <input
          type="checkbox"
          checked={useSolar}
          onChange={(e) => setUseSolar(e.target.checked)}
        />
        真太阳时校正（{lifeArt ? "按出生地" : "按起课时所在地"}经度与均时差）
      </label>
      {!useSolar && (
        <span className="field-hint">默认直接采用填入的钟表时间</span>
      )}
      {useSolar && (
        <>
          <span className="field-label">
            地点（{lifeArt ? "出生地" : "起课时所在地"}）
          </span>
          <select value={place} onChange={(e) => setPlace(e.target.value)}>
            <option value="">未选择（不校正）</option>
            {GROUPED.map((g) => (
              <optgroup key={g.region} label={g.region}>
                {g.list.map((p) => (
                  <option key={p.name} value={p.name}>
                    {p.name}
                    {g.region === "国内" ? "" : `（${fmtUtcOffset(p.tz)}）`}
                  </option>
                ))}
              </optgroup>
            ))}
            <option value="__custom">手动输入经度与时区…</option>
          </select>
          {useCustom && (
            <div className="custom-place">
              <input
                inputMode="decimal"
                value={customLng}
                onChange={(e) => setCustomLng(e.target.value)}
                placeholder="经度（东正西负，如 87.6 / −74）"
                aria-label="自定义经度"
              />
              <input
                inputMode="decimal"
                value={customTz}
                onChange={(e) => setCustomTz(e.target.value)}
                placeholder="时区 UTC 偏移（如 8 / −5 / 5.5）"
                aria-label="自定义时区偏移"
              />
            </div>
          )}
        </>
      )}
    </div>
  );
  return (
    <div className="wizard">
      {step === "setup" && (
        <>
          <div className="nav-tabs" role="tablist" aria-label="山医命相卜">
            {NAVS.map((n) => (
              <button
                key={n.id}
                type="button"
                role="tab"
                aria-selected={nav === n.id}
                className={nav === n.id ? "nav-tab nav-tab-on" : "nav-tab"}
                onClick={() => {
                  setNav(n.id);
                  if (n.arts.length > 0) setArt(n.arts[0].kind);
                }}
              >
                {n.label}
              </button>
            ))}
          </div>
          {!showForm && <p className="nav-empty">{active.note}</p>}
          {showForm && (
            <>
          {lifeArt && (
            <label className="yearly-toggle">
              <input
                type="checkbox"
                checked={yearly}
                onChange={(e) => setYearly(e.target.checked)}
              />
              流年流月流日流时占问（默认只排本命盘）
            </label>
          )}
          {!medicalBrowse && !wuyunArt && (
            <label className="field">
              <span className="field-label">
                求测问题{questionDisabled && "（勾选流年占问后可填）"}
              </span>
              <textarea
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                rows={2}
                placeholder={questionDisabled ? "本命解读无需问题" : "想问什么，写清楚"}
                disabled={questionDisabled}
                required={!questionDisabled}
              />
            </label>
          )}
          <div className="art-picker" role="radiogroup" aria-label="术数选择">
            {active.arts.map((a) => (
              <button
                key={a.kind}
                type="button"
                role="radio"
                aria-checked={art === a.kind}
                className={art === a.kind ? "art-chip art-chip-on" : "art-chip"}
                onClick={() => setArt(a.kind)}
              >
                {a.name}
              </button>
            ))}
          </div>

          {medicalBrowse && (
            <YiGuide
              bookId={
                art === "shanghan" ? "shanghan" : art as "jinkui" | "sanyin" | "fuxingjue"
              }
              onPick={(boardText, artifacts) => finish({ boardText, artifacts })}
            />
          )}

          {wuyunArt && (
            <>
              <div className="mode-picker">
                <label>
                  <input
                    type="radio"
                    checked={wuyunMode === "year"}
                    onChange={() => setWuyunMode("year")}
                  />
                  流年推演（推算某一年的岁运六步）
                </label>
                <label>
                  <input
                    type="radio"
                    checked={wuyunMode === "natal"}
                    onChange={() => setWuyunMode("natal")}
                  />
                  先天禀赋（按出生日期定所落气步）
                </label>
              </div>
              {wuyunMode === "year" ? (
                <label className="field">
                  <span className="field-label">推演年份（公历）</span>
                  <input
                    inputMode="numeric"
                    value={wuyunYear}
                    onChange={(e) => setWuyunYear(e.target.value)}
                  />
                </label>
              ) : (
                <>
                  <label className="field">
                    <span className="field-label">出生日期（公历；只由生日定所落气步）</span>
                    <input
                      type="date"
                      value={wuyunBirth}
                      onChange={(e) => setWuyunBirth(e.target.value)}
                    />
                  </label>
                  <label className="field">
                    <span className="field-label">
                      出生时辰（选填；仅用于纳子法值经入穴一语，不影响运气盘）
                    </span>
                    <input
                      type="time"
                      value={wuyunTime}
                      onChange={(e) => setWuyunTime(e.target.value)}
                    />
                  </label>
                </>
              )}
            </>
          )}

          {art === "liuyao" && (
            <div className="mode-picker">
              <label>
                <input
                  type="radio"
                  checked={liuyaoMode === "hand"}
                  onChange={() => setLiuyaoMode("hand")}
                />
                手摇铜钱
              </label>
              <label>
                <input
                  type="radio"
                  checked={liuyaoMode === "noise"}
                  onChange={() => setLiuyaoMode("noise")}
                />
                宇宙噪声（random.org）
              </label>
            </div>
          )}

          {art === "liuyao" && placeField}

          {art === "xiaoliuren" && (
            <>
              {placeField}
              <div className="mode-picker mode-xlr">
                <button type="button" className="btn-cast" onClick={castXiaoliuren} disabled={!question.trim()}>
                  按时起课
                </button>
                <div className="stroke-row">
                  <input
                    value={strokeInput}
                    onChange={(e) => setStrokeInput(e.target.value)}
                    placeholder="或输入一至三字"
                    aria-label="字数起课用字"
                  />
                  <button
                    type="button"
                    className="btn-quiet"
                    onClick={castXiaoliurenStrokes}
                    disabled={!question.trim() || !strokeInput.trim()}
                  >
                    按字数起课
                  </button>
                </div>
              </div>
            </>
          )}

          {datetimeArt && (
            <>
              <label className="field">
                <span className="field-label">
                  {lifeArt ? "出生日期时间" : "起局时间（选填，默认此刻）"}
                </span>
                <input
                  type="datetime-local"
                  value={when}
                  onChange={(e) => setWhen(e.target.value)}
                />
              </label>
              {placeField}
            </>
          )}

          {lifeArt && yearly && (
            <label className="field">
              <span className="field-label">占问时点（选填，默认此刻）</span>
              <input
                type="datetime-local"
                value={asking}
                onChange={(e) => setAsking(e.target.value)}
              />
            </label>
          )}

          {lifeArt && (
            <div className="mode-picker">
              <label>
                <input type="radio" checked={gender === "male"} onChange={() => setGender("male")} />
                乾造（男）
              </label>
              <label>
                <input
                  type="radio"
                  checked={gender === "female"}
                  onChange={() => setGender("female")}
                />
                坤造（女）
              </label>
            </div>
          )}

          {error && <p className="wizard-error" role="alert">{error}</p>}

          {art === "liuyao" && (
            <button
              type="button"
              className="btn-cast"
              disabled={!question.trim()}
              onClick={() =>
                liuyaoMode === "hand" ? setStep("casting") : void castLiuyaoNoise()
              }
            >
              {liuyaoMode === "hand" ? "开始摇卦" : "取宇宙噪声起卦"}
            </button>
          )}
          {datetimeArt && (
            <button
              type="button"
              className="btn-cast"
              disabled={(lifeArt && !when) || !canCast}
              onClick={() => void castFromDateTime()}
            >
              {lifeArt && !yearly ? "本命解读" : "排盘"}
            </button>
          )}
          {wuyunArt && (
            <button type="button" className="btn-cast" onClick={() => void castWuyun()}>
              推演
            </button>
          )}
            </>
          )}
        </>
      )}

      {step === "casting" && (
        <CoinCaster onDone={(s) => finishLiuyao(s, "手摇")} onCancel={reset} />
      )}

      {step === "board" && outcome && (
        <>
          <BoardView
            art={art}
            question={question}
            boardText={outcome.boardText}
            artifacts={outcome.artifacts}
            readingTime={outcome.readingTime}
            methodText={outcome.methodText}
          />
          {outcome.fangs && outcome.fangs.length > 0 && (
            <p className="fang-jump">
              <span>本盘三因方：</span>
              {outcome.fangs.map((f) => (
                <button
                  key={f}
                  type="button"
                  className="btn-quiet"
                  onClick={() => setSanyinJump(f)}
                >
                  {f} · 查目录
                </button>
              ))}
            </p>
          )}
          {sanyinJump && (
            <YiGuide
              bookId="sanyin"
              focusFormula={sanyinJump}
              onPick={(boardText, artifacts) => finish({ boardText, artifacts })}
            />
          )}
          <div className="board-actions">
            <button
              type="button"
              className="btn-quiet"
              onClick={() => {
                reset();
                window.scrollTo({ top: 0 });
              }}
            >
              返回主页
            </button>
            <button type="button" className="btn-quiet" onClick={reset}>
              {medicalBrowse
                ? "返回目录"
                : wuyunArt
                  ? wuyunMode === "natal"
                    ? "再排一次"
                    : "再推一年"
                  : "再起一课"}
            </button>
          </div>
        </>
      )}

      <HistoryList onOpen={openSaved} />
    </div>
  );
}
