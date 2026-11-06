/* Small, dependency-free SVG chart kit for the portfolio dashboards.
   Every chart: hover tooltip, keyboard-focusable marks, aria summary, optional click handler. */
(function (global) {
  "use strict";
  var NS = "http://www.w3.org/2000/svg";
  var C = { base: "#8d8487", accent: "#d42a35", accent2: "#ff5a63", amber: "#e0a33a", good: "#6fae8c", line: "#3a2a2d", veil: "#2b1d1f", panel: "#141113" };

  function el(tag, attrs, parent) {
    var e = document.createElementNS(NS, tag);
    for (var k in attrs) if (attrs[k] != null) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  function txt(parent, x, y, s, cls, anchor) {
    var t = el("text", { x: x, y: y, class: cls || "", "text-anchor": anchor || "start" }, parent);
    t.textContent = s; return t;
  }
  var fmt = {
    int: function (v) { return Math.round(v).toLocaleString("en-CA"); },
    pct: function (v, d) { return (v * 100).toFixed(d == null ? 1 : d) + "%"; },
    eurM: function (v) { return "€" + (v / 1e6).toFixed(v >= 1e8 ? 0 : 1) + "M"; },
    hrs: function (v) { return v == null || isNaN(v) ? "–" : (v >= 100 ? Math.round(v) : v.toFixed(1)) + " h"; }
  };

  // ---------- tooltip ----------
  var tip = document.createElement("div"); tip.className = "tip"; tip.setAttribute("role", "tooltip");
  document.addEventListener("DOMContentLoaded", function () { document.body.appendChild(tip); });
  function showTip(x, y, html) {
    tip.innerHTML = html; tip.style.opacity = 1;
    var w = tip.offsetWidth, h = tip.offsetHeight;
    tip.style.left = Math.max(8, Math.min(x + 14, window.innerWidth - w - 8)) + "px";
    tip.style.top = Math.max(8, y - h - 10) + "px";
  }
  function hideTip() { tip.style.opacity = 0; }
  function bindMark(node, html, onClick, label) {
    node.classList.add("mark");
    node.setAttribute("tabindex", "0");
    node.setAttribute("role", onClick ? "button" : "img");
    node.setAttribute("aria-label", label || html.replace(/<[^>]+>/g, ""));
    node.addEventListener("mousemove", function (e) { showTip(e.clientX, e.clientY, html); });
    node.addEventListener("mouseleave", hideTip);
    node.addEventListener("focus", function () { var r = node.getBoundingClientRect(); showTip(r.left + r.width / 2, r.top, html); });
    node.addEventListener("blur", hideTip);
    if (onClick) {
      node.addEventListener("click", onClick);
      node.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick(); } });
    }
  }
  function clear(host) { while (host.firstChild) host.removeChild(host.firstChild); }
  function svgFor(host, w, h, label) {
    clear(host);
    var s = el("svg", { viewBox: "0 0 " + w + " " + h, role: "group", "aria-label": label || "" }, host);
    return s;
  }
  function niceMax(v) {
    if (v <= 0) return 1;
    var p = Math.pow(10, Math.floor(Math.log10(v))), n = v / p;
    return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p;
  }
  // rounded-top bar path anchored to the baseline
  function barPath(x, y, w, h, r) {
    r = Math.min(r, w / 2, h);
    if (h <= 0) return "";
    return "M" + x + "," + (y + h) + "V" + (y + r) + "Q" + x + "," + y + " " + (x + r) + "," + y +
      "H" + (x + w - r) + "Q" + (x + w) + "," + y + " " + (x + w) + "," + (y + r) + "V" + (y + h) + "Z";
  }
  function hbarPath(x, y, w, h, r) {
    r = Math.min(r, h / 2, w);
    if (w <= 0) return "";
    return "M" + x + "," + y + "H" + (x + w - r) + "Q" + (x + w) + "," + y + " " + (x + w) + "," + (y + r) +
      "V" + (y + h - r) + "Q" + (x + w) + "," + (y + h) + " " + (x + w - r) + "," + (y + h) + "H" + x + "Z";
  }

  // ---------- vertical bars ----------
  // data: [{label, value, tip, color, on}] ; opts: {format, max, onClick(i), height, yTicks}
  function hostW(host) { return Math.max(300, Math.min(host.clientWidth || 560, 760)); }
  function bars(host, data, opts) {
    opts = opts || {};
    var W = hostW(host), H = opts.height || 240, m = { t: 22, r: 8, b: 26, l: opts.noAxis ? 8 : 40 };
    var s = svgFor(host, W, H, opts.label);
    var max = opts.max || niceMax(Math.max.apply(null, data.map(function (d) { return d.value || 0; })));
    var iw = W - m.l - m.r, ih = H - m.t - m.b, bw = iw / data.length;
    var g = el("g", { class: "ax" }, s);
    if (!opts.noAxis) [0, .5, 1].forEach(function (f) {
      var y = m.t + ih - f * ih;
      el("line", { x1: m.l, x2: W - m.r, y1: y, y2: y, class: "grid-line" }, g);
      txt(g, m.l - 6, y + 3, opts.tickFormat ? opts.tickFormat(max * f) : fmt.int(max * f), "", "end");
    });
    var anySel = data.some(function (d) { return d.on; });
    if (anySel) s.classList.add("sel-dim");
    data.forEach(function (d, i) {
      var v = d.value || 0, h = ih * v / max, x = m.l + i * bw + bw * 0.14, w = bw * 0.72, y = m.t + ih - h;
      var p = el("path", { d: barPath(x, y, w, Math.max(h, v > 0 ? 1 : 0), 4), fill: d.color || C.base }, s);
      if (d.on) p.classList.add("on");
      // big invisible hit target
      var hit = el("rect", { x: m.l + i * bw, y: m.t, width: bw, height: ih, fill: "transparent" }, s);
      bindMark(hit, d.tip || (d.label + ": " + (opts.format || fmt.int)(v)), opts.onClick ? function () { opts.onClick(i); } : null);
      hit.addEventListener("mouseenter", function () { p.style.filter = "brightness(1.3)"; });
      hit.addEventListener("mouseleave", function () { p.style.filter = ""; });
      if (!opts.hideValues && d.value != null) txt(s, x + w / 2, y - 6, (opts.format || fmt.int)(v), "vlab", "middle");
      if (opts.labelEvery == null || i % opts.labelEvery === 0) txt(s, x + w / 2, H - 8, d.label, "ax-l", "middle").setAttribute("style", "fill:#7d7476;font-family:var(--mono);font-size:10.5px");
    });
    el("line", { x1: m.l, x2: W - m.r, y1: m.t + ih, y2: m.t + ih, stroke: "#a8a0a0", "stroke-width": 1 }, s);
    return s;
  }

  // ---------- horizontal bars ----------
  // data: [{label, value, tip, color, on, valueLabel}]
  function hbars(host, data, opts) {
    opts = opts || {};
    var W = hostW(host), rowH = opts.rowH || 30, labelW = Math.min(opts.labelW || 210, W * .42)
    var H = data.length * rowH + 6;
    var s = svgFor(host, W, H, opts.label);
    var max = opts.max || Math.max.apply(null, data.map(function (d) { return d.value || 0; })) || 1;
    var iw = W - labelW - 90;
    var anySel = data.some(function (d) { return d.on; });
    if (anySel) s.classList.add("sel-dim");
    data.forEach(function (d, i) {
      var y = i * rowH + 4, w = iw * (d.value || 0) / max;
      var maxCh = Math.floor(labelW / 6.6), lab = d.label.length > maxCh ? d.label.slice(0, maxCh - 1) + "…" : d.label;
      txt(s, 0, y + rowH / 2 + 1, lab, "clab").setAttribute("dominant-baseline", "middle");
      var p = el("path", { d: hbarPath(labelW, y + 6, Math.max(w, d.value > 0 ? 2 : 0), rowH - 14, 4), fill: d.color || C.base }, s);
      if (d.on) p.classList.add("on");
      txt(s, labelW + w + 8, y + rowH / 2 + 1, d.valueLabel || (opts.format || fmt.int)(d.value), "vlab m").setAttribute("dominant-baseline", "middle");
      var hit = el("rect", { x: 0, y: y, width: W, height: rowH, fill: "transparent" }, s);
      bindMark(hit, d.tip || d.label, opts.onClick ? function () { opts.onClick(i); } : null);
      hit.addEventListener("mouseenter", function () { p.style.filter = "brightness(1.3)"; });
      hit.addEventListener("mouseleave", function () { p.style.filter = ""; });
    });
    el("line", { x1: labelW, x2: labelW, y1: 0, y2: H, stroke: "#a8a0a0" }, s);
    return s;
  }

  // ---------- line with crosshair ----------
  // pts: [{label, value, tip}] ; opts: {format, min, max, color, refs:[{value,label}]}
  function line(host, pts, opts) {
    opts = opts || {};
    var W = hostW(host), H = opts.height || 200, m = { t: 18, r: 14, b: 26, l: 44 };
    var s = svgFor(host, W, H, opts.label);
    var vals = pts.map(function (p) { return p.value; }).filter(function (v) { return v != null; });
    var lo = opts.min != null ? opts.min : Math.min.apply(null, vals), hi = opts.max != null ? opts.max : niceMax(Math.max.apply(null, vals));
    var iw = W - m.l - m.r, ih = H - m.t - m.b;
    function X(i) { return m.l + (pts.length === 1 ? iw / 2 : iw * i / (pts.length - 1)); }
    function Y(v) { return m.t + ih - ih * (v - lo) / (hi - lo || 1); }
    var g = el("g", { class: "ax" }, s);
    [0, .5, 1].forEach(function (f) {
      var v = lo + (hi - lo) * f, y = Y(v);
      el("line", { x1: m.l, x2: W - m.r, y1: y, y2: y, class: "grid-line" }, g);
      txt(g, m.l - 6, y + 3, (opts.tickFormat || opts.format || fmt.int)(v), "", "end");
    });
    (opts.refs || []).forEach(function (r) {
      el("line", { x1: m.l, x2: W - m.r, y1: Y(r.value), y2: Y(r.value), stroke: C.amber, "stroke-dasharray": "3 4", "stroke-width": 1 }, s);
      txt(s, W - m.r, Y(r.value) - 5, r.label, "vlab m", "end");
    });
    pts.forEach(function (p, i) { if (opts.labelEvery == null || i % opts.labelEvery === 0) txt(g, X(i), H - 8, p.label, "", "middle"); });
    var d = "", started = false;
    pts.forEach(function (p, i) { if (p.value == null) { started = false; return; } d += (started ? "L" : "M") + X(i) + "," + Y(p.value); started = true; });
    el("path", { d: d, fill: "none", stroke: opts.color || C.accent2, "stroke-width": 2, "stroke-linejoin": "round", "stroke-linecap": "round" }, s);
    var cross = el("line", { y1: m.t, y2: m.t + ih, stroke: "#a8a0a0", "stroke-width": 1, opacity: 0 }, s);
    var dot = el("circle", { r: 4.5, fill: opts.color || C.accent2, stroke: C.panel, "stroke-width": 2, opacity: 0 }, s);
    // last-point label
    var last = pts.length - 1; while (last >= 0 && pts[last].value == null) last--;
    if (last >= 0) {
      el("circle", { cx: X(last), cy: Y(pts[last].value), r: 4, fill: opts.color || C.accent2, stroke: C.panel, "stroke-width": 2 }, s);
    }
    var bw = iw / Math.max(1, pts.length - 1);
    pts.forEach(function (p, i) {
      if (p.value == null) return;
      var hit = el("rect", { x: X(i) - bw / 2, y: m.t, width: bw, height: ih, fill: "transparent" }, s);
      bindMark(hit, p.tip || (p.label + ": " + (opts.format || fmt.int)(p.value)), opts.onClick ? function () { opts.onClick(i); } : null);
      hit.addEventListener("mouseenter", function () { cross.setAttribute("x1", X(i)); cross.setAttribute("x2", X(i)); cross.setAttribute("opacity", .6); dot.setAttribute("cx", X(i)); dot.setAttribute("cy", Y(p.value)); dot.setAttribute("opacity", 1); });
      hit.addEventListener("mouseleave", function () { cross.setAttribute("opacity", 0); dot.setAttribute("opacity", 0); });
    });
    return s;
  }

  // ---------- heatmap (one-hue sequential) ----------
  // rows, cols: labels; z[r][c]; opts: {format, tip(r,c,v), onRow(r), highlightDiag}
  function heat(host, rows, cols, z, opts) {
    opts = opts || {};
    var lw = 72, th = 34, cell = 34, W = lw + cols.length * cell + 4, H = th + rows.length * cell + 4;
    var s = svgFor(host, W, H, opts.label);
    var max = 0; z.forEach(function (r) { r.forEach(function (v) { if (v > max) max = v; }); });
    cols.forEach(function (c, j) { var t = txt(s, lw + j * cell + cell / 2, th - 8, c, "", "middle"); t.setAttribute("style", "fill:#7d7476;font-family:var(--mono);font-size:9.5px"); });
    rows.forEach(function (r, i) {
      var t = txt(s, lw - 8, th + i * cell + cell / 2 + 3, r, "", "end"); t.setAttribute("style", "fill:#a8a0a0;font-family:var(--mono);font-size:10px");
      cols.forEach(function (c, j) {
        var v = z[i][j], f = max ? Math.sqrt(v / max) : 0;
        // one hue: panel -> crimson, by sqrt to keep small cells visible
        var col = v === 0 ? "#171315" : mix("#2a1619", "#ff5a63", f);
        var rect = el("rect", { x: lw + j * cell + 1, y: th + i * cell + 1, width: cell - 2, height: cell - 2, rx: 3, fill: col }, s);
        if (opts.diag && opts.diag(i, j)) rect.setAttribute("stroke", "#a8a0a0"), rect.setAttribute("stroke-width", 1);
        if (v > 0 && f > .35) { var tt = txt(s, lw + j * cell + cell / 2, th + i * cell + cell / 2 + 4, short(v), "", "middle"); tt.setAttribute("style", "fill:" + (f > .7 ? "#1b0a0d" : "#efe7e4") + ";font-size:9.5px;pointer-events:none;font-variant-numeric:tabular-nums"); }
        bindMark(rect, opts.tip ? opts.tip(i, j, v) : r + " → " + c + ": " + v, opts.onRow ? function () { opts.onRow(i); } : null);
      });
    });
    return s;
  }
  function short(v) { return v >= 1000 ? (v / 1000).toFixed(v >= 10000 ? 0 : 1) + "k" : String(v); }
  function mix(a, b, t) {
    var pa = [1, 3, 5].map(function (i) { return parseInt(a.substr(i, 2), 16); }), pb = [1, 3, 5].map(function (i) { return parseInt(b.substr(i, 2), 16); });
    return "rgb(" + pa.map(function (v, i) { return Math.round(v + (pb[i] - v) * t); }).join(",") + ")";
  }

  // ---------- scatter ----------
  // pts: [{x, y, r, color, tip, on}] ; opts: {xLog, xLabel, yLabel, onClick(i), xFormat}
  function scatter(host, pts, opts) {
    opts = opts || {};
    var W = 560, H = opts.height || 300, m = { t: 14, r: 14, b: 40, l: 46 };
    var s = svgFor(host, W, H, opts.label);
    var xs = pts.map(function (p) { return p.x; }), ys = pts.map(function (p) { return p.y; });
    var x0 = opts.xMin || Math.min.apply(null, xs), x1 = opts.xMax || Math.max.apply(null, xs);
    var lx = function (v) { return opts.xLog ? Math.log10(Math.max(v, x0)) : v; };
    var iw = W - m.l - m.r, ih = H - m.t - m.b, y0 = 0, y1 = opts.yMax || 100;
    function X(v) { return m.l + iw * (lx(v) - lx(x0)) / (lx(x1) - lx(x0)); }
    function Y(v) { return m.t + ih - ih * (v - y0) / (y1 - y0); }
    var g = el("g", { class: "ax" }, s);
    [0, 25, 50, 75, 100].forEach(function (v) { el("line", { x1: m.l, x2: W - m.r, y1: Y(v), y2: Y(v), class: "grid-line" }, g); txt(g, m.l - 6, Y(v) + 3, v, "", "end"); });
    (opts.xTicks || []).forEach(function (v) { el("line", { x1: X(v), x2: X(v), y1: m.t, y2: m.t + ih, class: "grid-line" }, g); txt(g, X(v), H - 22, opts.xFormat ? opts.xFormat(v) : v, "", "middle"); });
    (opts.bands || []).forEach(function (b) { el("line", { x1: m.l, x2: W - m.r, y1: Y(b.y), y2: Y(b.y), stroke: b.color, "stroke-dasharray": "3 4", opacity: .7 }, s); txt(s, W - m.r, Y(b.y) - 5, b.label, "vlab m", "end"); });
    txt(s, m.l + iw / 2, H - 4, opts.xLabel || "", "", "middle").setAttribute("style", "fill:#7d7476;font-size:11px");
    var yl = txt(s, 12, m.t + ih / 2, opts.yLabel || "", "", "middle"); yl.setAttribute("transform", "rotate(-90 12 " + (m.t + ih / 2) + ")"); yl.setAttribute("style", "fill:#7d7476;font-size:11px");
    var order = pts.map(function (p, i) { return i; }).sort(function (a, b) { return (pts[b].r || 4) - (pts[a].r || 4); });
    var anySel = pts.some(function (p) { return p.on; });
    order.forEach(function (i) {
      var p = pts[i];
      var c = el("circle", { cx: X(p.x), cy: Y(p.y), r: p.r || 4, fill: p.color || C.base, "fill-opacity": .78, stroke: C.panel, "stroke-width": 2 }, s);
      if (anySel && !p.on) c.setAttribute("fill-opacity", .25);
      if (p.on) { c.setAttribute("stroke", "#efe7e4"); c.setAttribute("fill-opacity", 1); }
      bindMark(c, p.tip, opts.onClick ? function () { opts.onClick(i); } : null);
    });
    return s;
  }

  // ---------- sortable table ----------
  // cols: [{key, label, num, fmt, bar:{max, hi(row)}}] ; rows: objects ; opts:{onRow(row), isOn(row), sortKey, desc}
  function table(host, cols, rows, opts) {
    opts = opts || {};
    var state = host._sort || { key: opts.sortKey || cols[0].key, desc: opts.desc !== false };
    host._sort = state;
    rows = rows.slice().sort(function (a, b) {
      var x = a[state.key], y = b[state.key];
      if (typeof x === "string") return state.desc ? y.localeCompare(x) : x.localeCompare(y);
      return state.desc ? y - x : x - y;
    });
    var h = '<table class="t"><thead><tr>' + cols.map(function (c) {
      var s = state.key === c.key ? ' aria-sort="' + (state.desc ? "descending" : "ascending") + '"' : "";
      return '<th scope="col" tabindex="0" data-k="' + c.key + '" class="' + (c.num ? "n" : "") + '"' + s + ">" + c.label + "</th>";
    }).join("") + "</tr></thead><tbody>";
    rows.forEach(function (r, i) {
      h += '<tr data-i="' + i + '" tabindex="0"' + (opts.isOn && opts.isOn(r) ? ' class="on"' : "") + ">" + cols.map(function (c) {
        var v = r[c.key], s = c.fmt ? c.fmt(v, r) : v;
        if (c.bar) s = '<span class="mini' + (c.bar.hi && c.bar.hi(r) ? " hi" : "") + '" style="width:' + Math.max(2, 60 * v / c.bar.max) + 'px"></span>' + s;
        return '<td class="' + (c.num ? "n" : "") + '">' + s + "</td>";
      }).join("") + "</tr>";
    });
    host.innerHTML = '<div class="scroll">' + h + "</tbody></table></div>";
    host.querySelectorAll("th").forEach(function (th) {
      function go() { var k = th.dataset.k; if (state.key === k) state.desc = !state.desc; else { state.key = k; state.desc = true; } table(host, cols, rows, opts); }
      th.addEventListener("click", go); th.addEventListener("keydown", function (e) { if (e.key === "Enter") go(); });
    });
    if (opts.onRow) host.querySelectorAll("tbody tr").forEach(function (tr) {
      function go() { opts.onRow(rows[+tr.dataset.i]); }
      tr.addEventListener("click", go); tr.addEventListener("keydown", function (e) { if (e.key === "Enter") go(); });
    });
  }

  // ---------- story engine ----------
  // chapters: [{title, body, apply(), focus:[panelIds]}]
  function story(root, chapters) {
    var list = root.querySelector(".chapters"), nar = root.querySelector(".narrative .body"), idx = 0;
    list.innerHTML = chapters.map(function (c, i) { return '<li><button type="button" data-i="' + i + '"><span>0' + (i + 1) + "</span>" + c.title + "</button></li>"; }).join("");
    function go(i) {
      idx = (i + chapters.length) % chapters.length;
      var c = chapters[idx];
      list.querySelectorAll("button").forEach(function (b, j) { if (j === idx) b.setAttribute("aria-current", "step"); else b.removeAttribute("aria-current"); });
      nar.innerHTML = "<h2>" + c.title + "</h2>" + c.body;
      if (c.apply) c.apply();
      document.querySelectorAll(".panel").forEach(function (p) {
        p.classList.toggle("focus", !!(c.focus && c.focus.indexOf(p.id) >= 0));
      });
      if (c.focus && c.focus.length && go.started) {
        var target = document.getElementById(c.focus[0]);
        if (target && window.innerWidth < 980) target.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      go.started = true;
    }
    list.addEventListener("click", function (e) { var b = e.target.closest("button"); if (b) go(+b.dataset.i); });
    root.querySelector("[data-prev]").addEventListener("click", function () { go(idx - 1); });
    root.querySelector("[data-next]").addEventListener("click", function () { go(idx + 1); });
    go(0);
    return go;
  }

  function seg(host, onChange) {
    host.addEventListener("click", function (e) {
      var b = e.target.closest("button"); if (!b) return;
      host.querySelectorAll("button").forEach(function (x) { x.setAttribute("aria-pressed", x === b ? "true" : "false"); });
      onChange(b.dataset.k);
    });
  }
  function setSeg(host, k) { host.querySelectorAll("button").forEach(function (x) { x.setAttribute("aria-pressed", x.dataset.k === k ? "true" : "false"); }); }

  function median(a) {
    if (!a.length) return null;
    a = a.slice().sort(function (x, y) { return x - y; });
    var m = a.length >> 1; return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
  }

  var rz; function onResize(fn) { var w = window.innerWidth; window.addEventListener("resize", function () { clearTimeout(rz); rz = setTimeout(function () { if (Math.abs(window.innerWidth - w) > 40) { w = window.innerWidth; fn(); } }, 200); }); }
  global.Dash = { onResize: onResize, C: C, fmt: fmt, bars: bars, hbars: hbars, line: line, heat: heat, scatter: scatter, table: table, story: story, seg: seg, setSeg: setSeg, median: median, hideTip: hideTip };
})(window);
