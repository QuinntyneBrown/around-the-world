const slides = Array.from(document.querySelectorAll("section"));
function show() {
  const index = Math.min(
    slides.length - 1,
    Math.max(0, Number(location.hash.slice(1) || 1) - 1),
  );
  slides.forEach((slide, i) => {
    slide.classList.toggle("active", i === index);
    slide.querySelector(".progress").style.width =
      ((i + 1) * 100) / slides.length + "%";
  });
}
function fit() {
  document.documentElement.style.setProperty(
    "--scale",
    Math.min(innerWidth / 1920, innerHeight / 1080),
  );
}
window.addEventListener("resize", fit);
window.addEventListener("hashchange", show);
window.addEventListener("keydown", (event) => {
  const n = Number(location.hash.slice(1) || 1);
  if (event.key === "ArrowRight")
    location.hash = Math.min(n + 1, slides.length);
  if (event.key === "ArrowLeft") location.hash = Math.max(n - 1, 1);
});
fit();
show();
