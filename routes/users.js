const express = require("express");
const router = express.Router();
const { check, validationResult } = require("express-validator");
const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const config = require("config");
const nodemailer = require("nodemailer");
var generator = require("generate-password");

var fetch = require("../fetch");

var { GRAPH_ME_ENDPOINT } = require("../authConfig");

// custom middleware to check auth state
function isAuthenticated(req, res, next) {
  if (!req.session.isAuthenticated) {
    return res.redirect("/api/auth/signin"); // redirect to sign-in route
  }

  next();
}

router.get(
  "/id",
  isAuthenticated, // check if user is authenticated
  async function (req, res, next) {
    res.render("id", { idTokenClaims: req.session.account.idTokenClaims });
  }
);
router.post(
  "/azureDeactivate",
  isAuthenticated, // check if user is authenticated
  async function (req, res, next) {
    console.log(req.session.account.idTokenClaims);
  }
);

router.get(
  "/profile",
  isAuthenticated, // check if user is authenticated
  async function (req, res, next) {
    try {
      const graphResponse = await fetch(
        GRAPH_ME_ENDPOINT,
        req.session.accessToken
      );
      res.render("profile", { profile: graphResponse });
    } catch (error) {
      next(error);
    }
  }
);




var transport = nodemailer.createTransport({
  host: "smtp.mailtrap.io",
  port: 2525,
  auth: {
    user: "088edb57d87ba4",
    pass: "201ce69f41c0b8",
  },
});

/* const errors=config.get('errors'); */
//@route  POST api/users
//@desc   Register user
//@access Public
router.post(
  "/",
  [
    check("name", "Name is required").not().isEmpty(),
    check("email", "please Include a valid email").isEmail(),
    check("subscriptionId", "Please enter SubscriptionId").not().isEmpty(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, email, subscriptionId ,tenantId,planId,objectId} = req.body;
    const password = generator.generate({
      length: 10,
      numbers: true,
    });
    try {
      //See if user exists
      let user = await User.findOne({ email });
      if (user) {
        res.status(400).json({ errors: [{ msg: "user already exists" }] });
      }

      user = new User({
        name,
        email,
        subscriptionId,
        password,
        tenantId,
        planId,
        objectId
      });

      // Encrypt password
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(password, salt);
      await user.save();
console.log(user)
      //Return jsonwebtoken
      const payload = {
        user: {
          id: user.id,
        },
      };

      const mailData = {
        from: "youremail@gmail.com",
        to: email,
        subject: "Account credentials",
        text: "id password",
        html: `<b>Hey there! </b><br> This is Your login credentials for PowerBoard<br/><br>User Id <b>${email}</b></br> <br>password <b>${password}</b></br>`,
      };
      transport.sendMail(mailData, (error, info) => {
        if (error) {
          return console.log(error);
        }
        res
          .status(200)
          .send({ message: "Mail send", message_id: info.messageId });
      });
      jwt.sign(
        payload,
        config.get("jwtSecret"),
        { expiresIn: 36000 },
        (err, token) => {
          if (err) throw err;
          res.json({ token });
        }
      );
    } catch (err) {
      console.error(err.message);
      res.status(500).send("Server error");
    }
  }
);

router.post("/delete", async (req, res) => {
  try {
    const { SubId } = req.body;
    let user = await User.findOneAndRemove({ SubId });
    console.log(user, "deleted");
    res.json({ msg: "user deleted" });
  } catch (e) {
    console.log(e);
  }
});

router.post("/userInfo", async (req, res) => {
  try {
    let{email}=req.body
    let user = await User.findOne({ email });
    // console.log(user)
    res.send(user)
  } catch (e) {
    console.log(e);
  }
});
module.exports = router;
