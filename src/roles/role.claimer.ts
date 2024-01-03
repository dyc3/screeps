import * as cartographer from "screeps-cartographer";

const roleClaimer = {
	run(creep: Creep): void {
		if (!creep.memory.claimTarget && creep.memory.targetRoom) {
			if (creep.room.name !== creep.memory.targetRoom) {
				cartographer.moveTo(creep, { pos: new RoomPosition(25, 25, creep.memory.targetRoom), range: 23 });
				return;
			}
			creep.memory.claimTarget = creep.room.controller?.id;
		}

		const claimTarget = Game.getObjectById(creep.memory.claimTarget as Id<StructureController>);

		if (!claimTarget) {
			return;
		}

		cartographer.moveTo(creep, claimTarget);

		if (claimTarget.reservation && claimTarget.reservation.username !== global.WHOAMI) {
			creep.log(`WARN: controller is already reserved by somebody else: ${global.WHOAMI}`);
			creep.attackController(claimTarget);
		} else if (!claimTarget.my && claimTarget.owner) {
			creep.log("WARN: controller is already owned by somebody else");
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
