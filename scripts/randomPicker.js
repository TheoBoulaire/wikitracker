document.getElementById("choix-aleatoire").addEventListener("click", () => {
    let liens = document.querySelectorAll("#precalculees a");
    liens[Math.floor(Math.random() * liens.length)].click();
});