(() => {
  const canvas = document.getElementById("gameCanvas");
  const ctx = canvas.getContext("2d");
  const wrap = document.getElementById("gameWrap");

  const startOverlay = document.getElementById("startOverlay");
  const pauseOverlay = document.getElementById("pauseOverlay");
  const gameOverOverlay = document.getElementById("gameOverOverlay");

  const scoreEl = document.getElementById("score");
  const livesEl = document.getElementById("lives");
  const energyEl = document.getElementById("energy");

  const finalScoreEl = document.getElementById("finalScore");
  const finalDistanceEl = document.getElementById("finalDistance");

  const startBtn = document.getElementById("startBtn");
  const restartBtn = document.getElementById("restartBtn");
  const pauseBtn = document.getElementById("pauseBtn");
  const resumeBtn = document.getElementById("resumeBtn");

  const upBtn = document.getElementById("upBtn");
  const downBtn = document.getElementById("downBtn");
  const leftBtn = document.getElementById("leftBtn");
  const rightBtn = document.getElementById("rightBtn");

  let W = 900;
  let H = 520;
  let dpr = 1;

  let raf = 0;
  let last = 0;

  let running = false;
  let paused = false;

  let score = 0;
  let lives = 3;
  let energy = 100;
  let distance = 0;

  let difficulty = 1;
  let spawnTimer = 0;
  let energyTimer = 0;

  const keys = {};

  let stars = [];
  let asteroids = [];
  let energyCells = [];
  let particles = [];

  const player = {
    x: 150,
    y: 260,
    vx: 0,
    vy: 0,
    radius: 18,
    invincible: 0
  };

  /* -------------------------
     RANDOM
  ------------------------- */

  let seed = 42;

  function rnd() {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  }

  /* -------------------------
     RESIZE
  ------------------------- */

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);

    W = Math.max(320, wrap.clientWidth || 900);

    H = Math.max(
      230,
      wrap.clientHeight || Math.min(560, W * 0.58)
    );

    canvas.width = Math.floor(W * dpr);
    canvas.height = Math.floor(H * dpr);

    canvas.style.width = W + "px";
    canvas.style.height = H + "px";

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    player.x = Math.min(player.x, W - 45);
    player.y = Math.max(40, Math.min(H - 40, player.y));

    createStars();
  }

  window.addEventListener("resize", resize);

  /* -------------------------
     STARS
  ------------------------- */

  function createStars() {
    stars = [];

    const count = Math.max(55, Math.floor(W * H / 6500));

    for (let i = 0; i < count; i++) {
      stars.push({
        x: rnd() * W,
        y: rnd() * H,
        size: 0.5 + rnd() * 1.8,
        speed: 0.3 + rnd() * 1.4,
        alpha: 0.35 + rnd() * 0.65
      });
    }
  }

  /* -------------------------
     RESET
  ------------------------- */

  function resetGame() {
    score = 0;
    lives = 3;
    energy = 100;
    distance = 0;

    difficulty = 1;
    spawnTimer = 0;
    energyTimer = 0;

    seed = 42;

    asteroids = [];
    energyCells = [];
    particles = [];

    player.x = Math.min(150, W * 0.25);
    player.y = H * 0.5;
    player.vx = 0;
    player.vy = 0;
    player.invincible = 0;

    createStars();

    updateHUD();
  }

  /* -------------------------
     START / PAUSE / END
  ------------------------- */

  function startGame() {
    resetGame();

    running = true;
    paused = false;

    startOverlay.classList.add("hidden");
    pauseOverlay.classList.add("hidden");
    gameOverOverlay.classList.add("hidden");

    last = performance.now();

    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(loop);
  }

  function pauseGame() {
    if (!running) return;

    paused = true;
    pauseOverlay.classList.remove("hidden");
  }

  function resumeGame() {
    if (!running) return;

    paused = false;
    pauseOverlay.classList.add("hidden");

    last = performance.now();
    raf = requestAnimationFrame(loop);
  }

  function gameOver() {
    running = false;
    paused = false;

    finalScoreEl.textContent = Math.floor(score).toLocaleString();
    finalDistanceEl.textContent =
      Math.floor(distance).toLocaleString() + " m";

    gameOverOverlay.classList.remove("hidden");
  }

  /* -------------------------
     BUTTONS
  ------------------------- */

  startBtn?.addEventListener("click", startGame);
  restartBtn?.addEventListener("click", startGame);

  pauseBtn?.addEventListener("click", () => {
    if (paused) {
      resumeGame();
    } else {
      pauseGame();
    }
  });

  resumeBtn?.addEventListener("click", resumeGame);

  /* -------------------------
     KEYBOARD
  ------------------------- */

  window.addEventListener("keydown", e => {
    const key = e.key.toLowerCase();

    keys[key] = true;

    if (
      [
        "arrowup",
        "arrowdown",
        "arrowleft",
        "arrowright",
        " "
      ].includes(key)
    ) {
      e.preventDefault();
    }

    if (key === "p") {
      if (paused) {
        resumeGame();
      } else {
        pauseGame();
      }
    }
  });

  window.addEventListener("keyup", e => {
    keys[e.key.toLowerCase()] = false;
  });

  /* -------------------------
     MOBILE CONTROLS
  ------------------------- */

  function bindControl(button, key) {
    if (!button) return;

    const press = e => {
      e.preventDefault();
      keys[key] = true;
    };

    const release = e => {
      e.preventDefault();
      keys[key] = false;
    };

    button.addEventListener("pointerdown", press);
    button.addEventListener("pointerup", release);
    button.addEventListener("pointercancel", release);
    button.addEventListener("pointerleave", release);
  }

  bindControl(upBtn, "arrowup");
  bindControl(downBtn, "arrowdown");
  bindControl(leftBtn, "arrowleft");
  bindControl(rightBtn, "arrowright");

  /* -------------------------
     TOUCH / DRAG CONTROL
  ------------------------- */

  let touching = false;
  let touchX = 0;
  let touchY = 0;

  canvas.addEventListener("pointerdown", e => {
    touching = true;
    touchX = e.clientX;
    touchY = e.clientY;

    canvas.setPointerCapture?.(e.pointerId);
  });

  canvas.addEventListener("pointermove", e => {
    if (!touching || !running || paused) return;

    const dx = e.clientX - touchX;
    const dy = e.clientY - touchY;

    player.x += dx * 0.9;
    player.y += dy * 0.9;

    player.x = Math.max(35, Math.min(W - 35, player.x));
    player.y = Math.max(40, Math.min(H - 40, player.y));

    touchX = e.clientX;
    touchY = e.clientY;
  });

  canvas.addEventListener("pointerup", () => {
    touching = false;
  });

  canvas.addEventListener("pointercancel", () => {
    touching = false;
  });

  /* -------------------------
     PARTICLES
  ------------------------- */

  function burst(x, y, amount = 12, type = "normal") {
    for (let i = 0; i < amount; i++) {
      particles.push({
        x,
        y,
        vx: (rnd() - 0.5) * 5,
        vy: (rnd() - 0.5) * 5,
        size: 2 + rnd() * 4,
        life: 0.4 + rnd() * 0.7,
        type
      });
    }
  }

  /* -------------------------
     ASTEROIDS
  ------------------------- */

  function spawnAsteroid() {
    const radius = 13 + rnd() * 25;

    asteroids.push({
      x: W + radius + 20,
      y: 35 + rnd() * (H - 70),
      radius,
      speed: 2.4 + rnd() * 1.8 + difficulty * 0.35,
      rotation: rnd() * Math.PI * 2,
      rotationSpeed: (rnd() - 0.5) * 0.04,
      points: 7 + Math.floor(rnd() * 4)
    });
  }

  /* -------------------------
     ENERGY CELLS
  ------------------------- */

  function spawnEnergy() {
    energyCells.push({
      x: W + 30,
      y: 55 + rnd() * (H - 110),
      radius: 11,
      speed: 3.1 + difficulty * 0.25,
      pulse: rnd() * Math.PI * 2
    });
  }

  /* -------------------------
     COLLISION
  ------------------------- */

  function circleCollision(a, b) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;

    const distanceBetween = Math.sqrt(
      dx * dx + dy * dy
    );

    return distanceBetween < a.radius + b.radius;
  }

  function hitAsteroid(index) {
    if (player.invincible > 0) return;

    lives--;

    player.invincible = 1.8;

    burst(
      player.x,
      player.y,
      30,
      "explosion"
    );

    player.x = Math.max(60, player.x - 20);
    player.vx = 0;
    player.vy = 0;

    score = Math.max(0, score - 100);

    asteroids.splice(index, 1);

    if (lives <= 0) {
      gameOver();
    }
  }

  /* -------------------------
     UPDATE
  ------------------------- */

  function update(dt) {
    if (player.invincible > 0) {
      player.invincible -= dt;
    }

    /* Movement */

    let ax = 0;
    let ay = 0;

    if (
      keys["arrowleft"] ||
      keys["a"]
    ) {
      ax -= 0.55;
    }

    if (
      keys["arrowright"] ||
      keys["d"]
    ) {
      ax += 0.55;
    }

    if (
      keys["arrowup"] ||
      keys["w"]
    ) {
      ay -= 0.55;
    }

    if (
      keys["arrowdown"] ||
      keys["s"]
    ) {
      ay += 0.55;
    }

    player.vx += ax * dt * 60;
    player.vy += ay * dt * 60;

    player.vx *= Math.pow(0.88, dt * 60);
    player.vy *= Math.pow(0.88, dt * 60);

    player.vx = Math.max(
      -5,
      Math.min(5, player.vx)
    );

    player.vy = Math.max(
      -5,
      Math.min(5, player.vy)
    );

    player.x += player.vx * dt * 60;
    player.y += player.vy * dt * 60;

    player.x = Math.max(
      35,
      Math.min(W - 35, player.x)
    );

    player.y = Math.max(
      40,
      Math.min(H - 40, player.y)
    );

    /* Space movement */

    const worldSpeed =
      2.8 + difficulty * 0.35;

    distance += worldSpeed * dt * 12;
    score += worldSpeed * dt * 2;

    /* Energy */

    energy -= 0.75 * dt;

    if (energy <= 0) {
      energy = 0;
      gameOver();
      return;
    }

    /* Difficulty */

    difficulty =
      1 + Math.min(
        5,
        distance / 900
      );

    /* Asteroid spawning */

    spawnTimer -= dt;

    if (spawnTimer <= 0) {
      spawnAsteroid();

      const base =
        Math.max(
          0.38,
          1.05 - difficulty * 0.08
        );

      spawnTimer = base;
    }

    /* Energy spawning */

    energyTimer -= dt;

    if (energyTimer <= 0) {
      spawnEnergy();

      energyTimer =
        3.5 + rnd() * 3;

    }

    /* Move asteroids */

    for (let i = asteroids.length - 1; i >= 0; i--) {
      const a = asteroids[i];

      a.x -= a.speed * dt * 60;
      a.rotation += a.rotationSpeed;

      if (circleCollision(player, a)) {
        hitAsteroid(i);
        continue;
      }

      if (a.x < -a.radius - 30) {
        asteroids.splice(i, 1);
        score += 25;
      }
    }

    /* Energy */

    for (
      let i = energyCells.length - 1;
      i >= 0;
      i--
    ) {
      const cell = energyCells[i];

      cell.x -= cell.speed * dt * 60;
      cell.pulse += dt * 5;

      if (circleCollision(player, cell)) {
        energy = Math.min(
          100,
          energy + 25
        );

        score += 150;

        burst(
          cell.x,
          cell.y,
          14,
          "energy"
        );

        energyCells.splice(i, 1);
        continue;
      }

      if (cell.x < -30) {
        energyCells.splice(i, 1);
      }
    }

    /* Stars */

    stars.forEach(star => {
      star.x -=
        star.speed *
        (1 + difficulty * 0.1) *
        dt *
        60;

      if (star.x < -5) {
        star.x = W + 5;
        star.y = rnd() * H;
      }
    });

    /* Particles */

    particles.forEach(p => {
      p.x += p.vx * dt * 60;
      p.y += p.vy * dt * 60;

      p.vx *= 0.98;
      p.vy *= 0.98;

      p.life -= dt;
    });

    particles =
      particles.filter(
        p => p.life > 0
      );

    updateHUD();
  }

  /* -------------------------
     HUD
  ------------------------- */

  function updateHUD() {
    if (scoreEl) {
      scoreEl.textContent =
        Math.floor(score).toLocaleString();
    }

    if (livesEl) {
      livesEl.textContent = lives;
    }

    if (energyEl) {
      energyEl.textContent =
        Math.ceil(energy) + "%";
    }
  }

  /* -------------------------
     DRAW BACKGROUND
  ------------------------- */

  function drawBackground() {
    const gradient =
      ctx.createLinearGradient(
        0,
        0,
        0,
        H
      );

    gradient.addColorStop(
      0,
      "#05091a"
    );

    gradient.addColorStop(
      0.55,
      "#08142b"
    );

    gradient.addColorStop(
      1,
      "#02050d"
    );

    ctx.fillStyle = gradient;
    ctx.fillRect(
      0,
      0,
      W,
      H
    );

    /* distant glow */

    const glow =
      ctx.createRadialGradient(
        W * 0.75,
        H * 0.25,
        10,
        W * 0.75,
        H * 0.25,
        W * 0.6
      );

    glow.addColorStop(
      0,
      "rgba(40,100,255,.16)"
    );

    glow.addColorStop(
      1,
      "rgba(0,0,0,0)"
    );

    ctx.fillStyle = glow;
    ctx.fillRect(
      0,
      0,
      W,
      H
    );

    /* stars */

    stars.forEach(star => {
      ctx.globalAlpha = star.alpha;

      ctx.fillStyle = "#d8ecff";

      ctx.beginPath();

      ctx.arc(
        star.x,
        star.y,
        star.size,
        0,
        Math.PI * 2
      );

      ctx.fill();
    });

    ctx.globalAlpha = 1;
  }

  /* -------------------------
     DRAW ASTEROID
  ------------------------- */

  function drawAsteroid(a) {
    ctx.save();

    ctx.translate(a.x, a.y);
    ctx.rotate(a.rotation);

    ctx.fillStyle = "#536174";

    ctx.beginPath();

    for (
      let i = 0;
      i < a.points;
      i++
    ) {
      const angle =
        (Math.PI * 2 * i) /
        a.points;

      const radius =
        a.radius *
        (0.78 + rnd() * 0.35);

      const x =
        Math.cos(angle) *
        radius;

      const y =
        Math.sin(angle) *
        radius;

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }

    ctx.closePath();
    ctx.fill();

    /* asteroid shadow */

    ctx.fillStyle =
      "rgba(10,15,25,.55)";

    ctx.beginPath();

    ctx.arc(
      -a.radius * 0.2,
      -a.radius * 0.2,
      a.radius * 0.3,
      0,
      Math.PI * 2
    );

    ctx.fill();

    /* crater */

    ctx.fillStyle =
      "rgba(20,28,40,.6)";

    ctx.beginPath();

    ctx.arc(
      a.radius * 0.25,
      a.radius * 0.1,
      a.radius * 0.18,
      0,
      Math.PI * 2
    );

    ctx.fill();

    ctx.restore();
  }

  /* -------------------------
     DRAW ENERGY
  ------------------------- */

  function drawEnergy(cell) {
    const pulse =
      1 +
      Math.sin(cell.pulse) *
      0.12;

    ctx.save();

    ctx.translate(
      cell.x,
      cell.y
    );

    ctx.scale(
      pulse,
      pulse
    );

    ctx.shadowBlur = 20;
    ctx.shadowColor = "#38e8ff";

    ctx.fillStyle = "#38e8ff";

    ctx.beginPath();

    ctx.moveTo(0, -13);
    ctx.lineTo(10, 0);
    ctx.lineTo(0, 13);
    ctx.lineTo(-10, 0);

    ctx.closePath();
    ctx.fill();

    ctx.shadowBlur = 0;

    ctx.fillStyle = "#ffffff";

    ctx.beginPath();

    ctx.arc(
      0,
      0,
      3,
      0,
      Math.PI * 2
    );

    ctx.fill();

    ctx.restore();
  }

  /* -------------------------
     DRAW SHIP
  ------------------------- */

  function drawPlayer() {
    if (
      player.invincible > 0 &&
      Math.floor(
        player.invincible * 10
      ) % 2 === 0
    ) {
      return;
    }

    ctx.save();

    ctx.translate(
      player.x,
      player.y
    );

    /* engine glow */

    ctx.shadowBlur = 18;
    ctx.shadowColor = "#38e8ff";

    ctx.fillStyle = "#38e8ff";

    ctx.beginPath();

    ctx.moveTo(
      -22,
      -6
    );

    ctx.lineTo(
      -42 -
        Math.random() * 7,
      0
    );

    ctx.lineTo(
      -22,
      6
    );

    ctx.closePath();

    ctx.fill();

    ctx.shadowBlur = 0;

    /* ship */

    ctx.fillStyle =
      "#e8f6ff";

    ctx.beginPath();

    ctx.moveTo(
      30,
      0
    );

    ctx.lineTo(
      -12,
      -16
    );

    ctx.lineTo(
      -24,
      -7
    );

    ctx.lineTo(
      -15,
      0
    );

    ctx.lineTo(
      -24,
      7
    );

    ctx.lineTo(
      -12,
      16
    );

    ctx.closePath();

    ctx.fill();

    /* cockpit */

    ctx.fillStyle =
      "#4edcff";

    ctx.beginPath();

    ctx.arc(
      4,
      -2,
      7,
      0,
      Math.PI * 2
    );

    ctx.fill();

    /* wing */

    ctx.fillStyle =
      "#a9d7ff";

    ctx.beginPath();

    ctx.moveTo(
      -4,
      0
    );

    ctx.lineTo(
      -18,
      20
    );

    ctx.lineTo(
      4,
      8
    );

    ctx.closePath();

    ctx.fill();

    ctx.restore();
  }

  /* -------------------------
     DRAW PARTICLES
  ------------------------- */

  function drawParticles() {
    particles.forEach(p => {
      ctx.globalAlpha =
        Math.max(
          0,
          p.life
        );

      ctx.fillStyle =
        p.type === "energy"
          ? "#38e8ff"
          : "#ffd34d";

      ctx.fillRect(
        p.x,
        p.y,
        p.size,
        p.size
      );
    });

    ctx.globalAlpha = 1;
  }

  /* -------------------------
     DRAW
  ------------------------- */

  function draw() {
    ctx.clearRect(
      0,
      0,
      W,
      H
    );

    drawBackground();

    energyCells.forEach(
      drawEnergy
    );

    asteroids.forEach(
      drawAsteroid
    );

    drawPlayer();

    drawParticles();

    /* progress bar */

    const barX = 14;
    const barY = 14;
    const barW = W - 28;

    ctx.fillStyle =
      "rgba(255,255,255,.08)";

    ctx.fillRect(
      barX,
      barY,
      barW,
      4
    );

    const progress =
      Math.min(
        1,
        distance / 5000
      );

    ctx.fillStyle =
      "#38e8ff";

    ctx.fillRect(
      barX,
      barY,
      barW * progress,
      4
    );
  }

  /* -------------------------
     GAME LOOP
  ------------------------- */

  function loop(time) {
    if (!running || paused) {
      return;
    }

    const dt =
      Math.min(
        0.035,
        (time - last) / 1000
      );

    last = time;

    update(dt);
    draw();

    raf =
      requestAnimationFrame(
        loop
      );
  }

  /* -------------------------
     INIT
  ------------------------- */

  resize();
  resetGame();
  draw();

})();
