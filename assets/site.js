// Page chrome: theme toggle, show-more toggles, floating CTA, background shape drift.
(function () {
  document.querySelector(".theme-btn").addEventListener("click", function () {
    var root = document.documentElement;
    var dark = root.dataset.theme ? root.dataset.theme === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
    root.dataset.theme = dark ? "light" : "dark";
    try { localStorage.setItem("theme", root.dataset.theme); } catch (e) {}
  });

  document.querySelectorAll("[data-toggle]").forEach(function (btn) {
    var target = document.getElementById(btn.dataset.toggle);
    btn.addEventListener("click", function () {
      var open = target.classList.toggle("expanded");
      btn.textContent = open ? btn.dataset.less : btn.dataset.more;
      btn.setAttribute("aria-expanded", open);
      if (!open) target.scrollIntoView({ block: "start" });
    });
  });

  // cairn stones drop in once, when the section scrolls into view (checked in onScroll)
  var cairn = document.querySelector(".cairn");
  if (cairn && !matchMedia("(prefers-reduced-motion: reduce)").matches) cairn.classList.add("armed");

  var cta = document.getElementById("float-cta");
  var hero = document.getElementById("hero");
  var contact = document.getElementById("contact");
  var shapeLayer = document.querySelector(".shapes");
  var shapes = document.querySelectorAll(".shapes i");
  var pieces = Array.prototype.map.call(document.querySelectorAll("#portrait .pc"), function (el) {
    var v = el.dataset.to.split(" ").map(Number);
    return { el: el, dx: v[0], dy: v[1], rot: v[2], scale: v[3] };
  });
  var still = matchMedia("(prefers-reduced-motion: reduce)").matches;
  var base = Array.prototype.map.call(shapes, function (s) { return getComputedStyle(s).transform; });
  var ease = function (t) { return t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; };

  // confetti: the background shapes burst into pieces of their own colour at the contact section
  var popped = false;
  var canvas = null;
  function burst() {
    if (!canvas) {
      canvas = document.createElement("canvas");
      canvas.className = "confetti";
      canvas.setAttribute("aria-hidden", "true");
      document.body.appendChild(canvas);
    }
    var dpr = window.devicePixelRatio || 1;
    var W = window.innerWidth, H = window.innerHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    var ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    var kinds = ["square", "circle", "tri", "half"];
    var parts = [];
    shapes.forEach(function (sh) {
      var r = sh.getBoundingClientRect();
      // shapes sit partly off-screen; launch from the visible part
      var x = Math.min(Math.max(r.left + r.width / 2, 20), W - 20);
      var y = Math.min(Math.max(r.top + r.height / 2, 20), H - 20);
      var color = getComputedStyle(sh).backgroundColor;
      for (var i = 0; i < 40; i++) {
        var a = Math.random() * Math.PI * 2;
        var v = 4 + Math.random() * 9;
        parts.push({
          x: x, y: y, vx: Math.cos(a) * v + (W / 2 - x) * 0.008, vy: Math.sin(a) * v - 6,
          size: 6 + Math.random() * 10, rot: Math.random() * 6.28, vr: (Math.random() - .5) * .3,
          kind: kinds[(Math.random() * 4) | 0], color: color
        });
      }
    });
    var t0 = performance.now();
    (function frame(now) {
      ctx.clearRect(0, 0, W, H);
      var alive = 0;
      parts.forEach(function (p) {
        p.vy += 0.22; p.vx *= 0.985; p.vy *= 0.985;
        p.x += p.vx; p.y += p.vy; p.rot += p.vr;
        if (p.y > H + 30) return;
        alive++;
        ctx.save();
        ctx.translate(p.x, p.y); ctx.rotate(p.rot);
        // flutter: squash on one axis so pieces look like they tumble
        ctx.scale(1, Math.abs(Math.cos(p.rot * 1.7)) * .8 + .2);
        ctx.fillStyle = p.color;
        var h = p.size / 2;
        ctx.beginPath();
        if (p.kind === "square") ctx.rect(-h, -h, p.size, p.size);
        else if (p.kind === "circle") ctx.arc(0, 0, h, 0, 6.2832);
        else if (p.kind === "tri") { ctx.moveTo(0, -h); ctx.lineTo(h, h); ctx.lineTo(-h, h); ctx.closePath(); }
        else ctx.arc(0, h / 2, h, Math.PI, 0);
        ctx.fill();
        ctx.restore();
      });
      if (alive && now - t0 < 6000) requestAnimationFrame(frame);
      else ctx.clearRect(0, 0, W, H);
    })(t0);
  }

  function onScroll() {
    var y = window.scrollY;
    if (cta && hero && contact) {
      var pastHero = hero.getBoundingClientRect().bottom < 0;
      var atContact = contact.getBoundingClientRect().top < window.innerHeight * 0.8;
      cta.classList.toggle("show", pastHero && !atContact);
    }

    // portrait -> background: p runs 0..1 over the first ~70% of the hero
    if (hero && pieces.length) {
      var p = Math.min(1, Math.max(0, y / (hero.offsetHeight * 0.7)));
      if (still) p = p < 0.5 ? 0 : 1;
      var e = ease(p);
      pieces.forEach(function (pc) {
        pc.el.style.transform = "translate(" + pc.dx * e + "px," + pc.dy * e + "px) rotate(" + pc.rot * e + "deg) scale(" + (1 + (pc.scale - 1) * e) + ")";
        pc.el.style.opacity = 1 - Math.min(1, Math.max(0, (p - 0.4) / 0.4));
      });
      shapeLayer.style.opacity = Math.max(0, (p - 0.35) / 0.65);
    }

    if (contact && shapeLayer) {
      var ct = contact.getBoundingClientRect().top;
      if (!popped && ct < window.innerHeight * 0.6) {
        popped = true;
        if (!still) burst();
      } else if (popped && ct > window.innerHeight) {
        popped = false;
      }
      shapeLayer.classList.toggle("popped", popped);
    }

    if (cairn && !cairn.classList.contains("in") && cairn.getBoundingClientRect().top < window.innerHeight * 0.75) {
      cairn.classList.add("in");
    }

    if (still) return;
    // each shape drifts at its own rate so the glass panels pass over them
    shapes.forEach(function (s, i) {
      var rate = [0.12, -0.08, 0.06, -0.1][i];
      var spin = [0, 0.02, 0, -0.03][i];
      var b = base[i] === "none" ? "" : base[i];
      s.style.transform = b + " translateY(" + (y * rate) + "px) rotate(" + (y * spin) + "deg)";
    });
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
  onScroll();
})();
