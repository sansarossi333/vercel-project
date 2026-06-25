(function () {
  "use strict";

  var skeleton = document.querySelector(".aitt-skeleton-wrap");
  var grid = document.querySelector("[data-aitt-tool-grid]");

  if (skeleton && grid) {
    skeleton.classList.add("is-hidden");
  }

  var heroSearch = document.getElementById("aitt-hero-search");
  var cards = document.querySelectorAll(".aitt-tool-card");

  function filterCards(q) {
    var term = (q || "").trim().toLowerCase();
    cards.forEach(function (card) {
      if (!term) {
        card.classList.remove("is-filtered-out");
        return;
      }
      var name = card.getAttribute("data-name") || "";
      var tags = card.getAttribute("data-tags") || "";
      var text = card.textContent.toLowerCase();
      var hit =
        name.indexOf(term) !== -1 ||
        tags.indexOf(term) !== -1 ||
        text.indexOf(term) !== -1;
      card.classList.toggle("is-filtered-out", !hit);
    });
  }

  if (heroSearch) {
    heroSearch.addEventListener("input", function () {
      filterCards(heroSearch.value);
    });
  }

  document.querySelectorAll("[data-aitt-hot-tag]").forEach(function (el) {
    el.addEventListener("click", function (e) {
      var tag = el.getAttribute("data-aitt-hot-tag") || "";
      if (heroSearch && !el.getAttribute("href")) {
        e.preventDefault();
        heroSearch.value = tag;
        filterCards(tag);
        heroSearch.focus();
      }
    });
  });

  document.querySelectorAll(".aitt-fav-btn").forEach(function (btn) {
    btn.addEventListener("click", function () {
      btn.textContent = btn.textContent === "☆" ? "★" : "☆";
      btn.style.color = btn.textContent === "★" ? "#fde047" : "";
    });
  });
})();

