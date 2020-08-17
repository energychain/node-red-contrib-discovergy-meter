module.exports = async function(payload,config,aggregation) {
  const axios = require("axios");

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

  payload.stats = {};
  try {
      // last 24 hours
      if(payload.time > new Date().getTime() - 3600000) {
          let to = payload.time;
          let from = payload.time - (24* 3600000);
          let resolution = 'three_minutes';
          payload.stats.last24h = await fetchTimeFrame(resolution,from,to);
      }

      // today
      if(payload.time > new Date().getTime() - 3600000) {
          let to = payload.time;
          let from =  new Date(payload.time).setHours(0,0,0,0);
          let resolution = 'three_minutes';
          payload.stats.today = await fetchTimeFrame(resolution,from,to);
      }

      // yesterday
      if(payload.time > new Date().getTime() - 3600000) {
          let to = new Date(payload.time).setHours(0,0,0,0);
          let from =  to - 86400000;
          let resolution = 'three_minutes';
          payload.stats.yesterday = await fetchTimeFrame(resolution,from,to);
      }

      // monthToDay
      if(payload.time > new Date().getTime() - 3600000) {
          let to = payload.time;
          let d = new Date(new Date(to).setHours(0,0,0,0));
          let from =  new Date((d.getYear()+1900) + "-" + (d.getMonth()+1) + "-1").setHours(0,0,0,0);
          let resolution = 'fifteen_minutes';
          payload.stats.monthToDay = await fetchTimeFrame(resolution,from,to);
      }

      // lastMonth
      if(payload.time > new Date().getTime() - 3600000) {
          let d = new Date(new Date(payload.time).setHours(0,0,0,0));
          let to =  new Date((d.getYear()+1900) + "-" + (d.getMonth()+1) + "-1").setHours(0,0,0,0);
          d =   new Date(new Date(to).getTime() - (2*86400000));
          let from =  new Date((d.getYear()+1900) + "-" + (d.getMonth()+1) + "-1").setHours(0,0,0,0);
          let resolution = 'fifteen_minutes';
          payload.stats.lastMonth = await fetchTimeFrame(resolution,from,to);
      }

      // yeatToDay
      if(payload.time > new Date().getTime() - 3600000) {
          let to = payload.time;
          let d = new Date(new Date(to).setHours(0,0,0,0));
          let from =  new Date((d.getYear()+1900) + "-1-1").setHours(0,0,0,0);
          let resolution = 'one_day';
          payload.stats.yearToDay = await fetchTimeFrame(resolution,from,to);
      }

      // last365d
      if(payload.time > new Date().getTime() - 3600000) {
          let to = payload.time;
          let d = new Date(new Date(to).setHours(0,0,0,0));
          let from =   payload.time - (365*86400000);
          let resolution = 'one_day';
          payload.stats.last365d = await fetchTimeFrame(resolution,from,to);
      }
    } catch(e) {
      console.warn("Error retrieving Statistics from Discovergy API",e);
    }
    return payload;
};
