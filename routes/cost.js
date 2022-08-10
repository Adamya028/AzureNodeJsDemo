const express = require("express");
const router = express.Router();
const axios = require("axios");
const fetch = require("../fetch");
// custom middleware to check auth state
function isAuthenticated(req, res, next) {
    if (!req.session.isAuthenticated) {
      return res.render("login"); // redirect to sign-in route
    }
  
    next();
  }


  router.get(
    "/subscriptions",
    async function (req, res, next) {
        console.log(req.session.accessToken);
      try {
        
        
        let url = `https://management.azure.com/subscriptions?api-version=2020-01-01`;
        // axios request for subcription info
  
        let response = await axios({
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${req.session.accessToken}`,
          },
          url: url,
          method: "GET",
        });
        
        
      } catch (error) {
        console.log(error.response.data);
      }
    }
  );
module.exports = router;