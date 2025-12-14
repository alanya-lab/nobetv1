import { format, getDaysInMonth, startOfMonth, addDays, getDay, isSameDay, isWeekend, differenceInDays } from 'date-fns';

// Minimum leave threshold to affect target (7 days)
const LEAVE_THRESHOLD = 7;

/**
 * Calculate target shifts based on SENIORITY (1-10 scale) AND leave days
 * Seniority 1 = Most junior, gets MOST shifts
 * Seniority 10 = Most senior, gets LEAST shifts
 * 
 * Only LEAVE days (not "unavailable" preference days) affect the target
 * And only if leave days >= LEAVE_THRESHOLD (7 days)
 */
const calculateSeniorityTargets = (staffList, totalShiftsNeeded, daysInMonth) => {
    if (staffList.length === 0) return {};

    // Seniority weight: lower seniority = higher weight (more shifts)
    // Seniority 1 -> weight 10, Seniority 10 -> weight 1
    const getWeight = (seniority) => 11 - seniority;

    // Calculate each staff's leave days and weighted value
    const staffData = staffList.map(staff => {
        // Only count LEAVE days (not unavailability which is just preference)
        const leaveDays = staff.leaveDays?.length || 0;
        const activeDays = daysInMonth - leaveDays;

        // Only apply availability ratio if leave >= threshold
        const availabilityRatio = leaveDays >= LEAVE_THRESHOLD
            ? activeDays / daysInMonth
            : 1; // No reduction if less than threshold

        const weight = getWeight(staff.seniority);
        const adjustedWeight = weight * availabilityRatio;

        return {
            id: staff.id,
            weight,
            activeDays,
            leaveDays,
            availabilityRatio,
            adjustedWeight,
            targetReduced: leaveDays >= LEAVE_THRESHOLD
        };
    });

    // Calculate total adjusted weight
    const totalAdjustedWeight = staffData.reduce((sum, s) => sum + s.adjustedWeight, 0);

    // Base unit: how many shifts per adjusted weight point
    const baseUnit = totalShiftsNeeded / totalAdjustedWeight;

    // Calculate individual targets
    const targets = {};
    const targetDetails = {};

    staffData.forEach(data => {
        const rawTarget = baseUnit * data.adjustedWeight;
        const target = Math.round(rawTarget);
        targets[data.id] = target;
        targetDetails[data.id] = {
            target,
            rawTarget,
            activeDays: data.activeDays,
            leaveDays: data.leaveDays,
            availabilityRatio: data.availabilityRatio,
            targetReduced: data.targetReduced
        };
    });

    return { targets, targetDetails };
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
    const logs = []; // Algorithm decision logs

    // Calculate total shifts needed for the month
    let totalShiftsNeeded = 0;
    for (let i = 0; i < daysInMonth; i++) {
        const currentDate = addDays(currentMonthStart, i);
        const dayName = format(currentDate, 'EEEE');
        totalShiftsNeeded += constraints.dailyNeeds[dayName] || 2;
    }

    // Calculate seniority-based targets (adjusted for LEAVE days only, not preferences)
    const { targets: seniorityTargets, targetDetails } = calculateSeniorityTargets(
        staffList,
        totalShiftsNeeded,
        daysInMonth
    );

    // Log target adjustments for staff with significant leave
    staffList.forEach(staff => {
        const details = targetDetails[staff.id];
        if (details && details.targetReduced) {
            logs.push({
                type: 'info',
                icon: '🏖️',
                message: `${staff.name || staff.firstName}: ${details.leaveDays} gün izinli (≥${LEAVE_THRESHOLD}), hedef ${details.target} nöbete düşürüldü`
            });
        }
    });

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
            },
            skippedReasons: []
        };
    });

    const getDayName = (date) => format(date, 'EEEE');

    // Calculate required gap based on rest hours
    // Example: 24h shift + 72h rest = shift ends next day, then 3 days rest = 4 day gap minimum
    const shiftEndDay = 1; // Shift ends the next day
    const restDays = Math.ceil(constraints.minRestHours / 24);
    const requiredDayGap = shiftEndDay + restDays;

    logs.push({
        type: 'info',
        icon: '⏰',
        message: `Dinlenme: ${constraints.minRestHours} saat → Bir nöbet sonrası ${requiredDayGap} gün sonra yeni nöbet`
    });

    for (let i = 0; i < daysInMonth; i++) {
        const currentDate = addDays(currentMonthStart, i);
        const dateString = format(currentDate, 'yyyy-MM-dd');
        const dayName = getDayName(currentDate);
        const isWknd = isWeekend(currentDate);
        const dayOfMonth = i + 1;

        // Determine needs for this day
        const neededCount = constraints.dailyNeeds[dayName] || 2;

        // Filter available staff
        let candidates = staffList.filter(staff => {
            const stats = staffStats[staff.id];

            // 1. Unavailability - check BOTH unavailable (preference) AND leave days
            // Both prevent assignment, but only leave affects target
            if (staff.unavailability && staff.unavailability.includes(dateString)) {
                return false;
            }
            if (staff.leaveDays && staff.leaveDays.includes(dateString)) {
                return false;
            }

            // 2. Hard cap - max shifts constraint
            if (stats.shiftCount >= constraints.maxShiftsPerMonth) {
                return false;
            }

            // 3. Rest Time - proper calculation including shift duration
            if (stats.lastShiftDate) {
                const daysSinceLastShift = differenceInDays(currentDate, stats.lastShiftDate);
                if (daysSinceLastShift < requiredDayGap) {
                    return false;
                }
            }

            return true;
        });

        // Check if we have enough candidates
        if (candidates.length < neededCount) {
            logs.push({
                type: 'warning',
                icon: '⚠️',
                message: `${dayOfMonth}. gün: ${neededCount} kişi gerekli ama sadece ${candidates.length} müsait`
            });
        }

        // Helper to calculate score for a candidate
        const calculateScore = (staff) => {
            let score = 1000;
            const stats = staffStats[staff.id];

            // --- 0. Required Days - Massive priority ---
            if (staff.requiredDays && staff.requiredDays.includes(dateString)) {
                score += 5000;
            }

            // --- 0.5 Beneficial Days (NEW) ---
            if (constraints.beneficialDays && constraints.beneficialDays.includes(dayName)) {
                const threshold = constraints.beneficialDaysThreshold || 4;
                if (staff.seniority >= threshold) {
                    // Gradient bonus: Higher seniority = Higher bonus
                    score += staff.seniority * 1000;
                }
            }

            // --- 1. Seniority-Based Target System ---
            const targetDiff = stats.targetShifts - stats.shiftCount;
            if (targetDiff > 0) {
                score += targetDiff * 400;
            } else {
                score -= Math.abs(targetDiff) * 5000;
            }

            // --- 2. Shift Spread Bonus ---
            if (stats.lastShiftDate) {
                const daysSinceLastShift = differenceInDays(currentDate, stats.lastShiftDate);
                score += daysSinceLastShift * 150;
            } else {
                score += 500;
            }

            // --- 3. Weekend Distribution (STRICTER) ---
            if (isWknd) {
                score -= Math.pow(staff.seniority, 4);
                score -= stats.weekendShifts * 5000;

                // SENIORITY HIERARCHY ENFORCEMENT
                const myWeekendShifts = stats.weekendShifts;
                staffList.forEach(otherStaff => {
                    if (otherStaff.id !== staff.id && otherStaff.seniority < staff.seniority) {
                        const otherStats = staffStats[otherStaff.id];
                        if (myWeekendShifts >= otherStats.weekendShifts) {
                            score -= 20000;
                        }
                    }
                });
            }

            // --- 4. Day of Week Variety ---
            const dayCount = stats.daysAssigned[dayName] || 0;
            score -= dayCount * 120;

            // --- 5. Small randomness ---
            score += Math.floor(Math.random() * 20);

            return score;
        };

        const assignedForDay = [];

        // SLOT SYSTEM LOGIC
        if (constraints.slotSystem && constraints.slotSystem.enabled) {
            for (let slotIndex = 0; slotIndex < neededCount; slotIndex++) {
                // Determine allowed seniorities for this slot
                let allowedSeniorities = [];
                if (slotIndex === 0) {
                    allowedSeniorities = constraints.slotSystem.slot1Seniorities || [];
                } else if (slotIndex === 1) {
                    allowedSeniorities = constraints.slotSystem.slot2Seniorities || [];
                } else {
                    // Fallback for extra slots (if neededCount > 2): use all seniorities
                    allowedSeniorities = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
                }

                // Filter candidates for this slot
                const slotCandidates = candidates.filter(staff => {
                    // Must be in allowed seniorities
                    if (!allowedSeniorities.includes(staff.seniority)) return false;
                    // Must not be already assigned today
                    if (assignedForDay.find(s => s.id === staff.id)) return false;
                    return true;
                });

                if (slotCandidates.length === 0) {
                    logs.push({
                        type: 'warning',
                        icon: '⚠️',
                        message: `${dayOfMonth}. gün Slot ${slotIndex + 1}: Uygun kriterde personel bulunamadı (Boş bırakıldı)`
                    });
                    continue;
                }

                // Score and pick best
                const scoredSlotCandidates = slotCandidates.map(staff => ({
                    staff,
                    score: calculateScore(staff)
                }));

                scoredSlotCandidates.sort((a, b) => b.score - a.score);
                assignedForDay.push(scoredSlotCandidates[0].staff);
            }
        }
        // NORMAL LOGIC (No Slot System)
        else {
            const scoredCandidates = candidates.map(staff => ({
                staff,
                score: calculateScore(staff)
            }));

            scoredCandidates.sort((a, b) => b.score - a.score);

            for (let j = 0; j < scoredCandidates.length && assignedForDay.length < neededCount; j++) {
                assignedForDay.push(scoredCandidates[j].staff);
            }
        }

        // Update stats for assigned staff
        assignedForDay.forEach(candidate => {
            const stats = staffStats[candidate.id];
            stats.shiftCount++;
            stats.lastShiftDate = currentDate;
            stats.daysAssigned[dayName]++;
            if (isWknd) {
                stats.weekendShifts++;
            } else {
                stats.weekdayShifts++;
            }
        });

        // Log if day couldn't be fully filled
        if (assignedForDay.length < neededCount) {
            logs.push({
                type: 'error',
                icon: '❌',
                message: `${dayOfMonth}. gün: ${neededCount - assignedForDay.length} pozisyon doldurulamadı!`
            });
        }

        schedule[dateString] = assignedForDay;
    }

    // Final summary logs
    const totalAssigned = Object.values(schedule).reduce((sum, day) => {
        if (Array.isArray(day)) return sum + day.length;
        return sum;
    }, 0);

    logs.unshift({
        type: 'success',
        icon: '✅',
        message: `Toplam ${totalAssigned}/${totalShiftsNeeded} nöbet başarıyla atandı`
    });

    // Add individual staff summaries for those who differ from target
    staffList.forEach(staff => {
        const stats = staffStats[staff.id];
        const diff = stats.shiftCount - stats.targetShifts;
        if (diff !== 0) {
            const diffText = diff > 0 ? `+${diff}` : `${diff}`;
            logs.push({
                type: diff > 0 ? 'info' : 'warning',
                icon: diff > 0 ? '📈' : '📉',
                message: `${staff.name || staff.firstName}: Hedef ${stats.targetShifts}, Gerçekleşen ${stats.shiftCount} (${diffText})`
            });
        }
    });

    // Attach final stats and logs to schedule
    schedule._staffStats = staffStats;
    schedule._totalShiftsNeeded = totalShiftsNeeded;
    schedule._logs = logs;
    schedule._targetDetails = targetDetails;
    schedule._leaveThreshold = LEAVE_THRESHOLD;

    return schedule;
};
