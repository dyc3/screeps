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

		let anySuccess = false;
		for (const observer of this.getObservers()) {
			if (Memory.observe.queue.length === 0) {
				break;
			}
			const target = Memory.observe.queue[0];
			const result = observer.observeRoom(target);
			if (result !== OK) {
				console.log(`Observer ${observer.id} in ${observer.room} failed to observe ${target}`);
				continue;
			}
			anySuccess = true;
			Memory.observe.queue.shift();
		}

		if (!anySuccess) {
			console.log("Failed to observe any rooms, removing first item in queue.");
			Memory.observe.queue.shift();
		}
	}
}

global.ObserveQueue = ObserveQueue;
