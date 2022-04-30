import util from "./util";
import { ObserveQueue } from "./observequeue";

class HighwayHarvestTask {
	constructor() {
		this.id = `${Game.shard.name}${Game.time.toString(24)}${Math.random()}`;
		this._targetRoom = null;
		this.type = null;
		this._targetObject = null;
		this.harvesterCreeps = [];
		this.carrierCreeps = [];
	}

	get targetRoom() {
		return Game.rooms[this._targetRoom];
	}

	get targetObject() {
		return Game.getObjectById(this._targetObject);
	}

	serialize() {
		return {
			id: this.id,
			targetRoom: this._targetRoom,
			type: this.type,
			targetObject: this._targetObject,
			harvesterCreeps: this.harvesterCreeps,
			carrierCreeps: this.carrierCreeps,
		};
	}

	deserialize(mem) {
		this.id = mem.id;
		this._targetRoom = mem.targetRoom;
		this.type = mem.type;
		this._targetObject = mem.targetObject;
		this.harvesterCreeps = mem.harvesterCreeps;
		this.carrierCreeps = mem.carrierCreeps;
		return this;
	}
};

module.exports = {
	tasks: [],

	init() {
		if (!Memory.highwayHarvesting) {
			Memory.highwayHarvesting = {
				tasks: [],
				viableRooms: [], // list of strings
				lastObserved: {},
			};
		}
		this.tasks = _.map(Memory.highwayHarvesting.tasks, task => new HighwayHarvestTask().deserialize(task));
	},

	finalize() {
		Memory.highwayHarvesting.tasks = _.map(this.tasks, task => task.serialize());
	},

	getTasks() {
		return this.tasks;
	},

	getTask(id) {
		return _.find(this.tasks, task => task.id === id);
	},

	markObserved(roomName) {
		Memory.highwayHarvesting.lastObserved[roomName] = Game.time;
	},
};

export default module.exports;
