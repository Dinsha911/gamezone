(() => {
    "use strict";

    const canvas = document.getElementById("gameCanvas");
    const ctx = canvas.getContext("2d");

    const wrap = document.getElementById("gameWrap");

    const startOverlay = document.getElementById("startOverlay");
    const pauseOverlay = document.getElementById("pauseOverlay");
    const gameOverOverlay = document.getElementById("gameOverOverlay");

    const scoreEl = document.getElementById("score");
    const bestEl = document.getElementById("best");
    const speedEl = document.getElementById("speed");
    const livesEl = document.getElementById("lives");

    const finalScoreEl = document.getElementById("finalScore");
    const finalBestEl = document.getElementById("finalBest");

    const startBtn = document.getElementById("startBtn");
    const restartBtn = document.getElementById("restartBtn");
    const pauseBtn = document.getElementById("pauseBtn");
    const resumeBtn = document.getElementById("resumeBtn");

    const leftBtn = document.getElementById("leftBtn");
    const rightBtn = document.getElementById("rightBtn");

    let W = 900;
    let H = 500;
    let dpr = 1;

    let animationFrame = 0;
    let lastTime = 0;

    let running = false;
    let paused = false;

    let score = 0;
    let lives = 3;

    let best = Number(localStorage.getItem("gamezoneTrafficBest") || 0);

    let roadOffset = 0;
    let spawnTimer = 0;
    let difficulty = 1;

    let playerLane = 1;
    let targetLane = 1;

    let swipeStartX = 0;
    let swipeActive = false;

    let traffic = [];
    let particles = [];

    const LANES = 3;

    /*
        The game uses a virtual coordinate system.
        This keeps gameplay consistent on every screen size.
    */
    const BASE_W = 900;
    const BASE_H = 500;

    function resize() {

        const rect = wrap.getBoundingClientRect();

        W = Math.max(300, rect.width);
        H = Math.max(180, rect.height);

        dpr = Math.min(window.devicePixelRatio || 1, 2);

        canvas.width = Math.floor(W * dpr);
        canvas.height = Math.floor(H * dpr);

        canvas.style.width = W + "px";
        canvas.style.height = H + "px";

        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    window.addEventListener("resize", resize);

    resize();

    /*
        Scale all game coordinates according
        to the actual canvas dimensions.
    */

    function scaleX(value) {
        return value * (W / BASE_W);
    }

    function scaleY(value) {
        return value * (H / BASE_H);
    }

    /*
        Road geometry
    */

    function roadWidth() {
        return Math.min(W * 0.72, 650);
    }

    function roadLeft() {
        return (W - roadWidth()) / 2;
    }

    function laneWidth() {
        return roadWidth() / LANES;
    }

    function laneCenter(lane) {
        return roadLeft() + laneWidth() * lane + laneWidth() / 2;
    }

    /*
        Player dimensions
    */

    function playerWidth() {
        return Math.min(laneWidth() * 0.62, 70);
    }

    function playerHeight() {
        return playerWidth() * 1.45;
    }

    function playerY() {
        return H - playerHeight() - Math.max(22, H * 0.07);
    }

    /*
        Enemy car dimensions
    */

    function enemyWidth() {
        return Math.min(laneWidth() * 0.58, 64);
    }

    function enemyHeight() {
        return enemyWidth() * 1.45;
    }

    /*
        Game reset
    */

    function resetGame() {

        score = 0;
        lives = 3;

        roadOffset = 0;
        spawnTimer = 0;

        difficulty = 1;

        playerLane = 1;
        targetLane = 1;

        traffic = [];
        particles = [];

        updateHUD();
    }

    /*
        Start
    */

    function startGame() {

        resetGame();

        running = true;
        paused = false;

        startOverlay.classList.add("hidden");
        pauseOverlay.classList.add("hidden");
        gameOverOverlay.classList.add("hidden");

        lastTime = performance.now();

        cancelAnimationFrame(animationFrame);

        animationFrame = requestAnimationFrame(loop);
    }

    /*
        Pause
    */

    function pauseGame() {

        if (!running) return;

        paused = true;

        pauseOverlay.classList.remove("hidden");
    }

    /*
        Resume
    */

    function resumeGame() {

        if (!running) return;

        paused = false;

        pauseOverlay.classList.add("hidden");

        lastTime = performance.now();

        cancelAnimationFrame(animationFrame);

        animationFrame = requestAnimationFrame(loop);
    }

    /*
        Game over
    */

    function gameOver() {

        running = false;
        paused = false;

        best = Math.max(best, Math.floor(score));

        localStorage.setItem(
            "gamezoneTrafficBest",
            best
        );

        finalScoreEl.textContent =
            Math.floor(score).toLocaleString();

        finalBestEl.textContent =
            best.toLocaleString();

        gameOverOverlay.classList.remove("hidden");

        updateHUD();
    }

    /*
        Change lane
    */

    function moveLeft() {

        if (!running || paused) return;

        targetLane = Math.max(
            0,
            targetLane - 1
        );
    }

    function moveRight() {

        if (!running || paused) return;

        targetLane = Math.min(
            LANES - 1,
            targetLane + 1
        );
    }

    /*
        Keyboard
    */

    window.addEventListener("keydown", event => {

        const key = event.key.toLowerCase();

        if (
            key === "arrowleft" ||
            key === "a"
        ) {
            event.preventDefault();
            moveLeft();
        }

        if (
            key === "arrowright" ||
            key === "d"
        ) {
            event.preventDefault();
            moveRight();
        }

        if (key === "p") {

            if (!running) return;

            if (paused) {
                resumeGame();
            } else {
                pauseGame();
            }
        }

        if (key === " ") {

            if (!running) return;

            event.preventDefault();

            if (paused) {
                resumeGame();
            } else {
                pauseGame();
            }
        }
    });

    /*
        Button controls
    */

    leftBtn.addEventListener(
        "pointerdown",
        event => {
            event.preventDefault();
            moveLeft();
        }
    );

    rightBtn.addEventListener(
        "pointerdown",
        event => {
            event.preventDefault();
            moveRight();
        }
    );

    /*
        Swipe controls
    */

    canvas.addEventListener(
        "pointerdown",
        event => {

            swipeActive = true;

            swipeStartX = event.clientX;

            canvas.setPointerCapture?.(
                event.pointerId
            );
        }
    );

    canvas.addEventListener(
        "pointerup",
        event => {

            if (!swipeActive) return;

            swipeActive = false;

            const dx =
                event.clientX - swipeStartX;

            if (Math.abs(dx) < 25) return;

            if (dx < 0) {
                moveLeft();
            } else {
                moveRight();
            }
        }
    );

    canvas.addEventListener(
        "pointercancel",
        () => {
            swipeActive = false;
        }
    );

    /*
        Button bindings
    */

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
        () => {

            if (!running) return;

            if (paused) {
                resumeGame();
            } else {
                pauseGame();
            }
        }
    );

    resumeBtn.addEventListener(
        "click",
        resumeGame
    );

    /*
        Spawn traffic
    */

    function spawnTraffic() {

        /*
            Try to avoid creating impossible
            situations where every lane is blocked.
        */

        const occupiedNearTop = traffic.some(car =>
            car.y < 130
        );

        let available = [0, 1, 2];

        if (occupiedNearTop) {

            available = available.filter(
                lane =>
                    !traffic.some(
                        car =>
                            car.lane === lane &&
                            car.y < 150
                    )
            );
        }

        if (!available.length) return;

        const lane =
            available[
                Math.floor(
                    Math.random() *
                    available.length
                )
            ];

        const colors = [
            "#e74c3c",
            "#4da3ff",
            "#ffd34d",
            "#9b59b6",
            "#2ecc71",
            "#ff7f50"
        ];

        traffic.push({
            lane,
            y: -enemyHeight() - 30,

            speed:
                (185 + Math.random() * 55)
                * difficulty,

            color:
                colors[
                    Math.floor(
                        Math.random() *
                        colors.length
                    )
                ],

            passed: false
        });
    }

    /*
        Collision helper
    */

    function rectanglesOverlap(
        a,
        b
    ) {

        return (
            a.x < b.x + b.w &&
            a.x + a.w > b.x &&
            a.y < b.y + b.h &&
            a.y + a.h > b.y
        );
    }

    /*
        Player rectangle
    */

    function getPlayerRect() {

        const w = playerWidth();
        const h = playerHeight();

        const center =
            laneCenter(playerLane);

        return {
            x: center - w / 2,
            y: playerY(),
            w,
            h
        };
    }

    /*
        Enemy rectangle
    */

    function getEnemyRect(car) {

        const w = enemyWidth();
        const h = enemyHeight();

        return {
            x:
                laneCenter(car.lane)
                - w / 2,

            y: car.y,

            w,
            h
        };
    }

    /*
        Collision
    */

    function crash(car) {

        car.hit = true;

        lives--;

        createExplosion(
            laneCenter(car.lane),
            playerY() + playerHeight() / 2
        );

        /*
            Give the player a small grace period
            after a crash.
        */

        playerLane = targetLane = 1;

        score = Math.max(
            0,
            score - 100
        );

        if (lives <= 0) {
            gameOver();
        }
    }

    /*
        Explosion particles
    */

    function createExplosion(
        x,
        y
    ) {

        for (
            let i = 0;
            i < 28;
            i++
        ) {

            particles.push({
                x,
                y,

                vx:
                    (Math.random() - .5)
                    * 260,

                vy:
                    (Math.random() - .5)
                    * 260,

                life:
                    .4 +
                    Math.random() * .5,

                size:
                    2 +
                    Math.random() * 5
            });
        }
    }

    /*
        Update game
    */

    function update(dt) {

        /*
            Smooth lane movement
        */

        playerLane +=
            (targetLane - playerLane)
            * Math.min(1, dt * 12);

        /*
            Difficulty increases over time.
        */

        difficulty =
            1 +
            Math.min(
                1.8,
                score / 5000
            );

        /*
            Road movement
        */

        const roadSpeed =
            190 * difficulty;

        roadOffset +=
            roadSpeed * dt;

        /*
            Spawn traffic
        */

        spawnTimer -= dt;

        const spawnInterval =
            Math.max(
                .42,
                .95 / difficulty
            );

        if (spawnTimer <= 0) {

            spawnTraffic();

            spawnTimer =
                spawnInterval *
                (
                    .75 +
                    Math.random() * .45
                );
        }

        /*
            Move traffic
        */

        traffic.forEach(car => {

            car.y +=
                car.speed * dt;

            if (
                !car.passed &&
                car.y >
                playerY() + playerHeight()
            ) {

                car.passed = true;

                score += 25;
            }
        });

        /*
            Collision detection
        */

        const player =
            getPlayerRect();

        traffic.forEach(car => {

            if (car.hit) return;

            const enemy =
                getEnemyRect(car);

            /*
                Slightly smaller collision box
                makes gameplay more forgiving.
            */

            const p = {
                x: player.x + player.w * .18,
                y: player.y + player.h * .12,
                w: player.w * .64,
                h: player.h * .76
            };

            const e = {
                x: enemy.x + enemy.w * .15,
                y: enemy.y + enemy.h * .1,
                w: enemy.w * .7,
                h: enemy.h * .8
            };

            if (
                rectanglesOverlap(p, e)
            ) {
                crash(car);
            }
        });

        /*
            Remove cars that have left
            the visible game area.
        */

        traffic =
            traffic.filter(
                car =>
                    !car.hit &&
                    car.y < H + 150
            );

        /*
            Score slowly increases.
        */

        score +=
            dt *
            8 *
            difficulty;

        /*
            Particles
        */

        particles.forEach(p => {

            p.x += p.vx * dt;
            p.y += p.vy * dt;

            p.vy +=
                280 * dt;

            p.life -= dt;
        });

        particles =
            particles.filter(
                p => p.life > 0
            );

        updateHUD();
    }

    /*
        HUD
    */

    function updateHUD() {

        scoreEl.textContent =
            Math.floor(score)
            .toLocaleString();

        bestEl.textContent =
            Math.max(
                best,
                Math.floor(score)
            ).toLocaleString();

        speedEl.textContent =
            difficulty.toFixed(1) + "x";

        livesEl.textContent =
            Math.max(0, lives);
    }

    /*
        Draw background
    */

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
            "#102d43"
        );

        gradient.addColorStop(
            1,
            "#07111b"
        );

        ctx.fillStyle =
            gradient;

        ctx.fillRect(
            0,
            0,
            W,
            H
        );
    }

    /*
        Draw roadside
    */

    function drawRoadside() {

        const left =
            roadLeft();

        const width =
            roadWidth();

        /*
            Grass
        */

        ctx.fillStyle =
            "#173b2d";

        ctx.fillRect(
            0,
            0,
            W,
            H
        );

        /*
            Road
        */

        ctx.fillStyle =
            "#202832";

        ctx.fillRect(
            left,
            0,
            width,
            H
        );

        /*
            Road edges
        */

        ctx.fillStyle =
            "#d9d9d9";

        ctx.fillRect(
            left,
            0,
            4,
            H
        );

        ctx.fillRect(
            left + width - 4,
            0,
            4,
            H
        );

        /*
            Lane divider markings
        */

        const dashH =
            Math.max(24, H * .1);

        const gap =
            dashH * 1.15;

        const offset =
            roadOffset %
            (dashH + gap);

        ctx.fillStyle =
            "rgba(255,255,255,.65)";

        for (
            let lane = 1;
            lane < LANES;
            lane++
        ) {

            const x =
                left +
                laneWidth() * lane;

            for (
                let y =
                    -dashH +
                    offset;

                y < H;

                y += dashH + gap
            ) {

                ctx.fillRect(
                    x - 2,
                    y,
                    4,
                    dashH
                );
            }
        }

        /*
            Road texture
        */

        ctx.fillStyle =
            "rgba(255,255,255,.035)";

        for (
            let y =
                -(roadOffset * .35) %
                70;

            y < H;

            y += 70
        ) {

            ctx.fillRect(
                left + 8,
                y,
                width - 16,
                1
            );
        }
    }

    /*
        Draw a car
    */

    function drawCar(
        rect,
        color,
        playerCar = false
    ) {

        const x =
            rect.x;

        const y =
            rect.y;

        const w =
            rect.w;

        const h =
            rect.h;

        ctx.save();

        /*
            Shadow
        */

        ctx.fillStyle =
            "rgba(0,0,0,.35)";

        ctx.beginPath();

        ctx.ellipse(
            x + w / 2,
            y + h - 2,
            w * .48,
            h * .08,
            0,
            0,
            Math.PI * 2
        );

        ctx.fill();

        /*
            Body
        */

        ctx.fillStyle =
            color;

        ctx.beginPath();

        const radius =
            Math.min(
                10,
                w * .16
            );

        ctx.roundRect(
            x,
            y,
            w,
            h,
            radius
        );

        ctx.fill();

        /*
            Windshield
        */

        ctx.fillStyle =
            playerCar
                ? "#bdefff"
                : "#172735";

        ctx.beginPath();

        ctx.roundRect(
            x + w * .18,
            y + h * .15,
            w * .64,
            h * .27,
            5
        );

        ctx.fill();

        /*
            Rear / front window
        */

        ctx.fillStyle =
            "rgba(190,235,255,.55)";

        ctx.beginPath();

        ctx.roundRect(
            x + w * .2,
            y + h * .55,
            w * .6,
            h * .17,
            4
        );

        ctx.fill();

        /*
            Headlights
        */

        ctx.fillStyle =
            "#fff4a8";

        ctx.fillRect(
            x + w * .12,
            y + h * .05,
            w * .18,
            h * .07
        );

        ctx.fillRect(
            x + w * .70,
            y + h * .05,
            w * .18,
            h * .07
        );

        /*
            Tail lights
        */

        ctx.fillStyle =
            "#ff4255";

        ctx.fillRect(
            x + w * .12,
            y + h * .88,
            w * .18,
            h * .06
        );

        ctx.fillRect(
            x + w * .70,
            y + h * .88,
            w * .18,
            h * .06
        );

        /*
            Wheels
        */

        ctx.fillStyle =
            "#080b10";

        ctx.fillRect(
            x - 3,
            y + h * .2,
            5,
            h * .2
        );

        ctx.fillRect(
            x - 3,
            y + h * .68,
            5,
            h * .2
        );

        ctx.fillRect(
            x + w - 2,
            y + h * .2,
            5,
            h * .2
        );

        ctx.fillRect(
            x + w - 2,
            y + h * .68,
            5,
            h * .2
        );

        /*
            Player glow
        */

        if (playerCar) {

            ctx.shadowColor =
                "#38e8ff";

            ctx.shadowBlur =
                14;

            ctx.strokeStyle =
                "rgba(56,232,255,.5)";

            ctx.lineWidth = 2;

            ctx.strokeRect(
                x + 2,
                y + 2,
                w - 4,
                h - 4
            );
        }

        ctx.restore();
    }

    /*
        Draw roadside details
    */

    function drawRoadsideDetails() {

        const left =
            roadLeft();

        const width =
            roadWidth();

        const offset =
            roadOffset % 100;

        for (
            let y = -100 + offset;
            y < H + 100;
            y += 100
        ) {

            /*
                Left marker
            */

            ctx.fillStyle =
                "#d8e4d8";

            ctx.fillRect(
                left - 16,
                y,
                7,
                35
            );

            /*
                Right marker
            */

            ctx.fillRect(
                left + width + 9,
                y,
                7,
                35
            );
        }
    }

    /*
        Draw particles
    */

    function drawParticles() {

        particles.forEach(p => {

            ctx.globalAlpha =
                Math.max(
                    0,
                    p.life
                );

            ctx.fillStyle =
                "#ffd54a";

            ctx.fillRect(
                p.x,
                p.y,
                p.size,
                p.size
            );
        });

        ctx.globalAlpha = 1;
    }

    /*
        Draw complete frame
    */

    function draw() {

        ctx.clearRect(
            0,
            0,
            W,
            H
        );

        drawBackground();

        drawRoadside();

        drawRoadsideDetails();

        /*
            Enemy cars
        */

        traffic.forEach(car => {

            drawCar(
                getEnemyRect(car),
                car.color,
                false
            );
        });

        /*
            Player
        */

        drawCar(
            getPlayerRect(),
            "#38e8ff",
            true
        );

        drawParticles();

        /*
            Top subtle vignette
        */

        const vignette =
            ctx.createLinearGradient(
                0,
                0,
                0,
                H
            );

        vignette.addColorStop(
            0,
            "rgba(0,0,0,.18)"
        );

        vignette.addColorStop(
            .45,
            "rgba(0,0,0,0)"
        );

        vignette.addColorStop(
            1,
            "rgba(0,0,0,.25)"
        );

        ctx.fillStyle =
            vignette;

        ctx.fillRect(
            0,
            0,
            W,
            H
        );
    }

    /*
        Main game loop
    */

    function loop(timestamp) {

        if (!running || paused) {
            return;
        }

        const dt =
            Math.min(
                .035,
                Math.max(
                    .001,
                    (timestamp - lastTime) / 1000
                )
            );

        lastTime =
            timestamp;

        update(dt);

        draw();

        animationFrame =
            requestAnimationFrame(
                loop
            );
    }

    /*
        Initial state
    */

    bestEl.textContent =
        best.toLocaleString();

    updateHUD();

    draw();

})();
