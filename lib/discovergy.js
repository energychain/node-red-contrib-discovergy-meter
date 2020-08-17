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
      let aggregation = false;
      if(typeof msg.payload.latest !== 'undefined') aggregation = msg.payload;

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

      msg.payload = responds.data;

      // do some decorations (if SLP meter)

      if(typeof msg.payload.values.energy !== "undefined") {
        msg.payload.values.energy_wh = Math.round(msg.payload.values.energy/10000000);
      }
      if(typeof msg.payload.values.energyOut !== "undefined") {
        msg.payload.values.energyOut_wh = Math.round(msg.payload.values.energyOut/10000000);
      }
      if(typeof msg.payload.values.power1 !== "undefined") {
        msg.payload.values.power1_w = Math.round(msg.payload.values.power1/1000);
        msg.payload.values.power2_w = Math.round(msg.payload.values.power2/1000);
        msg.payload.values.power3_w = Math.round(msg.payload.values.power3/1000);
      }
      if(typeof msg.payload.values.power !== "undefined") {
        msg.payload.values.power_w = Math.round(msg.payload.values.power/1000);
      }
      if((typeof meterinfo !== "undefined") && (meterinfo !== null) && (typeof meterinfo.yearlyBasePrice !== 'undefined')) {
          let deltayears = (meterinfo.lastMeasurementTime - meterinfo.firstMeasurementTime) / (365*86400000);
          msg.payload.values.baseCosts = Math.round(meterinfo.yearlyBasePrice * deltayears * 100)/100;
          msg.payload.values.energyCost =  Math.round(meterinfo.energyPriceWh * (msg.payload.values.energy_wh-config.firstReading)*100)/100;
          msg.payload.values.energyRevenue = Math.round(config.revenue * (msg.payload.values.energyOut_wh-config.firstReadingOut))/100;
          msg.payload.values.incomeSaldo = (msg.payload.values.energyRevenue - (  msg.payload.values.energyCost + msg.payload.values.baseCosts ));
          msg.payload.values.energySaldo_wh = (msg.payload.values.energyOut_wh - msg.payload.values.energy_wh);
      }
      // map .values to .latest
      msg.payload.latest = msg.payload.values;
      delete msg.payload.values;

      if(msg.topic == "statistics") {
        const statsModule = require("./aggregation.js");
        msg.payload = await statsModule( msg.payload,config);
      }

      if( aggregation !== false) {
          const aggregationModule = require("./aggregation.js");
          msg.payload = await aggregationModule( msg.payload,aggregation);
      }


      return msg.payload;
};
