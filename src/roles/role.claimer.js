let traveler = require("traveler");

// TODO: clean up all this extra junk that's not used anymore
let roleClaimer = {
	/** @param {Creep} creep **/
	run: function(creep) {
		if (!creep.memory.claimTarget && Game.flags["claim"]) {
			creep.memory.targetFlag = "claim"
			try {
				creep.memory.claimTarget = Game.flags[creep.memory.targetFlag].pos.lookFor(LOOK_STRUCTURES)[0].id;
			} catch (e) {}
			creep.travelTo(Game.flags[creep.memory.targetFlag], { ensurePath: true });
			creep.memory.mode = "claim"
			return;
		}
		if (!creep.memory.claimTarget && Game.flags["reserve"]) {
			creep.memory.targetFlag = "reserve"
			try {
				creep.memory.claimTarget = Game.flags[creep.memory.targetFlag].pos.lookFor(LOOK_STRUCTURES)[0].id;
			} catch (e) {}
			creep.travelTo(Game.flags[creep.memory.targetFlag], { ensurePath: true });
			creep.memory.mode = "reserve"
			return;
		}
		if (!creep.memory.claimTarget && creep.memory.targetRoom) {
			if (creep.room.name !== creep.memory.targetRoom) {
				creep.travelTo(new RoomPosition(25, 25, creep.memory.targetRoom), { ensurePath: true });
				return;
			}
			creep.memory.claimTarget = creep.room.controller.id;
		}

		let claimTarget = Game.getObjectById(creep.memory.claimTarget)

		if (!claimTarget) {
			creep.travelTo(Game.flags[creep.memory.targetFlag], { ensurePath: true });;
			return
		}

		if (creep.memory.mode == "claim") {
			if (creep.pos.isNearTo(claimTarget)) {
				if (claimTarget.reservation && claimTarget.reservation.username != global.WHOAMI) {
					console.log(creep.name, "WARN: controller is already reserved by somebody else");
					creep.attackController(claimTarget);
				}
				else {
					switch (creep.claimController(claimTarget)) {
						case ERR_GCL_NOT_ENOUGH:
							let reserveResult = creep.reserveController(claimTarget);
							if (reserveResult == ERR_NOT_IN_RANGE) {
								console.log("reserveController: NOT IN RANGE");
								creep.travelTo(claimTarget);
							}
							else {
								console.log("CANT RESERVE: "+reserveResult);
								creep.travelTo(Game.flags[creep.memory.targetFlag]);
							}
							break;
						case ERR_NOT_IN_RANGE:
							console.log("claimController: NOT IN RANGE");
							creep.travelTo(claimTarget, { ensurePath: true });
							break;
						case OK:
							Game.flags["claim"].remove()
							break;
						default:
							console.log(creep.name+": DEFAULT");
							// creep.move
							break;
					}
				}
			}
			else {
				creep.travelTo(claimTarget, { ensurePath: true });
			}
		}
		else if (creep.memory.mode == "reserve") {
			if (!claimTarget) {
				creep.travelTo(Game.flags["reserve"])
			}
			if (creep.pos.isNearTo(claimTarget)) {
				if (claimTarget.reservation && claimTarget.reservation.username != global.WHOAMI) {
					console.log(creep.name, "WARN: controller is already reserved by somebody else");
					creep.attackController(claimTarget);
				}
				else {
					switch (creep.reserveController(claimTarget)) {
						case ERR_INVALID_TARGET:
							delete creep.memory.claimTarget;
							// console.log(creep.name, "INVALID TARGET");
							break;
						case ERR_NOT_IN_RANGE:
							creep.travelTo(claimTarget);
							// console.log(creep.name, "NOT IN RANGE");
							break;
						case OK:
							break;
						default:
							// console.log(creep.name, "DEFAULT");
							creep.travelTo(Game.flags["reserve"])
							break;
					}
				}
			}
			else {
				creep.travelTo(claimTarget);
			}
		}
		else {
			console.log(creep.name, "Invalid mode:", creep.memory.mode);
		}
	}
}

module.exports = roleClaimer;
