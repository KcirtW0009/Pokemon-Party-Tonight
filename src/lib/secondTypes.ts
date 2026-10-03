export const THIRD_GAMES=['rocket-secret','pokemon-auction','pokemon-liars-dice','surround-meloetta','pokemon-push-your-luck'] as const;
export const SECOND_GAMES = ['type-bomb','starter-memory','snorlax-berries','electrode-relay','gender-difference','sudowoodo-quoridor','drive-revavroom',...THIRD_GAMES] as const;
export type SecondGameType = typeof SECOND_GAMES[number];
export interface SecondSettings {
  rocketCycles:0|1|2|3;rocketExcluded:0|1|2|3|4;auctionBoxes:number;diceMatches:number;trapRounds:number;luckRounds:number;
  bombRounds:number;
  genderRounds:number;
  memoryPairs:6|9|27;
  berryRounds:number;
  relayRounds:number;
  wallRounds:number;
  driveSeconds:60|90|120|180;
}
export const SECOND_DEFAULTS:SecondSettings={bombRounds:3,genderRounds:10,memoryPairs:9,berryRounds:5,relayRounds:8,wallRounds:1,driveSeconds:120,rocketCycles:0,rocketExcluded:2,auctionBoxes:15,diceMatches:1,trapRounds:6,luckRounds:5};
export interface BatchView {
  game:SecondGameType;
  matchId:string;
  roundId:string;
  turnId:string;
  revision:number;
  phase:string;
  round:number;
  totalRounds:number;
  participants:string[];
  points:Record<string,number>;
  ranks:Record<string,number>|null;
  gains:Record<string,number>|null;
  currentPlayerId:string|null;
  endsAt:number|null;
  paused:boolean;
  pauseEndsAt:number|null;
  notice:string|null;
  data:Record<string,unknown>;
}
export interface ActionEnvelope {
  roomId:string;matchId:string;roundId:string;turnId:string;actionId:string;
}
export function isSecondGame(value:unknown):value is SecondGameType {return SECOND_GAMES.includes(value as SecondGameType);}
