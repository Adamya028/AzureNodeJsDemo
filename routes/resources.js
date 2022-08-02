const express = require("express");
const router = express.Router();
const axios = require("axios");
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
    let url = `https://login.microsoftonline.com/${process.env.TENANT_ID}/oauth2/token`;
    //Body for the token
    let params = new URLSearchParams();
    params.append("grant_type", "client_credentials");
    params.append("client_id", process.env.CLIENT_ID);
    params.append("client_secret", process.env.CLIENT_SECRET);
    params.append("resource", "https://management.azure.com/");
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

const getManagementClient = async () => {
  let token = await getToken();
  return axios.create({
    baseURL: "https://management.azure.com/",
    timeout: 100000,
    headers: { Authorization: "Bearer " + token },
  });
};

router.post("/", async (req, res) => {
  try {
    await getCostManagementDataByScope(
      "https://management.azure.com",
      "2022-07-19",
      "2022-07-20"
    );
    res.send("done");
  } catch (e) {
    console.log(e.response, "error");
  }
});

router.get("/test", async (req, res) => {
  try {
    let azureToken = req.session.accessToken;
    let url = `https://graph.microsoft.com/v1.0/me`;

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
    console.log(err);
  }
});

router.get("/test2", async (req, res) => {
  try {
    let azureToken = req.session.accessToken;

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
    console.log(err);
  }
});

router.get(
  "/resource",
  isAuthenticated, // check if user is authenticated
  async function (req, res, next) {
    try {

      const graphResponse = await fetch(
        "https://management.azure.com/providers/Microsoft.ResourceGraph/operations?api-version=2021-03-01",
        req.session.accessToken
      );
      console.log(graphResponse)
      res.render("resource");
    } catch (error) {
      console.log(error)
    }
  }
);

module.exports = router;
