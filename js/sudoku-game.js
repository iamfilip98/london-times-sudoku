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
        this.selectedCell = null;
        this.isComplete = false;
        this.startTime = null;
        this.endTime = null;
        this.elapsedTime = 0;
        this.timerInterval = null;
        this.isPaused = false;
        this.mistakes = 0;
        this.hintsUsed = 0;
        this.currentMode = 'normal'; // 'normal' or 'candidate'

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
        if (!this.selectedCell || this.isPaused || this.isComplete) return;

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
        this.selectedCell = null;
        this.isComplete = false;
        this.mistakes = 0;
        this.hintsUsed = 0;
        this.currentMode = 'normal';
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
        // Save state for undo
        this.saveState();

        // Clear any candidates for this cell
        delete this.candidates[`${row}-${col}`];

        // Check for conflicts BEFORE placing the number
        const conflicts = this.generator.getConflicts(this.currentGrid, row, col, number);

        // Set the number
        this.currentGrid[row][col] = number;

        // Real-time error checking and feedback
        if (conflicts.length > 0) {
            this.mistakes++;
            this.updateMistakesDisplay();

            // Mark the cell as error immediately
            this.markCellAsError(row, col, true);

            // Highlight all conflicting cells
            this.highlightConflicts([...conflicts, [row, col]]);

            // Show error message
            this.showErrorMessage(`Invalid placement! This number conflicts with existing numbers.`);

            // Keep error highlighting visible until the user fixes it
        } else {
            // Valid placement - clear any existing error states
            this.clearErrorHighlights();
            this.showSuccessMessage(`Good move!`);
        }

        // Update display
        this.renderCell(row, col);
        this.updateRelatedCells(row, col);

        // Auto-update candidates for related cells
        this.updateCandidatesForRelatedCells(row, col, number);

        // Check if puzzle is complete
        this.checkCompletion();
    }

    toggleCandidate(row, col, number) {
        const key = `${row}-${col}`;

        if (!this.candidates[key]) {
            this.candidates[key] = new Set();
        }

        if (this.candidates[key].has(number)) {
            this.candidates[key].delete(number);
            if (this.candidates[key].size === 0) {
                delete this.candidates[key];
            }
        } else {
            this.candidates[key].add(number);
        }

        this.renderCell(row, col);
        this.saveState();
    }

    clearCell(row, col) {
        // Can't clear given clues
        if (this.puzzle[row][col] !== this.EMPTY) return;

        this.saveState();

        if (this.currentMode === 'candidate') {
            // Clear all candidates
            delete this.candidates[`${row}-${col}`];
        } else {
            // Clear the number
            this.currentGrid[row][col] = this.EMPTY;

            // Clear error highlighting if this cell had an error
            const cell = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
            if (cell && cell.dataset.hasError) {
                cell.classList.remove('error');
                delete cell.dataset.hasError;
            }
        }

        this.renderCell(row, col);
        this.updateRelatedCells(row, col);
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
                } else if (candidates.size > 0) {
                    cellContent = `<div class="candidates">${this.generateCandidatesHTML(candidates)}</div>`;
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

    generateCandidatesHTML(candidates) {
        let html = '';
        for (let num = 1; num <= 9; num++) {
            const hasCandidate = candidates.has(num);
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

        // Update cell classes
        cell.className = [
            'sudoku-cell',
            isGiven ? 'given' : 'user-input',
            row % this.BOX_SIZE === this.BOX_SIZE - 1 && row < this.SIZE - 1 ? 'bottom-border' : '',
            col % this.BOX_SIZE === this.BOX_SIZE - 1 && col < this.SIZE - 1 ? 'right-border' : ''
        ].filter(Boolean).join(' ');

        // Update content
        if (value !== this.EMPTY) {
            cell.innerHTML = `<span class="cell-number">${value}</span>`;
        } else if (candidates.size > 0) {
            cell.innerHTML = `<div class="candidates">${this.generateCandidatesHTML(candidates)}</div>`;
        } else {
            cell.innerHTML = '';
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
            mistakes: this.mistakes,
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
                modeButton.innerHTML = '<i class="fas fa-pencil-alt"></i> Normal';
                modeButton.title = 'Currently in Normal Mode - Click for Candidate Mode';
                modeButton.classList.remove('candidate-mode');
            } else {
                modeButton.innerHTML = '<i class="fas fa-edit"></i> Candidate';
                modeButton.title = 'Currently in Candidate Mode - Click for Normal Mode';
                modeButton.classList.add('candidate-mode');
            }
        }
    }

    updateUI() {
        this.updateTimerDisplay();
        this.updateMistakesDisplay();
        this.updateModeDisplay();

        // Update button states
        const pauseButton = document.getElementById('pause-button');
        if (pauseButton) {
            pauseButton.textContent = this.isPaused ? '▶️' : '⏸️';
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

    saveState() {
        // Remove future history if we're not at the end
        if (this.historyIndex < this.history.length - 1) {
            this.history = this.history.slice(0, this.historyIndex + 1);
        }

        // Add current state
        this.history.push({
            grid: this.currentGrid.map(row => [...row]),
            candidates: JSON.parse(JSON.stringify(this.candidates)),
            mistakes: this.mistakes
        });

        // Limit history size
        if (this.history.length > this.maxHistorySize) {
            this.history.shift();
        } else {
            this.historyIndex++;
        }
    }

    undo() {
        if (this.historyIndex > 0) {
            this.historyIndex--;
            this.restoreState(this.history[this.historyIndex]);
        }
    }

    redo() {
        if (this.historyIndex < this.history.length - 1) {
            this.historyIndex++;
            this.restoreState(this.history[this.historyIndex]);
        }
    }

    restoreState(state) {
        this.currentGrid = state.grid.map(row => [...row]);
        this.candidates = JSON.parse(JSON.stringify(state.candidates));
        this.mistakes = state.mistakes;

        this.renderGrid();
        this.updateUI();

        // Restore selection if exists
        if (this.selectedCell) {
            const { row, col } = this.selectedCell;
            this.selectCell(row, col);
        }
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

        // Add 0.5 penalty for using a hint
        this.mistakes += 0.5;
        this.updateMistakesDisplay();

        if (hint.type === 'naked_single') {
            // Fill in a cell that has only one possible value
            this.currentGrid[hint.row][hint.col] = hint.value;
            this.showMessage(`Hint: This cell can only be ${hint.value} (naked single) - 0.5 mistake penalty`, 'success');
        } else if (hint.type === 'hidden_single') {
            // Fill in a cell where a number can only go in one place
            this.currentGrid[hint.row][hint.col] = hint.value;
            this.showMessage(`Hint: ${hint.value} can only go here in this ${hint.region} - 0.5 mistake penalty`, 'success');
        } else if (hint.type === 'candidate_elimination') {
            // Show candidates for a specific cell
            this.addCandidatesForCell(hint.row, hint.col);
            this.showMessage(`Hint: Consider these possible numbers for this cell - 0.5 mistake penalty`, 'info');
        } else if (hint.type === 'easy_fill') {
            // Last resort - fill an easy cell
            this.currentGrid[hint.row][hint.col] = hint.value;
            this.showMessage(`Hint: Try this number here - 0.5 mistake penalty`, 'success');
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

        // Auto-hide after 3 seconds
        setTimeout(() => {
            messageEl.classList.remove('visible');
        }, 3000);
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
        });
        document.querySelectorAll('.sudoku-cell.conflict').forEach(cell => {
            cell.classList.remove('conflict');
        });
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
        this.selectedCell = null;
        this.isComplete = false;
        this.mistakes = 0;
        this.hintsUsed = 0;
        this.isPaused = false;
        this.currentMode = 'normal';

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
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SudokuGame;
}