"use client";

/** 标题即主页入口：广播 shushu:home，Wizard 收回结果态；滚回页首。 */
export function Masthead() {
  const home = () => {
    window.dispatchEvent(new CustomEvent("shushu:home"));
    window.scrollTo({ top: 0 });
  };
  return (
    <header
      className="masthead masthead-home"
      onClick={home}
      role="button"
      tabIndex={0}
      aria-label="返回主页"
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") home();
      }}
    >
      <span className="seal" aria-hidden="true">
        五<br />术
      </span>
      <h1 className="mast-title">道家五术</h1>
    </header>
  );
}
