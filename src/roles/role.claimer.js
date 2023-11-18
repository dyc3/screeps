import * as cartographer from "screeps-cartographer";

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

		if (claimTarget.reservation && claimTarget.reservation.username !== global.WHOAMI) {
			console.log(creep.name, "WARN: controller is already reserved by somebody else");
			creep.attackController(claimTarget);
		} else if (!claimTarget.my && claimTarget.owner) {
			console.log(creep.name, "WARN: controller is already owned by somebody else");
			creep.attackController(claimTarget);
		} else {
			if (creep.memory.mode === "claim") {
				creep.claimController(claimTarget);
			} else if (creep.memory.mode === "reserve") {
				creep.reserveController(claimTarget);
			} else {
				creep.log("Invalid mode:", creep.memory.mode);
			}
		}
	},
};

module.exports = roleClaimer;
export default roleClaimer;
