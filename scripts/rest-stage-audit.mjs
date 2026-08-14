import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { resolve } from "path";

const envPath = resolve("D:/NextGen/lms/.env");
const env = Object.fromEntries(
  readFileSync(envPath, "utf8")
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => {
      const i = l.indexOf("=");
      let v = l.slice(i + 1).trim();
      if (
        (v.startsWith('"') && v.endsWith('"')) ||
        (v.startsWith("'") && v.endsWith("'"))
      ) {
        v = v.slice(1, -1);
      }
      return [l.slice(0, i).trim(), v];
    })
);

const url = (env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/$/, "");
const key = env.SUPABASE_SERVICE_ROLE_KEY || "";

const out = {
  checkedAt: new Date().toISOString(),
  projectHost: url ? new URL(url).host : null,
  httpsAuthHealth: null,
  restRoot: null,
  restOk: false,
  counts: {},
  errors: [],
};

if (!url || !key) {
  out.errors.push("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
} else {
  const headers = {
    apikey: key,
    Authorization: "Bearer " + key,
    Accept: "application/json",
  };

  try {
    const ah = await fetch(url + "/auth/v1/health", {
      method: "GET",
      headers: { apikey: key, Authorization: "Bearer " + key },
    });
    const ahText = await ah.text();
    out.httpsAuthHealth = {
      ok: ah.ok,
      status: ah.status,
      statusText: ah.statusText,
      bodyPreview: ahText.slice(0, 200),
    };
  } catch (e) {
    out.httpsAuthHealth = { ok: false, error: String(e.message || e) };
    out.errors.push("auth health: " + String(e.message || e));
  }

  try {
    const r = await fetch(url + "/rest/v1/", { headers });
    const body = await r.text();
    out.restRoot = {
      ok: r.ok,
      status: r.status,
      statusText: r.statusText,
      contentType: r.headers.get("content-type"),
      bodyPreview: body.slice(0, 200),
    };
    out.restOk = r.ok || r.status === 200;
  } catch (e) {
    out.restRoot = { ok: false, error: String(e.message || e) };
    out.errors.push("rest root: " + String(e.message || e));
  }

  if (!out.restOk) {
    try {
      const r = await fetch(
        url + "/rest/v1/campus_ambassadors?select=id&limit=1",
        { headers }
      );
      out.restOk = r.ok || r.status === 200 || r.status === 206;
      out.restSimpleProbe = {
        status: r.status,
        statusText: r.statusText,
        ok: r.ok,
      };
    } catch (e) {
      out.restSimpleProbe = { error: String(e.message || e) };
    }
  }

  async function countExact(path) {
    const r = await fetch(url + "/rest/v1/" + path, {
      headers: { ...headers, Prefer: "count=exact" },
    });
    const range = r.headers.get("content-range");
    let count = null;
    if (range && range.includes("/")) {
      const total = range.split("/")[1];
      count = total === "*" ? null : Number(total);
    }
    const text = await r.text();
    return {
      status: r.status,
      ok: r.ok,
      count,
      contentRange: range,
      bodyPreview: text.slice(0, 120),
    };
  }

  if (out.restOk || out.restSimpleProbe?.ok) {
    const appFilters = [
      { name: "all", qs: "select=id&limit=0" },
      { name: "status_pending", qs: "select=id&status=eq.pending&limit=0" },
      { name: "status_approved", qs: "select=id&status=eq.approved&limit=0" },
      { name: "status_rejected", qs: "select=id&status=eq.rejected&limit=0" },
      { name: "status_null", qs: "select=id&status=is.null&limit=0" },
    ];
    out.counts.campus_ambassador_applications = {};
    for (const f of appFilters) {
      try {
        out.counts.campus_ambassador_applications[f.name] = await countExact(
          "campus_ambassador_applications?" + f.qs
        );
      } catch (e) {
        out.counts.campus_ambassador_applications[f.name] = {
          error: String(e.message || e),
        };
      }
    }

    try {
      out.counts.campus_ambassadors = await countExact(
        "campus_ambassadors?select=id&limit=0"
      );
    } catch (e) {
      out.counts.campus_ambassadors = { error: String(e.message || e) };
    }

    try {
      const r = await fetch(url + "/rest/v1/lms_email_outbox?select=event_type", {
        headers,
      });
      const text = await r.text();
      let rows = [];
      try {
        rows = JSON.parse(text);
      } catch {
        /* ignore */
      }
      const byType = {};
      if (Array.isArray(rows)) {
        for (const row of rows) {
          const t = row?.event_type ?? "(null)";
          byType[t] = (byType[t] || 0) + 1;
        }
      }
      out.counts.lms_email_outbox = {
        status: r.status,
        ok: r.ok,
        totalRowsFetched: Array.isArray(rows) ? rows.length : null,
        byEventType: byType,
        bodyPreview: text.slice(0, 200),
      };
    } catch (e) {
      out.counts.lms_email_outbox = { error: String(e.message || e) };
    }
  }
}

mkdirSync("D:/NextGen/scripts", { recursive: true });
const outPath = "D:/NextGen/scripts/rest-stage-audit.json";
writeFileSync(outPath, JSON.stringify(out, null, 2));
console.log(JSON.stringify(out, null, 2));
console.error("Wrote " + outPath);
