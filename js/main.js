const GAMES = [

  {
    name: "Sky Rush",
    emoji: "✈️",
    category: "arcade",
    description: "Fly, dodge and survive.",
    url: "games/sky-rush/"
  },

  {
    name: "Helicopter Rescue",
    emoji: "🚁",
    category: "arcade",
    description: "Rescue survivors and dodge obstacles.",
    url: "games/helicopter-rescue/",
    badge: "NEW"
  },

  {
    name: "Traffic Rush",
    emoji: "🚗",
    category: "racing",
    description: "Dodge traffic and survive.",
    url: "games/traffic-rush/"
  },

  {
    name: "Space Escape",
    emoji: "🚀",
    category: "action",
    description: "Escape the asteroid field.",
    url: "games/space-escape/"
  }

];


const grid = document.getElementById("gamesGrid");
const trend = document.getElementById("trending");
const search = document.getElementById("search");


function card(g) {

  return `
    <a class="game-card" href="${g.url}">

      <div class="game-art">

        ${g.emoji}

        ${g.badge ? `<span class="game-badge">${g.badge}</span>` : ""}

      </div>

      <div class="game-info">

        <strong>${g.name}</strong>

        <small>${g.description}</small>

        <small class="play">
          ▶ Play now
        </small>

      </div>

    </a>
  `;
}

function render(list) {

  // Browse Games
  grid.innerHTML = list
    .map(card)
    .join("");

  // Trending Now
  const trendingGames = [
    GAMES.find(g => g.name === "Helicopter Rescue"),
    GAMES.find(g => g.name === "Sky Rush"),
    GAMES.find(g => g.name === "Traffic Rush"),
    GAMES.find(g => g.name === "Space Escape")
  ].filter(Boolean);

  trend.innerHTML = trendingGames
    .map(card)
    .join("");
}


function currentFilter() {

  return document
    .querySelector(".tag.active")
    ?.dataset.filter || "all";

}


function apply() {

  const q = search.value
    .trim()
    .toLowerCase();

  const f = currentFilter();

  const filtered = GAMES.filter(g =>

    (f === "all" || g.category === f) &&

    (
      !q ||
      g.name.toLowerCase().includes(q) ||
      g.category.includes(q) ||
      g.description.toLowerCase().includes(q)
    )

  );

  render(filtered);

}


document
  .querySelectorAll(".tag")
  .forEach(button => {

    button.addEventListener("click", () => {

      document
        .querySelectorAll(".tag")
        .forEach(x =>
          x.classList.remove("active")
        );

      button.classList.add("active");

      search.value = "";

      apply();

    });

  });


search.addEventListener(
  "input",
  apply
);


render(GAMES);
