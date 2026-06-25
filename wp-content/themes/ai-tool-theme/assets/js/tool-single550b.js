(function () {
  "use strict";

  /* 进入视口淡入（替代 Framer Motion，轻量） */
  var reveals = document.querySelectorAll(".aitt-reveal");
  if (reveals.length && "IntersectionObserver" in window) {
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) {
            e.target.classList.add("is-visible");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.08, rootMargin: "0px 0px -40px 0px" }
    );
    reveals.forEach(function (el) {
      io.observe(el);
    });
  } else {
    reveals.forEach(function (el) {
      el.classList.add("is-visible");
    });
  }

  /* 截图轮播 */
  var gallery = document.querySelector("[data-aitt-gallery]");
  if (gallery) {
    var main = gallery.querySelector("[data-gallery-main]");
    var phone = gallery.querySelector("[data-gallery-phone]");
    var dots = gallery.querySelectorAll("[data-gallery-dot]");
    var slides = [];
    try {
      slides = JSON.parse(gallery.getAttribute("data-slides") || "[]");
    } catch (e) {
      slides = [];
    }
    var idx = 0;
    function show(i) {
      if (!slides.length) return;
      idx = (i + slides.length) % slides.length;
      if (main) main.src = slides[idx];
      if (phone && slides[idx + 1]) phone.src = slides[Math.min(idx + 1, slides.length - 1)];
      dots.forEach(function (d, n) {
        d.classList.toggle("is-active", n === idx);
      });
    }
    dots.forEach(function (dot, n) {
      dot.addEventListener("click", function () {
        show(n);
      });
    });
    var timer = setInterval(function () {
      show(idx + 1);
    }, 5000);
    gallery.addEventListener("mouseenter", function () {
      clearInterval(timer);
    });
    gallery.addEventListener("mouseleave", function () {
      timer = setInterval(function () {
        show(idx + 1);
      }, 5000);
    });
  }

  /* 横向推荐滑动 */
  document.querySelectorAll(".aitt-rail-section").forEach(function (section) {
    var rail = section.querySelector(".aitt-rail");
    if (!rail) return;
    var prev = section.querySelector("[data-rail-prev]");
    var next = section.querySelector("[data-rail-next]");
    var step = 220;
    if (prev) {
      prev.addEventListener("click", function () {
        rail.scrollBy({ left: -step, behavior: "smooth" });
      });
    }
    if (next) {
      next.addEventListener("click", function () {
        rail.scrollBy({ left: step, behavior: "smooth" });
      });
    }
  });

  /* 收藏由全站 user-center.js 接管 */

  /* 分享 */
  document.querySelectorAll("[data-aitt-share]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var url = btn.getAttribute("data-share-url") || window.location.href;
      var title = btn.getAttribute("data-share-title") || document.title;
      if (navigator.share) {
        navigator.share({ title: title, url: url }).catch(function () {});
        return;
      }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(function () {
          btn.textContent = "✓ 已复制";
          setTimeout(function () {
            btn.textContent = "分享";
          }, 2000);
        });
      }
    });
  });
})();


