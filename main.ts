import { launch } from 'puppeteer';
import * as request from 'request-promise';
import * as fs from 'fs';
import * as mkdirp from 'mkdirp';

const url = process.argv[process.argv.length - 1];
if (!url.match(/^https:\/\/developer\.apple\.com\/videos\/play\//)) {
  console.log('% ts-node main.ts https://developer.apple.com/videos/play/wwdc2017/703/');
  process.exit(1);
}

const directory = './out/' + url.split('/').slice(-3)[0];
const file = directory + '/' + url.split('/').slice(-2)[0];
mkdirp.sync(directory);

(async () => {
  const browser = await launch();
  const page = await browser.newPage();
  await page.goto(url);
  const link = await page.evaluate(() => {
    var link = '';
    document.querySelectorAll('a').forEach((dom) => {
      if (dom.innerHTML === 'HD Video') { link = dom.href; }
    });
    return link;
  }) as String;

  const prefix = link.split('/').slice(0, -1).join('/') + '/subtitles/eng/';
  const subtitlesListUrl = prefix + 'prog_index.m3u8';

  const subtitleFiles = (await request(subtitlesListUrl) as String).split("\n").filter((subtitleFile) => {
    return !subtitleFile.match(/^#/) && subtitleFile.match(/\.webvtt$/);
  });

  const fd = fs.openSync(file, 'w');
  for (var i = 0; i < subtitleFiles.length; i++) {
    var subtitleFile = subtitleFiles[i];
    console.log((i + 1) + '/' + subtitleFiles.length);
    var subtitles = await request(prefix + subtitleFile) as String;
    subtitles.split("\n").slice(4, -1).forEach((subtitle, index) => {
      if (index % 3 === 0) {
        fs.writeSync(fd, subtitle);
        if (subtitle.match(/\.$/) || subtitle.match(/^\[.*\]$/)) {
          fs.writeSync(fd, "\n");
        } else {
          fs.writeSync(fd, ' ');
        }
      }
    });
  }
  fs.closeSync(fd);

  await browser.close();
})();
