const API_URL = 'https://7kasif.dk/api/leaderboard';

async function loadLeaderboard() {
  const loadingEl = document.getElementById('leaderboard-loading');
  const errorEl = document.getElementById('leaderboard-error');
  const tableEl = document.getElementById('leaderboard-table');
  const bodyEl = document.getElementById('leaderboard-body');
  const emptyEl = document.getElementById('leaderboard-empty');

  try {
    const res = await fetch(API_URL);
    if (!res.ok) throw new Error('API error');

    const data = await res.json();
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
  } catch (err) {
    console.error('Leaderboard fetch failed:', err);
    loadingEl.hidden = true;
    errorEl.hidden = false;
  }
}

function escapeHtml(str) {
  var div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

loadLeaderboard();
