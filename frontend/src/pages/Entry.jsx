import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { post, get } from "../api";
import { useAccounts } from "../context/AccountsContext";

// ── 工具函数 ────────────────────────────────────────────────
function hashColor(str) {
  const palette = [
    "#e9876a",
    "#69a7e8",
    "#7dd87d",
    "#caa46a",
    "#b07de8",
    "#e87d9a",
    "#7dc8e8",
    "#e8c87d",
  ];
  let h = 0;
  for (let i = 0; i < str.length; i++)
    h = (h * 31 + str.charCodeAt(i)) & 0xfffffff;
  return palette[h % palette.length];
}

function accountLabel(name) {
  return name.split(":").pop();
}

function evalExpr(expr) {
  try {
    const n = Function(
      '"use strict"; return (' + expr.replace(/−/g, "-") + ")",
    )();
    return isFinite(n) ? Math.round(n * 100) / 100 : 0;
  } catch {
    return 0;
  }
}

function today() {
  const d = new Date();
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}

// ── LetterIcon ───────────────────────────────────────────────
function LetterIcon({ name, size = 38 }) {
  const color = hashColor(name);
  const label = accountLabel(name);
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        flexShrink: 0,
        background: color + "28",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <span style={{ fontSize: size * 0.38, fontWeight: 700, color }}>
        {label[0]?.toUpperCase()}
      </span>
    </div>
  );
}

