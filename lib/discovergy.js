module.exports = async function(msg,config,storage,RED) {
    function Sleep(milliseconds) {
     return new Promise(resolve => setTimeout(resolve, milliseconds));
    }

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
    await Sleep(300);
    // Set Demo Account if data configured
    if((typeof node.config.credentials.username == 'undefined') || (node.config.credentials.username == null) || (node.config.credentials.username.length < 3)) {
      node.config.credentials.username = "demo@corrently.de";
      node.config.credentials.password = "aNPR66nGXQhZ";
    }

      let doaggregation = false;
      if(typeof msg.payload.latest !== 'undefined') {
        aggregation = msg.payload;
        doaggregation = true;
      }

      let meterinfo = storage.get("meterinfo_"+config.meterId);

      if((typeof meterinfo === "undefined") || ( meterinfo === null)) {
          const correntlyInfo = require("./corrently.js");
          meterinfo = await correntlyInfo(node,storage,config);
      }

      if((typeof config.firstReadingDate !== 'undefined')&&(config.firstReadingDate !== null)&&((''+config.firstReadingDate).length>6)) {
        meterinfo.firstMeasurementTime = new Date(config.firstReadingDate);
      }

      let responds = {};
      try {
        responds = await axios.get("https://api.discovergy.com/public/v1/last_reading?meterId="+config.meterId,{
                     auth: {
                       username: node.config.credentials.username,
                       password: node.config.credentials.password
                   }});
      } catch(e) {
        console.warn("API Request failed:last_reading","https://api.discovergy.com/public/v1/last_reading?meterId="+config.meterId);
        throw Error(e);
      }
      if(config.isProduction) {
        let out = responds.data.values.energy;
        responds.data.values.energy = responds.data.values.energyOut;
        responds.data.values.energyOut = out;
      }
      let productionData = {}
      if((typeof config.prodMeterId !== 'undefined')&&(config.prodMeterId.length > 10)) {
        let r = await axios.get("https://api.discovergy.com/public/v1/last_reading?meterId="+config.prodMeterId,{
                     auth: {
                       username: node.config.credentials.username,
                       password: node.config.credentials.password
         }});
        productionData = r.data;
      }
      const decoratorModule = require("./decorator.js");
      msg.payload = await decoratorModule( responds.data,meterinfo,config,productionData);

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
