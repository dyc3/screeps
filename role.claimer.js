
// really shitty claimer, probably shouldn't even bother with using this
var roleClaimer = {

	/** @param {Creep} creep **/
	run: function(creep) {
		if (!Game.flags[creep.memory.targetFlag]) {
			console.log(creep.name, ": flag",creep.memory.targetFlag, "doesn't exist");
			// delete creep.memory.targetFlag;
		}
		if (!creep.memory.claimTarget && Game.flags["claim"]) {
			creep.memory.targetFlag = "claim"
			try {
				creep.memory.claimTarget = Game.flags[creep.memory.targetFlag].pos.lookFor(LOOK_STRUCTURES)[0].id;
			} catch (e) {}
			creep.moveTo(Game.flags[creep.memory.targetFlag]);
			creep.memory.mode = "claim"
			return;
		}
		if (!creep.memory.claimTarget && Game.flags["reserve"]) {
			creep.memory.targetFlag = "reserve"
			try {
				creep.memory.claimTarget = Game.flags[creep.memory.targetFlag].pos.lookFor(LOOK_STRUCTURES)[0].id;
			} catch (e) {}
			creep.moveTo(Game.flags[creep.memory.targetFlag]);
			creep.memory.mode = "reserve"
			return;
		}

		var claimTarget = Game.getObjectById(creep.memory.claimTarget)

		if (creep.memory.mode == "claim") {
			switch (creep.claimController(claimTarget)) {
				case ERR_GCL_NOT_ENOUGH:
					var reserveResult = creep.reserveController(claimTarget);
					if (reserveResult == ERR_NOT_IN_RANGE) {
						console.log("reserveController: NOT IN RANGE");
						creep.moveTo(claimTarget);
					}
					else {
						console.log("CANT RESERVE: "+reserveResult);
						creep.moveTo(Game.flags[creep.memory.targetFlag]);
					}
					break;
				case ERR_NOT_IN_RANGE:
					console.log("claimController: NOT IN RANGE");
					creep.moveTo(claimTarget);
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
		else if (creep.memory.mode == "reserve") {
			if (!claimTarget) {
				creep.moveTo(Game.flags["reserve"])
			}
			switch (creep.reserveController(claimTarget)) {
				case ERR_INVALID_TARGET:
					delete creep.memory.claimTarget;
					// console.log(creep.name, "INVALID TARGET");
					break;
				case ERR_NOT_IN_RANGE:
					creep.moveTo(claimTarget)
					// console.log(creep.name, "NOT IN RANGE");
					break;
				case OK:
					break;
				default:
					// console.log(creep.name, "DEFAULT");
					creep.moveTo(Game.flags["reserve"])
					break;
			}
		}
		else {
			console.log(creep.name, "Invalid mode:", creep.memory.mode);
		}
	}
}

module.exports = roleClaimer;
