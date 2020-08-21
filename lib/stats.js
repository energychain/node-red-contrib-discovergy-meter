module.exports = async function(payload,config,nodeconfig,meterinfo,storage) {
  function Sleep(milliseconds) {
   return new Promise(resolve => setTimeout(resolve, milliseconds));
 }

  const fetchTimeFrame = require("./stats_request.js");

  payload.stats = {};
  try {
      // last 24 hours
          let to = payload.time;
          let from = payload.time - (24* 3600000);
          let resolution = 'three_minutes';
          payload.stats.last24h = await fetchTimeFrame(nodeconfig,config,meterinfo,resolution,from,to);
          await Sleep(200); // Delay to get DGY Api settled
      // today
          to = payload.time;
          from =  new Date(payload.time).setHours(0,0,0,0);
          resolution = 'three_minutes';
          payload.stats.today = await fetchTimeFrame(nodeconfig,config,meterinfo,resolution,from,to);
          await Sleep(200); // Delay to get DGY Api settled
      // yesterday
      payload.stats.yesterday = storage.get("yesterday");
      if((typeof payload.stats.yesterday == "undefined")||(payload.stats.yesterday.updated==null)||(payload.stats.yesterday.updated < new Date().getTime() - (3600000*1))) {
          to = new Date(payload.time).setHours(0,0,0,0);
          from =  to - 86400000;
          resolution = 'three_minutes';
          payload.stats.yesterday = await fetchTimeFrame(nodeconfig,config,meterinfo,resolution,from,to);
          payload.stats.yesterday.updated = new Date().getTime();
          storage.set("yesterday",payload.stats.yesterday);
          await Sleep(200); // Delay to get DGY Api settled
      }
      // monthToDay
      payload.stats.monthToDay = storage.get("monthToDay");
      if((typeof payload.stats.monthToDay == "undefined")||(payload.stats.monthToDay.updated==null)||(payload.stats.monthToDay.updated < new Date().getTime() - (900000*1))) {
          to = payload.time;
          let d = new Date(new Date(to).setHours(0,0,0,0));
          from =  new Date((d.getYear()+1900) + "-" + (d.getMonth()+1) + "-1").setHours(0,0,0,0);
          resolution = 'fifteen_minutes';
          payload.stats.monthToDay = await fetchTimeFrame(nodeconfig,config,meterinfo,resolution,from,to);
          payload.stats.monthToDay.updated = new Date().getTime();
          storage.set("monthToDay",payload.stats.monthToDay);
          await Sleep(200); // Delay to get DGY Api settled
      };
      // lastMonth
        payload.stats.lastMonth = storage.get("lastMonth");
        if((typeof payload.stats.lastMonth == "undefined")||(payload.stats.lastMonth.updated==null)||(payload.stats.lastMonth.updated < new Date().getTime() - (3600000*24))) {
          d = new Date(new Date(payload.time).setHours(0,0,0,0));
          to =  new Date((d.getYear()+1900) + "-" + (d.getMonth()+1) + "-1").setHours(0,0,0,0);
          d =   new Date(new Date(to).getTime() - (2*86400000));
          from =  new Date((d.getYear()+1900) + "-" + (d.getMonth()+1) + "-1").setHours(0,0,0,0);
          resolution = 'fifteen_minutes';
          payload.stats.lastMonth = await fetchTimeFrame(nodeconfig,config,meterinfo,resolution,from,to);
          payload.stats.lastMonth.updated = new Date().getTime();
          storage.set("lastMonth",payload.stats.lastMonth);
          await Sleep(200); // Delay to get DGY Api settled
        }

          // yearToDay
          payload.stats.yearToDay = storage.get("yearToDay");
          if((typeof payload.stats.yearToDay == "undefined")||(payload.stats.yearToDay.updated==null)||(payload.stats.yearToDay.updated < new Date().getTime() - (3600000*2))) {
              to = payload.time;
              d = new Date(new Date(to).setHours(0,0,0,0));
              from =  new Date((d.getYear()+1900) + "-1-1").setHours(0,0,0,0);
              resolution = 'one_day';
              payload.stats.yearToDay = await fetchTimeFrame(nodeconfig,config,meterinfo,resolution,from,to);
              payload.stats.yearToDay.updated = new Date().getTime();
              storage.set("yearToDay",payload.stats.yearToDay);
              await Sleep(200); // Delay to get DGY Api settled
          }
          // last365d
          payload.stats.last365d = storage.get("last365d");
          if((typeof payload.stats.last365d == "undefined")||(payload.stats.last365d.updated==null)||(payload.stats.last365d.updated < new Date().getTime() - (3600000*2))) {
                to = payload.time;
                d = new Date(new Date(to).setHours(0,0,0,0));
                from =   payload.time - (365*86400000);
                resolution = 'one_day';
                payload.stats.last365d = await fetchTimeFrame(nodeconfig,config,meterinfo,resolution,from,to);
                payload.stats.last365d.updated = new Date().getTime();
                storage.set("last365d",payload.stats.last365d);
                await Sleep(200); // Delay to get DGY Api settled
          }
          // lastYear
          payload.stats.lastYear = storage.get("lastYear");
          if((typeof payload.stats.lastYear == "undefined")||(payload.stats.lastYear.updated==null)||(payload.stats.lastYear.updated < new Date().getTime() - (86400000*14))) {
            d = new Date(new Date(to).setHours(0,0,0,0));
            from =  new Date((d.getYear()+1900) + "-1-1").setHours(0,0,0,0);
            to = from;
            from -= (365*86400000);
            resolution = 'one_day';
            payload.stats.lastYear = await fetchTimeFrame(nodeconfig,config,meterinfo,resolution,from,to);
            payload.stats.lastYear.updated = new Date().getTime();
            storage.set("lastYear",payload.stats.lastYear);
            await Sleep(200); // Delay to get DGY Api settled
          }
    } catch(e) {
      console.warn("Error retrieving Statistics from Discovergy API",e);
      throw Error(e);
    }
    return payload;
};
