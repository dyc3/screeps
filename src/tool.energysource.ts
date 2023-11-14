import { Role } from "./roles/meta";
import util from "./util";

const toolEnergySource = {
	// adjusted: adjust harvester count for if containers/storage/links are nearby
	getMaxHarvesters(energySource: Source, adjusted = false): number {
		if (util.getOwnedRooms().length > 1) {
			return 1;
		}
		const terrain = Game.map.getRoomTerrain(energySource.pos.roomName);
		let count = 0;
		for (let y = energySource.pos.y - 1; y <= energySource.pos.y + 1; y++) {
			for (let x = energySource.pos.x - 1; x <= energySource.pos.x + 1; x++) {
				const thisterrain = terrain.get(x, y);
				if ((thisterrain & (TERRAIN_MASK_WALL | TERRAIN_MASK_LAVA)) > 0) {
					continue;
				}
				count++;
			}
		}
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

	getHarvesters(energySource: Source): number {
		let count = 0;
		const harvesters = util.getCreeps(Role.Harvester);
		for (const harvester of harvesters) {
			if (harvester.memory.harvestTarget === energySource.id) {
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
		if (util.getOwnedRooms().length === 1 && room.controller.level < 4) {
			return 3;
		} else {
			if (room.memory.harvestPositions) {
				return Object.keys(room.memory.harvestPositions).length;
			}
			return 2;
		}
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
