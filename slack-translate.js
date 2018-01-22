// Copyright (c) 2016 SYSTRAN S.A.
// Copyright (c) 2018 Ivinco LTD

var Slack = require('slack-client');

var botToken;
var targetLang;

const translateAPI = require('google-translate-api');

function slackBot(token, targetLang, userBlackList) {
  var autoReconnect = true;
  var autoMark = true;

  var slack = new Slack(token, autoReconnect, autoMark);

  slack.on('open', function() {
    var i;

    // Get all the channels that bot is a member of
    var channels = [];
    for (i in slack.channels) {
      if (slack.channels.hasOwnProperty(i)) {
        var channel = slack.channels[i];
        if (channel.is_member)
          channels.push("#" + channel.name);
      }
    }

    // Get all groups that are open and not archived
    var groups = [];
    for (i in slack.groups) {
      if (slack.groups.hasOwnProperty(i)) {
        var group = slack.groups[i];
        if (group.is_open && !group.is_archived)
          groups.push(group.name);
      }
    }

    console.log('The bot is @' + slack.self.name + ' in ' + slack.team.name);
    console.log('You are in channels:', channels.join(', '));
    console.log('As well as in groups:', groups.join(', '));

  });

  slack.on('message', function(message) {
    var channel = slack.getChannelGroupOrDMByID(message.channel);
    var user = slack.getUserByID(message.user);

    if (user && user.name && userBlackList && userBlackList.indexOf(user.name) !== -1) {
      console.log('Message from blacklisted user', user.name);
      return;
    }

    var type = message.type;
    var ts = message.ts;
    var text = message.text;

    var channelName = channel && channel.is_channel ? '#' : '';
    channelName += channel ? channel.name : 'UNKNOWN_CHANNEL';

    var userName = user && user.name ? '@' + user.name : 'UNKNOWN_USER';

    console.log('Received:', type, channelName, userName, ts, '"' + text + '"');

    if (type === 'message' && text && channel) {
        translateAPI(text, {to: targetLang}).then(res => {
          console.log('Google Translate output', res);
          if (res.from.language.iso != targetLang) {
            channel.send(res.text);
            console.log('@' + slack.self.name + ' respond with ' + res.text);
          }
          return;
        });
    } else {
      var error = '';
      error += type !== 'message' ? 'unexpected type ' + type + '. ' : '';
      error += ! text ? 'text was undefined. ' : '';
      error += ! channel ? 'channel was undefined.' : '';
      console.log('@' + slack.self.name + ' could not respond. ' + error);
    }
  });

  slack.on('error', function(err) {
    console.error('Error', 'slack', err);
  });

  slack.login();
}

botToken = '';
targetLang = 'en';
slackBot(botToken, targetLang, ['']);
