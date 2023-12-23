
////////// IMPORTS //////////

// Node.js 
const fs = require('node:fs/promises');
const path = require('path');

// Prismarine group
const nbt = require('prismarine-nbt');


////////// DEFINITIONS //////////

// Stores each nbt job (can be very large).
const jobs = [];


////////// SOURCE //////////

/**
 * Parses a Schematica NBT package into a more readable (but larger) Javascript structure.
 * @param {nbt.NBT} parsed 
 */
function parseNBT(parsed){
  let nbt = [];
  // Fetch blocks mapping (and also remap the array so it's cleaner).
  let blockMappings = parsed['value']['palette']['value']['value'];
  blockMappings = blockMappings.map(i => i['Name']['value']);
  // Get blocks list.
  let blockList = parsed['value']['blocks']['value']['value'];
  // Loop through block list objects.
  blockList.forEach(item => {
    // Get block position as [x, y, z] and type mapping.
    let position = item['pos']['value']['value'];
    let type = blockMappings[item['state']['value']];
    // Store it.
    nbt.push({pos: position, type: type});
  });

  /**
   * What does it return?
   * [ {pos: [x, y, z], type: 'minecraft:white_carpet'}, ...]
   */
  return nbt;
}

/**
 * Reads an NBT created at https://rebane2001.com/mapartcraft/ specifically, and loads it into the job system.
 * Note: I did not test this with any other format, only the format provided by MapartCraft NBT.
 * @param {*} file NBT
 */
async function readAndLoad(file){
  const buffer = await fs.readFile(path.resolve(file));
  const {parsed, type} = await nbt.parse(buffer);
  jobs.push(parseNBT(parsed));
}

// Just load the test NBT for now.
readAndLoad('samples/sample2.nbt');
