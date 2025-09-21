class SudokuGenerator {
    constructor() {
        this.SIZE = 9;
        this.BOX_SIZE = 3;
        this.EMPTY = 0;

        // Difficulty settings for puzzle generation
        this.DIFFICULTY_SETTINGS = {
            easy: { clues: 40, minClues: 35 },
            medium: { clues: 32, minClues: 28 },
            hard: { clues: 26, minClues: 22 }
        };
    }

    // Generate a daily puzzle based on date and difficulty
    generateDailyPuzzle(date, difficulty = 'medium') {
        // Create deterministic seed from date
        const seed = this.createSeedFromDate(date);
        this.random = this.createSeededRandom(seed);

        // Generate a complete valid Sudoku grid
        const solution = this.generateCompleteGrid();

        // Create puzzle by removing numbers
        const puzzle = this.createPuzzle(solution, difficulty);

        return {
            puzzle,
            solution,
            difficulty,
            date,
            seed
        };
    }

    createSeedFromDate(dateString) {
        // Convert date to a deterministic integer seed
        const date = new Date(dateString);
        const year = date.getFullYear();
        const month = date.getMonth() + 1;
        const day = date.getDate();

        // Create unique seed that will be same for same date
        return (year * 10000) + (month * 100) + day;
    }

    createSeededRandom(seed) {
        // Linear Congruential Generator for predictable randomness
        let current = seed % 2147483647;
        return function() {
            current = (current * 16807) % 2147483647;
            return (current - 1) / 2147483646;
        };
    }

    generateCompleteGrid() {
        const grid = Array(this.SIZE).fill().map(() => Array(this.SIZE).fill(this.EMPTY));

        // Fill the grid using backtracking
        this.fillGrid(grid);
        return grid;
    }

    fillGrid(grid) {
        // Fill the diagonal 3x3 boxes first (they don't affect each other)
        for (let i = 0; i < this.SIZE; i += this.BOX_SIZE) {
            this.fillBox(grid, i, i);
        }

        // Fill remaining cells
        this.fillRemaining(grid, 0, this.BOX_SIZE);
        return true;
    }

    fillBox(grid, row, col) {
        const numbers = this.shuffleArray([1, 2, 3, 4, 5, 6, 7, 8, 9]);
        let index = 0;

        for (let i = 0; i < this.BOX_SIZE; i++) {
            for (let j = 0; j < this.BOX_SIZE; j++) {
                grid[row + i][col + j] = numbers[index++];
            }
        }
    }

    fillRemaining(grid, i, j) {
        if (j >= this.SIZE && i < this.SIZE - 1) {
            i++;
            j = 0;
        }

        if (i >= this.SIZE && j >= this.SIZE) {
            return true;
        }

        if (i < this.BOX_SIZE) {
            if (j < this.BOX_SIZE) {
                j = this.BOX_SIZE;
            }
        } else if (i < this.SIZE - this.BOX_SIZE) {
            if (j === Math.floor(i / this.BOX_SIZE) * this.BOX_SIZE) {
                j += this.BOX_SIZE;
            }
        } else {
            if (j === this.SIZE - this.BOX_SIZE) {
                i++;
                j = 0;
                if (i >= this.SIZE) {
                    return true;
                }
            }
        }

        for (let num = 1; num <= this.SIZE; num++) {
            if (this.isSafe(grid, i, j, num)) {
                grid[i][j] = num;
                if (this.fillRemaining(grid, i, j + 1)) {
                    return true;
                }
                grid[i][j] = this.EMPTY;
            }
        }

        return false;
    }

    isSafe(grid, row, col, num) {
        return this.isRowSafe(grid, row, num) &&
               this.isColSafe(grid, col, num) &&
               this.isBoxSafe(grid, row - (row % this.BOX_SIZE), col - (col % this.BOX_SIZE), num);
    }

    isRowSafe(grid, row, num) {
        for (let col = 0; col < this.SIZE; col++) {
            if (grid[row][col] === num) {
                return false;
            }
        }
        return true;
    }

    isColSafe(grid, col, num) {
        for (let row = 0; row < this.SIZE; row++) {
            if (grid[row][col] === num) {
                return false;
            }
        }
        return true;
    }

    isBoxSafe(grid, boxStartRow, boxStartCol, num) {
        for (let row = 0; row < this.BOX_SIZE; row++) {
            for (let col = 0; col < this.BOX_SIZE; col++) {
                if (grid[row + boxStartRow][col + boxStartCol] === num) {
                    return false;
                }
            }
        }
        return true;
    }

    createPuzzle(solution, difficulty) {
        const puzzle = solution.map(row => [...row]);
        const settings = this.DIFFICULTY_SETTINGS[difficulty];

        // Get all cell positions
        const positions = [];
        for (let i = 0; i < this.SIZE; i++) {
            for (let j = 0; j < this.SIZE; j++) {
                positions.push([i, j]);
            }
        }

        // Shuffle positions to remove numbers randomly
        this.shuffleArray(positions);

        let cluesCount = 81; // Start with full grid
        const targetClues = settings.clues + Math.floor(this.random() * (settings.minClues - settings.clues));

        for (const [row, col] of positions) {
            if (cluesCount <= targetClues) break;

            // Try removing this number
            const backup = puzzle[row][col];
            puzzle[row][col] = this.EMPTY;

            // Check if puzzle still has unique solution
            if (this.hasUniqueSolution(puzzle)) {
                cluesCount--;
            } else {
                // Restore the number if removing it creates multiple solutions
                puzzle[row][col] = backup;
            }
        }

        return puzzle;
    }

    hasUniqueSolution(puzzle) {
        const testGrid = puzzle.map(row => [...row]);
        const solutions = [];

        this.findAllSolutions(testGrid, solutions, 2); // Stop after finding 2 solutions
        return solutions.length === 1;
    }

    findAllSolutions(grid, solutions, maxSolutions) {
        if (solutions.length >= maxSolutions) return;

        const emptyCell = this.findEmptyCell(grid);
        if (!emptyCell) {
            solutions.push(grid.map(row => [...row]));
            return;
        }

        const [row, col] = emptyCell;

        for (let num = 1; num <= 9; num++) {
            if (this.isSafe(grid, row, col, num)) {
                grid[row][col] = num;
                this.findAllSolutions(grid, solutions, maxSolutions);
                grid[row][col] = this.EMPTY;

                if (solutions.length >= maxSolutions) return;
            }
        }
    }

    findEmptyCell(grid) {
        for (let row = 0; row < this.SIZE; row++) {
            for (let col = 0; col < this.SIZE; col++) {
                if (grid[row][col] === this.EMPTY) {
                    return [row, col];
                }
            }
        }
        return null;
    }

    shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(this.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    // Validate a completed grid
    isValidSolution(grid) {
        // Check all rows
        for (let row = 0; row < this.SIZE; row++) {
            const rowSet = new Set();
            for (let col = 0; col < this.SIZE; col++) {
                const value = grid[row][col];
                if (value < 1 || value > 9 || rowSet.has(value)) {
                    return false;
                }
                rowSet.add(value);
            }
        }

        // Check all columns
        for (let col = 0; col < this.SIZE; col++) {
            const colSet = new Set();
            for (let row = 0; row < this.SIZE; row++) {
                const value = grid[row][col];
                if (colSet.has(value)) {
                    return false;
                }
                colSet.add(value);
            }
        }

        // Check all 3x3 boxes
        for (let boxRow = 0; boxRow < this.SIZE; boxRow += this.BOX_SIZE) {
            for (let boxCol = 0; boxCol < this.SIZE; boxCol += this.BOX_SIZE) {
                const boxSet = new Set();
                for (let row = boxRow; row < boxRow + this.BOX_SIZE; row++) {
                    for (let col = boxCol; col < boxCol + this.BOX_SIZE; col++) {
                        const value = grid[row][col];
                        if (boxSet.has(value)) {
                            return false;
                        }
                        boxSet.add(value);
                    }
                }
            }
        }

        return true;
    }

    // Get conflicts for a specific cell
    getConflicts(grid, row, col, value) {
        const conflicts = [];

        // Check row conflicts
        for (let c = 0; c < this.SIZE; c++) {
            if (c !== col && grid[row][c] === value) {
                conflicts.push([row, c]);
            }
        }

        // Check column conflicts
        for (let r = 0; r < this.SIZE; r++) {
            if (r !== row && grid[r][col] === value) {
                conflicts.push([r, col]);
            }
        }

        // Check box conflicts
        const boxStartRow = Math.floor(row / this.BOX_SIZE) * this.BOX_SIZE;
        const boxStartCol = Math.floor(col / this.BOX_SIZE) * this.BOX_SIZE;

        for (let r = boxStartRow; r < boxStartRow + this.BOX_SIZE; r++) {
            for (let c = boxStartCol; c < boxStartCol + this.BOX_SIZE; c++) {
                if ((r !== row || c !== col) && grid[r][c] === value) {
                    conflicts.push([r, c]);
                }
            }
        }

        return conflicts;
    }

    // Solve puzzle using backtracking (for hints)
    solvePuzzle(grid) {
        const solution = grid.map(row => [...row]);
        return this.solvePuzzleRecursive(solution) ? solution : null;
    }

    solvePuzzleRecursive(grid) {
        const emptyCell = this.findEmptyCell(grid);
        if (!emptyCell) return true;

        const [row, col] = emptyCell;

        for (let num = 1; num <= 9; num++) {
            if (this.isSafe(grid, row, col, num)) {
                grid[row][col] = num;

                if (this.solvePuzzleRecursive(grid)) {
                    return true;
                }

                grid[row][col] = this.EMPTY;
            }
        }

        return false;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SudokuGenerator;
}