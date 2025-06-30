const passport = require("passport");
const { Strategy: GoogleStrategy } = require("passport-google-oauth20");
const { Strategy: FacebookStrategy } = require("passport-facebook");
const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const generateToken = (id, role) => {
  console.log("receive data", id, role);

  return jwt.sign({ id, role }, process.env.JWT_SECRET, {
    expiresIn: "30d",
  });
};

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: `/api/auth/google/callback`,
    },
    async (_accessToken, _refreshToken, profile, done) => {
      try {
        let user = await User.findOne({
          email: profile._json.email,
        });

        if (!user) {
          const newPass = "ffff";
          const salt = await bcrypt.genSalt(12);
          const hashedPassword = await bcrypt.hash(newPass, salt);

          user = await User.create({
            firstName: profile._json.given_name,
            lastName: profile._json.family_name,
            email: profile._json.email,
            googleId: profile.id,
            profileImage: profile._json.picture,
            password: hashedPassword,
            role: ["buyer"],
          });
        }

        const token = generateToken(user._id, "buyer");

        return done(null, {
          user: {
            _id: user._id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            role: user.role,
            profileImage: user.profileImage,
          },
          token,
          provider: "google",
        });
      } catch (error) {
        console.error("Google auth error:", error);
        return done(error);
      }
    }
  )
);

passport.use(
  new FacebookStrategy(
    {
      clientID: process.env.FACEBOOK_APP_ID,
      clientSecret: process.env.FACEBOOK_APP_SECRET,
      callbackURL: `/api/auth/facebook/callback`,
      profileFields: ["id", "displayName", "email", "name", "photos"],
      enableProof: true,
    },
    async (_accessToken, _refreshToken, profile, done) => {
      try {
        if (!profile._json.email) {
          return done(
            new Error("Email is required but not provided by Facebook")
          );
        }

        let user = await User.findOne({ email: profile._json.email });

        if (!user) {
          user = await User.create({
            firstName:
              profile.name?.givenName || profile.displayName.split(" ")[0],
            lastName:
              profile.name?.familyName ||
              profile.displayName.split(" ")[1] ||
              "",
            email: profile._json.email,
            role: ["buyer"],
            facebookId: profile.id,
            profileImage: profile.photos?.[0]?.value,
            isVerified: true,
          });
        } else {
          if (!user.facebookId) {
            user.facebookId = profile.id;
            await user.save();
          }
        }

        const roleToUse = user.role.includes("buyer") ? "buyer" : user.role[0];
        const token = generateToken(user._id, roleToUse);

        return done(null, {
          user: {
            _id: user._id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            role: user.role,
            profileImage: user.profileImage,
          },
          token,
          provider: "facebook",
        });
      } catch (error) {
        console.error("Facebook auth error:", error);
        return done(error);
      }
    }
  )
);
