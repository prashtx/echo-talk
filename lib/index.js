/*jslint node: true */
'use strict';

var express = require('express');
var http = require('http');
var request = require('request');
var twilio = require('twilio');

var port = process.env.PORT || 3000;

var app = express();
var server = http.createServer(app);
var client = twilio(process.env.TWILIO_SID, process.env.TWILIO_TOKEN);
var number = process.env.NUMBER;

app.use(express.logger());
app.use(express.bodyParser());

var calls = {};

function makeUrl(req, path) {
  return 'http://' + req.headers.host + path;
}

app.post('/twilio/sms', function (req, res) {
  res.setHeader('Content-Type', 'text/xml');
  var resp = new twilio.TwimlResponse();

  var call = calls[req.body.From];
  if (!call) {
    console.log('Calling ' + req.body.From);
    // Initiate a call.
    client.makeCall({
      to: req.body.From,
      from: number,
      url: makeUrl(req, '/twilio/call'),
      statusCallback: makeUrl(req, '/twilio/hangup')
    }, function (err, call) {
      console.log('Call ID: ' + call.sid);
      calls[call.to] = {
        sid: call.sid,
        text: [req.body.Body]
      }
      res.send(resp.toString());
    });
  } else {
    // Have Twilio read something aloud on the call.
    call.text.push(req.body.Body);
    client.calls(call.sid).update({
      url: 'http://' + req.headers.host + '/twilio/call'
    });
    res.send(resp.toString());
  }
});

app.post('/twilio/call', function (req, res) {
  res.setHeader('Content-Type', 'text/xml');

  var resp = new twilio.TwimlResponse();
  var call = calls[req.body.To];
  if (!call) {
    resp.say('Sorry, something has gone wrong.');
    res.send(resp.toString());
    return;
  }

  var message = call.text.shift();
  resp.say(message);
  resp.pause({ length: 60 });
  res.send(resp.toString());
});

app.post('/twilio/hangup', function (req, res) {
  console.log('Got a hangup from ' + req.body.To);
  delete calls[req.body.To];
  res.send();
});

server.listen(port, function (error) {
  if (error) {
    console.log(error);
    return;
  }
  console.log('Listening on ' + port);
});
