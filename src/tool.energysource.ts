import { Role } from "./roles/meta";
import util from "./util";

const SPACES_AROUND_SOURCE_CACHE = new Map<string, number>();

const toolEnergySource = {
	// adjusted: adjust harvester count for if containers/storage/links are nearby
	getMaxHarvesters(energySource: Source, adjusted = false): number {
		if (util.getOwnedRooms().length > 1) {
			return 1;
		}
		let count = this.countFreeSpacesAroundSource(energySource);
		if (adjusted) {
			if (
				energySource.pos.findInRange(FIND_STRUCTURES, 2, {
					filter: struct =>
						struct.structureType === STRUCTURE_CONTAINER ||
						struct.structureType === STRUCTURE_LINK ||
						struct.structureType === STRUCTURE_STORAGE,
				}).length > 0
			) {
				count = 1;
			}
		}
		return count > 2 ? 2 : count;
	},

	countFreeSpacesAroundSource(energySource: Source): number {
		if (SPACES_AROUND_SOURCE_CACHE.has(energySource.id)) {
			return SPACES_AROUND_SOURCE_CACHE.get(energySource.id) ?? 1;
		}
		const terrain = Game.map.getRoomTerrain(energySource.pos.roomName);
		let count = 0;
		for (let y = energySource.pos.y - 1; y <= energySource.pos.y + 1; y++) {
			for (let x = energySource.pos.x - 1; x <= energySource.pos.x + 1; x++) {
				const thisterrain = terrain.get(x, y);
				// eslint-disable-next-line no-bitwise
				if ((thisterrain & (TERRAIN_MASK_WALL | TERRAIN_MASK_LAVA)) > 0) {
					continue;
				}
				count++;
			}
		}
		SPACES_AROUND_SOURCE_CACHE.set(energySource.id, count);
		return count;
	},

	getHarvesters(energySource: Source): number {
		let count = 0;
		const harvesters = util.getCreeps(Role.Harvester, Role.Worker);
		for (const harvester of harvesters) {
			if (harvester.memory.harvestTarget === energySource.id) {
				count++;
			} else if (harvester.memory.gatherTarget === energySource.id && !harvester.memory.working) {
				count++;
			}
		}
		return count;
	},

	canAssignSource(energySource: Source): boolean {
		const maxHarvestersOnSource = this.getMaxHarvesters(energySource, true);
		const harvestersOnSource = this.getHarvesters(energySource);
		return harvestersOnSource < maxHarvestersOnSource;
	},

	getHarvesterQuota(this: void, room: Room): number {
		if (!room.controller) {
			return 0;
		}
		if (room.memory.harvestPositions) {
			return Object.keys(room.memory.harvestPositions).length;
		}
		return 2;
	},

	drawAssignedCounts(): void {
		const rooms = util.getOwnedRooms();
		for (const room of rooms) {
			const sources = room.find(FIND_SOURCES);
			for (const source of sources) {
				const count = this.getHarvesters(source);
				const max = this.getMaxHarvesters(source, true);

				const text = `${count}/${max}`;
				const color = count <= max ? "#11dd11" : "#dd1111";
				room.visual.text(text, source.pos, { color, font: 0.4, stroke: "#000" });
			}
		}
	},
};

module.exports = toolEnergySource;
export default toolEnergySource;
