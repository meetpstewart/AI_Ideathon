"""
MCP server exposing the AI Knowledge Assistant's RAG pipeline as a tool.

Lets any MCP-compatible client (Claude Desktop, Claude Code, other agents)
call `ask_cloud_docs` to get answers grounded in the approved cloud
infrastructure documentation, with citations -- turning this project from
a standalone chatbot into a tool other agents can call.

Run directly for local testing:
    python mcp-server/server.py

Register in Claude Desktop (claude_desktop_config.json):
    {
      "mcpServers": {
        "cloud-docs-assistant": {
          "command": "python",
          "args": ["/absolute/path/to/mcp-server/server.py"]
        }
      }
    }
"""

import requests
from mcp.server.fastmcp import FastMCP

ASK_ENDPOINT = "https://ai-knowledge-backend-647785858624.us-central1.run.app/ask"

mcp = FastMCP("cloud-docs-assistant")


@mcp.tool()
def ask_cloud_docs(question: str) -> str:
    """
    Answer a question using Stewart's approved cloud infrastructure documentation.

    Every answer is grounded only in the approved documents and includes
    numbered citations back to the source. Use this for questions about
    cloud infrastructure configuration, network ports, installation steps,
    Oracle Cloud Infrastructure, or ARIS PPM cloud deployment topics.

    Args:
        question: The question to ask, in natural language.
    """
    response = requests.post(
        ASK_ENDPOINT,
        json={"query": question, "conversation_history": []},
        timeout=30,
    )
    response.raise_for_status()
    data = response.json()

    answer = data.get("answer", "No answer returned.")
    confidence = data.get("confidence", "UNKNOWN")
    sources = data.get("sources", [])

    result = f"{answer}\n\nConfidence: {confidence}"
    if sources:
        source_lines = "\n".join(f"[{s['id']}] {s['title']} — {s['uri']}" for s in sources)
        result += f"\n\nSources:\n{source_lines}"

    return result


if __name__ == "__main__":
    mcp.run()
