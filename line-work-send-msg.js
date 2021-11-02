module.exports = function (RED) {
  const jwt = require('jsonwebtoken');
  const request = require("request");
  const fs = require("fs");

  function LineWorkSendMessge(config) {
    RED.nodes.createNode(this, config);
    var node = this;
    node.on("input", function (msg) {
      
      //const PRIVATEKEY = fs.readFileSync(__dirname + "/private_20211101221905.key");
      var roomId = config.roomid;
      var serverid = config.serverid;
      var apiId = config.apiid;
      var botId = config.botid;
      var message = msg.payload;
      var accountId = config.accountid;
      var consumerKey = config.consumerkey;
      const PRIVATEKEY = config.privatekey;

      // JWT 
      function getJWT(callback){
        const iss = serverid;
        const iat = Math.floor(Date.now() / 1000);
        const exp = iat + (60 * 60);　
        const cert = PRIVATEKEY;
        const token = [];
        const jwttoken = jwt.sign({"iss":iss, "iat":iat, "exp":exp}, cert, {algorithm:"RS256"}, (err, jwttoken) => {
            if (!err) {
                callback(jwttoken);
            } else {
                console.log(err);
            }
        });
      }

      // get token
      function getServerToken(jwttoken, callback) {
        const postdata = {
            url: 'https://authapi.worksmobile.com/b/' + apiId + '/server/token',
            headers : {
                'Content-Type' : 'application/x-www-form-urlencoded; charset=UTF-8',
            },
            form: {
                "grant_type" : encodeURIComponent("urn:ietf:params:oauth:grant-type:jwt-bearer"),
                "assertion" : jwttoken
            }
        };
        request.post(postdata, (error, response, body) => {
            if (error) {
                console.log(error);
                callback(error);
            } else {
                const jsonobj = JSON.parse(body);
                const AccessToken = jsonobj.access_token;
                callback(AccessToken);
            }
        });
      }

      // send
      function sendMessage(token, accountId, message) {
        const postdata = {
            url: 'https://apis.worksmobile.com/' + apiId + '/message/sendMessage/v2',
            headers : {
              'Content-Type' : 'application/json;charset=UTF-8',
              'consumerKey' : consumerKey,
              'Authorization' : "Bearer " + token
            },
            json: {
                "botNo" : Number(botId),
                "accountId" : accountId,
                "content" : {
                    "type" : "text",
                    "text" : message
                }
            }
        };
        request.post(postdata, (error, response, body) => {
            if (error) {
              console.log(error);
            }
            console.log(body);
        });
      }

      // send
      getJWT((jwttoken) => {
          getServerToken(jwttoken, (newtoken) => {
              let url = `https://apis.worksmobile.com/r/${apiId}/message/v1/bot/${botId}/message/push`;
              msg.url = url;
              msg.headers = {
                consumerKey,
                Authorization: `Bearer ${newtoken}`,
                'Content-Type': 'application/json'
              };

              // accountId prioritized
              if(accountId){
                msg.payload = {
                  accountId,
                  "content": {
                    "type": "text",
                    "text": message
                  }
                };
              }else{
                msg.payload = {
                  roomId,
                  "content": {
                    "type": "text",
                    "text": message
                  }
                };
              }
              node.send(msg);
          });
      });
      
    });
  }
  RED.nodes.registerType("line-work-send-msg", LineWorkSendMessge);
};
