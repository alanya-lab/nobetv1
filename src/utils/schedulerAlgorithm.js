import { format, getDaysInMonth, startOfMonth, addDays, getDay, isSameDay, isWeekend } from 'date-fns';

/**
 * Calculate target shifts based on SENIORITY (1-10 scale)
 * Seniority 1 = Most junior, gets MOST shifts
 * Seniority 10 = Most senior, gets LEAST shifts
 * 
 * Proportional scaling: automatically adjusts based on total needs and staff count
 */
const calculateSeniorityTargets = (staffList, totalShiftsNeeded) => {
    if (staffList.length === 0) return {};

    // Seniority weight: lower seniority = higher weight (more shifts)
    // Seniority 1 -> weight 10, Seniority 10 -> weight 1
    const getWeight = (seniority) => 11 - seniority;

    // Calculate total weighted value
    let totalWeight = 0;
    staffList.forEach(staff => {
        totalWeight += getWeight(staff.seniority);
    });

    // Base unit: how many shifts per weight point
    const baseUnit = totalShiftsNeeded / totalWeight;

    // Calculate individual targets
    const targets = {};
    staffList.forEach(staff => {
        const weight = getWeight(staff.seniority);
        targets[staff.id] = Math.round(baseUnit * weight);
    });

    return targets;
};

/**
 * Get seniority group label for display
 */
const getSeniorityGroup = (seniority) => {
    if (seniority <= 2) return 'En Çok Nöbet (Kıdem 1-2)';
    if (seniority <= 4) return 'Yüksek (Kıdem 3-4)';
    if (seniority <= 6) return 'Orta (Kıdem 5-6)';
    if (seniority <= 8) return 'Düşük (Kıdem 7-8)';
    return 'En Az (Kıdem 9-10)';
};

export const generateSchedule = (staffList, constraints, selectedDate = new Date()) => {
    const currentMonthStart = startOfMonth(selectedDate);
    const daysInMonth = getDaysInMonth(selectedDate);

    const schedule = {}; // DateString (YYYY-MM-DD) -> Array of Staff Objects

    // Calculate total shifts needed for the month
    let totalShiftsNeeded = 0;
    for (let i = 0; i < daysInMonth; i++) {
        const currentDate = addDays(currentMonthStart, i);
        const dayName = format(currentDate, 'EEEE');
        totalShiftsNeeded += constraints.dailyNeeds[dayName] || 2;
    }

    // Calculate seniority-based targets (proportional)
    const seniorityTargets = calculateSeniorityTargets(staffList, totalShiftsNeeded);

    // Initialize stats with personalized targets based on seniority
    const staffStats = {};
    staffList.forEach(staff => {
        staffStats[staff.id] = {
            shiftCount: 0,
            lastShiftDate: null,
            weekendShifts: 0,
            weekdayShifts: 0,
            targetShifts: seniorityTargets[staff.id] || 0,
            seniorityGroup: getSeniorityGroup(staff.seniority),
            daysAssigned: {
                'Monday': 0, 'Tuesday': 0, 'Wednesday': 0, 'Thursday': 0, 'Friday': 0, 'Saturday': 0, 'Sunday': 0
            }
        };
    });

    const getDayName = (date) => format(date, 'EEEE');

    for (let i = 0; i < daysInMonth; i++) {
        const currentDate = addDays(currentMonthStart, i);
        const dateString = format(currentDate, 'yyyy-MM-dd');
        const dayName = getDayName(currentDate);
        const isWknd = isWeekend(currentDate);

        // Determine needs for this day
        const neededCount = constraints.dailyNeeds[dayName] || 2;

        // Filter available staff
        let candidates = staffList.filter(staff => {
            const stats = staffStats[staff.id];

            // 1. Unavailability - check personalized unavailable dates
            if (staff.unavailability && staff.unavailability.includes(dateString)) return false;

            // 2. Hard cap - max shifts constraint
            if (stats.shiftCount >= constraints.maxShiftsPerMonth) return false;

            // 3. Rest Time (Consecutive days check)
            if (constraints.minRestHours > 12 && stats.lastShiftDate) {
                const yesterday = addDays(currentDate, -1);
                if (isSameDay(stats.lastShiftDate, yesterday)) {
                    return false;
                }
            }

            return true;
        });

        // Scoring System - Higher score = Better candidate
        const scoredCandidates = candidates.map(staff => {
            let score = 1000;
            const stats = staffStats[staff.id];

            // --- 0. Required Days - Massive priority ---
            // If this staff member MUST be assigned on this day, give huge boost
            if (staff.requiredDays && staff.requiredDays.includes(dateString)) {
                score += 5000;
            }

            // --- 1. Seniority-Based Target System ---
            // Strong boost if below personal target (based on seniority)
            const targetDiff = stats.targetShifts - stats.shiftCount;
            if (targetDiff > 0) {
                // More deficit = higher score
                score += targetDiff * 400;
            } else {
                // Exceeded target, strong penalty
                score -= Math.abs(targetDiff) * 600;
            }

            // --- 2. Weekend Distribution ---
            // Senior staff (high seniority number) get less weekend shifts
            if (isWknd) {
                // Seniority 10 -> -100 penalty, Seniority 1 -> -10 penalty
                score -= staff.seniority * 10;

                // Balance weekend shifts
                score -= stats.weekendShifts * 100;
            }

            // --- 3. Day of Week Variety ---
            const dayCount = stats.daysAssigned[dayName] || 0;
            score -= dayCount * 120;

            // --- 4. Small randomness to break ties ---
            score += Math.floor(Math.random() * 20);

            return { staff, score };
        });

        // Sort by score descending
        scoredCandidates.sort((a, b) => b.score - a.score);

        // Assign top N
        const assignedForDay = [];
        for (let j = 0; j < neededCount; j++) {
            if (scoredCandidates[j]) {
                const selectedStaff = scoredCandidates[j].staff;
                assignedForDay.push(selectedStaff);

                // Update stats
                const stats = staffStats[selectedStaff.id];
                stats.shiftCount++;
                stats.lastShiftDate = currentDate;
                stats.daysAssigned[dayName]++;
                if (isWknd) {
                    stats.weekendShifts++;
                } else {
                    stats.weekdayShifts++;
                }
            }
        }

        schedule[dateString] = assignedForDay;
    }

    // Attach final stats to schedule for Statistics component
    schedule._staffStats = staffStats;
    schedule._totalShiftsNeeded = totalShiftsNeeded;

    return schedule;
};
