/**
 * Expo Formación — Mejoras visuales
 * Funcionalidades: Contadores animados, CTA sticky, Hero
 */

(function() {
  'use strict';

  // ══════════════════════════════════════════════════════════════════
  // CONTADORES ANIMADOS — IntersectionObserver
  // ══════════════════════════════════════════════════════════════════
  function initCounters() {
    const counters = document.querySelectorAll('.stat-number[data-target]');
    if (!counters.length) return;

    const observerOptions = {
      threshold: 0.5,
      rootMargin: '0px'
    };

    const counterObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const counter = entry.target;
          const target = parseInt(counter.dataset.target, 10);
          animateCounter(counter, target);
          counterObserver.unobserve(counter);
        }
      });
    }, observerOptions);

    counters.forEach(counter => counterObserver.observe(counter));
  }

  function animateCounter(element, target) {
    const duration = 2000;
    const start = 0;
    const startTime = performance.now();

    function update(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const current = Math.floor(start + (target - start) * easeOut);
      
      element.textContent = current;

      if (progress < 1) {
        requestAnimationFrame(update);
      } else {
        element.textContent = target;
      }
    }

    requestAnimationFrame(update);
  }

  // ══════════════════════════════════════════════════════════════════
  // CTA STICKY — Aparece después del hero
  // ══════════════════════════════════════════════════════════════════
  function initCTASticky() {
    const ctaSticky = document.getElementById('cta-sticky');
    const hero = document.getElementById('hero');
    const ctaClose = document.getElementById('cta-sticky-close');
    const ctaBtn = document.getElementById('cta-sticky-btn');

    if (!ctaSticky || !hero) return;

    if (sessionStorage.getItem('cta_cerrado') === 'true') {
      ctaSticky.classList.add('hidden');
      return;
    }

    const heroObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting && entry.boundingClientRect.top < 0) {
          ctaSticky.classList.add('visible');
        } else if (entry.isIntersecting) {
          ctaSticky.classList.remove('visible');
        }
      });
    }, { threshold: 0 });

    heroObserver.observe(hero);

    if (ctaClose) {
      ctaClose.addEventListener('click', () => {
        ctaSticky.classList.remove('visible');
        ctaSticky.classList.add('hidden');
        sessionStorage.setItem('cta_cerrado', 'true');
      });
    }

    if (ctaBtn) {
      ctaBtn.addEventListener('click', () => {
        const inscripcion = document.getElementById('inscripcion');
        if (inscripcion) {
          inscripcion.scrollIntoView({ behavior: 'smooth' });
        }
      });
    }
  }

  // ══════════════════════════════════════════════════════════════════
  // BOTÓN HERO — Inscribirme Ahora
  // ══════════════════════════════════════════════════════════════════
  function initHeroButton() {
    const heroBtn = document.getElementById('btn-inscribirme-hero');
    if (!heroBtn) return;

    heroBtn.addEventListener('click', () => {
      const inscripcion = document.getElementById('inscripcion');
      if (inscripcion) {
        inscripcion.scrollIntoView({ behavior: 'smooth' });
      }
    });
  }

  // ══════════════════════════════════════════════════════════════════
  // NAVEGACIÓN DEL FOOTER — Scroll suave
  // ══════════════════════════════════════════════════════════════════
  function initFooterNav() {
    const footerLinks = document.querySelectorAll('footer .footer-links a[data-seccion]');
    footerLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const seccion = link.dataset.seccion;
        const target = document.getElementById(seccion);
        if (target) {
          target.scrollIntoView({ behavior: 'smooth' });
        }
      });
    });
  }

  // ══════════════════════════════════════════════════════════════════
  // INICIALIZACIÓN
  // ══════════════════════════════════════════════════════════════════
  function init() {
    initCounters();
    initCTASticky();
    initHeroButton();
    initFooterNav();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
