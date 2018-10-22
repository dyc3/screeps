// This is a tool creep used to set up delivery routes for energy

let roleTmpDelivery = {
	run: function(creep) {
		if (!creep.memory.withdrawTargetId) {
			creep.say("need info");
			console.log(creep.name, "needs withdrawTargetId");
			return;
		}

		if (!creep.memory.depositTargetId) {
			creep.say("need info");
			console.log(creep.name, "needs depositTargetId");
			return;
		}

		let withdrawTarget = Game.getObjectById(creep.memory.withdrawTargetId);
		let depositTarget = Game.getObjectById(creep.memory.depositTargetId);

		if (creep.memory.delivering) {
			if (creep.pos.isNearTo(depositTarget)) {
				creep.transfer(depositTarget, RESOURCE_ENERGY);
				creep.memory.delivering = false;
			}
			else {
				creep.moveTo(depositTarget);
			}
		}
		else {
			if (creep.pos.isNearTo(withdrawTarget)) {
				creep.withdraw(withdrawTarget, RESOURCE_ENERGY);
				creep.memory.delivering = true;
			}
			else {
				creep.moveTo(withdrawTarget);
			}
		}
	}
}

module.exports = roleTmpDelivery;