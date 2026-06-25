/**
 * AiNavBox Auth — 登录 / 注册异步提交
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ 上线部署：修改下方 AITT_AUTH_RUNTIME（仅改这一处即可切换环境）              │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │ apiBaseUrl: 留空 "" → 自动使用 WordPress 注入的 siteUrl（推荐）           │
 * │             本地示例: "http://localhost/wordpress"                      │
 * │             线上示例: "https://www.ainavbox.com"                        │
 * │ transport:  "ajax"  → 仅 admin-ajax（同域主题推荐，无 CORS）             │
 * │             "rest"  → 仅 REST API（前后端分离 / Headless 时用）          │
 * │             "auto"  → 先 ajax，失败再尝试 rest                          │
 * └─────────────────────────────────────────────────────────────────────────┘
 */
const AITT_AUTH_RUNTIME = {
	apiBaseUrl: "",
	transport: "ajax",
	debug: true,
};

(function () {
	"use strict";

	if (typeof document === "undefined") return;

	var wpConfig = window.aittAuth || {};
	var staticRuntime = wpConfig.staticRuntime || {};
	var overlay = document.getElementById("aitt-auth-overlay");
	if (!overlay) return;

	var backdrop = overlay.querySelector("[data-aitt-close-auth].aitt-auth-overlay__backdrop");
	var closeButtons = overlay.querySelectorAll("[data-aitt-close-auth]");
	var loginPanel = overlay.querySelector('[data-aitt-auth-panel="login"]');
	var registerPanel = overlay.querySelector('[data-aitt-auth-panel="register"]');
	var loginForm = overlay.querySelector("[data-aitt-login-form]");
	var registerForm = overlay.querySelector("[data-aitt-register-form]");
	var switchLogin = overlay.querySelector("[data-aitt-switch-login]");
	var switchRegister = overlay.querySelector("[data-aitt-switch-register]");
	var socialBtn = overlay.querySelector("[data-aitt-social-login]");
	var showRegisterBtn = overlay.querySelector("[data-aitt-show-register]");
	var showLoginBtn = overlay.querySelector("[data-aitt-show-login]");
	var lastFocused = null;

	/* ── API 端点（由 Base URL 动态拼接，禁止写死 localhost） ── */
	var API = {
		baseUrl: resolveBaseUrl(),
		ajaxPath: "/wp-admin/admin-ajax.php",
		restPath: "/wp-json/nav-auth/v1",
		actions: {
			login: wpConfig.ajaxActionLogin || "aitt_auth_login",
			register: wpConfig.ajaxActionRegister || "aitt_auth_register",
		},
		nonce: {
			ajax: wpConfig.ajaxNonce || "",
			rest: wpConfig.restNonce || wpConfig.nonce || "",
		},
	};

	function resolveBaseUrl() {
		var manual = (AITT_AUTH_RUNTIME.apiBaseUrl || "").trim().replace(/\/+$/, "");
		if (manual) return manual;
		var injected = (wpConfig.siteUrl || wpConfig.apiBaseUrl || "").trim().replace(/\/+$/, "");
		if (injected) return injected;
		return window.location.origin + getWpSubdirFromPath();
	}

	function getWpSubdirFromPath() {
		var path = window.location.pathname || "/";
		var markers = ["/wp-admin", "/wp-json", "/wp-content"];
		var cut = path.length;
		markers.forEach(function (m) {
			var i = path.indexOf(m);
			if (i > 0 && i < cut) cut = i;
		});
		var base = path.slice(0, cut).replace(/\/+$/, "");
		return base || "";
	}

	function ajaxEndpoint() {
		return API.baseUrl + API.ajaxPath;
	}

	function restEndpoint(suffix) {
		return API.baseUrl + API.restPath + suffix;
	}

	function logAuthDebug(label, payload) {
		if (!AITT_AUTH_RUNTIME.debug) return;
		console.info("[AiNavBox Auth]", label, payload);
	}

	function logAuthError(context, err, meta) {
		var detail = {
			context: context,
			baseUrl: API.baseUrl,
			transport: meta && meta.transport,
			status: meta && meta.status,
			statusText: meta && meta.statusText,
			url: meta && meta.url,
			responsePreview: meta && meta.responsePreview,
			parsed: meta && meta.parsed,
			errorName: err && err.name,
			errorMessage: err && err.message,
		};
		console.error("[AiNavBox Auth] 请求失败", detail);
		if (err && err.stack) console.error(err.stack);
	}

	function logRawBackendResponse(res, text) {
		console.log("后端原始返回：", text);
		if (AITT_AUTH_RUNTIME.debug && res) {
			console.log("[AiNavBox Auth] HTTP", res.status, res.statusText, res.url);
		}
	}

	function userFacingMessage(data, meta) {
		var httpStatus = (meta && meta.status) || (data && (data.httpStatus || data.status)) || 0;
		if (httpStatus === 409) {
			return "该用户名或邮箱已被注册，请尝试直接登录或更换邮箱！";
		}
		if (data && data.message) return data.message;
		if (meta && meta.status === 403) {
			return "安全校验失败（403）：请刷新页面后重试。若前后端域名不一致，请检查 CORS 与 Nonce。";
		}
		if (meta && meta.status === 404) {
			return "接口未找到（404）：请检查固定链接设置，或确认 apiBaseUrl 是否正确。";
		}
		if (meta && meta.status === 0) {
			return "网络被拦截（可能为 CORS 跨域）：请确认前端与 WordPress 使用同一域名，或配置 apiBaseUrl。";
		}
		return "请求失败，请打开 F12 控制台查看 [AiNavBox Auth] 详细日志。";
	}

	function parseResponseBody(res, rawText) {
		var text = rawText || "";
		logRawBackendResponse(res, text);
		if (!text) {
			return { success: false, message: "服务器返回空响应（HTTP " + res.status + "）", httpStatus: res.status };
		}
		try {
			var parsed = JSON.parse(text);
			if (parsed && typeof parsed.httpStatus === "undefined" && res.status) {
				parsed.httpStatus = res.status;
			}
			return parsed;
		} catch (parseErr) {
			logAuthError("json-parse", parseErr, {
				status: res.status,
				statusText: res.statusText,
				responsePreview: text,
			});
			return {
				success: false,
				message: "服务器返回非 JSON（HTTP " + res.status + "），可能为 PHP 错误或路由未对齐。",
				httpStatus: res.status,
				_raw: text,
			};
		}
	}

	function normalizeRegisterFields(raw) {
		return {
			email: String(raw.email || "")
				.trim()
				.toLowerCase(),
			username: String(raw.username || "").trim(),
			password: String(raw.password || ""),
		};
	}

	function normalizeLoginFields(raw) {
		return {
			login: String(raw.login || "").trim(),
			password: String(raw.password || ""),
			remember: raw.remember === "1" || raw.remember === true ? "1" : "0",
		};
	}

	function buildAjaxBody(action, fields) {
		var params = new URLSearchParams();
		params.set("action", action);
		params.set("nonce", API.nonce.ajax);
		Object.keys(fields).forEach(function (key) {
			params.set(key, String(fields[key] != null ? fields[key] : ""));
		});
		return params;
	}

	function requestViaAjax(action, fields) {
		var url = ajaxEndpoint();
		var body = buildAjaxBody(action, fields);

		logAuthDebug("ajax →", { url: url, action: action, body: body.toString() });

		return fetch(url, {
			method: "POST",
			credentials: "same-origin",
			headers: {
				"Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
				Accept: "application/json, text/plain, */*",
			},
			body: body.toString(),
		}).then(function (res) {
			return res.text().then(function (text) {
				var data = parseResponseBody(res, text);
				var httpStatus = data.httpStatus || data.status || res.status;
				var success = data.success === true;
				return {
					ok: success,
					status: httpStatus,
					statusText: res.statusText,
					url: url,
					transport: "ajax",
					data: data,
					rawText: text,
					responsePreview: text.slice(0, 500),
				};
			});
		});
	}

	function requestViaRest(endpoint, payload) {
		var url = restEndpoint(endpoint);
		var jsonBody = JSON.stringify(payload);
		logAuthDebug("rest →", { url: url, payload: payload, body: jsonBody });

		return fetch(url, {
			method: "POST",
			credentials: "same-origin",
			headers: {
				"Content-Type": "application/json; charset=UTF-8",
				Accept: "application/json",
				"X-WP-Nonce": API.nonce.rest,
			},
			body: jsonBody,
		}).then(function (res) {
			return res.text().then(function (text) {
				var data = parseResponseBody(res, text);
				var httpStatus = data.httpStatus || (data.data && data.data.status) || res.status;
				var success = data.success === true;
				return {
					ok: res.ok && success,
					status: httpStatus,
					statusText: res.statusText,
					url: url,
					transport: "rest",
					data: data,
					rawText: text,
					responsePreview: text.slice(0, 500),
				};
			});
		});
	}

	function postAuth(kind, fields) {
		var transport = (AITT_AUTH_RUNTIME.transport || "auto").toLowerCase();
		var ajaxAction = kind === "register" ? API.actions.register : API.actions.login;
		var restSuffix = kind === "register" ? "/register" : "/login";

		var restPayload =
			kind === "register"
				? normalizeRegisterFields(fields)
				: {
						login: String(fields.login || "").trim(),
						password: String(fields.password || ""),
						remember: fields.remember === "1" || fields.remember === true,
				  };

		if (transport === "rest") {
			return requestViaRest(restSuffix, restPayload);
		}

		if (transport === "ajax") {
			return requestViaAjax(ajaxAction, fields);
		}

		return requestViaAjax(ajaxAction, fields).then(function (result) {
			if (result.data && typeof result.data.success === "boolean") {
				return result;
			}
			if (result.status >= 200 && result.status < 500 && result.data && result.data.message) {
				return result;
			}
			logAuthDebug("ajax 无有效 JSON，回退 rest", result);
			return requestViaRest(restSuffix, restPayload);
		});
	}

	function setFeedback(form, message, isError) {
		if (!form) return;
		var el = form.querySelector("[data-aitt-auth-feedback]");
		if (!el) return;
		if (!message) {
			el.hidden = true;
			el.textContent = "";
			el.classList.remove("is-error", "is-success");
			return;
		}
		el.hidden = false;
		el.textContent = message;
		el.classList.toggle("is-error", !!isError);
		el.classList.toggle("is-success", !isError);
	}

	function showPanel(name) {
		var isLogin = name === "login";
		if (loginPanel) loginPanel.hidden = !isLogin;
		if (registerPanel) registerPanel.hidden = isLogin;
		if (switchLogin) switchLogin.hidden = !isLogin;
		if (switchRegister) switchRegister.hidden = isLogin;
		if (loginForm) setFeedback(loginForm, "", false);
		if (registerForm) setFeedback(registerForm, "", false);
	}

	function openAuth(panel) {
		lastFocused = document.activeElement;
		overlay.hidden = false;
		overlay.setAttribute("aria-hidden", "false");
		document.body.classList.add("aitt-auth-open");
		showPanel(panel || "login");
		var focusTarget = overlay.querySelector(
			panel === "register"
				? '[data-aitt-register-form] input[name="email"]'
				: "[data-aitt-open-auth], [data-aitt-social-login], [data-aitt-login-form] input"
		);
		if (focusTarget instanceof HTMLElement) focusTarget.focus();
	}

	function closeAuth() {
		overlay.hidden = true;
		overlay.setAttribute("aria-hidden", "true");
		document.body.classList.remove("aitt-auth-open");
		if (lastFocused instanceof HTMLElement) lastFocused.focus();
	}

	function bindUserMenu(root) {
		var scope = root || document;
		scope.querySelectorAll("[data-aitt-user-menu]").forEach(function (menu) {
			var trigger = menu.querySelector(".aitt-user-menu__trigger");
			var dropdown = menu.querySelector(".aitt-user-menu__dropdown");
			if (!trigger || !dropdown) return;

			trigger.addEventListener("click", function (e) {
				e.stopPropagation();
				var open = dropdown.hasAttribute("hidden");
				document.querySelectorAll(".aitt-user-menu__dropdown").forEach(function (el) {
					if (el !== dropdown) el.setAttribute("hidden", "");
				});
				document.querySelectorAll(".aitt-user-menu__trigger").forEach(function (btn) {
					btn.setAttribute("aria-expanded", "false");
				});
				if (open) {
					dropdown.removeAttribute("hidden");
					trigger.setAttribute("aria-expanded", "true");
				} else {
					dropdown.setAttribute("hidden", "");
					trigger.setAttribute("aria-expanded", "false");
				}
			});
		});
	}

	document.addEventListener("click", function () {
		document.querySelectorAll(".aitt-user-menu__dropdown").forEach(function (el) {
			el.setAttribute("hidden", "");
		});
		document.querySelectorAll(".aitt-user-menu__trigger").forEach(function (btn) {
			btn.setAttribute("aria-expanded", "false");
		});
	});

	document.addEventListener("click", function (e) {
		var openBtn = e.target.closest("[data-aitt-open-auth]");
		if (openBtn) {
			e.preventDefault();
			openAuth("login");
		}
	});

	closeButtons.forEach(function (btn) {
		btn.addEventListener("click", function (e) {
			e.preventDefault();
			closeAuth();
		});
	});

	document.addEventListener("keydown", function (e) {
		if (e.key === "Escape" && !overlay.hidden) closeAuth();
	});

	if (showRegisterBtn) {
		showRegisterBtn.addEventListener("click", function () {
			showPanel("register");
			var emailInput = registerForm && registerForm.querySelector('input[name="email"]');
			if (emailInput instanceof HTMLElement) emailInput.focus();
		});
	}

	if (showLoginBtn) {
		showLoginBtn.addEventListener("click", function () {
			showPanel("login");
		});
	}

	if (socialBtn) {
		socialBtn.addEventListener("click", function () {
			setFeedback(loginForm, wpConfig.socialNotice || "社交登录即将开放。", true);
		});
	}

	function handleAuthSubmit(form, kind, payloadBuilder) {
		if (!form) return;
		form.addEventListener("submit", function (e) {
			e.preventDefault();
			var submitBtn = form.querySelector('[type="submit"]');
			if (submitBtn) submitBtn.disabled = true;
			setFeedback(form, "", false);

			logAuthDebug("config", {
				baseUrl: API.baseUrl,
				transport: AITT_AUTH_RUNTIME.transport,
				ajaxNonce: API.nonce.ajax ? "[set]" : "[missing]",
				restNonce: API.nonce.rest ? "[set]" : "[missing]",
				staticRuntime: staticRuntime,
			});

			if (staticRuntime.isStaticExport && !staticRuntime.canUseBackendApi) {
				setFeedback(form, staticRuntime.messages && staticRuntime.messages.authUnavailable ? staticRuntime.messages.authUnavailable : "静态站暂不支持登录 / 注册。", true);
				if (submitBtn) submitBtn.disabled = false;
				return;
			}

			postAuth(kind, payloadBuilder(form))
				.then(function (result) {
					var data = result.data || {};
					if (!result.ok || !data.success) {
						logAuthError(kind + "-business", new Error(data.message || "业务失败"), result);
						if (result.rawText) {
							console.log("后端原始返回：", result.rawText);
						}
						setFeedback(form, userFacingMessage(data, result), true);
						return;
					}
					setFeedback(form, data.message || "成功", false);
					window.setTimeout(function () {
						var redirectUrl = data.redirect_url || (data.user && data.user.redirect_url);
						if (redirectUrl) {
							window.location.href = redirectUrl;
							return;
						}
						window.location.reload();
					}, 520);
				})
				.catch(function (err) {
					var meta = {
						transport: AITT_AUTH_RUNTIME.transport,
						status: 0,
						statusText: "Network / CORS",
						url: kind === "register" ? restEndpoint("/register") : ajaxEndpoint(),
					};
					if (err && err.rawText) {
						console.log("后端原始返回：", err.rawText);
					}
					if (err && err.name === "TypeError" && /fetch|network|cors/i.test(String(err.message))) {
						meta.statusText = "CORS or Network Error";
					}
					logAuthError(kind + "-network", err, meta);
					setFeedback(form, userFacingMessage(null, meta), true);
				})
				.finally(function () {
					if (submitBtn) submitBtn.disabled = false;
				});
		});
	}

	handleAuthSubmit(loginForm, "login", function (form) {
		var login = form.querySelector('[name="login"]');
		var password = form.querySelector('[name="password"]');
		var remember = form.querySelector('[name="remember"]');
		return {
			login: login ? login.value.trim() : "",
			password: password ? password.value : "",
			remember: remember && remember.checked ? "1" : "0",
		};
	});

	handleAuthSubmit(registerForm, "register", function (form) {
		var email = form.querySelector('[name="email"]');
		var username = form.querySelector('[name="username"]');
		var password = form.querySelector('[name="password"]');
		return normalizeRegisterFields({
			email: email ? email.value : "",
			username: username ? username.value : "",
			password: password ? password.value : "",
		});
	});

	bindUserMenu(document);

	if (document.body.classList.contains("aitt-auth-page-open")) {
		openAuth("login");
	}

	window.aittAuthUI = { open: openAuth, close: closeAuth };
	window.aittAuthApi = API;
})();


