(() => {
	if (typeof document === 'undefined') return;
	const toggle = document.getElementById('mobile-menu-toggle');
	const closeBtn = document.getElementById('mobile-menu-close');
	const overlay = document.getElementById('mobile-menu-overlay');
	const backdrop = document.getElementById('mobile-menu-backdrop');
	const panel = document.getElementById('mobile-menu-panel');
	const iconOpen = document.getElementById('mobile-menu-icon-open');
	const iconClose = document.getElementById('mobile-menu-icon-close');
	const body = document.body;
	if (!toggle || !overlay || !backdrop || !panel || !body) return;

	const setOpen = (open) => {
		overlay.classList.toggle('hidden', !open);
		overlay.setAttribute('aria-hidden', open ? 'false' : 'true');
		if (iconOpen && iconClose) {
			iconOpen.classList.toggle('hidden', open);
			iconClose.classList.toggle('hidden', !open);
		}
		toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
		body.style.overflow = open ? 'hidden' : '';
		if (open) {
			const firstLink = panel.querySelector('.mobile-menu-link');
			if (firstLink instanceof HTMLElement) {
				firstLink.focus();
			}
		}
	};

	toggle.addEventListener('click', () => {
		const isOpen = overlay.classList.contains('hidden');
		setOpen(isOpen);
	});

	if (closeBtn) {
		closeBtn.addEventListener('click', () => setOpen(false));
	}

	backdrop.addEventListener('click', (event) => {
		if (event.target === backdrop) {
			setOpen(false);
		}
	});

	document.querySelectorAll('.mobile-menu-link').forEach((link) => {
		link.addEventListener('click', () => setOpen(false));
	});

	document.addEventListener('keydown', (event) => {
		if (event.key === 'Escape') {
			setOpen(false);
		}
	});
})();


