(() => {
  "use strict";

  /* =========================================================
     SPACE ESCAPE v1.1
     Matched to the existing Space Escape HTML
  ========================================================= */

  const canvas = document.getElementById("gameCanvas");
  const ctx = canvas.getContext("2d");

  const wrap = document.getElementById("gameWrap");

  /* Screens */
  const startOverlay = document.getElementById("startOverlay");
  const pauseOverlay = document.getElementById("pauseOverlay");
  const gameOverOverlay = document.getElementById("gameOverOverlay");

  /* HUD */
  const scoreEl = document.getElementById("score");
  const fuelEl = document.getElementById("fuel");
  const livesEl = document.getElementById("lives");

  /* Game over */
  const finalScore = document.getElementById("finalScore");
  const overTitle = document.getElementById("overTitle");
  const overText = document.getElementById("overText");

  /* Buttons */
  const startBtn = document.getElementById("startBtn");
  const restartBtn = document.getElementById("restartBtn");
  const pauseBtn = document.getElementById("pauseBtn");
  const resumeBtn = document.getElementById("resumeBtn");

  const upBtn = document.getElementById("upBtn");
  const downBtn = document.getElementById("downBtn");

  /* =========================================================
     GAME STATE
  ========================================================= */

  let W = 900;
  let H = 520;
  let dpr = 1;

  let raf = 0;
  let lastTime = 0;

  let running = false;
  let paused = false;

  let score = 0;
  let lives = 3;
  let fuel = 100;
  let distance = 0;

  let invulnerable = 0;

  const player = {
    x: 150,
    y: 260,
    vy: 0
  };

  let asteroids = [];
  let stars = [];
  let particles = [];

  const keys = {};

  let touching = false;
  let touchY = 0;

  let seed = 12345;

  /* =========================================================
     RANDOM
  ========================================================= */

  function rnd() {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  }

  /* =========================================================
     RESIZE
  ========================================================= */

  function resize() {
    if (!wrap) return;

    dpr = Math.min(window.devicePixelRatio || 1, 2);

    W = Math.max(320, wrap.clientWidth);

    H = Math.max(
      230,
      wrap.clientHeight || Math.min(560, W * 0.58)
    );

    canvas.width = Math.floor(W * dpr);
    canvas.height = Math.floor(H * dpr);

    canvas.style.width = W + "px";
    canvas.style.height = H + "px";

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    if (!running) {
      player.x = Math.min(150, W * 0.25);
      player.y = H * 0.5;
    }
  }

  window.addEventListener("resize", resize);

  window.addEventListener("orientationchange", () => {
    setTimeout(resize, 150);
  });

  resize();

  /* =========================================================
     ASTEROID CREATION
  ========================================================= */

  function createAsteroid(x, y, radius) {
    const points = 9;
    const shape = [];

    for (let i = 0; i < points; i++) {
      const angle = (Math.PI * 2 / points) * i;

      shape.push({
        angle,
        radius: radius * (0.78 + rnd() * 0.22)
      });
    }

    return {
      x,
      y,
      r: radius,
      rotation: rnd() * Math.PI * 2,
      spin: (rnd() - 0.5) * 0.025,
      shape,
      hit: false
    };
  }

  /* =========================================================
     WORLD RESET
  ========================================================= */

  function resetWorld() {
    score = 0;
    lives = 3;
    fuel = 100;
    distance = 0;
    invulnerable = 0;

    seed = 12345;

    player.x = Math.min(150, W * 0.25);
    player.y = H * 0.5;
    player.vy = 0;

    asteroids = [];
    stars = [];
    particles = [];

    /* -------------------------
       Stars
    ------------------------- */

    for (let i = 0; i < 140; i++) {
      stars.push({
        x: rnd() * 12000,
        y: rnd() * H,
        size: 0.7 + rnd() * 1.8,
        speed: 0.12 + rnd() * 0.45,
        alpha: 0.25 + rnd() * 0.75
      });
    }

    /* -------------------------
       Asteroid field
    ------------------------- */

    let x = 550;

    while (x < 12500) {
      const y = 65 + rnd() * (H - 130);
      const radius = 18 + rnd() * 30;

      asteroids.push(
        createAsteroid(x, y, radius)
      );

      /*
        Sometimes create a second asteroid,
        but keep enough space for the player.
      */

      if (rnd() > 0.62) {
        const secondY =
          55 + rnd() * (H - 110);

        asteroids.push(
          createAsteroid(
            x + 85 + rnd() * 90,
            secondY,
            12 + rnd() * 20
          )
        );
      }

      x += 180 + rnd() * 190;
    }

    updateHUD();
  }

  /* =========================================================
     HUD
  ========================================================= */

  function updateHUD() {
    if (scoreEl) {
      scoreEl.textContent =
        Math.floor(score).toLocaleString();
    }

    if (fuelEl) {
      fuelEl.textContent =
        Math.ceil(Math.max(0, fuel)) + "%";
    }

    if (livesEl) {
      livesEl.textContent = lives;
    }
  }

  /* =========================================================
     GAME CONTROL
  ========================================================= */

  function start() {
    resetWorld();

    running = true;
    paused = false;

    startOverlay?.classList.add("hidden");
    pauseOverlay?.classList.add("hidden");
    gameOverOverlay?.classList.add("hidden");

    lastTime = performance.now();

    cancelAnimationFrame(raf);

    raf = requestAnimationFrame(loop);
  }

  function pause() {
    if (!running || paused) return;

    paused = true;

    pauseOverlay?.classList.remove("hidden");
  }

  function resume() {
    if (!running || !paused) return;

    paused = false;

    pauseOverlay?.classList.add("hidden");

    lastTime = performance.now();

    cancelAnimationFrame(raf);

    raf = requestAnimationFrame(loop);
  }

  function finish(win = false) {
    running = false;
    paused = false;

    cancelAnimationFrame(raf);

    if (gameOverOverlay) {
      gameOverOverlay.classList.remove("hidden");
    }

    if (overTitle) {
      overTitle.textContent =
        win ? "MISSION COMPLETE" : "MISSION FAILED";
    }

    if (overText) {
      overText.textContent = win
        ? "You escaped the asteroid field and reached deep space."
        : "Your ship could not survive the asteroid field. Try again!";
    }

    if (finalScore) {
      finalScore.textContent =
        Math.floor(score).toLocaleString();
    }

    updateHUD();
  }

  /* =========================================================
     BUTTONS
  ========================================================= */

  startBtn?.addEventListener("click", start);

  restartBtn?.addEventListener("click", start);

  pauseBtn?.addEventListener("click", () => {
    if (paused) {
      resume();
    } else {
      pause();
    }
  });

  resumeBtn?.addEventListener("click", resume);

  /* =========================================================
     KEYBOARD
  ========================================================= */

  window.addEventListener("keydown", e => {
    const key = e.key.toLowerCase();

    keys[key] = true;

    if (
      key === "arrowup" ||
      key === "arrowdown" ||
      key === " " ||
      key === "w" ||
      key === "s"
    ) {
      e.preventDefault();
    }

    if (key === "p") {
      if (paused) {
        resume();
      } else {
        pause();
      }
    }
  });

  window.addEventListener("keyup", e => {
    keys[e.key.toLowerCase()] = false;
  });

  /* =========================================================
     PLAYER CONTROL
  ========================================================= */

  function control(y) {
    player.y = Math.max(
      45,
      Math.min(H - 55, y)
    );

    player.vy = 0;
  }

  /* =========================================================
     TOUCH / DRAG CONTROL
  ========================================================= */

  canvas.addEventListener("pointerdown", e => {
    if (!running || paused) return;

    touching = true;
    touchY = e.clientY;

    canvas.setPointerCapture?.(e.pointerId);
  });

  canvas.addEventListener("pointermove", e => {
    if (!touching || !running || paused) return;

    const delta = e.clientY - touchY;

    control(player.y + delta * 1.15);

    touchY = e.clientY;
  });

  function stopTouch() {
    touching = false;
  }

  canvas.addEventListener("pointerup", stopTouch);
  canvas.addEventListener("pointercancel", stopTouch);
  canvas.addEventListener("pointerleave", stopTouch);

  /* =========================================================
     MOBILE BUTTONS
  ========================================================= */

  function holdButton(button, key) {
    if (!button) return;

    const down = e => {
      e.preventDefault();

      if (!running || paused) return;

      keys[key] = true;
    };

    const up = e => {
      e.preventDefault();
      keys[key] = false;
    };

    button.addEventListener("pointerdown", down);
    button.addEventListener("pointerup", up);
    button.addEventListener("pointercancel", up);
    button.addEventListener("pointerleave", up);
  }

  holdButton(upBtn, "arrowup");
  holdButton(downBtn, "arrowdown");

  /* =========================================================
     PARTICLES
  ========================================================= */

  function burst(x, y, amount = 20) {
    for (let i = 0; i < amount; i++) {
      particles.push({
        x,
        y,
        vx: (rnd() - 0.5) * 5,
        vy: (rnd() - 0.5) * 5,
        life: 0.4 + rnd() * 0.7,
        size: 2 + rnd() * 4
      });
    }
  }

  /* =========================================================
     COLLISION
  ========================================================= */

  function hitAsteroid() {
    if (invulnerable > 0) return;

    lives--;

    burst(
      player.x,
      player.y,
      32
    );

    player.y = H * 0.5;
    player.vy = 0;

    score = Math.max(
      0,
      score - 200
    );

    fuel = Math.max(
      fuel,
      25
    );

    /*
      Short invulnerability period
      prevents repeated collisions.
    */

    invulnerable = 1.5;

    if (lives <= 0) {
      finish(false);
    }
  }

  /* =========================================================
     UPDATE
  ========================================================= */

  function update(dt) {
    /* -------------------------
       Input
    ------------------------- */

    const up =
      keys["arrowup"] ||
      keys["w"];

    const down =
      keys["arrowdown"] ||
      keys["s"];

    /* -------------------------
       Movement
    ------------------------- */

    if (up) {
      player.vy -=
        0.85 * dt * 60;
    } else if (down) {
      player.vy +=
        0.85 * dt * 60;
    } else {
      player.vy +=
        0.12 * dt * 60;
    }

    player.vy *=
      Math.pow(0.90, dt * 60);

    player.vy = Math.max(
      -6,
      Math.min(6, player.vy)
    );

    player.y +=
      player.vy * dt * 60;

    /* -------------------------
       Screen boundaries
    ------------------------- */

    if (player.y < 42) {
      player.y = 42;
      player.vy = 0.5;
    }

    if (player.y > H - 55) {
      player.y = H - 55;
      player.vy = -0.5;
    }

    /* -------------------------
       Distance
    ------------------------- */

    const speed = 3.2;

    distance +=
      speed * dt * 60;

    /* -------------------------
       Fuel
    ------------------------- */

    fuel -=
      0.42 * dt;

    if (fuel <= 0) {
      fuel = 0;
      finish(false);
      return;
    }

    /* -------------------------
       Invulnerability
    ------------------------- */

    if (invulnerable > 0) {
      invulnerable -= dt;
    }

    /* -------------------------
       Asteroids
    ------------------------- */

    asteroids.forEach(a => {
      a.x -=
        speed * dt * 60;

      a.rotation +=
        a.spin * dt * 60;

      if (a.hit) return;

      const dx =
        a.x - player.x;

      const dy =
        a.y - player.y;

      const hitDistance =
        Math.sqrt(
          dx * dx +
          dy * dy
        );

      if (
        hitDistance <
        a.r + 22
      ) {
        a.hit = true;

        /*
          Move asteroid away immediately.
        */

        a.x = player.x - 120;

        hitAsteroid();
      }
    });

    /* -------------------------
       Remove old asteroids
    ------------------------- */

    asteroids =
      asteroids.filter(
        a => a.x > -120
      );

    /* -------------------------
       Score
    ------------------------- */

    score +=
      8 * dt;

    /* -------------------------
       Win condition
    ------------------------- */

    if (distance >= 10000) {
      score += 2000;

      finish(true);

      return;
    }

    /* -------------------------
       Particles
    ------------------------- */

    particles.forEach(p => {
      p.x +=
        p.vx * dt * 60;

      p.y +=
        p.vy * dt * 60;

      p.life -= dt;
    });

    particles =
      particles.filter(
        p => p.life > 0
      );

    updateHUD();
  }

  /* =========================================================
     DRAW BACKGROUND
  ========================================================= */

  function drawBackground() {
    ctx.clearRect(
      0,
      0,
      W,
      H
    );

    const gradient =
      ctx.createLinearGradient(
        0,
        0,
        0,
        H
      );

    gradient.addColorStop(
      0,
      "#02040b"
    );

    gradient.addColorStop(
      0.5,
      "#071225"
    );

    gradient.addColorStop(
      1,
      "#02050c"
    );

    ctx.fillStyle = gradient;

    ctx.fillRect(
      0,
      0,
      W,
      H
    );

    /* Stars */

    stars.forEach(s => {
      const x =
        ((s.x - distance * s.speed) %
          (W + 40) +
          W +
          40) %
        (W + 40);

      ctx.globalAlpha =
        s.alpha;

      ctx.fillStyle =
        "#ffffff";

      ctx.beginPath();

      ctx.arc(
        x,
        s.y,
        s.size,
        0,
        Math.PI * 2
      );

      ctx.fill();
    });

    ctx.globalAlpha = 1;

    /* Blue space glow */

    const glow =
      ctx.createRadialGradient(
        W * 0.75,
        H * 0.45,
        10,
        W * 0.75,
        H * 0.45,
        W * 0.55
      );

    glow.addColorStop(
      0,
      "rgba(40,110,255,.10)"
    );

    glow.addColorStop(
      1,
      "rgba(40,110,255,0)"
    );

    ctx.fillStyle = glow;

    ctx.fillRect(
      0,
      0,
      W,
      H
    );
  }

  /* =========================================================
     DRAW ASTEROID
  ========================================================= */

  function drawAsteroid(a) {
    ctx.save();

    ctx.translate(
      a.x,
      a.y
    );

    ctx.rotate(
      a.rotation
    );

    /* Body */

    ctx.fillStyle =
      "#101725";

    ctx.beginPath();

    a.shape.forEach(
      (point, index) => {
        const x =
          Math.cos(point.angle) *
          point.radius;

        const y =
          Math.sin(point.angle) *
          point.radius;

        if (index === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
    );

    ctx.closePath();

    ctx.fill();

    /* Outline */

    ctx.strokeStyle =
      "rgba(120,150,190,.55)";

    ctx.lineWidth = 2;

    ctx.stroke();

    /* Craters */

    ctx.fillStyle =
      "rgba(2,8,18,.65)";

    ctx.beginPath();

    ctx.arc(
      -a.r * 0.25,
      -a.r * 0.2,
      a.r * 0.18,
      0,
      Math.PI * 2
    );

    ctx.fill();

    ctx.beginPath();

    ctx.arc(
      a.r * 0.28,
      a.r * 0.15,
      a.r * 0.12,
      0,
      Math.PI * 2
    );

    ctx.fill();

    ctx.restore();
  }

  /* =========================================================
     DRAW PLAYER SHIP
  ========================================================= */

  function drawShip() {
    /*
      Blink during invulnerability.
    */

    if (
      invulnerable > 0 &&
      Math.floor(
        invulnerable * 10
      ) % 2 === 0
    ) {
      return;
    }

    const x = player.x;
    const y = player.y;

    ctx.save();

    ctx.translate(
      x,
      y
    );

    /* Engine flame */

    ctx.fillStyle =
      "#ffb52e";

    ctx.beginPath();

    ctx.moveTo(-26, 0);
    ctx.lineTo(-48, -8);
    ctx.lineTo(-40, 0);
    ctx.lineTo(-48, 8);

    ctx.closePath();

    ctx.fill();

    ctx.fillStyle =
      "#fff2a6";

    ctx.beginPath();

    ctx.moveTo(-25, 0);
    ctx.lineTo(-40, -4);
    ctx.lineTo(-34, 0);
    ctx.lineTo(-40, 4);

    ctx.closePath();

    ctx.fill();

    /* Main body */

    ctx.fillStyle =
      "#dceeff";

    ctx.beginPath();

    ctx.moveTo(32, 0);
    ctx.lineTo(-8, -17);
    ctx.lineTo(-27, -11);
    ctx.lineTo(-17, 0);
    ctx.lineTo(-27, 11);
    ctx.lineTo(-8, 17);

    ctx.closePath();

    ctx.fill();

    /* Outline */

    ctx.strokeStyle =
      "#5ba9ff";

    ctx.lineWidth = 2;

    ctx.stroke();

    /* Cockpit */

    ctx.fillStyle =
      "#39d8ff";

    ctx.beginPath();

    ctx.ellipse(
      8,
      -4,
      10,
      7,
      -0.15,
      0,
      Math.PI * 2
    );

    ctx.fill();

    /* Shine */

    ctx.fillStyle =
      "rgba(255,255,255,.7)";

    ctx.beginPath();

    ctx.ellipse(
      11,
      -6,
      4,
      2,
      -0.2,
      0,
      Math.PI * 2
    );

    ctx.fill();

    ctx.restore();
  }

  /* =========================================================
     DRAW PARTICLES
  ========================================================= */

  function drawParticles() {
    particles.forEach(p => {
      ctx.globalAlpha =
        Math.max(
          0,
          p.life
        );

      ctx.fillStyle =
        "#5bd7ff";

      ctx.fillRect(
        p.x,
        p.y,
        p.size,
        p.size
      );
    });

    ctx.globalAlpha = 1;
  }

  /* =========================================================
     PROGRESS BAR
  ========================================================= */

  function drawProgress() {
    const barWidth =
      Math.max(
        0,
        W - 28
      );

    ctx.fillStyle =
      "rgba(255,255,255,.12)";

    ctx.fillRect(
      14,
      14,
      barWidth,
      5
    );

    ctx.fillStyle =
      "#4da3ff";

    ctx.fillRect(
      14,
      14,
      barWidth *
        Math.min(
          1,
          distance / 10000
        ),
      5
    );
  }

  /* =========================================================
     DRAW
  ========================================================= */

  function draw() {
    drawBackground();

    asteroids.forEach(
      drawAsteroid
    );

    drawParticles();

    drawShip();

    drawProgress();
  }

  /* =========================================================
     GAME LOOP
  ========================================================= */

  function loop(timestamp) {
    if (
      !running ||
      paused
    ) {
      return;
    }

    const dt =
      Math.min(
        0.035,
        (timestamp - lastTime) / 1000
      );

    lastTime = timestamp;

    update(dt);

    draw();

    if (running && !paused) {
      raf =
        requestAnimationFrame(
          loop
        );
    }
  }

  /* =========================================================
     INITIALIZE
  ========================================================= */

  resetWorld();

  draw();

})();
