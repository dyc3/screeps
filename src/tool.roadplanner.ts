const toolRoadPlanner = {
	planPath(posFrom: RoomPosition, posTo: RoomPosition): void {
		const path = posFrom.findPathTo(posTo, { ignoreCreeps: true });
		for (const pos of path) {
			// Game.rooms[posFrom.roomName].createFlag(path[i].x,path[i].y,"plan"+i,COLOR_PURPLE);
			Game.rooms[posFrom.roomName].createConstructionSite(pos.x, pos.y, STRUCTURE_ROAD);
		}
	},

	clearAllPlanFlags(): void {
		for (const flag in Game.flags) {
			if (flag.includes("plan")) {
				Game.flags[flag].remove();
			}
		}
	},
};

module.exports = toolRoadPlanner;
export default toolRoadPlanner;
