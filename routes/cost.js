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

const getManagementClient = async (token) => {
  return axios.create({
    baseURL: "https://management.azure.com/",
    timeout: 100000,
    headers: { Authorization: "Bearer " + token },
  });
};

/**
 *
 * @param scope scope including the forward slash in front
 * @param start YYYY-MM-DD
 * @param end YYYY-MM-DD
 * @returns
 */
const getCostManagementDataByScope = async (token, scope, start, end) => {
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
        {
          type: "Dimension",
          name: "ResourceType",
        },
        {
          type: "Dimension",
          name: "ResourceId",
        },
        {
          type: "Dimension",
          name: "ResourceLocation",
        },
      ],
    },
  };
 
  let client = await getManagementClient(token);
  let response = await client.post(url, query);
  return await response.data.properties.rows;
};

const getAllSubscriptions = async (token) => {
  try {
    let url = `https://management.azure.com/subscriptions?api-version=2020-01-01`;

    //axios request for Activation
    let response = await axios({
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      url: url,
      method: "Get",
    });

    const subs = response.data.value;

    const subscription = [];
    for (let sub of subs) {
      subscription.push({
        id: sub.id,
        subscriptionId: sub.subscriptionId,
        name: sub.displayName,
      });
    }
    // console.log(subscription);
    return subscription;
  } catch (error) {
    console.log(error.response.data, "error in GET all subscriptions");
  }
};

const getAllResourceGroupsBySubscriptionID = async (token, subscriptionId) => {
  try {
    let url = `https://management.azure.com/subscriptions/${subscriptionId}/resourcegroups?api-version=2021-04-01`;

    //axios request for Activation
    let response = await axios({
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      url: url,
      method: "Get",
    });
    return response.data.value;
  } catch (error) {
    console.log(error.response.data, "error in GETing resource groups");
  }
};

router.get(
  "/subscriptions",
  isAuthenticated, // check if user is authenticated
  async function (req, res, next) {
    try {
      let azureToken = req.session.accessToken;
      const response = await getAllSubscriptions(azureToken);
      res.send(response);
    } catch (err) {
      console.log(err.response);
    }
  }
);

router.get(
  "/resourceGroups",
  isAuthenticated, // check if user is authenticated
  async function (req, res, next) {
    try {
      let azureToken = req.session.accessToken;
      const response = await getAllSubscriptions(azureToken);
      let resourceGroupList = [];
      for (let sub of response) {
        const ResourceGroups = await getAllResourceGroupsBySubscriptionID(
          azureToken,
          sub.subscriptionId
        );
        for (let R of ResourceGroups) {
          resourceGroupList.push(R);
        }
      }
      res.send(resourceGroupList);
    } catch (err) {
      console.log(err.response);
    }
  }
);

router.get(
  "/costByResourceGroups",
  isAuthenticated, // check if user is authenticated
  async function (req, res, next) {
    try {
      let azureToken = req.session.accessToken;
      const response = await getAllSubscriptions(azureToken);
      let resourceGroupList = [];
      var TotalCost=0
      for (let sub of response) {
        const ResourceGroups = await getAllResourceGroupsBySubscriptionID(
          azureToken,
          sub.subscriptionId
        );
        for (let R of ResourceGroups) {
          
          try {
            const cost = await getCostManagementDataByScope(
              azureToken,
              `https://management.azure.com${R.id}`,
              "18-aug-22 00:00",
              "18-aug-22 01:00"
            );
            for(let amount of cost){
              console.log(amount[0])
              TotalCost=TotalCost+amount[0]
            }
          } catch (error) {
            console.log(error);
          }
        }
      }
      console.log("TotalCost",TotalCost)
      res.send(TotalCost)
    } catch (err) {
      console.log(err.response);
    }
  }
);

module.exports = router;
