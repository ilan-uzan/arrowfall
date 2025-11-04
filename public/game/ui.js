// UI manager for HUD, banners, and modals
export class UIManager {
  constructor() {
    this.elements = {
      hudP1Wins: document.getElementById('hud-p1-wins'),
      hudP2Wins: document.getElementById('hud-p2-wins'),
      hudP1Arrows: document.getElementById('hud-p1-arrows'),
      hudP2Arrows: document.getElementById('hud-p2-arrows'),
      hudTimer: document.getElementById('hud-timer'),
      joinOverlay: document.getElementById('join-overlay'),
      joinButton: document.getElementById('join-button'),
      joinHint: document.getElementById('join-hint'),
      roundBanner: document.getElementById('round-banner'),
      matchEndModal: document.getElementById('match-end-modal'),
      winnerInput: document.getElementById('winner-name'),
      loserInput: document.getElementById('loser-name'),
      saveMatchBtn: document.getElementById('save-match-btn'),
      cancelMatchBtn: document.getElementById('cancel-match-btn'),
      successMessage: document.getElementById('success-message')
    };
  }

  // Update HUD with player wins
  updateWins(player1Wins, player2Wins, roundsToWin = 5) {
    // Player 1 wins (left side)
    let p1HTML = '';
    for (let i = 0; i < roundsToWin; i++) {
      p1HTML += i < player1Wins ? '<span class="win">●</span>' : '<span class="loss">○</span>';
    }
    this.elements.hudP1Wins.innerHTML = p1HTML;

    // Player 2 wins (right side)
    let p2HTML = '';
    for (let i = 0; i < roundsToWin; i++) {
      p2HTML += i < player2Wins ? '<span class="win">●</span>' : '<span class="loss">○</span>';
    }
    this.elements.hudP2Wins.innerHTML = p2HTML;
  }

  // Update arrow counts
  updateArrows(player1Arrows, player2Arrows) {
    this.elements.hudP1Arrows.textContent = `Arrows: ${player1Arrows}`;
    this.elements.hudP2Arrows.textContent = `Arrows: ${player2Arrows}`;
  }

  // Update round timer
  updateTimer(time) {
    if (time > 0) {
      this.elements.hudTimer.textContent = `${time.toFixed(1)}s`;
    } else {
      this.elements.hudTimer.textContent = '';
    }
  }

  // Show round banner
  showBanner(text, type = 'ready', duration = 2000) {
    this.elements.roundBanner.textContent = text;
    this.elements.roundBanner.className = `round-banner ${type} show`;
    
    setTimeout(() => {
      this.elements.roundBanner.classList.remove('show');
    }, duration);
  }

  // Hide round banner
  hideBanner() {
    this.elements.roundBanner.classList.remove('show');
  }

  // Show join overlay
  showJoinOverlay() {
    this.elements.joinOverlay.classList.remove('hidden');
  }

  // Hide join overlay
  hideJoinOverlay() {
    this.elements.joinOverlay.classList.add('hidden');
  }

  // Show join hint
  showJoinHint() {
    this.elements.joinHint.classList.remove('hidden');
  }

  // Hide join hint
  hideJoinHint() {
    this.elements.joinHint.classList.add('hidden');
  }

  // Show match end modal
  showMatchEndModal(winnerName = 'Player 1', loserName = 'Player 2', winnerKOs = 0, loserKOs = 0) {
    this.elements.winnerInput.value = winnerName;
    this.elements.loserInput.value = loserName;
    this.elements.matchEndModal.classList.remove('hidden');
    this.elements.successMessage.classList.add('hidden');
  }

  // Hide match end modal
  hideMatchEndModal() {
    this.elements.matchEndModal.classList.add('hidden');
  }

  // Show success message
  showSuccess() {
    this.elements.successMessage.classList.remove('hidden');
  }

  // Get match data from form
  getMatchData() {
    return {
      winner: this.elements.winnerInput.value.trim(),
      loser: this.elements.loserInput.value.trim(),
      winnerKOs: 0, // Could track these if needed
      loserKOs: 0
    };
  }

  // Setup event listeners
  setupListeners(onJoinClick, onSaveMatch, onCancelMatch) {
    this.elements.joinButton.addEventListener('click', onJoinClick);
    this.elements.saveMatchBtn.addEventListener('click', onSaveMatch);
    this.elements.cancelMatchBtn.addEventListener('click', onCancelMatch);
  }
}

