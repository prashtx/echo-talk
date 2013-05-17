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

app.post('/twilio/sms', function (req, res) {
  res.setHeader('Content-Type', 'text/xml');
  var resp = new twilio.TwimlResponse();

  var call = calls[req.body.From];
  if (!call) {
    // Initiate a call.
    client.makeCall({
      to: req.body.From,
      from: number,
      url: 'http://' + req.headers.host + '/twilio/call'
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
  var call = calls[req.body.From];
  if (!call) {
    res.send(resp.toString());
    return;
  }

  var message = call.text.shift();
  resp.say(message);
  res.send(resp.toString());
});

server.listen(port, function (error) {
  if (error) {
    console.log(error);
    return;
  }
  console.log('Listening on ' + port);
});
