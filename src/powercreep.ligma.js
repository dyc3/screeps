const util = require("util");

/*
Ligma can reduce spawn times.
*/

module.exports = {
	run(creep) {
		if(!(creep.spawnCooldownTime > Date.now())) {
			// TODO: make this not hard coded
			creep.spawn(util.getStructures(Game.rooms["W15N8"], STRUCTURE_POWER_SPAWN)[0]);
		}

		if (!creep.room.controller.isPowerEnabled) {
			creep.log(`Enabling power usage for room ${creep.room.name}`);
			if (creep.pos.isNearTo(creep.room.controller)) {
				creep.enableRoom(creep.room.controller);
			}
			else {
				creep.travelTo(creep.room.controller);
			}
			return;
		}

		if (creep.powers[PWR_GENERATE_OPS].cooldown === 0) {
			let result = creep.usePower(PWR_GENERATE_OPS);
			creep.log(`generate ops result: ${result}`);
		}
	}
}