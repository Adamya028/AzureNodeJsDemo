const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const User = require("../models/User");
const config = require("config");
const { check, validationResult } = require("express-validator");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const axios = require("axios");
var msal = require("@azure/msal-node");

var {
  msalConfig,
  REDIRECT_URI,
  POST_LOGOUT_REDIRECT_URI,
} = require("../authConfig");

const msalInstance = new msal.ConfidentialClientApplication(msalConfig);
const cryptoProvider = new msal.CryptoProvider();



const getToken = async (code,code_verifier) => {
  try {
    // URL for login
    let url = `https://login.microsoftonline.com/common/oauth2/token`;
    //Body for the token
    let params = new URLSearchParams();
    params.append("grant_type", "authorization_code");
    params.append("client_id", process.env.CLIENT_ID);
    params.append("client_secret", process.env.CLIENT_SECRET);
    params.append("redirect_uri", process.env.REDIRECT_URI);
    params.append("scope", "https://graph.microsoft.com/.default offline_access openid");
    params.append("code", code);
    params.append("code_verifier", code_verifier);
    //axios request for the token generation
    let response = await axios({
      data: params.toString(),
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      url: url,
      method: "POST",
    });
   
    return response.data;
  } catch (error) {
    console.log(error);
    throw new Error("Could not retrieve token");
  }
};


const getTokenByRefreshToken = async (refreshToken) => {
  try {
    // URL for login
    let url = `https://login.microsoftonline.com/common/oauth2/token`;
    //Body for the token
    let params = new URLSearchParams();
    params.append("grant_type", "refresh_token");
    params.append("client_id", process.env.CLIENT_ID);
    params.append("client_secret", process.env.CLIENT_SECRET);
    params.append("redirect_uri", process.env.REDIRECT_URI);
    params.append("scope", "https://graph.microsoft.com/.default offline_access openid");
    params.append("refresh_token", refreshToken);
    //axios request for the token generation
    let response = await axios({
      data: params.toString(),
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      url: url,
      method: "POST",
    });
   
    return response.data;
  } catch (error) {
    console.log(error);
    throw new Error("Could not retrieve token");
  }
};


/**
 * Prepares the auth code request parameters and initiates the first leg of auth code flow
 * @param req: Express request object
 * @param res: Express response object
 * @param next: Express next function
 * @param authCodeUrlRequestParams: parameters for requesting an auth code url
 * @param authCodeRequestParams: parameters for requesting tokens using auth code
 */
async function redirectToAuthCodeUrl(
  req,
  res,
  next,
  authCodeUrlRequestParams,
  authCodeRequestParams
) {
  // Generate PKCE Codes before starting the authorization flow
  const { verifier, challenge } = await cryptoProvider.generatePkceCodes();

  // Set generated PKCE codes and method as session vars
  req.session.pkceCodes = {
    challengeMethod: "S256",
    verifier: verifier,
    challenge: challenge,
  };

 

  req.session.authCodeUrlRequest = {
    redirectUri: REDIRECT_URI,
    responseMode: "form_post", // recommended for confidential clients
    codeChallenge: req.session.pkceCodes.challenge,
    codeChallengeMethod: req.session.pkceCodes.challengeMethod,
    ...authCodeUrlRequestParams,
  };

  req.session.authCodeRequest = {
    redirectUri: REDIRECT_URI,
    code: "",
    ...authCodeRequestParams,
  };

  // Get url to sign user in and consent to scopes needed for application
  try {
    const authCodeUrlResponse = await msalInstance.getAuthCodeUrl(
      req.session.authCodeUrlRequest
    );
console.log(authCodeUrlResponse)
   
    res.redirect(authCodeUrlResponse);
  } catch (error) {
    next(error);
  }
}

router.get("/signin", async function (req, res, next) {
  // create a GUID for crsf
  req.session.csrfToken = cryptoProvider.createNewGuid();

  const state = cryptoProvider.base64Encode(
    JSON.stringify({
      csrfToken: req.session.csrfToken,
      redirectTo: "/dashboard",
    })
  );

  const authCodeUrlRequestParams = {
    state: state,

    scopes: ['https://management.azure.com/user_impersonation',"openid", "offline_access","https://graph.microsoft.com/Directory.Read.All","User.Read.All"]
  };

  const authCodeRequestParams = {
    
     scopes: ['https://management.azure.com/user_impersonation',"openid", "offline_access","https://graph.microsoft.com/Directory.Read.All","User.Read.All"]  };

  // trigger the first leg of auth code flow
  return redirectToAuthCodeUrl(
    req,
    res,
    next,
    authCodeUrlRequestParams,
    authCodeRequestParams
  );
});

