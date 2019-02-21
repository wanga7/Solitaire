/* Copyright G. Hemingway @2018 - All rights reserved */
"use strict";

module.exports = app => {
  require("./v1/user")(app);
  require("./v1/session")(app);
  require("./v1/game")(app);
};
