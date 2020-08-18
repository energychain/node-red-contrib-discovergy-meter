module.exports = function(RED) {
  const axios = require("axios");
  const discovergyLib = require("./lib/discovergy.js");

  function discovergyNode(config) {
      RED.nodes.createNode(this,config);
      var node = this;
      if((typeof node.context().global.get("discovergy_username") !== 'undefined')&&( node.context().global.get("discovergy_username") !== null)) {
          config.username = node.context().global.get("discovergy_username");
          config.password =  node.context().global.get("discovergy_password");
      }
      node.on('input', async function(msg) {
        msg.payload = await discovergyLib(msg,config,node.context(),RED);
        node.send(msg);
      });

    }
  RED.nodes.registerType("Discovergy Meter",discovergyNode);

    function DiscovergyConfigNode(n) {
      RED.nodes.createNode(this, n);
      var node = this;

      node.config = {
        username: node.credentials.username,
        password: node.credentials.password
      };
    }

    RED.nodes.registerType("discovergy-config", DiscovergyConfigNode, {
        credentials: {
          username: {type: "text"},
          password: {type: "password"}
        }
      });

    RED.httpAdmin.get('/discovergy/meters', async (req, res) => {
          let config = RED.nodes.getNode(req.query.account);
           try {
               let meters = await axios.get("https://api.discovergy.com/public/v1/meters",{
                              auth: {
                                username: config.credentials.username,
                                password: config.credentials.password
                            }});
               res.end(JSON.stringify(meters.data));

           } catch (error) {
             console.log(error);
             res.sendStatus(500).send(error.message);
           }
    });
};
