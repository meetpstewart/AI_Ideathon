# Cloud Docs Assistant — MCP Server

Exposes the AI Knowledge Assistant's RAG pipeline as a single MCP tool, `ask_cloud_docs`, so any MCP-compatible client (Claude Desktop, Claude Code, other agents) can call it directly instead of only being usable through the web chat UI.

It's a thin wrapper: no RAG logic is duplicated here, it just calls the already-deployed `/ask` endpoint on Cloud Run and returns the answer + citations as plain text.

## Setup

```bash
cd mcp-server
pip install -r requirements.txt
```

## Test locally with the MCP Inspector

```bash
npx @modelcontextprotocol/inspector python server.py
```

This opens a browser UI where you can call `ask_cloud_docs` directly and see the raw tool response.

## Register with Claude Desktop

Add to `claude_desktop_config.json` (Claude Desktop → Settings → Developer → Edit Config):

```json
{
  "mcpServers": {
    "cloud-docs-assistant": {
      "command": "python",
      "args": ["/absolute/path/to/mcp-server/server.py"]
    }
  }
}
```

Restart Claude Desktop. You should then be able to ask Claude a cloud-infrastructure question and see it call `ask_cloud_docs` as a tool, citing sources from the approved documentation.

## Notes

- Transport is stdio (the standard for locally-run MCP servers) — `mcp.run()` in `server.py` defaults to this.
- The tool calls the same live Cloud Run backend as the web app, so every call also produces a Langfuse trace, same as questions asked through the UI.
