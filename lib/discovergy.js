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
        const fetchTimeFrame = async function(resolution,from,to) {
          responds = await axios.get("https://api.discovergy.com/public/v1/readings?meterId="+config.meterId+"&resolution="+resolution+"&from="+from+"&to="+to,{
                         auth: {
                           username: node.config.credentials.username,
                           password: node.config.credentials.password
                       }});
          responds = responds.data;
          let stats = {
              energy: responds[responds.length -1].values.energy - responds[0].values.energy,
              energyOut: responds[responds.length -1].values.energyOut - responds[0].values.energyOut
          };
          stats.energy_wh = Math.round(stats.energy/10000000);
          stats.energyOut_wh = Math.round(stats.energyOut/10000000);

          let deltayears = (to - from) / (365*86400000);
          stats.baseCosts =  Math.round(meterinfo.yearlyBasePrice * deltayears * 100)/100;
          stats.energyCost = Math.round(meterinfo.energyPriceWh * (stats.energy_wh)*100)/100;
          stats.energyRevenue = Math.round(config.revenue * (stats.energyOut_wh))/100;
          stats.incomeSaldo = (stats.energyRevenue - (  stats.energyCost + stats.baseCosts ));
          stats.energySaldo_wh = (stats.energyOut_wh - stats.energy_wh);
          return stats;
        };

        msg.payload.stats = {};
        try {
            // last 24 hours
            if(msg.payload.time > new Date().getTime() - 3600000) {
                let to = msg.payload.time;
                let from = msg.payload.time - (24* 3600000);
                let resolution = 'three_minutes';
                msg.payload.stats.last24h = await fetchTimeFrame(resolution,from,to);
            }

            // today
            if(msg.payload.time > new Date().getTime() - 3600000) {
                let to = msg.payload.time;
                let from =  new Date(msg.payload.time).setHours(0,0,0,0);
                let resolution = 'three_minutes';
                msg.payload.stats.today = await fetchTimeFrame(resolution,from,to);
            }

            // yesterday
            if(msg.payload.time > new Date().getTime() - 3600000) {
                let to = new Date(msg.payload.time).setHours(0,0,0,0);
                let from =  to - 86400000;
                let resolution = 'three_minutes';
                msg.payload.stats.yesterday = await fetchTimeFrame(resolution,from,to);
            }

            // monthToDay
            if(msg.payload.time > new Date().getTime() - 3600000) {
                let to = msg.payload.time;
                let d = new Date(new Date(to).setHours(0,0,0,0));
                let from =  new Date((d.getYear()+1900) + "-" + (d.getMonth()+1) + "-1").setHours(0,0,0,0);
                let resolution = 'fifteen_minutes';
                msg.payload.stats.monthToDay = await fetchTimeFrame(resolution,from,to);
            }

            // lastMonth
            if(msg.payload.time > new Date().getTime() - 3600000) {
                let d = new Date(new Date(msg.payload.time).setHours(0,0,0,0));
                let to =  new Date((d.getYear()+1900) + "-" + (d.getMonth()+1) + "-1").setHours(0,0,0,0);
                d =   new Date(new Date(to).getTime() - (2*86400000));
                let from =  new Date((d.getYear()+1900) + "-" + (d.getMonth()+1) + "-1").setHours(0,0,0,0);
                let resolution = 'fifteen_minutes';
                msg.payload.stats.lastMonth = await fetchTimeFrame(resolution,from,to);
            }

            // yeatToDay
            if(msg.payload.time > new Date().getTime() - 3600000) {
                let to = msg.payload.time;
                let d = new Date(new Date(to).setHours(0,0,0,0));
                let from =  new Date((d.getYear()+1900) + "-1-1").setHours(0,0,0,0);
                let resolution = 'one_day';
                msg.payload.stats.yearToDay = await fetchTimeFrame(resolution,from,to);
            }

            // last365d
            if(msg.payload.time > new Date().getTime() - 3600000) {
                let to = msg.payload.time;
                let d = new Date(new Date(to).setHours(0,0,0,0));
                let from =   msg.payload.time - (365*86400000);
                let resolution = 'one_day';
                msg.payload.stats.last365d = await fetchTimeFrame(resolution,from,to);
            }
          } catch(e) {
            console.warn("Error retrieving Statistics from Discovergy API",e);
          }
        }
      if( aggregation !== false) {
          const aggregationModule = require("./aggregation.js");
          msg.payload = await aggregationModule( msg.payload,aggregation);
      }


      return msg.payload;
};
