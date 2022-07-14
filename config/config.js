require("dotenv").config()
const config = {
  azure: {
    clientId: process.env.AZURE_CLIENT_ID,
    tenantId: process.env.AZURE_TENANT_ID,
    clientSecret: process.env.AZURE_CLIENT_SECRET_ID,
  },
 
}

module.export =config
