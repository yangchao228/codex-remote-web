export function htmlPage(): string {
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Codex Remote Control</title>
  <style>
    :root {
      color-scheme: light;
      --bg: #f7f7f4;
      --panel: #ffffff;
      --text: #1d1d1f;
      --muted: #6b6f76;
      --line: #d9d9d2;
      --accent: #126b57;
      --danger: #b42318;
      --mono: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }
    * { box-sizing: border-box; }
    body { margin: 0; background: var(--bg); color: var(--text); }
    main { width: min(100%, 760px); margin: 0 auto; padding: 20px 14px 28px; }
    header { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 14px; }
    h1 { font-size: 22px; line-height: 1.15; margin: 0; }
    .status { border: 1px solid var(--line); background: var(--panel); border-radius: 8px; padding: 7px 10px; font-size: 13px; color: var(--muted); white-space: nowrap; }
    section { background: var(--panel); border: 1px solid var(--line); border-radius: 8px; padding: 14px; margin: 12px 0; }
    h2 { font-size: 15px; margin: 0 0 10px; }
    label { display: block; font-size: 13px; color: var(--muted); margin-bottom: 6px; }
    input, textarea, select { width: 100%; border: 1px solid var(--line); border-radius: 7px; padding: 10px; font: inherit; background: #fff; color: var(--text); }
    textarea { min-height: 132px; resize: vertical; }
    button { border: 0; border-radius: 7px; background: var(--accent); color: #fff; padding: 10px 12px; font-weight: 650; font: inherit; min-height: 40px; }
    button.secondary { background: #33383f; }
    button.danger { background: var(--danger); }
    button:disabled { opacity: .5; }
    .row { display: flex; gap: 8px; align-items: center; }
    .row > * { flex: 1; }
    .stack { display: grid; gap: 10px; }
    .meta { font-size: 12px; color: var(--muted); line-height: 1.45; overflow-wrap: anywhere; }
    pre { margin: 0; min-height: 220px; max-height: 50vh; overflow: auto; border-radius: 8px; padding: 12px; background: #101418; color: #d7e2dc; font-family: var(--mono); font-size: 12px; line-height: 1.45; white-space: pre-wrap; word-break: break-word; }
    ul { list-style: none; padding: 0; margin: 0; display: grid; gap: 8px; }
    li { border: 1px solid var(--line); border-radius: 7px; padding: 9px; }
    @media (max-width: 520px) {
      header { align-items: flex-start; flex-direction: column; }
      .status { width: 100%; }
      .row { flex-direction: column; }
      button { width: 100%; }
    }
  </style>
</head>
<body>
  <main>
    <header>
      <h1>Codex Remote Control</h1>
      <div id="connection" class="status">未连接</div>
    </header>

    <section id="pairing">
      <h2>配对</h2>
      <div class="stack">
        <label for="code">输入本机控制台显示的 6 位配对码</label>
        <div class="row">
          <input id="code" inputmode="numeric" autocomplete="one-time-code" placeholder="123456">
          <button id="pair">配对</button>
        </div>
        <div class="meta" id="serverMeta"></div>
      </div>
    </section>

    <section>
      <h2>提交任务</h2>
      <div class="stack">
        <label for="workspace">工作目录</label>
        <select id="workspace"></select>
        <label for="prompt">任务</label>
        <textarea id="prompt" placeholder="描述要 Codex 在本机执行的任务"></textarea>
        <div class="row">
          <button id="start">开始</button>
          <button id="stop" class="danger" disabled>停止当前任务</button>
        </div>
        <div id="activeMeta" class="meta">暂无任务</div>
      </div>
    </section>

    <section>
      <h2>流式输出</h2>
      <pre id="output"></pre>
    </section>

    <section>
      <h2>最近任务</h2>
      <ul id="history"></ul>
    </section>
  </main>
  <script>
    let token = null;
    let activeSessionId = null;
    const $ = (id) => document.getElementById(id);

    function setConnection(text) { $("connection").textContent = text; }
    function appendOutput(text) {
      $("output").textContent += text;
      $("output").scrollTop = $("output").scrollHeight;
    }
    async function api(path, options = {}) {
      const headers = Object.assign({ "Content-Type": "application/json" }, options.headers || {});
      if (token) headers.Authorization = "Bearer " + token;
      const response = await fetch(path, Object.assign({}, options, { headers }));
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "请求失败");
      return data;
    }
    async function loadHealth() {
      const health = await api("/api/health", { method: "GET", headers: {} });
      $("serverMeta").textContent = "服务: " + health.host + ":" + health.port + " | LAN: " + (health.allowLan ? "开启" : "关闭");
    }
    function setWorkspaces(workspaces) {
      $("workspace").innerHTML = "";
      for (const item of workspaces) {
        const option = document.createElement("option");
        option.value = item;
        option.textContent = item;
        $("workspace").appendChild(option);
      }
    }
    async function refreshHistory() {
      if (!token) return;
      const data = await api("/api/tasks", { method: "GET" });
      $("history").innerHTML = "";
      for (const session of data.sessions) {
        const li = document.createElement("li");
        li.innerHTML = "<strong>" + session.status + "</strong><div class='meta'>" + session.promptSummary + "<br>" + session.workspace + "<br>" + session.createdAt + "</div>";
        $("history").appendChild(li);
      }
    }
    async function streamSession(id) {
      const response = await fetch("/api/tasks/" + id + "/stream", {
        headers: { Authorization: "Bearer " + token }
      });
      if (!response.ok || !response.body) {
        appendOutput("\\n[stream] 无法连接输出流\\n");
        return;
      }
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const result = await reader.read();
        if (result.done) break;
        buffer += decoder.decode(result.value, { stream: true });
        const parts = buffer.split("\\n\\n");
        buffer = parts.pop() || "";
        for (const part of parts) {
          const dataLine = part.split("\\n").find((line) => line.startsWith("data: "));
          if (!dataLine) continue;
          const data = JSON.parse(dataLine.slice(6));
          if (data.text) appendOutput(data.kind === "stderr" ? "[stderr] " + data.text : data.text);
          if (data.status && data.status !== "running" && data.status !== "stopping") {
            $("stop").disabled = true;
          }
        }
      }
    }
    $("pair").onclick = async () => {
      try {
        const data = await api("/api/pair", { method: "POST", body: JSON.stringify({ code: $("code").value.trim() }), headers: {} });
        token = data.token;
        setWorkspaces(data.workspaces);
        setConnection("已配对，到期 " + data.expiresAt);
        await refreshHistory();
      } catch (error) {
        setConnection(error.message);
      }
    };
    $("start").onclick = async () => {
      try {
        $("output").textContent = "";
        const data = await api("/api/tasks", {
          method: "POST",
          body: JSON.stringify({ prompt: $("prompt").value, workspace: $("workspace").value })
        });
        activeSessionId = data.session.id;
        $("activeMeta").textContent = "当前任务: " + activeSessionId;
        $("stop").disabled = false;
        void streamSession(activeSessionId);
        await refreshHistory();
      } catch (error) {
        appendOutput("\\n[error] " + error.message + "\\n");
      }
    };
    $("stop").onclick = async () => {
      if (!activeSessionId) return;
      await api("/api/tasks/" + activeSessionId + "/stop", { method: "POST" });
      $("stop").disabled = true;
      await refreshHistory();
    };
    loadHealth().catch((error) => setConnection(error.message));
  </script>
</body>
</html>`;
}
