// Knowledge graph explorer: d3 force layout over data/kg.json.
(function () {
  // Bauhaus primaries by type family; the rest stay ink or outline
  var TYPE_COLOR = {
    Person: "c-red", Award: "c-red",
    Company: "c-blue", Organization: "c-blue", Product: "c-blue", Program: "c-blue", Project: "c-blue",
    Post: "c-yellow", Collection: "c-yellow", Media: "c-yellow", "Creative work": "c-yellow",
    Principle: "c-green", Role: "c-green", Concept: "c-green",
    Studio: "c-red",
    Investor: "c-ink", Service: "c-ink", Offer: "c-ink", Resource: "c-ink"
  };
  var TYPE_ORDER = ["Person", "Studio", "Company", "Organization", "Product", "Program", "Project", "Investor", "Media", "Award",
    "Creative work", "Concept", "Role", "Service", "Offer", "Principle", "Collection", "Post", "Resource", "Topic", "Profile", "WebPage"];

  fetch("data/kg.json").then(function (r) { return r.json(); }).then(init).catch(function () {
    document.getElementById("stats").textContent = "Could not load data/kg.json. Serve this folder over http(s), not file://.";
  });

  function init(kg) {
    var nodes = kg.nodes.map(function (n) { return Object.assign({}, n); });
    var byId = new Map(nodes.map(function (n) { return [n.id, n]; }));
    var links = kg.edges.filter(function (e) { return byId.has(e.from) && byId.has(e.to); })
      .map(function (e) { return { source: e.from, target: e.to, label: e.label, status: e.status, start: e.start, end: e.end, note: e.note }; });

    nodes.forEach(function (n) { n.out = []; n.in = []; });
    links.forEach(function (l) { byId.get(l.source).out.push(l); byId.get(l.target).in.push(l); });
    nodes.forEach(function (n) { n.deg = n.out.length + n.in.length; });

    var types = TYPE_ORDER.filter(function (t) { return nodes.some(function (n) { return n.type === t; }); })
      .concat(Array.from(new Set(nodes.map(function (n) { return n.type; }))).filter(function (t) { return TYPE_ORDER.indexOf(t) < 0; }));
    var activeTypes = new Set(types);

    document.getElementById("stats").textContent =
      nodes.length + " nodes · " + links.length + " edges · " + types.length + " types";

    // filter chips
    var chips = document.getElementById("chips");
    types.forEach(function (t) {
      var b = document.createElement("button");
      b.className = "chip " + (TYPE_COLOR[t] || ""); b.type = "button"; b.setAttribute("aria-pressed", "true");
      b.innerHTML = "<i></i>" + t;
      b.addEventListener("click", function () {
        if (activeTypes.has(t)) activeTypes.delete(t); else activeTypes.add(t);
        b.setAttribute("aria-pressed", activeTypes.has(t));
        applyFilter();
      });
      chips.appendChild(b);
    });

    // index
    var index = document.getElementById("index");
    types.forEach(function (t) {
      var list = nodes.filter(function (n) { return n.type === t; });
      var div = document.createElement("div");
      div.innerHTML = "<h5>" + t + " <span>(" + list.length + ")</span></h5>";
      var ul = document.createElement("ul");
      list.forEach(function (n) {
        var li = document.createElement("li");
        var b = document.createElement("button");
        b.type = "button"; b.textContent = n.label;
        b.addEventListener("click", function () { select(n, true); document.querySelector(".kg-box").scrollIntoView({ behavior: "smooth", block: "start" }); });
        li.appendChild(b); ul.appendChild(li);
      });
      div.appendChild(ul); index.appendChild(div);
    });

    // graph
    var host = document.getElementById("graph");
    var W = host.clientWidth, H = host.clientHeight;
    var svg = d3.select(host).append("svg").attr("viewBox", [-W / 2, -H / 2, W, H]);
    var g = svg.append("g");
    var zoom = d3.zoom().scaleExtent([0.3, 4]).on("zoom", function (ev) { g.attr("transform", ev.transform); });
    svg.call(zoom).on("dblclick.zoom", null);
    svg.on("click", function (ev) { if (ev.target === svg.node()) clearSelection(); });

    var size = function (n) { return n.type === "Person" ? 16 : 6 + Math.min(n.deg, 10) * 0.9; };

    var sim = d3.forceSimulation(nodes)
      .force("link", d3.forceLink(links).id(function (d) { return d.id; }).distance(function (l) {
        return l.source.type === "Person" || l.target.type === "Person" ? 170 : 70;
      }))
      .force("charge", d3.forceManyBody().strength(-420))
      .force("collide", d3.forceCollide().radius(function (d) { return size(d) + 10; }))
      .force("x", d3.forceX().strength(0.04))
      .force("y", d3.forceY().strength(0.06));

    var link = g.append("g").selectAll("line").data(links).join("line")
      .attr("class", function (l) { return "link" + (l.status === "draft" ? " draft" : ""); });
    var elabel = g.append("g").selectAll("text").data(links).join("text").attr("class", "elabel")
      .attr("text-anchor", "middle").text(function (d) { return d.label; });

    var node = g.append("g").selectAll("g").data(nodes).join("g")
      .attr("class", function (d) { return "node " + (TYPE_COLOR[d.type] || ""); })
      .call(d3.drag()
        .on("start", function (ev, d) { if (!ev.active) sim.alphaTarget(0.25).restart(); d.fx = d.x; d.fy = d.y; })
        .on("drag", function (ev, d) { d.fx = ev.x; d.fy = ev.y; })
        .on("end", function (ev, d) { if (!ev.active) sim.alphaTarget(0); d.fx = null; d.fy = null; }))
      .on("click", function (ev, d) { ev.stopPropagation(); select(d); })
      .on("dblclick", function (ev, d) { ev.stopPropagation(); select(d, true); })
      .on("mouseenter", function (ev, d) { if (!selected) highlight(d); })
      .on("mouseleave", function () { if (!selected) highlight(null); });

    node.append("rect")
      .attr("width", function (d) { return size(d); }).attr("height", function (d) { return size(d); })
      .attr("x", function (d) { return -size(d) / 2; }).attr("y", function (d) { return -size(d) / 2; });
    node.append("text")
      .attr("x", function (d) { return size(d) / 2 + 5; }).attr("dy", "0.35em")
      .text(function (d) { return d.label.length > 28 ? d.label.slice(0, 27) + "…" : d.label; });
    node.append("title").text(function (d) { return d.type + " · " + d.label; });

    sim.on("tick", function () {
      link.attr("x1", function (d) { return d.source.x; }).attr("y1", function (d) { return d.source.y; })
        .attr("x2", function (d) { return d.target.x; }).attr("y2", function (d) { return d.target.y; });
      elabel.attr("x", function (d) { return (d.source.x + d.target.x) / 2; })
        .attr("y", function (d) { return (d.source.y + d.target.y) / 2 - 3; });
      node.attr("transform", function (d) { return "translate(" + d.x + "," + d.y + ")"; });
    });

    var selected = null;

    function neighbors(d) {
      var s = new Set([d.id]);
      d.out.forEach(function (l) { s.add(l.target.id); });
      d.in.forEach(function (l) { s.add(l.source.id); });
      return s;
    }

    function highlight(d) {
      if (!d) {
        node.classed("dim", false).classed("sel", false);
        link.classed("dim", false).classed("on", false);
        elabel.classed("on", false);
        applyFilter();
        return;
      }
      var nb = neighbors(d);
      node.classed("dim", function (n) { return !nb.has(n.id); }).classed("sel", function (n) { return n === d; });
      var touches = function (l) { return l.source === d || l.target === d; };
      link.classed("dim", function (l) { return !touches(l); }).classed("on", touches);
      // hubs have too many edges to label legibly; the inspector lists them instead
      elabel.classed("on", function (l) { return d.deg <= 8 && touches(l); });
    }

    function select(d, zoomTo) {
      selected = d;
      highlight(d);
      renderInspector(d);
      if (zoomTo) {
        svg.transition().duration(500).call(zoom.transform, d3.zoomIdentity.scale(d.deg > 8 ? 1 : 1.4).translate(-d.x, -d.y));
      }
    }

    function clearSelection() {
      selected = null;
      highlight(null);
      document.getElementById("inspector").innerHTML =
        '<p class="k">Selected node</p><p class="txt" style="color:var(--muted)">Click a node in the graph, or pick one from the index below.</p>';
    }

    function when(l) {
      var y0 = l.start ? l.start.slice(0, 4) : "", y1 = l.end ? l.end.slice(0, 4) : "";
      var span = !y0 ? "" : !y1 ? y0 + "–" : y0 === y1 ? y0 : y0 + "–" + y1;
      var bits = [span, l.note].filter(Boolean).join(" · ");
      return (bits ? '<br><span class="rel">' + esc(bits) + "</span>" : "") + (l.status === "draft" ? ' <span class="draft-tag">draft</span>' : "");
    }

    function esc(s) {
      return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; });
    }

    function renderInspector(d) {
      var el = document.getElementById("inspector");
      var h = '<p class="k">' + esc(d.type) + "</p><h3 class=\"name\">" + esc(d.label) + "</h3>";
      h += "<dl><dt>id</dt><dd>" + esc(d.id) + "</dd>";
      if (d.url) h += '<dt>url</dt><dd><a href="' + esc(d.url) + '" target="_blank" rel="noopener">' + esc(d.url.replace(/^https?:\/\//, "").replace(/\/$/, "")) + " ↗</a></dd>";
      if (d.props && d.props.pronouns) h += "<dt>pronouns</dt><dd>" + esc(d.props.pronouns) + "</dd>";
      h += "<dt>degree</dt><dd>" + d.deg + "</dd></dl>";
      if (d.text) h += '<p class="txt">' + esc(d.text) + "</p>";
      if (d.props && d.props.tags) h += '<ul class="tags" style="margin-bottom:16px">' + d.props.tags.map(function (t) { return "<li>" + esc(t) + "</li>"; }).join("") + "</ul>";
      if (d.out.length) {
        h += "<h4>Outgoing (" + d.out.length + ")</h4><ul>" + d.out.map(function (l) {
          return '<li><span class="rel">' + esc(l.label) + ' →</span> <button type="button" data-id="' + esc(l.target.id) + '">' + esc(l.target.label) + "</button>" + when(l) + "</li>";
        }).join("") + "</ul>";
      }
      if (d.in.length) {
        h += "<h4>Incoming (" + d.in.length + ")</h4><ul>" + d.in.map(function (l) {
          return '<li><button type="button" data-id="' + esc(l.source.id) + '">' + esc(l.source.label) + '</button> <span class="rel">→ ' + esc(l.label) + "</span>" + when(l) + "</li>";
        }).join("") + "</ul>";
      }
      el.innerHTML = h;
      el.querySelectorAll("button[data-id]").forEach(function (b) {
        b.addEventListener("click", function () { select(byId.get(b.dataset.id), true); });
      });
    }

    function applyFilter() {
      var q = document.getElementById("q").value.trim().toLowerCase();
      var visible = function (n) {
        if (!activeTypes.has(n.type)) return false;
        if (!q) return true;
        return (n.label + " " + (n.text || "") + " " + ((n.props && n.props.tags) || []).join(" ")).toLowerCase().indexOf(q) >= 0;
      };
      node.style("display", function (n) { return activeTypes.has(n.type) ? null : "none"; })
        .classed("dim", function (n) { return !visible(n); });
      link.style("display", function (l) { return activeTypes.has(l.source.type) && activeTypes.has(l.target.type) ? null : "none"; })
        .classed("dim", function (l) { return !!q && !(visible(l.source) && visible(l.target)); });
    }

    document.getElementById("q").addEventListener("input", function () { selected = null; highlight(null); });
    document.getElementById("reset").addEventListener("click", function () {
      document.getElementById("q").value = "";
      types.forEach(function (t) { activeTypes.add(t); });
      chips.querySelectorAll(".chip").forEach(function (c) { c.setAttribute("aria-pressed", "true"); });
      clearSelection();
      svg.transition().duration(500).call(zoom.transform, d3.zoomIdentity);
      sim.alpha(0.6).restart();
    });

    // deep link: graph.html#proj:spectral
    var hash = decodeURIComponent(location.hash.slice(1));
    if (hash && byId.has(hash)) setTimeout(function () { select(byId.get(hash), true); }, 900);
  }
})();
