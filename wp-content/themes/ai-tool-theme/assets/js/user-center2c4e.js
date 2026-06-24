(function () {
	"use strict";

	if (typeof document === "undefined") return;

	var config = window.aittUserCenter || {};
	var staticRuntime = config.staticRuntime || {};

	function openLogin() {
		if (window.aittAuthUI && typeof window.aittAuthUI.open === "function") {
			window.aittAuthUI.open("login");
			return;
		}
		var btn = document.querySelector("[data-aitt-open-auth]");
		if (btn) btn.click();
	}

	function showStaticMessage(message) {
		if (!message) return;
		if (window.alert) window.alert(message);
	}

	function setFavoriteButton(btn, active, label) {
		btn.classList.toggle("is-active", !!active);
		if (btn.classList.contains("aitt-fav-btn")) {
			btn.textContent = active ? "★" : "☆";
			return;
		}
		if (btn.classList.contains("aitt-user-center__mini")) {
			btn.textContent = active ? "取消收藏" : "收藏";
			return;
		}
		btn.textContent = label || (active ? "★ 已收藏" : "☆ 收藏");
	}

	document.addEventListener("click", function (event) {
		var btn = event.target.closest("[data-aitt-fav]");
		if (!btn) return;
		event.preventDefault();

		var toolId = parseInt(btn.getAttribute("data-tool-id") || "0", 10);
		if (!toolId) return;

		if (staticRuntime.isStaticExport && !staticRuntime.canUseBackendApi) {
			showStaticMessage(staticRuntime.messages && staticRuntime.messages.favoritesUnavailable ? staticRuntime.messages.favoritesUnavailable : "静态站暂不支持收藏功能。");
			return;
		}

		if (!config.isLoggedIn) {
			openLogin();
			return;
		}

		btn.disabled = true;
		var body = new URLSearchParams();
		body.set("action", "aitt_uc_toggle_favorite");
		body.set("nonce", config.nonce || "");
		body.set("tool_id", String(toolId));

		fetch(config.ajaxUrl, {
			method: "POST",
			credentials: "same-origin",
			headers: {
				"Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
				Accept: "application/json",
			},
			body: body.toString(),
		})
			.then(function (res) {
				return res.json();
			})
			.then(function (data) {
				if (data && data.login_required) {
					openLogin();
					return;
				}
				if (!data || !data.success) return;
				setFavoriteButton(btn, !!data.active, data.label);
			})
			.finally(function () {
				btn.disabled = false;
			});
	});
})();
