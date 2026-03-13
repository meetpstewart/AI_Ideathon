import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import {
  FaComments,
  FaFileAlt,
  FaChartBar,
  FaCog,
  FaSearch,
  FaPaperPlane,
  FaLinkedin,
  FaFacebook,
  FaInstagram,
  FaYoutube,
  FaThumbsUp,
  FaThumbsDown,
  FaLightbulb,
} from "react-icons/fa";

// =========================
// Stewart Brand Colors
// =========================
const TEAL       = "#005670";
const TEAL_DARK  = "#003d50";
const TEAL_LIGHT = "#e6f2f6";
const RED        = "#9B1B30";   // Exact Stewart brand crimson
const WHITE      = "#FFFFFF";
const GRAY_BG    = "#f5f7f8";
const GRAY_BORDER= "#e0e0e0";
const TEXT_DARK  = "#231F20";   // Stewart charcoal
const TEXT_MID   = "#555555";
const FOOTER_BG  = "#111111";

function App() {
  const [question, setQuestion]               = useState("");
  const [messages, setMessages]               = useState([]);
  const [loading, setLoading]                 = useState(false);
  const [activeNav, setActiveNav]             = useState("Chat");
  // Conversation history sent to backend: [{role, content}]
  const [conversationHistory, setConversationHistory] = useState([]);
  const chatEndRef = useRef(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const askQuestion = async (text) => {
    const q = (text || question).trim();
    if (!q) return;

    const userMessage = { type: "user", text: q };
    setMessages((prev) => [...prev, userMessage]);
    setQuestion("");
    setLoading(true);

    // Optimistically append user turn to history
    const updatedHistory = [
      ...conversationHistory,
      { role: "user", content: q },
    ];

    try {
      const response = await fetch(
        "https://ai-backend-655994006172.us-central1.run.app/ask",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query: q,
            conversation_history: conversationHistory, // send history BEFORE this turn
          }),
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
        feedback: null,   // null | "up" | "down"
        id: Date.now(),
      };

      setMessages((prev) => [...prev, botMessage]);

      // Append assistant turn to history for next request
      setConversationHistory([
        ...updatedHistory,
        { role: "assistant", content: answerText },
      ]);

    } catch (error) {
      console.error(error);
      setMessages((prev) => [
        ...prev,
        {
          type: "bot",
          text: "Sorry, something went wrong. Please try again.",
          sources: [],
          confidence: null,
          grounded: 0,
          followUps: [],
          feedback: null,
          id: Date.now(),
        },
      ]);
    }

    setLoading(false);
  };

  const handleFeedback = (msgId, value) => {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === msgId ? { ...m, feedback: m.feedback === value ? null : value } : m
      )
    );
  };

  const clearChat = () => {
    setMessages([]);
    setConversationHistory([]);
  };

  // =========================
  // Superscript Citation Renderer
  // =========================
  const MarkdownWithCitations = ({ text }) => (
    <ReactMarkdown
      components={{
        text({ children }) {
          if (typeof children !== "string") return children;
          const parts = children.split(/(\[\d+\])/g);
          return (
            <>
              {parts.map((part, index) => {
                const match = part.match(/\[(\d+)\]/);
                if (match) {
                  const id = match[1];
                  return (
                    <sup
                      key={index}
                      onClick={() =>
                        document
                          .getElementById(`source-${id}`)
                          ?.scrollIntoView({ behavior: "smooth" })
                      }
                      style={{
                        cursor: "pointer",
                        color: TEAL,
                        fontSize: "0.75em",
                        marginLeft: "2px",
                        fontWeight: 700,
                      }}
                    >
                      [{id}]
                    </sup>
                  );
                }
                return part;
              })}
            </>
          );
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
    const colorMap = {
      FULL_SUPPORT:    "#16a34a",
      PARTIAL_SUPPORT: "#d97706",
      NO_SUPPORT:      RED,
    };
    const color = colorMap[confidence];
    return (
      <div style={{
        marginTop: "10px",
        padding: "4px 12px",
        borderRadius: "999px",
        fontSize: "11px",
        fontWeight: 700,
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        backgroundColor: `${color}18`,
        color,
        border: `1px solid ${color}40`,
        letterSpacing: "0.04em",
        textTransform: "uppercase",
      }}>
        <span style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: color, display: "inline-block" }} />
        {confidence.replace(/_/g, " ")} &mdash; {grounded} doc{grounded !== 1 ? "s" : ""}
      </div>
    );
  };

  // =========================
  // Follow-up Question Chips
  // =========================
  const FollowUpChips = ({ questions }) => {
    if (!questions?.length) return null;
    return (
      <div style={{ marginTop: "14px" }}>
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          marginBottom: "8px",
          fontSize: "11px",
          fontWeight: 700,
          color: TEXT_MID,
          textTransform: "uppercase",
          letterSpacing: "0.06em",
        }}>
          <FaLightbulb style={{ color: "#d97706", fontSize: "11px" }} />
          Suggested follow-ups
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
          {questions.map((q, i) => (
            <button
              key={i}
              onClick={() => askQuestion(q)}
              style={{
                padding: "7px 13px",
                borderRadius: "999px",
                border: `1.5px solid ${TEAL}`,
                backgroundColor: TEAL_LIGHT,
                color: TEAL,
                fontSize: "12px",
                fontWeight: 500,
                cursor: "pointer",
                textAlign: "left",
                transition: "all 0.15s",
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = TEAL;
                e.target.style.color = WHITE;
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = TEAL_LIGHT;
                e.target.style.color = TEAL;
              }}
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
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: "8px",
      marginTop: "12px",
      paddingTop: "10px",
      borderTop: `1px solid ${GRAY_BORDER}`,
    }}>
      <span style={{ fontSize: "11px", color: "#aaa", fontWeight: 500 }}>Was this helpful?</span>
      <button
        onClick={() => handleFeedback(msgId, "up")}
        title="Helpful"
        style={{
          background: feedback === "up" ? "#dcfce7" : "transparent",
          border: `1px solid ${feedback === "up" ? "#16a34a" : GRAY_BORDER}`,
          borderRadius: "6px",
          padding: "5px 10px",
          cursor: "pointer",
          color: feedback === "up" ? "#16a34a" : "#aaa",
          fontSize: "13px",
          display: "flex",
          alignItems: "center",
          gap: "5px",
          transition: "all 0.15s",
        }}
      >
        <FaThumbsUp />
        {feedback === "up" && <span style={{ fontSize: "11px", fontWeight: 600 }}>Thanks!</span>}
      </button>
      <button
        onClick={() => handleFeedback(msgId, "down")}
        title="Not helpful"
        style={{
          background: feedback === "down" ? "#fee2e2" : "transparent",
          border: `1px solid ${feedback === "down" ? RED : GRAY_BORDER}`,
          borderRadius: "6px",
          padding: "5px 10px",
          cursor: "pointer",
          color: feedback === "down" ? RED : "#aaa",
          fontSize: "13px",
          display: "flex",
          alignItems: "center",
          gap: "5px",
          transition: "all 0.15s",
        }}
      >
        <FaThumbsDown />
        {feedback === "down" && <span style={{ fontSize: "11px", fontWeight: 600 }}>Noted</span>}
      </button>
    </div>
  );

  const navItems = [
    { icon: <FaComments />, label: "Chat" },
    { icon: <FaFileAlt />,  label: "Docs" },
    { icon: <FaChartBar />, label: "Analytics" },
    { icon: <FaCog />,      label: "Settings" },
  ];

  const turnCount = Math.floor(
    conversationHistory.filter((m) => m.role === "user").length
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh", fontFamily: "'Segoe UI', Arial, sans-serif", color: TEXT_DARK }}>

      {/* ========================= TOP NAV BAR ========================= */}
      <header style={{ backgroundColor: WHITE, borderBottom: `1px solid ${GRAY_BORDER}`, boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }}>
        {/* Utility bar */}
        <div style={{ backgroundColor: "#f9f9f9", borderBottom: `1px solid ${GRAY_BORDER}`, padding: "6px 40px", display: "flex", justifyContent: "flex-end", gap: "24px", fontSize: "12px", color: TEXT_MID }}>
          {["Search", "Careers", "Contact Us", "Locate an Office"].map((item) => (
            <span key={item} style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}>
              {item === "Search" && <FaSearch style={{ fontSize: "10px" }} />}
              {item}
            </span>
          ))}
        </div>

        {/* Main nav */}
        <div style={{ padding: "0 40px", display: "flex", alignItems: "center", height: "64px", gap: "36px" }}>
          {/* Stewart Logo — matching actual brand */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginRight: "20px" }}>
            <div style={{ display: "flex", gap: "3px", alignItems: "center" }}>
              {[0, 1, 2].map((i) => (
                <div key={i} style={{
                  width: "6px",
                  height: "24px",
                  backgroundColor: RED,
                  transform: "skewX(-14deg)",
                  borderRadius: "1px",
                }} />
              ))}
              {/* Right-pointing arrow shape */}
              <div style={{
                width: 0,
                height: 0,
                borderTop: "12px solid transparent",
                borderBottom: "12px solid transparent",
                borderLeft: `10px solid ${RED}`,
                marginLeft: "2px",
              }} />
            </div>
            <span style={{ fontSize: "22px", fontWeight: 700, color: TEXT_DARK, letterSpacing: "-0.5px" }}>
              stewart<sup style={{ fontSize: "10px", fontWeight: 400, verticalAlign: "super" }}>™</sup>
            </span>
          </div>

          {["Who We Serve", "Our Services", "About Stewart", "Knowledge Base", "News"].map((item) => (
            <span
              key={item}
              style={{
                fontSize: "14px",
                fontWeight: item === "Knowledge Base" ? 600 : 400,
                color: item === "Knowledge Base" ? TEAL : TEXT_DARK,
                cursor: "pointer",
                borderBottom: item === "Knowledge Base" ? `2px solid ${TEAL}` : "2px solid transparent",
                paddingBottom: "2px",
              }}
            >
              {item}
            </span>
          ))}
        </div>
      </header>

      {/* ========================= HERO BANNER ========================= */}
      <div style={{
        background: `linear-gradient(135deg, ${TEAL_DARK} 0%, ${TEAL} 60%, #007a99 100%)`,
        padding: "48px 40px 44px",
        color: WHITE,
        position: "relative",
        overflow: "hidden",
      }}>
        <div style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: "35%", opacity: 0.05, backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)", backgroundSize: "20px 20px" }} />
        <div style={{ maxWidth: "700px" }}>
          <p style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(255,255,255,0.65)", marginBottom: "12px" }}>
            AI-Powered &bull; Enterprise Ready &bull; Governed
          </p>
          <h1 style={{ fontSize: "34px", fontWeight: 700, lineHeight: 1.2, margin: "0 0 14px" }}>
            AI-Governed Enterprise<br />Knowledge Assistant
          </h1>
          {/* Stewart red underline accent */}
          <div style={{ width: "56px", height: "4px", backgroundColor: RED, borderRadius: "2px", marginBottom: "18px" }} />
          <p style={{ fontSize: "15px", color: "rgba(255,255,255,0.8)", maxWidth: "520px", lineHeight: 1.6 }}>
            Ask questions grounded in approved cloud documentation. Every answer is cited, traceable, and governed by enterprise-grade AI.
          </p>
        </div>
      </div>

      {/* ========================= MAIN BODY ========================= */}
      <div style={{ display: "flex", flex: 1, backgroundColor: GRAY_BG }}>

        {/* Sidebar */}
        <aside style={{ width: "220px", backgroundColor: TEAL, color: WHITE, padding: "28px 0", flexShrink: 0 }}>
          <p style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.45)", padding: "0 20px", marginBottom: "12px" }}>
            Navigation
          </p>
          {navItems.map(({ icon, label }) => {
            const isActive = activeNav === label;
            return (
              <div
                key={label}
                onClick={() => setActiveNav(label)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  padding: "12px 20px",
                  cursor: "pointer",
                  backgroundColor: isActive ? "rgba(255,255,255,0.15)" : "transparent",
                  borderLeft: isActive ? `4px solid ${RED}` : "4px solid transparent",
                  fontSize: "14px",
                  fontWeight: isActive ? 600 : 400,
                }}
              >
                <span style={{ fontSize: "14px", opacity: isActive ? 1 : 0.65 }}>{icon}</span>
                {label}
              </div>
            );
          })}

          {/* Session info */}
          <div style={{ margin: "28px 16px 0", padding: "14px 16px", backgroundColor: "rgba(255,255,255,0.1)", borderRadius: "8px", fontSize: "12px", lineHeight: 1.6, color: "rgba(255,255,255,0.75)" }}>
            <div style={{ fontWeight: 700, marginBottom: "6px", color: WHITE, fontSize: "13px" }}>Session</div>
            <div>{turnCount} question{turnCount !== 1 ? "s" : ""} asked</div>
            <div style={{ marginTop: "4px", color: "rgba(255,255,255,0.5)", fontSize: "11px" }}>Multi-turn memory active</div>
            {turnCount > 0 && (
              <button
                onClick={clearChat}
                style={{
                  marginTop: "10px",
                  width: "100%",
                  padding: "6px",
                  borderRadius: "6px",
                  border: "1px solid rgba(255,255,255,0.3)",
                  background: "transparent",
                  color: "rgba(255,255,255,0.7)",
                  fontSize: "11px",
                  cursor: "pointer",
                }}
              >
                Clear conversation
              </button>
            )}
          </div>

          <div style={{ margin: "12px 16px 0", padding: "14px 16px", backgroundColor: "rgba(255,255,255,0.07)", borderRadius: "8px", fontSize: "12px", lineHeight: 1.6, color: "rgba(255,255,255,0.6)" }}>
            <div style={{ fontWeight: 700, marginBottom: "4px", color: WHITE, fontSize: "13px" }}>About</div>
            RAG + Gemini 2.5 Flash grounded in approved cloud documentation.
          </div>
        </aside>

        {/* Chat area */}
        <main style={{ flex: 1, padding: "28px 36px", display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px" }}>
            <div>
              <h2 style={{ fontSize: "20px", fontWeight: 700, color: TEXT_DARK, margin: 0 }}>Knowledge Assistant</h2>
              <p style={{ fontSize: "13px", color: "#888", margin: "4px 0 0" }}>
                {conversationHistory.length > 0
                  ? `Continuing conversation — ${turnCount} turn${turnCount !== 1 ? "s" : ""} in context`
                  : "Ask anything about our cloud documentation"}
              </p>
            </div>
            <div style={{
              fontSize: "12px",
              color: TEAL,
              fontWeight: 600,
              backgroundColor: TEAL_LIGHT,
              padding: "6px 14px",
              borderRadius: "999px",
              border: `1px solid ${TEAL}30`,
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", backgroundColor: "#16a34a", display: "inline-block" }} />
              Gemini 2.5 Flash &bull; Discovery Engine
            </div>
          </div>

          {/* Chat window */}
          <div style={{
            flex: 1,
            backgroundColor: WHITE,
            borderRadius: "12px",
            border: `1px solid ${GRAY_BORDER}`,
            padding: "24px",
            overflowY: "auto",
            minHeight: "420px",
            maxHeight: "520px",
            boxShadow: "0 2px 12px rgba(0,86,112,0.07)",
          }}>
            {messages.length === 0 && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", textAlign: "center", gap: "14px" }}>
                <div style={{ width: "60px", height: "60px", borderRadius: "50%", backgroundColor: TEAL_LIGHT, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <FaComments style={{ fontSize: "24px", color: TEAL }} />
                </div>
                <div>
                  <p style={{ fontWeight: 600, color: "#555", margin: 0, fontSize: "15px" }}>Start a conversation</p>
                  <p style={{ fontSize: "13px", color: "#aaa", margin: "6px 0 0" }}>Ask a question — follow-ups will maintain context automatically</p>
                </div>
                {/* Starter questions */}
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", justifyContent: "center", marginTop: "8px" }}>
                  {[
                    "What are the RMI ports for distributed installation?",
                    "What is the Exadata RAM capacity?",
                    "How does Cloud Run autoscaling work?",
                  ].map((q) => (
                    <button
                      key={q}
                      onClick={() => askQuestion(q)}
                      style={{
                        padding: "8px 14px",
                        borderRadius: "999px",
                        border: `1.5px solid ${TEAL}`,
                        backgroundColor: TEAL_LIGHT,
                        color: TEAL,
                        fontSize: "12px",
                        cursor: "pointer",
                        fontWeight: 500,
                      }}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, index) => (
              <div
                key={index}
                style={{
                  marginBottom: "20px",
                  display: "flex",
                  flexDirection: msg.type === "user" ? "row-reverse" : "row",
                  alignItems: "flex-start",
                  gap: "10px",
                }}
              >
                {/* Avatar */}
                <div style={{
                  width: "34px",
                  height: "34px",
                  borderRadius: "50%",
                  backgroundColor: msg.type === "user" ? TEAL : TEAL_LIGHT,
                  border: `2px solid ${msg.type === "user" ? TEAL_DARK : GRAY_BORDER}`,
                  flexShrink: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "12px",
                  fontWeight: 700,
                  color: msg.type === "user" ? WHITE : TEAL,
                }}>
                  {msg.type === "user" ? "U" : "AI"}
                </div>

                {/* Bubble */}
                <div style={{ maxWidth: "78%" }}>
                  {msg.type === "user" ? (
                    <div style={{
                      backgroundColor: TEAL,
                      color: WHITE,
                      padding: "12px 16px",
                      borderRadius: "14px 4px 14px 14px",
                      fontSize: "14px",
                      lineHeight: 1.55,
                    }}>
                      {msg.text}
                    </div>
                  ) : (
                    <div style={{
                      backgroundColor: WHITE,
                      border: `1px solid ${GRAY_BORDER}`,
                      padding: "16px 18px",
                      borderRadius: "4px 14px 14px 14px",
                      fontSize: "14px",
                      lineHeight: 1.65,
                      boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
                    }}>
                      <MarkdownWithCitations text={msg.text} />

                      <ConfidenceBadge confidence={msg.confidence} grounded={msg.grounded} />

                      {/* Collapsible Sources */}
                      {msg.sources?.length > 0 && (
                        <details style={{ marginTop: "12px" }}>
                          <summary style={{
                            cursor: "pointer",
                            fontWeight: 600,
                            fontSize: "12px",
                            color: TEAL,
                            listStyle: "none",
                            display: "flex",
                            alignItems: "center",
                            gap: "5px",
                          }}>
                            <FaFileAlt style={{ fontSize: "11px" }} />
                            View Sources ({msg.sources.length})
                          </summary>
                          <div style={{ marginTop: "10px", display: "flex", flexDirection: "column", gap: "8px" }}>
                            {msg.sources.map((source) => (
                              <div
                                key={source.id}
                                id={`source-${source.id}`}
                                style={{
                                  padding: "12px 14px",
                                  borderRadius: "8px",
                                  backgroundColor: GRAY_BG,
                                  border: `1px solid ${GRAY_BORDER}`,
                                  fontSize: "13px",
                                }}
                              >
                                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                                  <span style={{
                                    backgroundColor: TEAL,
                                    color: WHITE,
                                    borderRadius: "4px",
                                    padding: "1px 7px",
                                    fontSize: "11px",
                                    fontWeight: 700,
                                  }}>
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

                      {/* Follow-up question chips */}
                      <FollowUpChips questions={msg.followUps} />

                      {/* Feedback */}
                      <FeedbackButtons msgId={msg.id} feedback={msg.feedback} />
                    </div>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div style={{ display: "flex", alignItems: "center", gap: "10px", color: TEAL, fontSize: "14px", padding: "4px 0" }}>
                <div style={{ display: "flex", gap: "4px" }}>
                  {[0, 1, 2].map((i) => (
                    <div key={i} style={{
                      width: "7px", height: "7px", borderRadius: "50%",
                      backgroundColor: TEAL,
                      animation: `bounce 1.2s ${i * 0.2}s infinite`,
                    }} />
                  ))}
                </div>
                Searching documentation...
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          {/* Input bar */}
          <div style={{
            display: "flex",
            marginTop: "14px",
            gap: "10px",
            backgroundColor: WHITE,
            border: `1.5px solid ${question.trim() ? TEAL : GRAY_BORDER}`,
            borderRadius: "10px",
            padding: "6px 6px 6px 16px",
            boxShadow: "0 2px 8px rgba(0,86,112,0.06)",
            alignItems: "center",
            transition: "border-color 0.2s",
          }}>
            <FaSearch style={{ color: "#bbb", fontSize: "13px", flexShrink: 0 }} />
            <input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask about cloud documentation..."
              style={{
                flex: 1,
                border: "none",
                outline: "none",
                fontSize: "14px",
                color: TEXT_DARK,
                backgroundColor: "transparent",
                padding: "8px 0",
              }}
              onKeyDown={(e) => e.key === "Enter" && !loading && askQuestion()}
            />
            <button
              onClick={() => askQuestion()}
              disabled={!question.trim() || loading}
              style={{
                padding: "10px 22px",
                borderRadius: "8px",
                background: question.trim() && !loading ? TEAL : "#ccc",
                color: WHITE,
                border: "none",
                cursor: question.trim() && !loading ? "pointer" : "not-allowed",
                fontWeight: 600,
                fontSize: "13px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                transition: "background 0.2s",
              }}
            >
              <FaPaperPlane style={{ fontSize: "12px" }} />
              Ask
            </button>
          </div>
          <p style={{ fontSize: "11px", color: "#bbb", marginTop: "8px", textAlign: "center" }}>
            Answers grounded in approved documentation only &bull; Powered by Google Discovery Engine + Gemini 2.5 Flash
          </p>
        </main>
      </div>

      {/* ========================= FOOTER ========================= */}
      <footer style={{ backgroundColor: FOOTER_BG, color: "rgba(255,255,255,0.7)", padding: "28px 40px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "20px" }}>
          {/* Logo */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div style={{ display: "flex", gap: "3px", alignItems: "center" }}>
              {[0, 1, 2].map((i) => (
                <div key={i} style={{ width: "5px", height: "20px", backgroundColor: RED, transform: "skewX(-14deg)", borderRadius: "1px" }} />
              ))}
              <div style={{ width: 0, height: 0, borderTop: "10px solid transparent", borderBottom: "10px solid transparent", borderLeft: `8px solid ${RED}`, marginLeft: "2px" }} />
            </div>
            <span style={{ fontSize: "16px", fontWeight: 700, color: WHITE }}>stewart</span>
          </div>
          {/* Links */}
          <div style={{ display: "flex", gap: "24px", fontSize: "12px" }}>
            {["Privacy", "Terms of Use", "Submit a Claim", "Contact Us"].map((item) => (
              <span key={item} style={{ cursor: "pointer", color: "rgba(255,255,255,0.5)" }}>{item}</span>
            ))}
          </div>
          {/* Social */}
          <div style={{ display: "flex", gap: "16px", fontSize: "16px", color: "rgba(255,255,255,0.5)" }}>
            <FaFacebook style={{ cursor: "pointer" }} />
            <FaInstagram style={{ cursor: "pointer" }} />
            <FaLinkedin style={{ cursor: "pointer" }} />
            <FaYoutube style={{ cursor: "pointer" }} />
          </div>
        </div>
        <div style={{
          marginTop: "18px",
          paddingTop: "14px",
          borderTop: "1px solid rgba(255,255,255,0.08)",
          fontSize: "11px",
          color: "rgba(255,255,255,0.35)",
          textAlign: "center",
        }}>
          &copy; 2026 Stewart Title Guaranty Company. All Rights Reserved. &mdash; AI Knowledge Assistant &bull; Enterprise Edition
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
