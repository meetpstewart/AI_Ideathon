import { useState } from "react";
import ReactMarkdown from "react-markdown";
import {
  FaComments,
  FaFileAlt,
  FaChartBar,
  FaCog,
} from "react-icons/fa";

function App() {
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);

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
                          color: "#6b7280",
                          fontSize: "0.75em",
                          marginLeft: "3px",
                          fontWeight: 600,
                        }}
                      >
                        {id}
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
      PARTIAL_SUPPORT: "#f59e0b",
      NO_SUPPORT: "#dc2626",
    };

    return (
      <div
        style={{
          marginTop: "12px",
          padding: "6px 12px",
          borderRadius: "999px",
          fontSize: "12px",
          fontWeight: 600,
          display: "inline-block",
          backgroundColor: `${colorMap[confidence]}15`,
          color: colorMap[confidence],
        }}
      >
        {confidence.replace("_", " ")} • Grounded in {grounded} document
        {grounded !== 1 ? "s" : ""}
      </div>
    );
  };

  return (
    <div style={{ display: "flex", height: "100vh", fontFamily: "Arial" }}>
      {/* Sidebar */}
      <div
        style={{
          width: "240px",
          background: "#111827",
          color: "#fff",
          padding: "20px",
        }}
      >
        <h2 style={{ marginBottom: "30px" }}>Cloud AI</h2>
        <SidebarItem icon={<FaComments />} label="Chat" active />
        <SidebarItem icon={<FaFileAlt />} label="Docs" />
        <SidebarItem icon={<FaChartBar />} label="Analytics" />
        <SidebarItem icon={<FaCog />} label="Settings" />
      </div>

      {/* Main */}
      <div
        style={{
          flex: 1,
          padding: "40px",
          background: "#f9fafb",
          overflowY: "auto",
        }}
      >
        <h1 style={{ marginBottom: "20px" }}>
          AI-Assisted Cloud Documentation Platform
        </h1>

        <div
          style={{
            background: "#ffffff",
            borderRadius: "16px",
            padding: "25px",
            height: "500px",
            overflowY: "auto",
            boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
          }}
        >
          {messages.map((msg, index) => (
            <div key={index} style={{ marginBottom: "20px" }}>
              {msg.type === "bot" ? (
                <div
                  style={{
                    background: "#ffffff",
                    padding: "18px",
                    borderRadius: "14px",
                    border: "1px solid #e5e7eb",
                  }}
                >
                  <MarkdownWithCitations text={msg.text} />

                  <ConfidenceBadge
                    confidence={msg.confidence}
                    grounded={msg.grounded}
                  />

                  {/* Collapsible Sources */}
                  {msg.sources?.length > 0 && (
                    <details style={{ marginTop: "15px" }}>
                      <summary
                        style={{
                          cursor: "pointer",
                          fontWeight: 600,
                          fontSize: "13px",
                          color: "#374151",
                        }}
                      >
                        📚 Sources ({msg.sources.length})
                      </summary>

                      {msg.sources.map((source) => (
                        <div
                          key={source.id}
                          id={`source-${source.id}`}
                          style={{
                            marginTop: "12px",
                            padding: "12px",
                            borderRadius: "10px",
                            backgroundColor: "#f3f4f6",
                            fontSize: "13px",
                          }}
                        >
                          <div style={{ fontWeight: 600 }}>
                            <a
                              href={source.uri}
                              target="_blank"
                              rel="noreferrer"
                              style={{
                                textDecoration: "none",
                                color: "#2563eb",
                              }}
                            >
                              {source.title}
                            </a>
                          </div>

                          <div
                            style={{
                              marginTop: "5px",
                              opacity: 0.75,
                            }}
                          >
                            {source.snippet}
                          </div>
                        </div>
                      ))}
                    </details>
                  )}
                </div>
              ) : (
                <div
                  style={{
                    textAlign: "right",
                    background: "#4f46e5",
                    color: "#fff",
                    padding: "12px",
                    borderRadius: "12px",
                    display: "inline-block",
                  }}
                >
                  {msg.text}
                </div>
              )}
            </div>
          ))}

          {loading && <div>🤖 Thinking...</div>}
        </div>

        {/* Input */}
        <div style={{ display: "flex", marginTop: "15px" }}>
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask about cloud documentation..."
            style={{
              flex: 1,
              padding: "12px",
              borderRadius: "10px",
              border: "1px solid #d1d5db",
            }}
            onKeyDown={(e) => e.key === "Enter" && askQuestion()}
          />
          <button
            onClick={askQuestion}
            style={{
              marginLeft: "10px",
              padding: "12px 20px",
              borderRadius: "10px",
              background: "#4f46e5",
              color: "#fff",
              border: "none",
              cursor: "pointer",
            }}
          >
            Ask
          </button>
        </div>
      </div>
    </div>
  );
}

function SidebarItem({ icon, label, active }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        padding: "12px",
        marginBottom: "10px",
        borderRadius: "8px",
        cursor: "pointer",
        background: active ? "#374151" : "transparent",
      }}
    >
      <div style={{ marginRight: "10px" }}>{icon}</div>
      <span>{label}</span>
    </div>
  );
}

export default App;