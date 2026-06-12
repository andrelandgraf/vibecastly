const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>DX Report &middot; Neon + AI SDK example</title>
<style>
  :root {
    --bg: #0c0e10;
    --panel: #14171a;
    --panel-2: #1b1f23;
    --border: #272c31;
    --text: #e6edf3;
    --muted: #9aa6b2;
    --green: #00e599;
    --green-dim: #0bbf82;
    --red: #ff6b6b;
    --amber: #ffc857;
    --blue: #6ea8fe;
  }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body {
    background: radial-gradient(1200px 600px at 80% -10%, rgba(0,229,153,0.10), transparent 60%), var(--bg);
    color: var(--text);
    font: 15px/1.6 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    -webkit-font-smoothing: antialiased;
  }
  .wrap { max-width: 920px; margin: 0 auto; padding: 56px 24px 96px; }
  header.hero { margin-bottom: 40px; }
  .kicker {
    display: inline-flex; align-items: center; gap: 8px;
    color: var(--green); font-weight: 600; letter-spacing: 0.04em;
    text-transform: uppercase; font-size: 12px; margin-bottom: 14px;
  }
  .dot { width: 8px; height: 8px; border-radius: 50%; background: var(--green); box-shadow: 0 0 12px var(--green); }
  h1 { font-size: 34px; line-height: 1.15; margin: 0 0 12px; letter-spacing: -0.02em; }
  h1 .accent { color: var(--green); }
  .sub { color: var(--muted); font-size: 16px; max-width: 660px; }
  .meta { margin-top: 18px; display: flex; flex-wrap: wrap; gap: 10px; }
  .chip {
    font-size: 12.5px; color: var(--muted); background: var(--panel-2);
    border: 1px solid var(--border); padding: 5px 10px; border-radius: 999px;
  }
  .chip b { color: var(--text); font-weight: 600; }

  .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin: 28px 0 40px; }
  .stat { background: var(--panel); border: 1px solid var(--border); border-radius: 14px; padding: 16px; }
  .stat .n { font-size: 26px; font-weight: 700; letter-spacing: -0.02em; }
  .stat .l { color: var(--muted); font-size: 12.5px; margin-top: 2px; }
  .stat.good .n { color: var(--green); }
  .stat.warn .n { color: var(--amber); }
  .stat.bad .n { color: var(--red); }

  h2 { font-size: 13px; text-transform: uppercase; letter-spacing: 0.08em; color: var(--muted); margin: 44px 0 16px; }

  .issue {
    background: var(--panel); border: 1px solid var(--border); border-radius: 16px;
    padding: 20px 22px; margin-bottom: 16px; position: relative; overflow: hidden;
  }
  .issue::before { content: ""; position: absolute; left: 0; top: 0; bottom: 0; width: 4px; background: var(--border); }
  .issue.sev-blocker::before { background: var(--red); }
  .issue.sev-major::before { background: var(--amber); }
  .issue.sev-minor::before { background: var(--blue); }
  .issue.sev-good::before { background: var(--green); }
  .issue h3 { margin: 0 0 6px; font-size: 18px; letter-spacing: -0.01em; display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
  .badge { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; padding: 3px 8px; border-radius: 6px; }
  .badge.blocker { background: rgba(255,107,107,0.15); color: var(--red); }
  .badge.major { background: rgba(255,200,87,0.15); color: var(--amber); }
  .badge.minor { background: rgba(110,168,254,0.15); color: var(--blue); }
  .badge.good { background: rgba(0,229,153,0.15); color: var(--green); }
  .issue .row { margin-top: 12px; display: grid; grid-template-columns: 96px 1fr; gap: 10px; align-items: start; }
  .issue .row .k { color: var(--muted); font-size: 12.5px; text-transform: uppercase; letter-spacing: 0.05em; padding-top: 2px; }
  .issue .row .v { color: var(--text); }
  code, pre { font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace; }
  code { background: var(--panel-2); border: 1px solid var(--border); padding: 1px 6px; border-radius: 6px; font-size: 12.5px; color: #d7e6df; }
  pre {
    background: #0a0c0e; border: 1px solid var(--border); border-radius: 10px;
    padding: 12px 14px; overflow-x: auto; font-size: 12.5px; color: #cdd8e0; margin: 10px 0 0;
  }
  pre .err { color: var(--red); }

  .timeline { border-left: 2px solid var(--border); margin-left: 6px; padding-left: 22px; }
  .tl { position: relative; padding-bottom: 18px; }
  .tl::before { content: ""; position: absolute; left: -29px; top: 4px; width: 12px; height: 12px; border-radius: 50%; background: var(--bg); border: 2px solid var(--green); }
  .tl.fail::before { border-color: var(--red); }
  .tl .t { font-weight: 600; }
  .tl .d { color: var(--muted); font-size: 13.5px; }

  footer { margin-top: 56px; color: var(--muted); font-size: 13px; border-top: 1px solid var(--border); padding-top: 20px; }
  a { color: var(--green); text-decoration: none; }
  a:hover { text-decoration: underline; }
  .note { color: var(--muted); font-size: 13.5px; }
</style>
</head>
<body>
<div class="wrap">
  <header class="hero">
    <div class="kicker"><span class="dot"></span> Developer Experience Report</div>
    <h1>Setting up <span class="accent">neondatabase/examples/with-ai-sdk</span> locally</h1>
    <p class="sub">A reflection on getting the AI SDK image agent running on Neon Functions &mdash; what broke, how it was resolved, and the underlying root causes. The happy path mostly worked; the friction was concentrated at the environment + object-storage layer.</p>
    <div class="meta">
      <span class="chip"><b>Project</b> with-ai-sdk-example (old-shape-74715759)</span>
      <span class="chip"><b>Region</b> aws-us-east-2</span>
      <span class="chip"><b>Env</b> Neon staging (console-stage)</span>
      <span class="chip"><b>CLI</b> neonctl-staging 2.26.1</span>
    </div>
  </header>

  <div class="grid">
    <div class="stat good"><div class="n">6/7</div><div class="l">Setup steps clean</div></div>
    <div class="stat bad"><div class="n">1</div><div class="l">Hard blocker</div></div>
    <div class="stat warn"><div class="n">2</div><div class="l">Misleading errors</div></div>
    <div class="stat good"><div class="n">&lt;30s</div><div class="l">First token streamed</div></div>
  </div>

  <p class="note">Verdict: <b style="color:var(--text)">streaming + AI Gateway + image generation work end to end.</b> The only thing standing between this and a fully working demo is the object-storage upload, which fails for reasons outside the example code.</p>

  <h2>Issues, resolutions &amp; root causes</h2>

  <div class="issue sev-blocker">
    <h3><span class="badge blocker">Blocker</span> Object-storage upload rejected: <code>InvalidAccessKeyId</code></h3>
    <p>Image generation succeeds and returns a JPEG, but persisting it to the Neon bucket fails with HTTP 403. The DB insert never runs because the S3 <code>PutObject</code> throws first.</p>
    <pre><span class="err">[imagegen] [persist] failed: InvalidAccessKeyId: The AWS Access Key Id you provided does not exist in our records.</span>
  httpStatusCode: 403
  Resource: '/images/generated/&lt;uuid&gt;.jpg'</pre>
    <div class="row"><div class="k">Resolved?</div><div class="v"><b style="color:var(--red)">Not resolved.</b> Re-pulling env, restarting the dev server, and retrying all produced the same error.</div></div>
    <div class="row"><div class="k">Root cause</div><div class="v"><code>neon config status</code> shows the credential <code>f8e2e5844715</code> registered with <code>storage:read</code>/<code>storage:write</code> scope &mdash; the <b>control plane believes the key is valid</b>, but the object-storage <b>data plane rejects it</b>. This is a control-plane &harr; data-plane credential sync/propagation gap on staging, not an issue with the example or the local setup. The AI Gateway credential from the same pull works fine, which isolates the failure to object storage.</div></div>
    <div class="row"><div class="k">Impact</div><div class="v">Demo looks broken at the finish line even though 90% of the pipeline is healthy. Worth flagging to the storage team with a request id (e.g. <code>neon-platform-storage-79946f958f-k8n2b/AEnzAxuif6-000232</code>).</div></div>
  </div>

  <div class="issue sev-major">
    <h3><span class="badge major">Major</span> Preview features are staging-only, but the error blamed the region</h3>
    <p>The example's <code>neon.ts</code> declares three preview services (AI Gateway, object-storage buckets, Functions). On <b>production</b> Neon, the bucket pull failed with:</p>
    <pre><span class="err">platform branchable-storage is not available in this region (HTTP 503)</span></pre>
    <div class="row"><div class="k">Resolved?</div><div class="v">Yes &mdash; switched to <code>neonctl-staging</code> (points at <code>console-stage.neon.build</code>) and recreated the project there. Deleted the stray production project.</div></div>
    <div class="row"><div class="k">Root cause</div><div class="v">The features are preview / early-access and only enabled on the staging environment. The error message <b>conflated "not enabled in this environment" with "not available in this region"</b>, which sent me down a region-selection detour (picking us-east-1 vs us-west-2) before the real fix turned out to be the CLI/environment.</div></div>
    <div class="row"><div class="k">Fix idea</div><div class="v">When a declared preview feature is unavailable, the error should say <i>which environments/regions do</i> support it, or detect that the CLI is pointed at an environment without the feature. The public README also doesn't mention that these previews require a staging build of the CLI.</div></div>
  </div>

  <div class="issue sev-major">
    <h3><span class="badge major">Major</span> README ordering: <code>env pull</code> fails before services are provisioned</h3>
    <p>The README flow is <code>link</code> &rarr; <code>env pull</code> &rarr; <code>db:push</code> &rarr; <code>dev</code>. But on a fresh project, <code>link</code>'s implicit env pull fails:</p>
    <pre><span class="err">Your neon.ts declares bucket:images ... but the branch does not have it yet.
Provision it first with neonctl deploy (or neonctl config apply), then re-run.</span></pre>
    <div class="row"><div class="k">Resolved?</div><div class="v">Yes &mdash; ran <code>neon config apply</code>, which provisioned <code>bucket:images</code> + the function and then pulled 12 env vars into <code>.env.local</code>.</div></div>
    <div class="row"><div class="k">Root cause</div><div class="v">Declared services in <code>neon.ts</code> aren't auto-provisioned by <code>link</code>; you must <code>config apply</code> / <code>deploy</code> first so the credentials and endpoints exist before they can be pulled. The README's step order skips this for a brand-new project.</div></div>
    <div class="row"><div class="k">Silver lining</div><div class="v">The warning was excellent &mdash; it named the exact missing service and the exact command to fix it.</div></div>
  </div>

  <div class="issue sev-minor">
    <h3><span class="badge minor">Minor</span> Transient 503 on a freshly created project</h3>
    <p>The first <code>config apply</code> hit a cold-start error:</p>
    <pre><span class="err">listBranchBuckets(...) failed: platform service unavailable (HTTP 503) ... most likely transient.</span></pre>
    <div class="row"><div class="k">Resolved?</div><div class="v">Yes &mdash; waited ~15s and retried; it succeeded and created both services.</div></div>
    <div class="row"><div class="k">Root cause</div><div class="v">Provisioning latency right after project creation. The error correctly self-labeled as transient and suggested a retry, so this was low-friction.</div></div>
  </div>

  <div class="issue sev-minor">
    <h3><span class="badge minor">Minor</span> Example path naming &amp; log noise</h3>
    <div class="row"><div class="k">Path</div><div class="v">The folder is <code>with-ai-sdk</code> (hyphenated); <code>with-aisdk</code> 404s. A trivial mismatch but easy to fumble.</div></div>
    <div class="row"><div class="k">Runtime</div><div class="v">Functions run on <code>node v20.12.2</code>, while the AWS SDK warns it will require <code>node &gt;= 22</code> after Jan 2027. Plus a <code>pg</code> SSL-mode deprecation warning. Harmless today, but noisy and a future foot-gun.</div></div>
    <div class="row"><div class="k">Credentials</div><div class="v">Each <code>env pull</code> / <code>config apply</code> mints a new "neon-env main" credential &mdash; <code>config status</code> already showed two. Could accumulate over a long dev session.</div></div>
  </div>

  <div class="issue sev-good">
    <h3><span class="badge good">Worked well</span> What the DX got right</h3>
    <div class="row"><div class="k">Zero secrets</div><div class="v"><code>neon dev</code> injects <code>DATABASE_URL</code>, the AI Gateway token, and the AWS_* storage vars automatically &mdash; nothing to copy into <code>.env</code> by hand.</div></div>
    <div class="row"><div class="k">Agent mode</div><div class="v"><code>--agent</code> returns structured JSON with a <code>next_command_template</code> and a clear instruction, which is ideal for scripted / agent-driven setup.</div></div>
    <div class="row"><div class="k">config apply output</div><div class="v">Shows exactly what was created (services + function invocation URLs) and which env vars were pulled &mdash; great feedback loop.</div></div>
    <div class="row"><div class="k">One-line clone</div><div class="v"><code>degit</code> + <code>config apply</code> + <code>db:push</code> + <code>dev</code> is a genuinely short path from zero to a streaming AI endpoint.</div></div>
  </div>

  <h2>Setup timeline</h2>
  <div class="timeline">
    <div class="tl"><div class="t">Clone</div><div class="d">degit pulled the with-ai-sdk example into the folder.</div></div>
    <div class="tl"><div class="t">Dependencies</div><div class="d">npm install &mdash; 137 packages, no errors.</div></div>
    <div class="tl fail"><div class="t">Link (production)</div><div class="d">Created project, but bucket pull failed: "not available in this region". Deleted it.</div></div>
    <div class="tl"><div class="t">Link (staging)</div><div class="d">Recreated on neonctl-staging in aws-us-east-2 under the Andre org.</div></div>
    <div class="tl fail"><div class="t">config apply (1st try)</div><div class="d">Transient 503 while the project was still warming up.</div></div>
    <div class="tl"><div class="t">config apply (retry)</div><div class="d">Provisioned bucket:images + imagegen function; pulled 12 env vars.</div></div>
    <div class="tl"><div class="t">db:push</div><div class="d">Created the images table via Drizzle.</div></div>
    <div class="tl"><div class="t">neon dev</div><div class="d">Server up; streaming + image_generation work in &lt;30s.</div></div>
    <div class="tl fail"><div class="t">S3 persist</div><div class="d">InvalidAccessKeyId on upload &mdash; the one unresolved blocker.</div></div>
  </div>

  <footer>
    Generated by a Neon Function (<code>src/report.ts</code>) running on <code>neon dev</code>. &middot;
    This is a self-contained HTML response &mdash; no database or bucket access required.
  </footer>
</div>
</body>
</html>`;

export default {
  async fetch(request: Request) {
    if (request.method !== 'GET') {
      return new Response('GET this endpoint to view the DX report.', { status: 405 });
    }
    return new Response(html, {
      headers: { 'content-type': 'text/html; charset=utf-8' },
    });
  },
};
