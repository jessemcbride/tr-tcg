const state = {
  deck: [],
  hand: [],
  cpuHand: [],
  selectedCard: null,
  selectedStat: 'build',
  round: 1,
  score: 0,
  usedIds: new Set(),
};

const labels = {
  build: 'Build',
  design: 'Design',
  systems: 'Systems',
  mentorship: 'Mentorship',
};

const byId = (id) => document.getElementById(id);

function shuffle(cards) {
  return [...cards].sort(() => Math.random() - 0.5);
}

function drawCards(count) {
  const available = state.deck.filter((card) => !state.usedIds.has(card.id));
  if (available.length < count) {
    state.usedIds.clear();
    return shuffle(state.deck).slice(0, count);
  }
  return shuffle(available).slice(0, count);
}

function cardTemplate(card, compact = false, includeSource = true) {
  const stats = Object.entries(card.stats).map(([key, value]) => `
    <div class="stat-row">
      <span>${labels[key]}</span>
      <span class="bar"><span style="width:${(value / 12) * 100}%"></span></span>
      <strong>${value}</strong>
    </div>
  `).join('');
  const workedAt = card.workedAt?.length
    ? `<div class="worked-at"><span>Also worked at</span><strong>${card.workedAt.slice(0, 3).join(' / ')}</strong></div>`
    : '';
  const badges = card.badges?.length
    ? `<div class="badges">${card.badges.map((badge) => `<span>${badge}</span>`).join('')}</div>`
    : '';

  return `
    <article class="card ${compact ? 'compact' : ''} ${classSlug(card.className)}">
      <div class="portrait">
        <span class="card-class ${classSlug(card.className)}">${card.className}</span>
        <img src="${card.imageUrl}" alt="Photo of ${card.name}" loading="lazy">
      </div>
      <div class="card-body">
        <div>
          <div class="name">${card.name}</div>
          <div class="title">${card.title}</div>
        </div>
        <div class="meta">
          <span>${card.tenure}</span>
          <span>${card.tenureYears || 1} yr${card.tenureYears === 1 ? '' : 's'}</span>
        </div>
        ${badges}
        <div class="power-line">
          <span>Power</span>
          <strong>${card.power}/${card.maxPower}</strong>
        </div>
        <div class="stats">${stats}</div>
        ${workedAt}
        <div class="legend-box">
          <span>Legend</span>
          <p>${card.bioFlavor}</p>
        </div>
        <div class="effect-box">
          <span>${card.effect.name}</span>
          <p>${card.effect.text}</p>
        </div>
        ${includeSource ? `<a class="card-action" href="${card.profileUrl}" target="_blank" rel="noreferrer">Profile source</a>` : ''}
      </div>
    </article>
  `;
}

function classSlug(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-');
}

function renderHand() {
  byId('hand').innerHTML = state.hand.map((card) => `
    <button class="card-button" type="button" data-id="${card.id}" aria-label="Choose ${card.name}">
      ${cardTemplate(card, true, false)}
    </button>
  `).join('');

  document.querySelectorAll('.card-button').forEach((button) => {
    button.addEventListener('click', () => selectCard(button.dataset.id));
  });
}

function renderLibrary() {
  const query = byId('search').value.trim().toLowerCase();
  const cardClass = byId('classFilter').value;
  const cards = state.deck.filter((card) => {
    const matchesQuery = !query || `${card.name} ${card.title} ${card.tenure} ${card.className} ${card.workedAt?.join(' ')} ${card.badges?.join(' ')}`.toLowerCase().includes(query);
    const matchesClass = cardClass === 'all' || card.className === cardClass;
    return matchesQuery && matchesClass;
  });

  byId('library').innerHTML = cards.map((card) => cardTemplate(card, true)).join('');
}

function selectCard(id) {
  state.selectedCard = state.hand.find((card) => card.id === id);
  document.querySelectorAll('.card-button .card').forEach((card) => card.classList.remove('selected'));
  document.querySelector(`[data-id="${id}"] .card`).classList.add('selected');
  byId('playerSlot').innerHTML = cardTemplate(state.selectedCard, true);
  byId('status').textContent = `Ready: ${state.selectedCard.name} on ${labels[state.selectedStat]}.`;
  battle();
}

