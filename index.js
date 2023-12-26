
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
const upload = multer({});
const app = express();
const port = 80; // localhost http

// Colors
var colors = require('colors');


////////// DEFINITIONS //////////

let bot;
let stopJob = false; // Global stop job condition.
let logs = '';

// Stores each nbt job (can be very large).
const jobs = {};


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
  jobs[path.basename(file) + '@' + Object.keys(jobs).length] = parseNBT(parsed);
}

/**
 * Builds the map art. Set global stopJob = false to stop the loop.
 * The job will keey partial track of its progress and can pick up where it left off.
 * @param {Object} obj Either it is the full job object in jobs{}, or the file 'partial.txt' which contains the save data as needed. 
 * @param {int} x Origin x
 * @param {int} y Origin y
 * @param {int} z Origin z
 */
async function runJob(obj, x, y, z){

  // Ensure the bot is in creative mode for this.
  log('Running job at ' + x + ', ' + y + ', ' + z + '.');

  // This will be the start 0,0 point of our build.
  let origin = [x, y, z];

  // First, we clear every block in x-y-z needed for build (make space).
  

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

app.post('/command', upload.single('file'), async (req, res, next) => {

  // Get command.
  let command = req.body.command.toLowerCase();
  if (command.includes('help')){
    log('\n******* Help Commands *******\n/nbt - Upload an NBT into the jobs queue (need to attach a file with command)\n' + 
    '/jobs - Get a list of pending jobs\n' + 
    '/runjob <index> <x> <y> <z> - Runs job with given index at given x,y,z origin (if not provided the bot will run with its own starting coords).\n' +
    '/stopjob - Stops the current job.\n' + 
    '/rmjob <index> - Deletes a job with given index.\n');
  }
  else if (command.includes('nbt')){
    try {
      await fs.mkdir(path.resolve('jobs/'));
    }
    catch(err){}
    // Let's write the file.
    console.log(req.file);
    let file = req.file;
    if (!file.originalname.includes('.nbt')){
      // Ignore since it was not valid NBT.
      log('* Uploaded file was invalid, not NBT.');
      res.redirect('/');
      return false;
    }
    else{
      let t = path.resolve('jobs/' + file.originalname);
      fs.writeFile(t, file.buffer, 'ascii');
      log('* NBT \'' + file.originalname + '\' uploaded and loaded into jobs.');
      // Load the NBT for real.
      readAndLoad(t);
      res.redirect('/');
    }
  }
  else if (command.includes('jobs')){
    log('\n******* Jobs *******\n');
    let keys = Object.keys(jobs);
    if (keys.length === 0){
      log('No jobs found.');
    }
    keys.forEach(key => {
      let s = key.split('@');
      let filename = s[0];
      let index = s[1];
      log(' - Index ' + index + ' (' + filename + ')');
    });
    res.redirect('/');
  }
  else if (command.includes('rmjob')){
    let index = parseInt(command.split(' ')[1]);
    let keys = Object.keys(jobs);
    if (isNaN(index) || (index >= keys.length) || (index < 0)){
      log('Invalid index.');
      res.redirect('/');
    }
    keys.forEach(key => {
      let id = parseInt(key.split('@')[1]);
      if (id === index){
        delete jobs[key];
        log('Successfully removed job index ' + id + '.');
      }
    });
    res.redirect('/');
  }
  else if (command.includes('runjob')){
    let index = parseInt(command.split(' ')[1]);
    let x = parseInt(command.split(' ')[2]);
    let y = parseInt(command.split(' ')[3]);
    let z = parseInt(command.split(' ')[4]);
    let keys = Object.keys(jobs);
    if (isNaN(index) || isNaN(x) || isNaN(y) || isNaN(z) || (index >= keys.length) || (index < 0)){
      log('Invalid parameter or index.');
      res.redirect('/');
    }
    keys.forEach(key => {
      let id = parseInt(key.split('@')[1]);
      if (id === index){
        log('Running job ' + id + '.');
        runJob(jobs[key], x, y, z);
        res.redirect('/');
      }
    });
  }
});

// App start point
app.listen(port, async () => {
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
  // Read any cached jobs.
  let files = await fs.readdir(path.resolve('jobs/'));
  files.forEach(file => {
    readAndLoad(path.resolve('jobs/' + file));
  });
});