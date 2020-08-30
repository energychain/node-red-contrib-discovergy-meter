const discovergyLib = require("./lib/meter.js");
const fs = require("fs");
const express = require('express');
const bodyParser = require('body-parser');
const urlencodedParser = bodyParser.urlencoded({ extended: false });
let port = 3000;

const storage = {
  memstorage:{},
  get:function(key) {
    return this.memstorage[key];
  },
  set:function(key,value) {
    this.memstorage[key] = value;
  }
}
const fileExists = async path => !!(await fs.promises.stat(path).catch(e => false));

const main = async function(config) {
  let app = express();

  let msg = {
    payload: {},
    topic: 'statistics'
  }

  app.get('/msg', async function (req, res) {
      delete msg.payload.latest;
      const result = await discovergyLib(msg,config,storage);
      res.send(result);
  });

  app.get('/config', async function (req, res) {
      res.send(config);
  });

  app.post('/config',urlencodedParser,async function(req,res) {
      config = req.body;
      res.send();
  });

  app.use(express.static('public', {}));

  setInterval(function() {
    delete msg.payload.latest;
    discovergyLib(msg,config,storage);
  },900000);
  console.log("Serving http://localhost:"+port +"/");
  app.listen(port);
}

const boot = async function() {
  let config = {};
  if(typeof process.env.PORT !== 'undefined') {
    port = process.env.PORT;
  }
  // UUID Persistence
  if((process.argv.length == 3)&&(await fileExists(process.argv[2]))) {
    config = JSON.parse(fs.readFileSync(process.argv[2]));
  } else
  if(await fileExists("./config.json")) {
    config = JSON.parse(fs.readFileSync("./config.json"));
  } else
  if(await fileExists("./sample_config.json")) {
    config = JSON.parse(fs.readFileSync("./sample_config.json"));
  }
  if(typeof config.uuid == 'undefined') {
    config.uuid = Math.random(); // Due to node js incompatibility with nanoid or uuid this is a bad fix
    config.uuid = (""+config.uuid).substring(2) + (Math.random());
  }
  main(config);
}


boot();
