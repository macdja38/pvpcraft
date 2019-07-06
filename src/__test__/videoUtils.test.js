/**
 * Created by macdja38 on 2017-03-20.
 */

const videoUtils = require("../lib/videoUtils");

let info =
  {
    "author": {
      "avatar": "photo",
      "channel_url": "channelURL",
      "id": "UCOYrd1AxkChvF2PiNlyJSWA",
      "name": "userName",
      "user": "username",
      "user_url": "userURL",
    },
    "formats": [
      {
        "audioBitrate": 128,
        "audioEncoding": "vorbis",
        "bitrate": "0.5",
        "container": "webm",
        "encoding": "VP8",
        "itag": "43",
        "profile": null,
        "quality": "medium",
        "resolution": "360p",
        "s": "55F49F4F77DE4A094B2881BCB499E0BFAC095D56DCEA7E.7674AFB39EFFA6489650F154EF5F4FE41C6D96DE",
        "type": "video/webm; codecs=\"vp8.0, vorbis\"",
        "url": "videoURL"
      }
    ],
    "id": "5498f30dd770bbb45e6094ea87cdac5b54cdac8b77532532ebbb7e712af39e19",
    "length_seconds": "15876",
    "link": "videoLink",
    "timeFetched": 1111,
    "title": "videoTitle",
    "view_count": "1111"
  };

test("renders video title from info", () => {
  expect(videoUtils.prettyTitle(info)).toBe("videoTitle");
});

test("renders video author from info", () => {
  expect(videoUtils.prettyAuthor(info)).toBe("userName");
});