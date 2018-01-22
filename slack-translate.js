// Copyright (c) 2016 SYSTRAN S.A.

var request = require('request');
var Slack = require('slack-client');

var botToken;
var targetLang;
var systranApiKey = process.env['SYSTRAN_SLACK_BOT_PLATFORM_API_KEY'] || 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx';

function detectLanguage(input, cb) {
  request({
    url: 'https://api-platform.systran.net/nlp/lid/detectLanguage/document',
    qs: {
      key: systranApiKey,
      format: 'text',
      input: input
    }
  } , function(err, resp, body) {
    if (err || resp.statusCode !== 200) {
      cb(err || new Error(body || 'Unable to detect language'));
      return;
    }

    try {
      body = JSON.parse(body);
    }
    catch (e) {
      cb(e);
      return;
    }

    console.log('SYSTRAN Platform', 'detectLanguage', 'response', body);

    if (body && body.detectedLanguages && body.detectedLanguages[0]) {
      cb(null, body.detectedLanguages[0].lang, body.detectedLanguages[0].confidence);
    } else {
      cb(new Error('Unable to detect language'));
    }
  });
}

function translate(input, source, target, cb) {
  var i = input.replace(/(:[a-zA-Z0-9_\-\+]+:)/g, "<dnt_insertion>$1</dnt_insertion>").replace(/(<@[a-zA-Z0-9_\-\+\.\|]+>)/g, "<dnt_insertion>$1</dnt_insertion>");

  request({
    url: 'https://api-platform.systran.net/translation/text/translate',
    qs: {
      key: systranApiKey,
      source: source || 'auto',
      target: target,
      format: 'text',
      input: i
    }
  }, function(err, resp, body) {
    if (err || resp.statusCode !== 200) {
      cb(err || new Error(body || 'Unable to translate'));
      return;
    }

    try {
      body = JSON.parse(body);
    } catch (e) {
      cb(e);
      return;
    }

    console.log('SYSTRAN Platform', 'translate', 'response', body);

    if (body && body.outputs && body.outputs[0] && body.outputs[0].output) {
      cb(null, body.outputs[0].output);
    } else if (source !== 'en' && target !== 'en' &&
               body && body.outputs && body.outputs[0] && body.outputs[0].error &&
               body.outputs[0].error.match(/No Queue defined for Route/)) {
      // Language Pair not available, pivot via English
      translate(input, source, 'en', function(err, outputEn) {
        if (err) {
          cb(err);
          return;
        }

        translate(outputEn, 'en', target, cb);
      });
    } else {
      cb(new Error('Unable to translate'));
    }
  });
}

function slackBot(token, targetLang, userBlackList) {
  var autoReconnect = true;
  var autoMark = true;

  var slack = new Slack(token, autoReconnect, autoMark);

  slack.on('open', function() {
    var unreads = slack.getUnreadCount();

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

    console.log('Welcome to Slack. You are @' + slack.self.name + ' of ' + slack.team.name);
    console.log('You are in:', channels.join(', '));
    console.log('As well as:', groups.join(', '));

    var messages = unreads === 1 ? 'message' : 'messages';

    console.log('You have ' + unreads + ' unread ' + messages);
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
      detectLanguage(text, function(err, lang) {
        if (err) {
          console.error('Error', 'detectLanguage', err);
          channel.send('Unable to translate');
          return;
        }

        if (lang === targetLang) {
          channel.send(text);
          return;
        }

        translate(text, lang, targetLang, function(err, output) {
          if (err) {
            console.error('Error', 'translate', err);
            channel.send('Unable to translate');
            return;
          }

          channel.send(output);
          console.log('@' + slack.self.name + ' respond with ' + output);
        });
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

botToken = 'xxxx-xxxxxxxxxxx-xxxxxxxxxxxxxxxxxxxxxxxx';
targetLang = 'fr';
slackBot(botToken, targetLang, ['translate_to_korean', 'translate_to_english']);

botToken = 'yyyy-yyyyyyyyyyy-yyyyyyyyyyyyyyyyyyyyyyyy';
targetLang = 'ko';
slackBot(botToken, targetLang, ['translate_to_french', 'translate_to_english']);

botToken = 'zzzz-zzzzzzzzzzz-zzzzzzzzzzzzzzzzzzzzzzzz';
targetLang = 'en';
slackBot(botToken, targetLang, ['translate_to_french', 'translate_to_korean']);