function battle() {
  if (!state.selectedCard) return;

  const cpuCard = state.cpuHand.shift() || drawCards(1)[0];
  const playerResolved = resolveValue(state.selectedCard, cpuCard, state.selectedStat);
  const cpuResolved = resolveValue(cpuCard, state.selectedCard, state.selectedStat);
  const playerValue = playerResolved.value;
  const cpuValue = cpuResolved.value;
  const delta = playerValue - cpuValue;

  byId('cpuSlot').innerHTML = cardTemplate(cpuCard, true);
  state.usedIds.add(state.selectedCard.id);
  state.usedIds.add(cpuCard.id);
  state.hand = state.hand.filter((card) => card.id !== state.selectedCard.id);

  const playerWinsTie = delta === 0 && state.selectedCard.className === 'Team Lead' && state.selectedStat === 'mentorship';
  const cpuWinsTie = delta === 0 && cpuCard.className === 'Team Lead' && state.selectedStat === 'mentorship';

  if (delta > 0 || (playerWinsTie && !cpuWinsTie)) {
    state.score += 3 + delta;
    byId('status').textContent = `${state.selectedCard.name} wins ${labels[state.selectedStat]} ${playerValue}-${cpuValue}. ${playerResolved.note}`;
  } else if (delta < 0 || cpuWinsTie) {
    state.score += 1;
    byId('status').textContent = `${cpuCard.name} takes the round ${cpuValue}-${playerValue}. ${cpuResolved.note}`;
  } else {
    state.score += 2;
    byId('status').textContent = `Tie on ${labels[state.selectedStat]} at ${playerValue}.`;
  }

  state.selectedCard = null;
  state.round += 1;
  if (state.round > 5) {
    byId('status').textContent += ` Match complete. Final score: ${state.score}.`;
  }

  updateHud();
  renderHand();
}

function resolveValue(card, opponent, stat) {
  let bonus = 0;
  const notes = [];

  if (card.className === 'Current Team') {
    bonus += 1;
    notes.push('Active roster +1');
  }
  if (card.className === 'Systems Builder' && stat === 'systems' && (card.startYear || 2026) < (opponent.startYear || 2026)) {
    bonus += 1;
    notes.push('Infrastructure edge +1');
  }
  if (card.className === 'Creative Builder' && stat === 'design') {
    bonus += 1;
    notes.push('Prototype spark +1');
  }
  if (card.className === 'Founding Era' && stat === 'build' && opponent.current) {
    bonus += 1;
    notes.push('Legacy boost +1');
  }
  if (card.className === 'Application Builder' && stat === 'build') {
    bonus += 1;
    notes.push('Release rhythm +1');
  }
  if (card.effect?.type === 'stat' && card.effect.stat === stat) {
    bonus += 1;
    notes.push(`${card.effect.name} +1`);
  }
  if (card.effect?.type === 'longRun' && stat === 'mentorship') {
    bonus += 1;
    notes.push('Deep Tenure +1');
  }
  if (card.effect?.type === 'network' && (card.workedAt?.length || 0) > (opponent.workedAt?.length || 0)) {
    bonus += 1;
    notes.push('Career Trail +1');
  }
  if (card.effect?.type === 'og' && stat === 'mentorship') {
    bonus += 1;
    notes.push('OG Signal +1');
  }
  if (card.effect?.type === 'og' && stat === 'build' && opponent.current) {
    bonus += 1;
    notes.push('OG Signal +1');
  }

  const base = card.stats[stat];
  let value = Math.min(12, base + bonus);
  if (card.effect?.type === 'flex' && base < opponent.stats[stat] && opponent.stats[stat] - base === 1) {
    value += 1;
    notes.push('Ranger Flex +1');
  }

  return {
    value: Math.min(12, value),
    note: notes.join(', '),
  };
}

function updateHud() {
  byId('deckCount').textContent = state.deck.length;
  byId('round').textContent = Math.min(state.round, 5);
  byId('score').textContent = state.score;
}

function newMatch() {
  state.deck = shuffle(ALUMNI_CARDS);
  state.usedIds.clear();
  state.hand = state.deck.slice(0, 5);
  state.cpuHand = state.deck.slice(5, 10);
  state.selectedCard = null;
  state.round = 1;
  state.score = 0;
  byId('playerSlot').textContent = 'Choose from your hand';
  byId('cpuSlot').textContent = 'Waiting';
  byId('status').textContent = 'Pick a card and a stat.';
  updateHud();
  renderHand();
  renderLibrary();
}

document.querySelectorAll('.stat-button').forEach((button) => {
  button.addEventListener('click', () => {
    document.querySelectorAll('.stat-button').forEach((item) => item.classList.remove('active'));
    button.classList.add('active');
    state.selectedStat = button.dataset.stat;
    byId('status').textContent = `Stat set to ${labels[state.selectedStat]}.`;
  });
});

byId('newMatch').addEventListener('click', newMatch);
byId('search').addEventListener('input', renderLibrary);
byId('classFilter').addEventListener('change', renderLibrary);

newMatch();
