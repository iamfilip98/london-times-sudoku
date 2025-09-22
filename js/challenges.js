class ChallengesManager {
    constructor() {
        this.challengeTypes = [
            {
                id: 'error_free_week',
                title: '💎 Precision Week',
                description: 'Keep your mistakes under 5 errors per day for 7 straight days. Quality over speed!',
                tip: 'Take your time and double-check before placing numbers',
                icon: 'fas fa-gem',
                duration: 7,
                type: 'errors',
                target: { maxErrorsPerDay: 5, consecutiveDays: 7 },
                reward: { points: 500, title: 'Precision Master' },
                dailyGoal: 'Make fewer than 5 total errors today'
            },
            {
                id: 'speed_week',
                title: '⚡ Lightning Round',
                description: 'Complete all 3 puzzles in under 10 minutes total for 7 days straight. Quick thinking wins!',
                tip: 'Use logical deduction patterns and avoid guessing',
                icon: 'fas fa-bolt',
                duration: 7,
                type: 'speed',
                target: { avgTotalTime: 600, consecutiveDays: 7 },
                reward: { points: 400, title: 'Speed Demon' },
                dailyGoal: 'Finish all puzzles in under 10 minutes'
            },
            {
                id: 'consistency_challenge',
                title: '📊 Steady Champion',
                description: 'Keep your daily scores consistent for 10 days - stay within 20% of your average performance',
                tip: 'Focus on maintaining your usual pace and accuracy',
                icon: 'fas fa-chart-line',
                duration: 10,
                type: 'consistency',
                target: { scoreVariation: 20, consecutiveDays: 10 },
                reward: { points: 600, title: 'Steady Performer' },
                dailyGoal: 'Keep your score close to your average'
            },
            {
                id: 'perfect_streak',
                title: '⭐ Never Give Up',
                description: 'Complete every puzzle for 5 straight days - no giving up allowed!',
                tip: 'If you get stuck, try working on easier cells first',
                icon: 'fas fa-star',
                duration: 5,
                type: 'completion',
                target: { noDNF: true, consecutiveDays: 5 },
                reward: { points: 350, title: 'Completion Champion' },
                dailyGoal: 'Finish all puzzles - no DNFs today'
            },
            {
                id: 'improvement_challenge',
                title: '📈 Rising Star',
                description: 'Get better each day for 5 days - every day should beat the previous day\'s score',
                tip: 'Focus on reducing both time and errors gradually',
                icon: 'fas fa-trending-up',
                duration: 5,
                type: 'improvement',
                target: { consecutiveImprovement: 5 },
                reward: { points: 450, title: 'Rising Star' },
                dailyGoal: 'Score higher than yesterday'
            },
            {
                id: 'marathon_month',
                title: '🏃‍♂️ Sudoku Marathon',
                description: 'Complete at least 1 puzzle every day for 30 days - build that habit!',
                tip: 'Even a quick easy puzzle counts - consistency beats intensity',
                icon: 'fas fa-running',
                duration: 30,
                type: 'marathon',
                target: { minPuzzlesPerDay: 1, consecutiveDays: 30 },
                reward: { points: 1000, title: 'Marathon Master' },
                dailyGoal: 'Complete at least 1 puzzle today'
            },
            {
                id: 'perfectionist_challenge',
                title: '🎯 Perfectionist',
                description: 'Achieve zero errors on all three difficulty levels in the same day, 3 times in a week',
                tip: 'Take your time and think through each move carefully',
                icon: 'fas fa-bullseye',
                duration: 7,
                type: 'perfectionist',
                target: { perfectDays: 3, consecutiveDays: 7 },
                reward: { points: 750, title: 'Flawless Master' },
                dailyGoal: 'Get zero errors on all puzzles today'
            },
            {
                id: 'speed_demon_weekend',
                title: '🏎️ Weekend Speed Demon',
                description: 'Beat your personal best times on all difficulty levels during a weekend',
                tip: 'Use pattern recognition and advanced techniques',
                icon: 'fas fa-rocket',
                duration: 2,
                type: 'weekend_speed',
                target: { beatPersonalBests: 3 },
                reward: { points: 400, title: 'Speed Master' },
                dailyGoal: 'Beat your personal best time on at least one difficulty'
            }
        ];

        this.activeChallenges = [];
        this.completedChallenges = [];

        // Initialize challenge rotation after loading data
        this.initializeAsync();
    }

    async initializeAsync() {
        try {
            this.activeChallenges = await sudokuApp.loadChallenges() || [];
            this.completedChallenges = await this.loadCompletedChallenges() || [];
            this.initializeChallengeRotation();
        } catch (error) {
            console.error('Failed to initialize challenges:', error);
            this.initializeChallengeRotation();
        }
    }

    initializeChallengeRotation() {
        const now = new Date();
        const currentWeek = this.getWeekNumber(now);

        // Check if we need to start a new challenge
        const activeChallenge = this.activeChallenges.find(c => c.active);

        if (!activeChallenge || this.hasExpired(activeChallenge)) {
            this.startNewChallenge(currentWeek);
        }
    }

    getWeekNumber(date) {
        const startOfYear = new Date(date.getFullYear(), 0, 1);
        const pastDaysOfYear = (date - startOfYear) / 86400000;
        return Math.ceil((pastDaysOfYear + startOfYear.getDay() + 1) / 7);
    }

    startNewChallenge(weekNumber) {
        // End any active challenges
        this.activeChallenges.forEach(challenge => {
            challenge.active = false;
        });

        // Select challenge based on week rotation
        const challengeIndex = weekNumber % this.challengeTypes.length;
        const challengeType = this.challengeTypes[challengeIndex];

        const newChallenge = {
            id: `${challengeType.id}_${Date.now()}`,
            typeId: challengeType.id,
            title: challengeType.title,
            description: challengeType.description,
            icon: challengeType.icon,
            duration: challengeType.duration,
            type: challengeType.type,
            target: challengeType.target,
            reward: challengeType.reward,
            startDate: new Date().toISOString().split('T')[0],
            endDate: this.getEndDate(challengeType.duration),
            active: true,
            progress: {
                daysCompleted: 0,
                currentStreak: 0,
                bestStreak: 0,
                milestones: []
            },
            participants: {
                faidao: { participating: true, progress: 0 },
                filip: { participating: true, progress: 0 }
            }
        };

        this.activeChallenges.push(newChallenge);
        this.saveChallenges();

        return newChallenge;
    }

    getEndDate(duration) {
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + duration);
        return endDate.toISOString().split('T')[0];
    }

    hasExpired(challenge) {
        const endDate = new Date(challenge.endDate);
        const now = new Date();
        return now > endDate;
    }

    updateChallengeProgress(entries) {
        const activeChallenge = this.activeChallenges.find(c => c.active);
        if (!activeChallenge) return;

        const relevantEntries = this.getRelevantEntries(entries, activeChallenge);
        const progress = this.calculateProgress(activeChallenge, relevantEntries);

        activeChallenge.progress = progress;

        // Check for completion
        if (this.isChallengeCompleted(activeChallenge, progress)) {
            this.completeChallenge(activeChallenge);
        }

        this.saveChallenges();
    }

    getRelevantEntries(entries, challenge) {
        const startDate = new Date(challenge.startDate);
        return entries.filter(entry => {
            const entryDate = new Date(entry.date);
            return entryDate >= startDate;
        }).slice(0, challenge.duration);
    }

    calculateProgress(challenge, entries) {
        switch (challenge.type) {
            case 'errors':
                return this.calculateErrorProgress(challenge, entries);
            case 'speed':
                return this.calculateSpeedProgress(challenge, entries);
            case 'consistency':
                return this.calculateConsistencyProgress(challenge, entries);
            case 'completion':
                return this.calculateCompletionProgress(challenge, entries);
            case 'improvement':
                return this.calculateImprovementProgress(challenge, entries);
            case 'marathon':
                return this.calculateMarathonProgress(challenge, entries);
            case 'perfectionist':
                return this.calculatePerfectionistProgress(challenge, entries);
            case 'weekend_speed':
                return this.calculateWeekendSpeedProgress(challenge, entries);
            default:
                return challenge.progress;
        }
    }

    calculateErrorProgress(challenge, entries) {
        let currentStreak = 0;
        let bestStreak = 0;
        let tempStreak = 0;

        entries.forEach(entry => {
            const faidaoErrors = (entry.faidao.errors.easy || 0) +
                               (entry.faidao.errors.medium || 0) +
                               (entry.faidao.errors.hard || 0);
            const filipErrors = (entry.filip.errors.easy || 0) +
                              (entry.filip.errors.medium || 0) +
                              (entry.filip.errors.hard || 0);

            const meetsTarget = faidaoErrors <= challenge.target.maxErrorsPerDay ||
                              filipErrors <= challenge.target.maxErrorsPerDay;

            if (meetsTarget) {
                tempStreak++;
                bestStreak = Math.max(bestStreak, tempStreak);
            } else {
                tempStreak = 0;
            }
        });

        currentStreak = tempStreak;

        return {
            daysCompleted: entries.length,
            currentStreak,
            bestStreak,
            milestones: this.generateMilestones(challenge, currentStreak),
            percentage: Math.min((currentStreak / challenge.target.consecutiveDays) * 100, 100)
        };
    }

    calculateSpeedProgress(challenge, entries) {
        let currentStreak = 0;
        let totalTimeSum = 0;
        let validDays = 0;

        entries.forEach(entry => {
            const faidaoTotal = (entry.faidao.times.easy || 0) +
                               (entry.faidao.times.medium || 0) +
                               (entry.faidao.times.hard || 0);
            const filipTotal = (entry.filip.times.easy || 0) +
                              (entry.filip.times.medium || 0) +
                              (entry.filip.times.hard || 0);

            const betterTime = Math.min(faidaoTotal, filipTotal);

            if (betterTime > 0 && betterTime <= challenge.target.avgTotalTime) {
                currentStreak++;
                totalTimeSum += betterTime;
                validDays++;
            } else {
                currentStreak = 0;
            }
        });

        const avgTime = validDays > 0 ? totalTimeSum / validDays : 0;

        return {
            daysCompleted: entries.length,
            currentStreak,
            bestStreak: Math.max(challenge.progress?.bestStreak || 0, currentStreak),
            avgTime,
            milestones: this.generateMilestones(challenge, currentStreak),
            percentage: Math.min((currentStreak / challenge.target.consecutiveDays) * 100, 100)
        };
    }

    calculateConsistencyProgress(challenge, entries) {
        if (entries.length < 3) {
            return {
                daysCompleted: entries.length,
                currentStreak: 0,
                bestStreak: 0,
                milestones: [],
                percentage: 0
            };
        }

        // Calculate average score across all entries
        const allScores = [];
        entries.forEach(entry => {
            allScores.push(entry.faidao.scores.total, entry.filip.scores.total);
        });

        const avgScore = allScores.reduce((sum, score) => sum + score, 0) / allScores.length;
        const variationLimit = avgScore * (challenge.target.scoreVariation / 100);

        let currentStreak = 0;
        let tempStreak = 0;

        entries.forEach(entry => {
            const faidaoVariation = Math.abs(entry.faidao.scores.total - avgScore);
            const filipVariation = Math.abs(entry.filip.scores.total - avgScore);

            const meetsTarget = faidaoVariation <= variationLimit || filipVariation <= variationLimit;

            if (meetsTarget) {
                tempStreak++;
            } else {
                tempStreak = 0;
            }
        });

        currentStreak = tempStreak;

        return {
            daysCompleted: entries.length,
            currentStreak,
            bestStreak: Math.max(challenge.progress?.bestStreak || 0, currentStreak),
            avgScore,
            variationLimit,
            milestones: this.generateMilestones(challenge, currentStreak),
            percentage: Math.min((currentStreak / challenge.target.consecutiveDays) * 100, 100)
        };
    }

    calculateCompletionProgress(challenge, entries) {
        let currentStreak = 0;
        let tempStreak = 0;

        entries.forEach(entry => {
            const faidaoDNFs = entry.faidao.dnf.easy || entry.faidao.dnf.medium || entry.faidao.dnf.hard;
            const filipDNFs = entry.filip.dnf.easy || entry.filip.dnf.medium || entry.filip.dnf.hard;

            const meetsTarget = !faidaoDNFs || !filipDNFs;

            if (meetsTarget) {
                tempStreak++;
            } else {
                tempStreak = 0;
            }
        });

        currentStreak = tempStreak;

        return {
            daysCompleted: entries.length,
            currentStreak,
            bestStreak: Math.max(challenge.progress?.bestStreak || 0, currentStreak),
            milestones: this.generateMilestones(challenge, currentStreak),
            percentage: Math.min((currentStreak / challenge.target.consecutiveDays) * 100, 100)
        };
    }

    calculateImprovementProgress(challenge, entries) {
        let currentStreak = 0;

        for (let i = 1; i < entries.length; i++) {
            const prevEntry = entries[i - 1];
            const currEntry = entries[i];

            const prevBest = Math.max(prevEntry.faidao.scores.total, prevEntry.filip.scores.total);
            const currBest = Math.max(currEntry.faidao.scores.total, currEntry.filip.scores.total);

            if (currBest > prevBest) {
                currentStreak++;
            } else {
                break;
            }
        }

        return {
            daysCompleted: entries.length,
            currentStreak,
            bestStreak: Math.max(challenge.progress?.bestStreak || 0, currentStreak),
            milestones: this.generateMilestones(challenge, currentStreak),
            percentage: Math.min((currentStreak / challenge.target.consecutiveImprovement) * 100, 100)
        };
    }

    calculateMarathonProgress(challenge, entries) {
        let currentStreak = 0;
        let bestStreak = 0;
        let tempStreak = 0;

        entries.forEach(entry => {
            const faidaoCompleted = (entry.faidao.times.easy > 0 || entry.faidao.dnf.easy) ||
                                   (entry.faidao.times.medium > 0 || entry.faidao.dnf.medium) ||
                                   (entry.faidao.times.hard > 0 || entry.faidao.dnf.hard);
            const filipCompleted = (entry.filip.times.easy > 0 || entry.filip.dnf.easy) ||
                                  (entry.filip.times.medium > 0 || entry.filip.dnf.medium) ||
                                  (entry.filip.times.hard > 0 || entry.filip.dnf.hard);

            const meetsTarget = faidaoCompleted || filipCompleted;

            if (meetsTarget) {
                tempStreak++;
                bestStreak = Math.max(bestStreak, tempStreak);
            } else {
                tempStreak = 0;
            }
        });

        currentStreak = tempStreak;

        return {
            daysCompleted: entries.length,
            currentStreak,
            bestStreak,
            milestones: this.generateMilestones(challenge, currentStreak),
            percentage: Math.min((currentStreak / challenge.target.consecutiveDays) * 100, 100)
        };
    }

    calculatePerfectionistProgress(challenge, entries) {
        let perfectDays = 0;

        entries.forEach(entry => {
            const faidaoPerfect = (entry.faidao.errors.easy || 0) === 0 &&
                                 (entry.faidao.errors.medium || 0) === 0 &&
                                 (entry.faidao.errors.hard || 0) === 0;
            const filipPerfect = (entry.filip.errors.easy || 0) === 0 &&
                                (entry.filip.errors.medium || 0) === 0 &&
                                (entry.filip.errors.hard || 0) === 0;

            if (faidaoPerfect || filipPerfect) {
                perfectDays++;
            }
        });

        return {
            daysCompleted: entries.length,
            currentStreak: perfectDays,
            bestStreak: Math.max(challenge.progress?.bestStreak || 0, perfectDays),
            perfectDays,
            milestones: this.generateMilestones(challenge, perfectDays),
            percentage: Math.min((perfectDays / challenge.target.perfectDays) * 100, 100)
        };
    }

    calculateWeekendSpeedProgress(challenge, entries) {
        let personalBestsBeaten = 0;

        // This would need access to historical data to determine personal bests
        // For now, simplified version
        entries.forEach(entry => {
            // Simplified: count if they completed all puzzles quickly
            const faidaoTotal = (entry.faidao.times.easy || 0) +
                               (entry.faidao.times.medium || 0) +
                               (entry.faidao.times.hard || 0);
            const filipTotal = (entry.filip.times.easy || 0) +
                              (entry.filip.times.medium || 0) +
                              (entry.filip.times.hard || 0);

            if (faidaoTotal > 0 && faidaoTotal < 600 || filipTotal > 0 && filipTotal < 600) {
                personalBestsBeaten++;
            }
        });

        return {
            daysCompleted: entries.length,
            currentStreak: personalBestsBeaten,
            bestStreak: Math.max(challenge.progress?.bestStreak || 0, personalBestsBeaten),
            personalBestsBeaten,
            milestones: this.generateMilestones(challenge, personalBestsBeaten),
            percentage: Math.min((personalBestsBeaten / challenge.target.beatPersonalBests) * 100, 100)
        };
    }

    generateMilestones(challenge, currentProgress) {
        const milestones = [];
        const targetDays = challenge.target.consecutiveDays || challenge.target.consecutiveImprovement || challenge.target.perfectDays || challenge.target.beatPersonalBests || challenge.duration;

        for (let i = 1; i <= targetDays; i++) {
            milestones.push({
                day: i,
                completed: currentProgress >= i,
                description: `Day ${i}`
            });
        }

        return milestones;
    }

    isChallengeCompleted(challenge, progress) {
        switch (challenge.type) {
            case 'errors':
            case 'speed':
            case 'completion':
            case 'marathon':
                return progress.currentStreak >= challenge.target.consecutiveDays;
            case 'consistency':
                return progress.currentStreak >= challenge.target.consecutiveDays;
            case 'improvement':
                return progress.currentStreak >= challenge.target.consecutiveImprovement;
            case 'perfectionist':
                return progress.perfectDays >= challenge.target.perfectDays;
            case 'weekend_speed':
                return progress.personalBestsBeaten >= challenge.target.beatPersonalBests;
            default:
                return false;
        }
    }

    completeChallenge(challenge) {
        challenge.active = false;
        challenge.completedDate = new Date().toISOString().split('T')[0];

        this.completedChallenges.push({
            ...challenge,
            completedAt: new Date().toISOString()
        });

        this.saveCompletedChallenges();

        // Show completion notification
        sudokuApp.showAchievementNotification({
            title: 'Challenge Completed!',
            description: `${challenge.title} - Earned ${challenge.reward.points} points and title "${challenge.reward.title}"`
        });
    }

    updateChallenges(entries) {
        this.updateChallengeProgress(entries);
        this.renderCurrentChallenge();
        this.renderChallengeHistory();
    }

    getDailyGoalText(challenge) {
        if (challenge.dailyGoal) {
            return challenge.dailyGoal;
        }

        // Fallback to generating goal text based on challenge type
        switch (challenge.type) {
            case 'errors':
                return `Make fewer than ${challenge.target.maxErrorsPerDay} total errors today`;
            case 'speed':
                return `Finish all puzzles in under ${Math.floor(challenge.target.avgTotalTime / 60)} minutes`;
            case 'completion':
                return 'Complete all puzzles - no DNFs today';
            case 'consistency':
                return 'Keep your score close to your average';
            case 'improvement':
                return 'Score higher than yesterday';
            case 'marathon':
                return 'Complete at least 1 puzzle today';
            case 'perfectionist':
                return 'Get zero errors on all puzzles today';
            case 'weekend_speed':
                return 'Beat your personal best time on at least one difficulty';
            default:
                return 'Complete your daily puzzles';
        }
    }

    getEncouragementText(challenge, progress) {
        let target, current, unit;

        switch (challenge.type) {
            case 'perfectionist':
                target = challenge.target.perfectDays;
                current = progress.perfectDays || 0;
                unit = 'perfect days';
                break;
            case 'weekend_speed':
                target = challenge.target.beatPersonalBests;
                current = progress.personalBestsBeaten || 0;
                unit = 'personal bests';
                break;
            default:
                target = challenge.target.consecutiveDays || challenge.target.consecutiveImprovement || challenge.duration;
                current = progress.currentStreak;
                unit = 'days';
        }

        const remaining = target - current;

        if (current === 0) {
            return "🚀 Ready to start your challenge? Today's the perfect day to begin!";
        } else if (remaining === 1) {
            return `🔥 Amazing! You're just ONE ${unit.slice(0, -1)} away from completing this challenge!`;
        } else if (remaining === 2) {
            return `💪 So close! Just 2 more ${unit} and you'll earn that reward!`;
        } else if (current >= Math.floor(target / 2)) {
            return `⭐ Great momentum! Keep it up for ${remaining} more ${unit}!`;
        } else {
            return `🎯 You're building progress! ${remaining} ${unit} to go!`;
        }
    }

    renderCurrentChallenge() {
        const container = document.getElementById('currentChallenge');
        if (!container) return;

        const activeChallenge = this.activeChallenges.find(c => c.active);

        if (!activeChallenge) {
            container.innerHTML = `
                <div class="no-challenge">
                    <h3>No Active Challenge</h3>
                    <p>A new challenge will start automatically each week!</p>
                </div>
            `;
            return;
        }

        const progress = activeChallenge.progress;
        const daysRemaining = Math.max(0, activeChallenge.duration - progress.daysCompleted);

        container.innerHTML = `
            <div class="challenge-header">
                <div class="challenge-icon">
                    <i class="${activeChallenge.icon}"></i>
                </div>
                <div class="challenge-info">
                    <h3>${activeChallenge.title}</h3>
                    <p class="challenge-description">${activeChallenge.description}</p>
                    <div class="daily-goal">
                        <strong>Today's Goal:</strong> ${this.getDailyGoalText(activeChallenge)}
                    </div>
                    ${activeChallenge.tip ? `<div class="challenge-tip">💡 <em>${activeChallenge.tip}</em></div>` : ''}
                </div>
            </div>

            <div class="challenge-progress">
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${progress.percentage}%"></div>
                </div>
                <div class="progress-text">
                    ${Math.round(progress.percentage)}% Complete
                    (${progress.currentStreak}/${activeChallenge.target.consecutiveDays || activeChallenge.target.consecutiveImprovement || activeChallenge.duration} days)
                </div>
            </div>

            <div class="challenge-stats">
                <div class="stat-item">
                    <span class="stat-label">Current Streak</span>
                    <span class="stat-value">${progress.currentStreak}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Best Streak</span>
                    <span class="stat-value">${progress.bestStreak}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Days Remaining</span>
                    <span class="stat-value">${daysRemaining}</span>
                </div>
            </div>

            <div class="challenge-milestones">
                <h4>Daily Progress Track</h4>
                <div class="milestones-grid">
                    ${progress.milestones.map((milestone, index) => {
                        const isToday = index === progress.daysCompleted;
                        const isFuture = index > progress.daysCompleted;
                        return `
                        <div class="milestone ${milestone.completed ? 'completed' : ''} ${isToday ? 'today' : ''} ${isFuture ? 'future' : ''}">
                            <div class="milestone-icon">
                                ${milestone.completed ? '<i class="fas fa-check-circle"></i>' :
                                  isToday ? '<i class="fas fa-crosshairs"></i>' :
                                  '<i class="fas fa-circle"></i>'}
                            </div>
                            <span class="milestone-label">
                                ${isToday ? 'Today' : milestone.description}
                                ${milestone.completed ? ' ✨' : ''}
                            </span>
                        </div>
                    `;
                    }).join('')}
                </div>
                <div class="progress-encouragement">
                    ${this.getEncouragementText(activeChallenge, progress)}
                </div>
            </div>

            <div class="challenge-reward">
                <h4>Reward</h4>
                <div class="reward-info">
                    <span class="reward-points">${activeChallenge.reward.points} Points</span>
                    <span class="reward-title">Title: "${activeChallenge.reward.title}"</span>
                </div>
            </div>
        `;
    }

    renderChallengeHistory() {
        const container = document.getElementById('challengeHistory');
        if (!container) return;

        if (this.completedChallenges.length === 0) {
            container.innerHTML = '<div class="no-history">No completed challenges yet.</div>';
            return;
        }

        container.innerHTML = this.completedChallenges.map(challenge => `
            <div class="challenge-item completed">
                <div class="challenge-icon">
                    <i class="${challenge.icon}"></i>
                </div>
                <div class="challenge-details">
                    <h4>${challenge.title}</h4>
                    <p>Completed on ${new Date(challenge.completedDate).toLocaleDateString()}</p>
                    <div class="challenge-rewards">
                        <span class="points">+${challenge.reward.points} points</span>
                        <span class="title">"${challenge.reward.title}"</span>
                    </div>
                </div>
                <div class="challenge-status">
                    <i class="fas fa-trophy"></i>
                </div>
            </div>
        `).join('');
    }

    // Storage methods
    saveChallenges() {
        sudokuApp.saveChallenges();
    }

    async saveCompletedChallenges() {
        try {
            for (const challenge of this.completedChallenges) {
                await fetch('/api/stats', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        type: 'challenge',
                        data: challenge
                    })
                });
            }
        } catch (error) {
            console.error('Failed to save completed challenges:', error);
        }
    }

    async loadCompletedChallenges() {
        try {
            // Load completed challenges from database only
            const response = await fetch('/api/stats?type=challenges');
            if (!response.ok) {
                throw new Error('Failed to load challenges');
            }
            return await response.json();
        } catch (error) {
            console.error('Failed to load completed challenges:', error);
            return [];
        }
    }
}

// Initialize challenges manager
window.challengesManager = new ChallengesManager();