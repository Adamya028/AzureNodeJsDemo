/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

var express = require("express");
var router = express.Router();

router.get("/", function (req, res, next) {
  console.log(req.session);
  res.render("index", {
    title: "Landing Page",
    isAuthenticated: req.session.isAuthenticated,
    username: req.session.account?.username,
  });
});

router.get("/dashboard", (req, res) => {
  res.render("dashboard", {
    title: "dashboard",
    isAuthenticated: req.session.isAuthenticated,
    username: req.session.account?.username,
  });
});

module.exports = router;
