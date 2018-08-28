var toolRoadPlanner = {
	/** @param {RoomPosition} posFrom **/
	/** @param {RoomPosition} posTo **/
	planPath: function(posFrom, posTo) {
		var path = posFrom.findPathTo(posTo, {ignoreCreeps:true,});
		for (var i = 0; i < path.length; i++) {
			//Game.rooms[posFrom.roomName].createFlag(path[i].x,path[i].y,"plan"+i,COLOR_PURPLE);
			Game.rooms[posFrom.roomName].createConstructionSite(path[i].x, path[i].y, STRUCTURE_ROAD);
		}
	},

	clearAllPlanFlags: function() {
		for (var flag in Game.flags) {
			if (flag.includes("plan")) {
				Game.flags[flag].remove();
			}
		}
	}
}

module.exports = toolRoadPlanner;
