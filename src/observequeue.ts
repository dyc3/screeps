import { Role } from "roles/meta";
import util from "./util";
import { Scout } from "roles/role.scout";

export class ObserveQueue {
	static initialize(): void {
		if (!Memory.observe) {
			Memory.observe = {
				observers: [],
				queue: [],
			};
		}
	}

	private static getObservers(): StructureObserver[] {
		return Memory.observe.observers.map(id => Game.getObjectById(id)).filter(o => !!o);
	}

	public static updateCachedObserverIds(): void {
		Memory.observe.observers = (
			_.filter(Game.structures, s => s.structureType === STRUCTURE_OBSERVER) as StructureObserver[]
		).map(o => o.id);
	}

	public static queue(roomName: string): void {
		if (Memory.observe.queue.indexOf(roomName) === -1) {
			Memory.observe.queue.push(roomName);
		}
	}

	public static consumeObservations(): void {
		if (Memory.observe.queue.length === 0) {
			return;
		}

		console.log(`Attempting to get vision of rooms: ${Memory.observe.queue.join(",")}`);

		const observers = this.getObservers();
		if (observers.length === 0) {
			console.log(`No observers available to observe anything, requesting scouts instead.`);
			this.allocateScouts(Memory.observe.queue);
			Memory.observe.queue = [];
			return;
		}

		while (Memory.observe.queue.length > 0) {
			const target = Memory.observe.queue[0];

			if (observers.length === 0) {
				console.log(`No additional observers available to observe ${target}, delaying.`);
				break;
			}
			const observer = observers.shift();
			if (!observer) {
				break;
			}
			const result = observer.observeRoom(target);
			if (result !== OK) {
				console.log(`Observer ${observer.id} in ${observer.room} failed to observe ${target}`);
				observers.push(observer);
				continue;
			}

			Memory.observe.queue.shift();
		}
	}

	public static allocateScouts(rooms: string[]): void {
		const scouts = util.getCreeps(Role.Scout).map(c => new Scout(c));
		const availableScouts = scouts.filter(s => s.isComplete);
		const coveredRooms = scouts.map(s => s.targetRoom).filter(r => !!r);
		rooms = rooms.filter(r => coveredRooms.indexOf(r) === -1);

		while (rooms.length > 0 && availableScouts.length > 0) {
			const target = rooms.shift();
			if (!target) {
				break;
			}
			const scout = availableScouts.shift();
			if (!scout) {
				break;
			}
			scout.targetRoom = target;
		}

		if (rooms.length > 0) {
			console.log(`No scouts available to observe ${rooms.join(", ")}, spawning`);
			for (const room of rooms) {
				this.spawnScout(room);
			}
		}
	}

	private static spawnScout(targetRoom: string): void {
		const closestRooms = util.findClosestOwnedRooms(new RoomPosition(25, 25, targetRoom));
		const spawn = util.getSpawn(closestRooms[0]);
		if (!spawn) {
			console.log(`WARNING: No spawn available to spawn scout for ${targetRoom} in ${closestRooms[0]}`);
			return;
		}

		spawn.spawnCreep([MOVE], `scout_${Game.time.toString(16)}`, {
			// @ts-expect-error this is all the scout needs
			memory: {
				role: Role.Scout,
				targetRoom,
				keepAlive: false,
				stage: 0,
			},
		});
	}
}

global.ObserveQueue = ObserveQueue;
