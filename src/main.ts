import { ErrorMapper } from "utils/ErrorMapper";
import { OurMemory } from "advancedMemory";
import { processRoom } from "roomHandling";

export class ScreepsLogic {
  setup = false;
  memCleanup = 0;

  loop() {
    console.log(`Current game tick is ${Game.time}`);
    if ((this.memCleanup = ((this.memCleanup + 1) % 8)) == 0) {
      console.log(`Checking memory...`);
      // Automatically delete memory of missing creeps
      for (const name in OurMemory.creeps) {
        if (!(name in Game.creeps)) {
          delete Memory.creeps[name];
        }
      }
    }
    if (!this.setup) {
      console.log(`Ensure setup done`);
      console.log(`SpawnSetup...`);
      for (const sn in Game.spawns) {
        const spawn = Game.spawns[sn];
        // Ensure room is setup
        processRoom(spawn.room);
      }
      this.setup = true;
    }
    // Goal aquisition phase
  }
}

export const logic = new ScreepsLogic();


// When compiling TS to JS and bundling with rollup, the line numbers and file names in error messages change
// This utility uses source maps to get the line numbers and file names of the original, TS source code
export const loop = ErrorMapper.wrapLoop(() => {
  logic.loop()
});
