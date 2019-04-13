let toolFriends = require("tool.friends");
let util = require("util");

let roleTower = {
	run: function(room) {
		let towers = util.getStructures(room, STRUCTURE_TOWER);

		let hostiles = room.find(FIND_HOSTILE_CREEPS, {
			filter: function(c) {
				return !toolFriends.isCreepFriendly(c);
			}
		});
		if (hostiles.length > 0) {
			for (let i = 0; i < towers.length; i++) {
				let tower = towers[i];
				let target = tower.pos.findClosestByRange(hostiles);
				tower.attack(target);
			}
			return;
		}

		let damagedCreeps = room.find(FIND_MY_CREEPS, {
			filter: (creep) => {
				return creep.hits < creep.hitsMax;
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

		let damagedStructures = room.find(FIND_STRUCTURES, {
			filter: (struct) => {
				let flags = struct.pos.lookFor(LOOK_FLAGS);
				if (flags.length > 0) {
					if (flags[0].name.includes("dismantle") || flags[0].name.includes("norepair")) {
						return false;
					}
				}
				if (struct.structureType == STRUCTURE_WALL && struct.hits >= 500) {
					return false;
				}
				if (struct.structureType == STRUCTURE_RAMPART && struct.hits >= 500) {
					return false;
				}
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
