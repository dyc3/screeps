import * as cartographer from "screeps-cartographer";
let traveler = require("traveler");
let util = require("../util");

/*
command to spawn invader destroyers:
let targetRoom = "", _spawns = ["Spawn1", "Spawn2"]; Memory.attack.targetRoom = targetRoom; let des = require("role.invaderdestroyer"); [Game.spawns[_spawns[0]].spawnCreep(des.getBodyFor("damage"), "invaderdestroyer_damage1", { memory: { role: "invaderdestroyer", targetRoom, mode: "damage" } }), Game.spawns[_spawns[1]].spawnCreep(des.getBodyFor("heal"), "invaderdestroyer_heal1", { memory: { role: "invaderdestroyer", targetRoom, mode: "heal" } })]

command to let them start attacking:
let creeps = require("../util").getCreeps("invaderdestroyer"); for (let creep of creeps) { creep.memory.attacking = true; }
*/

let roleInvaderDestroyer = {
	getBodyFor(destroyerType) {
		if (destroyerType === "damage") {
			return [
				TOUGH,
				TOUGH,
				TOUGH,
				TOUGH,
				TOUGH,
				TOUGH,
				TOUGH,
				TOUGH,
				TOUGH,
				TOUGH,
				RANGED_ATTACK,
				RANGED_ATTACK,
				RANGED_ATTACK,
				RANGED_ATTACK,
				RANGED_ATTACK,
				RANGED_ATTACK,
				RANGED_ATTACK,
				RANGED_ATTACK,
				RANGED_ATTACK,
				RANGED_ATTACK,
				RANGED_ATTACK,
				RANGED_ATTACK,
				RANGED_ATTACK,
				RANGED_ATTACK,
				RANGED_ATTACK,
				RANGED_ATTACK,
				RANGED_ATTACK,
				RANGED_ATTACK,
				RANGED_ATTACK,
				RANGED_ATTACK,
				HEAL,
				HEAL,
				HEAL,
				HEAL,
				HEAL,
				HEAL,
				HEAL,
				HEAL,
				HEAL,
				HEAL,
				MOVE,
				MOVE,
				MOVE,
				MOVE,
				MOVE,
				MOVE,
				MOVE,
				MOVE,
				MOVE,
				MOVE,
			];
		} else if (destroyerType === "heal") {
			return [
				TOUGH,
				TOUGH,
				TOUGH,
				TOUGH,
				TOUGH,
				TOUGH,
				TOUGH,
				TOUGH,
				TOUGH,
				TOUGH,
				HEAL,
				HEAL,
				HEAL,
				HEAL,
				HEAL,
				HEAL,
				HEAL,
				HEAL,
				HEAL,
				HEAL,
				HEAL,
				HEAL,
				HEAL,
				HEAL,
				HEAL,
				HEAL,
				HEAL,
				HEAL,
				HEAL,
				HEAL,
				HEAL,
				HEAL,
				HEAL,
				HEAL,
				HEAL,
				HEAL,
				HEAL,
				HEAL,
				HEAL,
				HEAL,
				MOVE,
				MOVE,
				MOVE,
				MOVE,
				MOVE,
				MOVE,
				MOVE,
				MOVE,
				MOVE,
				MOVE,
			];
		} else {
			console.log("[invaderdestroyer] Unknown body type: ", destroyerType);
			return null;
		}
	},

	/**
	 * Get the current attack target from global memory, so that all destroyers attack the same target.
	 **/
	getCurrentTarget() {
		if (!Memory.attack) {
			Memory.attack = {};
		}
		if (Memory.attack.currentTarget) {
			let target = Game.getObjectById(Memory.attack.currentTarget);
			if (target) {
				if (target.structureType === STRUCTURE_KEEPER_LAIR) {
					creep.log("WARN: current attack target is a keeper lair, which is invalid.");
				}
				return target;
			} else {
				delete Memory.attack.currentTarget;
			}
		}

		if (!Memory.attack.currentTarget) {
			let hostileTargets = Game.rooms[Memory.attack.targetRoom].find(FIND_HOSTILE_STRUCTURES);
			hostileTargets = hostileTargets.filter(struct => {
				return struct.structureType !== STRUCTURE_KEEPER_LAIR;
			});
			hostileTargets.sort((a, b) => {
				if (a.structureType === b.structureType) {
					return a.hits - b.hits;
				}
				if (a.structureType === STRUCTURE_TOWER) {
					return -1;
				}
			});
			Memory.attack.currentTarget = hostileTargets[0].id;
			return hostileTargets[0];
		} else {
			return Game.getObjectById(Memory.attack.currentTarget);
		}
	},

	run(creep) {
		if (!Memory.attack) {
			Memory.attack = {};
		}

		if (!creep.memory.targetRoom) {
			creep.log("Need target room to attack invader core");
			return;
		}

		if (!creep.memory.attacking) {
			// this should be set externally.
			creep.say("waiting");
			return;
		}

		if (creep.room.name !== creep.memory.targetRoom) {
			cartographer.moveTo(creep, new RoomPosition(25, 25, creep.memory.targetRoom));
			if (creep.hits < creep.hitsMax && creep.getActiveBodyparts(HEAL) > 0) {
				creep.heal(creep);
			}
			return;
		}

		if (creep.memory.mode === "damage") {
			let currentTarget = this.getCurrentTarget();
			if (creep.hits < creep.hitsMax) {
				creep.heal(creep);
			}
			if (creep.pos.inRangeTo(currentTarget, 3)) {
				creep.rangedAttack(currentTarget);
			} else {
				cartographer.moveTo(creep, currentTarget, { range: 3 });
			}
		} else if (creep.memory.mode === "heal") {
			let creeps = util.getCreeps("invaderdestroyer");
			let damageCreeps = _.filter(creeps, c => c.memory.mode === "damage");
			let healCreeps = _.filter(creeps, c => c.memory.mode === "heal");
			damageCreeps.sort((a, b) => {
				return a.hits - b.hits;
			});

			if (damageCreeps.length > 0 && damageCreeps[0].hits < damageCreeps[0].hitsMax) {
				if (creep.pos.isNearTo(damageCreeps[0])) {
					creep.heal(damageCreeps[0]);
				} else if (creep.pos.inRangeTo(damageCreeps[0], 3)) {
					creep.rangedHeal(damageCreeps[0]);
				}
			} else if (creep.hits < creep.hitsMax) {
				creep.heal(creep);
			}
			cartographer.moveTo(creep, damageCreeps[0].pos);
		}
	},
};

module.exports = roleInvaderDestroyer;
export default roleInvaderDestroyer;
