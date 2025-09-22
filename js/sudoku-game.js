class SudokuGame {
    constructor() {
        this.SIZE = 9;
        this.BOX_SIZE = 3;
        this.EMPTY = 0;

        // Game state
        this.puzzle = null;
        this.solution = null;
        this.currentGrid = null;
        this.candidates = {}; // For pencil marks
        this.userCandidates = {}; // Track manually entered candidates separately
        this.selectedCell = null;
        this.isComplete = false;
        this.startTime = null;
        this.endTime = null;
        this.elapsedTime = 0;
        this.timerInterval = null;
        this.isPaused = false;
        this.mistakes = 0; // UI-displayed error count
        this.scoreCalculationMistakes = 0; // Total mistakes including hint penalties for scoring
        this.hintsUsed = 0;
        this.currentMode = 'normal'; // 'normal' or 'candidate'
        this.globalCandidatesVisible = false;

        // History for undo/redo
        this.history = [];
        this.historyIndex = -1;
        this.maxHistorySize = 50;

        // Game settings
        this.difficulty = 'medium';
        this.currentPlayer = 'faidao';

        // Initialize generator
        this.generator = new SudokuGenerator();

        this.init();
    }

    init() {
        this.setupEventListeners();
        this.createGameInterface();
    }

    setupEventListeners() {
        // Keyboard events
        document.addEventListener('keydown', (e) => this.handleKeyPress(e));

        // Prevent default space bar scrolling
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space' && e.target === document.body) {
                e.preventDefault();
            }
        });
    }

    createGameInterface() {
        // This will be called when the Daily Puzzles tab is activated
        // The interface will be added to the existing navigation system
    }

    handleKeyPress(e) {
        if (this.isPaused || this.isComplete) return;

        if (!this.selectedCell) {
            // Allow certain keys even without selection
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
                // If no cell selected, select the center cell
                this.selectCell(4, 4);
                return;
            }
            return;
        }

        const { row, col } = this.selectedCell;

        // Number keys (1-9)
        if (e.key >= '1' && e.key <= '9') {
            e.preventDefault();
            const number = parseInt(e.key);
            this.inputNumber(row, col, number);
        }

        // Delete/Backspace to clear cell
        else if (e.key === 'Delete' || e.key === 'Backspace') {
            e.preventDefault();
            this.clearCell(row, col);
        }

        // Enter key to toggle mode
        else if (e.key === 'Enter') {
            e.preventDefault();
            this.toggleMode();
        }

        // Arrow keys for navigation
        else if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
            e.preventDefault();
            this.navigateWithArrows(e.key);
        }

        // Spacebar for notes (alternative to Enter)
        else if (e.key === ' ') {
            e.preventDefault();
            this.toggleMode();
        }

        // Undo (Ctrl+Z)
        else if (e.key === 'z' && (e.ctrlKey || e.metaKey) && !e.shiftKey) {
            e.preventDefault();
            this.undo();
        }

        // Redo (Ctrl+Shift+Z or Ctrl+Y)
        else if (((e.key === 'z' && e.shiftKey) || e.key === 'y') && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            this.redo();
        }
    }

    navigateWithArrows(direction) {
        if (!this.selectedCell) return;

        let { row, col } = this.selectedCell;

        switch (direction) {
            case 'ArrowUp':
                row = Math.max(0, row - 1);
                break;
            case 'ArrowDown':
                row = Math.min(8, row + 1);
                break;
            case 'ArrowLeft':
                col = Math.max(0, col - 1);
                break;
            case 'ArrowRight':
                col = Math.min(8, col + 1);
                break;
        }

        this.selectCell(row, col);
    }

    startNewGame(difficulty = 'medium', date = null) {
        this.difficulty = difficulty;
        const gameDate = date || new Date().toISOString().split('T')[0];

        // Generate puzzle
        const puzzleData = this.generator.generateDailyPuzzle(gameDate, difficulty);
        this.puzzle = puzzleData.puzzle;
        this.solution = puzzleData.solution;

        // Initialize game state
        this.currentGrid = this.puzzle.map(row => [...row]);
        this.candidates = {};
        this.userCandidates = {};
        this.selectedCell = null;
        this.isComplete = false;
        this.mistakes = 0;
        this.scoreCalculationMistakes = 0;
        this.hintsUsed = 0;
        this.currentMode = 'normal';
        this.globalCandidatesVisible = false;
        this.isPaused = false;

        // Auto-generate candidates for Medium and Hard difficulty
        if (difficulty === 'medium' || difficulty === 'hard') {
            this.generateInitialCandidates();
        }

        // Reset history
        this.history = [];
        this.historyIndex = -1;
        this.saveState();

        // Start timer
        this.startTime = Date.now();
        this.endTime = null;
        this.elapsedTime = 0;
        this.startTimer();

        // Update display
        this.renderGrid();
        this.updateUI();

        return puzzleData;
    }

    inputNumber(row, col, number) {
        // Can't modify given clues
        if (this.puzzle[row][col] !== this.EMPTY) return;

        if (this.currentMode === 'candidate') {
            this.toggleCandidate(row, col, number);
        } else {
            this.setNumber(row, col, number);
        }
    }

    setNumber(row, col, number) {
        // Check for conflicts and correctness BEFORE making any changes
        const conflicts = this.generator.getConflicts(this.currentGrid, row, col, number);
        const isCorrectSolution = this.solution && this.solution[row][col] === number;
        const hasConflicts = conflicts.length > 0;

        // Save state for undo before placing any number (valid or invalid)
        this.saveState(true);

        // Clear any candidates for this cell
        delete this.candidates[`${row}-${col}`];

        // Set the number (allow both valid and invalid placements)
        this.currentGrid[row][col] = number;

        // Always clear any previous error state first
        this.clearCellError(row, col);

        // Handle errors and feedback
        if (hasConflicts || !isCorrectSolution) {
            // Count as mistake and show error
            this.mistakes++;
            this.scoreCalculationMistakes++;
            this.updateMistakesDisplay();

            // Mark the cell as error with red highlighting
            this.markCellAsError(row, col, true);

            // Show appropriate error message
            if (hasConflicts) {
                this.showErrorMessage(`Invalid placement! This number conflicts with existing numbers.`);
                // Highlight conflicting cells temporarily
                this.highlightConflicts([...conflicts, [row, col]]);
            } else {
                this.showErrorMessage(`Incorrect number! This is not the solution for this cell.`);
            }
        } else {
            // Valid placement - error state already cleared above
            this.showSuccessMessage(`Good move!`);
        }

        // Update display
        this.renderCell(row, col);
        this.updateRelatedCells(row, col);

        // Auto-update candidates for related cells
        this.updateCandidatesForRelatedCells(row, col, number);

        // Update number buttons immediately
        this.updateNumberButtons();

        // Check if puzzle is complete
        this.checkCompletion();
    }

    toggleCandidate(row, col, number) {
        // Can't modify given clues or cells with values
        if (this.puzzle[row][col] !== this.EMPTY) {
            this.showMessage('Cannot edit candidates for given numbers', 'info');
            return;
        }

        if (this.currentGrid[row][col] !== this.EMPTY) {
            this.showMessage('Cannot edit candidates when cell has a number', 'info');
            return;
        }

        // Save state before making changes to candidates
        this.saveState(false);

        const key = `${row}-${col}`;

        if (!this.candidates[key]) {
            this.candidates[key] = new Set();
        }
        if (!this.userCandidates[key]) {
            this.userCandidates[key] = new Set();
        }

        if (this.candidates[key].has(number)) {
            this.candidates[key].delete(number);
            this.userCandidates[key].delete(number);
            if (this.candidates[key].size === 0) {
                delete this.candidates[key];
            }
            if (this.userCandidates[key].size === 0) {
                delete this.userCandidates[key];
            }
            this.showMessage(`Candidate ${number} removed`, 'success');
        } else {
            this.candidates[key].add(number);
            this.userCandidates[key].add(number);
            this.showMessage(`Candidate ${number} added`, 'success');
        }

        this.renderCell(row, col);
    }

    clearCell(row, col) {
        // Can't clear given clues
        if (this.puzzle[row][col] !== this.EMPTY) {
            this.showMessage('Cannot clear given numbers', 'info');
            return;
        }

        // Check if there's anything to clear
        const hasNumber = this.currentGrid[row][col] !== this.EMPTY;
        const hasCandidates = this.candidates[`${row}-${col}`] && this.candidates[`${row}-${col}`].size > 0;

        if (!hasNumber && !hasCandidates) {
            this.showMessage('Cell is already empty', 'info');
            return;
        }

        if (this.currentMode === 'candidate') {
            // Clear all candidates (don't save as number entry)
            if (hasCandidates) {
                this.saveState(false);
                delete this.candidates[`${row}-${col}`];
                delete this.userCandidates[`${row}-${col}`];
                this.showMessage('Candidates cleared', 'success');
            }
        } else {
            // Clear the number (save as number entry since it affects the number grid)
            if (hasNumber) {
                this.saveState(true);
                this.currentGrid[row][col] = this.EMPTY;

                // Clear error highlighting if this cell had an error
                const cell = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
                if (cell && cell.dataset.hasError) {
                    cell.classList.remove('error');
                    delete cell.dataset.hasError;
                }

                this.showMessage('Number cleared', 'success');
            }
        }

        this.renderCell(row, col);
        this.updateRelatedCells(row, col);

        // Update number buttons when clearing numbers
        if (this.currentMode !== 'candidate') {
            this.updateNumberButtons();
        }
    }

    toggleMode() {
        this.currentMode = this.currentMode === 'normal' ? 'candidate' : 'normal';
        this.updateModeDisplay();
    }

    selectCell(row, col) {
        // Clear previous selection
        if (this.selectedCell) {
            this.clearHighlights();
        }

        this.selectedCell = { row, col };
        this.highlightCell(row, col);
        this.highlightRelated(row, col);
    }

    highlightCell(row, col) {
        const cell = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
        if (cell) {
            cell.classList.add('selected');
        }
    }

    highlightRelated(row, col) {
        // Highlight row, column, and box
        for (let i = 0; i < this.SIZE; i++) {
            // Row
            const rowCell = document.querySelector(`[data-row="${row}"][data-col="${i}"]`);
            if (rowCell) rowCell.classList.add('related');

            // Column
            const colCell = document.querySelector(`[data-row="${i}"][data-col="${col}"]`);
            if (colCell) colCell.classList.add('related');
        }

        // Box
        const boxStartRow = Math.floor(row / this.BOX_SIZE) * this.BOX_SIZE;
        const boxStartCol = Math.floor(col / this.BOX_SIZE) * this.BOX_SIZE;

        for (let r = boxStartRow; r < boxStartRow + this.BOX_SIZE; r++) {
            for (let c = boxStartCol; c < boxStartCol + this.BOX_SIZE; c++) {
                const boxCell = document.querySelector(`[data-row="${r}"][data-col="${c}"]`);
                if (boxCell) boxCell.classList.add('related');
            }
        }

        // Highlight cells with same number
        const currentValue = this.currentGrid[row][col];
        if (currentValue !== this.EMPTY) {
            this.highlightSameNumbers(currentValue);
        }
    }

    highlightSameNumbers(number) {
        // Highlight all cells with the same number across the entire grid
        for (let r = 0; r < this.SIZE; r++) {
            for (let c = 0; c < this.SIZE; c++) {
                if (this.currentGrid[r][c] === number) {
                    const sameCell = document.querySelector(`[data-row="${r}"][data-col="${c}"]`);
                    if (sameCell) {
                        sameCell.classList.add('same-number');
                    }
                }
            }
        }
    }

    clearHighlights() {
        document.querySelectorAll('.sudoku-cell').forEach(cell => {
            cell.classList.remove('selected', 'related', 'same-number', 'conflict');
            // Don't remove 'error' class here - let it persist until fixed
        });
    }

    highlightConflicts(positions) {
        positions.forEach(([row, col]) => {
            const cell = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
            if (cell) {
                cell.classList.add('conflict');
                // Remove highlight after animation
                setTimeout(() => cell.classList.remove('conflict'), 1000);
            }
        });
    }

    renderGrid() {
        const container = document.getElementById('sudoku-grid-container');
        if (!container) {
            console.error('Sudoku grid container not found!');
            return;
        }

        if (!this.currentGrid) {
            console.error('No current grid to render!');
            return;
        }

        container.innerHTML = `
            <div class="sudoku-grid" id="sudoku-grid">
                ${this.generateGridHTML()}
            </div>
        `;

        // Add click listeners to cells
        document.querySelectorAll('.sudoku-cell').forEach(cell => {
            cell.addEventListener('click', () => {
                const row = parseInt(cell.dataset.row);
                const col = parseInt(cell.dataset.col);
                this.selectCell(row, col);
            });
        });

        console.log('Grid rendered successfully');
    }

    generateGridHTML() {
        let html = '';
        console.log('Generating grid HTML. Current grid:', this.currentGrid);

        for (let row = 0; row < this.SIZE; row++) {
            for (let col = 0; col < this.SIZE; col++) {
                const value = this.currentGrid[row][col];
                const isGiven = this.puzzle[row][col] !== this.EMPTY;
                const candidates = this.candidates[`${row}-${col}`] || new Set();

                const cellClasses = [
                    'sudoku-cell',
                    isGiven ? 'given' : 'user-input',
                    row % this.BOX_SIZE === this.BOX_SIZE - 1 && row < this.SIZE - 1 ? 'bottom-border' : '',
                    col % this.BOX_SIZE === this.BOX_SIZE - 1 && col < this.SIZE - 1 ? 'right-border' : ''
                ].filter(Boolean).join(' ');

                let cellContent = '';

                if (value !== this.EMPTY) {
                    cellContent = `<span class="cell-number">${value}</span>`;
                } else {
                    // Always include candidates div to prevent layout shifts
                    cellContent = `<div class="candidates">${this.generateCandidatesHTML(candidates, row, col)}</div>`;
                }

                html += `
                    <div class="${cellClasses}"
                         data-row="${row}"
                         data-col="${col}">
                        ${cellContent}
                    </div>
                `;
            }
        }

        console.log('Generated HTML length:', html.length);
        return html;
    }

    generateCandidatesHTML(candidates, row, col) {
        let html = '';

        // Determine what candidates to show
        let candidatesToShow = new Set(candidates);

        // If global candidates are visible and this cell is empty, add auto-generated possibilities
        // but preserve any manually entered candidates
        if (this.globalCandidatesVisible && this.currentGrid[row][col] === this.EMPTY) {
            const possibleValues = this.getPossibleValues(row, col);
            // Merge user candidates with auto-generated candidates
            possibleValues.forEach(num => candidatesToShow.add(num));
        }

        for (let num = 1; num <= 9; num++) {
            const hasCandidate = candidatesToShow.has(num);
            html += `<span class="candidate ${hasCandidate ? 'active' : ''}">${hasCandidate ? num : ''}</span>`;
        }
        return html;
    }

    renderCell(row, col) {
        const cell = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
        if (!cell) return;

        const value = this.currentGrid[row][col];
        const isGiven = this.puzzle[row][col] !== this.EMPTY;
        const candidates = this.candidates[`${row}-${col}`] || new Set();

        // Preserve existing error state and other dynamic classes
        const hasError = cell.classList.contains('error');
        const hasConflict = cell.classList.contains('conflict');
        const isSelected = cell.classList.contains('selected');
        const isRelated = cell.classList.contains('related');
        const isSameNumber = cell.classList.contains('same-number');

        // Update base cell classes
        const baseClasses = [
            'sudoku-cell',
            isGiven ? 'given' : 'user-input',
            row % this.BOX_SIZE === this.BOX_SIZE - 1 && row < this.SIZE - 1 ? 'bottom-border' : '',
            col % this.BOX_SIZE === this.BOX_SIZE - 1 && col < this.SIZE - 1 ? 'right-border' : ''
        ].filter(Boolean);

        // Preserve dynamic states
        if (hasError) baseClasses.push('error');
        if (hasConflict) baseClasses.push('conflict');
        if (isSelected) baseClasses.push('selected');
        if (isRelated) baseClasses.push('related');
        if (isSameNumber) baseClasses.push('same-number');

        cell.className = baseClasses.join(' ');

        // Update content
        if (value !== this.EMPTY) {
            cell.innerHTML = `<span class="cell-number">${value}</span>`;
        } else {
            // Always include candidates div to prevent layout shifts
            cell.innerHTML = `<div class="candidates">${this.generateCandidatesHTML(candidates, row, col)}</div>`;
        }
    }

    updateRelatedCells(row, col) {
        // Clear and re-highlight if this cell is selected
        if (this.selectedCell && this.selectedCell.row === row && this.selectedCell.col === col) {
            this.clearHighlights();
            this.highlightCell(row, col);
            this.highlightRelated(row, col);
        }
    }

    checkCompletion() {
        // Check if all cells are filled
        for (let row = 0; row < this.SIZE; row++) {
            for (let col = 0; col < this.SIZE; col++) {
                if (this.currentGrid[row][col] === this.EMPTY) {
                    return false;
                }
            }
        }

        // Check if solution is valid
        if (this.generator.isValidSolution(this.currentGrid)) {
            this.completeGame();
            return true;
        }

        return false;
    }

    completeGame() {
        this.isComplete = true;
        this.endTime = Date.now();
        this.stopTimer();

        // Calculate final time
        const totalTime = Math.floor((this.endTime - this.startTime) / 1000);

        // Show completion animation
        this.showCompletionAnimation();

        // Save game result
        this.saveGameResult(totalTime);

        // Update UI
        this.updateUI();
    }

    showCompletionAnimation() {
        // Add celebration class to grid
        const grid = document.getElementById('sudoku-grid');
        if (grid) {
            grid.classList.add('completed');

            // Remove after animation
            setTimeout(() => {
                grid.classList.remove('completed');
            }, 2000);
        }

        // Show completion message
        const message = `🎉 Congratulations! Puzzle completed in ${this.formatTime(this.getElapsedTime())}!`;
        this.showMessage(message, 'success');
    }

    saveGameResult(totalTime) {
        const result = {
            date: new Date().toISOString().split('T')[0],
            difficulty: this.difficulty,
            player: this.currentPlayer,
            time: totalTime,
            mistakes: this.scoreCalculationMistakes, // Use score calculation mistakes for final score
            hintsUsed: this.hintsUsed,
            completed: true
        };

        // Call the daily puzzles manager to record the result
        if (window.dailyPuzzlesManager) {
            window.dailyPuzzlesManager.recordGameResult(result);
        }
    }

    startTimer() {
        this.timerInterval = setInterval(() => {
            if (!this.isPaused && !this.isComplete) {
                this.elapsedTime = Date.now() - this.startTime;
                this.updateTimerDisplay();
            }
        }, 1000);
    }

    stopTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    }

    pauseGame() {
        this.isPaused = true;
        this.updateUI();
        this.showPauseOverlay();
    }

    resumeGame() {
        this.isPaused = false;
        this.startTime = Date.now() - this.elapsedTime;
        this.hidePauseOverlay();
        this.updateUI();
    }

    showPauseOverlay() {
        const overlay = document.getElementById('pause-overlay');
        if (overlay) {
            overlay.classList.add('visible');
        }
    }

    hidePauseOverlay() {
        const overlay = document.getElementById('pause-overlay');
        if (overlay) {
            overlay.classList.remove('visible');
        }
    }

    getElapsedTime() {
        if (this.isComplete && this.endTime) {
            return Math.floor((this.endTime - this.startTime) / 1000);
        }
        return Math.floor(this.elapsedTime / 1000);
    }

    formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }

    updateTimerDisplay() {
        const timerElement = document.getElementById('game-timer');
        if (timerElement) {
            timerElement.textContent = this.formatTime(this.getElapsedTime());
        }
    }

    updateMistakesDisplay() {
        const mistakesElement = document.getElementById('mistakes-count');
        if (mistakesElement) {
            // Display decimal values properly (e.g., 1.5 instead of 1.5000000001)
            mistakesElement.textContent = Number(this.mistakes.toFixed(1));
        }
    }

    updateModeDisplay() {
        const modeButton = document.getElementById('mode-toggle');
        if (modeButton) {
            if (this.currentMode === 'normal') {
                modeButton.innerHTML = '<i class="fas fa-edit"></i> Normal';
                modeButton.title = 'Currently in Normal Mode - Click for Candidate Mode';
                modeButton.classList.remove('candidate-mode');
            } else {
                modeButton.innerHTML = '<i class="fas fa-pencil-alt"></i> Candidate';
                modeButton.title = 'Currently in Candidate Mode - Click for Normal Mode';
                modeButton.classList.add('candidate-mode');
            }
        }
    }

    updateUI() {
        this.updateTimerDisplay();
        this.updateMistakesDisplay();
        this.updateModeDisplay();
        this.updateGlobalCandidatesButton();

        // Update button states
        const pauseButton = document.getElementById('pause-button');
        if (pauseButton) {
            if (this.isPaused) {
                pauseButton.innerHTML = '<i class="fas fa-play"></i>';
                pauseButton.title = 'Resume Game';
            } else {
                pauseButton.innerHTML = '<i class="fas fa-pause"></i>';
                pauseButton.title = 'Pause Game';
            }
            pauseButton.disabled = this.isComplete;
        }

        // Update number buttons
        this.updateNumberButtons();
    }

    updateNumberButtons() {
        for (let num = 1; num <= 9; num++) {
            const button = document.getElementById(`number-${num}`);
            if (button) {
                // Count how many times this number appears in the grid
                let count = 0;
                for (let row = 0; row < this.SIZE; row++) {
                    for (let col = 0; col < this.SIZE; col++) {
                        if (this.currentGrid[row][col] === num) {
                            count++;
                        }
                    }
                }

                // Disable if number is complete (appears 9 times)
                button.disabled = count >= 9 || this.isComplete;
                button.classList.toggle('completed', count >= 9);
            }
        }
    }

    saveState(isNumberEntry = false) {
        // Remove future history if we're not at the end
        if (this.historyIndex < this.history.length - 1) {
            this.history = this.history.slice(0, this.historyIndex + 1);
        }

        // Add current state
        this.history.push({
            grid: this.currentGrid.map(row => [...row]),
            candidates: JSON.parse(JSON.stringify(this.candidates)),
            userCandidates: JSON.parse(JSON.stringify(this.userCandidates)),
            mistakes: this.mistakes,
            scoreCalculationMistakes: this.scoreCalculationMistakes,
            isNumberEntry: isNumberEntry
        });

        // Limit history size
        if (this.history.length > this.maxHistorySize) {
            this.history.shift();
        } else {
            this.historyIndex++;
        }

    }

    undo() {
        // Undo exactly one action at a time
        // Check if we have a previous state to restore
        if (this.historyIndex > 0) {
            // Move back to the previous state
            this.historyIndex--;
            const previousState = this.history[this.historyIndex];
            this.restoreState(previousState);
            this.showMessage('Move undone', 'success');
        } else {
            this.showMessage('Nothing to undo', 'info');
        }
    }

    redo() {
        if (this.historyIndex < this.history.length - 1) {
            this.historyIndex++;
            this.restoreState(this.history[this.historyIndex]);
            this.showMessage('Move redone', 'success');
        } else {
            this.showMessage('Nothing to redo', 'info');
        }
    }

    restoreState(state) {
        // Restore complete game state
        this.currentGrid = state.grid.map(row => [...row]);
        this.candidates = JSON.parse(JSON.stringify(state.candidates));
        this.userCandidates = JSON.parse(JSON.stringify(state.userCandidates || {})); // Fallback for old saves
        this.mistakes = state.mistakes;
        this.scoreCalculationMistakes = state.scoreCalculationMistakes || state.mistakes; // Fallback for old saves

        // Clear all error highlights when restoring state
        this.clearErrorHighlights();

        // Re-render everything to ensure consistency
        this.renderGrid();
        this.updateUI();

        // Update number buttons to reflect current state
        this.updateNumberButtons();

        // Restore selection if exists
        if (this.selectedCell) {
            const { row, col } = this.selectedCell;
            this.selectCell(row, col);
        }

        console.log('State restored successfully:', {
            mistakes: this.mistakes,
            scoreCalculationMistakes: this.scoreCalculationMistakes
        });
    }

    getHint() {
        if (this.isComplete) return;

        const hint = this.findSmartHint();
        if (!hint) {
            this.showMessage('No hints available right now. Try filling in more numbers!', 'info');
            return;
        }

        this.saveState();
        this.hintsUsed++;

        // Add 0.5 penalty for using a hint (only affects score calculation, not UI display)
        this.scoreCalculationMistakes += 0.5;

        if (hint.type === 'naked_single') {
            // Fill in a cell that has only one possible value
            this.currentGrid[hint.row][hint.col] = hint.value;
            this.showMessage(`Hint: This cell can only be ${hint.value} (naked single)`, 'success');
        } else if (hint.type === 'hidden_single') {
            // Fill in a cell where a number can only go in one place
            this.currentGrid[hint.row][hint.col] = hint.value;
            this.showMessage(`Hint: ${hint.value} can only go here in this ${hint.region}`, 'success');
        } else if (hint.type === 'candidate_elimination') {
            // Show candidates for a specific cell
            this.addCandidatesForCell(hint.row, hint.col);
            this.showMessage(`Hint: Consider these possible numbers for this cell`, 'info');
        } else if (hint.type === 'easy_fill') {
            // Last resort - fill an easy cell
            this.currentGrid[hint.row][hint.col] = hint.value;
            this.showMessage(`Hint: Try this number here`, 'success');
        }

        this.renderCell(hint.row, hint.col);
        this.updateRelatedCells(hint.row, hint.col);
        this.updateCandidatesForRelatedCells(hint.row, hint.col, hint.value);
        this.checkCompletion();

        // Update hints display
        const hintsElement = document.getElementById('hints-used');
        if (hintsElement) {
            hintsElement.textContent = this.hintsUsed;
        }
    }

    findSmartHint() {
        // Strategy 1: Find naked singles (cells with only one possible value)
        const nakedSingle = this.findNakedSingle();
        if (nakedSingle) {
            return { ...nakedSingle, type: 'naked_single' };
        }

        // Strategy 2: Find hidden singles (numbers that can only go in one place in a region)
        const hiddenSingle = this.findHiddenSingle();
        if (hiddenSingle) {
            return { ...hiddenSingle, type: 'hidden_single' };
        }

        // Strategy 3: Help with candidate elimination
        const candidateHint = this.findCandidateHint();
        if (candidateHint) {
            return { ...candidateHint, type: 'candidate_elimination' };
        }

        // Strategy 4: As last resort, find an easy cell to fill
        const easyFill = this.findEasyFill();
        if (easyFill) {
            return { ...easyFill, type: 'easy_fill' };
        }

        return null;
    }

    findNakedSingle() {
        for (let row = 0; row < this.SIZE; row++) {
            for (let col = 0; col < this.SIZE; col++) {
                if (this.currentGrid[row][col] === this.EMPTY) {
                    const possibleValues = this.getPossibleValues(row, col);
                    if (possibleValues.length === 1) {
                        return { row, col, value: possibleValues[0] };
                    }
                }
            }
        }
        return null;
    }

    findHiddenSingle() {
        // Check each number 1-9 in each region
        for (let num = 1; num <= 9; num++) {
            // Check rows
            for (let row = 0; row < this.SIZE; row++) {
                const possibleCols = [];
                for (let col = 0; col < this.SIZE; col++) {
                    if (this.currentGrid[row][col] === this.EMPTY) {
                        const possibleValues = this.getPossibleValues(row, col);
                        if (possibleValues.includes(num)) {
                            possibleCols.push(col);
                        }
                    }
                }
                if (possibleCols.length === 1) {
                    return { row, col: possibleCols[0], value: num, region: 'row' };
                }
            }

            // Check columns
            for (let col = 0; col < this.SIZE; col++) {
                const possibleRows = [];
                for (let row = 0; row < this.SIZE; row++) {
                    if (this.currentGrid[row][col] === this.EMPTY) {
                        const possibleValues = this.getPossibleValues(row, col);
                        if (possibleValues.includes(num)) {
                            possibleRows.push(row);
                        }
                    }
                }
                if (possibleRows.length === 1) {
                    return { row: possibleRows[0], col, value: num, region: 'column' };
                }
            }

            // Check boxes
            for (let boxRow = 0; boxRow < 3; boxRow++) {
                for (let boxCol = 0; boxCol < 3; boxCol++) {
                    const possibleCells = [];
                    for (let r = boxRow * 3; r < (boxRow + 1) * 3; r++) {
                        for (let c = boxCol * 3; c < (boxCol + 1) * 3; c++) {
                            if (this.currentGrid[r][c] === this.EMPTY) {
                                const possibleValues = this.getPossibleValues(r, c);
                                if (possibleValues.includes(num)) {
                                    possibleCells.push({ row: r, col: c });
                                }
                            }
                        }
                    }
                    if (possibleCells.length === 1) {
                        return {
                            row: possibleCells[0].row,
                            col: possibleCells[0].col,
                            value: num,
                            region: 'box'
                        };
                    }
                }
            }
        }
        return null;
    }

    findCandidateHint() {
        // Find a cell with 2-3 possible values to help with candidates
        for (let row = 0; row < this.SIZE; row++) {
            for (let col = 0; col < this.SIZE; col++) {
                if (this.currentGrid[row][col] === this.EMPTY) {
                    const possibleValues = this.getPossibleValues(row, col);
                    if (possibleValues.length >= 2 && possibleValues.length <= 3) {
                        return { row, col, candidates: possibleValues };
                    }
                }
            }
        }
        return null;
    }

    findEasyFill() {
        // Find any empty cell and provide its solution
        const solution = this.generator.solvePuzzle(this.currentGrid);
        if (!solution) return null;

        for (let row = 0; row < this.SIZE; row++) {
            for (let col = 0; col < this.SIZE; col++) {
                if (this.currentGrid[row][col] === this.EMPTY) {
                    return { row, col, value: solution[row][col] };
                }
            }
        }
        return null;
    }

    getPossibleValues(row, col) {
        const possible = [];
        for (let num = 1; num <= 9; num++) {
            const conflicts = this.generator.getConflicts(this.currentGrid, row, col, num);
            if (conflicts.length === 0) {
                possible.push(num);
            }
        }
        return possible;
    }

    addCandidatesForCell(row, col) {
        const possibleValues = this.getPossibleValues(row, col);
        const key = `${row}-${col}`;
        this.candidates[key] = new Set(possibleValues);
    }

    revealCell() {
        if (!this.selectedCell || this.isComplete) return;

        const { row, col } = this.selectedCell;
        if (this.puzzle[row][col] !== this.EMPTY) return; // Can't reveal given clues

        this.saveState();
        this.currentGrid[row][col] = this.solution[row][col];
        delete this.candidates[`${row}-${col}`];
        this.hintsUsed++;

        // Add hint penalty only to score calculation, not UI display
        this.scoreCalculationMistakes += 0.5;

        this.renderCell(row, col);
        this.updateRelatedCells(row, col);
        this.checkCompletion();
        this.updateUI();
    }

    showMessage(message, type = 'info') {
        // Create or update message element
        let messageEl = document.getElementById('game-message');
        if (!messageEl) {
            messageEl = document.createElement('div');
            messageEl.id = 'game-message';
            messageEl.className = 'game-message';
            document.body.appendChild(messageEl);
        }

        messageEl.textContent = message;
        messageEl.className = `game-message ${type} visible`;

        // Auto-hide after 4 seconds for hint messages, 3 for others
        const hideTime = message.includes('Hint:') || message.includes('hint') ? 4000 : 3000;
        setTimeout(() => {
            messageEl.classList.remove('visible');
        }, hideTime);
    }

    showErrorMessage(message) {
        this.showMessage(message, 'error');
    }

    showSuccessMessage(message) {
        this.showMessage(message, 'success');
    }

    markCellAsError(row, col, persistent = false) {
        const cell = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
        if (cell) {
            cell.classList.add('error');

            // Store error state for this cell
            if (persistent) {
                cell.dataset.hasError = 'true';
            }
        }
    }

    clearErrorHighlights() {
        document.querySelectorAll('.sudoku-cell.error').forEach(cell => {
            cell.classList.remove('error');
            delete cell.dataset.hasError;
        });
        document.querySelectorAll('.sudoku-cell.conflict').forEach(cell => {
            cell.classList.remove('conflict');
        });
    }

    clearCellError(row, col) {
        const cell = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
        if (cell) {
            cell.classList.remove('error', 'conflict');
            delete cell.dataset.hasError;
        }
    }

    updateCandidatesForRelatedCells(row, col, number) {
        // Remove this number from candidates in related cells
        for (let i = 0; i < this.SIZE; i++) {
            // Row
            const rowKey = `${row}-${i}`;
            if (this.candidates[rowKey]) {
                this.candidates[rowKey].delete(number);
                if (this.candidates[rowKey].size === 0) {
                    delete this.candidates[rowKey];
                }
                this.renderCell(row, i);
            }

            // Column
            const colKey = `${i}-${col}`;
            if (this.candidates[colKey]) {
                this.candidates[colKey].delete(number);
                if (this.candidates[colKey].size === 0) {
                    delete this.candidates[colKey];
                }
                this.renderCell(i, col);
            }
        }

        // Box
        const boxStartRow = Math.floor(row / this.BOX_SIZE) * this.BOX_SIZE;
        const boxStartCol = Math.floor(col / this.BOX_SIZE) * this.BOX_SIZE;

        for (let r = boxStartRow; r < boxStartRow + this.BOX_SIZE; r++) {
            for (let c = boxStartCol; c < boxStartCol + this.BOX_SIZE; c++) {
                const boxKey = `${r}-${c}`;
                if (this.candidates[boxKey]) {
                    this.candidates[boxKey].delete(number);
                    if (this.candidates[boxKey].size === 0) {
                        delete this.candidates[boxKey];
                    }
                    this.renderCell(r, c);
                }
            }
        }
    }

    setPlayer(player) {
        this.currentPlayer = player;
    }

    generateInitialCandidates() {
        // Generate candidates for all empty cells
        for (let row = 0; row < this.SIZE; row++) {
            for (let col = 0; col < this.SIZE; col++) {
                if (this.currentGrid[row][col] === this.EMPTY) {
                    const possibleValues = this.getPossibleValues(row, col);
                    if (possibleValues.length > 0) {
                        const key = `${row}-${col}`;
                        this.candidates[key] = new Set(possibleValues);
                    }
                }
            }
        }
    }

    resetGame() {
        this.stopTimer();
        this.currentGrid = this.puzzle.map(row => [...row]);
        this.candidates = {};
        this.userCandidates = {};
        this.selectedCell = null;
        this.isComplete = false;
        this.mistakes = 0;
        this.scoreCalculationMistakes = 0;
        this.hintsUsed = 0;
        this.isPaused = false;
        this.currentMode = 'normal';
        this.globalCandidatesVisible = false;

        // Auto-generate candidates for Medium and Hard difficulty
        if (this.difficulty === 'medium' || this.difficulty === 'hard') {
            this.generateInitialCandidates();
        }

        // Reset history
        this.history = [];
        this.historyIndex = -1;
        this.saveState();

        // Restart timer
        this.startTime = Date.now();
        this.elapsedTime = 0;
        this.startTimer();

        this.renderGrid();
        this.updateUI();
    }

    toggleGlobalCandidates() {
        // Toggle visibility without affecting game state or undo history
        this.globalCandidatesVisible = !this.globalCandidatesVisible;
        this.updateGlobalCandidatesButton();
        this.renderGrid();
    }


    updateGlobalCandidatesButton() {
        const button = document.getElementById('global-candidates-button');
        if (button) {
            if (this.globalCandidatesVisible) {
                button.innerHTML = '<i class="fas fa-eye-slash"></i> Hide All Candidates';
                button.classList.add('active');
            } else {
                button.innerHTML = '<i class="fas fa-eye"></i> Show All Candidates';
                button.classList.remove('active');
            }
        }
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SudokuGame;
}