// ===================== Footer Year =====================
document.getElementById('year').textContent = new Date().getFullYear();

// ===================== Header scroll state =====================
const header = document.getElementById('site-header');
function updateHeader() {
  if (window.scrollY > 40) {
    header.classList.add('scrolled');
  } else {
    header.classList.remove('scrolled');
  }
}
window.addEventListener('scroll', updateHeader);
updateHeader();

// ===================== Image load diagnostics =====================
document.querySelectorAll('img').forEach(img => {
  img.addEventListener('error', () => {
    const failedSrc = img.currentSrc || img.getAttribute('src') || '';
    if (failedSrc) {
      console.error(`Image failed to load: ${failedSrc}`);
    }
  });
});

// ===================== Mobile nav toggle =====================
const navToggle = document.getElementById('nav-toggle');
const navMenuMobile = document.getElementById('nav-menu-mobile');
navToggle.addEventListener('click', () => {
  navMenuMobile.classList.toggle('hidden');
  navMenuMobile.classList.toggle('flex');
});

// Close mobile menu when a link is clicked
navMenuMobile.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', () => {
    navMenuMobile.classList.add('hidden');
    navMenuMobile.classList.remove('flex');
  });
});

// ===================== Scroll reveal =====================
const revealEls = document.querySelectorAll('[data-reveal]');
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('revealed');
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.12 });

revealEls.forEach(el => revealObserver.observe(el));

// ===================== Lightbox for gallery =====================
const lightbox = document.getElementById('lightbox');
const lightboxImg = document.getElementById('lightbox-img');
const lightboxCaption = document.getElementById('lightbox-caption');
const lightboxClose = document.getElementById('lightbox-close');

document.querySelectorAll('.gallery-item').forEach(item => {
  item.addEventListener('click', () => {
    const fullSrc = item.getAttribute('data-full');
    const title = item.getAttribute('data-title') || '';
    lightboxImg.src = fullSrc;
    lightboxImg.alt = title;
    lightboxCaption.textContent = title;
    lightbox.classList.add('active');
    document.body.style.overflow = 'hidden';
  });
});

function closeLightbox() {
  lightbox.classList.remove('active');
  document.body.style.overflow = '';
  lightboxImg.src = '';
}

lightboxClose.addEventListener('click', closeLightbox);
lightbox.addEventListener('click', (e) => {
  if (e.target === lightbox) closeLightbox();
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeLightbox();
});

// ===================== Active nav link on scroll =====================
const sections = document.querySelectorAll('section[id]');
const navLinks = document.querySelectorAll('.nav-link');

function setActiveLink() {
  let currentId = '';
  const scrollPos = window.scrollY + 120;
  sections.forEach(section => {
    if (scrollPos >= section.offsetTop) {
      currentId = section.id;
    }
  });
  navLinks.forEach(link => {
    link.classList.remove('text-amber');
    if (link.getAttribute('href') === `#${currentId}`) {
      link.classList.add('text-amber');
    }
  });
}
window.addEventListener('scroll', setActiveLink);
setActiveLink();
