```javascript
(() => {
  "use strict";

  const canvas = document.getElementById("gameCanvas");
  const ctx = canvas.getContext("2d", { alpha: false });

  const $ = (id) => document.getElementById(id);

  let W = 960;
  let H = 540;
  let dpr = 1;

  let state = "menu";
  let raf = 0;
  let last = 0;

  let score = 0;
  let coins = 0;
  let distance = 0;
  let elapsed = 0;

  let speed = 260;
  let spawn = 0;
  let coinSpawn = 0;

  let best = Number(
    localStorage.getItem("gamezoneSkyRushBest") || 0
  );

  let obstacles = [];
  let items = [];
  let particles = [];
  let clouds = [];

  const keys = new Set();

  /*
   ============================================================
   MOBILE TOUCH CONTROL
   ============================================================
  */

  let touchActive = false;
  let touchStartX = 0;
  let touchStartY = 0;
  let touchCurrentY = 0;

  const player = {
    x: 130,
    y: 270,
    vy: 0,
    rot: 0,
    shield: 0
  };

  /*
   ============================================================
   RESIZE
   ============================================================
  */

  function resize() {
    const rect = canvas.getBoundingClientRect();

    dpr = Math.min(window.devicePixelRatio || 1, 2);

    W = Math.max(320, rect.width);
    H = Math.max(260, rect.height);

    canvas.width = W * dpr;
    canvas.height = H * dpr;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  window.addEventListener("resize", resize);

  resize();

  /*
   ============================================================
   HUD
   ============================================================
  */

  function updateHUD() {
    $("score").textContent = Math.floor(score);
    $("coins").textContent = coins;

    $("shield").textContent =
      player.shield > 0
        ? Math.ceil(player.shield) + "s"
        : "—";

    $("bestScore").textContent = best;
  }

  /*
   ============================================================
   RESET
   ============================================================
  */

  function resetGame() {
    score = 0;
    coins = 0;
    distance = 0;
    elapsed = 0;

    speed = 260;

    spawn = 0.8;
    coinSpawn = 0.6;

    obstacles = [];
    items = [];
    particles = [];
    clouds = [];

    player.x = W * 0.16;
    player.y = H * 0.5;
    player.vy = 0;
    player.rot = 0;
    player.shield = 0;

    touchActive = false;

    for (let i = 0; i < 7; i++) {
      clouds.push({
        x: Math.random() * W,
        y: 40 + Math.random() * H * 0.65,
        s: 0.5 + Math.random() * 1.2,
        a: 0.05 + Math.random() * 0.08
      });
    }

    updateHUD();
  }

  /*
   ============================================================
   START
   ============================================================
  */

  function startGame() {
    resetGame();

    state = "play";

    $("startScreen").classList.add("hidden");
    $("gameOverScreen").classList.add("hidden");
    $("pauseScreen").classList.add("hidden");

    last = performance.now();

    raf = requestAnimationFrame(gameLoop);
  }

  /*
   ============================================================
   GAME OVER
   ============================================================
  */

  function gameOver() {
    state = "over";

    const finalScore = Math.floor(score);
    const oldBest = best;

    if (finalScore > best) {
      best = finalScore;

      localStorage.setItem(
        "gamezoneSkyRushBest",
        best
      );
    }

    $("finalScore").textContent = finalScore;
    $("finalCoins").textContent = coins;
    $("finalDistance").textContent =
      Math.floor(distance) + "m";
    $("finalBest").textContent = best;

    $("newBest").classList.toggle(
      "hidden",
      finalScore <= oldBest
    );

    $("gameOverScreen").classList.remove("hidden");

    createBurst(
      player.x,
      player.y,
      22,
      "#ffb34a"
    );

    updateHUD();
  }

  /*
   ============================================================
   PAUSE
   ============================================================
  */

  function pauseGame() {
    if (state === "play") {
      state = "paused";

      $("pauseScreen").classList.remove("hidden");
    }
  }

  function resumeGame() {
    if (state === "paused") {
      state = "play";

      $("pauseScreen").classList.add("hidden");

      last = performance.now();

      raf = requestAnimationFrame(gameLoop);
    }
  }

  /*
   ============================================================
   SPAWN OBSTACLE
   ============================================================
  */

  function addGate() {
    const gap = Math.max(
      135,
      195 - elapsed * 2.2
    );

    const centerY =
      90 + Math.random() * (H - 180);

    const width =
      44 + Math.random() * 26;

    obstacles.push({
      x: W + 30,
      w: width,

      top: Math.max(
        28,
        centerY - gap / 2
      ),

      bottom: Math.min(
        H - 28,
        centerY + gap / 2
      ),

      passed: false
    });
  }

  /*
   ============================================================
   SPAWN ITEM
   ============================================================
  */

  function addItem() {
    items.push({
      x: W + 20,
      y: 65 + Math.random() * (H - 130),
      r: 9,
      spin: Math.random() * 6.28,
      shield: Math.random() < 0.09
    });
  }

  /*
   ============================================================
   PARTICLES
   ============================================================
  */

  function createBurst(x, y, amount, color) {
    for (let i = 0; i < amount; i++) {
      particles.push({
        x,
        y,

        vx:
          (Math.random() - 0.5) *
          250,

        vy:
          (Math.random() - 0.5) *
          250,

        life:
          0.35 +
          Math.random() * 0.5,

        color
      });
    }
  }

  /*
   ============================================================
   PLAYER CONTROL
   ============================================================
  */

  function getVerticalInput() {

    /*
      Desktop controls
    */

    if (
      keys.has("ArrowUp") ||
      keys.has("w") ||
      keys.has("W")
    ) {
      return -1;
    }

    if (
      keys.has("ArrowDown") ||
      keys.has("s") ||
      keys.has("S")
    ) {
      return 1;
    }

    /*
      Mobile touch control
    */

    if (touchActive) {

      const deltaY =
        touchCurrentY - touchStartY;

      /*
        Small finger movement:
        keep aircraft stable.
      */

      if (Math.abs(deltaY) < 8) {
        return 0;
      }

      /*
        Finger moved UP
        => aircraft goes UP
      */

      if (deltaY < 0) {
        return -1;
      }

      /*
        Finger moved DOWN
        => aircraft goes DOWN
      */

      if (deltaY > 0) {
        return 1;
      }
    }

    return 0;
  }

  /*
   ============================================================
   UPDATE GAME
   ============================================================
  */

  function update(dt) {

    elapsed += dt;

    speed =
      260 +
      Math.min(
        240,
        elapsed * 7
      );

    score +=
      dt *
      (14 + elapsed * 0.6);

    distance +=
      dt *
      speed /
      9;

    spawn -= dt;
    coinSpawn -= dt;

    if (spawn <= 0) {

      addGate();

      spawn =
        Math.max(
          0.7,
          1.35 - elapsed * 0.012
        ) *
        (
          0.85 +
          Math.random() * 0.3
        );
    }

    if (coinSpawn <= 0) {

      addItem();

      coinSpawn =
        0.5 +
        Math.random() * 0.8;
    }

    /*
      PLAYER PHYSICS
    */

    const input =
      getVerticalInput();

    if (input < 0) {

      player.vy +=
        -760 * dt;

    } else if (input > 0) {

      player.vy +=
        620 * dt;

    } else {

      /*
        Natural gravity
      */

      player.vy +=
        180 * dt;
    }

    player.vy *=
      Math.pow(0.09, dt);

    player.y +=
      player.vy * dt;

    /*
      Keep aircraft inside screen
    */

    player.y =
      Math.max(
        24,
        Math.min(
          H - 24,
          player.y
        )
      );

    player.rot =
      Math.max(
        -0.42,
        Math.min(
          0.42,
          player.vy / 650
        )
      );

    /*
      MOVE OBSTACLES
    */

    obstacles.forEach((obstacle) => {

      obstacle.x -=
        speed * dt;
    });

    /*
      MOVE ITEMS
    */

    items.forEach((item) => {

      item.x -=
        speed * dt;

      item.spin +=
        dt * 6;
    });

    obstacles =
      obstacles.filter(
        (o) => o.x > -70
      );

    items =
      items.filter(
        (i) => i.x > -50
      );

    /*
      OBSTACLE COLLISION
    */

    for (const obstacle of obstacles) {

      if (
        !obstacle.passed &&
        obstacle.x + obstacle.w <
        player.x
      ) {

        obstacle.passed = true;

        score += 35;
      }

      const topHit =
        checkCollision(
          player.x - 20,
          player.y - 11,
          40,
          22,

          obstacle.x,
          0,
          obstacle.w,
          obstacle.top
        );

      const bottomHit =
        checkCollision(
          player.x - 20,
          player.y - 11,
          40,
          22,

          obstacle.x,
          obstacle.bottom,
          obstacle.w,
          H - obstacle.bottom
        );

      if (
        topHit ||
        bottomHit
      ) {

        if (player.shield > 0) {

          player.shield = 0;

          obstacle.x = -200;

          createBurst(
            player.x,
            player.y,
            15,
            "#6de1ff"
          );

        } else {

          gameOver();

          return;
        }
      }
    }

    /*
      ITEM COLLECTION
    */

    for (
      let i = items.length - 1;
      i >= 0;
      i--
    ) {

      const item = items[i];

      const distanceToItem =
        Math.hypot(
          player.x - item.x,
          player.y - item.y
        );

      if (
        distanceToItem < 26
      ) {

        if (item.shield) {

          player.shield = 8;

          score += 80;

          createBurst(
            item.x,
            item.y,
            12,
            "#6de1ff"
          );

        } else {

          coins++;

          score += 60;

          createBurst(
            item.x,
            item.y,
            8,
            "#ffd34d"
          );
        }

        items.splice(i, 1);
      }
    }

    if (player.shield > 0) {
      player.shield -= dt;
    }

    /*
      PARTICLES
    */

    particles.forEach((particle) => {

      particle.x +=
        particle.vx * dt;

      particle.y +=
        particle.vy * dt;

      particle.vy +=
        160 * dt;

      particle.life -= dt;
    });

    particles =
      particles.filter(
        (particle) =>
          particle.life > 0
      );

    updateHUD();
  }

  /*
   ============================================================
   COLLISION
   ============================================================
  */

  function checkCollision(
    ax,
    ay,
    aw,
    ah,
    bx,
    by,
    bw,
    bh
  ) {

    return (
      ax < bx + bw &&
      ax + aw > bx &&
      ay < by + bh &&
      ay + ah > by
    );
  }

  /*
   ============================================================
   DRAW
   ============================================================
  */

  function draw() {

    /*
      Sky
    */

    const sky =
      ctx.createLinearGradient(
        0,
        0,
        0,
        H
      );

    sky.addColorStop(
      0,
      "#092846"
    );

    sky.addColorStop(
      0.55,
      "#147d9f"
    );

    sky.addColorStop(
      1,
      "#092e48"
    );

    ctx.fillStyle = sky;

    ctx.fillRect(
      0,
      0,
      W,
      H
    );

    /*
      Sun glow
    */

    const sun =
      ctx.createRadialGradient(
        W * 0.78,
        H * 0.2,
        3,
        W * 0.78,
        H * 0.2,
        90
      );

    sun.addColorStop(
      0,
      "rgba(255,244,180,.5)"
    );

    sun.addColorStop(
      1,
      "rgba(255,244,180,0)"
    );

    ctx.fillStyle = sun;

    ctx.fillRect(
      0,
      0,
      W,
      H
    );

    /*
      Clouds
    */

    clouds.forEach((cloud) => {

      cloud.x -=
        speed *
        0.012 *
        cloud.s;

      if (cloud.x < -180) {
        cloud.x =
          W + 100;
      }

      ctx.fillStyle =
        `rgba(255,255,255,${cloud.a})`;

      drawCloud(
        cloud.x,
        cloud.y,
        80 * cloud.s
      );
    });

    /*
      Mountains
    */

    ctx.fillStyle =
      "rgba(8,52,67,.45)";

    ctx.beginPath();

    ctx.moveTo(
      0,
      H
    );

    ctx.lineTo(
      0,
      H * 0.82
    );

    for (
      let z = 0;
      z <= W;
      z += 90
    ) {

      ctx.lineTo(
        z,
        H * 0.72 -
        Math.sin(z * 0.012) *
        35
      );
    }

    ctx.lineTo(
      W,
      H
    );

    ctx.fill();

    /*
      Gates
    */

    obstacles.forEach(
      (obstacle) => {

        drawGate(
          obstacle.x,
          0,
          obstacle.w,
          obstacle.top
        );

        drawGate(
          obstacle.x,
          obstacle.bottom,
          obstacle.w,
          H -
          obstacle.bottom
        );
      }
    );

    /*
      Collectibles
    */

    items.forEach((item) => {

      ctx.save();

      ctx.translate(
        item.x,
        item.y
      );

      ctx.rotate(
        item.spin
      );

      if (item.shield) {

        ctx.strokeStyle =
          "#78e4ff";

        ctx.lineWidth = 4;

        ctx.beginPath();

        ctx.arc(
          0,
          0,
          13,
          0,
          Math.PI * 2
        );

        ctx.stroke();

        ctx.fillStyle =
          "#bff5ff";

        ctx.font =
          "bold 12px system-ui";

        ctx.textAlign =
          "center";

        ctx.textBaseline =
          "middle";

        ctx.fillText(
          "S",
          0,
          1
        );

      } else {

        ctx.fillStyle =
          "#ffd34d";

        ctx.beginPath();

        ctx.arc(
          0,
          0,
          9,
          0,
          Math.PI * 2
        );

        ctx.fill();

        ctx.strokeStyle =
          "#fff0a1";

        ctx.stroke();

        ctx.fillStyle =
          "#98650c";

        ctx.font =
          "bold 9px system-ui";

        ctx.textAlign =
          "center";

        ctx.textBaseline =
          "middle";

        ctx.fillText(
          "G",
          0,
          1
        );
      }

      ctx.restore();
    });

    /*
      Aircraft
    */

    drawPlane();

    /*
      Particles
    */

    particles.forEach(
      (particle) => {

        ctx.globalAlpha =
          Math.max(
            0,
            particle.life
          );

        ctx.fillStyle =
          particle.color;

        ctx.beginPath();

        ctx.arc(
          particle.x,
          particle.y,
          2.5,
          0,
          Math.PI * 2
        );

        ctx.fill();

        ctx.globalAlpha = 1;
      }
    );
  }

  /*
   ============================================================
   CLOUD
   ============================================================
  */

  function drawCloud(
    x,
    y,
    size
  ) {

    ctx.beginPath();

    ctx.arc(
      x,
      y,
      size * 0.32,
      0,
      Math.PI * 2
    );

    ctx.arc(
      x + size * 0.25,
      y - size * 0.16,
      size * 0.4,
      0,
      Math.PI * 2
    );

    ctx.arc(
      x + size * 0.57,
      y,
      size * 0.3,
      0,
      Math.PI * 2
    );

    ctx.fill();
  }

  /*
   ============================================================
   GATE
   ============================================================
  */

  function drawGate(
    x,
    y,
    width,
    height
  ) {

    if (height <= 0) {
      return;
    }

    const gradient =
      ctx.createLinearGradient(
        x,
        0,
        x + width,
        0
      );

    gradient.addColorStop(
      0,
      "#142235"
    );

    gradient.addColorStop(
      0.5,
      "#294461"
    );

    gradient.addColorStop(
      1,
      "#0d1827"
    );

    ctx.fillStyle =
      gradient;

    ctx.fillRect(
      x,
      y,
      width,
      height
    );

    ctx.fillStyle =
      "#63c6ff";

    ctx.fillRect(
      x - 4,
      y + height - 5,
      width + 8,
      5
    );

    ctx.fillStyle =
      "rgba(100,205,255,.12)";

    ctx.fillRect(
      x + 7,
      y,
      4,
      height
    );
  }

  /*
   ============================================================
   AIRCRAFT
   ============================================================
  */

  function drawPlane() {

    ctx.save();

    ctx.translate(
      player.x,
      player.y
    );

    ctx.rotate(
      player.rot
    );

    /*
      Shield
    */

    if (player.shield > 0) {

      ctx.strokeStyle =
        "rgba(95,220,255,.75)";

      ctx.lineWidth = 4;

      ctx.beginPath();

      ctx.arc(
        0,
        0,
        35 +
        Math.sin(elapsed * 8) * 3,
        0,
        Math.PI * 2
      );

      ctx.stroke();
    }

    /*
      Exhaust
    */

    ctx.fillStyle =
      "#ffb43b";

    ctx.beginPath();

    ctx.moveTo(
      -27,
      0
    );

    ctx.lineTo(
      -45,
      -6 -
      Math.random() * 5
    );

    ctx.lineTo(
      -31,
      5
    );

    ctx.closePath();

    ctx.fill();

    /*
      Main body
    */

    ctx.fillStyle =
      "#e9f3ff";

    ctx.beginPath();

    ctx.moveTo(
      29,
      0
    );

    ctx.lineTo(
      3,
      -12
    );

    ctx.lineTo(
      -20,
      -9
    );

    ctx.lineTo(
      -10,
      0
    );

    ctx.lineTo(
      -20,
      9
    );

    ctx.lineTo(
      3,
      12
    );

    ctx.closePath();

    ctx.fill();

    /*
      Top wing
    */

    ctx.fillStyle =
      "#55b9ff";

    ctx.beginPath();

    ctx.moveTo(
      5,
      0
    );

    ctx.lineTo(
      -5,
      -19
    );

    ctx.lineTo(
      -12,
      -18
    );

    ctx.lineTo(
      -8,
      -2
    );

    ctx.closePath();

    ctx.fill();

    /*
      Cockpit
    */

    ctx.fillStyle =
      "#234a73";

    ctx.beginPath();

    ctx.ellipse(
      9,
      -2,
      7,
      4,
      0,
      0,
      Math.PI * 2
    );

    ctx.fill();

    ctx.restore();
  }

  /*
   ============================================================
   GAME LOOP
   ============================================================
  */

  function gameLoop(timestamp) {

    if (state !== "play") {
      return;
    }

    const dt =
      Math.min(
        0.035,
        (timestamp - last) / 1000
      );

    last = timestamp;

    update(dt);

    draw();

    if (state === "play") {

      raf =
        requestAnimationFrame(
          gameLoop
        );
    }
  }

  /*
   ============================================================
   BUTTON EVENTS
   ============================================================
  */

  $("startBtn").onclick =
    startGame;

  $("restartBtn").onclick =
    startGame;

  $("pauseBtn").onclick =
    pauseGame;

  $("resumeBtn").onclick =
    resumeGame;

  /*
   ============================================================
   KEYBOARD
   ============================================================
  */

  window.addEventListener(
    "keydown",
    (event) => {

      keys.add(event.key);

      if (
        [
          "ArrowUp",
          "ArrowDown",
          " "
        ].includes(event.key)
      ) {

        event.preventDefault();
      }

      if (
        event.key === "Escape" &&
        state === "play"
      ) {

        pauseGame();

      } else if (
        event.key === "Escape" &&
        state === "paused"
      ) {

        resumeGame();
      }
    }
  );

  window.addEventListener(
    "keyup",
    (event) => {

      keys.delete(event.key);
    }
  );

  /*
   ============================================================
   MOBILE TOUCH / SWIPE CONTROL
   ============================================================
  */

  canvas.addEventListener(
    "pointerdown",
    (event) => {

      /*
        Only handle touch/pen here.
        Mouse continues to work normally.
      */

      if (
        event.pointerType === "mouse"
      ) {
        return;
      }

      event.preventDefault();

      touchActive = true;

      touchStartX =
        event.clientX;

      touchStartY =
        event.clientY;

      touchCurrentY =
        event.clientY;

      try {
        canvas.setPointerCapture(
          event.pointerId
        );
      } catch (error) {}
    },
    {
      passive: false
    }
  );

  canvas.addEventListener(
    "pointermove",
    (event) => {

      if (!touchActive) {
        return;
      }

      event.preventDefault();

      touchCurrentY =
        event.clientY;
    },
    {
      passive: false
    }
  );

  canvas.addEventListener(
    "pointerup",
    (event) => {

      if (!touchActive) {
        return;
      }

      event.preventDefault();

      touchActive = false;

      try {
        canvas.releasePointerCapture(
          event.pointerId
        );
      } catch (error) {}
    },
    {
      passive: false
    }
  );

  canvas.addEventListener(
    "pointercancel",
    () => {

      touchActive = false;
    }
  );

  /*
   ============================================================
   PREVENT MOBILE PAGE SCROLLING WHILE PLAYING
   ============================================================
  */

  canvas.addEventListener(
    "touchstart",
    (event) => {

      event.preventDefault();

    },
    {
      passive: false
    }
  );

  canvas.addEventListener(
    "touchmove",
    (event) => {

      event.preventDefault();

    },
    {
      passive: false
    }
  );

  canvas.addEventListener(
    "touchend",
    (event) => {

      event.preventDefault();

    },
    {
      passive: false
    }
  );

  /*
   ============================================================
   INITIALIZE
   ============================================================
  */

  resetGame();

  draw();

})();
```
