var util = require('util');

var brainAutoPlanner = {
	run: function() {
		let rooms = util.getOwnedRooms();
		for (let r = 0; r < rooms.length; r++) {
			let room = rooms[r];
			if (!Memory.rooms[room.name]) {
				Memory.rooms[room.name] = {};
			}
			if (!room.memory.structures) {
				this.planRoom(room);
			}
			this.applyRoomPlans(room);

			// if ((!Memory.rooms[room.name].walls || !Memory.rooms[room.name].ramparts) && Game.cpu.bucket > 9000) {
			//	this.planWalls(room, true);
			// }
			// this.buildWalls(room);
		}
	},

	planRoom: function(room, debug=false) {
		// fix room memory, if needed
		if (!Memory.rooms[room.name]) {
			Memory.rooms[room.name] = {};
		}
		room.memory.structures = {};
		for (let s in CONSTRUCTION_COST) { // HACK: using CONSTRUCTION_COST to get all the structure names because there is to STRUCTURES_ALL
			room.memory.structures[s] = [];
		}

		// build main base unit
		// . r r r r r .
		// r O O O O O r
		// r S . O . S r
		// r u O L O u r
		// r O . O . O r
		// r O O S O O r  <= the spawn here is the "root" of the base
		// . r r r r r .
		let rootPos = room.memory.rootPos;

		// the best root position is one that is equidistant to the sources and the controller
		// (this function is also used for finding the best storage module position)
		function _getTotalDistances(point, includeMineral=false, excludeSources=false, usePaths=false) {
			// NOTE: maybe this should the length of paths to the objects instead of ranges?
			let pos = new RoomPosition(point.x, point.y, room.name);
			let total = usePaths ? pos.findPathTo(room.controller).length : pos.getRangeTo(room.controller);
			if (!excludeSources) {
				let sources = room.find(FIND_SOURCES);
				for (let source of sources) {
					total += usePaths ? pos.findPathTo(source).length : pos.getRangeTo(source);
				}
			}
			if (includeMineral) {
				let minerals = room.find(FIND_MINERALS);
				for (let mineral of minerals) {
					total += usePaths ? pos.findPathTo(mineral).length : pos.getRangeTo(mineral);
				}
			}
			return total;
		}

		if (!rootPos) {
			// first, valid 6x6 areas
			let goodRootPositions = [];
			for (let y = 7; y <= 47; y++) {
				for (let x = 4; x <= 46; x++) {
					// check the 6x6 area
					let valid = true;
					for (let cY = y - 5; cY <= y + 1; cY++) {
						for (let cX = x - 3; cX <= x + 3; cX++) {
							let terrain = room.lookForAt(LOOK_TERRAIN, cX, cY)[0];
							if (terrain == "wall") {
								valid = false;
								break;
							}
						}
						if (!valid) {
							break;
						}
					}
					if (valid) {
						goodRootPositions.push({ x: x, y: y});
						if (debug) {
							room.visual.circle(x, y, { stroke: "#00ff00", fill: "transparent" });
						}
					}
				}
			}
			console.log("Found", goodRootPositions.length, "good root positions");
			goodRootPositions.sort(function(a, b) {
				return _getTotalDistances(a) - _getTotalDistances(b);
			});
			rootPos = goodRootPositions[0];
			console.log("Best root:", rootPos.x, ",", rootPos.y);
			room.memory.rootPos = rootPos;
		}
		else {
			console.log("Best root (cached):", rootPos.x, ",", rootPos.y);
		}

		if (debug) {
			room.visual.circle(rootPos.x, rootPos.y, { radius: .25, fill: "#ffff55" });
		}

		// add structures to room memory
		// roads
		for (let i = -2; i <= 2; i++) {
			room.memory.structures[STRUCTURE_ROAD].push({ x: rootPos.x + i, y: rootPos.y - 5 });
			room.memory.structures[STRUCTURE_ROAD].push({ x: rootPos.x + i, y: rootPos.y + 1 });
		}
		for (let i = -4; i <= 0; i++) {
			room.memory.structures[STRUCTURE_ROAD].push({ x: rootPos.x - 3, y: rootPos.y + i });
			room.memory.structures[STRUCTURE_ROAD].push({ x: rootPos.x + 3, y: rootPos.y + i });
		}

		// extensions
		for (let i = -2; i <= 2; i++) {
			room.memory.structures[STRUCTURE_EXTENSION].push({ x: rootPos.x + i, y: rootPos.y - 4 });
			if (i != 0) {
				room.memory.structures[STRUCTURE_EXTENSION].push({ x: rootPos.x + i, y: rootPos.y });
			}
			if (Math.abs(i) != 1) {
				room.memory.structures[STRUCTURE_EXTENSION].push({ x: rootPos.x + i, y: rootPos.y - 1 });
			}
		}
		room.memory.structures[STRUCTURE_EXTENSION].push({ x: rootPos.x, y: rootPos.y - 3 });
		room.memory.structures[STRUCTURE_EXTENSION].push({ x: rootPos.x - 1, y: rootPos.y - 2 });
		room.memory.structures[STRUCTURE_EXTENSION].push({ x: rootPos.x + 1, y: rootPos.y - 2 });

		// spawns
		room.memory.structures[STRUCTURE_SPAWN].push({ x: rootPos.x, y: rootPos.y });
		room.memory.structures[STRUCTURE_SPAWN].push({ x: rootPos.x + 2, y: rootPos.y - 3 });
		room.memory.structures[STRUCTURE_SPAWN].push({ x: rootPos.x - 2, y: rootPos.y - 3 });

		// link
		room.memory.structures[STRUCTURE_LINK].push({ x: rootPos.x, y: rootPos.y - 2 });

		// containers
		room.memory.structures[STRUCTURE_CONTAINER].push({ x: rootPos.x - 2, y: rootPos.y - 2 });
		room.memory.structures[STRUCTURE_CONTAINER].push({ x: rootPos.x + 2, y: rootPos.y - 2 });


		// build storage/trade unit
		let validStoragePos = [];
		let storageMaxRangeFromRoot = 8;
		let sources = room.find(FIND_SOURCES);
		let storagePos = room.memory.storagePos;
		if (!storagePos && !room.storage) {
			for (let y = Math.max(rootPos.y - storageMaxRangeFromRoot, 3); y < Math.min(rootPos.y + storageMaxRangeFromRoot, 47); y++) {
				for (let x = Math.max(rootPos.x - storageMaxRangeFromRoot, 3); x < Math.min(rootPos.x + storageMaxRangeFromRoot, 47); x++) {
					if (x >= rootPos.x - 3 && x <= rootPos.x + 3 && y <= rootPos.y + 1 && y >= rootPos.y - 5) {
						// the position is inside the main base unit
						continue;
					}

					let structs = room.lookForAt(LOOK_STRUCTURES, x, y);
					if (structs.length > 0 && structs[0].structureType != STRUCTURE_STORAGE) {
						continue;
					}


					let valid = true;
					for (let cY = y - 2; cY <= y + 2; cY++) {
						for (let cX = x; cX <= x + 3; cX++) {
							let terrain = room.lookForAt(LOOK_TERRAIN, cX, cY)[0];
							if (terrain == "wall") {
								valid = false;
								break;
							}
						}
						if (!valid) {
							break;
						}
					}
					for (let source of sources) {
						let pos = room.getPositionAt(x, y);
						if (pos.getRangeTo(source) <= 2) {
							valid = false;
							break;
						}
					}
					if (valid) {
						validStoragePos.push({ x: x, y: y });
						if (debug) {
							room.visual.circle(x, y, { stroke: "#00cccc", fill: "transparent" });
						}
					}
				}
			}
			validStoragePos.sort(function(a, b) {
				return _getTotalDistances(a, includeMineral=true, excludeSources=true, usePaths=true) - _getTotalDistances(b, includeMineral=true, excludeSources=true, usePaths=true);
			});
			storagePos = validStoragePos[0];
			room.memory.storagePos = storagePos;

			// TODO: plan path from root to controller
			let _tmpIsPlanned = this.isPositionPlanned;
			let pathToControllerResult = PathFinder.search(
				room.controller.pos,
				{ pos: room.getPositionAt(rootPos.x, rootPos.y), range: global.CONTROLLER_UPGRADE_RANGE },
				{
					maxRooms: 1,
					roomCallback: function(roomName) {
						let costMatrix = new PathFinder.CostMatrix();
						let room = new Room(roomName);

						for (let y = 0; y < 50; y++) {
							for (let x = 0; x < 50; x++) {
								if (x > rootPos.x - 2 && x < rootPos.x + 2) {
									if (y >= rootPos.y - 4 && y <= rootPos.y) {
										// this position is in the main base module
										costMatrix.set(x, y, Infinity);
										continue;
									}
								}


								let pos = room.getPositionAt(x, y);
								// console.log("DEBUG: ", pos);
								let isPlanned = _tmpIsPlanned(pos);
								if (isPlanned) {
									if (isPlanned == STRUCTURE_ROAD) {
										costMatrix.set(x, y, 0.5);
									}
									else {
										costMatrix.set(x, y, Infinity);
									}
								}
								else {
									costMatrix.set(x, y, 0);
								}
							}
						}
					}
				}
			);
			if (pathToControllerResult.incomplete) {
				console.error("FAILED TO FIND PATH from controller to rootPos");
				return;
			}

			let targetPathIdx = Math.round(pathToControllerResult.path.length * 0.65);
			room.visual.circle(targetPathIdx.x, targetPathIdx.y, { radius: .4, fill: "#cccc00" });
		}
		else {
			if (room.storage && room.storage.owner.username === global.WHOAMI) {
				console.log("WARN: using existing storage as storagePos");
				storagePos = room.storage.pos;
				room.memory.storagePos = storagePos;
			}
			else {
				console.log("WARN: storagePos must be assigned manually maybe?");
			}
		}
		room.memory.structures[STRUCTURE_STORAGE].push({ x: storagePos.x, y: storagePos.y });


		// FIXME: this is was just done really quickly, it needs to be more robust.
		let rootStoragePos = { x: storagePos.x + 1, y: storagePos.y };
		if (debug) {
			room.visual.circle(rootStoragePos.x, rootStoragePos.y, { radius: .25, fill: "#00cccc" });
		}
		console.log("Best storage unit root position:", rootStoragePos.x, ",", rootStoragePos.y);
		room.memory.structures[STRUCTURE_LINK].push({ x: rootStoragePos.x + 1, y: rootStoragePos.y });
		room.memory.structures[STRUCTURE_TERMINAL].push({ x: rootStoragePos.x, y: rootStoragePos.y + 1 });
		room.memory.structures[STRUCTURE_NUKER].push({ x: rootStoragePos.x + 1, y: rootStoragePos.y - 1 });

		// NOTE: this part, placing the extensions, should be robust enough though
		let storeAdj = util.getAdjacent(room.getPositionAt(rootStoragePos.x, rootStoragePos.y));
		for (let pos of storeAdj) {
			if (!this.isPositionPlanned(pos) && util.getStructuresAt(pos).length == 0) {
				room.memory.structures[STRUCTURE_EXTENSION].push({ x: pos.x, y: pos.y });
			}
		}


		// plan structures around sources
		for (let source of sources) {
			let _tmpIsPlanned = this.isPositionPlanned;
			let pathingResult = PathFinder.search(
				room.getPositionAt(rootPos.x, rootPos.y),
				{ pos: source.pos, range: 1 },
				{
					maxRooms: 1,
					roomCallback: function(roomName) {
						let costMatrix = new PathFinder.CostMatrix();
						let room = new Room(roomName);
						for (let y = 0; y < 50; y++) {
							for (let x = 0; x < 50; x++) {
								if (x > rootPos.x - 2 && x < rootPos.x + 2) {
									if (y >= rootPos.y - 4 && y <= rootPos.y) {
										// this position is in the main base module
										costMatrix.set(x, y, Infinity);
										continue;
									}
								}


								let pos = room.getPositionAt(x, y);
								// console.log("DEBUG: ", pos);
								let isPlanned = _tmpIsPlanned(pos);
								if (isPlanned) {
									if (isPlanned == STRUCTURE_ROAD) {
										costMatrix.set(x, y, 0.5);
									}
									else {
										costMatrix.set(x, y, Infinity);
									}
								}
								else {
									costMatrix.set(x, y, 0);
								}
							}
						}
					}
				}
			);
			if (pathingResult.incomplete) {
				console.error("FAILED TO FIND PATH from rootPos", rootPos.x, ",", rootPos.y, "to source", source.pos.x, ",", source.pos.y);
				continue;
			}
			let pathToSource = pathingResult.path;
			for (let pos of pathToSource) {
				if (this.isPositionPlanned(pos)) {
					continue;
				}
				room.memory.structures[STRUCTURE_ROAD].push({ x: pos.x, y: pos.y });
			}

			let harvestPos = pathToSource[pathToSource.length - 1];
			let _dir = util.getOppositeDirection(harvestPos.getDirectionTo(source.pos));
			let sourceLinkPos = util.getPositionInDirection(harvestPos, _dir);
			console.log("source link dir", _dir, "sourceLinkPos:", sourceLinkPos);
			room.memory.structures[STRUCTURE_LINK].push({ x: sourceLinkPos.x, y: sourceLinkPos.y });
			let harvestAdj = util.getAdjacent(harvestPos);
			for (let pos of harvestAdj) {
				if (util.getTerrainAt(pos) == "wall") {
					continue;
				}

				if (!this.isPositionPlanned(pos) && util.getStructuresAt(pos).length == 0) {
					room.memory.structures[STRUCTURE_EXTENSION].push({ x: pos.x, y: pos.y });
				}
			}
		}
	},

	/* pos is a RoomPosition object */
	// TODO: rename to something like "getPlansAtPosition"
	isPositionPlanned: function(pos) {
		room = new Room(pos.roomName);
		for (let struct in CONSTRUCTION_COST) { // iterate through all structure names
			if (!(struct in room.memory.structures)) {
				continue;
			}
			for (let p of room.memory.structures[struct]) {
				if (room.getPositionAt(p.x, p.y).isEqualTo(pos)) {
					return struct;
				}
			}
		}
		return false;
	},

	drawRoomPlans: function(room) {
		for (let struct in CONSTRUCTION_COST) { // iterate through all structure names
			if (!(struct in room.memory.structures)) {
				continue;
			}
			for (let pos of room.memory.structures[struct]) {
				if (struct === STRUCTURE_ROAD) {
					room.visual.circle(pos.x, pos.y, { fill: "#999999" });
				}
				else if (struct === STRUCTURE_SPAWN) {
					room.visual.circle(pos.x, pos.y, { fill: "#ffff88" });
				}
				else if (struct === STRUCTURE_EXTENSION) {
					room.visual.circle(pos.x, pos.y, { fill: "#ffaa66" });
				}
				else {
					room.visual.circle(pos.x, pos.y, { fill: "#ffffff" });
				}
				room.visual.text(struct.substring(0, 3), pos.x, pos.y, { fill: "#ffffff", font: 0.25 });
			}
		}
	},

	applyRoomPlans: function(room) {
		for (let struct in CONSTRUCTION_COST) { // iterate through all structure names
			let maxStructs = CONTROLLER_STRUCTURES[struct];
			let structCount = 0;
			if (!(struct in room.memory.structures)) {
				console.log("[WARN] no plans for", struct, "structures found");
				continue;
			}
			for (let pos of room.memory.structures[struct]) {
				room.createConstructionSite(pos.x, pos.y, struct);
				structCount++;
				if (structCount >= maxStructs) {
					break;
				}
			}
		}
	},

	/**
	 * Manually add plans at the specified position.
	 * @param {RoomPosition} pos The position to remove plans from
	 * @param {string} struct The STRUCTURE_* type to remove
	 * @example require("brain.autoplanner").addPlansAtPosition(new RoomPosition(22, 28, "W16N9"), STRUCTURE_TERMINAL)
	 */
	addPlansAtPosition(pos, struct) {
		if (!pos || !struct) {
			return;
		}

		room = new Room(pos.roomName);
		for (let checkPos of room.memory.structures[struct]) {
			if (room.getPositionAt(checkPos.x, checkPos.y).isEqualTo(pos)) {
				// plans already exist at this position
				return;
			}
		}

		room.memory.structures[struct].push({ x: pos.x, y: pos.y });
	},

	/**
	 * Manually remove plans at the specified position.
	 * @param {RoomPosition} pos The position to remove plans from
	 * @param {string} [struct=undefined] The STRUCTURE_* type to remove
	 * @example require("brain.autoplanner").removePlansAtPosition(new RoomPosition(22, 30, "W16N9"), STRUCTURE_TERMINAL)
	 */
	removePlansAtPosition(pos, struct=undefined) {
		room = new Room(pos.roomName);
		for (let structure in CONSTRUCTION_COST) { // iterate through all structure names
			if (!(structure in room.memory.structures)) {
				continue;
			}
			if (struct !== undefined && structure !== struct) {
				continue;
			}
			for (let p = 0; p < room.memory.structures[structure].length; p++) {
				let checkPos = room.memory.structures[structure][p];
				if (room.getPositionAt(checkPos.x, checkPos.y).isEqualTo(pos)) {
					room.memory.structures[structure].splice(p, 1);
				}
			}
		}
	},

	/** Plan extensions along paths from spawn to sources. **/
	planExtensions_old: function(room, debug=false) {

		var spawn = util.getSpawn(room);
		// if we haven't placed all our extensions yet, do that
		var extensionCount = util.getStructures(room, STRUCTURE_EXTENSION).length;
		if (extensionCount < CONTROLLER_STRUCTURES[STRUCTURE_EXTENSION][room.controller.level]) {
			console.log(room.name,"EXTENSIONS BUILT",extensionCount,"/",CONTROLLER_STRUCTURES[STRUCTURE_EXTENSION][room.controller.level])
			var extensionSites = util.getConstruction(room, STRUCTURE_EXTENSION).length;
			if (extensionCount + extensionSites < CONTROLLER_STRUCTURES[STRUCTURE_EXTENSION][room.controller.level]) {
				// console.log("PLACE EXTENSIONS")
				var sources = util.getSources(room);
				var spawn = util.getSpawn(room);
				if (!spawn) {
					return;
				}
				for (var s in sources) {
					var source = sources[s];
					var path = room.findPath(spawn.pos, source.pos, {ignoreCreeps:true});
					for (var p = 0; p < path.length; p++) {
						var pathStep = path[p];
						var pathPos = new RoomPosition(pathStep.x, pathStep.y, room.name);
						if (spawn.pos.inRangeTo(pathPos, 3) || source.pos.inRangeTo(pathPos, 3)) {
							continue;
						}
						if (spawn.room.controller.pos.inRangeTo(pathPos, 3)) {
							continue;
						}
						if (util.getStructuresAt(pathPos, STRUCTURE_ROAD).length == 0) {
							continue;
						}
						if (util.getConstructionAt(pathPos).length > 0) {
							continue;
						}
						var perps = util.getPerpendiculars(pathStep);
						for (var i = 0; i < perps.length; i++) {
							var roomPos = new RoomPosition(perps[i].x, perps[i].y, room.name);
							var terrain = util.getTerrainAt(roomPos);
							if (terrain == "wall") { continue; }
							if (util.getStructuresAt(roomPos).length > 0) {
								continue;
							}
							if (util.getConstructionAt(roomPos).length > 0) {
								continue;
							}
							if (debug) {
								new RoomVisual(roomPos.room).circle(roomPos, { radius: 0.5, fill: "transparent" });
							}
							else {
								var c = roomPos.createConstructionSite(STRUCTURE_EXTENSION);
								if (c != OK) {
									console.log("ERROR CREATING NEW EXTENSIONS:", c);
									break;
								}
							}
						}
					}
				}
			}
		}
	},

	// var brainAutoPlanner = require('brain.autoplanner'); brainAutoPlanner.planWalls(Game.rooms["ROOM"], true)
	planWalls: function(room, debug=true) {
		// these are used for saving positions later
		var walls = [];
		var ramparts = [];

		var wallPoints = [];
		for (var numSide = 0; numSide < 4; numSide++) {
			// if (numSide != 1) continue

			var ySide = numSide % 2 == 0 ? 0 : 49;
			var vertical = numSide >= 2;
			// output should be:
			// numSide: 0 - ySide = 0  vertical = false
			// numSide: 1 - ySide = 49  vertical = false
			// numSide: 2 - ySide = 0  vertical = true
			// numSide: 3 - ySide = 49  vertical = true
			// console.log("numSide:", numSide, "- ySide =", ySide, " vertical =", vertical);
			var _startExit_x = -1;
			var _endExit_x = -1;
			for (var x = 0; x < 50; x++) {
				var testpos = (!vertical ? new RoomPosition(x, ySide, room.name) : new RoomPosition(ySide, x, room.name))
				// console.log(testpos);
				if (_startExit_x < 0 && util.getTerrainAt(testpos) == "plain") {
					_startExit_x = x - 2;
				}
				if (_startExit_x >= 0 && _endExit_x < _startExit_x && util.getTerrainAt(testpos) == "wall") {
					_endExit_x = x + 1;
				}

				if (_startExit_x >= 0 && _endExit_x > _startExit_x) {
					var forbiddenPos = [];

					// figure out where the wall should NOT go
					var costs = new PathFinder.CostMatrix();
					for (var rY = 0; rY < 50; rY++) {
						for (var rX = 0; rX < 50; rX++) {
							if ((_startExit_x < rX && rX < _endExit_x) && (ySide == 0 ? (0 <= rY && rY <= 1) : (48 <= rY && rY <= 49))) {
								!vertical ? costs.set(rX, rY, Infinity) : costs.set(rY, rX, Infinity);
								!vertical ? forbiddenPos.push([rX, rY]) : forbiddenPos.push([rY, rX]);
								if (debug)
									!vertical ? room.visual.circle(rX, rY, {fill: '#ff0000', radius: 0.3, stroke: '#ff0000'}) : room.visual.circle(rY, rX, {fill: '#ff0000', radius: 0.3, stroke: '#ff0000'})
								continue;
							}
							else if ((rX == _startExit_x || rX == _endExit_x) && rY == ySide) {
								!vertical ? costs.set(rX, rY, 1) : costs.set(rY, rX, 1);
								// if (numSide == 1) room.visual.circle(rX, rY, {fill: '#88cc44', radius: 0.4, stroke: '#8844cc'})
								continue;
							}
							else {
								var costMultiplier = Math.abs(ySide - rY);
								if (costMultiplier == 0) {
									costMultiplier = 1;
								}
								// var costMultiplier = Math.abs(ySide - (rY/2))
								// if (costMultiplier < 1) costMultiplier = 1

								var rPos = (!vertical ? new RoomPosition(rX, rY, room.name) : new RoomPosition(rY, rX, room.name));
								var cost = 1;
								switch (util.getTerrainAt(rPos)) {
									case "wall":
										cost = 1 * costMultiplier
										!vertical ? costs.set(rX, rY, cost) : costs.set(rY, rX, cost)
										break;
									default:
										if (util.getStructuresAt(rPos).some(function(struct) { return struct.structureType == STRUCTURE_WALL || struct.structureType == STRUCTURE_RAMPART })) {
											cost = 1;
											!vertical ? costs.set(rX, rY, cost) : costs.set(rY, rX, cost);
											if ((!vertical ? rX : rY) < 9) {
												var structAtPos = util.getStructuresAt(rPos)
												if (structAtPos[0].structureType == STRUCTURE_WALL) {
													walls.push((!vertical ? [rX, rY] : [rY, rX]));
												}
												else if (structAtPos[0].structureType == STRUCTURE_RAMPART) {
													ramparts.push((!vertical ? [rX, rY] : [rY, rX]));
												}
											}
										}
										else {
											cost = 4 * costMultiplier;
											!vertical ? costs.set(rX, rY, cost) : costs.set(rY, rX, cost);
										}
								}
								// if (numSide == 1 && cost < 20) room.visual.circle(rX, rY, {fill: '#8844cc', radius: (cost/30), stroke: '#8844cc'})
							}
						}
					}
					// console.log("forbidden pos:", forbiddenPos.length);

					// figure out where the wall SHOULD go
					var wallStartPos = (!vertical ? new RoomPosition(_startExit_x, Math.abs(ySide - (_startExit_x == 0 ? 1 : 0)), room.name) : new RoomPosition(ySide, _startExit_x, room.name));
					var wallEndPos = (!vertical ? new RoomPosition(_endExit_x, Math.abs(ySide), room.name) : new RoomPosition(ySide, _endExit_x, room.name));
					if (debug) {
						room.visual.circle(wallStartPos, {fill: 'transparent', radius: 0.2, stroke: '#ff5577'})
						room.visual.circle(wallEndPos, {fill: 'transparent', radius: 0.2, stroke: '#ff5577'})
					}
					var result = PathFinder.search(wallStartPos, {pos:wallEndPos, range:1}, {
							roomCallback: (roomName) => { return costs },
							maxRooms:1, //maxCost:600,
							plainCost:2, swampCost:2,
						});
					// room.visual.poly(result.path, {stroke:"#ff8800"})

					for (var i = 0; i < result.path.length; i++) {
						var pathpos = result.path[i];

						// fix diagonals
						if (i > 0) {
							if (result.path[i].x != result.path[i-1].x && result.path[i].y != result.path[i-1].y) {
								var diag1 = new RoomPosition(result.path[i].x, result.path[i-1].y, room.name);
								var diag2 = new RoomPosition(result.path[i-1].x, result.path[i].y, room.name);
								// if (debug) {
								// 	room.visual.circle(diag1, {fill: '#ff8800', radius: 0.3, stroke: '#ff8800'})
								// 	room.visual.circle(diag2, {fill: '#ffff00', radius: 0.5, stroke: '#ffff00'})
								// }
								if (_.some(forbiddenPos, (p) => { return p[0] == diag1.x && p[1] == diag1.y } )) {
									wallPoints.push(diag2);
								}
								else if (_.some(forbiddenPos, (p) => { return p[0] == diag2.x && p[1] == diag2.y } )) {
									wallPoints.push(diag1);
								}
								else {
									var dist1 = Math.abs(ySide - (!vertical ? diag1.y : diag1.x));
									var dist2 = Math.abs(ySide - (!vertical ? diag2.y : diag2.x));
									// wallPoints.push(ySide == 0 ? diag1 : diag2)
									wallPoints.push(dist1 < dist2 ? diag1 : diag2);
								}
							}
						}
						wallPoints.push(pathpos);
					}

					_startExit_x = -1;
					_endExit_x = -1;
				}
			}
		}
		wallPoints = _.uniq(wallPoints);

		if (debug) room.visual.poly(wallPoints, {lineStyle:"dotted", stroke:"#55ff77"});

		var costs_mod = new PathFinder.CostMatrix()
		for (var w = 0; w < wallPoints.length; w++) {
			costs_mod.set(wallPoints[w].x, wallPoints[w].y, Infinity)
		}
		wallPoints = _.reject(wallPoints, function(pos) {
			if (util.getTerrainAt(pos) == "wall") {
				return true;
			}
			if (util.getStructuresAt(pos, STRUCTURE_WALL).length > 0 || util.getStructuresAt(pos, STRUCTURE_RAMPART).length > 0) {
				return true;
			}
			var testPath = PathFinder.search(pos, { pos: Game.rooms[room.name].controller.pos, range: 1 }, {
					roomCallback: function(roomName) {
						var temp = costs_mod.clone();
						temp.set(pos.x, pos.y, 0);
						return temp;
					},
					maxRooms:1, //maxCost:800,
				});
			if (testPath.incomplete) {
				return true;
			}
		})

		// figure out where the ramparts should go
		var rampartPoints = [];
		var spawn = util.getSpawn(room); // TODO: target the rooms storage instead?
		var pathsToExits = [];
		var exits = Game.map.describeExits(room.name);
		for (var e in exits) {
			pathsToExits.push(spawn.pos.findPathTo(new RoomPosition(25, 25, exits[e])));
		}
		var rampartsEvery = 2; // place ramparts evert X places
		var offsets = {}; // offset rampart positions by these values (key: [int] side number, value: [int] offset)
		// for (var w = 0; w < wallPoints.length; w++) {
		// 	var wallPoint = wallPoints[w]
		// 	for (var p = 0; p < pathsToExits.length; p++) {
		// 		var path = pathsToExits[p]
		// 		for (var i = 0; i < path.length; i++) {
		// 			var pathpos = path[i]
		// 			if (pathpos.x == wallPoint.x && pathpos.y == wallPoint.y) {
		// 				// take the wallPoint out of wallPoints and put it in rampartPoints
		// 				// .splice() removes and returns an array of values from the original array
		// 				rampartPoints = _.union(rampartPoints, wallPoints.splice(w, 2))
		// 				w -= 2
		// 				break;
		// 			}
		// 		}
		// 	}
		// }
		for (var p = 0; p < pathsToExits.length; p++) {
			var path = pathsToExits[p];
			for (var i = 0; i < path.length; i++) {
				var pathpos = path[i];
				for (var w = 0; w < wallPoints.length; w++) {
					var wallPoint = wallPoints[w];
					if (pathpos.x == wallPoint.x && pathpos.y == wallPoint.y) {
						offsets[exits[p]] = w % rampartsEvery;
						break;
					}
				}
			}
		}
		var bestOffset = util.mode(_.values(offsets)); // because I'm lazy
		console.log("bestOffset: ", bestOffset);
		for (var w = 0; w < wallPoints.length; w++) {
			var wallPoint = wallPoints[w];
			if (w % rampartsEvery == bestOffset) {
				// take the wallPoint out of wallPoints and put it in rampartPoints
				// .splice() removes and returns an array of values from the original array
				rampartPoints = _.union(rampartPoints, wallPoints.splice(w, 1));
			}
		}

		if (debug) {
			for (var w = 0; w < wallPoints.length; w++) {
				room.visual.circle(wallPoints[w], {fill: '#5577ff', radius: 0.3, stroke: '#5577ff'});
			}
			for (var r = 0; r < rampartPoints.length; r++) {
				room.visual.circle(rampartPoints[r], {fill: '#ff44ff', radius: 0.3, stroke: '#ff44ff'});
			}
		}

		// save points in memory so we can rebuild walls later without recalculating
		for (var w in wallPoints) {
			var wallPoint = wallPoints[w];
			walls.push([wallPoint.x, wallPoint.y]);
		}
		Memory.rooms[room.name].walls = walls
		for (var r in rampartPoints) {
			var rampartPoint = rampartPoints[r];
			ramparts.push([rampartPoint.x, rampartPoint.y]);
		}
		Memory.rooms[room.name].ramparts = ramparts;
	},

	buildWalls: function(room) {
		var hasPlacedSite = false;
		if (Memory.rooms[room.name].walls) {
			for (var w in Memory.rooms[room.name].walls) {
				var wall = Memory.rooms[room.name].walls[w];
				var pos = new RoomPosition(wall[0], wall[1], room.name);
				if (pos.createConstructionSite(STRUCTURE_WALL) == OK) {
					hasPlacedSite = true;
					break;
				}
			}
		}
		if (hasPlacedSite) {
			return;
		}

		if (Memory.rooms[room.name].ramparts) {
			for (var r in Memory.rooms[room.name].ramparts) {
				var rampart = Memory.rooms[room.name].ramparts[r]
				var pos = new RoomPosition(rampart[0], rampart[1], room.name)
				if (pos.createConstructionSite(STRUCTURE_RAMPART) == OK) {
					hasPlacedSite = true;
					break;
				}
			}
		}
	},
};

global.autoPlanner = {
    addPlans: brainAutoPlanner.addPlansAtPosition,
    removePlans: brainAutoPlanner.removePlansAtPosition,
};

module.exports = brainAutoPlanner;