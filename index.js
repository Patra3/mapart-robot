
////////// IMPORTS //////////

// Node.js 
const fs = require('node:fs/promises');
const path = require('path');

// Prismarine group
const nbt = require('prismarine-nbt');
const mineflayer = require('mineflayer');
const Item = require('prismarine-item')('1.20');

// Express.js
const express = require('express');
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });
const app = express();
const port = 80; // localhost http

// Colors
var colors = require('colors');


////////// DEFINITIONS //////////

let bot;
let logs = '';

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

/**
 * Logs a message.
 * @param {String} msg 
 */
function log(msg){
  logs += msg + '\n';
}

app.get('/', (req, res) => {
  res.sendFile(path.resolve('index.html'));
});

app.get('/querylog', (req, res) => {
  res.send(logs);
});

app.post('/command', upload.single('file'), (req, res, next) => {

  // Get command.
  let command = req.body.command;
  if (command.includes('help')){
    log('******* Help Commands \n/nbt - Upload an NBT into the jobs queue (need to attach a file with command)\n' + 
    '/jobs - Get a list of pending jobs\n' + 
    '');
  }

  res.redirect('/');
});

// App start point
app.listen(port, () => {
  console.clear();
  console.log(' -> Mapart Robot started on port 80, loading server bot...'.green);
  bot = mineflayer.createBot({
    host: 'localhost',
    username: 'BobTheBuilder',
    auth: 'offline'
  });
  bot.on('error', console.log);
  bot.on('kicked', console.log);
  bot.on('spawn', () => {
    console.log('* Bot successfully spawned.'.white);
  });
  log('Mapart robot spawned into the server.');
  readAndLoad('samples/sample2.nbt');
});