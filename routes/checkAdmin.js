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
async function GetRoleDef(id,token){
    let url = `https://graph.microsoft.com/v1.0/roleManagement/directory/roleDefinitions/${id}`;

    //axios request for Activation
    let response = await axios({
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      url: url,
      method: "Get",
    });
  
return response.data.displayName
}
router.get("/", async (req, res) => {
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
    let url2 = `https://graph.microsoft.com/v1.0/roleManagement/directory/roleAssignments?$filter=principalId+eq+'${response.data.id}'`;
    
    //axios request for Activation
    let response2 = await axios({
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${azureToken}`,
      },
      url: url2,
      method: "Get",
    });
    var roleName = [];
    const Roles = response2.data.value;
    for (let role of Roles) {
        const roleDef= await GetRoleDef(role.roleDefinitionId,azureToken)
        roleName.push(roleDef);
    }
    console.log(roleName)
    
    if(roleName.includes('Global Administrator')){
        res.send("You are a Admin .you can create / configure your account by going back to landing page OR from the Azure Portal=>Saas=>choose from the list =>configure account");
    }else{
        res.send("You are not a Admin. please ask your organizations Admin to Subscribe and configure the account")
    }
    
  } catch (err) {
    console.log(err.response.data, "error in graph/me");
  }
});

module.exports = router;
