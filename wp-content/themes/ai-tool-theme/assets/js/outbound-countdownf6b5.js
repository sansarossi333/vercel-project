(() => {
	'use strict';

	const root = document.querySelector('[data-aitt-outbound-countdown]');
	if (!root) return;

	const numEl = root.querySelector('[data-countdown-num]');
	const target = root.getAttribute('data-target') || '/';
	const goBtn = document.querySelector('[data-aitt-outbound-go]');
	let left = parseInt(root.getAttribute('data-seconds') || '5', 10);
	if (!Number.isFinite(left) || left < 1) left = 5;
	let jumped = false;

	const pulse = () => {
		if (!numEl) return;
		numEl.classList.remove('is-pulse');
		void numEl.offsetWidth;
		numEl.classList.add('is-pulse');
	};

	const jumpTo = (url) => {
		if (jumped || !url) return;
		jumped = true;
		window.location.href = url;
	};

	const tick = () => {
		if (numEl) {
			numEl.textContent = String(left);
			pulse();
		}
		if (left <= 0) {
			jumpTo(target);
			return;
		}
		left -= 1;
		window.setTimeout(tick, 1000);
	};

	if (goBtn) {
		const goTarget = goBtn.getAttribute('data-target') || target;
		goBtn.addEventListener('click', () => jumpTo(goTarget));
	}

	tick();
})();

