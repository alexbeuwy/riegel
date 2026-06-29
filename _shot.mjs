import { chromium } from "playwright-core";
const DIR = "/tmp/claude-0/-home-user-riegel/93995920-053c-5324-b000-7153d2fd2ad6/scratchpad/deck/";
const b = await chromium.launch({ executablePath:"/opt/pw-browsers/chromium-1194/chrome-linux/chrome", args:["--no-sandbox"] });
const p = await b.newPage({ viewport:{width:1280,height:1200}, deviceScaleFactor:1.5 });
await p.addInitScript(()=>{try{localStorage.setItem("riegel:consent","all")}catch{}});
await p.goto("http://localhost:3000/ratgeber/notarkosten-grundbuch",{waitUntil:"networkidle"}); await p.evaluate(()=>document.fonts.ready); await p.waitForTimeout(500);
// scroll to the table (section with "Rechenbeispiel")
await p.evaluate(()=>{ const el=[...document.querySelectorAll("table")][0]; if(el) el.scrollIntoView({block:"center"}); window.scrollBy(0,-120); });
await p.waitForTimeout(500); await p.screenshot({ path: DIR+"geo-table.png" });
// top of article (hero icon + key facts)
await p.evaluate(()=>window.scrollTo(0,0)); await p.waitForTimeout(300); await p.screenshot({ path: DIR+"geo-top.png" });
// footer teaser
await p.evaluate(()=>window.scrollTo(0, document.body.scrollHeight)); await p.waitForTimeout(600); await p.screenshot({ path: DIR+"geo-footer.png" });
await b.close(); console.log("done");
