module.exports = async function(msg,config,storage,RED) {
    const axios = require("axios");

    let node = {};

    if((typeof config.username == 'undefined') || (config.username == null)) {
      node.config = RED.nodes.getNode(config.account);
    } else {
      node.config = {
        credentials: {
          username: config.username,
          password: config.password
        }
      };
    }
    // Set Demo Account if data configured
    if((typeof node.config.credentials.username == 'undefined') || (node.config.credentials.username == null) || (node.config.credentials.username.length < 3)) {
      node.config.credentials.username = "demo@corrently.de";
      node.config.credentials.password = "aNPR66nGXQhZ";
    }

      let doaggregation = false;
      if(typeof msg.payload.latest !== 'undefined') {
        console.log(msg.payload.latest);
        aggregation = msg.payload;
        doaggregation = true;
      }

      let meterinfo = storage.get("meterinfo_"+config.meterId);

      if((typeof meterinfo === "undefined") || ( meterinfo === null)) {
        let meters = await axios.get("https://api.discovergy.com/public/v1/meters",{
                       auth: {
                         username: node.config.credentials.username,
                         password: node.config.credentials.password
                       }});
        meters = meters.data;
        for(let i=0;i<meters.length;i++) {
            if(meters[i].meterId === config.meterId) {

              if((typeof meters[i].location !== "undefined") && (typeof meters[i].location.zip !== "undefined") && (typeof meters[i].location.country !== "undefined")) {
                  if(meters[i].location.country === "DE") {
                      let tinfo = await axios.get("https://api.corrently.io/core/tarif?zip="+ meters[i].location.zip);
                      tinfo = tinfo.data;
                      meters[i].energyPriceWh = (tinfo[0].ap/100000);
                      meters[i].yearlyBasePrice = (tinfo[0].gp*12);
                  }
              }
              storage.set("meterinfo_"+config.meterId,meters[i]);
              meterinfo = meters[i];
            }
        }
      }

      if((typeof config.firstReadingDate !== 'undefined')&&(config.firstReadingDate !== null)&&((''+config.firstReadingDate).length>6)) {
        meterinfo.firstMeasurementTime = new Date(config.firstReadingDate);
      }
      let responds = await axios.get("https://api.discovergy.com/public/v1/last_reading?meterId="+config.meterId,{
                     auth: {
                       username: node.config.credentials.username,
                       password: node.config.credentials.password
                   }});
      if(config.isProduction) {
        let out = responds.data.values.energy;
        responds.data.values.energy = responds.data.values.energyOut;
        responds.data.values.energyOut = out;
      }

      // do some decorations (if SLP meter)

      const decoratorModule = require("./decorator.js");
      msg.payload = await decoratorModule( responds.data,meterinfo,config);


      if(msg.topic == "statistics") {
        const statsModule = require("./stats.js");
        msg.payload = await statsModule( msg.payload,config,node.config,meterinfo);
      }

      if(doaggregation) {
          const aggregationModule = require("./aggregation.js");
          msg.payload = await aggregationModule( msg.payload,aggregation);
      }


      return msg.payload;
};
