import { useState } from "react";
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
} from "react-icons/fa";

// =========================
// Stewart Brand Colors
// =========================
const TEAL = "#005670";
const TEAL_DARK = "#003d50";
const TEAL_LIGHT = "#e6f2f6";
const RED = "#CC1F2D";
const WHITE = "#FFFFFF";
const GRAY_BG = "#f5f7f8";
const GRAY_BORDER = "#e0e0e0";
const TEXT_DARK = "#1a1a1a";
const TEXT_MID = "#444444";
const FOOTER_BG = "#111111";

function App() {
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeNav, setActiveNav] = useState("Chat");

  const askQuestion = async () => {
    if (!question.trim()) return;

    const userMessage = { type: "user", text: question };
    setMessages((prev) => [...prev, userMessage]);
    setQuestion("");
    setLoading(true);

    try {
      const response = await fetch(
        "https://ai-backend-655994006172.us-central1.run.app/ask",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: userMessage.text }),
        }
      );

      const data = await response.json();

      const botMessage = {
        type: "bot",
        text: data.answer || "No response received.",
        sources: data.sources || [],
        confidence: data.confidence,
        grounded: data.grounded_documents,
      };

      setMessages((prev) => [...prev, botMessage]);
    } catch (error) {
      console.error(error);
    }

    setLoading(false);
  };

  // =========================
  // Superscript Citation Renderer
  // =========================
  const MarkdownWithCitations = ({ text }) => {
    return (
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
  };

  // =========================
  // Confidence Badge
  // =========================
  const ConfidenceBadge = ({ confidence, grounded }) => {
    if (!confidence) return null;
    const colorMap = {
      FULL_SUPPORT: "#16a34a",
      PARTIAL_SUPPORT: "#d97706",
      NO_SUPPORT: RED,
    };
    const color = colorMap[confidence];
    return (
      <div
        style={{
          marginTop: "10px",
          padding: "5px 14px",
          borderRadius: "999px",
          fontSize: "12px",
          fontWeight: 600,
          display: "inline-flex",
          alignItems: "center",
          gap: "6px",
          backgroundColor: `${color}18`,
          color: color,
          border: `1px solid ${color}40`,
          letterSpacing: "0.03em",
        }}
      >
        <span
          style={{
            width: 7,
            height: 7,
            borderRadius: "50%",
            backgroundColor: color,
            display: "inline-block",
          }}
        />
        {confidence.replace(/_/g, " ")} &mdash; {grounded} document
        {grounded !== 1 ? "s" : ""}
      </div>
    );
  };

  const navItems = [
    { icon: <FaComments />, label: "Chat" },
    { icon: <FaFileAlt />, label: "Docs" },
    { icon: <FaChartBar />, label: "Analytics" },
    { icon: <FaCog />, label: "Settings" },
  ];

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
        <div style={{ padding: "0 40px", display: "flex", alignItems: "center", height: "64px", gap: "40px" }}>
          {/* Stewart Logo */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginRight: "20px" }}>
            <div style={{ display: "flex", gap: "3px" }}>
              {[0, 1, 2].map((i) => (
                <div key={i} style={{ width: "5px", height: "22px", backgroundColor: RED, transform: "skewX(-12deg)" }} />
              ))}
            </div>
            <span style={{ fontSize: "20px", fontWeight: 700, color: TEXT_DARK, letterSpacing: "-0.5px" }}>Stewart</span>
          </div>

          {/* Nav links */}
          {["Who We Serve", "Our Services", "About Stewart", "Knowledge Base", "News"].map((item) => (
            <span
              key={item}
              style={{
                fontSize: "14px",
                fontWeight: 500,
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
      <div
        style={{
          background: `linear-gradient(135deg, ${TEAL_DARK} 0%, ${TEAL} 60%, #007a99 100%)`,
          padding: "52px 40px 48px",
          color: WHITE,
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Decorative overlay dots */}
        <div style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: "35%", opacity: 0.06, backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)", backgroundSize: "20px 20px" }} />

        <div style={{ maxWidth: "700px" }}>
          <p style={{ fontSize: "12px", fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.7)", marginBottom: "12px" }}>
            AI-Powered &bull; Enterprise Ready &bull; Governed
          </p>
          <h1 style={{ fontSize: "36px", fontWeight: 700, lineHeight: 1.2, margin: "0 0 16px" }}>
            AI-Governed Enterprise<br />Knowledge Assistant
          </h1>
          {/* Red underline accent — Stewart signature */}
          <div style={{ width: "60px", height: "4px", backgroundColor: RED, borderRadius: "2px", marginBottom: "20px" }} />
          <p style={{ fontSize: "15px", color: "rgba(255,255,255,0.82)", maxWidth: "520px", lineHeight: 1.6 }}>
            Ask questions grounded in approved cloud documentation. Every answer is cited, traceable, and governed by enterprise-grade AI.
          </p>
        </div>
      </div>

      {/* ========================= MAIN BODY ========================= */}
      <div style={{ display: "flex", flex: 1, backgroundColor: GRAY_BG }}>

        {/* Sidebar */}
        <aside style={{ width: "220px", backgroundColor: TEAL, color: WHITE, padding: "28px 0", flexShrink: 0 }}>
          <p style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.5)", padding: "0 20px", marginBottom: "12px" }}>
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
                  transition: "background 0.15s",
                }}
              >
                <span style={{ fontSize: "14px", opacity: isActive ? 1 : 0.7 }}>{icon}</span>
                {label}
              </div>
            );
          })}

          {/* Sidebar info card */}
          <div style={{ margin: "32px 16px 0", padding: "16px", backgroundColor: "rgba(255,255,255,0.1)", borderRadius: "8px", fontSize: "12px", lineHeight: 1.6, color: "rgba(255,255,255,0.8)" }}>
            <div style={{ fontWeight: 700, marginBottom: "6px", color: WHITE }}>About this tool</div>
            Answers are grounded in approved documentation using RAG + Gemini 2.5 Flash.
          </div>
        </aside>

        {/* Chat area */}
        <main style={{ flex: 1, padding: "32px 40px", display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
            <div>
              <h2 style={{ fontSize: "20px", fontWeight: 700, color: TEXT_DARK, margin: 0 }}>Knowledge Assistant</h2>
              <p style={{ fontSize: "13px", color: "#666", margin: "4px 0 0" }}>Ask anything about our cloud documentation</p>
            </div>
            <div style={{ fontSize: "12px", color: TEAL, fontWeight: 600, backgroundColor: TEAL_LIGHT, padding: "6px 14px", borderRadius: "999px", border: `1px solid ${TEAL}30` }}>
              Gemini 2.5 Flash &bull; Discovery Engine
            </div>
          </div>

          {/* Chat window */}
          <div
            style={{
              flex: 1,
              backgroundColor: WHITE,
              borderRadius: "12px",
              border: `1px solid ${GRAY_BORDER}`,
              padding: "24px",
              overflowY: "auto",
              minHeight: "420px",
              maxHeight: "520px",
              boxShadow: "0 2px 12px rgba(0,86,112,0.07)",
            }}
          >
            {messages.length === 0 && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", color: "#aaa", textAlign: "center", gap: "12px" }}>
                <div style={{ width: "56px", height: "56px", borderRadius: "50%", backgroundColor: TEAL_LIGHT, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <FaComments style={{ fontSize: "22px", color: TEAL }} />
                </div>
                <div>
                  <p style={{ fontWeight: 600, color: "#666", margin: 0 }}>Start a conversation</p>
                  <p style={{ fontSize: "13px", margin: "4px 0 0" }}>Ask a question about your cloud documentation</p>
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
                <div
                  style={{
                    width: "34px",
                    height: "34px",
                    borderRadius: "50%",
                    backgroundColor: msg.type === "user" ? TEAL : "#e8f4f8",
                    border: `2px solid ${msg.type === "user" ? TEAL_DARK : GRAY_BORDER}`,
                    flexShrink: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "13px",
                    fontWeight: 700,
                    color: msg.type === "user" ? WHITE : TEAL,
                  }}
                >
                  {msg.type === "user" ? "U" : "AI"}
                </div>

                {/* Bubble */}
                <div style={{ maxWidth: "75%" }}>
                  {msg.type === "user" ? (
                    <div
                      style={{
                        backgroundColor: TEAL,
                        color: WHITE,
                        padding: "12px 16px",
                        borderRadius: "14px 4px 14px 14px",
                        fontSize: "14px",
                        lineHeight: 1.55,
                      }}
                    >
                      {msg.text}
                    </div>
                  ) : (
                    <div
                      style={{
                        backgroundColor: WHITE,
                        border: `1px solid ${GRAY_BORDER}`,
                        padding: "16px 18px",
                        borderRadius: "4px 14px 14px 14px",
                        fontSize: "14px",
                        lineHeight: 1.65,
                        boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
                      }}
                    >
                      <MarkdownWithCitations text={msg.text} />

                      <ConfidenceBadge confidence={msg.confidence} grounded={msg.grounded} />

                      {msg.sources?.length > 0 && (
                        <details style={{ marginTop: "14px" }}>
                          <summary
                            style={{
                              cursor: "pointer",
                              fontWeight: 600,
                              fontSize: "13px",
                              color: TEAL,
                              listStyle: "none",
                              display: "flex",
                              alignItems: "center",
                              gap: "6px",
                            }}
                          >
                            <FaFileAlt style={{ fontSize: "12px" }} />
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
                                  <span
                                    style={{
                                      backgroundColor: TEAL,
                                      color: WHITE,
                                      borderRadius: "4px",
                                      padding: "1px 7px",
                                      fontSize: "11px",
                                      fontWeight: 700,
                                    }}
                                  >
                                    {source.id}
                                  </span>
                                  <a
                                    href={source.uri}
                                    target="_blank"
                                    rel="noreferrer"
                                    style={{ color: TEAL, fontWeight: 600, textDecoration: "none" }}
                                  >
                                    {source.title}
                                  </a>
                                </div>
                                <p style={{ margin: 0, color: "#555", lineHeight: 1.5 }}>{source.snippet}</p>
                              </div>
                            ))}
                          </div>
                        </details>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div style={{ display: "flex", alignItems: "center", gap: "10px", color: TEAL, fontSize: "14px" }}>
                <div style={{ display: "flex", gap: "4px" }}>
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      style={{
                        width: "7px",
                        height: "7px",
                        borderRadius: "50%",
                        backgroundColor: TEAL,
                        animation: `bounce 1.2s ${i * 0.2}s infinite`,
                      }}
                    />
                  ))}
                </div>
                Searching documentation...
              </div>
            )}
          </div>

          {/* Input bar */}
          <div
            style={{
              display: "flex",
              marginTop: "16px",
              gap: "10px",
              backgroundColor: WHITE,
              border: `1.5px solid ${GRAY_BORDER}`,
              borderRadius: "10px",
              padding: "6px 6px 6px 16px",
              boxShadow: "0 2px 8px rgba(0,86,112,0.06)",
              alignItems: "center",
            }}
          >
            <FaSearch style={{ color: "#aaa", fontSize: "14px", flexShrink: 0 }} />
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
              onKeyDown={(e) => e.key === "Enter" && askQuestion()}
            />
            <button
              onClick={askQuestion}
              disabled={!question.trim() || loading}
              style={{
                padding: "10px 20px",
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
          <p style={{ fontSize: "11px", color: "#aaa", marginTop: "8px", textAlign: "center" }}>
            Answers are grounded in approved documentation only. Powered by Google Discovery Engine + Gemini 2.5 Flash.
          </p>
        </main>
      </div>

      {/* ========================= FOOTER ========================= */}
      <footer style={{ backgroundColor: FOOTER_BG, color: "rgba(255,255,255,0.75)", padding: "32px 40px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "20px" }}>
          {/* Logo */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div style={{ display: "flex", gap: "3px" }}>
              {[0, 1, 2].map((i) => (
                <div key={i} style={{ width: "4px", height: "18px", backgroundColor: RED, transform: "skewX(-12deg)" }} />
              ))}
            </div>
            <span style={{ fontSize: "16px", fontWeight: 700, color: WHITE }}>Stewart</span>
          </div>

          {/* Links */}
          <div style={{ display: "flex", gap: "24px", fontSize: "12px" }}>
            {["Privacy", "Terms of Use", "Submit a Claim", "Contact Us"].map((item) => (
              <span key={item} style={{ cursor: "pointer", color: "rgba(255,255,255,0.6)" }}>{item}</span>
            ))}
          </div>

          {/* Social */}
          <div style={{ display: "flex", gap: "16px", fontSize: "16px", color: "rgba(255,255,255,0.6)" }}>
            <FaFacebook style={{ cursor: "pointer" }} />
            <FaInstagram style={{ cursor: "pointer" }} />
            <FaLinkedin style={{ cursor: "pointer" }} />
            <FaYoutube style={{ cursor: "pointer" }} />
          </div>
        </div>
        <div style={{ marginTop: "20px", paddingTop: "16px", borderTop: "1px solid rgba(255,255,255,0.1)", fontSize: "11px", color: "rgba(255,255,255,0.4)", textAlign: "center" }}>
          &copy; 2026 Stewart Title Guaranty Company. All Rights Reserved. AI Knowledge Assistant &mdash; Enterprise Edition.
        </div>
      </footer>

      {/* Bounce animation for loading dots */}
      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
          40% { transform: translateY(-6px); opacity: 1; }
        }
        details summary::-webkit-details-marker { display: none; }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { margin: 0; }
        a:hover { text-decoration: underline; }
      `}</style>
    </div>
  );
}

export default App;
