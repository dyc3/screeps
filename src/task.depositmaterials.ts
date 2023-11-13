/**
 * Excludes energy by default
 */
export function checkForMaterials(creep: Creep, excludeEnergy = true): boolean {
	let carry = creep.store.getUsedCapacity();
	carry -= excludeEnergy ? creep.store.getUsedCapacity(RESOURCE_ENERGY) : 0;
	return carry > 0;
}

export function run(creep: Creep, excludeEnergy = true): void {
	const storage = creep.pos.findClosestByRange(FIND_STRUCTURES, {
		filter(struct) {
			if (struct.structureType === STRUCTURE_CONTAINER) {
				if (struct.pos.findInRange(FIND_SOURCES, 2).length > 0) {
					return false;
				}
				if (
					struct.pos.findInRange(FIND_STRUCTURES, 3, {
						filter(s) {
							return s.structureType === STRUCTURE_CONTROLLER || s.structureType === STRUCTURE_SPAWN;
						},
					}).length > 0
				) {
					return false;
				}
				return true;
			}

			return struct.structureType === STRUCTURE_STORAGE;
		},
	});
	if (storage) {
		if (creep.pos.isNearTo(storage)) {
			for (const resource of RESOURCES_ALL) {
				if (excludeEnergy && resource === RESOURCE_ENERGY) {
					continue;
				}
				if (creep.store[resource] > 0) {
					creep.transfer(storage, resource);
				}
			}
		} else {
			creep.travelTo(storage.pos);
		}
	} else {
		creep.log("Err: no storage to deposit materials");
	}
}
