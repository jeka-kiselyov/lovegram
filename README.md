# LoveGram

Telegram Developer Challenges JavaScript Contest Entry

[Stage 1](https://entry1088-jsround1.usercontent.dev/) IV PLACE

[Stage 2](https://entry1289-jsround2.usercontent.dev/) IV PLACE

[Stage 3](https://contest.com/javascript-web-3) III PLACE

The goal was to create a simplified web version of Telegram without using third-party UI frameworks. You can check built version online [here](https://lovegramtesta.herokuapp.com/).

### TLDR?

Built with with very simple stupid [UI component class](https://github.com/jeka-kiselyov/lovegram/tree/master/frontend/src/utils/UI.js). Main data layer is [PeerManager](https://github.com/jeka-kiselyov/lovegram/tree/master/frontend/src/state/PeerManager.js). Design files were provided by TG team. Goal was to make it tiny and fast. And do everything in 3 two-weeks sprints.

### Specifications

[Stage 1](https://t.me/contest/118)
[Stage 2](https://t.me/contest/152)
[Stage 3](https://t.me/contest/177)

### Source

- [Telegram API library](https://github.com/jeka-kiselyov/teleweb)
- [Frontend UI components](https://github.com/jeka-kiselyov/lovegram/tree/master/frontend/src/ui)
- [Frontend Models](https://github.com/jeka-kiselyov/lovegram/tree/master/frontend/src/state)
- [webworkers](https://github.com/jeka-kiselyov/lovegram/tree/master/frontend/src/protocol)
- [Helpers and utils](https://github.com/jeka-kiselyov/lovegram/tree/master/frontend/src/utils), service worker, TGS optimizations etc.

Some cleaning up of source code needed, there may be some outdated files in this repository. @todo: test coverage and get rid of junk.

### As of libraries used:

- [TeleJS](https://github.com/RD17/TeleJS) many thanks to RD17 team for their API library. My fork with few changes, updated layer, websocket support and SRP auth helpers named [Teleweb](https://github.com/jeka-kiselyov/teleweb) is available [here](https://github.com/jeka-kiselyov/teleweb).
- [SquirrellyJS](https://squirrelly.js.org/) as a template engine. Fast, tiny and nice.
- [libwebpjs](http://libwebpjs.hohenlimburg.org/) for webp in Safari support. (Thanks [spalt08](https://github.com/spalt08) for the help with it).
- [Lottie](https://github.com/airbnb/lottie-web) for TGS animations.
- [opus-recorder](https://github.com/chris-rudmin/opus-recorder) for recording ogg voice messages.

### Installation

```bash
git clone https://github.com/jeka-kiselyov/lovegram.git
cd lovegram
npm install
```

### How can I run it?

Start in dev mode

```bash
node app.js
```

Open `localhost:9090`

Build the dist

```bash
grunt
```

#### License

MIT