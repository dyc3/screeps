// This is a tool creep used to set up delivery routes for energy

var traveler = require('traveler');

String.prototype.hashCode = function() {
	var hash = 0, i, chr;
	if (this.length === 0) {
		return hash;
	}
	for (i = 0; i < this.length; i++) {
		chr = this.charCodeAt(i);
		hash = ((hash << 5) - hash) + chr;
		hash |= 0; // Convert to 32bit integer
	}
	return hash;
};

let roleTmpDelivery = {
	/**
	 * Checks if the creep's settings have been changed, indicating that cached values should be recalculated.
	 * In this instance, it checks to see if `withdrawTargetId` and `depositTargetId` have changed.
	 * @params {Creep} The creep to check.
	 * @returns {boolean} True if cached values need to be recalculated, false if otherwise.
	 */
	haveSettingsChanged(creep) {
		let settings = creep.memory.withdrawTargetId + creep.memory.depositTargetId;
		if (!creep.memory._settingsHash) {
			creep.memory._settingsHash = settings.hashCode();
		}

		return settings.hashCode() !== creep.memory._settingsHash;
	},
	/**
	 * Checks if the delivery creep should renew themselves. Should be called before traveling to the next destination.
	 * Does not override the logic in task.renew.
	 * @params {Creep} The creep to check.
	 * @returns {boolean} True if the creep should renew, false if otherwise.
	 */
	shouldRenew(creep) {
		if (this.haveSettingsChanged(creep)) {
			delete creep.memory._multiRoomDistance;
			delete creep.memory._routeDistanceRough;
		}

		if (!creep.memory._multiRoomDistance) {
			// _multiRoomDistance is the number of rooms on the route

			let withdrawTarget = Game.getObjectById(creep.memory.withdrawTargetId);
			let depositTarget = Game.getObjectById(creep.memory.depositTargetId);

			if (withdrawTarget.room.name !== depositTarget.room.name) {
				let multiRoomRoute = Game.map.findRoute(withdrawTarget.room, depositTarget.room);
				creep.memory._multiRoomDistance = multiRoomRoute.length;
			}
			else {
				creep.memory._multiRoomDistance = 1;
			}
		}

		if (!creep.memory._routeDistanceRough) {
			// This is an EXTREMELY rough estimate. Technically, it doesn't have to be cached because
			// it's so computationally simple, but setting it up like this will make it easier to do something
			// more accurate later.
			creep.memory._routeDistanceRough = creep.memory._multiRoomDistance * 60 + 20;
		}

		return creep.ticksToLive <= creep._routeDistanceRough;
	},
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
				let transferResult = creep.transfer(depositTarget, RESOURCE_ENERGY);
				if (transferResult !== ERR_FULL && _.sum(creep.carry) < creep.carryCapacity * 0.25) {
					creep.memory.delivering = false;

					if (this.shouldRenew(creep)) {
						creep.memory.renewing = true;
					}
				}
			}
			else {
				if (_.sum(creep.carry) === 0) {
					creep.memory.delivering = false;

					if (this.shouldRenew(creep)) {
						creep.memory.renewing = true;
					}
				}
				else {
					creep.travelTo(depositTarget, {visualizePathStyle:{}});
				}
			}
		}
		else {
			if (creep.pos.isNearTo(withdrawTarget)) {
				creep.withdraw(withdrawTarget, RESOURCE_ENERGY);
				if (_.sum(creep.carry) < creep.carryCapacity * 0.75) {
					creep.memory.delivering = true;

					if (this.shouldRenew(creep)) {
						creep.memory.renewing = true;
					}
				}
			}
			else {
				creep.travelTo(withdrawTarget, {visualizePathStyle:{}});
			}
		}
	}
}

module.exports = roleTmpDelivery;