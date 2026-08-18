(() => {
    "use strict";

    /* =========================================
       ELEMENTS
    ========================================= */

    const canvas = document.getElementById("gameCanvas");
    const ctx = canvas.getContext("2d");

    const wrap = document.getElementById("gameWrap");

    const startOverlay = document.getElementById("startOverlay");
    const pauseOverlay = document.getElementById("pauseOverlay");
    const gameOverOverlay = document.getElementById("gameOverOverlay");

    const scoreEl = document.getElementById("score");
    const fuelEl = document.getElementById("fuel");
    const livesEl = document.getElementById("lives");
    const distanceEl = document.getElementById("distance");

    const finalScoreEl = document.getElementById("finalScore");
    const overTitleEl = document.getElementById("overTitle");
    const overTextEl = document.getElementById("overText");

    const startBtn = document.getElementById("startBtn");
    const restartBtn = document.getElementById("restartBtn");
    const pauseBtn = document.getElementById("pauseBtn");
    const mobilePauseBtn = document.getElementById("mobilePauseBtn");
    const resumeBtn = document.getElementById("resumeBtn");

    const upBtn = document.getElementById("upBtn");
    const downBtn = document.getElementById("downBtn");


    /* =========================================
       CANVAS
    ========================================= */

    let W = 900;
    let H = 520;
    let dpr = 1;

    let raf = 0;
    let lastTime = 0;


    /* =========================================
       GAME STATE
    ========================================= */

    let running = false;
    let paused = false;

    let score = 0;
    let lives = 3;
    let fuel = 100;

    let distance = 0;

    const TARGET_DISTANCE = 10000;


    /* =========================================
       PLAYER
    ========================================= */

    let player = {
        x: 150,
        y: 260,
        vy: 0,
        invulnerable: 0
    };


    /* =========================================
       WORLD
    ========================================= */

    let asteroids = [];
    let stars = [];
    let particles = [];

    let keys = {};

    let touching = false;
    let touchY = 0;

    let seed = 12345;


    /* =========================================
       RANDOM
    ========================================= */

    function rnd() {
        seed =
            (seed * 1664525 + 1013904223) %
            4294967296;

        return seed / 4294967296;
    }


    /* =========================================
       RESIZE
    ========================================= */

    function resize() {

        dpr = Math.min(
            window.devicePixelRatio || 1,
            2
        );

        W = Math.max(
            320,
            wrap.clientWidth
        );

        H = Math.max(
            230,
            wrap.clientHeight || Math.min(
                560,
                W * 0.58
            )
        );

        canvas.width = Math.floor(W * dpr);
        canvas.height = Math.floor(H * dpr);

        canvas.style.width = W + "px";
        canvas.style.height = H + "px";

        ctx.setTransform(
            dpr,
            0,
            0,
            dpr,
            0,
            0
        );

        if (!running) {
            player.x = Math.min(
                150,
                W * 0.25
            );

            player.y = H * 0.5;
        }
    }

    window.addEventListener(
        "resize",
        resize
    );

    window.addEventListener(
        "orientationchange",
        () => {
            setTimeout(resize, 150);
        }
    );

    resize();


    /* =========================================
       WORLD GENERATION
    ========================================= */

    function resetWorld() {

        score = 0;
        lives = 3;
        fuel = 100;
        distance = 0;

        seed = 12345;

        player = {
            x: Math.min(150, W * 0.25),
            y: H * 0.5,
            vy: 0,
            invulnerable: 0
        };

        asteroids = [];
        stars = [];
        particles = [];


        /* STARS */

        for (let i = 0; i < 180; i++) {

            stars.push({
                x: rnd() * 14000,
                y: rnd() * H,
                size: 0.5 + rnd() * 2,
                depth: 0.15 + rnd() * 0.75,
                alpha: 0.25 + rnd() * 0.75
            });
        }


        /* ASTEROIDS */

        let x = 650;

        while (x < 14000) {

            createAsteroid(x);

            if (rnd() > 0.55) {
                createAsteroid(
                    x + 100 + rnd() * 140
                );
            }

            x += 240 + rnd() * 260;
        }
    }


    function createAsteroid(x) {

        asteroids.push({

            x: x,

            y:
                55 +
                rnd() *
                Math.max(100, H - 110),

            r:
                18 +
                rnd() * 32,

            rotation:
                rnd() * Math.PI * 2,

            spin:
                (rnd() - 0.5) * 0.025,

            hit: false,

            shape: createAsteroidShape()
        });
    }


    function createAsteroidShape() {

        const points = [];

        const count = 9;

        for (let i = 0; i < count; i++) {

            points.push(
                0.78 + rnd() * 0.24
            );
        }

        return points;
    }


    /* =========================================
       START / PAUSE / RESUME / FINISH
    ========================================= */

    function startGame() {

        resetWorld();

        running = true;
        paused = false;

        startOverlay.classList.add(
            "hidden"
        );

        pauseOverlay.classList.add(
            "hidden"
        );

        gameOverOverlay.classList.add(
            "hidden"
        );

        updateHUD();

        lastTime = performance.now();

        cancelAnimationFrame(raf);

        raf = requestAnimationFrame(
            gameLoop
        );
    }


    function pauseGame() {

        if (!running) {
            return;
        }

        paused = true;

        pauseOverlay.classList.remove(
            "hidden"
        );
    }


    function resumeGame() {

        if (!running) {
            return;
        }

        paused = false;

        pauseOverlay.classList.add(
            "hidden"
        );

        lastTime = performance.now();

        cancelAnimationFrame(raf);

        raf = requestAnimationFrame(
            gameLoop
        );
    }


    function togglePause() {

        if (!running) {
            return;
        }

        if (paused) {
            resumeGame();
        } else {
            pauseGame();
        }
    }


    function finishGame(win) {

        running = false;
        paused = false;

        cancelAnimationFrame(raf);

        gameOverOverlay.classList.remove(
            "hidden"
        );

        if (win) {

            overTitleEl.textContent =
                "MISSION COMPLETE";

            overTextEl.textContent =
                "You escaped the asteroid field and reached deep space.";

        } else {

            overTitleEl.textContent =
                "MISSION FAILED";

            overTextEl.textContent =
                "Your spacecraft could not survive the asteroid field. Try again!";
        }

        finalScoreEl.textContent =
            Math.floor(score).toLocaleString();
    }


    /* =========================================
       BUTTONS
    ========================================= */

    startBtn.addEventListener(
        "click",
        startGame
    );

    restartBtn.addEventListener(
        "click",
        startGame
    );

    pauseBtn.addEventListener(
        "click",
        togglePause
    );

    mobilePauseBtn.addEventListener(
        "click",
        togglePause
    );

    resumeBtn.addEventListener(
        "click",
        resumeGame
    );


    /* =========================================
       KEYBOARD
    ========================================= */

    window.addEventListener(
        "keydown",
        event => {

            const key =
                event.key.toLowerCase();

            keys[key] = true;

            if (
                key === "arrowup" ||
                key === "arrowdown" ||
                key === "w" ||
                key === "s" ||
                key === " "
            ) {
                event.preventDefault();
            }

            if (key === "p") {
                togglePause();
            }
        }
    );


    window.addEventListener(
        "keyup",
        event => {

            keys[
                event.key.toLowerCase()
            ] = false;
        }
    );


    /* =========================================
       MOBILE DRAG CONTROL
    ========================================= */

    function movePlayerTo(y) {

        player.y = Math.max(
            45,
            Math.min(
                H - 55,
                y
            )
        );

        player.vy = 0;
    }


    canvas.addEventListener(
        "pointerdown",
        event => {

            if (!running || paused) {
                return;
            }

            touching = true;

            touchY = event.clientY;

            canvas.setPointerCapture?.(
                event.pointerId
            );
        }
    );


    canvas.addEventListener(
        "pointermove",
        event => {

            if (
                !touching ||
                !running ||
                paused
            ) {
                return;
            }

            const delta =
                event.clientY - touchY;

            movePlayerTo(
                player.y + delta * 1.15
            );

            touchY = event.clientY;
        }
    );


    function stopTouch() {
        touching = false;
    }


    canvas.addEventListener(
        "pointerup",
        stopTouch
    );

    canvas.addEventListener(
        "pointercancel",
        stopTouch
    );

    canvas.addEventListener(
        "pointerleave",
        stopTouch
    );


    /* =========================================
       MOBILE BUTTONS
    ========================================= */

    function holdButton(button, key) {

        if (!button) {
            return;
        }

        button.addEventListener(
            "pointerdown",
            event => {

                event.preventDefault();

                keys[key] = true;
            }
        );

        button.addEventListener(
            "pointerup",
            event => {

                event.preventDefault();

                keys[key] = false;
            }
        );

        button.addEventListener(
            "pointercancel",
            () => {
                keys[key] = false;
            }
        );

        button.addEventListener(
            "pointerleave",
            () => {
                keys[key] = false;
            }
        );
    }


    holdButton(
        upBtn,
        "arrowup"
    );

    holdButton(
        downBtn,
        "arrowdown"
    );


    /* =========================================
       PARTICLES
    ========================================= */

    function createBurst(
        x,
        y,
        amount = 20
    ) {

        for (let i = 0; i < amount; i++) {

            particles.push({

                x: x,

                y: y,

                vx:
                    (rnd() - 0.5) * 5,

                vy:
                    (rnd() - 0.5) * 5,

                life:
                    0.35 +
                    rnd() * 0.65,

                size:
                    2 +
                    rnd() * 4
            });
        }
    }


    /* =========================================
       COLLISION
    ========================================= */

    function hitAsteroid(asteroid) {

        if (
            player.invulnerable > 0 ||
            asteroid.hit
        ) {
            return;
        }

        asteroid.hit = true;

        lives--;

        score = Math.max(
            0,
            score - 200
        );

        player.invulnerable = 1.4;

        player.y = H * 0.5;

        player.vy = 0;

        fuel = Math.max(
            fuel,
            25
        );

        createBurst(
            player.x,
            player.y,
            30
        );

        if (lives <= 0) {
            finishGame(false);
        }
    }


    /* =========================================
       UPDATE
    ========================================= */

    function update(dt) {

        /* PLAYER */

        const up =
            keys["arrowup"] ||
            keys["w"];

        const down =
            keys["arrowdown"] ||
            keys["s"];


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


        player.vy *= Math.pow(
            0.90,
            dt * 60
        );


        player.vy = Math.max(
            -6,
            Math.min(
                6,
                player.vy
            )
        );


        player.y +=
            player.vy *
            dt *
            60;


        /* BOUNDARIES */

        if (player.y < 42) {

            player.y = 42;

            player.vy = 0.5;
        }


        if (player.y > H - 55) {

            player.y = H - 55;

            player.vy = -0.5;
        }


        /* INVULNERABILITY */

        if (player.invulnerable > 0) {

            player.invulnerable -= dt;
        }


        /* FORWARD MOVEMENT */

        const speed = 3.2;

        distance +=
            speed *
            dt *
            60;


        /* FUEL */

        fuel -=
            0.42 * dt;


        if (fuel <= 0) {

            fuel = 0;

            finishGame(false);

            return;
        }


        /* ASTEROIDS */

        asteroids.forEach(
            asteroid => {

                asteroid.x -=
                    speed *
                    dt *
                    60;

                asteroid.rotation +=
                    asteroid.spin *
                    dt *
                    60;


                const dx =
                    asteroid.x -
                    player.x;

                const dy =
                    asteroid.y -
                    player.y;

                const collisionDistance =
                    Math.sqrt(
                        dx * dx +
                        dy * dy
                    );


                if (
                    collisionDistance <
                    asteroid.r + 23
                ) {

                    hitAsteroid(
                        asteroid
                    );
                }
            }
        );


        /* REMOVE OLD ASTEROIDS */

        asteroids =
            asteroids.filter(
                asteroid =>
                    asteroid.x >
                    -120
            );


        /* ADD NEW ASTEROIDS */

        const lastAsteroid =
            asteroids[
                asteroids.length - 1
            ];

        if (
            !lastAsteroid ||
            lastAsteroid.x <
            W + 500
        ) {

            createAsteroid(
                W + 900 +
                rnd() * 500
            );

            if (rnd() > 0.55) {

                createAsteroid(
                    W + 1050 +
                    rnd() * 400
                );
            }
        }


        /* SCORE */

        score +=
            8 * dt;


        /* WIN */

        if (
            distance >=
            TARGET_DISTANCE
        ) {

            score += 2000;

            finishGame(true);

            return;
        }


        /* PARTICLES */

        particles.forEach(
            particle => {

                particle.x +=
                    particle.vx *
                    dt *
                    60;

                particle.y +=
                    particle.vy *
                    dt *
                    60;

                particle.life -= dt;
            }
        );


        particles =
            particles.filter(
                particle =>
                    particle.life > 0
            );


        updateHUD();
    }


    /* =========================================
       HUD
    ========================================= */

    function updateHUD() {

        scoreEl.textContent =
            Math.floor(
                score
            ).toLocaleString();

        fuelEl.textContent =
            Math.ceil(
                Math.max(0, fuel)
            ) + "%";

        livesEl.textContent =
            lives;

        distanceEl.textContent =
            Math.floor(
                Math.min(
                    100,
                    distance /
                    TARGET_DISTANCE *
                    100
                )
            ) + "%";
    }


    /* =========================================
       DRAW BACKGROUND
    ========================================= */

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

        ctx.fillStyle =
            gradient;

        ctx.fillRect(
            0,
            0,
            W,
            H
        );


        /* STARS */

        stars.forEach(
            star => {

                const range =
                    W + 40;

                const x =
                    (
                        star.x -
                        distance *
                        star.depth
                    ) % range;

                const wrappedX =
                    x < 0
                        ? x + range
                        : x;

                ctx.globalAlpha =
                    star.alpha;

                ctx.fillStyle =
                    "#ffffff";

                ctx.beginPath();

                ctx.arc(
                    wrappedX,
                    star.y,
                    star.size,
                    0,
                    Math.PI * 2
                );

                ctx.fill();
            }
        );


        ctx.globalAlpha = 1;


        /* BLUE SPACE GLOW */

        const glow =
            ctx.createRadialGradient(
                W * 0.78,
                H * 0.45,
                10,
                W * 0.78,
                H * 0.45,
                W * 0.65
            );

        glow.addColorStop(
            0,
            "rgba(40,110,255,.12)"
        );

        glow.addColorStop(
            1,
            "rgba(40,110,255,0)"
        );

        ctx.fillStyle =
            glow;

        ctx.fillRect(
            0,
            0,
            W,
            H
        );
    }


    /* =========================================
       DRAW ASTEROID
    ========================================= */

    function drawAsteroid(
        asteroid
    ) {

        ctx.save();

        ctx.translate(
            asteroid.x,
            asteroid.y
        );

        ctx.rotate(
            asteroid.rotation
        );


        /* BODY */

        ctx.beginPath();

        const count =
            asteroid.shape.length;

        for (
            let i = 0;
            i < count;
            i++
        ) {

            const angle =
                (Math.PI * 2 / count) *
                i;

            const radius =
                asteroid.r *
                asteroid.shape[i];

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

        ctx.fillStyle =
            "#111a2a";

        ctx.fill();


        ctx.strokeStyle =
            "rgba(110,155,205,.65)";

        ctx.lineWidth = 2;

        ctx.stroke();


        /* CRATERS */

        ctx.fillStyle =
            "rgba(2,8,18,.72)";

        ctx.beginPath();

        ctx.arc(
            -asteroid.r * 0.25,
            -asteroid.r * 0.2,
            asteroid.r * 0.18,
            0,
            Math.PI * 2
        );

        ctx.fill();


        ctx.beginPath();

        ctx.arc(
            asteroid.r * 0.28,
            asteroid.r * 0.15,
            asteroid.r * 0.12,
            0,
            Math.PI * 2
        );

        ctx.fill();


        ctx.beginPath();

        ctx.arc(
            asteroid.r * 0.02,
            asteroid.r * 0.34,
            asteroid.r * 0.08,
            0,
            Math.PI * 2
        );

        ctx.fill();


        ctx.restore();
    }


    /* =========================================
       DRAW SHIP
    ========================================= */

    function drawShip() {

        if (
            player.invulnerable > 0 &&
            Math.floor(
                player.invulnerable * 12
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


        /* ENGINE FLAME */

        ctx.fillStyle =
            "#ffad26";

        ctx.beginPath();

        ctx.moveTo(-22, 0);
        ctx.lineTo(-49, -9);
        ctx.lineTo(-39, 0);
        ctx.lineTo(-49, 9);

        ctx.closePath();

        ctx.fill();


        ctx.fillStyle =
            "#fff2a6";

        ctx.beginPath();

        ctx.moveTo(-22, 0);
        ctx.lineTo(-40, -4);
        ctx.lineTo(-33, 0);
        ctx.lineTo(-40, 4);

        ctx.closePath();

        ctx.fill();


        /* SHIP */

        ctx.fillStyle =
            "#dceeff";

        ctx.beginPath();

        ctx.moveTo(34, 0);
        ctx.lineTo(-8, -17);
        ctx.lineTo(-27, -11);
        ctx.lineTo(-17, 0);
        ctx.lineTo(-27, 11);
        ctx.lineTo(-8, 17);

        ctx.closePath();

        ctx.fill();


        ctx.strokeStyle =
            "#5ba9ff";

        ctx.lineWidth = 2;

        ctx.stroke();


        /* COCKPIT */

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


        /* COCKPIT SHINE */

        ctx.fillStyle =
            "rgba(255,255,255,.75)";

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


    /* =========================================
       DRAW PARTICLES
    ========================================= */

    function drawParticles() {

        particles.forEach(
            particle => {

                ctx.globalAlpha =
                    Math.max(
                        0,
                        particle.life
                    );

                ctx.fillStyle =
                    "#5bd7ff";

                ctx.fillRect(
                    particle.x,
                    particle.y,
                    particle.size,
                    particle.size
                );
            }
        );

        ctx.globalAlpha = 1;
    }


    /* =========================================
       DRAW PROGRESS
    ========================================= */

    function drawProgress() {

        const barWidth =
            Math.max(
                40,
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
                distance /
                TARGET_DISTANCE
            ),
            5
        );
    }


    /* =========================================
       DRAW
    ========================================= */

    function draw() {

        drawBackground();

        asteroids.forEach(
            drawAsteroid
        );

        drawParticles();

        drawShip();

        drawProgress();
    }


    /* =========================================
       GAME LOOP
    ========================================= */

    function gameLoop(timestamp) {

        if (
            !running ||
            paused
        ) {
            return;
        }


        const dt =
            Math.min(
                0.035,
                (timestamp - lastTime) /
                1000
            );


        lastTime =
            timestamp;


        update(dt);

        draw();


        if (running && !paused) {

            raf =
                requestAnimationFrame(
                    gameLoop
                );
        }
    }


    /* =========================================
       INITIAL SCREEN
    ========================================= */

    resetWorld();

    updateHUD();

    draw();

})();
