const express = require("express");
const router = express.Router();
const axios = require("axios");
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

const getCostManagementDataByScope = async (scope, start, end) => {
  let url = `${scope}/providers/Microsoft.CostManagement/query?api-version=2019-11-01`;
  let query = {
    timeframe: "Custom",
    timePeriod: {
      from: start,
      to: end,
    },
    type: "ActualCost",
    dataset: {
      granularity: "None",
      aggregation: {
        totalCost: {
          name: "Cost",
          function: "Sum",
        },
      },
      grouping: [
        {
          type: "Dimension",
          name: "ResourceGroup",
        },
      ],
    },
  };

  let client = await getManagementClient();
  let response = await client.post(url, query);
  console.log(await response.data.properties.rows);
  return await response.data.properties.rows;
};

router.post("/", async (req, res) => {
  try {
    await getCostManagementDataByScope(
      "https://management.azure.com",
      "2022-07-19",
      "2022-07-20"
    );
    res.send("done")
  } catch (e) {

    console.log(e.response,"error");
  }
});


router.post("/test",async(req,res)=>{
  console.log(req)
  
})

module.exports = router;
