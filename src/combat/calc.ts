/**
 * Calculate the effectiveness of a given part on a creep, taking hits and boosts into account.
 */
export function calcEffectiveness(creep: Creep | BodyPartDefinition[], part: BodyPartConstant, action?: "attack" | "rangedAttack" | "heal" | "rangedHeal") {
	const body: BodyPartDefinition[] = creep instanceof Creep ? creep.body : creep;
	// const boosts = _.groupBy(
	// 	body.filter(p => p.type === part),
	// 	p => p.boost
	// );

	let base = 0;
	switch (part) {
		case ATTACK:
			base = ATTACK_POWER;
			action = "attack";
			break;
		case RANGED_ATTACK:
			base = RANGED_ATTACK_POWER;
			action = "rangedAttack";
			break;
		case HEAL:
			if (action === "heal") {
				base = HEAL_POWER;
			} else if (action === "rangedHeal") {
				base = RANGED_HEAL_POWER;
			} else {
				throw new Error("Invalid action: " + action);
			}
			break;
		default:
			throw new Error("Unsupported part: " + part);
	}
	let sum = 0;
	for (const bodypart of body) {
		if (bodypart.type !== part) {
			continue;
		}
		if (bodypart.hits === 0) {
			continue;
		}
		let multiplier = 1;
		if (bodypart.boost) {
			if (Object.keys(BOOSTS).includes(bodypart.type)) {
				const boosts = BOOSTS[bodypart.type];
				if (Object.keys(boosts).includes(bodypart.boost as string)) {
					// @ts-ignore idk what the problem is, this should work
					const actions = boosts[bodypart.boost];
					if (Object.keys(actions).includes(action)) {
						multiplier = actions[action];
					}
				}
			}
		}

		sum += base * multiplier;
	}
	return sum;
	// TODO: finish
	// TODO: write tests
}

/**
 * Gets the damage multiplier for tower damage
 * @example let damage = TOWER_POWER_ATTACK * util.towerImpactFactor(10)
 */
export function towerImpactFactor(distance: number) {
	if (distance <= TOWER_OPTIMAL_RANGE) {
		return 1;
	}
	if (distance >= TOWER_FALLOFF_RANGE) {
		return 1 - TOWER_FALLOFF;
	}
	const towerFalloffPerTile = TOWER_FALLOFF / (TOWER_FALLOFF_RANGE - TOWER_OPTIMAL_RANGE);
	return 1 - (distance - TOWER_OPTIMAL_RANGE) * towerFalloffPerTile;
}

export default {
	calcEffectiveness,
	towerImpactFactor,
}
