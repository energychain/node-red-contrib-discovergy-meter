module.exports = async function(payload,meterinfo,config) {
  if(typeof payload.values.energy !== "undefined") {
    payload.values.energy_wh = Math.round(payload.values.energy/10000000);
  }
  if(typeof payload.values.energyOut !== "undefined") {
    payload.values.energyOut_wh = Math.round(payload.values.energyOut/10000000);
  }
  if(typeof payload.values.power1 !== "undefined") {
    payload.values.power1_w = Math.round(payload.values.power1/1000);
    payload.values.power2_w = Math.round(payload.values.power2/1000);
    payload.values.power3_w = Math.round(payload.values.power3/1000);
  }
  if(typeof payload.values.power !== "undefined") {
    payload.values.power_w = Math.round(payload.values.power/1000);
  }
  if((typeof meterinfo !== "undefined") && (meterinfo !== null) && (typeof meterinfo.yearlyBasePrice !== 'undefined')) {
      let deltayears = (meterinfo.lastMeasurementTime - meterinfo.firstMeasurementTime) / (365*86400000);
      payload.values.baseCosts = Math.round(meterinfo.yearlyBasePrice * deltayears * 100)/100;
      payload.values.amortization = Math.round(config.amortization * deltayears * 100)/100;
      payload.values.energyCost =  Math.round(meterinfo.energyPriceWh * (payload.values.energy_wh-config.firstReading)*100)/100;
      payload.values.energyRevenue = Math.round(config.revenue * (payload.values.energyOut_wh-config.firstReadingOut))/100;
      payload.values.energySpendings = payload.values.energyCost + payload.values.baseCosts + payload.values.amortization;
      payload.values.incomeSaldo = (payload.values.energyRevenue - (  payload.values.energyCost + payload.values.baseCosts + payload.values.amortization ));
      payload.values.energySaldo_wh = (payload.values.energyOut_wh - payload.values.energy_wh);
      payload.meterinfo = meterinfo;
  }
  // map .values to .latest
  payload.latest = payload.values;
  delete payload.values;

  return payload;
};
