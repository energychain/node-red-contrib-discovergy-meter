module.exports = async function(nodeconfig,config,meterinfo,resolution,from,to) {
    const axios = require("axios");

    function Sleep(milliseconds) {
     return new Promise(resolve => setTimeout(resolve, milliseconds));
    }

    let responds = {};

    const getResponds = async function() {
      responds = await axios.get("https://api.discovergy.com/public/v1/readings?meterId="+config.meterId+"&resolution="+resolution+"&from="+from+"&to="+to,{
                 auth: {
                   username: nodeconfig.credentials.username,
                   password: nodeconfig.credentials.password
      }});
      return responds;
    };

    responds = await getResponds();
    responds = responds.data;
    let stats = {
        energy: responds[responds.length -1].values.energy - responds[0].values.energy,
        energyOut: responds[responds.length -1].values.energyOut - responds[0].values.energyOut
    };
    stats.energy_wh = Math.round(stats.energy/10000000);
    stats.energyOut_wh = Math.round(stats.energyOut/10000000);

    let deltayears = (to - from) / (365*86400000);
    stats.baseCosts =  Math.round(meterinfo.yearlyBasePrice * deltayears * 100)/100;
    stats.amortization =  Math.round(config.amortization * deltayears * 100)/100;
    stats.energyCost = Math.round(meterinfo.energyPriceWh * (stats.energy_wh)*100)/100;
    stats.energyRevenue = Math.round(config.revenue * (stats.energyOut_wh))/100;
    stats.energySpendings =  (  stats.energyCost + stats.baseCosts + stats.amortization);
    stats.incomeSaldo = (stats.energyRevenue - (  stats.energyCost + stats.baseCosts + stats.amortization));
    stats.energyPrice_kwh = (stats.incomeSaldo / stats.energy_wh)/1000;
    stats.energySaldo_wh = (stats.energyOut_wh - stats.energy_wh);

    return stats;

};
