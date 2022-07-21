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

router.get("/billing", (req, res) => {
  res.render("billing", {
    title: "Billing Dashboard",
    isAuthenticated: req.session.isAuthenticated,
    username: req.session.account?.username,
    accessToken:req.session.accessToken
  });
  
});

router.post("/webhook", async (req, res) => {
  switch (req.body.action) {
    case "Unsubscribe": {
      console.log(req.body, "Unsubscribe");
      break;
    }
    case "ChangePlan": {
      console.log(req.body, "ChangePlan");
      break;
    }
    case "ChangeQuantity": {
      console.log(req.body.subscription.name, "ChangeQuantity");
      break;
    }
    case "Renew": {
      console.log(req.body.subscription.name, "Renew");
      break;
    }
    case "Suspend": {
      console.log(req.body.subscription.name, "Suspend");
      break;
    }
  }
});



module.exports = router;
