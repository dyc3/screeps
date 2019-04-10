var toolFriends = require("tool.friends");

var roleTower = {
	run: function(tower) {
		if(tower.energy == 0) {
		    return;
		}
		let closestHostile = tower.pos.findClosestByRange(FIND_HOSTILE_CREEPS, {
			filter: function(c) {
				return !toolFriends.isCreepFriendly(c);
			}
		});
		if (closestHostile) {
			tower.attack(closestHostile);
		}
		else {
			let damagedCreeps = tower.room.find(FIND_MY_CREEPS, {
				filter: (creep) => {
					return creep.hits < creep.hitsMax;
				}
			});
			if (damagedCreeps.length > 0) {
				let closest = tower.pos.findClosestByRange(damagedCreeps);
				if (closest) {
					tower.heal(closest);
				}
			}
			else {
				let damagedStructures = [];
				if (tower.energy > tower.energyCapacity * 0.5) {
				    damagedStructures = tower.room.find(FIND_STRUCTURES, {
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
				}
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
					let closestDamagedStructure = tower.pos.findClosestByRange(damagedStructures);
					if(closestDamagedStructure) {
						tower.repair(closestDamagedStructure);
					}
				}
			}
		}
	}
}

module.exports = roleTower;
