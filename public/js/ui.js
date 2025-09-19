document.addEventListener('DOMContentLoaded', () => {
  // 1) Reveal on scroll
  const items = document.querySelectorAll('[data-animate]');
  if (items.length){
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('is-visible');
          io.unobserve(e.target);
        }
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: .1 });
    items.forEach(el => io.observe(el));
  }

  // 2) Ripple on [data-ripple] (works best on buttons/links)
  document.body.addEventListener('click', (e) => {
    const target = e.target.closest('[data-ripple]');
    if(!target) return;
    target.classList.add('ripple-container');
    const r = document.createElement('span');
    const rect = target.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    r.className = 'ripple';
    r.style.width = r.style.height = `${size}px`;
    r.style.left = `${e.clientX - rect.left - size/2}px`;
    r.style.top  = `${e.clientY - rect.top  - size/2}px`;
    target.appendChild(r);
    r.addEventListener('animationend', () => r.remove());
  });

  // 3) Subtle tilt on [data-tilt]
  const tiltEls = document.querySelectorAll('[data-tilt]');
  tiltEls.forEach(el => {
    const max = parseFloat(el.dataset.tilt) || 8;
    el.style.transformStyle = 'preserve-3d';
    el.addEventListener('mousemove', (ev) => {
      const b = el.getBoundingClientRect();
      const px = (ev.clientX - b.left) / b.width - .5;
      const py = (ev.clientY - b.top) / b.height - .5;
      el.style.transform = `rotateY(${px*max}deg) rotateX(${ -py*max }deg)`;
    });
    el.addEventListener('mouseleave', () => {
      el.style.transform = '';
    });
  });
});
