var API_URL = 'https://7kasif.dk/api/leaderboard';

// Leaderboard
function loadLeaderboard() {
  var loadingEl = document.getElementById('leaderboard-loading');
  var errorEl = document.getElementById('leaderboard-error');
  var tableEl = document.getElementById('leaderboard-table');
  var bodyEl = document.getElementById('leaderboard-body');
  var emptyEl = document.getElementById('leaderboard-empty');

  fetch(API_URL)
    .then(function (res) {
      if (!res.ok) throw new Error('API error');
      return res.json();
    })
    .then(function (data) {
      loadingEl.hidden = true;

      if (!data.length) {
        emptyEl.hidden = false;
        return;
      }

      bodyEl.innerHTML = '';
      data.forEach(function (entry, i) {
        var rank = i + 1;
        var row = document.createElement('tr');

        var rankClass = '';
        if (rank === 1) rankClass = 'rank-1';
        else if (rank === 2) rankClass = 'rank-2';
        else if (rank === 3) rankClass = 'rank-3';

        var netClass = '';
        if (entry.netScore > 0) netClass = 'net-positive';
        else if (entry.netScore < 0) netClass = 'net-negative';

        var name = entry.displayName || entry.playerName || 'Unknown';

        row.innerHTML =
          '<td class="' + rankClass + '">' + rank + '</td>' +
          '<td>' + escapeHtml(name) + '</td>' +
          '<td>' + entry.totalSessions + '</td>' +
          '<td>' + entry.totalRoundsWon + '</td>' +
          '<td>' + entry.totalRoundsLost + '</td>' +
          '<td>' + entry.totalPlusClusters + '</td>' +
          '<td>' + entry.totalMinusClusters + '</td>' +
          '<td class="' + netClass + '">' + (entry.netScore > 0 ? '+' : '') + entry.netScore + '</td>';

        bodyEl.appendChild(row);
      });

      tableEl.hidden = false;
    })
    .catch(function (err) {
      console.error('Leaderboard fetch failed:', err);
      loadingEl.hidden = true;
      errorEl.hidden = false;
    });
}

function escapeHtml(str) {
  var div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// Scroll-triggered animations
function initScrollAnimations() {
  var observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
  };

  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, observerOptions);

  var animateElements = document.querySelectorAll(
    '.game-card, .legend-card, .tech-item'
  );

  animateElements.forEach(function (el) {
    el.classList.add('fade-in');
    observer.observe(el);
  });
}

// Stagger animation for legend cards
function staggerLegendCards() {
  var legendCards = document.querySelectorAll('.legend-card');
  legendCards.forEach(function (card, index) {
    card.style.transitionDelay = index * 0.1 + 's';
  });
}

// Add subtle parallax effect to hero section
function initParallax() {
  var hero = document.querySelector('.hero');
  if (!hero) return;

  window.addEventListener('scroll', function () {
    var scrolled = window.pageYOffset;
    var heroContent = hero.querySelector('.hero-content');
    if (heroContent && scrolled < window.innerHeight) {
      heroContent.style.transform = 'translateY(' + scrolled * 0.5 + 'px)';
      heroContent.style.opacity = 1 - (scrolled / window.innerHeight) * 0.5;
    }
  });
}

// Initialize
document.addEventListener('DOMContentLoaded', function () {
  loadLeaderboard();

  var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!prefersReducedMotion) {
    initScrollAnimations();
    initParallax();
  }

  staggerLegendCards();
});
