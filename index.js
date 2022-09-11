const express = require('express')
const Mongoose = require("mongoose")
const jwt = require('jsonwebtoken');
var User = require("./models/user")
var cors = require('cors')

var cookieParser = require('cookie-parser');
require('dotenv').config();

Mongoose.connect("mongodb://localhost:27017/demo_auth", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
console.log("MongoDB Connected")

const app = express()
app.use('/static/',express.static(__dirname + '/public'))
app.use(express.json())
app.use(cors())
app.use(cookieParser());
app.set("view engine", "ejs")

app.post('/api/register', async (req, res) => {
    try {
        const { username, password,password2 } = req.body
        if (password !== password2) {
            return res.status(400).json({ error: "Two passwords didn't match" })
        }
        if (password < 6) {
            return res.status(400).json({ error: "Password is less than 6 characters" })
        }
        const user = await User.findOne({ username: username });
        if (user) {
            return res.status(400).json({ error: "User already exists" })
        }
        const newUser = new User({
            username: username,
        })
        newUser.setPassword(password)
        await newUser.save()
        res.status(200).json({ message: "User created" })
    } catch (err) {
        console.log(err.message)
        res.status(401).json({
            message: "User not successful created",
            error: err.message,
        })
    }
})

app.post("/api/login", async (req, res) => {
    // try{
        const { username, password,uuid,browser,isAndroid,isDesktop,isWindows,isLinux,isMac,isiphone,os } = req.body
        console.log(req.body)
        const user = await User.findOne({ username: username });
        if (user) {
            const validPassword = user.validPassword(password);
            if (validPassword) {
                for (let i = 0; i < user.devices.length; i++) {
                    if (user.devices[i].uuid === uuid) {
                        user.devices[i] = {
                            uuid: uuid,
                            browser: browser,
                            isAndroid: isAndroid,
                            isDesktop: isDesktop,
                            isWindows: isWindows,
                            isLinux: isLinux,
                            isMac: isMac,
                            isiphone: isiphone,
                            os: os,
                        }
                        user.save()
                        var token = createJWT(user,uuid)
                        res.cookie("uuid", uuid, { maxAge: 7 * 24 * 60 * 60 * 1000, httpOnly: true });
                        res.status(200).cookie("token", token, { httpOnly: true,maxAge: 1000 * 60 * 60 * 24 * 7 })
                        .json({ message: "User logged in",device:user.devices })
                        return;
                    }
                }
                if(user.devices.length < 2){
                    user.devices.push({
                        uuid: uuid,
                        browser: browser,
                        isAndroid: isAndroid,
                        isDesktop: isDesktop,
                        isWindows: isWindows,
                        isLinux: isLinux,
                        isMac: isMac,
                        isiphone: isiphone,
                        os: os,
                    })
                    user.save();
                    res.cookie("uuid", uuid, { maxAge: 7 * 24 * 60 * 60 * 1000, httpOnly: true });
                    res.status(200).cookie("token", token, { httpOnly: true,maxAge: 1000 * 60 * 60 * 24 * 7 })
                    .json({ message: "Valid password",devices:user.devices });
                    return;
                }
                res.status(402).json({ 
                    error: "You have already logged in from two devices",
                    devices: user.devices, 
                })
            } else {
                res.status(400).json({ error: "Invalid Password" });
            }
        } else {
            res.status(401).json({ error: "User does not exist" });
        }
    // }
    // catch(err){
    //     console.log(err.message)
    //     res.status(401).json({
    //         message: "User not successful logined",
    //         error: err.message,
    //     })
    // }
  });
app.post("/api/logout", async (req, res) => {
    try{
        const { username, uuid } = req.body
        const user = await User.findOne({ username: username });
        if (user) {
            for (let i = 0; i < user.devices.length; i++) {
                if (user.devices[i].uuid === uuid) {
                    user.devices.splice(i, 1);
                    user.save();
                    res.cookie("uuid", "", { maxAge: 0, httpOnly: true });
                    res.cookie("token", "", { maxAge: 0, httpOnly: true });
                    return res.status(200).json({ message: "User logged out",devices:user.devices })
                }
            }
            res.status(400).json({ error: "User not logged in" });
        } else {
            res.status(401).json({ error: "User does not exist" });
        }
    }
    catch(err){
        console.log(err.message)
        res.status(401).json({
            message: "User not successful logined",
            error: err.message,
        })
    }
 });

app.get("/",checkAuth, async (req, res) =>{
    const username = req.locals.username
    const user = await User.findOne({ username: username });
    if (user) {
        res.render("main",{devices:user.devices});
    } else {
        res.status(401).json({ error: "User does not exist" });
    }
})
app.get("/register", (req, res) => res.render("register"))
app.get("/login", (req, res) => res.render("login"))
app.get("/logout", (req, res) => res.render("logout"))

app.listen(5000, () => {
    console.log(`Example app listening on port 5000`)
})


function createJWT(user,uuid) {
    return jwt.sign(
        {
            username: user.username,
            uuid: uuid,
        },
        process.env.JWT_SECRET,
        {
            expiresIn: "7d",
        }
    );
}

function verifyJWT(token,uuid) {
    try {
        var decoded = jwt.verify(token, process.env.JWT_SECRET);
        if(decoded.uuid === uuid){
            return decoded.username;
        }
        return "";
    } catch (err) {
        console.log(err.message)
        return "";
    }
}
function checkAuth (req, res, next) {
    // try {
        const token = req.cookies.token;
        const uuid = req.cookies.uuid;
        console.log(token)
    if (!token) {
        return res.status(401).redirect("/login");
    }
    const verified = verifyJWT(token,uuid);
    if (verified === "" ) {
        console.log("not verified")
        return res.status(401).redirect("/login");
    }
    req.locals = {
        username: verified,
    }
    console.log("verified")
    next();
    return
    // } catch (err) {
    //     console.log(err.message)
    //     return res.status(401).redirect("/login");
    // }
  }



