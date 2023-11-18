import util from "./util";

interface Pos {
	x: number;
	y: number;
}

const brainAutoPlanner = {
	run(): void {
		const rooms = util.getOwnedRooms();
		for (const room of rooms) {
			if (!Memory.rooms[room.name]) {
				Memory.rooms[room.name] = {};
			}
			if (!room.memory.structures) {
				this.planRoom(room);
			}
			if (room.memory.defcon === 0) {
				this.applyRoomPlans(room);
			}

			// if ((!Memory.rooms[room.name].walls || !Memory.rooms[room.name].ramparts) && Game.cpu.bucket > 9000) {
			//	this.planWalls(room, true);
			// }
			// this.buildWalls(room);
		}
	},

	planRoom(room: Room, debug = false): void {
		// fix room memory, if needed
		if (!Memory.rooms[room.name]) {
			Memory.rooms[room.name] = {};
		}
		room.memory.structures = {};
		for (const s in CONSTRUCTION_COST) {
			// HACK: using CONSTRUCTION_COST to get all the structure names because there is to STRUCTURES_ALL
			room.memory.structures[s] = [];
		}

		if (!room.controller) {
			console.log("WARN: room", room.name, "has no controller");
			return;
		}

		// build main base unit
		// . r r r r r .
		// r O O O O O r
		// r S . O . S r
		// r u O L O u r
		// r O . O . O r
		// r O O S O O r  <= the spawn here is the "root" of the base
		// . r r r r r .
		let rootPos: Pos | undefined = room.memory.rootPos;

		// the best root position is one that is equidistant to the sources and the controller
		// (this function is also used for finding the best storage module position)
		function getTotalDistances(point: Pos, includeMineral = false, excludeSources = false, usePaths = false) {
			const opts = {
				maxRooms: 1,
				costCallback: (roomName: string, costMatrix: CostMatrix) => {
					for (let y = 0; y <= 3; y++) {
						for (let x = 0; x <= 3; x++) {
							costMatrix.set(x, y, 0xff);
						}
					}
					for (let y = 47; y < 50; y++) {
						for (let x = 47; x < 50; x++) {
							costMatrix.set(x, y, 0xff);
						}
					}
				},
			};
			// NOTE: maybe this should the length of paths to the objects instead of ranges?
			const pos = new RoomPosition(point.x, point.y, room.name);
			let total = usePaths ? pos.findPathTo(room.controller, opts).length : pos.getRangeTo(room.controller);
			if (!excludeSources) {
				const sources = room.find(FIND_SOURCES);
				for (const source of sources) {
					total += usePaths ? pos.findPathTo(source, opts).length : pos.getRangeTo(source);
				}
			}
			if (includeMineral) {
				const minerals = room.find(FIND_MINERALS);
				for (const mineral of minerals) {
					total += usePaths ? pos.findPathTo(mineral, opts).length : pos.getRangeTo(mineral);
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
						for (let cX = x - 4; cX <= x + 4; cX++) {
							const terrain = room.lookForAt(LOOK_TERRAIN, cX, cY)[0];
							if (terrain === "wall") {
								valid = false;
								break;
							}
						}
						if (!valid) {
							break;
						}
					}
					if (valid) {
						goodRootPositions.push({ x, y });
						if (debug) {
							room.visual.circle(x, y, { stroke: "#00ff00", fill: "transparent" });
						}
					}
				}
			}
			console.log("Found", goodRootPositions.length, "good root positions");
			const center = new RoomPosition(25, 25, room.name);
			goodRootPositions = _.sortByOrder(
				goodRootPositions,
				[
					(pos: Pos) => {
						return new RoomPosition(pos.x, pos.y, room.name).getRangeTo(center);
					},
					(pos: Pos) => {
						return getTotalDistances(pos);
					},
				],
				["asc", "asc"]
			);
			rootPos = goodRootPositions[0];
			console.log("Best root:", rootPos.x, ",", rootPos.y);
			room.memory.rootPos = rootPos;
		} else {
			console.log("Best root (cached):", rootPos.x, ",", rootPos.y);
		}

		if (!rootPos) {
			console.log("WARN: no root position found");
			return;
		}

		if (debug) {
			room.visual.circle(rootPos.x, rootPos.y, { radius: 0.25, fill: "#ffff55" });
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
			if (i !== 0) {
				room.memory.structures[STRUCTURE_EXTENSION].push({ x: rootPos.x + i, y: rootPos.y });
			}
			if (Math.abs(i) !== 1) {
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

		// towers
		room.memory.structures[STRUCTURE_TOWER].push({ x: rootPos.x - 3, y: rootPos.y + 1 });
		room.memory.structures[STRUCTURE_TOWER].push({ x: rootPos.x + 3, y: rootPos.y + 1 });
		room.memory.structures[STRUCTURE_TOWER].push({ x: rootPos.x - 3, y: rootPos.y - 5 });
		room.memory.structures[STRUCTURE_TOWER].push({ x: rootPos.x + 3, y: rootPos.y - 5 });

		// build storage/trade unit
		const validStoragePos = [];
		const storageMaxRangeFromRoot = 8;
		const sources = room.find(FIND_SOURCES);
		let storagePos = room.memory.storagePos;
		if (!storagePos && !room.storage) {
			for (
				let y = Math.max(rootPos.y - storageMaxRangeFromRoot, 3);
				y < Math.min(rootPos.y + storageMaxRangeFromRoot, 47);
				y++
			) {
				for (
					let x = Math.max(rootPos.x - storageMaxRangeFromRoot, 3);
					x < Math.min(rootPos.x + storageMaxRangeFromRoot, 47);
					x++
				) {
					if (x >= rootPos.x - 3 && x <= rootPos.x + 3 && y <= rootPos.y + 1 && y >= rootPos.y - 5) {
						// the position is inside the main base unit
						continue;
					}

					const structs = room.lookForAt(LOOK_STRUCTURES, x, y);
					if (structs.length > 0 && structs[0].structureType !== STRUCTURE_STORAGE) {
						continue;
					}

					let valid = true;
					for (let cY = y - 2; cY <= y + 2; cY++) {
						for (let cX = x; cX <= x + 3; cX++) {
							const terrain = room.lookForAt(LOOK_TERRAIN, cX, cY)[0];
							if (terrain === "wall") {
								valid = false;
								break;
							}
						}
						if (!valid) {
							break;
						}
					}
					for (const source of sources) {
						const pos = room.getPositionAt(x, y);
						if (pos.getRangeTo(source) <= 2) {
							valid = false;
							break;
						}
					}
					if (valid) {
						validStoragePos.push({ x, y });
						if (debug) {
							room.visual.circle(x, y, { stroke: "#00cccc", fill: "transparent" });
						}
					}
				}
			}
			validStoragePos.sort(function (a, b) {
				return getTotalDistances(a, true, true, true) - getTotalDistances(b, true, true, true);
			});
			storagePos = validStoragePos[0];
			room.memory.storagePos = storagePos;

			// TODO: plan path from root to controller
			const tmpIsPlanned = this.getPlansAtPosition;
			const pathToControllerResult = PathFinder.search(
				room.controller.pos,
				{ pos: room.getPositionAt(rootPos.x, rootPos.y), range: global.CONTROLLER_UPGRADE_RANGE },
				{
					maxRooms: 1,
					roomCallback(roomName) {
						const costMatrix = new PathFinder.CostMatrix();
						const room = new Room(roomName);

						for (let y = 0; y < 50; y++) {
							for (let x = 0; x < 50; x++) {
								if (x > rootPos.x - 2 && x < rootPos.x + 2) {
									if (y >= rootPos.y - 4 && y <= rootPos.y) {
										// this position is in the main base module
										costMatrix.set(x, y, Infinity);
										continue;
									}
								}

								const pos = room.getPositionAt(x, y);
								// console.log("DEBUG: ", pos);
								const isPlanned = tmpIsPlanned(pos);
								if (isPlanned) {
									if (isPlanned === STRUCTURE_ROAD) {
										costMatrix.set(x, y, 0.5);
									} else {
										costMatrix.set(x, y, Infinity);
									}
								} else {
									costMatrix.set(x, y, 0);
								}
							}
						}
					},
				}
			);
			if (pathToControllerResult.incomplete) {
				console.error("FAILED TO FIND PATH from controller to rootPos");
				return;
			}

			const targetPathIdx = Math.round(pathToControllerResult.path.length * 0.65);
			room.visual.circle(targetPathIdx.x, targetPathIdx.y, { radius: 0.4, fill: "#cccc00" });
		} else {
			if (room.storage && room.storage.owner.username === global.WHOAMI) {
				console.log("WARN: using existing storage as storagePos");
				storagePos = room.storage.pos;
				room.memory.storagePos = storagePos;
			} else {
				console.log("WARN: storagePos must be assigned manually maybe?");
			}
		}
		room.memory.structures[STRUCTURE_STORAGE].push({ x: storagePos.x, y: storagePos.y });

		// FIXME: this is was just done really quickly, it needs to be more robust.
		const rootStoragePos = { x: storagePos.x + 1, y: storagePos.y };
		if (debug) {
			room.visual.circle(rootStoragePos.x, rootStoragePos.y, { radius: 0.25, fill: "#00cccc" });
		}
		console.log("Best storage unit root position:", rootStoragePos.x, ",", rootStoragePos.y);
		room.memory.structures[STRUCTURE_LINK].push({ x: rootStoragePos.x + 1, y: rootStoragePos.y });
		room.memory.structures[STRUCTURE_TERMINAL].push({ x: rootStoragePos.x, y: rootStoragePos.y + 1 });
		room.memory.structures[STRUCTURE_NUKER].push({ x: rootStoragePos.x + 1, y: rootStoragePos.y - 1 });

		// NOTE: this part, placing the extensions, should be robust enough though
		const storeAdj = util.getAdjacent(room.getPositionAt(rootStoragePos.x, rootStoragePos.y));
		for (const pos of storeAdj) {
			if (!this.getPlansAtPosition(pos) && util.getStructuresAt(pos).length === 0) {
				room.memory.structures[STRUCTURE_EXTENSION].push({ x: pos.x, y: pos.y });
			}
		}

		// plan structures around sources
		this.planHarvestPositions(room);
	},

	/**
	 * Plans the placement of harvest positions, the placement of building around the harvest position, and the road to the harvest position.
	 * @param {Room} room
	 * @example require("brain.autoplanner").planHarvestPositions(Game.rooms["W17N11"]);
	 */
	planHarvestPositions(room: Room): boolean {
		room.memory.harvestPositions = {};
		const sources = room.find(FIND_SOURCES);

		// plan structures around sources
		for (const source of sources) {
			const terrain = Game.map.getRoomTerrain(room.name);
			let adjacent = util.getAdjacent(source.pos).filter(pos => {
				if (terrain.get(pos.x, pos.y) === TERRAIN_MASK_WALL) {
					return false;
				}

				const lookResult = pos.look();
				for (const look of lookResult) {
					if (look.type !== LOOK_STRUCTURES && look.type !== LOOK_TERRAIN) {
						continue;
					}

					if (look.type === LOOK_STRUCTURES) {
						if (
							look.structure.structureType !== STRUCTURE_ROAD &&
							look.structure.structureType !== STRUCTURE_CONTAINER &&
							look.structure.structureType !== STRUCTURE_RAMPART
						) {
							return false;
						}
					}
				}
				const planned = brainAutoPlanner.getPlansAtPosition(pos);
				return !planned || [STRUCTURE_ROAD, STRUCTURE_CONTAINER].includes(planned);
			});
			adjacent = _.sortByOrder(
				adjacent,
				[
					pos => !util.isDistFromEdge(pos, 4),
					pos => {
						// count the number of non-wall tiles adjacent to the position
						const adj = util.getAdjacent(pos);
						let count = 0;
						for (const a of adj) {
							if (terrain.get(a.x, a.y) !== TERRAIN_MASK_WALL) {
								count++;
							}
						}
						return count;
					},
				],
				["desc", "desc"]
			);

			const harvestPos = adjacent[0];
			console.log("Harvest position:", harvestPos);
			room.memory.harvestPositions[source.id] = { x: harvestPos.x, y: harvestPos.y };
			const harvestAdj = util.getAdjacent(harvestPos);
			const sourceLinkPos = harvestAdj.splice(0, 1)[0];
			console.log("sourceLinkPos:", sourceLinkPos);
			room.memory.structures[STRUCTURE_LINK].push({ x: sourceLinkPos.x, y: sourceLinkPos.y });

			// plan roads
			const rootPos = room.getPositionAt(room.memory.rootPos.x, room.memory.rootPos.y);
			if (!rootPos) {
				console.log("WARN: no root position found");
				return false;
			}
			const tmpIsPlanned = this.getPlansAtPosition;
			const pathingResult = PathFinder.search(
				room.getPositionAt(rootPos.x, rootPos.y),
				{ pos: harvestPos, range: 1 },
				{
					maxRooms: 1,
					roomCallback(roomName) {
						const costMatrix = new PathFinder.CostMatrix();
						const room = new Room(roomName);
						for (let y = 0; y < 50; y++) {
							for (let x = 0; x < 50; x++) {
								if (x > rootPos.x - 2 && x < rootPos.x + 2) {
									if (y >= rootPos.y - 4 && y <= rootPos.y) {
										// this position is in the main base module
										costMatrix.set(x, y, Infinity);
										continue;
									}
								}
								if (x <= 3 || x >= 47 || y <= 3 || y >= 47) {
									costMatrix.set(x, y, 0xff);
									continue;
								}

								const pos = room.getPositionAt(x, y);
								// console.log("DEBUG: ", pos);
								const isPlanned = tmpIsPlanned(pos);
								if (isPlanned) {
									if (isPlanned === STRUCTURE_ROAD) {
										costMatrix.set(x, y, 0.5);
									} else {
										costMatrix.set(x, y, Infinity);
									}
								} else {
									costMatrix.set(x, y, 0);
								}
							}
						}
					},
				}
			);
			if (pathingResult.incomplete) {
				console.error(
					"FAILED TO FIND PATH from rootPos",
					rootPos.x,
					",",
					rootPos.y,
					"to source",
					source.pos.x,
					",",
					source.pos.y
				);
				continue;
			}
			const pathToSource = pathingResult.path;
			for (const pos of pathToSource) {
				if (this.getPlansAtPosition(pos)) {
					continue;
				}
				room.memory.structures[STRUCTURE_ROAD].push({ x: pos.x, y: pos.y });
			}

			// plan extentions in remaining spots
			// since the road from the path is
			// for (let pos of harvestAdj) {
			// 	if (terrain.get(pos.x, pos.y) === "wall") {
			// 		continue;
			// 	}

			// 	if (!this.getPlansAtPosition(pos) && util.getStructuresAt(pos).length === 0) {
			// 		room.memory.structures[STRUCTURE_EXTENSION].push({ x: pos.x, y: pos.y });
			// 	}
			// }
		}
	},

	/**
	 * Gets a single planned structure at `pos`. Does not require vision
	 * @param {RoomPosition} pos
	 * @returns {String}
	 */
	getPlansAtPosition(pos: RoomPosition): string | false {
		const memory = Memory.rooms[pos.roomName];
		if (!memory.structures) {
			return false;
		}
		// iterate through all structure names
		for (const struct in CONSTRUCTION_COST) {
			if (!(struct in memory.structures)) {
				continue;
			}
			for (const p of memory.structures[struct]) {
				if (pos.x === p.x && pos.y === p.y) {
					return struct;
				}
			}
		}
		return false;
	},

	drawRoomPlans(room: Room): void {
		for (const struct in CONSTRUCTION_COST) {
			// iterate through all structure names
			if (!(struct in room.memory.structures)) {
				continue;
			}
			for (const pos of room.memory.structures[struct]) {
				if (struct === STRUCTURE_ROAD) {
					room.visual.circle(pos.x, pos.y, { fill: "#999999" });
				} else if (struct === STRUCTURE_SPAWN) {
					room.visual.circle(pos.x, pos.y, { fill: "#ffff88" });
				} else if (struct === STRUCTURE_EXTENSION) {
					room.visual.circle(pos.x, pos.y, { fill: "#ffaa66" });
				} else {
					room.visual.circle(pos.x, pos.y, { fill: "#ffffff" });
				}
				room.visual.text(struct.substring(0, 3), pos.x, pos.y, { fill: "#ffffff", font: 0.25 });
			}
		}
	},

	applyRoomPlans(room: Room): void {
		for (const struct in CONSTRUCTION_COST) {
			// iterate through all structure names
			const maxStructs = CONTROLLER_STRUCTURES[struct];
			let structCount = 0;
			if (!(struct in room.memory.structures)) {
				console.log("[WARN] no plans for", struct, "structures found");
				continue;
			}
			for (const pos of room.memory.structures[struct]) {
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
	addPlansAtPosition(pos: RoomPosition, struct: BuildableStructureConstant): string {
		if (!pos || !struct) {
			return "";
		}

		const room = new Room(pos.roomName);
		for (const checkPos of room.memory.structures[struct]) {
			if (room.getPositionAt(checkPos.x, checkPos.y)?.isEqualTo(pos)) {
				// plans already exist at this position
				return "";
			}
		}

		room.memory.structures[struct].push({ x: pos.x, y: pos.y });
		return `Planned ${struct} at ${pos.x}, ${pos.y}, ${pos.roomName}`;
	},

	/**
	 * Manually remove plans at the specified position.
	 * @param {RoomPosition} pos The position to remove plans from
	 * @param {string} [struct=undefined] The STRUCTURE_* type to remove
	 * @example require("brain.autoplanner").removePlansAtPosition(new RoomPosition(22, 30, "W16N9"), STRUCTURE_TERMINAL)
	 */
	removePlansAtPosition(pos: RoomPosition, struct: BuildableStructureConstant | undefined = undefined): string {
		const room = new Room(pos.roomName);
		let count = 0;
		for (const structure in CONSTRUCTION_COST) {
			// iterate through all structure names
			if (!(structure in room.memory.structures)) {
				continue;
			}
			if (struct !== undefined && structure !== struct) {
				continue;
			}
			for (let p = 0; p < room.memory.structures[structure].length; p++) {
				const checkPos = room.memory.structures[structure][p];
				if (room.getPositionAt(checkPos.x, checkPos.y).isEqualTo(pos)) {
					room.memory.structures[structure].splice(p, 1);
					count++;
				}
			}
		}
		pos.lookFor(LOOK_CONSTRUCTION_SITES).forEach(s => s.remove());
		return `Removed ${count} plans at ${pos.x}, ${pos.y}, ${pos.roomName}`;
	},

	// var brainAutoPlanner = require('brain.autoplanner'); brainAutoPlanner.planWalls(Game.rooms["ROOM"], true)
	planWalls(room: Room, debug = true): void {
		// these are used for saving positions later
		const walls = [];
		const ramparts = [];

		let wallPoints = [];
		for (let numSide = 0; numSide < 4; numSide++) {
			// if (numSide !== 1) continue

			const ySide = numSide % 2 === 0 ? 0 : 49;
			const vertical = numSide >= 2;
			// output should be:
			// numSide: 0 - ySide = 0  vertical = false
			// numSide: 1 - ySide = 49  vertical = false
			// numSide: 2 - ySide = 0  vertical = true
			// numSide: 3 - ySide = 49  vertical = true
			// console.log("numSide:", numSide, "- ySide =", ySide, " vertical =", vertical);
			let _startExit_x = -1;
			let _endExit_x = -1;
			for (let x = 0; x < 50; x++) {
				const testpos = !vertical
					? new RoomPosition(x, ySide, room.name)
					: new RoomPosition(ySide, x, room.name);
				// console.log(testpos);
				if (_startExit_x < 0 && util.getTerrainAt(testpos) === "plain") {
					_startExit_x = x - 2;
				}
				if (_startExit_x >= 0 && _endExit_x < _startExit_x && util.getTerrainAt(testpos) === "wall") {
					_endExit_x = x + 1;
				}

				if (_startExit_x >= 0 && _endExit_x > _startExit_x) {
					const forbiddenPos = [];

					// figure out where the wall should NOT go
					var costs = new PathFinder.CostMatrix();
					for (let rY = 0; rY < 50; rY++) {
						for (let rX = 0; rX < 50; rX++) {
							if (
								_startExit_x < rX &&
								rX < _endExit_x &&
								(ySide === 0 ? 0 <= rY && rY <= 1 : 48 <= rY && rY <= 49)
							) {
								!vertical ? costs.set(rX, rY, Infinity) : costs.set(rY, rX, Infinity);
								!vertical ? forbiddenPos.push([rX, rY]) : forbiddenPos.push([rY, rX]);
								if (debug)
									!vertical
										? room.visual.circle(rX, rY, {
												fill: "#ff0000",
												radius: 0.3,
												stroke: "#ff0000",
										  })
										: room.visual.circle(rY, rX, {
												fill: "#ff0000",
												radius: 0.3,
												stroke: "#ff0000",
										  });
								continue;
							} else if ((rX === _startExit_x || rX === _endExit_x) && rY === ySide) {
								!vertical ? costs.set(rX, rY, 1) : costs.set(rY, rX, 1);
								// if (numSide === 1) room.visual.circle(rX, rY, {fill: '#88cc44', radius: 0.4, stroke: '#8844cc'})
								continue;
							} else {
								let costMultiplier = Math.abs(ySide - rY);
								if (costMultiplier === 0) {
									costMultiplier = 1;
								}
								// var costMultiplier = Math.abs(ySide - (rY/2))
								// if (costMultiplier < 1) costMultiplier = 1

								const rPos = !vertical
									? new RoomPosition(rX, rY, room.name)
									: new RoomPosition(rY, rX, room.name);
								let cost = 1;
								switch (util.getTerrainAt(rPos)) {
									case "wall":
										cost = 1 * costMultiplier;
										!vertical ? costs.set(rX, rY, cost) : costs.set(rY, rX, cost);
										break;
									default:
										if (
											util.getStructuresAt(rPos).some(function (struct) {
												return (
													struct.structureType === STRUCTURE_WALL ||
													struct.structureType === STRUCTURE_RAMPART
												);
											})
										) {
											cost = 1;
											!vertical ? costs.set(rX, rY, cost) : costs.set(rY, rX, cost);
											if ((!vertical ? rX : rY) < 9) {
												const structAtPos = util.getStructuresAt(rPos);
												if (structAtPos[0].structureType === STRUCTURE_WALL) {
													walls.push(!vertical ? [rX, rY] : [rY, rX]);
												} else if (structAtPos[0].structureType === STRUCTURE_RAMPART) {
													ramparts.push(!vertical ? [rX, rY] : [rY, rX]);
												}
											}
										} else {
											cost = 4 * costMultiplier;
											!vertical ? costs.set(rX, rY, cost) : costs.set(rY, rX, cost);
										}
								}
								// if (numSide === 1 && cost < 20) room.visual.circle(rX, rY, {fill: '#8844cc', radius: (cost/30), stroke: '#8844cc'})
							}
						}
					}
					// console.log("forbidden pos:", forbiddenPos.length);

					// figure out where the wall SHOULD go
					const wallStartPos = !vertical
						? new RoomPosition(_startExit_x, Math.abs(ySide - (_startExit_x === 0 ? 1 : 0)), room.name)
						: new RoomPosition(ySide, _startExit_x, room.name);
					const wallEndPos = !vertical
						? new RoomPosition(_endExit_x, Math.abs(ySide), room.name)
						: new RoomPosition(ySide, _endExit_x, room.name);
					if (debug) {
						room.visual.circle(wallStartPos, { fill: "transparent", radius: 0.2, stroke: "#ff5577" });
						room.visual.circle(wallEndPos, { fill: "transparent", radius: 0.2, stroke: "#ff5577" });
					}
					const result = PathFinder.search(
						wallStartPos,
						{ pos: wallEndPos, range: 1 },
						{
							roomCallback: roomName => {
								return costs;
							},
							maxRooms: 1, // maxCost:600,
							plainCost: 2,
							swampCost: 2,
						}
					);
					// room.visual.poly(result.path, {stroke:"#ff8800"})

					for (var i = 0; i < result.path.length; i++) {
						var pathpos = result.path[i];

						// fix diagonals
						if (i > 0) {
							if (
								result.path[i].x !== result.path[i - 1].x &&
								result.path[i].y !== result.path[i - 1].y
							) {
								var diag1 = new RoomPosition(result.path[i].x, result.path[i - 1].y, room.name);
								var diag2 = new RoomPosition(result.path[i - 1].x, result.path[i].y, room.name);
								// if (debug) {
								// 	room.visual.circle(diag1, {fill: '#ff8800', radius: 0.3, stroke: '#ff8800'})
								// 	room.visual.circle(diag2, {fill: '#ffff00', radius: 0.5, stroke: '#ffff00'})
								// }
								if (
									_.some(forbiddenPos, p => {
										return p[0] === diag1.x && p[1] === diag1.y;
									})
								) {
									wallPoints.push(diag2);
								} else if (
									_.some(forbiddenPos, p => {
										return p[0] === diag2.x && p[1] === diag2.y;
									})
								) {
									wallPoints.push(diag1);
								} else {
									const dist1 = Math.abs(ySide - (!vertical ? diag1.y : diag1.x));
									const dist2 = Math.abs(ySide - (!vertical ? diag2.y : diag2.x));
									// wallPoints.push(ySide === 0 ? diag1 : diag2)
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

		if (debug) room.visual.poly(wallPoints, { lineStyle: "dotted", stroke: "#55ff77" });

		const costs_mod = new PathFinder.CostMatrix();
		for (var w = 0; w < wallPoints.length; w++) {
			costs_mod.set(wallPoints[w].x, wallPoints[w].y, Infinity);
		}
		wallPoints = _.reject(wallPoints, function (pos) {
			if (util.getTerrainAt(pos) === "wall") {
				return true;
			}
			if (
				util.getStructuresAt(pos, STRUCTURE_WALL).length > 0 ||
				util.getStructuresAt(pos, STRUCTURE_RAMPART).length > 0
			) {
				return true;
			}
			const testPath = PathFinder.search(
				pos,
				{ pos: Game.rooms[room.name].controller.pos, range: 1 },
				{
					roomCallback(roomName) {
						const temp = costs_mod.clone();
						temp.set(pos.x, pos.y, 0);
						return temp;
					},
					maxRooms: 1, // maxCost:800,
				}
			);
			if (testPath.incomplete) {
				return true;
			}
		});

		// figure out where the ramparts should go
		let rampartPoints = [];
		const spawn = util.getSpawn(room); // TODO: target the rooms storage instead?
		const pathsToExits = [];
		const exits = Game.map.describeExits(room.name);
		for (const e in exits) {
			pathsToExits.push(spawn.pos.findPathTo(new RoomPosition(25, 25, exits[e])));
		}
		const rampartsEvery = 2; // place ramparts evert X places
		const offsets = {}; // offset rampart positions by these values (key: [int] side number, value: [int] offset)
		// for (var w = 0; w < wallPoints.length; w++) {
		// 	var wallPoint = wallPoints[w]
		// 	for (var p = 0; p < pathsToExits.length; p++) {
		// 		var path = pathsToExits[p]
		// 		for (var i = 0; i < path.length; i++) {
		// 			var pathpos = path[i]
		// 			if (pathpos.x === wallPoint.x && pathpos.y === wallPoint.y) {
		// 				// take the wallPoint out of wallPoints and put it in rampartPoints
		// 				// .splice() removes and returns an array of values from the original array
		// 				rampartPoints = _.union(rampartPoints, wallPoints.splice(w, 2))
		// 				w -= 2
		// 				break;
		// 			}
		// 		}
		// 	}
		// }
		for (let p = 0; p < pathsToExits.length; p++) {
			const path = pathsToExits[p];
			for (var i = 0; i < path.length; i++) {
				var pathpos = path[i];
				for (var w = 0; w < wallPoints.length; w++) {
					var wallPoint = wallPoints[w];
					if (pathpos.x === wallPoint.x && pathpos.y === wallPoint.y) {
						offsets[exits[p]] = w % rampartsEvery;
						break;
					}
				}
			}
		}
		const bestOffset = util.mode(_.values(offsets)); // because I'm lazy
		console.log("bestOffset: ", bestOffset);
		for (var w = 0; w < wallPoints.length; w++) {
			var wallPoint = wallPoints[w];
			if (w % rampartsEvery === bestOffset) {
				// take the wallPoint out of wallPoints and put it in rampartPoints
				// .splice() removes and returns an array of values from the original array
				rampartPoints = _.union(rampartPoints, wallPoints.splice(w, 1));
			}
		}

		if (debug) {
			for (var w = 0; w < wallPoints.length; w++) {
				room.visual.circle(wallPoints[w], { fill: "#5577ff", radius: 0.3, stroke: "#5577ff" });
			}
			for (var r = 0; r < rampartPoints.length; r++) {
				room.visual.circle(rampartPoints[r], { fill: "#ff44ff", radius: 0.3, stroke: "#ff44ff" });
			}
		}

		// save points in memory so we can rebuild walls later without recalculating
		for (var w in wallPoints) {
			var wallPoint = wallPoints[w];
			walls.push([wallPoint.x, wallPoint.y]);
		}
		Memory.rooms[room.name].walls = walls;
		for (var r in rampartPoints) {
			const rampartPoint = rampartPoints[r];
			ramparts.push([rampartPoint.x, rampartPoint.y]);
		}
		Memory.rooms[room.name].ramparts = ramparts;
	},

	buildWalls(room) {
		let hasPlacedSite = false;
		if (Memory.rooms[room.name].walls) {
			for (const w in Memory.rooms[room.name].walls) {
				const wall = Memory.rooms[room.name].walls[w];
				var pos = new RoomPosition(wall[0], wall[1], room.name);
				if (pos.createConstructionSite(STRUCTURE_WALL) === OK) {
					hasPlacedSite = true;
					break;
				}
			}
		}
		if (hasPlacedSite) {
			return;
		}

		if (Memory.rooms[room.name].ramparts) {
			for (const r in Memory.rooms[room.name].ramparts) {
				const rampart = Memory.rooms[room.name].ramparts[r];
				var pos = new RoomPosition(rampart[0], rampart[1], room.name);
				if (pos.createConstructionSite(STRUCTURE_RAMPART) === OK) {
					hasPlacedSite = true;
					break;
				}
			}
		}
	},

	isInRootModule(structure) {
		if (!structure) {
			return false;
		}
		const rX = structure.room.memory.rootPos.x;
		const rY = structure.room.memory.rootPos.y;
		const x = structure.pos.x;
		const y = structure.pos.y;
		return x <= rX + 2 && x >= rX - 2 && y <= rY && y >= rY - 4;
	},
};

global.autoPlanner = {
	addPlans: brainAutoPlanner.addPlansAtPosition,
	removePlans: brainAutoPlanner.removePlansAtPosition,
	planHarvestPositions: brainAutoPlanner.planHarvestPositions,
};

global.plan = (x, y, roomName, struct) => {
	return brainAutoPlanner.addPlansAtPosition(new RoomPosition(x, y, roomName), struct);
};
(global.unplan = (x, y, roomName, struct) => {
	return brainAutoPlanner.removePlansAtPosition(new RoomPosition(x, y, roomName), struct);
}),
	(module.exports = brainAutoPlanner);
export default brainAutoPlanner;