const express = require("express");
const router = express.Router();
const axios = require("axios");
const fs = require("fs");
const fetch = require("../fetch");
// custom middleware to check auth state
function isAuthenticated(req, res, next) {
  if (!req.session.isAuthenticated) {
    return res.redirect("/api/auth/signin"); // redirect to sign-in route
  }

  next();
}
const getToken = async () => {
  try {
    // URL for login
    let url = `https://login.microsoftonline.com/${process.env.TENANT_ID}/oauth2/v2.0/token`;
    //Body for the token
    let params = new URLSearchParams();
    params.append("grant_type", "client_credentials");
    params.append("client_id", process.env.CLIENT_ID);
    params.append("client_secret", process.env.CLIENT_SECRET);
    params.append("scope", "https://management.core.windows.net//.default");
    //axios request for the token generation
    let response = await axios({
      data: params.toString(),
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      url: url,
      method: "POST",
    });
    accessToken = {
      token: response.data.access_token,
      expiry: response.data.expires_in,
      retrievedAt: new Date().getTime(),
    };
    return accessToken.token;
  } catch (error) {
    console.log(error);
    throw new Error("Could not retrieve token");
  }
};



router.get("/test2", async (req, res) => {
  try {
    let azureToken = gettoken();
    console.log(azureToken);
    let url = `https://management.azure.com/providers/Microsoft.Billing/billingAccounts?api-version=2019-10-01-preview`;
    let response = await axios({
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${azureToken}`,
      },
      url: url,
      method: "Get",
    });
    console.log(response);
  } catch (err) {
    console.log(err.response);
  }
});

router.get(
  "/test3",
  isAuthenticated, // check if user is authenticated
  async function (req, res, next) {
    try {
      let azureToken = req.session.accessToken;   

      let url = `https://management.azure.com/providers/Microsoft.Billing/billingAccounts?api-version=2019-10-01-preview`;

      //axios request for Activation
      let response = await axios({
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${azureToken}`,
        },
        url: url,
        method: "Get",
      });

      res.send(response.data);
    } catch (err) {
      console.log(err.response);
    }
  }
);

router.get(
  "/test4",
  isAuthenticated, // check if user is authenticated
  async function (req, res, next) {
    try {
      let azureToken = req.session.accessToken;
      
      let url = `https://management.azure.com/subscriptions?api-version=2020-01-01`;

      //axios request for Activation
      let response = await axios({
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${azureToken}`,
        },
        url: url,
        method: "Get",
      });

      res.send(response.data);
    } catch (err) {
      console.log(err.response);
    }
  }
);

router.get(
  "/Services",
  isAuthenticated, // check if user is authenticated
  async function (req, res, next) {
    try {
      let azureToken = req.session.accessToken;
      console.log()
      let url = `https://management.azure.com/subscriptions/aa02b170-918b-44b2-bf37-74fe10998df3/providers/Microsoft.ApiManagement/service?api-version=2021-12-01-preview`;

      //axios request for Activation
      let response = await axios({
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${azureToken}`,
        },
        url: url,
        method: "Get",
      });

      res.send(response.data);
    } catch (err) {
      console.log(err.response);
    }
  }
);


router.get(
  "/users",
  isAuthenticated, // check if user is authenticated
  async function (req, res, next) {
    try {
      const graphResponse = await fetch(
        "https://graph.microsoft.com/v1.0/users",
        req.session.accessToken
      );
      var jsonContent = JSON.stringify(graphResponse);
      fs.writeFile("All Users.json", jsonContent, "utf8", function (err) {
        if (err) {
          console.log("An error occured while writing JSON Object to File.");
          return console.log(err);
        }
        console.log("graph response saved ");
      });
      res.send(graphResponse);
    } catch (error) {
      console.log(error);
    }
  }
);

router.get(
  "/applications",
  isAuthenticated, // check if user is authenticated
  async function (req, res, next) {
    try {
   
      const graphResponse = await fetch(
        "https://graph.microsoft.com/v1.0/applications",
        req.session.accessToken
      );

      if (graphResponse?.["@odata.nextLink"]) {
        const graphResponse1 = await fetch(
          graphResponse?.["@odata.nextLink"],
          req.session.accessToken
        );
        const allApp = { ...graphResponse, ...graphResponse1 };
        var jsonContent = JSON.stringify(allApp);
        fs.writeFile(
          "AllApplications.json",
          jsonContent,
          "utf8",
          function (err) {
            if (err) {
              console.log(
                "An error occured while writing JSON Object to File."
              );
              return console.log(err);
            }
            console.log("graph response saved (All Applications) ");
          }
        );
        let data = allApp.value;
        let appList = [];
        console.log(data.length);
        for (let app of data) {
          appList.push({ id: app.id, name: app.displayName });
        }
        console.log(appList);
        res.send(appList);
      }
    } catch (error) {
      console.log(error);
    }
  }
);




router.get(
  "/groups",
  async function (req, res, next) {
    try {
      const graphResponse = await fetch(
        "https://graph.microsoft.com/v1.0/groups",
        req.session.accessToken
      );
      var jsonContent = JSON.stringify(graphResponse);
      fs.writeFile(
        "AllGroups.json",
        jsonContent,
        "utf8",
        function (err) {
          if (err) {
            console.log(
              "An error occured while writing JSON Object to File."
            );
            return console.log(err);
          }
          console.log("graph response saved(All groups) ");
        }
      );
res.send(graphResponse)
    } catch (error) {
      console.log(error);
    }
  }
);


router.get(
  "/subscriptions",
  async function (req, res, next) {
    try {
      const graphResponse = await fetch(
        "https://graph.microsoft.com/v1.0/resources",
        req.session.accessToken
      );
      var jsonContent = JSON.stringify(graphResponse);
      fs.writeFile(
        "AllGroups.json",
        jsonContent,
        "utf8",
        function (err) {
          if (err) {
            console.log(
              "An error occured while writing JSON Object to File."
            );
            return console.log(err);
          }
          console.log("graph response saved(Resources) ");
        }
      );
res.send(graphResponse)
    } catch (error) {
      console.log(error);
    }
  }
);
module.exports = router;
