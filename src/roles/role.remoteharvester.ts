import * as cartographer from "screeps-cartographer";

const roleRemoteHarvester = {
	run(creep: Creep): void {
		if (!creep.memory.harvestTarget) {
			creep.log(
				"ERR: no harvest target, this needs to be assigned by a job (similar to how relays are assigned)"
			);
			return;
		}
		const harvestTarget = _.find(Memory.remoteMining.targets, target => target.id === creep.memory.harvestTarget);
		if (!harvestTarget) {
			creep.log("ERR: harvest target not found in memory");
			return;
		}

		if (harvestTarget.danger > 0 && harvestTarget.dangerPos) {
			creep.say("flee");
			const dangerPos = new RoomPosition(
				harvestTarget.dangerPos[harvestTarget.danger].x,
				harvestTarget.dangerPos[harvestTarget.danger].y,
				harvestTarget.dangerPos[harvestTarget.danger].roomName
			);
			cartographer.moveTo(creep, dangerPos, {
				avoidTargets(roomName: string) {
					const room = Game.rooms[roomName];
					if (!room) return [];
					return room.find(FIND_HOSTILE_CREEPS).map(c => {
						return {
							pos: c.pos,
							range: 5,
						};
					});
				},
				avoidTargetGradient: 0.9,
			});
			return;
		}

		// console.log(creep.name, "observe result:", observer.observeRoom(creep.memory.harvestTarget.roomName));
		if (creep.room.name !== harvestTarget.roomName) {
			cartographer.moveTo(
				creep,
				{
					pos: new RoomPosition(harvestTarget.x, harvestTarget.y, harvestTarget.roomName),
					range: 1,
				},
				{ avoidCreeps: false, priority: 10 }
			);
			return;
		}

		if (creep.hits < creep.hitsMax) {
			// HACK: go get healed
			creep.memory.renewing = true;
			return;
		}

		const source = Game.getObjectById(harvestTarget.id);
		if (!source) {
			creep.log("CRITICAL: Unable to access harvest target");
			return;
		}

		// TODO: cache path to harvest target
		const harvestPos = new RoomPosition(
			harvestTarget.harvestPos.x,
			harvestTarget.harvestPos.y,
			harvestTarget.roomName
		);
		if (!creep.pos.isEqualTo(harvestPos)) {
			cartographer.moveTo(creep, { pos: harvestPos, range: 0 }, { priority: 10 });
			return;
		}

		if (source.energy > 0) {
			creep.harvest(source);
		} else {
			if (source.ticksToRegeneration > 30 && (creep.ticksToLive ?? 0) < 300) {
				creep.memory.renewing = true;
			}
		}
	},
};

module.exports = roleRemoteHarvester;
export default roleRemoteHarvester;
