class DailyPuzzlesManager {
    constructor() {
        this.sudokuGame = null;
        this.currentPlayer = sessionStorage.getItem('currentUser') || 'faidao';
        this.currentDifficulty = 'medium';
        this.gameResults = [];
        this.dailyCompletions = {}; // Track completed games by date and user
        this.isInitialized = false;

        this.init();
    }

    init() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.initialize();
            });
        } else {
            this.initialize();
        }
    }

    async initialize() {
        this.setupEventListeners();
        this.initializeSudokuGame();
        this.loadGameHistory();
        this.loadDailyCompletions();

        // Load from database
        await this.loadDailyCompletionsFromDatabase();

        this.updateDailyGamesDisplay();
        this.isInitialized = true;
    }

    setupEventListeners() {
        // Daily game buttons (difficulty selection)
        document.addEventListener('click', (e) => {
            if (e.target.matches('.daily-game-btn')) {
                const difficulty = e.target.dataset.difficulty;
                this.startDailyGame(difficulty);
            }
        });

        // Game control buttons

        const pauseBtn = document.getElementById('pause-button');
        if (pauseBtn) {
            pauseBtn.addEventListener('click', () => this.togglePause());
        }

        const resumeBtn = document.getElementById('resume-button');
        if (resumeBtn) {
            resumeBtn.addEventListener('click', () => this.resumeGame());
        }

        const hintBtn = document.getElementById('hint-button');
        if (hintBtn) {
            hintBtn.addEventListener('click', () => this.getHint());
        }

        const checkBtn = document.getElementById('check-button');
        if (checkBtn) {
            checkBtn.addEventListener('click', () => this.checkPuzzle());
        }

        // Number buttons
        document.querySelectorAll('.number-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const number = parseInt(e.currentTarget.dataset.number);
                this.inputNumber(number);
            });
        });

        // Action buttons
        const modeToggle = document.getElementById('mode-toggle');
        if (modeToggle) {
            modeToggle.addEventListener('click', () => this.toggleMode());
        }

        const eraseBtn = document.getElementById('erase-button');
        if (eraseBtn) {
            eraseBtn.addEventListener('click', () => this.eraseCell());
        }

        const undoBtn = document.getElementById('undo-button');
        if (undoBtn) {
            undoBtn.addEventListener('click', () => this.undo());
        }

        const redoBtn = document.getElementById('redo-button');
        if (redoBtn) {
            redoBtn.addEventListener('click', () => this.redo());
        }

        const quitBtn = document.getElementById('quit-game-btn');
        if (quitBtn) {
            quitBtn.addEventListener('click', () => this.quitGame());
        }

        const globalCandidatesBtn = document.getElementById('global-candidates-button');
        if (globalCandidatesBtn) {
            globalCandidatesBtn.addEventListener('click', () => this.toggleGlobalCandidates());
        }
    }

    initializeSudokuGame() {
        this.sudokuGame = new SudokuGame();
        this.sudokuGame.setPlayer(this.currentPlayer);
    }

    startDailyGame(difficulty) {
        const today = new Date().toISOString().split('T')[0];
        const gameKey = `${today}-${this.currentPlayer}-${difficulty}`;

        // Check if already completed
        if (this.dailyCompletions[gameKey]) {
            this.showMessage(`You already completed ${difficulty} puzzle today!`, 'info');
            return;
        }

        if (!this.sudokuGame) {
            this.initializeSudokuGame();
        }

        this.currentDifficulty = difficulty;

        // Show game area
        document.getElementById('gameArea').style.display = 'block';
        document.getElementById('currentDifficultyDisplay').textContent = difficulty.toUpperCase();

        // Start the game
        const puzzleData = this.sudokuGame.startNewGame(difficulty, today);

        // Hide daily games grid and show game
        document.getElementById('dailyGamesGrid').style.display = 'none';

        this.showMessage(`Started ${difficulty} puzzle! Good luck!`, 'success');

        return puzzleData;
    }

    quitGame() {
        // Stop the game
        if (this.sudokuGame) {
            this.sudokuGame.stopTimer();
        }

        // Hide game area
        document.getElementById('gameArea').style.display = 'none';
        document.getElementById('dailyGamesGrid').style.display = 'grid';

        this.showMessage('Game quit. Your progress was not saved.', 'info');
    }

    togglePause() {
        if (!this.sudokuGame) return;

        if (this.sudokuGame.isPaused) {
            this.sudokuGame.resumeGame();
        } else {
            this.sudokuGame.pauseGame();
        }
    }

    resumeGame() {
        if (this.sudokuGame) {
            this.sudokuGame.resumeGame();
        }
    }

    getHint() {
        if (this.sudokuGame) {
            this.sudokuGame.getHint();
            this.showMessage('Hint provided!', 'info');
        }
    }

    checkPuzzle() {
        if (!this.sudokuGame) return;

        // Check current state
        let hasErrors = false;
        const grid = this.sudokuGame.currentGrid;

        for (let row = 0; row < 9; row++) {
            for (let col = 0; col < 9; col++) {
                const value = grid[row][col];
                if (value !== 0) {
                    const conflicts = this.sudokuGame.generator.getConflicts(grid, row, col, value);
                    if (conflicts.length > 0) {
                        hasErrors = true;
                        // Highlight error
                        const cell = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
                        if (cell) {
                            cell.classList.add('error');
                            setTimeout(() => cell.classList.remove('error'), 2000);
                        }
                    }
                }
            }
        }

        if (hasErrors) {
            this.showMessage('Errors found! Check highlighted cells.', 'error');
        } else {
            this.showMessage('No errors found! Keep going!', 'success');
        }
    }

    inputNumber(number) {
        if (this.sudokuGame && this.sudokuGame.selectedCell) {
            const { row, col } = this.sudokuGame.selectedCell;
            this.sudokuGame.inputNumber(row, col, number);
        }
    }

    toggleMode() {
        if (this.sudokuGame) {
            this.sudokuGame.toggleMode();
        }
    }

    eraseCell() {
        if (this.sudokuGame && this.sudokuGame.selectedCell) {
            const { row, col } = this.sudokuGame.selectedCell;
            this.sudokuGame.clearCell(row, col);
        }
    }

    undo() {
        if (this.sudokuGame) {
            this.sudokuGame.undo();
        }
    }

    redo() {
        if (this.sudokuGame) {
            this.sudokuGame.redo();
        }
    }

    toggleGlobalCandidates() {
        if (this.sudokuGame) {
            this.sudokuGame.toggleGlobalCandidates();
        }
    }

    async recordGameResult(result) {
        // Store game result locally
        this.gameResults.push(result);

        // Mark daily completion locally
        const gameKey = `${result.date}-${result.player}-${result.difficulty}`;
        this.dailyCompletions[gameKey] = result;

        // Save to localStorage as backup
        localStorage.setItem('sudokuGameResults', JSON.stringify(this.gameResults));
        localStorage.setItem('dailyCompletions', JSON.stringify(this.dailyCompletions));

        // Save to database
        try {
            await this.saveGameToDatabase(result);
        } catch (error) {
            console.error('Failed to save to database:', error);
            this.showMessage('Game saved locally. Will sync when online.', 'warning');
        }

        // Call main app's recording method
        if (window.sudokuApp) {
            window.sudokuApp.recordGameResult(result);
        }

        // Hide game area and show daily games grid
        document.getElementById('gameArea').style.display = 'none';
        document.getElementById('dailyGamesGrid').style.display = 'grid';

        // Update displays
        this.updateGameHistory();
        this.updateDailyGamesDisplay();
    }

    async saveGameToDatabase(result) {
        try {
            const response = await fetch('/api/supabase-games', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    date: result.date,
                    player: result.player,
                    difficulty: result.difficulty,
                    time: result.time,
                    mistakes: result.mistakes,
                    hintsUsed: result.hintsUsed,
                    completed: result.completed,
                    score: this.calculateScore(result)
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            console.log('Game saved to Supabase:', data);
            return data;
        } catch (error) {
            console.error('Supabase save error:', error);
            throw error;
        }
    }

    async loadDailyCompletionsFromDatabase() {
        try {
            const today = new Date().toISOString().split('T')[0];
            const response = await fetch(`/api/supabase-games?action=completions&player=${this.currentPlayer}&date=${today}`);

            if (response.ok) {
                const completions = await response.json();

                // Convert to local format
                Object.keys(completions).forEach(difficulty => {
                    if (completions[difficulty].completed) {
                        const gameKey = `${today}-${this.currentPlayer}-${difficulty}`;
                        this.dailyCompletions[gameKey] = {
                            date: today,
                            player: this.currentPlayer,
                            difficulty: difficulty,
                            completed: true
                        };
                    }
                });

                // Merge with localStorage
                localStorage.setItem('dailyCompletions', JSON.stringify(this.dailyCompletions));
            }
        } catch (error) {
            console.error('Failed to load completions from Supabase:', error);
            // Fall back to localStorage
        }
    }

    integrateWithMainApp(result) {
        // Convert game result to the existing scoring format
        const player = result.player;
        const difficulty = result.difficulty;
        const timeInSeconds = result.time;
        const errors = result.mistakes;
        const dnf = !result.completed;

        // Get current date entry form elements
        const dateInput = document.getElementById('entryDate');
        const timeInput = document.getElementById(`${player}-${difficulty}-time`);
        const errorInput = document.getElementById(`${player}-${difficulty}-errors`);
        const dnfCheckbox = document.getElementById(`${player}-${difficulty}-dnf`);

        if (dateInput && timeInput && errorInput && dnfCheckbox) {
            // Set the date to today
            dateInput.value = result.date;

            // Set the time (convert seconds to MM:SS format)
            const minutes = Math.floor(timeInSeconds / 60);
            const seconds = timeInSeconds % 60;
            timeInput.value = `${minutes}:${seconds.toString().padStart(2, '0')}`;

            // Set errors
            errorInput.value = errors;

            // Set DNF status
            dnfCheckbox.checked = dnf;

            // Update the scores
            window.sudokuApp.updateScores();

            // Show message about integration
            this.showMessage(`Game result recorded for ${player} - ${difficulty} difficulty!`, 'success');
        }
    }

    loadGameHistory() {
        const saved = localStorage.getItem('sudokuGameResults');
        if (saved) {
            this.gameResults = JSON.parse(saved);
            this.updateGameHistory();
        }
    }

    loadDailyCompletions() {
        const saved = localStorage.getItem('dailyCompletions');
        if (saved) {
            this.dailyCompletions = JSON.parse(saved);
        }
    }

    updateDailyGamesDisplay() {
        const container = document.getElementById('dailyGamesGrid');
        if (!container) return;

        const today = new Date().toISOString().split('T')[0];
        const difficulties = ['easy', 'medium', 'hard'];

        container.innerHTML = difficulties.map(difficulty => {
            const gameKey = `${today}-${this.currentPlayer}-${difficulty}`;
            const completed = this.dailyCompletions[gameKey];

            let statusClass = 'available';
            let statusText = 'Play Now';
            let buttonText = 'Start Game';
            let disabled = '';

            if (completed) {
                statusClass = 'completed';
                statusText = 'Completed';
                buttonText = `✓ ${this.formatTime(completed.time)}`;
                disabled = 'disabled';
            }

            return `
                <div class="daily-game-card ${statusClass}">
                    <div class="game-difficulty-icon ${difficulty}">
                        <i class="fas fa-${difficulty === 'easy' ? 'seedling' : difficulty === 'medium' ? 'bolt' : 'fire'}"></i>
                    </div>
                    <h4>${difficulty.toUpperCase()}</h4>
                    <div class="game-status">${statusText}</div>
                    <button class="daily-game-btn" data-difficulty="${difficulty}" ${disabled}>
                        ${buttonText}
                    </button>
                    ${completed ? `<div class="completion-details">
                        <div>Time: ${this.formatTime(completed.time)}</div>
                        <div>Mistakes: ${completed.mistakes}</div>
                        <div>Score: ${this.calculateScore(completed)}</div>
                    </div>` : ''}
                </div>
            `;
        }).join('');
    }

    calculateScore(result) {
        const multipliers = { easy: 1, medium: 1.5, hard: 2 };
        const adjustedTime = result.time + (result.mistakes * 30);
        const adjustedMinutes = adjustedTime / 60;
        const score = (1000 / adjustedMinutes) * multipliers[result.difficulty];
        return Math.round(score);
    }

    updateGameHistory() {
        const historyContainer = document.getElementById('game-history');
        if (!historyContainer) return;

        const recentGames = this.gameResults.slice(-10).reverse(); // Show last 10 games

        if (recentGames.length === 0) {
            historyContainer.innerHTML = '<div class="no-history">No games played yet. Start your first puzzle!</div>';
            return;
        }

        historyContainer.innerHTML = recentGames.map(game => {
            const timeFormatted = this.formatTime(game.time);
            const date = new Date(game.date).toLocaleDateString();

            return `
                <div class="game-history-card ${game.completed ? 'completed' : 'incomplete'}">
                    <div class="game-date">${date}</div>
                    <div class="game-player">${game.player}</div>
                    <div class="game-difficulty difficulty-${game.difficulty}">${game.difficulty}</div>
                    <div class="game-time">${timeFormatted}</div>
                    <div class="game-mistakes">${game.mistakes} errors</div>
                    <div class="game-status ${game.completed ? 'completed' : 'incomplete'}">
                        ${game.completed ? '✓ Completed' : '✗ Incomplete'}
                    </div>
                </div>
            `;
        }).join('');
    }

    formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }

    showMessage(message, type = 'info') {
        // Create or update message element
        let messageEl = document.getElementById('puzzle-message');
        if (!messageEl) {
            messageEl = document.createElement('div');
            messageEl.id = 'puzzle-message';
            messageEl.className = 'puzzle-message';
            document.body.appendChild(messageEl);
        }

        messageEl.textContent = message;
        messageEl.className = `puzzle-message ${type} visible`;

        // Auto-hide after 3 seconds
        setTimeout(() => {
            messageEl.classList.remove('visible');
        }, 3000);
    }

    // Generate puzzle for specific date and difficulty
    generatePuzzleForDate(date, difficulty) {
        if (!this.sudokuGame) {
            this.initializeSudokuGame();
        }

        return this.sudokuGame.generator.generateDailyPuzzle(date, difficulty);
    }

    // Get today's puzzles for all difficulties
    getTodaysPuzzles() {
        const today = new Date().toISOString().split('T')[0];
        const difficulties = ['easy', 'medium', 'hard'];

        return difficulties.reduce((puzzles, difficulty) => {
            puzzles[difficulty] = this.generatePuzzleForDate(today, difficulty);
            return puzzles;
        }, {});
    }

    // Update page when it becomes active
    updatePage() {
        if (!this.isInitialized) {
            this.initialize();
        }

        // Update displays
        this.updateGameHistory();
        this.updateDailyGamesDisplay();

        // Ensure correct user is set
        this.currentPlayer = sessionStorage.getItem('currentUser') || 'faidao';
        if (this.sudokuGame) {
            this.sudokuGame.setPlayer(this.currentPlayer);
        }

        // If no game is active, show daily puzzle info
        if (!this.sudokuGame || !this.sudokuGame.puzzle) {
            this.showDailyPuzzleInfo();
        }
    }

    showDailyPuzzleInfo() {
        const today = new Date().toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        this.showMessage(`Welcome to Daily Puzzles for ${today}! Select difficulty and start playing.`, 'info');
    }
}

// Initialize when DOM is ready
let dailyPuzzlesManager;

document.addEventListener('DOMContentLoaded', function() {
    dailyPuzzlesManager = new DailyPuzzlesManager();

    // Make it globally accessible
    window.dailyPuzzlesManager = dailyPuzzlesManager;
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DailyPuzzlesManager;
}