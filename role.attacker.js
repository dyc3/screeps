var toolFriends = require('tool.friends');
var util = require('util');

var roleAttacker = {

	/** @param {Creep} creep **/
	run: function(creep) {

		if (creep.memory.mode == "defend" && Game.flags["attack"]) { // FIXME
			creep.memory.mode = "attack";
			creep.say("attacking");
		}
		if (creep.memory.mode == "attack" && Game.flags["attack"] == undefined) {
			creep.memory.mode = "defend";
			creep.say("defending");
		}

		console.log(creep.name,creep.memory.mode);

		if (creep.memory.mode == "defend") {

			var target = creep.pos.findClosestByRange(FIND_HOSTILE_CREEPS, {
				filter: function(c) {
					return !toolFriends.isCreepFriendly(c) && !util.isOnEdge(c, 1);
				}
			});
			if (target) {
				//var attackCreeps = _.filter(Game.creeps, (creep) => creep.memory.role == "attacker" || creep.memory.role == "healer");
				if (creep.attack(target) == ERR_NOT_IN_RANGE) {
				    creep.moveTo(target);
				// 	var doMove = true;
				// 	if (attackCreeps.length >= 4) {
				// 		for (var i = 0; i < attackCreeps.length; i++) {
				// 			if ((attackCreeps[i].memory.role == "attacker" && !creep.pos.inRangeTo(attackCreeps[i], 3)) ||
				// 				(attackCreeps[i].memory.role == "healer" && !creep.pos.inRangeTo(attackCreeps[i], 5))) {
				// 				doMove = false;
				// 			}
				// 		}
				// 	}
				// 	else {
				// 		doMove = false;
				// 	}
				// 	if (doMove) {
				// 		creep.moveTo(target);
				// 	}
				// 	else {
				// 		creep.moveTo(target.pos.findClosestByPath(attackCreeps));
				// 	}
				}
			}
			else {
				creep.moveTo(Game.flags["Defend"]);
			}
		}
		else if (creep.memory.mode == "attack") {
			// TODO: implement expansion attacks
			// 1. make sure we have enough ticksToLive, at least 1000 ought to do it.
			// 2. group up with attack force, wait for group of 3
			// 3. move as group to attack
			var attackGroup = _.filter(Game.creeps, (creep) => creep.memory.role == "attacker" || creep.memory.role == "healer");
			var countAttacker = _.filter(attackGroup, (creep) => creep.memory.role == "attacker").length;
			var countHealer = _.filter(attackGroup, (creep) => creep.memory.role == "healer").length;
			console.log("attackGroup: ",attackGroup.length,"creeps:",countAttacker,"attacker,",countHealer,"healer");
			if (countAttacker >= 2 && countHealer >= 1) {
				if (Memory.attackTarget) {
					var attackTarget = Game.getObjectById(Memory.attackTarget);
					if (attackTarget) {
						console.log("attacking",attackTarget);
						if (creep.attack(attackTarget) == ERR_NOT_IN_RANGE) {
							creep.moveTo(attackTarget);
						}
					}
				}
				else if (Game.flags["attack"]) {
					console.log("moving to flag");
					creep.moveTo(Game.flags["attack"]);
				}
				else {
					console.log("ready for attack, waiting for target...");
				}
			}
			else {
				console.log("waiting for full group");
				creep.moveTo(Game.flags["Defend"]);
			}
		}
	}
}

module.exports = roleAttacker;
