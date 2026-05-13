#!/usr/bin/env node

let prompt = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => {
  prompt += chunk;
});

process.stdin.on("end", () => {
  const compact = prompt.replace(/\s+/g, " ").trim();
  console.log(JSON.stringify({ type: "started", prompt: compact.slice(0, 80) }));
  let count = 0;
  const limit = compact.toLowerCase().includes("long") ? 50 : 3;
  const timer = setInterval(() => {
    count += 1;
    console.log(JSON.stringify({ type: "delta", text: `mock output ${count}` }));
    if (count >= limit) {
      clearInterval(timer);
      console.log(JSON.stringify({ type: "done" }));
      process.exit(0);
    }
  }, 120);
});

process.on("SIGTERM", () => {
  console.error(JSON.stringify({ type: "stopped" }));
  process.exit(143);
});
