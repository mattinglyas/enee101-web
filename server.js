const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const EventHubReader = require('./scripts/event-hub-reader.js');
const Client = require('azure-iothub').Client;
const config = require('./scripts/config.js');


const iotHubConnectionString = config.iotHubConnectionString;
if (!iotHubConnectionString) {
  console.error(`Environment variable IotHubConnectionString must be specified.`);
  return;
}
console.log(`Using IoT Hub connection string [${iotHubConnectionString}]`);

const eventHubConsumerGroup = config.eventHubConsumerGroup;
console.log(eventHubConsumerGroup);
if (!eventHubConsumerGroup) {
  console.error(`Environment variable EventHubConsumerGroup must be specified.`);
  return;
}
console.log(`Using event hub consumer group [${eventHubConsumerGroup}]`);


const app = express();
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// Redirect requests to the public subdirectory to the root 
//app.use((req, res /* , next */) => {
//  res.redirect('/');
//});

// Send direct methods to selected iot device
app.post('/method', function(req, res) { 
  res.sendStatus(200);

  var methodName = req.body.methodName;
  var deviceId = req.body.target;
  var payload = req.body.payload;
  var timeoutInSeconds = req.body.timeoutInSeconds;

  if (!methodName || !deviceId) {
    console.error('Bad post request');
    return;
  } else {
    console.log(`Calling remote method '${methodName}' on device ${deviceId}`);
  }

  var client = Client.fromConnectionString(iotHubConnectionString);

  var methodParams = {
    methodName: methodName,
    timeoutInSeconds: timeoutInSeconds,
    payload: payload
  };
  
  client.invokeDeviceMethod(deviceId, methodParams, function (err,result) { 
    if (err) {
      console.error('Failed to invoke method...');
      console.log(err);
    } else {
      var output = JSON.stringify(result, null, 2);
      console.log(output);
    }
  });
});

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

wss.broadcast = (data) => {
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      try {
        console.log(`Broadcasting data: ${data}`);
        client.send(data);
      } catch (e) {
        console.error(e);
      }
    }
  });
};

server.listen(process.env.PORT || '3000', () => {
  console.log('Listening on %d.', server.address().port);
});

const eventHubReader = new EventHubReader(iotHubConnectionString, eventHubConsumerGroup);

(async () => {
  await eventHubReader.startReadMessage((message, date, deviceId) => {
    try {
      const payload = {
        IotData: message,
        MessageDate: date || Date.now().toISOString(),
        DeviceId: deviceId,
      };

      wss.broadcast(JSON.stringify(payload));
    } catch (err) {
      console.error('Error broadcasting: [%s] from [%s].', err, message);
    }
  });
})().catch();
