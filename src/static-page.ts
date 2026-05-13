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
    button.history-item { width: 100%; text-align: left; background: #fff; color: var(--text); border: 1px solid var(--line); font-weight: 500; min-height: 0; padding: 10px; }
    button.history-item.active { border-color: var(--accent); box-shadow: inset 3px 0 0 var(--accent); }
    .row { display: flex; gap: 8px; align-items: center; }
    .row > * { flex: 1; }
    .stack { display: grid; gap: 10px; }
    .meta { font-size: 12px; color: var(--muted); line-height: 1.45; overflow-wrap: anywhere; }
    #activeMeta { white-space: pre-wrap; }
    .task-title { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 5px; }
    .badge { border: 1px solid var(--line); border-radius: 999px; padding: 2px 7px; font-size: 11px; color: var(--muted); white-space: nowrap; }
    .badge.running, .badge.stopping { color: #7a4b00; border-color: #d6aa53; background: #fff7e6; }
    .badge.completed { color: #126b57; border-color: #83c5b2; background: #ebf8f3; }
    .badge.failed, .badge.stopped { color: var(--danger); border-color: #eba59f; background: #fff1f0; }
    .output-timeline { min-height: 220px; max-height: 56vh; overflow: auto; border: 1px solid var(--line); border-radius: 8px; background: #fbfbf8; padding: 10px; display: grid; gap: 8px; }
    .output-empty { color: var(--muted); font-size: 13px; padding: 8px 2px; }
    .output-entry { border: 1px solid var(--line); border-left-width: 4px; border-radius: 8px; background: #fff; padding: 9px 10px; }
    .output-entry.status { border-left-color: #8a8f98; }
    .output-entry.assistant { border-left-color: var(--accent); }
    .output-entry.tool { border-left-color: #6f5bd6; }
    .output-entry.usage { border-left-color: #2f6f9f; }
    .output-entry.error { border-left-color: var(--danger); background: #fffafa; }
    .output-entry.raw { border-left-color: #3b4148; background: #111418; color: #d7e2dc; }
    .output-label { font-size: 11px; font-weight: 700; color: var(--muted); margin-bottom: 5px; text-transform: uppercase; }
    .output-body { font-size: 13px; line-height: 1.55; white-space: pre-wrap; overflow-wrap: anywhere; }
    .output-entry.raw .output-body { font-family: var(--mono); font-size: 12px; }
    .output-meta { margin-top: 5px; color: var(--muted); font-size: 11px; font-family: var(--mono); white-space: pre-wrap; overflow-wrap: anywhere; }
    ul { list-style: none; padding: 0; margin: 0; display: grid; gap: 8px; }
    li { margin: 0; }
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
        <button id="refreshCode" class="secondary" type="button">刷新本机配对码</button>
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
      <div id="output" class="output-timeline"></div>
    </section>

    <section>
      <h2>最近任务</h2>
      <ul id="history"></ul>
    </section>
  </main>
  <script>
    let token = null;
    let activeSessionId = null;
    let selectedSessionId = null;
    let pairingInFlight = false;
    let localPairingCodeAvailable = false;
    const $ = (id) => document.getElementById(id);

    function setConnection(text) { $("connection").textContent = text; }
    function formatDate(value) {
      if (!value) return "-";
      return new Date(value).toLocaleString();
    }
    function sessionMeta(session) {
      return [
        "状态: " + session.status,
        "创建: " + formatDate(session.createdAt),
        "更新: " + formatDate(session.updatedAt),
        "退出码: " + (session.exitCode === null ? "-" : session.exitCode),
        "信号: " + (session.signal || "-"),
        "工作目录: " + session.workspace,
        "日志: " + session.logPath
      ].join("\\n");
    }
    function formatUsage(usage) {
      if (!usage || typeof usage !== "object") return "";
      const input = usage.input_tokens ?? 0;
      const cached = usage.cached_input_tokens ?? 0;
      const output = usage.output_tokens ?? 0;
      const reasoning = usage.reasoning_output_tokens ?? 0;
      return "input " + input + " / cached " + cached + " / output " + output + " / reasoning " + reasoning;
    }
    function block(kind, title, body, meta) {
      return { kind, title, body: body || "", meta: meta || "" };
    }
    function codexLineToBlocks(line, fallbackKind) {
      let payload = null;
      try {
        payload = JSON.parse(line);
      } catch {
        return [block(fallbackKind, fallbackKind === "error" ? "stderr" : "原始输出", line)];
      }
      if (!payload || typeof payload !== "object") return [block(fallbackKind, "原始输出", line)];

      if (payload.type === "thread.started") {
        return [block("status", "会话", "已创建 Codex 会话", payload.thread_id || "")];
      }
      if (payload.type === "turn.started") {
        return [block("status", "执行", "开始执行任务")];
      }
      if (payload.type === "turn.completed") {
        const usage = formatUsage(payload.usage);
        return [block("usage", "Token 统计", usage || "任务回合完成")];
      }
      if (payload.type === "turn.failed") {
        return [block("error", "任务失败", payload.error?.message || payload.error || "unknown error")];
      }
      if (payload.type === "item.completed" && payload.item) {
        const item = payload.item;
        if (item.type === "agent_message" && typeof item.text === "string") {
          return [block("assistant", "Codex", item.text.trimEnd())];
        }
        if (item.type === "tool_call") {
          return [block("tool", "工具调用", item.name || item.tool_name || item.id || "unknown")];
        }
        if (item.type === "tool_call_output") {
          return [block("tool", "工具返回", item.output || "工具调用已返回")];
        }
      }
      if (payload.type === "started" && payload.prompt) {
        return [block("status", "Mock Runner", "开始执行", payload.prompt)];
      }
      if (payload.type === "delta" && payload.text) {
        return [block("assistant", "Mock Output", payload.text)];
      }
      if (payload.type === "done") {
        return [block("status", "Mock Runner", "执行完成")];
      }
      if (payload.type === "stopped") {
        return [block("error", "Mock Runner", "执行已停止")];
      }
      return [block("raw", "未识别事件", JSON.stringify(payload, null, 2))];
    }
    function eventToBlocks(event) {
      const kind = event.kind === "stderr" ? "error" : "raw";
      const text = event.text || "";
      if (!text) return [];
      if (kind === "system") {
        return [];
      }
      if (event.kind === "system") {
        const body = text
          .replace("Session created. Starting controlled Codex runner.", "任务已创建，正在启动 Codex")
          .replace("Stop requested. Terminating Codex process group.", "已请求停止，正在终止 Codex 进程")
          .replace("Session finished with status completed.", "任务已完成")
          .replace("Session finished with status failed.", "任务失败")
          .replace("Session finished with status stopped.", "任务已停止")
          .trim();
        return body ? [block("status", "状态", body)] : [];
      }

      const blocks = [];
      for (const line of text.split("\\n")) {
        if (!line.trim()) continue;
        blocks.push(...codexLineToBlocks(line, kind));
      }
      return blocks;
    }
    function clearOutput() {
      $("output").innerHTML = "";
    }
    function renderEmptyOutput() {
      clearOutput();
      const empty = document.createElement("div");
      empty.className = "output-empty";
      empty.textContent = "暂无输出";
      $("output").appendChild(empty);
    }
    function appendOutputBlock(item) {
      const entry = document.createElement("div");
      entry.className = "output-entry " + item.kind;
      const label = document.createElement("div");
      label.className = "output-label";
      label.textContent = item.title;
      const body = document.createElement("div");
      body.className = "output-body";
      body.textContent = item.body;
      entry.append(label, body);
      if (item.meta) {
        const meta = document.createElement("div");
        meta.className = "output-meta";
        meta.textContent = item.meta;
        entry.appendChild(meta);
      }
      $("output").appendChild(entry);
      $("output").scrollTop = $("output").scrollHeight;
    }
    function appendOutputEvent(event) {
      for (const item of eventToBlocks(event)) {
        appendOutputBlock(item);
      }
    }
    function appendOutputError(message) {
      appendOutputBlock(block("error", "错误", message));
    }
    function renderOutput(events) {
      clearOutput();
      for (const event of events) {
        appendOutputEvent(event);
      }
      if (!$("output").children.length) renderEmptyOutput();
    }
    function renderHistoryItem(session) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "history-item" + (session.id === selectedSessionId ? " active" : "");

      const title = document.createElement("div");
      title.className = "task-title";
      const summary = document.createElement("span");
      summary.textContent = session.promptSummary;
      const badge = document.createElement("span");
      badge.className = "badge " + session.status;
      badge.textContent = session.status;
      title.append(summary, badge);

      const meta = document.createElement("div");
      meta.className = "meta";
      meta.textContent = formatDate(session.createdAt) + "\\n" + session.workspace;

      button.append(title, meta);
      button.onclick = () => void loadSessionReplay(session.id);
      return button;
    }
    function appendOutput(text) {
      appendOutputBlock(block("raw", "原始输出", text));
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
      localPairingCodeAvailable = Boolean(health.localPairingCodeAvailable);
      $("refreshCode").disabled = !localPairingCodeAvailable;
      if (!localPairingCodeAvailable) {
        $("refreshCode").textContent = "LAN 模式下不可在页面显示配对码";
      }
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
        li.appendChild(renderHistoryItem(session));
        $("history").appendChild(li);
      }
    }
    async function loadSessionReplay(id) {
      try {
        selectedSessionId = id;
        const data = await api("/api/tasks/" + id, { method: "GET" });
        activeSessionId = data.session.status === "running" || data.session.status === "stopping" ? id : activeSessionId;
        $("activeMeta").textContent = sessionMeta(data.session);
        renderOutput(data.events);
        $("output").scrollTop = $("output").scrollHeight;
        $("stop").disabled = !(data.session.status === "running" || data.session.status === "stopping");
        await refreshHistory();
      } catch (error) {
        appendOutputError(error.message);
      }
    }
    async function streamSession(id) {
      const response = await fetch("/api/tasks/" + id + "/stream", {
        headers: { Authorization: "Bearer " + token }
      });
      if (!response.ok || !response.body) {
        appendOutputError("无法连接输出流");
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
          if (data.text) appendOutputEvent(data);
          if (data.status) {
            $("activeMeta").textContent = sessionMeta(data);
          }
          if (data.status && data.status !== "running" && data.status !== "stopping") {
            $("stop").disabled = true;
            await refreshHistory();
          }
        }
      }
    }
    $("pair").onclick = async () => {
      if (pairingInFlight) return;
      pairingInFlight = true;
      $("pair").disabled = true;
      try {
        const data = await api("/api/pair", { method: "POST", body: JSON.stringify({ code: $("code").value.trim() }), headers: {} });
        token = data.token;
        setWorkspaces(data.workspaces);
        setConnection("已配对，到期 " + data.expiresAt);
        $("pairing").style.display = "none";
        await refreshHistory();
      } catch (error) {
        setConnection(error.message);
      } finally {
        pairingInFlight = false;
        $("pair").disabled = Boolean(token);
      }
    };
    $("refreshCode").onclick = async () => {
      try {
        $("refreshCode").disabled = true;
        const data = await api("/api/local-pairing-code", { method: "POST", headers: {} });
        $("code").value = data.code;
        setConnection("本机配对码已刷新，到期 " + data.expiresAt);
      } catch (error) {
        setConnection(error.message);
      } finally {
        $("refreshCode").disabled = !localPairingCodeAvailable;
      }
    };
    $("start").onclick = async () => {
      try {
        clearOutput();
        const data = await api("/api/tasks", {
          method: "POST",
          body: JSON.stringify({ prompt: $("prompt").value, workspace: $("workspace").value })
        });
        activeSessionId = data.session.id;
        selectedSessionId = activeSessionId;
        $("activeMeta").textContent = sessionMeta(data.session);
        $("stop").disabled = false;
        void streamSession(activeSessionId);
        await refreshHistory();
      } catch (error) {
        appendOutputError(error.message);
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
