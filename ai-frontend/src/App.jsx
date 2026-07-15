import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import {
  FaComments,
  FaFileAlt,
  FaChartBar,
  FaCog,
  FaSearch,
  FaPaperPlane,
  FaThumbsUp,
  FaThumbsDown,
  FaLightbulb,
  FaCheckCircle,
  FaExclamationTriangle,
  FaTimesCircle,
} from "react-icons/fa";
import stewartLogo from "./assets/stewart-logo.svg";

// =========================
// Stewart Brand Colors
// =========================
const TEAL        = "#005670";
const TEAL_DARK   = "#003d50";
const TEAL_LIGHT  = "#e6f2f6";
const RED         = "#9B1B30";
const WHITE       = "#FFFFFF";
const GRAY_BG     = "#f5f7f8";
const GRAY_BORDER = "#e0e0e0";
const TEXT_DARK   = "#231F20";
const TEXT_MID    = "#555555";
const FOOTER_BG   = "#111111";

function App() {
  const [question, setQuestion]                       = useState("");
  const [messages, setMessages]                       = useState([]);
  const [loading, setLoading]                         = useState(false);
  const [activeNav, setActiveNav]                     = useState("Chat");
  const [conversationHistory, setConversationHistory] = useState([]);
  const chatEndRef = useRef(null);

  useEffect(() => {
    if (activeNav === "Chat") {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, loading, activeNav]);

  const askQuestion = async (text) => {
    const q = (text || question).trim();
    if (!q) return;
    if (activeNav !== "Chat") setActiveNav("Chat");

    const userMessage = { type: "user", text: q };
    setMessages((prev) => [...prev, userMessage]);
    setQuestion("");
    setLoading(true);

    const updatedHistory = [...conversationHistory, { role: "user", content: q }];

    try {
      const response = await fetch(
        "https://ai-knowledge-backend-880000498775.us-central1.run.app/ask",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: q, conversation_history: conversationHistory }),
        }
      );
      const data = await response.json();
      const answerText = data.answer || "No response received.";

      const botMessage = {
        type: "bot",
        text: answerText,
        sources: data.sources || [],
        confidence: data.confidence,
        grounded: data.grounded_documents,
        followUps: data.follow_up_questions || [],
        feedback: null,
        id: Date.now(),
      };

      setMessages((prev) => [...prev, botMessage]);
      setConversationHistory([...updatedHistory, { role: "assistant", content: answerText }]);
    } catch (error) {
      console.error(error);
      setMessages((prev) => [...prev, {
        type: "bot",
        text: "Sorry, something went wrong. Please try again.",
        sources: [], confidence: null, grounded: 0,
        followUps: [], feedback: null, id: Date.now(),
      }]);
    }
    setLoading(false);
  };

  const handleFeedback = (msgId, value) => {
    setMessages((prev) =>
      prev.map((m) => m.id === msgId ? { ...m, feedback: m.feedback === value ? null : value } : m)
    );
  };

  const clearChat = () => { setMessages([]); setConversationHistory([]); };

  // ============================================================
  // Analytics — derived from messages state
  // ============================================================
  const analyticsData = (() => {
    const botMessages = messages.filter((m) => m.type === "bot" && m.confidence);
    const total       = botMessages.length;
    const full        = botMessages.filter((m) => m.confidence === "FULL_SUPPORT").length;
    const partial     = botMessages.filter((m) => m.confidence === "PARTIAL_SUPPORT").length;
    const none        = botMessages.filter((m) => m.confidence === "NO_SUPPORT").length;
    const thumbsUp    = messages.filter((m) => m.feedback === "up").length;
    const thumbsDown  = messages.filter((m) => m.feedback === "down").length;
    const turns       = conversationHistory.filter((m) => m.role === "user").length;

    // Tally source appearances
    const sourceCounts = {};
    botMessages.forEach((m) => {
      (m.sources || []).forEach((s) => {
        sourceCounts[s.title] = (sourceCounts[s.title] || 0) + 1;
      });
    });
    const topSources = Object.entries(sourceCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    return { total, full, partial, none, thumbsUp, thumbsDown, turns, topSources };
  })();

  // =========================
  // Code Block with Copy Button
  // =========================
  const CodeBlock = ({ language, children }) => {
    const [copied, setCopied] = useState(false);
    const code = String(children).replace(/\n$/, "");
    const handleCopy = () => {
      navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    };
    return (
      <div style={{ margin: "12px 0", borderRadius: "8px", overflow: "hidden", border: "1px solid #2d2d3d" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center",
          backgroundColor: "#2d2d3d", padding: "6px 14px" }}>
          <span style={{ fontSize: "11px", color: "#999", fontFamily: "monospace" }}>
            {language || "code"}
          </span>
          <button onClick={handleCopy} style={{
            background: copied ? "#166534" : "transparent",
            border: `1px solid ${copied ? "#16a34a" : "#555"}`,
            color: copied ? "#4ade80" : "#bbb",
            padding: "3px 10px", borderRadius: "4px", fontSize: "11px",
            cursor: "pointer", display: "flex", alignItems: "center", gap: "5px",
            transition: "all 0.2s",
          }}>
            {copied ? "✓ Copied!" : "⎘ Copy"}
          </button>
        </div>
        <pre style={{ backgroundColor: "#1e1e2e", margin: 0, padding: "16px 18px",
          overflowX: "auto", fontFamily: "'Consolas', 'Courier New', monospace",
          fontSize: "13px", lineHeight: 1.65, color: "#e2e8f0" }}>
          <code style={{ fontFamily: "inherit" }}>{code}</code>
        </pre>
      </div>
    );
  };

  // =========================
  // Citation Renderer
  // =========================
  const CitationText = ({ children }) => {
    if (typeof children !== "string") return children;
    const parts = children.split(/(\[\d+\])/g);
    return (
      <>
        {parts.map((part, index) => {
          const match = part.match(/\[(\d+)\]/);
          if (match) {
            const id = match[1];
            return (
              <sup key={index} onClick={() =>
                document.getElementById(`source-${id}`)?.scrollIntoView({ behavior: "smooth" })
              } style={{ cursor: "pointer", color: TEAL, fontSize: "0.75em", marginLeft: "2px", fontWeight: 700 }}>
                [{id}]
              </sup>
            );
          }
          return part;
        })}
      </>
    );
  };

  const MarkdownWithCitations = ({ text }) => (
    <ReactMarkdown
      components={{
        code({ node, inline, className, children, ...props }) {
          const language = /language-(\w+)/.exec(className || "")?.[1] || "";
          const code = String(children).replace(/\n$/, "");
          const isMultiLine = code.includes("\n");
          const isSubstantial = code.length > 40;
          if (!inline && (isMultiLine || isSubstantial)) {
            return <CodeBlock language={language}>{children}</CodeBlock>;
          }
          return (
            <code style={{ backgroundColor: "#f0f4f8", padding: "2px 6px", borderRadius: "4px",
              fontFamily: "'Consolas', monospace", fontSize: "0.88em", color: "#1a365d" }} {...props}>
              {children}
            </code>
          );
        },
        text({ children }) {
          return <CitationText>{children}</CitationText>;
        },
      }}
    >
      {text}
    </ReactMarkdown>
  );

  // =========================
  // Confidence Badge
  // =========================
  const ConfidenceBadge = ({ confidence, grounded }) => {
    if (!confidence) return null;
    const map = {
      FULL_SUPPORT:    { color: "#16a34a", label: "Full Support" },
      PARTIAL_SUPPORT: { color: "#d97706", label: "Partial Support" },
      NO_SUPPORT:      { color: RED,       label: "No Support" },
    };
    const { color, label } = map[confidence];
    return (
      <div style={{
        marginTop: "10px", padding: "4px 12px", borderRadius: "999px",
        fontSize: "11px", fontWeight: 700, display: "inline-flex", alignItems: "center", gap: "6px",
        backgroundColor: `${color}18`, color, border: `1px solid ${color}40`,
        letterSpacing: "0.04em", textTransform: "uppercase",
      }}>
        <span style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: color, display: "inline-block" }} />
        {label} &mdash; {grounded} doc{grounded !== 1 ? "s" : ""}
      </div>
    );
  };

  // =========================
  // Follow-up Chips
  // =========================
  const FollowUpChips = ({ questions }) => {
    if (!questions?.length) return null;
    return (
      <div style={{ marginTop: "14px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px",
          fontSize: "11px", fontWeight: 700, color: TEXT_MID, textTransform: "uppercase", letterSpacing: "0.06em" }}>
          <FaLightbulb style={{ color: "#d97706", fontSize: "11px" }} />
          Suggested follow-ups
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
          {questions.map((q, i) => (
            <button key={i} onClick={() => askQuestion(q)}
              style={{ padding: "7px 13px", borderRadius: "999px", border: `1.5px solid ${TEAL}`,
                backgroundColor: TEAL_LIGHT, color: TEAL, fontSize: "12px", fontWeight: 500, cursor: "pointer" }}
              onMouseEnter={(e) => { e.target.style.backgroundColor = TEAL; e.target.style.color = WHITE; }}
              onMouseLeave={(e) => { e.target.style.backgroundColor = TEAL_LIGHT; e.target.style.color = TEAL; }}
            >
              {q}
            </button>
          ))}
        </div>
      </div>
    );
  };

  // =========================
  // Feedback Buttons
  // =========================
  const FeedbackButtons = ({ msgId, feedback }) => (
    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "12px",
      paddingTop: "10px", borderTop: `1px solid ${GRAY_BORDER}` }}>
      <span style={{ fontSize: "11px", color: "#aaa", fontWeight: 500 }}>Was this helpful?</span>
      {[
        { val: "up",   icon: <FaThumbsUp />,   activeColor: "#16a34a", activeBg: "#dcfce7", label: "Thanks!" },
        { val: "down", icon: <FaThumbsDown />, activeColor: RED,       activeBg: "#fee2e2", label: "Noted"   },
      ].map(({ val, icon, activeColor, activeBg, label }) => (
        <button key={val} onClick={() => handleFeedback(msgId, val)}
          style={{ background: feedback === val ? activeBg : "transparent",
            border: `1px solid ${feedback === val ? activeColor : GRAY_BORDER}`,
            borderRadius: "6px", padding: "5px 10px", cursor: "pointer",
            color: feedback === val ? activeColor : "#aaa", fontSize: "13px",
            display: "flex", alignItems: "center", gap: "5px" }}>
          {icon}
          {feedback === val && <span style={{ fontSize: "11px", fontWeight: 600 }}>{label}</span>}
        </button>
      ))}
    </div>
  );

  const navItems = [
    { icon: <FaComments />, label: "Chat"      },
    { icon: <FaFileAlt />,  label: "Docs"      },
    { icon: <FaChartBar />, label: "Analytics" },
    { icon: <FaCog />,      label: "Settings"  },
  ];

  const turnCount = conversationHistory.filter((m) => m.role === "user").length;

  // ============================================================
  // ANALYTICS VIEW
  // ============================================================
  const AnalyticsView = () => {
    const { total, full, partial, none, thumbsUp, thumbsDown, turns, topSources } = analyticsData;
    const satisfactionRate = (thumbsUp + thumbsDown) > 0
      ? Math.round((thumbsUp / (thumbsUp + thumbsDown)) * 100)
      : null;

    const StatCard = ({ label, value, color, icon }) => (
      <div style={{ backgroundColor: WHITE, borderRadius: "10px", border: `1px solid ${GRAY_BORDER}`,
        padding: "20px 24px", display: "flex", alignItems: "center", gap: "16px",
        boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
        <div style={{ width: 44, height: 44, borderRadius: "10px", backgroundColor: `${color}18`,
          display: "flex", alignItems: "center", justifyContent: "center", color, fontSize: "18px" }}>
          {icon}
        </div>
        <div>
          <div style={{ fontSize: "26px", fontWeight: 700, color: TEXT_DARK, lineHeight: 1 }}>{value}</div>
          <div style={{ fontSize: "12px", color: TEXT_MID, marginTop: "4px" }}>{label}</div>
        </div>
      </div>
    );

    const BarRow = ({ label, count, total, color }) => {
      const pct = total > 0 ? Math.round((count / total) * 100) : 0;
      return (
        <div style={{ marginBottom: "12px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "5px",
            fontSize: "13px", color: TEXT_MID }}>
            <span>{label}</span>
            <span style={{ fontWeight: 600, color }}>{count} <span style={{ color: "#aaa", fontWeight: 400 }}>({pct}%)</span></span>
          </div>
          <div style={{ height: "8px", backgroundColor: "#f0f0f0", borderRadius: "4px", overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${pct}%`, backgroundColor: color,
              borderRadius: "4px", transition: "width 0.4s ease" }} />
          </div>
        </div>
      );
    };

    return (
      <div style={{ padding: "28px 36px", overflowY: "auto" }}>
        <div style={{ marginBottom: "24px" }}>
          <h2 style={{ fontSize: "20px", fontWeight: 700, color: TEXT_DARK, margin: 0 }}>Session Analytics</h2>
          <p style={{ fontSize: "13px", color: "#888", marginTop: "4px" }}>
            Real-time insights from your current conversation session
          </p>
        </div>

        {total === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 20px", color: "#bbb" }}>
            <FaChartBar style={{ fontSize: "40px", marginBottom: "14px" }} />
            <p style={{ fontSize: "15px", fontWeight: 500, color: "#888" }}>No data yet</p>
            <p style={{ fontSize: "13px", marginTop: "6px" }}>Ask some questions in the Chat tab to see analytics here.</p>
          </div>
        ) : (
          <>
            {/* Stat cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "16px", marginBottom: "28px" }}>
              <StatCard label="Questions Asked"    value={turns}  color={TEAL}      icon={<FaComments />} />
              <StatCard label="Answers Generated"  value={total}  color="#7c3aed"   icon={<FaFileAlt />} />
              <StatCard label="Helpful Ratings"    value={thumbsUp}   color="#16a34a" icon={<FaThumbsUp />} />
              <StatCard label="Unhelpful Ratings"  value={thumbsDown} color={RED}     icon={<FaThumbsDown />} />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
              {/* Confidence breakdown */}
              <div style={{ backgroundColor: WHITE, borderRadius: "10px", border: `1px solid ${GRAY_BORDER}`,
                padding: "20px 24px", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
                <h3 style={{ fontSize: "14px", fontWeight: 700, color: TEXT_DARK, marginBottom: "18px" }}>
                  Answer Confidence Breakdown
                </h3>
                <BarRow label="Fully Grounded"    count={full}    total={total} color="#16a34a" />
                <BarRow label="Partially Grounded" count={partial} total={total} color="#d97706" />
                <BarRow label="Not Supported"      count={none}    total={total} color={RED}     />

                {/* Donut-style summary */}
                <div style={{ marginTop: "18px", paddingTop: "16px", borderTop: `1px solid ${GRAY_BORDER}`,
                  display: "flex", gap: "16px", justifyContent: "space-around" }}>
                  {[
                    { label: "Full",    count: full,    color: "#16a34a", icon: <FaCheckCircle /> },
                    { label: "Partial", count: partial, color: "#d97706", icon: <FaExclamationTriangle /> },
                    { label: "None",    count: none,    color: RED,       icon: <FaTimesCircle /> },
                  ].map(({ label, count, color, icon }) => (
                    <div key={label} style={{ textAlign: "center" }}>
                      <div style={{ color, fontSize: "20px", marginBottom: "4px" }}>{icon}</div>
                      <div style={{ fontSize: "22px", fontWeight: 700, color: TEXT_DARK }}>{count}</div>
                      <div style={{ fontSize: "11px", color: TEXT_MID }}>{label}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Satisfaction + top sources */}
              <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                {/* Satisfaction */}
                <div style={{ backgroundColor: WHITE, borderRadius: "10px", border: `1px solid ${GRAY_BORDER}`,
                  padding: "20px 24px", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
                  <h3 style={{ fontSize: "14px", fontWeight: 700, color: TEXT_DARK, marginBottom: "14px" }}>
                    User Satisfaction
                  </h3>
                  {satisfactionRate !== null ? (
                    <>
                      <div style={{ display: "flex", alignItems: "flex-end", gap: "8px", marginBottom: "10px" }}>
                        <span style={{ fontSize: "36px", fontWeight: 700, color: satisfactionRate >= 70 ? "#16a34a" : RED, lineHeight: 1 }}>
                          {satisfactionRate}%
                        </span>
                        <span style={{ fontSize: "13px", color: TEXT_MID, marginBottom: "4px" }}>positive feedback</span>
                      </div>
                      <div style={{ height: "8px", backgroundColor: "#f0f0f0", borderRadius: "4px", overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${satisfactionRate}%`,
                          backgroundColor: satisfactionRate >= 70 ? "#16a34a" : RED,
                          borderRadius: "4px", transition: "width 0.4s ease" }} />
                      </div>
                      <div style={{ display: "flex", gap: "16px", marginTop: "12px", fontSize: "12px", color: TEXT_MID }}>
                        <span style={{ color: "#16a34a", fontWeight: 600 }}>👍 {thumbsUp} helpful</span>
                        <span style={{ color: RED, fontWeight: 600 }}>👎 {thumbsDown} not helpful</span>
                      </div>
                    </>
                  ) : (
                    <p style={{ color: "#aaa", fontSize: "13px" }}>No feedback recorded yet. Use 👍 / 👎 on answers.</p>
                  )}
                </div>

                {/* Top sources */}
                <div style={{ backgroundColor: WHITE, borderRadius: "10px", border: `1px solid ${GRAY_BORDER}`,
                  padding: "20px 24px", boxShadow: "0 1px 4px rgba(0,0,0,0.05)", flex: 1 }}>
                  <h3 style={{ fontSize: "14px", fontWeight: 700, color: TEXT_DARK, marginBottom: "14px" }}>
                    Most Referenced Documents
                  </h3>
                  {topSources.length === 0 ? (
                    <p style={{ color: "#aaa", fontSize: "13px" }}>No sources cited yet.</p>
                  ) : (
                    topSources.map(([title, count], i) => (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: "10px",
                        padding: "8px 0", borderBottom: i < topSources.length - 1 ? `1px solid ${GRAY_BORDER}` : "none" }}>
                        <span style={{ minWidth: "22px", height: "22px", borderRadius: "6px",
                          backgroundColor: TEAL_LIGHT, color: TEAL, fontSize: "11px", fontWeight: 700,
                          display: "flex", alignItems: "center", justifyContent: "center" }}>
                          {i + 1}
                        </span>
                        <span style={{ flex: 1, fontSize: "13px", color: TEXT_DARK, fontWeight: 500,
                          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {title}
                        </span>
                        <span style={{ fontSize: "12px", color: TEXT_MID, fontWeight: 600,
                          backgroundColor: GRAY_BG, padding: "2px 8px", borderRadius: "999px" }}>
                          ×{count}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    );
  };

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh",
      fontFamily: "'Segoe UI', Arial, sans-serif", color: TEXT_DARK }}>

      {/* ===== TOP NAV ===== */}
      <header style={{ backgroundColor: WHITE, borderBottom: `1px solid ${GRAY_BORDER}`,
        boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }}>
        {/* Utility bar */}
        <div style={{ backgroundColor: "#f9f9f9", borderBottom: `1px solid ${GRAY_BORDER}`,
          padding: "6px 40px", display: "flex", justifyContent: "flex-end", gap: "24px",
          fontSize: "12px", color: TEXT_MID }}>
          {["Search", "Careers", "Contact Us", "Locate an Office"].map((item) => (
            <span key={item} style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}>
              {item === "Search" && <FaSearch style={{ fontSize: "10px" }} />}
              {item}
            </span>
          ))}
        </div>
        {/* Main nav */}
        <div style={{ padding: "0 40px", display: "flex", alignItems: "center", height: "64px", gap: "36px" }}>
          {/* Actual Stewart SVG logo */}
          <img src={stewartLogo} alt="Stewart" style={{ height: "36px", marginRight: "16px" }} />

          {["Who We Serve", "Our Services", "About Stewart", "Knowledge Base", "News"].map((item) => (
            <span key={item} style={{
              fontSize: "14px",
              fontWeight: item === "Knowledge Base" ? 600 : 400,
              color: item === "Knowledge Base" ? TEAL : TEXT_DARK,
              cursor: "pointer",
              borderBottom: item === "Knowledge Base" ? `2px solid ${TEAL}` : "2px solid transparent",
              paddingBottom: "2px",
            }}>
              {item}
            </span>
          ))}
        </div>
      </header>

      {/* ===== HERO BANNER ===== */}
      <div style={{
        background: `linear-gradient(135deg, ${TEAL_DARK} 0%, ${TEAL} 60%, #007a99 100%)`,
        padding: "48px 40px 44px", color: WHITE, position: "relative", overflow: "hidden",
      }}>
        <div style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: "35%", opacity: 0.05,
          backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)", backgroundSize: "20px 20px" }} />
        <div style={{ maxWidth: "700px" }}>
          <p style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase",
            color: "rgba(255,255,255,0.65)", marginBottom: "12px" }}>
            AI-Powered &bull; Enterprise Ready &bull; Governed
          </p>
          <h1 style={{ fontSize: "34px", fontWeight: 700, lineHeight: 1.2, margin: "0 0 14px" }}>
            AI-Governed Enterprise<br />Knowledge Assistant
          </h1>
          <div style={{ width: "56px", height: "4px", backgroundColor: RED, borderRadius: "2px", marginBottom: "18px" }} />
          <p style={{ fontSize: "15px", color: "rgba(255,255,255,0.8)", maxWidth: "520px", lineHeight: 1.6 }}>
            Ask questions grounded in approved cloud documentation. Every answer is cited, traceable, and governed by enterprise-grade AI.
          </p>
        </div>
      </div>

      {/* ===== BODY ===== */}
      <div style={{ display: "flex", flex: 1, backgroundColor: GRAY_BG }}>

        {/* Sidebar */}
        <aside style={{ width: "220px", backgroundColor: TEAL, color: WHITE, padding: "28px 0", flexShrink: 0 }}>
          <p style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase",
            color: "rgba(255,255,255,0.45)", padding: "0 20px", marginBottom: "12px" }}>
            Navigation
          </p>
          {navItems.map(({ icon, label }) => {
            const isActive = activeNav === label;
            return (
              <div key={label} onClick={() => setActiveNav(label)} style={{
                display: "flex", alignItems: "center", gap: "12px",
                padding: "12px 20px", cursor: "pointer",
                backgroundColor: isActive ? "rgba(255,255,255,0.15)" : "transparent",
                borderLeft: isActive ? `4px solid ${RED}` : "4px solid transparent",
                fontSize: "14px", fontWeight: isActive ? 600 : 400,
              }}>
                <span style={{ fontSize: "14px", opacity: isActive ? 1 : 0.65 }}>{icon}</span>
                {label}
              </div>
            );
          })}

          {/* Session info */}
          <div style={{ margin: "28px 16px 0", padding: "14px 16px", backgroundColor: "rgba(255,255,255,0.1)",
            borderRadius: "8px", fontSize: "12px", lineHeight: 1.7, color: "rgba(255,255,255,0.75)" }}>
            <div style={{ fontWeight: 700, marginBottom: "6px", color: WHITE, fontSize: "13px" }}>Session</div>
            <div>{turnCount} question{turnCount !== 1 ? "s" : ""} asked</div>
            <div style={{ color: "rgba(255,255,255,0.5)", fontSize: "11px" }}>Memory active</div>
            {turnCount > 0 && (
              <button onClick={clearChat} style={{
                marginTop: "10px", width: "100%", padding: "6px", borderRadius: "6px",
                border: "1px solid rgba(255,255,255,0.3)", background: "transparent",
                color: "rgba(255,255,255,0.7)", fontSize: "11px", cursor: "pointer",
              }}>
                Clear conversation
              </button>
            )}
          </div>
        </aside>

        {/* Main content area */}
        <main style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

          {/* ===== CHAT TAB ===== */}
          {activeNav === "Chat" && (
            <div style={{ flex: 1, padding: "28px 36px", display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px" }}>
                <div>
                  <h2 style={{ fontSize: "20px", fontWeight: 700, color: TEXT_DARK, margin: 0 }}>
                    Knowledge Assistant
                  </h2>
                  <p style={{ fontSize: "13px", color: "#888", margin: "4px 0 0" }}>
                    {conversationHistory.length > 0
                      ? `Continuing conversation — ${turnCount} turn${turnCount !== 1 ? "s" : ""} in context`
                      : "Ask anything about our cloud documentation"}
                  </p>
                </div>
              </div>

              {/* Chat window */}
              <div style={{
                flex: 1, backgroundColor: WHITE, borderRadius: "12px",
                border: `1px solid ${GRAY_BORDER}`, padding: "24px", overflowY: "auto",
                minHeight: "420px", maxHeight: "520px",
                boxShadow: "0 2px 12px rgba(0,86,112,0.07)",
              }}>
                {messages.length === 0 && (
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center",
                    justifyContent: "center", height: "100%", textAlign: "center", gap: "14px" }}>
                    <div style={{ width: "60px", height: "60px", borderRadius: "50%",
                      backgroundColor: TEAL_LIGHT, display: "flex", alignItems: "center",
                      justifyContent: "center" }}>
                      <FaComments style={{ fontSize: "24px", color: TEAL }} />
                    </div>
                    <div>
                      <p style={{ fontWeight: 600, color: "#555", margin: 0, fontSize: "15px" }}>Start a conversation</p>
                      <p style={{ fontSize: "13px", color: "#aaa", margin: "6px 0 0" }}>
                        Ask a question — follow-ups will maintain context automatically
                      </p>
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", justifyContent: "center", marginTop: "8px" }}>
                      {[
                        "What are the RMI ports for distributed installation?",
                        "What is the Exadata RAM capacity?",
                        "How does Cloud Run autoscaling work?",
                      ].map((q) => (
                        <button key={q} onClick={() => askQuestion(q)} style={{
                          padding: "8px 14px", borderRadius: "999px",
                          border: `1.5px solid ${TEAL}`, backgroundColor: TEAL_LIGHT,
                          color: TEAL, fontSize: "12px", cursor: "pointer", fontWeight: 500,
                        }}>
                          {q}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {messages.map((msg, index) => (
                  <div key={index} style={{
                    marginBottom: "20px", display: "flex",
                    flexDirection: msg.type === "user" ? "row-reverse" : "row",
                    alignItems: "flex-start", gap: "10px",
                  }}>
                    <div style={{
                      width: "34px", height: "34px", borderRadius: "50%",
                      backgroundColor: msg.type === "user" ? TEAL : TEAL_LIGHT,
                      border: `2px solid ${msg.type === "user" ? TEAL_DARK : GRAY_BORDER}`,
                      flexShrink: 0, display: "flex", alignItems: "center",
                      justifyContent: "center", fontSize: "12px", fontWeight: 700,
                      color: msg.type === "user" ? WHITE : TEAL,
                    }}>
                      {msg.type === "user" ? "U" : "AI"}
                    </div>

                    <div style={{ maxWidth: "78%" }}>
                      {msg.type === "user" ? (
                        <div style={{
                          backgroundColor: TEAL, color: WHITE, padding: "12px 16px",
                          borderRadius: "14px 4px 14px 14px", fontSize: "14px", lineHeight: 1.55,
                        }}>
                          {msg.text}
                        </div>
                      ) : (
                        <div style={{
                          backgroundColor: WHITE, border: `1px solid ${GRAY_BORDER}`,
                          padding: "16px 18px", borderRadius: "4px 14px 14px 14px",
                          fontSize: "14px", lineHeight: 1.65,
                          boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
                        }}>
                          <MarkdownWithCitations text={msg.text} />
                          <ConfidenceBadge confidence={msg.confidence} grounded={msg.grounded} />

                          {msg.sources?.length > 0 && (
                            <details style={{ marginTop: "12px" }}>
                              <summary style={{ cursor: "pointer", fontWeight: 600, fontSize: "12px",
                                color: TEAL, listStyle: "none", display: "flex", alignItems: "center", gap: "5px" }}>
                                <FaFileAlt style={{ fontSize: "11px" }} />
                                View Sources ({msg.sources.length})
                              </summary>
                              <div style={{ marginTop: "10px", display: "flex", flexDirection: "column", gap: "8px" }}>
                                {msg.sources.map((source) => (
                                  <div key={source.id} id={`source-${source.id}`} style={{
                                    padding: "12px 14px", borderRadius: "8px",
                                    backgroundColor: GRAY_BG, border: `1px solid ${GRAY_BORDER}`, fontSize: "13px",
                                  }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                                      <span style={{ backgroundColor: TEAL, color: WHITE, borderRadius: "4px",
                                        padding: "1px 7px", fontSize: "11px", fontWeight: 700 }}>
                                        {source.id}
                                      </span>
                                      <a href={source.uri} target="_blank" rel="noreferrer"
                                        style={{ color: TEAL, fontWeight: 600, textDecoration: "none" }}>
                                        {source.title}
                                      </a>
                                    </div>
                                    <p style={{ margin: 0, color: "#666", lineHeight: 1.5 }}>{source.snippet}</p>
                                  </div>
                                ))}
                              </div>
                            </details>
                          )}

                          <FollowUpChips questions={msg.followUps} />
                          <FeedbackButtons msgId={msg.id} feedback={msg.feedback} />
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {loading && (
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", color: TEAL, fontSize: "14px" }}>
                    <div style={{ display: "flex", gap: "4px" }}>
                      {[0, 1, 2].map((i) => (
                        <div key={i} style={{ width: "7px", height: "7px", borderRadius: "50%",
                          backgroundColor: TEAL, animation: `bounce 1.2s ${i * 0.2}s infinite` }} />
                      ))}
                    </div>
                    Searching documentation...
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Input */}
              <div style={{
                display: "flex", marginTop: "14px", gap: "10px", backgroundColor: WHITE,
                border: `1.5px solid ${question.trim() ? TEAL : GRAY_BORDER}`,
                borderRadius: "10px", padding: "6px 6px 6px 16px",
                boxShadow: "0 2px 8px rgba(0,86,112,0.06)", alignItems: "center",
              }}>
                <FaSearch style={{ color: "#bbb", fontSize: "13px", flexShrink: 0 }} />
                <input
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="Ask about cloud documentation..."
                  style={{ flex: 1, border: "none", outline: "none", fontSize: "14px",
                    color: TEXT_DARK, backgroundColor: "transparent", padding: "8px 0" }}
                  onKeyDown={(e) => e.key === "Enter" && !loading && askQuestion()}
                />
                <button onClick={() => askQuestion()} disabled={!question.trim() || loading}
                  style={{
                    padding: "10px 22px", borderRadius: "8px",
                    background: question.trim() && !loading ? TEAL : "#ccc",
                    color: WHITE, border: "none",
                    cursor: question.trim() && !loading ? "pointer" : "not-allowed",
                    fontWeight: 600, fontSize: "13px",
                    display: "flex", alignItems: "center", gap: "8px",
                  }}>
                  <FaPaperPlane style={{ fontSize: "12px" }} />
                  Ask
                </button>
              </div>
              <p style={{ fontSize: "11px", color: "#bbb", marginTop: "8px", textAlign: "center" }}>
                Answers grounded in approved documentation only
              </p>
            </div>
          )}

          {/* ===== ANALYTICS TAB ===== */}
          {activeNav === "Analytics" && <AnalyticsView />}

          {/* ===== PLACEHOLDER TABS ===== */}
          {(activeNav === "Docs" || activeNav === "Settings") && (
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
              flexDirection: "column", gap: "12px", color: "#bbb" }}>
              <FaCog style={{ fontSize: "36px" }} />
              <p style={{ fontWeight: 600, color: "#888", fontSize: "15px" }}>{activeNav} — Coming Soon</p>
              <p style={{ fontSize: "13px" }}>This section is under construction.</p>
            </div>
          )}
        </main>
      </div>

      {/* ===== FOOTER ===== */}
      <footer style={{ backgroundColor: FOOTER_BG, color: "rgba(255,255,255,0.7)", padding: "28px 40px" }}>
        <div style={{ textAlign: "center", fontSize: "11px", color: "rgba(255,255,255,0.35)" }}>
          &copy; 2026 AI Knowledge Assistant &mdash; Personal Ideathon Project
        </div>
      </footer>

      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
          40% { transform: translateY(-6px); opacity: 1; }
        }
        details summary::-webkit-details-marker { display: none; }
        a:hover { text-decoration: underline; }
      `}</style>
    </div>
  );
}

export default App;
