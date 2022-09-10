const Mongoose = require("mongoose")
const crypto = require("crypto")
const UserSchema = new Mongoose.Schema({
  username: {
    type: String,
    unique: true,
    required: true,
  },
  hash : {
    type: String,
    required: true,
  }, 
  salt : {
    type: String,
    required: true,
  },
  devices:[{
    uuid: String,
    browser: String,
    isAndroid: Boolean,
    isDesktop: Boolean,
    os: String,
  }]
})
UserSchema.methods.setPassword = function(password) { 
    this.salt = crypto.randomBytes(16).toString('hex'); 
    this.hash = crypto.pbkdf2Sync(password, this.salt,  
    1000, 64, `sha512`).toString(`hex`); 
}; 
UserSchema.methods.validPassword = function(password) { 
    var hash = crypto.pbkdf2Sync(password,  
    this.salt, 1000, 64, `sha512`).toString(`hex`); 
    return this.hash === hash; 
};

const User = Mongoose.model("user", UserSchema)
module.exports = User