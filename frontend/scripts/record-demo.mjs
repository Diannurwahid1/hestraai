import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium } from "playwright";

const mode = process.argv[2] || "smoke";
if (!["smoke", "judging"].includes(mode)) {
  throw new Error("Use 'smoke' or 'judging'.");
}

const baseUrl = (process.env.HESTRA_DEMO_BASE_URL || "http://localhost:3000").replace(/\/$/, "");
const apiUrl = (process.env.HESTRA_DEMO_API_URL ||
  (new URL(baseUrl).hostname === "localhost" ? "http://localhost:8000" : baseUrl)).replace(/\/$/, "");
const outputDir = resolve("qa", "recordings");
await mkdir(outputDir, { recursive: true });
const output = resolve(outputDir, `hestra-${mode}-${new Date().toISOString().replace(/[:.]/g, "-")}.webm`);

const browser = await chromium.launch({ channel: "chrome", headless: true });
const context = await browser.newContext({
  baseURL: baseUrl,
  viewport: { width: 1920, height: 1080 },
  deviceScaleFactor: 1,
  recordVideo: {
    dir: outputDir,
    size: { width: 1920, height: 1080 },
    ...(mode === "smoke" ? { showActions: { duration: 650, position: "top-right", fontSize: 20, cursor: "pointer" } } : {}),
  },
});

let page;
let failure;
try {
  // Compile local Next.js pages before the recording starts to avoid a long white frame.
  if (mode === "smoke") {
    await context.request.get(`${baseUrl}/`);
    await context.request.get(`${baseUrl}/pricing`);
  }
  if (mode === "judging") {
    const email = process.env.HESTRA_DEMO_EMAIL;
    const password = process.env.HESTRA_DEMO_PASSWORD;
    if (!email || !password) throw new Error("Set HESTRA_DEMO_EMAIL and HESTRA_DEMO_PASSWORD in the shell; do not save them in a file.");
    // Authenticate before opening the recorded page so no credentials appear in the video.
    const response = await context.request.post(`${apiUrl}/api/auth/login`, { data: { email, password } });
    if (!response.ok()) throw new Error(`Demo login failed (${response.status()}).`);
    const auth = (await response.json()).data;
    if (!auth?.token || !auth?.user) throw new Error("Demo login did not return a usable session.");
    await context.addInitScript(({ token, user }) => {
      localStorage.setItem("hestra.auth.token", token);
      localStorage.setItem("hestra.auth.user", JSON.stringify(user));
    }, auth);
  }

  page = await context.newPage();
  if (mode === "smoke") {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.locator("body").waitFor({ state: "visible" });
    await page.waitForTimeout(2500);
    await page.goto("/pricing", { waitUntil: "domcontentloaded" });
    await page.getByRole("heading", { name: "Choose your research workspace." }).waitFor();
    await page.waitForTimeout(2500);
  } else {
    const started = Date.now();
    await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
    await page.getByRole("heading", { name: "What the nickel evidence shows" }).waitFor();
    const card = page.locator(".signal-card").first();
    try { await card.waitFor({ state: "visible", timeout: 30000 }); }
    catch { throw new Error("No verified signal is available for the judging recording. No demo signal will be substituted."); }
    await card.scrollIntoViewIfNeeded();
    await page.waitForTimeout(1200);
    await card.getByRole("link", { name: "View Evidence →" }).click();
    await page.getByRole("heading", { name: "Evidence Analysis" }).waitFor();
    const evidence = page.locator(".evidence-card").first();
    await evidence.waitFor({ state: "visible", timeout: 30000 });
    await evidence.scrollIntoViewIfNeeded();
    await page.waitForTimeout(2200);
    const calculation = evidence.getByText("View calculation");
    if (await calculation.count()) {
      await calculation.click();
      await page.waitForTimeout(1800);
    }
    await page.getByRole("heading", { name: "Contradictions & Open Questions" }).scrollIntoViewIfNeeded();
    await page.waitForTimeout(2200);
    await page.locator(".investigate-hero").getByRole("button", { name: "Ask Hestra" }).click();
    const chat = page.locator('aside[aria-label="Hestra AI chat"]');
    const previousReplies = await chat.locator(".chat-message.assistant").count();
    const priorMessages = chat.locator(".chat-message");
    const priorMessageCount = await priorMessages.count();
    for (let index = 0; index < priorMessageCount; index += 1) {
      await priorMessages.nth(index).evaluate(node => node.setAttribute("data-demo-old", "true"));
    }
    await page.addStyleTag({ content: '.chat-panel .chat-message[data-demo-old="true"]{display:none!important}' });
    const question = chat.getByRole("textbox", { name: "Ask a research question" });
    await question.fill("Explain this signal using its verified evidence. What supports it, what contradicts it, and what remains unresolved?");
    await chat.getByRole("button", { name: "Send" }).click();
    await page.waitForFunction(count =>
      document.querySelectorAll(".chat-panel .chat-message.assistant").length > count ||
      Boolean(document.querySelector(".chat-panel [role='alert']")), previousReplies, { timeout: 60000 });
    const chatError = chat.getByRole("alert");
    if (await chatError.count()) throw new Error(`AI chat could not complete: ${await chatError.first().innerText()}`);
    await page.waitForTimeout(4000);
    await page.getByRole("button", { name: "Save Investigation" }).click();
    await page.getByRole("button", { name: "Saved to Memory" }).waitFor();
    await page.waitForTimeout(900);
    await page.getByRole("link", { name: "Research Memory" }).click();
    await page.getByRole("heading", { name: "Your Research, Remembered" }).waitFor();
    await page.waitForTimeout(1500);
    const duration = Date.now() - started;
    if (duration > 180000) throw new Error(`Judging recording exceeded the 3-minute limit (${Math.ceil(duration / 1000)}s).`);
  }
} catch (error) {
  failure = error;
} finally {
  await context.close();
  if (page?.video()) {
    await page.video().saveAs(output);
    console.log(`Local screen recording: ${output}`);
  }
  await browser.close();
}
if (failure) throw failure;
