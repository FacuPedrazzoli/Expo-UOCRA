/**
 * Expo Formación — Mejoras visuales
 * Funcionalidades: Contadores animados, CTA sticky, Nav sticky, Animaciones
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
  }

  // ══════════════════════════════════════════════════════════════════
  // NAV STICKY CON SCROLL SHADOW Y SECCIÓN ACTIVA
  // ══════════════════════════════════════════════════════════════════
  function initNavSticky() {
    const nav = document.getElementById('main-nav');
    if (!nav) return;

    // Scroll shadow
    window.addEventListener('scroll', () => {
      if (window.scrollY > 50) {
        nav.classList.add('scrolled');
      } else {
        nav.classList.remove('scrolled');
      }
    });

    // Sección activa con IntersectionObserver
    const sections = document.querySelectorAll('section[id]');
    const navLinks = document.querySelectorAll('.nav-link');

    const sectionObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const id = entry.target.id;
          navLinks.forEach(link => {
            link.classList.remove('nav-active');
            if (link.getAttribute('href') === '#' + id) {
              link.classList.add('nav-active');
            }
          });
        }
      });
    }, { threshold: 0.3 });

    sections.forEach(section => sectionObserver.observe(section));
  }

  // ══════════════════════════════════════════════════════════════════
  // ANIMACIONES DE ENTRADA DE SECCIONES
  // ══════════════════════════════════════════════════════════════════
  function initSectionAnimations() {
    const sections = document.querySelectorAll('.section-animated');
    if (!sections.length) return;

    const observerOptions = {
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px'
    };

    const animationObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          animationObserver.unobserve(entry.target);
        }
      });
    }, observerOptions);

    sections.forEach(section => {
      // La sección empresas siempre visible
      if (section.id !== 'empresas') {
        animationObserver.observe(section);
      } else {
        section.classList.add('visible');
      }
    });
  }

  // ══════════════════════════════════════════════════════════════════
  // PARTICULAS CSS EN HERO
  // ══════════════════════════════════════════════════════════════════
  function initHeroParticles() {
    const hero = document.getElementById('hero');
    if (!hero) return;

    // Agregar partículas como pseudo-elementos
    hero.classList.add('hero-particles');
  }

  // ══════════════════════════════════════════════════════════════════
  // INICIALIZACIÓN
  // ══════════════════════════════════════════════════════════════════
  function init() {
    initCounters();
    initCTASticky();
    initNavSticky();
    initSectionAnimations();
    initHeroParticles();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
