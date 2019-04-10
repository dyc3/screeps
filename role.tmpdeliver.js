// This is a tool creep used to set up delivery routes for energy

var traveler = require('traveler');

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
		
		if (!withdrawTarget) {
		    delete creep.memory.withdrawTargetId;
		    console.log(creep.name, "Can't find withdraw target");
		    creep.say("help");
		    return;
		}
		if (!depositTarget) {
		    delete creep.memory.depositTargetId;
		    console.log(creep.name, "Can't find deposit target");
		    creep.say("help");
		    return;
		}

		if (creep.memory.delivering) {
			if (creep.pos.isNearTo(depositTarget)) {
				creep.transfer(depositTarget, RESOURCE_ENERGY);
				creep.memory.delivering = false;
			}
			else {
				creep.travelTo(depositTarget, {visualizePathStyle:{}});
			}
		}
		else {
			if (creep.pos.isNearTo(withdrawTarget)) {
				creep.withdraw(withdrawTarget, RESOURCE_ENERGY);
				creep.memory.delivering = true;
			}
			else {
				creep.travelTo(withdrawTarget, {visualizePathStyle:{}});
			}
		}
	}
}

module.exports = roleTmpDelivery;