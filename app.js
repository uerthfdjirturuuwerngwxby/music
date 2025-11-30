const express = require("express");
const { searchMusics } = require("node-youtube-music");

const app = express();
const port = 3000;

// 🔐 Your YouTube Music cookie (not used by node-youtube-music, but stored here as you requested)
  const COOKIE = `VISITOR_INFO1_LIVE=LJPGZUMFM20; VISITOR_PRIVACY_METADATA=CgJJThIEGgAgIw%3D%3D; PREF=f4=4000000&f6=40000000&tz=Asia.Calcutta&f7=100; LOGIN_INFO=AFmmF2swRgIhAO7UJhxmlj_HXJ5TMTSmKeOnp2ujsPEQslvRGWDUeyodAiEAvnTyq6_ABKVvgALihwqDy5sVJnspuhFBpNqpNZduTMA:QUQ3MjNmeFJ5UktRbm1EZUh1NG5XOW8tbmExUEtWaFFWbXh1VkROTEVablA0ckZ0X3RmRVJJaFZMSV93Z1RhVzJaTUtDeWZYblRIRnE0UWVyOUptSjI0RFY0MW4xYWFQTEJuZUNTZTJiWVpfUVpmaEZZM0NCVTlBWWdGVTU1eE9lai11eVc4Q0oyTHVMZFduTG41dGdYZkNUYVpoSGlzaFpn; YSC=6FGZ31WsV90; __Secure-ROLLOUT_TOKEN=CIO7lvbWlPqXrAEQtITopbn5kAMY95jp9P-XkQM%3D; HSID=AtcnQ8BXlI5sxSoH7; SSID=AeRtvRgp0werKjero; APISID=U7XfLp9g4PtpY7Gq/AeQoyeKYy4eLGsAkV; SAPISID=gek8d7h5_MEHsEb2/AB_-IM4trdN0H-PGG; __Secure-1PAPISID=gek8d7h5_MEHsEb2/AB_-IM4trdN0H-PGG; __Secure-3PAPISID=gek8d7h5_MEHsEb2/AB_-IM4trdN0H-PGG; SID=g.a0004AhGjl5gg9mNHs8jyBVb_O-jRBHwvPkwriJ1ZvB94KgrYBP-d9kbNooxK47KwHWxfIB-9gACgYKAWYSARASFQHGX2Mi0TAkFEhJf78yYH_DTlGwjxoVAUF8yKpTGM0Z2lSbVzA8lYo1lWvi0076; __Secure-1PSID=g.a0004AhGjl5gg9mNHs8jyBVb_O-jRBHwvPkwriJ1ZvB94KgrYBP-fBQVVbLAfpYZyKj5W7D8-wACgYKAR0SARASFQHGX2MiFAuihGdAitUmi0yssOv0fhoVAUF8yKoUAb-QK9-OloFs3PyGH6EV0076; __Secure-3PSID=g.a0004AhGjl5gg9mNHs8jyBVb_O-jRBHwvPkwriJ1ZvB94KgrYBP-BlbIuS7a1SMKFH-dRVvKPQACgYKAa4SARASFQHGX2Mio-_4SmgIobpWjMjgAPJVahoVAUF8yKqdvf1C8nRpAzdl32RhSBIk0076; __Secure-1PSIDTS=sidts-CjUBwQ9iI5zDk5PeA6dRgCiLJ2tPZRQwws5-iUxOJ_QFf7ZYVHEKEhdGfaMjLx6Vx3DTAgWSpRAA; __Secure-3PSIDTS=sidts-CjUBwQ9iI5zDk5PeA6dRgCiLJ2tPZRQwws5-iUxOJ_QFf7ZYVHEKEhdGfaMjLx6Vx3DTAgWSpRAA; _gcl_au=1.1.2071532443.1764446823; CONSISTENCY=AKreu9uCHfmyLVABbM4kfMvtYRmuJo_PiUE9tEOg7FXrwWFlu860CZwAYxz0Xdbl4Gr98LxYg0kcOi-PPeSk4vTMF-RydfWELbx4tm2aQxJEV22vN_Rd57WEVAWz5fflTjZ2pIhmIHJS-cFvW6fwY3tM; SIDCC=AKEyXzU8ryT-8sk90981Iv-TVTZ2Ula7-zU5ohpPX89ZKz-3-yvjR2tpbm-Q5ialoVbfOlktNw; __Secure-1PSIDCC=AKEyXzWUaQm6Qc9F2S3GRPXqTMPR14KxP2oAsma4hyYM-HYdLOqWgMm25KvXtfHIL-mEveAVDg; __Secure-3PSIDCC=AKEyXzU2_Vxv424Cui2o8BLUCsFHja4KF68nRow0kNEmIGz8eUnihS_6hRoN4215OnNhndyCrwA`

// Example (DON'T COPY THIS, USE YOUR OWN):
// const COOKIE = `VISITOR_INFO1_LIVE=...; PREF=...; LOGIN_INFO=...; SID=...; SAPISID=...; __Secure-3PSID=...`;

// Just to show it's "used" in code (though not for auth)
console.log("Cookie string length:", COOKIE.length);

// Serve static frontend from /public folder
app.use(express.static("public"));

// GET /search?q=...
app.get("/search", async (req, res) => {
  const q = req.query.q;

  if (!q) {
    return res.status(400).json({ error: "Missing q parameter" });
  }

  try {
    // node-youtube-music does NOT use cookies; this searches public YT Music
    const musics = await searchMusics(q);
    res.json(musics);
  } catch (err) {
    console.error("Search error:", err);
    res.status(500).json({ error: "Search failed on server" });
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
