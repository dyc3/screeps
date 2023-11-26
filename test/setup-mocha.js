// inject mocha globally to allow custom interface refer without direct import - bypass bundle issue
global._ = require("lodash");
global.mocha = require("mocha");
global.chai = require("chai");
global.sinon = require("sinon");
global.chai.use(require("sinon-chai"));

global.Game = {
	time: 12345,
};
global.Memory = {};
global.Room = {
	prototype: {},
};
global.Structure = {};
global.Creep = {
	prototype: {},
};
global.PowerCreep = {
	prototype: {},
};
global.Flag = {};
global.RawMemory = {};
global.Spawn = {};
global.Source = {};
global.Tombstone = {};
global.RoomPosition = {};
global.STRUCTURE_SPAWN = "spawn";
global.STRUCTURE_EXTENSION = "extension";
global.STRUCTURE_ROAD = "road";
global.STRUCTURE_WALL = "constructedWall";
global.STRUCTURE_RAMPART = "rampart";
global.STRUCTURE_KEEPER_LAIR = "keeperLair";
global.STRUCTURE_PORTAL = "portal";
global.STRUCTURE_CONTROLLER = "controller";
global.STRUCTURE_LINK = "link";
global.STRUCTURE_STORAGE = "storage";
global.STRUCTURE_TOWER = "tower";
global.STRUCTURE_OBSERVER = "observer";
global.STRUCTURE_POWER_BANK = "powerBank";
global.STRUCTURE_POWER_SPAWN = "powerSpawn";
global.STRUCTURE_EXTRACTOR = "extractor";
global.STRUCTURE_LAB = "lab";
global.STRUCTURE_TERMINAL = "terminal";
global.STRUCTURE_CONTAINER = "container";
global.STRUCTURE_NUKER = "nuker";
global.STRUCTURE_FACTORY = "factory";
global.STRUCTURE_INVADER_CORE = "invaderCore";
global.RESOURCE_ENERGY = "energy";
global.RESOURCE_POWER = "power";

global.WORK = "work";
global.CARRY = "carry";
global.MOVE = "move";
global.ATTACK = "attack";
global.RANGED_ATTACK = "ranged_attack";
global.TOUGH = "tough";
global.HEAL = "heal";
global.CLAIM = "claim";

global.TOP = 1;
global.TOP_RIGHT = 2;
global.RIGHT = 3;
global.BOTTOM_RIGHT = 4;
global.BOTTOM = 5;
global.BOTTOM_LEFT = 6;
global.LEFT = 7;
global.TOP_LEFT = 8;

// Override ts-node compiler options
process.env.TS_NODE_PROJECT = "tsconfig.test.json";
