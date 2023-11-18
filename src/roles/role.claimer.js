import * as cartographer from "screeps-cartographer";

// TODO: clean up all this extra junk that's not used anymore
let roleClaimer = {
	/** @param {Creep} creep **/
	run(creep) {
		if (!creep.memory.claimTarget && creep.memory.targetRoom) {
			if (creep.room.name !== creep.memory.targetRoom) {
				cartographer.moveTo(creep, { pos: new RoomPosition(25, 25, creep.memory.targetRoom), range: 23 });
				return;
			}
			creep.memory.claimTarget = creep.room.controller.id;
		}

		let claimTarget = Game.getObjectById(creep.memory.claimTarget);

		if (!claimTarget) {
			return;
		}

		if (creep.memory.mode === "claim") {
			if (creep.pos.isNearTo(claimTarget)) {
				if (claimTarget.reservation && claimTarget.reservation.username !== global.WHOAMI) {
					console.log(creep.name, "WARN: controller is already reserved by somebody else");
					creep.attackController(claimTarget);
				} else if (!claimTarget.my && claimTarget.owner) {
					console.log(creep.name, "WARN: controller is already owned by somebody else");
					creep.attackController(claimTarget);
				} else {
					switch (creep.claimController(claimTarget)) {
						case ERR_GCL_NOT_ENOUGH:
							let reserveResult = creep.reserveController(claimTarget);
							if (reserveResult === ERR_NOT_IN_RANGE) {
								console.log("reserveController: NOT IN RANGE");
								cartographer.moveTo(creep, claimTarget);
							} else {
								console.log("CANT RESERVE: " + reserveResult);
								cartographer.moveTo(creep, Game.flags[creep.memory.targetFlag]);
							}
							break;
						case ERR_NOT_IN_RANGE:
							console.log("claimController: NOT IN RANGE");
							cartographer.moveTo(creep, claimTarget, { ensurePath: true });
							break;
						case OK:
							Game.flags.claim.remove();
							break;
						default:
							console.log(creep.name + ": DEFAULT");
							// creep.move
							break;
					}
				}
			} else {
				cartographer.moveTo(creep, claimTarget, { ensurePath: true });
			}
		} else if (creep.memory.mode === "reserve") {
			if (!claimTarget) {
				cartographer.moveTo(creep, Game.flags.reserve);
			}
			if (creep.pos.isNearTo(claimTarget)) {
				if (claimTarget.reservation && claimTarget.reservation.username !== global.WHOAMI) {
					console.log(creep.name, "WARN: controller is already reserved by somebody else");
					creep.attackController(claimTarget);
				} else {
					switch (creep.reserveController(claimTarget)) {
						case ERR_INVALID_TARGET:
							delete creep.memory.claimTarget;
							// console.log(creep.name, "INVALID TARGET");
							break;
						case ERR_NOT_IN_RANGE:
							cartographer.moveTo(creep, claimTarget);
							// console.log(creep.name, "NOT IN RANGE");
							break;
						case OK:
							break;
						default:
							// console.log(creep.name, "DEFAULT");
							cartographer.moveTo(creep, Game.flags.reserve);
							break;
					}
				}
			} else {
				cartographer.moveTo(creep, claimTarget);
			}
		} else {
			console.log(creep.name, "Invalid mode:", creep.memory.mode);
		}
	},
};

module.exports = roleClaimer;
export default roleClaimer;
