module.exports = async function(payload,config,nodeconfig,meterinfo) {

  const fetchTimeFrame = require("./stats_request.js");

  payload.stats = {};
  try {
      // last 24 hours
          let to = payload.time;
          let from = payload.time - (24* 3600000);
          let resolution = 'three_minutes';
          payload.stats.last24h = await fetchTimeFrame(nodeconfig,config,meterinfo,resolution,from,to);

      // today
          let to = payload.time;
          let from =  new Date(payload.time).setHours(0,0,0,0);
          let resolution = 'three_minutes';
          payload.stats.today = await fetchTimeFrame(nodeconfig,config,meterinfo,resolution,from,to);

      // yesterday
          let to = new Date(payload.time).setHours(0,0,0,0);
          let from =  to - 86400000;
          let resolution = 'three_minutes';
          payload.stats.yesterday = await fetchTimeFrame(nodeconfig,config,meterinfo,resolution,from,to);

      // monthToDay
          let to = payload.time;
          let d = new Date(new Date(to).setHours(0,0,0,0));
          let from =  new Date((d.getYear()+1900) + "-" + (d.getMonth()+1) + "-1").setHours(0,0,0,0);
          let resolution = 'fifteen_minutes';
          payload.stats.monthToDay = await fetchTimeFrame(nodeconfig,config,meterinfo,resolution,from,to);

      // lastMonth
          let d = new Date(new Date(payload.time).setHours(0,0,0,0));
          let to =  new Date((d.getYear()+1900) + "-" + (d.getMonth()+1) + "-1").setHours(0,0,0,0);
          d =   new Date(new Date(to).getTime() - (2*86400000));
          let from =  new Date((d.getYear()+1900) + "-" + (d.getMonth()+1) + "-1").setHours(0,0,0,0);
          let resolution = 'fifteen_minutes';
          payload.stats.lastMonth = await fetchTimeFrame(nodeconfig,config,meterinfo,resolution,from,to);

      // yeatToDay
          let to = payload.time;
          let d = new Date(new Date(to).setHours(0,0,0,0));
          let from =  new Date((d.getYear()+1900) + "-1-1").setHours(0,0,0,0);
          let resolution = 'one_day';
          payload.stats.yearToDay = await fetchTimeFrame(nodeconfig,config,meterinfo,resolution,from,to);

      // last365d
          let to = payload.time;
          let d = new Date(new Date(to).setHours(0,0,0,0));
          let from =   payload.time - (365*86400000);
          let resolution = 'one_day';
          payload.stats.last365d = await fetchTimeFrame(nodeconfig,config,meterinfo,resolution,from,to);

    } catch(e) {
      console.warn("Error retrieving Statistics from Discovergy API",e);
      throw Error(e);
    }
    return payload;
};
