// @ts-expect-error TODO: convert to typescript
import {
	OffenseStrategyBreakAltPath,
	OffenseStrategyLureHarrass,
	OffenseStrategySimpleManual,
} from "../strategies/Strategies.js";
import { OffenseStrategyOvermindRemoteMinerBait } from "../strategies/Overmind";

export const Strategies = [
	OffenseStrategySimpleManual,
	OffenseStrategyLureHarrass,
	OffenseStrategyBreakAltPath,
	OffenseStrategyOvermindRemoteMinerBait,
];
