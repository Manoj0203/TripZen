/**
 * Split Calculator Engine
 *
 * Calculates each family's share of an expense based on their members'
 * weights (Adult = 100 i.e. 1.0x, Child = 50 i.e. 0.5x).
 *
 * All amounts are in integer paise (₹1 = 100 paise).
 * Remainder paise are distributed fairly one-at-a-time to families
 * with the largest weights first.
 */

/**
 * Compute the total weight for a single family.
 *
 * @param {Array<{weight: number}>} members - Members in the family with their weights
 * @returns {number} Sum of all member weights
 */
export function computeFamilyWeight(members) {
  if (!members || members.length === 0) {
    return 0;
  }
  let total = 0;
  for (let i = 0; i < members.length; i++) {
    total += members[i].weight;
  }
  return total;
}

/**
 * Calculate weighted split across families for a given expense.
 *
 * Each family's share is proportional to the sum of its members' weights.
 * Remainder paise (caused by indivisible amounts) are distributed 1 paisa
 * at a time to the families with the highest weight, ensuring the total
 * always adds up exactly to amountPaise.
 *
 * @param {number} amountPaise - Total expense amount in paise (must be a positive integer)
 * @param {Array<{familyId: string, members: Array<{memberId: string, weight: number}>}>} families
 *   Each family with its member list and weights.
 * @returns {Array<{familyId: string, sharePaise: number, weightUsed: number}>}
 *   The split result per family.
 * @throws {Error} If amountPaise is not a positive integer, or no families/members provided.
 */
export function calculateWeightedSplit(amountPaise, families) {
  if (!Number.isInteger(amountPaise) || amountPaise <= 0) {
    throw new Error('amountPaise must be a positive integer');
  }
  if (!families || families.length === 0) {
    throw new Error('At least one family is required');
  }

  // 1. Compute each family's total weight
  const familyWeights = [];
  let totalWeight = 0;

  for (let i = 0; i < families.length; i++) {
    const family = families[i];
    const weight = computeFamilyWeight(family.members);
    familyWeights.push({
      familyId: family.familyId,
      weight: weight,
      members: family.members,
    });
    totalWeight += weight;
  }

  if (totalWeight === 0) {
    throw new Error('Total weight across all families cannot be zero');
  }

  // 2. Filter out families with zero weight (excluded from splitting)
  const activeFamilies = familyWeights.filter(f => f.weight > 0);

  if (activeFamilies.length === 0) {
    throw new Error('No families with non-zero weight to split among');
  }

  // 3. Calculate base share using integer floor division
  const results = [];
  let distributed = 0;

  for (let i = 0; i < activeFamilies.length; i++) {
    const f = activeFamilies[i];
    const exactShare = (amountPaise * f.weight) / totalWeight;
    const baseShare = Math.floor(exactShare);
    results.push({
      familyId: f.familyId,
      sharePaise: baseShare,
      weightUsed: f.weight,
      _remainder: exactShare - baseShare, // fractional part for remainder distribution
    });
    distributed += baseShare;
  }

  // 4. Distribute remainder paise (1 paisa at a time)
  let remainder = amountPaise - distributed;

  // Sort by largest remainder fraction first (ties broken by larger weight)
  const sortedByRemainder = results
    .map((r, idx) => ({ idx, rem: r._remainder, weight: r.weightUsed }))
    .sort((a, b) => b.rem - a.rem || b.weight - a.weight);

  for (let i = 0; i < remainder; i++) {
    results[sortedByRemainder[i % sortedByRemainder.length].idx].sharePaise += 1;
  }

  // 5. Clean up internal fields and add zero-weight families back
  const finalResults = [];

  for (let i = 0; i < familyWeights.length; i++) {
    const fw = familyWeights[i];
    if (fw.weight === 0) {
      finalResults.push({
        familyId: fw.familyId,
        sharePaise: 0,
        weightUsed: 0,
      });
    } else {
      const match = results.find(r => r.familyId === fw.familyId);
      finalResults.push({
        familyId: match.familyId,
        sharePaise: match.sharePaise,
        weightUsed: match.weightUsed,
      });
    }
  }

  return finalResults;
}

/**
 * Calculate equal split across families (ignores member weights).
 *
 * Each family pays the same share regardless of how many members they have.
 * Remainder paise are distributed to the first families in the list.
 *
 * @param {number} amountPaise - Total expense amount in paise (must be a positive integer)
 * @param {Array<{familyId: string}>} families - List of families
 * @returns {Array<{familyId: string, sharePaise: number}>}
 */
export function calculateEqualFamilySplit(amountPaise, families) {
  if (!Number.isInteger(amountPaise) || amountPaise <= 0) {
    throw new Error('amountPaise must be a positive integer');
  }
  if (!families || families.length === 0) {
    throw new Error('At least one family is required');
  }

  const count = families.length;
  const baseShare = Math.floor(amountPaise / count);
  let remainder = amountPaise - baseShare * count;

  const results = [];
  for (let i = 0; i < count; i++) {
    let share = baseShare;
    if (remainder > 0) {
      share += 1;
      remainder -= 1;
    }
    results.push({
      familyId: families[i].familyId,
      sharePaise: share,
    });
  }

  return results;
}