router.get("/acquireToken", async function (req, res, next) {
  // create a GUID for csrf
  req.session.csrfToken = cryptoProvider.createNewGuid();

  // encode the state param
  const state = cryptoProvider.base64Encode(
    JSON.stringify({
      csrfToken: req.session.csrfToken,
      redirectTo: "/api/users/profile",
    })
  );

  const authCodeUrlRequestParams = {
    state: state,
    scopes: ['https://management.azure.com/user_impersonation',"openid", "offline_access","https://graph.microsoft.com/Directory.Read.All","User.Read.All"]
  };

  const authCodeRequestParams = {
    scopes: ['https://management.azure.com/user_impersonation',"openid", "offline_access","https://graph.microsoft.com/Directory.Read.All","User.Read.All"]
  };

  // trigger the first leg of auth code flow
  return redirectToAuthCodeUrl(
    req,
    res,
    next,
    authCodeUrlRequestParams,
    authCodeRequestParams
  );
});

router.post("/redirect", async function (req, res, next) {
  if (req.body.state) {
    const state = JSON.parse(cryptoProvider.base64Decode(req.body.state));

    // check if csrfToken matches
    if (state.csrfToken === req.session.csrfToken) {
      req.session.authCodeRequest.code = req.body.code; // authZ code
      req.session.authCodeRequest.codeVerifier = req.session.pkceCodes.verifier; // PKCE Code Verifier

      try {
        // const tokenResponse = await msalInstance.acquireTokenByCode(
        //   req.session.authCodeRequest
        // );
        const tokenResponse1=await getToken(req.session.authCodeRequest.code,req.session.authCodeRequest.codeVerifier)
        
        // console.log(tokenResponse1)

        req.session.accessToken = tokenResponse1.access_token;
        req.session.idToken = tokenResponse1.id_token;
        req.session.refreshToken = tokenResponse1.refresh_token;
        // req.session.account = tokenResponse.account;
        req.session.isAuthenticated = true;
        
        const accessToken=await getTokenByRefreshToken(req.session.refreshToken)

        // console.log(accessToken)



        res.redirect(state.redirectTo);
      } catch (error) {
        next(error);
      }
    } else {
      next(new Error("csrf token does not match"));
    }
  } else {
    next(new Error("state is missing"));
  }
});

router.get("/signout", function (req, res) {
  /**
   * Construct a logout URI and redirect the user to end the
   * session with Azure AD. For more information, visit:
   * https://docs.microsoft.com/azure/active-directory/develop/v2-protocols-oidc#send-a-sign-out-request
   */
  const logoutUri = `${msalConfig.auth.authority}/oauth2/v2.0/logout?post_logout_redirect_uri=${POST_LOGOUT_REDIRECT_URI}`;

  req.session.destroy(() => {
    res.redirect(logoutUri);
  });
});


router.get("/CheckSignIn", async function (req, res, next) {
  // create a GUID for crsf
  req.session.csrfToken = cryptoProvider.createNewGuid();

  const state = cryptoProvider.base64Encode(
    JSON.stringify({
      csrfToken: req.session.csrfToken,
      redirectTo: "/checkAdmin",
    })
  );

  const authCodeUrlRequestParams = {
    state: state,

    scopes: ["https://graph.microsoft.com/Directory.Read.All","User.Read.All"]
  };

  const authCodeRequestParams = {
    
     scopes: ["https://graph.microsoft.com/Directory.Read.All","User.Read.All"]  };

  // trigger the first leg of auth code flow
  return redirectToAuthCodeUrl(
    req,
    res,
    next,
    authCodeUrlRequestParams,
    authCodeRequestParams
  );
});
//@route  GET api/auth
//@desc   Test route
//@access Public
router.get("/", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    res.json(user);
  } catch (err) {
    console.error();
    res.status(500).send("server Error");
  }
});

//@route  POST api/auth
//@desc   Authenticate user & get token
//@access Public
router.post(
  "/",
  [
    check("email", "please Include a valid email").isEmail(),
    check("password", "Please is required").exists(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;
    try {
      //See if user exists
      let user = await User.findOne({ email });
      if (!user) {
        return res
          .status(400)
          .json({ errors: [{ msg: "invalid credentials" }] });
      }
      //verify password
      const isMatch = await bcrypt.compare(password, user.password);

      if (!isMatch) {
        return res
          .status(400)
          .json({ errors: [{ msg: "invalid credentials" }] });
      }
      //Return jsonwebtoken
      const payload = {
        user: {
          id: user.id,
        },
      };
      jwt.sign(
        payload,
        config.get("jwtSecret"),
        { expiresIn: 36000 },
        (err, token) => {
          if (err) throw err;
          let obj = {
            subId: user.subscriptionId,
            token,
          };
          res.status(200).send(obj);
        }
      );
    } catch (err) {
      console.error(err.message);
      res.status(500).send("Server error");
    }
  }
);

module.exports = router;
