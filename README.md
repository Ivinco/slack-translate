# Slack instant translation bot

This bot being invited to a Slack channel translates all the messages into the language specified in the config. It doesn't have any commands or whatever else yet, just translates all.
It's based on [Google Translate API](https://www.npmjs.com/package/google-translate-api)

```Sergey: Привет```

```translate: Hi```


## Prerequisites and configuration

### Target Language

You need to set the target language (`targetLang` var) in the variables when creating the bot (with the 2 letters language code: fr, en, es, ko, de, etc...) in `slack-translate.js`.

### Bot creation

You need to [create a bot on slack](https://my.slack.com/services/new/bot) and get a [bot access token](https://api.slack.com/tokens).
Then set it in the `botToken` variable in `slack-translate.js`.


### Start the Slack Bot

```shell
$ npm start
```

Make sure you run:

```shell
$ npm i
```

before to install the dependencies.
