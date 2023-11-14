import PortalScanner from "intel/PortalScanner";

export default {
	getConnections(from: string): Set<string> {
		let exits = new Set(Object.values(Game.map.describeExits(from)));
		const portalExits = PortalScanner.interroomPortals.get(from);
		if (portalExits) {
			// if (!Array.isArray(portalExits)) {
			// 	portalExits = [portalExits];
			// }
			exits = exits.add(portalExits);
		}
		return exits;
	},

	roomNameToXY(roomName: string): [number, number] | undefined {
		const match = /^[WE]([0-9]+)[NS]([0-9]+)$/.exec(roomName);
		if (match) {
			return [parseInt(match[1], 10), parseInt(match[2], 10)];
		}
		return undefined;
	},

	// findRoomRoute(fromRoom: string | Room, toRoom: string | Room): Room[] | ScreepsReturnCode {
	// 	if(fromRoom instanceof Room) {
	// 		fromRoom = fromRoom.name;
	// 	}
	// 	if(toRoom instanceof Room) {
	// 		toRoom = toRoom.name;
	// 	}
	// 	if(fromRoom === toRoom) {
	// 		return [];
	// 	}

	// 	if(!/(W|E)\d+(N|S)\d+$/.test(fromRoom) || !/(W|E)\d+(N|S)\d+$/.test(toRoom)) {
	// 		return ERR_NO_PATH;
	// 	}

	// 	let [fromX, fromY] = this.roomNameToXY(fromRoom);
	// 	let [toX, toY] = this.roomNameToXY(toRoom);

	// 	if (fromX === toX && fromY === toY) {
	// 		return [];
	// 	}

	// 	originX = fromX + kRouteGrid;
	// 	originY = fromY + kRouteGrid;

	// 	// Init path finding structures
	// 	if (heap) {
	// 	  heap.clear();
	// 	  openClosed.clear();
	// 	} else {
	// 	  heap = new Heap(Math.pow(kRouteGrid * 2, 2), Float64Array);
	// 	  openClosed = new OpenClosed(Math.pow(kRouteGrid * 2, 2));
	// 	}
	// 	if (!parents) {
	// 	  parents = new Uint16Array(Math.pow(kRouteGrid * 2, 2));
	// 	}
	// 	var fromIndex = xyToIndex(fromX, fromY);
	// 	heap.push(fromIndex, heuristic(fromX, fromY));
	// 	var routeCallback = (opts && opts.routeCallback) || function() { return 1; };

	// 	// Astar
	// 	while (heap.size()) {

	// 	  // Pull node off heap
	// 	  let index = heap.min();
	// 	  let fcost = heap.minPriority();

	// 	  // Close this node
	// 	  heap.pop();
	// 	  openClosed.close(index);

	// 	  // Calculate costs
	// 	  let [ xx, yy ] = indexToXY(index);
	// 	  let hcost = heuristic(xx, yy);
	// 	  let gcost = fcost - hcost;

	// 	  // Reached destination?
	// 	  if (hcost === 0) {
	// 		let route = [];
	// 		while (index !== fromIndex) {
	// 		  let [ xx, yy ] = indexToXY(index);
	// 		  index = parents[index];
	// 		  let [ nx, ny ] = indexToXY(index);
	// 		  let dir;
	// 		  if (nx < xx) {
	// 			dir = C.FIND_EXIT_RIGHT;
	// 		  } else if (nx > xx) {
	// 			dir = C.FIND_EXIT_LEFT;
	// 		  } else if (ny < yy) {
	// 			dir = C.FIND_EXIT_BOTTOM;
	// 		  } else {
	// 			dir = C.FIND_EXIT_TOP;
	// 		  }
	// 		  route.push({
	// 			exit: dir,
	// 			room: utils.getRoomNameFromXY(xx, yy),
	// 		  });
	// 		}
	// 		route.reverse();
	// 		return route;
	// 	  }

	// 	  // Add neighbors
	// 	  let fromRoomName = utils.getRoomNameFromXY(xx, yy);
	// 	  let exits = describeExits(fromRoomName);
	// 	  for (let dir in exits) {

	// 		// Calculate costs and check if this node was already visited
	// 		let roomName = exits[dir];
	// 		let graphKey = fromRoomName+ ':'+ roomName;
	// 		let [ xx, yy ] = utils.roomNameToXY(roomName);
	// 		let neighborIndex = xyToIndex(xx, yy);
	// 		if (neighborIndex === undefined || openClosed.isClosed(neighborIndex)) {
	// 		  continue;
	// 		}
	// 		let cost = Number(routeCallback(roomName, fromRoomName)) || 1;
	// 		if (cost === Infinity) {
	// 		  continue;
	// 		}

	// 		let fcost = gcost + heuristic(xx, yy) + cost;

	// 		// Add to or update heap
	// 		if (openClosed.isOpen(neighborIndex)) {
	// 		  if (heap.priority(neighborIndex) > fcost) {
	// 			heap.update(neighborIndex, fcost);
	// 			parents[neighborIndex] = index;
	// 		  }
	// 		} else {
	// 		  heap.push(neighborIndex, fcost);
	// 		  openClosed.open(neighborIndex);
	// 		  parents[neighborIndex] = index;
	// 		}
	// 	  }
	// 	}

	// 	return ERR_NO_PATH;
	// },
};
