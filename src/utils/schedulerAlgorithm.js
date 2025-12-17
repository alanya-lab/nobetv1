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
    return `Kıdem ${seniority}`;
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
            id: staff.id,
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

            // --- 0.8 Urgency Score (NEW) ---
            // Prioritize staff who have limited remaining available days to fulfill their target
            // This fixes the issue where staff with end-of-month leave miss their targets
            const remainingTarget = stats.targetShifts - stats.shiftCount;
            if (remainingTarget > 0) {
                // Calculate remaining available days from tomorrow onwards
                let remainingAvailableDays = 0;
                for (let k = i + 1; k < daysInMonth; k++) {
                    const futureDate = addDays(currentMonthStart, k);
                    const futureDateString = format(futureDate, 'yyyy-MM-dd');

                    // Check availability
                    const isUnavailable = staff.unavailability && staff.unavailability.includes(futureDateString);
                    const isLeave = staff.leaveDays && staff.leaveDays.includes(futureDateString);

                    if (!isUnavailable && !isLeave) {
                        remainingAvailableDays++;
                    }
                }

                // Avoid division by zero
                const safeRemainingDays = remainingAvailableDays === 0 ? 0.5 : remainingAvailableDays;

                // Urgency Ratio: Higher means more urgent
                // Example: Needs 4 shifts, has 5 days left -> 0.8 (Very Urgent)
                // Example: Needs 4 shifts, has 20 days left -> 0.2 (Not Urgent)
                const urgencyRatio = remainingTarget / safeRemainingDays;

                // Apply exponential bonus for high urgency
                if (urgencyRatio > 0.5) {
                    score += urgencyRatio * 8000; // Massive boost for high urgency
                } else {
                    score += urgencyRatio * 2000; // Moderate boost for normal progress
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
            // 1. Calculate base scores for all candidates once
            let candidatesWithScores = candidates.map(staff => ({
                staff,
                baseScore: calculateScore(staff)
            }));

            // 2. Iteratively pick staff to enforce Pairing (Senior-Junior balance)
            while (assignedForDay.length < neededCount && candidatesWithScores.length > 0) {
                // Recalculate dynamic scores based on who is already assigned
                candidatesWithScores.forEach(cs => {
                    cs.finalScore = cs.baseScore;

                    // PAIRING LOGIC: If someone is already assigned, try to match with opposite seniority
                    if (assignedForDay.length > 0) {
                        const lastAssigned = assignedForDay[assignedForDay.length - 1];

                        // RAW SENIORITY DIFFERENCE
                        // We want to maximize the difference between seniorities.
                        // Example: 10 vs 1 -> Diff 9 -> +9000 points
                        // Example: 6 vs 5 -> Diff 1 -> +1000 points
                        // Example: 6 vs 6 -> Diff 0 -> -500 points (Penalty)

                        const diff = Math.abs(cs.staff.seniority - lastAssigned.seniority);

                        if (diff === 0) {
                            // Same seniority -> Penalty
                            // Small penalty (-500) to allow if necessary
                            cs.finalScore -= 500;
                        } else {
                            // Different seniority -> Bonus based on distance
                            cs.finalScore += diff * 1000;
                        }
                    }
                });

                // Sort by final score
                candidatesWithScores.sort((a, b) => b.finalScore - a.finalScore);

                // Pick the best
                const bestMatch = candidatesWithScores[0];
                assignedForDay.push(bestMatch.staff);

                // Remove picked staff from candidates list
                candidatesWithScores.shift();
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

    // --- ANOMALY ANALYSIS ---
    // Check for seniority hierarchy violations and explain them
    const analyzeAnomalies = () => {
        const staffArray = Object.values(staffStats);
        // Sort by seniority (1 = Junior, 10 = Senior)
        // We expect Juniors to have MORE shifts than Seniors
        staffArray.sort((a, b) => {
            const staffA = staffList.find(s => s.id === a.id);
            const staffB = staffList.find(s => s.id === b.id);
            return staffA.seniority - staffB.seniority;
        });

        for (let i = 0; i < staffArray.length; i++) {
            for (let j = i + 1; j < staffArray.length; j++) {
                const junior = staffArray[i]; // Lower seniority number (more junior)
                const senior = staffArray[j]; // Higher seniority number (more senior)

                const juniorStaff = staffList.find(s => s.id === junior.id);
                const seniorStaff = staffList.find(s => s.id === senior.id);

                // Skip if seniority is same
                if (juniorStaff.seniority === seniorStaff.seniority) continue;

                // Check 1: Total Shifts Anomaly
                // Junior has FEWER shifts than Senior (Unexpected)
                if (junior.shiftCount < senior.shiftCount) {
                    const diff = senior.shiftCount - junior.shiftCount;

                    // Analyze reasons for Junior
                    const reasons = [];

                    // 1. Unavailability
                    const unavailableCount = juniorStaff.unavailability?.filter(d => d.startsWith(format(currentMonthStart, 'yyyy-MM'))).length || 0;
                    if (unavailableCount > 0) reasons.push(`${unavailableCount} gün müsait değil`);

                    // 2. Leave
                    const leaveCount = juniorStaff.leaveDays?.filter(d => d.startsWith(format(currentMonthStart, 'yyyy-MM'))).length || 0;
                    if (leaveCount > 0) reasons.push(`${leaveCount} gün izinli`);

                    // 3. Max Shifts Cap
                    if (junior.shiftCount >= constraints.maxShiftsPerMonth) reasons.push(`Max nöbet sınırına (${constraints.maxShiftsPerMonth}) ulaştı`);

                    logs.push({
                        type: 'warning',
                        icon: '⚠️',
                        message: `ANOMALİ: ${juniorStaff.name} (Kıdem ${juniorStaff.seniority}), ${seniorStaff.name}'den (Kıdem ${seniorStaff.seniority}) daha az nöbet tuttu (${junior.shiftCount} vs ${senior.shiftCount}).`,
                        details: reasons.length > 0 ? `Sebep: ${reasons.join(', ')}` : 'Sebep: Algoritma dağılımı veya dinlenme kısıtlamaları.'
                    });
                }

                // Check 2: Weekend Shifts Anomaly
                // Junior has FEWER weekend shifts than Senior (Unexpected)
                if (junior.weekendShifts < senior.weekendShifts) {
                    // Analyze reasons
                    const reasons = [];
                    const unavailableWknd = juniorStaff.unavailability?.filter(d => {
                        const date = new Date(d);
                        return isWeekend(date) && d.startsWith(format(currentMonthStart, 'yyyy-MM'));
                    }).length || 0;

                    if (unavailableWknd > 0) reasons.push(`${unavailableWknd} haftasonu günü müsait değil`);

                    logs.push({
                        type: 'warning',
                        icon: '⚠️',
                        message: `ANOMALİ: ${juniorStaff.name} (Kıdem ${juniorStaff.seniority}), ${seniorStaff.name}'den (Kıdem ${seniorStaff.seniority}) daha az haftasonu tuttu (${junior.weekendShifts} vs ${senior.weekendShifts}).`,
                        details: reasons.length > 0 ? `Sebep: ${reasons.join(', ')}` : 'Sebep: Algoritma dağılımı.'
                    });
                }
            }
        }
    };

    analyzeAnomalies();

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
