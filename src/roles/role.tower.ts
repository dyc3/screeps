import { calcEffectiveness, towerImpactFactor } from "../combat/calc";
import toolFriends from "../tool.friends";
import util from "../util";

const NAIVE_BAIT_FILTER = false;
const SWARM_DEFENSE = false;

const roleTower = {
	run(room: Room): void {
		const towers = util.getStructures(room, STRUCTURE_TOWER);

		let hostiles = room.find(FIND_HOSTILE_CREEPS, {
			filter(c) {
				if (NAIVE_BAIT_FILTER) {
					if (c.getActiveBodyparts(RANGED_ATTACK) > 0) {
						if (util.isDistFromEdge(c.pos, 0)) {
							return false;
						}
					} else if (c.getActiveBodyparts(WORK) + c.getActiveBodyparts(ATTACK) > 0) {
						if (util.isDistFromEdge(c.pos, 0)) {
							return false;
						}
					} else if (c.getActiveBodyparts(HEAL) > 0) {
						if (util.isDistFromEdge(c.pos, 0)) {
							return false;
						}
					} else {
						if (util.isDistFromEdge(c.pos, 7)) {
							return false;
						}
					}
				}
				return !toolFriends.isCreepFriendly(c);
			},
		});
		if (hostiles.length > 0) {
			if (SWARM_DEFENSE) {
				hostiles = _.sortBy(hostiles, c => c.pos.getRangeTo(towers[0])).reverse();
				for (const tower of towers) {
					const target = hostiles[0];
					const dist = tower.pos.getRangeTo(target);
					const damage = TOWER_POWER_ATTACK * towerImpactFactor(dist);
					if (target.hits <= damage) {
						hostiles.shift();
					}
					tower.attack(target);

					if (hostiles.length === 0) {
						break;
					}
				}
				return;
			} else {
				const healers = hostiles.filter(c => c.getActiveBodyparts(HEAL) > 0);
				const maxHealPower = healers
					.map(c => calcEffectiveness(c, HEAL, "heal"))
					.reduce((a, b) => Math.max(a, b), 0);

				console.log(`MAX HEALER EFFECTIVENESS: ${maxHealPower}`);
				let target = hostiles[0];
				while (hostiles.length > 0) {
					// predict damage to target
					const totalDamage = towers
						.map(t => TOWER_POWER_ATTACK * towerImpactFactor(t.pos.getRangeTo(target)))
						.reduce((a, b) => a + b, 0);
					if (maxHealPower >= totalDamage) {
						hostiles.shift();
						target = hostiles[0];
						continue;
					}
					break;
				}

				if (hostiles.length === 0) {
					console.log("WARN: all hostiles can heal faster than towers can attack");
					return;
				}

				let damageDealt = 0; // damage dealt to the current target
				for (const tower of towers) {
					const dist = tower.pos.getRangeTo(target);
					const damage = TOWER_POWER_ATTACK * towerImpactFactor(dist);
					tower.attack(target);
					damageDealt += damage;
					if (target.hits <= damageDealt) {
						hostiles.shift();
						damageDealt = 0;
					}
				}
			}
		}

		const damagedCreeps = room.find(FIND_MY_CREEPS, {
			filter: creep => {
				return creep.hits < creep.hitsMax && creep.getActiveBodyparts(HEAL) === 0;
			},
		});
		if (damagedCreeps.length > 0) {
			for (const tower of towers) {
				const target = tower.pos.findClosestByRange(damagedCreeps);
				if (target) {
					tower.heal(target);
				}
			}
			return;
		}
	},
};

module.exports = roleTower;
export default roleTower;
