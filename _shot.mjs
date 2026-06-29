import { chromium } from "playwright-core";
const DIR = "/tmp/claude-0/-home-user-riegel/93995920-053c-5324-b000-7153d2fd2ad6/scratchpad/deck/";
const b = await chromium.launch({ executablePath:"/opt/pw-browsers/chromium-1194/chrome-linux/chrome", args:["--no-sandbox"] });
const p = await b.newPage({ viewport:{width:1100,height:760}, deviceScaleFactor:2 });
await p.goto("http://localhost:3000/intern",{waitUntil:"networkidle"}); await p.evaluate(()=>document.fonts.ready); await p.waitForTimeout(500);
await p.screenshot({ path: DIR+"intern-login.png" });
await b.close(); console.log("done");
