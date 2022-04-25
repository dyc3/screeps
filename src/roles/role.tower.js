let toolFriends = require("tool.friends");
let util = require("../util");

let roleTower = {
	run: function(room) {
		let towers = util.getStructures(room, STRUCTURE_TOWER);

		let hostiles = room.find(FIND_HOSTILE_CREEPS, {
			filter: function(c) {
				// HACK: stop this cock teasing energy drainer
				if (c.name.toLowerCase().includes("drainer")) {
					return !util.isDistFromEdge(c.pos, 7)
				}
				if (c.getActiveBodyparts(RANGED_ATTACK) > 0) {
					if (util.isDistFromEdge(c.pos, 0)) {
						return false;
					}
				}
				else if (c.getActiveBodyparts(WORK) + c.getActiveBodyparts(ATTACK) > 0) {
					if (util.isDistFromEdge(c.pos, 1)) {
						return false;
					}
				}
				else if (c.getActiveBodyparts(HEAL) > 0) {
					if (util.isDistFromEdge(c.pos, 5)) {
						return false;
					}
				}
				else {
					if (util.isDistFromEdge(c.pos, 7)) {
						return false;
					}
				}
				return !toolFriends.isCreepFriendly(c);
			}
		});
		if (hostiles.length > 0) {
			hostiles = _.sortBy(hostiles, c => c.pos.getRangeTo(towers[0])).reverse()
			for (let i = 0; i < towers.length; i++) {
				let tower = towers[i];
				let target = hostiles[0];
				let dist = tower.pos.getRangeTo(target);
				let damage = TOWER_POWER_ATTACK * util.towerImpactFactor(dist);
				if (target.hits <= damage) {
					hostiles.pop(0)
				}
				tower.attack(target);

				if (hostiles.length === 0) {
					break;
				}
			}
			return;
		}

		let damagedCreeps = room.find(FIND_MY_CREEPS, {
			filter: (creep) => {
				return creep.hits < creep.hitsMax && creep.getActiveBodyparts(HEAL) === 0;
			}
		});
		if (damagedCreeps.length > 0) {
			for (let i = 0; i < towers.length; i++) {
				let tower = towers[i];
				let target = tower.pos.findClosestByRange(damagedCreeps);
				tower.heal(target);
			}
			return;
		}

		return;

		let damagedStructures = room.find(FIND_STRUCTURES, {
			filter: (struct) => {
				let flags = struct.pos.lookFor(LOOK_FLAGS);
				if (flags.length > 0) {
					if (flags[0].name.includes("dismantle") || flags[0].name.includes("norepair")) {
						return false;
					}
				}
				let w = 100;
				let r = 50000;
				if (struct.structureType == STRUCTURE_WALL && struct.hits >= w) {
					return false;
				}
				if (struct.structureType == STRUCTURE_RAMPART && struct.hits >= r) {
					return false;
				}
				// if (struct.structureType == STRUCTURE_WALL) {
				// 	return false;
				// }
				// if (struct.structureType == STRUCTURE_RAMPART) {
				// 	return false;
				// }
				return struct.hits < struct.hitsMax * 0.45;
			}
		});
		if (damagedStructures.length > 0) {
			damagedStructures.sort(function(a, b) {
				let aScore = a.hits / a.hitsMax;
				let bScore = b.hits / b.hitsMax;
				if (aScore < bScore) {
					return -1;
				}
				if (aScore > bScore) {
					return 1;
				}
				return 0;
			});
			for (let i = 0; i < towers.length; i++) {
				let tower = towers[i];
				if (tower.energy < tower.energyCapacity * 0.5) {
					continue;
				}
				let target = tower.pos.findClosestByRange(damagedStructures);
				tower.repair(target);
			}
		}
	}
}

module.exports = roleTower;
export default roleTower;