// ── NumPad ───────────────────────────────────────────────────
function NumPad({ onKey, accent }) {
  const keys = [
    ["7", "8", "9", { id: "date", label: today(), sub: true }],
    ["4", "5", "6", { id: "+", label: "+" }],
    ["1", "2", "3", { id: "−", label: "−" }],
    [
      { id: ".", label: "·" },
      "0",
      { id: "del", label: "⌫" },
      { id: "ok", label: "完成", confirm: true },
    ],
  ];
  return (
    <div
      style={{
        padding: 12,
        display: "grid",
        gap: 8,
        gridTemplateColumns: "repeat(4, 1fr)",
        gridAutoRows: 56,
        background: "#0a0a0a",
      }}
    >
      {keys.flat().map((k, i) => {
        if (typeof k === "string")
          return (
            <button
              key={i}
              onClick={() => onKey(k)}
              style={{
                height: 56,
                border: 0,
                background: "#1e1e1e",
                color: "#f5f5f5",
                fontSize: 24,
                fontWeight: 500,
                borderRadius: 12,
                cursor: "pointer",
              }}
            >
              {k}
            </button>
          );
        const bg = k.confirm
          ? accent
          : k.id === "+" || k.id === "−"
            ? "#2a2a2a"
            : "#1e1e1e";
        const fg = k.confirm ? "#000" : "#f5f5f5";
        return (
          <button
            key={i}
            onClick={() => onKey(k.id)}
            style={{
              height: 56,
              border: 0,
              background: bg,
              color: fg,
              borderRadius: 12,
              cursor: "pointer",
              fontFamily: "inherit",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              fontSize: k.confirm ? 15 : 22,
              fontWeight: k.confirm ? 600 : 500,
              lineHeight: 1,
            }}
          >
            {k.label}
            {k.sub && (
              <span style={{ fontSize: 10, opacity: 0.55, marginTop: 2 }}>
                {today()}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ── AccountSheet（底部弹层选账户）───────────────────────────
function AccountSheet({
  title,
  accounts,
  currentId,
  excludeId,
  onPick,
  onClose,
}) {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 30,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        onClick={onClose}
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(0,0,0,0.55)",
        }}
      />
      <div
        style={{
          marginTop: "auto",
          position: "relative",
          background: "#1a1a1a",
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          maxHeight: "70%",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 -10px 40px rgba(0,0,0,0.4)",
          animation: "slideUp 0.25s cubic-bezier(0.2,0.8,0.2,1)",
        }}
      >
        <style>{`@keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}`}</style>
        <div
          style={{
            padding: "10px 0 4px",
            display: "flex",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              width: 36,
              height: 4,
              borderRadius: 2,
              background: "rgba(255,255,255,0.18)",
            }}
          />
        </div>
        <div
          style={{
            padding: "8px 16px 12px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <button
            onClick={onClose}
            style={{
              width: 32,
              height: 32,
              border: 0,
              background: "transparent",
              cursor: "pointer",
              color: "rgba(255,255,255,0.7)",
              fontSize: 20,
            }}
          >
            ✕
          </button>
          <span style={{ fontSize: 15, fontWeight: 600, color: "#f5f5f5" }}>
            {title}
          </span>
          <div style={{ width: 32 }} />
        </div>
        <div style={{ overflowY: "auto", padding: "0 16px 32px" }}>
          {accounts.map((a, i) => {
            const disabled = a.name === excludeId;
            const active = a.name === currentId;
            const color = hashColor(a.name);
            return (
              <button
                key={a.name}
                onClick={() => !disabled && onPick(a.name)}
                style={{
                  width: "100%",
                  border: 0,
                  background: "transparent",
                  padding: "12px 4px",
                  cursor: disabled ? "default" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  opacity: disabled ? 0.35 : 1,
                  borderBottom:
                    i < accounts.length - 1
                      ? "0.5px solid rgba(255,255,255,0.07)"
                      : "none",
                  fontFamily: "inherit",
                  textAlign: "left",
                }}
              >
                <LetterIcon name={a.name} size={36} />
                <div style={{ flex: 1 }}>
                  <div
                    style={{ color: "#f5f5f5", fontSize: 15, fontWeight: 500 }}
                  >
                    {a.label}
                  </div>
                  <div
                    style={{
                      color: "rgba(255,255,255,0.35)",
                      fontSize: 11,
                      marginTop: 2,
                    }}
                  >
                    {a.name}
                  </div>
                </div>
                {active && <span style={{ color, fontSize: 18 }}>✓</span>}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// 把叶子账户按二级目录分组：Expenses:Food:Lunch → group "Food"
function groupAccounts(accounts) {
  const groups = {};
  for (const a of accounts) {
    const parts = a.name.split(":");
    const groupKey = parts.length >= 3 ? parts[1] : parts[1]; // 取第二段
    if (!groups[groupKey])
      groups[groupKey] = { key: groupKey, label: groupKey, children: [] };
    groups[groupKey].children.push(a);
  }
  return Object.values(groups);
}

// ── CategoryGrid（二级分组，点击后弹子选择器）───────────────
function CategoryGrid({ accounts, value, onChange }) {
  const [subSheet, setSubSheet] = useState(null); // group key
  const groups = groupAccounts(accounts);
  const visible = groups.slice(0, 8);

  // 当前选中的 group
  const selectedGroup = value
    ? groups.find((g) => g.children.some((c) => c.name === value))
    : null;

  return (
    <>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: "14px 8px",
          padding: "4px 4px 12px",
        }}
      >
        {visible.map((g) => {
          const active = selectedGroup?.key === g.key;
          const color = hashColor("Expenses:" + g.key);
          return (
            <button
              key={g.key}
              onClick={() => {
                if (g.children.length === 1) {
                  onChange(g.children[0].name);
                } else {
                  setSubSheet(g.key);
                }
              }}
              style={{
                border: 0,
                background: "transparent",
                cursor: "pointer",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 6,
                padding: "4px 0",
                fontFamily: "inherit",
              }}
            >
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: "50%",
                  background: active ? color : color + "24",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "background 0.15s",
                  boxShadow: active ? `0 4px 16px ${color}55` : "none",
                }}
              >
                <span
                  style={{
                    fontSize: 20,
                    fontWeight: 700,
                    color: active ? "#0a0a0a" : color,
                  }}
                >
                  {g.label[0]?.toUpperCase()}
                </span>
              </div>
              <span
                style={{
                  fontSize: 11,
                  color: active ? "#f5f5f5" : "rgba(255,255,255,0.65)",
                  fontWeight: active ? 600 : 500,
                  textAlign: "center",
                  lineHeight: 1.2,
                }}
              >
                {g.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* 子账户选择底部弹层 */}
      {subSheet &&
        (() => {
          const group = groups.find((g) => g.key === subSheet);
          return (
            <div
              style={{
                position: "fixed",
                inset: 0,
                zIndex: 40,
                display: "flex",
                flexDirection: "column",
              }}
            >
              <div
                onClick={() => setSubSheet(null)}
                style={{
                  position: "absolute",
                  inset: 0,
                  background: "rgba(0,0,0,0.55)",
                }}
              />
              <div
                style={{
                  marginTop: "auto",
                  position: "relative",
                  background: "#1a1a1a",
                  borderTopLeftRadius: 20,
                  borderTopRightRadius: 20,
                  maxHeight: "60%",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <div
                  style={{
                    padding: "10px 0 4px",
                    display: "flex",
                    justifyContent: "center",
                  }}
                >
                  <div
                    style={{
                      width: 36,
                      height: 4,
                      borderRadius: 2,
                      background: "rgba(255,255,255,0.18)",
                    }}
                  />
                </div>
                <div
                  style={{
                    padding: "8px 16px 12px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <button
                    onClick={() => setSubSheet(null)}
                    style={{
                      width: 32,
                      height: 32,
                      border: 0,
                      background: "transparent",
                      cursor: "pointer",
                      color: "rgba(255,255,255,0.7)",
                      fontSize: 20,
                    }}
                  >
                    ✕
                  </button>
                  <span
                    style={{ fontSize: 15, fontWeight: 600, color: "#f5f5f5" }}
                  >
                    {group.label}
                  </span>
                  <div style={{ width: 32 }} />
                </div>
                <div style={{ overflowY: "auto", padding: "0 16px 32px" }}>
                  {group.children.map((a, i) => {
                    const color = hashColor(a.name);
                    return (
                      <button
                        key={a.name}
                        onClick={() => {
                          onChange(a.name);
                          setSubSheet(null);
                        }}
                        style={{
                          width: "100%",
                          border: 0,
                          background: "transparent",
                          padding: "12px 4px",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: 14,
                          borderBottom:
                            i < group.children.length - 1
                              ? "0.5px solid rgba(255,255,255,0.07)"
                              : "none",
                          fontFamily: "inherit",
                          textAlign: "left",
                        }}
                      >
                        <div
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: "50%",
                            background: color + "28",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                          }}
                        >
                          <span
                            style={{ fontSize: 14, fontWeight: 700, color }}
                          >
                            {a.label[0]?.toUpperCase()}
                          </span>
                        </div>
                        <div style={{ flex: 1 }}>
                          <div
                            style={{
                              color: "#f5f5f5",
                              fontSize: 15,
                              fontWeight: 500,
                            }}
                          >
                            {a.label}
                          </div>
                          <div
                            style={{
                              color: "rgba(255,255,255,0.35)",
                              fontSize: 11,
                              marginTop: 2,
                            }}
                          >
                            {a.name}
                          </div>
                        </div>
                        {value === a.name && (
                          <span style={{ color, fontSize: 18 }}>✓</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })()}
    </>
  );
}

// ── MetaRow ──────────────────────────────────────────────────
function MetaRow({
  assetId,
  assets,
  note,
  payee,
  onNoteChange,
  onPickAsset,
  onPickPayee,
}) {
  const chip = (icon, text, onClick, hint) => (
    <button
      onClick={onClick}
      style={{
        border: 0,
        background: "#1e1e1e",
        color: "#dcdcdc",
        borderRadius: 999,
        padding: "7px 12px 7px 10px",
        display: "flex",
        alignItems: "center",
        gap: 5,
        fontFamily: "inherit",
        fontSize: 13,
        cursor: onClick ? "pointer" : "default",
        flexShrink: 0,
      }}
    >
      <span style={{ fontSize: 13 }}>{icon}</span>
      <span>{text}</span>
      {hint && (
        <span style={{ color: "rgba(255,255,255,0.35)", fontSize: 11 }}>
          {hint}
        </span>
      )}
    </button>
  );
  const assetObj = assets.find((a) => a.name === assetId);
  return (
    <div style={{ padding: "0 16px 10px" }}>
      <div
        style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 2 }}
      >
        {chip("📅", today())}
        {chip("💳", assetObj?.label || "账户", onPickAsset)}
        <button
          onClick={onPickPayee}
          style={{
            border: 0,
            background: "#1e1e1e",
            color: payee ? "#f5f5f5" : "rgba(255,255,255,0.4)",
            borderRadius: 999,
            padding: "7px 12px",
            fontFamily: "inherit",
            fontSize: 13,
            cursor: "pointer",
            flexShrink: 0,
          }}
        >
          {payee || "商家（选填）"}
        </button>
      </div>
      <div
        style={{
          marginTop: 8,
          display: "flex",
          alignItems: "center",
          gap: 8,
          background: "#1e1e1e",
          borderRadius: 12,
          padding: "10px 12px",
        }}
      >
        <span style={{ fontSize: 14, opacity: 0.4 }}>✏️</span>
        <input
          value={note}
          onChange={(e) => onNoteChange(e.target.value)}
          placeholder="备注 · 商家、用途..."
          style={{
            flex: 1,
            background: "transparent",
            border: 0,
            color: "#f5f5f5",
            fontSize: 14,
            fontFamily: "inherit",
            outline: "none",
          }}
        />
      </div>
    </div>
  );
}

// ── PayeeSheet（商家输入弹层）────────────────────────────────
function PayeeSheet({ value, onChange, onClose }) {
  const [input, setInput] = useState(value);
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 30,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        onClick={onClose}
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(0,0,0,0.55)",
        }}
      />
      <div
        style={{
          marginTop: "auto",
          position: "relative",
          background: "#1a1a1a",
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          padding: "16px 20px 40px",
        }}
      >
        <div
          style={{
            color: "#f5f5f5",
            fontSize: 15,
            fontWeight: 600,
            marginBottom: 14,
          }}
        >
          商家名称（选填）
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <input
            autoFocus
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="例：KFC、星巴克..."
            style={{
              flex: 1,
              height: 46,
              padding: "0 14px",
              background: "#2a2a2a",
              border: 0,
              borderRadius: 12,
              color: "#f5f5f5",
              fontSize: 15,
              fontFamily: "inherit",
              outline: "none",
            }}
          />
          <button
            onClick={() => {
              onChange(input);
              onClose();
            }}
            style={{
              height: 46,
              padding: "0 18px",
              background: "#c8a96e",
              border: 0,
              borderRadius: 12,
              color: "#000",
              fontSize: 15,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            确认
          </button>
        </div>
      </div>
    </div>
  );
}

// ── TextMode ─────────────────────────────────────────────────
function TextMode({ accent, onSubmitDone }) {
  const [text, setText] = useState("");
  const [parsed, setParsed] = useState(null);
  const [parsing, setParsing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleParse = async () => {
    if (!text.trim()) return;
    setParsing(true);
    setError("");
    setParsed(null);
    const res = await post("/api/entry/parse", { text });
    if (res?.error) setError(res.error);
    else setParsed(res);
    setParsing(false);
  };

  const handleConfirm = async () => {
    if (!parsed?.raw) return;
    setSubmitting(true);
    const res = await post("/api/entry/submit", { data: parsed.raw });
    if (res?.error) setError(res.error);
    else onSubmitDone();
    setSubmitting(false);
  };

  const examples = [
    "35 CMB KFC 午饭",
    "咖啡 22 manner 支付宝",
    "打车 48.5 滴滴",
    "工资 18500 招行",
  ];

  return (
    <div
      style={{
        flex: 1,
        padding: "0 16px",
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
        overflowY: "auto",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          color: "rgba(255,255,255,0.55)",
          fontSize: 12,
          fontWeight: 500,
          padding: "0 4px 8px",
        }}
      >
        <span style={{ color: accent }}>✦</span>
        <span>自然语言记账 · AI 自动解析金额、账户、分类</span>
      </div>
      <div
        style={{
          background: "#1a1a1a",
          borderRadius: 16,
          padding: 14,
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        <textarea
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setParsed(null);
          }}
          placeholder={
            "例如:  35 CMB KFC 午饭\n     咖啡 22 manner 支付宝\n     打车 48.5 滴滴"
          }
          style={{
            width: "100%",
            minHeight: 90,
            resize: "none",
            background: "transparent",
            border: 0,
            outline: "none",
            color: "#f5f5f5",
            fontFamily: "inherit",
            fontSize: 16,
            lineHeight: 1.5,
            padding: 0,
          }}
        />
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            flexWrap: "wrap",
          }}
        >
          {examples.map((ex) => (
            <button
              key={ex}
              onClick={() => {
                setText(ex);
                setParsed(null);
              }}
              style={{
                border: 0,
                background: "rgba(255,255,255,0.06)",
                color: "rgba(255,255,255,0.65)",
                padding: "5px 10px",
                borderRadius: 999,
                fontSize: 11,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              {ex}
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={handleParse}
        disabled={!text.trim() || parsing}
        style={{
          marginTop: 10,
          height: 46,
          border: 0,
          borderRadius: 14,
          background: text.trim() ? accent : "rgba(255,255,255,0.06)",
          color: text.trim() ? "#0a0a0a" : "rgba(255,255,255,0.35)",
          cursor: text.trim() ? "pointer" : "default",
          fontFamily: "inherit",
          fontSize: 15,
          fontWeight: 600,
        }}
      >
        {parsing ? "解析中..." : "✦ 解析"}
      </button>

      {error && (
        <div style={{ color: "#ff6b6b", fontSize: 13, padding: "8px 4px" }}>
          {error}
        </div>
      )}

      {parsed && (
        <div
          style={{
            marginTop: 12,
            background: "#1a1a1a",
            borderRadius: 16,
            border: `1px solid ${accent}55`,
            padding: "14px 14px 12px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              color: accent,
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: 0.4,
              marginBottom: 8,
            }}
          >
            <span>✓ 解析结果</span>
          </div>
          <div
            style={{
              fontSize: 30,
              fontWeight: 700,
              color: "#f5f5f5",
              letterSpacing: -1,
              marginBottom: 8,
            }}
          >
            <span style={{ fontSize: 18, color: "#e9876a" }}>−¥</span>
            {parsed.amount?.toFixed(2)}
          </div>
          {[
            { label: "账户", value: parsed.from_account },
            { label: "分类", value: parsed.to_account },
            { label: "商家", value: parsed.payee },
            { label: "备注", value: parsed.narration },
          ].map((row) =>
            row.value ? (
              <div
                key={row.label}
                style={{
                  display: "flex",
                  gap: 10,
                  padding: "6px 0",
                  fontSize: 13,
                  borderTop: "0.5px solid rgba(255,255,255,0.06)",
                }}
              >
                <span style={{ color: "rgba(255,255,255,0.4)", width: 36 }}>
                  {row.label}
                </span>
                <span style={{ color: "#f5f5f5", fontWeight: 500 }}>
                  {row.value}
                </span>
              </div>
            ) : null,
          )}
          <button
            onClick={handleConfirm}
            disabled={submitting}
            style={{
              marginTop: 10,
              width: "100%",
              height: 40,
              border: 0,
              background: accent,
              color: "#0a0a0a",
              borderRadius: 10,
              cursor: "pointer",
              fontFamily: "inherit",
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            {"确认入账 →"}
          </button>
        </div>
      )}
      <div style={{ height: 24 }} />
    </div>
  );
}

// ── TransferBody ─────────────────────────────────────────────
function TransferBody({
  fromId,
  toId,
  assets,
  onPickFrom,
  onPickTo,
  note,
  onNoteChange,
}) {
  const from = assets.find((a) => a.name === fromId);
  const to = assets.find((a) => a.name === toId);
  const row = (label, obj, onClick) => (
    <button
      onClick={onClick}
      style={{
        width: "100%",
        border: 0,
        background: "#1e1e1e",
        cursor: "pointer",
        borderRadius: 14,
        padding: "12px 60px 12px 14px",
        display: "flex",
        alignItems: "center",
        gap: 12,
        fontFamily: "inherit",
        textAlign: "left",
      }}
    >
      <LetterIcon name={obj?.name || "unknown"} size={42} />
      <div style={{ flex: 1 }}>
        <div
          style={{
            fontSize: 11,
            color: "rgba(255,255,255,0.45)",
            marginBottom: 3,
          }}
        >
          {label}
        </div>
        <div style={{ fontSize: 15, color: "#f5f5f5", fontWeight: 600 }}>
          {obj?.label || "选择账户"}
        </div>
      </div>
    </button>
  );
  return (
    <div
      style={{
        padding: "4px 16px 0",
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      {row("转出", from, onPickFrom)}
      {row("转入", to, onPickTo)}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          background: "#1e1e1e",
          borderRadius: 12,
          padding: "10px 12px",
          marginTop: 4,
        }}
      >
        <span style={{ fontSize: 14, opacity: 0.4 }}>✏️</span>
        <input
          value={note}
          onChange={(e) => onNoteChange(e.target.value)}
          placeholder="备注 · 转账事由..."
          style={{
            flex: 1,
            background: "transparent",
            border: 0,
            color: "#f5f5f5",
            fontSize: 14,
            fontFamily: "inherit",
            outline: "none",
          }}
        />
      </div>
    </div>
  );
}

// ── 主组件 Entry ─────────────────────────────────────────────
export default function Entry() {
  const navigate = useNavigate();
  const { accounts, setAccounts } = useAccounts();

  const [kind, setKind] = useState("exp"); // exp | inc | tr
  const [mode, setMode] = useState("graphic"); // graphic | text
  const [expr, setExpr] = useState("0");
  const [catId, setCatId] = useState(null);
  const [assetId, setAssetId] = useState(accounts.assets[0]?.name || "");
  const [fromId, setFromId] = useState(accounts.assets[0]?.name || "");
  const [toId, setToId] = useState(accounts.assets[1]?.name || "");
  const [note, setNote] = useState("");
  const [payee, setPayee] = useState("");
  const [sheet, setSheet] = useState(null); // null | 'asset' | 'from' | 'to' | 'payee'
  const [error, setError] = useState("");

  // 刷新页面后 Context 重置，重新拉取账户数据
  useEffect(() => {
    if (accounts.expenses.length === 0) {
      get("/api/accounts").then((data) => {
        if (data) setAccounts(data);
      });
    }
  }, []);

  const accent = "#c8a96e";
  const catAccounts = kind === "exp" ? accounts.expenses : accounts.income;

  const onKey = (k) => {
    setExpr((prev) => {
      if (k === "del") {
        const v = prev.slice(0, -1);
        return v === "" ? "0" : v;
      }
      if (k === "ok") return prev;
      if (k === "date") return prev;
      if (k === "+" || k === "−") {
        const last = prev.slice(-1);
        if ("+−".includes(last)) return prev.slice(0, -1) + k;
        return prev + k;
      }
      if (prev === "0" && k !== ".") return k;
      if (k === "." && prev.split(/[+−]/).pop().includes(".")) return prev;
      return prev + k;
    });
  };

  const handleSubmit = async () => {
    const amount = evalExpr(expr);
    if (!amount || amount <= 0) {
      setError("请输入金额");
      return;
    }
    const from = kind === "tr" ? fromId : assetId;
    const to = kind === "tr" ? toId : catId;
    if (!to) {
      setError("请选择分类");
      return;
    }

    setError("");
    const built = await post("/api/entry/build", {
      amount,
      from_account: from,
      to_account: to,
      payee,
      narration: note,
    });
    if (built?.error) {
      setError(built.error);
      return;
    }
    const res = await post("/api/entry/submit", { data: built.raw });
    if (res?.error) setError(res.error);
    else navigate("/");
  };

  const kindColor =
    kind === "exp" ? "#e9876a" : kind === "inc" ? "#7dd87d" : accent;

  return (
    <div
      style={{
        height: "100dvh",
        display: "flex",
        flexDirection: "column",
        background: "#0a0a0a",
        color: "#f5f5f5",
        fontFamily: '-apple-system,"SF Pro",system-ui,sans-serif',
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* 顶部栏 */}
      <div
        style={{
          padding: "52px 16px 8px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexShrink: 0,
        }}
      >
        <button
          onClick={() => navigate("/")}
          style={{
            width: 36,
            height: 36,
            borderRadius: "50%",
            border: 0,
            background: "#1a1a1a",
            cursor: "pointer",
            color: "rgba(255,255,255,0.6)",
            fontSize: 18,
          }}
        >
          ✕
        </button>

        {/* 支出/收入/转账 */}
        <div
          style={{
            display: "flex",
            gap: 4,
            padding: 3,
            borderRadius: 999,
            background: "rgba(255,255,255,0.07)",
          }}
        >
          {[
            { id: "exp", label: "支出" },
            { id: "inc", label: "收入" },
            { id: "tr", label: "转账" },
          ].map((o) => {
            const ac =
              o.id === "exp" ? "#e9876a" : o.id === "inc" ? "#7dd87d" : accent;
            return (
              <button
                key={o.id}
                onClick={() => {
                  setKind(o.id);
                  setCatId(null);
                }}
                style={{
                  height: 30,
                  padding: "0 14px",
                  border: 0,
                  cursor: "pointer",
                  borderRadius: 999,
                  fontFamily: "inherit",
                  background: kind === o.id ? "#2a2a2a" : "transparent",
                  color: kind === o.id ? ac : "rgba(255,255,255,0.55)",
                  fontSize: 13,
                  fontWeight: kind === o.id ? 600 : 500,
                }}
              >
                {o.label}
              </button>
            );
          })}
        </div>

        {/* 图形/文字模式切换 */}
        <button
          onClick={() => setMode((m) => (m === "graphic" ? "text" : "graphic"))}
          style={{
            width: 36,
            height: 36,
            borderRadius: "50%",
            border: 0,
            cursor: "pointer",
            background: mode === "text" ? accent + "22" : "#1a1a1a",
            color: mode === "text" ? accent : "rgba(255,255,255,0.6)",
            fontSize: 16,
          }}
        >
          {mode === "graphic" ? "⌨" : "⊞"}
        </button>
      </div>

      {mode === "text" ? (
        <TextMode accent={accent} onSubmitDone={() => navigate("/")} />
      ) : kind === "tr" ? (
        <>
          {/* 转账金额 */}
          <div style={{ padding: "8px 20px 10px", flexShrink: 0 }}>
            <span
              style={{
                fontSize: 42,
                fontWeight: 700,
                color: accent,
                letterSpacing: -1.5,
              }}
            >
              <span style={{ fontSize: 28 }}>¥</span>
              {expr}
            </span>
          </div>
          <div style={{ flex: 1, overflowY: "auto" }}>
            <TransferBody
              fromId={fromId}
              toId={toId}
              assets={accounts.assets}
              onPickFrom={() => setSheet("from")}
              onPickTo={() => setSheet("to")}
              note={note}
              onNoteChange={setNote}
            />
          </div>
          {error && (
            <div
              style={{ color: "#ff6b6b", fontSize: 13, padding: "0 20px 4px" }}
            >
              {error}
            </div>
          )}
          <NumPad
            onKey={(k) => (k === "ok" ? handleSubmit() : onKey(k))}
            accent={accent}
          />
        </>
      ) : (
        <>
          {/* 支出/收入金额 */}
          <div style={{ padding: "4px 20px 10px", flexShrink: 0 }}>
            <span
              style={{
                fontSize: 42,
                fontWeight: 700,
                color: "#f5f5f5",
                letterSpacing: -1.5,
              }}
            >
              <span style={{ fontSize: 28, color: kindColor }}>
                {kind === "exp" ? "−" : "+"}¥
              </span>
              {expr}
            </span>
          </div>

          {/* 中间可滚动区域 */}
          <div style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
            <div style={{ padding: "0 16px" }}>
              <div
                style={{
                  background: "#1a1a1a",
                  borderRadius: 16,
                  padding: "10px 8px 4px",
                }}
              >
                <div
                  style={{
                    padding: "0 10px 6px",
                    color: "rgba(255,255,255,0.4)",
                    fontSize: 11,
                    letterSpacing: 0.4,
                  }}
                >
                  {kind === "exp" ? "支出分类" : "收入分类"}
                </div>
                <CategoryGrid
                  accounts={catAccounts}
                  value={catId}
                  onChange={setCatId}
                />
              </div>
            </div>
            <div style={{ height: 10 }} />
            <MetaRow
              assetId={assetId}
              assets={accounts.assets}
              note={note}
              payee={payee}
              onNoteChange={setNote}
              onPickAsset={() => setSheet("asset")}
              onPickPayee={() => setSheet("payee")}
            />
            {error && (
              <div
                style={{
                  color: "#ff6b6b",
                  fontSize: 13,
                  padding: "0 20px 4px",
                }}
              >
                {error}
              </div>
            )}
          </div>

          {/* NumPad 固定底部 */}
          <div style={{ flexShrink: 0 }}>
            <NumPad
              onKey={(k) => (k === "ok" ? handleSubmit() : onKey(k))}
              accent={accent}
            />
          </div>
        </>
      )}

      {/* 账户选择弹层 */}
      {sheet === "asset" && (
        <AccountSheet
          title="选择账户"
          accounts={accounts.assets}
          currentId={assetId}
          onPick={(id) => {
            setAssetId(id);
            setSheet(null);
          }}
          onClose={() => setSheet(null)}
        />
      )}
      {sheet === "from" && (
        <AccountSheet
          title="转出账户"
          accounts={accounts.assets}
          currentId={fromId}
          excludeId={toId}
          onPick={(id) => {
            setFromId(id);
            setSheet(null);
          }}
          onClose={() => setSheet(null)}
        />
      )}
      {sheet === "to" && (
        <AccountSheet
          title="转入账户"
          accounts={accounts.assets}
          currentId={toId}
          excludeId={fromId}
          onPick={(id) => {
            setToId(id);
            setSheet(null);
          }}
          onClose={() => setSheet(null)}
        />
      )}
      {sheet === "payee" && (
        <PayeeSheet
          value={payee}
          onChange={setPayee}
          onClose={() => setSheet(null)}
        />
      )}
    </div>
  );
}
