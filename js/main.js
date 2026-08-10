const GAMES=[
{name:"Sky Rush",emoji:"✈️",category:"arcade",description:"Fly, dodge and survive.",url:"games/sky-rush/"},
{name:"Traffic Rush",emoji:"🚗",category:"racing",description:"Dodge traffic and survive.",url:"games/traffic-rush/"},
{name:"Space Escape",emoji:"🚀",category:"action",description:"Escape the asteroid field.",url:"games/space-escape/"}
];
const grid=document.getElementById("gamesGrid"),trend=document.getElementById("trending"),search=document.getElementById("search");
function card(g){return `<a class="game-card" href="${g.url}"><div class="game-art">${g.emoji}</div><div class="game-info"><strong>${g.name}</strong><small>${g.description}</small><small class="play">▶ Play now</small></div></a>`}
function render(list){grid.innerHTML=list.map(card).join("");trend.innerHTML=list.slice(0,4).map(card).join("")}
function currentFilter(){return document.querySelector(".tag.active")?.dataset.filter||"all"}
function apply(){const q=search.value.trim().toLowerCase(),f=currentFilter();render(GAMES.filter(g=>(f==="all"||g.category===f)&&(!q||g.name.toLowerCase().includes(q)||g.category.includes(q)||g.description.toLowerCase().includes(q))))}
document.querySelectorAll(".tag").forEach(b=>b.addEventListener("click",()=>{document.querySelectorAll(".tag").forEach(x=>x.classList.remove("active"));b.classList.add("active");search.value="";apply()}));
search.addEventListener("input",apply);render(GAMES);
